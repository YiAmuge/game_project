"""Regression for Gubo's standard LMB/Space allied attacks; no modifier keys are used."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5173')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.9.1')
    page.click('#practice-open');page.get_by_role('button',name='구보 선택').click();page.click('#start')
    def setup(hp=420):
        page.evaluate('''hp=>{const g=__moba.game;for(const name of ['aiChampion','aiMinion','aiStructure','aiNeutral'])g[name]=()=>{};const p=g.player;Object.assign(p,{x:40,y:7,ammo:3,attackCd:0,rCd:0,qCd:0,channelUntil:0});p.buffs={};g.units=[p];g.projectiles=[];g.minionQueue=[];g.events=[];g.effects=[];g.input.fire=false;const a=g.makeChampion('faust',0,4);Object.assign(a,{x:44,y:7,hp,maxHp:2000,lastDamageAt:g.time});window.__ally=a;}''',hp)
        page.wait_for_timeout(70)
    def aim(x=44,y=7):
        point=page.evaluate('([x,y])=>__moba.renderer.camera.worldToScreen({x,y})',[x,y]);page.mouse.move(point['x'],point['y']);return point
    def fire(x=44,y=7):
        point=aim(x,y);page.mouse.click(point['x'],point['y'])
    def tactical():
        point=aim();page.mouse.click(point['x'],point['y'],button='right')
    setup();fire();page.wait_for_function('__ally.hp<420');assert page.evaluate('__ally.alive')
    page.screenshot(path=str(art/'gubo-standard-lmb-ally.png'))
    setup(421);fire();page.wait_for_timeout(350);assert page.evaluate('__ally.hp')==421
    setup(700);point=aim();page.mouse.click(point['x'],point['y'],button='right')
    assert page.evaluate('__moba.game.buff(__moba.game.player,"guboReload")')
    fire();page.wait_for_function('__ally.hp<700');assert page.evaluate('__ally.alive')
    setup(351);page.evaluate('__ally.maxHp=1000');aim();tactical();fire();page.wait_for_timeout(350)
    assert page.evaluate('__ally.hp')==351
    setup();aim();page.keyboard.press('Space')
    assert page.evaluate('__moba.game.player.state.guboAim.target===__ally');assert page.evaluate('__ally.hp')==420
    page.wait_for_timeout(450);page.screenshot(path=str(art/'gubo-standard-space-ally.png'))
    page.wait_for_function('!__ally.alive',timeout=3000)
    assert page.evaluate('__moba.game.kills[0]')==0
    setup(700);aim();tactical();page.keyboard.press('Space')
    assert page.evaluate('__moba.game.player.state.guboAim.target===__ally')
    page.wait_for_function('__ally.hp<700',timeout=3000)
    setup(421);aim();page.keyboard.press('Space');assert page.evaluate('__moba.game.player.rCd')==0
    assert not errors,errors
    browser.close();print(json.dumps({'status':'passed','checks':['ordinary LMB hits 21% ally without Ctrl','21%+ protected','Q permits 35% basic hit','35%+ protected','ordinary Space aims and kills ally without Ctrl','Q permits 35% ultimate target','invalid ally preserves cooldown'],'page_errors':errors},ensure_ascii=False))
