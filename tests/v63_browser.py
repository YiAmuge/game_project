"""Current combat changes, real mouse-button gestures, briefing and persistent rain."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
offline=os.environ.get('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 p=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[]
 p.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',str(e),flush=True)));p.on('request',lambda r:requests.append(r.url))
 if offline:
  p.route('http*://**/*',lambda r:r.abort());html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)');p.set_content(html,wait_until='networkidle',timeout=60000)
 else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
 p.click('#practice-open');p.click('.champion-option[data-key="jamila"]');p.click('#start')
 p.evaluate('''()=>{const g=__moba.game,v=__moba.presentation;window.present63=v.tick.bind(v);v.tick=()=>{};v.state.elapsed=0;g.step=()=>{};g.time=0;}''')
 p.wait_for_function('__moba.renderer.scene25d.decor.ready');p.wait_for_timeout(100)
 expect(p.locator('body')).to_have_class(__import__('re').compile('match-intro'))
 assert p.locator('.hud').evaluate('(e)=>getComputedStyle(e).visibility')=='hidden'
 assert p.locator('#augment-tray').evaluate('(e)=>getComputedStyle(e).visibility')=='hidden'
 assert p.locator('#shop-toggle').evaluate('(e)=>getComputedStyle(e).visibility')=='hidden'
 assert p.evaluate('__moba.game.hidden(__moba.game.player)&&__moba.game.hidden(__moba.game.units.find(e=>e.kind==="neutral"))')
 p.screenshot(path=str(art/f'v63-black-frame{suffix}.png'));p.evaluate('present63(.15,__moba.game)');p.wait_for_timeout(80);p.screenshot(path=str(art/f'v63-black-reveal{suffix}.png'));p.evaluate('present63(.15,__moba.game)');p.wait_for_timeout(80)
 assert p.evaluate("document.fonts.check('700 32px \"City Tactical\"')")
 p.screenshot(path=str(art/f'v63-briefing{suffix}.png'))
 p.evaluate('present63(1.15,__moba.game)');p.wait_for_timeout(100);p.screenshot(path=str(art/f'v63-smoke-dissolve{suffix}.png'))
 p.evaluate('present63(.35,__moba.game)');p.wait_for_timeout(100);p.screenshot(path=str(art/f'v63-rain-before-spawn{suffix}.png'))
 assert p.evaluate('__moba.game.hidden(__moba.game.units.find(e=>e.kind==="neutral"))&&__moba.game.time===0')
 p.evaluate('present63(.2,__moba.game)');p.wait_for_timeout(100);assert p.evaluate('!__moba.game.hidden(__moba.game.units.find(e=>e.kind==="neutral"))');p.screenshot(path=str(art/f'v63-rain-creep-spawn{suffix}.png'))
 p.evaluate('present63(.65,__moba.game)');p.wait_for_timeout(100);p.screenshot(path=str(art/f'v63-rain-camera-travel{suffix}.png'))
 p.evaluate('present63(.25,__moba.game)');p.wait_for_timeout(100);assert p.evaluate('!__moba.game.presentation&&__moba.game.time===0');p.screenshot(path=str(art/f'v63-rain-match{suffix}.png'))
 expect(p.locator('#jamila-ammo')).to_have_text('16 | 16');assert p.locator('.hud').evaluate('(e)=>getComputedStyle(e).visibility')=='visible'
 # Inventory and an already open shop stay hidden until the ending completes.
 p.click('#shop-toggle');expect(p.locator('#shop')).to_be_visible();p.evaluate('__moba.game.kill(__moba.game.units.find(e=>e.kind==="core"&&e.team===1),__moba.game.player)');p.wait_for_function('__moba.game.presentation?.type==="outro"');p.wait_for_timeout(100)
 for selector in ['#augment-tray','#shop','#shop-toggle']:assert p.locator(selector).evaluate('(e)=>getComputedStyle(e).visibility')=='hidden'
 p.screenshot(path=str(art/f'v63-outro-no-items{suffix}.png'));p.evaluate('present63(1.59,__moba.game)');p.wait_for_timeout(100);expect(p.locator('#result')).to_be_hidden();assert p.locator('#augment-tray').evaluate('(e)=>getComputedStyle(e).visibility')=='hidden'
 p.evaluate('present63(.01,__moba.game)');p.wait_for_function('__moba.mode==="result"');p.wait_for_timeout(100);assert p.locator('#augment-tray').evaluate('(e)=>getComputedStyle(e).visibility')=='visible'
 # Return to the menu and open training: no briefing or weather state survives.
 p.click('#restart');p.click('#practice-back');p.click('#training-open');p.click('.champion-option[data-key="jamila"]');p.click('#start')
 p.wait_for_function('__moba.game.training');assert not p.evaluate('!!__moba.game.presentation')
 if '접기'in p.locator('#training-panel-toggle').inner_text():p.click('#training-panel-toggle')
 p.evaluate('''()=>{const g=__moba.game;window.step63=g.step.bind(g);g.step=()=>{};window.advance63=s=>{for(let i=0;i<Math.round(s*120);i++)step63(1/120);};
 window.fixture63=()=>{const g=__moba.game,p=g.player;g.time+=10;g.units=[p];g.events=[];g.pending=[];g.projectiles=[];g.effects=[];g.zones=[];g.corpses=[];g.practice.lineStopped=true;g.pings=[];g.pingReady=0;
 g.map={bounds:{x:0,y:0,w:83.2,h:46.8},walls:[]};g.bounds=g.map.bounds;g.aiChampion=g.aiMinion=g.aiNeutral=g.aiStructure=()=>{};
 Object.assign(p,{x:20,y:23,hp:p.maxHp,ammo:g.ammoCap(p),lastDamageAt:999,lastAttackAt:999,attackCd:0,qCd:0,rCd:0,attackAt:-99,attackSerial:0,state:{},status:{},shields:[],buffs:{},buffHistory:{},buffPotency:{},visuals:{},channelUntil:0});delete p.motion;delete p.recall;g.input={x:0,y:0,aim:{x:28,y:23},fire:false};};fixture63();}''')
 p.wait_for_timeout(150);p.screenshot(path=str(art/f'v63-jamila-two-hands{suffix}.png'))
 # Input is sampled in the real 30-Hz game loop as well as the smaller test step.
 p.evaluate('''()=>{const g=__moba.game;g.input.fire=true;for(let i=0;i<45;i++)step63(1/30);g.input.fire=false;}''');p.wait_for_timeout(150)
 expect(p.locator('#jamila-ammo')).to_have_text('6 | 16')
 assert p.evaluate('__moba.game.projectiles.every(e=>e.damage===65)')
 p.screenshot(path=str(art/f'v63-ammo-fps{suffix}.png'))
 p.evaluate('''()=>{fixture63();const g=__moba.game,p=g.player;p.ammo=1;g.attack(p,{x:28,y:23});advance63(.4);const t=g.makeChampion('faust',1,20);Object.assign(t,{x:25,y:23,hp:10000,maxHp:10000,armor:0});g.cast(p,'q',{x:28,y:23});}''')
 assert p.evaluate('__moba.game.player.ammo===0&&!__moba.game.player.state.lcaReload')
 p.evaluate('advance63(.2)');p.wait_for_timeout(150);expect(p.locator('#jamila-ammo')).to_have_text('6 | 16');assert p.evaluate('__moba.game.player.state.jamilaQ.phase==="slash"');p.screenshot(path=str(art/f'v63-kopis-refill{suffix}.png'))
 p.evaluate('advance63(.6);fixture63();__moba.game.player.ammo=1;__moba.game.attack(__moba.game.player,{x:28,y:23});advance63(.75)');p.wait_for_timeout(100);p.screenshot(path=str(art/f'v63-full-reload{suffix}.png'));p.evaluate('advance63(.75)');assert p.evaluate('__moba.game.player.ammo===16&&!__moba.game.player.state.lcaReload')
 # Browser-generated mouse events, including native back/forward buttons.
 p.evaluate('fixture63()');p.wait_for_timeout(100);session=p.context.new_cdp_session(p);origin=p.url
 def mouse_event(kind,button,mask=0,x=720,y=420):
  session.send('Input.dispatchMouseEvent',{'type':kind,'x':x,'y':y,'button':button,'buttons':mask,'clickCount':1})
 for button,mask,label in [('middle',4,'공격!'),('back',8,'도움!'),('forward',16,'후퇴!')]:
  p.evaluate('__moba.game.time+=1');mouse_event('mousePressed',button,mask);mouse_event('mouseReleased',button)
  assert p.evaluate('__moba.game.pings.at(-1)?.label')==label,(button,p.evaluate('__moba.game.pings'))
  assert p.url==origin
 # A held mouse button without a drag cancels. Dragging sends the same target menu ping.
 p.evaluate('__moba.game.time+=1');count=p.evaluate('__moba.game.pings.length');mouse_event('mousePressed','middle',4);p.wait_for_timeout(330);expect(p.locator('#ping-menu')).to_be_visible();mouse_event('mouseReleased','middle');assert p.evaluate('__moba.game.pings.length')==count
 p.evaluate('__moba.game.time+=1');mouse_event('mousePressed','back',8);p.wait_for_timeout(330);expect(p.locator('#ping-menu')).to_be_visible();p.screenshot(path=str(art/f'v63-side-mouse-ping{suffix}.png'))
 target=p.locator('.ping-choice[data-choice="top"]');box=target.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;mouse_event('mouseMoved','back',8,x,y);expect(target).to_have_class('ping-choice selected');mouse_event('mouseReleased','back',0,x,y);assert p.evaluate('__moba.game.pings.at(-1).label')=='상단 라인 수비!'
 # The side button works while the primary button is already held.
 p.evaluate('__moba.game.time+=1');mouse_event('mousePressed','left',1);mouse_event('mousePressed','forward',17);mouse_event('mouseReleased','forward',1);mouse_event('mouseReleased','left');assert p.evaluate('__moba.game.pings.at(-1).label')=='후퇴!'
 # Pausing cancels a held gesture and prevents new mouse pings.
 p.evaluate('__moba.game.time+=1');count=p.evaluate('__moba.game.pings.length');mouse_event('mousePressed','middle',4);p.keyboard.press('Escape');mouse_event('mouseReleased','middle');assert p.evaluate('__moba.game.pings.length')==count;assert not p.evaluate('__moba.paused');p.keyboard.press('Escape');expect(p.locator('#pause-banner')).to_be_visible();p.click('#resume')
 # Separate passive sections in the codex, with no exclusive effects on other skill tabs.
 p.keyboard.press('Escape');p.click('#pause-archive');p.click('.archive-champion[data-key="jamila"]');expect(p.locator('.champion-exclusive')).to_contain_text('고위험 작전용 장비');p.screenshot(path=str(art/f'v63-jamila-codex{suffix}.png'))
 p.click('#skill-tab-1');expect(p.locator('.champion-exclusive')).to_have_count(0);expect(p.locator('#skill-description')).to_contain_text('0.15초');expect(p.locator('#skill-description')).to_contain_text('65');expect(p.locator('#skill-description')).to_contain_text('60%');expect(p.locator('#skill-description')).to_contain_text('1.5초')
 p.click('.archive-champion[data-key="kim"]');expect(p.locator('#skill-description')).to_contain_text('1.2%');expect(p.locator('.champion-exclusive')).to_contain_text('본국검술');p.screenshot(path=str(art/f'v63-kim-codex{suffix}.png'))
 p.click('.archive-champion[data-key="faust"]');expect(p.locator('.champion-exclusive')).to_have_count(0)
 # Compact HUD keeps the FPS counter visible on mobile.
 p.click('#codex-back');p.click('#resume');p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(150);expect(p.locator('#jamila-ammo')).to_be_visible();assert p.evaluate("(()=>{const r=document.createRange();r.selectNodeContents(document.querySelector('#kda'));return r.getBoundingClientRect().right<=document.querySelector('#jamila-ammo').getBoundingClientRect().left;})()");p.screenshot(path=str(art/f'v63-mobile-ammo{suffix}.png'))
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'offline':offline,'briefing':True,'blackReveal':True,'embeddedTacticalFont':True,'persistentRain':True,'itemsHiddenDuringIntroAndOutro':True,'twoHands':True,'fpsAmmo':True,'tacticalRefill':True,'reload':True,'nativeMousePings':True,'heldDragAndCancel':True,'exclusivePassiveSections':True,'mobile':True,'errors':errors},ensure_ascii=False));b.close()
