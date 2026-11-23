/* Theme, language and the surah list */
/* theme */
function applyTheme(){
  const sysLight=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches;
  const light=S.theme==="light"||(S.theme==="system"&&sysLight);
  document.body.classList.toggle("light",light);
  const b=BGS.find(x=>x[0]===S.bgc)||BGS[0], o=light?5:1;
  const r=document.body.style;
  ["--bg","--bg2","--card","--card2"].forEach((k,i)=>r.setProperty(k,b[o+i]));
  const sp=$("#splash").style; /* opening screen always uses the dark version, like the design */
  ["--bg","--bg2","--card","--card2"].forEach((k,i)=>sp.setProperty(k,b[1+i]));
  sp.setProperty("--gold","#d6b064");sp.setProperty("--gold2","#f0d595");sp.setProperty("--text","#efe6cf");sp.setProperty("--muted","#a59a7c");sp.setProperty("--line","rgba(214,176,100,.32)");sp.setProperty("--line2","rgba(214,176,100,.16)");
  r.setProperty("--gold",light?"#9a7428":"#d6b064");r.setProperty("--gold2",light?"#c49a45":"#f0d595");
  $('meta[name="theme-color"]').content=b[o];
  $$("#themeChips .chip").forEach(c=>c.classList.toggle("on",c.dataset.theme===S.theme));
  renderSwatches();
  $("#curTheme").textContent="("+t(S.theme)+")";
}
try{matchMedia("(prefers-color-scheme: light)").addEventListener("change",()=>S.theme==="system"&&applyTheme())}catch(e){}

/* language */
function applyLang(){
  const l=S.lang||"en";
  document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr";
  document.body.classList.toggle("lang-ar",l==="ar");
  $$("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
  $$("[data-i18n-ph]").forEach(el=>el.placeholder=t(el.dataset.i18nPh));
  $("#curLang").textContent=(LANGS.find(x=>x[0]===l)||LANGS[0])[1];
  applyTheme();renderAll();
}
let pickLang=null;
function renderLangs(){
  const selL=pickLang||S.lang||"en";
  $("#langs").innerHTML=LANGS.map(([c,n,f])=>`<button class="lang${c===selL?" pick":""}" data-lang="${c}"><span class="flag">${f}</span><span class="n">${n}</span><span class="ck">${ic("check")}</span></button>`).join("");
}
$("#langs").addEventListener("click",e=>{const b=e.target.closest("[data-lang]");if(!b)return;pickLang=b.dataset.lang;renderLangs()});
$("#langGo").addEventListener("click",()=>{
  const first=!S.lang;S.lang=pickLang||S.lang||"en";pickLang=null;save();applyLang();
  if(first){navDepth=0;go("home",true)}else back();
});

/* rendering */
function surahRow(i){
  const [a,e,v]=SURAHS[i];
  return `<div class="s"><span class="num">${i+1}.</span><div class="nm"><div class="a">${a}</div><div class="e">${e}</div><small>${v} ${t("verses")}</small></div><button class="playc" data-play="surah:${i+1}" aria-label="Play ${e}">${ic("play")}</button></div>`;
}
function renderSurahs(){
  const q=norm($("#sq").value||"");
  const idx=SURAHS.map((s,i)=>i).filter(i=>!q||String(i+1)===q||norm(SURAHS[i][0]).includes(q)||norm(SURAHS[i][1]).includes(q));
  $("#slist").innerHTML=idx.length?idx.map(surahRow).join(""):`<div class="empty">${t("noResults")}</div>`;
}
$("#sq").addEventListener("input",renderSurahs);
