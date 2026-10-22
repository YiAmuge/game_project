"""Exercise the shipped HTML in a script-enabled, opaque-origin iframe.

All network access is blocked. This approximates a file preview without relying
on the app server or assuming that ChatGPT's own preview allows JavaScript.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
html = (root / 'dist/city-border.html').read_text()
with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
        headless=True, args=['--no-sandbox','--enable-unsafe-swiftshader'],
    )
    context = browser.new_context(viewport={'width': 1280, 'height': 900})
    page = context.new_page()
    errors, requests = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))

    def reject_network(route):
        requests.append(route.request.url)
        route.abort()

    context.route('**/*', reject_network)
    page.set_content('<iframe id="preview" sandbox="allow-scripts" style="border:0;width:100%;height:900px"></iframe>')
    page.evaluate('(html) => document.querySelector("iframe").srcdoc = html', html)
    frame = page.frame_locator('#preview')
    expect(frame.locator('#main-menu .menu-action')).to_have_count(4)
    expect(frame.locator('#online')).to_be_disabled()
    frame.locator('#practice-open').click()
    expect(frame.locator('.champion-option')).to_have_count(29)
    expect(frame.locator('.position-option')).to_have_count(4)
    expect(frame.locator('body')).to_have_css('background-color', 'rgb(16, 22, 23)')
    assert frame.locator('script[type="module"], script[src], link[rel="stylesheet"]').count() == 0
    frame.get_by_role('button', name='홍루 선택').click()
    expect(frame.locator('#selected-name')).to_have_text('홍루')
    assert frame.locator('script[id^=sprite-data]').count() == 9
    frame.locator('#archive-open').click()
    expect(frame.locator('#roster-list button')).to_have_count(34)
    frame.locator('#roster-search').fill('료슈')
    expect(frame.locator('#roster-list button')).to_have_count(1)
    frame.locator('#roster-list button').click()
    expect(frame.locator('#roster-detail h2')).to_have_text('료슈')
    expect(frame.locator('#roster-detail')).to_contain_text('연습전 플레이 가능')
    frame.locator('[data-category=monsters]').click()
    expect(frame.locator('#codex-content article')).to_have_count(10)
    expect(frame.locator('#codex-tabs button')).to_have_count(4)
    frame.locator('[data-category=rules]').click()
    expect(frame.locator('#codex-content')).to_contain_text('13%')
    frame.locator('#archive .close-dialog').click()
    frame.locator('#start').click()
    expect(frame.locator('#lobby')).to_be_hidden()
    page.wait_for_timeout(1200)
    assert frame.locator('#clock').inner_text() != '20:00'
    frame.locator('#shop-toggle').click()
    frame.locator('#buy-power').click()
    expect(frame.locator('#upgrade-info-power')).to_contain_text('1 / 5')
    frame.locator('#shop-close').click()
    frame.locator('#q-btn').click()
    # Honglu Q is now an immediate self-cast, without coordinate confirmation.
    expect(frame.locator('#q-btn .cooldown')).not_to_be_empty()
    frame.locator('#r-btn').click()
    frame.locator('#arena').click(position={'x':850,'y':450})
    expect(frame.locator('#r-btn .cooldown')).not_to_be_empty()
    frame.locator('#score-toggle').click()
    expect(frame.locator('#score-rows tr')).to_have_count(8)
    expect(frame.locator('#scoreboard')).to_be_visible()
    frame.locator('#score-close').click()
    frame.locator('#pause').click()
    stopped = frame.locator('#clock').inner_text()
    page.wait_for_timeout(1100)
    expect(frame.locator('#clock')).to_have_text(stopped)
    frame.locator('#resume').click()
    frame.locator('#field-help').click()
    expect(frame.locator('#help')).to_be_visible()
    frame.locator('#help .close-dialog').click()
    frame.locator('#pause').click()
    frame.locator('#leave').click()
    expect(frame.locator('#lobby')).to_be_visible()
    expect(frame.locator('#pause-banner')).to_be_hidden()
    # The training map and controls must also work without module or network access.
    frame.locator('#practice-back').click()
    frame.locator('#training-open').click()
    frame.get_by_role('button', name='소라 선택').click()
    frame.locator('#start').click()
    expect(frame.locator('#phase')).to_contain_text('시간 제한 없음')
    expect(frame.locator('#training-panel')).to_be_visible()
    expect(frame.locator('#shop')).to_be_hidden()
    frame.locator('#training-infinite-ammo').check()
    frame.locator('#training-life').click()
    expect(frame.locator('#training-life')).to_have_text('즉시 부활')
    frame.locator('#training-life').click()
    frame.locator('#training-champion').select_option('rudolph')
    frame.locator('#training-change-champion').click()
    expect(frame.locator('#player-name')).to_contain_text('루돌프')
    expect(frame.locator('#training-ai')).not_to_be_checked()
    frame.locator('#training-summon').click()
    frame.locator('#summon-champion').select_option('starbuck')
    frame.locator('#summon-confirm').click()
    frame.locator('#summon-enemy').click()
    expect(frame.locator('#global-target')).to_be_visible()
    frame.locator('#target-map').click(position={'x':200,'y':120})
    expect(frame.locator('#global-target')).to_be_hidden()
    frame.locator('#training-ai').check()
    frame.locator('#training-remove').click()
    frame.locator('#remove-choose').click()
    expect(frame.locator('#remove-champion option')).to_have_count(1)
    frame.locator('#remove-selected').click()
    expect(frame.locator('#remove-champion option')).to_have_count(0)
    expect(frame.locator('#remove-all')).to_be_disabled()
    frame.locator('#training-remove-dialog .close-dialog').click()
    frame.locator('#training-panel-toggle').click()
    expect(frame.locator('#training-options')).to_be_hidden()
    # The 3D engine and textures must also be embedded, without CDN requests.
    frame.locator('#pause').click();frame.locator('#leave').click();frame.locator('#practice-back').click()
    frame.locator('#training-open').click();frame.locator('#start').click()
    expect(frame.locator('#arena-3d')).to_be_visible()
    expect(frame.locator('#field-title')).to_contain_text('입체 실험 정원')
    frame.locator('#training-panel-toggle').click()
    assert not requests, f'Unexpected network dependencies: {requests}'
    assert not errors, errors
    (root / 'artifacts').mkdir(exist_ok=True)
    page.screenshot(path=str(root / 'artifacts/standalone-preview.png'), full_page=True)

    # If a viewer disallows scripts, show a useful explanation instead of silence.
    page.set_content('<iframe id="preview" sandbox style="border:0;width:100%;height:900px"></iframe>')
    page.evaluate('(html) => document.querySelector("iframe").srcdoc = html', html)
    expect(page.frame_locator('#preview').locator('noscript p')).to_be_visible()
    browser.close()
    print('Standalone passed: four-entry menu, 29 champions/four positions, nine embedded sprite atlases, codex, match controls, training entry/map/options/death/revive/champion change/summon/AI/removal, no-script fallback. External requests: 0. JS errors: 0.')
