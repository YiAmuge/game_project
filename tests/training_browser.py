"""Menu -> training, all shop options, map placement and return to a regular match."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1]
art=root/'artifacts'
art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=b.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.15.0')
    expect(page.locator('#main-menu .menu-action')).to_have_count(4)
    expect(page.get_by_role('button',name='연습장으로 이동')).to_be_visible()
    page.screenshot(path=str(art/'v15-menu-training-entry.png'))
    page.click('#training-open')
    expect(page.locator('#position-select')).to_be_hidden()
    page.get_by_role('button',name='소라 선택').click()
    page.click('#start')
    assert page.evaluate('__moba.game.training&&__moba.game.champions().every(e=>e.player||e.trainingDummy)')
    expect(page.locator('#phase')).to_contain_text('시간 제한 없음')
    page.screenshot(path=str(art/'v15-training-separated-fountain.png'))
    def shop_options():
        if not page.locator('#shop').is_visible():page.keyboard.press('g')
        page.click('#shop-training-tab')
    def teleport(x,y):
        shop_options();page.click('#training-teleport')
        expect(page.locator('#global-target')).to_be_visible()
        rect=page.locator('#target-map').bounding_box()
        bounds=page.evaluate('__moba.game.bounds')
        page.mouse.click(rect['x']+(x-bounds['x'])/bounds['w']*rect['width'],rect['y']+(y-bounds['y'])/bounds['h']*rect['height'])
        expect(page.locator('#global-target')).to_be_hidden()
        assert page.evaluate(f'Math.hypot(__moba.game.player.x-{x},__moba.game.player.y-{y})<.1')
    shop_options()
    for control in ['training-invincible','training-no-cooldown','training-infinite-ammo']:page.check('#'+control)
    assert page.evaluate('Object.values(__moba.game.practice).filter(v=>v===true).length>=3')
    page.screenshot(path=str(art/'v15-training-options.png'))
    # Death is explicit even with invincibility enabled; dead players can still shop.
    page.click('#training-life')
    page.wait_for_function('!__moba.game.player.alive')
    expect(page.locator('#training-life')).to_have_text('즉시 부활')
    page.click('#shop-supply-tab')
    for _ in range(3):page.click('#buy-power');page.wait_for_timeout(280)
    gold=page.evaluate('__moba.game.player.gold')
    page.click('#augment-power15');page.wait_for_timeout(280)
    assert page.evaluate('__moba.game.player.augments.includes("power15")')
    assert page.evaluate('__moba.game.player.gold')-gold<2
    page.click('#training-sell-all');page.wait_for_timeout(280)
    assert page.evaluate('__moba.game.player.augments.length===0&&Object.values(__moba.game.player.upgrades).every(n=>n===0)')
    page.click('#shop-training-tab');page.click('#training-life')
    page.wait_for_function('__moba.game.player.alive')
    page.select_option('#training-champion','rudolph');page.click('#training-change-champion')
    assert page.evaluate('__moba.game.player.key')=='rudolph'
    page.evaluate('__moba.game.player.ammo=0')
    page.wait_for_function('__moba.game.player.ammo===__moba.game.ammoCap(__moba.game.player)')
    expect(page.locator('#training-champion option')).to_have_count(30)
    page.screenshot(path=str(art/'v15-training-champion-change.png'))
    # Every zone can be reached through the real map overlay.
    for name,x,y in [('hazard',19,38),('camps',65,42),('duel',17,27),('moving-target',55,26),('lane',40,11)]:
        teleport(x,y);page.wait_for_timeout(150);page.screenshot(path=str(art/f'v15-training-{name}.png'))
    shop_options();page.click('#training-teleport');expect(page.locator('#global-cancel')).to_be_visible();page.click('#global-cancel');expect(page.locator('#global-target')).to_be_hidden()
    # Tower destruction halts the lane and its reset button restores both towers.
    page.evaluate('const g=__moba.game;g.kill(g.towers(1)[0],g.player)')
    assert page.evaluate('__moba.game.practice.lineStopped')
    shop_options();page.click('#training-reset-lane')
    assert page.evaluate('!__moba.game.practice.lineStopped&&__moba.game.towers(0).length===1&&__moba.game.towers(1).length===1')
    page.evaluate('__moba.game.time=1200;__moba.game.step(.1)')
    assert page.evaluate('__moba.game.winner===null&&__moba.mode==="playing"')
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200)
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    page.screenshot(path=str(art/'v15-training-mobile-options.png'))
    page.click('#shop-close');page.click('#pause');page.click('#leave');page.click('#practice-back');page.click('#practice-open')
    expect(page.locator('#position-select')).to_be_visible()
    page.get_by_role('button',name='파우스트 선택').click();page.click('#start')
    assert page.evaluate('!__moba.game.training&&__moba.game.champions().length===8')
    page.keyboard.press('g');expect(page.locator('#shop-tabs')).to_be_hidden();expect(page.locator('#buy-power')).to_contain_text('160')
    assert not errors,errors
    b.close()
    print(json.dumps({'status':'passed','checks':['main menu training entry','five zones without champion bots','separate safe fountain','all toggles','dead free shop and sell-all','champion change including infinite Rudolph SP','map teleport/cancel and all zone renders','lane halt/reset','no twenty-minute limit','mobile shop','regular 4v4 rules preserved'],'page_errors':errors},ensure_ascii=False))
