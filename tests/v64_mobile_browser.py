"""Real multi-touch combat, held map/ping, landscape gate and special autoaim."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.getenv('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 p=b.new_page(viewport={'width':844,'height':390},device_scale_factor=1,is_mobile=True,has_touch=True);errors=[];requests=[]
 p.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',str(e),flush=True)));p.on('request',lambda r:requests.append(r.url))
 if offline:
  p.route('http*://**/*',lambda r:r.abort());p.set_content((root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)'),wait_until='networkidle',timeout=60000)
 else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
 p.tap('#training-open');p.tap('.champion-option[data-key="jamila"]');p.tap('#start');p.wait_for_function('__moba.mobile.enabled&&__moba.game.training');p.wait_for_timeout(180)
 expect(p.locator('#training-options')).to_be_hidden();expect(p.locator('#mobile-stick')).to_be_visible();expect(p.locator('#pause')).to_be_visible()
 p.evaluate('''()=>{const g=__moba.game;window.step64=g.step.bind(g);g.step=()=>{};window.advance64=s=>{for(let i=0;i<Math.round(s*120);i++)step64(1/120);};
 window.fixture64=()=>{const g=__moba.game,p=g.player;__moba.mobile.cancel();__moba.mobile.lastTap=-Infinity;g.time+=20;g.units=[p];g.events=[];g.pending=[];g.projectiles=[];g.effects=[];g.zones=[];g.corpses=[];g.practice.lineStopped=true;g.pings=[];g.pingReady=0;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;g.aiChampion=g.aiMinion=g.aiNeutral=g.aiStructure=()=>{};Object.assign(p,{x:40,y:25,hp:p.maxHp,ammo:g.ammoCap(p),lastDamageAt:999,lastAttackAt:999,attackCd:0,qCd:0,rCd:0,attackAt:-99,attackSerial:0,state:{},status:{},shields:[],buffs:{},buffHistory:{},buffPotency:{},visuals:{},channelUntil:0,augments:[],facing:0});delete p.motion;delete p.recall;g.input={x:0,y:0,aim:{x:48,y:25},fire:false};};
 window.actor64=key=>{const g=__moba.game;if(g.player.key!==key){g.player.player=false;g.player=g.makeChampion(key,0,0,'bottom');}fixture64();};
 window.enemy64=(x=44,y=25)=>{const g=__moba.game,t=g.makeChampion('faust',1,30+g.nextId);Object.assign(t,{x,y,maxHp:10000,hp:10000,armor:0,lastAttackAt:999,lastDamageAt:999});return t;};
 window.ally64=(x=43,hp=100)=>{const g=__moba.game,t=g.makeChampion('faust',0,30+g.nextId);Object.assign(t,{x,y:25,maxHp:10000,hp,armor:0,lastAttackAt:999,lastDamageAt:999});return t;};fixture64();enemy64();}''')
 p.wait_for_timeout(150)
 def box(selector):return p.locator(selector).bounding_box()
 def center(selector):
  q=box(selector);return(q['x']+q['width']/2,q['y']+q['height']/2)
 session=p.context.new_cdp_session(p);touches={}
 def touch(kind,ident,x=None,y=None):
  if kind!='touchEnd':
   touches[ident]={'id':ident,'x':x,'y':y,'radiusX':6,'radiusY':6,'force':1};points=list(touches.values())
  else:points=[touches.pop(ident)]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def down(selector,ident=1):
  x,y=center(selector);touch('touchStart',ident,x,y);return x,y
 def up(ident=1):touch('touchEnd',ident)
 def tap(selector,ident=1):down(selector,ident);up(ident);p.wait_for_timeout(50)
 # Required layout, including the user's latest horizontal shop and left-side recall.
 assert box('#basic-btn')['width']>box('#q-btn')['width']
 assert box('#recall-btn')['x']+box('#recall-btn')['width']<min(box('#q-btn')['x'],box('#basic-btn')['x'])
 assert box('#shop-toggle')['width']>box('#shop-toggle')['height']*2
 assert box('#shop-toggle')['y']>=box('#minimap')['y']+box('#minimap')['height']
 for s in ['#basic-btn','#q-btn','#r-btn','#recall-btn','#pause','#shop-toggle','#minimap','#mobile-stick']:
  q=box(s);assert q and q['x']>=0 and q['y']>=0 and q['x']+q['width']<=844 and q['y']+q['height']<=390,(s,q)
 p.screenshot(path=str(art/f'v64-mobile-layout{suffix}.png'))
 tap('#basic-btn');assert p.evaluate('__moba.game.player.ammo===15&&__moba.game.projectiles[0].dx>.99')
 # Movement and a separate attacking finger operate simultaneously.
 p.evaluate('__moba.game.player.attackCd=0');x,y=down('#mobile-stick',2);touch('touchMove',2,x+35,y);p.wait_for_timeout(70);before=p.evaluate('__moba.game.player.x');tap('#basic-btn',3);assert p.evaluate('__moba.mobile.axes.x>.5');p.evaluate('advance64(.2)');assert p.evaluate('__moba.game.player.x')>before+.2;up(2);assert p.evaluate('__moba.mobile.axes.x===0')
 # A held drag aims manually; the round is released once, not on the initial hold.
 p.evaluate('fixture64();enemy64()');x,y=down('#basic-btn',4);touch('touchMove',4,x-60,y);p.wait_for_timeout(220);assert p.evaluate('__moba.game.projectiles.length===0&&__moba.game.mobileAim.slot==="basic"');up(4);assert p.evaluate('__moba.game.projectiles.length===1&&__moba.game.projectiles[0].dx<-.99');assert p.evaluate('!__moba.game.mobileAim')
 # Map remains open while a second finger selects a ping and reads our current skills.
 p.evaluate('fixture64();enemy64()');down('#minimap',10);expect(p.locator('#scoreboard')).to_be_visible();down('#ping-controls [data-ping="attack"]',11);p.wait_for_timeout(330);expect(p.locator('#ping-menu')).to_be_visible();x,y=center('.ping-choice[data-choice="top"]');touch('touchMove',11,x,y);p.wait_for_timeout(40);up(11);assert p.evaluate('__moba.game.pings.at(-1).label')=='상단 라인 진격!';expect(p.locator('#scoreboard')).to_be_visible();tap('#mobile-score-skills [data-slot="1"]',12);expect(p.locator('#mobile-score-skills p')).to_contain_text('55%');p.screenshot(path=str(art/f'v64-mobile-map-ping{suffix}.png'));up(10);expect(p.locator('#scoreboard')).to_be_hidden()
 # Hold with no target selection cancels without producing another ping.
 p.evaluate('__moba.game.time+=1');n=p.evaluate('__moba.game.pings.length');down('#ping-controls [data-ping="danger"]',13);p.wait_for_timeout(310);up(13);assert p.evaluate('__moba.game.pings.length')==n
 # Shop button works and pause settings do not overlap the map.
 tap('#shop-toggle');expect(p.locator('#shop')).to_be_visible();p.screenshot(path=str(art/f'v64-mobile-shop{suffix}.png'));tap('#shop-close');tap('#pause');expect(p.locator('#pause-banner')).to_be_visible();tap('#resume');assert not p.evaluate('__moba.paused')
 # Selection camera widens naturally and returns to 1x only while precision Q is held.
 p.evaluate('''()=>{fixture64();const g=__moba.game,p=g.player;p.augments=['highRisk'];g.recall(p);advance64(1.75);}''');p.wait_for_timeout(500)
 baseline=max(844/32,390/21);scale=p.evaluate('__moba.renderer.camera.scale');assert abs(scale/baseline-1/1.3)<.015,scale
 down('#q-btn',20);p.wait_for_timeout(400);assert p.evaluate('__moba.game.input.precision');assert abs(p.evaluate('__moba.renderer.camera.scale')/baseline-1)<.02;up(20);p.wait_for_timeout(400);assert not p.evaluate('__moba.game.input.precision');p.screenshot(path=str(art/f'v64-mobile-infiltration{suffix}.png'));p.evaluate('advance64(15);advance64(.51)');assert p.evaluate('!__moba.game.player.state.infiltration')
 # Per-champion autoaim acts through the real buttons.
 p.evaluate('actor64("marton");window.far64=enemy64(44.5);window.close64=enemy64(42)');tap('#basic-btn');assert p.evaluate('__moba.game.player.state.martonGroundStrike===null');p.evaluate('close64.alive=false;__moba.game.player.attackCd=0');tap('#basic-btn');assert p.evaluate('__moba.game.player.state.martonGroundStrike===__moba.game.player.attackSerial');assert p.evaluate('__moba.game.effects.some(f=>f.type==="burst"&&f.shape.kind==="circle")')
 p.evaluate('actor64("ppui");enemy64(42);window.friend64=ally64(43,100)');tap('#basic-btn');assert p.evaluate('__moba.game.player.state.empower.target===friend64.id');assert p.evaluate('__moba.game.projectiles.length===0')
 p.evaluate('actor64("queequeg");ally64(42,9000);window.friend64=ally64(45,100);enemy64(41)');tap('#q-btn');assert p.evaluate('__moba.game.player.state.tether.target===friend64.id')
 p.evaluate('actor64("honglu");ally64(42,9000);window.friend64=ally64(45,100);enemy64(41)');tap('#r-btn');assert p.evaluate('__moba.game.zones[0].x===friend64.x&&__moba.game.zones[0].until-__moba.game.time===3')
 p.evaluate('actor64("gubo");enemy64(42);window.friend64=ally64(44,100)');tap('#basic-btn');assert p.evaluate('__moba.game.input.aim.x===friend64.x');p.evaluate('__moba.game.player.attackCd=0');tap('#r-btn');assert p.evaluate('__moba.game.player.state.guboAim.target.id===friend64.id')
 # Don charging and Hohenheim basic charging use the same manual-release control.
 p.evaluate('actor64("don");enemy64(44)');x,y=down('#q-btn',21);p.wait_for_timeout(230);touch('touchMove',21,x+40,y);p.wait_for_timeout(50);assert p.evaluate('!!__moba.game.player.state.donCharge');p.evaluate('advance64(.6)');up(21);assert p.evaluate('!__moba.game.player.state.donCharge&&!!__moba.game.player.state.donThrust')
 p.evaluate('actor64("hohenheim");enemy64(44)');x,y=down('#basic-btn',22);p.wait_for_timeout(240);touch('touchMove',22,x+50,y);p.wait_for_timeout(40);assert p.evaluate('!!__moba.game.player.state.hohenCharge');p.evaluate('advance64(.6)');up(22);assert p.evaluate('!__moba.game.player.state.hohenCharge')
 # Distorted Yan: tap target, double tap return, and held joystick-like hand movement.
 p.evaluate('actor64("yan");__moba.game.player.state.ominous=6;__moba.game.cast(__moba.game.player,"r",__moba.game.player);window.foe64=enemy64(44)');down('#basic-btn');up();assert p.evaluate('__moba.game.units.find(e=>e.kind==="summon").targetId===foe64.id');down('#basic-btn');up();assert p.evaluate('__moba.game.units.find(e=>e.kind==="summon").attached===true');p.evaluate('__moba.game.player.attackCd=0');x,y=down('#basic-btn',23);touch('touchMove',23,x-58,y);p.wait_for_timeout(230);assert p.evaluate('__moba.game.units.find(e=>e.kind==="summon").goal.x<__moba.game.player.x');up(23);p.screenshot(path=str(art/f'v64-mobile-yan-hand{suffix}.png'))
 # Charges, passive state, augment cooldowns and debuffs are compact visible icons.
 p.evaluate('actor64("nelly");__moba.game.player.augments=["highRisk","reloadStacks"];Object.assign(__moba.game.player.state,{infiltrationReady:__moba.game.time+20,augReloadStacks:5});__moba.game.status(__moba.game.player,"slow",.2,3);__moba.mobile.hud()');p.wait_for_timeout(160);expect(p.locator('#q-btn .mobile-charges')).to_have_text('2');expect(p.locator('#mobile-status [data-augment="highRisk"] small')).to_have_text('20s');expect(p.locator('#mobile-status [data-debuff="slow"]')).to_be_visible();p.screenshot(path=str(art/f'v64-mobile-effects{suffix}.png'))
 # Portrait pauses simulation and blocks combat until the phone is landscape again.
 p.evaluate('__moba.game.step=step64');p.set_viewport_size({'width':390,'height':844});p.wait_for_function('__moba.mobile.blocking');expect(p.locator('#mobile-rotate')).to_be_visible();time=p.evaluate('__moba.game.time');p.wait_for_timeout(200);assert p.evaluate('__moba.game.time')==time;p.screenshot(path=str(art/f'v64-mobile-rotate{suffix}.png'));p.set_viewport_size({'width':844,'height':390});p.wait_for_function('!__moba.mobile.blocking');expect(p.locator('#mobile-rotate')).to_be_hidden()
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'offline':offline,'multiTouch':True,'tapAndManualAim':True,'mapAndPingTogether':True,'skillHelp':True,'horizontalShop':True,'recallOnLeft':True,'allChampionSpecialControls':True,'precisionCamera':True,'expiry':True,'chargeSkills':True,'yanHand':True,'statusAndCharges':True,'landscapeGate':True,'errors':errors}));b.close()
