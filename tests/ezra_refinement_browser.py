"""Ezra fist poses, alternating hammer circles, drill motor/bit effect and axe aiming."""
import asyncio,json,os,re,shutil,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'ezra-refinement';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   f=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(f.stat().st_size));self.end_headers()
   with f.open('rb')as source:shutil.copyfileobj(source,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
  for mode in os.getenv('EZRA_REFINE_MODES','desktop,mobile,offline,offline-mobile').split(','):
   mobile='mobile'in mode;offline=mode.startswith('offline');ctx=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201'))+'/?debug'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(url,wait_until='networkidle',timeout=120000);await p.click('#training-open');await p.locator('#champion-select [data-key="ezra"]').click();await p.wait_for_timeout(150);await p.screenshot(path=str(ART/f'{mode}-portrait-size.png'));await p.click('#start');await p.wait_for_function('__moba.game.training');await p.wait_for_function('__moba.audio.context?.state==="running"');await p.evaluate('()=>__moba.audio.synth.swings.ready');assert await p.evaluate('__moba.audio.synth.swings.buffers.size===27&&__moba.audio.synth.swings.failures.length===0')
   await p.evaluate(SETUP,'ezra');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'{mode}-alas-rest.png'));await p.evaluate('()=>{const g=__moba.game,p=g.player;g.attack(p,g.input.aim);advance(.08);}');await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-alas-extension.png'))
   await p.evaluate(SETUP,'ezra');await p.evaluate('()=>{const g=__moba.game,p=g.player;p.state.weapon=1;target(38,20);g.attack(p,g.input.aim);}');turns=[]
   for i in range(3):
    await p.evaluate('i=>advance(i?.3:.05)',i);await p.wait_for_timeout(120);turns.append(await p.evaluate('__moba.game.player.state.ezraAttack.spinDirection'));await p.screenshot(path=str(ART/f'{mode}-hammer-{i}.png'))
   assert turns==[1,-1,1],turns;assert await p.evaluate('__moba.game.units[1].hp<99900&&__moba.game.effects.some(f=>f.type==="ezraHammerGlow")')
   await p.wait_for_timeout(100);await p.evaluate(SETUP,'ezra');await p.evaluate('__moba.game.player.state.weapon=2')
   for side in[1,-1]:
    await p.evaluate('side=>{const g=__moba.game;g.input.x=side;g.player.facing=side>0?0:Math.PI;}',side);await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-drill-rest-{side}.png'))
   await p.evaluate('()=>{const g=__moba.game,p=g.player;g.input.x=0;__moba.audio.synth.swings.history=[];g.attack(p,g.input.aim);advance(.12);}');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="ezraDrillMotor")');await p.screenshot(path=str(ART/f'{mode}-drill-electric-spin.png'));await p.evaluate('advance(.4)');await p.wait_for_timeout(120);assert await p.evaluate('__moba.audio.synth.swings.history.filter(s=>s.id==="ezraDrillMotor").length===1')
   await p.evaluate(SETUP,'ezra');await p.evaluate('()=>{const g=__moba.game,p=g.player;__moba.audio.synth.swings.history=[];p.state.weapon=3;g.attack(p,{x:42,y:20});advance(.2);}');await p.wait_for_timeout(120);assert await p.evaluate('__moba.audio.synth.swings.history.every(s=>s.id!=="groundImpact")');await p.evaluate('advance(.26)');await p.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="groundImpact")');await p.screenshot(path=str(ART/f'{mode}-namir-landing.png'))
   await p.evaluate(SETUP,'ezra');await p.evaluate('()=>{const g=__moba.game,p=g.player;g.cast(p,"r",g.input.aim);advance(.55);g.input.aim={x:p.x+.6,y:p.y+.4};p.state.ultAttacks=3;}');await p.wait_for_timeout(140);await p.screenshot(path=str(ART/f'{mode}-axe-near-cursor.png'))
   await p.evaluate('()=>{const g=__moba.game,p=g.player;g.input.aim={x:p.x+10,y:p.y};p.state.ultAttacks=0;}');await p.wait_for_timeout(140);await p.screenshot(path=str(ART/f'{mode}-axe-far-cursor.png'))
   if mobile:
    for side in[1,-1]:
     await p.evaluate('side=>{const g=__moba.game;g.input.x=side;g.player.facing=side>0?0:Math.PI;}',side);await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-axe-rest-{side}.png'))
   stats=await p.evaluate('''async()=>{
    const Audio=__moba.audio.constructor,rows=[];
    for(const spec of[{kind:'drill',key:'ezra',cue:'drillMotor',phase:'ezra-drill',family:'drill'},{kind:'slam',key:'ezra',phase:'ezra-landing',family:'punch'}]){
     const c=new OfflineAudioContext(2,48000,24000),a=new Audio({context:c,storage:false});await a.synth.swings.ready;let layers=0;for(const key of['tone','noise','element']){const fn=a.synth[key].bind(a.synth);a.synth[key]=(...args)=>{layers++;return fn(...args);};}
     if(!a.play({...spec,sourceKind:'champion',sourceId:1,x:0,y:0},{x:0,y:0}))throw Error('Sample did not play');const out=await c.startRendering();let peak=0,sum=0,tail=0;for(let ch=0;ch<2;ch++){const x=out.getChannelData(ch);for(let i=0;i<x.length;i++){peak=Math.max(peak,Math.abs(x[i]));sum+=x[i]*x[i];if(i>24000)tail+=x[i]*x[i];}}
     if(layers||a.synth.swings.active.size||a.synth.swings.history.length!==1)throw Error('Extra synthesis or leaked voice');rows.push({id:a.synth.swings.history[0].id,peak,rms:Math.sqrt(sum/(2*out.length)),tail});
    }return rows;
   }''')
   assert [s['id']for s in stats]==['ezraDrillMotor','groundImpact'];assert all(.0001<s['rms']<.2 and s['peak']<.99 and s['tail']<1e-8 for s in stats),stats
   assert not errors,(mode,errors);assert not external,(mode,external);(ART/f'{mode}-audio.json').write_text(json.dumps(stats,indent=2));print(mode+': larger raised fists, alternating circular hammer, electrical rotating bit/motor, landing sound and cursor-following two-hand axe passed.',flush=True);await ctx.close()
  await browser.close()
 server.shutdown()
asyncio.run(main())
