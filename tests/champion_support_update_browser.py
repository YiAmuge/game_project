"""Actual desktop/mobile gestures, range effects, status glyphs and offline rendering."""
import asyncio,os,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts/champion-support-update';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5194')

async def main():
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mode in['desktop','mobile','offline']:
   mobile=mode=='mobile';context=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile)
   page=await context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   await page.goto(URL+('/dist/city-border.html'if mode=='offline'else'/')+'?debug',wait_until='networkidle')
   await page.click('#training-open');await page.click('.champion-option[data-key="moses"]');await page.click('#start');await page.wait_for_function('__moba.mode==="playing"')
   await page.evaluate(SETUP,'moses');await page.wait_for_timeout(200);cdp=await context.new_cdp_session(page)
   async def touch(kind,x=0,y=0):await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[]if kind=='touchEnd'else[{'x':x,'y':y}]})
   async def shot(name):await page.wait_for_timeout(80);await page.screenshot(path=str(ART/f'{mode}-{name}.png'))
   box=await page.locator('#basic-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
   if mobile:await touch('touchStart',x,y)
   else:await page.mouse.move(x,y);await page.mouse.down()
   await page.wait_for_function('__moba.game.player.state.mosesCharge');await page.evaluate('advance(.5)')
   assert await page.evaluate('__moba.game.player.ammo===0&&Math.abs(__moba.game.player.state.mosesCharge.progress-.5)<.01')
   assert '탄약'not in await page.locator('#champion-live-status').text_content();await shot('moses-smoking-charge')
   if mobile:await touch('touchEnd')
   else:await page.mouse.up()
   await page.wait_for_function('!__moba.game.player.state.mosesCharge');assert await page.evaluate('__moba.game.player.ammo===0')
   await page.evaluate(SETUP,'moses')
   await page.evaluate('()=>{const g=__moba.game,p=g.player;window.ally=target(43,20,0);ally.maxHp=3000;ally.hp=1000;g.cast(p,"q",p,{direction:"up"});g.attack(p,{x:50,y:20});}')
   assert await page.evaluate('ally.shields.some(s=>s.source.startsWith("moses-white-")&&s.value===300)&&ally.shields.some(s=>s.source.startsWith("moses-breath-"))')
   await shot('white-independent-shields');await page.evaluate('advance(1.51)');assert await page.evaluate('!ally.shields.some(s=>s.source.startsWith("moses-white-")&&s.until>__moba.game.time)&&__moba.game.shield(ally)>0')
   await page.evaluate(SETUP,'moses');await page.evaluate('()=>{const g=__moba.game,p=g.player;p.rCd=30;p.upgrades.haste=2;window.allies=[target(42,19,0),target(43,20,0),target(42,21,0)];for(const a of allies)a.hp=1000;g.cast(p,"q",p,{direction:"right"});g.attack(p,{x:50,y:20});}')
   assert await page.evaluate('__moba.game.player.rCd===28.5&&allies.every(a=>a.shields.every(s=>!s.source.startsWith("moses-red-")))');await page.evaluate('advance(.51)');assert await page.evaluate('allies.every(a=>Math.abs(a.hp-1110)<.01)');await shot('red-healing')
   await page.evaluate(SETUP,'moses');await page.evaluate('__moba.game.cast(__moba.game.player,"r",{x:60,y:20});advance(.4)')
   if mobile:
    box=await page.locator('#basic-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
    await touch('touchStart',x,y);await touch('touchMove',x,y-65);await page.wait_for_timeout(240)
   else:
    point=await page.evaluate('__moba.renderer.camera.worldToScreen({x:40,y:25})');await page.mouse.move(point['x'],point['y']);await page.wait_for_timeout(80)
   await page.evaluate('advance(.3)');assert await page.evaluate('Math.abs(__moba.game.player.state.mosesR.angle)>.3');await shot('red-point-rotated')
   if mobile:await touch('touchEnd')
   await page.evaluate(SETUP,'gahwan');await page.evaluate('()=>{const g=__moba.game,p=g.player;window.gaze=target(37,21);window.contempt=target(43,21);for(let i=0;i<4;i++)g.deal(p,gaze,1,{fixed:true});for(let i=0;i<5;i++)g.deal(p,contempt,1,{fixed:true});}')
   await shot('gaze-and-contempt-icons')
   await page.evaluate('()=>{const g=__moba.game,p=g.player;g.cast(p,"q",{x:46,y:20});advance(.15);}')
   await shot('gahwan-red-tactical')
   await page.evaluate(SETUP,'gahwan');await page.evaluate('()=>{const g=__moba.game,p=g.player;window.front=target(46,20);window.rear=target(36,20);g.input.aim={x:50,y:20};g.cast(p,"r",g.input.aim);advance(.8);}')
   assert await page.evaluate('front.hp===100000&&__moba.game.player.state.gahwanR')
   if mobile:
    stick=await page.locator('#mobile-stick').bounding_box();sx=stick['x']+stick['width']/2;sy=stick['y']+stick['height']/2;await touch('touchStart',sx,sy);await touch('touchMove',sx+35,sy)
   else:await page.keyboard.down('d')
   await page.wait_for_timeout(80);await page.evaluate('advance(.3)');assert await page.evaluate('__moba.game.player.x>40.2&&__moba.game.player.state.gahwanR')
   if mobile:await touch('touchEnd')
   else:await page.keyboard.up('d')
   await page.wait_for_timeout(80);await shot('gahwan-reverse-grip-charge')
   await page.evaluate('advance(.68)');assert await page.evaluate('front.hp<100000&&rear.hp===100000&&__moba.game.effects.some(f=>f.type==="gahwanWave"&&f.shape.spread===Math.PI)');await shot('gahwan-red-half-moon')
   await page.evaluate(SETUP,'ppui');await page.evaluate('__moba.game.player.ppuiHealing=12345');await shot('ppui-petals-and-progress')
   await page.evaluate(SETUP,'ezra');await page.evaluate('()=>{const g=__moba.game,p=g.player;g.cast(p,"r",p);g.input.aim={x:41,y:20};g.mobileAim={slot:"basic"};}')
   await shot('ezra-circular-preview')
   await page.evaluate(SETUP,'dongbaek');await page.evaluate('()=>{const g=__moba.game,p=g.player;g.cast(p,"r",{x:45,y:20});advance(.21);}')
   assert await page.evaluate('__moba.renderer.scene25d.championVfx.effects.filter(f=>f.type==="petalFan").every(f=>f.spread===Math.PI*2)');await shot('dongbaek-expanding-circle');await page.evaluate('advance(.8)');await shot('dongbaek-final-circle')
   await page.evaluate('()=>{const c=__moba.codex;c.key="moses";c.skill=1;c.descriptionMode="details";c.show("champions");}')
   assert '탄창'not in await page.locator('#skill-description').inner_text();await shot('moses-codex')
   assert not errors,(mode,errors);print(mode+': gestures, smoking, independent shields, healing/refunds, rotation, mark icons, crimson half-moon, pulse and true circle ranges passed.',flush=True)
   await context.close()
  await browser.close()
asyncio.run(main())
