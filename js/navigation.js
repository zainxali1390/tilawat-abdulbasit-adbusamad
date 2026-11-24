/* Screens and back/forward navigation (hash names) */
const SCREENS=["khatma","collections","area","loc","home","surahs","player","mushaf","translation","favourites","khatam","more","prefs","appearance","audio","notifs","about","language","finder"];
const TABS=["home","surahs","favourites","more"];
let navDepth=0;
function show(id){
  $$(".screen").forEach(s=>s.classList.toggle("on",s.id===id));
  const tabbed=TABS.includes(id);
  $("#nav").classList.toggle("on",tabbed);
  $$("#nav [data-tab]").forEach(b=>b.classList.toggle("on",b.dataset.tab===id));
  if(id==="language"){renderLangs();$("#langBack").style.visibility=S.lang?"visible":"hidden"}
  if(id==="favourites")renderFavs();
  if(id==="home")renderRecent();
  if(id==="collections")renderCollections();
  if(id==="khatam")renderKhatam();
  if(id==="khatma")renderKhatma();
  if(id==="mushaf")mOpen();
  if(id!=="mushaf"&&typeof stopVerses==="function"&&vQ)stopVerses();
  if(id==="area")renderArea();
  if(id==="loc")renderLoc();
  window.scrollTo(0,0);
}
function go(id,replace){
  if(location.hash==="#"+id){show(id);return}
  if(replace){history.replaceState(null,"","#"+id);show(id)}
  else{navDepth++;location.hash=id}
}
function back(){if(navDepth>0){navDepth--;history.back()}else go("home",true)}
window.addEventListener("hashchange",()=>{
  const id=location.hash.slice(1);
  if(SCREENS.includes(id)){if(id!=="language"&&!S.lang){go("language",true);return}show(id)}
});

function renderAll(){LIB=null;renderCollections();if($("#area").classList.contains("on"))renderArea();if($("#loc").classList.contains("on"))renderLoc();renderSurahs();renderRecent();renderFavs();renderKhatam();if($("#mushaf").classList.contains("on")&&typeof mLabels==="function"){mLabels()}if($("#khatma").classList.contains("on"))drawKhatma&&kCur.K&&drawKhatma();renderTranslation();renderRecSel();renderToggles();updatePlayer()}
