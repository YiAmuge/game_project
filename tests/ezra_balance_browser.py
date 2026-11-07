"""Verify Ezra's live shield, expanding hammer, true damage, root combo and restore state."""
import asyncio,os,re,shutil,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'ezra-balance';ART.mkdir(parents=True,exist_ok=True)
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
  for mode in os.getenv('EZRA_BALANCE_MODES','desktop,mobile,offline,offline-mobile').split(','):
   mobile='mobile'in mode;offline=mode.startswith('offline');ctx=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201'))+'/?debug'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(url,wait_until='networkidle',timeout=120000);await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.game.training')
   await p.evaluate(SETUP,'ezra');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;g.attack(p,g.input.aim);advance(.07);return Math.abs(g.shield(p)-p.maxHp*.12)<1e-6;}');await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-alas-shield.png'))
   await p.evaluate(SETUP,'ezra');await p.evaluate('()=>{const g=__moba.game,p=g.player;p.state.weapon=1;window.ringTargets=[target(42.55,20),target(40,22.85),target(36.85,20),target(40,16.6)];for(const t of ringTargets)t.radius=.01;g.attack(p,g.input.aim);}')
   for i,radius in enumerate([2.6,2.9,3.2]):
    await p.evaluate('i=>advance(i?.3:.05)',i);assert await p.evaluate('r=>__moba.game.effects.some(f=>f.type==="ezraHammerGlow"&&Math.abs(f.r-r)<1e-6)',radius);await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-hammer-{i}.png'))
   assert await p.evaluate('()=>{const d=ringTargets.map(t=>t.maxHp-t.hp);return d[2]>0&&Math.abs(d[0]/d[2]-3)<1e-6&&Math.abs(d[1]/d[2]-2)<1e-6&&d[3]===0;}')
   await p.evaluate(SETUP,'ezra');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;p.state.weapon=2;const a=target(42,20.4),b=target(42,19.6);g.status(b,"slow",.1,10,p);g.attack(p,g.input.aim);advance(.41);return Math.abs((b.maxHp-b.hp)/(a.maxHp-a.hp)-1.3)<1e-6;}');await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-drill-true-damage.png'))
   await p.evaluate(SETUP,'ezra');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;p.state.weapon=3;window.slamTarget=target(42);g.attack(p,{x:p.x,y:p.y});advance(.46);return !g.stat(slamTarget,"root");}');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;if(!g.cast(p,"q",p))return false;advance(.46);return g.stat(slamTarget,"root")===1&&p.state.ezraLastBasicWeapon===3;}');await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'{mode}-namir-repeat-root.png'))
   await p.evaluate(SETUP,'ezra');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;for(let n=0;n<3;n++){if(!g.attack(p,g.input.aim))return false;advance(.85);}if(p.state.weapon!==3||p.ammo!==1||!g.cast(p,"q",p))return false;advance(.85);if(!g.cast(p,"r",p)||p.state.ezraNormal.weapon!==3)return false;advance(10.1);if(p.state.weapon!==3||p.ammo!==1||!g.attack(p,p))return false;advance(.46);return p.state.ezraLastBasicWeapon===3&&p.ammo===0&&p.state.ezraReloading;}')
   await p.evaluate(SETUP,'ezra');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;p.state.weapon=3;p.ammo=1;g.attack(p,p);advance(2.49);if(p.ammo!==0)return false;advance(.02);return p.ammo===4&&p.state.weapon===0;}')
   assert not errors,(mode,errors);assert not external,(mode,external);print(mode+': glove shield, 2.6/2.9/3.2 hammer hits, 30% true damage, repeat root, pending-slot restore and 2.5s reload passed.',flush=True);await ctx.close()
  await browser.close()
 server.shutdown()
asyncio.run(main())
