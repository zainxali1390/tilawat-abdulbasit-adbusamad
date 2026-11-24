// Mixed index builds: a phone that kept index parts of an earlier build must not show a wrong title.
// node mixed_builds.js <earlier build commit>   (EVAL_DIR/v_head_finder.js = the app version to compare, EVAL_DIR/userclip/clip.mp4 = a clip)
const {chromium}=require('playwright');const fs=require('fs');const {execFileSync}=require('child_process');
const SP=(process.env.EVAL_DIR||'eval-work').replace(/\/?$/,'/'),R=require('path').resolve(__dirname,'..','..');
const OLD=process.argv[2];   // the earlier same-day index build
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({serviceWorkers:'block'});
 await ctx.route(/archive\.org|googleapis|gstatic|mp3quran|jsdelivr/,r=>r.abort());
 let useOld=true,code='head';
 await ctx.route(/\/js\/finder\.js/,r=>code==='head'?r.fulfill({body:fs.readFileSync(SP+'v_head_finder.js'),contentType:'text/javascript'}):r.continue());
 await ctx.route(/\/fp\/s\//,r=>{if(!useOld)return r.continue();const m=r.request().url().match(/fp\/s\/(..)\/(..)\.bin/);
   let body;try{body=execFileSync('git',['-C',R,'show',`${OLD}:fp/s/${m[1]}/${m[2]}.bin`],{maxBuffer:1<<26})}catch(e){return r.fulfill({status:404})}r.fulfill({body,contentType:'application/octet-stream'})});
 await ctx.route(/\/fp\/manifest\.json/,r=>useOld?r.fulfill({body:execFileSync('git',['-C',R,'show',`${OLD}:fp/manifest.json`]),contentType:'application/json'}):r.continue());
 const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 const run=async(label)=>{await p.goto('http://localhost:8765/');await p.evaluate(()=>{S.lang='en';S.fVerses=false;save();localStorage.removeItem('abq-fcache')});await p.goto('http://localhost:8765/#finder');await p.waitForTimeout(1000);
   await p.setInputFiles('#fFile',SP+'userclip/clip.mp4');await p.waitForFunction(()=>!FINDER.busy&&document.querySelector('#fResults').innerHTML.length>0,null,{timeout:300000});
   console.log(label.padEnd(60),'→',(await p.$eval('#fResults',e=>e.innerText)).replace(/\n+/g,' / ').slice(0,120))};
 await run('1. earlier today: search with the earlier build (parts saved)');
 useOld=false;await run('2. after the rebuild, previous app version (date-named copy)');
 code='new';await run('3. after the rebuild, fixed app (build-named copy)');
 await b.close()})();
