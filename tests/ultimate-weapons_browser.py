"""Verify the actual equipped images for both ultimate buffs on PC/mobile/offline."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts';ART.mkdir(exist_ok=True);URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5192');OFFLINE=os.getenv('MOBA_OFFLINE')=='1'
FRAMES={**json.loads((ROOT/'src/assets/sprites-v36.json').read_text())['frames'],**json.loads((ROOT/'src/assets/ultimate-weapons-v102.json').read_text())['frames']}
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);errors=[];external=[]
  for mobile in ([False]if OFFLINE else[False,True]):
   ctx=await b.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   if OFFLINE:
    html=(ROOT/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)')
    async def route(r):
     if r.request.url=='http://city-border.offline/':await r.fulfill(status=200,content_type='text/html',body=html)
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route);await p.goto('http://city-border.offline/',wait_until='networkidle',timeout=60000)
   else:await p.goto(URL+'/?debug')
   await p.wait_for_function('window.__moba');await p.evaluate('''frames=>{window.weaponFrames=frames;window.weaponSeen=new Set();const r=__moba.renderer,c=r.ctx,draw=c.drawImage.bind(c);c.drawImage=(image,...a)=>{for(const[key,f]of Object.entries(weaponFrames))if((image===r.ultimateWeaponAtlas&&f.sheet===18||image===r.weaponAtlas&&f.sheet===10)&&a[0]>=f.x&&a[0]<f.x+f.w&&a[1]===f.y&&a[3]===f.h)weaponSeen.add(key);return draw(image,...a);};}''', {k:FRAMES[k]for k in ['donLance','heathcliffBat','donBloodLance','heathBloodSack']})
   for key,buff,asset,base in [('don','donLifesteal','donBloodLance','donLance'),('heathcliff','heathUlt','heathBloodSack','heathcliffBat')]:
    await p.click('#training-open');await p.click('[data-key='+key+']');await p.click('#start');await p.wait_for_function('__moba.game.training');await p.evaluate('''()=>{const g=__moba.game,p=g.player;g.step=()=>{};g.units=[p];g.projectiles=[];g.effects=[];g.practice.noCooldown=false;g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;Object.assign(p,{x:40,y:20,rCd:0,facing:0});g.input.aim={x:42,y:20};weaponSeen.clear();}''');await p.wait_for_function('key=>weaponSeen.has(key)',arg=base)
    if mobile:await p.locator('#r-btn').tap()
    else:await p.locator('#r-btn').click()
    await p.wait_for_function('key=>weaponSeen.has(key)',arg=asset);assert await p.evaluate('key=>__moba.game.buff(__moba.game.player,key)',buff);await p.screenshot(path=str(ART/f'ultimate-{key}-{ "offline"if OFFLINE else "mobile"if mobile else "pc"}.png'))
    await p.evaluate('''()=>{const g=__moba.game,p=g.player;p.facing=Math.PI;weaponSeen.clear();}''');await p.wait_for_function('key=>weaponSeen.has(key)',arg=asset)
    await p.evaluate('''buff=>{const g=__moba.game,p=g.player;g.time=p.buffs[buff]+.01;weaponSeen.clear();}''',buff);await p.wait_for_function('key=>weaponSeen.has(key)',arg=base);assert not await p.evaluate('key=>weaponSeen.has(key)',asset);await p.evaluate('document.querySelector("#home").click()');print(f'{key}: ultimate replacement, left-facing grip and timed restoration passed ({"offline"if OFFLINE else "mobile"if mobile else "PC"}).',flush=True)
   await ctx.close()
  assert not errors,errors;assert not external,external;await b.close()
asyncio.run(main())
