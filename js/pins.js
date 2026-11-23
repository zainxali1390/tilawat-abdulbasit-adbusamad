/* Pinned moments: save a moment in a recitation ("5:56"), jump back to it later.
   Saved in S.pins = { trackKey: { tr: track, m: [seconds, ...] } } with the other settings. */
if(!S.pins||typeof S.pins!=="object"||Array.isArray(S.pins))S.pins={};
if(!P.pin)P.pin='<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 14v7"/>';

Object.assign(I18N.en,{pin:"Pin",pinThis:"Pin this moment",pinned:"Pinned at {t}",pinExists:"Already pinned at {t}",pinDel:"Pin removed",pinsTitle:"Pinned moments",pinsEnd:"Your pinned moments are kept in Favourites",pinGo:"Play from {t}",pinWait:"Start the recitation first"});
Object.assign(I18N.ar,{pin:"تثبيت",pinThis:"ثبّت هذه اللحظة",pinned:"تم التثبيت عند {t}",pinExists:"مثبّت مسبقًا عند {t}",pinDel:"تمت إزالة التثبيت",pinsTitle:"اللحظات المثبّتة",pinsEnd:"لحظاتك المثبّتة محفوظة في المفضلة",pinGo:"شغّل من {t}",pinWait:"شغّل التلاوة أولًا"});
Object.assign(I18N.fr,{pin:"Épingler",pinThis:"Épingler ce moment",pinned:"Épinglé à {t}",pinExists:"Déjà épinglé à {t}",pinDel:"Épingle supprimée",pinsTitle:"Moments épinglés",pinsEnd:"Vos moments épinglés sont dans les Favoris",pinGo:"Lire depuis {t}",pinWait:"Lancez d'abord la récitation"});
Object.assign(I18N.de,{pin:"Merken",pinThis:"Diese Stelle merken",pinned:"Gemerkt bei {t}",pinExists:"Schon gemerkt bei {t}",pinDel:"Markierung entfernt",pinsTitle:"Gemerkte Stellen",pinsEnd:"Deine gemerkten Stellen findest du in den Favoriten",pinGo:"Ab {t} abspielen",pinWait:"Starte zuerst die Rezitation"});
Object.assign(I18N.tr,{pin:"İşaretle",pinThis:"Bu anı işaretle",pinned:"{t} işaretlendi",pinExists:"{t} zaten işaretli",pinDel:"İşaret kaldırıldı",pinsTitle:"İşaretli anlar",pinsEnd:"İşaretli anların Favoriler'de",pinGo:"{t} itibarıyla çal",pinWait:"Önce kıraati başlat"});
const pinT=(k,v)=>t(k).replace("{t}",v);

const pinsOf=k=>((S.pins[k]&&S.pins[k].m)||[]).slice().sort((a,b)=>a-b);
function addPin(){
  if(!cur||!isFinite(au.duration)||!au.duration){toast(t("pinWait"));return}
  const at=Math.floor(au.currentTime||0),m=pinsOf(cur.k);
  const near=m.find(x=>Math.abs(x-at)<=3);
  if(near!=null){toast(pinT("pinExists",fmt(near)));return}
  S.pins[cur.k]={tr:cur,m:m.concat(at).sort((a,b)=>a-b)};save();
  renderPins(true);toast(pinT("pinned",fmt(at)));
  if(navigator.vibrate)try{navigator.vibrate(12)}catch(e){}
}
function delPin(k,at){
  const e=S.pins[k];if(!e)return;
  e.m=e.m.filter(x=>x!==at);if(!e.m.length)delete S.pins[k];
  save();renderPins(true);renderPinList();toast(t("pinDel"));
}
function goPin(k,at){
  if(cur&&cur.k===k){au.currentTime=at;au.play().catch(()=>{});return}
  const e=S.pins[k];if(!e)return;
  playTrack(e.tr,{at});
}
const chipHTML=(k,at,near)=>`<span class="pchip${near?" near":""}"><button class="pgo" data-pgo="${at}" data-pk="${encodeURIComponent(k)}" aria-label="${pinT("pinGo",fmt(at))}">${ic("play")}${fmt(at)}</button><button class="px" data-pdel="${at}" data-pk="${encodeURIComponent(k)}" aria-label="${t("pinDel")}">${ic("x")}</button></span>`;
/* the row under each seek bar, and the ticks on the bar */
let _pinSig="";
function renderPins(force){
  const has=!!cur&&!cur.yt,m=has?pinsOf(cur.k):[],c=au.currentTime||0,d=au.duration;
  /* only redraw when something changed, so a finger on a pin is never interrupted */
  const sig=[has&&cur.k,m.join(","),m.map(at=>Math.abs(c-at)<2?1:0).join(""),isFinite(d)?Math.round(d):0,S.lang,document.documentElement.dir].join("|");
  if(sig===_pinSig&&force!==true)return;_pinSig=sig;
  ["np","pl"].forEach(id=>{
    const row=$("#"+id+"Pins");if(!row)return;
    row.hidden=!has;if(!has){$("#"+id+"Marks").innerHTML="";return}
    row.innerHTML=`<button class="pinbtn" data-pinadd aria-label="${t("pinThis")}">${ic("pin")}${t("pin")}</button>`+m.map(at=>chipHTML(cur.k,at,Math.abs(c-at)<2)).join("");
    const side=document.documentElement.dir==="rtl"?"right":"left";
    $("#"+id+"Marks").innerHTML=isFinite(d)&&d>0?m.map(at=>`<i style="${side}:${Math.min(100,at/d*100)}%"></i>`).join(""):"";
  });
}
/* all pinned moments, in Favourites */
function renderPinList(){
  const box=$("#pinList");if(!box)return;
  const q=norm($("#fq").value||"");
  const rows=Object.entries(S.pins).filter(([k,e])=>e&&e.tr&&validTr(e.tr)&&e.m&&e.m.length&&(!q||norm(trTitle(e.tr)+trSub(e.tr)).includes(q)));
  box.innerHTML=rows.length?`<div class="pinsec"><h5>${t("pinsTitle")}</h5><div class="card">${rows.map(([k,e])=>
    `<div class="pinrec${cur&&cur.k===k?" playing":""}"><div class="tx"><b>${trTitle(e.tr)}</b><small>${trSub(e.tr)}</small></div><div class="pins">${pinsOf(k).map(at=>chipHTML(k,at,false)).join("")}</div></div>`).join("")}</div></div>`:"";
}
document.addEventListener("click",e=>{
  if(e.target.closest("[data-pinadd]")){addPin();return}
  const g=e.target.closest("[data-pgo]");if(g){goPin(decodeURIComponent(g.dataset.pk),+g.dataset.pgo);return}
  const x=e.target.closest("[data-pdel]");if(x){delPin(decodeURIComponent(x.dataset.pk),+x.dataset.pdel)}
});
/* keep pins in step with the player */
const _updatePlayerP=updatePlayer;updatePlayer=function(){_updatePlayerP();renderPins(true)};
const _renderFavsP=renderFavs;renderFavs=function(){_renderFavsP();renderPinList()};
au.addEventListener("loadedmetadata",renderPins);
let _pinTick=0;au.addEventListener("timeupdate",()=>{const n=Date.now();if(n-_pinTick>1000){_pinTick=n;if(cur&&pinsOf(cur.k).length)renderPins()}});
au.addEventListener("ended",()=>{if(cur&&pinsOf(cur.k).length)setTimeout(()=>toast(t("pinsEnd")),2400)});
$("#fq").addEventListener("input",renderPinList);
const _renderAllP=renderAll;renderAll=function(){_renderAllP();renderPins(true)};
