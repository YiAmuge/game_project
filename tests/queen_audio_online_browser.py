"""Remote guest hears host Queen charging and firing from replicated spell state."""
import asyncio,os
from playwright.async_api import async_playwright
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5201')
async def main():
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']);errors=[]
  pc=await browser.new_context(viewport={'width':1280,'height':800});phone=await browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True);host=await pc.new_page();guest=await phone.new_page();await guest.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
  for page in[host,guest]:page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   await host.goto(URL+'/?debug');await host.click('#online');await host.fill('#online-name','사운드 방장');await host.click('#online-create');await host.wait_for_function('__moba.online.room');code=await host.evaluate('__moba.online.room.code')
   await guest.goto(URL+'/?debug&room='+code);await guest.fill('#online-name','사운드 참가자');await guest.locator('#online-join').tap();await guest.wait_for_function('__moba.online.room')
   await host.evaluate("__moba.online.send({type:'choose',slot:0,champion:'queen'});for(const slot of[1,2,3,5,6,7])__moba.online.send({type:'bot',slot,champion:null})");await guest.evaluate("__moba.online.send({type:'choose',slot:4,champion:'alisa'})")
   await guest.wait_for_function("__moba.online.room.members.find(m=>m.id===__moba.online.id).champion==='alisa'");await host.wait_for_function("[...__moba.online.peers.values()].some(p=>p.channel?.readyState==='open')",timeout=20000);await guest.locator('#online-ready').tap();await host.wait_for_function('!document.querySelector("#online-start").disabled');await host.click('#online-start');await host.wait_for_function('__moba.mode==="playing"&&__moba.game.time>.1',timeout=20000)
   await host.evaluate("()=>{const g=__moba.game,a=g.player,b=g.champions(1)[0];g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;g.units=[a,b];g.wave=999;g.bossSpawned=g.sewingKingSpawned=g.needleCampSpawned=true;Object.assign(a,{x:40,y:20,invulnerableUntil:0,ccImmuneUntil:0});Object.assign(b,{x:45,y:20,invulnerableUntil:9999});g.input.aim={x:50,y:20};}")
   await guest.wait_for_function('__moba.game.player.key==="alisa"&&__moba.audio.context?.state==="running"');await guest.evaluate('()=>__moba.audio.synth.swings.ready');await guest.evaluate('__moba.audio.synth.swings.history=[]')
   assert await host.evaluate('__moba.game.cast(__moba.game.player,"q",{x:45,y:20})')
   await guest.wait_for_function('[...__moba.audio.queenCharge.fields.keys()].some(k=>k.endsWith("/q"))');await guest.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="yiShine"&&s.pitch>1)');await guest.wait_for_function('!__moba.audio.queenCharge.fields.size')
   assert await host.evaluate('__moba.game.cast(__moba.game.player,"r",{x:45,y:20})');await guest.wait_for_function('[...__moba.audio.queenCharge.fields.keys()].some(k=>k.endsWith("/r"))')
   await host.evaluate('__moba.game.status(__moba.game.player,"stun",1,.2)');await guest.wait_for_function('!__moba.audio.queenCharge.fields.size');await host.wait_for_function('!__moba.game.player.state.queenR')
   assert await host.evaluate('()=>{const g=__moba.game,p=g.player;p.status={};p.rCd=0;return g.cast(p,"r",{x:45,y:20});}')
   await guest.wait_for_function('__moba.audio.queenCharge.fields.size===1');await host.wait_for_function('__moba.game.time-__moba.game.player.state.queenR.at>1.3');assert await host.evaluate('__moba.game.cast(__moba.game.player,"r",{x:45,y:20})')
   await guest.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="yiShine"&&s.pitch>3)');await guest.wait_for_function('!__moba.audio.queenCharge.fields.size')
   await guest.locator('#q-btn').tap();await guest.wait_for_function('__moba.audio.synth.swings.history.some(s=>s.id==="alisaFire"&&s.pitch>2)')
   assert not errors,errors;print('PC host/mobile guest: replicated Q/R charge, interruption cleanup, brighter firing and Alisa Q audio passed.',flush=True)
  finally:
   try:await host.evaluate('__moba.online.leave()')
   except Exception:pass
   await browser.close()
asyncio.run(main())
