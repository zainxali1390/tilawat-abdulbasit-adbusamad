/* Recognition engine, stage "verification and confidence" (docs/RECOGNITION-DESIGN.md §4.4, docs/RECOGNITION-VERIFY.md).
   From the evidence of every shortlisted recording (js/engine/match.js) and the app's own finder result, one answer:
     level: "confirmed" | "high" | "possible" | "none"
     top: the recording, with its timestamp; copies: other recordings that hold the same audio (shown as "also in");
     reasons: why, in plain terms (shown under the result).
   The thresholds are measured (tools/engine/eval/verify_eval.mjs on the 640 test clips with the original present and
   hidden): "confirmed" gave no false match in the hidden runs; "high" stays at or above 98 % precision. Pure function. */
(function(G){
const V=G.VERIFY||(G.VERIFY={});
V.RULES={confirmInl:6,highInl:4,possibleMel:0.8,copyInl:6};
const strength=x=>[x.agree?1:0,x.lm.inl,x.mel.score];
const cmp=(a,b)=>{const A=strength(a),B=strength(b);for(let i=0;i<3;i++)if(A[i]!==B[i])return B[i]-A[i];return 0};
/* list: [{code, lm:{inl, span, k, b}, mel:{score, k, at, shift}, agree, verse, ts}] (run_exact.js / MATCH);
   finder: the app finder's results [{code, level}] ("confirmed" or "possible", today's rules, measured before);
   opt.rules: override thresholds (calibration). */
V.decide=function(list,finder,opt){
  opt=opt||{};const R=Object.assign({},V.RULES,opt.rules||{});
  const fin=new Map((finder||[]).map(f=>[f.code,f.level]));
  const L=(list||[]).slice().sort(cmp);
  if(!L.length)return {level:"none",reasons:opt.voice&&opt.voice.verdict==="unlike"?[{k:"noEvidence"},{k:"voiceUnlike"}]:[{k:"noEvidence"}],top:null,copies:[]};
  /* the finder's own confirmed result comes first when the engine's evidence does not clearly prefer another recording */
  let top=L[0];
  const fc=L.find(x=>fin.get(x.code)==="confirmed");
  if(fc&&fc!==top&&!(top.agree&&top.lm.inl>=R.confirmInl))top=fc;
  /* copies: other recordings whose two alignments agree with many landmark inliers, i.e. the same audio */
  const copies=L.filter(x=>x!==top&&x.agree&&x.lm.inl>=R.copyInl).map(x=>({code:x.code,ts:x.ts||null}));
  const copySet=new Set(copies.map(c=>c.code));
  const rival=L.find(x=>x!==top&&!copySet.has(x.code))||null;
  /* reasons as codes with values (shown in the user's language by V.describe) */
  const reasons=[],strong=top.agree&&top.lm.inl>=R.confirmInl,contra=top.verse==="contradict";
  const fl=fin.get(top.code);
  if(top.agree)reasons.push({k:"agree",inl:top.lm.inl,span:top.lm.span,mel:Math.round(top.mel.score*100)});
  else{if(top.lm.inl>=3)reasons.push({k:"points",inl:top.lm.inl});if(top.mel.score>0)reasons.push({k:"melody",mel:Math.round(top.mel.score*100)})}
  if(fl)reasons.push({k:fl==="confirmed"?"finderConfirmed":"finderPossible"});
  if(top.verse==="agree")reasons.push({k:"verseAgree"});
  if(contra)reasons.push({k:"verseContradict"});
  let level="none";
  if(!contra&&(strong||fl==="confirmed"))level="confirmed";
  else if(!contra&&top.agree&&(top.lm.inl>=R.highInl||(top.lm.inl>=3&&top.verse==="agree")))level="high";
  /* "possible": measured per route (verify_eval.mjs). Agreement on only 3 points gave 1 right and 26 wrong in the hidden
     runs, so it is not enough on its own; the finder's own "possible" and a strong melody with landmark support are */
  else if(fl==="possible"||(top.mel.score>=R.possibleMel&&top.lm.inl>=3)||(strong&&contra))level="possible";
  if(level==="none"){reasons.length=0;reasons.push({k:"noEvidence"});
    /* the voice check (js/engine/voice.js, Step 7) is only ever a reason here: "unlike" = the voice does not resemble
       Abdul Basit's recordings (about 28 % of other reciters, 0.5-0.6 % of his own clips) */
    if(opt.voice&&opt.voice.verdict==="unlike")reasons.push({k:"voiceUnlike"})}
  /* a strong rival lowers a confirmed answer: two different recordings both fully matching is never shown as certain */
  if(level==="confirmed"&&rival&&rival.agree&&rival.lm.inl>=R.confirmInl&&!fc){level="high";reasons.push({k:"rival"})}
  /* the time: the engine's timestamp when its two alignments agree; otherwise the finder's own (refined) place for
     that recording when it has one (an answer the finder confirmed on its own), else the engine's best */
  const fe=(finder||[]).find(f=>f.code===top.code&&f.start!=null);
  const ts=top.agree&&top.ts?top.ts:fe?{start:fe.start,end:fe.end,clipA:fe.clipA,clipB:fe.clipB,src:"finder"}:(top.ts||null);
  return {level,top:level==="none"?null:{code:top.code,ts,evidence:{lm:top.lm,mel:top.mel,agree:top.agree,verse:top.verse,finder:fl||null}},
    copies:level==="none"?[]:copies,reasons,rival:rival?{code:rival.code,agree:rival.agree,inl:rival.lm.inl,mel:rival.mel.score}:null};
};
/* English text of a reason (the app translates by the same codes, js/i18n.js, Step 14) */
V.describe=function(r){switch(r.k){
  case "agree":return `sound and melody agree on one timeline (${r.inl} matching points over ${r.span} s, melody ${r.mel} %)`;
  case "points":return `${r.inl} matching sound points`;
  case "melody":return `melody match ${r.mel} %`;
  case "finderConfirmed":return "confirmed by the sound search";
  case "finderPossible":return "found by the sound search";
  case "verseAgree":return "the verses heard match the recording at that point";
  case "verseContradict":return "the verses heard do not match the recording at that point";
  case "rival":return "another recording also matches";
  case "noEvidence":return "no recording in the archive has enough matching evidence";
  case "voiceUnlike":return "the voice does not resemble Abdul Basit's recordings; this may be another reciter";
  default:return r.k}};
})(typeof window!=="undefined"?window:globalThis);
