"""A real host/client match must share one rivalry winner and persistent buffs."""
import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5192');ART=Path('artifacts');ART.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);errors=[]
  host_ctx=await browser.new_context(viewport={'width':1280,'height':800});guest_ctx=await browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
  host=await host_ctx.new_page();guest=await guest_ctx.new_page();await guest.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
  for p in[host,guest]:p.on('pageerror',lambda e:errors.append(str(e)))
  await host.goto(URL+'/?debug');await host.wait_for_function('window.__moba');await host.click('#online');await host.fill('#online-name','이스터에그 방장');await host.click('#online-create');await host.wait_for_function('__moba.online.room');code=await host.evaluate('__moba.online.room.code')
  await guest.goto(URL+'/?debug&room='+code);await guest.wait_for_function('window.__moba');await guest.fill('#online-name','이스터에그 참가자');await guest.locator('#online-join').tap();await guest.wait_for_function('__moba.online.room')
  await host.evaluate("__moba.online.send({type:'choose',slot:0,champion:'sinclair'});for(const slot of[1,2,3,5,6,7])__moba.online.send({type:'bot',slot,champion:null});")
  await guest.evaluate("__moba.online.send({type:'choose',slot:4,champion:'kromer'})")
  await guest.wait_for_function("__moba.online.room.members.find(m=>m.id===__moba.online.id).champion==='kromer'")
  await host.wait_for_function("[...__moba.online.peers.values()].some(p=>p.channel?.readyState==='open')",timeout=20000)
  await guest.locator('#online-ready').tap();await host.wait_for_function('!document.querySelector("#online-start").disabled');await host.click('#online-start');await host.wait_for_function('__moba.mode==="playing"&&__moba.game.time>.1',timeout=20000)
  await guest.wait_for_function('__moba.mode==="playing"&&__moba.game.rivalries?.[0].participants.length===2',timeout=20000)
  host_id=await host.evaluate('__moba.game.player.id');await host.evaluate('''()=>{const g=__moba.game,p=g.player,t=g.champions(1)[0];g.kill(t,p);}''')
  await guest.wait_for_function('''id=>{const g=__moba.game,w=g.units.find(e=>e.id===id);return g.rivalries[0].winner===id&&w.rivalReward==='lightWorld'&&g.buff(w,'lightWorld')&&w.easterText.text==='그 ■■■에게, 말뚝을 쑤셔-$#^$^%^%!!!';}''',arg=host_id)
  await host.screenshot(path=str(ART/'rivalry-light-world-desktop.png'));await guest.screenshot(path=str(ART/'rivalry-light-world-mobile.png'))
  await host.evaluate('''()=>{const g=__moba.game,p=g.player,t=g.champions(1)[0];t.alive=true;t.hp=t.maxHp;g.kill(p,t);p.respawnAt=g.time;}''')
  await guest.wait_for_function('''id=>{const g=__moba.game,w=g.units.find(e=>e.id===id);return w.alive&&w.rivalReward==='lightWorld'&&g.buff(w,'lightWorld')&&g.rivalries[0].winner===id&&!g.player.rivalReward;}''',arg=host_id)
  assert not errors,errors;print('Real online host/mobile client: original roster activates rivalry, exact dialogue and permanent buff sync, first winner remains exclusive after death/respawn.',flush=True)
  await host.evaluate('__moba.online.leave()');await browser.close()
asyncio.run(main())
