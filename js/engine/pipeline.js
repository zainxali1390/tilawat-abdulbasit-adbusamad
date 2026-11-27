/* Recognition engine: the whole pipeline after the app's sound search (docs/RECOGNITION-APP.md, Step 14).
   ENGINE.run({blob, searches, places, finder, man, secPerFrame, vmOf, onStep}) → {parts:[…], pcm, dur}
     blob      the clip as chosen (decoded again at 16 kHz for the melody)
     searches  every finderSearch result of this search (as is, pitch, speed, tempo), with their landmark hits
     places    the verses heard in the clip [{su, ay, su2, ay2, level}] (js/ayah.js)
     finder    the finder's own results [{code, level, start, end, clipA, clipB}]
     man, secPerFrame, vmOf   the recording index manifest, its frame length, and the verse-map reader (js/finder.js)
   Steps: the clip's melody → melody candidates (hash vote on the whole archive, the first 30 re-ranked by alignment) →
   landmark and verse candidates → shortlist (≤ 30) → every line in every shortlisted recording, each checked on its own
   stretch (landmarks + melody agreement, verse check, timestamp) → the clip's parts, each with its own level
   (VERIFY.decide). The same code as the in-page test (tools/engine/eval/run_exact.js), measured on 640 clips. */
(function(G){
const E=G.ENGINE||(G.ENGINE={});
E.run=async function(o){
  /* from js/finder.js (its top-level constants are not on window, so they are passed in) */
  const step=o.onStep||(()=>{}),secPF=o.secPerFrame,man=o.man,vmOf=o.vmOf||(()=>null);
  step("melody",0);
  const ing=await E.ingest(o.blob,{maxSecs:600});
  const q=G.MELODY.unpack(G.MELODY.pack(G.MELODY.f0(ing.pcm)));
  /* melody candidates */
  step("candidates",0.2);
  let mel=[];
  try{
    const mhm=await G.ARCHIVE.mhManifest(),look=await G.ARCHIVE.melodyLookup(G.MELODY.hashes(q,{expand:true}).map(x=>x[0]));
    const vote=G.MELODY.hashVote(q,look,{top:60,avgPost:mhm.entries/mhm.hashes}).list.slice(0,30);
    for(const v of vote){const code=mhm.recs[v.rec],ref=await G.ARCHIVE.melody(code),a=ref?G.MELODY.alignNear(q,ref,v.t):{score:0};
      mel.push({code,score:a.score||0,t:a.score>0?a.at:v.t,k:a.k})}
  }catch(e){mel=[]}   // the melody index is optional: without it the landmark and verse candidates remain
  const lm=G.CAND.landmarks(o.searches,secPF);
  const sus=[...new Set((o.places||[]).flatMap(p=>[p.su,p.su2]).filter(Boolean))],vis={};
  for(const s of sus)vis[s]=await G.ARCHIVE.verses(s);
  const verse=G.CAND.verses(o.places||[],s=>vis[s],2);
  const short=G.CAND.fuse({lm,verse,mel:G.CAND.melody(mel)},{K:30});
  /* every line in every shortlisted recording */
  step("checking",0.5);
  const recOf=new Map(man.recs.map((r,i)=>[r[0],i])),lines=[];
  for(let n=0;n<short.length;n++){
    const s=short[n],rec=recOf.get(s.code);if(rec==null)continue;step("checking",0.5+0.5*n/short.length);
    const pairs=o.searches.flatMap(res=>G.MATCH.lmPairs(res,rec,secPF));
    let found=G.MATCH.lines(pairs,{maxLines:3,minInl:4});
    const ref=await G.ARCHIVE.melody(s.code),vm=await vmOf(s.code),recDur=man.recs[rec][1];
    /* a recording found by melody or verses alone (no landmark line): its melody alignment over the whole clip */
    if(!found.length&&ref&&s.t!=null){const a=G.MELODY.alignNear(q,ref,s.t);if(a.score>0)found=[{inliers:0,n:0,k:null,b:null,lo:null,hi:null,_mel:a}]}
    /* the whole-clip evidence too (Step 10: the best search's line, the melody over the whole clip), so the parts are
       never weaker than the single answer: a pitch-shifted clip's hits can be clearer in one search than in all together */
    {const B=G.MATCH.lmBest(o.searches,rec,secPF);
      if(B.inliers>=3&&ref){let M={score:0};for(const h of [...new Set([B.b,s.t].filter(x=>x!=null).map(x=>Math.round(x)))]){const a=G.MELODY.alignNear(q,ref,h);if(a.score>M.score)M=a}
        const ag=G.MATCH.agree(B,M),ts=G.MATCH.timestamp(B,M,ing,recDur,{q,ref});
        if(ts)lines.push({code:s.code,line:B,lm:{inl:B.inliers,span:+(B.span||0).toFixed(1),k:B.k,b:B.b},mel:{score:M.score||0,k:M.k||null,at:M.score>0?M.at:null,shift:M.shift},agree:ag,verse:G.MATCH.verseCheck(vm,ts.start,ts.end,o.places||[]),ts})}}
    for(const L of found){
      let M={score:0};
      if(L._mel)M=L._mel;
      else{const sa=Math.max(0,L.lo-0.5),sb=Math.min(ing.dur,L.hi+0.5),sub=q.subarray(Math.round(sa*20),Math.round(sb*20));
        if(ref&&sub.length>=40){const a=G.MELODY.alignNear(sub,ref,L.b+L.k*sa);if(a.score>0)M={...a,at:a.at-a.k*sa}}}
      const ag=G.MATCH.agree(L,M),ts=G.MATCH.timestamp(L,M,ing,recDur,{q,ref});
      const vc=ts?G.MATCH.verseCheck(vm,ts.start,ts.end,o.places||[]):"none";
      lines.push({code:s.code,line:L,lm:{inl:L.inliers,span:+(L.span||0).toFixed(1),k:L.k,b:L.b},mel:{score:M.score||0,k:M.k||null,at:M.score>0?M.at:null,shift:M.shift},agree:ag,verse:vc,ts});
    }
  }
  /* the parts, each with its own level */
  const parts=G.MATCH.parts(lines).map(p=>{
    const over=lines.filter(l=>l.ts&&Math.min(l.ts.clipB,p.ts.clipB)-Math.max(l.ts.clipA,p.ts.clipA)>0.5*(p.ts.clipB-p.ts.clipA));
    const fin=(o.finder||[]).filter(f=>{if(f.clipA==null)return false;const ov=Math.min(f.clipB,p.ts.clipB)-Math.max(f.clipA,p.ts.clipA);return ov>0.5*(p.ts.clipB-p.ts.clipA)&&ov>0.5*(f.clipB-f.clipA)});
    const d=G.VERIFY.decide(over,fin);
    const ts=d.top&&d.top.code===p.code?p.ts:(d.top&&d.top.ts);
    const copies=d.copies.map(c=>{const l=lines.find(x=>x.code===c.code&&x.ts);return {code:c.code,start:l?l.ts.start:null,end:l?l.ts.end:null}}).filter(c=>c.start!=null);
    return {level:d.level,code:d.top?d.top.code:null,clipA:p.ts.clipA,clipB:p.ts.clipB,start:ts?ts.start:null,end:ts?ts.end:null,
      k:p.ts.k,shift:p.mel.shift!=null?p.mel.shift:null,reasons:d.reasons,copies};
  });
  step("done",1);
  return {parts,pcm:ing.pcm,dur:ing.dur};
};
})(typeof window!=="undefined"?window:globalThis);
