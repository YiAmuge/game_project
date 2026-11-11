"""Verify breath streaming, enhanced release, current indicators and offline rendering."""
import asyncio,os,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts/champion-air-update';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5195')
async def main():
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mode in os.getenv('MOBA_TEST_MODES','desktop,mobile,offline').split(','):
   mobile=mode=='mobile';ctx=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile)
   page=await ctx.new_page();errors=[];external=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   if mode=='offline':
    built=URL+'/dist/city-border.html?debug'
    async def route(r):
     if r.request.url==built:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await page.route('**/*',route);await page.goto(built,wait_until='networkidle',timeout=90000);await ctx.set_offline(True)
   else:await page.goto(URL+'/?debug',wait_until='networkidle')
   await page.click('#training-open');await page.click('.champion-option[data-key="moses"]');await page.click('#start');await page.wait_for_function('__moba.mode==="playing"')
   cdp=await ctx.new_cdp_session(page)
   async def touch(kind,x=0,y=0):await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[]if kind=='touchEnd'else[{'x':x,'y':y}]})
   async def center(id):
    box=await page.locator(id).bounding_box();return box['x']+box['width']/2,box['y']+box['height']/2
   async def shot(name):await page.wait_for_timeout(80);await page.screenshot(path=str(ART/f'{mode}-{name}.png'))
   await page.evaluate(SETUP,'moses');await page.wait_for_timeout(200)
   await page.evaluate('()=>{window.high=target(43,20);high.hp=1000;window.low=target(40,23);low.hp=500;}')
   x,y=await center('#basic-btn')
   if mobile:
    await touch('touchStart',x,y);await page.wait_for_timeout(240)
   else:
    await page.mouse.move(x,y);await page.mouse.down();await page.wait_for_timeout(40)
   await page.evaluate('advance(.91)')
   assert await page.evaluate('__moba.game.player.state.mosesAir===26'),await page.evaluate('JSON.stringify(__moba.game.player.state)')
   if mobile:assert await page.evaluate('low.hp<500&&high.hp===1000')
   await shot('breath-stream')
   if mobile:await touch('touchEnd')
   else:await page.mouse.up()
   assert await page.evaluate('__moba.game.player.state.mosesAir===26')
   await page.evaluate('advance(.8)');assert await page.evaluate('Boolean(__moba.game.player.state.mosesSmoking)');await shot('pipe-regeneration')
   await page.evaluate('advance(1.93)');assert await page.evaluate('__moba.game.player.state.mosesAir===30&&!__moba.game.player.state.mosesSmoking')
   # Normal manual slide is live, and does not auto-lock on an enemy.
   if mobile:
    await page.evaluate(SETUP,'moses');await page.wait_for_timeout(120);x,y=await center('#basic-btn')
    await touch('touchStart',x,y);await touch('touchMove',x,y-65);await page.wait_for_timeout(80);await page.evaluate('advance(.31)')
    assert await page.evaluate('__moba.game.player.state.mosesAir===28&&__moba.game.player.attackFacing<-.8')
    await touch('touchEnd')
   # Use the actual four-way tactical control twice; one queued breath leaves it usable.
   await page.evaluate(SETUP,'moses');await page.wait_for_timeout(150)
   async def choose(dx,dy):
    qx,qy=await center('#q-btn')
    if mobile:await touch('touchStart',qx,qy);await touch('touchMove',qx+dx,qy+dy);await page.wait_for_timeout(40);await touch('touchEnd')
    else:
     qx,qy=640,320;await page.mouse.move(qx,qy);await page.mouse.down(button='right');await page.mouse.move(qx+dx,qy+dy);await page.wait_for_timeout(40);await page.mouse.up(button='right')
    await page.wait_for_timeout(100)
   await choose(0,-60)
   assert await page.evaluate('__moba.game.player.state.smokeQueue.join()==="up"&&!document.querySelector("#q-btn").disabled')
   await choose(-60,0)
   assert await page.evaluate('__moba.game.player.state.smokeQueue.join()==="up,left"&&document.querySelector("#q-btn").disabled')
   await shot('two-smoke-icons')
   if mobile:
    x,y=await center('#basic-btn');await touch('touchStart',x,y);await touch('touchMove',x,y-60);await page.wait_for_timeout(240);await page.evaluate('advance(.6)')
    assert await page.evaluate('__moba.game.player.state.smokeQueue.length===2&&__moba.game.player.state.mosesAir===30&&!__moba.game.player.attackSerial')
    await shot('enhanced-aim-before-release');await touch('touchEnd');await page.wait_for_timeout(100)
    assert await page.evaluate('__moba.game.player.state.smokeQueue.join()==="left"&&__moba.game.player.state.mosesAir===30&&__moba.game.player.attackSerial===1')
   else:await page.evaluate('__moba.game.attack(__moba.game.player,{x:50,y:20})')
   await page.evaluate('advance(.31)')
   if mobile:await page.locator('#basic-btn').tap();await page.wait_for_timeout(100)
   else:await page.evaluate('__moba.game.attack(__moba.game.player,{x:50,y:20})')
   assert await page.evaluate('__moba.game.player.state.smokeQueue.length===0&&__moba.game.player.state.mosesAir===30')
   await page.evaluate(SETUP,'moses');await page.evaluate('()=>{const g=__moba.game,p=g.player;p.state.mosesAir=0;g.attack(p,{x:50,y:20});advance(.5);}')
   assert await page.evaluate('__moba.game.stat(__moba.game.player,"disarm")===1&&__moba.game.player.state.mosesSmoking');await shot('empty-breath-recovery')
   await page.evaluate('advance(1.21)');assert await page.evaluate('__moba.game.player.state.mosesAir===30&&!__moba.game.player.state.mosesRecovering')
   await page.evaluate(SETUP,'moses');await page.evaluate('__moba.game.cast(__moba.game.player,"r",{x:60,y:20});advance(1.4)');await shot('red-helix-charge')
   await page.evaluate('advance(.2)');assert await page.evaluate('__moba.game.projectiles.some(p=>p.type==="mosesPoint")');await shot('red-helix-projectile')
   await page.evaluate(SETUP,'gahwan');await page.evaluate('()=>{const g=__moba.game,p=g.player;window.contempt=target(43,21);for(let i=0;i<5;i++)g.deal(p,contempt,1);g.cast(p,"q",{x:46,y:20});advance(.15);}')
   await shot('orange-contempt-yellow-tactical')
   await page.evaluate(SETUP,'gahwan');await page.evaluate('()=>{const g=__moba.game,p=g.player;window.victim=target(46);window.baseArmor=g.armor(p);g.cast(p,"r",{x:50,y:20});advance(1.1);}')
   assert await page.evaluate('__moba.game.armor(__moba.game.player)===baseArmor+15&&victim.hp===100000');await shot('gahwan-charge')
   await page.evaluate('advance(.41)');assert await page.evaluate('victim.hp<100000&&__moba.game.armor(__moba.game.player)===baseArmor');await shot('gahwan-red-yellow-wave')
   await page.evaluate(SETUP,'rudolph');await page.evaluate('target(43).state.mentalWhip={1:{stage:3,hits:0,at:0,decayAt:2}}');await shot('rudolph-stack-three')
   await page.evaluate(SETUP,'ppui');await page.evaluate('()=>{const g=__moba.game,p=g.player;p.ppuiHealing=100000;p.ammo=1;g.cast(p,"r",{x:49,y:20});advance(1.8);}')
   assert await page.evaluate('__moba.game.player.ammo===1&&!__moba.game.attack(__moba.game.player,{x:49,y:20})');await shot('ppui-pulse-hundred-storm')
   await page.evaluate('advance(.21)');assert await page.evaluate('__moba.game.player.ammo===3')
   await page.evaluate(SETUP,'ryoshu');await page.evaluate('__moba.game.cast(__moba.game.player,"q",{x:44,y:20});advance(.2)');await shot('ryoshu-single-cooldown')
   await page.evaluate('()=>{const c=__moba.codex;c.key="moses";c.skill=1;c.descriptionMode="details";c.show("champions");}')
   assert '35' in await page.locator('#skill-description').inner_text();await shot('moses-current-codex')
   assert not errors,(mode,errors);assert not external,(mode,external)
   print(mode+': stream, manual/automatic aim, regeneration/exhaustion, two-color FIFO, enhanced release, helix, marks, pulse100 and cooldown UI passed.',flush=True)
   await ctx.close()
  await browser.close()
asyncio.run(main())
