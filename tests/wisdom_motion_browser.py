"""Wisdom timers and rendered weapon poses on desktop, touch and standalone HTML."""
import asyncio, ast, os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'
ART.mkdir(exist_ok=True)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')
# Reuse the arena fixture without executing the older browser suite.
SETUP=next(ast.literal_eval(n.value) for n in ast.parse((ROOT/'tests/champion-refresh_browser.py').read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SETUP' for t in n.targets))

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  errors=[]
  for mode in os.getenv('MOBA_BROWSER_MODES','desktop,mobile,offline').split(','):
   mobile=mode=='mobile'
   context=await browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   page=await context.new_page()
   page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   external=[]
   if mode=='offline':
    offline_url=URL+'/dist/city-border.html?debug'
    async def route(r):
     if r.request.url==offline_url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await page.route('**/*',route)
    await page.goto(offline_url,wait_until='networkidle',timeout=90000)
   else:await page.goto(URL+'/?debug')
   await page.wait_for_function('window.__moba')
   await page.click('#training-open');await page.click('#start')
   await page.wait_for_function('__moba.renderer.atlasV36.naturalWidth&&__moba.renderer.weaponAtlas.naturalWidth&&__moba.renderer.scene25d.skin.ready')
   await page.evaluate(SETUP,'ryoshu')
   result=await page.evaluate('''()=>{
    const g=__moba.game,p=g.player,t=target(47),hits=[],deal=g.deal.bind(g);p.augments=['wisdom'];
    g.deal=(s,t,n,o={})=>{if(o.augmentOrigin==='wisdom')hits.push({at:g.time,n,fixed:o.fixed});return deal(s,t,n,o);};
    g.deal(p,t,1,{fixed:true});g.cast(p,'q',{x:42,y:20});const first=p.state.wisdomReady;
    advance(.5);g.cast(p,'r',{x:44,y:20});const gated=p.state.wisdomReady;
    advance(.5);const count=hits.length;advance(1);p.qCd=0;g.cast(p,'q',{x:46,y:20});
    return{first,gated,after:p.state.wisdomReady,gate:p.state.wisdomMoveReady,count,hits};
   }''')
   assert abs(result['first']-9.5)<1e-6 and result['first']==result['gated'],result
   assert abs(result['after']-9.125)<1e-6 and abs(result['gate']-4)<1e-6,result
   assert result['count']==5 and all(abs(h['at']-(i+1)*.2)<.009 and h['fixed'] and abs(h['n']-314)<1e-6 for i,h in enumerate(result['hits'])),result
   await page.wait_for_timeout(100)
   title=await page.locator('#augment-tray [data-augment-key="wisdom"]').get_attribute('title')
   assert '2초마다 1회' in title and '0.2초' in title,title
   await page.screenshot(path=str(ART/f'wisdom-{mode}.png'))
   await page.evaluate('''()=>{
    const r=__moba.renderer,original=r.weaponTrail.bind(r);window.weaponSamples={};
    r.weaponTrail=function(e,g,part,...args){if(e===g.player){const m=this.ctx.getTransform();weaponSamples[part]={a:m.a,b:m.b,c:m.c,d:m.d,active:args[2]};}return original(e,g,part,...args);};
   }''')
   for key in ['faust','honglu','ezra','mei']:
    await page.evaluate(SETUP,key)
    await page.evaluate('''()=>{const g=__moba.game,p=g.player;if(p.key==='ezra')p.state.weapon=1;if(p.key==='mei'){p.attackAt=0;p.attackFacing=0;p.state.meiPunch={at:0,until:.15,index:0,last:false,angle:0};}else g.attack(p,g.input.aim); }''')
    frames=[]
    for time in ([.005,.06,.1,.149] if key=='mei' else [.005,.12,.2,.279 if key=='ezra' else .299]):
     await page.evaluate('(t)=>{__moba.game.time=t;window.weaponSamples={};}',time)
     await page.wait_for_timeout(90)
     frame=await page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer;return g.player.key==='mei'?r.meiTrails.get(g.player.id)?.at(-1):Object.values(weaponSamples)[0];}''')
     assert frame,(mode,key,time)
     frames.append(frame)
     if time in [.1,.2] and (mode=='desktop' or key=='honglu'):
      await page.screenshot(path=str(ART/f'weapon-hold-{mode}-{key}.png'))
    if key=='mei':
     assert all(abs(f['angle']-frames[1]['angle'])<1e-6 for f in frames[1:]),(mode,key,frames)
     assert abs(frames[0]['angle']-frames[1]['angle'])>.1,(mode,key,frames)
    else:
     for attr in ['a','b','c','d']:
      assert all(abs(f[attr]-frames[1][attr])<1e-6 for f in frames[1:]),(mode,key,attr,frames)
     assert any(abs(frames[0][attr]-frames[1][attr])>.01 for attr in ['a','b','c','d']),(mode,key,frames)
     assert all(f['active'] for f in frames),(mode,key,frames)
   await page.evaluate(SETUP,'kromer')
   await page.evaluate("()=>{const g=__moba.game,p=g.player,t=target(41.5);g.cast(p,'r',t);advance(.1);p.state.kromerStrikeAt=g.time;g.time+=.024;}")
   await page.wait_for_timeout(120)
   assert await page.evaluate('Boolean(__moba.game.player.state.kromerGrab)&&Number.isFinite(__moba.game.time)'),mode
   await page.screenshot(path=str(ART/f'weapon-impale-{mode}.png'))
   assert not external,external
   assert not errors,errors
   print(f'{mode}: Wisdom five ticks, shared 2s gate, tooltip and four rendered weapon holds plus Kromer impalement passed.',flush=True)
   await context.close()
  await browser.close()

asyncio.run(main())
