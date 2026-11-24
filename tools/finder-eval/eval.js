// Accuracy harness: every clip as a positive (recording in the library) and as a negative (the recording and all its
// copies hidden from the search). VER=old|cur  V=1 (verses on)  OUT=file
const {chromium}=require('playwright');const fs=require('fs');
const SP=(process.env.EVAL_DIR||'eval-work').replace(/\/?$/,'/');const NM=SP+'asr/node_modules/';
const VER=process.env.VER||'cur',OUT=process.env.OUT||SP+'eval-'+VER+'.jsonl',ONLY=process.env.ONLY||'';
const cases=JSON.parse(fs.readFileSync(process.env.CASES||SP+'evalclips/cases.json')).filter(c=>c.name.includes(ONLY));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.route(/cdn\.jsdelivr\.net\/npm\/(@huggingface\/transformers|onnxruntime-web)@[^/]+\/dist\/(.+)$/,async r=>{
  const m=r.request().url().match(/npm\/(@huggingface\/transformers|onnxruntime-web)@[^/]+\/dist\/([^?]+)/);const f=NM+m[1]+'/dist/'+m[2];
  if(!fs.existsSync(f))return r.fulfill({status:404});r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.wasm')?'application/wasm':'text/javascript',headers:{'access-control-allow-origin':'*'}})});
 await ctx.route(/archive\.org|googleapis|gstatic|mp3quran|jsdelivr\.net\/npm\/quran/,r=>r.abort());
 if(VER==='cur')await ctx.route(/\/js\/finder\.js/,r=>r.fulfill({body:fs.readFileSync(SP+'v_cur_finder.js'),contentType:'text/javascript'}));
 if(VER==='old'){await ctx.route(/\/js\/finder\.js/,r=>r.fulfill({body:fs.readFileSync(SP+'v_old_finder.js'),contentType:'text/javascript'}));
   await ctx.route(/\/js\/fp\.js/,r=>r.fulfill({body:fs.readFileSync(SP+'v_old_fp.js'),contentType:'text/javascript'}))}
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/');await p.evaluate(v=>{S.lang='en';S.fVerses=v;save()},process.env.V==='1');await p.goto('http://localhost:8765/#finder');await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.__sur=tr=>{if(!tr.eg)return tr.n?[tr.n]:[];const o=[];for(const part of (tr.tEn||'').split(/\s*·\s*/)){const q=part.replace(/^(Sūrah|Surah)\s+/i,'');let best=0,bl=0;SURAHS.forEach((s,i)=>{const n=s[1];if(q.startsWith(n)&&n.length>bl&&!/[a-zāīūḥʿʾ]/i.test(q.charAt(n.length)||' ')){best=i+1;bl=n.length}});if(best)o.push(best)}return o}});
 const man=await p.evaluate(async()=>(await finderManifest()).recs.map(r=>r[0]));
 fs.writeFileSync(OUT,'');
 for(const c of cases)for(const hide of [false,true]){
  const ex=hide?[c.code,...c.copies].map(x=>man.indexOf(x)).filter(i=>i>=0):[];
  await p.evaluate(ex=>{FINDER.exclude=ex.length?new Set(ex):null;localStorage.removeItem('abq-fcache')},ex);
  const t0=Date.now();
  await p.setInputFiles('#fFile',c.file);
  await p.waitForFunction(()=>!FINDER.busy&&document.querySelector('#fResults').innerHTML.length>0,null,{timeout:300000});
  const res=await p.evaluate(code=>{const truth=__sur(trFromCode(code));
    return {truth,list:finderLast.map(r=>({code:r.code,level:r.level,start:r.start,conf:r.conf,sur:__sur(r.tr),copies:(r.copies||[]).map(x=>x.code),
      verse:r.verse&&r.verse.place?{s:r.verse.place.surah,s2:r.verse.place.surah2,a:r.verse.place.ayah,l:r.verse.place.level,w:!!r.verse.place.within}:null})),
      nf:[...document.querySelectorAll('#fResults .verses .fverse')].map(e=>({l:e.classList.contains('confirmed')?'c':'p',s:SURAHS.findIndex(x=>(e.querySelector('.fsura span:not([lang])')||{}).textContent==='Sūrah '+x[1])+1}))}},c.code);
  fs.appendFileSync(OUT,JSON.stringify({name:c.name,variant:c.variant,hide,code:c.code,copies:c.copies,start:c.start,ms:Date.now()-t0,...res})+'\n');
 }
 console.log('done',cases.length*2,'runs; errors',errs.slice(0,5));await b.close()})();
