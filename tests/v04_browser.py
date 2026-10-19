"""v0.4 live input plus rendered labels and screenshots; requires dev server."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1]
art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''(() => {window.__drawnLabels=new Set();const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(window.__drawnLabels.size<2000)window.__drawnLabels.add(String(text));return draw.call(this,text,...args);};})();''')
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5173')+'/?debug=1',wait_until='networkidle')
    def choose(name):
        if page.evaluate('__moba.mode')=='playing':
            page.click('#pause');page.click('#leave')
        if page.evaluate('__moba.mode')=='menu':page.click('#practice-open')
        page.get_by_role('button',name=name+' 선택').click();page.click('#start')
        page.evaluate('''() => {const g=__moba.game;g.aiChampion=()=>{};g.aiMinion=()=>{};g.aiStructure=()=>{};g.aiNeutral=()=>{};g.player.x=40;g.player.y=7;window.__drawnLabels.clear();}''')
        page.wait_for_timeout(100)
    choose('돈키호테')
    expect(page.locator('#health-fill,#health-text,#ammo')).to_have_count(0)
    page.wait_for_function('[...__drawnLabels].some(s=>s.includes("3400 / 3400"))')
    page.evaluate('''() => {const g=__moba.game,t=g.champions(1).find(c=>c.key==='faust');t.x=42.5;t.y=7;t.hp=t.maxHp=10000;}''')
    point=page.evaluate('__moba.renderer.camera.worldToScreen({x:42.5,y:7})')
    page.mouse.move(point['x'],point['y']);page.mouse.down();page.wait_for_timeout(70)
    x=page.evaluate('__moba.game.player.x');assert 40<x<42,x
    page.screenshot(path=str(art/'v04-dash.png'));page.mouse.up();page.wait_for_timeout(250)
    assert page.evaluate('__moba.game.champions(1).find(c=>c.key==="faust").hp')<10000
    # F is no longer bound. F12 still has a visible button fallback in real browsers.
    page.keyboard.press('KeyF');assert page.evaluate('document.fullscreenElement===null')
    page.keyboard.press('F12');page.wait_for_function('document.fullscreenElement!==null')
    page.keyboard.press('F12');page.wait_for_function('document.fullscreenElement===null')
    if page.evaluate('__moba.paused'):page.click('#resume')
    # Recall using actual keyboard input, first with movement cancellation, then completion.
    page.keyboard.press('KeyB');page.wait_for_function('Boolean(__moba.game.player.recall)')
    page.keyboard.down('KeyD');page.wait_for_timeout(100);page.keyboard.up('KeyD')
    assert not page.evaluate('Boolean(__moba.game.player.recall)')
    page.keyboard.press('KeyB');page.wait_for_timeout(900);page.screenshot(path=str(art/'v04-recall.png'))
    assert page.evaluate('Boolean(__moba.game.player.recall)')
    page.wait_for_function('__moba.game.inSpawn(__moba.game.player) && !__moba.game.player.recall',timeout=5000)
    page.keyboard.press('KeyG');expect(page.locator('#shop')).to_be_visible();page.click('#shop-close')
    choose('히스클리프')
    page.mouse.move(1100,480);page.mouse.click(1100,480,button='right');page.wait_for_timeout(1850)
    assert page.evaluate('__moba.game.player.state.chargeAt!==undefined')
    page.wait_for_function('[...__drawnLabels].some(s=>s.startsWith("좌클릭 발사 · 최대 6"))')
    page.screenshot(path=str(art/'v04-charge.png'))
    x=page.evaluate('__moba.game.player.x');page.mouse.click(1100,480);page.wait_for_timeout(90)
    assert x<page.evaluate('__moba.game.player.x')<x+5
    choose('싱클레어')
    page.evaluate('__moba.game.player.marks=2')
    page.wait_for_function('__drawnLabels.has("어느 표지 2/3")')
    page.screenshot(path=str(art/'v04-sinclair-stacks.png'))
    choose('그레고르')
    page.evaluate('__moba.game.player.state.mutations=11')
    page.wait_for_function('__drawnLabels.has("이형발작 11/12")')
    page.screenshot(path=str(art/'v04-gregor-stacks.png'))
    choose('로쟈')
    page.mouse.click(1000,480,button='right');page.wait_for_timeout(1000)
    assert page.evaluate('__moba.game.player.state.coinResults.length')==3
    page.wait_for_function('__drawnLabels.has("앞") || __drawnLabels.has("뒤")')
    page.screenshot(path=str(art/'v04-coins.png'))
    choose('홍루')
    page.evaluate('''() => {const g=__moba.game,p=g.player,a=g.champions(0).find(c=>c!==p&&c.key!=='meursault');a.x=43.5;a.y=7;g.addBuff(p,'blessing',20);g.status(a,'stun',1,4);window.__drawnLabels.clear();}''')
    page.wait_for_timeout(200)
    assert page.evaluate('__moba.game.champions(0).find(c=>c.visuals.hongluShare).visuals.hongluShare.until>__moba.game.time')
    page.screenshot(path=str(art/'v04-honglu-stun.png'))
    # Camp ground, individual spawn clocks, and the enlarged map use the same data.
    page.evaluate('''() => {const g=__moba.game,n=g.units.find(e=>e.camp==='side');g.player.x=n.home.x-3;g.player.y=n.home.y;g.kill(n,g.player);window.__drawnLabels.clear();}''')
    page.wait_for_function('__drawnLabels.has("재생성")')
    page.screenshot(path=str(art/'v04-camp-timer.png'))
    page.keyboard.down('Tab');expect(page.locator('#camp-timers')).to_contain_text('중립 크립');expect(page.locator('#score-rows tr')).to_have_count(8)
    page.screenshot(path=str(art/'v04-expanded-map.png'));page.keyboard.up('Tab')
    page.evaluate('__moba.game.award(__moba.game.player,100000,0)')
    expect(page.locator('#level')).to_have_text('LV.10');assert page.locator('#xp-fill').get_attribute('style')=='width: 100%;'
    page.evaluate('__moba.game.time=601');page.wait_for_timeout(100);expect(page.locator('#result')).to_be_hidden()
    # Experimental SP uses a gauge with an actual value instead of magazine segments.
    page.click('#pause');page.click('#leave');page.click('#archive-open');page.fill('#roster-search','루돌프');page.click('#roster-list button');page.click('#record-play');page.click('#start')
    page.wait_for_function('[...__drawnLabels].some(s=>s.startsWith("SP 100 / 100"))')
    page.screenshot(path=str(art/'v04-sp-gauge.png'))
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100);page.screenshot(path=str(art/'v04-mobile.png'),full_page=True)
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    assert not errors,errors
    browser.close()
    print(json.dumps({'status':'passed','checks':['health numbers and local resources; removed old bars','visible Don dash','F12 and removed F binding','B recall cancel/complete and G shop','progressive Heathcliff preview and travel','Sinclair and Gregor rendered stack counts','actual coin results','Hong Lu water share and stun stars','camp terrain and spawn timers on field/map','level ten XP','no timeout after 600s','SP gauge','mobile overflow'],'page_errors':errors},ensure_ascii=False))
