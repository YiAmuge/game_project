import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,mkdir,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDevServer } from '../scripts/serve.mjs';

test('dev server injects live reload, detects saved source and does not alter standalone HTML',async()=>{
  const root=await mkdtemp(join(tmpdir(),'city-server-'));let server;
  try{
    await mkdir(join(root,'src'));await mkdir(join(root,'dist'));
    await writeFile(join(root,'index.html'),'<body>도시 경계</body>');
    await writeFile(join(root,'src/main.js'),'// first');
    await writeFile(join(root,'dist/index.html'),'<body>standalone</body>');
    server=createDevServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const url=`http://127.0.0.1:${server.address().port}`;
    const page=await (await fetch(url)).text();assert.ok(page.includes('__dev/version'));
    const before=await (await fetch(url+'/__dev/version')).text();await writeFile(join(root,'src/main.js'),'// saved');
    let after=before;for(let i=0;i<20&&after===before;i++){await new Promise(r=>setTimeout(r,25));after=await (await fetch(url+'/__dev/version')).text();}
    assert.notEqual(after,before);assert.equal(await (await fetch(url+'/dist/index.html')).text(),'<body>standalone</body>');
    assert.equal((await fetch(url+'/%2egit/config')).status,404);
  }finally{if(server)await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
});
