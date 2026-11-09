"""Hohenheim charge cleanup, attack-stage routing, softened beam and short impacts."""
import asyncio,base64,json,os,shutil,threading,wave
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import numpy as np
from playwright.async_api import async_playwright
from yi_audio_browser import SETUP
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts/electric-audio';ART.mkdir(parents=True,exist_ok=True)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   file=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(file.stat().st_size));self.end_headers()
   with file.open('rb')as f:shutil.copyfileobj(f,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  for mode in os.getenv('ELECTRIC_TEST_MODES','desktop,mobile,offline,offline-mobile').split(','):
   mobile='mobile'in mode;offline=mode.startswith('offline');errors=[];external=[]
   browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
   ctx=await browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201'))+'/?debug=1'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(url,wait_until='networkidle',timeout=90000);await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.audio.context?.state==="running"');await p.evaluate('()=>__moba.audio.synth.swings.ready');assert await p.evaluate('__moba.audio.synth.swings.buffers.size===28&&__moba.audio.synth.swings.failures.length===0')
   await p.evaluate(SETUP,'hohenheim');await p.evaluate('__moba.game.attack(__moba.game.player,{x:48,y:20})');await p.wait_for_function('__moba.audio.hohenCharge.fields.size===1')
   await p.evaluate('__moba.audio.toggle()');await p.wait_for_function('__moba.audio.hohenCharge.fields.size===0');await p.evaluate('__moba.audio.toggle()');await p.wait_for_function('__moba.audio.hohenCharge.fields.size===1')
   await p.evaluate('()=>{const a=__moba.audio,g=__moba.game;window.chargeEnded=false;a.hohenCharge.fields.get(g.player.id).source.addEventListener("ended",()=>window.chargeEnded=true);a.synth.swings.history=[];g.player.state.hohenCharge.progress=1.5;__moba.mobile.api.releaseBasic(g,g.player,{x:48,y:20});advance(.25);}')
   await p.wait_for_function('__moba.audio.hohenCharge.fields.size===0&&chargeEnded&&__moba.audio.synth.swings.history.filter(s=>s.id==="hohenBeam").length===3')
   await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.cast(__moba.game.player,"q",{x:43,y:20})');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="hohenElectrocute")')
   await p.evaluate(SETUP,'hohenheim');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.cast(__moba.game.player,"r",{x:45,y:20});advance(2.11)')
   await p.wait_for_function('__moba.audio.synth.swings.history.filter(s=>s.id==="hohenUltimate").length===10')
   assert await p.evaluate('__moba.audio.synth.swings.history.filter(s=>s.id==="hohenUltimate"&&s.offset===0).length===7&&__moba.audio.synth.swings.history.filter(s=>s.id==="hohenUltimate"&&s.offset>=1).length===3')
   await p.evaluate(SETUP,'outis');await p.evaluate('__moba.audio.synth.swings.history=[];target(42.5);target(44);__moba.game.cast(__moba.game.player,"r",{x:47,y:20});advance(.8)');await p.wait_for_function('__moba.audio.synth.swings.history.filter(s=>s.id==="outisShotgun").length===1')
   for key,slot in [('outis',None),('gregor','q'),('marton',None)]:
    await p.wait_for_timeout(180);await p.evaluate(SETUP,key);await p.evaluate('slot=>{const g=__moba.game;__moba.audio.synth.swings.history=[];const t=target(44);if(slot)g.cast(g.player,slot,t);else g.attack(g.player,t);advance(.4);}',slot);await p.wait_for_function('id=>__moba.audio.synth.swings.history.some(s=>s.cue==="impact"&&s.id===id)',arg='earthImpact'if key=='marton'else'impactPierce')
   rows=await p.evaluate('''async()=>{
    const Audio=__moba.audio.constructor,rate=24000,rows=[];
    const cases=[{name:'charge'},{name:'q',kind:'cast',slot:'q'},{name:'beam',phase:'electric-beam'},{name:'beam-reference',phase:'electric-beam'},{name:'grow',slot:'r',phase:'hohen-grow-hit'},{name:'full',slot:'r',phase:'hohen-full-hit'},{name:'shotgun',key:'outis',kind:'explosion',phase:'outis-shotgun',slot:'r'},{name:'firearm',key:'gubo',kind:'hit',family:'rifle'}];
    for(const spec of cases){
     const c=new OfflineAudioContext(2,rate*2.5,rate),a=new Audio({context:c,storage:false});await a.synth.swings.ready;
     if(spec.name==='beam-reference')c.createBiquadFilter=()=>{const pass=c.createGain();pass.frequency={value:0};pass.Q={value:0};return pass;};
     let layers=0;for(const name of ['tone','noise','element']){const fn=a.synth[name].bind(a.synth);a.synth[name]=(...args)=>{layers++;return fn(...args);};}
     const play=()=>a.play({key:'hohenheim',kind:'shot',sourceKind:'champion',sourceId:1,x:0,y:0,variant:0,family:'electric',...spec},{x:0,y:0});
     if(spec.name==='charge'){const e={id:1,key:'hohenheim',kind:'champion',alive:true,x:0,y:0,state:{hohenCharge:{progress:.5}}},g={units:[e]};a.hohenCharge.sync(g,e,true);c.suspend(1.5).then(()=>{delete e.state.hohenCharge;a.hohenCharge.sync(g,e,true);c.resume();});}
     else{play();if(spec.name.startsWith('beam'))for(const t of [.12,.24])c.suspend(t).then(()=>{play();c.resume();});}
     const out=await c.startRendering();if(layers||a.synth.swings.active.size||a.hohenCharge.fields.size)throw Error('Layered synthesis or leaked source');
     const channels=[];for(let i=0;i<2;i++){const bytes=new Uint8Array(out.getChannelData(i).buffer);let raw='';for(let n=0;n<bytes.length;n+=8192)raw+=String.fromCharCode(...bytes.subarray(n,n+8192));channels.push(btoa(raw));}rows.push({name:spec.name,history:a.synth.swings.history,channels});
    }return rows;
   }''')
   waves={};stats={}
   for row in rows:
    x=np.column_stack([np.frombuffer(base64.b64decode(ch),dtype='<f4')for ch in row['channels']]);rms=float(np.sqrt(np.mean(x*x)));peak=float(np.max(np.abs(x)));assert np.isfinite(x).all()and .00015<rms<.2 and peak<.99,(mode,row['name'],rms,peak);waves[row['name']]=x;stats[row['name']]={'rms':rms,'peak':peak,'history':row['history']}
   assert np.max(np.abs(waves['firearm'][int(.4*24000):]))<1e-7
   assert np.max(np.abs(waves['charge'][int(1.65*24000):]))<1e-7
   def high_energy(x):
    signal=x[:,0];spectrum=np.abs(np.fft.rfft(signal));freq=np.fft.rfftfreq(len(signal),1/24000);return float(np.sum(spectrum[freq>6000]**2))
   assert high_energy(waves['beam'])<high_energy(waves['beam-reference'])*.25
   if mode=='desktop':
    previews={'hohenheim-charge-preview.wav':waves['charge'],'hohenheim-tactical-preview.wav':waves['q'],'hohenheim-basic-preview.wav':waves['beam'],'hohenheim-ultimate-preview.wav':np.concatenate([waves['grow'],waves['full']]),'outis-shotgun-preview.wav':waves['shotgun'],'firearm-impact-short-preview.wav':waves['firearm'][:18000]}
    for name,x in previews.items():
     with wave.open(str(ROOT/'artifacts'/name),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(24000);f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
   assert not errors,(mode,errors);assert not external,(mode,external);(ART/(mode+'.json')).write_text(json.dumps(stats,indent=2));await ctx.close();await browser.close();print(mode+': piercing routes, actual shotgun stage, charge cleanup, Hohenheim beam/7+3 pulses, reduced harshness and short quieter impacts passed.',flush=True)
 await asyncio.to_thread(server.shutdown);server.server_close()
if __name__=='__main__':asyncio.run(main())
