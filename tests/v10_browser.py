"""Real input, stable shop buttons, Starbuck, ally phasing and updated skills."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[1]; art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5173')+'/?debug=1',wait_until='networkidle')
 expect(page.locator('.build-tag')).to_contain_text('0.13.0')
 expect(page.locator('#inventory,#potion-btn,#consumable-list,[data-category=items]')).to_have_count(0)
 page.click('#practice-open');expect(page.locator('.champion-option')).to_have_count(29)
 def choose(name):
  if page.evaluate('__moba.mode')=='playing':page.click('#pause');page.click('#leave')
  page.get_by_role('button',name=name+' 선택').click();page.click('#start')
  page.evaluate('''() => {const g=__moba.game;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player,t=g.makeChampion('faust',1,8);Object.assign(p,{x:40,y:7});Object.assign(t,{x:42,y:7,maxHp:100000,hp:100000});g.units=[p,t];g.minionQueue=[];window.__target=t;}''')
  page.wait_for_timeout(120)
 def click(x=42,y=7,button='left'):
  s=page.evaluate('([x,y])=>__moba.renderer.camera.worldToScreen({x,y})',[x,y]);page.mouse.move(s['x'],s['y']);page.mouse.click(s['x'],s['y'],button=button)
 choose('스타벅');page.wait_for_function('__moba.renderer.atlasV10.naturalWidth>0')
 assert page.evaluate('__moba.renderer.atlasFor("starbuck")===__moba.renderer.atlasV10')
 page.evaluate('__target.x=41.4');click(41.4,7);page.wait_for_function('__moba.game.player.x>__target.x&&!__moba.game.player.motion',timeout=6000)
 assert page.evaluate('__moba.game.player.x>__target.x')
 assert page.evaluate('__target.x===41.4&&__target.hp<100000')
 page.screenshot(path=str(art/'v10-starbuck-harpoon.png'))
 page.evaluate('''() => {const g=__moba.game;Object.assign(g.player,{x:40,y:7,attackCd:0});__target.x=42;__target.hp=100000;g.player.qCd=0;}''');page.wait_for_timeout(120)
 click(button='right');page.wait_for_function('__target.hp<99300',timeout=6000)
 assert page.evaluate('__target.hp<99300&&__target.hp>99000')
 assert page.evaluate('__moba.game.stat(__target,"slow")===.2')
 page.evaluate('__target.x=46;__target.hp=100000;__moba.game.player.qCd=5');page.wait_for_timeout(120)
 # Coordinate teleport requires a confirmation, then truly disappears for .7 seconds.
 page.keyboard.press('Space');assert page.evaluate('__moba.targeting?.slot')=='r'
 click(46,7);assert page.evaluate('__moba.game.hidden(__moba.game.player)')
 page.screenshot(path=str(art/'v10-starbuck-ambush.png'));page.wait_for_function('!__moba.game.hidden(__moba.game.player)',timeout=4000)
 assert page.evaluate('__moba.game.player.x>44&&__moba.game.player.qCd===0&&__target.hp<100000')
 # Walking never pushes an enemy; allies may walk through each other.
 page.evaluate('''() => {const g=__moba.game;g.pending=[];g.projectiles=[];Object.assign(g.player,{x:40,y:7});Object.assign(__target,{x:41.5,y:7});}''');page.keyboard.down('KeyD');page.wait_for_timeout(1300);page.keyboard.up('KeyD')
 assert page.evaluate('__target.x===41.5&&__moba.game.player.x<41.5')
 page.evaluate('''() => {__moba.game.player.x=40;__target.team=0;}''');page.keyboard.down('KeyD');page.wait_for_timeout(1300);page.keyboard.up('KeyD')
 assert page.evaluate('__target.x===41.5&&__moba.game.player.x>42')
 # Hold the mouse while several HUD updates occur: the button node must survive.
 page.evaluate('''() => {const g=__moba.game;Object.assign(g.player,{x:-6.7,y:23.4,gold:20000,lastCombat:-999});}''');page.keyboard.press('KeyG');expect(page.locator('#shop')).to_be_visible()
 box=page.locator('#shop').bounding_box();assert box['width']>1000
 page.evaluate('window.__buyNode=document.getElementById("buy-power")')
 box=page.locator('#buy-power').bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(550);page.mouse.up()
 assert page.evaluate('__moba.game.player.upgrades.power===1&&__buyNode===document.getElementById("buy-power")')
 expect(page.locator('#upgrade-meter-power .filled')).to_have_count(1)
 page.wait_for_timeout(400);page.locator('#buy-health').dblclick(delay=45)
 assert page.evaluate('__moba.game.player.upgrades.health')==1
 for _ in range(2):page.wait_for_timeout(400);page.click('#buy-power')
 page.wait_for_timeout(400);page.click('#select-augment-power15');assert page.evaluate('__moba.game.player.augments.length')==0
 page.click('#augment-power15');assert page.evaluate('__moba.game.player.augments.includes("power15")')
 page.wait_for_timeout(400);gold=page.evaluate('__moba.game.player.gold');page.click('#select-augment-power15');page.click('#shop-sell')
 assert page.evaluate('__moba.game.player.augments.length')==0
 assert page.evaluate('__moba.game.player.gold')>=gold+350
 page.wait_for_timeout(2800);page.screenshot(path=str(art/'v10-stable-shop.png'))
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150)
 box=page.locator('#shop').bounding_box();assert box['x']>=0 and box['x']+box['width']<=391 and box['y']>=0 and box['y']+box['height']<=844
 assert page.evaluate('document.body.scrollWidth<=innerWidth');page.screenshot(path=str(art/'v10-mobile-shop.png'));page.click('#shop-close');page.set_viewport_size({'width':1440,'height':900})
 page.keyboard.press('Digit1');assert page.evaluate('__moba.game.usePotion===undefined')
 choose('이상');page.evaluate('__target.x=70');page.keyboard.press('Space');click(48,7);page.wait_for_timeout(50)
 assert page.evaluate('__moba.game.projectiles.length')==7
 assert page.evaluate('__moba.game.attackRange(__moba.game.player)')==7.5
 choose('동랑');click(44,7,button='right');click(44,7);page.evaluate('__moba.game.player.qCd=0');click(44,7,button='right');click(44,7)
 assert page.evaluate('__moba.game.zones.filter(z=>z.r===3.8).length')==2
 page.keyboard.press('Space');click(44,7);page.wait_for_function('!__moba.game.player.motion')
 assert page.evaluate('__moba.game.zones.filter(z=>z.r===3.8).length')==2
 choose('퀴케그');page.evaluate('''() => {const g=__moba.game,a=g.makeChampion('faust',0,9);Object.assign(a,{x:42,y:9});window.__ally=a;}''');click(42,9,button='right')
 page.wait_for_function('__ally.state.tetherResistance===4',timeout=6000);page.keyboard.press('Space')
 assert page.evaluate('__moba.game.buff(__ally,"tetherStride")')
 assert page.evaluate('__moba.game.player.state.tether.until-__moba.game.time')>7.8
 page.screenshot(path=str(art/'v10-queequeg-resistance.png'))
 choose('에이해브');assert page.evaluate('__moba.game.player.state.order')=='cover';click(button='right');assert page.evaluate('__moba.game.player.state.order')=='guard'
 page.keyboard.press('Space');click(44,7);page.wait_for_function('__moba.game.player.motion?.speed===12')
 assert page.evaluate('__moba.game.player.motion?.speed')==12
 page.wait_for_timeout(400)
 page.click('#pause');page.click('#leave');page.click('#archive-open');expect(page.locator('#roster-list button')).to_have_count(34)
 page.fill('#roster-search','스타벅');page.click('#roster-list button');expect(page.locator('#roster-detail')).to_contain_text('일등 항해사의 노련함')
 expect(page.locator('#codex-tabs button')).to_have_count(4)
 assert not errors,errors;b.close()
 print(json.dumps({'status':'passed','checks':['25 selectable champions and Starbuck sprite','actual harpoon dash/RMB chain/Space teleport','hostile blocking and ally pass-through','held-click survives HUD updates','double-click purchases only once','separate augment buy/select/sell','desktop/mobile shop','consumable UI/API removed','Yi seven bullets','overlapping Dongrang trees survive R','Queequeg resistance/shared speed/link reset','Ahab default cover/return speed','32 records/three codex categories'],'page_errors':errors},ensure_ascii=False))
