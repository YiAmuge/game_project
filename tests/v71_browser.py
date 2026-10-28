"""Real PC/mobile shop absorption, permanent passive and original-art augment effects."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.getenv('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for mobile in [False,True]:
  ctx=b.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 950},is_mobile=mobile,has_touch=mobile);p=ctx.new_page();errors=[];requests=[];kind='mobile'if mobile else'desktop'
  p.on('pageerror',lambda e:(errors.append(str(e)),print(e.stack,flush=True)));p.on('request',lambda r:requests.append(r.url))
  if offline:
   p.route('http*://**/*',lambda r:r.abort());p.set_content((root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)'),wait_until='networkidle',timeout=60000)
  else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
  p.click('#menu-codex');p.click('.archive-champion[data-key="jamila"]');expect(p.locator('.skill-body')).to_contain_text('보호막 보유 중엔');p.click('[data-description-mode="details"]');expect(p.locator('.skill-body')).to_contain_text('보호막 보유 중엔');expect(p.locator('.skill-body')).not_to_contain_text('보유량과 관계없이');p.click('[data-description-mode="summary"]')
  for index,text in [(1,'네 번째 탄환'),(2,'탄환 6개'),(3,'전투원 두 명')]:
   p.click(f'#skill-tab-{index}');expect(p.locator('.skill-body')).to_contain_text(text)
  p.screenshot(path=str(art/f'v71-{kind}-jamila-summary{suffix}.png'));p.click('.archive-champion[data-key="meursault"]');p.click('#skill-tab-1');expect(p.locator('.skill-body')).not_to_contain_text('속박');expect(p.locator('.skill-body')).to_contain_text('감속')
  p.click('.archive-champion[data-key="yan"]');expect(p.locator('.champion-exclusive')).to_contain_text('반값');p.click('[data-description-mode="details"]');expect(p.locator('.champion-exclusive')).to_contain_text('250');expect(p.locator('.champion-exclusive')).to_contain_text('상시 패시브');p.screenshot(path=str(art/f'v71-{kind}-yan-codex{suffix}.png'))
  p.click('#codex-back');p.click('#practice-open');p.click('.champion-option[data-key="yan"]');p.click('#start');p.wait_for_function('__moba.mode==="playing"&&!__moba.presentation.blocking',timeout=60000)
  p.evaluate('''()=>{const g=__moba.game;window.step71=g.step.bind(g);g.step=()=>{};g.time=20;g.player.gold=250;for(const key of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[key]=()=>{};}''');p.click('#shop-toggle')
  if mobile:p.click('#mobile-shop-tabs [data-section="augments"]')
  p.click('#select-augment-writtenOrder');expect(p.locator('#detail-buy')).to_have_text('구매 250 ◈');expect(p.locator('#detail-buy')).to_be_enabled();expect(p.locator('#augment-row-writtenOrder small')).to_have_text('250 ◈');p.screenshot(path=str(art/f'v71-{kind}-discount-shop{suffix}.png'))
  p.click('#detail-buy');p.wait_for_timeout(180);assert p.evaluate('__moba.game.player.gold===0&&__moba.game.player.augments.includes("writtenOrder")');expect(p.locator('#shop-sell')).to_have_text('판매 +175 ◈');p.click('#shop-close')
  p.evaluate('''()=>{const g=__moba.game,e=g.player;e.state.ominous=6;if(!g.cast(e,'r',e))throw Error('Transform failed');}''');p.wait_for_timeout(100);assert p.evaluate('__moba.game.player.absorbedOrder&&!__moba.game.player.augments.includes("writtenOrder")');assert p.locator('#augment-tray [data-augment-key="writtenOrder"]').count()==0
  if mobile:expect(p.locator('#mobile-status [data-passive="true"]').filter(has_text='0/5')).to_have_count(1)
  p.click('#shop-toggle')
  if mobile:p.click('#mobile-shop-tabs [data-section="augments"]')
  p.click('#select-augment-writtenOrder');expect(p.locator('#detail-buy')).to_have_text('흡수 완료');expect(p.locator('#detail-buy')).to_be_disabled();expect(p.locator('#shop-sell')).to_be_disabled();expect(p.locator('#detail-condition')).to_have_text('흡수한 상시 패시브');assert p.locator('#owned-list [data-augment-key="writtenOrder"]').count()==0;p.screenshot(path=str(art/f'v71-{kind}-absorbed-shop{suffix}.png'));p.click('#shop-close')
  p.evaluate('''()=>{const g=__moba.game,old=g.player;old.player=false;g.player=g.makeChampion('jamila',0,0,'bottom');const e=g.player;Object.assign(e,{x:40,y:25,ammo:1});g.units=[e];g.effects=[];g.pending=[];g.projectiles=[];g.zones=[];g.time=30;if(!g.cast(e,'r',e))throw Error('Jamila army failed');g.addShield(e,e.maxHp*.075,`udjat-${e.id}`,3);const units=g.units.filter(u=>u.lcaTrooper);for(const u of units)u.shields=[];if(!g.attack(e,{x:e.x+6,y:e.y}))throw Error('Shield round failed');if(g.projectiles.find(b=>b.source===e).damage!==60)throw Error('Shield round damage');if(Math.abs(g.shield(e)-e.maxHp*.075)>1e-6||units.length!==2||units.some(u=>Math.abs(g.shield(u)-e.maxHp*.0075)>1e-6))throw Error('Full-cap soldier shield exception');}''')
  # Controlled live renderer fixture: each effect uses the same body position,
  # alpha clipping, camera and original sprite pipeline as normal gameplay.
  p.evaluate('''()=>{const g=__moba.game,old=g.player;old.player=false;g.player=g.makeChampion('meursault',0,0,'bottom');const e=g.player;Object.assign(e,{x:40,y:25,hp:e.maxHp*.55,augments:['reloadStacks','antimatter','resentment'],lastAttackAt:999,lastDamageAt:999});e.state.augReloadStacks=5;e.state.augReloadDecay=1000;g.units=[e];g.effects=[];g.pending=[];g.projectiles=[];g.zones=[];g.corpses=[];g.time=30.37;g.input={x:0,y:0,aim:{x:e.x+4,y:e.y},fire:false};window.effect71=e;}''');p.wait_for_timeout(250)
  p.screenshot(path=str(art/f'v71-{kind}-augment-effects{suffix}.png'))
  probes=p.evaluate('''()=>{const r=__moba.renderer,c=r.ctx,draw=c.drawImage,images=[],g=__moba.game;let butterflies=0,patterns=0;c.drawImage=function(im,...a){if(im.naturalWidth===384&&im.naturalHeight===128)butterflies++;if(im.tagName==='CANVAS'&&a.length===4&&c.globalCompositeOperation==='screen')patterns++;return draw.call(this,im,...a);};try{r.draw(g,true);}finally{c.drawImage=draw;}return{butterflies,patterns};}''')
  assert probes['butterflies']==5,probes
  assert probes['patterns']>=1,probes
  # Dynamic state gates: four mourning stacks and <4 tattoo stacks disable both.
  p.evaluate('effect71.state.augReloadStacks=4;effect71.hp=effect71.maxHp*.61');p.wait_for_timeout(50)
  gates=p.evaluate('''()=>{const r=__moba.renderer,c=r.ctx,draw=c.drawImage;let butterflies=0,patterns=0;c.drawImage=function(im,...a){if(im.naturalWidth===384&&im.naturalHeight===128)butterflies++;if(im.tagName==='CANVAS'&&a.length===4&&c.globalCompositeOperation==='screen')patterns++;return draw.call(this,im,...a);};try{r.draw(__moba.game,true);}finally{c.drawImage=draw;}return{butterflies,patterns};}''');assert gates['butterflies']==0 and gates['patterns']==0,gates
  assert not errors,errors
  if offline:assert not requests,requests
  print(json.dumps({'mobile':mobile,'offline':offline,'discount':250,'refund':175,'slotFreed':True,'absorbedPassive':True,'butterflies':probes['butterflies'],'tattooLayers':probes['patterns'],'effectsGated':True,'errors':errors}),flush=True);ctx.close()
 b.close()
