"""Maxim art, crystal contact, PC hold and mobile joystick on live/offline builds."""
import asyncio,ast,os,re
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts/maxim';ART.mkdir(parents=True,exist_ok=True)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')
SETUP=next(ast.literal_eval(n.value)for n in ast.parse((ROOT/'tests/champion-refresh_browser.py').read_text()).body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='SETUP' for t in n.targets))
async def main():
 async with async_playwright()as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mode in os.getenv('MAXIM_BROWSER_MODES','desktop,mobile,offline').split(','):
   mobile=mode=='mobile';ctx=await b.new_context(viewport={'width':932 if mobile else 1440,'height':430 if mobile else 900},is_mobile=mobile,has_touch=mobile);page=await ctx.new_page();errors=[];external=[]
   page.on('pageerror',lambda e:errors.append(str(e)));await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=URL+('/dist/city-border.html?debug' if mode=='offline' else '/?debug')
   if mode=='offline':
    async def route(r):
     if r.request.url.split('#')[0]==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await page.route('**/*',route)
   await page.goto(url,wait_until='networkidle',timeout=90000)
   await page.click('#training-open');await page.get_by_role('button',name=re.compile('^막심 선택')).click();await page.screenshot(path=str(ART/f'{mode}-pick.png'));await page.click('#start')
   await page.wait_for_function("__moba.game.player.key==='maxim'&&__moba.renderer.atlasFor('maxim').naturalWidth>0&&__moba.renderer.scene25d.skin.ready")
   await page.evaluate(SETUP,'maxim');await page.wait_for_timeout(150)
   await expect(page.locator('#basic-btn span')).to_have_text('육중한 충돌');await page.screenshot(path=str(ART/f'{mode}-idle.png'))
   # Record actual draw matrices and the body-only orange glow pass.
   await page.evaluate('''()=>{const r=__moba.renderer,trail=r.weaponTrail.bind(r),draw=r.ctx.drawImage;window.maximTrace={};window.maximGlow=0;window.maximHands=0;window.maximCurrent=0;window.maximBody=null;window.maximHead=null;window.maximFrame=()=>{maximHands=0;maximCurrent=0;maximHead=null;r.draw(__moba.game,true);return {hands:maximHands,current:maximCurrent,head:maximHead,body:maximBody};};window.maximHud={};const fill=r.ctx.fillRect;r.ctx.fillRect=function(x,y,w,h){const matrix=this.getTransform(),top=matrix.transformPoint({x,y}).y,bottom=matrix.transformPoint({x,y:y+h}).y;if(this.fillStyle==='#f6ab4c'&&Math.abs(h-.13)<1e-6)maximHud.timer={top,bottom,width:w};if(this.fillStyle==='#312116'&&Math.abs(h-.13)<1e-6)maximHud.background=w;if(this.fillStyle==='#f2d07c'&&Math.abs(h-.15)<1e-6)maximHud.ammoBottom=bottom;return fill.apply(this,arguments);};r.weaponTrail=function(e,g,part,...args){if(e===g.player){const m=this.ctx.getTransform();maximTrace[part]={a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f};}return trail(e,g,part,...args);};r.ctx.drawImage=function(...args){if(args[0].dataset?.gripMaterial==='black')maximHands++;if(args[0].dataset?.maximCurrent)maximCurrent++;if(args.length===9&&args[1]===351&&args[2]===448)maximHead={x:args[5],y:args[6],width:args[7]/args[3],height:args[8]/args[4]};if(args.length===9&&args[1]===8&&args[2]===8&&args[3]===284&&args[4]===432){const m=this.getTransform();maximBody={a:m.a,b:m.b,c:m.c,d:m.d};}if(this.globalCompositeOperation==='screen'&&this.shadowColor==='#f5a13d')maximGlow++;return draw.apply(this,args);};}''')
   idle=await page.evaluate('maximFrame()');assert idle['hands']==1 and idle['current']==0,(mode,idle)
   await expect(page.locator('#basic-btn small')).to_have_text('망치 2 · 돌진 4.5')
   await page.evaluate("()=>{const g=__moba.game;g.attack(g.player,{x:41,y:20});advance(.04);}");await page.wait_for_timeout(100);assert await page.evaluate("Boolean(maximTrace['maxim-sweep'])");await page.screenshot(path=str(ART/f'{mode}-sweep.png'))
   await page.evaluate(SETUP,'maxim');await page.evaluate("()=>{const g=__moba.game;g.attack(g.player,{x:44.5,y:20});advance(.06);}");await page.wait_for_timeout(100);assert await page.evaluate("Boolean(maximTrace['maxim-ram'])");assert (await page.evaluate('maximFrame()'))['hands']==1;await page.screenshot(path=str(ART/f'{mode}-ram.png'))
   await page.evaluate(SETUP,'maxim');await page.evaluate("()=>{__moba.game.input.aim={x:90,y:20};}")
   if mobile:
    box=await page.locator('#q-btn').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;cdp=await ctx.new_cdp_session(page)
    async def touch(kind,points):await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
    await touch('touchStart',[{'x':x,'y':y,'id':7}]);await page.wait_for_timeout(60)
    assert await page.evaluate('Boolean(__moba.game.player.state.maximQ)'),(mode,'touch start')
    await touch('touchMove',[{'x':x,'y':y-75,'id':7}]);await page.wait_for_timeout(60)
    before=await page.evaluate('({x:__moba.game.player.x,y:__moba.game.player.y})')
    for _ in range(12):await page.evaluate('advance(.03)');await page.wait_for_timeout(25)
    after=await page.evaluate('({x:__moba.game.player.x,y:__moba.game.player.y})');assert abs(after['y']-before['y'])>.5,(before,after)
    await page.screenshot(path=str(ART/f'{mode}-rush.png'));await touch('touchEnd',[])
   else:
    box=await page.locator('#q-btn').bounding_box();await page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);await page.mouse.down()
    assert await page.evaluate('Boolean(__moba.game.player.state.maximQ)'),(mode,'pointer start')
    for _ in range(12):await page.evaluate('advance(.03)');await page.wait_for_timeout(25)
    await page.screenshot(path=str(ART/f'{mode}-rush.png'));await page.mouse.up()
   gauge=await page.evaluate('maximHud');assert gauge['timer']['top']>gauge['ammoBottom'],(mode,gauge);assert .94<gauge['timer']['width']/gauge['background']<.97,(mode,gauge)
   await page.wait_for_timeout(70);assert await page.evaluate('!__moba.game.player.state.maximQ'),(mode,'release')
   assert await page.evaluate('maximGlow>0'),(mode,'orange glow pass')
   assert await page.evaluate('__moba.renderer.scene25d.dashTrails.histories.get(__moba.game.player).samples.length>=5'),(mode,'afterimages')
   # Exact charge, collision circle, slam and fan/electric rendering.
   await page.evaluate(SETUP,'maxim');await page.evaluate("()=>{const g=__moba.game;target(48);g.cast(g.player,'r',{x:52,y:20});advance(.80);}");await page.wait_for_timeout(90);await page.screenshot(path=str(ART/f'{mode}-raise.png'));assert await page.evaluate("Boolean(maximTrace['maxim-raise'])")
   raised=await page.evaluate('maximFrame()');assert raised['hands']==2 and raised['current']>0,(mode,raised);assert abs(raised['head']['width']-1.2)<1e-6 and abs(raised['head']['height']-1.2)<1e-6,(mode,raised);assert abs(raised['body']['c'])<1e-6 and abs(raised['body']['b'])<1e-6,(mode,raised)
   await page.evaluate('advance(.2)');await page.wait_for_timeout(90);await page.screenshot(path=str(ART/f'{mode}-slam.png'));assert await page.evaluate("Boolean(maximTrace['maxim-slam'])&&__moba.game.effects.some(f=>f.type==='maximEarth')")
   await page.evaluate('advance(.15)');await page.wait_for_timeout(90);await page.screenshot(path=str(ART/f'{mode}-shockwave.png'))
   await page.evaluate('advance(.2)');restored=await page.evaluate('maximFrame()');assert restored['hands']==1 and restored['current']==0,(mode,restored)
   assert not errors,(mode,errors);assert not external,external
   await page.goto(url+'#codex/champions',wait_until='networkidle');await page.reload(wait_until='networkidle');await page.click('#roster-list [data-key=maxim]');await page.click('[data-description-mode=details]')
   for i,name in enumerate(['Rhino 시술','육중한 충돌','코뿔소 돌진','대지 강타']):
    await page.click(f'#skill-tab-{i}');assert name in await page.locator('#skill-description').inner_text()
   await page.click('#skill-tab-2');qtext=await page.locator('#skill-description').inner_text();assert '7초' in qtext and '300%' in qtext and '0.05' not in qtext,qtext
   await page.click('#skill-tab-3');assert '1초간' in await page.locator('#skill-description').inner_text()
   await page.click('#roster-list [data-key=gregor]');await expect(page.locator('#archive-role')).to_have_text('보호')
   await page.screenshot(path=str(ART/f'{mode}-codex.png'));assert not errors,(mode,errors);assert not external,external
   print(mode+': single/two hands, enlarged electric head, fixed body, both basic ranges, held steering/release, timer, crystal slam and codex passed.',flush=True);await ctx.close()
  await b.close()
asyncio.run(main())
