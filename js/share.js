/* Sharing: the app link, a recitation (optionally from a moment), and opening shared links */
/* ===== Sharing the app ===== */
/* the app's own address, from where it is served: GitHub Pages sub-folder, custom domain or local */
const APP_URL=new URL(".",location.href).href;
async function shareApp(){
  const data={title:"Tilawat Abdul Basit",text:t("shareText"),url:APP_URL};
  if(navigator.share){try{await navigator.share(data);return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(APP_URL);toast(t("linkCopied"))}catch(e){toast(APP_URL)}
}
document.addEventListener("click",e=>{if(e.target.closest("[data-share]"))shareApp()});

/* ===== Sharing a recitation (optionally from a moment) and opening shared links ===== */
const fill2=(k,o)=>t(k).replace(/\{(\w)\}/g,(_,x)=>o[x]);
const b64e=x=>btoa(unescape(encodeURIComponent(x))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const b64d=x=>decodeURIComponent(escape(atob(x.replace(/-/g,"+").replace(/_/g,"/"))));
function trCode(tr){
  if(!tr.eg&&tr.rec&&tr.n)return "s:"+tr.rec+":"+tr.n;
  if(tr.eg&&tr.k&&tr.k.startsWith("eg:")){const m=tr.k.match(/^eg:([^:]+):(.*)$/);if(m)return "e:"+m[1]+":"+m[2]}
  return "j:"+JSON.stringify(tr);
}
function trFromCode(code){
  if(code.startsWith("s:")){const [,rec,n]=code.split(":");const r=RECITATIONS.find(x=>x.id===rec)||RECITATIONS[0];return r&&r.surahs[+n]?surahTrack(r,+n):null}
  if(code.startsWith("e:")){const m=code.match(/^e:([^:]+):(.*)$/);if(!m)return null;
    const look=(key,file)=>{for(let ai=0;ai<AREAS.length;ai++)for(let si=0;si<AREAS[ai].secs.length;si++){const ii=AREAS[ai].secs[si].items.findIndex(it=>it[0]===key&&it[1]===file);if(ii>=0)return egTrack(ai,si,ii)}return null};
    const hit=look(m[1],m[2]);if(hit)return hit;
    /* a duplicate that was removed: open the copy that was kept */
    const al=typeof AREA_ALIASES!=="undefined"&&AREA_ALIASES[m[1]+":"+m[2]];
    if(al){const i=al.indexOf(":");return look(al.slice(0,i),al.slice(i+1))}
    return null}
  if(code.startsWith("j:")){try{const x=JSON.parse(code.slice(2));return validTr(x)?x:null}catch(e){return null}}
  return null;
}
/* favourites, recent and the last recording saved before an entry was merged into another copy or had its audio
   replaced (data/aliases.js) now open the entry that is kept */
(function migrateAliases(){
  if(typeof AREA_ALIASES==="undefined")return;
  const fix=tr=>{if(!tr||!tr.eg||!tr.k)return tr;const m=tr.k.match(/^eg:([^:]+):(.*)$/);if(!m||!AREA_ALIASES[m[1]+":"+m[2]])return tr;return trFromCode("e:"+m[1]+":"+m[2])||tr};
  let changed=false;const ch=(a,b)=>{if(a!==b)changed=true;return b};
  if(Array.isArray(S.favs))S.favs=S.favs.map(x=>ch(x,fix(x)));
  if(Array.isArray(S.recent))S.recent=S.recent.map(x=>ch(x,fix(x)));
  if(S.last&&S.last.tr)S.last.tr=ch(S.last.tr,fix(S.last.tr));else if(S.last&&S.last.k)S.last=ch(S.last,fix(S.last));
  /* pins are left as they are: their times belong to the old audio */
  if(changed)save();
})();
function shareLink(tr,at){return APP_URL+"?r="+b64e(trCode(tr))+(at?"&t="+Math.floor(at):"")}
async function shareRecitation(at){
  if(!cur){toast(t("noRec"));return}
  closeSheet();
  const name=trTitle(cur)+" · "+trSub(cur).replace(/^Abdul Basit Abdul Samad · ?/,"");
  const text=fill2("listenTo",{r:name})+(at?" ("+fill2("fromT",{t:fmt(at)})+")":"");
  const url=shareLink(cur,at);
  if(navigator.share){try{await navigator.share({title:trTitle(cur),text,url});return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(text+"\n"+url);toast(t("linkCopied"))}catch(e){toast(url)}
}
$("#plShare").addEventListener("click",()=>{
  if(!cur){toast(t("noRec"));return}
  const at=Math.floor(au.currentTime||0);
  sheetMode="share";$("#sheetTitle").textContent=t("shareTitle2");
  $("#sheetBody").innerHTML=`<div class="card list">
    <button class="li" data-shr="0">${ic("share")}<span class="tx">${t("shareRec")}<small class="subline">${t("shareRecSub")}</small></span></button>
    ${at>5?`<button class="li" data-shr="${at}">${ic("play")}<span class="tx">${fill2("shareFrom",{t:fmt(at)})}<small class="subline">${t("shareFromSub")}</small></span></button>`:""}
  </div>`;
  $("#scrim").classList.add("on");$("#sheet").classList.add("on");
});
$("#npShare").addEventListener("click",()=>$("#plShare").click());
$("#sheetBody").addEventListener("click",e=>{const b=e.target.closest("[data-shr]");if(b){e.stopPropagation();shareRecitation(+b.dataset.shr||0)}},true);
/* open a shared link, or bring back the last recitation where it was left */
(function(){
  let q;try{q=new URLSearchParams(location.search)}catch(e){return}
  const code=q.get("r");
  if(code){
    let tr=null;try{tr=trFromCode(b64d(code))}catch(e){}
    try{history.replaceState(null,"",location.pathname+"#player")}catch(e){}
    if(tr){playTrack(tr,{at:+(q.get("t")||0)||0,shared:true,quiet:true});setTimeout(()=>{if(S.lang)go("player",true)},2100);return}
    setTimeout(()=>toast(t("linkNotFound")),2200);
  }
  if(S.last&&validTr(S.last)&&!cur){playTrack(S.last,{noplay:true,quiet:true})}
})();
