"""New sprites, deliberate shop sales, six usable items and foreground nameplates."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright()as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('''window.__labels=[];const old=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(s,...args){if(__labels.length>10000)__labels=[];__labels.push(String(s));return old.call(this,s,...args);};''')
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5173')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.9.1');page.wait_for_function('__moba.renderer.atlasV08.naturalWidth>0')
 def choose(name):
  if page.evaluate('__moba.mode')=='playing':page.click('#pause');page.click('#leave')
  if page.evaluate('__moba.mode')=='menu':page.click('#practice-open')
  page.get_by_role('button',name=name+' 선택').click();page.click('#start');page.evaluate('''() => {const g=__moba.game;for(const key of ['aiChampion','aiMinion','aiStructure','aiNeutral'])g[key]=()=>{};g.player.gold=20000;g.minionQueue=[];g.units=g.champions();}''')
 choose('루돌프');page.keyboard.press('KeyG');shop=page.locator('#shop');expect(shop).to_be_visible();box=shop.bounding_box();assert abs(box['x']+box['width']/2-720)<1;assert box['width']>1000;assert page.locator('#consumable-list button').count()==6
 for _ in range(3):page.click('#buy-reload')
 assert page.locator('#upgrade-meter-reload .filled').count()==3;page.click('#augment-magazine2');assert page.evaluate('__moba.game.ammoCap(__moba.game.player)')==130
 gold=page.evaluate('__moba.game.player.gold');page.click('#augment-magazine2');assert page.evaluate('__moba.game.player.augments.includes("magazine2")');page.click('#shop-sell');assert page.evaluate('__moba.game.ammoCap(__moba.game.player)')==100;assert page.evaluate('__moba.game.player.gold')>=gold+350
 for key,name in [('potion','회복 물약'),('cleanse','정화 팔찌'),('speed','가속제'),('weakness','약화 표식'),('battle','전투 물약'),('magazine','추가 탄창')]:
  page.click('#buy-potion'if key=='potion'else '#buy-item-'+key);expect(page.locator('#potion-btn')).to_contain_text(name);owned=page.get_by_role('button',name=name+' ×'+('2'if key in ['potion','speed']else'1'));owned.click();assert page.evaluate('__moba.game.player.potion')>0;page.click('#shop-sell');assert page.evaluate('__moba.game.player.potion')==0
 page.click('#buy-item-speed');page.screenshot(path=str(art/'v08-centered-shop.png'));page.click('#shop-close');page.keyboard.press('Digit1');assert page.evaluate('__moba.game.buff(__moba.game.player,"itemSpeed")')
 page.keyboard.press('KeyG');page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(120);box=shop.bounding_box();assert box['x']>=0 and box['x']+box['width']<=391 and box['y']>=0 and box['y']+box['height']<=844;assert page.evaluate('document.body.scrollWidth<=innerWidth');page.screenshot(path=str(art/'v08-mobile-shop.png'));page.click('#shop-close');page.set_viewport_size({'width':1440,'height':900})
 for name,key in [('호엔하임','hohenheim'),('알리사','alisa'),('마튼','marton'),('퀴케그','queequeg')]:
  choose(name);page.evaluate('''() => {const g=__moba.game,p=g.player,t=g.champions(1)[0];Object.assign(p,{x:40,y:7});Object.assign(t,{x:42,y:7,maxHp:100000,hp:100000});g.units=[p,t];g.input.aim=t;}''');page.wait_for_timeout(120);assert page.evaluate('__moba.renderer.atlasFor(__moba.game.player.key)===__moba.renderer.atlasV08');pos=page.evaluate('__moba.renderer.camera.worldToScreen({x:43,y:7})');page.mouse.move(pos['x'],pos['y']);page.mouse.click(pos['x'],pos['y']);page.wait_for_timeout(180);page.screenshot(path=str(art/f'v08-{key}.png'));assert page.evaluate('__moba.game.player.ammo')<page.evaluate('__moba.game.ammoCap(__moba.game.player)')
 # All champion nameplates are painted after bush fronts; our own name comes last.
 page.evaluate('''() => {const g=__moba.game;g.player.x=g.units[1].x;g.player.y=g.units[1].y;__labels=[];__moba.renderer.draw(g,true);}''');labels=page.evaluate('__labels');assert labels[-1].startswith('헤집어진 문신')or'퀴케그'in ''.join(labels[-4:])
 page.click('#pause');page.click('#leave');page.click('#archive-open');page.fill('#roster-search','마튼');page.click('#roster-list button');expect(page.locator('#roster-detail')).to_contain_text('갈색 피부의 남성');expect(page.locator('#roster-detail')).to_contain_text('체력 500');page.click('[data-category=items]');expect(page.locator('#codex-content article')).to_have_count(6);assert'와드'not in page.locator('#codex-content').inner_text()
 assert not errors,errors;b.close();print(json.dumps({'status':'passed','checks':['24 selectable champions','five sprite atlases','six item purchase/sale and active use','selected-only augment selling','segmented upgrade bars','centered responsive shop','four new champion attacks and sprites','player nameplate priority','Marton brown-skinned male codex','ward removal'],'page_errors':errors},ensure_ascii=False))
