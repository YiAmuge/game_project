"""Real mobile controls, persisted layout, shop taps, quick pings and PC fallback."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.getenv('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for mobile in [True,False]:
  ctx=b.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 950},is_mobile=mobile,has_touch=mobile);p=ctx.new_page();errors=[];external=[];session=None
  p.on('pageerror',lambda e:(errors.append(str(e)),print(e.stack,flush=True)))
  if offline:
   html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)')
   def route(r):
    if r.request.url=='http://city-border.offline/':r.fulfill(status=200,content_type='text/html',body=html)
    else:external.append(r.request.url);r.abort()
   p.route('**/*',route);url='http://city-border.offline/'
  else:url='http://127.0.0.1:5180/?debug=1'
  p.goto(url,wait_until='networkidle',timeout=60000)
  def tap(s):
   if mobile and session:
    expect(p.locator(s)).to_be_visible();expect(p.locator(s)).to_be_enabled();r=p.locator(s).bounding_box();touch('touchStart',99,r['x']+r['width']/2,r['y']+r['height']/2);up(99)
   elif mobile:p.tap(s)
   else:p.click(s)
   p.wait_for_timeout(65)
  def inside(s):
   r=p.locator(s).bounding_box();assert r and r['x']>=0 and r['y']>=0 and r['x']+r['width']<=p.viewport_size['width']+.5 and r['y']+r['height']<=p.viewport_size['height']+.5,(s,r)
  tap('#training-open');tap('.champion-option[data-key="faust"]');selected=p.locator('.champion-option.selected');expect(selected).to_have_attribute('data-key','faust');assert selected.evaluate('e=>getComputedStyle(e).animationName')=='pick-selection-glow';p.screenshot(path=str(art/f'v73-{"mobile"if mobile else"desktop"}-pick{suffix}.png'));tap('#start');p.wait_for_function('__moba.game.training')
  def freeze():
   p.evaluate('''()=>{const g=__moba.game;window.step73=g.step.bind(g);g.step=()=>{};g.practice.lineStopped=true;for(const f of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};}''')
  freeze()
  if mobile:
   session=ctx.new_cdp_session(p);touches={}
   def touch(kind,ident,x=None,y=None):
    if kind=='touchEnd':touches.pop(ident);points=list(touches.values())
    else:touches[ident]={'id':ident,'x':x,'y':y,'radiusX':5,'radiusY':5,'force':1};points=list(touches.values())
    session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
   def down(s,ident=1):
    r=p.locator(s).bounding_box();x,y=r['x']+r['width']/2,r['y']+r['height']/2;touch('touchStart',ident,x,y);return x,y
   def up(ident=1):touch('touchEnd',ident);p.wait_for_timeout(65)
   assert p.evaluate('__moba.mobile.layout.settings.joystick')=='floating';r=p.locator('#q-btn').bounding_box();assert 844-r['x']-r['width']>=60
   # A floating joystick starts at a free touch on the left side of the battlefield.
   assert p.evaluate('document.elementFromPoint(195,245).id')=='arena';touch('touchStart',1,195,245);assert p.evaluate('__moba.mobile.axes.x===0&&__moba.mobile.axes.y===0');touch('touchMove',1,235,245);p.wait_for_timeout(60);assert p.evaluate('__moba.mobile.axes.x>.8');up();assert p.evaluate('__moba.mobile.axes.x===0')
   # Rightward manual aiming now has room without reaching the screen edge.
   x,y=down('#q-btn',2);touch('touchMove',2,x+60,y);p.wait_for_timeout(220);assert p.evaluate('[...__moba.mobile.gestures.values()].some(s=>s.slot==="q"&&s.manual)');up(2)
   tap('#pause') if not p.evaluate('__moba.paused') else None;tap('#pause-controls');expect(p.locator('#mobile-layout-editor')).to_be_visible();tap('[data-joystick="fixed"]');assert p.evaluate('__moba.mobile.layout.draft.joystick')=='fixed';r=p.locator('.layout-target[data-control="q"]').bounding_box();x,y=r['x']+r['width']/2,r['y']+r['height']/2;touch('touchStart',3,x,y);touch('touchMove',3,x-35,y-25);up(3);tap('[data-layout="save"]');p.wait_for_function('__moba.mobile.layout.settings.joystick==="fixed"',timeout=1800);assert p.evaluate('__moba.mobile.layout.settings.joystick')=='fixed',p.evaluate('({settings:__moba.mobile.layout.settings,draft:__moba.mobile.layout.draft,editing:__moba.mobile.layout.editing})');saved=p.evaluate('JSON.parse(localStorage.getItem("city-border-mobile-layout-v1"))');assert 'q'in saved['positions'],saved;tap('#resume');inside('#q-btn')
   # Reload restores both the mode and the normalized custom button location.
   p.reload(wait_until='networkidle',timeout=60000);tap('#training-open');tap('#start');p.wait_for_function('__moba.game.training');freeze();assert p.evaluate('__moba.mobile.layout.settings.joystick')=='fixed';assert p.evaluate('__moba.mobile.layout.settings.positions.q')==saved['positions']['q']
   touch('touchStart',4,195,245);touch('touchMove',4,235,245);p.wait_for_timeout(50);assert p.evaluate('__moba.mobile.axes.x===0');up(4);x,y=down('#mobile-stick',5);touch('touchMove',5,x+35,y);assert p.evaluate('__moba.mobile.axes.x>.7');up(5)
   tap('#pause') if not p.evaluate('__moba.paused') else None;tap('#pause-controls');p.screenshot(path=str(art/f'v73-mobile-control-editor{suffix}.png'));tap('[data-layout="reset"]');tap('[data-layout="save"]');tap('#resume');assert p.evaluate('__moba.mobile.layout.settings.joystick')=='floating'
   # A quick ping samples the player's location at release, not the icon's screen coordinate.
   for n,kind in enumerate(['attack','defend','danger']):
    p.evaluate(f'__moba.game.time+=2;__moba.game.player.x={30+n};__moba.game.player.y=25');down(f'#ping-controls [data-ping="{kind}"]',6);p.evaluate('__moba.game.player.x+=1');up(6);assert p.evaluate('(()=>{const g=__moba.game,p=g.pings.at(-1);return p.x===g.player.x&&p.y===g.player.y;})()')
   # Holding without a selection still cancels instead of emitting a quick ping.
   count=p.evaluate('__moba.game.pings.length');down('#ping-controls [data-ping="attack"]',7);p.wait_for_timeout(310);up(7);assert p.evaluate('__moba.game.pings.length')==count
   for w,h in [(844,390),(667,375)]:
    p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(150);p.evaluate('''()=>{const e=__moba.game.player;e.augments=[];for(const k of Object.keys(e.upgrades))e.upgrades[k]=0;}''');tap('#shop-toggle');expect(p.locator('#shop')).to_have_attribute('data-mobile-section','upgrades');assert p.locator('#mobile-shop-tabs button').all_text_contents()==['강화시술','전투','생존','기술'];expect(p.locator('#mobile-shop-tabs [data-section="combat"]')).to_be_disabled();assert p.locator('[data-section="inventory"]').count()==0
    p.evaluate('''()=>{const e=__moba.game.player;for(const[k,v]of Object.entries({power:3,health:3,speed:2,reload:2,haste:2}))e.upgrades[k]=v;}''');p.wait_for_timeout(150)
    for group,key in [('combat','power15'),('survival','resentment'),('tech','highRisk')]:
     tap(f'#mobile-shop-tabs [data-section="{group}"]');assert p.locator(f'#mobile-shop-tabs [data-section="{group}"]').evaluate('e=>e.classList.contains("selected")&&e.classList.contains("category-unlocked")');tile=f'#select-augment-{key}';p.locator(tile).scroll_into_view_if_needed();tap(tile);assert not p.evaluate(f'__moba.game.player.augments.includes("{key}")');p.wait_for_timeout(380);tap(tile);p.wait_for_timeout(50);tap(tile);p.wait_for_function(f'__moba.game.player.augments.includes("{key}")');p.wait_for_timeout(300)
    expect(p.locator('#detail-effect .infiltration-description h4')).to_have_text('침투');lead=p.locator('#detail-effect .augment-lead').inner_text();assert '전투력 +5%'in lead and '1.75'not in lead;assert len(p.locator('.augment-group-grid:not(.hidden)').all())>=1;assert p.locator('.augment-category:not(.hidden) .augment-group-grid').first.evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length')==5
    inside('#mobile-shop-inventory');inside('#mobile-shop-gold');inside('#owned-list');inside('#detail-buy');owned=p.locator('#owned-list button').all();assert len(owned)==3;assert max(x.bounding_box()['y']for x in owned)-min(x.bounding_box()['y']for x in owned)<1;assert p.locator('#mobile-shop-gold').bounding_box()['x']<owned[0].bounding_box()['x'];p.screenshot(path=str(art/f'v73-mobile-shop-{w}{suffix}.png'));tap('#shop-close')
   # Static hidden shop rows do not receive repeated DOM writes during combat.
   p.evaluate('''()=>{window.shopMutations73=0;window.observer73=new MutationObserver(rows=>shopMutations73+=rows.length);observer73.observe(document.getElementById('augment-list'),{subtree:true,childList:true,characterData:true,attributes:true});}''');p.wait_for_timeout(550);assert p.evaluate('shopMutations73')==0;p.evaluate('observer73.disconnect()')
   # Context attack buttons share locked auto-hold and steerable charge rules.
   for key,category in [('jamila','champion'),('jamila','minion'),('jamila','structure'),('jamila','creep'),('ryoshu','champion'),('heathcliff','champion'),('rudolph','champion'),('hohenheim','champion')]:
    p.evaluate('''key=>{const g=__moba.game;__moba.mobile.cancel();g.player.player=false;g.player=g.makeChampion(key,0,0);const e=g.player;g.units=[e];Object.assign(e,{x:40,y:25,lastDamageAt:999,lastAttackAt:999});g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;g.input={x:0,y:0,fire:false,aim:{x:42,y:25}};const champion=g.makeChampion('faust',1,8);Object.assign(champion,{x:41.5,y:25,maxHp:100000,hp:100000});const minion=g.entity({kind:'minion',team:1,x:41.5,y:25,maxHp:100000});const structure=g.entity({kind:'tower',team:1,x:41.5,y:25,maxHp:100000,range:8.5});const creep=g.makeNeutral(41.5,25,'side');window.targets73={champion,minion,structure,creep};}''',key);p.wait_for_timeout(150)
    button=f'.mobile-target-btn[data-target-kind="{category}"]';x,y=down(button,11);p.wait_for_timeout(250);touch('touchMove',11,x-40,y-40);p.wait_for_timeout(80)
    if key=='hohenheim':assert p.evaluate('[...__moba.mobile.gestures.values()].some(s=>s.slot==="basic"&&s.manual)&&!!__moba.game.player.state.hohenCharge')
    else:
     assert p.evaluate(f'(()=>{{const g=__moba.game,s=[...__moba.mobile.gestures.values()].find(s=>s.slot==="basic");return s.autoHeld&&!s.manual&&s.category==="{category}"&&g.input.fire&&g.input.aim.x===targets73.{category}.x;}})()'),(key,category)
     p.evaluate(f'targets73.{category}.x+=.2');p.wait_for_timeout(80);assert p.evaluate(f'__moba.game.input.aim.x===targets73.{category}.x')
    up(11);assert p.evaluate('!__moba.game.input.fire')
   p.screenshot(path=str(art/f'v73-mobile-context-attack-rules{suffix}.png'))
  else:
   tap('#shop-toggle');expect(p.locator('#mobile-shop-tabs')).to_be_hidden();expect(p.locator('#shop-tabs')).to_be_visible();expect(p.locator('#mobile-shop-inventory')).to_be_hidden();p.evaluate('__moba.game.player.upgrades.haste=2;__moba.game.player.upgrades.speed=1');p.wait_for_timeout(160);tap('#shop-tabs [data-group="tech"]');tap('#select-augment-highRisk');expect(p.locator('#detail-effect h4')).to_have_text('침투');expect(p.locator('#detail-owned')).to_be_visible();p.screenshot(path=str(art/f'v73-desktop-shop{suffix}.png'))
  assert not errors,errors
  if offline:assert not external,external
  print(json.dumps({'mobile':mobile,'offline':offline,'errors':errors,'customControls':mobile,'shopMaxColumns':5 if mobile else None}),flush=True);ctx.close()
 b.close()
