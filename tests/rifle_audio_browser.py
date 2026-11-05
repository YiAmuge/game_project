"""Real single-round, reload, firearm contact and Gubo playback on both clients."""
import asyncio,base64,json,os,shutil,threading,wave
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import numpy as np
from playwright.async_api import async_playwright
from yi_audio_browser import SETUP
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts/rifle-audio';ART.mkdir(parents=True,exist_ok=True)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   file=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(file.stat().st_size));self.end_headers()
   with file.open('rb')as f:shutil.copyfileobj(f,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  for mode in os.getenv('RIFLE_TEST_MODES','desktop,mobile,offline,offline-mobile').split(','):
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
   await p.goto(url,wait_until='networkidle',timeout=90000);await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.audio.context?.state==="running"');await p.evaluate('()=>__moba.audio.synth.swings.ready');assert await p.evaluate('__moba.audio.synth.swings.buffers.size===22')
   await p.evaluate(SETUP,'jamila');await p.evaluate('__moba.audio.synth.swings.history=[]')
   for i in range(4):
    await p.evaluate('__moba.game.attack(__moba.game.player,{x:48,y:20});advance(.15)');await p.wait_for_timeout(155)
   assert await p.evaluate('JSON.stringify(__moba.audio.synth.swings.history.filter(s=>s.id==="rifleRound").map(s=>s.pitch))==="[0,0,0,2]"')
   await p.evaluate(SETUP,'myo');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.cast(__moba.game.player,"q",{x:47,y:20});advance(.23)');await p.wait_for_function('__moba.audio.synth.swings.history.filter(s=>s.id==="rifleRound").length===4')
   await p.evaluate(SETUP,'jamila');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.player.ammo=0;advance(.01)');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="jamilaReload")')
   await p.evaluate('advance(2)');await p.wait_for_timeout(1600);assert await p.evaluate('__moba.audio.synth.swings.history.filter(s=>s.id==="jamilaReload").length===1')
   await p.evaluate(SETUP,'gubo');await p.evaluate('()=>{const g=__moba.game;__moba.audio.synth.swings.history=[];g.attack(g.player,{x:48,y:20});}')
   await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="guboRifle")')
   await p.evaluate('__moba.game.player.attackCd=0;__moba.game.cast(__moba.game.player,"q",__moba.game.player);__moba.game.attack(__moba.game.player,{x:48,y:20})');await p.wait_for_timeout(100)
   await p.evaluate('__moba.game.cast(__moba.game.player,"r",target(46));advance(1.21)');await p.wait_for_function('__moba.audio.synth.swings.history.filter(s=>s.id==="guboRifle").length===3')
   assert await p.evaluate('JSON.stringify(__moba.audio.synth.swings.history.filter(s=>s.id==="guboRifle").map(s=>s.pitch))==="[0,-2,-4.5]"')
   assert await p.evaluate('__moba.audio.synth.swings.history.filter(s=>s.id==="jamilaReload").length===1')
   rows=await p.evaluate('''async()=>{
    const Audio=__moba.audio.constructor,rate=24000,rows=[];
    const cases=[{name:'jamila',key:'jamila',phase:'lca-rifle'},{name:'myo',key:'myo',slot:'q'},{name:'reload',key:'jamila',kind:'reload',phase:'lca-reload'},{name:'gubo-basic',key:'gubo',phase:'gubo-basic'},{name:'gubo-q',key:'gubo',phase:'gubo-empowered'},{name:'gubo-r',key:'gubo',phase:'gubo-ultimate'},...[0,1,2,3].map(variant=>({name:'impact-'+variant,key:'gubo',kind:'hit',variant}))];
    for(const spec of cases){
     const c=new OfflineAudioContext(2,rate*2.5,rate),a=new Audio({context:c,storage:false});await a.synth.swings.ready;let layers=0;for(const name of ['tone','noise','element']){const fn=a.synth[name].bind(a.synth);a.synth[name]=(...args)=>{layers++;return fn(...args);};}
     const play=(extra={})=>a.play({kind:'shot',sourceKind:'champion',sourceId:1,x:0,y:0,...spec,...extra},{x:0,y:0});play();
     if(['jamila','myo'].includes(spec.name))for(let i=1;i<4;i++)c.suspend(i*(spec.name==='jamila'?.15:.075)).then(()=>{play(spec.name==='jamila'&&i===3?{phase:'lca-shield-round'}:{});c.resume();});
     const out=await c.startRendering();if(layers||a.synth.swings.active.size)throw Error('Extra layers or leaked voice');const history=a.synth.swings.history;
     if(['jamila','myo'].includes(spec.name)&&history.length!==4)throw Error('Wrong round count');
     if(spec.name==='reload'&&(history.length!==1||history[0].duration!==a.synth.swings.buffers.get('jamilaReload').duration||history[0].pitch!==0))throw Error('Reload changed/repeated');
     const channels=[];for(let i=0;i<2;i++){const bytes=new Uint8Array(out.getChannelData(i).buffer);let raw='';for(let n=0;n<bytes.length;n+=8192)raw+=String.fromCharCode(...bytes.subarray(n,n+8192));channels.push(btoa(raw));}rows.push({name:spec.name,history,channels});
    }return rows;
   }''')
   waves={};stats={}
   for row in rows:
    x=np.column_stack([np.frombuffer(base64.b64decode(ch),dtype='<f4')for ch in row['channels']]);assert np.isfinite(x).all();rms=float(np.sqrt(np.mean(x*x)));peak=float(np.max(np.abs(x)));assert .0004<rms<.2 and peak<.99,(mode,row['name'],rms,peak);waves[row['name']]=x;stats[row['name']]={'rms':rms,'peak':peak,'history':row['history']}
   for name,interval in [('jamila',.15),('myo',.075)]:
    history=stats[name]['history'];assert len(history)==4
    assert all(abs(h['at']-i*interval)<.006 for i,h in enumerate(history)),history
   assert stats['gubo-basic']['history'][0]['pitch']>stats['gubo-q']['history'][0]['pitch']>stats['gubo-r']['history'][0]['pitch']
   for i in range(4):assert np.max(np.abs(waves['impact-'+str(i)][int(.4*24000):]))<1e-7
   assert all(np.corrcoef(waves['impact-0'][:,0],waves['impact-'+str(i)][:,0])[0,1]<.99 for i in [1,2,3])
   if mode=='desktop':
    previews={'jamila-rifle-preview.wav':waves['jamila'],'myo-rifle-preview.wav':waves['myo'],'rifle-reload-preview.wav':waves['reload'],'gubo-rifle-preview.wav':np.concatenate([waves['gubo-basic'],waves['gubo-q'],waves['gubo-r']]),'firearm-impact-short-preview.wav':np.concatenate([waves['impact-'+str(i)][:18000]for i in range(4)])}
    for name,x in previews.items():
     with wave.open(str(ROOT/'artifacts'/name),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(24000);f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
   assert not errors,(mode,errors);assert not external,(mode,external);(ART/(mode+'.json')).write_text(json.dumps(stats,indent=2));await ctx.close();await browser.close();print(mode+': exact round counts/timing, fourth-round pitch, one-shot reload, Gubo three levels and varied firearm impacts passed.',flush=True)
 await asyncio.to_thread(server.shutdown);server.server_close()
if __name__=='__main__':asyncio.run(main())
