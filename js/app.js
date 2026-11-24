/* Start-up: splash, icons, theme/language, then press feedback for every tappable item */
/* boot */
const SPLASH_IMG="assets/images/splash.jpg";
$("#spImg").src=SPLASH_IMG;
$$("[data-ic]").forEach(s=>{const n=s.dataset.ic;s.setAttribute("viewBox","0 0 24 24");s.setAttribute("fill","none");s.setAttribute("stroke","currentColor");s.setAttribute("stroke-width","1.7");s.setAttribute("stroke-linecap","round");s.setAttribute("stroke-linejoin","round");s.innerHTML=P[n]||""});
$$("[data-mosque]").forEach(s=>s.innerHTML=MOSQUE);
renderSwatches();applyLang();

let booted=false;
function leaveSplash(){
  if(booted)return;booted=true;
  const want=location.hash.slice(1);
  if(!S.lang){go("language",true)}
  else go(SCREENS.includes(want)&&want!=="language"?want:"home",true);
}
$("#splash").addEventListener("click",leaveSplash);
setTimeout(leaveSplash,2000);

/* press feedback for every tappable thing */
(function(){
  const SEL='button,a,label,select,summary,[role=button],[data-go],[data-back],[data-play],[data-area],[data-act],[data-tab],[data-ntab],[data-k],[data-kind],[data-kplay],[data-lang],[data-colmode],[data-libc],[data-libl],[data-lft],[data-bgc],[data-egsec],[data-share],[data-shr],[data-pick],[data-np],[data-npgo],[data-riw],[data-sgo],[data-trgo],[data-vact],[data-vgo],[data-vmenu],[data-vplay],[data-vsu],[data-theme],.row,.w,.tv[data-v],.tile,.atile,.chip,.li';
  let cur=null,t0=0;
  function find(el){
    for(let e=el;e&&e!==document.body;e=e.parentElement){
      if(e.matches&&e.matches(SEL))return e;
      if(e.id==="splash")return null;
    }
    return null;
  }
  function down(ev){
    if(ev.button>0)return;
    const e=find(ev.target);if(!e||e.disabled)return;
    if(e.matches('input[type=range],input[type=text],input[type=search],textarea'))return;
    release(true);
    const r=e.getBoundingClientRect(),cs=getComputedStyle(e);
    const sz=(cs.transform!=="none"||cs.position==="fixed"||e.classList.contains("w"))?"":(r.width<=160&&r.height<=90)?"tsm":(r.width<=window.innerWidth*.98&&r.height<=160)?"tmd":"tlg";
    e.classList.add("tapr","tapd");if(sz)e.classList.add(sz);
    cur=e;t0=performance.now();
  }
  function release(now){
    if(!cur)return;const e=cur;cur=null;
    const left=now===true?0:Math.max(0,140-(performance.now()-t0));
    setTimeout(()=>{e.classList.remove("tapd","tsm","tmd","tlg");setTimeout(()=>e.classList.remove("tapr"),260)},left);
  }
  document.addEventListener("pointerdown",down,{passive:true,capture:true});
  ["pointerup","pointercancel","dragstart"].forEach(n=>document.addEventListener(n,()=>release(),{passive:true,capture:true}));
  document.addEventListener("scroll",()=>release(true),{passive:true,capture:true});
  document.addEventListener("keydown",ev=>{if((ev.key==="Enter"||ev.key===" ")&&find(ev.target)){cur=find(ev.target);cur.classList.add("tapr","tapd","tmd");t0=performance.now();release()}});
})();
