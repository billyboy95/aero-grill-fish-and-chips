import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const arg=(name,fallback)=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:fallback};
const port=Number(arg('--port',process.env.PORT||3000)),host=arg('--host',process.env.HOST||'127.0.0.1');
const endpoints=new Set(['status','checkout','yoco-webhook','whatsapp']);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){const name=url.pathname.slice(5);if(!endpoints.has(name)){res.writeHead(404).end();return}const {default:handler}=await import(path.join(root,'api',name+'.js'));req.query=Object.fromEntries(url.searchParams);res.status=n=>{res.statusCode=n;return res};res.send=body=>res.end(body);await handler(req,res);return}
 const rel=url.pathname==='/'?'index.html':url.pathname==='/demo/'?'demo/index.html':decodeURIComponent(url.pathname.slice(1));
 if(!['index.html','sw.js','manifest.webmanifest'].includes(rel)&&!/^(?:demo\/)?assets\/[a-zA-Z0-9_.-]+$/.test(rel)&&!['demo/index.html','demo/sw.js','demo/manifest.webmanifest','demo/robots.txt'].includes(rel)){res.writeHead(404).end();return}
 const data=await fs.readFile(path.join(root,rel));res.writeHead(200,{'Content-Type':mime[path.extname(rel)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
}catch(error){res.writeHead(error.code==='ENOENT'?404:500).end(error.code==='ENOENT'?'Not found':'Request failed')}}).listen(port,host,()=>console.log(`Aero Grill preview on port ${port} — fictional orders only`));
