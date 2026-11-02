"""One whoosh for weapon movement, with original impacts and offline playback."""
import asyncio,base64,json,os,re,threading,shutil,wave
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
import numpy as np
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'weapon-swings';ART.mkdir(parents=True,exist_ok=True)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201')
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   file=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(file.stat().st_size));self.end_headers()
   with file.open('rb')as f:shutil.copyfileobj(f,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  for mode in os.getenv('SWING_TEST_MODES','desktop,mobile,offline,offline-mobile').split(','):
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
   await p.evaluate('()=>__moba.audio.synth.swings.ready');assert await p.evaluate('__moba.audio.synth.swings.buffers.size===3&&__moba.audio.synth.swings.failures.length===0')
   # Actual combat emitters include blades, hammers, clubs/sacks, spears and fists.
   for key in ['ryoshu','marton','heathcliff','don','meursault','honglu']:
    await p.evaluate(SETUP,key);before=await p.evaluate('__moba.audio.synth.swings.played')
    await p.evaluate('__moba.game.attack(__moba.game.player,target(41.3))');await p.wait_for_function('n=>__moba.audio.synth.swings.played>n',arg=before)
    assert await p.evaluate('__moba.audio.synth.swings.history.every(s=>s.id===(s.cue==="impact"?"impactMix":"swing"))')
    await p.wait_for_timeout(160)
   await p.wait_for_timeout(400);assert await p.evaluate('__moba.audio.synth.swings.active.size===0')
   # Yan charges silently, then uses his own recording on release and Q sweeps.
   await p.evaluate(SETUP,'yan');await p.evaluate('__moba.audio.synth.swings.history=[];__moba.game.attack(__moba.game.player,target(41.3));advance(.2)')
   await p.wait_for_timeout(80);assert await p.evaluate('__moba.game.player.state.yanCharge&&!__moba.audio.synth.swings.history.some(s=>s.id==="yanGreatsword")')
   await p.evaluate('()=>{const g=__moba.game;__moba.mobile.api.releaseBasic(g,g.player,g.input.aim);}')
   await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="yanGreatsword"&&s.cue==="weapon")&&__moba.audio.synth.swings.history.some(s=>s.id==="impactMix"&&s.cue==="impact")')
   await p.wait_for_timeout(100);await p.evaluate('__moba.game.cast(__moba.game.player,"q",{x:44,y:20});advance(.35)')
   await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="yanGreatsword"&&s.cue==="cast")')
   await p.evaluate(SETUP,'yan');await p.evaluate('()=>{const g=__moba.game;g.player.state.ominous=6;g.cast(g.player,"r",g.player);__moba.audio.synth.swings.history=[];g.emitSound("swing",g.player);}')
   await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.family==="organic"&&s.id==="swing")')
   rendered=await p.evaluate('''async()=>{
    const Audio=__moba.audio.constructor,rate=24000,results=[];
    const families=['knife','katana','blade','axe','greatsword','scythe','glaive','claw','spear','hammer','club','mace','staff','branch','chain','shield','punch','organic','cloth','chime','glass','drill','needle','nail','coin','smoke'];
    const cases=[...families.flatMap(family=>[0,3].map(variant=>({name:family+'-'+variant,family,variant,kind:'swing'}))),...[0,3].map(variant=>({name:'yan-base-'+variant,key:'yan',form:'base',kind:'swing',variant})),{name:'yan-cast',key:'yan',form:'base',kind:'cast',slot:'q'},{name:'yan-distorted',key:'yan',form:'distorted',kind:'swing'},{name:'blade-cast',family:'blade',kind:'cast'},{name:'blade-fire',family:'blade',kind:'swing',variant:0,element:'fire'},{name:'mixed-cut-hit',family:'katana',kind:'hit'},{name:'mixed-blunt-hit',family:'hammer',kind:'hit'},{name:'mixed-rifle-hit',family:'rifle',kind:'hit'},{name:'mixed-cut-fire',family:'katana',kind:'hit',element:'fire'},{name:'original-rifle',family:'rifle',kind:'shot'},{name:'crowded',kind:'crowded'},{name:'muted',kind:'muted'}];
    for(const spec of cases){
     const c=new OfflineAudioContext(2,rate*2.5,rate),a=new Audio({context:c,storage:false});await a.synth.swings.ready;if(a.synth.swings.buffers.size!==3)throw Error('Missing whoosh');
     let layers=0;for(const name of ['noise','tone','element']){const original=a.synth[name].bind(a.synth);a.synth[name]=(...args)=>{layers++;return original(...args);};}
     const play=(extra={})=>a.play({key:'ryoshu',element:'metal',sourceKind:'champion',sourceId:1,x:0,y:0,...spec,...extra},{x:0,y:0});
     if(spec.kind==='crowded'){for(let i=0;i<40;i++)play({kind:'swing',family:'hammer',sourceId:i});if(a.played>11||!a.play({kind:'ping',ping:'danger'},{x:0,y:0}))throw Error('Lost warning priority');}
     else if(spec.kind==='muted'){a.enabled=false;play({kind:'swing',family:'blade'});}
     else if(!play())throw Error('Sound rejected');
     const sample=a.synth.swings.history[0],out=await c.startRendering();if(a.synth.swings.active.size)throw Error('Leaked whoosh voices');
     if(spec.name.startsWith('original-')){if(sample||!layers)throw Error('Firearm synthesis was replaced');}
     else if(!['crowded','muted'].includes(spec.name)&&(layers||a.synth.swings.played!==1))throw Error('Mixed additional sound layers');
     const bytes=new Uint8Array(out.getChannelData(0).buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));results.push({name:spec.name,rate,sample,played:a.synth.swings.played,data:btoa(binary)});
    }return results;
   }''')
   stats={};waves={}
   for entry in rendered:
    data=np.frombuffer(base64.b64decode(entry['data']),dtype='<f4');rate=entry['rate'];peak=float(np.max(np.abs(data)));rms=float(np.sqrt(np.mean(data**2)));assert np.isfinite(data).all()
    if entry['name']=='muted':assert peak==0 and entry['played']==0
    else:assert .0004<rms<.2 and peak<.99,(mode,entry['name'],rms,peak)
    if entry.get('sample'):
     expected='yanGreatsword'if entry['name'].startswith('yan-')and entry['name']!='yan-distorted'else 'impactMix'if entry['name'].startswith('mixed-')else 'swing'
     assert entry['sample']['id']==expected,(mode,entry['name'],entry['sample']);assert entry['sample']['rates'][1]>entry['sample']['rates'][0] and entry['sample']['rates'][1]>entry['sample']['rates'][2]
    stats[entry['name']]={'peak':round(peak,5),'rms':round(rms,5),'sample':entry.get('sample')};waves[entry['name']]=data
   for name in [n for n in waves if n.endswith('-0')]:assert np.corrcoef(waves[name],waves[name[:-1]+'3'])[0,1]<.95,(mode,name)
   assert stats['knife-0']['sample']['pitch']>stats['hammer-0']['sample']['pitch'];assert stats['knife-0']['sample']['duration']<stats['hammer-0']['sample']['duration']
   assert np.array_equal(waves['blade-0'],waves['blade-fire']),'Element layers changed the whoosh'
   assert np.array_equal(waves['mixed-cut-hit'],waves['mixed-cut-fire']),'Element layers changed the pre-mixed impact'
   if mode=='desktop':
    sequence=['knife-0','blade-0','spear-0','club-0','hammer-0','greatsword-0','chain-0','punch-0'];preview=np.concatenate([np.concatenate([waves[name][:int(.6*rate)],np.zeros(int(.16*rate))])for name in sequence])
    with wave.open(str(ROOT/'artifacts'/'weapon-swing-preview.wav'),'wb')as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes((np.clip(preview,-1,1)*32767).astype('<i2').tobytes())
    sequence=['yan-base-0','yan-cast','mixed-cut-hit','mixed-blunt-hit','mixed-rifle-hit'];preview=np.concatenate([np.concatenate([waves[name][:int(.8*rate)],np.zeros(int(.15*rate))])for name in sequence])
    with wave.open(str(ROOT/'artifacts'/'yan-and-mixed-impact-preview.wav'),'wb')as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes((np.clip(preview,-1,1)*32767).astype('<i2').tobytes())
   await p.click('#sound-toggle');await p.wait_for_timeout(300);assert await p.evaluate('!__moba.audio.enabled&&__moba.audio.master.gain.value<.01')
   assert not errors,(mode,errors);assert not external,(mode,external);(ART/f'{mode}-analysis.json').write_text(json.dumps(stats,indent=2));await ctx.close();await browser.close()
   print(mode+': charged base Yan release/Q, unchanged distorted Yan, one pre-mixed impact, all weapon profiles, pitch/speed/envelopes, crowd budget, cleanup and mute passed.',flush=True)
 await asyncio.to_thread(server.shutdown);server.server_close()
if __name__=='__main__':asyncio.run(main())
