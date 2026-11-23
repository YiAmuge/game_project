"""Real PC/mobile selection and charged fire, visible 2.5D VFX and offline codex."""
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
   await p.goto(base,wait_until='networkidle',timeout=90000);await p.wait_for_function('window.__moba');await p.click('#training-open');await p.get_by_role('button',name=re.compile('^데니스 선택')).click();await p.click('#start');await p.wait_for_function("__moba.game.player.key==='denis'&&__moba.renderer.atlasFor('denis').naturalWidth>0&&__moba.renderer.scene25d.skin.ready");await p.evaluate(SETUP,'denis');await p.wait_for_timeout(150);cdp=await ctx.new_cdp_session(p)
   async def touch(kind,x=0,y=0):await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[]if kind=='touchEnd'else[{'x':x,'y':y}]})
   box=await p.locator('#q-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
   if mobile:await touch('touchStart',x,y);await touch('touchMove',x-65,y);await touch('touchEnd')
   else:await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x-65,y,steps=4);await p.mouse.up()
   await p.wait_for_timeout(100);assert await p.evaluate("__moba.game.player.state.denisRound==='fire'"),(mode,'Q selection');assert await p.locator('#q-btn').is_disabled();await p.screenshot(path=str(ART/f'denis-{mode}-loaded.png'))
   await p.evaluate('window.enemy=target(46,20);__moba.game.input.aim={x:46,y:20}')
   if mobile:
    box=await p.locator('#basic-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;await touch('touchStart',x,y)
   else:
    pos=await p.evaluate('__moba.renderer.camera.worldToScreen(enemy,0)');await p.mouse.move(pos['x'],pos['y']);await p.mouse.down()
   await p.wait_for_timeout(100);assert await p.evaluate('Boolean(__moba.game.player.state.denisCharge)'),(mode,'hold starts charge');await p.evaluate('advance(1.01)')
   if mobile:await touch('touchEnd')
   else:await p.mouse.up()
   await p.wait_for_timeout(100);assert await p.evaluate('Boolean(__moba.game.player.state.denisBurst)'),(mode,'release starts barrage');assert await p.evaluate('__moba.game.player.ammo===2');await p.evaluate('advance(.08)');await p.wait_for_timeout(80);await p.screenshot(path=str(ART/f'denis-{mode}-burst.png'))
   # Pixel delta proves the actual Renderer25D pass draws the bullet and expression.
   pixels=await p.evaluate("""()=>{const g=__moba.game,r=__moba.renderer,c=r.ctx,projectiles=g.projectiles,burst=g.player.state.denisBurst;r.draw(g,true);const a=c.getImageData(0,0,r.canvas.width,r.canvas.height).data;g.projectiles=[];delete g.player.state.denisBurst;r.draw(g,true);const z=c.getImageData(0,0,r.canvas.width,r.canvas.height).data;g.projectiles=projectiles;g.player.state.denisBurst=burst;let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-z[i])+Math.abs(a[i+1]-z[i+1])+Math.abs(a[i+2]-z[i+2])>30)n++;r.draw(g,true);return n;}""")
   assert pixels>12,(mode,'visible bullet/expression',pixels)
   await p.evaluate('advance(1.2)');assert await p.evaluate('Boolean(enemy.denisBurns&&enemy.denisBurns[__moba.game.player.id])'),(mode,'same-target hits burn');assert await p.evaluate("__moba.game.buff(__moba.game.player,'denisReload')")
   await p.evaluate("__moba.game.player.rCd=0;window.shockTarget=target(48,23);__moba.game.cast(__moba.game.player,'r',shockTarget);advance(.06)");await p.wait_for_timeout(100);await p.screenshot(path=str(ART/f'denis-{mode}-shock.png'));assert await p.evaluate('__moba.game.projectiles.some(p=>p.denisShock)')
   # Verify muzzle sprites are emitted at the rifle endpoint in the running renderer.
   assert await p.evaluate("__moba.renderer.scene25d.vfx.emitters.some(e=>e.muzzle==='lca')"),(mode,'muzzle flash')
   await p.goto(base+'#codex/champions',wait_until='networkidle',timeout=90000);await p.reload(wait_until='networkidle',timeout=90000);await p.click('#roster-list [data-key=denis]');text=await p.locator('#roster-detail').inner_text();assert '2,600' in text;assert await p.locator('#archive-role').inner_text()=='저격';assert not errors,(mode,errors);assert not external,(mode,external);print(mode,'passed; visible changed pixels',pixels,flush=True);await b.close()
asyncio.run(main())
