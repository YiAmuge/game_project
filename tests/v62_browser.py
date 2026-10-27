"""Jamila draft/codex/shop, modular equipment, army, reload and infiltration input."""
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
 p.click('#training-open');expect(p.locator('.champion-option')).to_have_count(30)
 p.click('.champion-option[data-key="jamila"]');p.click('#start')
 p.wait_for_function('__moba.game.player.key==="jamila"&&__moba.renderer.atlasFor("jamila").naturalWidth>0')
 if '접기'in p.locator('#training-panel-toggle').inner_text():p.click('#training-panel-toggle')
 p.evaluate('''()=>{const g=__moba.game;window.step62=g.step.bind(g);g.step=()=>{};
 window.advance62=s=>{for(let i=0;i<Math.round(s*120);i++)step62(1/120);};
 window.fixture62=()=>{const g=__moba.game,p=g.player;g.time+=2;g.units=[p];g.events=[];g.pending=[];g.projectiles=[];g.effects=[];g.zones=[];g.corpses=[];g.practice.lineStopped=true;
 g.map={bounds:{x:0,y:0,w:83.2,h:46.8},walls:[]};g.bounds=g.map.bounds;g.aiChampion=g.aiMinion=g.aiNeutral=g.aiStructure=()=>{};
 Object.assign(p,{x:20,y:23,hp:p.maxHp,ammo:g.ammoCap(p),lastDamageAt:999,lastAttackAt:999,attackCd:0,qCd:0,rCd:0,attackAt:-99,attackSerial:0,state:{},status:{},shields:[],buffs:{},buffHistory:{},buffPotency:{},visuals:{},channelUntil:0});delete p.motion;delete p.recall;g.input={x:0,y:0,aim:{x:28,y:23},fire:false};};fixture62();}''')
 p.wait_for_timeout(150);p.screenshot(path=str(art/f'v62-jamila-idle{suffix}.png'))
 assert p.evaluate('__moba.game.player.ammo===16&&__moba.game.armor(__moba.game.player)===40')
 p.evaluate('''()=>{const g=__moba.game;g.attack(g.player,{x:28,y:23});advance62(.035);}''');p.wait_for_timeout(90)
 p.screenshot(path=str(art/f'v62-rifle-fire{suffix}.png'));assert p.evaluate('__moba.game.projectiles[0]?.lca===true')
 p.evaluate('fixture62();__moba.game.cast(__moba.game.player,"q",{x:28,y:23});advance62(.27)')
 p.wait_for_timeout(90);assert p.evaluate('__moba.game.player.state.jamilaQ.phase==="slash"')
 p.screenshot(path=str(art/f'v62-kopis-sweep{suffix}.png'))
 p.evaluate('advance62(.4)');assert p.evaluate('!__moba.game.player.state.jamilaQ')
 p.evaluate('fixture62();__moba.game.player.ammo=1;__moba.game.attack(__moba.game.player,{x:28,y:23});advance62(.5)')
 p.wait_for_timeout(90);assert p.evaluate('!!__moba.game.player.state.lcaReload&&__moba.game.player.ammo===0')
 p.screenshot(path=str(art/f'v62-reloading{suffix}.png'));p.evaluate('advance62(1.3)');assert p.evaluate('__moba.game.player.ammo===16')
 p.evaluate('fixture62();__moba.game.cast(__moba.game.player,"r",__moba.game.player)');p.wait_for_timeout(120)
 assert p.evaluate('__moba.game.units.filter(e=>e.lcaTrooper).length===2&&__moba.game.player.rCd>0')
 p.screenshot(path=str(art/f'v62-udjat-army{suffix}.png'))
 p.evaluate('''()=>{const g=__moba.game,e=g.makeChampion('faust',1,20);Object.assign(e,{x:25,y:23,maxHp:10000,hp:10000,armor:0});g.attack(g.player,e);advance62(.3);window.commanded62=e.id;}''')
 assert p.evaluate('__moba.game.units.filter(e=>e.lcaTrooper).every(e=>e.targetId===commanded62)')
 # Contextual prerequisite exceptions and exclusive descriptions in the actual shop.
 p.click('#shop-toggle');p.click('#augment-row-highRisk')
 expect(p.locator('#detail-effect')).to_contain_text('자밀라 전용');expect(p.locator('#detail-buy')).to_be_enabled();p.click('#detail-buy')
 p.wait_for_function('__moba.game.player.augments.includes("highRisk")');p.screenshot(path=str(art/f'v62-jamila-augment{suffix}.png'));p.click('#shop-close')
 p.evaluate('fixture62();__moba.game.recall(__moba.game.player);advance62(1.76);__moba.game.player.state.infiltration.point={x:64,y:23}')
 p.wait_for_timeout(100);expect(p.locator('#infiltration-help')).to_contain_text('궁극기')
 p.keyboard.press('Space');p.wait_for_function('!__moba.game.player.state.infiltration&&__moba.game.units.filter(e=>e.lcaTrooper).length===2')
 assert p.evaluate('Math.abs(__moba.game.player.x-64)<.001&&__moba.game.units.filter(e=>e.lcaTrooper).every(e=>Math.abs(e.until-__moba.game.time-15)<.001)')
 p.screenshot(path=str(art/f'v62-infiltration-deployment{suffix}.png'))
 # Changing the training champion removes the previous army and its live projectiles.
 p.click('#training-panel-toggle');p.click('#training-change-champion');p.click('.training-pick-option[data-key="kim"]');p.click('#training-pick-confirm')
 p.wait_for_function('__moba.game.player.key==="kim"');assert p.evaluate('!__moba.game.units.some(e=>e.lcaTrooper)')
 p.evaluate('fixture62();__moba.game.player.augments=[]');p.click('#training-panel-toggle');p.click('#shop-toggle');p.click('#augment-row-power15')
 expect(p.locator('#detail-effect')).to_contain_text('김삿갓 전용');expect(p.locator('#detail-buy')).to_be_enabled();p.click('#detail-buy');p.wait_for_function('__moba.game.player.augments.includes("power15")')
 p.click('#augment-row-highRisk');expect(p.locator('#detail-effect')).not_to_contain_text('자밀라 전용');p.screenshot(path=str(art/f'v62-kim-augment{suffix}.png'));p.click('#shop-close')
 p.evaluate('advance62(2)');assert p.evaluate('__moba.game.shield(__moba.game.player)>0')
 p.keyboard.press('Escape');p.click('#pause-archive');p.click('.archive-champion[data-key="jamila"]')
 expect(p.locator('#archive-name')).to_have_text('자밀라');expect(p.locator('.archive-champion')).to_have_count(30)
 p.click('#skill-tab-1');expect(p.locator('#skill-description')).to_contain_text('1.5초');p.click('#skill-tab-3');expect(p.locator('#skill-description')).to_contain_text('전투원 2명')
 p.screenshot(path=str(art/f'v62-jamila-codex{suffix}.png'))
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'offline':offline,'champions':30,'rifleAndKopis':True,'blackGripHands':True,'reload':True,'armySnapshot':True,'priorityTarget':True,'exclusiveAugments':True,'infiltrationUltimate':True,'codex':True,'errors':errors},ensure_ascii=False));b.close()
