"""The PC host authorizes mobile breath streams, two queued colors and release-only enhancement."""
import asyncio,os
from playwright.async_api import async_playwright
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5195')
async def main():
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  pc=await browser.new_context(viewport={'width':1280,'height':800});phone=await browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
  h=await pc.new_page();p=await phone.new_page();errors=[]
  for page in [h,p]:page.on('pageerror',lambda e:errors.append(str(e)))
  await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
  try:
   await h.goto(URL+'/?debug');await h.click('#online');await h.fill('#online-name','모제스 방장');await h.click('#online-create');await h.wait_for_function('__moba.online.room');code=await h.evaluate('__moba.online.room.code')
   await p.goto(URL+'/?debug&room='+code);await p.fill('#online-name','모제스 참가자');await p.locator('#online-join').tap();await p.wait_for_function('__moba.online.room')
   await h.evaluate("__moba.online.send({type:'choose',slot:0,champion:'moses'});for(const slot of[1,2,3,5,6,7])__moba.online.send({type:'bot',slot,champion:null})")
   await p.evaluate("__moba.online.send({type:'choose',slot:4,champion:'moses'})");await p.wait_for_function("__moba.online.room.members.find(m=>m.id===__moba.online.id).champion==='moses'")
   await h.wait_for_function("[...__moba.online.peers.values()].some(p=>p.channel?.readyState==='open')",timeout=20000);await p.locator('#online-ready').tap();await h.wait_for_function('!document.querySelector("#online-start").disabled');await h.click('#online-start');await h.wait_for_function('__moba.mode==="playing"&&__moba.game.time>.1',timeout=20000)
   await h.evaluate("()=>{const g=__moba.game,a=g.player,b=g.champions(1)[0];g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;g.units=[a,b];g.wave=999;g.bossSpawned=g.sewingKingSpawned=g.needleCampSpawned=true;for(const[e,x]of[[a,40],[b,43]])Object.assign(e,{x,y:20,ammo:0,qCd:0,rCd:0,invulnerableUntil:9999});}")
   await p.wait_for_function('__moba.game.player.key==="moses"&&__moba.game.player.x===43');cdp=await phone.new_cdp_session(p)
   async def center(id):
    box=await p.locator(id).bounding_box();return box['x']+box['width']/2,box['y']+box['height']/2
   async def touch(kind,x=0,y=0):await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[]if kind=='touchEnd'else[{'x':x,'y':y}]})
   async def select(dx,dy):
    x,y=await center('#q-btn');await touch('touchStart',x,y);await touch('touchMove',x+dx,y+dy);await p.wait_for_timeout(80);await touch('touchEnd')
   await select(-65,0);await h.wait_for_function('__moba.game.champions(1)[0].state.smokeQueue.join()==="left"');await p.wait_for_function('__moba.game.player.state.smokeQueue.join()==="left"&&!document.querySelector("#q-btn").disabled')
   await select(0,-65);await h.wait_for_function('__moba.game.champions(1)[0].state.smokeQueue.join()==="left,up"');await p.wait_for_function('__moba.game.player.state.smokeQueue.length===2&&document.querySelector("#q-btn").disabled')
   assert await h.evaluate('__moba.game.player.state.smokeQueue.length===0&&__moba.game.player.state.mosesCharges===2')
   x,y=await center('#basic-btn');await touch('touchStart',x,y);await touch('touchMove',x-60,y);await p.wait_for_timeout(700)
   assert await h.evaluate('__moba.game.champions(1)[0].state.smokeQueue.length===2&&!__moba.game.champions(1)[0].attackSerial')
   await touch('touchEnd');await h.wait_for_function('__moba.game.champions(1)[0].state.smokeQueue.join()==="up"');await p.wait_for_function('__moba.game.player.state.smokeQueue.join()==="up"')
   assert await h.evaluate('__moba.game.champions(1)[0].state.mosesAir===30&&__moba.game.champions(1)[0].attackSerial===1')
   await p.wait_for_timeout(320);await p.locator('#basic-btn').tap();await h.wait_for_function('__moba.game.champions(1)[0].state.smokeQueue.length===0');await p.wait_for_function('__moba.game.player.state.smokeQueue.length===0')
   await p.wait_for_timeout(320);x,y=await center('#basic-btn');await touch('touchStart',x,y);await touch('touchMove',x-65,y);await h.wait_for_function('__moba.game.champions(1)[0].state.mosesAir<=27');await touch('touchEnd')
   await p.wait_for_timeout(160);n=await h.evaluate('__moba.game.champions(1)[0].attackSerial');await p.wait_for_timeout(400);assert await h.evaluate('__moba.game.champions(1)[0].attackSerial')==n
   await p.wait_for_function('__moba.game.player.state.mosesSmoking');await h.wait_for_function('__moba.game.champions(1)[0].state.mosesAir===30');await p.wait_for_function('__moba.game.player.state.mosesAir===30&&!__moba.game.player.state.mosesSmoking')
   # Forced empty-breath recovery is host-owned and replicated to the guest.
   await h.evaluate('()=>{const g=__moba.game,p=g.champions(1)[0];p.state.mosesAir=0;p.state.mosesLastShot=g.time;p.attackCd=0;}');await p.wait_for_function('__moba.game.player.state.mosesAir===0');await p.locator('#basic-btn').tap()
   await h.wait_for_function('__moba.game.champions(1)[0].state.mosesRecovering');await p.wait_for_function('__moba.game.player.state.mosesRecovering');await h.wait_for_function('__moba.game.champions(1)[0].state.mosesAir===30');await p.wait_for_function('__moba.game.player.state.mosesAir===30')
   await p.locator('#r-btn').tap();await h.wait_for_function('__moba.game.champions(1)[0].state.mosesR');await p.wait_for_function('__moba.game.player.state.mosesR');await h.wait_for_function('!__moba.game.champions(1)[0].state.mosesR');await p.wait_for_function('!__moba.game.player.state.mosesR')
   for page in [h,p]:await page.evaluate('__moba.audio.synth.swings.ready');await page.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="mosesBreath")')
   assert not errors,errors;print('PC host/mobile guest: FIFO selection, press/release authority, breath streaming/regen/exhaustion, caster isolation, red point and breath audio passed.',flush=True)
  finally:
   try:await h.evaluate('__moba.online.leave()')
   except Exception:pass
   await browser.close()
asyncio.run(main())
