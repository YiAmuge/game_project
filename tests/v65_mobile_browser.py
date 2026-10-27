"""Actual touch: app navigation, armed codex, shop, moving aim and held fire."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.getenv('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':844,'height':390},is_mobile=True,has_touch=True);errors=[];requests=[]
 p.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',str(e),flush=True)));p.on('request',lambda r:requests.append(r.url))
 if offline:
  p.route('http*://**/*',lambda r:r.abort());p.set_content((root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)'),wait_until='networkidle',timeout=60000)
 else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
 def inside(selector):
  r=p.locator(selector).bounding_box();assert r and r['x']>=0 and r['y']>=0 and r['x']+r['width']<=p.viewport_size['width']+.5 and r['y']+r['height']<=p.viewport_size['height']+.5,(selector,r)
 def back():p.evaluate('history.back()');p.wait_for_timeout(180)
 inside('#mobile-fullscreen');assert p.locator('#mobile-fullscreen svg').evaluate('(s)=>{const a=s.getBoundingClientRect(),b=s.parentElement.getBoundingClientRect();return a.left>=b.left+3&&a.top>=b.top+3&&a.right<=b.right-3&&a.bottom<=b.bottom-3&&Math.abs(a.x+a.width/2-b.x-b.width/2)<1;}');p.screenshot(path=str(art/f'v65-mobile-menu{suffix}.png'))
 p.tap('#menu-codex');p.wait_for_function('document.querySelector("#archive-body").dataset.pose==="basic"');p.screenshot(path=str(art/f'v65-mobile-codex{suffix}.png'))
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
 p.screenshot(path=str(art/f'v65-mobile-pick-small{suffix}.png'));back();assert p.evaluate('__moba.mode')=='menu'
 p.set_viewport_size({'width':844,'height':390});p.tap('#training-open');p.tap('.champion-option[data-key="jamila"]');p.tap('#start');p.wait_for_function('__moba.game.training');p.wait_for_timeout(150)
 p.evaluate('''()=>{const g=__moba.game;window.step65=g.step.bind(g);g.step=()=>{};window.advance65=s=>{for(let i=0;i<Math.round(s*120);i++)step65(1/120);};
 window.fixture65=key=>{const g=__moba.game;__moba.mobile.cancel();if(key&&g.player.key!==key){g.player.player=false;g.player=g.makeChampion(key,0,0,'bottom');}const p=g.player;g.time+=20;g.units=[p];g.events=[];g.effects=[];g.pending=[];g.projectiles=[];g.zones=[];g.corpses=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,hp:p.maxHp,ammo:g.ammoCap(p),state:{},status:{},shields:[],buffs:{},buffHistory:{},buffPotency:{},visuals:{},attackAt:-99,attackSerial:0,attackCd:0,qCd:0,rCd:0,lastAttackAt:999,lastDamageAt:999,channelUntil:0,augments:[]});delete p.motion;delete p.recall;g.input={x:0,y:0,aim:{x:40.15,y:25},fire:false};__moba.mobile.lastTap=-Infinity;};
 window.enemy65=(x=44,y=25,hp=10000)=>{const g=__moba.game,t=g.makeChampion('yi',1,g.nextId+20);Object.assign(t,{x,y,hp,maxHp:100000,armor:0,lastAttackAt:999,lastDamageAt:999});return t;};fixture65('jamila');}''')
 session=p.context.new_cdp_session(p);touches={}
 def touch(kind,ident,x=None,y=None):
  if kind!='touchEnd':touches[ident]={'id':ident,'x':x,'y':y,'radiusX':5,'radiusY':5,'force':1};points=list(touches.values())
  else:points=[touches.pop(ident)]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def down(selector,ident=1):
  r=p.locator(selector).bounding_box();x,y=r['x']+r['width']/2,r['y']+r['height']/2;touch('touchStart',ident,x,y);return x,y
 def up(ident=1):touch('touchEnd',ident)
 def tap(selector,ident=1):down(selector,ident);up(ident);p.wait_for_timeout(60)
 # The expanded map has one scale in both axes for this arena's actual bounds.
 down('#minimap',5);p.wait_for_timeout(150);ratio=p.locator('#score-map').evaluate('(c)=>{const r=c.getBoundingClientRect();return{css:r.width/r.height,bitmap:c.width/c.height};}');assert abs(ratio['css']-1.5)<.01 and abs(ratio['bitmap']-ratio['css'])<.01,ratio;p.screenshot(path=str(art/f'v65-mobile-expanded-map{suffix}.png'));up(5)
 # Aim retains its relative vector after walking past the former aim point.
 x,y=down('#mobile-stick',2);touch('touchMove',2,x+40,y);p.wait_for_timeout(60);p.evaluate('advance65(.5)');assert p.evaluate('Math.abs(__moba.game.input.aim.x-__moba.game.player.x-.15)<1e-6&&Math.abs(__moba.game.player.facing)<1e-6');up(2)
 # Default autoaim chooses a low-health champion even with a nearer minion.
 p.evaluate('fixture65("jamila");window.minion65=enemy65(41,26,1);minion65.kind="minion";window.high65=enemy65(43,26,9000);window.low65=enemy65(44,25,1000)');tap('#basic-btn');assert p.evaluate('__moba.game.input.aim.x===low65.x&&__moba.game.input.aim.y===low65.y')
 # Exactly the available target categories appear; explicit targeting never falls back.
 p.evaluate('''()=>{fixture65('jamila');window.champ65=enemy65(44,25);const g=__moba.game;window.minion65=enemy65(43,27);minion65.kind='minion';window.creep65=g.makeNeutral(43,23,'central');window.tower65=g.entity({kind:'tower',team:1,x:45,y:26,maxHp:10000,radius:.75,range:6});}''');p.wait_for_timeout(160)
 for kind in ['champion','minion','structure','creep']:expect(p.locator(f'.mobile-target-btn[data-target-kind="{kind}"]')).to_be_visible()
 tap('.mobile-target-btn[data-target-kind="creep"]');assert p.evaluate('__moba.game.input.aim.x===creep65.x&&__moba.game.input.aim.y===creep65.y');p.evaluate('creep65.x=90;__moba.mobile.hud()');expect(p.locator('.mobile-target-btn[data-target-kind="creep"]')).to_be_hidden()
 assert p.locator('#ping-controls button svg').count()==3;assert p.locator('#ping-controls button').first.evaluate('(b)=>getComputedStyle(b).fontSize')=='0px';assert p.locator('#ping-controls').evaluate('(rail)=>[...rail.querySelectorAll("svg")].every(s=>{const a=s.getBoundingClientRect(),b=s.parentElement.getBoundingClientRect();return a.left>=b.left+5&&a.top>=b.top+5&&a.right<=b.right-5&&a.bottom<=b.bottom-5&&Math.abs(a.x+a.width/2-b.x-b.width/2)<1;})')
 for selector in ['#basic-btn>span','#q-btn>span','#r-btn>span']:expect(p.locator(selector)).to_be_hidden()
 assert p.locator('#ping-controls').bounding_box()['x']>p.viewport_size['width']-65
 for selector in ['#pause','#sound-toggle','#mobile-fullscreen']:assert p.locator(selector).bounding_box()['x']>p.viewport_size['width']-125
 assert p.locator('#ping-controls button').first.evaluate('(b)=>parseFloat(getComputedStyle(b).borderRadius)')>=20
 p.evaluate('__moba.game.player.qCd=4;__moba.game.player.rCd=20');p.wait_for_timeout(130);expect(p.locator('#q-btn .cooldown')).to_have_text('4');p.screenshot(path=str(art/f'v65-mobile-combat-ui{suffix}.png'))
 # These three champions lock the selected target while held, fire repeatedly,
 # keep tracking during movement and stop immediately when released.
 for index,key in enumerate(['jamila','ryoshu','heathcliff','rudolph']):
  p.evaluate(f'fixture65("{key}");window.lock65=enemy65(41.6,25,10000);window.other65=enemy65(41.5,26,20000)');down('#basic-btn',20+index);p.wait_for_timeout(240);assert p.evaluate('__moba.game.input.fire&&__moba.game.mobileAim.autoTarget===lock65.id')
  p.evaluate('advance65(.6);other65.hp=1;lock65.y+=.2');p.wait_for_timeout(80);p.evaluate('advance65(1.2)');assert p.evaluate('__moba.game.player.attackSerial>=2&&__moba.game.mobileAim.autoTarget===lock65.id&&__moba.game.input.aim.y===lock65.y'),key
  up(20+index);serial=p.evaluate('__moba.game.player.attackSerial');p.evaluate('advance65(.5)');assert p.evaluate('__moba.game.player.attackSerial')==serial and not p.evaluate('__moba.game.input.fire')
 # An immediate second charge stays buffered through cooldown and begins as soon as ready.
 p.evaluate('fixture65("hohenheim");enemy65()');down('#basic-btn',30);p.wait_for_timeout(40);assert p.evaluate('!!__moba.game.player.state.hohenCharge');p.evaluate('advance65(.2)');up(30);assert p.evaluate('__moba.game.player.attackSerial===1&&__moba.game.player.attackCd>0')
 down('#basic-btn',31);p.wait_for_timeout(40);assert not p.evaluate('!!__moba.game.player.state.hohenCharge');p.evaluate('advance65(.66)');p.wait_for_timeout(90);assert p.evaluate('!!__moba.game.player.state.hohenCharge');p.evaluate('advance65(.2)');up(31);assert p.evaluate('__moba.game.player.attackSerial===2')
 p.evaluate('fixture65("don");enemy65()');down('#q-btn',32);p.wait_for_timeout(40);p.evaluate('advance65(.15)');up(32);assert p.evaluate('__moba.game.player.qCd>0');down('#q-btn',33);p.wait_for_timeout(40);assert not p.evaluate('!!__moba.game.player.state.donCharge');p.evaluate('advance65(8.01)');p.wait_for_timeout(90);assert p.evaluate('!!__moba.game.player.state.donCharge');p.evaluate('advance65(.1)');up(33);assert not p.evaluate('!!__moba.game.player.state.donCharge')
 # Circle autoaim uses the far edge of its area and still clamps the cast center.
 p.evaluate('fixture65("yi");window.edge65=enemy65(50)');tap('#q-btn');assert p.evaluate('Math.abs(__moba.game.input.aim.x-47)<1e-6&&__moba.game.player.qCd>0'),p.evaluate('({aim:__moba.game.input.aim,cd:__moba.game.player.qCd})')
 # Repeated healing and damage share compact totals without altering actual health changes.
 p.evaluate('''()=>{fixture65('jamila');const g=__moba.game;window.numberTarget65=enemy65();const a=g.makeChampion('faust',0,50);Object.assign(a,{x:42,y:27,hp:100,maxHp:10000});for(let i=0;i<30;i++){g.heal(g.player,a,1,false);g.deal(g.player,numberTarget65,1);}window.healTarget65=a;g.log('상단 라인 수비!','ally');g.announce('kill','챔피언 처치','자밀라 → 이상');}''');p.wait_for_timeout(160);assert p.evaluate('__moba.game.effects.filter(f=>f.type==="number").length===2&&healTarget65.hp===130');assert p.locator('#battle-announcement').bounding_box()['height']<80;assert p.locator('#event-feed').bounding_box()['y']>=p.locator('#shop-toggle').bounding_box()['y']+p.locator('#shop-toggle').bounding_box()['height'];p.screenshot(path=str(art/f'v65-mobile-compact-alerts{suffix}.png'))
 # The shop actions stay on screen while effects scroll; upgrades/inventory have separate tabs.
 p.evaluate('fixture65("jamila")');tap('#shop-toggle');inside('#mobile-shop-tabs');tap('#mobile-shop-tabs [data-section="upgrades"]');inside('#buy-power');tap('#buy-power');assert p.evaluate('__moba.game.player.upgrades.power')>=1;p.wait_for_timeout(300);tap('#training-buy-procedures');p.wait_for_timeout(300)
 tap('#mobile-shop-tabs [data-section="augments"]');p.locator('#select-augment-reloadStacks').tap();inside('#detail-buy');inside('#shop-sell');tap('#detail-buy');assert p.evaluate('__moba.game.player.augments.includes("reloadStacks")');p.wait_for_timeout(300)
 p.set_viewport_size({'width':667,'height':375});p.wait_for_timeout(100);inside('#detail-buy');inside('#shop-sell');p.screenshot(path=str(art/f'v65-mobile-shop-augments{suffix}.png'))
 tap('#mobile-shop-tabs [data-section="inventory"]');p.locator('#owned-list [data-augment-key="reloadStacks"]').tap();inside('#shop-sell');p.screenshot(path=str(art/f'v65-mobile-shop-inventory{suffix}.png'));tap('#shop-sell');assert not p.evaluate('__moba.game.player.augments.includes("reloadStacks")');tap('#mobile-shop-tabs [data-section="upgrades"]');inside('#buy-health');p.screenshot(path=str(art/f'v65-mobile-shop-upgrades{suffix}.png'));tap('#shop-close')
 # Back never navigates away from this app and opens settings during the match.
 url=p.url;back();expect(p.locator('#pause-banner')).to_be_visible();assert p.evaluate('__moba.mode')=='playing'and p.url==url;back();expect(p.locator('#pause-banner')).to_be_visible()
 p.tap('#pause-archive');expect(p.locator('#archive')).to_be_visible();back();expect(p.locator('#archive')).to_be_hidden();expect(p.locator('#pause-banner')).to_be_visible();tap('#resume');assert not p.evaluate('__moba.paused')
 if p.evaluate('!!document.fullscreenElement'):
  p.evaluate('document.exitFullscreen()');p.wait_for_timeout(120);expect(p.locator('#pause-banner')).to_be_visible();tap('#resume');p.wait_for_timeout(150);assert p.evaluate('!!document.fullscreenElement')
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'offline':offline,'armedCodex':len(results),'mobileDraft':True,'relativeAim':True,'categoryButtons':True,'lowHealthChampionPriority':True,'heldFireChampions':4,'queuedCharges':True,'areaEdgeAim':True,'undistortedMap':True,'batchedCombatNumbers':True,'compactRightSideUI':True,'iconOnlySkillsAndPings':True,'touchShopPurchaseAndSale':True,'backOpensSettings':True,'fullscreen':True,'errors':errors}));b.close()
