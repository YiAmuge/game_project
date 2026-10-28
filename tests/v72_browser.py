"""Actual mobile taps: persistent categorized overview and compact supply shop."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.getenv('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for mobile in [True,False]:
  ctx=b.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 950},is_mobile=mobile,has_touch=mobile);p=ctx.new_page();errors=[];requests=[];kind='mobile'if mobile else'desktop'
  p.on('pageerror',lambda e:(errors.append(str(e)),print(e.stack,flush=True)));p.on('request',lambda r:requests.append(r.url))
  if offline:
   p.route('http*://**/*',lambda r:r.abort());p.set_content((root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)'),wait_until='networkidle',timeout=60000)
  else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
  def tap(s):
   if mobile:p.tap(s)
   else:p.click(s)
  def inside(s):
   r=p.locator(s).bounding_box();assert r and r['x']>=0 and r['y']>=0 and r['x']+r['width']<=p.viewport_size['width']+.5 and r['y']+r['height']<=p.viewport_size['height']+.5,(s,r)
  tap('#training-open');tap('.champion-option[data-key="alisa"]');tap('#start');p.wait_for_function('__moba.game.training');p.wait_for_timeout(100)
  p.evaluate('''()=>{const g=__moba.game;window.step72=g.step.bind(g);g.step=()=>{};g.practice.lineStopped=true;for(const key of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[key]=()=>{};}''')
  if mobile:
   for w,h in [(844,390),(667,375)]:
    p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(150);tap('#minimap');expect(p.locator('#scoreboard')).to_be_visible();tap('#mobile-score-tabs [data-page="map"]');p.wait_for_timeout(300);expect(p.locator('#scoreboard')).to_be_visible();inside('#mobile-score-tabs');inside('#score-map')
    metrics=p.locator('#score-map').evaluate('c=>{const r=c.getBoundingClientRect(),g=__moba.game;return{ratio:r.width/r.height,expected:g.bounds.w/g.bounds.h,pixels:c.width/c.height,height:r.height};}')
    assert abs(metrics['ratio']-metrics['expected'])<.002 and abs(metrics['pixels']-metrics['expected'])<.005 and metrics['height']>180,metrics
    assert p.locator('#mobile-score-tabs button').all_text_contents()==['미니맵','점수창','챔피언 설명'];expect(p.locator('.score-scroll')).to_be_hidden();expect(p.locator('#mobile-score-skills')).to_be_hidden();p.screenshot(path=str(art/f'v72-mobile-map-{w}{suffix}.png'))
    tap('#mobile-score-tabs [data-page="scores"]');expect(p.locator('.score-scroll')).to_be_visible();expect(p.locator('#score-map')).to_be_hidden();assert p.locator('#score-rows tr').count()>0;inside('.score-scroll');p.screenshot(path=str(art/f'v72-mobile-scores-{w}{suffix}.png'))
    tap('#mobile-score-tabs [data-page="champion"]');expect(p.locator('#mobile-score-skills')).to_be_visible();tap('#mobile-score-skills [data-slot="3"]');tap('#mobile-score-skills [data-mode="summary"]');expect(p.locator('#mobile-score-skills p')).to_contain_text('크립 버프를 유지');summary=p.locator('#mobile-score-skills p').inner_text();inside('#mobile-score-skills [data-mode="summary"]');tap('#mobile-score-skills [data-mode="details"]');expect(p.locator('#mobile-score-skills p')).to_contain_text('부활소를 처음 나간');assert len(p.locator('#mobile-score-skills p').inner_text())>len(summary);inside('#mobile-score-skills');p.screenshot(path=str(art/f'v72-mobile-skills-{w}{suffix}.png'))
    # The original minimap remains available and a second tap closes the panel.
    tap('#minimap');expect(p.locator('#scoreboard')).to_be_hidden();tap('#minimap');expect(p.locator('#mobile-score-skills')).to_be_visible();tap('#score-close');expect(p.locator('#scoreboard')).to_be_hidden()
   # A map pointer cancellation never opens the overview.
   session=ctx.new_cdp_session(p);r=p.locator('#minimap').bounding_box();session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':42,'x':r['x']+30,'y':r['y']+20}]});session.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});expect(p.locator('#scoreboard')).to_be_hidden()
   for w,h in [(844,390),(667,375)]:
    p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(100);p.evaluate('__moba.game.player.augments=[];__moba.game.player.upgrades.power=3');tap('#shop-toggle');expect(p.locator('#shop')).to_have_attribute('data-mobile-section','upgrades');tap('#mobile-shop-tabs [data-section="augments"]');inside('#shop');inside('#detail-buy');inside('#shop-close')
    icons=p.locator('#augment-list .augment-icon');assert icons.count()>5;assert icons.first.bounding_box()['width']==44
    scroll=p.locator('.shop-catalog');assert scroll.evaluate('e=>{e.scrollTop=e.scrollHeight;return e.scrollTop>0;}');scroll.evaluate('e=>e.scrollTop=0');tap('#select-augment-power15');expect(p.locator('#detail-name')).to_contain_text('신검합일');inside('#detail-buy');tap('#detail-buy');assert p.evaluate('__moba.game.player.augments.includes("power15")')
    p.screenshot(path=str(art/f'v72-mobile-shop-{w}{suffix}.png'));tap('#mobile-shop-tabs [data-section="inventory"]');inside('#mobile-owned-catalog');tap('#shop-close')
   # Unlock categories through the real upgrade purchase buttons.
   p.evaluate('''()=>{const e=__moba.game.player;e.augments=[];for(const k of Object.keys(e.upgrades))e.upgrades[k]=0;}''');tap('#shop-toggle')
   assert p.locator('#shop-tabs .category-unlocked').count()==0
   for group,keys in [('combat',['power','power','power']),('survival',['health','health','health']),('tech',['speed','speed','haste'])]:
    for key in keys:
     expect(p.locator('#buy-'+key)).to_be_enabled();tap('#buy-'+key);p.wait_for_timeout(280)
    expect(p.locator(f'#shop-tabs [data-group="{group}"]')).to_have_class('category-unlocked')
   tap('#mobile-shop-tabs [data-section="augments"]');assert p.locator('#shop-tabs .category-unlocked').count()==3;assert 'category-unlocked'not in p.locator('#shop-tabs [data-group="all"]').get_attribute('class');ready=p.locator('#shop-tabs [data-group="combat"]').evaluate('e=>{const s=getComputedStyle(e),dot=getComputedStyle(e,"::after");return{border:s.borderTopWidth,weight:s.fontWeight,dot:dot.width,animation:s.animationName};}');assert ready=={'border':'2px','weight':'800','dot':'6px','animation':'mobile-category-ready'},ready;p.wait_for_timeout(180);p.screenshot(path=str(art/f'v72-mobile-unlocked-categories{suffix}.png'));tap('#shop-close')
   # Removing target categories hides only their own buttons: remaining centers stay fixed.
   p.evaluate('''()=>{const g=__moba.game,e=g.player;g.units=[e];g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;Object.assign(e,{x:40,y:25});const champion=g.makeChampion('faust',1,20);Object.assign(champion,{x:41,y:25});const minion=g.entity({kind:'minion',team:1,x:41,y:25,maxHp:1000});const structure=g.entity({kind:'tower',team:1,x:41,y:25,maxHp:1000,range:5});const creep=g.makeNeutral(41,25,'side');window.context72={champion,minion,structure,creep};}''');p.wait_for_timeout(200)
   original={k:p.locator(f'.mobile-target-btn[data-target-kind="{k}"]').bounding_box()for k in ['champion','minion','structure','creep']};assert all(original.values()),original
   for removed in ['champion','structure','minion']:
    p.evaluate(f'context72.{removed}.alive=false');p.wait_for_timeout(180);expect(p.locator(f'.mobile-target-btn[data-target-kind="{removed}"]')).to_be_hidden()
    for k in original:
     rect=p.locator(f'.mobile-target-btn[data-target-kind="{k}"]').bounding_box()
     if rect:assert abs(rect['x']-original[k]['x'])<.1 and abs(rect['y']-original[k]['y'])<.1,(k,rect,original[k])
   p.screenshot(path=str(art/f'v72-mobile-fixed-targets{suffix}.png'))
  else:
   p.keyboard.down('Tab');expect(p.locator('#scoreboard')).to_be_visible();expect(p.locator('#score-map')).to_be_visible();expect(p.locator('.score-scroll')).to_be_visible();expect(p.locator('#mobile-score-tabs')).to_be_hidden();p.screenshot(path=str(art/f'v72-desktop-score{suffix}.png'));p.keyboard.up('Tab');expect(p.locator('#scoreboard')).to_be_hidden()
  assert not errors,errors
  if offline:assert not requests,requests
  print(json.dumps({'mobile':mobile,'offline':offline,'persistentOverview':mobile,'categorizedPanels':mobile,'errors':errors}),flush=True);ctx.close()
 b.close()
