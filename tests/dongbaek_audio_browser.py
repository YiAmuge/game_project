"""Check actual samples and fading waveforms on desktop, touch and standalone."""
import asyncio,base64,json,os,re,wave,threading,shutil
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import numpy as np
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'dongbaek-audio';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   p=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(p.stat().st_size));self.end_headers()
   with p.open('rb')as f:shutil.copyfileobj(f,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  report=[]
  for mode in ['desktop','mobile','offline','offline-mobile']:
   mobile='mobile'in mode;offline=mode.startswith('offline');browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']);ctx=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201'))+'/?debug'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(url,wait_until='networkidle',timeout=120000);await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.audio.context?.state==="running"');await p.evaluate('()=>__moba.audio.synth.swings.ready');assert await p.evaluate('__moba.audio.synth.swings.buffers.size===24&&__moba.audio.synth.swings.failures.length===0')
   await p.evaluate(SETUP,'dongbaek');await p.evaluate('()=>{const g=__moba.game,t=target(43);target(44);__moba.audio.synth.swings.history=[];g.attack(g.player,t);}')
   await p.wait_for_function("__moba.audio.synth.swings.history.some(s=>s.id==='dongbaekWind')&&__moba.audio.synth.swings.history.some(s=>s.id==='dongbaekChimes')&&__moba.audio.synth.swings.history.some(s=>s.id==='impactBlunt')")
   await p.wait_for_timeout(170);await p.evaluate(SETUP,'dongbaek');await p.evaluate('()=>{const g=__moba.game;__moba.audio.synth.swings.history=[];g.cast(g.player,"r",{x:45,y:20});advance(.8);}')
   await p.wait_for_function("__moba.audio.synth.swings.history.some(s=>s.id==='dongbaekChimes'&&s.duration>2.5)");assert await p.evaluate("__moba.audio.synth.swings.history.filter(s=>s.id==='dongbaekChimes').length===1")
   # Render all parts on a real Web Audio clock, including four separate contact times.
   data=await p.evaluate('''async()=>{const rate=24000,c=new OfflineAudioContext(2,Math.ceil(rate*9.7),rate),a=new __moba.audio.constructor({context:c,storage:false});await a.synth.swings.ready;let layers=0;for(const name of ['tone','noise','element']){const fn=a.synth[name].bind(a.synth);a.synth[name]=(...args)=>{layers++;return fn(...args);};}
    const emit=(kind,slot)=>a.play({key:'dongbaek',kind,slot,sourceKind:'champion',sourceId:1,x:0,y:0,phase:kind==='petal'?'dongbaek-bloom':undefined,duration:kind==='petal'&&slot==='r'?2.6:undefined},{x:0,y:0});emit('petal');
    const times=[[1.6,()=>emit('petal','r')],[4.8,()=>{emit('swing');emit('petal');emit('hit');}],[6.4,()=>{emit('ultimate','r');emit('petal','r');emit('hit','r');}],[6.65,()=>emit('hit','r')],[6.9,()=>emit('hit','r')],[7.15,()=>emit('hit','r')]];
    const jobs=times.map(([time,play])=>c.suspend(time).then(()=>{play();return c.resume();}));const out=await c.startRendering();await Promise.all(jobs);const channels=[];for(let ch=0;ch<2;ch++){const b=new Uint8Array(out.getChannelData(ch).buffer);let raw='';for(let i=0;i<b.length;i+=8192)raw+=String.fromCharCode(...b.subarray(i,i+8192));channels.push(btoa(raw));}return{channels,layers,active:a.synth.swings.active.size,history:a.synth.swings.history};}''')
   samples=np.column_stack([np.frombuffer(base64.b64decode(ch),dtype='<f4')for ch in data.pop('channels')]);rate=24000
   def rms(start,end):return float(np.sqrt(np.mean(samples[round(start*rate):round(end*rate)]**2)))
   metrics={'basicEarly':rms(.10,.30),'basicTail':rms(.80,1.05),'ultimateEarly':rms(1.7,1.95),'ultimateTail':rms(3.85,4.2),'peak':float(np.max(np.abs(samples)))}
   assert data['layers']==0 and data['active']==0,data
   assert metrics['basicTail']<metrics['basicEarly']*.5,metrics
   assert metrics['ultimateTail']<metrics['ultimateEarly']*.35,metrics
   assert metrics['ultimateEarly']>metrics['basicEarly']*1.5,metrics
   assert metrics['peak']<.99 and np.isfinite(samples).all(),metrics
   assert not errors,errors;assert not external,external
   if mode=='desktop':
    for name,start,end in [('dongbaek-basic-preview.wav',4.8,6.3),('dongbaek-ultimate-preview.wav',6.4,9.5)]:
     x=samples[round(start*rate):round(end*rate)]
     with wave.open(str(ART/name),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
   (ART/(mode+'.json')).write_text(json.dumps({**metrics,**data},indent=2));report.append({'mode':mode,'errors':errors,'externalRequests':external,**metrics});await ctx.close();await browser.close();print(mode,metrics,flush=True)
  (ART/'results.json').write_text(json.dumps(report,indent=2))
 await asyncio.to_thread(server.shutdown);server.server_close()
asyncio.run(main())
