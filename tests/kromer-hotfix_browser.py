"""Real PC/mobile dummy recast and shared pick/score portrait framing."""
import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5192').rstrip('/');ART=Path('artifacts');ART.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);errors=[]
  for mobile in [False,True]:
   ctx=await b.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   await p.goto(URL+'/?debug');await p.wait_for_function('window.__moba');await p.click('#training-open')
   await p.evaluate('''async()=>{const {portrait,loadAtlas,FRAMES}=await import('/src/art.js');for(const canvas of document.querySelectorAll('#champion-select [data-key] canvas')){const key=canvas.parentElement.dataset.key,a=loadAtlas(FRAMES[key].sheet);await a.decode();const expected=document.createElement('canvas');expected.width=expected.height=120;portrait(expected,key,a);if(canvas.toDataURL()!==expected.toDataURL())throw Error('Pick portrait mismatch: '+key);}}''')
   await p.screenshot(path=str(ART/f'kromer-hotfix-{ "mobile" if mobile else "pc"}-picks.png'));await p.click('[data-key=kromer]');await p.click('#start');await p.wait_for_function('__moba.game.training')
   await p.evaluate('''()=>{const g=__moba.game,p=g.player,t=g.champions(1).find(t=>t.trainingDummy?.infinite);window.hotfixStep=g.step.bind(g);g.step=()=>{};g.units=[p,t];g.projectiles=[];g.events=[];g.pending=[];g.zones=[];g.minionQueue=[];g.practice.lineStopped=true;g.practice.noCooldown=false;g.practice.invincible=false;g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:20,qCd:0,rCd:0});Object.assign(t,{x:48.5,y:20});t.trainingDummy.home={x:t.x,y:t.y};g.input.aim={x:t.x,y:t.y};window.hotfixDummy=t;}''')
   if mobile:await p.locator('#q-btn').tap()
   else:
    await p.locator('#q-btn').click()
   assert await p.evaluate('__moba.game.projectiles[0].remaining===9');await p.evaluate('for(let i=0;i<48;i++)hotfixStep(1/120)');assert await p.evaluate('__moba.game.player.state.kromerQMark?.targetId===hotfixDummy.id&&hotfixDummy.hp===hotfixDummy.maxHp')
   if mobile:await p.locator('#q-btn').tap()
   else:await p.locator('#q-btn').click()
   assert await p.evaluate("__moba.game.player.motion?.actionTag==='kromerQDash'");await p.evaluate('for(let i=0;i<40;i++)hotfixStep(1/120)');assert await p.evaluate('__moba.game.player.x>46&&__moba.game.stat(hotfixDummy,"stun")>0')
   await p.evaluate('''()=>{const g=__moba.game,p=g.player;g.input.aim={x:hotfixDummy.x,y:hotfixDummy.y};g.cast(p,'r',hotfixDummy);for(let i=0;i<57;i++)hotfixStep(1/120);g.makeChampion('jamila',0,2);g.makeChampion('yi',1,3);}''');assert await p.evaluate('!!__moba.game.player.state.kromerGrab');await p.screenshot(path=str(ART/f'kromer-hotfix-{ "mobile" if mobile else "pc"}-impale.png'))
   if mobile:await p.evaluate('__moba.mobile.api.score(true)')
   else:await p.keyboard.down('Tab')
   await p.wait_for_function('document.querySelector("#score-rows tr")')
   await p.evaluate('''async()=>{const {portrait,loadAtlas,FRAMES}=await import('/src/art.js'),g=__moba.game;for(const e of g.champions()){const canvas=document.querySelector('#score-rows [data-unit="'+e.id+'"] canvas');if(!canvas)throw Error('Missing score row');const a=loadAtlas(FRAMES[e.key].sheet);await a.decode();const expected=document.createElement('canvas');expected.width=expected.height=80;portrait(expected,e.key,a);if(canvas.toDataURL()!==expected.toDataURL())throw Error('Score portrait mismatch: '+e.key);}}''');await p.screenshot(path=str(ART/f'kromer-hotfix-{ "mobile" if mobile else "pc"}-scores.png'));await ctx.close();print(('Mobile'if mobile else'PC')+' 9-range infinite-dummy recast, impalement, pick and score portraits passed.',flush=True)
  assert not errors,errors;await b.close()
asyncio.run(main())
