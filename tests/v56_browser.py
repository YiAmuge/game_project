"""Dedicated draft and encyclopedia pages, bot editing, clean arena and timed camp."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';offline=os.environ.get('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 p=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[];invalid=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url));p.on('console',lambda m:invalid.append(m.text) if m.type in ['warning','error'] and any(s in m.text for s in ['INVALID','THREE.WebGL']) else None)
 if offline:
  p.route('http*://**/*',lambda r:r.abort());html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)');p.set_content(html,wait_until='networkidle',timeout=60000)
 else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
 assert p.locator('#main-menu').bounding_box()['x']>720
 assert abs(p.locator('#main-menu').bounding_box()['width']-407)<1
 p.screenshot(path=str(art/f'v56-menu{suffix}.png'))
 p.click('#practice-open');expect(p.locator('#practice-panel')).to_be_visible();assert p.locator('.pick-slot').count()==8
 for selector in ['.masthead','.match-bar','.field-top','.field-legend','.hud','.underbar','body>footer','#event-feed']:expect(p.locator(selector)).not_to_be_visible()
 p.set_viewport_size({'width':1200,'height':700});p.wait_for_timeout(100);start=p.locator('#start').bounding_box();assert start['y']+start['height']<=700
 scroll=p.locator('#champion-select').evaluate('(e)=>{const before=e.scrollTop;e.scrollTop=e.scrollHeight;return{scroll:e.scrollTop,overflow:e.scrollHeight>e.clientHeight};}');assert scroll['overflow'] and scroll['scroll']>0
 assert abs(p.locator('#start').bounding_box()['y']-start['y'])<1
 p.set_viewport_size({'width':1440,'height':950});p.locator('.position-option[data-position="top"]').click();p.get_by_role('button',name='돈키호테 선택',exact=True).click()
 def slot(team,pos,key):
  p.locator(f'.pick-slot[data-team="{team}"][data-position="{pos}"]').click()
  if key is None:p.click('#pick-none')
  else:p.get_by_role('button',name=key+' 선택',exact=True).click()
 slot(0,'jungle','호엔하임');slot(0,'bottom',None);slot(0,'support',None);slot(1,'top','루돌프')
 for pos in ['jungle','bottom','support']:slot(1,pos,None)
 expect(p.locator('#pick-none')).to_be_visible();expect(p.locator('#pick-random')).to_be_visible();p.screenshot(path=str(art/f'v56-pick{suffix}.png'));p.click('#start');p.wait_for_function('__moba.renderer.scene25d.decor.ready')
 draft=p.evaluate('''()=>{const g=__moba.game;window.step56=g.step.bind(g);g.step=()=>{};return{player:[g.player.key,g.player.position],teams:[g.champions(0).map(e=>e.key),g.champions(1).map(e=>e.key)]};}''');assert draft=={'player':['don','top'],'teams':[['don','hohenheim'],['rudolph']]},draft
 # The same application route can be entered from a running match without advancing its clock.
 p.keyboard.press('Escape');p.click('#pause-archive');expect(p.locator('#archive')).to_be_visible();t=p.evaluate('__moba.game.time');p.wait_for_timeout(150);assert p.evaluate('__moba.game.time')==t;p.click('#codex-back');p.wait_for_function('__moba.mode==="playing"');assert p.evaluate('__moba.renderer.width')>0;p.click('#resume')
 field=p.evaluate('''()=>{const g=__moba.game,r=__moba.renderer;g.wave=100;g.minionQueue=[];for(const k of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};if(g.units.some(e=>e.camp==='needle'))throw Error('Needles spawned early');g.time=89.99;step56(.005);if(g.units.some(e=>e.camp==='needle'))throw Error('Needles before 90s');step56(.005);const ns=g.units.filter(e=>e.camp==='needle');if(ns.length!==4||ns.map(e=>e.needleColor).join(',')!=='green,red,green,red')throw Error('Timed north camp mismatch');const w=r.scene25d.walls.find(w=>w.rect.northDivider).rect;if(w.w!==4||Math.abs(w.y+w.h-1.5)>1e-7)throw Error('Camp entrance wall mismatch');g.effects=[];g.projectiles=[];Object.assign(g.player,{x:35.36,y:26});const labels=[],old=r.text,ground=r.scene25d.groundPainter,oldG=ground.text;r.text=function(s,...args){labels.push(String(s));return old.call(this,s,...args);};ground.text=function(s,...args){labels.push(String(s));return oldG.call(this,s,...args);};r.draw(g,true);r.text=old;ground.text=oldG;if(labels.some(s=>/캠프|크립|르루주|르누아르|바늘이|바느질|쌓인 것|부활소|UPPER LINE|LOWER LINE|CENTRAL CAMP/.test(s)))throw Error('Arena annotation remains '+labels.join('/'));return{needles:ns.length,wall:[w.x,w.y,w.w,w.h],annotations:false};}''')
 p.wait_for_timeout(120);p.screenshot(path=str(art/f'v56-clean-arena{suffix}.png'))
 p.keyboard.press('Escape');p.click('#leave');p.click('#practice-back');p.click('#training-open');assert p.locator('.pick-slot').count()==8 and p.locator('.pick-slot:disabled').count()==7
 p.get_by_role('button',name='뫼르소 선택',exact=True).click();p.screenshot(path=str(art/f'v56-training-pick{suffix}.png'));p.click('#start');p.wait_for_function('__moba.game.training');assert p.evaluate('__moba.game.player.key')=='meursault';p.keyboard.press('Escape');p.click('#leave');p.click('#practice-back')
 p.click('#menu-codex');assert p.locator('#archive').evaluate('e=>e.tagName')=='SECTION';assert '#codex/' in p.url
 expect(p.locator('#main-menu')).not_to_be_visible();p.get_by_role('button',name='싱클레어 정보',exact=True).click();p.get_by_role('tab',name='전술기',exact=True).click();expect(p.locator('#skill-description')).to_contain_text('180');assert p.locator('[role="tabpanel"]').count()==1
 p.get_by_role('button',name='넬리 정보',exact=True).click();expect(p.locator('#skill-description')).to_contain_text('4.5%');p.get_by_role('tab',name='궁극기',exact=True).click();expect(p.locator('#skill-description')).to_contain_text('정면');assert p.evaluate('!/(스프라이트|이펙트|잔상|애니메이션)/.test(document.querySelector("#roster-detail").textContent)')
 p.screenshot(path=str(art/f'v56-champion-codex{suffix}.png'))
 p.get_by_role('button',name='몹 · 목표물',exact=True).click();p.get_by_role('button',name='쌓인 것',exact=True).click();assert p.locator('.monster-skills section').count()==4
 alpha=p.locator('.monster-detail canvas').evaluate('(e)=>{const a=e.getContext("2d").getImageData(0,0,e.width,e.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n;}');assert alpha>2000
 p.screenshot(path=str(art/f'v56-monster-codex{suffix}.png'))
 p.get_by_role('button',name='증강',exact=True).click();p.locator('.augment-guide-tabs [data-group="combat"]').click();p.get_by_role('button',name='흑수환 정보',exact=True).click();expect(p.locator('.augment-guide-detail')).to_contain_text('전투력·이동속도·장전속도 +10%');p.screenshot(path=str(art/f'v56-augment-codex{suffix}.png'))
 p.get_by_role('button',name='게임 규칙',exact=True).click();text=p.locator('#codex-body').inner_text();assert 'WASD' in text and not any(x in text for x in ['스프라이트','이펙트','잔상','외형']);p.screenshot(path=str(art/f'v56-rules{suffix}.png'));p.go_back();p.wait_for_function('__moba.mode==="menu"')
 for w,h in [(390,844),(844,390)]:
  p.set_viewport_size({'width':w,'height':h});p.click('#practice-open');p.wait_for_timeout(100);rect=p.locator('#start').bounding_box();assert rect and rect['y']>=0 and rect['y']+rect['height']<=h+1,(w,h,rect);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(w,h,p.evaluate('document.documentElement.scrollWidth'));p.screenshot(path=str(art/f'v56-pick-{w}{suffix}.png'));p.click('#practice-back');p.click('#menu-codex');p.screenshot(path=str(art/f'v56-codex-{w}{suffix}.png'));p.click('#codex-back');p.wait_for_function('__moba.mode==="menu"')
 p.evaluate('history.replaceState(null,"","#codex/champions");dispatchEvent(new PopStateEvent("popstate"))');p.wait_for_function('__moba.mode==="codex"');p.get_by_role('button',name='파우스트 정보',exact=True).click();p.click('#record-play');p.wait_for_function('__moba.mode==="practice"');assert p.evaluate('__moba.draft.playerKey')=='faust'
 assert not errors,errors;assert not invalid,invalid
 if offline:assert not requests,requests
 print(json.dumps({'draft':draft,'field':field,'pickScroll':scroll,'monsterPixels':alpha,'codexPage':True,'errors':errors,'offline':offline},ensure_ascii=False));b.close()
