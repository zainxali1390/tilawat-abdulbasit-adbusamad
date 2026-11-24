/* Audio player, queue, resume position, player screen */
/* player */
let Q={list:[],i:0};
function curRec(){return RECITATIONS.find(r=>r.id===S.recId)||RECITATIONS[0]}
function playSurah(n){
  const r=curRec();if(!r){toast(t("noRec"));return}
  S.recId=r.id;
  const list=Object.keys(r.surahs).map(Number).sort((a,b)=>a-b).map(x=>surahTrack(r,x));
  playQueue(list,list.findIndex(x=>x.n===n));
}
function playQueue(list,i){if(!list.length||i<0)return;Q={list,i};playTrack(list[i])}
const embCache={};
function resolveUrl(u){
  if(!u||u[0]!=="#")return u;
  if(embCache[u])return embCache[u];
  const el=document.getElementById(u.slice(1));if(!el)return "";
  const bin=atob(el.textContent.trim()),arr=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  return embCache[u]=URL.createObjectURL(new Blob([arr],{type:el.dataset.type||"audio/webm"}));
}
let pendingSeek=null;
function playTrack(tr,opt){
  opt=opt||{};
  cur=tr;S.last=tr;
  const saved=(S.pos||{})[tr.k]||0;
  seekT=null;
  if(opt.at!=null)pendingSeek=opt.at;
  else if(saved>15){pendingSeek=Math.max(0,saved-3);if(!opt.quiet)toast(fill2("resumeFrom",{t:fmt(saved)}))}
  else pendingSeek=null;
  au.preload=opt.noplay?"none":"auto";
  au.src=resolveUrl(tr.url);
  if(!opt.noplay)au.play().catch(()=>{if(opt.shared)toast(t("tapToPlay"))});
  S.recent=[tr,...S.recent.filter(x=>x&&x.k!==tr.k)].slice(0,20);save();
  updatePlayer();renderRecent();
  if($("#loc").classList.contains("on"))renderLoc();if($("#collections").classList.contains("on")&&$("#cq").value)renderCollections();
  if("mediaSession" in navigator){
    try{navigator.mediaSession.metadata=new MediaMetadata({title:trTitle(tr),artist:"Abdul Basit Abdul Samad",album:trSub(tr)});
      navigator.mediaSession.setActionHandler("previoustrack",()=>step(-1));
      navigator.mediaSession.setActionHandler("nexttrack",()=>step(1));
      navigator.mediaSession.setActionHandler("play",()=>au.play());
      navigator.mediaSession.setActionHandler("pause",()=>au.pause());}catch(e){}
    /* lock-screen seek bar and ±10 s buttons (not every phone offers these) */
    const ms=(n,f)=>{try{navigator.mediaSession.setActionHandler(n,f)}catch(e){}};
    ms("seekto",d=>{if(isFinite(au.duration)&&d&&d.seekTime!=null)seekTo(d.seekTime)});
    ms("seekbackward",d=>seekTo(shownTime()-((d&&d.seekOffset)||10)));
    ms("seekforward",d=>seekTo(shownTime()+((d&&d.seekOffset)||10)));
  }
}
/* the list a recitation belongs to: its khatma, its place in the library, or the full set of surahs */
async function sourceQueue(tr){
  if(tr.kh){const K=KHATMAS.find(x=>x.id===tr.kh);if(K&&!K.yt){try{const L=await kTracks(K);if(L.length)return L.map((x,j)=>Object.assign({},x,{kh:K.id,ki:j}))}catch(e){}}}
  /* a library recording: the recordings of its place, in the order (and with the filters) last chosen there */
  if(tr.eg&&tr.k&&tr.k.startsWith("eg:")){const ll=libLocOf(tr);if(ll){const same=S.libC===ll.c.id&&S.libL===ll.l.id;const rs=same?libView(ll.l):ll.l.refs.map(r=>({r}));
    const L=rs.map(x=>egTrack(...x.r));if(L.some(x=>x.k===tr.k))return L;return ll.l.refs.map(r=>egTrack(...r))}}
  if(!tr.eg&&tr.rec){const r=RECITATIONS.find(x=>x.id===tr.rec);if(r)return Object.keys(r.surahs).map(Number).sort((a,b)=>a-b).map(n=>surahTrack(r,n))}
  return [tr];
}
let stepBusy=false;
async function step(d){
  if(!cur){toast(t("noRec"));return}
  /* "previous" part-way through a recitation goes back to its start, like other players */
  if(d<0&&au.currentTime>5){seekTo(0);return}
  if(stepBusy)return;
  let at=Q.list.findIndex(x=>x&&x.k===cur.k);
  if(at<0||Q.list.length<2){stepBusy=true;try{const L=await sourceQueue(cur);at=Math.max(0,L.findIndex(x=>x.k===cur.k));Q={list:L,i:at}}finally{stepBusy=false}}
  else Q.i=at;
  const i=Q.i+d;
  if(i<0){seekTo(0);toast(t("firstInList"));return}
  if(i>=Q.list.length){toast(t("lastInList"));return}
  Q.i=i;playTrack(Q.list[i]);
}
function startPlay(spec){
  const [kind,a,b]=spec.split(":");
  if(kind==="surah")playSurah(+a);
  else if(kind==="eg"){const [ai,si,ii]=spec.split(":").slice(1).map(Number);playQueue(AREAS[ai].secs[si].items.map((_,j)=>egTrack(ai,si,j)),ii)}
  else if(kind==="recent")playQueue(S.recent.slice(),+a);
  else if(kind==="fav")playQueue(S.favs.slice(),+a);
}
function updatePlayer(){
  const has=!!cur;
  const title=has?trTitle(cur):t("nothing");
  const sub=has?trSub(cur):t("nothingSub");
  $("#npTitle").textContent=title;$("#npSub").textContent=sub;$("#npShare").hidden=!cur;
  $("#npMore").hidden=!has;if(has)$("#npMoreTx").textContent=t(cur.kh?"openKhatma":cur.eg?"moreFromSec":"allSurahs");
  $("#plTitle").textContent=title;$("#plSub").textContent=sub;
  $("#plAr").textContent=has&&cur.n&&!cur.eg&&!isAr()?SURAHS[cur.n-1][0]:"";
  $("#npCard").classList.toggle("idle",!has);
  $$(".big .ctrls, .big input[type=range], .big .times").forEach(el=>el.classList.toggle("idle",!has));
  const inf=has?trInfo(cur):{};
  $("#kvStyle").textContent=inf.style||"—";$("#kvYear").textContent=inf.year||"—";$("#kvLoc").textContent=inf.loc||"—";$("#kvSrc").textContent=inf.src||"—";
  $("#ptTextIn").innerHTML=has&&cur.n===1?FATIHA.map((v,i)=>v[0]+` <span class="aya u-gold">﴿${arNum(i+1)}﴾</span>`).join(" "):`<span class="pt-none">${t("noText")}</span>`;
  const fav=has&&S.favs.some(x=>x&&x.k===cur.k);
  $("#favBtn").classList.toggle("on",fav);
  $("#favBtn span").textContent=t(fav?"inFav":"addFav");
  $$("[data-act=repeat]").forEach(b=>{b.classList.toggle("act",!!S.repeat);b.setAttribute("aria-pressed",S.repeat?"true":"false")});
  updatePP();
}
function updatePP(){const p=!au.paused&&!!cur;$$("[data-ppic]").forEach(s=>s.innerHTML=P[p?"pause":"play"])}
/* ---- position display and seeking ----
   One place decides what time is shown (shownTime): a seek that is still in progress (seekT), a position waiting
   for the recording to load (pendingSeek), otherwise the audio's own position. Reports of the old position that
   arrive while a seek is in progress are ignored, and nothing overwrites the slider or the time while it is being
   dragged. The DOM is only written when what is shown changes. */
let seekT=null;
const seekEls=["np","pl"].map(k=>({k,s:$("#"+k+"Seek"),cur:$("#"+k+"Cur"),dur:$("#"+k+"Dur"),txt:"",durTxt:"",v:-1}));
const seekMax=()=>+seekEls[0].s.max||1000;
const dragging=()=>seekEls.some(e=>e.s._drag);
function shownTime(){return seekT!=null?seekT:(pendingSeek!=null&&!(au.readyState>=1)?pendingSeek:(au.currentTime||0))}
function paintSeek(c,d,fromDrag){
  const M=seekMax(),v=d?Math.min(M,Math.max(0,Math.round(c/d*M))):0,txt=fmt(c),dt=fmt(d);
  for(const e of seekEls){
    if(e.v!==v&&(fromDrag||!e.s._drag)){e.s.value=v;e.s.style.setProperty("--p",v/M*100+"%");e.v=v}
    if(e.txt!==txt){e.cur.textContent=txt;e.txt=txt}
    if(e.durTxt!==dt){e.dur.textContent=dt;e.durTxt=dt}
  }
}
function updateTime(){if(dragging())return;paintSeek(shownTime(),au.duration||0)}
/* every seek goes through here: the new time is shown at once, before the audio has caught up */
function seekTo(t){
  const d=au.duration;if(isFinite(d)&&d>0)t=Math.min(Math.max(0,t),d);else t=Math.max(0,t);
  seekT=t;try{au.currentTime=t}catch(e){seekT=null}
  updateTime();mediaPos();
}
au.addEventListener("seeked",()=>{if(seekT!=null&&Math.abs((au.currentTime||0)-seekT)<1.5)seekT=null;updateTime()});
au.addEventListener("seeking",updateTime);
au.addEventListener("emptied",()=>{seekT=null});
/* the slider: while dragging, only the shown time and both sliders move (no seeking, so fast dragging can't queue
   up seeks); the audio jumps once, when the finger or mouse lets go */
seekEls.forEach(e=>{const s=e.s;
  const commit=()=>{if(!s._drag)return;s._drag=false;const d=au.duration;
    if(cur&&d&&isFinite(d))seekTo(s.value/seekMax()*d);else{s.value=0;s.style.setProperty("--p","0%");updateTime()}};
  s.addEventListener("input",()=>{s._drag=true;const d=au.duration;
    if(cur&&d&&isFinite(d))paintSeek(s.value/seekMax()*d,d,true);else s.style.setProperty("--p",s.value/seekMax()*100+"%")});
  s.addEventListener("change",commit);
  ["pointerup","pointercancel","touchend","touchcancel","lostpointercapture"].forEach(n=>s.addEventListener(n,()=>setTimeout(commit,0)));
  s.addEventListener("keyup",commit);s.addEventListener("blur",commit);
});
/* "timeupdate" comes only about 4 times a second (less on some phones): while playing, the shown time follows the
   audio every frame, but writes to the page only when the second or the slider position changes */
let tickOn=false;
function tick(){if(au.paused||document.hidden){tickOn=false;return}updateTime();requestAnimationFrame(tick)}
au.addEventListener("playing",()=>{if(!tickOn){tickOn=true;requestAnimationFrame(tick)}});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!au.paused&&!tickOn){tickOn=true;requestAnimationFrame(tick)}});
au.addEventListener("timeupdate",updateTime);au.addEventListener("loadedmetadata",updateTime);
function mediaPos(){try{if("mediaSession" in navigator&&navigator.mediaSession.setPositionState&&isFinite(au.duration)&&au.duration>0)navigator.mediaSession.setPositionState({duration:au.duration,playbackRate:au.playbackRate||1,position:Math.min(au.currentTime||0,au.duration)})}catch(e){}}
["loadedmetadata","seeked","play","pause"].forEach(n=>au.addEventListener(n,mediaPos));
au.addEventListener("loadedmetadata",()=>{if(pendingSeek==null)return;const t2=pendingSeek;pendingSeek=null;if(!isFinite(au.duration)||t2<au.duration-5)seekTo(t2);else updateTime()});
/* remember where each recitation was stopped, so it continues from there next time */
let posSaved=0;
function savePos(force){
  if(!cur||!isFinite(au.duration)||au.duration<60)return;
  const c=au.currentTime||0,now=Date.now();if(!force&&now-posSaved<5000)return;posSaved=now;
  S.pos=S.pos||{};
  if(c>au.duration-20)delete S.pos[cur.k];else if(c>15){delete S.pos[cur.k];S.pos[cur.k]=Math.floor(c)}
  const ks=Object.keys(S.pos);if(ks.length>300)ks.slice(0,ks.length-300).forEach(k=>delete S.pos[k]);
  save();
}
au.addEventListener("timeupdate",()=>savePos(false));au.addEventListener("pause",()=>savePos(true));
au.addEventListener("ended",()=>{if(cur&&S.pos){delete S.pos[cur.k];save()}});
window.addEventListener("pagehide",()=>savePos(true));document.addEventListener("visibilitychange",()=>{if(document.hidden)savePos(true)});
au.addEventListener("error",async()=>{if(!cur)return;const tr=cur;
  if(await repairUrl(tr)){if(cur===tr){au.src=tr.url;au.play().catch(()=>{})}return}
  toast(t("loadErr"))});
au.addEventListener("play",()=>{updatePP();try{if(ytP&&ytP.pauseVideo)ytP.pauseVideo()}catch(e){}});au.addEventListener("pause",updatePP);
au.addEventListener("ended",()=>{kMarkDone(cur);if(S.repeat){seekTo(0);au.play().catch(()=>{})}else if(S.autoNext){const n=Q.list.findIndex(x=>x&&x.k===cur.k);if(n>=0&&n===Q.list.length-1&&Q.list.length>1)updatePP();else step(1)}else updatePP()});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&!S.bg&&!au.paused)au.pause()});

document.addEventListener("click",e=>{
  const a=e.target.closest("[data-act]");
  if(a){const k=a.dataset.act;
    if(k==="toggle"){if(!cur){toast(t("noRec"));return}au.paused?au.play().catch(()=>{}):au.pause()}
    else if(k==="prev")step(-1);else if(k==="next")step(1);
    else if(k==="repeat"){S.repeat=!S.repeat;save();updatePlayer();toast(t(S.repeat?"repOn":"repOff"))}
    return}
  const p=e.target.closest("[data-play]");
  if(p){startPlay(p.dataset.play);if(cur)go("player");return}
  const g=e.target.closest("[data-go]");if(g){go(g.dataset.go);return}
  const tb=e.target.closest("[data-tab]");if(tb){go(tb.dataset.tab,true);return}
  if(e.target.closest("[data-back]")){back();return}
});
$("#favBtn").addEventListener("click",()=>{
  if(!cur){toast(t("noRec"));return}
  const i=S.favs.findIndex(x=>x&&x.k===cur.k);
  if(i>=0)S.favs.splice(i,1);else S.favs.unshift(cur);
  save();updatePlayer();renderFavs();
});
$$("[data-ptab]").forEach(b=>b.addEventListener("click",()=>{
  $$("[data-ptab]").forEach(x=>x.classList.toggle("on",x===b));
  $("#ptInfo").hidden=b.dataset.ptab!=="info";$("#ptText").hidden=b.dataset.ptab!=="text";
}));

/* tapping the Now Playing card opens where the recitation comes from, scrolled to it */
function openSource(tr){
  if(!tr){go("player");return}
  const scrollTo=sel=>{let n=0;const tick=()=>{const el=document.querySelector(sel);if(el){const r=el.closest(".row,.s")||el;r.scrollIntoView({block:"center"});r.classList.add("flash");setTimeout(()=>r.classList.remove("flash"),1600)}else if(++n<25)setTimeout(tick,120)};setTimeout(tick,80)};
  if(tr.kh){S.kid=tr.kh;save();go("khatma");scrollTo("#kList .row.playing");return}
  /* a library recording: its place (country → place), scrolled to it */
  const ll=libLocOf(tr);
  if(ll){
    S.libC=ll.c.id;S.libL=ll.l.id;S.libF={};save();$("#lq").value="";
    if(location.hash==="#loc")renderLoc();go("loc");
    const r=ll.l.refs.find(([ai,si,ii])=>{const it=AREAS[ai].secs[si].items[ii];return "eg:"+it[0]+":"+it[1]===tr.k});
    if(r)scrollTo(`#locList [data-play="eg:${r[0]}:${r[1]}:${r[2]}"]`);return;
  }
  if(!tr.eg&&tr.n){go("surahs");scrollTo(`#slist [data-play="surah:${tr.n}"]`);return}
  go("player");
}
$("#npSrc").addEventListener("click",()=>{if(cur)openSource(cur)});
$("#npSrc").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&cur){e.preventDefault();openSource(cur)}});
