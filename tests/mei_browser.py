"""Mei's latest separate art, fire fists/combo UI, codex and offline assets."""
import asyncio,os,re
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts/mei';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mobile,offline in [(False,False),(True,False),(False,True)]:
   label='offline' if offline else 'mobile' if mobile else 'desktop'
   if os.getenv('MEI_BROWSER_CASE') and os.getenv('MEI_BROWSER_CASE')!=label:continue
   ctx=await browser.new_context(viewport={'width':932 if mobile else 1440,'height':430 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')+('/dist/city-border.html?debug' if offline else '/?debug')
   external=[]
   if offline:
    async def route(request):
     if request.request.url.split('#')[0]==url:await request.continue_()
     else:external.append(request.request.url);await request.abort()
    await page.route('**/*',route)
   await page.goto(url,wait_until='networkidle',timeout=90000)
   await page.click('#training-open');await page.get_by_role('button',name=re.compile(r'^메이 선택')).click();await page.click('#start');await page.wait_for_timeout(300)
   await page.evaluate(SETUP,'mei');await page.wait_for_timeout(400)
   await expect(page.locator('#basic-btn span')).to_have_text('연무권');await page.screenshot(path=str(ART/f'{label}-idle.png'))
   await page.evaluate("()=>{const g=__moba.game,p=g.player,t=target(43);g.attack(p,t);advance(.1);}")
   for _ in range(5):await page.evaluate('advance(.02)');await page.wait_for_timeout(30)
   await page.screenshot(path=str(ART/f'{label}-fire-fist.png'))
   assert await page.evaluate("__moba.game.player.ammo===0&&__moba.renderer.meiTrails.get(__moba.game.player.id).length>=3")
   await page.evaluate('advance(.5)');await page.wait_for_timeout(100);await page.screenshot(path=str(ART/f'{label}-final-punch.png'))
   assert await page.evaluate('__moba.game.player.state.meiPunch.last')
   await page.evaluate(SETUP,'mei')
   await page.evaluate("()=>{const g=__moba.game,p=g.player;target(42.8);g.cast(p,'q',g.input.aim);advance(.2);}")
   await expect(page.locator('#q-btn span')).to_have_text('회축')
   if mobile:
    box=await page.locator('#q-btn').bounding_box();await page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2)
   else:await page.click('#q-btn')
   await page.evaluate('advance(.15)');await page.wait_for_timeout(80);await page.screenshot(path=str(ART/f'{label}-vortex.png'))
   assert await page.evaluate("__moba.game.effects.some(f=>f.type==='meiVortex')")
   await page.evaluate("()=>{const g=__moba.game,p=g.player;g.input.aim={x:p.x+8,y:p.y};g.cast(p,'r',g.input.aim);advance(.03);}")
   await page.wait_for_timeout(80);await page.screenshot(path=str(ART/f'{label}-rush.png'))
   assert await page.evaluate('__moba.game.player.state.meiRush.fast===true')
   await page.evaluate(SETUP,'mei')
   await page.evaluate("()=>{const g=__moba.game;g.cast(g.player,'r',g.input.aim);advance(.3);}")
   await page.wait_for_timeout(80);await page.screenshot(path=str(ART/f'{label}-gather.png'))
   assert await page.evaluate('Boolean(__moba.game.player.state.meiRCharge)')
   await page.evaluate("()=>{advance(.6);const g=__moba.game,p=g.player;g.buyAugment(p,'goldenBough');g.cast(p,'r',g.input.aim);advance(.8);}")
   await expect(page.locator('#r-btn small')).to_have_text('궁극기 · 1/2')
   assert not errors,(label,errors)
   await page.goto(url+'#codex/champions',wait_until='networkidle');await page.reload(wait_until='networkidle');await page.wait_for_timeout(200)
   await page.click('#roster-list [data-key=mei]');await page.click('[data-description-mode=details]')
   for index,name in [(0,'안불망위'),(1,'연무권'),(2,'정주'),(3,'철산고')]:
    await page.click(f'#skill-tab-{index}');assert name in await page.locator('#skill-description').inner_text()
   await page.locator('#skill-description').scroll_into_view_if_needed();await page.screenshot(path=str(ART/f'{label}-codex.png'))
   assert await page.locator('.skill-subsection').count()==2
   assert not errors,(label,errors)
   if offline:assert not external,external
   print(label,'passed: Mei selection, idle fists, red/yellow flames and embers, last punch, tactical/ultimate combos, stock UI and codex',flush=True)
   await ctx.close()
  await browser.close()
asyncio.run(main())
