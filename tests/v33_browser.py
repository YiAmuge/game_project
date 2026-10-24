"""Grouped shop/codex, actual scroll and sale controls, gauges and 2.5D combat art."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[];result={}
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.35.0')
 page.click('#menu-codex');page.click('[data-category="augments"]')
 result['codex']=page.locator('#codex-content>.augment-category').evaluate_all("es=>es.map(e=>({group:e.dataset.group,count:e.querySelectorAll('article').length}))")
 assert result['codex']==[{'group':'combat','count':7},{'group':'survival','count':7},{'group':'tech','count':7}],result['codex']
 page.screenshot(path=str(art/'v33-codex-groups.png'));page.locator('#archive .close-dialog').click()
 page.click('#training-open');page.click('#start');page.click('#training-panel-toggle');page.wait_for_function('__moba.renderer.atlasV17.naturalWidth>0')
 page.evaluate('''async()=>{window.O=await import('./src/overlays.js');window.P=await import('./src/projection-25d.js');window.D=await import('./src/data.js');window.ART=await import('./src/art.js');window.SK=await import('./src/skills.js');const g=__moba.game;g.step=()=>{};
 window.setup=key=>{Object.assign(g,{training:true,units:[],corpses:[],logs:[],announcements:[],effects:[],events:[],projectiles:[],pending:[],zones:[],time:10,winner:null});g.input.fire=false;g.input.x=g.input.y=0;g.practice.lineStopped=true;g.practice.championAI=false;const p=g.makeChampion(key,0,0,'top'),t=g.makeChampion('faust',1,10,'top');g.player=p;Object.assign(p,{x:25,y:38,player:true,lastDamageAt:100});Object.assign(t,{x:30,y:38,trainingSummoned:true,maxHp:100000,hp:100000,lastDamageAt:100});g.input.aim={x:30,y:38};const s=__moba.renderer.scene25d;s.vfx.clear();s.championVfx.reset(g);s.projectileVfx.game=null;__moba.renderer.draw(g,true);return {p,t};};window.run=seconds=>{for(let i=0;i<Math.round(seconds*120);i++)Object.getPrototypeOf(g).step.call(g,1/120);__moba.renderer.draw(g,true);};}''')
 # Real button purchases exercise both capacity logic and nonoverlapping, scrollable controls.
 page.evaluate("()=>{const {p}=setup('faust');p.upgrades={power:3,health:3,speed:1,reload:1,haste:1};p.augments=['power15','glaive','resentment','kAmpule'];}")
 page.keyboard.press('g');expect(page.locator('#shop')).to_be_visible()
 result['shop']=page.locator('#augment-list>.augment-category').evaluate_all("es=>es.map(e=>({group:e.dataset.group,count:e.querySelectorAll('.augment-item').length}))")
 assert result['shop']==result['codex'],result['shop']
 page.hover('#select-augment-carrier');page.locator('#detail-buy').click();page.wait_for_function('__moba.game.player.augments.includes("carrier")');expect(page.locator('#toast')).to_be_visible();result['purchase_notice']=page.locator('#toast').evaluate("e=>({top:e.getBoundingClientRect().top,pointer:getComputedStyle(e).pointerEvents})");assert result['purchase_notice']['top']<=16 and result['purchase_notice']['pointer']=='none';page.wait_for_timeout(280)
 page.hover('#select-augment-magazine2');page.locator('#detail-buy').click();page.wait_for_function('__moba.game.player.augments.length===6');expect(page.locator('#augment-count')).to_contain_text('5 / 5')
 page.locator('#owned-list').get_by_role('button',name='딜리버리 캐리어',exact=True).click();expect(page.locator('#shop-sell')).to_be_enabled()
 page.evaluate('()=>{__moba.game.training=false;__moba.game.player.alive=false;}');expect(page.locator('#shop-sell')).to_be_disabled();expect(page.locator('#shop-selected-info')).to_contain_text('판매 불가')
 page.evaluate('()=>{__moba.game.training=true;__moba.game.player.alive=true;}');expect(page.locator('#shop-sell')).to_be_enabled()
 result['scroll']=page.locator('#shop').evaluate('e=>{e.scrollTop=0;const start=e.scrollTop;e.scrollTop=e.scrollHeight;return {height:e.clientHeight,content:e.scrollHeight,moved:e.scrollTop-start};}')
 assert page.locator('#shop').evaluate("e=>['auto','scroll'].includes(getComputedStyle(e).overflowY)");page.screenshot(path=str(art/'v33-training-shop-bottom.png'))
 page.locator('#shop').evaluate('e=>e.scrollTop=0');page.screenshot(path=str(art/'v33-training-shop-groups.png'))
 page.locator('#shop-sell').click();page.wait_for_function('!__moba.game.player.augments.includes("carrier")');page.wait_for_timeout(280);page.locator('#buy-power').click();page.wait_for_function('__moba.game.player.upgrades.power===4');expect(page.locator('#toast')).to_be_visible();assert page.locator('#toast').evaluate("e=>e.getBoundingClientRect().top<=16&&getComputedStyle(e).pointerEvents==='none'");page.screenshot(path=str(art/'v33-purchase-notice-top.png'));page.locator('#shop-close').click()
 # The bar itself is recorded: its fill is below ammunition, no icons are drawn above HP.
 result['gauges']={}
 for key,buff,duration in [('sinclair','marks',4),('gregor','mutant',5),('sora','soraEgo',20),('yan','yanDistorted',20)]:
  out=page.evaluate('''([key,buff,duration])=>{const g=__moba.game,{p}=setup(key);if(key==='sora'){p.state.unlock=5;g.cast(p,'r',p);}else if(key==='yan'){p.state.ominous=6;g.cast(p,'r',p);}else if(key==='gregor')SK.gregorStack(g,p,12);else g.addMark(p,3);g.time+=duration/2;__moba.renderer.draw(g,true);const ctx=document.createElement('canvas').getContext('2d'),fills=[],texts=[];ctx.fillRect=(x,y,w,h)=>fills.push({x,y,w,h,color:ctx.fillStyle});const r={ctx,text:(...a)=>texts.push(a),polygon:()=>{}};O.championHud(r,p,g);const gauge=O.stackGauge(p,g);return {ratio:gauge.ratio,timer:gauge.timer,filled:fills.some(f=>Math.abs(f.w-2.65*.5)<1e-6&&Math.abs(f.h-.17)<1e-6),texts:texts.filter(t=>String(t[0]).includes('s'))};}''',[key,buff,duration])
  assert abs(out['ratio']-.5)<1e-9 and out['timer'] and out['filled'],out;result['gauges'][key]=out
  page.wait_for_timeout(150);page.screenshot(path=str(art/f'v33-{key}-gauge.png'))
 result['gubo']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('gubo'),a=g.makeChampion('sora',0,7,'top');Object.assign(a,{x:28,y:38,hp:1,lastDamageAt:100});__moba.renderer.draw(g,true);return {allowed:g.canGuboHitAlly(p,a),name:a.name};}''')
 assert result['gubo']['allowed'];page.wait_for_timeout(150);page.screenshot(path=str(art/'v33-gubo-flame-border.png'))
 result['alisa']=page.evaluate('''()=>{const g=__moba.game,{p}=setup('alisa');SK.beginAlisaDetonation(g,p,p);run(.9);return {remaining:p.state.detonatesAt-g.time,phase:p.phaseEnemiesUntil>g.time};}''')
 assert result['alisa']['phase'];page.wait_for_timeout(150);page.screenshot(path=str(art/'v33-alisa-countdown.png'))
 page.evaluate('run(1.2)');assert page.evaluate('__moba.game.corpses.filter(e=>e.key==="alisa").length')==0
 result['starbuck']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('starbuck');g.cast(p,'r',t);const r=__moba.renderer,frame=ART.FRAMES.starbuck,ctx=r.ctx,old=ctx.drawImage.bind(ctx),alphas=[];const prior=r.billboardPass;r.billboardPass=true;for(const at of [.12,.27,.55,.7]){p.motion.elapsed=at;let body=null;ctx.drawImage=(...a)=>{if(a[0]===r.atlasFor('starbuck')&&a[1]===frame.x&&a[2]===frame.y)body=ctx.globalAlpha;old(...a);};r.unit(p,g);alphas.push({at,alpha:body,expected:P.leapOpacity(p)});}ctx.drawImage=old;r.billboardPass=prior;return alphas;}''')
 assert all(e['alpha'] is not None and abs(e['alpha']-e['expected'])<1e-5 for e in result['starbuck']),result['starbuck']
 result['honglu']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('honglu');p.hp-=1000;g.cast(p,'q',p);run(.3);const shield=g.shield(p),immune=p.invulnerableUntil>g.time,recast=g.cast(p,'q',p);return {shield,immune,recast,healed:p.hp};}''')
 assert result['honglu']['shield']==350 and not result['honglu']['immune'] and result['honglu']['recast'],result['honglu']
 page.screenshot(path=str(art/'v33-honglu-healing-wave.png'))
 # Show live range and bullseye on a selected champion.
 result['tower']=page.evaluate('''()=>{const g=__moba.game,{p}=setup('sinclair');const tower=g.entity({kind:'tower',team:1,x:31,y:38,maxHp:5000,armor:120,range:8.5,damage:280,interval:1.05,targetId:p.id});__moba.renderer.draw(g,true);return O.towerTargeters(g,p).length;}''')
 assert result['tower']==1;page.screenshot(path=str(art/'v33-tower-target.png'))
 # Start the actual AI mode through the menu so match-specific fountain bounds are active.
 page.click('#pause');page.click('#leave');page.click('#practice-back');page.click('#practice-open');page.click('#start')
 page.evaluate('''()=>{const g=__moba.game;g.step=()=>{};g.units=g.units.filter(e=>e.player||['tower','core'].includes(e.kind));Object.assign(g.player,{x:-3,y:23.4});g.effects=[];__moba.renderer.draw(g,true);}''')
 assert page.evaluate('!__moba.game.training&&__moba.game.inSpawn(__moba.game.player)')
 page.screenshot(path=str(art/'v33-fountain-rectangle.png'))
 for w,h in [(390,844),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
 assert not errors,errors;b.close();print(json.dumps({'results':result,'errors':errors},ensure_ascii=False))
