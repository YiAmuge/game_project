"""Persistent training panel, collapse behavior, all controls, hazard and ordinary match isolation."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=b.new_page(viewport={'width':1440,'height':900});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.21.0');expect(page.locator('#training-panel')).to_be_hidden()
    page.click('#training-open');page.get_by_role('button',name='소라 선택').click();page.click('#start')
    assert page.evaluate('__moba.game.training&&__moba.game.champions().every(e=>e.player||e.trainingDummy)')
    expect(page.locator('#phase')).to_contain_text('시간 제한 없음')
    expect(page.locator('#training-panel')).to_be_visible();expect(page.locator('#shop')).to_be_hidden()
    assert page.locator('#shop #training-options').count()==0
    panel=page.locator('#training-panel').bounding_box();assert panel['x']>1000 and panel['y']<100
    page.check('#training-invincible');page.click('#training-panel-toggle')
    expect(page.locator('#training-options')).to_be_hidden();expect(page.locator('#training-panel-toggle')).to_have_attribute('aria-expanded','false')
    assert page.locator('#training-panel').bounding_box()['height']<60
    page.click('#training-panel-toggle');expect(page.locator('#training-invincible')).to_be_checked()
    for control in ['training-no-cooldown','training-infinite-ammo']:page.check('#'+control)
    page.screenshot(path=str(art/'v18-training-persistent-panel.png'))
    # Every option is available while the shop is closed, including death and revival.
    page.click('#training-life');page.wait_for_function('!__moba.game.player.alive')
    expect(page.locator('#training-life')).to_have_text('즉시 부활')
    page.keyboard.press('g');expect(page.locator('#shop')).to_be_visible()
    for _ in range(3):page.click('#buy-power');page.wait_for_timeout(280)
    gold=page.evaluate('__moba.game.player.gold');page.click('#augment-power15');page.wait_for_timeout(280)
    assert page.evaluate('__moba.game.player.augments.includes("power15")')
    assert page.evaluate('__moba.game.player.gold')-gold<2
    page.click('#training-sell-all');page.wait_for_timeout(280)
    assert page.evaluate('__moba.game.player.augments.length===0&&Object.values(__moba.game.player.upgrades).every(n=>n===0)')
    page.click('#shop-close');page.click('#training-life');page.wait_for_function('__moba.game.player.alive')
    page.select_option('#training-champion','rudolph');page.click('#training-change-champion')
    assert page.evaluate('__moba.game.player.key')=='rudolph'
    page.evaluate('__moba.game.player.ammo=0');page.wait_for_function('__moba.game.player.ammo===__moba.game.ammoCap(__moba.game.player)')
    expect(page.locator('#training-champion option')).to_have_count(31)
    def teleport(x,y):
        if page.locator('#training-panel-toggle').get_attribute('aria-expanded')=='false':page.click('#training-panel-toggle')
        page.click('#training-teleport');expect(page.locator('#global-target')).to_be_visible()
        rect=page.locator('#target-map').bounding_box();bounds=page.evaluate('__moba.game.bounds')
        page.mouse.click(rect['x']+(x-bounds['x'])/bounds['w']*rect['width'],rect['y']+(y-bounds['y'])/bounds['h']*rect['height'])
        expect(page.locator('#global-target')).to_be_hidden()
        assert page.evaluate(f'Math.hypot(__moba.game.player.x-{x},__moba.game.player.y-{y})<.1')
    for name,x,y in [('small-hazard',36,40.5),('camps',65,42),('duel',17,27),('moving-target',55,26),('lane',40,11)]:
        teleport(x,y);page.wait_for_timeout(100);page.screenshot(path=str(art/f'v18-training-{name}.png'))
    page.click('#training-teleport');page.click('#global-cancel');expect(page.locator('#global-target')).to_be_hidden()
    page.evaluate('const g=__moba.game;g.kill(g.towers(1)[0],g.player)');assert page.evaluate('__moba.game.practice.lineStopped')
    page.click('#training-reset-lane');assert page.evaluate('!__moba.game.practice.lineStopped&&__moba.game.towers(0).length===1&&__moba.game.towers(1).length===1')
    page.evaluate('__moba.game.time=1200;__moba.game.step(.1)');assert page.evaluate('__moba.game.winner===null&&__moba.mode==="playing"')
    # Space on a panel button operates that button instead of casting an ultimate.
    page.locator('#training-panel-toggle').focus();page.keyboard.press('Space')
    expect(page.locator('#training-options')).to_be_hidden();assert page.evaluate('!__moba.game.targeting')
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150)
    assert page.evaluate('document.body.scrollWidth<=innerWidth');assert page.locator('#training-panel').bounding_box()['width']<200
    page.screenshot(path=str(art/'v18-training-mobile-collapsed.png'))
    page.click('#training-panel-toggle');expect(page.locator('#training-options')).to_be_visible()
    box=page.locator('#training-panel').bounding_box();assert box['x']>=0 and box['y']+box['height']<844
    page.screenshot(path=str(art/'v18-training-mobile-expanded.png'))
    page.click('#pause');page.click('#leave');expect(page.locator('#training-panel')).to_be_hidden()
    # A fresh mobile training session starts collapsed and ordinary matches show no panel.
    page.click('#start');expect(page.locator('#training-panel-toggle')).to_have_attribute('aria-expanded','false')
    page.click('#pause');page.click('#leave');page.click('#practice-back');page.click('#practice-open')
    page.get_by_role('button',name='파우스트 선택').click();page.click('#start')
    assert page.evaluate('!__moba.game.training&&__moba.game.champions().length===8')
    expect(page.locator('#training-panel')).to_be_hidden();page.keyboard.press('g');expect(page.locator('#buy-power')).to_contain_text('160')
    assert not errors,errors;b.close()
    print(json.dumps({'status':'passed','checks':['persistent right-hand panel outside shop','collapse preserves settings','all toggles without shop','direct death/revive','free dead shop and sell-all','champion change and infinite Rudolph SP','small right-side hazard and five map zones','teleport cancel and lane reset','no time limit','keyboard panel buttons do not cast skills','mobile collapse, expansion and initial state','ordinary match/menu isolation'],'page_errors':errors},ensure_ascii=False))
