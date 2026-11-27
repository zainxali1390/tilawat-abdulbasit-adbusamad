/* Recognition engine: fetching the archive indexes (Step 9; design §3). Each search downloads only what it needs:
     ARCHIVE.melodyLookup(hashes) → Promise<lookup(h) → Uint32Array>   the mh/ shards of the clip's melody hashes
     ARCHIVE.melody(code)         → Promise<Float32Array MIDI per frame>  one recording's melody (mf/), for alignment
     ARCHIVE.verses(su)           → Promise<vi/SSS.json object>           the verse index of one surah
     ARCHIVE.mhCode(i)            → recording code of an mh/ entry
   Every file is fetched with ?b=<build> so a page never mixes two builds. Works in the browser and in Node 18+ (fetch). */
(function(G){
const A=G.ARCHIVE||(G.ARCHIVE={});
A.base=null;   // set by the app (location) or a test (http://…/)
const base=()=>A.base||(typeof location!=="undefined"?new URL("./",location.href).href:"./");
const cache=new Map();
const getJSON=(p)=>{if(!cache.has(p))cache.set(p,fetch(base()+p).then(r=>{if(!r.ok)throw new Error(p+" http "+r.status);return r.json()}).catch(e=>{cache.delete(p);throw e}));return cache.get(p)};
async function getBin(p){const r=await fetch(base()+p);if(r.status===404)return null;if(!r.ok)throw new Error(p+" http "+r.status);return new Uint8Array(await r.arrayBuffer())}
/* at most n fetches at once */
async function pool(items,n,f){const out=new Array(items.length);let i=0;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(i<items.length){const k=i++;out[k]=await f(items[k])}}));return out}
A.mhManifest=()=>getJSON("mh/manifest.json");
A.mfManifest=()=>getJSON("mf/manifest.json");
const shardCache=new Map();
A.melodyLookup=async function(hashes){
  const man=await A.mhManifest(),sub=man.sub||64,keys=[...new Set(hashes.map(h=>Math.floor(h/sub)))].filter(k=>!shardCache.has(man.build+"|"+k));
  await pool(keys,8,async key=>{
    const p="mh/s/"+(key>>8).toString(16).padStart(2,"0")+"/"+(key&255).toString(16).padStart(2,"0")+".bin?b="+man.build;
    const b=await getBin(p);let lists=null;
    if(b){const dv=new DataView(b.buffer,b.byteOffset,b.byteLength),counts=[];let off=sub*4;lists=new Map();
      for(let i=0;i<sub;i++)counts.push(dv.getUint32(i*4,true));
      for(let i=0;i<sub;i++){if(counts[i])lists.set(i,new Uint32Array(b.buffer.slice(b.byteOffset+off,b.byteOffset+off+counts[i]*4)));off+=counts[i]*4}}
    shardCache.set(man.build+"|"+key,lists);
  });
  return h=>{const l=shardCache.get(man.build+"|"+Math.floor(h/sub));return l?l.get(h%sub):undefined};
};
A.mhCode=async function(i){return (await A.mhManifest()).recs[i]};
A.melody=async function(code){
  const man=await A.mfManifest(),e=man.recs[code];if(!e)return null;
  const b=await getBin("mf/r/"+e[0].slice(0,2)+"/"+e[0]+".bin?b="+man.build);
  return b&&G.MELODY?G.MELODY.unpack(b):b;
};
/* only a window of a recording's melody (Step 15: a whole melody is 25-100 KB; a search needs ~30 of them, but only
   around one place in each). An HTTP Range request fetches frames t0..t1 (1 byte per 50 ms frame); a server that
   ignores Range sends the whole file, which is used as it is. The result is the full-length line (NaN outside the
   windows fetched so far), so every alignment works on it unchanged; windows of one recording are merged. */
const win=new Map();
A.melodyAround=async function(code,t0,t1){
  const man=await A.mfManifest(),e=man.recs[code];if(!e||!G.MELODY)return null;
  const n=e[1],a=Math.max(0,Math.floor(t0*20)),z=Math.min(n,Math.ceil(t1*20));if(z<=a)return null;
  let w=win.get(man.build+"|"+code);if(!w){w={m:new Float32Array(n).fill(NaN),have:[],full:false};win.set(man.build+"|"+code,w)}
  if(w.full||w.have.some(([x,y])=>x<=a&&y>=z))return w.m;
  const url=base()+"mf/r/"+e[0].slice(0,2)+"/"+e[0]+".bin?b="+man.build;
  const r=await fetch(url,{headers:{Range:"bytes="+a+"-"+(z-1)}});if(!r.ok)throw new Error("mf http "+r.status);
  const b=new Uint8Array(await r.arrayBuffer()),u=G.MELODY.unpack(b);
  if(r.status===206&&b.length===z-a){w.m.set(u,a);w.have.push([a,z])}
  else{w.m.set(u.subarray(0,n),0);w.full=true}
  return w.m;
};
A.verses=su=>getJSON("vi/"+String(su).padStart(3,"0")+".json").catch(()=>null);
A.clear=()=>{cache.clear();shardCache.clear();win.clear()};
})(typeof window!=="undefined"?window:globalThis);
