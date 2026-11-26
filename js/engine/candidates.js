/* Recognition engine, stage "candidates" (docs/RECOGNITION-DESIGN.md §4.1, docs/RECOGNITION-CANDIDATES.md).
   When the landmark search confirms nothing, several independent searches each suggest recordings; this joins them into
   one short list (≤ 30) for the slower checks (melody alignment, Step 10) to look at.

   Sources, each a ranked list of {code, t (seconds in the recording where the clip starts, or null), …}:
     CAND.landmarks(searches)        every finderSearch result's vote candidates (as is, pitch- and tempo-corrected)
     CAND.verses(places, getSurah)   recordings where the recognised ayat were heard (vi/ verse index)
     CAND.melody(list)               melody-hash votes (js/engine/melody.js), when available
   CAND.fuse(lists, opt) → [{code, score, t, src:{lm:rank, verse:rank, mel:rank}}]
   Reciprocal-rank fusion (Σ w/(k + rank)); a recording put near the same time by two sources gets a bonus, as one
   searched by sound and one by words rarely agree by chance. Pure functions; works in the browser and in Node. */
(function(G){
const C=G.CAND||(G.CAND={});
/* searches: [{mode, f, blocks:[{t0, c:[[code, votes, spread, t], …]}]}] (the runner's record of finderSearch), or
   finderSearch results directly ({man, blocks:[{c:[{rec, off, s, sp}]}]}, with the frame length) */
C.landmarks=function(searches,secPerFrame){
  const best=new Map();
  for(const S of searches){
    const blocks=S.blocks||[];
    for(const b of blocks)for(const c of (b.c||[])){
      const [code,s,sp,t]=Array.isArray(c)?c:[S.man.recs[c.rec][0],c.s,c.sp,c.off*secPerFrame];
      const o=best.get(code);
      if(!o||s>o.s||(s===o.s&&sp>o.sp))best.set(code,{code,s,sp,t,mode:S.mode,f:S.f});
    }
  }
  return [...best.values()].sort((a,b)=>b.s-a.s||b.sp-a.sp);
};
/* places: [{su, ay, su2, ay2, level}] from js/ayah.js; getSurah(su) → the vi/SSS.json object (already loaded).
   A recording is listed when it holds an ayah within R of the recognised range; nearer and surer windows rank first. */
C.verses=function(places,getSurah,R){
  R=R==null?2:R;const best=new Map();
  for(const p of places){
    if(!p||!p.su)continue;
    const span=p.su2===p.su?[[p.su,p.ay,p.ay2]]:[[p.su,p.ay,p.ay+3],[p.su2,Math.max(1,p.ay2-3),p.ay2]];
    for(const [su,a,b] of span){
      const V=getSurah(su);if(!V)continue;
      for(let ay=a-R;ay<=b+R;ay++){
        const list=V.a[ay];if(!list)continue;const d=Math.max(0,a-ay,ay-b);
        for(const [ri,t,lv] of list){const code=V.recs[ri],k=d*3-lv-(p.level==="confirmed"?0:0),o=best.get(code);
          if(!o||k<o.k)best.set(code,{code,t,k,d,lv,su,ay})}
      }
    }
  }
  return [...best.values()].sort((x,y)=>x.k-y.k);
};
C.melody=function(list){return (list||[]).slice().sort((a,b)=>b.score-a.score)};
/* lists: {lm:[…], verse:[…], mel:[…]}; opt: {K, k, w:{lm, verse, mel}, near (s), bonus} */
C.fuse=function(lists,opt){
  opt=Object.assign({K:30,k:60,w:{lm:1,verse:1,mel:1},near:120,bonus:1},opt||{});
  const acc=new Map();
  for(const [src,list] of Object.entries(lists)){
    if(!list)continue;const w=(opt.w[src]==null?1:opt.w[src]);
    list.forEach((x,rank)=>{let o=acc.get(x.code);if(!o){o={code:x.code,score:0,t:null,src:{},times:{}};acc.set(x.code,o)}
      if(o.src[src]!=null)return;o.src[src]=rank;o.times[src]=x.t;o.score+=w/(opt.k+rank);
      if(o.t==null&&x.t!=null)o.t=x.t});
  }
  for(const o of acc.values()){
    const ts=Object.values(o.times).filter(t=>t!=null);let agree=false;
    for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++)if(Math.abs(ts[i]-ts[j])<=opt.near)agree=true;
    if(agree)o.score+=opt.bonus/opt.k;
    /* the landmark time is the most precise; keep it when there is one */
    if(o.times.lm!=null)o.t=o.times.lm;else if(o.times.mel!=null)o.t=o.times.mel;
    o.agree=agree;
  }
  return [...acc.values()].sort((a,b)=>b.score-a.score).slice(0,opt.K);
};
})(typeof window!=="undefined"?window:globalThis);
