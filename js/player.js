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
  if(opt.at!=null)pendingSeek=opt.at;
  else if(saved>15){pendingSeek=Math.max(0,saved-3);if(!opt.quiet)toast(fill2("resumeFrom",{t:fmt(saved)}))}
  else pendingSeek=null;
  au.preload=opt.noplay?"none":"auto";
  au.src=resolveUrl(tr.url);
  if(!opt.noplay)au.play().catch(()=>{if(opt.shared)toast(t("tapToPlay"))});
  S.recent=[tr,...S.recent.filter(x=>x&&x.k!==tr.k)].slice(0,20);save();
  updatePlayer();renderRecent();
  if($("#area").classList.contains("on"))renderArea();if($("#collections").classList.contains("on")&&$("#cq").value)renderCollections();
  if("mediaSession" in navigator){
    try{navigator.mediaSession.metadata=new MediaMetadata({title:trTitle(tr),artist:"Abdul Basit Abdul Samad",album:trSub(tr)});
      navigator.mediaSession.setActionHandler("previoustrack",()=>step(-1));
      navigator.mediaSession.setActionHandler("nexttrack",()=>step(1));
      navigator.mediaSession.setActionHandler("play",()=>au.play());
      navigator.mediaSession.setActionHandler("pause",()=>au.pause());}catch(e){}
    /* lock-screen seek bar and ±10 s buttons (not every phone offers these) */
    const ms=(n,f)=>{try{navigator.mediaSession.setActionHandler(n,f)}catch(e){}};
    ms("seekto",d=>{if(isFinite(au.duration)&&d&&d.seekTime!=null){au.currentTime=Math.min(Math.max(d.seekTime,0),au.duration);mediaPos()}});
    ms("seekbackward",d=>{au.currentTime=Math.max(0,au.currentTime-((d&&d.seekOffset)||10));mediaPos()});
    ms("seekforward",d=>{if(isFinite(au.duration))au.currentTime=Math.min(au.duration,au.currentTime+((d&&d.seekOffset)||10));mediaPos()});
  }
}
function step(d){
  if(!cur){toast(t("noRec"));return}
  if(!Q.list.length){Q={list:[cur],i:0}}
  /* "previous" part-way through a recitation goes back to its start, like other players */
  if(d<0&&au.currentTime>5){au.currentTime=0;if(au.paused)updateTime();return}
  let i;
  if(S.shuffle){i=Math.floor(Math.random()*Q.list.length);if(Q.list.length>1&&i===Q.i)i=(i+1+Math.floor(Math.random()*(Q.list.length-1)))%Q.list.length}
  else{i=Q.i+d;if(i<0||i>=Q.list.length)return}
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
  $$("[data-act=shuffle]").forEach(b=>b.classList.toggle("act",S.shuffle));
  $$("[data-act=repeat]").forEach(b=>b.classList.toggle("act",S.repeat));
  updatePP();
}
function updatePP(){const p=!au.paused&&!!cur;$$("[data-ppic]").forEach(s=>s.innerHTML=P[p?"pause":"play"])}
function updateTime(){
  const d=au.duration||0,c=au.currentTime||0,v=d?Math.round(c/d*1000):0;
  ["np","pl"].forEach(k=>{const s=$("#"+k+"Seek");if(!s._drag){s.value=v;s.style.setProperty("--p",v/10+"%")}$("#"+k+"Cur").textContent=fmt(c);$("#"+k+"Dur").textContent=fmt(d)});
}
["npSeek","plSeek"].forEach(id=>{const s=$("#"+id);
  s.addEventListener("input",()=>{s._drag=true;s.style.setProperty("--p",s.value/10+"%");const d=au.duration;if(cur&&d&&isFinite(d)){const k=id.slice(0,2);$("#"+k+"Cur").textContent=fmt(s.value/1000*d);const o=$("#"+(k==="np"?"pl":"np")+"Seek");o.value=s.value;o.style.setProperty("--p",s.value/10+"%")}});
  ["pointerup","pointercancel","touchend"].forEach(n=>s.addEventListener(n,()=>setTimeout(()=>{if(s._drag){s._drag=false;updateTime()}},400)));
  s.addEventListener("change",()=>{s._drag=false;if(cur&&au.duration)au.currentTime=s.value/1000*au.duration;else{s.value=0;s.style.setProperty("--p","0%")}});
});
au.addEventListener("timeupdate",updateTime);au.addEventListener("loadedmetadata",updateTime);
function mediaPos(){try{if("mediaSession" in navigator&&navigator.mediaSession.setPositionState&&isFinite(au.duration)&&au.duration>0)navigator.mediaSession.setPositionState({duration:au.duration,playbackRate:au.playbackRate||1,position:Math.min(au.currentTime||0,au.duration)})}catch(e){}}
["loadedmetadata","seeked","play","pause"].forEach(n=>au.addEventListener(n,mediaPos));
au.addEventListener("loadedmetadata",()=>{if(pendingSeek==null)return;const t2=pendingSeek;pendingSeek=null;if(!isFinite(au.duration)||t2<au.duration-5)try{au.currentTime=t2}catch(e){}});
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
au.addEventListener("ended",()=>{kMarkDone(cur);if(S.repeat){au.currentTime=0;au.play()}else if(S.autoNext)step(1);else updatePP()});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&!S.bg&&!au.paused)au.pause()});

document.addEventListener("click",e=>{
  const a=e.target.closest("[data-act]");
  if(a){const k=a.dataset.act;
    if(k==="toggle"){if(!cur){toast(t("noRec"));return}au.paused?au.play().catch(()=>{}):au.pause()}
    else if(k==="prev")step(-1);else if(k==="next")step(1);
    else if(k==="shuffle"){S.shuffle=!S.shuffle;save();updatePlayer()}
    else if(k==="repeat"){S.repeat=!S.repeat;save();updatePlayer()}
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
  if(tr.eg&&tr.k&&tr.k.startsWith("eg:")){
    const m=tr.k.match(/^eg:([^:]+):(.*)$/);
    for(let ai=0;ai<AREAS.length;ai++)for(let si=0;si<AREAS[ai].secs.length;si++){
      const ii=AREAS[ai].secs[si].items.findIndex(it=>it[0]===m[1]&&it[1]===m[2]);
      if(ii<0)continue;
      S.area=ai;S.colMode=isRadioSec(AREAS[ai],AREAS[ai].secs[si])?"radio":"live";save();
      $("#eq").value="";egOpen.clear();egOpen.add(ai+":"+si);
      if(location.hash==="#area")renderArea();go("area");
      scrollTo(`#eglist [data-play="eg:${ai}:${si}:${ii}"]`);return;
    }
  }
  if(!tr.eg&&tr.n){go("surahs");scrollTo(`#slist [data-play="surah:${tr.n}"]`);return}
  go("player");
}
$("#npSrc").addEventListener("click",()=>{if(cur)openSource(cur)});
$("#npSrc").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&cur){e.preventDefault();openSource(cur)}});
