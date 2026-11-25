/* "Find a recitation": recognise which Abdul Basit recording a clip comes from, and where in it.
   1. the clip (audio or video file, or the microphone) is decoded in the browser to mono 8 kHz
   2. its landmarks are made with js/fp.js (same method as the index)
   3. only the index files those landmarks fall in are fetched from fp/s/… (built by tools/fingerprint/build_index.py)
   4. landmarks that agree on one recording at one time offset vote for it; the offset is the clip's position
   5. a match is confirmed only when it clearly beats every other recording; otherwise it is "possible" or "no match"
   6. the verses are recognised from the recitation itself (js/ayah.js: a Quran speech model on the phone, then the
      transcript is placed in the Quran text). They show which surah and ayahs the clip recites, check the recording
      found by sound against its label, and still answer when the recording isn't in the library
   7. copies of the same recording (the same audio uploaded more than once) are shown as one result; the copy shown first
      follows the order Egyptian Radio → other Egyptian recordings → mosque → radio outside Egypt → other recordings
   The clip itself never leaves the phone. Nothing is guessed: titles, places, dates and categories come from the
   library's labels. */
if(!P.wave)P.wave='<path d="M3 12h1.5M6.5 8v8M10 4.5v15M13.5 7.5v9M17 10v4M20.5 11.5v1"/>';
if(!P.upload)P.upload='<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>';
if(!P.mic)P.mic='<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>';

Object.assign(I18N.en,{fTitle:"Find a recitation",fIntro:"Have a clip of Sheikh Abdul Basit? Choose an audio or video file, or record it playing. You can also share a video to this app from your gallery. The app finds which recording in the library it comes from, where, and which verses are recited.",
  fChoose:"Choose from gallery",fChooseA:"Audio file",fRecord:"Record",fStop:"Stop recording",fTip:"10–30 seconds of clear recitation works best. The clip stays on your phone; only small parts of the recording index are downloaded.",
  fReading:"Reading the audio…",fListening:"Listening…",fSearching:"Searching the library…",fSpeed:"Trying the clip at a different speed…",fOf:"{a} of {b} index parts",
  fConfirmed:"Confirmed match",fPossible:"Possible match",fNone:"No reliable match",fNoneTx:"This clip doesn't match any recording in the library. It may come from a recording the app doesn't have, or it may be too short, too noisy or changed too much. Try 15–30 seconds of clear recitation.",
  fAt:"In the recording: {a} – {b}",fLen:"{n} s matched",fConf:"Confidence {n}%",fPts:"{a} moments of your clip agree (next best recording: {b})",fSec:"Section {n}",fClip:"from {a} to {b} in your clip",
  fPlayFrom:"Play from here",fPlaySec:"Play this section",fFull:"Full recitation",fVerses:"Read the surah",fSave:"Save",fSaved:"Saved to Favourites, with a pin at the match",
  fAlso:"Also found in another copy of this recording:",fSpeedNote:"The clip seems to be {n}% faster or slower than the original.",fPitchNote:"The clip's pitch seems to have been changed ({n} semitones).",
  fNoIndex:"The recording index isn't available yet. Please try again later.",fOffline:"Searching needs an internet connection.",fBad:"This file couldn't be read as audio. Try another file, or record the clip instead.",
  fTooShort:"The clip is too short. At least 4 seconds are needed.",fMicNo:"Recording isn't available on this device or was not allowed.",fLong:"Only the first 10 minutes of the clip are searched.",
  fAboutTx:"Library searched: {n} recordings, {h} hours (index of {d}).",fFailed:"{n} recordings could not be indexed and can't be found."});
Object.assign(I18N.ar,{fTitle:"ابحث عن تلاوة بمقطع",fIntro:"لديك مقطع للشيخ عبد الباسط؟ اختر ملف صوت أو فيديو، أو سجّله أثناء تشغيله. ويمكنك أيضًا مشاركة فيديو من معرض الصور إلى هذا التطبيق. يجد التطبيق التسجيل الذي جاء منه في المكتبة، وموضعه، والآيات المتلوّة.",
  fChoose:"اختر من معرض الصور",fChooseA:"ملف صوتي",fRecord:"تسجيل",fStop:"إيقاف التسجيل",fTip:"الأفضل من ١٠ إلى ٣٠ ثانية من تلاوة واضحة. يبقى المقطع على هاتفك؛ يُنزَّل فقط جزء صغير من فهرس التسجيلات.",
  fReading:"جارٍ قراءة الصوت…",fListening:"جارٍ الاستماع…",fSearching:"جارٍ البحث في المكتبة…",fSpeed:"تجربة المقطع بسرعة مختلفة…",fOf:"{a} من {b} من أجزاء الفهرس",
  fConfirmed:"تطابق مؤكد",fPossible:"تطابق محتمل",fNone:"لا يوجد تطابق موثوق",fNoneTx:"لا يطابق هذا المقطع أي تسجيل في المكتبة. قد يكون من تسجيل غير موجود في التطبيق، أو قصيرًا جدًا أو كثير الضجيج أو مُعدَّلًا كثيرًا. جرّب ١٥–٣٠ ثانية من تلاوة واضحة.",
  fAt:"في التسجيل: {a} – {b}",fLen:"{n} ث متطابقة",fConf:"نسبة الثقة {n}٪",fPts:"{a} لحظة من مقطعك متطابقة (أقرب تسجيل آخر: {b})",fSec:"المقطع {n}",fClip:"من {a} إلى {b} في مقطعك",
  fPlayFrom:"شغّل من هنا",fPlaySec:"شغّل هذا الجزء",fFull:"التلاوة كاملة",fVerses:"اقرأ السورة",fSave:"حفظ",fSaved:"حُفظت في المفضلة مع تثبيت عند الموضع",
  fAlso:"وُجد أيضًا في نسخة أخرى من هذا التسجيل:",fSpeedNote:"يبدو أن المقطع أسرع أو أبطأ من الأصل بنحو {n}٪.",fPitchNote:"يبدو أن طبقة صوت المقطع غُيِّرت ({n} نصف درجة).",
  fNoIndex:"فهرس التسجيلات غير متاح بعد. حاول لاحقًا.",fOffline:"البحث يحتاج إلى اتصال بالإنترنت.",fBad:"تعذّرت قراءة هذا الملف كصوت. جرّب ملفًا آخر أو سجّل المقطع.",
  fTooShort:"المقطع قصير جدًا. يلزم ٤ ثوانٍ على الأقل.",fMicNo:"التسجيل غير متاح على هذا الجهاز أو لم يُسمح به.",fLong:"يُبحث في أول ١٠ دقائق فقط من المقطع.",
  fAboutTx:"المكتبة التي يُبحث فيها: {n} تسجيلًا، {h} ساعة (فهرس {d}).",fFailed:"تعذّرت فهرسة {n} تسجيلًا ولا يمكن العثور عليها."});
Object.assign(I18N.en,{
  fVerseOpt:"Also recognise the verses (a 77 MB speech model is downloaded once)",fModel:"Getting the verse recognition ready (about 77 MB, only the first time)…",
  fVersesStep:"Recognising the verses…",fVersesOf:"part {a} of {b}",fVerseErr:"The verses couldn't be recognised this time (the speech model didn't load). The sound match below is not affected.",
  fVLbl:"Verses",fVersesConf:"Verses recognised",fVersesPoss:"Verses: possible",fVersesNone:"The verses couldn't be recognised from this clip.",fAyat:"ayah {a}",fAyatN:"ayahs {a}",
  fOrPlace:"The same words also occur at:",fFromLabel:"(from the recording's label)",fWithin:"(placed within the surahs of the recording found)",fAgree:"The recognised verses agree with the recording's label.",
  fDisagree:"The recording's label doesn't list Sūrah {s}. The label may be incomplete.",fDropped:"A weak sound match was left out because the verses heard are from another surah.",
  fNet:"Part of the recording index couldn't be downloaded (the connection dropped or the site was busy).",fRetry:"Try again",fShared:"Clip received",fVmAgree:"The verses heard match the library's analysis of this recording at this point.",fVmDisagree:"The verses heard ({s}) don't match the library's analysis of this recording at this point, so this is shown only as a possible match.",fVmDropped:"A sound match was left out because the verses heard don't match that recording at that point.",fFromMap:"(around this point, from the library's analysis of the recording)",fAround:"around {t}",fCat:"Category",fDate:"Date",fNoDate:"date not given",fStart:"Starts",fEnd:"Ends",fCopy:"Copy link",fOrig:"Original file",fLinkCopied:"Link copied (opens the recording at {t})",
  fSame:"The same recording, also in the library:",fNotFound:"The original recording wasn't found",
  fNotFoundTx:"Your clip was compared by sound with {n} recordings in the library and none of them is the same recording. It may be a recording the app doesn't have yet, or the clip may be too short, noisy or changed to match.",
  fOthers:"Recordings in the library that contain this passage, by their labels ({n}). These are other recordings: the sound of your clip didn't match them.",fShowAll:"Show all {n}",
  fCached:"Shown from an earlier search of this clip.",fRiwaya:"Riwayah",fRiwayaNone:"not stated in the label",fSpeedTempo:"The clip seems to be {n}% faster or slower than the original (pitch unchanged).",
  fBigFile:"This file is very large. If it can't be read, trim it to the part with the recitation.",fTooLong:"This file is too long to read in the browser. Trim it to the part with the recitation (a few minutes) and try again.",
  cEgRadio:"Egyptian Radio",cEgHist:"Egyptian recording",cMosque:"Mosque recording",cIntlRadio:"Radio outside Egypt",cRadioUn:"Radio · station not named",cOther:"Other recording",cStudio:"Studio set"});
Object.assign(I18N.ar,{
  fVerseOpt:"تعرّف على الآيات أيضًا (يُنزَّل نموذج كلام بحجم ٧٧ ميغابايت مرة واحدة)",fModel:"جارٍ تجهيز التعرّف على الآيات (نحو ٧٧ ميغابايت، أول مرة فقط)…",
  fVersesStep:"جارٍ التعرّف على الآيات…",fVersesOf:"الجزء {a} من {b}",fVerseErr:"تعذّر التعرّف على الآيات هذه المرة (لم يُحمَّل نموذج الكلام). لا يتأثر التطابق الصوتي أدناه.",
  fVLbl:"الآيات",fVersesConf:"الآيات المعروفة",fVersesPoss:"الآيات: محتملة",fVersesNone:"تعذّر التعرّف على الآيات من هذا المقطع.",fAyat:"الآية {a}",fAyatN:"الآيات {a}",
  fOrPlace:"الكلمات نفسها تأتي أيضًا في:",fFromLabel:"(من بيانات التسجيل)",fWithin:"(حُدِّدت ضمن سور التسجيل الذي وُجد)",fAgree:"الآيات المعروفة توافق بيانات التسجيل.",
  fDisagree:"بيانات التسجيل لا تذكر سورة {s}. قد تكون البيانات ناقصة.",fDropped:"استُبعد تطابق صوتي ضعيف لأن الآيات المسموعة من سورة أخرى.",
  fNet:"تعذّر تنزيل جزء من فهرس التسجيلات (انقطع الاتصال أو كان الموقع مشغولًا).",fRetry:"حاول مجددًا",fShared:"تم استلام المقطع",fVmAgree:"الآيات المسموعة توافق تحليل المكتبة لهذا التسجيل في هذا الموضع.",fVmDisagree:"الآيات المسموعة ({s}) لا توافق تحليل المكتبة لهذا التسجيل في هذا الموضع، لذا يُعرض كتطابق محتمل فقط.",fVmDropped:"استُبعد تطابق صوتي لأن الآيات المسموعة لا توافق ذلك التسجيل في ذلك الموضع.",fFromMap:"(في هذا الموضع تقريبًا، من تحليل المكتبة للتسجيل)",fAround:"قرب {t}",fCat:"التصنيف",fDate:"التاريخ",fNoDate:"بدون تاريخ",fStart:"البداية",fEnd:"النهاية",fCopy:"نسخ الرابط",fOrig:"الملف الأصلي",fLinkCopied:"نُسخ الرابط (يفتح التسجيل عند {t})",
  fSame:"التسجيل نفسه موجود أيضًا في المكتبة:",fNotFound:"لم يُعثر على التسجيل الأصلي",
  fNotFoundTx:"قورن مقطعك بالصوت مع {n} تسجيلًا في المكتبة ولم يكن أيٌّ منها التسجيلَ نفسه. قد يكون تسجيلًا غير موجود في التطبيق بعد، أو أن المقطع قصير أو كثير الضجيج أو معدّل بحيث لا يتطابق.",
  fOthers:"تسجيلات في المكتبة تتضمن هذا الموضع بحسب بياناتها ({n}). هذه تسجيلات أخرى: صوت مقطعك لم يطابقها.",fShowAll:"عرض الكل ({n})",
  fCached:"معروض من بحث سابق لهذا المقطع.",fRiwaya:"الرواية",fRiwayaNone:"غير مذكورة في البيانات",fSpeedTempo:"يبدو أن المقطع أسرع أو أبطأ من الأصل بنحو {n}٪ (دون تغيّر طبقة الصوت).",
  fBigFile:"الملف كبير جدًا. إن تعذّرت قراءته فقصّه إلى جزء التلاوة.",fTooLong:"الملف أطول من أن يُقرأ في المتصفح. قصّه إلى جزء التلاوة (بضع دقائق) وحاول مجددًا.",
  cEgRadio:"الإذاعة المصرية",cEgHist:"تسجيل مصري",cMosque:"تسجيل في مسجد",cIntlRadio:"إذاعة خارج مصر",cRadioUn:"إذاعة · المحطة غير مذكورة",cOther:"تسجيل آخر",cStudio:"تسجيل استوديو"});
Object.assign(I18N.fr,{fTitle:"Retrouver une récitation"});Object.assign(I18N.de,{fTitle:"Rezitation finden"});Object.assign(I18N.tr,{fTitle:"Kıraati bul"});

/* exclude: recordings left out of the search (used by tests, like "self" in tools/fingerprint/check_audio.py) */
const FINDER={base:"fp/",man:null,manErr:null,shards:new Map(),busy:false,cache:null,exclude:null};
const fx=(k,o)=>t(k).replace(/\{(\w)\}/g,(_,x)=>o[x]);
const SEC_PER_FRAME=FPRINT.FP.hop/FPRINT.FP.sr;
const hex2=n=>(n<16?"0":"")+n.toString(16);
const fEsc=x=>String(x==null?"":x).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

async function finderManifest(){
  if(FINDER.man)return FINDER.man;
  const r=await fetch(FINDER.base+"manifest.json",{cache:"no-cache"});
  if(!r.ok)throw Object.assign(new Error("noindex"),{code:"noindex"});
  FINDER.man=await r.json();
  /* index parts are kept on the phone until the index is rebuilt, so a second search needs little or no download. */
  /* every build of the index numbers the recordings afresh (adding or removing one shifts the numbers of others),
     so index parts must never be mixed between builds. The build is identified by its exact list of recordings,
     not by its date (the index can be rebuilt several times a day): it names the parts kept on the phone and is
     added to every part's address, so neither the phone's saved copy nor the browser's cache can hand back a part
     of an earlier build. (Mixing them made a correct match show a neighbouring recording's title.) */
  {let h=0x811c9dc5;const str=(FINDER.man.built||"")+"|"+FINDER.man.recs.map(r=>r[0]+"/"+r[1]).join("|");
   for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}FINDER.build=h.toString(36)}
  try{if(window.caches){const name="fp-index-"+FINDER.build;FINDER.cache=await caches.open(name);
    caches.keys().then(ks=>ks.filter(k=>k.startsWith("fp-index-")&&k!==name).forEach(k=>caches.delete(k)))}}catch(e){FINDER.cache=null}
  return FINDER.man;
}
/* one index file: 16 counts, then the entries grouped by the low 4 bits of the hash */
/* each part is retried (phones drop connections, and the site can be busy when hundreds of parts are asked
   for at once); a part that doesn't exist is empty */
const FINDER_EMPTY=new ArrayBuffer(32);
async function finderShardBytes(url){
  const c=FINDER.cache;
  if(c){try{const hit=await c.match(url);if(hit)return hit.arrayBuffer()}catch(e){}}
  let err;
  for(let k=0;k<4;k++){
    if(k)await new Promise(r=>setTimeout(r,200*2**k+Math.random()*300));
    const ac=window.AbortController?new AbortController():null;const to=ac&&setTimeout(()=>ac.abort(),20000);
    try{
      const r=await fetch(url,ac?{signal:ac.signal}:{});
      if(r.status===404)return FINDER_EMPTY;
      if(!r.ok)throw new Error("http "+r.status);
      const buf=await r.arrayBuffer();
      if(c){try{c.put(url,new Response(buf.slice(0),{headers:{"content-type":"application/octet-stream"}}))}catch(e){}}
      return buf;
    }catch(e){err=e}finally{if(to)clearTimeout(to)}
  }
  throw err;
}
function finderShard(s){
  if(!FINDER.shards.has(s))FINDER.shards.set(s,finderShardBytes(FINDER.base+"s/"+hex2(s>>8)+"/"+hex2(s&255)+".bin?b="+FINDER.build)
    .then(buf=>{const dv=new DataView(buf),start=new Uint32Array(17);let o=32;for(let i=0;i<16;i++){start[i]=o;o+=4*dv.getUint16(i*2,true)}start[16]=o;return {dv,start}})
    .catch(e=>{FINDER.shards.delete(s);throw e}));
  return FINDER.shards.get(s);
}
/* a few parts that still can't be downloaded only remove a few landmarks: the search goes on without them.
   Only when many are missing (no connection) does it stop */
async function finderFetchAll(hashes,onProgress){
  const need=[...new Set(hashes.map(h=>h>>4))];
  let done=0,i=0;const total=need.length,m=new Map();let failed=0;const limit=Math.max(3,total*0.1);
  async function worker(){while(i<need.length&&failed<=limit){const s=need[i++];try{m.set(s,await finderShard(s))}catch(e){failed++}done++;if(onProgress&&failed<=limit&&(done%20===0||done===total))onProgress(done,total)}}
  await Promise.all(Array.from({length:Math.min(8,need.length)},worker));
  if(failed>limit)throw Object.assign(new Error("net"),{code:navigator.onLine===false?"offline":"net"});
  return m;
}

/* decode any audio or video file the browser can play; the fingerprint uses mono 8 kHz, the verse recognition
   reads 16 kHz stretches from the decoded audio (ab) */
async function finderDecode(blob){
  const buf=await blob.arrayBuffer();
  const AC=window.AudioContext||window.webkitAudioContext;const ac=new AC();
  let ab;try{ab=await new Promise((res,rej)=>{const p=ac.decodeAudioData(buf,res,rej);if(p&&p.then)p.then(res,rej)})}finally{try{ac.close()}catch(e){}}
  const maxS=600,dur=Math.min(ab.duration,maxS),sr=FPRINT.FP.sr,n=Math.max(1,Math.ceil(dur*sr));
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const oc=new OAC(1,n,sr);const src=oc.createBufferSource();src.buffer=ab;src.connect(oc.destination);src.start(0,0,dur);
  const out=await oc.startRendering();
  return {x:out.getChannelData(0).slice(0),ab,cut:ab.duration>maxS};
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
    for(let o=a;o<b;o+=4){const e=sh.dv.getUint32(o,true),rec=e>>>18,tr=(e&262143)*tunit;if(FINDER.exclude&&FINDER.exclude.has(rec))continue;const key=rec*2097152+(tr-tq+1048576);
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

/* search: the whole clip if short, otherwise 15 s blocks every 7.5 s (to find several sections in a long video).
   mode "r": the clip resampled by factor (speed and pitch changed together); mode "t": times stretched by factor
   (speed changed, pitch kept) */
async function finderSearch(x,onStep,factor,mode,budget){
  const man=await finderManifest();
  const sr=FPRINT.FP.sr,dur=x.length/sr;
  let all,ydur,T;
  /* mode "p": pitch shifted by factor semitones (tempo kept); mode "pt": factor=[semitones, tempo k] */
  const ps=mode==="p"?factor:mode==="pt"?factor[0]:0,pk=mode==="pt"?factor[1]:1;
  if(ps){all=FPRINT.fingerprintShift(x,FPRINT.QUERY,ps,pk);ydur=dur*pk;T=Math.ceil(x.length/FPRINT.FP.hop*pk)}
  else if(mode==="t"&&factor!==1){all=FPRINT.fingerprintTempo(x,FPRINT.QUERY,factor);ydur=dur*factor;T=Math.ceil(x.length/FPRINT.FP.hop*factor)}
  else{const y=factor&&factor!==1?FPRINT.resample(x,factor):x;all=FPRINT.fingerprint(y,FPRINT.QUERY);ydur=y.length/sr;T=Math.ceil(y.length/FPRINT.FP.hop)}
  const blocks=[];
  if(ydur<=25)blocks.push({t0:0,t1:Infinity,lms:all});
  else{const W=Math.round(15/SEC_PER_FRAME),H=Math.round(7.5/SEC_PER_FRAME);
    for(let s=0;s<T;s+=H){const lms=all.filter(([h,tq])=>tq>=s&&tq<s+W);if(lms.length>=20)blocks.push({t0:s,t1:s+W,lms});if(s+W>=T)break}}
  /* long clips: fewer landmarks per block, so the download stays small */
  const per=blocks.length>1?Math.max(90,Math.round((budget||2400)/blocks.length)):Math.min(900,budget||900);
  for(const b of blocks)if(b.lms.length>per){const step=b.lms.length/per;b.lms=Array.from({length:per},(_,i)=>b.lms[Math.floor(i*step)])}
  const shards=await finderFetchAll(blocks.flatMap(b=>b.lms.map(l=>l[0])),onStep);
  for(const b of blocks){b.c=finderVote(b.lms,shards,man.tunit||1)}
  /* denser landmarks of the same signal, made only when a cut between two recordings has to be placed */
  const dense=()=>ps?FPRINT.fingerprintShift(x,[20,8],ps,pk):mode==="t"&&factor!==1?FPRINT.fingerprintTempo(x,[20,8],factor):FPRINT.fingerprint(factor&&factor!==1?FPRINT.resample(x,factor):x,[20,8]);
  /* the signal in the search's time frame (time-stretched clips: times scaled by k), for finding cuts */
  const sig=ps?{x,k:pk,semis:ps}:mode==="t"&&factor!==1?{x,k:factor}:{x:factor&&factor!==1?FPRINT.resample(x,factor):x,k:1};
  return {man,blocks,shards,dur,ydur,all,T,dense,sig};
}
/* blocks agreeing on the same recording and offset become one section; scored against the best other recording */
/* strict: a search with the clip's speed changed. Trying several speeds gives chance agreement several chances, so
   only a confirmed result counts from such a search (a "possible" one is not shown); measured with 150 clips whose
   recording was hidden, the confirmed bar itself gave no false identification at any speed */
function finderSections(res,strict){
  const {man,blocks}=res;const secs=[];
  for(const b of blocks){
    const top=b.c[0];if(!top)continue;
    let last=secs[secs.length-1];
    if(last&&last.rec===top.rec&&Math.abs(last.off-top.off)<=3){last.blocks.push(b);continue}
    secs.push({rec:top.rec,off:top.off,blocks:[b]});
  }
  const out=[];
  for(const sc of secs){
    let s=0,sp=0,s2=0,nb=0,copies=new Map(),a=Infinity,bb=-Infinity;
    for(const b of sc.blocks){
      const me=b.c.find(c=>c.rec===sc.rec&&Math.abs(c.off-sc.off)<=3);if(!me)continue;s+=me.s;sp+=me.sp;nb++;
      /* another file that agrees almost as well in this block may be a copy of the same recording: not a rival */
      for(const c of b.c){if(c===me)continue;if(c.s>=me.s*.5&&c.s>=6&&c.sp>=3){const p=copies.get(c.rec)||{rec:c.rec,off:c.off,s:0,n:0,best:0};if(c.s>p.best){p.best=c.s;p.off=c.off}p.s+=c.s;p.n++;copies.set(c.rec,p);continue}s2=Math.max(s2,c.s)}
      a=Math.min(a,me.a);bb=Math.max(bb,me.b);
    }
    /* a copy is only shown as "the same recording" (and can be shown first) when it agrees in every block of the
       section and nearly as strongly overall; a file that agrees only partly may be a different performance */
    const sure=[...copies.values()].filter(c=>c.n===nb&&c.s>=0.7*s).map(c=>({rec:c.rec,off:c.off,s:c.s}));
    const rival=s2*Math.max(1,nb*.6),need=6,ratio=2.5;
    const level=s>=need*Math.min(nb,2)&&sp>=3&&s>=ratio*Math.max(rival,2)?"confirmed":(!strict&&s>=4&&sp>=2&&s>=1.8*Math.max(rival,2)?"possible":null);
    if(!level||!isFinite(a))continue;
    const code=man.recs[sc.rec]&&man.recs[sc.rec][0];const tr=code&&trFromCode(code);if(!tr)continue;
    /* first estimate; finderRefine() then finds where the section really starts and ends, and the exact offset */
    const whole=blocks.length===1;
    const r={tr,code,level,s,s2,conf:Math.max(1,Math.min(99,Math.round(100*(1-Math.max(rival,1.5)/s)))),
      _rec:sc.rec,_off:sc.off,_a:a,_b:bb,_whole:whole,_cA:whole?0:a*SEC_PER_FRAME,_cB:whole?res.ydur:Math.min(res.ydur,bb*SEC_PER_FRAME+1.5),_copies:sure};
    finderPlace(res,r);
    out.push(r);
  }
  return out;
}

/* times in the recording (start, end) and in the clip (clipA, clipB) of a section, for its recording and each copy.
   offsets are in clip frames (32 ms); cA / cB are seconds in the (speed-corrected) clip */
function finderPlace(res,r){
  const man=res.man,k=res.dur/res.ydur;
  const place=(rec,off)=>{const recDur=(man.recs[rec]&&man.recs[rec][1])||Infinity;return [Math.max(0,off*SEC_PER_FRAME+r._cA),Math.min(recDur,off*SEC_PER_FRAME+r._cB)]};
  [r.start,r.end]=place(r._rec,r._off);
  r.clipA=r._cA*k;r.clipB=r._cB*k;
  r.copies=[];
  for(const c of r._copies){const cc=man.recs[c.rec]&&man.recs[c.rec][0],ct=cc&&trFromCode(cc);if(!ct||ct.k===r.tr.k)continue;const [st,en]=place(c.rec,c.off);r.copies.push({tr:ct,code:cc,start:st,end:en,s:c.s})}
}
/* exact placing. The search works on a thinned-out sample of the clip's landmarks (to keep downloads small), and
   long clips are searched in 15 s blocks. The earlier version took a long clip's start from the first SAMPLED
   landmark that agreed with the recording. That landmark is always late: each moment of sound is "whitened" against
   the 1.5 s around it (js/fp.js), so for about 1.5–2.5 s after the clip's start or a cut, the clip's landmarks don't
   agree with the recording's, and thinning out the landmarks adds more delay. Start times were about a second late
   (up to several seconds). Now:
   - the offset (clip time → recording time) is the median of the exact offsets of all agreeing landmarks, plus half
     of the index's 64 ms time step (times are stored rounded down), accurate to a few hundredths of a second
   - a section with nothing found before it starts at the clip's first moment (the rule short clips have always
     used), unless the clip's sound clearly changes before the first agreeing landmark (an intro); one with nothing
     found after it ends at the clip's last moment
   - a cut between two recordings lies between the last landmark that agrees with the first recording and the first
     that agrees with the second; it is placed at the first clear change in the clip's sound in between
     (finderCut), so it is never late. Without a clear change, at that first agreeing landmark */
/* the moment between frames a and b (search frames) where the clip's sound clearly changes: the average spectrum
   of the 0.75 s before against the 0.75 s after. Returned only when it clearly stands out (a cut, the end of an intro,
   a voice starting after silence); otherwise null */
function finderCut(res,a,b){
  const {x,k}=res.sig,hop=FPRINT.FP.hop,W=24;
  const fa=Math.max(0,Math.floor(a/k)-W),fb=Math.ceil(b/k)+W;
  const seg=x.subarray(fa*hop,Math.min(x.length,fb*hop+FPRINT.FP.nfft));
  const S=FPRINT.spectrogram(seg),NB=S.L.length/Math.max(1,S.T);
  if(S.T<2*W+2)return null;
  const cs=new Float64Array((S.T+1)*NB);for(let t=0;t<S.T;t++)for(let f=0;f<NB;f++)cs[(t+1)*NB+f]=cs[t*NB+f]+S.L[t*NB+f];
  const D=[];
  for(let t=W;t<=S.T-W;t++){let d=0;for(let f=0;f<NB;f++)d+=Math.abs((cs[t*NB+f]-cs[(t-W)*NB+f])-(cs[(t+W)*NB+f]-cs[t*NB+f]));D.push([t,d/(W*NB)])}
  const lo=Math.floor(a/k)-fa,hi=Math.ceil(b/k)-fa,inside=D.filter(([t])=>t>=lo&&t<=hi);
  if(!inside.length)return null;
  /* the EARLIEST clear change (a peak at least 60 % of the strongest one): when a recording begins with a pause, the
     voice starting after it is a second, later change, and the cut itself is the first */
  const top=Math.max(...inside.map(v=>v[1])),med=D.map(v=>v[1]).sort((p,q)=>p-q)[D.length>>1];
  if(!(top>=1.6*med&&top>=0.35))return null;
  for(let i=0;i<inside.length;i++){const v=inside[i][1];if(v>=0.6*top&&v>=(inside[i-1]||[0,-1])[1]&&v>=(inside[i+1]||[0,-1])[1])return (inside[i][0]+fa)*k}
  return null;
}
async function finderRefine(res,list){
  if(!list.length)return list;
  const tunit=res.man.tunit||1,F=SEC_PER_FRAME,T=res.T,S1=Math.round(1.5/F),S10=Math.round(10/F),GAP=Math.round(6/F);
  const secs=list.slice().sort((x,y)=>x._a-y._a);
  const cuts=secs.length>1;
  const L=cuts?res.dense():res.all;
  const inWin=[];
  for(const r of secs){if(r._whole)inWin.push([0,T]);else{inWin.push([r._a-S10,r._a+S10]);inWin.push([r._b-S10,r._b+S10])}}
  const lms=L.filter(([,tq])=>inWin.some(([a,b])=>tq>=a&&tq<=b));
  let shards;try{shards=await finderFetchAll(lms.map(l=>l[0]))}catch(e){return list}
  /* landmarks (clip time, exact offset, pair distance) that agree with recording rec at about offset off */
  const agree=(rec,off,a,b)=>{const out=[];
    for(const [h,tq] of lms){if(tq<a||tq>b)continue;const sh=shards.get(h>>4);if(!sh)continue;const lo=h&15;
      for(let o=sh.start[lo];o<sh.start[lo+1];o+=4){const e=sh.dv.getUint32(o,true);if(e>>>18!==rec)continue;const d=(e&262143)*tunit-tq;if(Math.abs(d-off)<=tunit+1){out.push([tq,d,h&63]);break}}}
    return out.sort((x,y)=>x[0]-y[0])};
  const exact=(rec,off,a,b)=>{const g=agree(rec,off,a,b);if(g.length<3)return off;const d=g.map(x=>x[1]).sort((x,y)=>x-y);return d[d.length>>1]+(tunit-1)/2};
  /* first / last agreeing landmark that has another one within 1.5 s (a lone chance agreement is ignored) */
  const first=g=>{for(let j=0;j+1<g.length;j++)if(g[j+1][0]-g[j][0]<=S1)return g[j][0];return null};
  const last=g=>{for(let j=g.length-1;j>0;j--)if(g[j][0]-g[j-1][0]<=S1)return g[j][0]+g[j][2];return null};
  for(const r of secs){
    const w=r._whole?[0,T]:[Math.max(0,r._a-S10),Math.min(T,r._b+S10)];
    r._off=exact(r._rec,r._off,w[0],w[1]);for(const c of r._copies)c.off=exact(c.rec,c.off,w[0],w[1]);
  }
  for(let i=0;i<secs.length;i++){
    const r=secs[i],prev=secs[i-1];
    if(r._whole){finderPlace(res,r);continue}
    const cs=first(agree(r._rec,r._off,Math.max(prev?prev._a:0,r._a-S10),r._a+S10))??r._a;
    if(i===secs.length-1)r._cB=res.ydur;
    if(!prev){
      /* nothing before: the clip starts with this recording, unless its sound clearly changes before the first
         agreeing landmark (an intro, or silence before the voice starts) */
      const c=cs*F>=1?finderCut(res,0,cs):null;r._cA=c!=null&&c*F>=1?c*F:0;
    }else{
      /* a cut between two recordings: where the sound changes, between the last evidence of the first recording
         and the first evidence of the second; without a clear change, the first evidence of the second */
      const pe=last(agree(prev._rec,prev._off,prev._b-S10,r._a+S10))??prev._b;
      const c=cs>pe?finderCut(res,Math.max(pe,cs-GAP),cs):null,m=(c!=null?c:cs)*F;
      if(cs-pe<=GAP){prev._cB=m;r._cA=m}else{prev._cB=Math.min(res.ydur,pe*F);r._cA=m}
    }
  }
  for(const r of secs)finderPlace(res,r);
  return list;
}

/* ---------- the library's verse map (vm/, built for every recording by tools/verses/analyse.mjs) ----------
   For each recording: one entry per 30 s stretch every 60 s, [time, surah, ayah, surah2, ayah2, confidence, level]
   (level 2 confirmed, 1 possible, 0 not recognised). Downloaded in 64 small parts, only the parts needed. */
const VMAP={man:null,sh:new Map()};
function vmShard(code){let h=0x811c9dc5;for(const b of new TextEncoder().encode(code)){h^=b;h=Math.imul(h,0x01000193)>>>0}return h%64}
async function vmManifest(){if(VMAP.man!==null)return VMAP.man;try{const r=await fetch("vm/manifest.json",{cache:"no-cache"});VMAP.man=r.ok?await r.json():false}catch(e){VMAP.man=false}return VMAP.man}
function vmPart(s){if(!VMAP.sh.has(s))VMAP.sh.set(s,fetch("vm/"+hex2(s)+".json?b="+encodeURIComponent((VMAP.man&&VMAP.man.built)||"")).then(r=>r.ok?r.json():{}).catch(()=>({})));return VMAP.sh.get(s)}
async function vmOf(code){const m=await vmManifest();if(!m||!m.recs[code])return null;return (await vmPart(vmShard(code)))[code]||null}
/* the stretches of a recording between a and b seconds that the analysis placed with at least this level */
const vmPlaces=(w,a,b,lvl)=>(w||[]).filter(x=>x[0]<b&&x[0]+30>a&&x[6]>=lvl&&x[1]);
/* recordings whose analysis places this passage (surah su, about ayah ay), with the time: all parts are read */
async function vmFind(su,ay){
  const m=await vmManifest();if(!m)return [];
  const parts=await Promise.all(Array.from({length:64},(_,i)=>vmPart(i))),out=[];
  for(const p of parts)for(const [code,ws] of Object.entries(p)){
    const hit=ws.find(x=>x[6]===2&&((x[1]===su&&x[2]<=ay+3&&(x[3]!==su||x[4]>=ay-3))||(x[3]===su&&x[1]!==su&&x[4]>=ay-3)));
    if(hit)out.push({code,at:hit[0]});
  }
  return out;
}

/* ---------- categories and the copy shown first ---------- */
/* from the library's own filing (country and section, as labelled by the source), never guessed */
function finderCat(tr){
  if(!tr.eg){const r=RECITATIONS.find(x=>x.id===tr.rec);return {rank:7,k:"cStudio",extra:r?rt(r):""}}
  const a=AREAS.find(x=>x.en===tr.aEn),id=a?a.id:"",sec=tr.sEn||"",pl=tr.pEn||"",radio=/\bRadio\b/i.test(sec);
  if(id==="egypt"&&radio)return {rank:1,k:"cEgRadio"};
  if(id==="egypt")return {rank:2,k:"cEgHist"};
  if(id==="aqsa"||/\b(Mosque|Masjid|Ḥaram|Haram)\b/i.test(pl+" "+sec))return {rank:3,k:"cMosque"};
  if(radio&&id&&id!=="radio_unknown")return {rank:4,k:"cIntlRadio"};
  if(id==="radio_unknown")return {rank:5,k:"cRadioUn"};
  return {rank:6,k:"cOther"};
}
const finderCatTx=tr=>{const c=finderCat(tr);return t(c.k)+(c.extra?" · "+c.extra:"")};
function finderRiwaya(tr){
  if(tr.eg)return "";
  const r=RECITATIONS.find(x=>x.id===tr.rec);if(!r)return "";
  return (isAr()?(r.styleAr||"").split("·").pop():(r.style||"").split("·").pop()).trim();
}
/* every copy of one recording becomes one result: the copy shown first by category order, then the best match */
function finderGroup(list){
  for(const r of list){
    const all=[{tr:r.tr,code:r.code,start:r.start,end:r.end,s:r.s}].concat(r.copies);
    all.sort((x,y)=>finderCat(x.tr).rank-finderCat(y.tr).rank||y.s-x.s);
    const top=all[0];
    r.tr=top.tr;r.code=top.code;r.start=top.start;r.end=top.end;r.copies=all.slice(1);
  }
  /* no duplicate results: the same recording (or a copy of it) at the same place is shown once */
  const out=[];
  for(const r of list){
    const keys=new Set([r.code,...r.copies.map(c=>c.code)]);
    const dup=out.find(o=>(keys.has(o.code)||o.copies.some(c=>keys.has(c.code)))&&Math.abs(o.clipA-r.clipA)<2&&Math.abs(o.clipB-r.clipB)<2);
    if(dup){if(r.s>dup.s)Object.assign(dup,r);continue}
    out.push(r);
  }
  return out;
}

/* ---------- verses ---------- */
/* the stretches of the clip to transcribe: each section found by sound, or (no match) the clip itself */
function finderVerseWins(list,dur){
  const w=[];
  if(list.length){for(const r of list.slice(0,6)){let a=r.clipA,b=Math.min(r.clipB,a+28);if(b-a<4){a=Math.max(0,b-4)}w.push([a,Math.max(4,b-a)])}}
  else if(dur<=30)w.push([0,dur]);
  else{const n=Math.min(4,Math.ceil(dur/28));for(let i=0;i<n;i++){const a=n===1?0:Math.round(i*(dur-28)/(n-1));w.push([a,28])}}
  return w;
}
function finderVerseHTML(p,label){
  if(!p)return `<div class="fverse none"><small>${t("fVLbl")}</small><span>${t("fVersesNone")}</span></div>`;
  const R=ayahRange(p),one=p.surah===p.surah2&&p.ayah===p.ayah2;
  return `<div class="fverse ${p.level}"><small>${t(p.level==="confirmed"?"fVersesConf":"fVersesPoss")} · ${fx("fConf",{n:numFmt(p.conf)})}${label?" "+label:""}</small>
    <b class="fsura"><span lang="ar" dir="rtl">${fEsc(R.ar)}</span><span>${fEsc(R.en)}</span></b>
    <span class="fay">${fx(one?"fAyat":"fAyatN",{a:R.ayat})}</span>
    ${p.alts&&p.alts.length?`<small class="falts">${t("fOrPlace")} ${p.alts.map(x=>fEsc((isAr()?SURAHS[x.surah-1][0]:SURAHS[x.surah-1][1])+" "+numFmt(x.ayah))).join(" · ")}</small>`:""}
  </div>`;
}

/* ---------- screen ---------- */
const fmtT=s=>{s=Math.max(0,Math.floor(s+1e-6));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0")};
function finderStatus(step,sub,frac){
  const st=$("#fStatus");if(!step){st.hidden=true;return}st.hidden=false;$("#fStep").textContent=step;$("#fStepSub").textContent=sub||"";
  const pb=$("#fProg");if(pb){pb.hidden=frac==null;if(frac!=null)pb.firstElementChild.style.width=Math.round(Math.min(1,frac)*100)+"%"}
}
function finderSurah(tr){
  if(!tr.eg&&tr.n)return tr.n;
  const ss=trSurahs(tr);return ss[0]||0;
}
let finderLast=[],finderOthers=[];
function finderRowHTML(c,i,j){
  return `<div class="fcopy"><div class="tx"><span>${trTitle(c.tr)}</span><small>${finderSubTx(c.tr)} · ${fmtT(c.start)} – ${fmtT(c.end)}</small></div>
    <button class="playc" data-fact="copy" data-fi="${i}" data-fj="${j}" aria-label="${t("fPlayFrom")}">${ic("play")}</button></div>`;
}
function finderCardHTML(r,i,n){
  const sub=trSub(r.tr),su=r.verse&&r.verse.place?r.verse.place.surah:finderSurah(r.tr),cat=finderCat(r.tr),riw=finderRiwaya(r.tr);
  const vp=r.verse?r.verse.place:null;
  return `<div class="card fres ${r.level}">
      ${n>1?`<div class="fsecn">${fx("fSec",{n:numFmt(i+1)})} · ${fx("fClip",{a:fmtT(r.clipA),b:fmtT(r.clipB)})}</div>`:""}
      <div class="fhead"><span class="fbadge">${t(r.level==="confirmed"?"fConfirmed":"fPossible")}</span><span class="fconf">${fx("fConf",{n:numFmt(r.conf)})}</span></div>
      ${vp?finderVerseHTML(vp,vp.within?t("fWithin"):""):(r.mapVerse?finderVerseHTML(r.mapVerse,t("fFromMap")):(r.verse?finderVerseHTML(null):""))}
      <b class="ftitle">${trTitle(r.tr)}</b><small class="fsub">${sub}</small>
      <div class="fmeta"><span class="fcat c${cat.rank}">${fEsc(finderCatTx(r.tr))}</span><span>${t("fDate")}: ${r.tr.y?fEsc(r.tr.y):t("fNoDate")}</span>${riw?`<span>${t("fRiwaya")}: ${fEsc(riw)} ${t("fFromLabel")}</span>`:""}</div>
      <div class="ftime"><span>${t("fStart")} ${fmtT(r.start)}</span><span>${t("fEnd")} ${fmtT(r.end)}</span><span>${fx("fLen",{n:numFmt(Math.round(r.end-r.start))})}</span></div>
      <div class="fpts">${fx("fPts",{a:numFmt(r.s),b:numFmt(r.s2)})}</div>
      ${r.vmAgree===true?`<div class="fpts fok">${t("fVmAgree")}</div>`:r.vmAgree===false?`<div class="fpts fwarn">${fx("fVmDisagree",{s:fEsc(isAr()?SURAHS[vp.surah-1][0]:SURAHS[vp.surah-1][1])})}</div>`:""}
      ${r.agree===true?`<div class="fpts fok">${t("fAgree")}</div>`:r.agree===false&&vp?`<div class="fpts fwarn">${fx("fDisagree",{s:fEsc(isAr()?SURAHS[vp.surah-1][0]:SURAHS[vp.surah-1][1])})}</div>`:""}
      <div class="facts">
        <button class="btn-gold" data-fact="from" data-fi="${i}">${ic("play")}${t("fPlayFrom")}</button>
        <button data-fact="sec" data-fi="${i}">${ic("repeat")}${t("fPlaySec")}</button>
        <button data-fact="full" data-fi="${i}">${ic("list")}${t("fFull")}</button>
        ${su?`<button data-fact="verses" data-fi="${i}" data-su="${su}" data-ay="${vp&&vp.surah===su?vp.ayah:""}">${ic("mushaf")}${t("fVerses")}</button>`:""}
        <button data-fact="link" data-fi="${i}">${ic("share")}${t("fCopy")}</button>
        <a class="fbtnlink" href="${fEsc(r.tr.url)}" target="_blank" rel="noopener">${ic("upload")}${t("fOrig")}</a>
        <button data-fact="save" data-fi="${i}">${ic("star")}${t("fSave")}</button>
      </div>
      ${r.copies.length?`<div class="fcopies"><small>${t("fSame")}</small>${r.copies.map((c,j)=>finderRowHTML(c,i,j)).join("")}</div>`:""}
    </div>`;
}
/* no recording found by sound, but the verses were recognised: say so plainly, and list the library's other
   recordings of that surah as OTHER recordings (never as the original) */
function finderNotFoundHTML(verses,searched){
  /* no recording found: a surah is named only from CONFIRMED verse places, and only when the stretches of the clip
     that were recognised agree with each other (one surah, verses in order) */
  const places=[];for(const v of verses){const p=v.place;if(p&&p.level==="confirmed"&&!places.some(q=>q.surah===p.surah&&Math.abs(q.ayah-p.ayah)<=2))places.push(p)}
  if(places.length>1&&new Set(places.map(p=>p.surah)).size>1&&!places.every((p,i)=>!i||p.surah>=places[i-1].surah))places.length=0;
  let h=`<div class="card fres fnone"><b>${t("fNotFound")}</b><p>${fx("fNotFoundTx",{n:numFmt(searched)})}</p></div>`;
  if(!places.length)return h;
  h+=`<div class="card fres verses">${places.map(p=>finderVerseHTML(p)).join("")}
    <div class="facts"><button data-fact="mushaf" data-su="${places[0].surah}" data-ay="${places[0].ayah}">${ic("mushaf")}${t("fVerses")}</button></div></div>`;
  const su=places[0].surah;
  finderOthers=finderSurahRecs(su,places[0].ayah).map(tr=>({tr,at:0}));
  /* recordings the library's analysis heard reciting this passage come first, with where in them */
  const seen=new Set(finderOthers.map(o=>o.tr.k)),byMap=[];
  for(const x of FINDER.vmFound||[]){const tr=trFromCode(x.code);if(!tr)continue;byMap.push({tr,at:x.at,map:true});seen.delete(tr.k)}
  if(byMap.length){const ks=new Set(byMap.map(o=>o.tr.k));byMap.sort((x,y)=>finderCat(x.tr).rank-finderCat(y.tr).rank);finderOthers=byMap.concat(finderOthers.filter(o=>!ks.has(o.tr.k)))}
  if(finderOthers.length){
    const nm=isAr()?SURAHS[su-1][0]:SURAHS[su-1][1];
    h+=`<div class="card fres fothers"><small>${fx("fOthers",{s:fEsc(nm),n:numFmt(finderOthers.length)})}</small>
      <div class="foth">${finderOthers.slice(0,6).map((o,k)=>finderOtherHTML(o,k)).join("")}</div>
      ${finderOthers.length>6?`<button class="fmore" data-fact="allothers">${fx("fShowAll",{n:numFmt(finderOthers.length)})}</button>`:""}</div>`;
  }
  return h;
}
function finderOtherHTML(o,k){return `<div class="fcopy"><div class="tx"><span>${trTitle(o.tr)}</span><small>${finderSubTx(o.tr)}${o.map?" · "+fx("fAround",{t:fmtT(o.at)}):""}</small></div><button class="playc" data-fact="other" data-fk="${k}">${ic("play")}</button></div>`}
/* does a recording's label say it contains ayah ay of surah su? true / false / null (the label gives no verses) */
function finderCovers(tr,su,ay){
  if(!tr.eg)return tr.n===su?true:false;
  for(const part of (tr.tEn||"").split(/\s*·\s*/)){
    const p=part.replace(/^(Sūrah|Surah)\s+/i,"");
    const n=SURAHS.findIndex(s=>p.startsWith(s[1])&&!/[a-zāīūḥʿʾ]/i.test(p.charAt(s[1].length)||" "))+1;if(n!==su)continue;
    let m=p.match(/\((\d+)\s*[–-]\s*(\d+)\)/);if(m)return ay>=+m[1]&&ay<=+m[2];
    m=p.match(/\(from (\d+)\)/);if(m)return ay>=+m[1];
    return null;
  }
  return false;
}
/* the library's recordings that contain the passage by their labels: those whose verses include it first, then those
   whose label names only the surah (by category order), then the full sets */
function finderSurahRecs(su,ay){
  const yes=[],maybe=[];
  AREAS.forEach((a,ai)=>a.secs.forEach((sc,si)=>sc.items.forEach((it,ii)=>{const tr=egTrack(ai,si,ii);const c=finderCovers(tr,su,ay||1);if(c===true)yes.push(tr);else if(c===null)maybe.push(tr)})));
  const byCat=(x,y)=>finderCat(x).rank-finderCat(y).rank;
  const out=yes.sort(byCat).concat(maybe.sort(byCat));
  for(const r of RECITATIONS)if(r.surahs[su])out.push(surahTrack(r,su));
  return out;
}
/* category and place without saying the same thing twice ("Egyptian Radio · Egyptian Radio") */
function finderSubTx(tr){const c=finderCatTx(tr),sub=trSub(tr);return sub.startsWith(c)?sub:c+" · "+sub}
function finderRender(list,notes,verses,searched){
  finderLast=list;
  const box=$("#fResults");
  const nt=(notes||[]).filter(Boolean).map(n=>`<p class="fnote">${n}</p>`).join("");
  if(!list.length){
    box.innerHTML=nt+(verses&&verses.some(v=>v.place)?finderNotFoundHTML(verses,searched):`<div class="card fres fnone"><b>${t("fNone")}</b><p>${t("fNoneTx")}</p></div>`);
    return;
  }
  box.innerHTML=nt+list.map((r,i)=>finderCardHTML(r,i,list.length)).join("");
}
/* play only the matched section */
let finderStopAt=null;
au.addEventListener("timeupdate",()=>{if(finderStopAt!=null&&cur&&cur.k===finderStopAt.k&&au.currentTime>=finderStopAt.t){au.pause();finderStopAt=null}});
async function finderOpenVerse(su,ay){
  S.mMode="read";save();go("mushaf");
  let pg=SURAH_PAGE[su-1],key=null;
  if(ay>1&&typeof versePage==="function"){key=su+":"+ay;try{pg=await versePage(key)}catch(e){key=null}}
  setTimeout(()=>goPage(pg,key,su),60);
}
$("#fResults").addEventListener("click",async e=>{
  const b=e.target.closest("[data-fact]");if(!b)return;const a=b.dataset.fact;
  if(a==="other"){const o=finderOthers[+b.dataset.fk];if(o){finderStopAt=null;playTrack(o.tr,{at:Math.max(0,o.at-5),quiet:true});go("player")}return}
  if(a==="allothers"){const box=b.closest(".fothers");box.querySelector(".foth").innerHTML=finderOthers.map((o,k)=>finderOtherHTML(o,k)).join("");b.remove();return}
  if(a==="mushaf"){finderOpenVerse(+b.dataset.su,+b.dataset.ay||1);return}
  const r=finderLast[+b.dataset.fi];if(!r)return;
  if(a==="copy"){const c=r.copies[+b.dataset.fj];if(c){finderStopAt=null;playTrack(c.tr,{at:c.start,quiet:true});go("player")}}
  else if(a==="from"){finderStopAt=null;playTrack(r.tr,{at:r.start,quiet:true});go("player")}
  else if(a==="sec"){playTrack(r.tr,{at:r.start,quiet:true});finderStopAt={k:r.tr.k,t:r.end}}
  else if(a==="full"){finderStopAt=null;playTrack(r.tr,{at:0,quiet:true});go("player")}
  else if(a==="verses"){finderOpenVerse(+b.dataset.su,+b.dataset.ay||1)}
  else if(a==="link"){const url=shareLink(r.tr,r.start);try{await navigator.clipboard.writeText(url);toast(fx("fLinkCopied",{t:fmtT(r.start)}))}catch(err){toast(url)}}
  else if(a==="save"){
    if(!S.favs.some(x=>x&&x.k===r.tr.k))S.favs.unshift(r.tr);
    if(S.pins){const at=Math.floor(r.start),e2=S.pins[r.tr.k]||{tr:r.tr,m:[]};if(!e2.m.some(x=>Math.abs(x-at)<=3))e2.m=e2.m.concat(at).sort((x,y)=>x-y);S.pins[r.tr.k]=e2}
    save();toast(t("fSaved"));if(typeof renderFavs==="function")renderFavs();
  }
});

/* ---------- remembered results ---------- */
/* results of a clip already searched (same file contents, same index) are shown again without searching */
const FCACHE_KEY="abq-fcache";
async function finderKey(blob){
  try{const buf=await blob.arrayBuffer();const d=await crypto.subtle.digest("SHA-256",buf);return [...new Uint8Array(d)].slice(0,12).map(hex2).join("")}catch(e){return null}
}
function finderCacheGet(k){try{const c=JSON.parse(localStorage.getItem(FCACHE_KEY)||"{}");return c[k]||null}catch(e){return null}}
function finderCachePut(k,v){
  try{const c=JSON.parse(localStorage.getItem(FCACHE_KEY)||"{}");c[k]=Object.assign(v,{at:Date.now()});
    const ks=Object.keys(c).sort((a,b)=>c[b].at-c[a].at);for(const x of ks.slice(25))delete c[x];
    localStorage.setItem(FCACHE_KEY,JSON.stringify(c))}catch(e){}
}
const finderPack=list=>list.map(r=>Object.assign({},r,{tr:undefined,_copies:undefined,copies:r.copies.map(c=>({code:c.code,start:c.start,end:c.end,s:c.s}))}));
function finderUnpack(list){
  return list.map(r=>{const tr=trFromCode(r.code);if(!tr)return null;return Object.assign({},r,{tr,copies:r.copies.map(c=>{const ct=trFromCode(c.code);return ct?Object.assign({},c,{tr:ct}):null}).filter(Boolean)})}).filter(Boolean);
}

/* ---------- the search ---------- */
async function finderRun(blob){
  if(FINDER.busy)return;FINDER.busy=true;FINDER.last=blob;
  $("#fResults").innerHTML="";
  const useVerses=S.fVerses!==false;
  try{
    finderStatus(t("fReading"));
    const man=await finderManifest();
    /* results are remembered per index build ("p4": none remembered by earlier versions is reused, some of which
       were wrong because index parts of two builds were mixed) */
    const vmm=await vmManifest(),key=await finderKey(blob),ck=key&&key+":"+FINDER.build+":"+((vmm&&vmm.built)||"")+":"+(useVerses?1:0)+":p5";
    const hit=ck&&finderCacheGet(ck);
    if(hit){FINDER.vmFound=hit.vmFound||[];finderStatus();finderRender(finderUnpack(hit.list),(hit.notes||[]).concat(t("fCached")),hit.verses,hit.searched);return}
    if(blob.size>400e6)toast(t("fBigFile"));
    let dec;try{dec=await finderDecode(blob)}catch(e){finderStatus();$("#fResults").innerHTML=`<div class="card fres fnone"><p>${t(blob.size>150e6?"fTooLong":"fBad")}</p></div>`;return}
    if(dec.x.length<4*FPRINT.FP.sr){finderStatus();$("#fResults").innerHTML=`<div class="card fres fnone"><p>${t("fTooShort")}</p></div>`;return}
    const dur=dec.x.length/FPRINT.FP.sr;
    finderStatus(t("fListening"));
    await new Promise(r=>setTimeout(r,30));
    const prog=(a,b)=>finderStatus(t("fSearching"),fx("fOf",{a:numFmt(a),b:numFmt(b)}),a/b);
    let res=await finderSearch(dec.x,prog,1,"r"),list=finderSections(res);const notes=[dec.cut?t("fLong"):""];let edit=null;
    /* nothing certain: the clip may have been sped up or slowed down (common on social media), with the pitch
       changed too (resampled) or kept (time-stretched) */
    if(!list.some(r=>r.level==="confirmed")){
      /* edits seen on social media, most common first: small speed changes; tempo changes (pitch kept); pitch
         shifts (tempo kept), detected by reading the spectrum back at the original frequencies; larger speed changes
         (pitch and tempo together); pitch shift and tempo change together */
      const tries=[["r",1/1.03],["t",1.03],["r",1/0.97],["t",0.97],["p",1],["p",-1],["r",1/1.06],["t",1.06],["r",1/0.94],["t",0.94],["p",2],["p",-2]];
      if(dur<=90){tries.push(["t",1.1],["t",1/1.1],["t",1.25],["t",0.8],["r",1/1.1],["r",1/0.9],["r",1/1.25],["r",1/0.8],["p",3],["p",-3],["p",4],["p",-4]);
        for(const sm of [1,-1,2,-2])for(const k of [1.1,1/1.1])tries.push(["pt",[sm,k]])}
      for(let i=0;i<tries.length;i++){
        const [m,f]=tries[i];
        const res2=await finderSearch(dec.x,(a,b)=>finderStatus(t("fSpeed"),fx("fOf",{a:numFmt(a),b:numFmt(b)}),(i+a/b)/tries.length),f,m,dur>90?1200:600),r2=finderSections(res2,true);
        if(r2.some(r=>r.level==="confirmed")){list=r2;res=res2;edit={mode:m,f};
          if(m==="p"||m==="pt"){const sm=m==="p"?f:f[0];notes.push(fx("fPitchNote",{n:(sm>0?"+":"−")+numFmt(Math.abs(sm))})+(m==="pt"?" "+fx("fSpeedTempo",{n:numFmt(Math.round(Math.abs(f[1]-1)*100))}):""))}
          else{const pct=numFmt(Math.round(Math.abs((m==="r"?1/f:f)-1)*100));notes.push(fx(m==="r"?"fSpeedNote":"fSpeedTempo",{n:pct}))}
          break}
      }
    }
    await finderRefine(res,list);
    list=finderGroup(list);
    if(edit)list.forEach(r=>{r.edit=edit.mode+":"+(Array.isArray(edit.f)?edit.f.join("/"):edit.f)});
    /* the verses: what the clip recites, checked against each recording's label */
    let verses=null;
    if(useVerses){
      try{
        AYAH.onModel=f=>finderStatus(t("fModel"),Math.round(f*100)+"%",f);
        const wins=finderVerseWins(list,dec.ab.duration);
        /* undo the edit the sound match found before listening for the verses */
        /* measured (docs/RECOGNITION-TRANSFORMS.md): undoing a speed change helps a lot, and a pitch shift of 3 semitones
           or more; a shift of 1-2 semitones is left as it is (the speech model copes, and resampling costs as much as it gains) */
        const sm=!edit?0:edit.mode==="p"?edit.f:edit.mode==="pt"?edit.f[0]:0;
        const rate=!edit?1:edit.mode==="r"?edit.f:Math.abs(sm)>=3?Math.pow(2,-sm/12):1;
        verses=await ayahRecognise(dec.ab,wins,(i,n)=>{if(AYAH.ready)finderStatus(t("fVersesStep"),n>1?fx("fVersesOf",{a:numFmt(i+1),b:numFmt(n)}):"",n>1?i/n:null)},rate);
        AYAH.onModel=null;
        if(list.length){
          let dropped=false;
          list.forEach((r,i)=>{r.verse=verses[i]||{place:null};const ss=trSurahs(r.tr).concat(...r.copies.map(c=>trSurahs(c.tr)));
            if((!r.verse.place||r.verse.place.level!=="confirmed")&&r.verse.text){const w=ayahPlaceIn(r.verse.text,ss);if(w&&(!r.verse.place||w.score>=r.verse.place.score*0.6))r.verse.place=w}
                        /* only a CONFIRMED verse place (or one placed within the recording's own surahs) names a surah on the card:
               an unconfirmed guess from the speech model could be a completely different surah */
            if(r.verse.place&&r.verse.place.level==="possible"&&!r.verse.place.within)r.verse.place=null;
            const p=r.verse.place;if(p&&p.within){return}
            if(p&&ss.length){const inL=ss.includes(p.surah)||ss.includes(p.surah2);if(inL)r.agree=true;else if(p.level==="confirmed")r.agree=false}
            /* a weak sound match that contradicts clearly recognised verses is left out */
            if(r.level==="possible"&&r.agree===false){r.drop=true;dropped=true}});
          list=list.filter(r=>!r.drop);if(dropped)notes.push(t("fDropped"));
        }
      }catch(e){AYAH.onModel=null;notes.push(t("fVerseErr"));verses=null}
    }
    /* the library's analysis of each recording found (vm/): what that recording recites at the matched point. It is
       checked against the verses heard in the clip: a sound match they contradict is shown only as possible, or left
       out if it was weak. When the clip's own verses weren't recognised, the analysis tells which verses they are. */
    try{
      let vmDropped=false;
      for(const r of list){
        const w=await vmOf(r.code);if(!w)continue;
        const rp=vmPlaces(w,r.start-5,r.end+5,2);if(!rp.length)continue;
        const rs=new Set(rp.flatMap(x=>[x[1],x[3]])),p=r.verse&&r.verse.place;
        if(p&&p.level==="confirmed"&&!p.within){
          r.vmAgree=rs.has(p.surah)||rs.has(p.surah2);
          if(!r.vmAgree){if(r.level==="possible"){r.drop=true;vmDropped=true}else{r.level="possible";r.conf=Math.min(r.conf,49)}}
        }else if(!p){
          const inside=rp.filter(x=>x[0]<r.end&&x[0]+30>r.start),use=inside.length?inside:rp,su=use[0][1];
          const same=use.filter(x=>x[1]===su);
          r.mapVerse={surah:su,ayah:Math.min(...same.map(x=>x[2])),surah2:same[same.length-1][3],ayah2:Math.max(...same.filter(x=>x[3]===same[same.length-1][3]).map(x=>x[4])),level:"confirmed",conf:Math.round(same.reduce((a,x)=>a+x[5],0)/same.length),alts:[]};
        }
      }
      if(vmDropped){list=list.filter(r=>!r.drop);notes.push(t("fVmDropped"))}
    }catch(e){}
    /* no recording found but the verses are clear: which recordings the analysis heard reciting them */
    FINDER.vmFound=[];
    if(!list.length&&verses){const p=verses.map(v=>v.place).find(p=>p&&p.level==="confirmed");if(p){try{FINDER.vmFound=await vmFind(p.surah,p.ayah)}catch(e){}}}
    const searched=man.recs.filter(r=>r[1]>0).length;
    finderStatus();finderRender(list,notes,verses,searched);
    if(ck)finderCachePut(ck,{list:finderPack(list),notes,verses,searched,vmFound:FINDER.vmFound});
  }catch(e){
    finderStatus();
    const k=e&&e.code==="noindex"?"fNoIndex":(e&&e.code==="net"?"fNet":"fOffline");
    $("#fResults").innerHTML=`<div class="card fres fnone"><p>${t(k)}</p>${k!=="fNoIndex"?`<div class="facts"><button class="btn-gold" data-fretry>${ic("repeat")}${t("fRetry")}</button></div>`:""}</div>`;
  }finally{FINDER.busy=false}
}
for(const id of ["#fFile","#fFileA"])$(id).addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];e.target.value="";if(f)finderRun(f)});
$("#fResults").addEventListener("click",e=>{if(e.target.closest("[data-fretry]")&&FINDER.last)finderRun(FINDER.last)});
/* a video or audio shared to the app from the gallery or another app (Android: Share → Abdul Basit).
   The service worker keeps the file for a moment and opens this screen (manifest share_target, sw.js) */
async function finderShared(){
  if(!/[?&]shared=1/.test(location.search))return;
  history.replaceState(null,"",location.pathname+location.hash);
  try{const c=await caches.open("abdulbasit-share");const r=await c.match("shared-file");if(!r)return;
    const blob=await r.blob();await c.delete("shared-file");
    go("finder");toast(t("fShared"));setTimeout(()=>finderRun(blob),300)}catch(e){}
}
window.addEventListener("load",finderShared);
$("#fVerseOpt").addEventListener("change",e=>{S.fVerses=e.target.checked;save()});
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
  $("#fVerseOpt").checked=S.fVerses!==false;
  try{const m=await finderManifest();const n=m.recs.filter(r=>r[1]>0).length;
    $("#fAbout").textContent=fx("fAboutTx",{n:numFmt(n),h:numFmt(Math.round(m.hours)),d:m.built})+(m.failed&&m.failed.length?" "+fx("fFailed",{n:numFmt(m.failed.length)}):"")}
  catch(e){$("#fAbout").textContent=""}
}
const _showF=show;show=function(id){_showF(id);if(id==="finder")finderAbout()};
/* labels set from code follow a change of language */
const _applyLangF=applyLang;applyLang=function(){_applyLangF.apply(this,arguments);try{finderRecLabel()}catch(e){}};
