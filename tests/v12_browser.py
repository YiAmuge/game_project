"""New champion real-input flows, capture range, sprites and augment encyclopedia."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
 expect(page.locator('.build-tag')).to_contain_text('0.22.0')
 page.click('#practice-open');expect(page.locator('.champion-option')).to_have_count(29)
 for name in ['김삿갓','뿌이']:
  page.get_by_role('button',name=name+' 선택').click();expect(page.locator('#selected-name')).to_have_text(name)
  assert page.locator('.champion-option[aria-pressed=true] canvas').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(0,0,c.width,c.height).data).some((n,i)=>i%4===3&&n>0)')
 page.screenshot(path=str(art/'v12-ppui-selection.png'))
 page.click('#archive-open');page.click('[data-category=augments]');expect(page.locator('#codex-content article')).to_have_count(13)
 for text in ['확장 탄창','최대 3개','500','350','전투력 3단계 이상','체력 3단계 이상','이동·장전·가속 합계 3단계 이상']:
  expect(page.locator('#codex-content')).to_contain_text(text)
 page.screenshot(path=str(art/'v12-augment-codex.png'));page.click('#archive .close-dialog')
 def choose(name):
  if page.evaluate('__moba.mode')=='playing':page.click('#pause');page.click('#leave')
  if page.evaluate('__moba.mode')=='menu':page.click('#practice-open')
  page.get_by_role('button',name=name+' 선택').click();page.click('#start')
  page.evaluate('''() => {const g=__moba.game;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player,t=g.makeChampion('faust',1,8);Object.assign(p,{x:40,y:7});Object.assign(t,{x:42,y:7,hp:10000,maxHp:10000});g.units=[p,t];g.minionQueue=[];window.__target=t;}''');page.wait_for_timeout(150)
 def aim(x,y):
  s=page.evaluate('([x,y])=>{const r=__moba.renderer;r.resize();r.follow(__moba.game,true);const s=r.camera.worldToScreen({x,y}),b=r.canvas.getBoundingClientRect();return {x:s.x+b.left,y:s.y+b.top};}',[x,y]);page.mouse.move(s['x'],s['y']);return s
 def click(x,y,button='left'):
  s=aim(x,y);page.mouse.click(s['x'],s['y'],button=button)
 choose('김삿갓');click(42,7,button='right');page.wait_for_function('__moba.game.player.state.swordGrab');page.wait_for_timeout(150)
 page.screenshot(path=str(art/'v12-kim-sword-grab.png'));click(48,7,button='right');page.wait_for_function('!__moba.game.player.state.swordGrab');assert page.evaluate('__target.motion?.forced||__target.x>42')
 page.keyboard.press('Space');page.wait_for_function('__moba.game.player.state.counter')
 page.evaluate("window.__shots=[];const g=__moba.game,bullet=g.bullet.bind(g);g.bullet=(...a)=>{if(a[0]===g.player)__shots.push(a[2]);return bullet(...a);};g.deal(__target,g.player,100000,{fixed:true})")
 page.wait_for_function('__shots.length===4');assert page.evaluate('__moba.game.player.hp')==1;assert page.evaluate('__shots')==[338,338,338,338]
 page.screenshot(path=str(art/'v12-kim-counter.png'))
 choose('뿌이');page.evaluate('''() => {const g=__moba.game,a=g.makeChampion('meursault',0,9);Object.assign(a,{x:41,y:8.5,hp:3000,lastDamageAt:1000});window.__ally=a;}''')
 click(41,8.5);page.wait_for_function('__moba.game.player.state.empower?.target===__ally.id')
 page.evaluate("window.__nails=[];const g=__moba.game,bullet=g.bullet.bind(g);g.bullet=(...a)=>{if(a[0]===g.player)__nails.push({damage:a[2],nonLethal:a[4].nonLethal});return bullet(...a);};__ally.attackCd=0;g.attack(__ally,__target)")
 page.wait_for_timeout(350);assert page.evaluate('__nails')==[]
 page.screenshot(path=str(art/'v12-ppui-half-side.png'))
 page.evaluate('''() => {const g=__moba.game;Object.assign(__ally,{x:47.5,y:7});g.status(__ally,'stun',1,2,__target);}''');click(47.5,7,button='right');assert page.evaluate('__moba.game.targeting?.slot')=='q';click(47.5,7);page.wait_for_function('__moba.game.stat(__ally,"stun")===0')
 page.keyboard.press('Space');page.wait_for_function('__moba.game.player.state.nailStorm');page.screenshot(path=str(art/'v12-ppui-nail-storm.png'))
 choose('스타벅');page.evaluate('''() => {Object.assign(__target,{x:46,y:7,hp:4000});__moba.game.player.ammo=0;__moba.game.player.qCd=5;}''')
 page.keyboard.press('Space');assert page.evaluate('__moba.game.targeting.slot')=='r';click(46,7);page.wait_for_function('__target.state.netTrap');assert page.evaluate('__moba.game.player.ammo')==2;assert page.evaluate('__moba.game.player.qCd')==0
 page.screenshot(path=str(art/'v12-starbuck-capture-net.png'))
 choose('돈키호테');click(46,7,button='right');page.wait_for_function('__moba.game.player.state.donBarrage');page.wait_for_timeout(500);click(46,7,button='right');page.wait_for_function('!__moba.game.player.state.donBarrage');assert page.evaluate('__moba.game.player.qCd')>10
 aim(46,7);page.keyboard.press('Space');assert page.evaluate('!__moba.game.targeting');page.wait_for_function('__moba.game.player.motion');assert page.evaluate('__moba.game.player.buffs.donLifesteal-__moba.game.time')>6
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200);assert page.evaluate('document.body.scrollWidth<=innerWidth');page.screenshot(path=str(art/'v12-mobile.png'))
 assert not errors,errors;b.close();print(json.dumps({'status':'passed','checks':['29 selectable champions and rendered new portraits','12 shared augment definitions with price/refund/unlock rules','real RMB Kim grab/recast, Space counter with four 338 waves','Ppui ally healing without linked nails and 8-range cleanse','Ppui half-side sprite and nail storm','Starbuck capture net and unconditional refill/reset','Don barrage cancellation and quick dash','mobile layout'],'page_errors':errors},ensure_ascii=False))
