"""Golden Bough controls and conditional encyclopedia on desktop/mobile/offline."""
import ast,asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
SETUP=next(ast.literal_eval(n.value)for n in ast.parse((ROOT/'tests/champion-refresh_browser.py').read_text()).body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='SETUP'for t in n.targets))
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')
async def main():
 async with async_playwright()as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);errors=[]
  for mode in os.getenv('MOBA_TEST_MODES','desktop,mobile,offline').split(','):
   mobile=mode=='mobile';ctx=await b.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   external=[];base=URL+'/?debug'
   if mode=='offline':
    base=URL+'/dist/city-border.html?debug'
    async def route(r):
     if r.request.url.split('#')[0]==base:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(base,wait_until='networkidle',timeout=90000);await p.wait_for_function('window.__moba');await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.game.training');await p.wait_for_timeout(350)
   await p.evaluate(SETUP,'meursault');assert await p.evaluate("()=>{const g=__moba.game;return g.buyAugment(g.player,'goldenBough')}")
   await p.evaluate("()=>{window.foe=target(45);__moba.game.input.aim={x:45,y:20};}");await p.wait_for_timeout(100)
   await p.wait_for_function("document.querySelector('#basic-btn span').textContent==='SOLEIL'")
   box=await p.locator('#basic-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
   cdp=await ctx.new_cdp_session(p)
   if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   else:
    point=await p.evaluate('()=>{const r=__moba.renderer,q=r.camera.worldToScreen(foe),b=r.canvas.getBoundingClientRect();return{x:q.x+b.left,y:q.y+b.top}}');await p.mouse.move(point['x'],point['y']);await p.mouse.down()
   assert await p.evaluate('Boolean(__moba.game.player.state.soleilCharge)'),(mode,'hold start')
   await p.evaluate('__moba.game.input.aim={x:45,y:20}')
   await p.evaluate('advance(1.6)');await p.wait_for_timeout(120);assert await p.evaluate('foe.hp===100000'),(mode,'no premature strike')
   if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await p.mouse.up()
   result=await p.evaluate('({garde:__moba.game.player.state.soleilStrike?.garde,hp:foe.hp,ammo:__moba.game.player.ammo})');assert result['garde'] and result['hp']<100000 and result['ammo']==0,(mode,result)
   await p.screenshot(path=str(ART/f'bough-{mode}-garde.png'))
   # The enhanced R button is an actual second-hand command, even while the transform cooldown is running.
   await p.evaluate(SETUP,'yan');await p.evaluate("()=>{const g=__moba.game,p=g.player;g.buyAugment(p,'goldenBough');p.state.ominous=6;g.cast(p,'r',p);g.input.aim={x:45,y:21};}");await p.wait_for_timeout(100)
   await p.wait_for_function("document.querySelector('#r-btn span').textContent==='추가 손 조작'");assert await p.locator('#r-btn').is_enabled();assert await p.locator('#r-btn .cooldown').inner_text()==''
   if mobile:
    box=await p.locator('#r-btn').bounding_box();rx=box['x']+box['width']/2;ry=box['y']+box['height']/2
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':rx,'y':ry}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':rx-80,'y':ry}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await p.click('#r-btn')
   assert await p.evaluate("()=>{const g=__moba.game,hs=g.units.filter(e=>e.key==='yanHand');return hs.length===2&&Boolean(hs[1].goal)&&!hs[0].goal}")
   await p.screenshot(path=str(ART/f'bough-{mode}-yan.png'))
   # Draw all ropes, independent ammunition and capacity-sensitive UI.
   scenes={
    'queequeg':"const a=target(42,20,0),b=target(41,22,0),c=target(38,20,0);g.cast(p,'q',p);if(p.state.tethers.length!==3)throw Error('missing links');",
    'myo':"const ammo=p.ammo;g.cast(p,'q',{x:45,y:20});advance(.12);if(p.ammo!==ammo||p.state.myoTacticalAmmo!==ammo-1)throw Error('independent ammo');",
    'moses':"if(p.state.mosesCharges!==3)throw Error('three charges');",
    'maxim':"g.input.aim={x:70,y:20};g.cast(p,'q',g.input.aim);advance(.3);",
    'ryoshu':"g.cast(p,'r',p);advance(.21);",
   }
   for key,script in scenes.items():
    await p.evaluate(SETUP,key);await p.evaluate("()=>{const g=__moba.game,p=g.player;g.buyAugment(p,'goldenBough');"+script+"}");await p.wait_for_timeout(120);await p.screenshot(path=str(ART/f'bough-{mode}-{key}.png'));assert not errors,(mode,key,errors)
   # Read the real, individual skill panels rather than a synthetic tooltip.
   await p.goto(base+'#codex/champions',wait_until='networkidle',timeout=90000);await p.reload(wait_until='networkidle',timeout=90000)
   await p.click('#roster-list [data-key=meursault]');await p.click('#skill-tab-1');await p.click('[data-description-mode=details]');text=await p.locator('#skill-description').inner_text();assert 'SOLEIL' in text and 'Garde' in text and '3.5%' in text;assert await p.locator('.golden-skill').count()==1
   await p.screenshot(path=str(ART/f'bough-{mode}-codex-soleil.png'))
   for key,slot,words in [('ryoshu',3,['12초','35%']),('queequeg',2,['모든 아군','15%']),('starbuck',3,['2회','3초','속박']),('maxim',2,['2.5초','50%'])]:
    await p.click(f'#roster-list [data-key={key}]');await p.click(f'#skill-tab-{slot}');await p.click('[data-description-mode=details]');text=await p.locator('#skill-description').inner_text();assert all(w in text for w in words),(mode,key,text)
   assert not errors,(mode,errors);assert not external,external;print(mode+': held/released Garde, independent hand button, three links, tactical ammo, capacities, effects and codex passed.',flush=True);await ctx.close()
  await b.close()
asyncio.run(main())
