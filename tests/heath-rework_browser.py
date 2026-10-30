"""Actual PC/mobile input, cloth mesh drawing and server-independent static build."""
import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5192')
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);errors=[]
  for mobile in [False,True]:
   ctx=await browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
   await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   await p.goto(URL+'/?debug');await p.wait_for_function('window.__moba');await p.click('#training-open');await p.click('[data-key=heathcliff]');await p.click('#start');await p.wait_for_function('__moba.game.training')
   await p.evaluate('''()=>{const g=__moba.game,p=g.player;g.step=()=>{};g.time=0;g.units=[p];g.practice.noCooldown=false;g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;Object.assign(p,{x:40,y:20,rCd:0,qCd:0,facing:0});g.input.aim={x:45,y:20};window.sackDraws=0;const r=__moba.renderer,c=r.ctx,draw=c.drawImage.bind(c);c.drawImage=(image,...a)=>{if(image===r.ultimateWeaponAtlas&&a[1]===116&&a[3]===251&&a[2]<=25.01)window.sackDraws++;return draw(image,...a);};}''')
   if mobile:await p.locator('#r-btn').tap()
   else:await p.locator('#r-btn').click()
   await p.wait_for_function('__moba.game.buff(__moba.game.player,"heathUlt")&&sackDraws>=36');await p.wait_for_function('document.getElementById("basic-btn").disabled')
   await p.evaluate('__moba.game.time=.15');await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'heath-sweep-{ "mobile"if mobile else "pc"}.png'))
   before=await p.evaluate('({x:__moba.game.player.x,y:__moba.game.player.y})')
   if mobile:await p.locator('#q-btn').tap()
   else:await p.locator('#q-btn').click()
   result=await p.evaluate('''()=>{const g=__moba.game,p=g.player;return{x:p.x,y:p.y,charge:p.state.chargeAt??null,motion:p.motion??null,cd:p.qCd};}''')
   assert result['charge']is None and result['motion']is None and result['cd']>0,result
   assert abs(result['x']-before['x'])+abs(result['y']-before['y'])>1,result
   await p.evaluate('''()=>{const g=__moba.game,p=g.player;g.time=.45;p.state.heathSweepSerial=1;p.state.auraTick=.6;}''');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'heath-reverse-{ "mobile"if mobile else "pc"}.png'))
   print(f'{"Mobile"if mobile else "PC"}: R blocks basic, cloth mesh rendered, Q input teleports immediately.',flush=True);await ctx.close()
  # The published file must remain self-contained, including a stale online
  # reconnect token and invite link; neither may attempt to reach the room API.
  ctx=await browser.new_context(viewport={'width':1280,'height':800});p=await ctx.new_page();external=[];p.on('pageerror',lambda e:errors.append(str(e)))
  html=(ROOT/'dist/index.html').read_text();site='http://city-border.offline/?debug&room=ABC123'
  await p.add_init_script("sessionStorage.setItem('city-border-online-session','stale-token')")
  async def route(r):
   if r.request.url==site:await r.fulfill(status=200,content_type='text/html',body=html)
   else:external.append(r.request.url);await r.abort()
  await p.route('**/*',route);await p.goto(site,wait_until='networkidle',timeout=90000);await p.wait_for_function('window.__moba')
  assert await p.locator('#online').is_hidden();assert await p.locator('#offline-download').is_visible();assert await p.locator('#offline-download').get_attribute('download')=='city-border.html'
  await p.click('#training-open');await p.click('[data-key=heathcliff]');await p.click('#start');await p.wait_for_function('__moba.game.training');await p.wait_for_timeout(100)
  assert not external,external;assert not errors,errors;print('Offline page: actual training runs with zero external requests, no room API/reconnect and a single-file download.',flush=True)
  await ctx.close();await browser.close()
asyncio.run(main())
