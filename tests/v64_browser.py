"""Desktop HUD, native side buttons, readable numbers and both rooftop edges."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.getenv('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[]
 p.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',str(e),flush=True)));p.on('request',lambda r:requests.append(r.url))
 if offline:
  p.route('http*://**/*',lambda r:r.abort());p.set_content((root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)'),wait_until='networkidle',timeout=60000)
 else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
 p.click('#training-open');p.click('#start');p.wait_for_function('__moba.game.training');p.click('#training-panel-toggle')
 p.evaluate('''()=>{const g=__moba.game;window.stepPC64=g.step.bind(g);g.step=()=>{};g.time=20;g.units=[g.player];g.events=[];g.effects=[];g.projectiles=[];g.pending=[];g.practice.lineStopped=true;Object.assign(g.player,{x:30,y:23,hp:g.player.maxHp,attackCd:0,qCd:0,rCd:0,state:{},status:{}});g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;}''');p.wait_for_timeout(200)
 expect(p.locator('.underbar')).to_be_hidden();expect(p.locator('#field-title')).to_be_hidden();assert not p.evaluate('__moba.mobile.enabled')
 mini=p.locator('#minimap').bounding_box();assert mini['y']<30 and mini['width']>=220 and mini['height']>=140
 recall=p.locator('#recall-btn').bounding_box();shop=p.locator('#shop-toggle').bounding_box();assert recall['y']+recall['height']<=shop['y'] and abs(recall['x']-shop['x'])<1
 assert p.locator('.field-top>div').bounding_box()['x']>mini['x']+mini['width']
 # Three damage/healing types use real simulation effects and an upright black stroke.
 p.evaluate('''()=>{const g=__moba.game,p=g.player;for(const[x,kind]of[[29,'normal'],[32,'fixed'],[35,'heal']]){const t=g.makeChampion('faust',kind==='heal'?0:1,20+g.nextId);Object.assign(t,{x,y:23,maxHp:10000,hp:kind==='heal'?9800:10000,armor:0});if(kind==='heal')g.heal(p,t,173,false);else g.deal(p,t,kind==='fixed'?137:220,{fixed:kind==='fixed'});} }''');p.wait_for_timeout(100);assert p.evaluate('new Set(__moba.game.effects.filter(e=>e.type==="number").map(e=>e.color)).size===3');p.screenshot(path=str(art/f'v64-readable-combat-numbers{suffix}.png'))
 # Native middle / back / forward buttons keep keyboard semantics and do not navigate.
 session=p.context.new_cdp_session(p);url=p.url
 for name,mask,label in [('middle',4,'공격!'),('back',8,'후퇴!'),('forward',16,'도움!')]:
  p.evaluate('__moba.game.time+=1');session.send('Input.dispatchMouseEvent',{'type':'mousePressed','x':700,'y':420,'button':name,'buttons':mask,'clickCount':1});session.send('Input.dispatchMouseEvent',{'type':'mouseReleased','x':700,'y':420,'button':name,'buttons':0,'clickCount':1});assert p.evaluate('__moba.game.pings.at(-1).label')==label;assert p.url==url
 p.screenshot(path=str(art/f'v64-desktop-hud{suffix}.png'))
 # The same renderer can switch from training to match and still show the skyline/facade.
 p.keyboard.press('Escape');p.click('#leave');p.click('#practice-back');p.click('#practice-open');p.click('#start');p.wait_for_function('!__moba.game.presentation');p.evaluate('''()=>{const g=__moba.game;window.stepMatch64=g.step.bind(g);g.step=()=>{};g.player.x=35.36;g.player.y=7.15;}''');p.wait_for_timeout(250);p.screenshot(path=str(art/f'v64-visible-upper-skyline{suffix}.png'))
 scene=p.evaluate('''()=>{const r=__moba.renderer.scene25d;return{background:r.rooftop.background.children.map(e=>e.name),walls:r.rooftop.group.children.filter(e=>e.name==='skyscraper-windows').length};}''');assert scene['background']==['crimson-city-backdrop'] and scene['walls']>=20
 assert p.evaluate('__moba.game.units.filter(e=>e.kind==="neutral").length===12&&!__moba.game.units.some(e=>e.campId==="side-south")')
 p.evaluate('__moba.game.player.y=39.65');p.wait_for_timeout(200);p.screenshot(path=str(art/f'v64-visible-lower-facade{suffix}.png'))
 p.evaluate('__moba.game.time=90;stepMatch64(.001);__moba.game.player.y=-.2');p.wait_for_timeout(180);assert p.evaluate('__moba.game.units.filter(e=>e.camp==="needle").every(e=>Math.hypot(e.x-35.36,e.y+3.8)>2)');assert p.evaluate('__moba.game.campTimers({upcoming:true}).some(e=>e.upcoming&&e.seconds===120)');p.screenshot(path=str(art/f'v64-north-king-timer{suffix}.png'))
 p.evaluate('__moba.game.time=209.99;stepMatch64(.01)');assert p.evaluate('__moba.game.sewingKingSpawned&&__moba.game.units.some(e=>e.camp==="sewingKing"&&e.alive)');p.screenshot(path=str(art/f'v64-king-spawn-0330{suffix}.png'))
 # Current codex text has the new numbers and no fixed-damage claim for Jamila.
 p.keyboard.press('Escape');p.click('#pause-archive');p.click('.archive-champion[data-key="jamila"]');expect(p.locator('#skill-description')).to_contain_text('7.5%');assert '고정피해'not in p.locator('#skill-description').inner_text();expect(p.locator('.champion-exclusive')).to_contain_text('15초');p.click('#skill-tab-1');expect(p.locator('#skill-description')).to_contain_text('55%');expect(p.locator('#skill-description')).to_contain_text('50')
 p.click('.archive-champion[data-key="don"]');expect(p.locator('#skill-description h3').first).to_have_text('정의를 위해!');p.click('#skill-tab-2');expect(p.locator('#skill-description')).to_contain_text('1.2초');expect(p.locator('#skill-description')).to_contain_text('8초');p.screenshot(path=str(art/f'v64-current-champion-codex{suffix}.png'))
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'offline':offline,'combatNumbers':True,'desktopHud':True,'nativeMouseRemap':True,'skylineAndFacade':True,'southTerrace':True,'kingTimer':True,'king0330':True,'currentCodex':True,'errors':errors}));b.close()
