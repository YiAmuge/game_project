"""Real host/guest validation for the new delayed summon and mobile charge target command."""
import asyncio, os, runpy
from pathlib import Path
from playwright.async_api import async_playwright
pointer=runpy.run_path(str(Path(__file__).with_name('summon-mobile-adjust_browser.py')))['pointer']
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5198')

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);errors=[]
  pc=await browser.new_context(viewport={'width':1280,'height':800});phone=await browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
  host=await pc.new_page();guest=await phone.new_page();await guest.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
  for p in [host,guest]:p.on('pageerror',lambda e:errors.append(str(e)))
  await host.goto(URL+'/?debug');await host.wait_for_function('window.__moba');await host.click('#online');await host.fill('#online-name','투하 방장');await host.click('#online-create');await host.wait_for_function('__moba.online.room');code=await host.evaluate('__moba.online.room.code')
  await guest.goto(URL+'/?debug&room='+code);await guest.wait_for_function('window.__moba');await guest.fill('#online-name','모바일 조준');await guest.locator('#online-join').tap();await guest.wait_for_function('__moba.online.room')
  await host.evaluate("__moba.online.send({type:'choose',slot:0,champion:'jamila'});for(const slot of[1,2,3,5,6,7])__moba.online.send({type:'bot',slot,champion:null})")
  await guest.evaluate("__moba.online.send({type:'choose',slot:4,champion:'queen'})")
  await guest.wait_for_function("__moba.online.room.members.find(m=>m.id===__moba.online.id).champion==='queen'");await host.wait_for_function("[...__moba.online.peers.values()].some(p=>p.channel?.readyState==='open')",timeout=20000)
  await guest.locator('#online-ready').tap();await host.wait_for_function('!document.querySelector("#online-start").disabled');await host.click('#online-start');await host.wait_for_function('__moba.mode==="playing"&&__moba.game.time>.1',timeout=20000)
  await host.evaluate("""()=>{const g=__moba.game,step=g.step.bind(g);g.step=()=>{};window.advance=s=>{for(let i=0;i<Math.round(s*120);i++)step(1/120);};g.map={bounds:{x:0,y:0,w:100,h:80},walls:[]};g.bounds=g.map.bounds;const a=g.player,b=g.champions(1)[0];g.units=[a,b];g.wave=999;g.bossSpawned=g.sewingKingSpawned=g.needleCampSpawned=true;for(const name of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[name]=()=>{};Object.assign(a,{x:40,y:20,hp:1000,lastDamageAt:999,lastAttackAt:999});Object.assign(b,{x:40,y:40,lastDamageAt:999,lastAttackAt:999});const t=g.makeChampion('faust',0,g.nextId);Object.assign(t,{x:70,y:40,hp:400,attackCd:999});}""")
  await guest.wait_for_function('__moba.game.player.x===40&&__moba.game.player.y===40');await host.click('#r-btn')
  await guest.wait_for_function('__moba.game.champions(0).find(e=>e.key==="jamila").state.jamilaSummon')
  assert await guest.evaluate('!__moba.game.units.some(e=>e.lcaTrooper)')
  await host.evaluate('advance(.125)');await guest.wait_for_function('Math.abs(__moba.game.champions(0).find(e=>e.key==="jamila").state.jamilaSummon.readyAt-__moba.game.time-.125)<1e-6')
  await host.evaluate('advance(.125)');await guest.wait_for_function('__moba.game.units.filter(e=>e.lcaTrooper).length===2')
  assert await guest.evaluate('Math.abs(__moba.game.champions(0).find(e=>e.key==="jamila").rCd-75)<1e-6&&__moba.game.units.filter(e=>e.lcaTrooper).every(e=>e.visuals.deployment)')
  await guest.locator('#r-btn').tap();await host.wait_for_function('__moba.game.champions(1)[0].state.queenR?.phase==="charging"')
  await host.evaluate('__moba.game.player.hp=100');await guest.wait_for_function('__moba.game.champions(0).find(e=>e.key==="jamila").hp===100');await guest.locator('#basic-btn').tap()
  await host.wait_for_function('__moba.game.champions(1)[0].state.queenR.mobileTargetId===__moba.game.player.id')
  assert await host.evaluate('__moba.game.champions(1)[0].ammo===3&&Math.abs(__moba.game.champions(1)[0].state.queenR.angle)<.001')
  await host.evaluate('advance(.25)');await guest.wait_for_function('Math.abs(__moba.game.player.state.queenR.angle+Math.PI*.15)<1e-6')
  # Guest recall choice is carried as a command even when infiltration itself is unavailable.
  await host.evaluate("()=>{const g=__moba.game,p=g.champions(1)[0];delete p.state.queenR;p.channelUntil=0;p.augments=['highRisk'];p.state.infiltrationReady=g.time+75;}")
  await guest.wait_for_function('!__moba.game.player.state.queenR&&__moba.game.player.augments.includes("highRisk")');await pointer(guest,'#recall-btn',dx=-35,mobile=True)
  await host.wait_for_function('__moba.game.champions(1)[0].recall&&!__moba.game.champions(1)[0].recall.infiltration')
  assert not errors,errors;print('Real PC host/mobile guest: pending and landed troop snapshots, host-resolved Queen tap/slow steering, and recall choice during infiltration cooldown passed.',flush=True)
  await host.evaluate('__moba.online.leave()');await browser.close()

if __name__=='__main__':asyncio.run(main())
