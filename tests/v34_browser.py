"""Real shop controls, approved art, portrait states, training focus and map pings."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[];result={};page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.35.0')
 page.click('#practice-open');page.click('#start');page.evaluate('()=>{__moba.game.step=()=>{};__moba.game.player.gold=10000;}');page.keyboard.press('g');expect(page.locator('#shop')).to_be_visible()
 expect(page.locator('#shop-tabs [data-group=combat]')).to_be_disabled();expect(page.locator('#shop-tabs [data-group=all]')).to_be_enabled()
 for i in range(3):page.click('#buy-power');page.wait_for_timeout(280)
 expect(page.locator('#shop-tabs [data-group=combat]')).to_be_enabled();page.click('#shop-tabs [data-group=combat]');assert page.locator('.augment-item:visible').count()==7
 result['tab_colors']=page.locator('#shop-tabs button').evaluate_all('es=>es.map(e=>getComputedStyle(e).borderColor)');assert result['tab_colors'][1:]==['rgb(239, 121, 83)','rgb(164, 219, 116)','rgb(140, 207, 241)']
 page.hover('#select-augment-wisdom');expect(page.locator('#detail-name')).to_have_text('지혜성도');expect(page.locator('#detail-buy')).to_be_enabled();before=page.evaluate('__moba.game.player.gold');page.click('#select-augment-wisdom');assert page.evaluate('__moba.game.player.augments.length')==0;page.dblclick('#select-augment-wisdom');page.wait_for_function('__moba.game.player.augments.includes("wisdom")');assert page.evaluate('__moba.game.player.gold')==before-500;page.wait_for_timeout(280);page.dblclick('#select-augment-wisdom');assert page.evaluate('__moba.game.player.augments.length')==1;assert page.evaluate('__moba.game.player.gold')==before-500;page.click('#shop-sell');page.wait_for_function('!__moba.game.player.augments.includes("wisdom")');page.wait_for_timeout(280);page.dblclick('#select-augment-wisdom');page.wait_for_function('__moba.game.player.augments.includes("wisdom")');assert page.locator('#augment-tray button').count()==1
 result['angle']=page.evaluate("async()=>{const a=await import('./src/augment-art.js');return a.AUGMENT_ANGLES.wisdom;}");assert abs(result['angle']+3.141592653589793/4)<1e-9
 result['border']=page.locator('#select-augment-wisdom canvas').evaluate('e=>getComputedStyle(e).borderColor');assert result['border']=='rgb(239, 121, 83)';result['black_background']=page.locator('#select-augment-wisdom canvas').evaluate('e=>Array.from(e.getContext("2d").getImageData(0,0,1,1).data)');assert result['black_background']==[0,0,0,255]
 page.wait_for_timeout(300);page.screenshot(path=str(art/'v34-shop-combat.png'))
 page.evaluate('()=>{const p=__moba.game.player;p.x=35;p.y=23;}');page.wait_for_timeout(150);expect(page.locator('#shop')).to_be_visible();page.hover('#select-augment-power15');expect(page.locator('#detail-buy')).to_be_disabled();page.keyboard.press('g');page.keyboard.press('g');expect(page.locator('#shop')).to_be_visible();page.hover('#select-augment-power15');expect(page.locator('#detail-buy')).to_be_disabled();page.screenshot(path=str(art/'v34-shop-browse.png'));page.click('#shop-close')
 # Portraits reflect death and bounty, with actual face crops rather than text initials.
 assert page.locator('.match-face').count()==8
 page.evaluate('()=>{const g=__moba.game,e=g.champions(1)[0];g.kill(e,g.player);g.player.streak=3;}');page.wait_for_timeout(180);assert page.locator('#enemy-portraits .dead').count()==1;expect(page.locator('#enemy-portraits .dead small')).not_to_be_empty();assert page.locator('#ally-portraits i:not(.hidden)').count()==1
 page.screenshot(path=str(art/'v34-portrait-status.png'))
 # Hold TAB and exercise all three physical mouse buttons; no combat action leaks.
 page.keyboard.down('Tab');expect(page.locator('#scoreboard')).to_be_visible()
 for button,kind in [('left','attack'),('middle','defend'),('right','danger')]:
  page.evaluate('()=>{__moba.game.time+=1;}');box=page.locator('#score-map').bounding_box();page.mouse.click(box['x']+box['width']*.5,box['y']+box['height']*.3,button=button);assert page.evaluate('__moba.game.pings.at(-1).kind')==kind
  assert not page.evaluate('__moba.game.input.fire');expect(page.locator('#scoreboard')).to_be_visible()
 page.screenshot(path=str(art/'v34-minimap-pings.png'));page.keyboard.up('Tab');expect(page.locator('#scoreboard')).to_be_hidden()
 # A targeted map ping carries the identity of the selected visible champion.
 page.evaluate('()=>{const g=__moba.game;g.time+=1;const e=g.champions(1).find(e=>e.alive);e.x=50;e.y=23;}');page.keyboard.down('Tab');box=page.locator('#score-map').bounding_box();coords=page.evaluate('()=>{const g=__moba.game,e=g.champions(1).find(e=>e.alive),b=g.bounds;return [(e.x-b.x)/b.w,(e.y-b.y)/b.h,e.id]}');page.mouse.click(box['x']+box['width']*coords[0],box['y']+box['height']*coords[1]);assert page.evaluate('__moba.game.pings.at(-1).targetId')==coords[2];page.keyboard.up('Tab')
 page.click('#pause');page.click('#leave');page.click('#practice-back');page.click('#training-open');page.click('#start');page.evaluate('()=>{__moba.game.step=()=>{};}');page.keyboard.press('g');page.click('#training-buy-procedures');page.wait_for_function('Object.values(__moba.game.player.upgrades).join(",")==="5,5,3,3,3"');expect(page.locator('#shop-tabs [data-group=tech]')).to_be_enabled();page.click('#shop-tabs [data-group=tech]')
 for key in ['magazine2','maskDeLu','carrier']:
  page.wait_for_timeout(280);page.hover('#select-augment-'+key);expect(page.locator('#detail-buy')).to_be_enabled();page.click('#detail-buy');page.wait_for_function('(key)=>__moba.game.player.augments.includes(key)',arg=key)
 assert page.locator('#augment-tray.carrier').count()==1;assert page.locator('#augment-tray').evaluate('e=>e.children.length')==6
 page.hover('#select-augment-highRisk');expect(page.locator('#detail-buy')).to_be_disabled();page.screenshot(path=str(art/'v34-tech-inventory.png'))
 page.wait_for_timeout(280);page.click('#training-sell-procedures');page.wait_for_function('Object.values(__moba.game.player.upgrades).every(n=>n===0)');assert page.evaluate('__moba.game.player.augments.length')==3;page.click('#shop-close')
 page.click('#training-level-open');page.click('[data-level="7"]');assert page.evaluate('__moba.game.player.level')==7
 page.click('#training-level-open');page.click('#training-pause-xp');expect(page.locator('#training-pause-xp')).to_have_attribute('aria-pressed','true');page.locator('#training-level-dialog .close-dialog').click()
 old=page.evaluate('__moba.game.player.xp');page.evaluate('()=>{const g=__moba.game;g.award(g.player,10000,20);Object.getPrototypeOf(g).step.call(g,.1);}');assert page.evaluate('__moba.game.player.xp')==old
 page.click('#training-level-open');page.click('[data-level="2"]');assert page.evaluate('__moba.game.player.level')==2
 # A checkbox click must not leave Space toggling that checkbox again.
 page.locator('#training-ai').check();assert page.evaluate('__moba.game.practice.championAI');page.keyboard.press('Space');assert page.evaluate('__moba.game.practice.championAI');assert page.evaluate('__moba.game.targeting?.slot')=='r';page.keyboard.press('Escape')
 result['icons']=page.evaluate('()=>Array.from(document.querySelectorAll("#augment-list canvas")).map(c=>({key:c.dataset.augment,loaded:!!c.dataset.painted,w:c.width,h:c.height}))');assert len(result['icons'])==21 and all(e['loaded'] and e['w']==e['h'] for e in result['icons'])
 page.keyboard.press('g');page.wait_for_timeout(300);page.screenshot(path=str(art/'v34-shop-training.png'))
 for w,h in [(390,844),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(180);assert page.locator('#shop').evaluate('e=>e.scrollWidth<=e.clientWidth+1');page.screenshot(path=str(art/f'v34-shop-{w}.png'))
 assert not errors,errors;b.close();print(json.dumps({'result':result,'errors':errors},ensure_ascii=False))
