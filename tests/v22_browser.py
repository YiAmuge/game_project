"""Champion effect visibility, first-hit harpoon and live practice metrics/removal controls."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
art=Path(__file__).resolve().parents[1]/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.24.0');page.click('#training-open');page.get_by_role('button',name='이상 선택',exact=True).click();page.click('#start')
    def fixture():
        page.evaluate('''()=>{const g=__moba.game,p=g.player;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};g.map={bounds:g.bounds,walls:[]};g.units=[p];g.effects=[];g.events=[];g.pending=[];g.zones=[];g.projectiles=[];g.minionQueue=[];g.practice.lineStopped=true;p.state={};p.status={};p.buffs={};delete p.motion;Object.assign(p,{x:40,y:20,qCd:0,rCd:0,lastAttackAt:1000,lastDamageAt:1000,attackCd:0});const t=g.makeChampion('faust',1,9);Object.assign(t,{x:45,y:20,level:10,maxHp:100000,hp:100000,lastAttackAt:1000,lastDamageAt:1000});window.__target=t;}''')
    def change(key):
        page.select_option('#training-champion',key);page.click('#training-change-champion');fixture()
    def aim(x,y):
        p=page.evaluate('([x,y])=>{const r=__moba.renderer;r.resize();r.follow(__moba.game,true);const s=r.camera.worldToScreen({x,y}),b=r.canvas.getBoundingClientRect();return {x:s.x+b.left,y:s.y+b.top};}',[x,y]);page.mouse.move(p['x'],p['y'])
    def right(x,y):
        aim(x,y);page.mouse.down(button='right');page.mouse.up(button='right')
    def freeze():page.evaluate('()=>{window.__step=__moba.game.step;__moba.game.step=()=>{};}')
    def unfreeze():page.evaluate('()=>{__moba.game.step=__step;}')
    fixture();page.locator('#arena').focus();page.keyboard.press('Space');page.wait_for_function('__moba.game.buff(__moba.game.player,"ogamdo")');freeze();page.screenshot(path=str(art/'v22-yi-mirror-wings.png'));unfreeze()
    page.evaluate('__moba.game.player.buffs.ogamdo=__moba.game.time');page.wait_for_function('!__moba.game.buff(__moba.game.player,"ogamdo")')
    change('ishmael');aim(48,20);page.locator('#arena').focus();page.keyboard.press('Space');freeze();assert page.evaluate('__moba.game.player.state.ishmaelCast.windupUntil>__moba.game.time&&__moba.game.projectiles.length===0');page.screenshot(path=str(art/'v22-ishmael-harpoon-aim.png'));unfreeze()
    page.wait_for_function('__target.motion?.ishmaelOwner===__moba.game.player.id');freeze();assert page.evaluate('__target.state.harpoon.source===__moba.game.player.id');page.screenshot(path=str(art/'v22-ishmael-hooked-target.png'));unfreeze();page.wait_for_function('!__moba.game.player.state.ishmaelCast')
    # Shock effects follow the moving caster, including movement after activation.
    right(44,20);right(44,20);page.wait_for_function('__moba.game.effects.some(f=>f.type==="ishmaelShock")');page.evaluate('__moba.game.player.y+=1');freeze();page.screenshot(path=str(art/'v22-ishmael-following-shock.png'));unfreeze()
    change('honglu');right(45,20);freeze();page.screenshot(path=str(art/'v22-honglu-clean-countdown.png'));assert page.evaluate('__moba.game.player.state.insightUntil>__moba.game.time');unfreeze()
    change('ryoshu');right(47,20);page.wait_for_function('__moba.game.player.motion');freeze();assert page.evaluate('__moba.game.player.invulnerableUntil>__moba.game.time');page.screenshot(path=str(art/'v22-ryoshu-transparent-dash.png'));unfreeze();page.wait_for_function('!__moba.game.player.motion');aim(46,20);page.keyboard.press('Space');page.mouse.down();page.mouse.up();page.wait_for_function('__moba.game.effects.some(f=>f.type==="ryoshuStorm")');freeze();page.screenshot(path=str(art/'v22-ryoshu-flame-swords.png'));unfreeze()
    change('gubo');right(45,20);aim(45,20);page.mouse.down();page.mouse.up();freeze();page.screenshot(path=str(art/'v22-gubo-blood-palette.png'));unfreeze()
    change('gahwan');right(45,20);page.mouse.down();page.mouse.up();page.wait_for_function('__moba.game.effects.some(f=>f.theme==="gahwan")');freeze();page.screenshot(path=str(art/'v22-gahwan-yellow-red.png'));unfreeze()
    change('marton');aim(45,20);page.screenshot(path=str(art/'v22-marton-two-attack-ranges.png'));page.locator('#arena').focus();page.keyboard.press('Space');page.wait_for_function('__moba.game.player.state.fairy');freeze();page.screenshot(path=str(art/'v22-marton-fairy-channel.png'));unfreeze();page.wait_for_function('__moba.game.effects.some(f=>f.type==="martonExplosion")');freeze();page.screenshot(path=str(art/'v22-marton-outward-shock.png'));unfreeze()
    # Restore the original map and real infinite dummies through the ordinary menu.
    page.click('#pause');page.click('#leave');page.click('#practice-back');page.click('#training-open');page.get_by_role('button',name='뿌이 선택',exact=True).click();page.click('#start')
    page.evaluate('''()=>{const g=__moba.game;Object.assign(g.player,{x:21,y:40,lastDamageAt:1000,lastAttackAt:1000});window.__ally=g.champions().find(e=>e.trainingDummy?.meter?.kind==='healing');window.__enemy=g.champions().find(e=>e.trainingDummy?.meter?.kind==='damage');}''')
    aim(23,40);page.mouse.down();page.mouse.up();page.wait_for_function('__ally.trainingDummy.meter.total>25');assert page.evaluate('__ally.hp===__ally.maxHp&&__ally.trainingDummy.meter.last===__ally.trainingDummy.meter.total')
    page.check('#training-infinite-ammo');page.evaluate('Object.assign(__moba.game.player,{x:24,y:40,attackCd:0})');aim(29,40);page.mouse.down();page.mouse.up();page.wait_for_function('__enemy.trainingDummy.meter.total>100');page.screenshot(path=str(art/'v22-training-damage-healing-meters.png'))
    # Duplicate selection labels and removal, preserving original dummies and the player.
    def summon(key,team,x,y):
        page.click('#training-summon');page.select_option('#summon-champion',key);page.click('#summon-confirm');page.click('#summon-'+team);box=page.locator('#target-map').bounding_box();bounds=page.evaluate('__moba.game.bounds');page.mouse.click(box['x']+x/bounds['w']*box['width'],box['y']+y/bounds['h']*box['height']);page.wait_for_function('!__moba.globalTarget')
    summon('outis','ally',42,23);summon('outis','enemy',46,23);summon('marton','enemy',50,23)
    page.click('#training-remove');page.click('#remove-choose');options=page.locator('#remove-champion option').all_text_contents();assert options==['오티스 1 · 아군','오티스 2 · 적군','마튼 1 · 적군'],options;page.screenshot(path=str(art/'v22-training-remove-one.png'))
    second=page.locator('#remove-champion option').nth(1).get_attribute('value');page.select_option('#remove-champion',second);page.click('#remove-selected');expect(page.locator('#remove-champion option')).to_have_count(2);assert page.evaluate(f'!__moba.game.units.some(e=>e.id==={second})');page.locator('#training-remove-dialog .close-dialog').click()
    page.click('#training-life');page.wait_for_function('!__moba.game.player.alive');page.click('#training-remove');page.click('#remove-all');page.wait_for_function('!__moba.game.units.some(e=>e.trainingSummoned)');assert page.evaluate('__moba.game.champions().filter(e=>e.trainingDummy).length===5&&__moba.game.units.some(e=>e===__moba.game.player)&&!__moba.game.units.some(e=>e.kind==="bait")')
    page.set_viewport_size({'width':390,'height':844});page.click('#training-remove');expect(page.locator('#remove-all')).to_be_disabled();page.screenshot(path=str(art/'v22-training-remove-mobile.png'));page.locator('#training-remove-dialog .close-dialog').click();page.click('#training-panel-toggle');expect(page.locator('#training-options')).to_be_hidden()
    assert not errors,errors;print(json.dumps({'version':'0.24.0','champion_effects':'passed','windup_and_hook':'passed','live_damage_and_healing':'passed','numbered_selection_and_removal':'passed','dead_and_mobile':'passed','errors':errors},ensure_ascii=False));browser.close()
