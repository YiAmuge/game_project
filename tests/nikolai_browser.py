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
   await p.evaluate("""()=>{const r=__moba.renderer,c=r.ctx,stroke=c.stroke;window.nikoColors={};c.stroke=function(...args){nikoColors[this.strokeStyle]=(nikoColors[this.strokeStyle]||0)+1;return stroke.apply(this,args);};window.nikoFrame=()=>{nikoColors={};r.draw(__moba.game,true);return nikoColors;};
    window.nikoPixelDelta=kind=>{const g=__moba.game,projectiles=g.projectiles,effects=g.effects,wave=projectiles.find(p=>p.nikolaiWave),q=wave?r.camera.worldToScreen(wave,.95):null,size=r.camera.scale*1.1,box=kind==='ring'?{x:0,y:0,w:r.canvas.width,h:r.canvas.height}:{x:Math.max(0,Math.floor((q.x-size)*r.dpr)),y:Math.max(0,Math.floor((q.y-size)*r.dpr)),w:Math.round(size*2*r.dpr),h:Math.round(size*2*r.dpr)};
     const count=()=>{const a=c.getImageData(box.x,box.y,Math.min(box.w,r.canvas.width-box.x),Math.min(box.h,r.canvas.height-box.y)).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i+3]>40&&(kind==='white'?a[i]>235&&a[i+1]>230&&a[i+2]>215:a[i]>230&&a[i+1]>100&&a[i+1]<215&&a[i+2]<160))n++;return n;};
     if(kind==='ring')g.effects=effects.filter(f=>f.type!=='nikolaiCommand');else g.projectiles=[];r.draw(g,true);const without=count();g.effects=effects;g.projectiles=projectiles;r.draw(g,true);return count()-without;};
   }""")
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
   await p.evaluate('advance(.08)');await p.wait_for_timeout(100);delta=await p.evaluate("nikoPixelDelta('white')");assert delta>20,(mode,'white wave visible pixels',delta);await p.screenshot(path=str(ART/f'nikolai-{mode}-white-wave.png'));await p.evaluate('advance(.22)');assert await p.evaluate('Boolean(foe.state.nikolaiMarks[__moba.game.player.id])'),(mode,'target')
   await p.evaluate("()=>{const g=__moba.game,p=g.player;foe.x=42;p.attackCd=0;p.ammo=4;g.attack(p,foe);advance(.025);}");await p.wait_for_timeout(120);assert await p.evaluate('__moba.game.projectiles.some(p=>p.nikolaiEmpowered&&p.remaining<2.5)');delta=await p.evaluate("nikoPixelDelta('orange')");assert delta>20,(mode,'orange wave visible pixels',delta);await p.screenshot(path=str(ART/f'nikolai-{mode}-orange-blade.png'))
   # Remove projectile traces before changing to support scenes.
   await p.evaluate("()=>{const g=__moba.game,p=g.player;g.projectiles=[];p.qCd=0;p.hp=500;window.ally=target(42,22,0);ally.hp=500;}");await tap('#q-btn');assert await p.evaluate("__moba.game.player.state.nikolaiOrders[__moba.game.player.id].mode==='regen'")
   await p.evaluate('advance(.18)');delta=await p.evaluate("nikoPixelDelta('ring')");assert delta>60,(mode,'command wave visible pixels',delta);await p.screenshot(path=str(ART/f'nikolai-{mode}-command-wave.png'));await p.evaluate('advance(.42)');health=await p.evaluate('__moba.game.player.hp');assert health>500;await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'nikolai-{mode}-command-heal.png'));until=await p.evaluate('__moba.game.player.state.nikolaiCommand.until')
   await tap('#q-btn');result=await p.evaluate("({mode:__moba.game.player.state.nikolaiOrders[__moba.game.player.id].mode,until:__moba.game.player.state.nikolaiCommand.until})");assert result=={'mode':'power','until':until},(mode,result)
   await p.wait_for_timeout(100);colors=await p.evaluate('nikoFrame()');assert colors.get('#ffb55c',0)>0 and colors.get('#ffe4ad',0)>0,(mode,'electric recast drawn',colors);await p.screenshot(path=str(ART/f'nikolai-{mode}-command-power.png'))
   await p.evaluate("()=>{const g=__moba.game,p=g.player;foe.x=44;g.input.aim={x:44,y:20};p.rCd=0;window.decoy=target(42,18);decoy.hp=50000;}")
   await p.evaluate('window.selectedR='+('foe'if mobile else'decoy'))
   if mobile:await tap('#r-btn')
   else:
    await p.keyboard.press('Space');assert await p.evaluate("__moba.game.targeting?.slot==='r'&&__moba.game.player.rCd===0"),(mode,'target selection begins')
    blank=await p.evaluate('()=>{const r=__moba.renderer,p=__moba.game.player,q=r.camera.worldToScreen({x:p.x-4,y:p.y+3}),b=r.canvas.getBoundingClientRect();return{x:q.x+b.left,y:q.y+b.top}}');await p.mouse.click(blank['x'],blank['y']);assert await p.evaluate("__moba.game.targeting?.slot==='r'&&__moba.game.player.rCd===0"),(mode,'empty click does not cast')
    point=await p.evaluate('()=>{const r=__moba.renderer,q=r.camera.worldToScreen(selectedR,2),b=r.canvas.getBoundingClientRect();return{x:q.x+b.left,y:q.y+b.top}}');await p.mouse.click(point['x'],point['y'])
   result=await p.evaluate("({direct:__moba.game.projectiles.length===0,target:__moba.game.effects.find(f=>f.type==='nikolaiDisposal')?.target,expected:selectedR.id,stunned:__moba.game.stat(selectedR,'stun')>0})");assert result['direct'] and result['stunned'] and result['target']==result['expected'],(mode,'direct ultimate input and mobile marked priority',result)
   await p.evaluate('advance(.06)');await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'nikolai-{mode}-disposal-wave.png'));await p.evaluate('advance(.10)');await p.wait_for_timeout(120)
   result=await p.evaluate("({cuts:__moba.game.effects.filter(f=>f.type==='nikolaiCut').length,exposed:selectedR.exposedUntil>__moba.game.time,debuff:Boolean(selectedR.state.nikolaiDisposals[__moba.game.player.id])})");assert result['cuts']==4 and result['exposed'] and result['debuff'],(mode,result);colors=await p.evaluate('nikoFrame()');assert colors.get('#ffac53',0)>=4,(mode,'all four cuts drawn',colors);await p.screenshot(path=str(ART/f'nikolai-{mode}-disposal-mark.png'))
   assert not errors,(mode,errors)
   await p.goto(base+'#codex/champions',wait_until='networkidle',timeout=90000);await p.reload(wait_until='networkidle',timeout=90000);await p.click('#roster-list [data-key=nikolai]');assert await p.locator('#archive-role').inner_text()=='지원 · 암살';assert '2,200' in await p.locator('#roster-detail').inner_text()
   for i,name in enumerate(['R사 제4무리 사령관','갈무리','전투 지휘','처분']):
    await p.click(f'#skill-tab-{i}');await p.click('[data-description-mode=details]');text=await p.locator('#skill-description').inner_text();assert name in text,(mode,i,text)
   await p.screenshot(path=str(ART/f'nikolai-{mode}-codex.png'));assert not errors,(mode,errors);assert not external,external;print(mode+': visible wave/ring pixels, recast effects, direct champion selection, marked mobile priority and 2200 HP codex passed.',flush=True);await ctx.close();await b.close()
asyncio.run(main())
