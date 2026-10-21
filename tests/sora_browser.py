"""Real input, both sprite forms, directive UI and transformed skill behavior."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
 expect(page.locator('.build-tag')).to_contain_text('0.13.0');page.click('#practice-open');expect(page.locator('.champion-option')).to_have_count(28)
 page.get_by_role('button',name='소라 선택').click();expect(page.locator('#selected-role')).to_have_text('암살');page.wait_for_function('__moba.renderer.atlasV13.naturalWidth>0')
 page.screenshot(path=str(art/'sora-selection-round-glasses.png'));page.click('#archive-open');expect(page.locator('#roster-list button')).to_have_count(33);page.fill('#roster-search','소라');page.click('#roster-list button')
 for text in ['해금','20%','5초','동그란 안경','0.2초','전투력 +25%']:
  expect(page.locator('#roster-detail')).to_contain_text(text)
 page.screenshot(path=str(art/'sora-codex.png'));page.click('#archive .close-dialog');page.click('#start')
 page.evaluate('''() => {const g=__moba.game,p=g.player;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];const t=g.makeNeutral(42,7,'side');t.maxHp=t.hp=1000;window.__creep=t;window.__labels=new Set();const draw=__moba.renderer.text.bind(__moba.renderer);__moba.renderer.text=(s,...args)=>{__labels.add(s);return draw(s,...args);};g.time=2.99;}''')
 page.wait_for_function('__moba.game.player.state.orders[__creep.id]');page.wait_for_function('Array.from(__labels).some(t=>String(t).startsWith("지령"))')
 page.screenshot(path=str(art/'sora-normal-directive.png'))
 def click(x,y,button='left'):
  s=page.evaluate('([x,y])=>__moba.renderer.camera.worldToScreen({x,y})',[x,y]);page.mouse.move(s['x'],s['y']);page.mouse.click(s['x'],s['y'],button=button)
 # Real basic: directive damage crosses the threshold and unlocks a stack.
 page.evaluate('__moba.game.deal(__moba.game.player,__creep,50,{fixed:true})');click(42,7);page.wait_for_function('__moba.game.player.state.unlock===1')
 # Ordinary ultimate marks without confirmation; Q needs a coordinate click.
 page.keyboard.press('Space');page.wait_for_function('__moba.game.player.rCd>0');page.evaluate('__moba.game.player.ammo=0');click(44.5,7,button='right');assert page.evaluate('__moba.game.targeting.slot')=='q'
 page.screenshot(path=str(art/'sora-normal-dash-preview.png'));click(44.5,7);page.wait_for_function('__moba.game.stat(__creep,"stun")>0');assert page.evaluate('__moba.game.player.ammo')>=1
 page.wait_for_function('!__moba.game.player.motion')
 # Earn ninth stack through the actual damage/mark hook, despite remaining R cooldown.
 page.evaluate('''() => {const g=__moba.game,p=g.player;p.state.unlock=8;p.rCd=0;g.cast(p,'r',p);g.deal(p,__creep,220,{fixed:true});p.hp=p.maxHp*.5;p.lastAttackAt=100;p.lastDamageAt=100;window.__normalMax=p.maxHp;}''')
 page.wait_for_function('__moba.game.player.state.unlock===9');expect(page.locator('#r-btn span')).to_have_text('개화 E.G.O::대행');normal_face=page.locator('#hud-face').evaluate('(c)=>c.toDataURL()')
 page.keyboard.press('Space');page.wait_for_function('__moba.game.player.state.egoActive');expect(page.locator('#basic-btn span')).to_have_text('대행: 새기기');expect(page.locator('#q-btn span')).to_have_text('대행: 말살');expect(page.locator('#r-btn span')).to_have_text('대행 전개 중')
 assert abs(page.evaluate('__moba.game.player.maxHp/__normalMax')-.8)<1e-6;assert page.evaluate('__moba.game.player.state.unlock')==0
 page.wait_for_function('document.querySelector("#hud-face").dataset.form==="soraEgo"');assert page.locator('#hud-face').evaluate('(c)=>c.toDataURL()')!=normal_face
 page.evaluate('''() => {const g=__moba.game,p=g.player,t=g.makeChampion('faust',1,9),back=g.makeChampion('faust',1,10);Object.assign(t,{x:p.x+1.6,y:p.y,hp:10000,maxHp:10000,lastDamageAt:100});Object.assign(back,{x:p.x-1.5,y:p.y,hp:10000,maxHp:10000,lastDamageAt:100});g.units=[p,t,back];window.__target=t;window.__back=back;p.attackCd=0;p.ammo=2;}''')
 click(44,7);page.wait_for_function('__target.hp<10000&&__back.hp<10000');page.screenshot(path=str(art/'sora-ego-round-glasses-black-arms.png'))
 page.evaluate('__moba.game.player.qCd=0');click(44.5,7,button='right');assert page.evaluate('__moba.game.targeting.slot')=='q';click(44.5,7)
 immunity=page.evaluate('''() => {const g=__moba.game;return {moving:!!g.player.motion,damage:g.deal(__target,g.player,1000,{fixed:true})};}''');assert immunity=={'moving':True,'damage':0}
 page.wait_for_function('!__moba.game.player.motion');page.wait_for_function('__moba.game.stat(__target,"slow")===.3');page.screenshot(path=str(art/'sora-ego-trail.png'));assert page.evaluate('__moba.game.player.invulnerableUntil<=__moba.game.time')
 page.evaluate('__moba.game.time+=5.05');page.wait_for_function('!__moba.game.player.state.egoActive');expect(page.locator('#basic-btn span')).to_have_text('머리 으깨기');expect(page.locator('#q-btn span')).to_have_text('얌전히 으깨져주세요');expect(page.locator('#r-btn span')).to_have_text('단말기로 정해진 지령');assert abs(page.evaluate('__moba.game.player.maxHp/__normalMax')-1)<1e-6
 page.screenshot(path=str(art/'sora-returned-normal.png'));page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150);assert page.evaluate('document.body.scrollWidth<=innerWidth');page.screenshot(path=str(art/'sora-mobile.png'))
 assert not errors,errors;b.close();print(json.dumps({'status':'passed','checks':['28 selectable champions, 33 codex records and source stats','both normal/EGO sprites with round eyeglasses','visible directive mark and unlock meter','LMB mark damage and stack acquisition','normal Space directive and coordinate-confirm Q refill','ninth-stack Space transformation bypasses previous R cooldown','dynamic basic/Q/R names and transformed portrait','360-degree basic attack and detached black arms','invulnerable dash, path cuts and restored vulnerability','five-second expiry restores body, HP cap and skills','mobile layout'],'page_errors':errors},ensure_ascii=False))
