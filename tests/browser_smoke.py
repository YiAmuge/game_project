"""Optional UI smoke test: Python Playwright + Chromium. No application dependencies."""
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
    expect(page.locator('.champion-option')).to_have_count(4)
    page.get_by_role('button', name='싱클레어 선택').click()
    expect(page.locator('#selected-name')).to_have_text('싱클레어')
    page.get_by_role('button', name='파우스트 선택').click()
    page.screenshot(path=str(artifacts / 'lobby.png'), full_page=True)

    page.click('#archive-open')
    expect(page.locator('#roster-list button')).to_have_count(31)
    page.fill('#roster-search', '료슈')
    expect(page.locator('#roster-list button')).to_have_count(1)
    page.click('#roster-list button')
    expect(page.locator('#roster-detail h2')).to_have_text('료슈')
    expect(page.locator('#roster-detail')).to_contain_text('아직 플레이 불가')
    page.locator('#archive .close-dialog').click()
    page.click('#start')
    page.wait_for_function('__moba.renderer.atlas.complete && __moba.renderer.atlas.naturalWidth > 0')
    canvas = page.locator('#arena').bounding_box()
    assert canvas['width'] == 1440 and canvas['height'] == 900
    center = page.evaluate('__moba.renderer.camera.worldToScreen({x:__moba.game.player.x,y:__moba.game.player.y-.7})')
    assert abs(center['x']-720)<.1 and abs(center['y']-450)<.1
    page.click('#shop-toggle')
    page.click('#buy-power')
    assert page.evaluate('__moba.game.player.upgrades.power') == 1
    page.click('#buy-potion')
    assert page.evaluate('__moba.game.player.potion') == 2
    page.click('#shop-close')
    page.keyboard.press('Digit1')
    assert page.evaluate('__moba.game.player.potion') == 1
    x = page.evaluate('__moba.game.player.x')
    page.keyboard.down('KeyD')
    page.wait_for_timeout(750)
    page.keyboard.up('KeyD')
    assert page.evaluate('__moba.game.player.x') > x + 1

    # Put a real enemy in a clear shooting lane, then exercise actual DOM input.
    page.evaluate('''() => {
      const g=__moba.game,p=g.player,t=g.champions(1).find(c=>c.key==='faust');
      p.x=20;p.y=5.5;t.x=24;t.y=5.5;t.hp=t.maxHp=10000;
      g.aiChampion=()=>{};g.input.aim={x:t.x,y:t.y};
    }''')
    page.wait_for_timeout(100)
    center = page.evaluate('__moba.renderer.camera.worldToScreen({x:20,y:5.5-.7})')
    assert abs(center['x']-720)<.1 and abs(center['y']-450)<.1
    bounds = page.evaluate('__moba.renderer.camera.bounds')
    assert bounds['w'] < 64 and bounds['h'] < 36
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
    page.keyboard.press('KeyR')
    assert page.evaluate('__moba.game.player.rCd') == 0
    page.keyboard.press('Space')
    assert page.evaluate('__moba.game.player.rCd') > 45
    page.wait_for_timeout(1400)
    assert page.evaluate("__moba.game.champions(1).find(c=>c.key==='faust').hp") < target_hp

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

    page.evaluate('''() => { const g=__moba.game;g.time=299.99;g.wave=9; }''')
    page.wait_for_function('__moba.game.bossSpawned')
    assert page.evaluate("__moba.game.units.filter(u=>u.camp==='central').every(c=>!c.alive)")
    expect(page.locator('#boss-time')).to_contain_text('중앙 보스')
    page.screenshot(path=str(artifacts / 'arena.png'), full_page=True)
    assert page.locator('.hud').bounding_box()['y'] + page.locator('.hud').bounding_box()['height'] <= 900
    page.evaluate('__moba.game.time=599.99')
    expect(page.locator('#result')).to_be_visible()
    expect(page.locator('#result-reason')).to_contain_text('10분 목표물 판정')
    page.click('#restart')
    expect(page.locator('#lobby')).to_be_visible()
    assert page.evaluate('__moba.game.time') == 0
    assert page.evaluate('__moba.game.player.upgrades.power') == 0
    assert page.evaluate('document.body.scrollWidth <= innerWidth')

    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(artifacts / 'mobile-layout.png'), full_page=True)
    assert page.evaluate('document.body.scrollWidth <= innerWidth')
    assert not errors, errors
    browser.close()
    print(json.dumps({'status': 'passed', 'checks': ['champion selection and loaded art', '31-record archive and search', 'shop purchase', 'potion use', 'keyboard movement', 'player-centered camera and cropped world', 'manual projectile damage', 'right-click tactical and Space ultimate', 'old Q/R bindings removed', 'pause and modal suspension', 'native fullscreen enter/exit', 'boss transition', 'timeout result', 'restart reset', 'viewport-filling game and HUD', 'mobile overflow'], 'page_errors': errors}, ensure_ascii=False))
