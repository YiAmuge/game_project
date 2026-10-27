"""New timers, training scenery, state visuals, friendly execution and reference fairy."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.environ.get('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
 if offline:
  p.route('http*://**/*',lambda r:r.abort());html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)');p.set_content(html,wait_until='networkidle',timeout=60000)
 else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
 p.click('#training-open');p.click('#start');p.wait_for_function('__moba.renderer.scene25d.decor.ready');p.click('#training-panel-toggle')
 assert p.evaluate('__moba.renderer.scene25d.rooftop.background.children.length')==0
 assert p.evaluate('!__moba.renderer.scene25d.world.getObjectByName("skyscraper-windows")')
 smoke=p.evaluate('__moba.renderer.scene25d.decor.smokeGroup.children.length');assert smoke>20
 p.evaluate('''()=>{const g=__moba.game;window.step58=g.step.bind(g);g.step=()=>{};window.advance58=s=>{for(let n=0;n<Math.round(s*120);n++)step58(1/120);};g.player.x=41;g.player.y=7;}''');p.wait_for_timeout(250);p.screenshot(path=str(art/f'v58-training-smoke{suffix}.png'))
 p.click('#training-panel-toggle')
 def choose(key):
  p.click('#training-change-champion');p.locator(f'.training-pick-option[data-key="{key}"]').click();p.click('#training-pick-confirm');p.wait_for_function(f'__moba.game.player.key==="{key}"')
  p.evaluate('''()=>{const g=__moba.game,p=g.player;Object.assign(p,{x:20,y:23,hp:p.maxHp,attackCd:0,qCd:0,rCd:0,status:{},buffs:{},state:{},lastDamageAt:999,lastAttackAt:999});g.units=[p];g.projectiles=[];g.events=[];g.pending=[];g.zones=[];g.effects=[];g.time=10;g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:90,h:60},walls:[]};g.bounds=g.map.bounds;g.aiChampion=g.aiNeutral=g.aiMinion=g.aiStructure=()=>{};g.input.aim={x:30,y:23};}''')
 choose('gubo')
 p.evaluate('''()=>{const g=__moba.game,t=g.makeChampion('faust',0,20);Object.assign(t,{x:30,y:23,hp:200,maxHp:1000,armor:0,lastDamageAt:999,lastAttackAt:999});window.target58=t;g.cast(g.player,'r',t);advance58(.6);}''');p.wait_for_timeout(100);p.screenshot(path=str(art/f'v58-gubo-aim{suffix}.png'))
 p.evaluate('''()=>{const g=__moba.game;window.protected58=g.deal({kind:'neutral',team:2},target58,10000,{fixed:true})===0;g.heal(null,target58,9999,false);advance58(.6);}''')
 assert p.evaluate('protected58&&target58.alive&&__moba.game.projectiles.some(p=>p.guboUltimate)')
 p.evaluate('advance58(.025)');p.wait_for_timeout(60);p.screenshot(path=str(art/f'v58-gubo-flight{suffix}.png'))
 assert p.evaluate('target58.alive')
 p.evaluate('advance58(.1)');assert p.evaluate('!target58.alive&&Math.abs((target58.respawnAt-target58.lastDeath.time)-Math.min(23,Math.ceil(6+1.356*(.8*target58.lastDeath.time/60+1.2*(target58.level-1))))*.25)<1e-5')
 # Disarm applies a gray filter only to weapon atlas draws; silence has a graphic icon.
 choose('hohenheim');p.evaluate('''()=>{window.grayDraws58=0;window.text58=[];const draw=CanvasRenderingContext2D.prototype.drawImage,text=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.drawImage=function(...a){if(this.filter.includes('grayscale(1)'))grayDraws58++;return draw.apply(this,a);};CanvasRenderingContext2D.prototype.fillText=function(s,...a){text58.push(String(s));return text.call(this,s,...a);};const g=__moba.game;g.status(g.player,'disarm',1,4);g.status(g.player,'silence',1,4);}''');p.wait_for_function('grayDraws58>0');p.wait_for_timeout(80);p.screenshot(path=str(art/f'v58-disarm-silence{suffix}.png'));assert not p.evaluate('text58.some(s=>/전류|검 충전|충전 [0-9]/.test(s))')
 choose('honglu');p.evaluate('''()=>{const g=__moba.game;g.player.upgrades.health=1;g.player.maxHp=g.maxHp(g.player);g.player.hp=100;const a=g.makeChampion('faust',0,20);Object.assign(a,{x:22,y:23,hp:100,maxHp:3000});g.cast(g.player,'r',g.player);advance58(.5);}''');assert p.evaluate('__moba.game.effects.some(f=>f.type==="hongluWaterfall")');p.wait_for_timeout(80);p.screenshot(path=str(art/f'v58-waterfall{suffix}.png'))
 choose('rudolph');p.evaluate('''()=>{const g=__moba.game;g.attack(g.player,{x:25,y:23});}''');assert p.evaluate('__moba.game.effects.some(f=>f.type==="rudolphField")');p.wait_for_timeout(60);p.screenshot(path=str(art/f'v58-rudolph-field{suffix}.png'))
 choose('marton');p.evaluate('''()=>{const g=__moba.game;g.cast(g.player,'r',g.player);}''');p.wait_for_timeout(250);p.screenshot(path=str(art/f'v58-fairy-ultimate{suffix}.png'))
 p.evaluate('''()=>{const g=__moba.game;g.kill(g.player,g.player);}''');p.wait_for_timeout(150);p.screenshot(path=str(art/f'v58-fairy-bait{suffix}.png'));assert p.evaluate('__moba.game.units.some(e=>e.kind==="bait")')
 p.click('#pause');p.click('#leave');p.click('#practice-back');p.click('#practice-open');p.click('#start');p.wait_for_function('__moba.mode==="playing"&&!__moba.game.training')
 p.evaluate('''()=>{const g=__moba.game;window.text58=[];window.stepMatch58=g.step.bind(g);g.step=()=>{};g.units=g.units.filter(e=>e===g.player);g.events=[];g.projectiles=[];g.zones=[];g.effects=[];g.player.x=24;g.player.y=17;const n=g.makeNeutral(24,20,'amplify');g.kill(n,g.player);}''');p.wait_for_timeout(150);p.screenshot(path=str(art/f'v58-camp-timer{suffix}.png'));assert not p.evaluate('text58.some(s=>/재생성|0:45|르루주.*캠프/.test(s))')
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'smokeMeshes':smoke,'trainingBackground':False,'wardAndExecution':True,'grayWeapon':True,'chargeText':False,'fairy':True,'errors':errors,'offline':offline},ensure_ascii=False));b.close()
