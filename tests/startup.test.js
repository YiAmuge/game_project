import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm,symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { forwardedUrl, inspectRuntime, projectId, inspectForwarded } from '../scripts/runtime-health.mjs';

const execute = promisify(execFile), scripts = resolve('scripts');
const pause = ms => new Promise(r => setTimeout(r, ms));
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'city-start-'));
  await mkdir(join(root, 'scripts'));await mkdir(join(root, 'src'));
  for (const name of ['serve.mjs','runtime-health.mjs','codespaces-start.mjs','update.mjs','online-server.mjs']) await copyFile(join(scripts,name), join(root,'scripts',name));
  for(const name of ['data.js','champion-text.js','extra-data.js','new-data.js','jamila-data.js','online-protocol.js','chat-wire.js'])await copyFile(resolve('src',name),join(root,'src',name));
  await mkdir(join(root,'node_modules'));await symlink(resolve('node_modules/ws'),join(root,'node_modules/ws'),'dir');
  await copyFile(resolve('package-lock.json'),join(root,'package-lock.json'));await writeFile(join(root,'.gitignore'),'node_modules/\n');
  await writeFile(join(root,'package.json'), JSON.stringify({version:'1.2.3',type:'module'}));
  await writeFile(join(root,'index.html'), '<body>도시 경계<link rel="stylesheet" href="./src/style.css"><script type="module" src="./src/main.js"></script></body>');
  await writeFile(join(root,'src/main.js'), "import './core.js';");await writeFile(join(root,'src/core.js'), 'export const ready=true;');
  await writeFile(join(root,'src/style.css'), 'body { color: white; }');
  const reservation = createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));
  const port = reservation.address().port;await new Promise(r=>reservation.close(r));
  const env = {...process.env, PORT:String(port)};delete env.CODESPACE_NAME;
  const url = `http://127.0.0.1:${port}`;
  const health = async()=>await (await fetch(url+'/__dev/health')).json();
  const run = async(args=[],script='codespaces-start.mjs')=>{
    try { const result=await execute(process.execPath,[join(root,'scripts',script),...args],{cwd:tmpdir(),env,timeout:20000});return {...result,code:0}; }
    catch(error) { return {stdout:error.stdout||'',stderr:error.stderr||'',code:error.code}; }
  };
  t.after(async()=>{
    try { const h=await health();if(h.service==='city-border')process.kill(h.pid,'SIGTERM'); }catch{}
    await rm(join(tmpdir(),`city-border-${projectId(root)}-${port}.json`),{force:true});
    await rm(root,{recursive:true,force:true});
  });
  return {root,port,url,env,health,run};
}

test('startup survives terminal exit, reuses a healthy instance, and safely restarts on request or server update',async t=>{
  const f=await fixture(t);
  let result=await f.run();assert.equal(result.code,0,result.stderr);assert.match(result.stdout,/게임 파일 확인 완료/);
  const first=await f.health();assert.equal(first.ready,true);assert.equal(first.version,'1.2.3');
  result=await f.run();assert.equal(result.code,0,result.stderr);assert.equal((await f.health()).pid,first.pid);
  result=await f.run(['--restart']);assert.equal(result.code,0,result.stderr);const second=await f.health();assert.notEqual(second.pid,first.pid);
  await writeFile(join(f.root,'scripts/serve.mjs'),(await readFile(join(f.root,'scripts/serve.mjs'),'utf8'))+'\n// updated server\n');
  result=await f.run();assert.equal(result.code,0,result.stderr);assert.notEqual((await f.health()).pid,second.pid);
  result=await f.run(['--diagnose']);assert.equal(result.code,0,result.stderr);assert.match(result.stdout,/게임 HTML·모듈·데이터: 정상/);
});

test('missing imported files and invalid JSON cannot pass startup just because HTML returns 200',async t=>{
  const f=await fixture(t);assert.equal((await f.run()).code,0);
  await rm(join(f.root,'src/core.js'));
  let health;for(let i=0;i<30;i++){health=await f.health();if(!health.ready)break;await pause(30);}
  assert.equal(health.ready,false);assert.equal((await fetch(f.url)).status,200);assert.equal((await fetch(f.url+'/__dev/health')).status,503);
  const result=await f.run();assert.notEqual(result.code,0);assert.match(result.stderr,/src\/core.js/);
  await writeFile(join(f.root,'src/core.js'),'export const repaired=true;');await writeFile(join(f.root,'src/bad.json'),'{broken');
  assert.equal((await inspectRuntime(f.root)).ready,false);await rm(join(f.root,'src/bad.json'));assert.equal((await f.run()).code,0);
});

test('simultaneous Codespaces start and attach hooks converge on one server',async t=>{
  const f=await fixture(t),results=await Promise.all([f.run(),f.run()]);
  for(const result of results)assert.equal(result.code,0,result.stderr);
  const first=await f.health();assert.equal(first.ready,true);assert.ok(first.control);
  const result=await f.run(['--restart']);assert.equal(result.code,0,result.stderr);assert.notEqual((await f.health()).pid,first.pid);
});

test('legacy HTML-only server from this checkout is migrated automatically',async t=>{
  const f=await fixture(t),serverPath=join(f.root,'scripts/serve.mjs');
  const real=await readFile(serverPath,'utf8');
  await writeFile(serverPath,"import {createServer} from 'node:http';createServer((req,res)=>res.end('도시 경계')).listen(Number(process.env.PORT),'0.0.0.0',()=>console.log('ready'));\n");
  const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:f.root,env:f.env,stdio:['ignore','pipe','pipe']});
  t.after(()=>{try{child.kill();}catch{}});
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
  await writeFile(serverPath,real);const result=await f.run();assert.equal(result.code,0,result.stderr);assert.equal((await f.health()).ready,true);
});

test('port collision never kills a different program or reports success',async t=>{
  const f=await fixture(t),other=createServer((req,res)=>res.end('different application'));
  await new Promise(r=>other.listen(f.port,'127.0.0.1',r));t.after(()=>new Promise(r=>other.close(r)));
  const result=await f.run(['--restart']);assert.notEqual(result.code,0);assert.match(result.stderr,/임의 종료하지 않았습니다/);assert.equal(await(await fetch(f.url)).text(),'different application');
});

test('diagnosis does not secretly start a server; invalid port and missing image failures are explicit',async t=>{
  const f=await fixture(t);const result=await f.run(['--diagnose']);assert.notEqual(result.code,0);assert.match(result.stdout,/응답 없음/);await assert.rejects(fetch(f.url));
  await writeFile(join(f.root,'src/art.js'),'export const image=true;');const h=await inspectRuntime(f.root);assert.equal(h.ready,false);assert.ok(h.problems.some(p=>p.includes('champions-v08.png')));
  try {await execute(process.execPath,[join(f.root,'scripts/codespaces-start.mjs')],{env:{...f.env,PORT:'bad'}});assert.fail('invalid port was accepted');}
  catch(error){assert.match(error.stderr,/PORT는/);}
});

test('current Codespace address uses the actual name, forwarded domain and selected port',()=>{
  assert.equal(forwardedUrl({},5173),null);
  assert.equal(forwardedUrl({CODESPACE_NAME:'current-space'},5173),'https://current-space-5173.app.github.dev/');
  assert.equal(forwardedUrl({CODESPACE_NAME:'current-space',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'example.test'},5174),'https://current-space-5174.example.test/');
  assert.equal(forwardedUrl({CODESPACE_NAME:'space/?token=secret'},5173),null);
});

test('commented-out imports and sample code strings do not prevent starting the game',async t=>{
  const f=await fixture(t);await writeFile(join(f.root,'src/core.js'),"// import './not-written-yet.js';\n/* from './another-plan.js' */\nconst example=\"import './sample-only.js'\";\nexport const ready=true;\n");
  const health=await inspectRuntime(f.root);assert.equal(health.ready,true,health.problems.join('\n'));assert.equal((await f.run()).code,0);
});

test('one-command update loads new startup code and preserves edits when Pull cannot complete',async t=>{
  const f=await fixture(t),remote=await mkdtemp(join(tmpdir(),'city-origin-')),writer=await mkdtemp(join(tmpdir(),'city-writer-'));
  t.after(async()=>{await rm(remote,{recursive:true,force:true});await rm(writer,{recursive:true,force:true});});
  const git=(cwd,...args)=>execute('git',args,{cwd});
  await git(f.root,'init','-b','test-update');await git(f.root,'config','user.name','Startup Test');await git(f.root,'config','user.email','startup@example.invalid');
  await writeFile(join(f.root,'notes.txt'),'original\n');await git(f.root,'add','.');await git(f.root,'commit','-m','initial');
  await git(remote,'init','--bare');await git(f.root,'remote','add','origin',remote);await git(f.root,'push','-u','origin','test-update');
  await git(writer,'clone','--branch','test-update',remote,'.');await git(writer,'config','user.name','Startup Test');await git(writer,'config','user.email','startup@example.invalid');
  await writeFile(join(writer,'package.json'),JSON.stringify({version:'1.2.4',type:'module'}));
  await writeFile(join(writer,'scripts/codespaces-start.mjs'),(await readFile(join(writer,'scripts/codespaces-start.mjs'),'utf8'))+"\nconsole.log('updated-startup-loaded');\n");
  await git(writer,'add','.');await git(writer,'commit','-m','update');await git(writer,'push');
  await writeFile(join(f.root,'notes.txt'),'local unsaved-to-git work\n');
  let result=await f.run([],'update.mjs');assert.equal(result.code,0,result.stderr);assert.match(result.stdout,/updated-startup-loaded/);assert.equal((await f.health()).version,'1.2.4');assert.equal(await readFile(join(f.root,'notes.txt'),'utf8'),'local unsaved-to-git work\n');
  await writeFile(join(writer,'notes.txt'),'remote edit\n');await git(writer,'add','.');await git(writer,'commit','-m','conflicting update');await git(writer,'push');
  result=await f.run([],'update.mjs');assert.notEqual(result.code,0);assert.match(result.stderr,/업데이트가 완료되지 않았습니다/);assert.equal(await readFile(join(f.root,'notes.txt'),'utf8'),'local unsaved-to-git work\n');assert.equal((await f.health()).ready,true);
});

test('external HTTP 200 login or error pages never count as a verified game',async t=>{
  const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<title>Sign in to GitHub</title>');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const result=await inspectForwarded(`http://127.0.0.1:${server.address().port}`,{project:'expected'});
  assert.equal(result.pageStatus,200);assert.equal(result.healthStatus,200);assert.equal(result.gameHtml,false);assert.equal(result.sameServer,false);assert.equal(result.verified,false);
});

test('external diagnosis verifies both game HTML and the actual project identity',async t=>{
  let project='expected',ready=true;
  const server=createServer((req,res)=>{
    if(req.url==='/__dev/health'){res.writeHead(ready?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify({service:'city-border',protocol:1,project,ready}));}
    else res.end('<title>도시 경계 — 아레나</title><script src="./src/main.js"></script>');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const url=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await inspectForwarded(url,{project:'expected'})).verified,true);
  project='different';let result=await inspectForwarded(url,{project:'expected'});assert.equal(result.gameHtml,true);assert.equal(result.sameServer,false);assert.equal(result.verified,false);
  project='expected';ready=false;result=await inspectForwarded(url,{project:'expected'});assert.equal(result.sameServer,true);assert.equal(result.ready,false);assert.equal(result.verified,false);
});

test('external diagnosis does not follow login redirects or send authentication',async t=>{
  let logins=0;
  const server=createServer((req,res)=>{
    assert.equal(req.headers.authorization,undefined);assert.equal(req.headers.cookie,undefined);
    if(req.url==='/login'){logins++;res.end('Login');return;}
    res.writeHead(302,{Location:'/login'});res.end();
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const result=await inspectForwarded(`http://127.0.0.1:${server.address().port}`,{project:'expected'});
  assert.equal(result.pageStatus,302);assert.equal(result.healthStatus,302);assert.equal(result.verified,false);assert.equal(logins,0);
});

test('external lookup failure stays unverified without hiding local readiness',async()=>{
  const result=await inspectForwarded('https://unreachable.invalid/',{project:'expected'},async()=>{throw new Error('network blocked');});
  assert.equal(result.pageStatus,null);assert.equal(result.healthStatus,null);assert.equal(result.verified,false);
});
