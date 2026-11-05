"""Render updated combat effects and exercise the same build on PC, touch and standalone."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts'/'balance-ai';ART.mkdir(parents=True,exist_ok=True)
SETUP='''key=>{const g=__moba.game;if(!window.balanceStep)window.balanceStep=g.step.bind(g);g.step=()=>{};for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(g,{time:0,events:[],effects:[],projectiles:[],zones:[],pending:[],corpses:[],winner:null,input:{x:0,y:0,fire:false,aim:{x:47,y:20}}});Object.assign(g.practice,{noCooldown:false,invincible:false,lineStopped:true});g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;const p=g.makeChampion(key,0,0,'top');Object.assign(p,{player:true,x:40,y:20,lastAttackAt:100,lastDamageAt:100,facing:0});g.player=p;g.units=[p];window.advance=s=>{for(let i=0;i<Math.round(s*120);i++)balanceStep(1/120);};window.target=(key='faust',team=1,x=44,y=20)=>{const t=g.makeChampion(key,team,g.nextId);Object.assign(t,{x,y,hp:50000,maxHp:50000,armor:0,attackCd:999,lastAttackAt:100,lastDamageAt:100});return t;};}'''
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  report=[]
  for mode in ['desktop','mobile','offline']:
   mobile=mode=='mobile';ctx=await browser.new_context(viewport={'width':844 if mobile else 1280,'height':390 if mobile else 800},is_mobile=mobile,has_touch=mobile)
   p=await ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   if mode=='offline':
    async def route(r):
     if r.request.url=='http://127.0.0.1:5201/dist/city-border.html?debug':await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
    await p.goto('http://127.0.0.1:5201/dist/city-border.html?debug',wait_until='domcontentloaded',timeout=120000)
   else:await p.goto('http://127.0.0.1:5201/?debug',wait_until='networkidle')
   await p.wait_for_function('window.__moba');await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.game.training');await p.wait_for_timeout(300)
   scenes={
    'queen':"const t=target();g.attack(p,t);advance(.3);g.cast(p,'q',t);advance(1.5);if(!t.state.queenMarks[p.id])throw Error('heart missing');",
    'yi':"target();g.cast(p,'q',{x:44,y:20});advance(1.5);if(Math.abs(g.zones[0].r-4.4)>.03)throw Error('field radius');",
    'rudolph':"g.cast(p,'r',{x:44,y:20});advance(.05);if(!p.status.disarm.hideVisual)throw Error('hidden exhaustion');",
    'ahab':"g.cast(p,'q',p);advance(.05);",
    'queequeg':"const a=target('faust',0);g.cast(p,'r',p);advance(1);g.cast(p,'q',a);if(!g.buff(a,'queequegUlt'))throw Error('shared ultimate');",
    'nosferatu':"p.state.bloodFeast=800;g.cast(p,'r',p);target('faust',1,41);advance(.55);"
   }
   for key,scene in scenes.items():
    await p.evaluate(SETUP,key);await p.evaluate('(code)=>{const g=__moba.game,p=g.player;eval(code)}',scene);await p.wait_for_timeout(150)
    if key in ['queen','yi','ahab']:await p.screenshot(path=str(ART/f'{mode}-{key}.png'))
   assert not errors,errors
   assert not external,external
   report.append({'mode':mode,'scenes':len(scenes),'errors':errors,'externalRequests':external})
   await ctx.close()
  await browser.close();(ART/'browser-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
asyncio.run(main())
