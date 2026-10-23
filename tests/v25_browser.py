"""2.5D match/training menus, flat marks, shop constraints and champion HUD."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
base=os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.28.0')
 expect(page.locator('#main-menu .menu-action')).to_have_count(4);expect(page.locator('#training-25d-open')).to_have_count(0)
 page.click('#practice-open');page.click('[data-position=top]');page.get_by_role('button',name='뫼르소 선택',exact=True).click();expect(page.locator('#selected-role')).to_have_text('보호 · 방해')
 assert {'selected','recommended'} <= set(page.locator('[data-key=meursault].champion-option').get_attribute('class').split())
 page.click('#start');page.wait_for_function('__moba.game.time>.2')
 assert page.evaluate('__moba.game.training25d&&!__moba.game.training&&__moba.renderer.scene25d.layout.id==="match"')
 assert page.evaluate('__moba.renderer.scene25d.structures.size')==6
 expect(page.locator('#passive-slot')).to_be_visible();expect(page.locator('#passive-slot span')).to_have_text('이방인')
 assert '침묵' in page.locator('#passive-slot').get_attribute('title')
 page.screenshot(path=str(art/'v25-match.png'))
 # Use the actual menu handler while its desktop header is hidden during play.
 page.evaluate('document.getElementById("home").click()');page.click('#training-open');page.get_by_role('button',name='이상 선택',exact=True).click();page.click('#start')
 page.wait_for_function('__moba.game.training&&__moba.renderer.scene25d.layout.id!=="match"')
 page.evaluate('''()=>{const g=__moba.game,p=g.player;window.__realStep=g.step;g.step=()=>{};g.time=4;g.practice.lineStopped=true;g.units=[p];Object.assign(p,{x:20,y:38,hp:p.maxHp*.6});g.addShield(p,p.maxHp*.2,'test',10);p.passiveReady=5.5;g.effects=[];g.zones=[];g.projectiles=[];}''')
 page.wait_for_timeout(150);expect(page.locator('#passive-slot .cooldown')).to_have_text('1.5')
 # Verify both distinct directive marks are rendered once in an upright HUD pass.
 marks=page.evaluate('''async()=>{const {mark}=await import('./src/sora.js');const Y=await import('./src/yan.js');const g=__moba.game,p=g.player,s=__moba.renderer.scene25d;const a=g.makeChampion('sora',1,20),b=g.makeChampion('yan',1,21);Object.assign(a,{x:24,y:38});Object.assign(b,{x:26,y:38});mark(g,a,p);Y.mark(g,b,p);const samples=[];const ctx=__moba.renderer.ctx,original=ctx.bezierCurveTo.bind(ctx);ctx.bezierCurveTo=(...args)=>{const m=ctx.getTransform();samples.push([m.a,m.b,m.c,m.d]);return original(...args);};__moba.renderer.draw(g,true);ctx.bezierCurveTo=original;return samples;}''')
 assert marks and all(abs((m[0]**2+m[1]**2)-(m[2]**2+m[3]**2))<1e-6 and abs(m[0]*m[2]+m[1]*m[3])<1e-6 for m in marks),marks
 page.screenshot(path=str(art/'v25-marks-shield-passive.png'))
 page.keyboard.press('KeyG');expect(page.locator('#shop')).to_be_visible()
 for key in ['power','health']:
  page.evaluate('(key)=>{__moba.game.player.upgrades[key]=3}',key)
 page.wait_for_timeout(150)
 for key in ['power15','range7','blackOrb','forceBattery']:
  page.locator('#augment-'+key).click();page.wait_for_timeout(280)
 assert page.evaluate('__moba.game.player.augments.length')==4
 expect(page.locator('#augment-finalBullet')).to_be_disabled();expect(page.locator('#augment-kAmpule')).to_be_disabled();expect(page.locator('#augment-count')).to_contain_text('4 / 4')
 page.click('#select-augment-blackOrb');page.click('#shop-sell');page.wait_for_timeout(280)
 expect(page.locator('#augment-kAmpule')).to_be_enabled();expect(page.locator('#augment-finalBullet')).to_be_disabled()
 page.screenshot(path=str(art/'v25-shop.png'));page.click('#shop-close')
 page.evaluate('''()=>{const g=__moba.game;g.units=g.units.filter(e=>e.player);g.step=__realStep;g.time=1250;g.practice.invincible=true;}''');page.wait_for_timeout(120);assert page.evaluate('__moba.game.winner===null')
 # Ray picking remains exact in every mode, including viewport changes.
 for w,h in [(1920,1080),(390,844),(844,390)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100)
  result=page.evaluate('''()=>{const r=__moba.renderer,c=r.camera,g=__moba.game;c.update(r.width,r.height,g.player);const p={x:g.player.x+4,y:g.player.y-2},s=c.worldToScreen(p),back=c.screenToWorld(s.x,s.y);const gl=r.scene25d.webgl.getContext();return {error:Math.hypot(back.x-p.x,back.y-p.y),pixels:gl.drawingBufferWidth*gl.drawingBufferHeight,gl:gl.getError()};}''')
  assert result['error']<1e-6 and result['pixels']<=921600 and result['gl']==0,result
 page.screenshot(path=str(art/'v25-mobile.png'));assert not errors,errors;b.close()
 print(json.dumps({'match_and_training':'2.5D','menus':4,'meursault':'보호 · 방해 / 탑','marks':'upright','passive':'cooldown shown','augments':'4 total / 2 per category','viewports':3,'errors':errors},ensure_ascii=False))
