/* Recognition engine, stage "melody" (docs/RECOGNITION-DESIGN.md §3.1, §4.2): the tune of a recitation as a pitch contour,
   and a comparison of two contours that does not care about key (pitch shift), tempo (speed), EQ or most echo.
   One implementation for the browser (clips) and Node (the archive's melody store, tools/engine/build_melody.mjs).

   MELODY.f0(pcm16k)            → Float32Array of MIDI pitch per 50 ms frame (NaN = no voice)
   MELODY.pack(f0) / unpack(u8) → the stored form: 1 byte per frame (0 = no voice, else 1 + quarter-semitones above MIDI 36)
   MELODY.match(q, ref, opts)   → best alignment of clip contour q inside ref:
                                  {score 0..1, at (s, in ref), k (ref seconds per clip second), shift (semitones), cover}
*/
(function(G){
const SR=16000,HOP=800,WIN=1024,FPS=SR/HOP,FMIN=75,FMAX=700,TMIN=Math.floor(SR/FMAX),TMAX=Math.ceil(SR/FMIN);

/* ---------- pitch: YIN per 50 ms frame, then voicing by continuity and octave repair ---------- */
/* second-order band-pass (RBJ biquad), forward only: keeps the voice's pitch region and lowest harmonics (90-1100 Hz), where
   pink noise, hum and hiss would otherwise swamp the periodicity */
function bandpass(x,lo,hi){
  const y=new Float32Array(x.length);let z=x;
  for(const [type,fc] of [["hp",lo],["lp",hi]]){
    const w=2*Math.PI*fc/SR,c=Math.cos(w),al=Math.sin(w)/(2*0.707);
    let b0,b1,b2;if(type==="lp"){b0=(1-c)/2;b1=1-c;b2=(1-c)/2}else{b0=(1+c)/2;b1=-(1+c);b2=(1+c)/2}
    const a0=1+al,a1=-2*c,a2=1-al;let x1=0,x2=0,y1=0,y2=0;const o=new Float32Array(z.length);
    for(let i=0;i<z.length;i++){const v=(b0*z[i]+b1*x1+b2*x2-a1*y1-a2*y2)/a0;x2=x1;x1=z[i];y2=y1;y1=v;o[i]=v}
    z=o}
  return z;
}
function f0(x,opts){
  if(!opts||opts.filter!==false)x=bandpass(x,90,1100);
  const T=Math.max(0,Math.floor((x.length-WIN)/HOP)+1),ap=new Float32Array(T),hz=new Float32Array(T),rms=new Float32Array(T);
  const d=new Float64Array(TMAX+2),W=WIN-TMAX;
  let all=0;for(let i=0;i<x.length;i+=4)all+=x[i]*x[i];all=Math.sqrt(all/Math.max(1,x.length/4));
  for(let t=0;t<T;t++){
    const o=t*HOP;let m=0;for(let i=0;i<WIN;i++)m+=x[o+i];m/=WIN;
    let e=0;for(let i=0;i<WIN;i++){const v=x[o+i]-m;e+=v*v}rms[t]=Math.sqrt(e/WIN);
    let run=0;d[0]=1;
    for(let tau=1;tau<=TMAX+1;tau++){let s=0;for(let j=0;j<W;j+=2){const v=x[o+j]-x[o+j+tau];s+=v*v}run+=s;d[tau]=run>0?s*tau/run:1}
    let bt=0,best=1;
    for(let tau=TMIN;tau<=TMAX;tau++)if(d[tau]<0.25){while(tau<TMAX&&d[tau+1]<d[tau])tau++;bt=tau;best=d[tau];break}
    if(!bt)for(let tau=TMIN;tau<=TMAX;tau++)if(d[tau]<best){best=d[tau];bt=tau}
    let tf=bt;if(bt>TMIN&&bt<=TMAX){const y0=d[bt-1],y1=d[bt],y2=d[bt+1],den=y0-2*y1+y2;if(Math.abs(den)>1e-9)tf=bt+Math.max(-1,Math.min(1,0.5*(y0-y2)/den))}
    ap[t]=best;hz[t]=tf?SR/tf:0;
  }
  const midi=new Float32Array(T).fill(NaN);
  const loud=t=>rms[t]>0.06*all;
  /* strongly periodic frames are voice; weaker ones (old, noisy tapes) count when they continue a voiced neighbour
     within 1.5 semitones: noise rarely holds a pitch line */
  const m0=new Float32Array(T);for(let t=0;t<T;t++)m0[t]=hz[t]?69+12*Math.log2(hz[t]/440):NaN;
  for(let t=0;t<T;t++)if(ap[t]<0.3&&loud(t))midi[t]=m0[t];
  for(let pass=0;pass<2;pass++)for(let dir of [1,-1])for(let t=dir>0?1:T-2;dir>0?t<T:t>=0;t+=dir){
    if(!isNaN(midi[t])||ap[t]>=0.5||!loud(t))continue;const p=midi[t-dir];if(isNaN(p))continue;
    let v=m0[t];for(const k of [-12,12])if(Math.abs(v+k-p)<Math.abs(v-p))v+=k;
    if(Math.abs(v-p)<1.5)midi[t]=v}
  /* octave repair: a frame an octave away from the median of its voiced neighbours (±0.5 s) is folded back */
  const out=midi.slice();
  for(let t=0;t<T;t++){if(isNaN(midi[t]))continue;const nb=[];for(let u=Math.max(0,t-10);u<=Math.min(T-1,t+10);u++)if(!isNaN(midi[u]))nb.push(midi[u]);
    if(nb.length<5)continue;nb.sort((a,b)=>a-b);const med=nb[nb.length>>1];let v=midi[t];
    while(v-med>7)v-=12;while(med-v>7)v+=12;out[t]=v}
  /* lone voiced frames (under 3 in a row) are dropped */
  for(let t=0;t<T;){if(isNaN(out[t])){t++;continue}let u=t;while(u<T&&!isNaN(out[u]))u++;if(u-t<3)for(let k=t;k<u;k++)out[k]=NaN;t=u}
  return out;
}
const pack=m=>{const b=new Uint8Array(m.length);for(let i=0;i<m.length;i++)b[i]=isNaN(m[i])?0:Math.max(1,Math.min(255,Math.round((m[i]-36)*4)+1));return b};
const unpack=b=>{const m=new Float32Array(b.length);for(let i=0;i<b.length;i++)m[i]=b[i]?(b[i]-1)/4+36:NaN;return m};

/* ---------- key-free shape: pitch minus its local average (2 s), gaps bridged; 0 where no voice ---------- */
function shape(m,secs){
  const n=m.length,w=Math.max(3,Math.round((secs||2)*FPS))|1,v=new Uint8Array(n),f=new Float64Array(n);
  let last=NaN,first=-1;for(let i=0;i<n;i++)if(!isNaN(m[i])){if(first<0)first=i;last=m[i];v[i]=1;f[i]=m[i]}else f[i]=last;
  if(first<0)return {h:new Float64Array(n),v};
  for(let i=0;i<first;i++)f[i]=m[first];
  const cs=new Float64Array(n+1);for(let i=0;i<n;i++)cs[i+1]=cs[i]+f[i];const r=w>>1,h=new Float64Array(n);
  for(let i=0;i<n;i++){const a=Math.max(0,i-r),b=Math.min(n,i+r+1);const avg=(cs[b]-cs[a])/(b-a);h[i]=v[i]?Math.max(-6,Math.min(6,f[i]-avg)):0}
  return {h,v};
}
function stretch(m,k){const n=Math.max(4,Math.round(m.length*k)),o=new Float32Array(n);for(let i=0;i<n;i++){const p=i/k,a=Math.floor(p),w=p-a;
  const x0=m[Math.min(m.length-1,a)],x1=m[Math.min(m.length-1,a+1)];o[i]=isNaN(x0)||isNaN(x1)?(w<0.5?x0:x1):x0*(1-w)+x1*w}return o}
/* radix-2 FFT (complex, in place) for the cross-correlation */
function fft(re,im,inv){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
  for(let len=2;len<=n;len<<=1){const a=2*Math.PI/len*(inv?1:-1),wr=Math.cos(a),wi=Math.sin(a);
    for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const ur=re[i+j],ui=im[i+j],vr=re[i+j+len/2]*cr-im[i+j+len/2]*ci,vi=re[i+j+len/2]*ci+im[i+j+len/2]*cr;
      re[i+j]=ur+vr;im[i+j]=ui+vi;re[i+j+len/2]=ur-vr;im[i+j+len/2]=ui-vi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}
  if(inv)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n}}
const TEMPI=(()=>{const o=[];for(let i=0;i<19;i++)o.push(Math.exp(Math.log(0.78)+i*(Math.log(1.28)-Math.log(0.78))/18));return o})();

/* the best place of clip contour q in reference contour ref (both MIDI per frame, NaN = no voice) */
function match(q,ref,opts){
  opts=opts||{};const tempi=opts.tempi||TEMPI,top=opts.top||5;
  const R=shape(ref),n=ref.length;let best={score:-1};
  if(!refCache.has(ref)){refCache.clear();const cs=new Float64Array(n+1);for(let i=0;i<n;i++)cs[i+1]=cs[i]+R.h[i]*R.h[i];refCache.set(ref,cs)}
  const e=refCache.get(ref);
  for(const k of tempi){
    const qs=stretch(q,k),Q=shape(qs),L=qs.length;let vq=0;for(let i=0;i<L;i++)vq+=Q.v[i];
    if(L>=n||vq<0.25*L)continue;
    let N=1;while(N<n+L)N<<=1;
    const ar=new Float64Array(N),ai=new Float64Array(N),br=new Float64Array(N),bi=new Float64Array(N);
    for(let i=0;i<n;i++)ar[i]=R.h[i];for(let i=0;i<L;i++)br[i]=Q.h[i];
    fft(ar,ai,false);fft(br,bi,false);
    for(let i=0;i<N;i++){const r=ar[i]*br[i]+ai[i]*bi[i],im=ai[i]*br[i]-ar[i]*bi[i];ar[i]=r;ai[i]=im}
    fft(ar,ai,true);
    let qq=0;for(let i=0;i<L;i++)qq+=Q.h[i]*Q.h[i];qq=Math.sqrt(qq)||1;
    const cand=[];for(let o=0;o+L<=n;o++){const le=Math.sqrt(Math.max(1e-9,e[o+L]-e[o]));cand.push([ar[o]/(le*qq),o])}
    cand.sort((a,b)=>b[0]-a[0]);
    /* re-score the best offsets: one constant pitch difference (the key change), the rest measured in semitones,
       octave errors folded, the error capped so a few bad frames don't dominate */
    for(const [,o] of cand.slice(0,top)){
      const dif=[];for(let i=0;i<L;i++){const a=ref[o+i],b=qs[i];if(!isNaN(a)&&!isNaN(b))dif.push(a-b)}
      if(dif.length<0.3*L)continue;
      dif.sort((a,b)=>a-b);const sh=dif[dif.length>>1];let err=0;
      for(const dv of dif){let x=dv-sh;while(x>6)x-=12;while(x<-6)x+=12;err+=Math.min(Math.abs(x),2)}
      err/=dif.length;const cover=Math.min(1,dif.length/(0.5*L)),s=(1-err/2)*cover;
      if(s>best.score)best={score:s,at:o/FPS,k,shift:sh,cover:dif.length/L,frame:o};
    }
  }
  /* fine pass around the best: tempo in 0.5 % steps (the grid above is ~2.7 % apart) and the offset frame by frame */
  if(best.score>0&&opts.refine!==false){
    const k0=best.k,o0=best.frame;
    for(let d=-0.02;d<=0.0201;d+=0.005){const k=k0*(1+d),qs=stretch(q,k),L=qs.length;
      for(let o=Math.max(0,o0-8);o<=Math.min(n-L,o0+8);o++){const s=robust(ref,qs,o,L);if(s&&s.score>best.score)best={...s,at:o/FPS,k,frame:o}}}
  }
  return best;
}
function robust(ref,qs,o,L){
  const dif=[];for(let i=0;i<L;i++){const a=ref[o+i],b=qs[i];if(!isNaN(a)&&!isNaN(b))dif.push(a-b)}
  if(dif.length<0.3*L)return null;
  dif.sort((a,b)=>a-b);const sh=dif[dif.length>>1];let err=0;
  for(const dv of dif){let x=dv-sh;while(x>6)x-=12;while(x<-6)x+=12;err+=Math.min(Math.abs(x),2)}
  err/=dif.length;return {score:(1-err/2)*Math.min(1,dif.length/(0.5*L)),shift:sh,cover:dif.length/L};
}
const refCache=new Map();
G.MELODY={f0,pack,unpack,shape,match,bandpass,FPS,TEMPI};
})(typeof window!=="undefined"?window:globalThis);
