import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT||5173);
async function running(){
  try{
    const response=await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(1500)});
    return response.ok&&(await response.text()).includes('도시 경계');
  }catch{return false;}
}
if(!await running()){
  const log=openSync('/tmp/city-border-dev.log','a');
  const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,detached:true,stdio:['ignore',log,log]});
  child.unref();closeSync(log);
  for(let i=0;i<20&&!await running();i++)await new Promise(r=>setTimeout(r,200));
  if(!await running())throw new Error(`Game server did not start on port ${port}. See /tmp/city-border-dev.log.`);
}
console.log(`City Border is running on port ${port}. Open the forwarded port in your browser. Saving source files reloads the game.`);
