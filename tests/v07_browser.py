"""v0.7 actual input, status art and codex coverage for the ten adjusted champions."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''(() => {window.__labels=new Set();const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){__labels.add(String(text));return draw.call(this,text,...args);};})();''')
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5173')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.7')
    def choose(name):
        if page.evaluate('__moba.mode')=='playing':page.click('#pause');page.click('#leave')
        if page.evaluate('__moba.mode')=='menu':page.click('#practice-open')
        page.get_by_role('button',name=name+' 선택').click();page.click('#start')
        page.evaluate('''() => {const g=__moba.game;for(const k of ['aiChampion','aiMinion','aiStructure','aiNeutral'])g[k]=()=>{};const p=g.player,t=g.champions(1).find(c=>c.key==='faust');Object.assign(p,{x:40,y:7});Object.assign(t,{x:43,y:7,hp:10000,maxHp:10000});g.units=[p,t];g.minionQueue=[];window.__target=t;__labels.clear();}''');page.wait_for_timeout(70)
        pos=page.evaluate('__moba.renderer.camera.worldToScreen(__target)');page.mouse.move(pos['x'],pos['y'])
    def click(x=43,y=7,button='left'):
        s=page.evaluate('([x,y])=>__moba.renderer.camera.worldToScreen({x,y})',[x,y]);page.mouse.click(s['x'],s['y'],button=button)
    choose('돈키호테');page.wait_for_function('__moba.game.player.state.villain===__target.id');click(button='right')
    assert page.evaluate('Boolean(__moba.game.player.state.donBarrage)');page.screenshot(path=str(art/'v07-don-mark.png'))
    choose('뫼르소');assert page.evaluate('__moba.game.ammoCap(__moba.game.player)')==3
    page.evaluate('__moba.game.player.ammo=0');click(button='right');assert page.evaluate('__moba.game.player.ammo')==1
    page.keyboard.press('Space');assert page.evaluate('__moba.game.buff(__moba.game.player,"chainArmor")')
    choose('구보')
    page.evaluate('''() => {const g=__moba.game,a=g.makeChampion('yi',0,3);Object.assign(a,{x:42,y:9,maxHp:1000,hp:200,lastDamageAt:g.time});window.__ally=a;}''')
    page.keyboard.press('Space');assert page.evaluate('__moba.game.player.state.guboAim.target===__target')
    page.wait_for_timeout(500);page.screenshot(path=str(art/'v07-gubo-aim-ally-mark.png'))
    page.wait_for_function('__moba.game.projectiles.some(b=>b.ultimate)',timeout=2500)
    page.wait_for_function('__target.hp<10000',timeout=2000)
    choose('가환');page.evaluate('__target.x=48');page.keyboard.press('Space');click(48,7)
    assert page.evaluate('__target.state.gaze[__moba.game.player.id].n')==1
    page.wait_for_timeout(800);assert page.evaluate('__target.state.gaze[__moba.game.player.id].n')==2
    page.wait_for_timeout(800);assert page.evaluate('__target.state.gaze[__moba.game.player.id].n')==3
    choose('넬리');page.evaluate('__target.x=41');click();page.wait_for_timeout(80);click()
    page.evaluate('__moba.game.player.attackCd=0');click();assert page.evaluate('__target.hp<8200')
    page.evaluate('''() => {const p=__moba.game.player;p.ammo=0;p.attackCd=0;}''');page.keyboard.press('Space');click(41,7)
    assert page.evaluate('__moba.game.player.ammo')==2
    choose('묘');assert page.evaluate('__moba.game.ammoCap(__moba.game.player)')==4
    click(button='right');assert page.evaluate('__moba.game.player.ammo')==3
    page.keyboard.press('Space');assert page.evaluate('__moba.game.ammoCap(__moba.game.player)')==6
    page.screenshot(path=str(art/'v07-myo-six-ammo.png'))
    choose('루돌프')
    # Long-lived stage 2 is reached through real continuous-fire input across the three-second cap.
    page.evaluate('''() => {__target.x=43;__target.ammo=3;__target.attackCd=100;}''')
    s=page.evaluate('__moba.renderer.camera.worldToScreen(__target)');page.mouse.move(s['x'],s['y']);page.mouse.down();page.wait_for_timeout(2100);page.mouse.up()
    assert page.evaluate('__target.state.mentalWhip[__moba.game.player.id].stage')==1
    page.wait_for_timeout(600);page.mouse.down();page.wait_for_timeout(2100);page.mouse.up()
    assert page.evaluate('__target.state.mentalWhip[__moba.game.player.id].stage')==2
    page.screenshot(path=str(art/'v07-rudolph-antlers-stage2.png'))
    page.keyboard.press('Space');expect(page.locator('#global-target')).to_be_visible();page.keyboard.press('Escape')
    choose('동백');page.keyboard.press('Space');assert page.evaluate('__moba.targeting.slot')=='r';click(43,7)
    assert page.evaluate('__target.hp<9700');assert page.evaluate('__moba.game.pending.length')==0
    assert page.evaluate('__moba.game.buff(__moba.game.player,"flowerReload")')
    choose('동랑');click(button='right');click(43,7)
    page.wait_for_function('__moba.game.zones.some(z=>z.golden)',timeout=6500)
    assert page.evaluate('__moba.game.zones[0].dealt')==350
    page.evaluate('__target.y=11');page.wait_for_timeout(60)
    page.screenshot(path=str(art/'v07-dongrang-golden-tree.png'))
    # The ground dash still requires an explicit point, and damage/harvest wait for arrival.
    page.keyboard.press('Space');assert page.evaluate('__moba.targeting.slot')=='r';assert page.evaluate('__moba.game.player.rCd')==0
    click(42,7);page.wait_for_function('__moba.game.zones.length===0');assert page.evaluate('__moba.game.player.x')>41.9
    choose('이스마엘');click(button='right');assert page.evaluate('__moba.game.buff(__moba.game.player,"ishmaelShield")')
    page.screenshot(path=str(art/'v07-ishmael-raised-shield.png'))
    page.keyboard.press('Space');assert page.evaluate('__moba.game.player.rCd')>24
    page.wait_for_function('__target.motion?.kind==="knock"');page.wait_for_function('!__target.motion')
    assert page.evaluate('Math.abs(__target.x-__moba.game.player.x-1.11)<.08')
    choose('로쟈');page.evaluate('''() => {__moba.game.random=()=>.1;__moba.game.player.ammo=0;__target.y=15;}''');click(button='right')
    assert page.evaluate('__moba.game.player.ammo')==3
    page.wait_for_function('__labels.has("JACKPOT!")');page.screenshot(path=str(art/'v07-rodya-jackpot.png'))
    page.keyboard.press('Space');page.wait_for_function('__moba.game.zones.some(z=>z.kind==="ice")');page.screenshot(path=str(art/'v07-rodya-missed-ice.png'))
    page.click('#pause');page.click('#leave');page.click('#practice-back');page.click('#menu-codex')
    for name,text in [('구보','7.5'),('가환','0.75'),('넬리','210'),('묘','탄약 1개'),('루돌프','2.15'),('동백','360'),('동랑','빛나는 욕망'),('이스마엘','25초'),('로쟈','잭팟'),('뫼르소','233.75')]:
        page.fill('#roster-search',name);page.click('#roster-list button');expect(page.locator('#roster-detail')).to_contain_text(text)
    assert not errors,errors
    browser.close();print(json.dumps({'status':'passed','checks':['ten adjusted champions with actual mouse/keyboard input','villain and ally reticles','Gubo aim/travel/hit','Gahwan 0/.75/1.5 triple','Nelly mark proc/refill','Myo expanded magazine','Rudolph orange antler staff/debuff stage','Dongbaek instant ult','golden tree conversion/ground dash','Ishmael raised shield/full pull','Rodya jackpot/missed ice','ten codex records'],'page_errors':errors},ensure_ascii=False))
