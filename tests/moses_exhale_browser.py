"""Verify one recorded exhale per held burst, immediate rearming, and v1.0.4 offline UI."""
import asyncio,os,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5196')
async def main():
 async with async_playwright()as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
  for mode in ['desktop','mobile','offline']:
   mobile=mode=='mobile';ctx=await b.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);page=await ctx.new_page();errors=[];external=[]
   page.on('pageerror',lambda e:errors.append(str(e)));await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=URL+('/dist/city-border.html'if mode=='offline'else'/')+'?debug'
   if mode=='offline':
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await page.route('**/*',route)
   await page.goto(url,wait_until='networkidle',timeout=90000);assert await page.locator('#menu-version').inner_text()=='v1.0.4'
   await page.click('#training-open');await page.click('.champion-option[data-key="moses"]');await page.click('#start');await page.wait_for_function('__moba.mode==="playing"');await page.evaluate('()=>__moba.audio.synth.swings.ready')
   if mode=='offline':await ctx.set_offline(True)
   await page.evaluate(SETUP,'moses');await page.evaluate('__moba.audio.synth.swings.history=[]');await page.wait_for_timeout(200)
   box=await page.locator('#basic-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;cdp=await ctx.new_cdp_session(page)
   async def touch(kind,x=0,y=0):await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[]if kind=='touchEnd'else[{'x':x,'y':y}]})
   async def begin():
    if mobile:await touch('touchStart',x,y);await touch('touchMove',x-60,y)
    else:await page.mouse.move(x,y);await page.mouse.down()
    await page.wait_for_timeout(80)
   async def end():
    if mobile:await touch('touchEnd')
    else:await page.mouse.up()
    await page.wait_for_timeout(80)
   await begin();await page.evaluate('advance(.91)');await page.wait_for_timeout(120)
   assert await page.evaluate('__moba.game.player.attackSerial===4&&__moba.game.player.state.mosesAir===26')
   assert await page.evaluate('__moba.audio.synth.swings.history.filter(s=>s.id==="mosesBreath"&&s.offset===1.24).length===1'),await page.evaluate('__moba.audio.synth.swings.history')
   await end();await page.evaluate('advance(.31)');await begin();await page.evaluate('advance(.61)');await page.wait_for_timeout(120)
   assert await page.evaluate('__moba.game.player.attackSerial===7&&__moba.game.player.state.mosesAir===23')
   assert await page.evaluate('__moba.audio.synth.swings.history.filter(s=>s.id==="mosesBreath"&&s.offset===1.24).length===2'),await page.evaluate('__moba.audio.synth.swings.history')
   await end();assert not errors,(mode,errors);assert not external,(mode,external)
   print(mode+': two recorded exhales for two held bursts / seven actual attacks; release rearming and v1.0.4 verified.',flush=True);await ctx.close()
  await b.close()
asyncio.run(main())
