"""New champions must be selectable and controllable across a real PC host/mobile guest."""
import asyncio,os
from playwright.async_api import async_playwright
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5193')
async def main():
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);errors=[]
  pc=await browser.new_context(viewport={'width':1280,'height':800});phone=await browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True);host=await pc.new_page();guest=await phone.new_page();await guest.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
  for p in[host,guest]:p.on('pageerror',lambda e:errors.append(str(e)))
  await host.goto(URL+'/?debug');await host.wait_for_function('window.__moba');await host.click('#online');await host.fill('#online-name','아르카나 방장');await host.click('#online-create');await host.wait_for_function('__moba.online.room');code=await host.evaluate('__moba.online.room.code')
  await guest.goto(URL+'/?debug&room='+code);await guest.wait_for_function('window.__moba');await guest.fill('#online-name','혈찬 참가자');await guest.locator('#online-join').tap();await guest.wait_for_function('__moba.online.room')
  await host.evaluate("__moba.online.send({type:'choose',slot:0,champion:'queen'});for(const slot of[1,2,3,5,6,7])__moba.online.send({type:'bot',slot,champion:null})")
  await guest.evaluate("__moba.online.send({type:'choose',slot:4,champion:'nosferatu'})")
  await guest.wait_for_function("__moba.online.room.members.find(m=>m.id===__moba.online.id).champion==='nosferatu'");await host.wait_for_function("[...__moba.online.peers.values()].some(p=>p.channel?.readyState==='open')",timeout=20000);await guest.locator('#online-ready').tap();await host.wait_for_function('!document.querySelector("#online-start").disabled');await host.click('#online-start');await host.wait_for_function('__moba.mode==="playing"&&__moba.game.time>.1',timeout=20000)
  await host.evaluate("()=>{const g=__moba.game;g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;const a=g.player,b=g.champions(1)[0];g.units=[a,b];g.wave=999;g.bossSpawned=g.sewingKingSpawned=g.needleCampSpawned=true;for(const [e,x]of [[a,40],[b,45]])Object.assign(e,{x,y:20,invulnerableUntil:9999});b.state.bloodFeast=600;g.input.aim={x:45,y:20};}")
  await guest.wait_for_function("__moba.game.player.key==='nosferatu'&&__moba.game.player.state.bloodFeast===600");await guest.locator('#q-btn').tap();await host.wait_for_function('__moba.game.units.some(e=>e.bloodBat)');await guest.wait_for_function('__moba.game.units.some(e=>e.bloodBat&&e.owner===__moba.game.player.id)')
  for remaining in[400,300,200,100]:
   await guest.locator('#q-btn').tap();await host.wait_for_function('blood=>__moba.game.champions(1)[0].state.bloodFeast===blood',arg=remaining)
  await guest.wait_for_function('__moba.game.player.state.bloodSummons.remaining===0&&__moba.game.player.qCd>0');assert await host.evaluate('__moba.game.units.filter(e=>e.bloodBat&&e.alive).length===4')
  await guest.locator('#r-btn').tap();await host.wait_for_function('__moba.game.champions(1)[0].state.bloodfiend');await guest.wait_for_function('__moba.game.player.state.bloodfiend');await guest.locator('#r-btn').tap();await host.wait_for_function('!__moba.game.champions(1)[0].state.bloodfiend');await guest.wait_for_function('!__moba.game.player.state.bloodfiend')
  await host.click('#r-btn');await guest.wait_for_function("__moba.game.champions(0)[0].state.queenR?.phase==='charging'");await host.wait_for_function('__moba.game.time-__moba.game.player.state.queenR.at>1.3');await host.click('#r-btn');await guest.wait_for_function("__moba.game.champions(0)[0].state.queenR?.phase==='firing'&&__moba.game.champions(0)[0].state.queenR.stage===1")
  assert not errors,errors;print('Real PC host/mobile guest: new picks, five-cast blood-cost bat burst, cooldown and ownership, bloodfiend transform/return, stage-one channel recast and snapshots passed.',flush=True);await host.evaluate('__moba.online.leave()');await browser.close()
asyncio.run(main())
