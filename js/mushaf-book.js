/* Mushaf as an open book: on a tablet-sized screen in landscape, two pages side by side like a printed Mushaf.
   Odd page on the right, the following even page on the left (spread 1 = pages 1–2, spread 2 = pages 3–4 …).
   Phones (portrait or landscape), tablets in portrait and narrow windows keep the scrolling reader in mushaf.js.
   Everything is reused: page data and fonts (qPageData, qFont), line drawing (qLinesHTML), the verse sheet,
   bookmarks, ayah audio and the saved reading position (S.mPage). */

/* chosen by the shape of the screen only — never by device name or operating system */
const BOOK_MQ=matchMedia("(orientation: landscape) and (min-width: 880px) and (min-height: 560px) and (min-aspect-ratio: 23/20)");
const bookFits=()=>BOOK_MQ.matches;
const bookActive=()=>bookFits()&&S.mMode!=="tr";
const spreadOf=n=>{n=Math.min(604,Math.max(1,n|0||1));return n%2?n:n-1};   // right-hand (odd) page of the spread
let bkRight=0,bkShown=0,bkRef=0,bkSu=1,bkGen=0,bkLastView="",bkLang="";

Object.assign(I18N.en,{bPages:"Pages {a}–{b}",bNext:"Next",bPrev:"Previous",bNextL:"Next pages",bPrevL:"Previous pages"});
Object.assign(I18N.ar,{bPages:"الصفحتان {a}–{b}",bNext:"التالي",bPrev:"السابق",bNextL:"الصفحتان التاليتان",bPrevL:"الصفحتان السابقتان"});
Object.assign(I18N.fr,{bPages:"Pages {a}–{b}",bNext:"Suivant",bPrev:"Précédent",bNextL:"Pages suivantes",bPrevL:"Pages précédentes"});
Object.assign(I18N.de,{bPages:"Seiten {a}–{b}",bNext:"Weiter",bPrev:"Zurück",bNextL:"Nächste Seiten",bPrevL:"Vorherige Seiten"});
Object.assign(I18N.tr,{bPages:"Sayfa {a}–{b}",bNext:"Sonraki",bPrev:"Önceki",bNextL:"Sonraki sayfalar",bPrevL:"Önceki sayfalar"});

/* which reader is visible */
function mView(){
  const tr=S.mMode==="tr",bk=bookFits()&&!tr;
  $("#mScroll").hidden=tr||bk;$("#mBook").hidden=!bk;$("#mTr").hidden=!tr;
  document.body.classList.toggle("mbook-on",bookFits());
}

/* page data + fonts for one page */
async function bookLoad(n){
  if(n<1||n>604)return null;
  const d=await qPageData(n);
  const fonts=new Set();d.lines.forEach(l=>l.words.forEach(w=>fonts.add(w.font)));
  await Promise.all([...fonts].map(qFont));
  return d;
}
function bookPageHTML(n,d){
  const su=(d.surahs&&d.surahs[0]&&d.surahs[0].id)||surahAt(n);
  return `<div class="ph"><span>${isAr()?"سورة "+SURAHS[su-1][0]:SURAHS[su-1][1]}</span><span>${fmtN("juzN",{n:juzOf(n)})}</span></div>`+
    `<div class="blines">${qLinesHTML(d.lines)}</div><div class="pf">${numFmt(n)}</div>`;
}
const lineW=l=>{let s=0;for(const c of l.children)s+=c.getBoundingClientRect().width;return s};
const widest=el=>{let m=0;el.querySelectorAll(".ql:not(.qc)").forEach(l=>{const w=lineW(l);if(w>m)m=w});return m};

/* the widest line of a full page at 20px: the same for every full page, so every spread is the same size */
async function bookMeasureRef(){
  if(bkRef)return bkRef;
  const full=[$("#bRight"),$("#bLeft")].find(e=>e&&e.dataset.p&&!e.classList.contains("short")&&e.querySelector(".ql"));
  if(full){full.style.setProperty("--qfs","20px");bkRef=widest(full);full.style.removeProperty("--qfs");if(bkRef)return bkRef}
  const d=await bookLoad(3);const tmp=document.createElement("div");
  tmp.className="bpage bmeasure";tmp.innerHTML=bookPageHTML(3,d);tmp.style.setProperty("--qfs","20px");
  $("#bStage").appendChild(tmp);bkRef=widest(tmp);tmp.remove();
  return bkRef;
}

/* size both pages together so the spread fills the screen without stretching the text */
async function bookFit(){
  const st=$("#bStage"),sp=$("#bSpread");if(!st||$("#mBook").hidden)return;
  const ref=await bookMeasureRef();if(!ref)return;
  const W=st.clientWidth,H=st.clientHeight;if(!W||!H)return;
  const cs=getComputedStyle(sp);const spine=parseFloat(cs.getPropertyValue("--spine"))||28;
  const padX=Math.max(14,Math.round(W*.018)),padY=10;              // page margins
  const ph=$("#bRight .ph"),pf=$("#bRight .pf");
  const headFoot=(ph?ph.offsetHeight:22)+(pf?pf.offsetHeight+2:28)+4;  // page header + page number rows, as drawn
  const fsW=((W-spine)/2-padX*2)*.985*20/ref;                      // text as wide as the page allows
  const fsH=(H-padY*2-headFoot)/(15*1.75);                          // 15 lines as tall as the screen allows
  const fs=Math.max(12,Math.min(fsW,fsH));
  const inner=ref*fs/20/.985;
  /* a few pages have slightly wider lines than the sample page: their text is set a touch smaller, the page stays the same size */
  sp.style.setProperty("--qfs","20px");
  const own=Math.max(...[$("#bRight"),$("#bLeft")].filter(e=>!e.classList.contains("short")).map(widest),0);
  const fsText=own?Math.min(fs,inner*.985*20/own):fs;
  sp.style.setProperty("--qfs",fsText.toFixed(2)+"px");
  sp.style.setProperty("--bw",Math.round(inner+padX*2)+"px");
  sp.style.setProperty("--bpx",padX+"px");
  sp.style.setProperty("--blh",(fs*1.75*15).toFixed(1)+"px");
  sp.style.setProperty("--qlh",(fs*1.75).toFixed(2)+"px");
  /* pages 1 and 2 have 8 short lines, set a little larger in the middle of the page, as printed */
  [$("#bRight"),$("#bLeft")].forEach(el=>{
    el.style.removeProperty("--qfs");el.style.removeProperty("--qlh");
    if(!el.classList.contains("short"))return;
    el.style.setProperty("--qfs","20px");const m=widest(el);
    el.style.setProperty("--qfs",Math.min(fs*1.25,m?inner*.86*20/m:fs).toFixed(2)+"px");
    el.style.setProperty("--qlh",(Math.min(fs*1.25,m?inner*.86*20/m:fs)*1.75).toFixed(2)+"px");
  });
}

/* show the spread that contains page n */
async function bookGo(n,key,dir){
  const r=spreadOf(n),gen=++bkGen;
  bkRight=r;mCur=r;S.mPage=r;save();
  mView();
  let dr,dl;
  try{[dr,dl]=await Promise.all([bookLoad(r),bookLoad(r+1)])}
  catch(e){if(gen!==bkGen)return;$("#bRight").innerHTML=`<div class="pl">${t("mOffline")}</div>`;$("#bLeft").innerHTML="";$("#bRight").dataset.p="";bkShown=0;bookLabels();return}
  if(gen!==bkGen)return;
  /* both pages change in the same frame, so they never show different spreads */
  const R=$("#bRight"),L=$("#bLeft");
  R.innerHTML=bookPageHTML(r,dr);R.dataset.p=r;R.classList.toggle("short",dr.lines.length<15);
  if(dl){L.innerHTML=bookPageHTML(r+1,dl);L.dataset.p=r+1;L.classList.toggle("short",dl.lines.length<15);L.classList.remove("blank")}
  else{L.innerHTML="";L.dataset.p="";L.classList.add("blank")}
  bkSu=(dr.surahs&&dr.surahs[0]&&dr.surahs[0].id)||surahAt(r);
  /* keep the phone reader's surah in step; its page list is rebuilt the next time it is shown */
  if(mSu!==bkSu){mSu=bkSu;S.mSu=bkSu;pgList=[];pgMap={};save()}
  bkShown=r;bkLang=S.lang||"en";
  await bookFit();
  markAll($("#mBook"));
  if(dir){const s=$("#bSpread");s.classList.remove("turn-next","turn-prev");void s.offsetWidth;s.classList.add(dir>0?"turn-next":"turn-prev")}
  bookLabels();
  if(key){selectVerse(key)}
  /* the next and previous spreads load quietly in the background, so turning is instant */
  [r+2,r+3,r-2,r-1].forEach(p=>{if(p>=1&&p<=604)bookLoad(p).catch(()=>{})});
}
function bookStep(d){
  const r=(bkRight||spreadOf(S.mPage))+d*2;
  if(r<1||r>604){const s=$("#bSpread");s.classList.remove("bump");void s.offsetWidth;s.classList.add("bump");return}
  bookGo(r,null,d);
}
function bookLabels(){
  if(!bookActive())return;
  /* page headers and numbers are in the interface language: redraw them after a language change */
  if(bkShown&&bkLang!==(S.lang||"en")){bkLang=S.lang||"en";bookGo(bkShown);return}
  $$("[data-mmode]").forEach(b=>{b.textContent=t(b.dataset.mmode==="read"?"mRead":"mTrans");b.classList.toggle("on",b.dataset.mmode==="read")});
  const r=bkRight||1,l=Math.min(604,r+1);
  $("#mTitle").textContent=(isAr()?"سورة ":"")+sName(bkSu);
  $("#mSub").textContent=fmtN("juzN",{n:juzOf(r)})+" · "+fmtN("bPages",{a:r,b:l});
  $("#bPos").textContent=numFmt(r)+" – "+numFmt(l)+" / "+numFmt(604);
  $("#bNextTx").textContent=t("bNext");$("#bPrevTx").textContent=t("bPrev");
  $("#bNext").setAttribute("aria-label",t("bNextL"));$("#bPrev").setAttribute("aria-label",t("bPrevL"));
  $("#bNext").disabled=r>=603;$("#bPrev").disabled=r<=1;
}

/* ---- the existing reader functions learn about the book; on phones they behave exactly as before ---- */
const _goPageB=goPage;
goPage=async function(n,key,su){if(bookActive())return bookGo(n,key);return _goPageB(n,key,su)};
const _mLabelsB=mLabels;
mLabels=function(){_mLabelsB();if(bookActive())bookLabels()};
const _setModeB=setMode;
setMode=function(m){
  if(m==="read"&&bookFits()){
    /* back from Translation: the pages you were on, or the start of the surah you moved to in Translation */
    const p=S.mPage||1,su=S.trSu;S.mMode="read";save();mView();
    bookGo(su&&su!==mSu?SURAH_PAGE[su-1]:p);return;
  }
  _setModeB(m);mView();if(bookActive())bookLabels();
};
const _followVerseB=followVerse;
followVerse=async function(key){
  if(!bookActive())return _followVerseB(key);
  if(!$("#mBook").querySelector(`.w[data-v="${key}"]`))await bookGo(await versePage(key));
  markAll($("#mBook"));
};
const _mOpenB=mOpen;
mOpen=function(){
  if(bookActive()&&!mPendingKey){
    mView();
    if(!bkShown||bkShown!==spreadOf(S.mPage||1))bookGo(S.mPage||1);else{bookFit();bookLabels()}
    bkLastView="book";return;
  }
  if(bkLastView==="book"&&S.mMode!=="tr"&&!mPendingKey){bkLastView="scroll";mView();_goPageB(S.mPage||mCur||1);return}
  _mOpenB();mView();bkLastView=bookActive()?"book":"scroll";
};

/* turning the device: switch reader on the spot, keeping the place */
function bookSwitch(){
  mView();
  if(!$("#mushaf").classList.contains("on"))return;
  if(S.mMode==="tr"){mLabels();return}
  const p=S.mPage||mCur||1;
  if(bookFits()){bkLastView="book";bookGo(p)}
  else{bkLastView="scroll";_goPageB(p)}
}
try{BOOK_MQ.addEventListener("change",bookSwitch)}catch(e){try{BOOK_MQ.addListener(bookSwitch)}catch(e2){}}
window.addEventListener("resize",()=>{clearTimeout(bookFit._t);bookFit._t=setTimeout(()=>{if(bookActive()&&$("#mushaf").classList.contains("on"))bookFit()},120)});

/* controls: buttons, swipes, keyboard, tapping a verse */
$("#bNext").addEventListener("click",()=>bookStep(1));
$("#bPrev").addEventListener("click",()=>bookStep(-1));
(function(){
  const st=$("#bStage");let x0=0,y0=0,t0=0,on=false,swiped=0;
  st.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;on=true;x0=e.clientX;y0=e.clientY;t0=Date.now()},{passive:true});
  st.addEventListener("pointerup",e=>{
    if(!on)return;on=false;
    const dx=e.clientX-x0,dy=e.clientY-y0;
    if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.4&&Date.now()-t0<900){
      swiped=Date.now();
      /* as in a printed Mushaf, the next page comes from the left: swipe to the right for the next pages */
      bookStep(dx>0?1:-1);
    }
  },{passive:true});
  st.addEventListener("pointercancel",()=>{on=false},{passive:true});
  st.addEventListener("click",e=>{
    if(Date.now()-swiped<400)return;                         // the end of a swipe is not a tap
    const w=e.target.closest(".w[data-v]");if(w)openVerse(w.dataset.v);
  });
})();
document.addEventListener("keydown",e=>{
  if(!bookActive()||!$("#mushaf").classList.contains("on")||$("#sheet").classList.contains("on"))return;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||""))return;
  if(e.key==="ArrowLeft"||e.key==="PageDown"){e.preventDefault();bookStep(1)}
  else if(e.key==="ArrowRight"||e.key==="PageUp"){e.preventDefault();bookStep(-1)}
});
mView();
