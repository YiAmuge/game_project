import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
export function createDevServer(root=projectRoot) {
let revision=Date.now(),watchers=[];
for(const [path,options] of [[root,{}],[resolve(root,'src'),{recursive:true}]]) {
  watchers.push(watch(path,options,(_,name)=>{if(path!==root||String(name)==='index.html')revision++;}));
}
const reload = () => `<script>(()=>{let previous=${JSON.stringify(String(revision))};setInterval(async()=>{try{const r=await fetch(new URL('./__dev/version',document.baseURI),{cache:'no-store'});if(!r.ok)return;const next=await r.text();if(previous!==next)location.reload();}catch{}},1200);})();</script>`;
const server=createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if(path==='/__dev/version') {res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end(String(revision));return;}
    if (path.split('/').some(p => p.startsWith('.'))) throw new Error('Forbidden');
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Forbidden');
    let body = await readFile(file);
    if(file===resolve(root,'index.html'))body=Buffer.from(body.toString().replace('</body>',reload()+'</body>'));
    res.writeHead(200, { 'Content-Type': (mime[extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('close',()=>watchers.forEach(w=>w.close()));
return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||5173);
  createDevServer().listen(port,'0.0.0.0',()=>console.log(`City Border listening on port ${port}; saved source changes reload the game automatically.`));
}
