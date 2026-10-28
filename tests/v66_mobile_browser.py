"""Actual touch: app navigation, armed codex, shop, moving aim and held fire."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.getenv('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':844,'height':390},is_mobile=True,has_touch=True);errors=[];requests=[]
 p.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',e.stack,flush=True)));p.on('request',lambda r:requests.append(r.url))
 if offline:
  p.route('http*://**/*',lambda r:r.abort());p.set_content((root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)'),wait_until='networkidle',timeout=60000)
 else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
 def inside(selector):
  r=p.locator(selector).bounding_box();assert r and r['x']>=0 and r['y']>=0 and r['x']+r['width']<=p.viewport_size['width']+.5 and r['y']+r['height']<=p.viewport_size['height']+.5,(selector,r)
 def back():p.evaluate('history.back()');p.wait_for_timeout(180)
 inside('#mobile-fullscreen');assert p.locator('#mobile-fullscreen svg').evaluate('(s)=>{const a=s.getBoundingClientRect(),b=s.parentElement.getBoundingClientRect();return a.left>=b.left+3&&a.top>=b.top+3&&a.right<=b.right-3&&a.bottom<=b.bottom-3&&Math.abs(a.x+a.width/2-b.x-b.width/2)<1;}');p.screenshot(path=str(art/f'v66-mobile-menu{suffix}.png'))
 p.tap('#menu-codex');p.wait_for_function('document.querySelector("#archive-body").dataset.pose==="basic"');p.screenshot(path=str(art/f'v66-mobile-codex{suffix}.png'))
 assert p.evaluate('!document.fullscreenEnabled||!!document.fullscreenElement')
 # Every equipped champion, including both transformed forms, fits the canvas.
 results=p.evaluate('''()=>{const screen=__moba.codex,keys=[...document.querySelectorAll('.archive-champion')].map(b=>b.dataset.key),out=[];for(const key of keys){screen.key=key;for(const transformed of(key==='sora'||key==='yan'?[false,true]:[false])){screen.transformed=transformed;screen.skill=0;screen.championDetail();const c=document.getElementById('archive-body'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0,edge=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]){count++;if(x<3||y<3||x>=c.width-3||y>=c.height-3)edge++;}out.push({key,transformed,count,edge,pose:c.dataset.pose});}}screen.key='faust';screen.transformed=false;screen.championDetail();return out;}''')
 assert len(results)==32 and all(r['count']>500 and r['edge']==0 and r['pose']=='basic'for r in results),results
 for category,selector in [('monsters','.monster-detail'),('augments','.augment-guide-detail'),('rules','#codex-body')]:
  p.tap(f'#codex-tabs [data-category="{category}"]');inside(selector);assert p.locator('#codex-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
 back();assert p.evaluate('__moba.mode')=='menu'
 p.tap('#practice-open');inside('#start');p.set_viewport_size({'width':667,'height':375});p.wait_for_timeout(150);inside('#start');inside('#champion-select')
 start=p.locator('#start').bounding_box()['y'];assert p.locator('#champion-select').evaluate('(e)=>{e.scrollTop=e.scrollHeight;return e.scrollTop>0;}');assert p.locator('#start').bounding_box()['y']==start
 p.tap('.pick-slot[data-team="1"][data-position="top"]');p.tap('#pick-none');assert p.evaluate('__moba.draft.value()[1].top')is None
 p.screenshot(path=str(art/f'v66-mobile-pick-small{suffix}.png'));back();assert p.evaluate('__moba.mode')=='menu'
 p.set_viewport_size({'width':844,'height':390});p.tap('#training-open');p.tap('.champion-option[data-key="jamila"]');p.tap('#start');p.wait_for_function('__moba.game.training');p.wait_for_timeout(150)
 p.evaluate('''()=>{const g=__moba.game;window.step66=g.step.bind(g);g.step=()=>{};window.advance66=s=>{for(let i=0;i<Math.round(s*120);i++)step66(1/120);};
 window.fixture66=key=>{const g=__moba.game;__moba.mobile.cancel();if(key&&g.player.key!==key){g.player.player=false;g.player=g.makeChampion(key,0,0,'bottom');}const p=g.player;g.time+=20;g.units=[p];g.events=[];g.effects=[];g.pending=[];g.projectiles=[];g.zones=[];g.corpses=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,hp:p.maxHp,ammo:g.ammoCap(p),state:{},status:{},shields:[],buffs:{},buffHistory:{},buffPotency:{},visuals:{},attackAt:-99,attackSerial:0,attackCd:0,qCd:0,rCd:0,lastAttackAt:999,lastDamageAt:999,channelUntil:0,augments:[]});delete p.motion;delete p.recall;g.input={x:0,y:0,aim:{x:40.15,y:25},fire:false};__moba.mobile.lastTap=-Infinity;};
 window.enemy66=(x=44,y=25,hp=10000)=>{const g=__moba.game,t=g.makeChampion('yi',1,g.nextId+20);Object.assign(t,{x,y,hp,maxHp:100000,armor:0,lastAttackAt:999,lastDamageAt:999});return t;};fixture66('jamila');}''')
 session=p.context.new_cdp_session(p);touches={}
 def touch(kind,ident,x=None,y=None):
  if kind!='touchEnd':touches[ident]={'id':ident,'x':x,'y':y,'radiusX':5,'radiusY':5,'force':1};points=list(touches.values())
  else:points=[touches.pop(ident)]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def down(selector,ident=1):
  r=p.locator(selector).bounding_box();x,y=r['x']+r['width']/2,r['y']+r['height']/2;touch('touchStart',ident,x,y);return x,y
 def up(ident=1):touch('touchEnd',ident)
 def tap(selector,ident=1):down(selector,ident);up(ident);p.wait_for_timeout(60)
 # A targetless movement skill follows the moving joystick, then remembers that
 # direction after release. Available targets override travel direction.
 p.evaluate('fixture66("ryoshu");__moba.game.player.facing=0');x,y=down('#mobile-stick',60);touch('touchMove',60,x,y+38);p.wait_for_timeout(70);tap('#q-btn',61);assert p.evaluate('Math.abs(__moba.game.player.visualCast.angle-Math.PI/2)<1e-6');up(60)
 p.evaluate('delete __moba.game.player.motion;__moba.game.player.qCd=0;__moba.game.player.facing=0');tap('#q-btn',62);assert p.evaluate('Math.abs(__moba.game.player.visualCast.angle-Math.PI/2)<1e-6')
 p.evaluate('fixture66("ryoshu");window.close66=enemy66(41.5,25)');tap('#q-btn',63);assert p.evaluate('Math.abs(__moba.game.player.visualCast.angle)<1e-6')
 p.evaluate('fixture66("sinclair")');x,y=down('#mobile-stick',64);touch('touchMove',64,x-35,y);p.wait_for_timeout(70);tap('#r-btn',65);assert p.evaluate('Math.abs(Math.abs(__moba.game.player.visualCast.angle)-Math.PI)<1e-6');up(64)
 print('movement-directed dash / last travel / target override PASS',flush=True)
 # Short slides and off-center presses always autoaim, without touching manual aim.
 p.evaluate('fixture66("jamila");window.target66=enemy66(44,25);window.other66=enemy66(43,27,20000)')
 x,y=down('#basic-btn',10);touch('touchMove',10,x-45,y-30);p.wait_for_timeout(45);assert p.evaluate('[...__moba.mobile.gestures.values()][0].manual===false');up(10);assert p.evaluate('__moba.game.input.aim.x===target66.x&&__moba.game.input.aim.y===target66.y&&__moba.game.player.attackSerial===1')
 print('short-touch autoaim PASS',flush=True)
 # Every continuous attacker ignores finger movement after an auto lock, tracks outside
 # range and resumes damaging the same target on reentry without another press.
 for index,key in enumerate(['jamila','ryoshu','heathcliff','rudolph']):
  p.evaluate(f'fixture66("{key}");window.target66=enemy66(41.6,25,10000);window.other66=enemy66(41.5,26,20000)')
  x,y=down('#basic-btn',20+index);p.wait_for_timeout(230);touch('touchMove',20+index,x-65,y-60);p.wait_for_timeout(60)
  assert p.evaluate('__moba.game.input.fire&&__moba.game.mobileAim.autoTarget===target66.id&&[...__moba.mobile.gestures.values()][0].manual===false'),key
  p.evaluate('target66.x=60;target66.y=28;other66.hp=1');p.wait_for_timeout(70);assert p.evaluate('__moba.game.input.fire&&__moba.game.mobileAim.autoTarget===target66.id&&__moba.game.input.aim.x===60&&__moba.game.input.aim.y===28'),key
  p.evaluate('advance66(.7);window.before66=target66.hp;target66.x=41.6;target66.y=25');p.wait_for_timeout(65);p.evaluate('advance66(2.1)');assert p.evaluate('target66.hp<before66&&__moba.game.mobileAim.autoTarget===target66.id'),key
  up(20+index);assert not p.evaluate('__moba.game.input.fire')
 print('held lock / out-of-range / reentry PASS',flush=True)
 # Long presses whose drag begins immediately can still deliberately manual aim.
 p.evaluate('fixture66("jamila");enemy66()');x,y=down('#basic-btn',29);touch('touchMove',29,x-45,y-20);p.wait_for_timeout(220);assert p.evaluate('[...__moba.mobile.gestures.values()][0].manual&&!__moba.game.input.fire');up(29)
 # Charge targeting also follows an enemy outside range, permits late manual steering and
 # reacquires it on reentry. It never follows a target after that target loses vision.
 p.evaluate('fixture66("hohenheim");window.target66=enemy66(44,25);window.other66=enemy66(43,27,20000)');x,y=down('#basic-btn',30);p.wait_for_timeout(230);p.evaluate('target66.x=65;target66.y=29');p.wait_for_timeout(75);assert p.evaluate('!!__moba.game.player.state.hohenCharge&&__moba.game.mobileAim.autoTarget===target66.id&&__moba.game.input.aim.x===65&&![...__moba.mobile.gestures.values()][0].manual')
 p.evaluate('target66.x=44;target66.y=26');p.wait_for_timeout(65);assert p.evaluate('__moba.game.input.aim.x===44&&__moba.game.input.aim.y===26');touch('touchMove',30,x-50,y);p.wait_for_timeout(50);assert p.evaluate('[...__moba.mobile.gestures.values()][0].manual&&!__moba.game.mobileAim.autoTarget');p.evaluate('advance66(.4)');up(30);assert p.evaluate('__moba.game.player.attackSerial===1')
 p.evaluate('fixture66("don");window.target66=enemy66(44,25)');x,y=down('#q-btn',31);touch('touchMove',31,x-30,y+25);p.wait_for_timeout(50);assert p.evaluate('!!__moba.game.player.state.donCharge&&!__moba.mobile.gestures.values().next().value.manual&&__moba.game.input.aim.x===44');up(31)
 # Holding through Don's automatic discharge queues the next charge across its
 # entire cooldown, and releasing during cooldown does not attempt another cast.
 p.evaluate('fixture66("don");enemy66()');down('#q-btn',34);p.wait_for_timeout(35);p.evaluate('advance66(1.21)');p.wait_for_timeout(75);assert p.evaluate('!__moba.game.player.state.donCharge&&__moba.game.player.qCd>0&&__moba.mobile.gestures.size===1');p.evaluate('window.castBefore66=__moba.game.player.castSerial;advance66(__moba.game.player.qCd+.01)');p.wait_for_timeout(75);assert p.evaluate('!!__moba.game.player.state.donCharge&&__moba.game.player.castSerial===castBefore66+1');p.evaluate('advance66(1.21)');p.wait_for_timeout(65);assert p.evaluate('__moba.game.player.qCd>0&&!__moba.game.player.state.donCharge');up(34);assert p.evaluate('__moba.mobile.gestures.size===0')
 # Both kinds of charged basic and the other charged tactical buffer a fresh hold.
 for index,(key,slot,field)in enumerate([('hohenheim','basic','hohenCharge'),('yan','basic','yanCharge'),('heathcliff','q','chargeAt')]):
  p.evaluate(f'fixture66("{key}");enemy66()');down('#'+('basic'if slot=='basic'else'q')+'-btn',40+index);p.wait_for_timeout(35);p.evaluate('advance66(.2)');up(40+index)
  down('#'+('basic'if slot=='basic'else'q')+'-btn',43+index);p.wait_for_timeout(40);assert p.evaluate(f'__moba.game.player.state.{field}===undefined');p.evaluate('advance66(Math.max(__moba.game.player.attackCd,__moba.game.player.qCd)+.01)');p.wait_for_timeout(75);assert p.evaluate(f'__moba.game.player.state.{field}!==undefined'),key;p.evaluate('advance66(.1)');up(43+index)
 print('manual gesture / charged autoaim / buffered repeated charges PASS',flush=True)
 # A short targeted dash chooses the nearest foe even when another champion has less HP.
 p.evaluate('fixture66("ryoshu");window.close66=enemy66(41.5,25,9000);window.low66=enemy66(43,27,1)');tap('#q-btn');assert p.evaluate('Math.abs(__moba.game.player.visualCast.angle)<1e-6')
 # Out-of-range circles cast in the target direction with a legal center.
 p.evaluate('fixture66("yi");window.target66=enemy66(55,29)');tap('#q-btn');assert p.evaluate('__moba.game.player.qCd>0&&Math.abs(Math.hypot(__moba.game.zones[0].x-40,__moba.game.zones[0].y-25)-7)<1e-6&&__moba.game.zones[0].y>25')
 # Endpoint areas count for contextual buttons and continuous fire as well as tap.
 for key,radius in [('rudolph',2.1675),('marton',2.2)]:
  p.evaluate(f'fixture66("{key}");window.target66=enemy66(40+__moba.game.attackRange(__moba.game.player)+{radius}+.3)');p.wait_for_timeout(140);expect(p.locator('.mobile-target-btn[data-target-kind="champion"]')).to_be_visible();tap('#basic-btn');assert p.evaluate('target66.hp<10000'),key
 print('nearest movement / circle cast / endpoint areas PASS',flush=True)
 # The contextual arc distributes one to four buttons inside the left side, without
 # overlapping the basic, tactical, ultimate or recall buttons at either viewport.
 p.evaluate('fixture66("jamila");window.target66=enemy66(44,25);window.minion66=enemy66(43,26);minion66.kind="minion";window.creep66=__moba.game.makeNeutral(43,24,"central");window.tower66=__moba.game.entity({kind:"tower",team:1,x:45,y:25,maxHp:10000,radius:.75,range:6})')
 for width,height in [(844,390),(667,375)]:
  p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(160)
  for count in range(4,0,-1):
   p.evaluate(f'[target66,minion66,tower66,creep66].forEach((t,i)=>t.alive=i<{count});__moba.mobile.hud()');p.wait_for_timeout(50)
   assert p.locator('.mobile-target-btn:visible').count()==count
   result=p.evaluate("""()=>{const buttons=[...document.querySelectorAll('.mobile-target-btn:not(.hidden)')],skills=['basic','q','r','recall'].map(s=>document.getElementById(s+'-btn')),center=e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,r:r.width/2,box:r};},basic=center(skills[0]);return buttons.map(b=>{const c=center(b),others=[...buttons.filter(t=>t!==b),...skills].map(center);return{inside:c.box.left>=0&&c.box.top>=0&&c.box.bottom<=innerHeight&&c.box.right<=innerWidth,left:c.x<basic.x,clear:others.every(d=>Math.hypot(c.x-d.x,c.y-d.y)>c.r+d.r+1)};});}""")
   assert all(v['inside']and v['left']and v['clear']for v in result),(width,count,result)
   if width==844 and count==4:p.screenshot(path=str(art/f'v66-mobile-target-arc{suffix}.png'))
 p.set_viewport_size({'width':844,'height':390});p.evaluate('fixture66("ishmael");enemy66()');tap('#q-btn');p.wait_for_timeout(150);expect(p.locator('#q-btn')).to_have_class(__import__('re').compile('.*mobile-recast.*'));assert '재시전 가능'in p.locator('#q-btn').get_attribute('aria-label');p.screenshot(path=str(art/f'v66-mobile-recast{suffix}.png'));tap('#q-btn');p.wait_for_timeout(150);assert not p.locator('#q-btn').evaluate('(b)=>b.classList.contains("mobile-recast")')
 print('adaptive target arc / recast ring PASS',flush=True)
 # Supply always opens unfinished procedures; after all caps it opens all augments,
 # not the previously viewed group or inventory page.
 p.evaluate('fixture66("jamila")');tap('#shop-toggle');assert p.locator('#shop').get_attribute('data-mobile-section')=='upgrades';tap('#mobile-shop-tabs [data-section="augments"]');tap('#shop-close');tap('#shop-toggle');assert p.locator('#shop').get_attribute('data-mobile-section')=='upgrades';tap('#training-buy-procedures');p.wait_for_timeout(280);tap('#shop-close');tap('#shop-toggle');assert p.locator('#shop').get_attribute('data-mobile-section')=='augments';assert p.locator('#shop-tabs [data-group="all"]').get_attribute('aria-pressed')=='true'
 # Real native swipe over augment canvases scrolls without changing the selection.
 def swipe_icons(container,icon):
  p.locator(container).evaluate('(e)=>e.scrollTop=0');p.wait_for_timeout(80)
  box=p.locator(container).bounding_box();icons=p.locator(icon).all();visible=[a for a in icons if (r:=a.bounding_box())and r['y']>=box['y']and r['y']+r['height']<=box['y']+box['height']]
  assert visible,(container,box)
  r=visible[-1].bounding_box();x,y=r['x']+r['width']/2,r['y']+r['height']/2;touch('touchStart',90,x,y)
  for i in range(1,8):touch('touchMove',90,x,y-i*12);p.wait_for_timeout(25)
  touch('touchEnd',90);p.wait_for_timeout(180)
  assert p.locator(container).evaluate('(e)=>e.scrollTop>20'),(container,p.locator(container).evaluate('(e)=>({top:e.scrollTop,h:e.clientHeight,full:e.scrollHeight})'))
 down('#shop-title',91);tap('#select-augment-reloadStacks',92);up(91);selected=p.locator('#detail-name').inner_text();assert selected=='엄숙한 애도';swipe_icons('.shop-catalog','.augment-tile canvas');assert p.locator('#detail-name').inner_text()==selected
 # A tap still selects after a swipe, and purchases remain explicit.
 p.locator('#select-augment-reloadStacks').tap();assert p.locator('#detail-name').inner_text()==selected;tap('#shop-close')
 p.evaluate('__moba.mobile.api.back()');tap('#pause-archive');p.tap('#codex-tabs [data-category="champions"]');name=p.locator('#archive-name').inner_text();swipe_icons('#roster-list','.archive-champion canvas');assert p.locator('#archive-name').inner_text()==name;p.locator('.archive-champion[data-key="jamila"]').tap();assert p.locator('#archive-name').inner_text()=='자밀라'
 p.tap('#codex-tabs [data-category="augments"]');name=p.locator('.augment-guide-detail h2').inner_text();swipe_icons('.augment-guide-list','.augment-guide-choice canvas');assert p.locator('.augment-guide-detail h2').inner_text()==name;p.screenshot(path=str(art/f'v66-mobile-scroll-codex{suffix}.png'))
 # Both champion pickers also scroll when a swipe starts directly on a face icon.
 p.tap('#codex-back');tap('#resume');tap('#training-panel-toggle');p.locator('#training-change-champion').tap();name=p.locator('.training-pick-footer span').inner_text();swipe_icons('.training-pick-grid','.training-pick-option canvas');assert p.locator('.training-pick-footer span').inner_text()==name;p.locator('.training-pick-option[data-key="jamila"]').tap();assert '자밀라'in p.locator('.training-pick-footer span').inner_text();p.tap('#training-pick-close')
 p.evaluate('__moba.mobile.api.back()');tap('#leave');p.wait_for_timeout(100);key=p.evaluate('__moba.draft.playerKey');swipe_icons('#champion-select','.champion-option canvas');assert p.evaluate('__moba.draft.playerKey')==key;p.locator('.champion-option[data-key="jamila"]').tap();assert p.evaluate('__moba.draft.playerKey')=='jamila'
 print('shop default / real icon scrolling / tap separation PASS',flush=True)
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'offline':offline,'movementDirectedSkills':True,'tapOnlyAutoaim':True,'heldTargetLock':True,'outOfRangeAndReentry':True,'chargedTargetTracking':True,'bufferedRepeatedCharges':True,'nearestMovementAttack':True,'endpointReach':True,'adaptiveArc':True,'recastRing':True,'shopDefault':True,'iconScroll':True,'errors':errors}));b.close()
