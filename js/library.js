/* Recitations library: a geographical archive — country → location (mosque, radio station, TV, venue, city) →
   recordings. Built at run time from the recordings' own place fields in data/areas.js (nothing is moved or renamed
   in the data: every recording keeps its ID, file, title, year, place and type). Year, type, surah and duration are
   filters and sorting inside a location, never the main structure.

   - country: the area a recording is filed under (Masjid al-Aqsa → Palestine, BBC → United Kingdom; Place unknown,
     unnamed radio, the Sheikh's home and lost recitations → "Country not known")
   - location: the place field, with spelling variants merged (LIB_ALIAS). A place that only names the country (or
     nothing) becomes that country's "Location not known" (or "Radio · station not named" / "TV · channel not named"
     for radio / TV sections, as their sources say) — never a guessed venue
   - type: radio / TV / public / home / studio / … from the recording's section (as its source labels it), or from a
     radio or TV location */
const LIB_COUNTRIES=[
  {id:"egypt",en:"Egypt",ar:"مصر",areas:["egypt"]},
  {id:"saudi",en:"Saudi Arabia",ar:"السعودية",areas:["saudi"]},
  {id:"kuwait",en:"Kuwait",ar:"الكويت",areas:["kuwait"]},
  {id:"palestine",en:"Palestine",ar:"فلسطين",areas:["aqsa"]},
  {id:"syria",en:"Syria",ar:"سوريا",areas:["syria"]},
  {id:"iraq",en:"Iraq",ar:"العراق",areas:["iraq"]},
  {id:"jordan",en:"Jordan",ar:"الأردن",areas:["jordan"]},
  {id:"lebanon",en:"Lebanon",ar:"لبنان",areas:["lebanon"]},
  {id:"uae",en:"United Arab Emirates",ar:"الإمارات",areas:["uae"]},
  {id:"qatar",en:"Qatar",ar:"قطر",areas:["qatar"]},
  {id:"bahrain",en:"Bahrain",ar:"البحرين",areas:["bahrain"]},
  {id:"libya",en:"Libya",ar:"ليبيا",areas:["libya"]},
  {id:"morocco",en:"Morocco",ar:"المغرب",areas:["morocco"]},
  {id:"iran",en:"Iran",ar:"إيران",areas:["iran"]},
  {id:"pakistan",en:"Pakistan",ar:"باكستان",areas:["pakistan"]},
  {id:"india",en:"India",ar:"الهند",areas:["india"]},
  {id:"malaysia",en:"Malaysia",ar:"ماليزيا",areas:["malaysia"]},
  {id:"safrica",en:"South Africa",ar:"جنوب أفريقيا",areas:["safrica"]},
  {id:"uk",en:"United Kingdom",ar:"المملكة المتحدة",areas:["bbc"]},
  {id:"usa",en:"United States",ar:"الولايات المتحدة",areas:["usa"]},
  {id:"nocountry",en:"Country not known",ar:"البلد غير معروف",areas:["unknown","radio_unknown","home","lost"]}
];
/* the same place written two ways → one location (checked against the recordings' source labels) */
const LIB_ALIAS={
  "Damascus Radio":["Syrian Radio","الإذاعة السورية"],             /* إذاعة دمشق is the Syrian national radio */
  "BBC":["BBC Radio · London","إذاعة لندن (بي بي سي)"],
  "Makkah · Saudi Arabia":["Makkah","مكة"],
  "Place unknown":["",""]
};
/* section names that name the venue for recordings whose place is only the country */
const LIB_SEC_VENUE=[[/^Makkah\b/,"Makkah","مكة"],[/^Masjid an-Nabawi\b/,"Masjid an-Nabawi · Madinah","المسجد النبوي · المدينة"]];
const LIB_UNKNOWN={en:"Location not known",ar:"المكان غير معروف"},LIB_RADIO_UN={en:"Radio · station not named",ar:"إذاعة · المحطة غير مذكورة"},LIB_TV_UN={en:"TV · channel not named",ar:"تلفزيون · القناة غير مذكورة"};
Object.assign(I18N.en,{libTitle:"Recitations library",libSub:"By country and place: mosques, radio, television and venues",libCountries:"countries",libLocations:"places",libLocation:"place",
  libSearch:"Search all recordings",libSearchLoc:"Search this place",libAll:"All",libYear:"Year",libAllYears:"All years",libNoDate:"Date not given",libSurah:"Surah",libAllSurahs:"All surahs",
  libType:"Type",libLen:"Length",libAnyLen:"Any length",libShort:"Under 10 min",libMid:"10–30 min",libLong:"Over 30 min",libSort:"Sort",libSortList:"Archive order",libSortYear:"Oldest first",libSortYearD:"Newest first",
  libSortSurah:"Surah order",libSortLen:"Longest first",libSortLenA:"Shortest first",libNone:"No recordings match these filters.",libInRadio:"{n} more in Radio recitations — show",libInLive:"{n} more in Live recitations — show",libInKhatma:"{n} in the First Shared Khatma (Khatmas) — open",libMin:"{n} min",
  lkMosque:"Mosques",lkVenue:"Venues and occasions",lkRadio:"Radio",lkTv:"Television",lkStudio:"Record companies",lkCity:"Cities and regions (venue not named)",lkUnknown:"Place not known",
  tyPublic:"Public recitation",tyRadio:"Radio",tyTv:"Television",tyHome:"At home",tyStudio:"Studio record",tyKhatma:"Shared khatma",tyComp:"Compilation",tyLost:"Lost (fragment)",tyOther:"Not stated"});
Object.assign(I18N.ar,{libTitle:"مكتبة التلاوات",libSub:"حسب البلد والمكان: المساجد والإذاعات والتلفزيون والأماكن",libCountries:"بلدان",libLocations:"أماكن",libLocation:"مكان",
  libSearch:"ابحث في كل التسجيلات",libSearchLoc:"ابحث في هذا المكان",libAll:"الكل",libYear:"السنة",libAllYears:"كل السنوات",libNoDate:"بدون تاريخ",libSurah:"السورة",libAllSurahs:"كل السور",
  libType:"النوع",libLen:"المدة",libAnyLen:"أي مدة",libShort:"أقل من ١٠ دقائق",libMid:"١٠–٣٠ دقيقة",libLong:"أكثر من ٣٠ دقيقة",libSort:"الترتيب",libSortList:"ترتيب الأرشيف",libSortYear:"الأقدم أولًا",libSortYearD:"الأحدث أولًا",
  libSortSurah:"ترتيب السور",libSortLen:"الأطول أولًا",libSortLenA:"الأقصر أولًا",libNone:"لا توجد تسجيلات تطابق هذه الاختيارات.",libInRadio:"{n} أخرى في التلاوات الإذاعية — عرض",libInLive:"{n} أخرى في التلاوات الخارجية — عرض",libInKhatma:"{n} في الختمة المشتركة الأولى (الختمات) — فتح",libMin:"{n} د",
  lkMosque:"المساجد",lkVenue:"أماكن ومناسبات",lkRadio:"الإذاعة",lkTv:"التلفزيون",lkStudio:"شركات التسجيل",lkCity:"مدن ومناطق (المكان غير مسمّى)",lkUnknown:"المكان غير معروف",
  tyPublic:"تلاوة خارجية",tyRadio:"إذاعة",tyTv:"تلفزيون",tyHome:"في المنزل",tyStudio:"تسجيل أسطوانة",tyKhatma:"ختمة مشتركة",tyComp:"مختارات",tyLost:"مفقودة (مقطع)",tyOther:"غير مذكور"});
Object.assign(I18N.fr,{libTitle:"Bibliothèque des récitations"});Object.assign(I18N.de,{libTitle:"Rezitationsbibliothek"});Object.assign(I18N.tr,{libTitle:"Kıraat kütüphanesi"});

const LIB_KINDS=["mosque","venue","radio","tv","studio","city","unknown"];
const LIB_KIND_KEY={mosque:"lkMosque",venue:"lkVenue",radio:"lkRadio",tv:"lkTv",studio:"lkStudio",city:"lkCity",unknown:"lkUnknown"};
const LIB_TYPE_KEY={public:"tyPublic",radio:"tyRadio",tv:"tyTv",home:"tyHome",studio:"tyStudio",khatma:"tyKhatma",comp:"tyComp",lost:"tyLost",other:"tyOther"};
function libKind(en){
  if(!en||en===LIB_UNKNOWN.en||/not known|country not given|not named\)|East Asian country/.test(en))return /Mosque/.test(en)?"mosque":(/Radio/.test(en)?"radio":"unknown");
  if(/\bRadio\b|Sawt al-Arab/i.test(en))return "radio";
  if(/\bTV\b|interview/i.test(en))return "tv";
  if(/Mosque|Masjid|Ḥaram|Haram|Jamiʿ/i.test(en))return "mosque";
  if(/Mourphon|Sawt al-Qahira|Records?\b/i.test(en))return "studio";
  if(/Square|Palace|University|home|khatma|Pavilion|Hall|Theatre|Club/i.test(en))return "venue";
  return "city";
}
function libType(sec,kind){
  if(kind==="radio")return "radio";if(kind==="tv")return "tv";
  if(/\bRadio\b/i.test(sec))return "radio";if(/\bTV\b/.test(sec))return "tv";if(/^Home/.test(sec))return "home";
  if(/Mourphon|Records|Sawt al-Qahira/.test(sec))return "studio";if(/Shared khatma/.test(sec))return "khatma";
  if(/compilations/.test(sec))return "comp";if(/^Lost/.test(sec))return "lost";if(/public/i.test(sec))return "public";
  return "other";
}
const libSlug=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[ʿʾ'’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"x";
/* the archive: countries → locations → recording references [ai, si, ii] */
let LIB=null;
function libBuild(){
  const areaCountry={};LIB_COUNTRIES.forEach(c=>c.areas.forEach(a=>areaCountry[a]=c.id));
  const countries=LIB_COUNTRIES.map(c=>({...c,locs:new Map(),n:0,m:{live:0,radio:0,khatma:0}}));const byId=Object.fromEntries(countries.map(c=>[c.id,c]));
  const refOf=new Map();
  AREAS.forEach((a,ai)=>a.secs.forEach((sc,si)=>sc.items.forEach((it,ii)=>{
    const c=byId[areaCountry[a.id]]||byId.nocountry;
    let en=it[6]||"",ar=it[5]||"";
    if(LIB_ALIAS[en]){[en,ar]=LIB_ALIAS[en]}
    const countryOnly=!en||en===a.en||(c.id!=="nocountry"&&en===c.en);
    if(countryOnly){
      const v=LIB_SEC_VENUE.find(([rx])=>rx.test(sc.en));
      if(v){en=v[1];ar=v[2]}
      else if(/\bRadio\b/i.test(sc.en)||a.id==="radio_unknown"){en=LIB_RADIO_UN.en;ar=LIB_RADIO_UN.ar}
      else if(/\bTV\b/.test(sc.en)){en=LIB_TV_UN.en;ar=LIB_TV_UN.ar}
      else if(a.id==="lost"||/^Lost/.test(sc.en)){en="Lost recitations";ar="تلاوات مفقودة"}
      else {en=LIB_UNKNOWN.en;ar=LIB_UNKNOWN.ar}
    }
    if(a.id==="home"&&!it[6]){en="At the Sheikh's home";ar="منزل الشيخ"}
    const kind=(en==="Lost recitations")?"unknown":libKind(en),id=libSlug(en);
    let L=c.locs.get(id);
    if(!L){L={id,en,ar,kind,country:c.id,refs:[]};c.locs.set(id,L)}
    else if(!L.ar&&ar)L.ar=ar;
    /* the shared khatma of the early 1950s (K 1–35) is the same archive.org item the Khatmas section plays
       ("First Shared Khatma"): it belongs to Khatmas, not to the Live or Radio collections */
    const mode=/^Shared khatma/.test(en)?"khatma":(a.id==="bbc"||libType(sc.en,kind)==="radio")?"radio":"live";
    L.refs.push([ai,si,ii]);c.n++;L.m=L.m||{live:0,radio:0,khatma:0};L.m[mode]++;c.m=c.m||{live:0,radio:0,khatma:0};c.m[mode]++;
    refOf.set(it[0]+":"+it[1],{c:c.id,l:id,mode});
  })));
  for(const c of countries){c.locList=[...c.locs.values()].sort((x,y)=>LIB_KINDS.indexOf(x.kind)-LIB_KINDS.indexOf(y.kind)||y.refs.length-x.refs.length||x.en.localeCompare(y.en))}
  countries.sort((x,y)=>(x.id==="nocountry")-(y.id==="nocountry")||y.n-x.n);
  for(const c of countries)for(const l of c.locList)l.m=l.m||{live:0,radio:0,khatma:0};
  LIB={countries,byId,refOf};
  return LIB;
}
const lib=()=>LIB||libBuild();
/* live and radio stay two separate collections (as the home screen shows them): a recording is radio when its source
   labels it radio or its place is a radio station; everything else (public recitations, TV, home…) is live */
const colMode=()=>S.colMode==="radio"?"radio":"live";
const libModeOf=(ai,si,ii)=>{const it=AREAS[ai].secs[si].items[ii],r=lib().refOf.get(it[0]+":"+it[1]);return r?r.mode:"live"};
const inColMode=r=>libModeOf(...r)===colMode();
const libName=o=>isAr()?(o.ar||o.en):o.en;
const libOther=o=>isAr()?"":o.ar;
function libCur(){const L=lib(),c=L.byId[S.libC]||L.countries[0];return {c,l:c.locs.get(S.libL)||c.locList[0]}}
/* the location of a library track (for "where it comes from" and the play queue) */
function libLocOf(tr){if(!tr||!tr.eg||!tr.k)return null;const m=tr.k.match(/^eg:(.*)$/);const r=m&&lib().refOf.get(m[1]);return r?{c:lib().byId[r.c],l:lib().byId[r.c].locs.get(r.l)}:null}

/* lengths come from the recording index (fp/manifest.json), when it can be fetched */
const LIBLEN={map:null,p:null};
function libLengths(){
  if(LIBLEN.map||LIBLEN.p)return LIBLEN.p;
  LIBLEN.p=fetch("fp/manifest.json").then(r=>r.ok?r.json():null).then(m=>{LIBLEN.map=new Map();if(m)for(const [code,d] of m.recs)if(code.startsWith("e:"))LIBLEN.map.set(code.slice(2),d);return LIBLEN.map}).catch(()=>{LIBLEN.p=null;return null});
  return LIBLEN.p;
}
const libLen=it=>LIBLEN.map?LIBLEN.map.get(it[0]+":"+it[1])||0:0;
const libYear=y=>{const m=(y||"").match(/(19\d\d|20\d\d)/);return m?+m[1]:0};
const LIB_DEC_AR={"1940s":"الأربعينيات","1950s":"الخمسينيات","1960s":"الستينيات","1970s":"السبعينيات","1980s":"الثمانينيات"};
const libDecade=y=>{const m=(y||"").match(/(19\d)\d/);return m?m[1]+"0s":""};

/* ---------- screens ---------- */
/* Recitations library: the countries, and a search over every recording */
function renderCollections(){
  const L=lib(),q=norm($("#cq").value||"");
  const M=colMode();
  $("#colTitle").textContent=t(M==="radio"?"radioTitle":"liveTitle");
  if(q){
    /* search: this collection first; matches in the other collection are offered with one tap */
    const hits=[];let other=0,kh=0;
    for(const c of L.countries)for(const l of c.locList)for(const [ai,si,ii] of l.refs){const it=AREAS[ai].secs[si].items[ii];
      if(norm(it.slice(2).join(" ")+" "+c.en+" "+c.ar+" "+l.en+" "+l.ar+" "+AREAS[ai].secs[si].en+" "+AREAS[ai].secs[si].ar).includes(q)){const md=libModeOf(ai,si,ii);if(md===M)hits.push([ai,si,ii,c,l]);else if(md==="khatma")kh++;else other++}}
    $("#colList").innerHTML=(hits.length?`<div class="card">${hits.slice(0,200).map(([ai,si,ii,c,l])=>libRow(ai,si,ii,libName(c)+" · "+libName(l)+(AREAS[ai].secs[si].items[ii][4]?" · "+AREAS[ai].secs[si].items[ii][4]:""))).join("")}</div>${hits.length>200?`<p class="note u-note">${hits.length} …</p>`:""}`:`<div class="empty">${t("noResults")}</div>`)+
      (other?`<button class="card libother" data-libswitch>${fx2(M==="radio"?"libInLive":"libInRadio",{n:numFmt(other)})}</button>`:"")+
      (kh?`<button class="card libother" data-libkhatma>${fx2("libInKhatma",{n:numFmt(kh)})}</button>`:"");
  }else{
    const cs=L.countries.filter(c=>c.m[M]);
    $("#colList").innerHTML=`<div class="agrid">${cs.map(c=>{const np=c.locList.filter(l=>l.m[M]).length;return `<button class="card atile" data-libc="${c.id}"><span class="an">${libName(c)}</span>${isAr()?"":`<span class="aa">${c.ar}</span>`}<span class="ac">${nRec(c.m[M])} · ${np} ${t(np===1?"libLocation":"libLocations")}</span></button>`}).join("")}</div>`;
  }
  libHomeCount();
}
function libHomeCount(){const L=lib();for(const M of ["live","radio"]){const el=$(M==="live"?"#egCountLive":"#egCountRadio");if(!el)continue;
  el.textContent=nRec(L.countries.reduce((n,c)=>n+c.m[M],0))+" · "+L.countries.filter(c=>c.m[M]&&c.id!=="nocountry").length+" "+t("libCountries")}}
document.addEventListener("click",e=>{const b=e.target.closest("[data-colmode]");if(!b)return;S.colMode=b.dataset.colmode;save();$("#cq").value="";go("collections")});
$("#colList").addEventListener("click",e=>{if(e.target.closest("[data-libkhatma]")){S.kid="k-sh1";save();go("khatma");return}if(!e.target.closest("[data-libswitch]"))return;S.colMode=colMode()==="radio"?"live":"radio";save();renderCollections()});
$("#cq").addEventListener("input",renderCollections);
$("#colList").addEventListener("click",e=>{const b=e.target.closest("[data-libc]");if(!b)return;S.libC=b.dataset.libc;save();$("#eq").value="";go("area")});
/* a country: its places, grouped (mosques, venues, radio, TV, record companies, cities, not known) */
function renderArea(){
  const {c}=libCur(),q=norm($("#eq").value||"");
  $("#areaTitle").textContent=libName(c);$("#areaAr").textContent=libOther(c);$("#areaAr").hidden=isAr();
  const M=colMode(),np=c.locList.filter(l=>l.m[M]).length;
  $("#areaCount").textContent=t(M==="radio"?"radioTitle":"liveTitle")+" · "+nRec(c.m[M])+" · "+np+" "+t(np===1?"libLocation":"libLocations");
  let h="";
  for(const k of LIB_KINDS){
    const ls=c.locList.filter(l=>l.kind===k&&l.m[M]&&(!q||norm(l.en+" "+l.ar).includes(q)||l.refs.some(r=>inColMode(r)&&norm(AREAS[r[0]].secs[r[1]].items[r[2]].slice(2).join(" ")).includes(q))));
    if(!ls.length)continue;
    h+=`<div class="sec"><h4>${t(LIB_KIND_KEY[k])}</h4></div><div class="card llist">${ls.map(l=>`<button class="lrow" data-libl="${l.id}"><span class="tx"><b>${libName(l)}</b>${libOther(l)?`<small lang="ar" dir="rtl">${l.ar}</small>`:""}</span><span class="cnt">${l.m[M]}</span><svg class="chev flip" data-ic="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${P.chev}</svg></button>`).join("")}</div>`;
  }
  $("#eglist").innerHTML=h||`<div class="empty">${t("noResults")}</div>`;
}
$("#eq").addEventListener("input",renderArea);
$("#eglist").addEventListener("click",e=>{const b=e.target.closest("[data-libl]");if(!b)return;S.libL=b.dataset.libl;S.libF={};save();$("#lq").value="";go("loc")});
/* a place: its recordings, with filters (type, year, surah, length) and sorting */
function libRow(ai,si,ii,sub){
  const tr=egTrack(ai,si,ii),it=AREAS[ai].secs[si].items[ii],d=libLen(it);
  const meta=sub!=null?sub:[(isAr()&&LIB_DEC_AR[it[4]])||it[4]||t("libNoDate"),t(LIB_TYPE_KEY[libRecType(ai,si,ii)]),d?fx2("libMin",{n:numFmt(Math.round(d/60))}):""].filter(Boolean).join(" · ");
  return `<div class="row${cur&&cur.k===tr.k?" playing":""}"><div class="tx"><b>${trTitle(tr)}</b><small>${meta}</small></div><button class="playc" data-play="eg:${ai}:${si}:${ii}">${ic("play")}</button></div>`;
}
const fx2=(k,o)=>t(k).replace(/\{(\w)\}/g,(_,x)=>o[x]);
function libRecType(ai,si,ii){const r=lib().refOf.get(AREAS[ai].secs[si].items[ii][0]+":"+AREAS[ai].secs[si].items[ii][1]),l=r&&lib().byId[r.c].locs.get(r.l);return libType(AREAS[ai].secs[si].en,l?l.kind:"")}
/* the recordings of a place, filtered and sorted as chosen (also the play queue) */
function libView(l){
  const f=S.libF||{},q=norm(($("#lq")&&$("#lq").value)||"");
  let rs=l.refs.map((r,ord)=>({r,ord,it:AREAS[r[0]].secs[r[1]].items[r[2]]})).filter(x=>inColMode(x.r));
  if(f.type)rs=rs.filter(x=>libRecType(...x.r)===f.type);
  if(f.year)rs=rs.filter(x=>f.year==="none"?!libDecade(x.it[4]):libDecade(x.it[4])===f.year);
  if(f.surah)rs=rs.filter(x=>trSurahs(egTrack(...x.r)).includes(+f.surah));
  if(f.len&&LIBLEN.map)rs=rs.filter(x=>{const d=libLen(x.it)/60;return f.len==="s"?d>0&&d<10:f.len==="m"?d>=10&&d<=30:d>30});
  if(q)rs=rs.filter(x=>norm(x.it.slice(2).join(" ")).includes(q));
  const s=f.sort||"list";
  const sur=x=>trSurahs(egTrack(...x.r))[0]||999;
  rs.sort((x,y)=>s==="year"?(libYear(x.it[4])||9999)-(libYear(y.it[4])||9999)||x.ord-y.ord:s==="yeard"?libYear(y.it[4])-libYear(x.it[4])||x.ord-y.ord:
    s==="surah"?sur(x)-sur(y)||x.ord-y.ord:s==="len"?libLen(y.it)-libLen(x.it)||x.ord-y.ord:s==="lena"?(libLen(x.it)||1e9)-(libLen(y.it)||1e9)||x.ord-y.ord:x.ord-y.ord);
  return rs;
}
function renderLoc(){
  const {c,l}=libCur();if(!l)return;
  $("#locTitle").textContent=libName(l);$("#locAr").textContent=libOther(l);$("#locAr").hidden=isAr()||!l.ar;
  const M=colMode(),mine=l.refs.filter(inColMode);
  $("#locCountry").textContent=libName(c)+" · "+t(M==="radio"?"radioTitle":"liveTitle")+" · "+nRec(mine.length);
  const f=S.libF=S.libF||{};
  /* filters offer only what this place has */
  const types=[...new Set(mine.map(r=>libRecType(...r)))],years=[...new Set(mine.map(r=>libDecade(AREAS[r[0]].secs[r[1]].items[r[2]][4])||"none"))].sort();
  const surahs=[...new Set(mine.flatMap(r=>trSurahs(egTrack(...r))))].sort((a,b)=>a-b);
  const opt=(v,lab,cur)=>`<option value="${v}"${String(cur||"")===String(v)?" selected":""}>${lab}</option>`;
  $("#locFilters").innerHTML=
    (types.length>1?`<div class="chips">${[["",t("libAll")],...types.map(x=>[x,t(LIB_TYPE_KEY[x])])].map(([v,lab])=>`<button class="chip${(f.type||"")===v?" on":""}" data-lft="${v}">${lab}</button>`).join("")}</div>`:"")+
    `<div class="lsel">`+
    (years.length>1?`<label><span>${t("libYear")}</span><select data-lf="year">${opt("",t("libAllYears"),f.year)}${years.map(y=>opt(y,y==="none"?t("libNoDate"):(isAr()?(LIB_DEC_AR[y]||y):y),f.year)).join("")}</select></label>`:"")+
    (surahs.length>1?`<label><span>${t("libSurah")}</span><select data-lf="surah">${opt("",t("libAllSurahs"),f.surah)}${surahs.map(n=>opt(n,numFmt(n)+". "+(isAr()?SURAHS[n-1][0]:SURAHS[n-1][1]),f.surah)).join("")}</select></label>`:"")+
    (LIBLEN.map&&mine.length>1?`<label><span>${t("libLen")}</span><select data-lf="len">${opt("",t("libAnyLen"),f.len)}${opt("s",t("libShort"),f.len)}${opt("m",t("libMid"),f.len)}${opt("l",t("libLong"),f.len)}</select></label>`:"")+
    (mine.length>1?`<label><span>${t("libSort")}</span><select data-lf="sort">${[["list","libSortList"],["year","libSortYear"],["yeard","libSortYearD"],["surah","libSortSurah"]].concat(LIBLEN.map?[["len","libSortLen"],["lena","libSortLenA"]]:[]).map(([v,k])=>opt(v,t(k),f.sort||"list")).join("")}</select></label>`:"")+
    `</div>`;
  const rs=libView(l);
  $("#locList").innerHTML=rs.length?`<div class="card">${rs.map(x=>libRow(...x.r)).join("")}</div>`:`<div class="empty">${t("libNone")}</div>`;
  if(!LIBLEN.map){const p=libLengths();if(p)p.then(m=>{if(m&&$("#loc").classList.contains("on"))renderLoc()})}
}
$("#lq").addEventListener("input",()=>{const {l}=libCur();const rs=libView(l);$("#locList").innerHTML=rs.length?`<div class="card">${rs.map(x=>libRow(...x.r)).join("")}</div>`:`<div class="empty">${t("libNone")}</div>`});
$("#locFilters").addEventListener("click",e=>{const b=e.target.closest("[data-lft]");if(!b)return;S.libF=Object.assign(S.libF||{},{type:b.dataset.lft});save();renderLoc()});
$("#locFilters").addEventListener("change",e=>{const s=e.target.closest("[data-lf]");if(!s)return;S.libF=Object.assign(S.libF||{},{[s.dataset.lf]:s.value});save();renderLoc()});
/* older names used by other parts of the app */
function renderEgypt(){renderCollections();if($("#area").classList.contains("on"))renderArea();if($("#loc").classList.contains("on"))renderLoc()}
