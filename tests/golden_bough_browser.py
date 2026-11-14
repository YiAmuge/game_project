"""PC/mobile shop, absorbed upgrades, clean weapon and white death dissolve; also standalone."""
import asyncio, os, re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts/golden-bough'; ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mobile,offline in [(False,False),(True,False),(False,True)]:
   label='offline' if offline else 'mobile' if mobile else 'desktop'
   if os.getenv('BOUGH_BROWSER_CASE') and os.getenv('BOUGH_BROWSER_CASE')!=label:continue
   ctx=await browser.new_context(viewport={'width':932 if mobile else 1440,'height':430 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   page=await ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')+('/dist/city-border.html?debug' if offline else '/?debug')
   external=[]
   if offline:
    async def route(request):
     if request.request.url.split('#')[0]==url:await request.continue_()
     else:external.append(request.request.url);await request.abort()
    await page.route('**/*',route)
   await page.goto(url,wait_until='networkidle',timeout=90000)
   await page.click('#training-open');await page.get_by_role('button',name='료슈 선택',exact=True).click();await page.click('#start');await page.wait_for_timeout(500)
   await page.evaluate(SETUP,'ryoshu');assert '코스트' not in await page.locator('#shop-toggle').inner_text();await page.click('#shop-toggle')
   tab=page.locator('#mobile-shop-tabs [data-group=special]' if mobile else '#shop-tabs [data-group=special]')
   assert await tab.is_enabled();await tab.click();await page.click('#select-augment-goldenBough');await page.click('#detail-buy')
   assert await page.evaluate('__moba.game.player.goldenBough===true && __moba.game.player.augments.length===0')
   assert await page.locator('#detail-buy').is_disabled();assert await page.locator('#shop-sell').is_disabled()
   assert '아라야시키' in await page.locator('#detail-effect').inner_text()
   await page.screenshot(path=str(ART/f'{label}-shop.png'))
   await page.click('#shop-close')
   await page.evaluate('''()=>{const g=__moba.game,p=g.player;target(43);g.cast(p,'r',p);advance(.21);}''')
   await page.wait_for_timeout(200);assert await page.locator('#r-btn span').inner_text()=='천살성도 - 아라야시키'
   assert await page.evaluate("__moba.game.zones.some(z=>z.kind==='arayashiki')")
   await page.evaluate('window.activeCd=__moba.game.player.rCd;advance(.5)');assert await page.evaluate('Math.abs(__moba.game.player.rCd-activeCd)<1e-6')
   assert await page.locator('#basic-btn').is_disabled();assert await page.locator('#q-btn').is_disabled();assert await page.locator('#recall-btn').is_disabled()
   await page.screenshot(path=str(ART/f'{label}-storm.png'))
   await page.evaluate('''()=>{const g=__moba.game,p=g.player,t=g.champions(1)[0];p.hp=1;t.hp=1;advance(.2);}''')
   assert await page.evaluate("__moba.game.effects.filter(f=>f.type==='arayashikiDissolve').length===2 && __moba.game.corpses.length===0")
   await page.evaluate('advance(.6)');await page.wait_for_timeout(100);await page.screenshot(path=str(ART/f'{label}-dissolve.png'))
   assert await page.evaluate("__moba.game.zones.some(z=>z.kind==='arayashiki'&&z.posthumous)")
   await page.evaluate('advance(1)');assert await page.evaluate("!__moba.game.effects.some(f=>f.type==='arayashikiDissolve')")
   assert not errors,(label,errors)
   # Codex includes the always-open special category and all twelve upgrades.
   await page.goto(url+'#codex/augments',wait_until='networkidle');await page.reload(wait_until='networkidle');await page.wait_for_timeout(300)
   await page.click('#codex-tabs [data-category=augments]');await page.click('.augment-guide-tabs [data-group=special]')
   assert await page.locator('.augment-guide-detail h4').count()==0
   assert '챔피언 도감' in await page.locator('.augment-guide-detail').inner_text()
   await page.click('#codex-tabs [data-category=champions]')
   for key,name in [('ryoshu','천살성도 - 아라야시키'),('honglu','태허환경')]:
    await page.click('#roster-list [data-key='+key+']');assert await page.locator('.champion-golden-notes ol li').count()==1
    await page.click('#skill-tab-3');assert name in await page.locator('.golden-skill').inner_text()
    await page.click('[data-description-mode=details]');assert await page.locator('.golden-skill .skill-subsection').count()>=2
   await page.screenshot(path=str(ART/f'{label}-codex.png'))
   await page.click('#codex-tabs [data-category=augments]');await page.click('.augment-guide-tabs [data-group=special]')
   assert '750 코스트' in await page.locator('.augment-guide-detail').inner_text()
   assert not errors,(label,errors)
   if offline:assert not external,external
   print(label+': shop absorption, enhanced ultimate, white dissolve, no corpses and codex passed',flush=True)
   await ctx.close()
  await browser.close()
asyncio.run(main())
