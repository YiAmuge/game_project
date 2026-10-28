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
 inside('#mobile-fullscreen');assert p.locator('#mobile-fullscreen svg').evaluate('(s)=>{const a=s.getBoundingClientRect(),b=s.parentElement.getBoundingClientRect();return a.left>=b.left+3&&a.top>=b.top+3&&a.right<=b.right-3&&a.bottom<=b.bottom-3&&Math.abs(a.x+a.width/2-b.x-b.width/2)<1;}');p.screenshot(path=str(art/f'v68-mobile-menu{suffix}.png'))
 p.tap('#menu-codex');p.wait_for_function('document.querySelector("#archive-body").dataset.pose==="basic"');p.screenshot(path=str(art/f'v68-mobile-codex{suffix}.png'))
 assert p.evaluate('!document.fullscreenEnabled||!!document.fullscreenElement')
 # Every equipped champion, including both transformed forms, fits the canvas.
 results=p.evaluate('''()=>{const screen=__moba.codex,keys=[...document.querySelectorAll('.archive-champion')].map(b=>b.dataset.key),out=[];for(const key of keys){screen.key=key;for(const transformed of(key==='sora'||key==='yan'?[false,true]:[false])){screen.transformed=transformed;screen.skill=0;screen.championDetail();const c=document.getElementById('archive-body'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0,edge=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]){count++;if(x<3||y<3||x>=c.width-3||y>=c.height-3)edge++;}out.push({key,transformed,count,edge,pose:c.dataset.pose});}}screen.key='faust';screen.transformed=false;screen.championDetail();return out;}''')
 assert len(results)==32 and all(r['count']>500 and r['edge']==0 and r['pose']=='basic'for r in results),results
 for category,selector in [('monsters','.monster-detail'),('augments','.augment-guide-detail'),('rules','#codex-body')]:
  p.tap(f'#codex-tabs [data-category="{category}"]');inside(selector);assert p.locator('#codex-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
 back();assert p.evaluate('__moba.mode')=='menu'
 p.tap('#practice-open');inside('#start');p.set_viewport_size({'width':687,'height':375});p.wait_for_timeout(150);inside('#start');inside('#champion-select')
 start=p.locator('#start').bounding_box()['y'];assert p.locator('#champion-select').evaluate('(e)=>{e.scrollTop=e.scrollHeight;return e.scrollTop>0;}');assert p.locator('#start').bounding_box()['y']==start
 p.tap('.pick-slot[data-team="1"][data-position="top"]');p.tap('#pick-none');assert p.evaluate('__moba.draft.value()[1].top')is None
 p.screenshot(path=str(art/f'v68-mobile-pick-small{suffix}.png'));back();assert p.evaluate('__moba.mode')=='menu'
 p.set_viewport_size({'width':844,'height':390});p.tap('#training-open');p.tap('.champion-option[data-key="jamila"]');p.tap('#start');p.wait_for_function('__moba.game.training');p.wait_for_timeout(150)
 p.evaluate('''()=>{const g=__moba.game;window.step68=g.step.bind(g);g.step=()=>{};window.advance68=s=>{for(let i=0;i<Math.round(s*120);i++)step68(1/120);};
 window.fixture68=key=>{const g=__moba.game;__moba.mobile.cancel();if(key&&g.player.key!==key){g.player.player=false;g.player=g.makeChampion(key,0,0,'bottom');}const p=g.player;g.time+=20;g.units=[p];g.events=[];g.effects=[];g.pending=[];g.projectiles=[];g.zones=[];g.corpses=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,hp:p.maxHp,ammo:g.ammoCap(p),state:{},status:{},shields:[],buffs:{},buffHistory:{},buffPotency:{},visuals:{},attackAt:-99,attackSerial:0,attackCd:0,qCd:0,rCd:0,lastAttackAt:999,lastDamageAt:999,channelUntil:0,augments:[]});delete p.motion;delete p.recall;g.input={x:0,y:0,aim:{x:40.15,y:25},fire:false};__moba.mobile.lastTap=-Infinity;};
 window.enemy68=(x=44,y=25,hp=10000)=>{const g=__moba.game,t=g.makeChampion('yi',1,g.nextId+20);Object.assign(t,{x,y,hp,maxHp:100000,armor:0,lastAttackAt:999,lastDamageAt:999});return t;};fixture68('jamila');}''')
 session=p.context.new_cdp_session(p);touches={}
 def touch(kind,ident,x=None,y=None):
  if kind!='touchEnd':touches[ident]={'id':ident,'x':x,'y':y,'radiusX':5,'radiusY':5,'force':1};points=list(touches.values())
  else:points=[touches.pop(ident)]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def down(selector,ident=1):
  r=p.locator(selector).bounding_box();x,y=r['x']+r['width']/2,r['y']+r['height']/2;touch('touchStart',ident,x,y);return x,y
 def up(ident=1):touch('touchEnd',ident)
 def tap(selector,ident=1):down(selector,ident);up(ident);p.wait_for_timeout(60)
 # A short slide on a directional dash beats both an enemy target and movement.
 p.evaluate('fixture68("don");window.target68=enemy68(44,25)');sx,sy=down('#mobile-stick',1);touch('touchMove',1,sx,sy+38);p.wait_for_timeout(50)
 r=p.locator('#basic-btn').bounding_box();x,y=r['x']+r['width']/2+15,r['y']+r['height']/2+8;touch('touchStart',2,x,y);touch('touchMove',2,x-32,y);p.wait_for_timeout(35);assert p.evaluate('[...__moba.mobile.gestures.values()].find(s=>s.slot==="basic").shortSlide===true');up(2);assert p.evaluate('__moba.game.player.motion.dx<-.999&&Math.abs(__moba.game.player.motion.dy)<1e-6');up(1);p.evaluate('advance68(.4)');assert p.evaluate('__moba.game.player.x<39&&target68.hp===10000')
 p.evaluate('fixture68("don");window.target68=enemy68(44,25)');tap('#basic-btn');assert p.evaluate('__moba.game.player.motion.dx>.999')
 p.evaluate('fixture68("ryoshu");enemy68(44,25)');x,y=down('#q-btn',3);touch('touchMove',3,x,y-30);p.wait_for_timeout(35);up(3);assert p.evaluate('__moba.game.player.motion.dy<-.999')
 print('short dash slides / actual finger direction / tap autoaim PASS',flush=True)
 # Non-dash short slides retain autoaim, including charged thrusts and ground moves.
 p.evaluate('fixture68("jamila");window.target68=enemy68(44,25)');x,y=down('#basic-btn',4);touch('touchMove',4,x-35,y);p.wait_for_timeout(35);up(4);assert p.evaluate('__moba.game.projectiles[0].dx>.999')
 p.evaluate('fixture68("don");window.target68=enemy68(44,25)');x,y=down('#q-btn',5);touch('touchMove',5,x-35,y);p.wait_for_timeout(35);assert p.evaluate('!__moba.mobile.gestures.values().next().value.manual&&__moba.game.input.aim.x===target68.x');up(5)
 p.evaluate('fixture68("sinclair");enemy68(44,25)');x,y=down('#r-btn',6);touch('touchMove',6,x-35,y);p.wait_for_timeout(35);up(6);assert p.evaluate('__moba.game.player.motion.dx>.999&&__moba.game.player.motion.ignoreWalls')
 print('non-dash tap rules and charged controls retained PASS',flush=True)
 # Ppui manual fire aimed toward an enemy instead selects an eligible ally in range.
 p.evaluate("()=>{fixture68('ppui');enemy68(38,25);const g=__moba.game;window.ally68=g.makeChampion('faust',0,50);Object.assign(ally68,{x:43,y:25,hp:1000,maxHp:10000,lastAttackAt:999,lastDamageAt:999});}");x,y=down('#basic-btn',7);touch('touchMove',7,x-60,y);p.wait_for_timeout(230);assert p.evaluate('__moba.mobile.gestures.values().next().value.manual&&__moba.game.input.aim.x===ally68.x');up(7);assert p.evaluate('__moba.game.player.state.empower.target===ally68.id&&__moba.game.projectiles.length===0');p.evaluate('advance68(.5)');assert p.evaluate('ally68.hp>1000')
 p.evaluate('fixture68("ppui");enemy68(38,25)');x,y=down('#basic-btn',8);touch('touchMove',8,x-60,y);p.wait_for_timeout(230);up(8);p.evaluate('advance68(.02)');assert p.evaluate('__moba.game.projectiles.length>0&&__moba.game.projectiles[0].dx<-.99')
 print('Ppui manual ally heal / normal manual attacks without allies PASS',flush=True)
 # Both ultimates are ground casts and cross terrain without any enemy to select.
 for index,key in enumerate(['nelly','sinclair']):
  p.evaluate(f'fixture68("{key}");__moba.game.map.walls=[{{x:42,y:23,w:1,h:4}}]');x,y=down('#r-btn',10+index);touch('touchMove',10+index,x+60,y);p.wait_for_timeout(230);up(10+index)
  if key=='sinclair':assert p.evaluate('__moba.game.player.motion.ignoreWalls');p.evaluate('advance68(.3)')
  expected=47 if key=='nelly' else 46
  assert p.evaluate(f'Math.abs(__moba.game.player.x-{expected})<1e-6&&!__moba.game.blocked(__moba.game.player.x,__moba.game.player.y,__moba.game.player.radius)&&__moba.game.player.rCd>0'),key
  p.screenshot(path=str(art/f'v68-mobile-{key}-ground-move{suffix}.png'))
 p.evaluate('fixture68("nelly");__moba.game.map.walls=[{x:42,y:23,w:1,h:4}];window.target68=enemy68(46.5,25)');tap('#r-btn');assert p.evaluate('__moba.game.player.x>43&&target68.hp<10000&&target68.state.nellyMarks[__moba.game.player.id].hold===3')
 print('ground ultimates / wall crossing / Nelly mark retained PASS',flush=True)
 # The bundled projectile pipeline applies tower penetration, not just raw damage calls.
 p.evaluate("()=>{fixture68('faust');const g=__moba.game,p=g.player;p.armor=100;p.hp=p.maxHp=10000;const tower=g.entity({kind:'tower',team:1,x:42,y:25,maxHp:10000,damage:170,range:8.5});g.simpleAttack(tower,p);g.updateProjectiles(.3);}");assert p.evaluate('Math.abs(__moba.game.player.hp-9900)<1e-6')
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'offline':offline,'shortDashSlide':True,'slideOverridesTarget':True,'offCenterFingerDirection':True,'regularTapRules':True,'manualPpuiHealing':True,'groundUltimates':2,'wallTraversal':True,'NellyMark':True,'towerPenetration':True,'errors':errors}));b.close()
