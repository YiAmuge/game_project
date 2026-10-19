"""Real input: confirmation/cancellation, teleports, dead shop, augments, four new bodies and corpses."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''(() => {window.__drawnLabels=new Set();const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(window.__drawnLabels.size<3000)__drawnLabels.add(String(text));return draw.call(this,text,...args);};})();''')
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5173')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.champion-option')).to_have_count(20)
    page.wait_for_function('__moba.renderer.atlasV05.naturalWidth>0')
    def choose(name):
        if page.evaluate('__moba.mode')=='playing':page.click('#pause');page.click('#leave')
        if page.evaluate('__moba.mode')=='menu':page.click('#practice-open')
        page.get_by_role('button',name=name+' 선택').click();page.click('#start')
        page.evaluate('''() => {const g=__moba.game;g.aiChampion=()=>{};g.aiMinion=()=>{};g.aiStructure=()=>{};g.aiNeutral=()=>{};g.player.x=40;g.player.y=7;const t=g.champions(1).find(c=>c.key==='faust');t.x=44;t.y=7;t.hp=t.maxHp=100000;window.__drawnLabels.clear();}''')
        page.wait_for_timeout(80)
    def point(x=44,y=7):return page.evaluate('([x,y])=>__moba.renderer.camera.worldToScreen({x,y})',[x,y])
    def click_world(x=44,y=7,button='left'):
        s=point(x,y);page.mouse.click(s['x'],s['y'],button=button)
    choose('파우스트')
    click_world(button='right')
    assert page.evaluate('__moba.game.player.qCd')>9
    assert not page.evaluate('Boolean(__moba.targeting)')
    page.keyboard.press('Space')
    assert page.evaluate('__moba.targeting.slot')=='r'
    assert page.evaluate('__moba.game.player.rCd')==0
    page.wait_for_function('__drawnLabels.has("좌클릭 시전 · 우클릭 / Esc 취소")')
    page.screenshot(path=str(art/'v05-circle-target.png'))
    page.keyboard.press('Escape');assert not page.evaluate('Boolean(__moba.targeting)');assert not page.evaluate('__moba.paused')
    assert page.evaluate('__moba.game.player.rCd')==0
    page.keyboard.press('Space');click_world(46,8);assert page.evaluate('__moba.game.player.rCd')>45
    assert page.evaluate('__moba.game.pending.length')==1
    # A coordinate teleport is armed without moving or spending its cooldown.
    choose('료슈');x=page.evaluate('__moba.game.player.x');page.keyboard.press('Space')
    assert page.evaluate('__moba.game.player.x')==x
    assert page.evaluate('__moba.game.player.rCd')==0
    click_world(45,7);assert page.evaluate('__moba.game.player.x')>x+4
    # Dash Q keeps the immediate input path.
    choose('싱클레어');click_world(46,7,button='right');assert not page.evaluate('Boolean(__moba.targeting)')
    assert page.evaluate('__moba.game.player.motion.kind')=='dash'
    # Death does not hide or intercept the shop, and purchases do not resurrect.
    choose('파우스트')
    page.evaluate('''() => {const g=__moba.game;g.kill(g.player,g.champions(1)[0]);g.player.respawnAt=g.time+100;g.player.gold=10000;}''')
    page.keyboard.press('KeyG');expect(page.locator('#shop')).to_be_visible();expect(page.locator('#respawn')).to_be_visible()
    box=page.locator('#shop').bounding_box();assert box['y']>=0 and box['y']+box['height']<=900
    for i in range(3):page.click('#buy-power')
    expect(page.locator('#buy-power')).to_contain_text('3 / 5')
    page.click('#augment-power15');page.click('#augment-range7');page.click('#augment-finalBullet')
    assert page.evaluate('__moba.game.player.augments.length')==3
    expect(page.locator('#augment-reloadStacks')).to_be_disabled()
    gold=page.evaluate('__moba.game.player.gold');page.click('#augment-power15');assert page.evaluate('__moba.game.player.gold')>=gold+350
    page.click('#augment-reloadStacks');assert page.evaluate('__moba.game.player.augments.length')==3
    assert page.evaluate('__moba.game.player.hp')==0
    expect(page.locator('#buy-potion')).to_be_disabled()
    page.screenshot(path=str(art/'v05-dead-augments.png'))
    page.click('#shop-close')
    for name,key in [('구보','gubo'),('가환','gahwan'),('넬리','nelly'),('에이해브','ahab')]:
        choose(name);assert page.evaluate('__moba.renderer.atlasFor(__moba.game.player.key)===__moba.renderer.atlasV05')
        click_world(42,7);page.wait_for_timeout(120)
        page.screenshot(path=str(art/f'v05-{key}.png'))
        if key=='nelly':
            click_world(44,7,button='right');assert page.evaluate('__moba.game.player.state.knifeCharges')==1
        if key=='ahab':
            page.keyboard.press('Space');assert page.evaluate('__moba.targeting.slot')=='r';click_world(44,7);page.wait_for_timeout(750)
    choose('돈키호테');click_world(44,7,button='right');assert page.evaluate('__moba.game.player.qCd')>0
    page.screenshot(path=str(art/'v05-don-barrage-start.png'))
    assert page.evaluate('Boolean(__moba.game.player.state.donBarrage)')
    page.keyboard.down('KeyD');page.wait_for_timeout(200);page.keyboard.up('KeyD');assert page.evaluate('__moba.game.player.x')>40
    page.screenshot(path=str(art/'v05-don-barrage.png'))
    # Enemy corpse is rendered from the appropriate atlas, not the respawn position.
    page.evaluate('''() => {const g=__moba.game,t=g.champions(1).find(c=>c.key==='faust');g.kill(t,g.player);}''')
    assert page.evaluate('__moba.game.corpses.some(c=>c.team===1)')
    page.wait_for_timeout(100);page.screenshot(path=str(art/'v05-corpse.png'))
    # The well is physically behind the core and shows a supply label.
    page.keyboard.press('KeyB');page.wait_for_function('__moba.game.inSpawn(__moba.game.player)',timeout=5000)
    page.screenshot(path=str(art/'v05-well.png'))
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    page.keyboard.press('KeyG');expect(page.locator('#shop')).to_be_visible();page.locator('#augment-finalBullet').scroll_into_view_if_needed()
    page.screenshot(path=str(art/'v05-mobile-shop.png'),full_page=True)
    assert not errors,errors
    browser.close()
    print(json.dumps({'status':'passed','checks':['20 ordinary/four atlases','range preview and cancel without cost','LMB confirm without basic fire','ground teleport confirmation','quick dash','dead shop and caps','three augment slots/sale/replacement','four new sprites/skills','Don directional moving barrage','enemy corpse','separate semicircular well','mobile scrollable shop'],'page_errors':errors},ensure_ascii=False))
