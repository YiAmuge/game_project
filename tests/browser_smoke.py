"""Real DOM controls, layout, and special aiming flows. Requires Playwright/Chromium."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('MOBA_TEST_URL', 'http://127.0.0.1:5173')
artifacts = Path(__file__).resolve().parents[1] / 'artifacts'
artifacts.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base + '/?debug=1', wait_until='networkidle')
    expect(page.locator('#main-menu .menu-action')).to_have_count(3)
    expect(page.locator('#online')).to_be_disabled()
    expect(page.locator('#online')).to_contain_text('준비중')
    expect(page.locator('.hud')).to_be_hidden()
    page.screenshot(path=str(artifacts / 'v03-menu.png'), full_page=True)
    page.click('#practice-open')
    expect(page.locator('.champion-option')).to_have_count(24)
    expect(page.locator('.position-option')).to_have_count(4)
    page.click('[data-position=jungle]')
    page.get_by_role('button', name='료슈 선택').click()
    expect(page.locator('#selected-name')).to_have_text('료슈')
    assert page.evaluate('__moba.game.player.position') == 'jungle'
    page.click('[data-position=support]')
    expect(page.locator('#selected-name')).to_have_text('료슈')
    page.screenshot(path=str(artifacts / 'v03-practice.png'), full_page=True)
    page.click('#practice-back')
    page.click('#menu-codex')
    expect(page.locator('#roster-list button')).to_have_count(31)
    page.fill('#roster-search', '구보')
    page.click('#roster-list button')
    expect(page.locator('#roster-detail')).to_contain_text('21%')
    page.fill('#roster-search', '알리사')
    page.click('#roster-list button')
    expect(page.locator('#roster-detail')).to_contain_text('자해')
    page.click('[data-category=monsters]')
    expect(page.locator('#codex-content article')).to_have_count(10)
    page.click('[data-category=items]')
    expect(page.locator('#codex-content article')).to_have_count(6)
    expect(page.locator('#codex-content')).to_contain_text('상점에서 사용 가능')
    page.click('[data-category=rules]')
    expect(page.locator('#codex-content')).to_contain_text('13%')
    expect(page.locator('#codex-content')).to_contain_text('1.538배')
    page.locator('#archive .close-dialog').click()
    page.click('#practice-open')
    page.click('[data-position=bottom]')
    page.get_by_role('button', name='파우스트 선택').click()
    page.click('#start')
    page.wait_for_function('__moba.renderer.atlas.complete && __moba.renderer.atlas.naturalWidth > 0 && __moba.renderer.atlasExtra.naturalWidth > 0')
    assert page.evaluate('new Set(__moba.game.champions(0).map(c=>c.position)).size') == 4
    canvas = page.locator('#arena').bounding_box()
    assert canvas['width'] == 1440 and canvas['height'] == 900
    center = page.evaluate('__moba.renderer.camera.worldToScreen({x:__moba.game.player.x,y:__moba.game.player.y-.7})')
    assert abs(center['x']-720)<.1 and abs(center['y']-450)<.1
    mini = page.locator('#minimap').bounding_box()
    assert mini['x'] < 30 and mini['y'] < 100
    abilities = page.locator('.abilities').bounding_box()
    assert abilities['y'] > 780 and abilities['x'] > 500
    inventory = page.locator('#inventory').bounding_box()
    assert inventory['x'] < 30 and inventory['y'] > 790
    buffs = page.locator('#buff-tray').bounding_box()
    assert buffs['x'] > 1200 and buffs['y'] > 700
    page.keyboard.press('KeyB')
    expect(page.locator('#shop')).to_be_hidden()
    page.keyboard.press('KeyG')
    expect(page.locator('#shop')).to_be_visible()
    page.click('#buy-power')
    assert page.evaluate('__moba.game.player.upgrades.power') == 1
    page.click('#buy-potion')
    assert page.evaluate('__moba.game.player.potion') == 2
    page.click('#shop-close')
    page.keyboard.press('Digit1')
    assert page.evaluate('__moba.game.player.potion') == 1
    page.keyboard.down('Tab')
    expect(page.locator('#scoreboard')).to_be_visible()
    expect(page.locator('#score-rows tr')).to_have_count(8)
    expect(page.locator('#score-rows tr').first).to_contain_text('전투 +4%')
    expect(page.locator('#score-rows tr').first).to_contain_text('장전 -48%')
    assert page.locator('#score-map').bounding_box()['width'] > mini['width']*2
    page.screenshot(path=str(artifacts / 'v03-score.png'), full_page=True)
    page.keyboard.up('Tab')
    expect(page.locator('#scoreboard')).to_be_hidden()
    x = page.evaluate('__moba.game.player.x')
    page.keyboard.down('KeyD')
    page.wait_for_timeout(750)
    page.keyboard.up('KeyD')
    assert page.evaluate('__moba.game.player.x') > x + 1
    page.evaluate('''() => {
      const g=__moba.game,p=g.player,t=(g.champions(1).find(c=>c.key==='faust')||g.makeChampion('faust',1,8));
      p.x=20;p.y=5.5;t.x=24;t.y=5.5;t.hp=t.maxHp=10000;
      t.lastDamageAt=g.time;g.aiChampion=()=>{};g.input.aim={x:t.x,y:t.y};
    }''')
    page.wait_for_timeout(100)
    center = page.evaluate('__moba.renderer.camera.worldToScreen({x:20,y:5.5-.7})')
    assert abs(center['x']-720)<.1 and abs(center['y']-450)<.1
    bounds = page.evaluate('__moba.renderer.camera.bounds')
    assert bounds['w'] < 64 and bounds['h'] < 36
    page.keyboard.press('KeyG')
    expect(page.locator('#shop')).to_be_hidden()
    point = page.evaluate('__moba.renderer.camera.worldToScreen({x:24,y:5.5})')
    mx, my = point['x'], point['y']
    page.mouse.move(mx, my)
    page.mouse.down()
    page.wait_for_timeout(350)
    page.mouse.up()
    target_hp = page.evaluate("__moba.game.champions(1).find(c=>c.key==='faust').hp")
    assert target_hp < 10000
    page.keyboard.press('KeyQ')
    assert page.evaluate('__moba.game.player.qCd') == 0
    page.mouse.click(mx, my, button='right')
    assert page.evaluate('__moba.game.player.qCd') > 9
    assert not page.evaluate('Boolean(__moba.targeting)')
    page.keyboard.press('KeyR')
    assert page.evaluate('__moba.game.player.rCd') == 0
    page.keyboard.press('Space')
    assert page.evaluate('__moba.game.player.rCd') == 0
    page.mouse.click(mx,my)
    assert page.evaluate('__moba.game.player.rCd') > 45
    page.wait_for_timeout(1400)
    assert page.evaluate("__moba.game.champions(1).find(c=>c.key==='faust').hp") < target_hp
    page.evaluate('''() => {
      const g=__moba.game,p=g.player;
      ['amplify','blessing','marks','power','speed'].forEach(k=>g.addBuff(p,k,30));
    }''')
    expect(page.locator('#buff-list .buff-chip')).to_have_count(3)
    expect(page.locator('#buff-list .buff-chip').first).to_contain_text('이동 강화')
    page.screenshot(path=str(artifacts / 'v03-play.png'), full_page=True)
    page.keyboard.press('Escape')
    assert page.evaluate('__moba.paused')
    stopped = page.evaluate('__moba.game.time')
    page.wait_for_timeout(200)
    assert page.evaluate('__moba.game.time') == stopped
    page.click('#resume')
    page.click('#field-help')
    stopped = page.evaluate('__moba.game.time')
    page.wait_for_timeout(200)
    assert page.evaluate('__moba.game.time') == stopped
    page.locator('#help .close-dialog').click()
    page.click('#fullscreen')
    page.wait_for_function('document.fullscreenElement !== null')
    page.click('#fullscreen')
    page.wait_for_function('document.fullscreenElement === null')
    if page.evaluate('__moba.paused'):
        page.click('#resume')
    page.evaluate('''() => {const g=__moba.game;g.time=299.99;g.wave=9;}''')
    page.wait_for_function('__moba.game.bossSpawned')
    assert page.evaluate("__moba.game.units.filter(u=>u.camp==='central').every(c=>!c.alive)")
    page.evaluate('__moba.game.time=599.99')
    page.wait_for_timeout(150)
    expect(page.locator('#result')).to_be_hidden()
    assert page.evaluate('__moba.game.time') > 600
    page.evaluate('''() => {const g=__moba.game;g.towers(1).forEach(t=>t.alive=false);const core=g.units.find(e=>e.kind==='core'&&e.team===1);g.player.x=core.x-2;g.player.y=core.y;g.deal(g.player,core,1e7,{fixed:true});}''')
    expect(page.locator('#result')).to_be_visible()
    expect(page.locator('#result-reason')).to_contain_text('본진 파괴')
    page.click('#restart')
    expect(page.locator('#practice-panel')).to_be_visible()
    assert page.evaluate('__moba.game.time') == 0
    assert page.evaluate('__moba.game.player.upgrades.power') == 0

    def back_to_menu():
        if 'in-game' in (page.locator('body').get_attribute('class') or ''):
            page.click('#pause')
            page.click('#leave')
        page.click('#home')

    def experiment(name):
        back_to_menu()
        page.click('#menu-codex')
        page.click('[data-category=champions]')
        page.fill('#roster-search', name)
        page.click('#roster-list button')
        page.click('#record-play')
        if page.evaluate('__moba.mode')=='practice':page.click('#start')
        expect(page.locator('#lobby')).to_be_hidden()
        page.evaluate('''() => {
          const g=__moba.game;g.player.x=20;g.player.y=5.5;
          g.aiChampion=()=>{};g.aiMinion=()=>{};g.aiStructure=()=>{};g.aiNeutral=()=>{};
        }''')
        page.wait_for_timeout(100)

    experiment('루돌프')
    page.keyboard.press('Space')
    expect(page.locator('#global-target')).to_be_visible()
    assert page.evaluate('__moba.game.player.rCd') == 0
    page.keyboard.press('Escape')
    expect(page.locator('#global-target')).to_be_hidden()
    assert page.evaluate('__moba.game.player.ammo') == 100
    page.keyboard.press('Space')
    page.locator('#target-map').click(position={'x': 700, 'y': 180})
    expect(page.locator('#global-target')).to_be_hidden()
    assert page.evaluate('__moba.game.player.rCd') > 30
    pending = page.evaluate('__moba.game.pending.find(p=>p.type==="global") && ({x:__moba.game.pending[0].x,y:__moba.game.pending[0].y})')
    assert pending and pending['x'] > 40
    page.screenshot(path=str(artifacts / 'v03-rudolph.png'), full_page=True)
    for name, state_key in [('모제스','smoke'), ('에즈라','weapon')]:
        experiment(name)
        before_ammo = page.evaluate('__moba.game.player.ammo')
        page.mouse.click(720, 450, button='right')
        assert page.evaluate('__moba.game.player.qCd') == 0
        assert page.evaluate('__moba.game.player.ammo') == before_ammo
        page.mouse.move(720, 450)
        page.mouse.down(button='right')
        expect(page.locator('#drag-wheel')).to_be_visible()
        page.mouse.move(790, 450, steps=4)
        expect(page.locator('#drag-wheel [data-dir=right]')).to_have_class('selected')
        page.screenshot(path=str(artifacts / ('v03-drag-' + state_key + '.png')), full_page=True)
        page.mouse.up(button='right')
        expect(page.locator('#drag-wheel')).to_be_hidden()
        assert page.evaluate('__moba.game.player.qCd') > 0
        assert page.evaluate('__moba.game.player.state.' + state_key) == (1 if name=='에즈라' else 'right')

    for name in ['돈키호테','료슈','홍루','히스클리프','이스마엘','로쟈','오티스','그레고르']:
        back_to_menu()
        page.click('#practice-open')
        page.get_by_role('button', name=name+' 선택').click()
        page.click('#start')
        page.evaluate('''() => {__moba.game.player.x=25;__moba.game.player.y=5.5;}''')
        page.mouse.move(950, 480)
        page.wait_for_timeout(150)
        page.screenshot(path=str(artifacts / ('v03-champion-' + page.evaluate('__moba.game.player.key') + '.png')))
    assert page.evaluate('document.body.scrollWidth <= innerWidth')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(artifacts / 'v03-mobile-play.png'), full_page=True)
    assert page.evaluate('document.body.scrollWidth <= innerWidth')
    back_to_menu()
    page.click('#practice-open')
    page.screenshot(path=str(artifacts / 'v03-mobile-practice.png'), full_page=True)
    assert page.evaluate('document.body.scrollWidth <= innerWidth')
    assert not errors, errors
    browser.close()
    print(json.dumps({'status':'passed','checks':['three-entry menu','24 champions and four positions','unrestricted recommendations','31 champion and three other codex categories','latest balance descriptions','viewport and centered camera','HUD quadrants and three latest buffs','G fountain-only shop and potion','Tab enlarged map and 8-row KDA/growth','movement and manual projectile damage','RMB/Space and removed Q/R bindings; B recall','pause/modal/fullscreen','boss/result/restart','Rudolph global cancel and commit','Moses/Ezra drag cancel and commit','eight new sprites in matches','mobile overflow'],'page_errors':errors},ensure_ascii=False))
