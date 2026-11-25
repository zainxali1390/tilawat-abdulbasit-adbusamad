/* Verse recognition for "Find a recitation": which surah and ayahs a clip recites, from the recitation itself.
   1. the clip is turned into 16 kHz mono and transcribed on the phone by a Quran speech model
      (whisper-base-ar-quran by Tarteel, Apache 2.0, 8-bit, in models/; about 77 MB, downloaded once and then kept by the browser;
      chosen by test in docs/RECOGNITION-CONTENT.md over whisper-tiny-ar-quran, which placed far fewer clips)
   2. the transcript is placed in the Quran text (data/quran-uthmani.txt) by matching letter sequences:
      vowel marks, hamzas and alifs are removed on both sides, so small mistakes of the speech model and
      differences of spelling (and many differences between riwayat) don't stop a match
   3. a place is "confirmed" only when it clearly beats every other place in the Quran; repeated verses
      (for example "فبأي آلاء ربكما تكذبان") come back as several possible places
   Nothing leaves the phone. */
const QMATCH=(()=>{
  const MARKS=/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
  function skel(s){
    return (s||"").normalize("NFC").replace(MARKS,"")
      .replace(/[ٱأإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ؤ/g,"و").replace(/ئ/g,"ي")
      .replace(/[ءا]/g,"").replace(/[^ء-ي]/g,"");
  }
  const N=4,B=12;
  let G="",start=null,ayahOf=null,post=null,COUNTS=null,FIRST=null;
  function build(lines,counts){
    COUNTS=counts;FIRST=[];let n=0;for(const c of counts){FIRST.push(n);n+=c}
    const sk=lines.map(skel);start=new Int32Array(sk.length+1);
    let p=0;sk.forEach((x,i)=>{start[i]=p;p+=x.length});start[sk.length]=p;G=sk.join("");
    ayahOf=new Uint16Array(G.length);sk.forEach((x,i)=>ayahOf.fill(i,start[i],start[i+1]));
    post=new Map();
    for(let i=0;i+N<=G.length;i++){const g=G.substr(i,N);let a=post.get(g);if(!a)post.set(g,a=[]);a.push(i)}
  }
  function ref(i){let s=0;while(s<COUNTS.length-1&&i>=FIRST[s+1])s++;return[s+1,i-FIRST[s]+1]}
  /* places in the Quran for a transcript, best first. score = weighted letter groups that agree with one alignment */
  function find(text,only){
    const q=skel(text);if(!post||q.length<N+4)return{q,results:[]};
    const grams=[];for(let j=0;j+N<=q.length;j++){const ps=post.get(q.substr(j,N));if(ps&&ps.length<=400)grams.push([j,ps,1/Math.log2(2+ps.length)])}
    const votes=new Map();
    for(const [j,ps,w] of grams)for(const gp of ps){const b=Math.floor((gp-j)/B);votes.set(b,(votes.get(b)||0)+w)}
    const cand=[];for(const [b,v] of votes){cand.push([v+(votes.get(b+1)||0)*.9+(votes.get(b-1)||0)*.5,b])}
    if(only){const ok=new Set(only);for(const c of cand){const g=Math.max(0,Math.min(G.length-1,c[1]*B));if(!ok.has(ref(ayahOf[g])[0]))c[0]=-1}}
    cand.sort((a,b)=>b[0]-a[0]);
    let totW=0;for(const g of grams)totW+=g[2];
    const out=[];
    for(const [sc0,b] of cand.slice(0,40)){
      if(sc0<0)break;
      /* the region around this alignment: reciters repeat phrases and go back, so every letter group found
         anywhere in it counts, not only those at one exact offset */
      const lo=(b-1)*B-60,hi=(b+1)*B+q.length+60;
      if(out.some(x=>lo<x.hi&&hi>x.lo))continue;
      let hit=0,n=0;const offs=[];
      for(const [j,ps,w] of grams){let f=-1;for(const gp of ps)if(gp>=lo&&gp<hi){f=gp;break}if(f>=0){hit+=w;n++;offs.push(f-j)}}
      if(!n)continue;
      /* where the transcript starts and ends: the main alignment, then the letter groups that sit on it */
      offs.sort((x,y)=>x-y);let o=offs[offs.length>>1];
      /* letter groups found in few places fix the alignment better than common ones */
      const ro=[];for(const [j,ps] of grams)if(ps.length<=3)for(const gp of ps)if(gp>=lo&&gp<hi){ro.push(gp-j);break}
      if(ro.length>=2){ro.sort((x,y)=>x-y);o=ro[ro.length>>1]}
      const where=[];for(const [j,ps] of grams)for(const gp of ps)if(gp>=o-12&&gp<o+q.length+12&&Math.abs(gp-j-o)<=Math.max(8,q.length*0.2)){where.push(gp);break}
      if(!where.length)where.push(o);
      where.sort((x,y)=>x-y);
      let gs=where[Math.floor(where.length*0.05)],ge=where[Math.min(where.length-1,Math.ceil(where.length*0.95)-1)]+N-1;
      /* refrains ("ويل يومئذ للمكذبين") occur in many ayahs: the ends of the range come from the letter groups that
         occur in few places, extended by the letters of the transcript before / after them */
      const rare=[];for(const [j,ps] of grams)if(ps.length<=3)for(const gp of ps)if(Math.abs(gp-j-o)<=Math.max(8,q.length*0.2)){rare.push([j,gp]);break}
      if(rare.length>=2){gs=Math.max(gs,rare[0][1]-rare[0][0]);ge=Math.min(ge,rare[rare.length-1][1]+(q.length-rare[rare.length-1][0])-1)}
      const a0=ayahOf[Math.min(G.length-1,gs+2)],a1=ayahOf[Math.max(gs,Math.min(G.length-1,ge-2))];
      const [su,ay]=ref(a0),[su2,ay2]=ref(Math.max(a0,a1));
      out.push({score:hit,n,conf:hit/Math.max(1e-6,totW),frac:n/grams.length,idx:a0,idx2:a1,surah:su,ayah:ay,surah2:su2,ayah2:ay2,pos:gs,lo,hi});
    }
    out.sort((a,b)=>b.score-a.score);
    return{q,results:out.slice(0,4)};
  }
  function frac(su,ay){let f=FIRST[su-1];const a=start[f],z=start[f+COUNTS[su-1]],x=start[f+ay-1];return z>a?(x-a)/(z-a):0}
  return{build,find,skel,frac,ready:()=>!!post};
})();

let QLINES=null,QREADY=null;
function loadQuran(){
  if(!QREADY)QREADY=fetch("data/quran-uthmani.txt").then(r=>{if(!r.ok)throw new Error("http "+r.status);return r.text()})
    .then(tx=>{QLINES=tx.trim().split("\n");QMATCH.build(QLINES,SURAHS.map(x=>x[2]))})
    .catch(e=>{QREADY=null;throw e});
  return QREADY;
}

/* the speech model runs in a worker, so the screen stays responsive */
const AYAH_TJS="https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.1/dist/transformers.min.js";
const AYAH_SRC=`let pipe=null;
self.onmessage=async e=>{const m=e.data;
  try{
    if(!pipe){const T=await import("${AYAH_TJS}");T.env.allowRemoteModels=false;T.env.allowLocalModels=true;T.env.localModelPath=m.base;
      pipe=await T.pipeline("automatic-speech-recognition","whisper-base-ar-quran",{dtype:{encoder_model:"q8",decoder_model_merged:"q8"},device:"wasm",
        progress_callback:p=>{if(p.status==="progress")self.postMessage({type:"progress",file:p.file,loaded:p.loaded,total:p.total})}});
      self.postMessage({type:"ready"})}
    if(m.pcm){const o=await pipe(m.pcm,{language:"ar",task:"transcribe",chunk_length_s:30});self.postMessage({type:"text",id:m.id,text:o.text})}
  }catch(err){self.postMessage({type:"error",id:m.id,msg:String(err&&err.message||err)})}
};`;
const AYAH={w:null,seq:0,wait:new Map(),onModel:null,ready:false};
function ayahWorker(){
  if(AYAH.w)return AYAH.w;
  const w=new Worker(URL.createObjectURL(new Blob([AYAH_SRC],{type:"text/javascript"})),{type:"module"});
  const files={};
  w.onmessage=e=>{const m=e.data;
    if(m.type==="progress"){files[m.file]=[m.loaded||0,m.total||0];let l=0,tt=0;for(const k in files){l+=files[k][0];tt+=files[k][1]}if(AYAH.onModel&&tt)AYAH.onModel(l/tt)}
    else if(m.type==="ready")AYAH.ready=true;
    else if(m.type==="text"||m.type==="error"){const x=AYAH.wait.get(m.id);if(x){AYAH.wait.delete(m.id);m.type==="text"?x.res(m.text):x.rej(new Error(m.msg))}}
  };
  w.onerror=()=>{AYAH.wait.forEach(x=>x.rej(new Error("worker")));AYAH.wait.clear();AYAH.w=null};
  return AYAH.w=w;
}
function ayahTranscribe(pcm){
  const id=++AYAH.seq,w=ayahWorker();
  return new Promise((res,rej)=>{AYAH.wait.set(id,{res,rej});w.postMessage({id,pcm,base:new URL("models/",location.href).href},[pcm.buffer])});
}
/* one stretch of the decoded clip as 16 kHz mono */
async function ayahPcm(ab,st,len,rate){
  len=Math.max(1,Math.min(len,ab.duration-st));rate=rate||1;
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  /* rate ≠ 1: played faster or slower, which undoes a speed change or a pitch shift found by the sound match (a pitch
     correction also changes the tempo, which the speech model tolerates far better than a wrong pitch) */
  const oc=new OAC(1,Math.ceil(len/rate*16000),16000);const src=oc.createBufferSource();
  src.buffer=ab;src.playbackRate.value=rate;src.connect(oc.destination);src.start(0,st,len);return (await oc.startRendering()).getChannelData(0).slice(0);
}
/* what a transcript says: the best place, how sure, and other places it could be */
/* the speech model sometimes "hallucinates" on sound it can't make out: the same word or two over and over
   ("ما ما ما ما …"). Such a loop can line up with some verse by chance, so it is removed before placing, and a
   transcript with too little real variety is not placed at all */
function ayahClean(text){
  const w=(text||"").split(/\s+/).filter(Boolean),out=[];
  for(let i=0;i<w.length;i++){
    let loop=false;for(const n of [1,2,3]){if(out.length>=n*2&&w.slice(i,i+n).join(" ")===out.slice(-n).join(" ")&&out.slice(-n).join(" ")===out.slice(-2*n,-n).join(" ")){loop=true;break}}
    if(!loop)out.push(w[i]);
  }
  /* a word repeated back to back more than twice is kept once */
  const o2=[];for(const x of out){if(o2.length>=1&&o2[o2.length-1]===x&&o2.length>=2&&o2[o2.length-2]===x)continue;o2.push(x)}
  return o2.join(" ");
}
function ayahVaried(text){
  const q=QMATCH.skel(text);if(q.length<10)return false;
  const g=new Set();for(let i=0;i+4<=q.length;i++)g.add(q.substr(i,4));
  return new Set(q).size>=6&&g.size>=0.5*(q.length-3)&&new Set(text.split(/\s+/).filter(Boolean)).size>=3;
}
function ayahPlace(text){
  text=ayahClean(text);if(!ayahVaried(text))return null;
  const r=QMATCH.find(text);const [a,b]=r.results;
  if(!a)return null;
  const ratio=b?a.score/Math.max(b.score,0.01):9;
  /* confirmed: most of the transcript lines up in one place, and no other place comes close */
  const level=a.n>=10&&a.conf>=0.4&&ratio>=1.8?"confirmed":(a.n>=5&&a.conf>=0.25&&ratio>=1.15?"possible":(a.n>=5&&a.conf>=0.3?"possible":null));
  if(!level)return null;
  const alts=r.results.slice(1).filter(x=>x.score>=a.score*0.7);
  return {...a,level,text,conf:Math.round(Math.min(.99,a.conf)*100),alts};
}
/* the recording was found by sound: where in ITS surahs (from its label) the transcript fits best. Used only when
   the transcript alone is not clear; shown as "within the recording's surahs", never as independent agreement */
function ayahPlaceIn(text,surahs){
  text=ayahClean(text);
  if(!text||!surahs.length||!ayahVaried(text))return null;
  const r=QMATCH.find(text,surahs);const a=r.results[0];
  if(!a||a.n<5||a.conf<0.25)return null;
  return {...a,level:"possible",within:true,text,conf:Math.round(Math.min(.9,a.conf)*100),alts:[]};
}
/* transcribe stretches of the clip (each up to 28 s) and place each one in the Quran */
async function ayahRecognise(ab,wins,onStep,rate){
  await loadQuran();
  const out=[];
  for(let i=0;i<wins.length;i++){
    const [st,len]=wins[i];
    if(onStep)onStep(i,wins.length);
    const pcm=await ayahPcm(ab,st,len,rate);
    const text=(await ayahTranscribe(pcm)).trim();
    out.push({t0:st,t1:Math.min(ab.duration,st+len),text,place:text?ayahPlace(text):null});
  }
  return out;
}
/* surahs named in a recording's title (full sets: the surah itself) */
function trSurahs(tr){
  if(!tr.eg)return tr.n?[tr.n]:[];
  const out=[];
  for(const part of (tr.tEn||"").split(/\s*·\s*/)){
    const p=part.replace(/^(Sūrah|Surah)\s+/i,"");let best=0,bl=0;
    SURAHS.forEach((s,i)=>{const n=s[1];if(p.startsWith(n)&&n.length>bl&&!/[a-zāīūḥʿʾ]/i.test(p.charAt(n.length)||" ")){best=i+1;bl=n.length}});
    if(best&&!out.includes(best))out.push(best);
  }
  return out;
}
/* a verse range as text, in the app's language */
function ayahRange(p){
  const sn=n=>isAr()?SURAHS[n-1][0]:SURAHS[n-1][1];
  if(p.surah===p.surah2)return {ar:"سورة "+SURAHS[p.surah-1][0],en:"Sūrah "+SURAHS[p.surah-1][1],ayat:p.ayah===p.ayah2?numFmt(p.ayah):numFmt(p.ayah)+"–"+numFmt(p.ayah2)};
  return {ar:"سورة "+SURAHS[p.surah-1][0]+" ← "+SURAHS[p.surah2-1][0],en:"Sūrah "+SURAHS[p.surah-1][1]+" → "+SURAHS[p.surah2-1][1],ayat:numFmt(p.ayah)+" – "+sn(p.surah2)+" "+numFmt(p.ayah2)};
}
