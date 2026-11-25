/* Recognition engine, stage "ingest" (docs/RECOGNITION-DESIGN.md §2): any audio or video file → mono 16 kHz samples,
   loudness-normalised, with the recitation separated from silence, noise and music before or after it.
   Only the SOUND is used: video frames, captions and titles are never read.

   ENGINE.ingest(blob, {maxSecs}) → {pcm, sr, dur, cut, decoder, format, frames:{hop, voiced, energy}, sections, start}
     pcm       Float32Array, 16 kHz mono, RMS-normalised (the original file is never changed)
     decoder   "browser" (decodeAudioData) or "ffmpeg" (ffmpeg.wasm, loaded only when the browser can't decode the file)
     sections  [{a, b, kind}] seconds; kind "recitation" | "silence" | "other" (noise, music, speech without a voice pitch)
     start     where the recitation begins (seconds), or 0 if none was found
*/
(function(G){
const E=G.ENGINE||(G.ENGINE={});
const SR=16000;
const FF={ver:"0.12.10",core:"0.12.6",base:"https://cdn.jsdelivr.net/npm/"};

function sniff(u8){
  const s=n=>String.fromCharCode(...u8.subarray(n,n+4));
  if(s(4)==="ftyp"){const b=s(8);return /^qt/.test(b)?"mov":/^(M4A|M4B)/.test(b)?"m4a":/^3g/.test(b)?"3gp":"mp4"}
  if(s(0)==="RIFF")return s(8)==="WAVE"?"wav":s(8)==="AVI "?"avi":"riff";
  if(s(0)==="OggS")return "ogg";if(s(0)==="fLaC")return "flac";
  if(u8[0]===0x1a&&u8[1]===0x45&&u8[2]===0xdf&&u8[3]===0xa3)return "mkv/webm";
  if(s(0)==="ID3"||(u8[0]===0xff&&(u8[1]&0xe0)===0xe0))return u8[0]===0xff&&(u8[1]&0xf6)===0xf0?"aac":"mp3";
  if(s(0)==="#!AM")return "amr";
  if(u8[0]===0x30&&u8[1]===0x26&&u8[2]===0xb2&&u8[3]===0x75)return "asf/wma";
  return "unknown";
}

async function decodeBrowser(buf,maxSecs){
  const AC=G.AudioContext||G.webkitAudioContext;if(!AC)throw new Error("no WebAudio");
  const ac=new AC();let ab;
  try{ab=await new Promise((res,rej)=>{const p=ac.decodeAudioData(buf,res,rej);if(p&&p.then)p.then(res,rej)})}finally{try{ac.close()}catch(e){}}
  const dur=Math.min(ab.duration,maxSecs),n=Math.max(1,Math.ceil(dur*SR));
  const OAC=G.OfflineAudioContext||G.webkitOfflineAudioContext;
  const oc=new OAC(1,n,SR);const src=oc.createBufferSource();src.buffer=ab;src.connect(oc.destination);src.start(0,0,dur);
  const out=await oc.startRendering();
  return {pcm:out.getChannelData(0).slice(0),full:ab.duration,ab};
}

/* ffmpeg.wasm (single-thread core, ~31 MB, cached by the browser after the first time): only for files the browser can't decode */
let ffPromise=null;
async function blobURL(url,type){const r=await fetch(url);if(!r.ok)throw new Error("ffmpeg download "+r.status);return URL.createObjectURL(new Blob([await r.arrayBuffer()],{type}))}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("script "+src));document.head.appendChild(s)})}
function ffmpeg(){
  if(ffPromise)return ffPromise;
  ffPromise=(async()=>{
    /* the ffmpeg class starts a MODULE worker, which loads the ES-module build of the core */
    const fb=FF.base+"@ffmpeg/ffmpeg@"+FF.ver+"/dist/umd/",cb=FF.base+"@ffmpeg/core@"+FF.core+"/dist/esm/";
    if(!G.FFmpegWASM)await loadScript(fb+"ffmpeg.js");
    const ff=new G.FFmpegWASM.FFmpeg();
    await ff.load({classWorkerURL:await blobURL(fb+"814.ffmpeg.js","text/javascript"),
      coreURL:await blobURL(cb+"ffmpeg-core.js","text/javascript"),wasmURL:await blobURL(cb+"ffmpeg-core.wasm","application/wasm")});
    return ff;
  })();
  ffPromise.catch(()=>{ffPromise=null});
  return ffPromise;
}
async function decodeFfmpeg(buf,maxSecs,onStep){
  onStep&&onStep("ffmpeg");
  const ff=await ffmpeg();
  await ff.writeFile("in",new Uint8Array(buf));
  try{
    const code=await ff.exec(["-i","in","-t",String(maxSecs),"-vn","-ac","1","-ar",String(SR),"-f","f32le","out.raw"]);
    if(code!==0)throw new Error("ffmpeg could not read the file");
    const d=await ff.readFile("out.raw");
    const pcm=new Float32Array(d.buffer,d.byteOffset,d.byteLength>>2).slice(0);
    return {pcm,full:null};
  }finally{try{await ff.deleteFile("in")}catch(e){}try{await ff.deleteFile("out.raw")}catch(e){}}
}

/* ---- frame analysis: 20 ms hop, 40 ms window: energy and voicing (a voice pitch 75–700 Hz) ---- */
const HOP=320,WIN=640,TMIN=Math.floor(SR/700),TMAX=Math.ceil(SR/75);
function frames(x){
  const T=Math.max(0,Math.floor((x.length-WIN)/HOP)+1),energy=new Float32Array(T),voiced=new Float32Array(T),f0=new Float32Array(T);
  const d=new Float64Array(TMAX+1),fr=new Float64Array(WIN);
  for(let t=0;t<T;t++){
    const o=t*HOP;let m=0;for(let i=0;i<WIN;i++)m+=x[o+i];m/=WIN;
    let e=0;for(let i=0;i<WIN;i++){const v=x[o+i]-m;fr[i]=v;e+=v*v}
    energy[t]=10*Math.log10(e/WIN+1e-12);
    /* YIN difference on the first WIN-TMAX samples, cumulative-mean normalised */
    const W=WIN-TMAX;let run=0,best=1,bt=0;d[0]=1;
    for(let tau=1;tau<=TMAX;tau++){let s=0;for(let j=0;j<W;j+=2){const v=fr[j]-fr[j+tau];s+=v*v}run+=s;d[tau]=run>0?s*tau/run:1;
      if(tau>=TMIN&&d[tau]<best){best=d[tau];bt=tau}}
    /* first dip below 0.2 (avoids octave errors), else the global minimum */
    for(let tau=TMIN;tau<=TMAX;tau++)if(d[tau]<0.2){while(tau<TMAX&&d[tau+1]<d[tau])tau++;best=d[tau];bt=tau;break}
    /* parabolic interpolation around the dip: sub-sample period, so small pitch movements (vibrato) are visible */
    let tf=bt;if(bt>TMIN&&bt<TMAX){const y0=d[bt-1],y1=d[bt],y2=d[bt+1],den=y0-2*y1+y2;if(Math.abs(den)>1e-9)tf=bt+Math.max(-1,Math.min(1,0.5*(y0-y2)/den))}
    voiced[t]=1-best;f0[t]=tf?SR/tf:0;
  }
  return {T,energy,voiced,f0};
}

/* ---- sections: silence / recitation / other, from the frame analysis ---- */
function sections(F,dur){
  const {T,energy,voiced}=F;if(!T)return {sections:[],start:0,floor:0};
  const sorted=Float32Array.from(energy).sort(),floor=sorted[Math.floor(T*0.1)],peak=sorted[Math.floor(T*0.98)];
  /* silence: near the quietest level, but never within 25 dB of the loudest (reverb fills the gaps and lifts the floor) */
  const silTh=Math.max(Math.min(floor+6,peak-25),peak-45);
  /* a frame is "voice" if loud enough and periodic in the voice range; smoothed over 1 s */
  const isV=new Uint8Array(T),isS=new Uint8Array(T),f0=F.f0;
  for(let t=0;t<T;t++){isS[t]=energy[t]<silTh?1:0;isV[t]=!isS[t]&&voiced[t]>0.62?1:0}
  /* an instrument holds a pitch and a loudness dead still; a voice always wavers: 0.18 s stretches whose pitch moves less
     than 0.03 semitone AND whose loudness moves less than 1.5 dB are not voice */
  const st=new Float32Array(T);for(let t=0;t<T;t++)st[t]=f0[t]>0?12*Math.log2(f0[t]/440):NaN;
  const steady=new Uint8Array(T);
  for(let t=4;t<T-4;t++){if(!isV[t])continue;let n=0,m=0,dev=0;for(let u=t-4;u<=t+4;u++)if(isV[u]){m+=st[u];n++}
    if(n<8)continue;m/=n;for(let u=t-4;u<=t+4;u++)if(isV[u])dev+=Math.abs(st[u]-m);let lo=1e9,hi=-1e9;for(let u=t-4;u<=t+4;u++){lo=Math.min(lo,energy[u]);hi=Math.max(hi,energy[u])}
    if(dev/n<0.03&&hi-lo<1.5)for(let u=t-4;u<=t+4;u++)steady[u]=1}
  for(let t=0;t<T;t++)if(steady[t])isV[t]=0;
  const W=25,dens=new Float32Array(T),sil=new Float32Array(T);let a=0,b=0;
  const cs=new Float64Array(T+1),cz=new Float64Array(T+1);for(let t=0;t<T;t++){cs[t+1]=cs[t]+isV[t];cz[t+1]=cz[t]+isS[t]}
  for(let t=0;t<T;t++){const lo=Math.max(0,t-W),hi=Math.min(T,t+W+1);dens[t]=(cs[hi]-cs[lo])/(hi-lo);sil[t]=(cz[hi]-cz[lo])/(hi-lo)}
  const lab=new Array(T);
  /* clearly voice (≥ 0.3 of frames voiced), clearly not (< 0.1), or unsure (merged into its neighbours below) */
  for(let t=0;t<T;t++)lab[t]=dens[t]>=0.3?"recitation":dens[t]<0.1?(sil[t]>0.7?"silence":"other"):"unsure";
  /* runs, short runs merged into neighbours (recitation keeps breath pauses up to 3 s) */
  let runs=[];for(let t=0;t<T;){let u=t;while(u<T&&lab[u]===lab[t])u++;runs.push({a:t,b:u,kind:lab[t]});t=u}
  const fr=s=>Math.round(s*SR/HOP);
  let changed=true;
  while(changed&&runs.length>1){changed=false;
    for(let i=0;i<runs.length;i++){const r=runs[i],len=r.b-r.a,
      edge=i===0||i===runs.length-1,
      min=r.kind==="unsure"?1e9:r.kind==="recitation"?fr(1.0):(edge?fr(1.0):fr(3.0));
      if(len<min&&(i>0||i<runs.length-1)){const p=runs[i-1],n=runs[i+1];
        const into=r.kind==="unsure"?(p&&p.kind==="recitation"?p:n&&n.kind==="recitation"?n:(p||n)):
          p&&n?(p.kind==="recitation"||n.kind!=="recitation"?p:n):(p||n);
        if(into===p){p.b=r.b}else{n.a=r.a}runs.splice(i,1);changed=true;break}}
    for(let i=1;i<runs.length;i++)if(runs[i].kind===runs[i-1].kind){runs[i-1].b=runs[i].b;runs.splice(i,1);changed=true;break}
  }
  /* sharpen the start of each recitation run: the first voiced frame within its first second (density smoothing blurs it) */
  for(const r of runs)if(r.kind==="recitation"){const lim=Math.min(r.b,r.a+fr(1.5));let s=Math.max(0,r.a-fr(0.6));
    while(s<lim&&!isV[s])s++;
    if(s<lim){
      /* the voice's first consonant or breath comes just before steady voicing: step back while the energy is clearly
         above the level of the second before (at most 0.25 s) */
      const lo=Math.max(0,s-fr(1.5));if(s-lo>=fr(0.5)){const prev=Array.from(energy.subarray(lo,Math.max(lo+1,s-fr(0.3)))).sort((x,y)=>x-y);
        const base=prev[Math.floor(prev.length*0.5)];let u=s;while(u>0&&s-u<fr(0.25)&&energy[u-1]>base+6)u--;s=u}
      else s=lo;
      const p=runs[runs.indexOf(r)-1];if(p&&p.b>s)p.b=s;r.a=s}}
  runs=runs.filter(r=>r.b>r.a);for(const r of runs)if(r.kind==="unsure")r.kind="other";
  const sec=runs.map(r=>({a:+(r.a*HOP/SR).toFixed(2),b:+Math.min(dur,r.b*HOP/SR+WIN/SR).toFixed(2),kind:r.kind}));
  const first=sec.find(s=>s.kind==="recitation");
  return {sections:sec,start:first?first.a:0,floor};
}

function normalise(x,F){
  /* RMS of the loud (non-silent) frames → 0.1; peaks limited to ±1 */
  let s=0,n=0;const th=F.T?Float32Array.from(F.energy).sort()[Math.floor(F.T*0.5)]:-200;
  for(let t=0;t<F.T;t++)if(F.energy[t]>=th){s+=Math.pow(10,F.energy[t]/10);n++}
  const rms=n?Math.sqrt(s/n):Math.sqrt(x.reduce((a,v)=>a+v*v,0)/Math.max(1,x.length));
  const g=rms>1e-6?0.1/rms:1;
  for(let i=0;i<x.length;i++){let v=x[i]*g;x[i]=v>1?1:v<-1?-1:v}
  return g;
}

E.ingest=async function(blob,opts){
  opts=opts||{};const maxSecs=opts.maxSecs||600,onStep=opts.onStep;
  const buf=await blob.arrayBuffer(),format=sniff(new Uint8Array(buf,0,Math.min(64,buf.byteLength)));
  let r,decoder="browser",why=null;
  try{r=await decodeBrowser(buf.slice(0),maxSecs)}catch(e){why=String(e&&e.message||e)}
  if(!r||!r.pcm.length){
    if(opts.noFfmpeg)throw Object.assign(new Error("decode"),{code:"decode",why});
    try{r=await decodeFfmpeg(buf,maxSecs,onStep);decoder="ffmpeg"}catch(e){throw Object.assign(new Error("decode"),{code:"decode",why:why+" / "+(e&&e.message||e)})}
  }
  const x=r.pcm,dur=x.length/SR;
  const F=frames(x);
  const gain=normalise(x,F);
  const S=sections(F,dur);
  return {pcm:x,sr:SR,dur,cut:r.full!=null&&r.full>maxSecs,full:r.full,decoder,format,gain,
    frames:{hop:HOP/SR,energy:F.energy,voiced:F.voiced,f0:F.f0},sections:S.sections,start:S.start,ab:r.ab||null};
};
E.ingestParts={sniff,frames,sections,SR,HOP};
})(typeof window!=="undefined"?window:globalThis);
