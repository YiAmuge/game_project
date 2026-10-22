"""Real held-input, quick casts, summon placement and all changed effect renderers."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
art=Path(__file__).resolve().parents[1]/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.21.0');page.click('#training-open');page.get_by_role('button',name='히스클리프 선택',exact=True).click();page.click('#start')
    def fixture():
        page.evaluate('''()=>{const g=__moba.game,p=g.player;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};g.map={bounds:g.bounds,walls:[]};g.units=[p];g.effects=[];g.events=[];g.pending=[];g.zones=[];g.projectiles=[];g.minionQueue=[];g.practice.lineStopped=true;g.practice.invincible=false;g.practice.noCooldown=false;g.practice.infiniteAmmo=false;p.state={};p.status={};p.buffs={};delete p.motion;Object.assign(p,{x:40,y:20,qCd:0,rCd:0,lastAttackAt:1000,lastDamageAt:1000,attackCd:0});const t=g.makeChampion('faust',1,9);Object.assign(t,{x:44,y:20,level:10,maxHp:100000,hp:100000,lastAttackAt:1000,lastDamageAt:1000});window.__target=t;}''')
    def change(key):
        page.select_option('#training-champion',key);page.click('#training-change-champion');fixture()
    def aim(x,y):
        v=page.evaluate('([x,y])=>{const r=__moba.renderer;r.resize();r.follow(__moba.game,true);const s=r.camera.worldToScreen({x,y}),b=r.canvas.getBoundingClientRect();return {x:s.x+b.left,y:s.y+b.top};}',[x,y]);page.mouse.move(v['x'],v['y'])
    def right(x,y):
        aim(x,y);page.mouse.down(button='right');page.mouse.up(button='right')
    fixture();aim(46,20);page.mouse.down(button='right');page.wait_for_function('__moba.game.player.state.chargeAt!==undefined');page.wait_for_timeout(1650)
    assert page.evaluate('__moba.game.player.x===40&&!__moba.game.player.motion')
    expect(page.locator('#q-btn span')).to_contain_text('100%');page.screenshot(path=str(art/'v21-heath-held-charge.png'))
    page.mouse.up(button='right');page.wait_for_function('__moba.game.player.x>44&&!__moba.game.player.motion');assert page.evaluate('__target.hp<100000')
    # Button hold uses the same release path, including pointer capture.
    fixture();aim(46,20);page.locator('#q-btn').hover();page.mouse.down();page.wait_for_function('__moba.game.player.state.chargeAt!==undefined');page.wait_for_timeout(250);page.mouse.up();page.wait_for_function('__moba.game.player.state.chargeAt===undefined&&__moba.game.player.qCd>0')
    fixture();aim(46,20);page.mouse.down(button='right');page.wait_for_timeout(150);page.keyboard.press('Escape');page.mouse.up(button='right');assert page.evaluate('__moba.game.player.x===40&&__moba.game.player.qCd===0')
    change('yan');right(45,20);page.wait_for_function('__moba.game.player.state.yanBarrage');page.wait_for_function('__moba.game.player.state.yanInstantUntil>__moba.game.time');aim(44,20);page.mouse.down();page.mouse.up();page.wait_for_function('__moba.game.effects.some(f=>f.type==="yanSword"&&f.progress===1)')
    page.evaluate('__moba.game.player.state.ominous=6');page.locator('#arena').focus();page.keyboard.press('Space');page.wait_for_function('__moba.game.player.state.yanActive');right(45,20);assert page.evaluate('!__moba.game.targeting');page.wait_for_function('__moba.game.effects.some(f=>f.type==="yanSwordWarning")')
    change('don');right(46,20);page.wait_for_function('__moba.game.player.state.donBarrage');page.screenshot(path=str(art/'v21-don-straight-barrage.png'));right(46,20);page.locator('#arena').focus();page.keyboard.press('Space');assert page.evaluate('!__moba.game.targeting&&__moba.game.player.motion')
    change('gubo');aim(44,20);page.locator('#arena').focus();page.keyboard.press('Space');page.wait_for_function('__moba.game.player.state.guboAim');page.wait_for_function('__moba.game.effects.some(f=>f.type==="guboLaser")');page.screenshot(path=str(art/'v21-gubo-laser.png'))
    change('marton');right(44,20);page.locator('#arena').focus();page.keyboard.press('Space');page.wait_for_function('__moba.game.player.state.fairy');page.screenshot(path=str(art/'v21-marton-wooden-hammer.png'))
    change('honglu');right(44,20);page.keyboard.down('KeyD');page.wait_for_timeout(400);page.keyboard.up('KeyD');page.screenshot(path=str(art/'v21-honglu-insight.png'));page.wait_for_function('!__moba.game.player.state.insightUntil')
    aim(44,20);page.keyboard.press('Space');page.wait_for_function('__moba.game.targeting?.slot==="r"');page.mouse.down();page.mouse.up();page.wait_for_function('__moba.game.zones.some(z=>z.kind==="waterfall"&&z.moving)');page.keyboard.press('Space');page.wait_for_function('__moba.game.zones.some(z=>z.kind==="waterfall"&&!z.moving)');assert page.evaluate('!__moba.game.targeting')
    change('hohenheim');aim(44,20);page.locator('#arena').focus();page.keyboard.press('Space');page.mouse.down();page.mouse.up();page.wait_for_function('__moba.game.zones.some(z=>z.kind==="electricDevice"&&z.targetId)');page.evaluate('__moba.game.kill(__target,__moba.game.player)');page.wait_for_function('__moba.game.zones.some(z=>z.waitingForTarget)');page.screenshot(path=str(art/'v21-centipede-waiting.png'))
    change('queequeg');page.evaluate('''()=>{const g=__moba.game,a=g.makeChampion('yi',0,8);Object.assign(a,{x:44,y:20});window.__ally=a;g.units=g.units.filter(t=>t!==__target); }''');right(44,20);page.wait_for_function('__moba.game.player.state.tether');page.locator('#arena').focus();page.keyboard.press('Space');page.wait_for_function('__moba.game.buff(__ally,"queequegUlt")');page.screenshot(path=str(art/'v21-queequeg-rope.png'))
    # Real two-step summon flow, cancel and both teams, duplicate keys.
    page.evaluate('''()=>{const g=__moba.game;g.units=[g.player];g.events=[];g.zones=[];g.projectiles=[];}''')
    expect(page.locator('#training-ai')).not_to_be_checked();page.click('#training-summon');expect(page.locator('#training-summon-dialog')).to_be_visible();page.select_option('#summon-champion','outis');page.click('#summon-confirm');expect(page.locator('#summon-name')).to_have_text('오티스');page.click('#summon-reselect');expect(page.locator('#summon-selection')).to_be_visible();page.click('#summon-confirm');page.click('#summon-enemy');page.wait_for_function('__moba.globalTarget');page.click('#global-cancel');assert page.evaluate('__moba.game.champions().length===1')
    def summon(team,x,y):
        page.click('#training-summon');page.select_option('#summon-champion','outis');page.click('#summon-confirm');page.click('#summon-'+team)
        box=page.locator('#target-map').bounding_box();bounds=page.evaluate('__moba.game.bounds');page.mouse.click(box['x']+(x-bounds['x'])/bounds['w']*box['width'],box['y']+(y-bounds['y'])/bounds['h']*box['height']);page.wait_for_function('!__moba.globalTarget')
    summon('ally',42,20);summon('enemy',46,20)
    assert page.evaluate('__moba.game.champions().filter(e=>e.trainingSummoned&&e.key==="outis").length===2&&__moba.game.champions().some(e=>e.trainingSummoned&&e.team===1)')
    page.wait_for_timeout(200);assert page.evaluate('__moba.game.champions().filter(e=>e.trainingSummoned).every(e=>e.totalDamage===0)')
    page.check('#training-ai');page.wait_for_function('__moba.game.champions().some(e=>e.trainingSummoned&&e.totalDamage>0)');page.screenshot(path=str(art/'v21-training-summoned-ai.png'));page.uncheck('#training-ai')
    # Summoning is available while dead.
    page.click('#training-life');page.wait_for_function('!__moba.game.player.alive');summon('enemy',49,23);assert page.evaluate('__moba.game.champions().filter(e=>e.trainingSummoned).length===3')
    page.set_viewport_size({'width':390,'height':844});page.click('#training-panel-toggle');expect(page.locator('#training-options')).to_be_hidden();page.click('#training-panel-toggle');expect(page.locator('#training-summon')).to_be_visible();page.screenshot(path=str(art/'v21-training-mobile-options.png'))
    assert not errors,errors;print(json.dumps({'version':'0.21.0','held_input':'passed','quick_casts':'passed','effects':'passed','summon_and_ai':'passed','dead_and_mobile':'passed','errors':errors},ensure_ascii=False));browser.close()
