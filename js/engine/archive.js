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
A.verses=su=>getJSON("vi/"+String(su).padStart(3,"0")+".json").catch(()=>null);
A.clear=()=>{cache.clear();shardCache.clear()};
})(typeof window!=="undefined"?window:globalThis);
