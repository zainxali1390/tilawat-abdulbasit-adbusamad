/* Audio fingerprints for "Find a recitation" — the same steps as tools/fingerprint/fpcore.py (keep them in step).
   Mono 8 kHz audio → 32 ms spectrogram frames → whitened log spectrum → strongest peaks → pairs of peaks (landmarks).
   Works in the browser and in Node (for tests). */
(function(G){
const FP={sr:8000,nfft:512,hop:256,fmin:20,fmax:232,white:47,pf:5,pt:4,thresh:0.6,block:31,dtmin:2,dtmax:48,dfmax:31};
const NB=FP.fmax-FP.fmin;
/* radix-2 FFT of a real frame (size 512), magnitudes of bins fmin..fmax-1 */
const N=FP.nfft,LOG=Math.log2(N),rev=new Uint16Array(N),cosT=new Float64Array(N/2),sinT=new Float64Array(N/2),win=new Float64Array(N);
for(let i=0;i<N;i++){let r=0;for(let b=0;b<LOG;b++)r|=((i>>b)&1)<<(LOG-1-b);rev[i]=r;win[i]=0.5-0.5*Math.cos(2*Math.PI*i/(N-1))}
for(let i=0;i<N/2;i++){cosT[i]=Math.cos(2*Math.PI*i/N);sinT[i]=-Math.sin(2*Math.PI*i/N)}
const re=new Float64Array(N),im=new Float64Array(N);
function frameSpec(x,off,out,o2){
  for(let i=0;i<N;i++){re[rev[i]]=x[off+i]*win[i];im[rev[i]]=0}
  for(let size=2;size<=N;size<<=1){const half=size>>1,step=N/size;
    for(let s=0;s<N;s+=size)for(let k=0;k<half;k++){const a=s+k,b=a+half,c=cosT[k*step],d=sinT[k*step];
      const tr=re[b]*c-im[b]*d,ti=re[b]*d+im[b]*c;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti}}
  for(let f=0;f<NB;f++){const k=f+FP.fmin;out[o2+f]=Math.log(Math.hypot(re[k],im[k])+1e-3)}
}
function spectrogram(x){
  const T=x.length<N?0:Math.floor((x.length-N)/FP.hop)+1,L=new Float32Array(T*NB);
  for(let t=0;t<T;t++)frameSpec(x,t*FP.hop,L,t*NB);
  return {T,L};
}
function peaks(S,perSec){
  const {T,L}=S;if(!T)return [];
  /* whitening: each bin minus its mean over ±white frames */
  const E=new Float32Array(T*NB),cs=new Float64Array((T+1)*NB),w=FP.white;
  for(let t=0;t<T;t++)for(let f=0;f<NB;f++)cs[(t+1)*NB+f]=cs[t*NB+f]+L[t*NB+f];
  for(let t=0;t<T;t++){const lo=Math.max(0,t-w),hi=Math.min(T,t+w+1),n=hi-lo;for(let f=0;f<NB;f++)E[t*NB+f]=L[t*NB+f]-Math.fround((cs[hi*NB+f]-cs[lo*NB+f])/n)}
  /* neighbourhood maximum: ±pf bins, then ±pt frames */
  const M1=new Float32Array(T*NB),M=new Float32Array(T*NB);
  for(let t=0;t<T;t++)for(let f=0;f<NB;f++){let m=-Infinity;for(let k=Math.max(0,f-FP.pf);k<=Math.min(NB-1,f+FP.pf);k++){const v=E[t*NB+k];if(v>m)m=v}M1[t*NB+f]=m}
  for(let t=0;t<T;t++)for(let f=0;f<NB;f++){let m=-Infinity;for(let k=Math.max(0,t-FP.pt);k<=Math.min(T-1,t+FP.pt);k++){const v=M1[k*NB+f];if(v>m)m=v}M[t*NB+f]=m}
  const cand=[];
  for(let t=0;t<T;t++)for(let f=0;f<NB;f++){const v=E[t*NB+f];if(v===M[t*NB+f]&&v>FP.thresh)cand.push([t,f,v])}
  /* the strongest per_sec in each ~1 s block */
  const byBlk=new Map();
  for(const c of cand){const b=Math.floor(c[0]/FP.block);if(!byBlk.has(b))byBlk.set(b,[]);byBlk.get(b).push(c)}
  const keep=[];
  for(const arr of byBlk.values()){arr.sort((a,b)=>b[2]-a[2]||a[0]-b[0]||a[1]-b[1]);for(let i=0;i<Math.min(perSec,arr.length);i++)keep.push(arr[i])}
  keep.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  return keep;
}
function landmarks(pk,fan){
  const out=[];
  for(let i=0;i<pk.length;i++){const [t1,f1]=pk[i];let got=0;
    for(let j=i+1;j<pk.length&&got<fan;j++){const [t2,f2]=pk[j],dt=t2-t1;if(dt>FP.dtmax)break;const df=f2-f1;
      if(dt>=FP.dtmin&&df>=-FP.dfmax&&df<=FP.dfmax){out.push([(f1<<12)|((df+32)<<6)|dt,t1]);got++}}}
  return out;
}
function fingerprint(x,density){return landmarks(peaks(spectrogram(x),density[0]),density[1])}
/* resample by a factor (for clips that were sped up or slowed down) — linear interpolation */
function resample(x,factor){const n=Math.floor(x.length/factor),y=new Float32Array(n);for(let i=0;i<n;i++){const p=i*factor,a=Math.floor(p),f=p-a;y[i]=(x[a]||0)*(1-f)+(x[a+1]||0)*f}return y}
G.FPRINT={FP,spectrogram,peaks,landmarks,fingerprint,resample,QUERY:[10,4],INDEX:[6,3]};
})(typeof window!=="undefined"?window:globalThis);
