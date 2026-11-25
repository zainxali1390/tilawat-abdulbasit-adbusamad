// Baseline / regression runner: every clip of cases.json through the app's real "Find a recitation" (js/finder.js as it is),
// twice: with the original in the library, and with the original and its copies hidden (anything confirmed then is false).
//   node run_finder.js SETDIR OUT.jsonl        env PART, OF (shard), HIDE=0 to skip the hidden runs
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const DIR=process.argv[2],OUT=process.argv[3],PART=+(process.env.PART||0),OF=+(process.env.OF||1);
const cases=JSON.parse(fs.readFileSync(path.join(DIR,'cases.json'))).filter((c,i)=>i%OF===PART);
(async()=>{
 const b=await chromium.launch(process.env.CHANNEL?{channel:process.env.CHANNEL}:{});const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.route(/archive\.org|googleapis|gstatic|mp3quran/,r=>r.abort());
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/');await p.evaluate(()=>{S.lang='en';save()});
 await p.goto('http://localhost:8765/#finder');await p.waitForTimeout(1500);
 const man=await p.evaluate(async()=>(await finderManifest()).recs.map(r=>r[0]));
 fs.writeFileSync(OUT,'');
 for(const c of cases)for(const hide of (process.env.HIDE==='0'?[false]:[false,true])){
  const ex=hide?[c.code,...c.copies].map(x=>man.indexOf(x)).filter(i=>i>=0):[];
  await p.evaluate(ex=>{FINDER.exclude=ex.length?new Set(ex):null;try{localStorage.removeItem('abq-fcache')}catch(e){}},ex);
  const t0=Date.now();let res;
  try{
   /* clear the previous answer, then wait for this search to start and to finish */
   await p.evaluate(()=>{finderLast=[];document.querySelector('#fResults').innerHTML='';window.__started=false;
     if(!window.__wrapped){const run=finderRun;finderRun=async(...a)=>{window.__started=true;return run(...a)};window.__wrapped=true}});
   await p.setInputFiles('#fFile',path.join(DIR,c.file));
   await p.waitForFunction(()=>window.__started||FINDER.busy,null,{timeout:30000});
   await p.waitForFunction(()=>!FINDER.busy&&document.querySelector('#fResults').innerHTML.length>0,null,{timeout:600000});
   res=await p.evaluate(()=>({list:finderLast.map(r=>{const o={};for(const [k,v] of Object.entries(r))if(v===null||['number','string','boolean'].includes(typeof v))o[k]=v;
     o.copies=(r.copies||[]).map(x=>x.code);if(r.verse&&r.verse.place){const q=r.verse.place;o.verse={s:q.surah,a:q.ayah,s2:q.surah2,a2:q.ayah2,l:q.level}}
     if(r.mapVerse)o.mapVerse={s:r.mapVerse.surah,a:r.mapVerse.ayah,l:r.mapVerse.level};return o}),
     nf:[...document.querySelectorAll('#fResults .verses .fverse')].length,
     text:document.querySelector('#fResults').innerText.slice(0,300)}));
  }catch(e){res={error:String(e.message).slice(0,200),list:[]}}
  fs.appendFileSync(OUT,JSON.stringify({name:c.name,variant:c.variant,hide,code:c.code,copies:c.copies,segments:c.segments,other_copies:c.other_copies,ms:Date.now()-t0,...res})+'\n');
  console.log(c.name,hide?'hidden':'',res.list.slice(0,2).map(r=>(r.code===c.code?'RIGHT ':'')+r.level+' '+(r.start!=null?r.start.toFixed(1):'')).join(' | '),Math.round((Date.now()-t0)/1000)+'s');
 }
 console.log('done; page errors',errs.slice(0,5));await b.close();
})();
