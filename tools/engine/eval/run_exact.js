// Step 10 test: the whole narrowing + exact-match pipeline in the real app page, on every clip of the test set, with
// the original present and hidden. The app's own finder runs first (its landmark searches are kept); then, in the page:
// melody from the clip (js/engine/ingest.js, melody.js) → melody candidates (archive.js: mh/ hashes, mf/ alignment) →
// landmark and verse candidates → shortlist (candidates.js) → for every shortlisted recording the two alignments and the
// verse check (match.js). One line per clip and run: the shortlist with each recording's evidence.
//   node run_exact.js SETDIR OUT.jsonl PREDS_DIR        env PART, OF, CHANNEL, HIDE=0
// SETDIR must be served at http://localhost:8765/set/ (the runner fetches the clip there for the 16 kHz melody).
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const zlib=require('zlib');
const DIR=process.argv[2],OUT=process.argv[3],PRED=process.argv[4],PART=+(process.env.PART||0),OF=+(process.env.OF||1);
const cases=JSON.parse(fs.readFileSync(path.join(DIR,'cases.json'))).filter((c,i)=>i%OF===PART);
const preds={};for(const f of fs.readdirSync(PRED).filter(f=>f.startsWith('pred-base-q8-')))for(const l of fs.readFileSync(path.join(PRED,f),'utf8').split('\n').filter(Boolean)){const r=JSON.parse(l);preds[r.name]=r}
const places=n=>((preds[n]||{}).wins||[]).filter(w=>w.p).map(w=>({su:w.p[0],ay:w.p[1],su2:w.p[2],ay2:w.p[3],level:w.p[4]}));
(async()=>{
 const b=await chromium.launch(process.env.CHANNEL?{channel:process.env.CHANNEL}:{});const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.route(/archive\.org|googleapis|gstatic|mp3quran/,r=>r.abort());
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/');await p.evaluate(()=>{S.lang='en';save()});
 await p.goto('http://localhost:8765/#finder');await p.waitForTimeout(1500);
 for(const s of ['js/engine/ingest.js','js/engine/melody.js','js/engine/archive.js','js/engine/candidates.js','js/engine/match.js','js/engine/verify.js'])await p.addScriptTag({url:s});
 const man=await p.evaluate(async()=>(await finderManifest()).recs.map(r=>r[0]));
 fs.writeFileSync(OUT,'');
 for(const c of cases)for(const hide of (process.env.HIDE==='0'?[false]:[false,true])){
  const truth=[...new Set([...c.segments.map(g=>g.code),...(c.copies||[])])];
  const ex=hide?truth.map(x=>man.indexOf(x)).filter(i=>i>=0):[];
  await p.evaluate(ex=>{FINDER.exclude=ex.length?new Set(ex):null;try{localStorage.removeItem('abq-fcache')}catch(e){}},ex);
  const t0=Date.now();let res;
  try{
   await p.evaluate(()=>{finderLast=[];document.querySelector('#fResults').innerHTML='';window.__started=false;window.__res=[];
     if(!window.__wrapped){const run=finderRun;finderRun=async(...a)=>{window.__started=true;return run(...a)};
       const fsr=finderSearch;finderSearch=async(...a)=>{const r=await fsr(...a);r.mode=a[3];r.f=a[2];window.__res.push(r);return r};window.__wrapped=true}});
   await p.setInputFiles('#fFile',path.join(DIR,c.file));
   await p.waitForFunction(()=>window.__started||FINDER.busy,null,{timeout:30000});
   await p.waitForFunction(()=>!FINDER.busy&&document.querySelector('#fResults').innerHTML.length>0,null,{timeout:600000});
   const finder=await p.evaluate(()=>finderLast.map(r=>({code:r.code,level:r.level,start:r.start,end:r.end,clipA:r.clipA,clipB:r.clipB})));
   res=await p.evaluate(async({file,places,hidden,finderNow})=>{
     const hid=new Set(hidden),t0=performance.now(),T={};
     const ing=await ENGINE.ingest(await (await fetch(file)).blob(),{maxSecs:90});
     const q=MELODY.unpack(MELODY.pack(MELODY.f0(ing.pcm)));T.melody=performance.now()-t0;
     /* melody candidates: hash vote on the whole archive, the first 30 re-ranked by alignment */
     const mhm=await ARCHIVE.mhManifest(),look=await ARCHIVE.melodyLookup(MELODY.hashes(q,{expand:true}).map(x=>x[0]));
     const vote=MELODY.hashVote(q,look,{top:60,avgPost:mhm.entries/mhm.hashes}).list.filter(x=>!hid.has(mhm.recs[x.rec])).slice(0,30);
     const mel=[];for(const v of vote){const code=mhm.recs[v.rec],ref=await ARCHIVE.melody(code),a=ref?MELODY.alignNear(q,ref,v.t):{score:0};
       mel.push({code,score:a.score||0,t:a.score>0?a.at:v.t,k:a.k})}
     T.melCands=performance.now()-t0;
     /* landmark and verse candidates, shortlist */
     const lm=CAND.landmarks(window.__res,SEC_PER_FRAME).filter(x=>!hid.has(x.code));
     const sus=[...new Set(places.flatMap(p=>[p.su,p.su2]))],vis={};for(const s of sus)vis[s]=await ARCHIVE.verses(s);
     const verse=CAND.verses(places,s=>vis[s],2).filter(x=>!hid.has(x.code));
     const short=CAND.fuse({lm,verse,mel:CAND.melody(mel)},{K:30});
     T.shortlist=performance.now()-t0;
     /* exact match for every shortlisted recording */
     const recOf=new Map(FINDER.man.recs.map((r,i)=>[r[0],i])),out=[];
     for(const s of short){
       const rec=recOf.get(s.code),L=rec==null?{inliers:0,n:0}:MATCH.lmBest(window.__res,rec,SEC_PER_FRAME);
       const ref=await ARCHIVE.melody(s.code);let M={score:0};
       if(ref){for(const h of [...new Set([L.inliers>=3?L.b:null,s.t].filter(x=>x!=null).map(x=>Math.round(x)))]){const a=MELODY.alignNear(q,ref,h);if(a.score>M.score)M=a}}
       const b=L.inliers>=3?L.b:(M.score>0?M.at:s.t),k=L.inliers>=3?L.k:(M.k||1);
       const vm=await vmOf(s.code),vc=b==null?'none':MATCH.verseCheck(vm,b,b+ing.dur*k,places);
       const ts=MATCH.timestamp(L,M,ing,rec==null?null:FINDER.man.recs[rec][1],{q,ref});
       out.push({code:s.code,fused:+s.score.toFixed(4),src:s.src,t:s.t==null?null:+s.t.toFixed(1),
         lm:{inl:L.inliers,span:+(L.span||0).toFixed(1),k:L.k==null?null:+L.k.toFixed(4),b:L.b==null?null:+L.b.toFixed(2),n:L.n,mode:L.mode||null},
         mel:{score:+(M.score||0).toFixed(3),k:M.k?+M.k.toFixed(4):null,at:M.score>0?+M.at.toFixed(2):null,shift:M.shift!=null?+M.shift.toFixed(2):null},
         agree:MATCH.agree(L,M),verse:vc,
         ts:ts&&{start:+ts.start.toFixed(2),end:+ts.end.toFixed(2),clipA:+ts.clipA.toFixed(2),clipB:+ts.clipB.toFixed(2),k:+ts.k.toFixed(4),src:ts.src,err:+ts.err.toFixed(3),errEnd:+ts.errEnd.toFixed(3)}});
     }
     T.exact=performance.now()-t0;
     /* Step 13: every line in every shortlisted recording, each checked on its own stretch of the clip; the parts */
     const lineEntries=[];
     for(const s of short){
       const rec=recOf.get(s.code);if(rec==null)continue;
       const pairs=window.__res.flatMap(res=>MATCH.lmPairs(res,rec,SEC_PER_FRAME));
       const lines=MATCH.lines(pairs,{maxLines:3,minInl:4});if(!lines.length)continue;
       const ref=await ARCHIVE.melody(s.code),vm=await vmOf(s.code),recDur=FINDER.man.recs[rec][1];
       for(const L of lines){
         const sa=Math.max(0,L.lo-0.5),sb=Math.min(ing.dur,L.hi+0.5),sub=q.subarray(Math.round(sa*20),Math.round(sb*20));
         let M={score:0};if(ref&&sub.length>=40){const a=MELODY.alignNear(sub,ref,L.b+L.k*sa);if(a.score>0)M={...a,at:a.at-a.k*sa}}
         const ag=MATCH.agree(L,M),ts=MATCH.timestamp(L,M,ing,recDur,{q,ref});
         const vc=ts?MATCH.verseCheck(vm,ts.start,ts.end,places):'none';
         lineEntries.push({code:s.code,line:L,lm:{inl:L.inliers,span:+(L.span||0).toFixed(1),k:L.k,b:L.b},mel:{score:M.score||0,k:M.k||null,at:M.score>0?M.at:null},agree:ag,verse:vc,ts});
       }
     }
     const parts=MATCH.parts(lineEntries).map(p=>{
       const over=lineEntries.filter(l=>l.ts&&Math.min(l.ts.clipB,p.ts.clipB)-Math.max(l.ts.clipA,p.ts.clipA)>0.5*(p.ts.clipB-p.ts.clipA));
       /* a finder result lends its verdict only when it covers mostly the same stretch, both ways (not a fragment of it) */
       const fin=finderNow.filter(f=>{if(f.clipA==null)return false;const o=Math.min(f.clipB,p.ts.clipB)-Math.max(f.clipA,p.ts.clipA);return o>0.5*(p.ts.clipB-p.ts.clipA)&&o>0.5*(f.clipB-f.clipA)});
       const d=VERIFY.decide(over,fin);
       return {clipA:+p.ts.clipA.toFixed(2),clipB:+p.ts.clipB.toFixed(2),level:d.level,code:d.top?d.top.code:null,
         start:d.top&&d.top.ts?+d.top.ts.start.toFixed(2):null,end:d.top&&d.top.ts?+d.top.ts.end.toFixed(2):null,
         inl:p.lm.inl,mel:+p.mel.score.toFixed(3),agree:p.agree,copies:d.copies.map(c=>c.code)};
     });
     T.parts=performance.now()-t0;
     return {parts,dur:ing.dur,sections:(ing.sections||[]).map(x=>[+x.a.toFixed(2),+x.b.toFixed(2),x.kind]),list:out,ms:Object.fromEntries(Object.entries(T).map(([k,v])=>[k,Math.round(v)]))};
   },{file:'set/'+c.file,places:places(c.name),hidden:hide?truth:[],finderNow:finder});
   res.finder=finder;
  }catch(e){res={error:String(e.message).slice(0,300),list:[]}}
  fs.appendFileSync(OUT,JSON.stringify({name:c.name,variant:c.variant,hide,code:c.code,copies:c.copies,segments:c.segments,ms:Date.now()-t0,...res})+'\n');
  const tr=(res.list||[]).find(x=>truth.includes(x.code));
  console.log(c.name,hide?'hidden':'',tr?`truth lm ${tr.lm.inl} mel ${tr.mel.score} agree ${tr.agree} verse ${tr.verse}`:'truth not in shortlist',(res.list||[]).filter(x=>x.agree&&!truth.includes(x.code)).length+' wrong agreeing',res.error||'',Math.round((Date.now()-t0)/1000)+'s');
 }
 console.log('done; page errors',errs.slice(0,5));await b.close();
})();
