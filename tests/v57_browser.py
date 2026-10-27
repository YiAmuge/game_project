"""Live and standalone: state-aware codex, compact training draft, creep reset and menu."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.environ.get('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 p=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
 if offline:
  p.route('http*://**/*',lambda r:r.abort());html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)');p.set_content(html,wait_until='networkidle',timeout=60000)
 else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
 p.wait_for_function('document.querySelector("#menu-background").naturalWidth>0')
 expect(p.locator('#menu-exit')).to_be_visible();assert p.locator('#menu-exit>b').evaluate('(e)=>getComputedStyle(e).color')=='rgb(223, 125, 121)'
 p.screenshot(path=str(art/f'v57-menu{suffix}.png'))
 p.click('#menu-codex');assert p.locator('.archive-champion').count()==29
 assert p.locator('.archive-champion[data-key="moses"],.archive-champion[data-key="ezra"]').count()==0
 for key,form,label in [('sora','soraEgo','개화 E.G.O 상태'),('yan','yanDistorted','뒤틀림 상태')]:
  p.locator(f'.archive-champion[data-key="{key}"]').click();p.wait_for_timeout(120);before=p.locator('#archive-body').evaluate('(e)=>e.toDataURL()')
  p.locator('[data-skill="3"]').click();assert p.locator('.ultimate-variant').count()==2
  assert p.locator('.champion-stats').inner_text().find('기본 방어력')>=0
  p.locator('[data-form="transformed"]').click();expect(p.locator('[data-form="transformed"]')).to_have_attribute('aria-pressed','true')
  assert p.locator('.skill-tabs button').count()==3;assert p.locator('.empty-skill').count()==1;assert p.locator('.skill-tabs [data-skill="3"]').count()==0
  p.wait_for_timeout(150);after=p.locator('#archive-body').evaluate('(e)=>e.toDataURL()');assert before!=after
  expect(p.locator('#archive-role')).to_contain_text(label);p.locator('[data-skill="2"]').click()
  if key=='yan':expect(p.locator('#skill-description')).to_contain_text('이동속도 −80%')
  p.screenshot(path=str(art/f'v57-{key}-codex{suffix}.png'))
  p.locator('[data-form="base"]').click();assert p.locator('.skill-tabs button').count()==4
 p.click('#codex-back');p.click('#training-open');p.click('#start');p.wait_for_function('__moba.mode==="playing"&&__moba.game.training')
 assert p.evaluate('__moba.game.units.filter(e=>e.kind==="neutral").length')==12
 # Capture restored training floor labels and creep names, including a fresh static floor.
 p.evaluate('''()=>{window.labels57=[];const text=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(s,...a){labels57.push(String(s));if(labels57.length>5000)labels57.splice(0,2500);return text.call(this,s,...a);};__moba.renderer.scene25d.floorStamp=null;}''')
 p.evaluate('()=>{__moba.game.player.x=63;__moba.game.player.y=39;}')
 p.wait_for_function('labels57.some(s=>s.includes("크립 정원"))&&labels57.includes("바느질의 왕")')
 p.click('#training-change-champion');expect(p.locator('#training-pick-dialog')).to_be_visible();assert p.locator('.training-pick-option').count()==29
 expect(p.locator('.training-team-toggle')).not_to_be_visible();assert p.locator('.training-pick-option[data-key="moses"],.training-pick-option[data-key="ezra"]').count()==0
 p.fill('#training-pick-search','히스');assert p.locator('.training-pick-option').count()==1;p.locator('.training-pick-option[data-key="heathcliff"]').click();p.click('#training-pick-confirm');p.wait_for_function('__moba.game.player.key==="heathcliff"');assert p.evaluate('__moba.game.player.armor')==40
 def summon(key,team,x,y):
  p.click('#training-summon');expect(p.locator('.training-team-toggle')).to_be_visible();expect(p.locator('.training-team-toggle [data-team="0"]')).to_have_attribute('aria-pressed','true')
  if team:p.locator('.training-team-toggle [data-team="1"]').click()
  p.locator(f'.training-pick-option[data-key="{key}"]').click();p.screenshot(path=str(art/f'v57-training-pick-{team}{suffix}.png'));p.click('#training-pick-confirm');p.wait_for_function('__moba.globalTarget')
  box=p.locator('#target-map').bounding_box();bounds=p.evaluate('__moba.game.bounds');p.mouse.click(box['x']+(x-bounds['x'])/bounds['w']*box['width'],box['y']+(y-bounds['y'])/bounds['h']*box['height']);p.wait_for_function('!__moba.globalTarget')
 summon('honglu',0,41,23);summon('rodya',1,43,27)
 assert p.evaluate('__moba.game.champions().filter(e=>e.trainingSummoned).map(e=>[e.key,e.team])')==[['honglu',0],['rodya',1]]
 old_ids=p.evaluate('''()=>{const g=__moba.game,n=g.units.filter(e=>e.kind==='neutral');g.kill(n.find(e=>e.camp==='sewingKing'),g.player);g.kill(n.find(e=>e.camp==='needle'),g.player);return n.map(e=>e.id);}''')
 p.click('#training-reset-creeps');assert p.evaluate('(ids)=>{const ns=__moba.game.units.filter(e=>e.kind==="neutral");return ns.length===12&&ns.every(e=>e.alive&&e.hp===e.maxHp&&!ids.includes(e.id));}',old_ids)
 # Small viewport retains the dialog footer and offers a scrolling grid.
 p.set_viewport_size({'width':390,'height':844});p.click('#training-summon');p.wait_for_timeout(100);box=p.locator('#training-pick-confirm').bounding_box();assert box['y']+box['height']<=844
 assert p.locator('.training-pick-grid').evaluate('(e)=>e.scrollHeight>e.clientHeight');assert p.evaluate('document.documentElement.scrollWidth')<=390
 p.screenshot(path=str(art/f'v57-training-pick-mobile{suffix}.png'));p.click('#training-pick-close');p.set_viewport_size({'width':1440,'height':950})
 p.evaluate('''()=>{const g=__moba.game;g.player.x=63;g.player.y=39;g.input.aim={x:67,y:39};}''');p.wait_for_timeout(200);p.screenshot(path=str(art/f'v57-training-garden{suffix}.png'))
 p.click('#pause');p.click('#leave');p.click('#practice-back')
 # On user-opened browser tabs, closing is restricted; the game's ended screen remains functional.
 p.evaluate('window.close=()=>{}');p.click('#menu-exit');expect(p.locator('#exit-screen')).to_be_visible();assert p.evaluate('__moba.mode')=='exited';p.locator('#exit-screen button').click();expect(p.locator('#main-menu')).to_be_visible()
 assert not errors,errors
 if offline:assert not requests,requests
 print(json.dumps({'codexChampions':29,'formToggles':True,'trainingCreeps':12,'trainingTeams':['ally','enemy'],'reset':True,'exit':True,'errors':errors,'offline':offline},ensure_ascii=False))
 b.close()
