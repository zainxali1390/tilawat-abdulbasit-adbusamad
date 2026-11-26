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
    return {inliers:ts.size,span:ts.size?hi-lo:0}};
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
  return {...best,n};
};
/* the best line over several searches (each with its own landmarks); searches: finderSearch results */
X.lmBest=function(searches,rec,secPerFrame){
  let best={inliers:0,n:0};
  for(const res of searches){const L=X.lmLine(X.lmPairs(res,rec,secPerFrame));if(L.inliers>best.inliers)best={...L,mode:res.mode,f:res.f}}
  return best;
};
/* (A) and (B) agree: the same tempo (3 %) and the same start (0.5 s) */
X.agree=function(lm,mel,opt){
  opt=opt||{};if(!lm||lm.k==null||!mel||!(mel.score>0))return false;
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
