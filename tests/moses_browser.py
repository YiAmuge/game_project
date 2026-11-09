"""Real desktop/mobile/offline Moses direction selection, pipe, smoke, camera and audio."""
import asyncio,os,re,shutil,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'moses';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   f=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(f.stat().st_size));self.end_headers()
   with f.open('rb')as s:shutil.copyfileobj(s,self.wfile)
  def log_message(self,*a):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mode in os.getenv('MOSES_MODES','desktop,mobile,offline,offline-mobile').split(','):
   mobile='mobile'in mode;offline=mode.startswith('offline');ctx=await b.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173'))+'/?debug'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(url,wait_until='networkidle',timeout=120000);await p.click('#training-open');await p.wait_for_selector('.champion-option[data-key="moses"]');await p.click('.champion-option[data-key="moses"]');await p.click('#start');await p.wait_for_function('__moba.game.player.key==="moses"');await p.evaluate(SETUP,'moses');await p.wait_for_timeout(300)
   await p.evaluate('__moba.audio.synth.swings.ready');await p.evaluate('__moba.audio.synth.swings.history=[]')
   if mobile:
    box=await p.locator('#q-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;cdp=await ctx.new_cdp_session(p);await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-60}]})
   else:
    await p.mouse.move(650,330);await p.mouse.down(button='right');await p.mouse.move(650,270)
   await p.evaluate('advance(.18)');assert await p.evaluate('__moba.game.player.state.mosesChoosing?.direction==="up"');assert await p.evaluate('()=>{const w=document.querySelector("#drag-wheel");return !w.classList.contains("hidden")&&new Set([...w.querySelectorAll("[data-dir]")].map(e=>getComputedStyle(e).backgroundColor)).size===4;}');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'{mode}-smoking.png'))
   await p.evaluate('__moba.game.player.facing=Math.PI');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'{mode}-smoking-left.png'));await p.evaluate('__moba.game.player.facing=0')
   if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await p.mouse.up(button='right')
   await p.wait_for_function('__moba.game.player.state.smoke==="up"');assert await p.evaluate('__moba.game.player.state.mosesCharges===1&&document.querySelector("#q-btn").disabled');assert await p.evaluate('__moba.game.soundEvents.filter(e=>e.phase==="moses-inhale").length===1')
   assert await p.evaluate('()=>{const g=__moba.game,p=g.player,a=target(42,20,0);g.attack(p,{x:47,y:20});advance(.2);return g.buff(a,"mosesWhite")&&p.state.smoke===null;}');await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-white-breath.png'))
   await p.evaluate(SETUP,'moses');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;target(52);g.cast(p,"r",{x:60,y:20});advance(.18);return p.state.mosesR!==undefined;}');await p.wait_for_timeout(160);await p.screenshot(path=str(ART/f'{mode}-red-point-inhale.png'));await p.evaluate('advance(1.2)');await p.wait_for_function('__moba.renderer.viewBlend>1.5');await p.screenshot(path=str(ART/f'{mode}-red-point-charge.png'));assert await p.evaluate('()=>{advance(.2);return __moba.game.projectiles.some(p=>p.type==="mosesPoint"&&p.remaining===Infinity);}');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'{mode}-red-point-flight.png'))
   assert not errors,(mode,errors);assert not external,(mode,external);assert await p.evaluate('__moba.audio.synth.swings.history.some(h=>h.id==="mosesBreath")');print(mode+': actual direction gesture, single inhale, pending-breath lock, ally buff, red-point camera/projectile/audio passed.',flush=True);await ctx.close()
  await b.close()
 server.shutdown()
asyncio.run(main())
