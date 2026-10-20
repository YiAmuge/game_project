"""v0.6 actual input, terrain projections, creep windups, new champions and timed result."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''(() => {window.__drawnLabels=new Set();const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(window.__drawnLabels.size<4000)__drawnLabels.add(String(text));return draw.call(this,text,...args);};})();''')
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5173')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.champion-option')).to_have_count(24)
    page.wait_for_function('__moba.renderer.atlasV06.naturalWidth>0')
    def choose(name):
        if page.evaluate('__moba.mode')=='playing':page.click('#pause');page.click('#leave')
        if page.evaluate('__moba.mode')=='menu':page.click('#practice-open')
        page.get_by_role('button',name=name+' 선택').click();page.click('#start')
        page.evaluate('''() => {const g=__moba.game;g.aiChampion=()=>{};g.aiMinion=()=>{};g.aiStructure=()=>{};g.aiNeutral=()=>{};g.player.x=40;g.player.y=7;const t=(g.champions(1).find(c=>c.key==='faust')||g.makeChampion('faust',1,8));t.x=42;t.y=7;t.hp=t.maxHp=100000;window.__drawnLabels.clear();}''');page.wait_for_timeout(90)
    def click(x=42,y=7,button='left'):
        s=page.evaluate('([x,y])=>__moba.renderer.camera.worldToScreen({x,y})',[x,y]);page.mouse.click(s['x'],s['y'],button=button)
    choose('파우스트');click(button='right')
    assert page.evaluate('__moba.game.player.qCd')>9
    assert not page.evaluate('Boolean(__moba.targeting)')
    page.keyboard.press('Space');assert page.evaluate('__moba.targeting.slot')=='r';assert page.evaluate('__moba.game.player.rCd')==0
    page.keyboard.press('Escape');assert page.evaluate('__moba.game.player.rCd')==0
    page.keyboard.press('Space');click(46,8);assert page.evaluate('__moba.game.pending[0].x')>45
    choose('구보');click(button='right');assert page.evaluate('__moba.game.buff(__moba.game.player,"guboReload")')
    page.wait_for_function('[...__drawnLabels].some(s=>s.includes("아군 ≤35%"))')
    page.screenshot(path=str(art/'v06-gubo-gauge.png'))
    choose('넬리');assert page.evaluate('__moba.game.player.ammo')==4
    before=page.evaluate('__moba.game.champions(1).find(c=>c.key==="faust").hp');click();page.wait_for_timeout(180)
    after=page.evaluate('__moba.game.champions(1).find(c=>c.key==="faust").hp');assert 200<before-after<230
    choose('가환');page.keyboard.press('Space');assert page.evaluate('__moba.targeting.slot')=='r';click(48,7)
    assert page.evaluate('__moba.game.pending.length')==2
    assert page.evaluate('__moba.game.pending.every(e=>e.x>47)')
    page.screenshot(path=str(art/'v06-gahwan-ground-ult.png'))
    choose('에이해브');page.keyboard.press('Space');assert page.evaluate('__moba.game.player.x')==40;click(44,7)
    assert page.evaluate('__moba.game.player.x')>43.8
    assert not page.evaluate('Boolean(__moba.game.player.motion)')
    for name,key in [('루돌프','rudolph'),('묘','myo'),('동백','dongbaek'),('동랑','dongrang')]:
        choose(name);assert page.evaluate('__moba.renderer.atlasFor(__moba.game.player.key)===__moba.renderer.atlasV06')
        page.screenshot(path=str(art/f'v06-{key}.png'))
        if key=='rudolph':
            page.keyboard.press('Space');expect(page.locator('#global-target')).to_be_visible();assert page.evaluate('__moba.game.player.rCd')==0
            page.keyboard.press('Escape');assert page.evaluate('__moba.game.player.ammo')==100
            page.keyboard.press('Space');box=page.locator('#target-map').bounding_box()
            page.locator('#target-map').click(position={'x':box['width']*.5,'y':box['height']*((-3.8+8)/62.8)})
            expect(page.locator('#global-target')).to_be_hidden()
            assert abs(page.evaluate('__moba.game.pending[0].y')+3.8)<.2
        if key=='myo':
            click(button='right');assert page.evaluate('__moba.game.player.ammo')==3
            page.keyboard.press('Space');assert page.evaluate('__moba.game.buff(__moba.game.player,"rabbitFrenzy")')
            assert not page.evaluate('Boolean(__moba.targeting)')
        if key=='dongbaek':
            click(button='right');assert page.evaluate('__moba.game.shield(__moba.game.player)')>0
            page.keyboard.press('Space');assert page.evaluate('__moba.targeting.slot')=='r';click(47,7)
            assert page.evaluate('__moba.game.pending.length')==0
            assert page.evaluate('__moba.game.buff(__moba.game.player,"flowerReload")')
            page.screenshot(path=str(art/'v06-spicebush-ult.png'))
        if key=='dongrang':
            click(button='right');assert page.evaluate('__moba.targeting.slot')=='q';click(42,7)
            assert page.evaluate('__moba.game.zones.filter(z=>z.kind==="desireTree").length')==1
            page.wait_for_timeout(1600);assert page.evaluate('__moba.game.player.totalHealingReceived')>0
            page.screenshot(path=str(art/'v06-desire-tree.png'))
            page.keyboard.press('Space');assert page.evaluate('__moba.targeting.slot')=='r';click(41,7);page.wait_for_timeout(400);assert page.evaluate('__moba.game.zones.length')==0
    # Test both creep warnings through their actual AI and real-time renderer.
    for camp in ['amplify','blessing']:
        choose('파우스트')
        page.evaluate('''camp => {const g=__moba.game,n=g.units.find(e=>e.camp===camp);g.player.x=n.x+2;g.player.y=n.y;g.aiNeutral=(e,dt)=>{if(e===n)Object.getPrototypeOf(g).aiNeutral.call(g,e,dt);};g.deal(g.player,n,1,{fixed:true});g.__pattern=n;}''',camp)
        page.wait_for_function('Boolean(__moba.game.__pattern.pattern)',timeout=3000)
        assert page.evaluate('__moba.game.__pattern.pattern.kind')==camp
        page.wait_for_function('__drawnLabels.has("집중 중 · 받는 피해 +20%")')
        page.screenshot(path=str(art/f'v06-{camp}-warning.png'))
        page.wait_for_function('!__moba.game.__pattern.pattern',timeout=4000)
        assert page.evaluate('__moba.game.player.hp<__moba.game.player.maxHp')
    # Rear well and outer camps are included in the minimap and real camera coordinates.
    choose('파우스트');page.keyboard.press('KeyB');page.wait_for_function('__moba.game.inSpawn(__moba.game.player)',timeout=5000)
    assert page.evaluate('__moba.game.player.x')<0
    page.keyboard.press('KeyG');expect(page.locator('#shop')).to_be_visible();page.click('#shop-close')
    page.screenshot(path=str(art/'v06-rear-well.png'))
    for y,label in [(-3.8,'north'),(50.6,'south')]:
        page.evaluate('y=>{__moba.game.player.x=41.6;__moba.game.player.y=y;}',y);page.wait_for_timeout(100)
        page.screenshot(path=str(art/f'v06-{label}-camp.png'))
        assert page.evaluate('name=>__moba.game.campViews().find(c=>c.id==="side-"+name).units.length',label)==2
    page.keyboard.down('Tab');expect(page.locator('#scoreboard')).to_be_visible();page.screenshot(path=str(art/'v06-whole-map.png'));page.keyboard.up('Tab')
    # Render marching minions after their staggered spawn, away from any fight.
    choose('파우스트');page.evaluate('''() => {const g=__moba.game;g.player.x=12;g.player.y=14;g.aiMinion=(e,dt)=>Object.getPrototypeOf(g).aiMinion.call(g,e,dt);}''')
    page.wait_for_timeout(2700);page.screenshot(path=str(art/'v06-minion-column.png'))
    assert page.evaluate('__moba.game.units.filter(m=>m.kind==="minion"&&m.team===0&&m.lane===0).length')==4
    # One remaining tower unlocks its core and visibly shows the damage reduction.
    page.evaluate('''() => {const g=__moba.game;g.towers(1)[0].alive=false;const c=g.units.find(e=>e.kind==='core'&&e.team===1);g.player.x=c.x-3;g.player.y=c.y;}''')
    page.wait_for_function('[...__drawnLabels].some(s=>s.includes("본진 · 받는 피해 −50%"))')
    page.screenshot(path=str(art/'v06-core-shield.png'))
    page.evaluate('''() => {const g=__moba.game;g.time=1199.97;}''')
    expect(page.locator('#result')).to_be_visible();expect(page.locator('#result-reason')).to_contain_text('20분 판정')
    assert page.evaluate('__moba.game.winner')==0
    assert abs(page.evaluate('__moba.game.time')-1200)<1e-6
    page.screenshot(path=str(art/'v06-time-verdict.png'))
    page.click('#restart');page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    assert not errors,errors
    browser.close();print(json.dumps({'status':'passed','checks':['24 ordinary/five atlases','selective quickcast/coordinate confirmation','Gubo 35% timed gauge','Nelly single hit/4 ammo','Gahwan ground triple ultimate','Ahab teleport','four new sprites and skills','global map negative coordinates','two creep warnings/windup damage','moved rear wells/recall/shop','both two-unit flank rooms/minimap','minion column','core partial shield','20-minute result/frozen clock','mobile overflow'],'page_errors':errors},ensure_ascii=False))
