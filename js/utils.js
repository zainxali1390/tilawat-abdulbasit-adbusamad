/* Small shared helpers */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const t=k=>((I18N[S.lang]||I18N.en)[k]??I18N.en[k]??k);
const au=$("#au");
let cur=null; // {rec, n}

function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("on");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("on"),2200)}
function fmt(s){if(!isFinite(s))return"0:00";s=Math.floor(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
const arNum=n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[ٓ-ٕ]/g,"").replace(/ة/g,"ه").replace(/[̀-ًͯ-ْٰʿʾ'’\-\s]/g,"").replace(/[أإآٱ]/g,"ا");
