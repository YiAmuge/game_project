"""Nikolai selection, saber, real desktop/mobile casts and offline codex."""
import ast,asyncio,os,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
SETUP=next(ast.literal_eval(n.value)for n in ast.parse((ROOT/'tests/champion-refresh_browser.py').read_text()).body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='SETUP'for t in n.targets))
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')
async def main():
 async with async_playwright()as pw:
  for mode in os.getenv('MOBA_TEST_MODES','desktop,mobile,offline').split(','):
   b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);mobile=mode=='mobile';ctx=await b.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();errors=[];external=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))");base=URL+('/dist/city-border.html?debug'if mode=='offline'else'/?debug')
   if mode=='offline':
    async def route(r):
     if r.request.url.split('#')[0]==base:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route)
   await p.goto(base,wait_until='networkidle',timeout=90000);await p.wait_for_function('window.__moba');await p.click('#training-open');await p.get_by_role('button',name=re.compile('^니콜라이 선택')).click();await p.screenshot(path=str(ART/f'nikolai-{mode}-pick.png'));await p.click('#start');await p.wait_for_function("__moba.game.player.key==='nikolai'&&__moba.renderer.atlasFor('nikolai').naturalWidth>0&&__moba.renderer.scene25d.skin.ready");await p.wait_for_timeout(250);await p.evaluate(SETUP,'nikolai');await p.wait_for_timeout(200)
   cdp=await ctx.new_cdp_session(p)
   async def tap(selector):
    if not mobile:await p.click(selector);return
    box=await p.locator(selector).bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   await p.wait_for_function("document.querySelector('#basic-btn span').textContent==='갈무리'");await p.screenshot(path=str(ART/f'nikolai-{mode}-idle.png'))
   await p.evaluate("()=>{window.foe=target(46);__moba.game.input.aim={x:46,y:20};}");await p.wait_for_timeout(100)
   if mobile:await tap('#basic-btn')
   else:
    point=await p.evaluate('()=>{const r=__moba.renderer,q=r.camera.worldToScreen(foe),b=r.canvas.getBoundingClientRect();return{x:q.x+b.left,y:q.y+b.top}}');await p.mouse.click(point['x'],point['y'])
   assert await p.evaluate('__moba.game.projectiles.some(p=>p.nikolaiWave&&!p.nikolaiEmpowered)'),(mode,'normal attack control')
   await p.evaluate('advance(.08)');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'nikolai-{mode}-white-wave.png'));await p.evaluate('advance(.22)');assert await p.evaluate('Boolean(foe.state.nikolaiMarks[__moba.game.player.id])'),(mode,'target')
   await p.evaluate("()=>{const g=__moba.game,p=g.player;foe.x=42;p.attackCd=0;p.ammo=4;g.attack(p,foe);advance(.025);}");await p.wait_for_timeout(120);assert await p.evaluate('__moba.game.projectiles.some(p=>p.nikolaiEmpowered&&p.remaining<2.5)');await p.screenshot(path=str(ART/f'nikolai-{mode}-orange-blade.png'))
   # Remove projectile traces before changing to support scenes.
   await p.evaluate("()=>{const g=__moba.game,p=g.player;g.projectiles=[];p.qCd=0;p.hp=500;window.ally=target(42,22,0);ally.hp=500;}");await tap('#q-btn');assert await p.evaluate("__moba.game.player.state.nikolaiOrders[__moba.game.player.id].mode==='regen'")
   await p.evaluate('advance(.6)');health=await p.evaluate('__moba.game.player.hp');assert health>500;await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'nikolai-{mode}-command-heal.png'));until=await p.evaluate('__moba.game.player.state.nikolaiCommand.until')
   await tap('#q-btn');result=await p.evaluate("({mode:__moba.game.player.state.nikolaiOrders[__moba.game.player.id].mode,until:__moba.game.player.state.nikolaiCommand.until})");assert result=={'mode':'power','until':until},(mode,result)
   await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'nikolai-{mode}-command-power.png'))
   await p.evaluate("()=>{const g=__moba.game,p=g.player;foe.x=44;g.input.aim={x:44,y:20};p.rCd=0;}")
   if mobile:await tap('#r-btn')
   else:
    point=await p.evaluate('()=>{const r=__moba.renderer,q=r.camera.worldToScreen(foe),b=r.canvas.getBoundingClientRect();return{x:q.x+b.left,y:q.y+b.top}}');await p.mouse.move(point['x'],point['y']);await p.keyboard.press('Space')
   assert await p.evaluate("__moba.game.projectiles.some(p=>p.nikolaiWave&&p.slot==='r')"),(mode,'ultimate input')
   await p.evaluate('advance(.06)');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'nikolai-{mode}-disposal-wave.png'));await p.evaluate('advance(.28)');await p.wait_for_timeout(120)
   result=await p.evaluate("({cuts:__moba.game.effects.filter(f=>f.type==='nikolaiCut').length,exposed:foe.exposedUntil>__moba.game.time,debuff:Boolean(foe.state.nikolaiDisposals[__moba.game.player.id])})");assert result['cuts']==4 and result['exposed'] and result['debuff'],(mode,result);await p.screenshot(path=str(ART/f'nikolai-{mode}-disposal-mark.png'))
   assert not errors,(mode,errors)
   await p.goto(base+'#codex/champions',wait_until='networkidle',timeout=90000);await p.reload(wait_until='networkidle',timeout=90000);await p.click('#roster-list [data-key=nikolai]');assert await p.locator('#archive-role').inner_text()=='지원 · 암살'
   for i,name in enumerate(['R사 제4무리 사령관','갈무리','전투 지휘','처분']):
    await p.click(f'#skill-tab-{i}');await p.click('[data-description-mode=details]');text=await p.locator('#skill-description').inner_text();assert name in text,(mode,i,text)
   await p.screenshot(path=str(ART/f'nikolai-{mode}-codex.png'));assert not errors,(mode,errors);assert not external,external;print(mode+': selection, normal/enhanced attacks, real command recast and disposal, sprites/effects and four codex slots passed.',flush=True);await ctx.close();await b.close()
asyncio.run(main())
