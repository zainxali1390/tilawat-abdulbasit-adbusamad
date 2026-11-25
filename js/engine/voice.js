/* Recognition engine, stage "voice" (docs/RECOGNITION-DESIGN.md §3.4, §4.5; docs/RECOGNITION-VOICE.md).
   "Does this sound like Abdul Basit?" A speaker-embedding model turns a few seconds of voice into a vector; the vector is
   compared with reference vectors of Abdul Basit taken from the archive (several, because his voice changed from the
   1950s to the 1980s). Used only to explain a "no match" and to stop a Confirmed when the voice is clearly someone else,
   never to pick a recording (one voice recites every recording in the archive).

   VOICE.fbank(pcm16k)          → {data: Float32Array(T*80), T}  Kaldi-compatible 80-band log filterbank, 25 ms / 10 ms,
                                   mean-normalised over time (what the models were trained on)
   VOICE.segments(pcm16k, sec)  → [[a, b], …] sample ranges with enough voice, for embedding
   VOICE.cosine(a, b), VOICE.score(emb, ref) → best cosine against the reference centroids
   Model running is left to the caller (onnxruntime-web in the browser, onnxruntime-node in tests), so this file stays
   pure and testable. */
(function(G){
const V=G.VOICE||(G.VOICE={});
const SR=16000,WIN=400,HOP=160,NFFT=512,NMEL=80,PRE=0.97;
let win=null,melW=null,cosT,sinT,rev;
function init(){
  if(win)return;
  win=new Float64Array(WIN);
  for(let i=0;i<WIN;i++)win[i]=Math.pow(0.5-0.5*Math.cos(2*Math.PI*i/(WIN-1)),0.85);   // Kaldi "povey" window
  /* Kaldi mel bank: 20 Hz to Nyquist, mel = 1127 ln(1 + f/700), triangles in the mel domain, over FFT bins 0..NFFT/2-1 */
  const mel=f=>1127*Math.log(1+f/700),lo=mel(20),hi=mel(SR/2),d=(hi-lo)/(NMEL+1);
  melW=[];
  for(let m=0;m<NMEL;m++){
    const l=lo+m*d,c=l+d,r=c+d,w=new Float64Array(NFFT/2);let first=-1,last=-1;
    for(let k=0;k<NFFT/2;k++){const mk=mel(k*SR/NFFT);let v=0;
      if(mk>l&&mk<r)v=mk<=c?(mk-l)/(c-l):(r-mk)/(r-c);
      w[k]=v;if(v>0){if(first<0)first=k;last=k}}
    melW.push({first,last,w});
  }
  cosT=new Float64Array(NFFT/2);sinT=new Float64Array(NFFT/2);rev=new Uint16Array(NFFT);const L=Math.log2(NFFT);
  for(let i=0;i<NFFT;i++){let r=0;for(let b=0;b<L;b++)r|=((i>>b)&1)<<(L-1-b);rev[i]=r}
  for(let i=0;i<NFFT/2;i++){cosT[i]=Math.cos(2*Math.PI*i/NFFT);sinT[i]=-Math.sin(2*Math.PI*i/NFFT)}
}
const re=new Float64Array(NFFT),im=new Float64Array(NFFT),fr=new Float64Array(WIN),pw=new Float64Array(NFFT/2+1);
function fft(){
  for(let size=2;size<=NFFT;size<<=1){const half=size>>1,step=NFFT/size;
    for(let s=0;s<NFFT;s+=size)for(let k=0;k<half;k++){const a=s+k,b=a+half,c=cosT[k*step],d=sinT[k*step];
      const tr=re[b]*c-im[b]*d,ti=re[b]*d+im[b]*c;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti}}
}
V.fbank=function(x){
  init();
  const T=x.length>=WIN?1+Math.floor((x.length-WIN)/HOP):0,out=new Float32Array(T*NMEL);
  for(let t=0;t<T;t++){
    const o=t*HOP;let mean=0;
    for(let i=0;i<WIN;i++){fr[i]=x[o+i]*32768;mean+=fr[i]}
    mean/=WIN;for(let i=0;i<WIN;i++)fr[i]-=mean;                       // remove DC per frame
    for(let i=WIN-1;i>0;i--)fr[i]-=PRE*fr[i-1];fr[0]-=PRE*fr[0];         // pre-emphasis
    re.fill(0);im.fill(0);
    for(let i=0;i<WIN;i++)re[rev[i]]=fr[i]*win[i];
    fft();
    for(let k=0;k<=NFFT/2;k++)pw[k]=re[k]*re[k]+im[k]*im[k];
    for(let m=0;m<NMEL;m++){const {first,last,w}=melW[m];let e=0;for(let k=first;k<=last;k++)e+=w[k]*pw[k];
      out[t*NMEL+m]=Math.log(Math.max(e,1.1920928955078125e-7))}
  }
  /* mean normalisation over time, per band (both model families expect it) */
  for(let m=0;m<NMEL;m++){let s=0;for(let t=0;t<T;t++)s+=out[t*NMEL+m];s/=Math.max(1,T);for(let t=0;t<T;t++)out[t*NMEL+m]-=s}
  return {data:out,T};
};
/* voiced stretches: 3 s windows (1 s steps) whose loudness is within 20 dB of the clip's loud level (and above -55 dBFS), merged into
   segments of up to `sec` seconds; a recitation clip gives one or more, silence and music beds are skipped */
V.segments=function(x,sec){
  sec=sec||6;const W=SR*3,S=SR,rms=[];
  for(let o=0;o+W<=x.length;o+=S){let e=0;for(let i=o;i<o+W;i++)e+=x[i]*x[i];rms.push(10*Math.log10(e/W+1e-12))}
  if(!rms.length)return x.length>=SR*2?[[0,x.length]]:[];
  const ref=Float64Array.from(rms).sort()[Math.floor(rms.length*0.9)],segs=[];
  let a=-1;
  for(let i=0;i<=rms.length;i++){const ok=i<rms.length&&rms[i]>ref-20&&rms[i]>-55;   // and above an absolute floor: silence is not a voice
    if(ok&&a<0)a=i;
    if((!ok||i===rms.length)&&a>=0){const s0=a*S,s1=Math.min(x.length,(i-1)*S+W);for(let s=s0;s<s1;s+=sec*SR){const e=Math.min(s1,s+sec*SR);if(e-s>=SR*2)segs.push([s,e])}a=-1}}
  return segs;
};
V.cosine=function(a,b){let s=0,na=0,nb=0;for(let i=0;i<a.length;i++){s+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i]}return s/Math.sqrt(na*nb+1e-12)};
/* reference: {centroids:[[…],…]}; the score is the best cosine to any centroid (eras differ) */
V.score=function(emb,ref){let best=-1;for(const c of ref.centroids)best=Math.max(best,V.cosine(emb,c));return best};
V.mean=function(list){const n=list[0].length,m=new Float64Array(n);for(const e of list)for(let i=0;i<n;i++)m[i]+=e[i]/list.length;return Array.from(m)};
/* one clip → one vector: the mean of the unit vectors of its voiced pieces (≤ 6 s each, at most `maxPieces`), with an
   onnxruntime (web or node) `ort` and a session for models/voice/campplus-q8.onnx */
V.embed=async function(ort,session,x,maxPieces){
  const segs=V.segments(x,6).slice(0,maxPieces||5);if(!segs.length)return null;
  let acc=null;
  for(const [a,b] of segs){
    const f=V.fbank(x.subarray(a,b));
    const e=(await session.run({[session.inputNames[0]]:new ort.Tensor("float32",f.data,[1,f.T,80])}))[session.outputNames[0]].data;
    let n=0;for(const v of e)n+=v*v;n=Math.sqrt(n)||1;
    if(!acc)acc=new Float64Array(e.length);for(let i=0;i<e.length;i++)acc[i]+=e[i]/n/segs.length;
  }
  return {emb:acc,pieces:segs.length,secs:segs.reduce((s,[a,b])=>s+(b-a)/SR,0)};
};
/* the verdict, measured in docs/RECOGNITION-VOICE.md: below the threshold the voice is UNLIKE Abdul Basit's recordings
   (no Abdul Basit test sample and 0.6 % of the edited test clips fell below it; 29 % of other reciters did). Above it, it
   says nothing: Egyptian reciters of his era score above it too. So there is no "it is Abdul Basit" verdict. */
V.judge=function(e,ref){
  if(!e||e.secs<4)return {verdict:"unknown",score:null,secs:e?e.secs:0};
  const score=V.score(e.emb,ref);
  return {verdict:score<ref.threshold?"unlike":"no-objection",score:+score.toFixed(3),threshold:ref.threshold,secs:+e.secs.toFixed(1)};
};
/* browser: VOICE.check(pcm16k) → Promise<judge result>. The model (8.6 MB) and onnxruntime-web are loaded on first use,
   in a worker, so nothing is downloaded unless a search ends without a reliable match. */
V.ORT="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
if(typeof window!=="undefined"&&typeof Worker!=="undefined"){
  const SRC=`let sess=null,ref=null,ort=null;
self.onmessage=async e=>{const m=e.data;
  try{
    if(!sess){ort=await import(m.ort+"ort.wasm.min.mjs");ort.env.wasm.wasmPaths=m.ort;ort.env.wasm.numThreads=1;
      await import(m.base+"js/engine/voice.js");
      /* kept in Cache Storage (models/ bypasses the service worker), keyed by the reference's build so a new model replaces it */
      const get=async(u,keep)=>{let c=null;try{c=await caches.open("voice-"+keep)}catch(_){}
        let r=c&&await c.match(u);if(!r){r=await fetch(u);if(!r.ok)throw new Error("voice model http "+r.status);if(c)try{await c.put(u,r.clone())}catch(_){}}return r};
      const rj=await (await fetch(m.base+"models/voice/reference.json",{cache:"no-cache"})).json();
      const mb=await (await get(m.base+"models/voice/campplus-q8.onnx",rj.build||"1")).arrayBuffer();
      sess=await ort.InferenceSession.create(new Uint8Array(mb));ref=rj}
    const v=self.VOICE,emb=await v.embed(ort,sess,m.pcm,5);self.postMessage({id:m.id,res:v.judge(emb,ref)})
  }catch(err){self.postMessage({id:m.id,err:String(err&&err.message||err)})}
};`;
  let w=null,seq=0;const wait=new Map();
  V.check=function(pcm){
    if(!w){w=new Worker(URL.createObjectURL(new Blob([SRC],{type:"text/javascript"})),{type:"module"});
      w.onmessage=e=>{const x=wait.get(e.data.id);if(!x)return;wait.delete(e.data.id);e.data.err?x.rej(new Error(e.data.err)):x.res(e.data.res)};
      w.onerror=ev=>{wait.forEach(x=>x.rej(new Error("voice worker: "+(ev.message||"failed"))));wait.clear();w=null}}
    const id=++seq,copy=pcm.slice(0);
    return new Promise((res,rej)=>{wait.set(id,{res,rej});w.postMessage({id,pcm:copy,ort:V.ORT,base:new URL("./",location.href).href},[copy.buffer])});
  };
}
})(typeof window!=="undefined"?window:globalThis);
