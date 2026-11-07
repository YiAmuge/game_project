"""Real Queen charge/release, Alisa fire, jade Hong Lu, and offline audio rendering."""
import asyncio,base64,json,os,re,shutil,threading,wave
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import numpy as np
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'queen-alisa-audio';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   f=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(f.stat().st_size));self.end_headers()
   with f.open('rb')as b:shutil.copyfileobj(b,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  rows=[]
  for mode in ['desktop','mobile','offline','offline-mobile']:
   mobile='mobile'in mode;offline=mode.startswith('offline');browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']);ctx=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201'))+'/?debug'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(url,wait_until='networkidle',timeout=120000);await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.audio.context?.state==="running"');await p.evaluate('()=>__moba.audio.synth.swings.ready');assert await p.evaluate('__moba.audio.synth.swings.buffers.size===26&&!__moba.audio.synth.swings.failures.length')
   await p.evaluate(SETUP,'queen');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.attack(__moba.game.player,{x:47,y:20})');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="queenStar")')
   await p.evaluate('__moba.game.cast(__moba.game.player,"q",{x:47,y:20})');await p.wait_for_function('__moba.audio.queenCharge.fields.has(__moba.game.player.id+"/q")');await p.evaluate('advance(1.55)');await p.wait_for_function('!__moba.audio.queenCharge.fields.size&&__moba.audio.synth.swings.history.some(s=>s.id==="yiShine"&&s.slot!=="r")')
   await p.evaluate(SETUP,'queen');await p.evaluate('__moba.game.cast(__moba.game.player,"r",{x:47,y:20})');await p.wait_for_function('__moba.audio.queenCharge.fields.size===1');await p.evaluate('__moba.audio.enabled=false');await p.wait_for_function('!__moba.audio.queenCharge.fields.size');await p.evaluate('__moba.audio.enabled=true');await p.wait_for_function('__moba.audio.queenCharge.fields.size===1');await p.evaluate('advance(.5);__moba.game.cast(__moba.game.player,"r",{x:47,y:20});advance(.01)');await p.wait_for_function('!__moba.audio.queenCharge.fields.size')
   await p.evaluate(SETUP,'queen');await p.evaluate('__moba.game.cast(__moba.game.player,"r",{x:47,y:20})');await p.wait_for_function('__moba.audio.queenCharge.fields.size===1');await p.evaluate('__moba.game.status(__moba.game.player,"stun",1,1);advance(.02)');await p.wait_for_function('!__moba.audio.queenCharge.fields.size')
   await p.evaluate(SETUP,'alisa');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.attack(__moba.game.player,{x:47,y:20});__moba.game.cast(__moba.game.player,"q",{x:47,y:20})');await p.wait_for_function('__moba.audio.synth.swings.history.filter(s=>s.id==="alisaFire").length===2')
   await p.evaluate(SETUP,'honglu');await p.wait_for_timeout(250);await p.screenshot(path=str(ART/f'{mode}-honglu-jade.png'))
   data=await p.evaluate('''async()=>{const c=new OfflineAudioContext(2,Math.ceil(24000*15),24000),a=new __moba.audio.constructor({context:c,storage:false});await a.synth.swings.ready;const unit={id:1,key:'queen',kind:'champion',team:0,alive:true,state:{}},game={time:0,units:[unit],hidden:()=>false,visibleTo:()=>true},listener={x:0,y:0,team:0};let layers=0;for(const name of ['tone','noise','element']){const fn=a.synth[name].bind(a.synth);a.synth[name]=(...args)=>{layers++;return fn(...args);};}const emit=(key,kind,slot,phase)=>a.play({key,kind,slot,phase,family:key==='queen'?'arcane':undefined,sourceKind:'champion',sourceId:1,x:0,y:0,duration:1.2},listener),sync=()=>a.queenCharge.sync(game,listener,true);emit('queen','shot',undefined,'queen-star-fire');
    const jobs=[[1.5,()=>{game.time=1.5;unit.state.queenQ={phase:'preparing',at:1.5,x:0,y:0};sync();}],[3,()=>{game.time=3;unit.state.queenQ.phase='firing';sync();emit('queen','shot','q','arcana-beam');}],[4.5,()=>{game.time=4.5;unit.state.queenR={phase:'charging',at:4.5,x:0,y:0};sync();}],[5.75,()=>{game.time=5.75;sync();}],[7,()=>{game.time=7;sync();}],[8.25,()=>{game.time=8.25;unit.state.queenR.phase='firing';sync();emit('queen','shot','r','arcana-beam');}],[10,()=>emit('alisa','swing')],[11.5,()=>emit('alisa','cast','q')]].map(([t,fn])=>c.suspend(t).then(()=>{fn();return c.resume();}));const out=await c.startRendering();await Promise.all(jobs);const channels=[];for(let ch=0;ch<2;ch++){const b=new Uint8Array(out.getChannelData(ch).buffer);let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));channels.push(btoa(s));}return{channels,layers,active:a.synth.swings.active.size,fields:a.queenCharge.fields.size,history:a.synth.swings.history};}''')
   x=np.column_stack([np.frombuffer(base64.b64decode(ch),dtype='<f4')for ch in data.pop('channels')]);rate=24000
   def rms(a,b):return float(np.sqrt(np.mean(x[round(a*rate):round(b*rate)]**2)))
   stats={'qCharge':rms(2,2.5),'qFire':rms(3.1,3.5),'rCharge':rms(5.5,6.5),'rFire':rms(8.35,8.75),'basic':rms(0,.8),'alisaBasic':rms(10,10.7),'alisaQ':rms(11.5,12.3),'peak':float(np.max(np.abs(x)))}
   assert stats['qFire']>stats['qCharge']*2 and stats['rFire']>stats['rCharge']*2,stats
   assert stats['basic']>.001 and stats['alisaBasic']>.001 and stats['alisaQ']>.001,stats
   assert data['layers']==0 and data['active']==0 and data['fields']==0,data
   assert stats['peak']<.99 and np.isfinite(x).all(),stats
   if mode=='desktop':
    for name,start,end in [('queen-basic-preview.wav',0,1.3),('queen-q-preview.wav',1.5,4.4),('queen-r-preview.wav',4.5,9.8),('alisa-basic-preview.wav',10,11.3),('alisa-q-preview.wav',11.5,13)]:
     with wave.open(str(ART/name),'wb')as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes((np.clip(x[round(start*rate):round(end*rate)],-1,1)*32767).astype('<i2').tobytes())
   assert not errors,(mode,errors);assert not external,external;(ART/(mode+'.json')).write_text(json.dumps({**stats,**data},indent=2));rows.append({'mode':mode,**stats});await ctx.close();await browser.close();print(mode,stats,flush=True)
  (ART/'results.json').write_text(json.dumps(rows,indent=2))
 await asyncio.to_thread(server.shutdown);server.server_close()
asyncio.run(main())
