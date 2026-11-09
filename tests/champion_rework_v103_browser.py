"""Real PC/mobile charge-release gestures, repeated breath choices, B selection and updated effects."""
import asyncio,re,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts/champion-rework-v103';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 async with async_playwright()as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mobile in[False,True]:
   mode='mobile'if mobile else'desktop';ctx=await b.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))");await p.goto(os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')+'/?debug',wait_until='networkidle');await p.click('#training-open');await p.click('.champion-option[data-key="moses"]');await p.click('#start');await p.wait_for_function('__moba.mode==="playing"');await p.evaluate(SETUP,'moses');await p.wait_for_timeout(250);cdp=await ctx.new_cdp_session(p)
   async def touch(kind,x=0,y=0):await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[]if kind=='touchEnd'else[{'x':x,'y':y}]})
   box=await p.locator('#basic-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
   if mobile:await touch('touchStart',x,y);await p.wait_for_function('__moba.game.player.state.mosesCharge')
   else:await p.mouse.move(x,y);await p.mouse.down();await p.wait_for_function('__moba.game.player.state.mosesCharge')
   await p.evaluate('advance(.75)');assert await p.evaluate('__moba.game.player.ammo===3&&Math.abs(__moba.game.player.state.mosesCharge.progress-.75)<.01');await p.screenshot(path=str(ART/f'{mode}-breath-charge.png'))
   if mobile:await touch('touchEnd')
   else:await p.mouse.up()
   await p.wait_for_function('__moba.game.player.ammo===2&&!__moba.game.player.state.mosesCharge');assert await p.evaluate('Math.abs(__moba.game.player.attackCd-.7)<.01');await p.evaluate('advance(.71)')
   for use in[0,1]:
    if mobile:
     box=await p.locator('#q-btn').bounding_box();qx=box['x']+box['width']/2;qy=box['y']+box['height']/2;await touch('touchStart',qx,qy);await touch('touchMove',qx,qy-60)
    else:await p.mouse.move(500,280);await p.mouse.down(button='right');await p.mouse.move(500,220)
    await p.wait_for_function('__moba.game.player.state.mosesChoosing?.direction==="up"');assert await p.evaluate('!document.querySelector("#drag-wheel [data-dir=up]").classList.contains("unavailable")');await p.evaluate('advance(.2)')
    if mobile:await touch('touchEnd')
    else:await p.mouse.up(button='right')
    await p.wait_for_function('__moba.game.player.state.smoke==="up"');assert await p.evaluate(f'__moba.game.player.ammo==={2-use}')
    await p.locator('#basic-btn').tap()if mobile else await p.locator('#basic-btn').click();await p.wait_for_function('__moba.game.player.state.smoke===null');assert await p.evaluate('!__moba.game.player.state.mosesCharge');await p.evaluate('advance(.71)')
   await p.evaluate(SETUP,'moses');await p.evaluate('()=>{const g=__moba.game,p=g.player;g.cast(p,"r",{x:60,y:20});advance(.9);}');assert await p.evaluate('__moba.game.player.state.mosesR');await p.screenshot(path=str(ART/f'{mode}-pipe-at-mouth.png'));await p.evaluate('advance(.55)');await p.screenshot(path=str(ART/f'{mode}-red-column-charge.png'));await p.evaluate('advance(.12)');await p.screenshot(path=str(ART/f'{mode}-red-column-flight.png'))
   if not mobile:
    await p.evaluate(SETUP,'moses');await p.evaluate('__moba.game.player.augments=["highRisk"]');await p.mouse.move(400,260);await p.keyboard.down('b');await p.wait_for_selector('#recall-choice:not(.hidden)');assert await p.evaluate('!__moba.game.player.recall');await p.mouse.move(465,260);await p.wait_for_selector('#recall-choice [data-choice=infiltration].selected');await p.keyboard.up('b');await p.wait_for_function('__moba.game.player.recall?.infiltration');await p.keyboard.press('b');await p.wait_for_function('!__moba.game.player.recall');await p.evaluate('__moba.game.player.state.infiltrationReady=999');await p.mouse.move(400,260);await p.keyboard.down('b');await p.mouse.move(335,260);await p.keyboard.up('b');await p.wait_for_function('__moba.game.player.recall&&!__moba.game.player.recall.infiltration')
   await p.evaluate(SETUP,'gubo');await p.evaluate('()=>{const g=__moba.game,p=g.player,a=target(42,20,0);a.hp=1;target(46,20,1);g.kill(a,p);advance(.25);}');await p.screenshot(path=str(ART/f'{mode}-execution-circle.png'));await p.evaluate('advance(.35)');await p.screenshot(path=str(ART/f'{mode}-execution-barrage.png'))
   await p.evaluate(SETUP,'queen');await p.evaluate('()=>{const g=__moba.game,p=g.player;g.cast(p,"r",{x:60,y:20});advance(1.4);}');await p.screenshot(path=str(ART/f'{mode}-queen-growing-seals.png'))
   await p.evaluate(SETUP,'ezra');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;g.cast(p,"r",p);g.attack(p,p);return g.effects.some(f=>f.theme==="ezra"&&f.shape?.kind==="circle")&&!p.state.ezraAttack.fourth;}');await p.screenshot(path=str(ART/f'{mode}-axe-first-circle.png'))
   await p.evaluate(SETUP,'ppui');await p.evaluate('()=>{const g=__moba.game,p=g.player;p.ppuiHealing=30000;target(47);g.cast(p,"r",{x:50,y:20});advance(.61);}');assert await p.evaluate('__moba.game.ammoCap(__moba.game.player)===3');await p.screenshot(path=str(ART/f'{mode}-pulse-volley.png'))
   await p.evaluate(SETUP,'moses');assert await p.evaluate('()=>{const g=__moba.game,p=g.player;p.upgrades.haste=3;return g.buyAugment(p,"carrier")&&!p.augments.includes("carrier");}');await p.locator('#shop-toggle').click();await p.wait_for_selector('#shop:not(.hidden)')
   if mobile:await p.locator('#mobile-shop-tabs [data-section=tech]').tap()
   await p.locator('#augment-row-carrier .augment-tile').click();await p.wait_for_function('document.querySelector("#detail-buy").textContent==="흡수 완료"');assert await p.locator('#shop-sell').is_enabled();await p.locator('#shop-sell').click();await p.wait_for_function('!__moba.game.player.absorbedCarrier');assert await p.evaluate('__moba.game.buyAugment(__moba.game.player,"carrier")');await p.evaluate('__moba.game.training=false');await p.wait_for_function('document.querySelector("#shop-sell").textContent==="판매 불가"');assert await p.locator('#shop-sell').is_disabled();await p.evaluate('__moba.game.training=true');await p.locator('#shop-close').click()
   for key,index,count in[('ezra',1,5),('ahab',2,3)]:
    await p.evaluate('([key,index])=>{const c=__moba.codex;c.key=key;c.skill=index;c.descriptionMode="details";c.show("champions");}',[key,index]);assert await p.locator('#skill-description .skill-subsection').count()==count;await p.screenshot(path=str(ART/f'{mode}-codex-{key}.png'))
   assert not errors,(mode,errors);print(mode+': charge/release, instant enhanced breath, repeated color, cylinder/seal/barrage effects, circular axe and pulse passed.',flush=True);await ctx.close()
  await b.close()
asyncio.run(main())
