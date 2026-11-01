"""Decode the uploaded MP3s and render real Web Audio for desktop, mobile and offline builds."""
import asyncio,base64,json,os,re,threading,shutil,wave
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
import numpy as np
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'slash-audio';ART.mkdir(parents=True,exist_ok=True)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5199')
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   file=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(file.stat().st_size));self.end_headers()
   with file.open('rb')as f:shutil.copyfileobj(f,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  for mode in os.getenv('SLASH_TEST_MODES','desktop,mobile,offline,offline-mobile').split(','):
   mobile='mobile' in mode;offline=mode.startswith('offline');errors=[];external=[]
   browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
   ctx=await browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else URL)+'/?debug=1'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(url,wait_until='networkidle',timeout=90000);await p.wait_for_function('window.__moba')
   await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.audio.context?.state==="running"')
   await p.evaluate('()=>__moba.audio.synth.slashes.ready');assert await p.evaluate('__moba.audio.synth.slashes.buffers.size===5&&__moba.audio.synth.slashes.failures.length===0')
   # The real game emitter, mixer, routing and synthesizer all reach the recordings.
   await p.evaluate(SETUP,'ryoshu');before=await p.evaluate('__moba.audio.synth.slashes.played')
   await p.evaluate('__moba.game.attack(__moba.game.player,target(41.3))');await p.wait_for_function('n=>__moba.audio.synth.slashes.played>n',arg=before)
   await p.wait_for_timeout(300);assert await p.evaluate('__moba.audio.synth.slashes.active.size===0')
   assert await p.evaluate('__moba.audio.synth.slashes.history.some(s=>s.cue==="impact"&&s.id==="flesh")')
   await p.evaluate(SETUP,'faust');await p.evaluate('__moba.audio.synth.slashes.history=[];__moba.game.attack(__moba.game.player,target(41.3));advance(.2)')
   await p.wait_for_function('__moba.audio.synth.slashes.history.some(s=>s.cue==="weapon"&&s.id==="slash")&&__moba.audio.synth.slashes.history.some(s=>s.cue==="impact"&&s.id==="flesh")')
   await p.evaluate('__moba.game.cast(__moba.game.player,"q",{x:44,y:20})');await p.wait_for_function('__moba.audio.synth.slashes.history.some(s=>s.cue==="cast"&&s.id==="slash")')
   # Real decoding, dynamics limiting, edge fades, speed/pitch differences and node cleanup.
   rendered=await p.evaluate('''async()=>{
    const Audio=__moba.audio.constructor,rate=24000,results=[];
    const cases=[...['knife','katana','blade','axe','greatsword','scythe','glaive','claw'].flatMap(family=>[0,3].map(variant=>({name:family+'-'+variant,family,variant,kind:'swing'}))),{name:'cut-impact',family:'katana',kind:'hit'},{name:'heavy-impact',family:'axe',kind:'hit'},{name:'blade-cast',family:'blade',kind:'cast'},{name:'blade-fire',family:'blade',kind:'swing',variant:0,element:'fire'},{name:'crowded',kind:'crowded'},{name:'muted',kind:'muted'}];
    for(const spec of cases){
     const c=new OfflineAudioContext(2,rate*2.5,rate),a=new Audio({context:c,storage:false});await a.synth.slashes.ready;if(a.synth.slashes.buffers.size!==5)throw Error('Missing recordings');
     let layers=0;for(const name of ['noise','tone','element']){const original=a.synth[name].bind(a.synth);a.synth[name]=(...args)=>{layers++;return original(...args);};}
     const play=(extra={})=>a.play({key:'ryoshu',element:'metal',sourceKind:'champion',sourceId:1,x:0,y:0,...spec,...extra},{x:0,y:0});
     if(spec.kind==='crowded'){for(let i=0;i<40;i++)play({kind:'swing',sourceId:i});if(a.played>11||!a.play({kind:'ping',ping:'danger'},{x:0,y:0}))throw Error('Lost warning priority');}
     else if(spec.kind==='muted'){a.enabled=false;play({kind:'swing'});}
     else if(!play())throw Error('Slash rejected');
     const sample=a.synth.slashes.history[0],out=await c.startRendering();if(a.synth.slashes.active.size)throw Error('Leaked sample voices');
     if(!['crowded','muted'].includes(spec.name)&&(layers||a.synth.slashes.played!==1))throw Error('Mixed additional sound layers');
     const bytes=new Uint8Array(out.getChannelData(0).buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
     results.push({name:spec.name,rate,sample,played:a.synth.slashes.played,data:btoa(binary)});
    }return results;
   }''')
   stats={};waves={}
   for entry in rendered:
    data=np.frombuffer(base64.b64decode(entry['data']),dtype='<f4');rate=entry['rate'];peak=float(np.max(np.abs(data)));rms=float(np.sqrt(np.mean(data**2)));assert np.isfinite(data).all()
    if entry['name']=='muted':assert peak==0 and entry['played']==0
    else:assert .0004<rms<.2 and peak<.99,(mode,entry['name'],rms,peak);assert entry['played']>0
    if entry.get('sample'):assert entry['sample']['rates'][1]>entry['sample']['rates'][0] and entry['sample']['rates'][1]>entry['sample']['rates'][2]
    stats[entry['name']]={'peak':round(peak,5),'rms':round(rms,5),'sample':entry.get('sample')};waves[entry['name']]=data
   for family in ['knife','katana','blade','axe','greatsword','scythe','glaive','claw']:
    assert np.corrcoef(waves[family+'-0'],waves[family+'-3'])[0,1]<.95,(mode,family)
    assert stats[family+'-0']['sample']['id']==stats[family+'-3']['sample']['id'],(mode,family)
   assert stats['blade-0']['sample']['id']==stats['blade-cast']['sample']['id']=='slash'
   assert stats['cut-impact']['sample']['id']==stats['heavy-impact']['sample']['id']=='flesh'
   assert np.array_equal(waves['blade-0'],waves['blade-fire']),'Element overlays changed the fixed weapon sound'
   assert stats['knife-0']['sample']['pitch']>stats['greatsword-0']['sample']['pitch'];assert stats['knife-0']['sample']['duration']<stats['greatsword-0']['sample']['duration']
   if mode=='desktop':
    sequence=['blade-0','cut-impact','knife-0','katana-0','axe-0','greatsword-0'];preview=np.concatenate([np.concatenate([waves[name][:int(.65*rate)],np.zeros(int(.18*rate))])for name in sequence])
    with wave.open(str(ROOT/'artifacts'/'slash-audio-preview.wav'),'wb')as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes((np.clip(preview,-1,1)*32767).astype('<i2').tobytes())
   # Once unlocked, mute still silences these sources through the existing master bus.
   await p.click('#sound-toggle');await p.wait_for_timeout(300);assert await p.evaluate('!__moba.audio.enabled&&__moba.audio.master.gain.value<.01')
   assert not errors,(mode,errors);assert not external,(mode,external);(ART/f'{mode}-analysis.json').write_text(json.dumps(stats,indent=2));await ctx.close();await browser.close()
   print(mode+': all five recordings decoded; 22 waveform cases, fixed weapon sources, dedicated flesh impacts, no mixed layers, pitch/speed/envelope variation, crowd budget, cleanup and mute passed.',flush=True)
 await asyncio.to_thread(server.shutdown);server.server_close()
if __name__=='__main__':asyncio.run(main())
