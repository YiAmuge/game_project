"""Yi recordings, real combat routing, sustained-buff cleanup and offline audio."""
import asyncio,base64,json,os,re,shutil,threading,wave
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import numpy as np
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts/yi-audio';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   file=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(file.stat().st_size));self.end_headers()
   with file.open('rb')as f:shutil.copyfileobj(f,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  for mode in os.getenv('YI_TEST_MODES','desktop,mobile,offline,offline-mobile').split(','):
   mobile='mobile'in mode;offline=mode.startswith('offline');errors=[];external=[]
   browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
   ctx=await browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201'))+'/?debug=1'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await page.route('**/*',route)
   await page.goto(url,wait_until='networkidle',timeout=90000);await page.click('#training-open');await page.click('#start');await page.wait_for_function('__moba.audio.context?.state==="running"');await page.evaluate('()=>__moba.audio.synth.swings.ready')
   assert await page.evaluate('__moba.audio.synth.swings.buffers.size===9&&__moba.audio.synth.swings.failures.length===0')
   await page.evaluate(SETUP,'yi')
   await page.evaluate('()=>{const g=__moba.game;__moba.audio.synth.swings.history=[];target(46);target(41,20,0);g.cast(g.player,"q",{x:46,y:20});}')
   await page.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="yiDeploy")')
   qgain=await page.evaluate('__moba.audio.synth.swings.history.find(s=>s.id==="yiDeploy").gain')
   await page.evaluate('()=>{const g=__moba.game;__moba.audio.synth.swings.history=[];g.cast(g.player,"r",{x:42,y:20});advance(.51);}')
   await page.wait_for_function('__moba.audio.yiBuff.field&&__moba.audio.synth.swings.history.some(s=>s.id==="yiImpact")')
   assert await page.evaluate('q=>__moba.audio.synth.swings.history.filter(s=>s.id==="yiDeploy").length===1&&__moba.audio.synth.swings.history.find(s=>s.id==="yiDeploy").gain*1.5<q',qgain)
   assert await page.evaluate('__moba.game.soundEvents.filter(e=>e.phase==="yi-zone-hit").every(e=>e.slot==="q")')
   await page.evaluate('()=>{window.shineEnded=false;__moba.audio.yiBuff.field.source.addEventListener("ended",()=>window.shineEnded=true);window.shineSource=__moba.audio.yiBuff.field.source;advance(2.9);}')
   await page.wait_for_timeout(100);assert await page.evaluate('__moba.audio.yiBuff.field?.source===shineSource')
   await page.evaluate('advance(.7)');await page.wait_for_function('!__moba.audio.yiBuff.field&&shineEnded')
   # Basic projectile contacts use the mixed glass recording as well.
   await page.evaluate(SETUP,'yi');await page.evaluate('()=>{const g=__moba.game;__moba.audio.synth.swings.history=[];g.attack(g.player,target(44));advance(.3);}')
   await page.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="yiImpact"&&s.cue==="impact")')
   # Mute, pause, menu exit and the last recipient dying stop the sustained source.
   await page.evaluate('__moba.game.addBuff(__moba.game.player,"ogamdo",4)');await page.wait_for_function('__moba.audio.yiBuff.field')
   await page.click('#sound-toggle');await page.wait_for_function('!__moba.audio.yiBuff.field');await page.click('#sound-toggle');await page.wait_for_function('__moba.audio.yiBuff.field')
   assert await page.evaluate('()=>{const a=__moba.audio,g=__moba.game;a.sync(g,{playing:true,paused:true});const paused=!a.yiBuff.field;a.sync(g,{playing:false});return paused&&!a.yiBuff.field;}')
   await page.wait_for_function('__moba.audio.yiBuff.field');await page.evaluate('__moba.game.player.alive=false');await page.wait_for_function('!__moba.audio.yiBuff.field')
   samples=await page.evaluate('''async()=>{
    const Audio=__moba.audio.constructor,rate=24000,rows=[];
    for(const spec of [{name:'q',kind:'cast',slot:'q'},{name:'r',kind:'ultimate',slot:'r'},{name:'hit',kind:'hit'},{name:'q-hit',kind:'hit',slot:'q'},{name:'hit-variant',kind:'hit',variant:3},{name:'shine'}]){
     const shine=spec.name==='shine',c=new OfflineAudioContext(2,rate*(shine?4.5:2),rate),a=new Audio({context:c,storage:false});await a.synth.swings.ready;
     let synthLayers=0;for(const key of ['tone','noise','element']){const original=a.synth[key].bind(a.synth);a.synth[key]=(...args)=>{synthLayers++;return original(...args);};}
     if(shine){const p={id:1,kind:'champion',alive:true,x:0,y:0,buffs:{ogamdo:4}},g={time:0,units:[p],player:p,winner:null};a.yiBuff.sync(g,p,true);c.suspend(4).then(()=>{g.time=4;a.yiBuff.sync(g,p,true);c.resume();});}
     else a.play({key:'yi',sourceKind:'champion',sourceId:1,x:0,y:0,...spec},{x:0,y:0});
     const out=await c.startRendering();if(synthLayers)throw Error('Added synthesized layers');if(a.synth.swings.active.size||a.yiBuff.field)throw Error('Leaked Yi source');
     const channels=[];for(let ch=0;ch<2;ch++){const bytes=new Uint8Array(out.getChannelData(ch).buffer);let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));channels.push(btoa(raw));}
     rows.push({name:spec.name,rate,channels,sample:a.synth.swings.history[0]});
    }return rows;
   }''')
   waves={};stats={}
   for row in samples:
    x=np.column_stack([np.frombuffer(base64.b64decode(ch),dtype='<f4')for ch in row['channels']]);waves[row['name']]=x;peak=float(np.max(np.abs(x)));rms=float(np.sqrt(np.mean(x*x)));assert np.isfinite(x).all()and .0002<rms<.2 and peak<.99,(mode,row['name'],peak,rms)
    if row.get('sample'):assert abs(row['sample']['pitch'])<=.15 and all(.97<n<1.03 for n in row['sample']['rates'])
    stats[row['name']]={'rms':rms,'peak':peak,'sample':row.get('sample')}
   assert stats['q']['rms']>stats['r']['rms']*1.4
   assert np.array_equal(waves['hit'],waves['q-hit'])
   assert np.sqrt(np.mean(waves['shine'][int(4.2*24000):]**2))<1e-7
   assert np.sqrt(np.mean(waves['shine'][int(3.2*24000):int(3.8*24000)]**2))>.0002
   if mode=='desktop':
    previews={'yi-deploy-preview.wav':np.concatenate([waves['q'],waves['r']]),'yi-shine-preview.wav':waves['shine'],'yi-impact-preview.wav':np.concatenate([waves['hit'],waves['hit-variant']])}
    for name,x in previews.items():
     with wave.open(str(ROOT/'artifacts'/name),'wb')as file:file.setnchannels(2);file.setsampwidth(2);file.setframerate(24000);file.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
   assert not errors,(mode,errors);assert not external,(mode,external);(ART/(mode+'.json')).write_text(json.dumps(stats,indent=2));await ctx.close();await browser.close();print(mode+': Yi Q/R, louder deployment, basic/Q glass mix, buff loop, mute/pause/death/expiry cleanup and waveform checks passed.',flush=True)
 await asyncio.to_thread(server.shutdown);server.server_close()
if __name__=='__main__':asyncio.run(main())
