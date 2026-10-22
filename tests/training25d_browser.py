"""Real WebGL geometry, ray picking, occlusion and independent practice controls."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
url=os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1'
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if 'GL_INVALID_' in m.text else None)
    page.goto(url,wait_until='networkidle');expect(page.locator('#main-menu .menu-action')).to_have_count(5)
    page.click('#training-25d-open');expect(page.locator('#start')).to_contain_text('2.5D');expect(page.locator('#position-select')).to_be_hidden()
    page.get_by_role('button',name='소라 선택',exact=True).click();page.click('#start')
    expect(page.locator('#arena-3d')).to_be_visible();expect(page.locator('#field-title')).to_contain_text('2.5D');expect(page.locator('#phase')).to_contain_text('시간 제한 없음')
    page.wait_for_function('__moba.renderer.scene25d.webgl.info.render.triangles>100')
    assert page.evaluate('__moba.game.map.id==="training-25d"&&__moba.renderer.scene25d.walls.every(w=>w.mesh.geometry.type==="BoxGeometry")')
    assert page.evaluate('[...__moba.renderer.scene25d.structures.values()].every(g=>g.children.some(o=>o.geometry.type==="CylinderGeometry"))')
    page.screenshot(path=str(art/'v23-training25d-spawn.png'))
    def aim(x,y):
        s=page.evaluate('([x,y])=>{const r=__moba.renderer;r.resize();r.follow(__moba.game,true);const s=r.camera.worldToScreen({x,y}),b=r.canvas.getBoundingClientRect();return {x:s.x+b.left,y:s.y+b.top};}',[x,y]);page.mouse.move(s['x'],s['y'])
    def setpos(x,y):page.evaluate('([x,y])=>{const p=__moba.game.player;delete p.motion;Object.assign(p,{x,y,attackCd:0});}',[x,y])
    def teleport(x,y):
        page.click('#training-teleport');box=page.locator('#target-map').bounding_box();bounds=page.evaluate('__moba.game.bounds')
        page.mouse.click(box['x']+x/bounds['w']*box['width'],box['y']+y/bounds['h']*box['height']);expect(page.locator('#global-target')).to_be_hidden()
        assert page.evaluate('([x,y])=>Math.hypot(__moba.game.player.x-x,__moba.game.player.y-y)<.1',[x,y])
    # Real projected ground clicks hit the original champion-class training target.
    setpos(23.8,40);aim(25,40);page.mouse.down();page.mouse.up()
    page.wait_for_function('__moba.game.champions(1).some(e=>e.trainingDummy?.meter?.total>0)')
    page.screenshot(path=str(art/'v23-training25d-attack.png'))
    page.check('#training-infinite-ammo');page.check('#training-no-cooldown');page.check('#training-invincible')
    page.click('#training-panel-toggle');expect(page.locator('#training-options')).to_be_hidden();page.click('#training-panel-toggle')
    teleport(18,35);page.keyboard.press('g');expect(page.locator('#shop')).to_be_visible();page.click('#buy-power');assert page.evaluate('__moba.game.player.upgrades.power===1');page.click('#shop-close')
    # Actual view rays fade both a wall and a 3D tower, then restore opacity.
    setpos(20,29.8);page.wait_for_function('__moba.renderer.scene25d.walls.some(w=>w.mesh.material.opacity<.5)')
    page.screenshot(path=str(art/'v23-training25d-wall-fade.png'))
    setpos(10,6.4);page.wait_for_function('[...__moba.renderer.scene25d.structures.values()].some(g=>g.userData.occluding)')
    assert page.evaluate('[...__moba.renderer.scene25d.structures.values()].filter(g=>g.userData.occluding).every(g=>g.children.every(o=>o.material.opacity<.5&&!o.material.depthWrite))')
    page.screenshot(path=str(art/'v23-training25d-tower-fade.png'))
    setpos(41,23);page.wait_for_function('[...__moba.renderer.scene25d.structures.values()].every(g=>!g.userData.occluding)')
    # Any champion, not just the controlled one, can fade an occluding object.
    setpos(24,26)
    page.evaluate('()=>{window.__spawn=__moba.game.makeChampion("yan",1,18);Object.assign(__spawn,{x:20,y:29.8,trainingSummoned:true});}')
    page.wait_for_function('__moba.renderer.scene25d.walls.some(w=>w.mesh.userData.occluding)')
    page.evaluate('__spawn.alive=false');page.wait_for_function('__moba.renderer.scene25d.walls.every(w=>!w.mesh.userData.occluding)')
    teleport(62,38);page.screenshot(path=str(art/'v23-training25d-camps.png'))
    page.select_option('#training-champion','yan');page.click('#training-change-champion');setpos(23,40);aim(25,40)
    page.mouse.down();page.wait_for_timeout(200);page.mouse.up();page.wait_for_function('!__moba.game.player.state.yanCharge')
    # Form sprites, free shop, summon/removal, death and revival share practice behavior.
    page.evaluate('()=>{const g=__moba.game;g.player.state.ominous=6;g.player.rCd=0;}');aim(25,40);page.locator('#arena').focus();page.keyboard.press('Space')
    page.wait_for_function('__moba.game.buff(__moba.game.player,"yanDistorted")');page.screenshot(path=str(art/'v23-training25d-transformation.png'))
    page.click('#training-summon');page.select_option('#summon-champion','faust');page.click('#summon-confirm');page.click('#summon-enemy')
    box=page.locator('#target-map').bounding_box();page.mouse.click(box['x']+box['width']*.5,box['y']+box['height']*.5);expect(page.locator('#global-target')).to_be_hidden()
    page.click('#training-remove');page.click('#remove-all');expect(page.locator('#training-remove-dialog')).not_to_be_visible()
    page.click('#training-life');expect(page.locator('#training-life')).to_have_text('즉시 부활');page.click('#training-life');page.wait_for_function('__moba.game.player.alive')
    page.evaluate('__moba.game.time=1250;__moba.game.step(.1)');assert page.evaluate('__moba.game.winner===null')
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250);aim(12,40)
    assert page.evaluate('()=>{const r=__moba.renderer,p=r.camera.worldToScreen(__moba.game.player,.85);return Math.abs(p.x-r.width/2)<.1&&Math.abs(p.y-r.height/2)<.1;}')
    page.click('#training-panel-toggle');page.screenshot(path=str(art/'v23-training25d-mobile.png'))
    assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()===0')
    # Leaving the new mode restores the original Canvas2D camera and map.
    page.set_viewport_size({'width':1440,'height':900});page.click('#pause');page.click('#leave');page.click('#practice-back');page.click('#training-open');page.click('#start')
    expect(page.locator('#arena-3d')).to_be_hidden();assert page.evaluate('!__moba.game.training25d&&__moba.game.player.x===8')
    page.click('#pause');page.click('#leave');page.click('#practice-back');page.click('#practice-open');page.click('#start')
    assert page.evaluate('!__moba.game.training&&__moba.game.champions().length===8');expect(page.locator('#arena-3d')).to_be_hidden()
    assert not errors,errors;browser.close()
    # Lack of WebGL fails at entry with a useful message; ordinary play still works.
    blocked=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-webgl'])
    pg=blocked.new_page();pg.goto(url,wait_until='networkidle');pg.click('#training-25d-open');pg.click('#start');expect(pg.locator('#toast')).to_contain_text('WebGL');assert pg.evaluate('__moba.mode')=='practice'
    pg.click('#practice-back');pg.click('#training-open');pg.click('#start');assert pg.evaluate('__moba.game.training&&!__moba.game.training25d');blocked.close()
    print(json.dumps({'geometry':'3D walls and towers','ray_picking':'passed','all_champion_occlusion':'passed','controls_and_transformation':'passed','mobile_and_original_modes':'passed','unsupported_webgl':'passed','errors':errors},ensure_ascii=False))
