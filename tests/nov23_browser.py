"""Actual PC/mobile/offline form selection, updated targeting and current codex."""
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
   await p.goto(base,wait_until='networkidle',timeout=90000);await p.wait_for_function('window.__moba');await p.click('#training-open');await p.get_by_role('button',name=re.compile('^뿌이 선택')).click();await p.click('#start');await p.wait_for_function('__moba.renderer.scene25d.skin.ready');await p.evaluate(SETUP,'ppui');await p.wait_for_timeout(200);cdp=await ctx.new_cdp_session(p)
   async def touch(kind,x=0,y=0):await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[]if kind=='touchEnd'else[{'x':x,'y':y}]})
   async def tap(selector):
    if not mobile:await p.click(selector);return
    box=await p.locator(selector).bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;await touch('touchStart',x,y);await touch('touchEnd')
   await p.evaluate("()=>{const g=__moba.game,e=g.player;g.buyAugment(e,'goldenBough');e.ppuiHealing=100000;}");await p.wait_for_timeout(100);box=await p.locator('#recall-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
   if mobile:await touch('touchStart',x,y);await touch('touchMove',x,y+28)
   else:await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y+28,steps=4)
   assert await p.locator('#recall-choice [data-choice=buffet]').is_visible();assert 'selected' in (await p.locator('#recall-choice [data-choice=buffet]').get_attribute('class')or'');await p.screenshot(path=str(ART/f'nov23-{mode}-buffet-choice.png'))
   if mobile:await touch('touchEnd')
   else:await p.mouse.up()
   assert await p.evaluate('Boolean(__moba.game.player.state.buffetAwakening)');await p.evaluate('advance(.75)');await p.wait_for_timeout(80);await p.screenshot(path=str(ART/f'nov23-{mode}-awakening.png'));await p.evaluate('advance(.76)');await p.wait_for_function("__moba.game.player.buffet&&__moba.renderer.atlasFor('buffet').naturalWidth>0");await p.wait_for_function("document.querySelector('#player-name').textContent.includes('뷔페')")
   if not mobile:
    await p.keyboard.down('Tab');assert await p.locator('#scoreboard .score-champion small').first.inner_text()=='뷔페';await p.keyboard.up('Tab')
   await p.evaluate('window.enemy=target(44,20);__moba.game.player.hp=500;__moba.game.input.aim={x:44,y:20};__moba.game.attack(__moba.game.player,enemy);advance(.035)');await p.wait_for_timeout(80);await p.screenshot(path=str(ART/f'nov23-{mode}-buffet-whip.png'))
   pixels=await p.evaluate("""()=>{const r=__moba.renderer,g=__moba.game,c=r.ctx,fx=g.effects;r.draw(g,true);const a=c.getImageData(0,0,r.canvas.width,r.canvas.height).data;g.effects=[];r.draw(g,true);const z=c.getImageData(0,0,r.canvas.width,r.canvas.height).data;g.effects=fx;let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-z[i])+Math.abs(a[i+1]-z[i+1])+Math.abs(a[i+2]-z[i+2])>30)n++;r.draw(g,true);return n;}""");assert pixels>40,(mode,'visible fan',pixels)
   await p.evaluate('advance(.2)');await tap('#q-btn');assert await p.evaluate('Boolean(__moba.game.player.state.buffetQ)');await p.evaluate('advance(.15)');await p.wait_for_timeout(60);await p.screenshot(path=str(ART/f'nov23-{mode}-buffet-charge.png'));await p.evaluate('advance(.17)');await p.wait_for_timeout(60);assert await p.evaluate("__moba.game.effects.some(f=>f.type==='buffetNail')");await p.screenshot(path=str(ART/f'nov23-{mode}-buffet-nail.png'))
   await tap('#r-btn');await p.evaluate('advance(.075)');await p.wait_for_timeout(80);assert await p.evaluate('Boolean(__moba.game.player.state.buffetR)');assert await p.evaluate('__moba.game.player.rCd>40');await p.screenshot(path=str(ART/f'nov23-{mode}-buffet-ultimate.png'));await tap('#r-btn');assert await p.evaluate('!__moba.game.player.state.buffetR');await p.evaluate('advance(.08)');await p.wait_for_timeout(60);await p.screenshot(path=str(ART/f'nov23-{mode}-buffet-wave.png'))
   # Nikolai's R immediately chooses the cursor/automatic target, without another click.
   await p.evaluate(SETUP,'nikolai');await p.evaluate('window.enemy=target(46,20);__moba.game.deal(__moba.game.player,enemy,1,{fixed:true})');await p.wait_for_timeout(150);await p.screenshot(path=str(ART/f'nov23-{mode}-nikolai-glow.png'))
   if mobile:await tap('#r-btn')
   else:
    at=await p.evaluate('__moba.renderer.camera.worldToScreen(enemy,1)');await p.mouse.move(at['x'],at['y']);await p.keyboard.press('Space')
   assert await p.evaluate('Boolean(enemy.state.nikolaiDisposals)'),(mode,'instant target');assert await p.evaluate('!__moba.game.targeting');await tap('#q-btn');await p.evaluate('advance(1)');await tap('#q-btn');assert await p.evaluate('Math.abs(__moba.game.player.state.nikolaiCommand.until-__moba.game.time-5)<.001')
   await p.evaluate(SETUP,'starbuck');await p.evaluate('window.enemy=target(44,20)');await p.wait_for_timeout(100)
   for i in range(5):
    await tap('#q-btn')
    if not mobile:
     at=await p.evaluate('__moba.renderer.camera.worldToScreen({x:42,y:20},0)');await p.mouse.click(at['x'],at['y'])
    await p.evaluate('advance(.03)')
   assert await p.evaluate('!__moba.game.player.state.starbuckChain&&__moba.game.player.qCd>0');assert await p.evaluate('enemy.hp<100000');await p.screenshot(path=str(ART/f'nov23-{mode}-starbuck.png'))
   await p.goto(base+'#codex/champions',wait_until='networkidle',timeout=90000);await p.reload(wait_until='networkidle',timeout=90000);await p.click('#roster-list [data-key=ppui]');await p.click('[data-form=transformed]');assert '뷔페' in await p.locator('#archive-name').inner_text();assert '2,900' in await p.locator('#roster-detail').inner_text();await p.click('#skill-tab-3');assert '라 카타스트라시웅' in await p.locator('#skill-description').inner_text();await p.screenshot(path=str(ART/f'nov23-{mode}-buffet-codex.png'));assert not errors,(mode,errors);assert not external,(mode,external);print(mode,'passed; visible fan pixels',pixels,flush=True);await b.close()
asyncio.run(main())
