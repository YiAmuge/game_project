import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5192').rstrip('/');ART=Path('artifacts');ART.mkdir(exist_ok=True)
SETUP="""()=>{const g=__moba.game,p=g.player;window.step102=g.step.bind(g);g.step=()=>{};g.units=[p];g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;g.canNaturalHeal=()=>false;g.inSpawn=()=>false;g.practice.invincible=false;g.practice.noCooldown=false;g.practice.infiniteAmmo=false;for(const k of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:20,hp:g.maxHp(p),qCd:0,rCd:0,ammo:2,attackAt:-99,castAt:-99});g.input.aim={x:46,y:20};const t=g.makeChampion('faust',1,6);Object.assign(t,{x:42,y:20,hp:100000,maxHp:100000,armor:100});window.target102=t;g.time=0;}"""
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  errors=[]
  for mobile in [False,True]:
   ctx=await browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed test viewport'))")
   await p.goto(URL+'/?debug');await p.wait_for_function('window.__moba');assert await p.inner_text('#menu-version')=='v1.0.3';await p.locator('#training-open').click();await p.locator('[data-key=kromer]').click();await p.locator('#start').click();await p.wait_for_function("__moba.game.player.key==='kromer'&&__moba.game.training");await p.evaluate(SETUP);await p.wait_for_function("__moba.renderer.atlasFor('kromer').naturalWidth>0");await asyncio.sleep(.2)
   await p.screenshot(path=str(ART/f'v102-kromer-{ "mobile" if mobile else "pc"}-idle.png'))
   if not mobile:
    # The real pointer and ultimate button start the grab; ticks are stepped deterministically.
    at=await p.evaluate('__moba.renderer.camera.worldToScreen(target102)');await p.mouse.move(at['x'],at['y']);await asyncio.sleep(.1);await p.keyboard.press('Space');await p.evaluate('step102(.08)');assert await p.evaluate('__moba.game.player.state.kromerGrab?.target===target102')
    await p.evaluate('''()=>{const g=__moba.game;g.input.x=1;step102(.1);g.input.x=0;}''');at=await p.evaluate('__moba.renderer.camera.worldToScreen({x:__moba.game.player.x,y:__moba.game.player.y-5})');await p.mouse.move(at['x'],at['y']);await asyncio.sleep(.1);await p.evaluate('step102(.25)');assert await p.evaluate('__moba.game.player.state.kromerGrab.angle<0');await p.screenshot(path=str(ART/'v102-kromer-pc-grab.png'))
    await p.evaluate('''()=>{for(let i=0;i<210;i++)step102(1/120);}''');assert await p.evaluate('!__moba.game.player.state.kromerGrab&&!target102.state.kromerHeldBy')
    await p.evaluate('''()=>{const g=__moba.game,p=g.player;delete p.motion;delete target102.motion;Object.assign(p,{x:40,y:20,qCd:0});Object.assign(target102,{x:46,y:20});g.projectiles=[];g.input.aim={x:46,y:20};}''');await asyncio.sleep(.1);at=await p.evaluate('__moba.renderer.camera.worldToScreen(target102)');await p.mouse.click(at['x'],at['y'],button='right');await p.evaluate('step102(.1)');assert await p.evaluate("__moba.game.projectiles[0]?.theme==='kromerNail'");await p.screenshot(path=str(ART/'v102-kromer-pc-throw.png'));await p.evaluate('step102(.2)');assert await p.evaluate('__moba.game.player.state.kromerQMark?.targetId===target102.id');await p.evaluate("__moba.game.map.walls=[{x:43,y:18,w:1,h:4}]");await p.mouse.click(at['x'],at['y'],button='right');assert await p.evaluate('__moba.game.player.motion.ignoreWalls');await p.evaluate('step102(.3)');assert await p.evaluate('!__moba.game.player.motion')
    # Inspect the actual weapon drawing transform, including the idle reverse grip.
    await p.evaluate('''async()=>{const {drawEquipment,equipmentPose}=await import('/src/weapon-art.js'),g=__moba.game,e=g.makeChampion('ryoshu',0,3),c=document.createElement('canvas').getContext('2d');Object.assign(e,{x:0,y:0,facing:.5,attackAt:-99});g.time=20;g.input.fire=false;g.input.x=g.input.y=0;delete g.mobileAim;g.player=e;let vector;const r={ctx:c,weaponTrail(_,__,___,a,b){const m=c.getTransform();vector={x:m.a*(b.x-a.x)+m.c*(b.y-a.y),y:m.b*(b.x-a.x)+m.d*(b.y-a.y)};}};for(const moving of[false,true]){g.mobileInput=moving;g.input.x=moving?1:0;drawEquipment(r,e,g);const a=equipmentPose(g,e).facing;if(vector.x*Math.cos(a)+vector.y*Math.sin(a)>=0)throw Error('Ryoshu idle blade is not reversed');}}''')
   else:
    await p.evaluate("__moba.game.cast(__moba.game.player,'r',{x:45,y:20});step102(.08)");assert await p.evaluate('!!__moba.game.player.state.kromerGrab');session=await ctx.new_cdp_session(p)
    for selector in ['#basic-btn','#r-btn']:
     box=await p.locator(selector).bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
     await session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]});await session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':x,'y':y-45}]});assert await p.evaluate('[...__moba.mobile.gestures.values()].some(s=>s.kromerSteering)');await p.evaluate('step102(.1)');assert await p.evaluate('__moba.game.player.state.kromerGrab.angle<0');await session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert await p.evaluate('!!__moba.game.player.state.kromerGrab')
    await p.screenshot(path=str(ART/'v102-kromer-mobile-steering.png'))
   await ctx.close();print(('Mobile'if mobile else'PC')+' Kromer sprite, grab and controls passed.',flush=True)
  assert not errors,errors;await browser.close()
asyncio.run(main())
