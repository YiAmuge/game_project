"""Actual quick/deep selector, prices, room authority, and Arayashiki glow/trail/audio."""
import asyncio,os,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts/match-modes';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
  for mobile in [False,True]:
   label='mobile' if mobile else 'desktop'
   if os.getenv('MATCH_BROWSER_CASE') and os.getenv('MATCH_BROWSER_CASE')!=label:continue
   ctx=await browser.new_context(viewport={'width':932 if mobile else 1440,'height':430 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   await page.goto(URL+'/?debug',wait_until='networkidle')
   for mode in ['quick','deep']:
    await page.click('#practice-open');assert await page.locator('#match-mode-dialog').is_visible();await page.screenshot(path=str(ART/f'{label}-select.png'));await page.click('[data-match-mode='+mode+']');await page.click('#start')
    await page.wait_for_function('__moba.mode==="playing"');await page.evaluate('''()=>{const g=__moba.game;__moba.presentation.reset(g);g.player.gold=10000;g.player.lastCombat=-99;}''')
    assert await page.evaluate('__moba.game.matchMode')==mode
    assert await page.evaluate('__moba.game.units.find(e=>e.kind==="tower").maxHp')==(5000 if mode=='quick' else 6000)
    assert await page.evaluate('__moba.game.units.find(e=>e.kind==="core").maxHp')==(6000 if mode=='quick' else 7200)
    await page.click('#shop-toggle');tab=page.locator('#mobile-shop-tabs [data-group=special]' if mobile else '#shop-tabs [data-group=special]');await tab.click();await page.click('#select-augment-goldenBough')
    assert str(500 if mode=='quick' else 750) in await page.locator('#detail-buy').inner_text();assert '5%' in await page.locator('#detail-effect').inner_text();await page.screenshot(path=str(ART/f'{label}-{mode}-shop.png'))
    await page.click('#shop-close');await page.goto(URL+'/?debug',wait_until='networkidle')
   await page.click('#training-open');await page.get_by_role('button',name='료슈 선택',exact=True).click();await page.click('#start');await page.wait_for_timeout(300)
   await page.evaluate(SETUP,'ryoshu');await page.evaluate('''()=>{const g=__moba.game,p=g.player;g.buyAugment(p,'goldenBough');target(42);g.cast(p,'r',p);}''')
   for i in range(24):
    await page.evaluate('advance(.025)');await page.wait_for_timeout(35)
   await page.screenshot(path=str(ART/f'{label}-arayashiki.png'))
   await page.wait_for_function("__moba.audio.synth?.swings?.history.some(x=>x.id==='nellyMetal')",timeout=10000)
   assert await page.evaluate("__moba.game.effects.some(e=>e.type==='arayashikiCuts')")
   assert not errors,(label,errors);print(label+': mode selector, prices, building HP, torso orbit, glow and uploaded audio passed',flush=True);await ctx.close()
  # Real online room preserves selected mode and host changes in its authoritative start packet.
  ctx=await browser.new_context(viewport={'width':1440,'height':900});page=await ctx.new_page();await page.goto(URL+'/?debug',wait_until='networkidle');await page.click('#online');await page.select_option('#online-create-mode','deep');await page.click('#online-create');await page.wait_for_function('__moba.online.room?.matchMode==="deep"');await page.select_option('#online-match-mode','quick');await page.wait_for_function('__moba.online.room.matchMode==="quick"');await page.select_option('#online-match-mode','deep');await page.wait_for_function('__moba.online.room.matchMode==="deep"');await page.click('#online-start');await page.wait_for_function('__moba.game.online&&__moba.game.matchMode==="deep"');assert await page.evaluate('__moba.game.timeLimit===Infinity');await ctx.close();print('online: host mode selection and authoritative match start passed',flush=True)
  await browser.close()
asyncio.run(main())
