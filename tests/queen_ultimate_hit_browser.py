"""Keep real animation/simulation running while Queen R hits raw world entities."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'queen-ultimate-fix';ART.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']);results=[]
  for mode in ['desktop','mobile','offline']:
   mobile=mode=='mobile';ctx=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile);page=await ctx.new_page();errors=[];blocked=[]
   page.on('pageerror',lambda error:(errors.append(str(error)),print(error.stack,flush=True)));await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url='http://127.0.0.1:5201/'+('dist/city-border.html'if mode=='offline'else'')+'?debug'
   if mode=='offline':
    async def route(r):
     if r.request.url==url:await r.continue_()
     else:blocked.append(r.request.url);await r.abort()
    await page.route('**/*',route)
   await page.goto(url,wait_until='domcontentloaded',timeout=120000);await page.wait_for_function('window.__moba');await page.click('#training-open');await page.click('#start');await page.wait_for_function('__moba.game.training')
   await page.evaluate('''()=>{const g=__moba.game;for(const k of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};Object.assign(g.practice,{lineStopped:true,pauseXp:true,noCooldown:false,invincible:false});Object.assign(g,{time:0,pending:[],effects:[],projectiles:[],zones:[],corpses:[],winner:null});g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;const p=g.makeChampion('queen',0,0,'bottom');Object.assign(p,{x:40,y:20,player:false,lastAttackAt:100,lastDamageAt:100});g.player=p;g.units=[p];window.victims=[];for(const[kind,x]of[['minion',44],['neutral',46],['tower',48],['core',50]]){const t=g.entity({kind,team:kind==='neutral'?2:1,x,y:20,maxHp:100000,range:12,damage:0,interval:1,radius:.35,camp:kind==='neutral'?'side':undefined,home:{x,y:20},campId:'test-camp',campCenter:{x,y:20},campRadius:4});if(t.state!==undefined)throw Error('preinitialized test target');victims.push(t);}g.entity({kind:'minion',team:1,x:45,y:20,maxHp:30,range:2,damage:0,interval:1});g.input={x:0,y:0,fire:false,aim:{x:60,y:20}};if(!g.cast(p,'r',g.input.aim))throw Error('cast failed');}''')
   try:await page.wait_for_function("__moba.game.time>3.9&&victims.every(t=>t.hp<t.maxHp)",timeout=15000)
   except Exception:
    print(mode,await page.evaluate("({time:__moba.game.time,mode:__moba.mode,paused:__moba.paused,r:__moba.game.player.state.queenR,targets:victims.map(t=>({kind:t.kind,hp:t.hp,alive:t.alive}))})"),errors,flush=True)
    raise
   assert not errors,errors
   await page.screenshot(path=str(ART/f'{mode}-hit.png'))
   await page.wait_for_function("__moba.game.time>5.4&&!__moba.game.player.state.queenR",timeout=10000)
   snapshot=await page.evaluate("({time:__moba.game.time,targets:victims.map(t=>({kind:t.kind,damage:t.maxHp-t.hp,marked:!!t.state?.queenMarks?.[__moba.game.player.id]}))})")
   assert all(t['damage']>0 and t['marked']for t in snapshot['targets']),snapshot
   assert not errors,errors;assert not blocked,blocked
   results.append({'mode':mode,'errors':errors,'externalRequests':blocked,**snapshot});await ctx.close()
  await browser.close();(ART/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
asyncio.run(main())
