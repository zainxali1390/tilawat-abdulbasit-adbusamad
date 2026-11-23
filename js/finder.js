/* "Find a recitation": recognise which Abdul Basit recording a clip comes from, and where in it.
   1. the clip (audio or video file, or the microphone) is decoded in the browser to mono 8 kHz
   2. its landmarks are made with js/fp.js (same method as the index)
   3. only the index files those landmarks fall in are fetched from fp/s/… (built by tools/fingerprint/build_index.py)
   4. landmarks that agree on one recording at one time offset vote for it; the offset is the clip's position
   5. a match is confirmed only when it clearly beats every other recording; otherwise it is "possible" or "no match"
   The clip itself never leaves the phone. Nothing is guessed: titles, places and dates come from the library. */
if(!P.wave)P.wave='<path d="M3 12h1.5M6.5 8v8M10 4.5v15M13.5 7.5v9M17 10v4M20.5 11.5v1"/>';
if(!P.upload)P.upload='<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>';
if(!P.mic)P.mic='<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>';

Object.assign(I18N.en,{fTitle:"Find a recitation",fIntro:"Have a clip of Sheikh Abdul Basit? Choose an audio or video file, or record it playing. The app finds which recording in the library it comes from, and where.",
  fChoose:"Choose audio or video",fRecord:"Record",fStop:"Stop recording",fTip:"10–30 seconds of clear recitation works best. The clip stays on your phone; only small parts of the recording index are downloaded.",
  fReading:"Reading the audio…",fListening:"Listening…",fSearching:"Searching the library…",fSpeed:"Trying the clip at a different speed…",fOf:"{a} of {b} index parts",
  fConfirmed:"Confirmed match",fPossible:"Possible match",fNone:"No reliable match",fNoneTx:"This clip doesn't match any recording in the library. It may come from a recording the app doesn't have, or it may be too short, too noisy or changed too much. Try 15–30 seconds of clear recitation.",
  fAt:"In the recording: {a} – {b}",fLen:"{n} s matched",fConf:"Confidence {n}%",fPts:"{a} moments of your clip agree (next best recording: {b})",fSec:"Section {n}",fClip:"from {a} to {b} in your clip",
  fPlayFrom:"Play from here",fPlaySec:"Play this section",fFull:"Full recitation",fVerses:"Read the surah",fSave:"Save",fSaved:"Saved to Favourites, with a pin at the match",
  fAlso:"Also found in another copy of this recording:",fSpeedNote:"The clip seems to be {n}% faster or slower than the original.",
  fNoIndex:"The recording index isn't available yet. Please try again later.",fOffline:"Searching needs an internet connection.",fBad:"This file couldn't be read as audio. Try another file, or record the clip instead.",
  fTooShort:"The clip is too short. At least 4 seconds are needed.",fMicNo:"Recording isn't available on this device or was not allowed.",fLong:"Only the first 10 minutes of the clip are searched.",
  fAboutTx:"Library searched: {n} recordings, {h} hours (index of {d}).",fFailed:"{n} recordings could not be indexed and can't be found."});
Object.assign(I18N.ar,{fTitle:"ابحث عن تلاوة بمقطع",fIntro:"لديك مقطع للشيخ عبد الباسط؟ اختر ملف صوت أو فيديو، أو سجّله أثناء تشغيله. يجد التطبيق التسجيل الذي جاء منه في المكتبة، وموضعه.",
  fChoose:"اختر ملف صوت أو فيديو",fRecord:"تسجيل",fStop:"إيقاف التسجيل",fTip:"الأفضل من ١٠ إلى ٣٠ ثانية من تلاوة واضحة. يبقى المقطع على هاتفك؛ يُنزَّل فقط جزء صغير من فهرس التسجيلات.",
  fReading:"جارٍ قراءة الصوت…",fListening:"جارٍ الاستماع…",fSearching:"جارٍ البحث في المكتبة…",fSpeed:"تجربة المقطع بسرعة مختلفة…",fOf:"{a} من {b} من أجزاء الفهرس",
  fConfirmed:"تطابق مؤكد",fPossible:"تطابق محتمل",fNone:"لا يوجد تطابق موثوق",fNoneTx:"لا يطابق هذا المقطع أي تسجيل في المكتبة. قد يكون من تسجيل غير موجود في التطبيق، أو قصيرًا جدًا أو كثير الضجيج أو مُعدَّلًا كثيرًا. جرّب ١٥–٣٠ ثانية من تلاوة واضحة.",
  fAt:"في التسجيل: {a} – {b}",fLen:"{n} ث متطابقة",fConf:"نسبة الثقة {n}٪",fPts:"{a} لحظة من مقطعك متطابقة (أقرب تسجيل آخر: {b})",fSec:"المقطع {n}",fClip:"من {a} إلى {b} في مقطعك",
  fPlayFrom:"شغّل من هنا",fPlaySec:"شغّل هذا الجزء",fFull:"التلاوة كاملة",fVerses:"اقرأ السورة",fSave:"حفظ",fSaved:"حُفظت في المفضلة مع تثبيت عند الموضع",
  fAlso:"وُجد أيضًا في نسخة أخرى من هذا التسجيل:",fSpeedNote:"يبدو أن المقطع أسرع أو أبطأ من الأصل بنحو {n}٪.",
  fNoIndex:"فهرس التسجيلات غير متاح بعد. حاول لاحقًا.",fOffline:"البحث يحتاج إلى اتصال بالإنترنت.",fBad:"تعذّرت قراءة هذا الملف كصوت. جرّب ملفًا آخر أو سجّل المقطع.",
  fTooShort:"المقطع قصير جدًا. يلزم ٤ ثوانٍ على الأقل.",fMicNo:"التسجيل غير متاح على هذا الجهاز أو لم يُسمح به.",fLong:"يُبحث في أول ١٠ دقائق فقط من المقطع.",
  fAboutTx:"المكتبة التي يُبحث فيها: {n} تسجيلًا، {h} ساعة (فهرس {d}).",fFailed:"تعذّرت فهرسة {n} تسجيلًا ولا يمكن العثور عليها."});
Object.assign(I18N.fr,{fTitle:"Retrouver une récitation"});Object.assign(I18N.de,{fTitle:"Rezitation finden"});Object.assign(I18N.tr,{fTitle:"Kıraati bul"});

const FINDER={base:"fp/",man:null,manErr:null,shards:new Map(),busy:false};
const fx=(k,o)=>t(k).replace(/\{(\w)\}/g,(_,x)=>o[x]);
const SEC_PER_FRAME=FPRINT.FP.hop/FPRINT.FP.sr;
const hex2=n=>(n<16?"0":"")+n.toString(16);

async function finderManifest(){
  if(FINDER.man)return FINDER.man;
  const r=await fetch(FINDER.base+"manifest.json",{cache:"no-cache"});
  if(!r.ok)throw Object.assign(new Error("noindex"),{code:"noindex"});
  FINDER.man=await r.json();return FINDER.man;
}
/* one index file: 16 counts, then the entries grouped by the low 4 bits of the hash */
function finderShard(s){
  if(!FINDER.shards.has(s))FINDER.shards.set(s,fetch(FINDER.base+"s/"+hex2(s>>8)+"/"+hex2(s&255)+".bin").then(r=>{if(!r.ok)throw new Error("http "+r.status);return r.arrayBuffer()})
    .then(buf=>{const dv=new DataView(buf),start=new Uint32Array(17);let o=32;for(let i=0;i<16;i++){start[i]=o;o+=4*dv.getUint16(i*2,true)}start[16]=o;return {dv,start}})
    .catch(e=>{FINDER.shards.delete(s);throw e}));
  return FINDER.shards.get(s);
}
async function finderFetchAll(hashes,onProgress){
  const need=[...new Set(hashes.map(h=>h>>4))];
  let done=0,i=0;const total=need.length;
  async function worker(){while(i<need.length){const s=need[i++];await finderShard(s);done++;if(onProgress&&(done%20===0||done===total))onProgress(done,total)}}
  await Promise.all(Array.from({length:Math.min(16,need.length)},worker));
  const m=new Map();for(const s of need)m.set(s,await finderShard(s));return m;
}

/* decode any audio or video file the browser can play into mono 8 kHz samples */
async function finderDecode(blob){
  const buf=await blob.arrayBuffer();
  const AC=window.AudioContext||window.webkitAudioContext;const ac=new AC();
  let ab;try{ab=await new Promise((res,rej)=>{const p=ac.decodeAudioData(buf,res,rej);if(p&&p.then)p.then(res,rej)})}finally{try{ac.close()}catch(e){}}
  const maxS=600,dur=Math.min(ab.duration,maxS),sr=FPRINT.FP.sr,n=Math.max(1,Math.ceil(dur*sr));
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const oc=new OAC(1,n,sr);const src=oc.createBufferSource();src.buffer=ab;src.connect(oc.destination);src.start(0,0,dur);
  const out=await oc.startRendering();
  return {x:out.getChannelData(0).slice(0),cut:ab.duration>maxS};
}

/* candidates for one block of the clip. A recording scores by how many DIFFERENT moments of the clip agree on
   the same time offset (±1 frame), and over how many seconds of the clip they are spread: a real match agrees all
   along the clip, while chance agreement comes from one or two moments only. */
function finderVote(lms,shards,tunit){
  const cells=new Map();   // rec*2^21 + offset → Set of clip moments
  const add=(key,tq)=>{let s=cells.get(key);if(!s){s=new Set();cells.set(key,s)}s.add(tq)};
  for(const [h,tq] of lms){
    const sh=shards.get(h>>4);if(!sh)continue;
    const lo=h&15,a=sh.start[lo],b=sh.start[lo+1];
    if(b-a>4*600)continue;   /* a landmark found in hundreds of places says almost nothing */
    for(let o=a;o<b;o+=4){const e=sh.dv.getUint32(o,true),rec=e>>>18,tr=(e&262143)*tunit;const key=rec*2097152+(tr-tq+1048576);
      add(key-1,tq);add(key,tq);add(key+1,tq);if(tunit>1)add(key+2,tq)}
  }
  const best=new Map();
  for(const [key,ts] of cells){
    if(ts.size<3)continue;
    const rec=Math.floor(key/2097152),s=ts.size,b=best.get(rec);
    if(b&&b.s>=s)continue;
    let a=Infinity,z=-Infinity;const secs=new Set();for(const t of ts){if(t<a)a=t;if(t>z)z=t;secs.add(Math.floor(t/31))}
    best.set(rec,{rec,off:key%2097152-1048576,s,sp:secs.size,a,b:z});
  }
  return [...best.values()].sort((x,y)=>y.s-x.s||y.sp-x.sp).slice(0,12);
}

/* search: the whole clip if short, otherwise 15 s blocks every 7.5 s (to find several sections in a long video) */
async function finderSearch(x,onStep,factor){
  const man=await finderManifest();
  const sr=FPRINT.FP.sr,dur=x.length/sr;
  const y=factor&&factor!==1?FPRINT.resample(x,factor):x;
  const all=FPRINT.fingerprint(y,FPRINT.QUERY);
  const blocks=[];
  if(dur<=25)blocks.push({t0:0,t1:Infinity,lms:all});
  else{const W=Math.round(15/SEC_PER_FRAME),H=Math.round(7.5/SEC_PER_FRAME),T=Math.ceil(y.length/FPRINT.FP.hop);
    for(let s=0;s<T;s+=H){const lms=all.filter(([h,tq])=>tq>=s&&tq<s+W);if(lms.length>=20)blocks.push({t0:s,t1:s+W,lms});if(s+W>=T)break}}
  /* long clips: fewer landmarks per block, so the download stays small */
  const per=blocks.length>1?Math.max(90,Math.round(2400/blocks.length)):900;
  for(const b of blocks)if(b.lms.length>per){const step=b.lms.length/per;b.lms=Array.from({length:per},(_,i)=>b.lms[Math.floor(i*step)])}
  const shards=await finderFetchAll(blocks.flatMap(b=>b.lms.map(l=>l[0])),onStep);
  for(const b of blocks){b.c=finderVote(b.lms,shards,man.tunit||1)}
  return {man,blocks,shards,dur,ydur:y.length/sr};
}
/* blocks agreeing on the same recording and offset become one section; scored against the best other recording */
function finderSections(res){
  const {man,blocks,shards}=res;const secs=[];
  for(const b of blocks){
    const top=b.c[0];if(!top)continue;
    let last=secs[secs.length-1];
    if(last&&last.rec===top.rec&&Math.abs(last.off-top.off)<=3){last.blocks.push(b);continue}
    secs.push({rec:top.rec,off:top.off,blocks:[b]});
  }
  const out=[];
  for(const sc of secs){
    let s=0,sp=0,s2=0,copies=new Map(),a=Infinity,bb=-Infinity;
    for(const b of sc.blocks){
      const me=b.c.find(c=>c.rec===sc.rec&&Math.abs(c.off-sc.off)<=3);if(!me)continue;s+=me.s;sp+=me.sp;
      /* another copy of the same recording (another file) agrees almost as well, all along the clip: listed as a copy, not a rival */
      for(const c of b.c){if(c===me)continue;if(c.s>=me.s*.5&&c.s>=6&&c.sp>=3){copies.set(c.rec,Math.max(copies.get(c.rec)||0,c.s));continue}s2=Math.max(s2,c.s)}
      a=Math.min(a,me.a);bb=Math.max(bb,me.b);
    }
    const nb=sc.blocks.length,rival=s2*Math.max(1,nb*.6);
    const level=s>=6*Math.min(nb,2)&&sp>=3&&s>=2.5*Math.max(rival,2)?"confirmed":(s>=4&&sp>=2&&s>=1.8*Math.max(rival,2)?"possible":null);
    if(!level||!isFinite(a))continue;
    const code=man.recs[sc.rec]&&man.recs[sc.rec][0];const tr=code&&trFromCode(code);if(!tr)continue;
    const copiesTr=[...copies.keys()].map(r=>man.recs[r]&&trFromCode(man.recs[r][0])).filter(Boolean);
    /* a short clip is placed as a whole: where it starts and ends in the recording.
       a section of a long clip runs from its first to its last matching moment */
    const whole=blocks.length===1,recDur=(man.recs[sc.rec]&&man.recs[sc.rec][1])||Infinity;
    const cA=whole?0:a*SEC_PER_FRAME,cB=whole?res.ydur:Math.min(res.ydur,bb*SEC_PER_FRAME+1.5);
    const start=Math.max(0,sc.off*SEC_PER_FRAME+cA),end=Math.min(recDur,sc.off*SEC_PER_FRAME+cB);
    out.push({tr,code,level,s,s2,conf:Math.max(1,Math.min(99,Math.round(100*(1-Math.max(rival,1.5)/s)))),
      start,end,clipA:cA*(res.dur/res.ydur),clipB:cB*(res.dur/res.ydur),copies:copiesTr});
  }
  return out;
}

/* ---------- screen ---------- */
const fmtT=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0")};
function finderStatus(step,sub){const st=$("#fStatus");if(!step){st.hidden=true;return}st.hidden=false;$("#fStep").textContent=step;$("#fStepSub").textContent=sub||""}
function finderSurah(tr){
  if(!tr.eg&&tr.n)return tr.n;
  const en=(tr.tEn||"").toLowerCase();let best=0,pos=1e9;
  SURAHS.forEach((s,i)=>{const k=en.indexOf(s[1].toLowerCase());if(k>=0&&(k<pos||(k===pos&&s[1].length>(SURAHS[best-1]||["",""])[1].length))){pos=k;best=i+1}});
  return best;
}
let finderLast=[];
function finderRender(list,note){
  finderLast=list;
  const box=$("#fResults");
  if(!list.length){box.innerHTML=`<div class="card fres fnone"><b>${t("fNone")}</b><p>${t("fNoneTx")}</p></div>`;return}
  box.innerHTML=(note?`<p class="fnote">${note}</p>`:"")+list.map((r,i)=>{
    const sub=trSub(r.tr),su=finderSurah(r.tr);
    return `<div class="card fres ${r.level}">
      ${list.length>1?`<div class="fsecn">${fx("fSec",{n:numFmt(i+1)})} · ${fx("fClip",{a:fmtT(r.clipA),b:fmtT(r.clipB)})}</div>`:""}
      <div class="fhead"><span class="fbadge">${t(r.level==="confirmed"?"fConfirmed":"fPossible")}</span><span class="fconf">${fx("fConf",{n:numFmt(r.conf)})}</span></div>
      <b class="ftitle">${trTitle(r.tr)}</b><small class="fsub">${sub}</small>
      <div class="ftime"><span>${fx("fAt",{a:fmtT(r.start),b:fmtT(r.end)})}</span><span>${fx("fLen",{n:numFmt(Math.round(r.end-r.start))})}</span></div>
      <div class="fpts">${fx("fPts",{a:numFmt(r.s),b:numFmt(r.s2)})}</div>
      <div class="facts">
        <button class="btn-gold" data-fact="from" data-fi="${i}">${ic("play")}${t("fPlayFrom")}</button>
        <button data-fact="sec" data-fi="${i}">${ic("repeat")}${t("fPlaySec")}</button>
        <button data-fact="full" data-fi="${i}">${ic("list")}${t("fFull")}</button>
        ${su?`<button data-fact="verses" data-fi="${i}" data-su="${su}">${ic("mushaf")}${t("fVerses")}</button>`:""}
        <button data-fact="save" data-fi="${i}">${ic("star")}${t("fSave")}</button>
      </div>
      ${r.copies.length?`<div class="fcopies"><small>${t("fAlso")}</small>${r.copies.map(c=>`<span>${trTitle(c)} · ${trSub(c)}</span>`).join("")}</div>`:""}
    </div>`}).join("");
}
/* play only the matched section */
let finderStopAt=null;
au.addEventListener("timeupdate",()=>{if(finderStopAt!=null&&cur&&cur.k===finderStopAt.k&&au.currentTime>=finderStopAt.t){au.pause();finderStopAt=null}});
$("#fResults").addEventListener("click",e=>{
  const b=e.target.closest("[data-fact]");if(!b)return;const r=finderLast[+b.dataset.fi];if(!r)return;const a=b.dataset.fact;
  if(a==="from"){finderStopAt=null;playTrack(r.tr,{at:r.start,quiet:true});go("player")}
  else if(a==="sec"){playTrack(r.tr,{at:r.start,quiet:true});finderStopAt={k:r.tr.k,t:r.end}}
  else if(a==="full"){finderStopAt=null;playTrack(r.tr,{at:0,quiet:true});go("player")}
  else if(a==="verses"){const su=+b.dataset.su;S.mMode="read";save();go("mushaf");setTimeout(()=>goPage(SURAH_PAGE[su-1],null,su),60)}
  else if(a==="save"){
    if(!S.favs.some(x=>x&&x.k===r.tr.k))S.favs.unshift(r.tr);
    if(S.pins){const at=Math.floor(r.start),e2=S.pins[r.tr.k]||{tr:r.tr,m:[]};if(!e2.m.some(x=>Math.abs(x-at)<=3))e2.m=e2.m.concat(at).sort((x,y)=>x-y);S.pins[r.tr.k]=e2}
    save();toast(t("fSaved"));if(typeof renderFavs==="function")renderFavs();
  }
});

async function finderRun(blob){
  if(FINDER.busy)return;FINDER.busy=true;
  $("#fResults").innerHTML="";
  try{
    finderStatus(t("fReading"));
    let dec;try{dec=await finderDecode(blob)}catch(e){finderStatus();$("#fResults").innerHTML=`<div class="card fres fnone"><p>${t("fBad")}</p></div>`;return}
    if(dec.x.length<4*FPRINT.FP.sr){finderStatus();$("#fResults").innerHTML=`<div class="card fres fnone"><p>${t("fTooShort")}</p></div>`;return}
    finderStatus(t("fListening"));
    await new Promise(r=>setTimeout(r,30));
    const prog=(a,b)=>finderStatus(t("fSearching"),fx("fOf",{a:numFmt(a),b:numFmt(b)}));
    let res=await finderSearch(dec.x,prog,1),list=finderSections(res),note=dec.cut?t("fLong"):"";
    /* nothing certain: the clip may have been sped up or slowed down (common on social media) */
    if(!list.some(r=>r.level==="confirmed")){
      for(const f of [1/1.03,1/0.97,1/1.06,1/0.94]){
        finderStatus(t("fSpeed"));
        const r2=finderSections(await finderSearch(dec.x,(a,b)=>finderStatus(t("fSpeed"),fx("fOf",{a:numFmt(a),b:numFmt(b)})),f));
        if(r2.some(r=>r.level==="confirmed")){list=r2;note=(note?note+" ":"")+fx("fSpeedNote",{n:numFmt(Math.round(Math.abs(1/f-1)*100))});break}
      }
    }
    finderStatus();finderRender(list,note);
  }catch(e){
    finderStatus();
    $("#fResults").innerHTML=`<div class="card fres fnone"><p>${t(e&&e.code==="noindex"?"fNoIndex":"fOffline")}</p></div>`;
  }finally{FINDER.busy=false;$("#fFile").value=""}
}
$("#fFile").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];if(f)finderRun(f)});
/* record the clip with the microphone */
let finderRec=null;
function finderRecLabel(){$("#fRecTx").textContent=t(finderRec?"fStop":"fRecord");$("#fRec").classList.toggle("on",!!finderRec)}
$("#fRec").addEventListener("click",async()=>{
  if(finderRec){finderRec.stop();return}
  if(!navigator.mediaDevices||!window.MediaRecorder){toast(t("fMicNo"));return}
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})}catch(e){toast(t("fMicNo"));return}
  const chunks=[];const mr=new MediaRecorder(stream);finderRec=mr;finderRecLabel();
  const t0=Date.now();const tick=setInterval(()=>finderStatus(t("fListening"),fmtT((Date.now()-t0)/1000)),500);
  mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  mr.onstop=()=>{clearInterval(tick);stream.getTracks().forEach(x=>x.stop());finderRec=null;finderRecLabel();finderRun(new Blob(chunks,{type:mr.mimeType||"audio/webm"}))};
  mr.start(1000);setTimeout(()=>{if(finderRec===mr)mr.stop()},60000);
});
/* what the index covers, under the buttons */
async function finderAbout(){
  finderRecLabel();
  try{const m=await finderManifest();const n=m.recs.filter(r=>r[1]>0).length;
    $("#fAbout").textContent=fx("fAboutTx",{n:numFmt(n),h:numFmt(Math.round(m.hours)),d:m.built})+(m.failed&&m.failed.length?" "+fx("fFailed",{n:numFmt(m.failed.length)}):"")}
  catch(e){$("#fAbout").textContent=""}
}
const _showF=show;show=function(id){_showF(id);if(id==="finder")finderAbout()};
