/* Recognition engine, stage "exact match" (docs/RECOGNITION-DESIGN.md §4.2, docs/RECOGNITION-EXACT.md).
   For one shortlisted recording, two independent alignments of the clip:
     (A) landmarks: the clip's landmark hits in that recording (from the finder's own searches: as is, pitch-corrected,
         speed and tempo retries) are fitted to ONE straight line, time in recording = k · time in clip + b, by RANSAC.
         Reports the inliers (distinct clip moments on the line), the clip time they span, k and b.
     (B) melody: the clip's pitch line aligned in the recording around a suggested time (MELODY.alignNear).
         Reports the score, k, b and the pitch shift.
   They AGREE when both give the same line: tempo within 3 %, start within 0.5 s.
   Verse check: what the verse map says the recording recites at that time, against the verses heard in the clip.
   Pure functions; the shards and melodies are fetched by the caller (js/engine/archive.js, js/finder.js). */
(function(G){
const X=G.MATCH||(G.MATCH={});
/* landmark hits of recording `rec` in one finderSearch result: [{tc, tr}] in seconds, tc in CLIP time (a search on a
   resampled or stretched clip has its own time scale: ydur/dur) */
X.lmPairs=function(res,rec,secPerFrame){
  const out=[],scale=res.ydur&&res.dur?res.ydur/res.dur:1,tunit=(res.man&&res.man.tunit)||1;
  for(const b of res.blocks||[])for(const [h,tq] of b.lms){
    const sh=res.shards.get(h>>4);if(!sh)continue;const lo=h&15,a=sh.start[lo],z=sh.start[lo+1];
    if(z-a>4*600)continue;
    for(let o=a;o<z;o+=4){const e=sh.dv.getUint32(o,true);if(e>>>18!==rec)continue;out.push({tc:tq*secPerFrame/scale,tr:(e&262143)*tunit*secPerFrame})}
  }
  return out;
};
/* RANSAC: every pair of hits at least 1 s apart in the clip proposes a line (0.75 ≤ k ≤ 1.33); the line with most
   distinct clip moments within tol seconds wins. Deterministic: pairs are taken in a fixed order, at most maxTry. */
X.lmLine=function(pairs,opts){
  opts=opts||{};const tol=opts.tol||0.1,maxTry=opts.maxTry||3000,n=pairs.length;
  if(n<3)return {inliers:n?1:0,span:0,k:null,b:null,n};
  let best={inliers:0};
  const fit=(k,b)=>{const ts=new Set();let lo=Infinity,hi=-Infinity;
    for(const p of pairs)if(Math.abs(p.tr-(k*p.tc+b))<=tol){const t=Math.round(p.tc*100);if(!ts.has(t)){ts.add(t);if(p.tc<lo)lo=p.tc;if(p.tc>hi)hi=p.tc}}
    return {inliers:ts.size,span:ts.size?hi-lo:0,lo:ts.size?lo:null,hi:ts.size?hi:null}};
  /* all pairs when few, otherwise maxTry pairs drawn by a fixed-seed generator (same answer every run) */
  const all=n*(n-1)/2<=maxTry;let seed=12345;const rnd=m=>(seed=(seed*1103515245+12345)%2147483648)%m;
  const tryPair=(p,q)=>{if(Math.abs(q.tc-p.tc)<1)return;const k=(q.tr-p.tr)/(q.tc-p.tc);if(k<0.75||k>1.33)return;
    const b=p.tr-k*p.tc,f=fit(k,b);if(f.inliers>best.inliers)best={...f,k,b}};
  if(all){for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)tryPair(pairs[i],pairs[j])}
  else for(let t=0;t<maxTry;t++){const i=rnd(n),j=rnd(n);if(i!==j)tryPair(pairs[Math.min(i,j)],pairs[Math.max(i,j)])}
  /* refine: least squares on the inliers */
  if(best.inliers>=3){const P=pairs.filter(p=>Math.abs(p.tr-(best.k*p.tc+best.b))<=tol);let sx=0,sy=0,sxx=0,sxy=0;
    for(const p of P){sx+=p.tc;sy+=p.tr;sxx+=p.tc*p.tc;sxy+=p.tc*p.tr}const m=P.length,d=m*sxx-sx*sx;
    if(d>1e-9){const k=(m*sxy-sx*sy)/d,b=(sy-k*sx)/m;if(k>=0.75&&k<=1.33){const f=fit(k,b);if(f.inliers>=best.inliers)best={...f,k,b}}}}
  /* the scatter of the inliers around the line (seconds), for the timestamp's error */
  if(best.inliers>=3){let ss=0,m=0;for(const p of pairs){const d=p.tr-(best.k*p.tc+best.b);if(Math.abs(d)<=tol){ss+=d*d;m++}}best.sd=Math.sqrt(ss/Math.max(1,m-2))}
  return {...best,n};
};
/* the best line over several searches (each with its own landmarks); searches: finderSearch results */
X.lmBest=function(searches,rec,secPerFrame){
  let best={inliers:0,n:0};
  for(const res of searches){const L=X.lmLine(X.lmPairs(res,rec,secPerFrame));if(L.inliers>best.inliers)best={...L,mode:res.mode,f:res.f}}
  return best;
};
/* Step 11: where the matched recitation starts and ends, in the clip and in the recording.
   lm: MATCH.lmLine result (with lo/hi: the clip times of the first and last inlier); mel: MELODY.alignNear result;
   ing: ENGINE.ingest result (dur, sections [{a, b, kind}]); recDur: the recording's length.
   The line comes from the landmarks when they are many (>= 6 inliers: precise to a few hundredths of a second),
   otherwise from the melody alignment. The matched part of the clip is the recitation sections the evidence covers
   (an intro of music, noise or silence before it is not part of the recording); its ends are mapped through the line.
   err: the start's uncertainty in seconds (line scatter / sqrt(n), at least one frame of the method used). */
X.timestamp=function(lm,mel,ing,recDur,opt){
  opt=opt||{};const minInl=opt.minInl||6,dur=ing.dur;
  let k,b,src,err;
  if(lm&&lm.k!=null&&lm.inliers>=minInl){k=lm.k;b=lm.b;src="landmarks";err=Math.max(0.032,2*(lm.sd||0.03)/Math.sqrt(lm.inliers))}
  else if(mel&&mel.score>0){k=mel.k;b=mel.at;src="melody";err=0.1}
  else if(lm&&lm.k!=null&&lm.inliers>=3){k=lm.k;b=lm.b;src="landmarks (few)";err=0.3}
  else return null;
  /* the clip span the evidence covers: the landmark inliers' range, or (a melody line) the recitation sections */
  const rec=(ing.sections||[]).filter(s=>s.kind==="recitation"),byLm=src.startsWith("landmarks")&&lm.lo!=null;
  const lo=byLm?lm.lo:(rec.length?rec[0].a:0),hi=byLm?lm.hi:(rec.length?rec[rec.length-1].b:dur);
  /* the recitation sections overlapping it (2 s of slack), so the span runs from where the recitation really starts */
  const over=rec.filter(s=>s.b>=lo-2&&s.a<=hi+2);
  /* sections reach at most 0.5 s beyond the evidence (a recitation section can run across a join between two parts of
     a clip); the edge check against the recording below takes it the rest of the way where the clip really matches */
  let ca=over.length?Math.max(lo-0.5,Math.min(...over.map(s=>s.a))):lo,cb=over.length?Math.min(hi+0.5,Math.max(...over.map(s=>s.b))):hi;
  ca=Math.max(0,Math.min(ca,lo));cb=Math.min(dur,Math.max(cb,hi));
  /* the edges, checked against the recording itself (opt.q: the clip's melody, opt.ref: the recording's, both MIDI per
     50 ms frame, NaN = no voice): beyond the span found so far, 0.25 s at a time, the clip is taken as part of the
     recording while both are voiced at a consistent pitch difference, and at the end also while both are silent. An
     intro (music, noise, added silence) never extends the start. */
  if(opt.q&&opt.ref){const F=20,q=opt.q,ref=opt.ref;
    const shiftAt=(c0,c1)=>{const d=[];for(let t=c0;t<c1;t+=1/F){const a=q[Math.round(t*F)],r=ref[Math.round((k*t+b)*F)];if(!isNaN(a)&&!isNaN(r))d.push(r-a)}d.sort((x,y)=>x-y);return d.length>=5?d[d.length>>1]:null};
    const sh=shiftAt(ca,cb);
    /* voiced: both voiced at the same tune; quiet: both silent */
    const look=(c0,c1)=>{let n=0,vq=0,vr=0,ok=0;for(let t=c0;t<c1;t+=1/F){const i=Math.round(t*F),j=Math.round((k*t+b)*F);if(i<0||i>=q.length||j<0||j>=ref.length)return null;
        const a=q[i],r=ref[j];n++;if(!isNaN(a))vq++;if(!isNaN(r))vr++;if(!isNaN(a)&&!isNaN(r)&&sh!=null){let x=r-a-sh;while(x>6)x-=12;while(x<-6)x+=12;if(Math.abs(x)<=1.5)ok++}}
      return n?{voiced:vq>=0.3*n&&ok>=0.6*vq,quiet:vq<=0.2*n&&vr<=0.35*n}:null};
    /* a whole gap between the section's start (or end) and the evidence that matches the recording overall is taken in
       one go: the clip's own recitation before its first landmark (an intro ends there). A gap across a join between
       two parts does not match the line, so the span stays at the evidence, and the steps below refine it. */
    const secA=over.length?Math.min(...over.map(s=>s.a)):ca,secB=over.length?Math.max(...over.map(s=>s.b)):cb;
    if(secA<ca-0.3){const L=look(Math.max(0,secA),ca);if(L&&L.voiced)ca=Math.max(0,secA)}
    if(secB>cb+0.3){const L=look(cb,Math.min(dur,secB));if(L&&(L.voiced||L.quiet))cb=Math.min(dur,secB)}
    const S=0.25;
    /* start: only matching voice extends it (a silent edge, added or natural, is left out: the match starts where the
       recitation does); end: matching voice or a shared pause (a clip often ends in a pause of the recording) */
    for(;;){const c0=Math.max(0,ca-S);if(c0>=ca)break;const L=look(c0,ca);if(!L||!L.voiced)break;ca=c0}
    for(;;){const c1=Math.min(dur,cb+S);if(c1<=cb)break;const L=look(cb,c1);if(!L||!(L.voiced||L.quiet))break;cb=c1}
    /* the last moments of a clip (at most 1.5 s, no music or noise section there) belong to the same recording: a
       clip usually runs on to its end, and a join or outro would show as a longer stretch or another section */
    if(dur-cb>0&&dur-cb<=1.5&&!(ing.sections||[]).some(s=>s.kind!=="recitation"&&s.kind!=="silence"&&s.b>cb&&s.a<dur))cb=dur;
  }
  /* the recording cannot start before 0 or end after its length: the clip span is cut to fit */
  if(k*ca+b<0)ca=-b/k;if(recDur&&k*cb+b>recDur)cb=(recDur-b)/k;
  const start=k*ca+b,end=k*cb+b;
  /* tempo uncertainty grows towards the end of a long span (0.5 % refine step for melody, the fit for landmarks) */
  const dk=src==="melody"?0.005:0.002;
  return {start,end,clipA:ca,clipB:cb,k,b,src,err,errEnd:err+dk*(cb-ca)*k,origDur:end-start};
};
/* Step 13: several lines in one recording's hits (a clip joined from two or three places of it). After the best line,
   its inliers are taken out and the rest searched again; a further line counts when it has at least minInl inliers and
   covers mostly other clip time than the lines already found. pairs: [{tc, tr}] (from every search: clip time). */
X.lines=function(pairs,opt){
  opt=opt||{};const maxLines=opt.maxLines||3,minInl=opt.minInl||4,tol=opt.tol||0.1,out=[];
  let P=pairs.slice();
  for(let i=0;i<maxLines&&P.length>=3;i++){
    const L=X.lmLine(P,{tol});if(!(L.inliers>=(i?minInl:3))||L.k==null)break;
    const lo=L.lo,hi=L.hi;
    /* a new line must mostly cover clip time no earlier line covers */
    const overlap=out.reduce((m,o)=>Math.max(m,Math.max(0,Math.min(hi,o.hi)-Math.max(lo,o.lo))/Math.max(0.5,hi-lo)),0);
    if(overlap<=0.5)out.push(L);
    P=P.filter(p=>Math.abs(p.tr-(L.k*p.tc+L.b))>tol*3);
  }
  return out;
};
/* Step 13: the clip's parts. lines: [{code, line (lmLine result), mel, agree, ts, strength}] from every shortlisted
   recording; the strongest are taken first (agreement, then inliers, then melody), and a line is skipped when its clip
   span overlaps a part already taken by more than a third of the shorter one. Parts come back in clip order. */
X.parts=function(lines,opt){
  opt=opt||{};const minLen=opt.minLen||2;
  const S=lines.filter(l=>l.ts&&l.ts.clipB-l.ts.clipA>=minLen).slice().sort((a,b)=>(b.agree-a.agree)||(b.line.inliers-a.line.inliers)||(b.mel.score-a.mel.score));
  const taken=[];
  for(const l of S){
    const a=l.ts.clipA,b=l.ts.clipB;
    const clash=taken.some(t=>{const o=Math.min(b,t.ts.clipB)-Math.max(a,t.ts.clipA);return o>Math.min(b-a,t.ts.clipB-t.ts.clipA)/3});
    if(!clash)taken.push(l);
  }
  return taken.sort((x,y)=>x.ts.clipA-y.ts.clipA);
};
/* (A) and (B) agree: the same tempo (3 %) and the same start (0.5 s) */
X.agree=function(lm,mel,opt){
  opt=opt||{};if(!lm||lm.k==null||!mel||!(mel.score>0))return false;
  /* the melody must match well (>= 0.7), unless the landmark line is strong by itself (>= 10 inliers): a melody aligned
     in a small window around the landmark place nearly always finds something there, so a weak melody score agreeing
     says little (measured on the clip parts: wrong parts in hidden runs 35 -> 1, right parts 655 -> 653) */
  if(mel.score<(opt.minMel==null?0.7:opt.minMel)&&!(lm.inliers>=(opt.strongInl||10)))return false;
  return Math.abs(lm.k/mel.k-1)<=(opt.dk||0.03)&&Math.abs(lm.b-mel.at)<=(opt.db||0.5);
};
/* verse check. vm: the recording's verse map windows [t, su, ay, su2, ay2, conf, level]; from, to: the matched span in the
   recording; places: verses heard in the clip [{su, ay, su2, ay2, level}]. "agree": a sure window there names one of the
   clip's surahs within 5 ayat; "contradict": sure windows there name only other surahs while the clip's verse was sure;
   "none": no sure window there, or no verse heard in the clip. */
X.verseCheck=function(vm,from,to,places){
  const w=(vm||[]).filter(x=>x[0]<to&&x[0]+30>from&&x[6]===2&&x[1]);
  const sure=(places||[]).filter(p=>p&&p.su);
  if(!w.length||!sure.length)return "none";
  const near=(p,x)=>{const hit=(s,a)=>(s===p.su&&a>=p.ay-5&&a<=(p.su2===p.su?p.ay2:p.ay)+5)||(s===p.su2&&a>=p.ay2-5&&a<=p.ay2+5);return hit(x[1],x[2])||hit(x[3],x[4])||(x[1]===p.su&&x[3]===p.su)};
  for(const p of sure)for(const x of w)if(near(p,x))return "agree";
  return sure.some(p=>p.level==="confirmed")?"contradict":"none";
};
})(typeof window!=="undefined"?window:globalThis);
