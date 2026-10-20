import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { inspectRuntime, serverFingerprint, projectId, SERVICE, PROTOCOL } from './runtime-health.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
export function createDevServer(root=projectRoot) {
root=resolve(root);
let revision=Date.now(),watchers=[],healthRevision,healthPromise;
const fingerprint=serverFingerprint(projectRoot);
for(const [path,options] of [[root,{}],[resolve(root,'src'),{recursive:true}]]) {
  watchers.push(watch(path,options,(_,name)=>{if(path!==root||['index.html','package.json'].includes(String(name)))revision++;}));
}
const reload = () => `<script>(()=>{let previous=${JSON.stringify(String(revision))};setInterval(async()=>{try{const r=await fetch(new URL('./__dev/version',document.baseURI),{cache:'no-store'});if(!r.ok)return;const next=await r.text();if(previous!==next)location.reload();}catch{}},1200);})();</script>`;
const server=createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if(path==='/__dev/health') {
      if(!healthPromise||healthRevision!==revision){healthRevision=revision;healthPromise=inspectRuntime(root);}
      const health=await healthPromise;
      res.writeHead(health.ready?200:503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      const control=process.env.CITY_BORDER_CONTROL_TOKEN?createHash('sha256').update(process.env.CITY_BORDER_CONTROL_TOKEN).digest('hex'):null;
      res.end(JSON.stringify({service:SERVICE,protocol:PROTOCOL,project:projectId(root),pid:process.pid,control,server:await fingerprint,...health}));return;
    }
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
  const server=createDevServer();
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`포트 ${port}가 사용 중입니다. npm run repair로 게임 서버를 확인하세요.`:error.message);server.close();process.exitCode=1;});
  server.listen(port,'0.0.0.0',()=>console.log(`City Border listening on port ${port}; saved source changes reload the game automatically.`));
}
