"""Ezra selection, all workshop/axe poses, HUD and ammo immunity on PC/mobile/offline."""
import asyncio,os,re,shutil,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'ezra';ART.mkdir(parents=True,exist_ok=True)
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
  for mode in os.getenv('EZRA_MODES','desktop,mobile,offline,offline-mobile').split(','):
   mobile='mobile'in mode;offline=mode.startswith('offline');ctx=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}'if offline else os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201'))+'/?debug'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(url,wait_until='networkidle',timeout=120000);await p.click('#menu-codex');await p.locator('.archive-champion[data-key="ezra"]').click();await p.wait_for_timeout(200)
   assert '외부 효과로 인해 탄창이 증가 및 감소하지 않음'in await p.locator('#skill-description').inner_text()
   await p.screenshot(path=str(ART/f'{mode}-codex.png'));await p.click('#codex-back');await p.click('#training-open');await p.locator('#position-select [data-position="top"]').click();await p.locator('#champion-select [data-key="ezra"]').click();await p.click('#start');await p.wait_for_function('__moba.game.player.key==="ezra"&&__moba.mode==="playing"');await p.evaluate(SETUP,'ezra');await p.wait_for_timeout(200)
   assert await p.locator('#q-btn').is_disabled();assert '알라스 공방 장갑' in (await p.locator('#basic-btn').get_attribute('aria-label') or '') or '알라스 공방 장갑' in await p.locator('#basic-btn').inner_text()
   names=['알라스 공방 장갑','네스터 공방 망치','스크류 아틀리에제 드릴 망치','나미르 공방 건틀릿']
   for index,span in enumerate([.08,.32,.22,.20]):
    assert await p.evaluate('i=>__moba.game.player.state.weapon===i',index)
    await p.evaluate('()=>{const g=__moba.game,p=g.player;target(p.x+2.8,p.y);if(!g.attack(p,{x:p.x+8,y:p.y}))throw new Error("workshop attack rejected");}')
    await p.evaluate('s=>advance(s)',span);await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'{mode}-weapon-{index}.png'));await p.evaluate('s=>advance(s)',.85-span)
   await p.evaluate('advance(2.0)');assert await p.evaluate('__moba.game.player.ammo===4&&__moba.game.player.state.weapon===0')
   before=await p.evaluate('()=>{const g=__moba.game,p=g.player;return{ammo:p.ammo,weapon:p.state.weapon,last:p.state.ezraLastWeapon};}')
   if mobile:await p.locator('#q-btn').tap()
   else:await p.evaluate('__moba.game.cast(__moba.game.player,"q",{x:__moba.game.player.x+1,y:20})')
   await p.evaluate('advance(.55)');assert await p.evaluate('(before)=>{const p=__moba.game.player;return p.ammo===before.ammo&&p.state.weapon===before.weapon&&p.qCd>0;}',before)
   await p.evaluate('()=>{const g=__moba.game,p=g.player;p.ammo=2;if(!g.cast(p,"r",{x:p.x+4,y:p.y}))throw new Error("axe start rejected");}');await p.wait_for_function('document.querySelector("#q-btn").disabled',timeout=5000)
   for index in range(4):
    await p.evaluate('()=>{const g=__moba.game,p=g.player;target(p.x+4,p.y);target(p.x+1,p.y);if(!g.attack(p,{x:p.x+8,y:p.y}))throw new Error("axe attack rejected");advance(.22);}')
    await p.wait_for_timeout(80);await p.screenshot(path=str(ART/f'{mode}-axe-{index}.png'));await p.evaluate('advance(.5)')
   assert await p.evaluate('!__moba.game.buff(__moba.game.player,"ezraUlt")&&__moba.game.player.ammo===2&&__moba.game.player.state.weapon===3')
   assert await p.evaluate('()=>{const g=__moba.game,p=g.player;g.changeAmmo(p,1);g.changeAmmo(p,-1);return p.ammo===2;}')
   assert not errors,(mode,errors);assert not external,(mode,external);print(mode+': selection, codex, four weapons, repeat, four axe swings, restored ammo and external immunity passed.',flush=True);await ctx.close()
  await browser.close()
 server.shutdown()
asyncio.run(main())
