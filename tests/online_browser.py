"""Real browser/host traffic; works with direct WebRTC or automatic WebSocket relay."""
import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright

URL=os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5185').rstrip('/')
ART=Path('artifacts');ART.mkdir(exist_ok=True)

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
  errors=[]
  pc=await browser.new_context(viewport={'width':1280,'height':800})
  phone=await browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1)
  host=await pc.new_page();guest=await phone.new_page()
  await guest.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Fixed test viewport'));")
  for page in [host,guest]:page.on('pageerror',lambda e:errors.append(str(e)))
  await host.goto(URL+'/?debug');await host.wait_for_function('window.__moba');await host.click('#online')
  await host.fill('#online-name','방장');await host.screenshot(path=str(ART/'online-entry.png'))
  await host.click('#online-create');await host.wait_for_function('__moba.online.room')
  code=await host.evaluate('__moba.online.room.code');link=await host.input_value('#online-link');assert 'room='+code in link
  await guest.goto(URL+'/?debug&room='+code);await guest.wait_for_function('window.__moba');await guest.fill('#online-name','모바일 참가자');await guest.locator('#online-join').tap()
  await guest.wait_for_function('__moba.online.room')
  await host.wait_for_function("[...__moba.online.peers.values()].some(p=>p.channel?.readyState==='open')",timeout=20000)
  await guest.evaluate("__moba.online.send({type:'choose',slot:4,champion:'jamila'})")
  await guest.wait_for_function("__moba.online.room.members.find(m=>m.id===__moba.online.id).champion==='jamila'")
  await host.screenshot(path=str(ART/'online-lobby-desktop.png'));await guest.screenshot(path=str(ART/'online-lobby-mobile.png'))
  assert await guest.evaluate("document.querySelector('#online-room').scrollWidth<=innerWidth")
  await guest.locator('#online-ready').tap();await host.wait_for_function("!document.querySelector('#online-start').disabled")
  await host.click('#online-start');await guest.wait_for_function("__moba.mode==='playing'&&__moba.game.time>.6",timeout=20000)
  member=await guest.evaluate('__moba.online.id');assert await guest.evaluate('__moba.game.player.team')==1
  assert await host.evaluate('__moba.game.champions().length')==8
  print('Room, invitation, 8 slots, mobile selection and host/client start passed.',flush=True)

  client=await phone.new_cdp_session(guest)
  async def touch(kind,x=0,y=0):
   await client.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':x,'y':y,'id':1}]})
  box=await guest.locator('#mobile-stick').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
  before=await guest.evaluate('__moba.game.player.x')
  await touch('touchStart',x,y);await touch('touchMove',x-35,y);await asyncio.sleep(.65);await touch('touchEnd');await asyncio.sleep(.2)
  assert await guest.evaluate('__moba.game.player.x')<before-.5
  await host.evaluate("""()=>{const g=__moba.game;for(const e of g.champions())if(e.memberId){e.x=e.team?42:38;e.y=7.15;e.hp=e.maxHp;e.lastCombat=-99;}else{e.alive=false;e.respawnAt=Infinity;} }""")
  await guest.wait_for_function('__moba.game.player.x===42');await guest.locator('#basic-btn').tap();await asyncio.sleep(.35)
  assert await host.evaluate('__moba.game.player.hp<__moba.game.player.maxHp')
  assert await guest.evaluate('__moba.game.player.ammo<16')
  await guest.click('#pause');time=await guest.evaluate('__moba.game.time');await asyncio.sleep(.35);assert await guest.evaluate('__moba.game.time')>time
  await guest.locator('#resume').tap();await guest.wait_for_function('!__moba.paused')
  print('Mobile movement, authoritative damage/ammo and non-pausing settings passed.',flush=True)

  await host.evaluate("""()=>{const g=__moba.game,e=g.champions().find(e=>e.memberId&&e!==g.player);Object.assign(e,g.spawnPoint(e));e.gold=1000;e.lastCombat=-99;}""")
  await guest.wait_for_function('__moba.game.canShop(__moba.game.player)')
  await guest.locator('#shop-toggle').tap();await guest.locator('#buy-power').tap()
  await host.wait_for_function("__moba.game.champions(1).find(e=>e.memberId).upgrades.power===1")
  await guest.wait_for_function('__moba.game.player.upgrades.power===1');await guest.locator('#shop-close').tap()
  await guest.wait_for_function("document.querySelector('#shop').classList.contains('hidden')")
  ping=await guest.locator('#ping-controls [data-ping="attack"]').bounding_box()
  await touch('touchStart',ping['x']+ping['width']/2,ping['y']+ping['height']/2);await asyncio.sleep(.06);await touch('touchEnd')
  await host.wait_for_function('__moba.game.pings?.some(p=>p.team===1)')
  print('Host-validated shop purchase and team ping passed.',flush=True)

  oldtime=await guest.evaluate('__moba.game.time');await guest.reload();await guest.wait_for_function("window.__moba?.mode==='playing'&&__moba.game.time>"+str(oldtime),timeout=20000)
  assert await guest.evaluate('__moba.online.id')==member
  assert await guest.evaluate('__moba.game.player.upgrades.power')==1
  await guest.screenshot(path=str(ART/'online-mobile-match.png'))
  await host.evaluate("__moba.game.finish(0,'온라인 테스트')")
  await host.wait_for_function("__moba.mode==='result'",timeout=10000);await guest.wait_for_function("__moba.mode==='result'",timeout=10000)
  assert await host.inner_text('#result-title')=='승리';assert await guest.inner_text('#result-title')=='패배'
  await host.click('#restart');await guest.wait_for_function("__moba.mode==='online'&&__moba.online.room.phase==='lobby'")
  await guest.locator('#online-ready').tap();await host.click('#online-start');await guest.wait_for_function("__moba.mode==='playing'&&__moba.game.time>.1",timeout=15000)
  assert await guest.evaluate('__moba.game.player.upgrades.power')==0
  await host.evaluate('__moba.online.leave();document.querySelector("#home").click()')
  await guest.wait_for_function("__moba.mode==='menu'")
  print('Reconnection, opposite-team results, rematch and host departure passed.',flush=True)
  assert not errors,errors
  await browser.close()

asyncio.run(main())
