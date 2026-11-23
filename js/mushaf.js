/* Mushaf reader: Madinah pages (QCF4), translation view, ayah selection, go-to sheet, ayah audio, shared ayah links */
if(typeof numFmt==="undefined")var numFmt=n=>isAr()?arNum(n):String(n);
/* ===== Mushaf reader =====
   Pages: King Fahd Complex Madinah Mushaf (QCF4 font, exact 15-line layout) from the quran-qcf4 package on jsDelivr.
   The font files are loaded from the package link, never copied into this site (their licence allows rendering only).
   Translation view: quran-json (Saheeh International / Hamidullah / Diyanet). Ayah audio: Abdul Basit, per ayah. */
const QCF="https://cdn.jsdelivr.net/npm/quran-qcf4@1.1.0/";
const QTR="https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/";
const fmtN=(k,o)=>t(k).replace(/\{(\w)\}/g,(_,x)=>numFmt(o[x]));
const juzOf=p=>{let j=1;JUZ_PAGE.forEach((s,i)=>{if(s<=p)j=i+1});return j};
const surahAt=p=>{let s=1;SURAH_PAGE.forEach((x,i)=>{if(x<=p)s=i+1});return s};
const sName=n=>isAr()?SURAHS[n-1][0]:SURAHS[n-1][1];
/* fonts and page data, loaded on demand and kept */
const qFonts={},qPages={},qTr={};
function qFont(name){
  if(!qFonts[name]){const file=name==="QCF4_QBSML"?name:name+"_W";
    qFonts[name]=new FontFace(name,`url(${QCF}fonts-woff2/${file}.woff2) format("woff2")`,{display:"block"}).load().then(f=>{document.fonts.add(f);return f}).catch(e=>{delete qFonts[name];throw e})}
  return qFonts[name];
}
function qPageData(n){
  if(!qPages[n])qPages[n]=fetch(QCF+"pages/"+String(n).padStart(3,"0")+".json").then(r=>{if(!r.ok)throw new Error("http");return r.json()}).catch(e=>{delete qPages[n];throw e});
  return qPages[n];
}
function trData(su){
  const lang=["fr","tr"].includes(S.lang)?S.lang:"en",k=lang+su;
  if(!qTr[k])qTr[k]=fetch(QTR+lang+"/"+su+".json").then(r=>{if(!r.ok)throw new Error("http");return r.json()}).catch(e=>{delete qTr[k];throw e});
  return qTr[k];
}
const pageHas=(d,key)=>d.lines.some(l=>l.words.some(w=>w.verse_key===key));
async function versePage(key){
  const [s,a]=key.split(":").map(Number);
  const p0=SURAH_PAGE[s-1],p1=s<114?SURAH_PAGE[s]:604;
  let g=Math.round(p0+(a-1)/SURAHS[s-1][2]*(p1-p0));
  for(let d=0;d<30;d++)for(const p of d?[g+d,g-d]:[g]){if(p<1||p>604)continue;try{if(pageHas(await qPageData(p),key))return p}catch(e){return g}}
  return g;
}
/* reading view: all 604 pages in one scroll; pages near the screen are drawn, far ones are released */
let mSu=0,mCur=1,mFs=0,mPgh=0,mIO=null,mScrollBound=false;let pgMap={},pgList=[];
const surahRange=su=>[SURAH_PAGE[su-1],su<114?SURAH_PAGE[su]:604];
function snavHTML(su){
  return `<div class="snav">${su>1?`<button data-sgo="${su-1}">${ic("prev")}<span><small>${t("prevS")}</small><b>${sName(su-1)}</b></span></button>`:"<span></span>"}${su<114?`<button data-sgo="${su+1}" class="nx"><span><small>${t("nextS")}</small><b>${sName(su+1)}</b></span>${ic("next")}</button>`:"<span></span>"}</div>`;
}
function mBuild(su){
  if(su===mSu&&pgList.length)return;
  mSu=su;S.mSu=su;mFs=0;
  const [a,b]=surahRange(su);pgList=[];pgMap={};
  let h="";for(let n=a;n<=b;n++){pgList.push(n);h+=`<div class="mpg" data-p="${n}"><div class="pl">${numFmt(n)}</div></div>`}
  const box=$("#mPages");box.innerHTML=h+snavHTML(su);box.querySelectorAll(".mpg").forEach(e=>pgMap[+e.dataset.p]=e);
  if(mIO)mIO.disconnect();
  mIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)drawPage(+e.target.dataset.p)}),{root:$("#mScroll"),rootMargin:"900px 0px"});
  Object.values(pgMap).forEach(e=>mIO.observe(e));
  if(!mScrollBound){mScrollBound=true;let ticking=false;
    $("#mScroll").addEventListener("scroll",()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;trackPage()})},{passive:true})}
}
async function drawPage(n){
  const el=pgMap[n];if(!el||el._drawn||el._busy)return;el._busy=true;const su=mSu;
  try{
    const d=await qPageData(n);
    if(su!==mSu||pgMap[n]!==el){el._busy=false;return}
    // only the lines of the surah being read
    const lines=d.lines.filter(l=>{const w=l.words[0];if(w.type==="surah_header"||w.type==="bismillah")return w.sura===su;const k=l.words.find(x=>x.verse_key);return k&&+k.verse_key.split(":")[0]===su});
    if(!lines.length){el.hidden=true;el._drawn=true;pgList=pgList.filter(x=>x!==n);el._busy=false;return}
    const fonts=new Set();lines.forEach(l=>l.words.forEach(w=>fonts.add(w.font)));
    await Promise.all([...fonts].map(qFont));
    let h=`<div class="ph"><span>${isAr()?"سورة "+SURAHS[su-1][0]:SURAHS[su-1][1]}</span><span>${fmtN("juzN",{n:juzOf(n)})}</span></div>`;
    h+=qLinesHTML(lines);
    h+=`<div class="pf">${numFmt(n)}</div>`;
    el.innerHTML=h;el.classList.toggle("short",n<=2);el.classList.toggle("part",lines.length<d.lines.length);el._drawn=true;
    fitPage(el);markAll(el);
  }catch(e){el.innerHTML=`<div class="pl">${t("mOffline")}</div>`}
  el._busy=false;
  pgList.forEach(x=>{const q=pgMap[x];if(q&&q._drawn&&!q.hidden&&Math.abs(x-mCur)>8&&Math.abs(x-n)>8){q.innerHTML=`<div class="pl">${numFmt(x)}</div>`;q._drawn=false}});
}
/* the lines of a page, in the Mushaf font (shared by the phone view and the tablet book view) */
function qLinesHTML(lines){
  let h="";
  for(const l of lines){
    const w0=l.words[0];
    if(w0.type==="surah_header"||w0.type==="bismillah"){h+=`<div class="ql qc ${w0.type==="surah_header"?"qh":"qb"}"><span style="font-family:${w0.font}">${w0.char}</span></div>`;continue}
    h+=`<div class="ql">`+l.words.map(w=>w.verse_key?`<span class="w${w.type==="end"?" qend":""}" data-v="${w.verse_key}" style="font-family:${w.font}">${w.char}</span>`:`<span style="font-family:${w.font}">${w.char}</span>`).join("")+`</div>`;
  }
  return h;
}
function fitPage(el){
  const W=el.clientWidth;if(!W)return;
  el.style.setProperty("--qfs","20px");
  let mx=0;el.querySelectorAll(".ql:not(.qc)").forEach(l=>{let s2=0;for(const c of l.children)s2+=c.getBoundingClientRect().width;if(s2>mx)mx=s2});
  const part=el.classList.contains("part"),short=el.classList.contains("short");
  let fs=mx?20*W*.985/mx:(mFs||24);
  if(short)fs=Math.min(fs,(mFs||W/17)*1.3);
  else if(part&&mFs)fs=Math.min(fs,mFs);
  else if(!part&&(!mFs||Math.abs(fs-mFs)>.5))mFs=fs;
  el.style.setProperty("--qfs",fs.toFixed(2)+"px");
  if(!short&&!part&&!mPgh){const h=el.offsetHeight;if(h>200){mPgh=h;$("#mPages").style.setProperty("--pgh",h+"px")}}
}
const pgTop=n=>pgMap[n].offsetTop-$("#mPages").offsetTop;
function trackPage(){
  if(!pgList.length)return;
  const sc=$("#mScroll"),y=sc.scrollTop+sc.clientHeight*.35;
  let n=pgList[0];for(const x of pgList){if(pgTop(x)<=y)n=x;else break}
  if(n!==mCur){mCur=n;S.mPage=n;clearTimeout(trackPage._t);trackPage._t=setTimeout(save,600);mLabels()}
}
function mLabels(){
  const su=S.mMode==="tr"?(S.trSu||mSu||surahAt(mCur)):(mSu||surahAt(mCur));
  $("#mTitle").textContent=(isAr()?"سورة ":"")+sName(su);
  const pg=S.mMode==="tr"?SURAH_PAGE[su-1]:mCur;
  $("#mSub").textContent=fmtN("juzN",{n:juzOf(pg)})+" · "+fmtN("pageN",{n:pg});
  $$("[data-mmode]").forEach(b=>{b.textContent=t(b.dataset.mmode==="read"?"mRead":"mTrans");b.classList.toggle("on",b.dataset.mmode===(S.mMode==="tr"?"tr":"read"))});
}
/* open page n of surah su (su comes from the ayah, or from the top of the page) */
async function goPage(n,key,su){
  n=Math.min(604,Math.max(1,n|0||1));
  if(key)su=+key.split(":")[0];
  if(S.mMode==="tr"){await drawTr(su||surahAt(n),key);return}
  if(!su){try{su=(await qPageData(n)).surahs[0].id}catch(e){su=surahAt(n)}}
  mBuild(su);
  const [a,b]=surahRange(su);n=Math.min(b,Math.max(a,n));
  mCur=n;S.mPage=n;save();
  const sc=$("#mScroll");
  if(n===a&&!key){sc.scrollTop=0;await drawPage(n);await Promise.all([n+1,n+2].filter(x=>pgMap[x]).map(drawPage));sc.scrollTop=0}
  else{
    sc.scrollTop=pgTop(n)-4;
    await drawPage(n);
    await Promise.all([n-2,n-1,n+1].filter(x=>pgMap[x]).map(drawPage));
    sc.scrollTop=pgTop(n)-4;await new Promise(r=>requestAnimationFrame(r));sc.scrollTop=pgTop(n)-4;
  }
  mLabels();
  if(key){const sp=pgMap[n]&&pgMap[n].querySelector(`.w[data-v="${key}"]`);if(sp){selectVerse(key);sp.scrollIntoView({block:"center"})}}
}
/* translation view: one surah at a time */
async function drawTr(su,key){
  S.trSu=su;save();mLabels();
  const box=$("#mTr");box.innerHTML=`<div class="pl pl-wait">…</div>`;
  let d;try{d=await trData(su)}catch(e){box.innerHTML=`<div class="pl pl-msg">${t("mOffline")}</div>`;return}
  if(S.trSu!==su)return;
  box.innerHTML=`<div class="trh"><b>سُورَةُ ${SURAHS[su-1][0]}</b><small>${SURAHS[su-1][1]}${d.translation?" · "+esc2(d.translation):""} · ${numFmt(SURAHS[su-1][2])} ${t("verses")}</small></div>
    ${su!==1&&su!==9?`<div class="trbism">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>`:""}
    ${d.verses.map(v=>`<div class="tv" data-v="${su}:${v.id}"><div class="tk"><span>${numFmt(su)}:${numFmt(v.id)}</span><div><button class="ib" data-vplay="${su}:${v.id}" aria-label="${t("vPlay")}">${ic("play")}</button><button class="ib" data-vmenu="${su}:${v.id}" aria-label="More">${ic("more3")}</button></div></div>
      <div class="ta">${esc2(v.text)} <span class="qend">﴿${arNum(v.id)}﴾</span></div><div class="te">${esc2(v.translation||"")}</div></div>`).join("")}
    <div class="trnav">${su>1?`<button data-trgo="${su-1}">${t("prevS")}</button>`:"<span></span>"}${su<114?`<button data-trgo="${su+1}">${t("nextS")}</button>`:"<span></span>"}</div>`;
  box.style.setProperty("--trs",S.trSize||1);box.dataset.lang=S.lang||"en"; /* redrawn when the language changes */
  markAll(box);
  if(key){const el=box.querySelector(`.tv[data-v="${key}"]`);if(el){el.scrollIntoView({block:"center"});selectVerse(key)}}else box.scrollTop=0;
}
const esc2=x=>String(x).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function setMode(m){
  S.mMode=m;save();
  $("#mScroll").hidden=m==="tr";$("#mTr").hidden=m!=="tr";
  if(m==="tr")drawTr(mSu||surahAt(mCur));
  else{const su=S.trSu||mSu||surahAt(mCur);if(su!==mSu)goPage(SURAH_PAGE[su-1],null,su);else goPage(mCur,null,su)}
  mLabels();
}
$$("[data-mmode]").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mmode)));
/* selecting an ayah */
let selKey=null;
function markAll(root){
  root.querySelectorAll(".hl,.play").forEach(e=>e.classList.remove("hl","play"));
  if(selKey)root.querySelectorAll(`[data-v="${selKey}"]`).forEach(e=>e.classList.add(e.classList.contains("tv")?"hl":"hl"));
  if(vQ&&vQ.key)root.querySelectorAll(`[data-v="${vQ.key}"]`).forEach(e=>e.classList.add("play"));
}
function selectVerse(key){selKey=key;markAll($("#mushaf"))}
async function openVerse(key){
  selectVerse(key);
  const [s,a]=key.split(":").map(Number);
  const isBm=(S.bm||[]).some(b=>b.k===key);
  sheetMode="verse";$("#sheetTitle").textContent=(isAr()?"سورة ":"")+sName(s)+" · "+fmtN("ayahN",{n:a});
  $("#sheetBody").innerHTML=`<div class="vsheet"><div class="vtr" id="vTrTxt">…</div><div class="vacts">
    <button data-vact="play" data-k="${key}">${ic("play")}${t("vPlay")}</button>
    <button data-vact="from" data-k="${key}">${ic("next")}${t("vFrom")}</button>
    <button data-vact="copy" data-k="${key}">${ic("copy")}${t("vCopy")}</button>
    <button data-vact="share" data-k="${key}">${ic("share")}${t("vShare")}</button>
    <button data-vact="bm" data-k="${key}">${ic("bm")}${isBm?t("vUnbm"):t("vBm")}</button></div></div>`;
  $("#scrim").classList.add("on");$("#sheet").classList.add("on");
  try{const d=await trData(s);const v=d.verses[a-1];const el=$("#vTrTxt");if(el)el.textContent=v?v.translation:""}catch(e){const el=$("#vTrTxt");if(el)el.textContent=""}
}
$("#mPages").addEventListener("click",e=>{const g=e.target.closest("[data-sgo]");if(g){const su=+g.dataset.sgo;goPage(SURAH_PAGE[su-1],null,su);return}const w=e.target.closest(".w[data-v]");if(w)openVerse(w.dataset.v)});
$("#mTr").addEventListener("click",e=>{
  const pl=e.target.closest("[data-vplay]");if(pl){playVerse(pl.dataset.vplay,true);return}
  const mn=e.target.closest("[data-vmenu]");if(mn){openVerse(mn.dataset.vmenu);return}
  const g=e.target.closest("[data-trgo]");if(g){drawTr(+g.dataset.trgo);$("#mTr").scrollTop=0;return}
  const tv=e.target.closest(".tv[data-v]");if(tv)openVerse(tv.dataset.v);
});
async function verseAction(act,key){
  const [s,a]=key.split(":").map(Number);
  if(act==="play"||act==="from"){closeSheet();playVerse(key,act==="from");return}
  if(act==="bm"){S.bm=S.bm||[];const i=S.bm.findIndex(b=>b.k===key);if(i>=0){S.bm.splice(i,1);toast(t("bmRemoved"))}else{S.bm.unshift({k:key,p:(S.mMode==="tr"||(typeof bookActive==="function"&&bookActive()))?await versePage(key):mCur});toast(t("bmAdded"))}save();closeSheet();return}
  let d=null;try{d=await trData(s)}catch(e){}
  const v=d&&d.verses[a-1];const ref=sName(s)+" "+s+":"+a;
  const text=(v?v.text+" ﴿"+arNum(a)+"﴾\n"+(v.translation||"")+"\n":"")+"("+ref+")";
  if(act==="copy"){try{await navigator.clipboard.writeText(text);toast(t("copied"))}catch(e){toast(ref)}closeSheet();return}
  if(act==="share"){const url=APP_URL+"?v="+key;closeSheet();
    if(navigator.share){try{await navigator.share({title:ref,text,url});return}catch(e){if(e&&e.name==="AbortError")return}}
    try{await navigator.clipboard.writeText(text+"\n"+url);toast(t("linkCopied"))}catch(e){toast(url)}}
}
/* navigation sheet: surah, juz, page, bookmarks */
/* searching surahs by number, English or Arabic name (forgiving spelling: "yaseen" finds Ya Sin) */
const latinK=x=>x.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const noAl=x=>x.replace(/^(al|an|ar|as|at|ad|az|ash|adh|ath|aal)(?=[a-z]{2})/,"");
const skelK=x=>noAl(x).replace(/[aeiouyw]/g,"").replace(/(.)\1+/g,"$1");
const arK=x=>x.replace(/[ً-ْٰـ]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/^ال/,"").replace(/\s+/g,"");
const SKEYS=SURAHS.map(x=>({l:noAl(latinK(x[1])),k:skelK(latinK(x[1])),a:arK(x[0])}));
function surahMatch(i,q){
  q=q.trim();if(!q)return true;
  if(/^\d+$/.test(q))return String(i+1).startsWith(q);
  if(/[؀-ۿ]/.test(q)){const a=arK(q);return SKEYS[i].a.includes(a)}
  const l=noAl(latinK(q));if(!l)return true;
  return SKEYS[i].l.includes(l)||(l.length>=3&&skelK(l).length>=2&&SKEYS[i].k.startsWith(skelK(l)));
}
let navSu=0;
function surahRows(attr){return SURAHS.map((x,i)=>`<button class="nrow" ${attr(i)} data-si="${i}"><span class="nn">${numFmt(i+1)}</span><span class="nt"><b>${isAr()?x[0]:x[1]}</b><small>${numFmt(x[2])} ${t("verses")} · ${fmtN("pageN",{n:SURAH_PAGE[i]})}</small></span><span class="na">${isAr()?"":x[0]}</span></button>`).join("")}
function verseCol(su){
  return `<input class="nsearch" id="nVin" type="number" inputmode="numeric" min="1" max="${SURAHS[su-1][2]}" placeholder="${t("vNum")}" aria-label="${t("vNum")}">
    <div class="nlist vlist" id="nVlist">${Array.from({length:SURAHS[su-1][2]},(_,k)=>`<button class="vbtn" data-vgo="${su}:${k+1}">${numFmt(k+1)}</button>`).join("")}</div>`;
}
function openNav(tab){
  tab=tab||"s";sheetMode="mnav";$("#sheetTitle").textContent=t("mNavT");
  const cur=S.mMode==="tr"?(S.trSu||mSu||1):(mSu||surahAt(mCur));
  const tabs=[["s","nSurah"],["v","nVerse"],["j","nJuz"],["p","nPage"],["b","nBm"]];
  let body="";
  if(tab==="s")body=`<input class="nsearch" id="nSq" type="search" placeholder="${t("searchSurah")}" aria-label="${t("searchSurah")}" autocomplete="off"><div class="nlist" id="nSlist">${surahRows(i=>`data-np="${SURAH_PAGE[i]}" data-nsu="${i+1}"`)}</div>`;
  if(tab==="v"){navSu=navSu||cur;body=`<div class="vpick"><div class="vcol"><input class="nsearch" id="nSq" type="search" placeholder="${t("searchSurah")}" aria-label="${t("searchSurah")}" autocomplete="off"><div class="nlist" id="nSlist">${surahRows(i=>`data-vsu="${i+1}"`)}</div></div><div class="vcol vright" id="nVcol">${verseCol(navSu)}</div></div>`}
  if(tab==="j")body=`<div class="nlist">${JUZ_PAGE.map((p,i)=>{const su=surahAt(p);return `<button class="nrow" data-np="${p}"><span class="nn">${numFmt(i+1)}</span><span class="nt"><b>${fmtN("juzN",{n:i+1})}</b><small>${sName(su)} · ${fmtN("pageN",{n:p})}</small></span></button>`}).join("")}</div>`;
  if(tab==="p")body=`<div class="npage"><input id="nPageIn" type="number" min="1" max="604" inputmode="numeric" value="${mCur}" aria-label="${t("nPage")}"><button data-npgo="1">${t("goBtn")}</button></div><p class="mnote">1 – ${numFmt(604)}</p>`;
  if(tab==="b")body=`<div class="nlist">${(S.bm||[]).length?(S.bm||[]).map(b=>{const [s2,a]=b.k.split(":").map(Number);return `<button class="nrow" data-np="${b.p}" data-nv="${b.k}"><span class="nn">${ic("bm")}</span><span class="nt"><b>${sName(s2)} · ${fmtN("ayahN",{n:a})}</b><small>${fmtN("pageN",{n:b.p})}</small></span></button>`}).join(""):`<p class="mnote">${t("noBm")}</p>`}</div>`;
  $("#sheetBody").innerHTML=`<div class="ntabs">${tabs.map(([k,l])=>`<button data-ntab="${k}" class="${k===tab?"on":""}">${t(l)}</button>`).join("")}</div>${body}`;
  $("#scrim").classList.add("on");$("#sheet").classList.add("on");
  const sq=$("#nSq");
  if(sq){sq.addEventListener("input",()=>{const q=sq.value;$$("#nSlist .nrow").forEach(r=>{r.hidden=!surahMatch(+r.dataset.si,q)})});
    sq.addEventListener("keydown",e=>{if(e.key==="Enter"){const r=[...$$("#nSlist .nrow")].find(x=>!x.hidden);if(r)r.click()}})}
  const mark=tab==="v"?navSu:cur;const r=$("#sheetBody").querySelector(`#nSlist [data-si="${mark-1}"]`);if(r){r.classList.add("cur");r.scrollIntoView({block:"center"})}
  bindVin();
}
function bindVin(){const vi=$("#nVin");if(!vi)return;vi.addEventListener("keydown",e=>{if(e.key==="Enter"){const n=+vi.value;if(n>=1&&n<=SURAHS[navSu-1][2])$(`#nVlist [data-vgo="${navSu}:${n}"]`).click()}});
  vi.addEventListener("input",()=>{const n=+vi.value;const b=$(`#nVlist [data-vgo="${navSu}:${n}"]`);$$("#nVlist .vbtn").forEach(x=>x.classList.toggle("on",x===b));if(b)b.scrollIntoView({block:"nearest"})})}
$("#mNav").addEventListener("click",()=>openNav("s"));
$("#mAa").addEventListener("click",()=>{
  sheetMode="maa";$("#sheetTitle").textContent=t("textSize");
  $("#sheetBody").innerHTML=`<div class="szrow"><span class="u-fs13">A</span><input id="trSizeIn" type="range" min="0.8" max="1.6" step="0.1" value="${S.trSize||1}" aria-label="${t("textSize")}"><span class="u-fs22">A</span></div><p class="mnote">${t("trSizeNote")}</p>`;
  $("#scrim").classList.add("on");$("#sheet").classList.add("on");
  $("#trSizeIn").addEventListener("input",e=>{S.trSize=+e.target.value;$("#mTr").style.setProperty("--trs",S.trSize);save()});
});
$("#sheetBody").addEventListener("click",e=>{
  const va=e.target.closest("[data-vact]");if(va){e.stopPropagation();verseAction(va.dataset.vact,va.dataset.k);return}
  const tb=e.target.closest("[data-ntab]");if(tb){e.stopPropagation();openNav(tb.dataset.ntab);return}
  const pg=e.target.closest("[data-npgo]");if(pg){e.stopPropagation();const n=+$("#nPageIn").value;if(n>=1&&n<=604){closeSheet();if(S.mMode==="tr")setMode("read");goPage(n)}return}
  const vs=e.target.closest("[data-vsu]");if(vs){e.stopPropagation();navSu=+vs.dataset.vsu;$$("#nSlist .nrow").forEach(x=>x.classList.toggle("cur",x===vs));$("#nVcol").innerHTML=verseCol(navSu);bindVin();return}
  const vg=e.target.closest("[data-vgo]");if(vg){e.stopPropagation();closeSheet();const k=vg.dataset.vgo;if(S.mMode==="tr")drawTr(+k.split(":")[0],k);else versePage(k).then(p=>goPage(p,k));return}
  const r=e.target.closest("[data-np]");if(r){e.stopPropagation();closeSheet();
    if(S.mMode==="tr"){const su=r.dataset.nsu?+r.dataset.nsu:(r.dataset.nv?+r.dataset.nv.split(":")[0]:surahAt(+r.dataset.np));drawTr(su,r.dataset.nv||null)}
    else goPage(+r.dataset.np,r.dataset.nv||null,r.dataset.nsu?+r.dataset.nsu:0)}
},true);
/* ayah-by-ayah audio, following along on the page */
const vau=new Audio();let vQ=null;
function vUrls(key){const [s,a]=key.split(":").map(Number);const f=String(s).padStart(3,"0")+String(a).padStart(3,"0");const st=S.vStyle==="Mujawwad"?"Mujawwad":"Murattal";
  return ["https://verses.quran.com/AbdulBaset/"+st+"/mp3/"+f+".mp3","https://everyayah.com/data/Abdul_Basit_"+st+(st==="Murattal"?"_192kbps":"_128kbps")+"/"+f+".mp3"]}
const nextKey=key=>{const [s,a]=key.split(":").map(Number);return a<SURAHS[s-1][2]?s+":"+(a+1):(s<114?(s+1)+":1":null)};
function playVerse(key,cont){
  try{if(!au.paused)au.pause()}catch(e){}
  vQ={key,cont,try:0};vau.src=vUrls(key)[0];vau.play().catch(()=>{});
  const [s,a]=key.split(":").map(Number);
  $("#vBar").hidden=false;$("#vNow").textContent=sName(s)+" · "+fmtN("ayahN",{n:a});$("#vSty").textContent="Abdul Basit Abdul Samad";$("#vStyle").textContent=t(S.vStyle==="Mujawwad"?"mujawwad":"murattal");
  selKey=null;markAll($("#mushaf"));followVerse(key);
}
function stopVerses(){vQ=null;try{vau.pause()}catch(e){}$("#vBar").hidden=true;markAll($("#mushaf"))}
vau.addEventListener("error",()=>{if(!vQ||!vau.src)return;vQ.try++;const u=vUrls(vQ.key);if(vQ.try<u.length){vau.src=u[vQ.try];vau.play().catch(()=>{})}else{toast(t("vErr"));stopVerses()}});
vau.addEventListener("ended",()=>{if(vQ&&vQ.cont){const n=nextKey(vQ.key);if(n){playVerse(n,true);return}}stopVerses()});
vau.addEventListener("play",()=>{$("#vPPic").innerHTML=P.pause});vau.addEventListener("pause",()=>{$("#vPPic").innerHTML=P.play});
au.addEventListener("play",()=>{if(vQ)stopVerses()});
$("#vPP").addEventListener("click",()=>{if(!vQ)return;vau.paused?vau.play().catch(()=>{}):vau.pause()});
$("#vStop").addEventListener("click",stopVerses);
$("#vStyle").addEventListener("click",()=>{S.vStyle=S.vStyle==="Mujawwad"?"Murattal":"Mujawwad";save();if(vQ)playVerse(vQ.key,vQ.cont)});
async function followVerse(key){
  if(S.mMode==="tr"){const su=+key.split(":")[0];if(S.trSu!==su)await drawTr(su);const el=$("#mTr").querySelector(`.tv[data-v="${key}"]`);if(el)el.scrollIntoView({block:"center",behavior:"smooth"});return}
  let sp=$("#mPages").querySelector(`.w[data-v="${key}"]`);
  if(!sp){const p=await versePage(key);await goPage(p,null,+key.split(":")[0]);sp=$("#mPages").querySelector(`.w[data-v="${key}"]`)}
  if(sp){const sc=$("#mScroll"),r=sp.getBoundingClientRect(),b=sc.getBoundingClientRect();if(r.top<b.top+40||r.bottom>b.bottom-90)sp.scrollIntoView({block:"center",behavior:"smooth"})}
}
/* opening the reader */
let mPendingKey=null;
function mOpen(){
  $("#mScroll").hidden=S.mMode==="tr";$("#mTr").hidden=S.mMode!=="tr";
  if(mPendingKey){const k=mPendingKey;mPendingKey=null;versePage(k).then(p=>{if(S.mMode==="tr")drawTr(+k.split(":")[0],k);else goPage(p,k)});mLabels();return}
  if(S.mMode==="tr"){if(!$("#mTr").childElementCount||$("#mTr").dataset.lang!==(S.lang||"en"))drawTr(S.trSu||S.mSu||surahAt(S.mPage||1));mLabels();return}
  if(!pgList.length){const p=S.mPage||1,su=S.mSu&&p>=surahRange(S.mSu)[0]&&p<=surahRange(S.mSu)[1]?S.mSu:0;goPage(p,null,su)}else mLabels();
}
window.addEventListener("resize",()=>{clearTimeout(mOpen._r);mOpen._r=setTimeout(()=>{mFs=0;mPgh=0;pgList.forEach(n=>{const e=pgMap[n];if(e&&e._drawn)fitPage(e)})},150)});

/* a shared ayah link (?v=2:255) opens the reader at that ayah */
(function(){try{const v=new URLSearchParams(location.search).get("v");if(v&&/^\d{1,3}:\d{1,3}$/.test(v)){mPendingKey=v;history.replaceState(null,"",location.pathname+"#mushaf")}}catch(e){}})();
