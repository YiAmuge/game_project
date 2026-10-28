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
 inside('#mobile-fullscreen');assert p.locator('#mobile-fullscreen svg').evaluate('(s)=>{const a=s.getBoundingClientRect(),b=s.parentElement.getBoundingClientRect();return a.left>=b.left+3&&a.top>=b.top+3&&a.right<=b.right-3&&a.bottom<=b.bottom-3&&Math.abs(a.x+a.width/2-b.x-b.width/2)<1;}');p.screenshot(path=str(art/f'v67-mobile-menu{suffix}.png'))
 p.tap('#menu-codex');p.wait_for_function('document.querySelector("#archive-body").dataset.pose==="basic"');p.screenshot(path=str(art/f'v67-mobile-codex{suffix}.png'))
 assert p.evaluate('!document.fullscreenEnabled||!!document.fullscreenElement')
 # Every equipped champion, including both transformed forms, fits the canvas.
 results=p.evaluate('''()=>{const screen=__moba.codex,keys=[...document.querySelectorAll('.archive-champion')].map(b=>b.dataset.key),out=[];for(const key of keys){screen.key=key;for(const transformed of(key==='sora'||key==='yan'?[false,true]:[false])){screen.transformed=transformed;screen.skill=0;screen.championDetail();const c=document.getElementById('archive-body'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0,edge=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]){count++;if(x<3||y<3||x>=c.width-3||y>=c.height-3)edge++;}out.push({key,transformed,count,edge,pose:c.dataset.pose});}}screen.key='faust';screen.transformed=false;screen.championDetail();return out;}''')
 assert len(results)==32 and all(r['count']>500 and r['edge']==0 and r['pose']=='basic'for r in results),results
 for category,selector in [('monsters','.monster-detail'),('augments','.augment-guide-detail'),('rules','#codex-body')]:
  p.tap(f'#codex-tabs [data-category="{category}"]');inside(selector);assert p.locator('#codex-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
 back();assert p.evaluate('__moba.mode')=='menu'
 p.tap('#practice-open');inside('#start');p.set_viewport_size({'width':677,'height':375});p.wait_for_timeout(150);inside('#start');inside('#champion-select')
 start=p.locator('#start').bounding_box()['y'];assert p.locator('#champion-select').evaluate('(e)=>{e.scrollTop=e.scrollHeight;return e.scrollTop>0;}');assert p.locator('#start').bounding_box()['y']==start
 p.tap('.pick-slot[data-team="1"][data-position="top"]');p.tap('#pick-none');assert p.evaluate('__moba.draft.value()[1].top')is None
 p.screenshot(path=str(art/f'v67-mobile-pick-small{suffix}.png'));back();assert p.evaluate('__moba.mode')=='menu'
 p.set_viewport_size({'width':844,'height':390});p.tap('#training-open');p.tap('.champion-option[data-key="jamila"]');p.tap('#start');p.wait_for_function('__moba.game.training');p.wait_for_timeout(150)
 p.evaluate('''()=>{const g=__moba.game;window.step67=g.step.bind(g);g.step=()=>{};window.advance67=s=>{for(let i=0;i<Math.round(s*120);i++)step67(1/120);};
 window.fixture67=key=>{const g=__moba.game;__moba.mobile.cancel();if(key&&g.player.key!==key){g.player.player=false;g.player=g.makeChampion(key,0,0,'bottom');}const p=g.player;g.time+=20;g.units=[p];g.events=[];g.effects=[];g.pending=[];g.projectiles=[];g.zones=[];g.corpses=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,hp:p.maxHp,ammo:g.ammoCap(p),state:{},status:{},shields:[],buffs:{},buffHistory:{},buffPotency:{},visuals:{},attackAt:-99,attackSerial:0,attackCd:0,qCd:0,rCd:0,lastAttackAt:999,lastDamageAt:999,channelUntil:0,augments:[]});delete p.motion;delete p.recall;g.input={x:0,y:0,aim:{x:40.15,y:25},fire:false};__moba.mobile.lastTap=-Infinity;};
 window.enemy67=(x=44,y=25,hp=10000)=>{const g=__moba.game,t=g.makeChampion('yi',1,g.nextId+20);Object.assign(t,{x,y,hp,maxHp:100000,armor:0,lastAttackAt:999,lastDamageAt:999});return t;};fixture67('jamila');}''')
 session=p.context.new_cdp_session(p);touches={}
 def touch(kind,ident,x=None,y=None):
  if kind!='touchEnd':touches[ident]={'id':ident,'x':x,'y':y,'radiusX':5,'radiusY':5,'force':1};points=list(touches.values())
  else:points=[touches.pop(ident)]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def down(selector,ident=1):
  r=p.locator(selector).bounding_box();x,y=r['x']+r['width']/2,r['y']+r['height']/2;touch('touchStart',ident,x,y);return x,y
 def up(ident=1):touch('touchEnd',ident)
 def tap(selector,ident=1):down(selector,ident);up(ident);p.wait_for_timeout(60)
 # Charging is the explicit exception to the locked continuous auto gesture.
 for index,(key,slot)in enumerate([('hohenheim','basic'),('yan','basic'),('don','q'),('heathcliff','q')]):
  p.evaluate(f'fixture67("{key}");window.target67=enemy67()');x,y=down('#'+slot+'-btn',10+index);p.wait_for_timeout(230);assert p.evaluate('__moba.game.mobileAim.autoTarget===target67.id'),key;touch('touchMove',10+index,x-50,y);p.wait_for_timeout(65);assert p.evaluate('[...__moba.mobile.gestures.values()][0].manual&&!__moba.game.mobileAim.autoTarget&&__moba.game.input.aim.x<__moba.game.player.x'),key;up(10+index)
 print('all four charged controls permit late steering PASS',flush=True)
 # Rudolph remembers a manually chosen point's relative angle AND distance, taps
 # and holds it with no target, and still prioritizes a real visible target.
 p.evaluate('fixture67("rudolph")');x,y=down('#basic-btn',20);touch('touchMove',20,x-35,y);p.wait_for_timeout(230);up(20);assert p.evaluate('!!__moba.game.player.mobileManualAim.basic');p.evaluate('window.memory67={...__moba.game.player.mobileManualAim.basic};__moba.game.player.attackCd=0;__moba.game.player.facing=1.2');tap('#basic-btn');assert p.evaluate('Math.abs(__moba.game.input.aim.x-__moba.game.player.x-memory67.x)<1e-6&&Math.abs(__moba.game.input.aim.y-__moba.game.player.y-memory67.y)<1e-6')
 p.evaluate('__moba.game.player.attackCd=0');down('#basic-btn',21);p.wait_for_timeout(240);assert p.evaluate('__moba.game.input.fire&&!__moba.game.mobileAim.autoTarget');p.evaluate('advance67(.8)');assert p.evaluate('__moba.game.player.attackSerial>=3&&Math.abs(__moba.game.input.aim.x-__moba.game.player.x-memory67.x)<1e-6');up(21)
 p.evaluate('window.target67=enemy67(44,25);__moba.game.player.attackCd=0');tap('#basic-btn');assert p.evaluate('__moba.game.input.aim.x===target67.x');p.evaluate('target67.alive=false;__moba.game.player.attackCd=0');tap('#basic-btn');assert p.evaluate('Math.abs(__moba.game.input.aim.x-__moba.game.player.x-memory67.x)<1e-6')
 print('manual point memory / targetless tap and hold PASS',flush=True)
 # Actual rendered range guides fade on both render paths, separately from impacts.
 p.evaluate("()=>{fixture67('faust');const g=__moba.game,p=g.player;Object.assign(p,{lastAttackAt:g.time,lastDamageAt:-99,lastCombat:-99,attackAt:-99});delete p.attackGuideAt;window.guide67=()=>__moba.renderer.scene25d.groundPainter.attackGuideAlpha;}");p.wait_for_timeout(140);assert p.evaluate('guide67()===1');p.evaluate('__moba.game.time+=2.5');p.wait_for_timeout(140);assert p.evaluate('Math.abs(guide67()-.5)<1e-6');p.screenshot(path=str(art/f'v67-mobile-range-fading{suffix}.png'));p.evaluate('__moba.game.time+=.5');p.wait_for_timeout(140);assert p.evaluate('guide67()===0')
 p.evaluate('__moba.game.player.lastDamageAt=__moba.game.time');p.wait_for_timeout(140);assert p.evaluate('guide67()===1');p.evaluate('__moba.game.time+=3;window.target67=enemy67(44,25);target67.lastCombat=__moba.game.time');p.wait_for_timeout(140);assert p.evaluate('guide67()===1');p.evaluate('target67.x=100;__moba.game.time+=3');p.wait_for_timeout(140);assert p.evaluate('guide67()===0')
 print('rendered guide fade / damage and nearby battle restore PASS',flush=True)
 # Ready timed passives disappear; cooldowns and active passive shields appear.
 p.evaluate('fixture67("yi");__moba.game.player.passiveReady=0;__moba.mobile.hud()');assert p.locator('#mobile-status [data-passive]').count()==0;p.evaluate('__moba.game.player.passiveReady=__moba.game.time+2;__moba.mobile.hud()');assert p.locator('#mobile-status [data-passive]').count()==1;p.evaluate('__moba.game.time+=2;__moba.mobile.hud()');assert p.locator('#mobile-status [data-passive]').count()==0
 p.evaluate('__moba.game.player.shields.push({passive:"yi",value:100,until:__moba.game.time+1});__moba.mobile.hud()');assert p.locator('#mobile-status [data-passive]').count()==1;p.evaluate('__moba.game.time+=1;__moba.mobile.hud()');assert p.locator('#mobile-status [data-passive]').count()==0
 # Buffs and debuffs share newest-first ordering; cleared entries leave immediately.
 p.evaluate("()=>{fixture67('faust');const g=__moba.game,p=g.player,t=enemy67();g.addBuff(p,'coins',10);g.status(p,'slow',.2,10,t);g.addBuff(p,'resolve',10);__moba.mobile.hud();}");assert p.locator('#mobile-status>span').evaluate_all('(nodes)=>nodes.slice(0,3).map(n=>n.dataset.buff||n.dataset.debuff)')==['resolve','slow','coins'];p.evaluate('delete __moba.game.player.buffs.coins;delete __moba.game.player.status.slow;__moba.mobile.hud()');assert p.locator('#mobile-status [data-buff="coins"],#mobile-status [data-debuff="slow"]').count()==0
 p.evaluate("()=>{const g=__moba.game,p=g.player;p.augments=['highRisk','maskDeLu','wisdom','finalBullet','kAmpule','carrier'];for(let i=0;i<12;i++)g.addBuff(p,'test'+i,20);__moba.mobile.hud();}");assert p.locator('#mobile-status>span').count()==10;assert p.locator('#mobile-status [data-augment]').count()==0;assert p.locator('#mobile-status>span').first.get_attribute('data-buff')=='test11';p.evaluate('__moba.game.addBuff(__moba.game.player,"test0",20);__moba.mobile.hud()');assert p.locator('#mobile-status>span').first.get_attribute('data-buff')=='test0'
 p.set_viewport_size({'width':568,'height':320});p.wait_for_timeout(160);assert p.locator('#mobile-status>span').evaluate_all('(nodes)=>nodes.every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;})');assert p.evaluate("""()=>{const buttons=[...document.querySelectorAll('#basic-btn,#q-btn,#r-btn,#recall-btn,#ping-controls button,.mobile-target-btn:not(.hidden)')],circles=buttons.map(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,r:r.width/2};});return circles.every((c,i)=>circles.every((d,j)=>i===j||Math.hypot(c.x-d.x,c.y-d.y)>c.r+d.r));}""");p.screenshot(path=str(art/f'v67-mobile-status-small{suffix}.png'));p.evaluate('__moba.game.time+=30;__moba.mobile.hud()');assert p.locator('#mobile-status .buff,#mobile-status .debuff').count()==0
 print('active passive / clear stale icons / newest ten / augment priority PASS',flush=True)
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'offline':offline,'steerableCharges':4,'manualPointMemory':True,'targetlessHeldFire':True,'renderedRangeFade':True,'nearbyCombatRestore':True,'conditionalPassive':True,'activeOnlyStatuses':True,'newestTen':True,'augmentPriority':True,'narrowScreen':True,'errors':errors}));b.close()
