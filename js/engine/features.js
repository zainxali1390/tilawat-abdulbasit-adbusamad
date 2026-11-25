/* Recognition engine, stage "transforms" (docs/RECOGNITION-DESIGN.md §2): what can be measured about a clip's sound on its
   own, without knowing the original. (Pitch shift and tempo are NOT here: they only exist relative to a candidate, and are
   found by the matcher, js/finder.js, and reported with the result.)

   ENGINE.transforms(pcm16k) → {band:[lo,hi] Hz, snr dB, reverb: decay ms after voice offsets, clip: fraction of clipped
                                samples, loud dBFS, labels:[…]}
   Works in the browser and in Node (pure functions on a Float32Array). */
(function(G){
const E=G.ENGINE||(G.ENGINE={});
const SR=16000,N=1024,HOP=512;
let cosT=null,sinT=null,rev=null,win=null;
function fftInit(){
  if(cosT)return;cosT=new Float64Array(N/2);sinT=new Float64Array(N/2);rev=new Uint16Array(N);win=new Float64Array(N);const L=Math.log2(N);
  for(let i=0;i<N;i++){let r=0;for(let b=0;b<L;b++)r|=((i>>b)&1)<<(L-1-b);rev[i]=r;win[i]=0.5-0.5*Math.cos(2*Math.PI*i/(N-1))}
  for(let i=0;i<N/2;i++){cosT[i]=Math.cos(2*Math.PI*i/N);sinT[i]=-Math.sin(2*Math.PI*i/N)}
}
const re=new Float64Array(N),im=new Float64Array(N);
function power(x,o,out){
  for(let i=0;i<N;i++){re[rev[i]]=(x[o+i]||0)*win[i];im[rev[i]]=0}
  for(let size=2;size<=N;size<<=1){const half=size>>1,step=N/size;
    for(let s=0;s<N;s+=size)for(let k=0;k<half;k++){const a=s+k,b=a+half,c=cosT[k*step],d=sinT[k*step];
      const tr=re[b]*c-im[b]*d,ti=re[b]*d+im[b]*c;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti}}
  for(let k=0;k<=N/2;k++)out[k]=re[k]*re[k]+im[k]*im[k];
}
const pct=(a,p)=>{const s=Float64Array.from(a).sort();return s.length?s[Math.min(s.length-1,Math.floor(p*s.length))]:0};

E.transforms=function(x){
  fftInit();
  const T=Math.max(0,Math.floor((x.length-N)/HOP)+1),B=N/2+1,hz=SR/N;
  const P=new Float64Array(B),avg=new Float64Array(B),en=new Float64Array(T);
  /* frame energies, and the average spectrum of the loudest half of the frames (the voice) */
  const frames=[];
  for(let t=0;t<T;t++){let e=0;for(let i=0;i<N;i++){const v=x[t*HOP+i];e+=v*v}en[t]=10*Math.log10(e/N+1e-12)}
  const loudTh=pct(en,0.5);
  for(let t=0;t<T;t++)if(en[t]>=loudTh){power(x,t*HOP,P);for(let k=0;k<B;k++)avg[k]+=P[k];frames.push(t)}
  /* band: where the voice's average spectrum stays within 40 dB of its peak (from 80 Hz up; the top found from above) */
  let mx=0;for(let k=Math.round(80/hz);k<B;k++)mx=Math.max(mx,avg[k]);
  const th=mx*1e-4;let lo=Math.round(80/hz),hi=B-1;
  while(lo<B-1&&avg[lo]<th)lo++;
  while(hi>lo&&avg[hi]<th)hi--;
  /* the top edge more precisely: 99 % of the energy above lo lies below it */
  let tot=0;for(let k=lo;k<=hi;k++)tot+=avg[k];let acc=0,h99=hi;for(let k=lo;k<=hi;k++){acc+=avg[k];if(acc>=0.99*tot){h99=k;break}}
  /* noise: the voice frames' level against the quietest 10 % (between phrases there is only noise, echo or silence) */
  const snr=pct(en,0.9)-pct(en,0.1);
  /* reverb: after the voice stops (a drop from a loud frame), how fast the level falls: the time to fall 20 dB, from the
     median over all offsets; a dry voice falls in under ~100 ms, a reverberant room takes several hundred */
  const fr=HOP/SR*1000,decays=[];
  for(let t=1;t<T-12;t++){if(en[t-1]>=pct(en,0.7)&&en[t]<en[t-1]-3){let u=t;while(u<T-1&&u-t<40&&en[u]>en[t-1]-20)u++;if(u-t<40&&en[u]<=en[t-1]-20)decays.push((u-t+1)*fr)}}
  const reverb=decays.length>=3?pct(decays,0.5):null;
  /* clipping: a clipped voice piles its samples up just under the clip's maximum (flat tops, even after MP3/AAC coding
     rounds them); a natural voice reaches its peak only briefly */
  let peak=0;for(let i=0;i<x.length;i++)peak=Math.max(peak,Math.abs(x[i]));
  let nclip=0;for(let i=0;i<x.length;i++)if(Math.abs(x[i])>=0.85*peak)nclip++;
  const clip=x.length?nclip/x.length:0,loud=pct(en,0.9);
  /* echo: a copy of the voice delayed by 40-400 ms shows as a peak in the autocorrelation of the loudness envelope
     (10 ms steps), standing out from the smooth fall of a dry voice */
  const H=160,M=Math.floor(x.length/H),env=new Float64Array(M);
  for(let m=0;m<M;m++){let e=0;for(let i=0;i<H;i++){const v=x[m*H+i];e+=v*v}env[m]=Math.sqrt(e/H)}
  let mean=0;for(const v of env)mean+=v;mean/=Math.max(1,M);for(let m=0;m<M;m++)env[m]-=mean;
  const ac=l=>{let s=0,a=0;for(let m=0;m+l<M;m++){s+=env[m]*env[m+l];a+=env[m]*env[m]}return a>0?s/a:0};
  const A=[];for(let l=0;l<=45;l++)A.push(ac(l));
  let echo=0,echoLag=null;
  for(let l=4;l<=40;l++){const base=(A[l-3]+A[l+3])/2;const pr=A[l]-base;if(A[l]>=A[l-1]&&A[l]>=A[l+1]&&pr>echo){echo=pr;echoLag=l*10}}
  const labels=[];
  /* labels only for what the clip alone can show reliably (tested in tools/engine/eval/test_transforms.mjs). Echo, reverb and
     clipping are measured but NOT labelled: the archive's own old recordings already carry room echo, tape noise and
     compression, so without the original an edit can't be told from the recording's character (compared with the matched
     original instead, in verification) */
  /* measured on 640 test clips (16 recordings): a narrow band says more about the old original than about an edit (half the
     unedited clips have one), so it is not labelled; noise only when it is strong; clipping is clear (3 % vs <= 0.1 %) */
  if(snr<8)labels.push("very noisy");
  if(clip>0.01)labels.push("distorted");
  return {band:[Math.round(lo*hz),Math.round(h99*hz)],snr:+snr.toFixed(1),reverb:reverb==null?null:Math.round(reverb),echo:+echo.toFixed(3),echoLag,clip:+clip.toFixed(4),loud:+loud.toFixed(1),labels};
};
})(typeof window!=="undefined"?window:globalThis);
