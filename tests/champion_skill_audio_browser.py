"""Champion-specific recordings, real effect timings and offline playback."""
import asyncio,base64,json,os,shutil,threading,wave
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import numpy as np
from playwright.async_api import async_playwright
from yi_audio_browser import SETUP
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts/champion-skill-audio';ART.mkdir(parents=True,exist_ok=True)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   file=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(file.stat().st_size));self.end_headers()
   with file.open('rb')as f:shutil.copyfileobj(f,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  for mode in os.getenv('SKILL_TEST_MODES','desktop,mobile,offline,offline-mobile').split(','):
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
   await p.goto(url,wait_until='networkidle',timeout=90000);await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.audio.context?.state==="running"');await p.evaluate('()=>__moba.audio.synth.swings.ready');assert await p.evaluate('__moba.audio.synth.swings.buffers.size===26&&__moba.audio.synth.swings.failures.length===0')
   await p.evaluate(SETUP,'rudolph');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.attack(__moba.game.player,{x:44,y:20})');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="hohenElectrocute"&&s.cue==="weapon")')
   await p.evaluate('__moba.game.cast(__moba.game.player,"r",{x:45,y:20});advance(1.26)');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="hohenElectrocute"&&s.cue==="burst")')
   await p.wait_for_timeout(180);await p.evaluate(SETUP,'honglu');await p.evaluate('()=>{const g=__moba.game;g.player.hp=100;const a=target(41,20,0);a.hp=100;target(42,20,0).hp=100;target(45);__moba.audio.synth.swings.history=[];g.cast(g.player,"r",{x:44,y:20});g.zones[0].moving=false;}');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="waterSplash"&&s.cue==="waterfall")')
   await p.evaluate('advance(.51)');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="waterSplash"&&s.cue==="water")')
   await p.wait_for_timeout(180);await p.evaluate(SETUP,'honglu');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.cast(__moba.game.player,"q",__moba.game.player);advance(1.21)');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="waterSplash")')
   for key,slot in [('heathcliff','q'),('sora','q'),('starbuck','r')]:
    await p.wait_for_timeout(180);await p.evaluate(SETUP,key);await p.evaluate('slot=>{const g=__moba.game;__moba.audio.synth.swings.history=[];g.cast(g.player,slot,{x:44,y:20});}',slot)
    assert await p.evaluate('__moba.audio.synth.swings.history.every(s=>s.id!=="groundImpact")')
    if key=='heathcliff':await p.evaluate('__moba.game.time=1.5;__moba.mobile.api.releaseTactical(__moba.game,__moba.game.player,{x:44,y:20})')
    await p.evaluate('advance(1)');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="groundImpact")')
   await p.wait_for_timeout(180);await p.evaluate(SETUP,'nelly');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.attack(__moba.game.player,{x:42,y:20})');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="nellyMetal")');basic=await p.evaluate('__moba.audio.synth.swings.history.find(s=>s.id==="nellyMetal").pitch')
   await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.cast(__moba.game.player,"q",{x:46,y:20})');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="nellyMetal")');assert await p.evaluate('basic=>__moba.audio.synth.swings.history.filter(s=>s.id==="nellyMetal").length===1&&__moba.audio.synth.swings.history.find(s=>s.id==="nellyMetal").pitch>basic+2',basic)
   await p.wait_for_timeout(180);await p.evaluate(SETUP,'rodya');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.cast(__moba.game.player,"r",target(45));__moba.game.player.castSlot="q";advance(.4)');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="iceAxeImpact")')
   await p.wait_for_timeout(180);await p.evaluate(SETUP,'marton');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.attack(__moba.game.player,target(44))');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="earthImpact")')
   rows=await p.evaluate('''async()=>{
    const Audio=__moba.audio.constructor,rate=24000,rows=[];
    const cases=[{name:'rudolph-basic',key:'rudolph',kind:'swing'},{name:'rudolph-r',key:'rudolph',kind:'detonation',slot:'r',phase:'ability-impact'},{name:'honglu-q',key:'honglu',kind:'water',slot:'q',phase:'healing-ripple'},{name:'honglu-r',key:'honglu',kind:'waterfall',slot:'r',phase:'waterfall-start'},{name:'honglu-heal',key:'honglu',kind:'water',slot:'r',phase:'waterfall-heal'},{name:'landing',key:'heathcliff',kind:'slam',phase:'heath-landing'},{name:'nelly-basic',key:'nelly',kind:'swing'},{name:'nelly-q',key:'nelly',kind:'shot',slot:'q'},{name:'ice',key:'rodya',kind:'hit',slot:'r',phase:'rodya-ice-hit'},{name:'earth',key:'marton',kind:'hit',phase:'marton-root-hit'}];
    for(const spec of cases){
     const c=new OfflineAudioContext(2,rate*2,rate),a=new Audio({context:c,storage:false});await a.synth.swings.ready;let layers=0;for(const name of ['tone','noise','element']){const fn=a.synth[name].bind(a.synth);a.synth[name]=(...args)=>{layers++;return fn(...args);};}
     a.play({sourceKind:'champion',sourceId:1,x:0,y:0,variant:0,...spec},{x:0,y:0});const out=await c.startRendering();if(layers||a.synth.swings.active.size)throw Error('Extra synthesis or leaked voice');
     const channels=[];for(let i=0;i<2;i++){const bytes=new Uint8Array(out.getChannelData(i).buffer);let raw='';for(let n=0;n<bytes.length;n+=8192)raw+=String.fromCharCode(...bytes.subarray(n,n+8192));channels.push(btoa(raw));}rows.push({name:spec.name,history:a.synth.swings.history,channels});
    }return rows;
   }''')
   waves={};stats={}
   for row in rows:
    x=np.column_stack([np.frombuffer(base64.b64decode(ch),dtype='<f4')for ch in row['channels']]);rms=float(np.sqrt(np.mean(x*x)));peak=float(np.max(np.abs(x)));assert np.isfinite(x).all()and .0002<rms<.2 and peak<.99,(mode,row['name'],rms,peak);assert len(row['history'])==1;waves[row['name']]=x;stats[row['name']]={'rms':rms,'peak':peak,'sample':row['history'][0]}
   assert stats['rudolph-r']['rms']>stats['rudolph-basic']['rms']*1.5
   assert stats['honglu-r']['rms']>stats['honglu-q']['rms']*1.4
   assert stats['nelly-q']['sample']['pitch']>stats['nelly-basic']['sample']['pitch']+2
   if mode=='desktop':
    sequences={'rudolph-skill-preview.wav':['rudolph-basic','rudolph-r'],'honglu-water-preview.wav':['honglu-q','honglu-r','honglu-heal'],'landing-shockwave-preview.wav':['landing'],'nelly-attacks-preview.wav':['nelly-basic','nelly-q'],'rodya-ice-impact-preview.wav':['ice'],'marton-earth-impact-preview.wav':['earth']}
    for name,sequence in sequences.items():
     x=np.concatenate([waves[k][:36000]for k in sequence])
     with wave.open(str(ROOT/'artifacts'/name),'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(24000);f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
   assert not errors,(mode,errors);assert not external,(mode,external);(ART/(mode+'.json')).write_text(json.dumps(stats,indent=2));await ctx.close();await browser.close();print(mode+': six supplied effect types, stronger ultimates, healing aggregation, actual landings, knife fan pitch, ice/earth contacts and waveform cleanup passed.',flush=True)
 await asyncio.to_thread(server.shutdown);server.server_close()
if __name__=='__main__':asyncio.run(main())
