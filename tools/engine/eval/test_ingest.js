// Ingestion test (step 3): every file of formats.json and every clip of cases.json through ENGINE.ingest in a real browser.
//   node test_ingest.js SETDIR OUT.jsonl      (the app served at http://localhost:8765/; FFLOCAL=dir with @ffmpeg packages, optional)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const DIR=process.argv[2],OUT=process.argv[3],FFL=process.env.FFLOCAL||'';
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({serviceWorkers:'block'});
 if(FFL)await ctx.route(/cdn\.jsdelivr\.net\/npm\/@ffmpeg\/(ffmpeg|core)@[^/]+\/dist\/(umd|esm)\/(.+)$/,r=>{
   const m=r.request().url().match(/@ffmpeg\/(ffmpeg|core)@[^/]+\/dist\/(umd|esm)\/([^?]+)/);const f=path.join(FFL,'node_modules/@ffmpeg',m[1],'dist',m[2],m[3]);
   r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.wasm')?'application/wasm':'text/javascript',headers:{'access-control-allow-origin':'*'}})});
 await ctx.route(/archive\.org|googleapis|gstatic|mp3quran/,r=>r.abort());
 await ctx.route(/\/__set\/(.+)$/,r=>{const f=path.join(DIR,decodeURIComponent(r.request().url().split('/__set/')[1]));r.fulfill({body:fs.readFileSync(f)})});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(/ffmpeg|error/i.test(m.text()))console.log('  [page]',m.text().slice(0,200))});
 await p.goto('http://localhost:8765/');await p.waitForTimeout(500);
 await p.addScriptTag({url:'http://localhost:8765/js/engine/ingest.js'});
 const fmts=JSON.parse(fs.readFileSync(path.join(DIR,'formats.json'))),cases=JSON.parse(fs.readFileSync(path.join(DIR,'cases.json')));
 fs.writeFileSync(OUT,'');
 const run=async(file,noFf)=>p.evaluate(async([u,noFf])=>{const t0=performance.now();
   try{const blob=await (await fetch(u)).blob();
     const r=await Promise.race([ENGINE.ingest(blob,{noFfmpeg:noFf}),new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(new Error('timeout 90 s'),{why:'timeout'})),90000))]);
     return {ok:true,decoder:r.decoder,format:r.format,dur:+r.dur.toFixed(3),start:r.start,sections:r.sections,ms:Math.round(performance.now()-t0)}}
   catch(e){return {ok:false,err:String(e.message),why:e.why||'',ms:Math.round(performance.now()-t0)}}},['/__set/'+encodeURIComponent(file),noFf]);
 for(const f of fmts){
   const br=await run(f.file,true);const any=br.ok?br:await run(f.file,false);
   fs.appendFileSync(OUT,JSON.stringify({kind:'format',file:f.file,ext:f.ext,expect:f.dur,browser:br.ok,browserWhy:br.ok?'':br.why,...any})+'\n');
   console.log('format',f.ext.padEnd(5),'browser',br.ok?'ok':'NO','->',any.ok?any.decoder+' '+any.dur+'s':'FAILED '+(any.err+' '+any.why).slice(0,120));
 }
 for(const c of cases){
   const r=await run(c.file,false);
   console.log('case',c.name,r.ok?('start '+r.start+' '+r.ms+'ms'):('FAILED '+r.err));
   fs.appendFileSync(OUT,JSON.stringify({kind:'case',name:c.name,variant:c.variant,intro:c.intro,segments:c.segments,...r})+'\n');
 }
 console.log('done; page errors',errs.slice(0,3));await b.close();
})();
