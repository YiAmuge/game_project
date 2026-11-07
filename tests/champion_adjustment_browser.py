"""Render revised shapes, fixed ammo-slot colors, drill electricity and gravity on all clients."""
import asyncio,os,re,shutil,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'champion-adjustment';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   f=ROOT/'dist/city-border.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(f.stat().st_size));self.end_headers()
   with f.open('rb')as source:shutil.copyfileobj(source,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mode in os.getenv('ADJUST_MODES','desktop,mobile,offline,offline-mobile').split(','):
   mobile='mobile'in mode;offline=mode.startswith('offline');ctx=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201'))+'/?debug'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(url,wait_until='networkidle',timeout=120000);await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.game.training')
   await p.evaluate(SETUP,'ezra');await p.wait_for_timeout(180);await p.screenshot(path=str(ART/f'{mode}-four-slot-colors.png'))
   for i in range(4):
    await p.evaluate('(i)=>{const g=__moba.game,p=g.player;p.state.weapon=i;p.ammo=4-i;p.attackCd=0;delete p.motion;delete p.state.ezraReloading;g.effects=[];g.events=[];target(p.x+2.8,p.y);if(!g.attack(p,{x:p.x+8,y:p.y}))throw new Error("workshop attack rejected");advance(i===3?.2:i===2?.12:.07);}',i)
    await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-weapon-{i}.png'))
    if i==2:
     assert await p.evaluate('__moba.game.effects.some(f=>f.type==="ezraElectric"&&Math.abs(f.spread-150*Math.PI/180)<1e-6)');assert await p.evaluate('__moba.renderer.scene25d.vfx.emitters.some(e=>e.element==="electric"&&e.color==="#00e5ff"&&e.light===.4)')
    if i==3:
     assert await p.evaluate('__moba.game.player.motion?.kind==="leap"');await p.evaluate('advance(.4)');await p.wait_for_timeout(100);assert await p.evaluate('__moba.game.effects.some(f=>f.type==="ezraGravity")');assert await p.evaluate('!__moba.renderer.scene25d.vfx.emitters.some(e=>e.color==="#ffd35a"&&e.kind==="slash"&&e.shape?.range===3.5)');await p.screenshot(path=str(ART/f'{mode}-namir-gravity.png'))
   await p.evaluate(SETUP,'ezra');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;g.cast(p,"r",g.input.aim);g.attack(p,{x:p.x+.8,y:p.y});advance(.1);return Math.abs(p.x-40.8)<1e-5&&p.ammo===3;}');await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-cerise-axe.png'))
   await p.evaluate(SETUP,'ezra');await p.evaluate('()=>{const g=__moba.game,p=g.player;g.cast(p,"r",g.input.aim);p.ammo=1;p.state.ultAttacks=3;g.attack(p,{x:p.x+1.5,y:p.y});advance(.12);}')
   for frame,age in enumerate([.02,.05,.08,.25]):
    await p.evaluate('(age)=>{const g=__moba.game,p=g.player;advance(Math.max(0,p.state.ezraAttack.at+age-g.time));}',age);await p.wait_for_timeout(100)
    assert await p.evaluate('()=>{const g=__moba.game,p=g.player;return p.state.ezraAttack.phase==="strike"&&__moba.renderer.weaponTrails.owners.get(p)?.has("ezra-axe-orbit");}')
    await p.screenshot(path=str(ART/f'{mode}-axe-orbit-{frame}.png'))
   await p.evaluate('advance(.1)');assert await p.evaluate('__moba.game.player.state.ezraAttack.until<__moba.game.time')
   await p.evaluate(SETUP,'yan');await p.evaluate('()=>{const g=__moba.game,p=g.player;g.addBuff(p,"yanDistorted",20);g.cast(p,"q",{x:45,y:20});g.mobileAim={slot:"q",point:{x:45,y:20}};advance(.2);g.input.aim={x:45,y:20};}');await p.wait_for_timeout(140);assert await p.evaluate('__moba.game.effects.some(f=>f.type==="yanSwordWarning"&&f.innerR===3)');await p.screenshot(path=str(ART/f'{mode}-yan-inner-radius.png'))
   for key in['don','starbuck','sinclair']:
    await p.evaluate(SETUP,key);await p.evaluate('()=>{const g=__moba.game,p=g.player;target(p.x+2.8,p.y);g.attack(p,g.input.aim);advance(.1);}');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'{mode}-{key}-shape.png'))
   await p.evaluate(SETUP,'hohenheim');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;p.state.posthumous={until:4.5};g.attack(p,g.input.aim);advance(.4);return Math.abs(p.state.hohenCharge.progress-.6)<1e-6;}');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'{mode}-hohenheim-charge.png'))
   assert not errors,(mode,errors);assert not external,(mode,external);print(mode+': fixed slot colors, electrical swing, leap/gravity, cerise short dash/final circular axe turn, Yan inner radius and champion shapes passed.',flush=True);await ctx.close()
  await browser.close()
 server.shutdown()
asyncio.run(main())
