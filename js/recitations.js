/* Recitations: tracks, Live/Radio collections, favourites, khatmas, YouTube khatma, file-name repair, colour swatches and sheets */
/* tracks: one playable item (a surah from a full set, or a single recording) */
const isAr=()=>S.lang==="ar";
function surahTrack(r,n){return{k:r.id+":"+n,url:r.surahs[n],n,rec:r.id}}
function egTrack(ai,si,ii){const a=AREAS[ai],sc=a.secs[si],it=sc.items[ii];
  return{k:"eg:"+it[0]+":"+it[1],url:EG_BASE[it[0]]+encodeURIComponent(it[1]),eg:1,n:0,tAr:it[2],tEn:it[3],y:it[4],pAr:it[5],pEn:it[6],aAr:a.ar,aEn:a.en,sAr:sc.ar,sEn:sc.en}}
function trTitle(tr){
  if(!tr.eg)return isAr()?"سورة "+SURAHS[tr.n-1][0]:t("surah")+" "+SURAHS[tr.n-1][1];
  return isAr()?tr.tAr:tr.tEn;
}
function trSub(tr){
  if(!tr.eg){const r=RECITATIONS.find(x=>x.id===tr.rec);return "Abdul Basit Abdul Samad"+(r?" · "+rt(r):"")}
  const p=isAr()?(tr.pAr||tr.aAr):(tr.pEn||tr.aEn);return p+(tr.y?" · "+tr.y:"");
}
function trInfo(tr){
  if(!tr.eg){const r=RECITATIONS.find(x=>x.id===tr.rec);return{style:rs(r),year:"",loc:"",src:r?r.source:""}}
  const p=isAr()?tr.pAr:tr.pEn,a=isAr()?tr.aAr:tr.aEn;
  return{style:isAr()?tr.sAr:tr.sEn,year:tr.y,loc:p&&p!==a?p+" · "+a:a,src:(tr.k||"").startsWith("kf:")?(isAr()?"مضمّن في التطبيق":"Built into the app"):"archive.org"};
}
function rowHTML(tr,attr){return `<div class="row${cur&&cur.k===tr.k?" playing":""}"><div class="tx"><b>${trTitle(tr)}</b><small>${trSub(tr)}</small></div><button class="playc" ${attr}>${ic("play")}</button></div>`}
const validTr=x=>x&&x.url&&x.k&&(!x.eg||x.tEn);
function renderRecent(){
  S.recent=S.recent.filter(validTr);
  const items=S.recent.slice(0,3);
  $("#clrRecent").hidden=!items.length;
  $("#recentList").innerHTML=items.length?items.map((tr,i)=>rowHTML(tr,`data-play="recent:${i}"`)).join(""):`<div class="empty">${t("noRecent")}</div>`;
}
$("#clrRecent").addEventListener("click",()=>{S.recent=[];save();renderRecent()});

function renderFavs(){
  S.favs=S.favs.filter(validTr);
  const q=norm($("#fq").value||"");
  const items=S.favs.map((tr,i)=>[tr,i]).filter(([tr])=>!q||norm(trTitle(tr)+trSub(tr)).includes(q));
  $("#favList").innerHTML=items.length?`<div class="card">${items.map(([tr,i])=>rowHTML(tr,`data-play="fav:${i}"`)).join("")}</div>`
    :`<div class="empty u-pt60">${ic("star")}<b>${t("noFav")}</b>${t("noFavSub")}</div>`;
}
/* Live and Radio are two views of the same collection: radio sections (and BBC) go to Radio, everything else to Live */
const isRadioSec=(a,sc)=>a.id==="bbc"||/radio/i.test(sc.en);
const nRec=n=>n+" "+(n===1&&S.lang==="en"?"recording":t("recordings"));
/* the library screens (countries, places, recordings) are in js/library.js */
$("#fq").addEventListener("input",renderFavs);
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}



/* ===== KHATMAS ===== */
const KHATMAS=[
 {id:"k-mur",grp:"full",rec:"murattal",ar:"المصحف المرتل · حفص",en:"Murattal · Hafs",src:"mp3quran.net"},
 {id:"k-muj",grp:"full",rec:"mujawwad",ar:"المصحف المجود · حفص",en:"Mujawwad · Hafs",src:"mp3quran.net"},
 {id:"k-war",grp:"full",rec:"warsh",ar:"المصحف المرتل · ورش عن نافع (المغرب)",en:"Murattal · Warsh ʿan Nāfiʿ (recorded in Morocco)",src:"mp3quran.net"},
 {id:"k-egr",grp:"full",ia:"62-56",ar:"المصحف المرتل · نسخة الإذاعة المصرية الأصلية",en:"Murattal · Egyptian Radio original",src:"archive.org · 62-56"},
 {id:"k-kwt",grp:"full",ia:"14-109-58",ar:"المصحف المرتل · إذاعة الكويت 1976",en:"Murattal · Kuwait Radio 1976",src:"archive.org · 14-109-58"},
 {id:"k-arb2",grp:"muj",ia:"075127",ia2:"067-142-165",qPrefix:1,files:[["assets/audio/arbaa-001.webm","الربع ١ · الفاتحة ١–٧ والبقرة ١–٢٥","Quarter 1 · Al-Fātiḥah 1–7 · Al-Baqarah 1–25"],["assets/audio/arbaa-002.webm","الربع ٢ · البقرة ٢٦–٥٠","Quarter 2 · Al-Baqarah 26–50"]],ar:"الختمة المجودة الأولى · ختمة الأرباع",en:"First Mujawwad Khatma · Khatmat al-Arbaʿ",src:"",noteEn:"239 quarter-recitations; 46 are lost",noteAr:"٢٣٩ تلاوة بعدد الأرباع، منها ٤٦ مفقودة"},
 {id:"k-m1",grp:"muj",ia:"02-2-54-91.mp-3_202509",ar:"المصحف المجود الأول · نادر",en:"First Mujawwad Mushaf · rare",src:"archive.org"},
 {id:"k-m69",grp:"muj",ia:"54-maryam-66-taha-69",ar:"الختمة المجودة الثانية 1969 · نسخة أصلية",en:"Second Mujawwad Khatma, 1969 · original, no effects",src:"archive.org"},
 {id:"k-ahz",grp:"muj",ia:"55.-55_202509",ar:"المصحف المجود النادر · ختمة الأحزاب",en:"Rare Mujawwad · Khatmat al-Aḥzāb",src:"archive.org"},
 {id:"k-sh2",grp:"shared",ia:"30_20190919",ar:"الختمة المشتركة الثانية · ختمة الأربعة الكبار 1969",en:"Second Shared Khatma · the Four Greats, 1969",src:"archive.org · 30_20190919",noteEn:"His part of the mujawwad khatma shared with al-Husary, al-Banna and Mustafa Ismail",noteAr:"نصيبه من الختمة المجودة المشتركة مع الحصري والبنا ومصطفى إسماعيل"},
 {id:"k-sh1",grp:"shared",ia:"1115125",ar:"الختمة المشتركة الأولى · أوائل الخمسينيات",en:"First Shared Khatma · early 1950s",src:"archive.org · 1115125",noteEn:"His portion of a khatma shared by 13 reciters",noteAr:"نصيبه من ختمة اشترك فيها ١٣ قارئًا"}
];
const KGRP={full:["Complete mushafs","المصاحف الكاملة"],muj:["Mujawwad khatmas","الختمات المجودة"],shared:["Shared khatmas","الختمات المشتركة"]};
function kp(id){S.kp=S.kp||{};return S.kp[id]=S.kp[id]||{done:[],last:0}}
const kCache={};
function iaList(id){ // exact file list straight from archive.org, cached on the device
  if(kCache[id])return Promise.resolve(kCache[id]);
  const c=lsGet("ia2:"+id);if(c){kCache[id]=c;return Promise.resolve(c)}
  return fetch("https://archive.org/metadata/"+encodeURIComponent(id)+"/files").then(r=>r.json()).then(j=>{
    const all=j.result||j.files||[];
    const fs=all.filter(f=>/\.mp3$/i.test(f.name)&&!/_64kb\.mp3$/i.test(f.name)&&(f.source==="original"||(f.source==="derivative"&&f.original&&!/\.mp3$/i.test(f.original))))
      .map(f=>{const o=f.source==="derivative"?all.find(x=>x.name===f.original):null;return [f.name,(o&&o.title)||f.title||""]});
    kCache[id]=fs;lsSet("ia2:"+id,fs);return fs;
  });
}
function arLabel(name,title){
  let nm=name;try{if(/%[0-9A-F]{2}/i.test(nm))nm=decodeURIComponent(nm)}catch(e){}
  let s=(/[؀-ۿ]/.test(title)?title:nm).split("/").pop().replace(/(\.mp3)+$/i,"");
  s=s.replace(/([\u0621-\u064A])(\d)/g,"$1 $2");
  s=s.replace(/(^|[\s\-–(])(ال\s+عمران|العمران)(?=$|[\s\-–)])/g,"$1آل عمران");
  return s.replace(/(^|\D)0+(\d)/g,"$1$2").replace(/\s*-{2,}\s*/g," – ").replace(/\s*\(\d+\)/g,"").replace(/^\s*(الربع\s*)?\d+(?:\s*-\s*\d+(?=\s))?[\s\-_.]*/,"").replace(/_uP_bY.*$/i,"").replace(/\s{2,}/g," ").trim()||s;
}
function arToEn(s){
  arToEn.last=null;
  s=s.replace(/آل عمران/g,"آل_عمران");
  // a title written in English letters, e.g. "Yusuf 22 - 67"
  if(!/[\u0600-\u06FF]/.test(s)){const lk=x=>x.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z]/g,"").replace(/^(al|an|ar|as|at|ad|az|ash)(?=[a-z]{3})/,"");
    const m=s.match(/^\s*([A-Za-z'\- ]+?)\s*(\d+)\s*[-–]\s*(\d+)/);if(m){const i=SURAHS.findIndex(x=>lk(x[1])===lk(m[1]));if(i>=0){arToEn.last=i;return SURAHS[i][1]+" "+m[2]+" – "+m[3]}}}
  s=s.replace(/^.*?عبد\s*الصمد\s*/,"")
     .replace(/الحزب\s+(\d+|ال\S+(\s+عشر)?)\s*/g," ")
     .replace(/سور[ىي](?=\s)/g,"سورة")
     .replace(/(\d)(من|الى|إلى)/g,"$1 $2")
     .replace(/(?:ال)?[اآ]ي[ةه]\s+/g,m=>m.replace(/الآية|الآيه/,"الاية"))
     .replace(/من\s+[اأ]ول\s+سور[ةه]\s+(\S+)\s+(?:الى|إلى|حتى)\s+(?:ال)?[اآ]ي[ةه]\s+(\d+)(?!\s*من\s+سور)/g," $1 1 – $2 ")
     .replace(/(?:الى|إلى)\s+سور[ةه]\s+(\S+)\s+(?:ال)?[اآ]ي[ةه]\s+(\d+)/g," الى $1 $2 ")
     .replace(/سور[ةه]\s+(?=\S)/g,m=>m)
     .replace(/(\d+)\s+(?:الى|إلى)\s+(\d+)/g," $1 – $2 ");
  s=s.replace(/ختام\s+(ال)?قر[اآ]ن(\s+الكريم)?/g," ختام ")
     .replace(/(?:الى|إلى|حتى)\s+(?:ال)?[اآ]ي[ةه]\s+(\d+)\s+من\s+سور[ةه]\s+(\S+)/g," الى $2 $1 ")
     .replace(/من\s+(?:ال)?[اآ]ي[ةه]\s+(\d+)\s+من\s+سور[ةه]\s+(\S+)/g," $2 $1 ")
     .replace(/من\s+(?:ال)?[اآ]ي[ةه]\s+(\d+)\s+(?:الى|إلى|حتى)\s+(?:ال)?[اآ]ي[ةه]\s+(\d+)/g," $1 – $2 ")
     .replace(/(?:ال)?[اآ]ي[ةه]\s+(\d+)\s+من\s+سور[ةه]\s+(\S+)/g," الى $2 $1 ")
     .replace(/(\d+)\s+(?:الى|إلى|حتى)\s+(?:ال)?[اآ]ي[ةه]\s+(\d+)/g," $1 – $2 ")
     .replace(/(?:الى|إلى|حتى)\s+[اآ]خر\s+السور[ةه]/g," آخر ")
     .replace(/(?:الى|إلى|حتى)\s+[اآ]خر\s+سور[ةه]\s+(\S+)/g," الى_آخر $1 ")
     .replace(/من\s+[اأ]ول\s+سور[ةه]\s+/g," ")
     .replace(/آل عمران/g,"آل_عمران");
  const out=[];let last="";
  s.replace(/[-–—]+/g," – ").split(/\s+/).forEach(w=>{
    if(!w)return;
    if(/^\d+$/.test(w)){out.push(String(+w));last="n";return}
    if(w==="–"){if(last&&last!=="d"){out.push("–");last="d"}return}
    if(/^ال\S{4,}$/.test(w)&&!SURAHS.some(su=>norm(su[0])===norm(w))){const nw=norm(w);
      const near=SURAHS.findIndex(su=>{const a=norm(su[0]);if(Math.abs(a.length-nw.length)>1||a.length<5)return false;let d=0;for(let k=0,j=0;k<a.length||j<nw.length;){if(a[k]===nw[j]){k++;j++;continue}d++;if(d>1)return false;if(a.length>nw.length)k++;else if(nw.length>a.length)j++;else{k++;j++}}return true});
      if(near>=0)w=SURAHS[near][0]}
    if(w==="ختام"){out.push(last==="d"?"the end of the Qurʾan":"to the end of the Qurʾan");last="w";return}
    if(w==="الى_آخر"){out.push("to");last="e";return}
    w=w.replace(/_/g," ");
    for(const x of [w,w.replace(/^و/,"")]){const i=SURAHS.findIndex(su=>norm(su[0])===norm(x));
      if(i>=0){
        if(last==="e"){if(out.lastSurah===i){out[out.length-1]="to end"}else out.push(SURAHS[i][1]);out.lastSurah=i;last="w";return}
        if(last==="s"||last==="n")out.push("·");out.push(SURAHS[i][1]);out.lastSurah=i;last="s";return}}
    if(/^(آخر|اخر|نهاية)/.test(w)){if(out[out.length-1]==="to")out[out.length-1]="to end";else out.push("to end");last="w"}else if(/^دعاء/.test(w)){out.push("Duʿāʾ");last="s"}else if(w==="إلى"||w==="الى"||w==="وحتى"){out.push("to");last="d"}
  });
  arToEn.last=out.lastSurah!=null?out.lastSurah:null;
  return out.join(" ").replace(/\s·\s(?=to\b)/g," ").replace(/^\d+\s·\s(?=\D)/,"").replace(/^[–·]\s*|\s*[–·]$/g,"").trim()||s;
}
function qKey(label,name){
  const ws=label.replace(/[-–]+/g," ").split(/\s+/);
  for(let i=0;i<ws.length;i++){
    for(const x of [ws[i],ws[i].replace(/^و/,""),(ws[i]+" "+(ws[i+1]||""))]){
      const k=SURAHS.findIndex(su=>norm(su[0])===norm(x));
      if(k>=0){const v=(ws.slice(i+1).find(z=>/^\d+$/.test(z))|0);return (k+1)*1000+Math.min(v,999)}
    }
  }
  const m=name.match(/(\d+)/);return 200000+(m?+m[1]:0);
}
async function kTracks(K){
  if(K.empty)return [];
  let own=[];
  if(K.files)own=K.files.map(([file,ar,en],i)=>({k:"kf:"+K.id+":"+file,url:file[0]==="#"?file:new URL(file,location.href).href,eg:1,n:0,tAr:ar,tEn:en,y:"",pAr:K.ar,pEn:K.en,aAr:"الختمات",aEn:"Khatmas",sAr:K.ar,sEn:K.en,kh:K.id,q:i+1}));
  if(K.files&&!K.ia)return own.map((t,i)=>Object.assign(t,{ki:i}));
  if(K.files&&K.ia){
    let rest=[];
    try{rest=await kTracks(Object.assign({},K,{files:null}))}catch(e){}
    const have=new Set(own.map(t=>t.q));
    const qOf=t=>{const nm=t.k.split(":").slice(2).join(":").split("/").pop();const m=nm.match(/^\D*?(\d{1,3})/);return m?+m[1]:999};
    rest=rest.filter(t=>{t.q=qOf(t);if(have.has(t.q))return false;have.add(t.q);return true});
    if(K.ia2){ // fill quarters missing from the first copy with the second copy
      let more=[];try{more=await kTracks({id:K.id,ia:K.ia2,ar:K.ar,en:K.en})}catch(e){}
      more.forEach(t=>{t.q=qOf(t);if(t.q<999&&!have.has(t.q)){have.add(t.q);rest.push(t)}});
    }
    rest=rest
      .map(t=>Object.assign(t,{tAr:"الربع "+arNum(t.q)+" · "+t.tAr,tEn:"Quarter "+t.q+" · "+t.tEn}));
    return own.concat(rest).sort((a,b)=>a.q-b.q).map((t,i)=>Object.assign(t,{ki:i}));
  }
  if(K.rec){const r=RECITATIONS.find(x=>x.id===K.rec);return Object.keys(r.surahs).map(Number).sort((a,b)=>a-b).map(n=>surahTrack(r,n))}
  const fs=await iaList(K.ia);
  const lead=n=>{const m=n.split("/").pop().match(/^\s*(\d+)(?:\s*-\s*(\d+)(?!\d*\s*-?\s*\d))?/);return m?[+m[1],m[2]?+m[2]:0]:null};
  const numbered=fs.length>3&&fs.every(([name])=>lead(name));
  const items=fs.map(([name,title])=>{const ar=arLabel(name,title);return {name,ar,key:qKey(ar,name),ld:lead(name)}})
    .sort(numbered?(a,b)=>a.ld[0]-b.ld[0]||a.ld[1]-b.ld[1]||a.name.localeCompare(b.name):(a,b)=>a.key-b.key||a.name.localeCompare(b.name));
  let prevSu=null;
  return items.map((it,i)=>{
    let en=arToEn(it.ar);const named=arToEn.last;
    if(prevSu!=null&&/^\d/.test(en)&&/^\s*(من\s+(ال)?[اآ]ي|\d)/.test(it.ar)){en=SURAHS[prevSu][1]+" "+en}
    if(named!=null)prevSu=named;
    return {k:"kh:"+K.ia+":"+it.name,url:"https://archive.org/download/"+K.ia+"/"+it.name.split("/").map(encodeURIComponent).join("/"),eg:1,n:0,
    tAr:it.ar,tEn:en,y:"",pAr:K.ar,pEn:K.en,aAr:"الختمات",aEn:"Khatmas",sAr:K.ar,sEn:K.en,kh:K.id,ki:i}});
}
function renderKhatam(){
  $("#klist").innerHTML=Object.keys(KGRP).map(g=>`<div class="kgrp">${isAr()?KGRP[g][1]:KGRP[g][0]}</div>`+KHATMAS.filter(K=>K.grp===g).map(K=>{
    const pr=kp(K.id),tot=K.yt?K.ytCount:(K.files&&!K.ia)?K.files.length:(lsGet("kt:"+K.id)||(K.rec?114:0)),pct=tot?Math.round((K.yt?(pr.last|0):pr.done.length)/tot*100):0;
    return `<button class="card kcard" data-k="${K.id}"><b>${isAr()?K.ar:K.en}</b>${isAr()?"":`<div class="ar">${K.ar}</div>`}<small>${(isAr()?K.noteAr:K.noteEn)?(isAr()?K.noteAr:K.noteEn)+" · ":""}${K.yt?Math.min((kp(K.id).last|0),K.ytCount)+" / "+K.ytCount+" "+t("listened"):K.empty?t("noRec"):(tot?pr.done.length+" / "+tot+" "+t("listened"):t("tapToLoad"))}${K.src?" · "+K.src:""}</small><div class="kbar"><i style="width:${pct}%"></i></div></button>`}).join("")).join("");
}
$("#klist").addEventListener("click",e=>{const b=e.target.closest("[data-k]");if(!b)return;S.kid=b.dataset.k;save();go("khatma")});
let kCur={K:null,list:[]};
async function renderKhatma(){
  const K=KHATMAS.find(x=>x.id===S.kid)||KHATMAS[0];kCur.K=K;
  $("#kTitle").textContent=isAr()?"الختمة":"Khatma";
  $("#kAr").textContent=K.ar;$("#kSub").textContent=(isAr()?"":K.en)+(K.src?(isAr()?"":" · ")+K.src:"");
  if(K.yt){renderYtKhatma(K);return}
  $("#ytWrap").hidden=true;
  $("#kList").innerHTML=`<div class="mload u-muted"><div class="sp"></div>${t("loadingList")}</div>`;
  try{kCur.list=await kTracks(K)}catch(e){$("#kList").innerHTML=`<div class="empty">${t("listOffline")}</div>`;return}
  lsSet("kt:"+K.id,kCur.list.length);
  if(!kCur.list.length){$("#kList").innerHTML=`<div class="empty">${t("noRec")}</div>`;$("#kResume").hidden=true;$("#kReset").hidden=true;$(".khead .kbar").hidden=true;$("#kBar").style.width="0";$("#kProg").textContent="";return}
  $("#kResume").hidden=false;$("#kReset").hidden=false;$(".khead .kbar").hidden=false;
  drawKhatma();
}
function drawKhatma(){
  const K=kCur.K,pr=kp(K.id),L=kCur.list,tot=L.length,done=new Set(pr.done);
  $("#kBar").style.width=(tot?Math.round(done.size/tot*100):0)+"%";
  $("#kProg").textContent=done.size+" / "+tot+" "+t("listened");
  const next=Math.min(pr.last||0,tot-1);
  $("#kResume").textContent=(done.size?t("resumeAt"):t("startKhatma"))+" · "+(L[next]?trTitle(L[next]):"");
  $("#kList").innerHTML=`<div class="card">${L.map((tr,i)=>`<div class="row${done.has(i)?" isdone":""}${cur&&cur.k===tr.k?" playing":""}">${done.has(i)?`<svg class="done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${P.check}</svg>`:""}<div class="tx"><b>${i+1}. ${trTitle(tr)}</b>${K.rec||isAr()?"":`<small>${tr.tAr}</small>`}</div><button class="playc" data-kplay="${i}">${ic("play")}</button></div>`).join("")}</div>`;
}
$("#kList").addEventListener("click",e=>{const b=e.target.closest("[data-kplay]");if(!b)return;kPlay(+b.dataset.kplay)});
$("#kResume").addEventListener("click",()=>{const pr=kp(kCur.K.id);kPlay(kCur.K.yt?0:Math.min(pr.last||0,kCur.list.length-1))});
$("#kReset").addEventListener("click",()=>{S.kp[kCur.K.id]={done:[],last:0};save();kCur.K.yt?ytUpdate(kCur.K):drawKhatma()});
function kPlay(i){
  if(kCur.K&&kCur.K.yt){const n=Math.min(kp(kCur.K.id).last|0,kCur.K.ytCount-1);if(ytP&&ytP.playVideoAt)ytP.playVideoAt(n);return}
  const K=kCur.K;if(!kCur.list.length)return;
  const list=kCur.list.map((tr,j)=>Object.assign({},tr,{kh:K.id,ki:j}));
  kp(K.id).last=i;save();playQueue(list,i);go("player");
}
function kMarkDone(tr){
  if(!tr||!tr.kh)return;const pr=kp(tr.kh);
  if(!pr.done.includes(tr.ki))pr.done.push(tr.ki);pr.last=tr.ki+1;save();
  if($("#khatma").classList.contains("on"))drawKhatma();
}

/* YouTube playlist khatma (e.g. ختمة الأرباع) — played with YouTube's own player, position remembered */
let ytP=null,ytApi=null,ytFor=null;
function ytLoadApi(){
  if(ytApi)return ytApi;
  ytApi=new Promise((res,rej)=>{
    if(window.YT&&YT.Player)return res();
    window.onYouTubeIframeAPIReady=()=>res();
    const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";s.onerror=()=>{ytApi=null;rej()};document.head.appendChild(s);
    setTimeout(()=>{if(!(window.YT&&YT.Player)){ytApi=null;rej()}},12000);
  });
  return ytApi;
}
function ytUpdate(K){
  const pr=kp(K.id),n=Math.min(pr.last|0,K.ytCount);
  $("#kBar").style.width=Math.round(n/K.ytCount*100)+"%";
  $("#kProg").textContent=n+" / "+K.ytCount+" "+t("listened");
  $("#kResume").textContent=(n?t("resumeAt"):t("startKhatma"))+" · "+t("quarter")+" "+(Math.min(n,K.ytCount-1)+1);
}
async function renderYtKhatma(K){
  $("#ytWrap").hidden=false;$("#kList").innerHTML="";
  $("#kResume").hidden=false;$("#kReset").hidden=false;$(".khead .kbar").hidden=false;
  ytUpdate(K);
  if(ytP&&ytFor===K.id)return;
  try{await ytLoadApi()}catch(e){
    const i=Math.min(kp(K.id).last|0,K.ytCount-1);
    $(".ytbox").innerHTML=`<iframe src="https://www.youtube.com/embed/videoseries?list=${K.yt}&index=${i}&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;return}
  if(ytP){try{ytP.destroy()}catch(e){}; $(".ytbox").innerHTML='<div id="ytPlayer"></div>'}
  ytFor=K.id;
  ytP=new YT.Player("ytPlayer",{width:"100%",height:"100%",playerVars:{listType:"playlist",list:K.yt,index:Math.min(kp(K.id).last|0,K.ytCount-1),playsinline:1,rel:0},
    events:{onStateChange:e=>{
      if(e.data===1){if(!au.paused)au.pause();const i=ytP.getPlaylistIndex();if(i>=0){const pr=kp(K.id);pr.last=Math.max(pr.last|0,i);save();ytUpdate(K)}}
      if(e.data===0){const pr=kp(K.id);const i=ytP.getPlaylistIndex();pr.last=Math.max(pr.last|0,i+1);save();ytUpdate(K)}
    }}});
}

/* repair a mistyped archive.org file name: look it up in the item's real file list and retry once */
const normFile=s=>norm(decodeURIComponent(s).replace(/\.mp3$/i,"")).replace(/[\s\-_().،,]+/g,"");
async function repairUrl(tr){
  const m=(tr.url||"").match(/archive\.org\/download\/([^/]+)\/(.+)$/);if(!m||tr._fixed)return false;
  tr._fixed=1;
  try{const fs=await iaList(decodeURIComponent(m[1]));const want=normFile(m[2]);
    const hit=fs.find(([n])=>normFile(n)===want)||fs.find(([n])=>{const a=normFile(n);return a.includes(want)||want.includes(a)});
    if(!hit)return false;
    const url="https://archive.org/download/"+m[1]+"/"+hit[0].split("/").map(encodeURIComponent).join("/");
    if(url===tr.url)return false;tr.url=url;return true;
  }catch(e){return false}
}


function renderTranslation(){
  $("#trHead").textContent=t("surah")+" "+SURAHS[0][1];
  $("#trList").innerHTML=FATIHA.map(v=>`<div class="tv"><div class="a">${v[0]}</div>${S.trMode==="both"?`<div class="e">${v[1]}</div>`:""}</div>`).join("");
  $("#trNote").textContent=S.trMode==="both"?t("trNote"):"";
  $$("[data-tr]").forEach(b=>b.classList.toggle("on",b.dataset.tr===S.trMode));
}
$$("[data-tr]").forEach(b=>b.addEventListener("click",()=>{S.trMode=b.dataset.tr;save();renderTranslation()}));

function renderSwatches(){
  const L=document.body.classList.contains("light");
  $("#swatches").innerHTML=BGS.map(a=>`<button data-bgc="${a[0]}" class="${a[0]===S.bgc?"on":""}" style="background:radial-gradient(circle,#c9a04e 0 5px,transparent 6px),linear-gradient(135deg,${L?a[7]+","+a[6]:a[4]+","+a[1]});border:1.5px solid #c9a04e" aria-label="${a[0]}"></button>`).join("");
}
$("#swatches").addEventListener("click",e=>{const b=e.target.closest("[data-bgc]");if(!b)return;S.bgc=b.dataset.bgc;save();applyTheme()});
$$("#themeChips .chip").forEach(c=>c.addEventListener("click",()=>{S.theme=c.dataset.theme;save();applyTheme()}));
$$("[data-tg]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.tg;S[k]=!S[k];save();b.classList.toggle("on",S[k])}));
function renderToggles(){$$("[data-tg]").forEach(b=>b.classList.toggle("on",!!S[b.dataset.tg]))}

const KINDS=["murattal","mujawwad"];
const findRec=(riw,kind)=>RECITATIONS.find(r=>r.riwaya===riw&&r.kind===kind);
function riwName(k){const r=RIWAYAT.find(x=>x[0]===k);return r?(isAr()?r[2]:r[1]):""}
function renderRecSel(){
  const c=curRec(); if(!c)return;
  $("#rpRiw").textContent=riwName(c.riwaya);
  $("#rpRiwSeg").innerHTML=RIWAYAT.map(([k,en,ar])=>`<button class="${k===c.riwaya?"on":""}" data-riw="${k}">${isAr()?ar.split(" ")[0]:en.split(" ")[0]}</button>`).join("");
  $("#rpKindSeg").innerHTML=KINDS.map(k=>{const r=findRec(c.riwaya,k);return `<button class="${r&&r.id===c.id?"on":""}" data-kind="${k}"${r?"":" disabled"}>${t(k)}${r?"":`<small>${t("notRecorded")}</small>`}</button>`}).join("");
  if(sheetMode==="riwaya")$("#sheetBody").innerHTML=RIWAYAT.map(([k,en,ar])=>`<div class="grp"><h5>${isAr()?`<span class="ar u-m0">${ar}</span>`:`${en}<span class="ar">${ar}</span>`}</h5><div class="card">${KINDS.map(kd=>{const r=findRec(k,kd);return `<button class="opt${r&&r.id===c.id?" on":""}" ${r?`data-pick="${r.id}"`:"disabled"}><span class="dot"></span><span class="tx"><b>${t(kd)}</b><small>${r?(isAr()?"١١٤ سورة":"114 surahs"):t("notRecorded")}</small></span></button>`}).join("")}</div></div>`).join("");
}
function setRec(id){if(!id){closeSheet();return}const same=curRec().id===id;S.recId=id;save();renderRecSel();closeSheet();if(!same&&cur&&!cur.eg)playSurah(cur.n)}
let sheetMode="riwaya";
function openSheet(){sheetMode="riwaya";$("#sheetTitle").textContent=t("chooseRiwaya");renderRecSel();$("#scrim").classList.add("on");$("#sheet").classList.add("on")}
function closeSheet(){$("#scrim").classList.remove("on");$("#sheet").classList.remove("on")}

$("#scrim").addEventListener("click",closeSheet);
$("#sheetBody").addEventListener("click",async e=>{
  const b=e.target.closest("[data-pick]");if(b){setRec(b.dataset.pick);return}
});
$("#rpRiwSeg").addEventListener("click",e=>{const b=e.target.closest("[data-riw]");if(!b)return;const c=curRec();const r=findRec(b.dataset.riw,c.kind)||findRec(b.dataset.riw,"murattal");if(r)setRec(r.id)});
$("#rpKindSeg").addEventListener("click",e=>{const b=e.target.closest("[data-kind]");if(!b||b.disabled)return;const r=findRec(curRec().riwaya,b.dataset.kind);if(r)setRec(r.id)});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
