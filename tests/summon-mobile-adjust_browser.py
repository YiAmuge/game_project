"""Actual recall slides, mobile charge targeting and gold troop drops, including standalone builds."""
import asyncio, os, re, threading, shutil
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5198')
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
ART=ROOT/'artifacts'

async def pointer(page, selector, dx=0, dy=0, mobile=False, during=None, hold=.04):
 box=await page.locator(selector).bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
 if mobile:
  session=await page.context.new_cdp_session(page)
  async def touch(kind,a,b):
   await session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':a,'y':b,'id':1}]})
  await touch('touchStart',x,y);await asyncio.sleep(hold)
  if dx or dy:await touch('touchMove',x+dx,y+dy)
  if during:await during()
  await touch('touchEnd',x+dx,y+dy);await session.detach()
 else:
  await page.mouse.move(x,y);await page.mouse.down();await asyncio.sleep(hold)
  if dx or dy:await page.mouse.move(x+dx,y+dy)
  if during:await during()
  await page.mouse.up()

async def main():
 class Standalone(BaseHTTPRequestHandler):
  def do_GET(self):
   file=ROOT/'dist/index.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(file.stat().st_size));self.end_headers()
   with file.open('rb') as content:shutil.copyfileobj(content,self.wfile)
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright() as pw:
  for mode in os.getenv('SUMMON_TEST_MODES','desktop,mobile,offline,offline-mobile').split(','):
   mobile='mobile' in mode;offline='offline' in mode;errors=[];external=[]
   browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
   ctx=await browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=(f'http://127.0.0.1:{server.server_address[1]}' if offline else URL)+'/?debug'
   if offline:
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await page.route('**/*',route)
   await page.goto(url,wait_until='networkidle',timeout=90000);await page.wait_for_function('window.__moba')
   await page.click('#training-open');await page.locator('[data-key=jamila]').click();await page.click('#start');await page.wait_for_function('__moba.game.training');await page.wait_for_timeout(400)
   # Slide choices are exercised as real mouse/touch events, including cooldown independence.
   await page.evaluate(SETUP,'jamila');await page.evaluate("__moba.game.player.augments=['highRisk']")
   async def preview():
    assert await page.locator('#recall-choice').is_visible()
    assert await page.locator('[data-choice=infiltration]').evaluate("e=>e.classList.contains('selected')")
    await page.screenshot(path=str(ART/f'summon-{mode}-recall-choice.png'))
   await pointer(page,'#recall-btn',dx=35,mobile=mobile,during=preview)
   assert await page.evaluate('__moba.game.player.recall?.infiltration===true')
   await page.evaluate('__moba.game.cancelRecall(__moba.game.player)')
   await pointer(page,'#recall-btn',dx=-35,mobile=mobile)
   assert await page.evaluate('__moba.game.player.recall&&!__moba.game.player.recall.infiltration')
   await page.evaluate('__moba.game.cancelRecall(__moba.game.player)')
   await pointer(page,'#recall-btn',mobile=mobile)
   assert await page.evaluate('__moba.game.player.recall&&!__moba.game.player.recall.infiltration')
   await page.evaluate('__moba.game.cancelRecall(__moba.game.player)')
   await pointer(page,'#recall-btn',dy=-80,mobile=mobile)
   assert await page.evaluate('!__moba.game.player.recall')
   # Source and standalone must both draw the pending bodies and gold release without errors.
   await page.evaluate(SETUP,'jamila');await page.evaluate("__moba.game.cast(__moba.game.player,'r',__moba.game.player);advance(.125)")
   assert await page.evaluate('__moba.game.player.rCd===75&&!__moba.game.units.some(e=>e.lcaTrooper)')
   await page.wait_for_timeout(120);await page.screenshot(path=str(ART/f'summon-{mode}-trooper-drop.png'))
   await page.evaluate('advance(.125)');assert await page.evaluate('__moba.game.units.filter(e=>e.lcaTrooper).length===2&&Math.abs(__moba.game.player.rCd-75)<1e-6')
   await page.wait_for_timeout(120);await page.screenshot(path=str(ART/f'summon-{mode}-gold-release.png'))
   await page.evaluate(SETUP,'jamila');await page.evaluate("()=>{const g=__moba.game,p=g.player;p.augments=['highRisk'];g.recall(p,{mode:'infiltration'});advance(1.75);p.state.infiltration.point={x:44,y:20};g.cast(p,'r',p);advance(.125);}")
   assert await page.evaluate('__moba.game.player.state.infiltration.phase==="deploying"&&__moba.game.player.x===40')
   await page.wait_for_timeout(120);await page.screenshot(path=str(ART/f'summon-{mode}-commander-drop.png'))
   await page.evaluate('advance(.125)');assert await page.evaluate('__moba.game.player.x===44&&!__moba.game.player.state.infiltration&&__moba.game.units.filter(e=>e.lcaTrooper).every(e=>Math.abs(e.until-__moba.game.time-15)<1e-6)')
   if mobile:
    await page.evaluate(SETUP,'queen');await page.evaluate("()=>{target(41,20,0).hp=1;target(45).hp=1000;window.weak=target(40,70);weak.hp=200;target(110).hp=1;}")
    await page.locator('#basic-btn').tap();assert await page.evaluate('__moba.game.input.aim.x===45&&__moba.game.player.ammo===2')
    await page.evaluate("()=>{const g=__moba.game;g.input.aim={x:50,y:20};g.cast(g.player,'r',g.input.aim);}")
    await pointer(page,'#basic-btn',mobile=True,hold=.35);assert await page.evaluate('__moba.game.player.state.queenR.mobileTargetId===undefined')
    await page.locator('#basic-btn').tap();assert await page.evaluate('__moba.game.player.state.queenR.mobileTargetId===weak.id&&__moba.game.player.ammo===2')
    await page.evaluate('advance(.25)');assert await page.evaluate('Math.abs(__moba.game.player.state.queenR.angle-Math.PI*.15)<1e-6&&__moba.game.player.state.queenR.phase==="charging"')
    await page.screenshot(path=str(ART/f'summon-{mode}-queen-lock.png'))
    async def steer():
     await page.evaluate('advance(.1)');assert await page.evaluate('__moba.game.player.state.queenR.mobileTargetId===undefined')
    await pointer(page,'#r-btn',dx=-32,dy=-25,mobile=True,hold=.24,during=steer)
   assert not errors,(mode,errors);assert not external,external
   await ctx.close();await browser.close();print(mode+': recall slides/cooldown, delayed golden troop/commander drops and mobile Queen targeting passed.',flush=True)
 await asyncio.to_thread(server.shutdown);server.server_close()

if __name__=='__main__':asyncio.run(main())
