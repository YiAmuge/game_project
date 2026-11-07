"""PC host and mobile Ezra guest share authoritative ammo, repeat and axe state."""
import asyncio,os
from playwright.async_api import async_playwright
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201')
async def main():
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']);errors=[]
  pc=await browser.new_context(viewport={'width':1280,'height':800});phone=await browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True);host=await pc.new_page();guest=await phone.new_page();await guest.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
  for p in[host,guest]:p.on('pageerror',lambda e:errors.append(str(e)))
  try:
   await host.goto(URL+'/?debug');await host.click('#online');await host.fill('#online-name','에즈라 방장');await host.click('#online-create');await host.wait_for_function('__moba.online.room');code=await host.evaluate('__moba.online.room.code')
   await guest.goto(URL+'/?debug&room='+code);await guest.fill('#online-name','에즈라 참가자');await guest.locator('#online-join').tap();await guest.wait_for_function('__moba.online.room')
   await host.evaluate("__moba.online.send({type:'choose',slot:0,champion:'ezra'});for(const slot of[1,2,3,5,6,7])__moba.online.send({type:'bot',slot,champion:null})");await guest.evaluate("__moba.online.send({type:'choose',slot:4,champion:'ezra'})")
   await guest.wait_for_function("__moba.online.room.members.find(m=>m.id===__moba.online.id).champion==='ezra'");await host.wait_for_function("[...__moba.online.peers.values()].some(p=>p.channel?.readyState==='open')",timeout=20000);await guest.locator('#online-ready').tap();await host.wait_for_function('!document.querySelector("#online-start").disabled');await host.click('#online-start');await host.wait_for_function('__moba.mode==="playing"&&__moba.game.time>.1',timeout=20000)
   await host.evaluate("()=>{const g=__moba.game,a=g.player,b=g.champions(1)[0];g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;g.units=[a,b];g.wave=999;g.bossSpawned=g.sewingKingSpawned=g.needleCampSpawned=true;for(const[e,x]of[[a,40],[b,46]])Object.assign(e,{x,y:20,ammo:4,qCd:0,rCd:0,facing:e.team?Math.PI:0,invulnerableUntil:9999});g.input.aim={x:50,y:20};}")
   await guest.wait_for_function('__moba.game.player.key==="ezra"&&__moba.game.player.ammo===4');await guest.locator('#basic-btn').tap();await host.wait_for_function('__moba.game.champions(1)[0].ammo===3&&__moba.game.champions(1)[0].state.weapon===1');await guest.wait_for_function('__moba.game.player.ammo===3&&!__moba.game.player.motion');await guest.wait_for_function('!document.querySelector("#q-btn").disabled');await guest.locator('#q-btn').tap();await host.wait_for_function('__moba.game.champions(1)[0].qCd>0');await guest.wait_for_function('__moba.game.player.qCd>0&&!__moba.game.player.motion');assert await guest.evaluate('__moba.game.player.ammo===3&&__moba.game.player.state.weapon===1')
   await guest.locator('#r-btn').tap();await host.wait_for_function('__moba.game.buff(__moba.game.champions(1)[0],"ezraUlt")');await guest.wait_for_function('__moba.game.player.ammo===4&&document.querySelector("#q-btn").disabled')
   for n in range(4):
    await guest.wait_for_function('!__moba.game.player.motion&&__moba.game.player.attackCd<=.01');await guest.locator('#basic-btn').tap()
    if n<3:await guest.wait_for_function('(n)=>__moba.game.player.ammo===3-n',arg=n)
    else:await guest.wait_for_function('!__moba.game.buff(__moba.game.player,"ezraUlt")&&__moba.game.player.ammo===3&&__moba.game.player.state.weapon===0')
   assert await host.evaluate('()=>{const g=__moba.game,p=g.champions(1)[0];g.changeAmmo(p,1);g.changeAmmo(p,-1);return p.ammo===3;}')
   assert await host.evaluate('()=>{const g=__moba.game,p=g.player;return g.cast(p,"r",{x:p.x+1,y:p.y});}')
   await guest.wait_for_function('__moba.game.champions(0).some(e=>e.buffs.ezraUlt>__moba.game.time)')
   for page in[host,guest]:await page.evaluate('()=>__moba.audio.synth.swings.ready');await page.evaluate('__moba.audio.synth.swings.history=[]')
   await host.evaluate('()=>{const g=__moba.game,p=g.champions(1)[0];p.state.weapon=2;p.ammo=4;p.attackCd=0;delete p.state.ezraReloading;delete p.state.ezraAttack;}');await guest.wait_for_function('__moba.game.player.state.weapon===2&&__moba.game.player.attackCd<=.01');await guest.locator('#basic-btn').tap()
   for page in[host,guest]:await page.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="ezraDrillMotor")');assert await page.evaluate('__moba.audio.synth.swings.history.filter(s=>s.id==="ezraDrillMotor").length===1')
   await host.wait_for_function('__moba.game.champions(1)[0].attackCd<=.01')
   await host.evaluate('()=>{const g=__moba.game,p=g.champions(1)[0];p.state.weapon=3;p.ammo=1;p.attackCd=0;delete p.state.ezraAttack;}');await guest.wait_for_function('__moba.game.player.state.weapon===3&&__moba.game.player.attackCd<=.01');await guest.locator('#basic-btn').tap()
   for page in[host,guest]:await page.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="groundImpact")');assert await page.evaluate('__moba.audio.synth.swings.history.filter(s=>s.id==="groundImpact").length===1')
   assert not errors,errors;print('PC host/mobile guest: Ezra selection, authoritative four-round cycle, repeat, four axe attacks, normal ammo restoration, immunity and remote drill/landing audio passed.',flush=True)
  finally:
   try:await host.evaluate('__moba.online.leave()')
   except Exception:pass
   await browser.close()
asyncio.run(main())
