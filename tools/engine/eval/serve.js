// A static file server with HTTP Range support (like GitHub Pages), for the tests: node serve.js [port] [root]
const http=require('http'),fs=require('fs'),path=require('path');
const port=+(process.argv[2]||8765),root=path.resolve(process.argv[3]||'.');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(new URL(req.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';
  const f=path.join(root,p);if(!f.startsWith(root)){res.writeHead(403);return res.end()}
  fs.stat(f,(e,st)=>{if(e||!st.isFile()){res.writeHead(404);return res.end()}
    const h={'Content-Type':types[path.extname(f)]||'application/octet-stream','Accept-Ranges':'bytes'};
    const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');
    if(m){const a=+m[1],b=m[2]?Math.min(+m[2],st.size-1):st.size-1;if(a>=st.size){res.writeHead(416,{'Content-Range':'bytes */'+st.size});return res.end()}
      res.writeHead(206,{...h,'Content-Range':`bytes ${a}-${b}/${st.size}`,'Content-Length':b-a+1});fs.createReadStream(f,{start:a,end:b}).pipe(res)}
    else{res.writeHead(200,{...h,'Content-Length':st.size});fs.createReadStream(f).pipe(res)}});
}).listen(port,()=>console.log('serving',root,'on',port));
