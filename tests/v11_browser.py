"""Rendered kill banners/rewards, objective notifications, infinite tether and new balance."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5173')+'/?debug=1',wait_until='networkidle')
 expect(page.locator('.build-tag')).to_contain_text('0.13.0')
 def choose(name):
  if page.evaluate('__moba.mode')=='playing':page.click('#pause');page.click('#leave')
  if page.evaluate('__moba.mode')=='menu':page.click('#practice-open')
  page.get_by_role('button',name=name+' 선택').click();page.click('#start')
  page.evaluate('''() => {const g=__moba.game;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player,t=g.makeChampion('faust',1,8);Object.assign(p,{x:40,y:7});Object.assign(t,{x:43,y:7,maxHp:100000,hp:100000});g.units=[p,t];g.minionQueue=[];window.__target=t;}''');page.wait_for_timeout(150)
 def click(x,y,button='left'):
  s=page.evaluate('([x,y])=>__moba.renderer.camera.worldToScreen({x,y})',[x,y]);page.mouse.move(s['x'],s['y']);page.mouse.click(s['x'],s['y'],button=button)
 choose('뫼르소')
 rewards=page.evaluate('''() => {const g=__moba.game,p=g.player,t=__target,a=g.makeChampion('yi',0,9);Object.assign(a,{x:42,y:9});const before=[p.gold,a.gold];g.deal(a,t,1,{fixed:true});g.deal(p,t,1,{fixed:true});g.deal(g.entity({kind:'minion',team:0,x:44,y:7,maxHp:1000}),t,1e7,{fixed:true});window.__support=a;return {gold:[p.gold-before[0],a.gold-before[1]],killer:t.lastDeath.killerId,id:p.id};}''')
 assert rewards['killer']==rewards['id'];assert abs(rewards['gold'][0]-160)<1e-5;assert abs(rewards['gold'][1]-40*4/3)<1e-5
 expect(page.locator('#announcement-title')).to_have_text('파우스트 처치!');expect(page.locator('#announcement-kicker')).to_contain_text('선취점')
 expect(page.locator('#blue-score')).to_have_text('1');expect(page.locator('#battle-announcement')).to_have_css('border-top-color','rgb(117, 184, 195)');page.screenshot(path=str(art/'v11-first-blood.png'))
 # A real LMB kills the next target and upgrades the existing banner immediately.
 page.evaluate('''() => {const g=__moba.game,t=g.makeChampion('faust',1,10);Object.assign(t,{x:41.4,y:7,hp:10});g.player.attackCd=0;}''');click(41.4,7)
 page.wait_for_function('__moba.game.player.kills===2');expect(page.locator('#announcement-title')).to_have_text('2연킬!')
 for count,title in [(3,'3연킬!'),(4,'올킬!')]:
  page.evaluate('''() => {const g=__moba.game,t=g.makeChampion('faust',1,11);g.kill(t,g.player);}''');expect(page.locator('#announcement-title')).to_have_text(title)
 assert page.evaluate('__moba.game.bounty(__moba.game.player)')==100
 page.screenshot(path=str(art/'v11-all-kill.png'));box=page.locator('#battle-announcement').bounding_box();assert box['y']<100 and box['x']>400
 assert page.locator('#battle-announcement').evaluate('(e)=>getComputedStyle(e).pointerEvents')=='none'
 page.keyboard.down('Tab');expect(page.locator('#score-rows tr').first).to_contain_text('현상금 +100');page.keyboard.up('Tab')
 page.click('#pause');stopped=page.evaluate('__moba.game.time');page.wait_for_timeout(300);assert page.evaluate('__moba.game.time')==stopped;expect(page.locator('#announcement-title')).to_have_text('올킬!');page.click('#resume')
 # A timed-out environmental death is an execution and does not change the team score.
 page.evaluate('''() => {const g=__moba.game,t=g.makeChampion('faust',1,12);g.deal(g.player,t,1,{fixed:true});g.time+=10.01;g.deal(g.entity({kind:'minion',team:0,x:42,y:7,maxHp:1000}),t,1e7,{fixed:true});}''')
 expect(page.locator('#announcement-title')).to_contain_text('처형');expect(page.locator('#blue-score')).to_have_text('4')
 page.evaluate('''() => {const g=__moba.game;g.time+=4;g.kill(g.entity({kind:'tower',team:1,x:48,y:7,maxHp:1000}),g.player);}''');expect(page.locator('#announcement-title')).to_have_text('적군 포탑 파괴')
 page.evaluate('__moba.game.time+=4;__moba.game.spawnBoss()');expect(page.locator('#announcement-title')).to_have_text('쌓인 것 등장')
 page.screenshot(path=str(art/'v11-boss-spawn.png'))
 page.evaluate('''() => {const g=__moba.game;g.time+=4;g.kill(g.units.find(e=>e.camp==='boss'),g.player);}''');expect(page.locator('#announcement-title')).to_have_text('아군 쌓인 것 처치')
 amount=page.evaluate('''() => {const g=__moba.game,k=g.makeChampion('faust',1,13);g.time+=4;const before=k.gold;g.kill(g.player,k);return k.gold-before;}''');assert abs(amount-220)<1e-5
 expect(page.locator('#announcement-detail')).to_contain_text('현상금 +100');expect(page.locator('#red-score')).to_have_text('1');page.screenshot(path=str(art/'v11-shutdown.png'))
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150);box=page.locator('#battle-announcement').bounding_box();assert box['x']>=140 and box['x']+box['width']<=391;assert page.evaluate('document.body.scrollWidth<=innerWidth');page.screenshot(path=str(art/'v11-mobile-announcement.png'));page.set_viewport_size({'width':1440,'height':900})
 choose('스타벅');expect(page.locator('#battle-announcement')).to_be_hidden()
 page.evaluate('''() => {const g=__moba.game;Object.assign(__target,{x:42,y:8.4});window.__hits=[];const deal=g.deal.bind(g);g.deal=(s,t,n,o)=>{if(s===g.player&&t===__target)__hits.push(g.time);return deal(s,t,n,o);};}''');click(45,7,button='right')
 page.screenshot(path=str(art/'v11-starbuck-wide-stab.png'));page.wait_for_function('__hits.length===5',timeout=6000);hits=page.evaluate('__hits');assert all(abs(hits[i]-hits[i-1]-.3)<.04 for i in range(1,5))
 page.evaluate('''() => {const g=__moba.game;Object.assign(__target,{x:41.4,y:7});g.player.attackCd=0;g.player.ammo=2;}''');click(41.4,7)
 assert abs(page.evaluate('__moba.game.player.motion.total')-2.875)<1e-5
 choose('에이해브');assert page.evaluate('__moba.game.player.ammo')==3
 state=page.evaluate('''() => {const g=__moba.game,p=g.player;window.__speed=g.speed(p);window.__armor=g.armor(p);}''');click(46,7,button='right')
 assert abs(page.evaluate('__moba.game.speed(__moba.game.player)/__speed')-1.12)<1e-5
 assert abs(page.evaluate('(100+__moba.game.armor(__moba.game.player))/(100+__armor)')-1.12)<1e-5
 page.keyboard.press('Space');click(46.5,7);assert abs(page.evaluate('__moba.game.player.x')-46.5)<.05
 page.screenshot(path=str(art/'v11-ahab-extended-ultimate.png'))
 choose('퀴케그');page.evaluate('''() => {const g=__moba.game,a=g.makeChampion('faust',0,9);Object.assign(a,{x:42,y:9});window.__ally=a;}''');click(42,9,button='right')
 page.wait_for_function('__moba.game.player.state.tether');page.evaluate('__moba.game.time+=20');page.wait_for_function('__ally.state.tetherResistance===4')
 expect(page.locator('#buff-list')).to_contain_text('∞');assert page.evaluate('__moba.game.player.state.tether.until===Infinity')
 sharing=page.evaluate('''() => {const g=__moba.game,p=g.player,a=__ally;g.status(a,'stun',1,2,__target);const old=[p.hp,a.hp];g.deal(__target,a,100,{fixed:true});return [old[0]-p.hp,old[1]-a.hp];}''');assert sharing==[50,50]
 page.screenshot(path=str(art/'v11-queequeg-infinite-link.png'))
 choose('이상');page.evaluate('''() => {const g=__moba.game,a=g.makeChampion('meursault',0,9);Object.assign(a,{x:42,y:9,hp:3000,lastAttackAt:10000,lastDamageAt:10000});window.__ally=a;}''');click(43,7)
 page.wait_for_function('__moba.game.yiShield(__ally)&&__ally.hp>3000',timeout=4000);page.screenshot(path=str(art/'v11-yi-shield-healing.png'))
 page.evaluate('''() => {const g=__moba.game;g.deal(__target,__ally,1000,{fixed:true});window.__health=__ally.hp;}''');page.wait_for_timeout(600)
 assert abs(page.evaluate('__ally.hp-__health'))<1e-4
 choose('넬리');page.evaluate('''() => {const g=__moba.game,t=g.makeChampion('hohenheim',1,9);Object.assign(t,{x:41.4,y:7,hp:300});t.state.nellyMarks={[g.player.id]:{active:true,ready:Infinity,hold:0,until:g.time+7}};g.units=[g.player,t];window.__hohen=t;}''');click(41.4,7)
 page.wait_for_function('__hohen.state.posthumous');assert page.evaluate('__moba.game.player.kills')==0
 page.wait_for_function('!__hohen.alive',timeout=5000);expect(page.locator('#blue-score')).to_have_text('1');assert page.evaluate('__hohen.deaths')==1
 page.click('#pause');page.click('#leave');page.click('#archive-open')
 for name,text in [('스타벅','0.3초'),('에이해브','6.5'),('퀴케그','무기한'),('이상','1.5%')]:
  page.fill('#roster-search',name);page.click('#roster-list button');expect(page.locator('#roster-detail')).to_contain_text(text)
 page.click('[data-category=rules]');expect(page.locator('#codex-content')).to_contain_text('선취점');expect(page.locator('#codex-content')).to_contain_text('최대 +220')
 assert not errors,errors;b.close();print(json.dumps({'status':'passed','checks':['environmental attribution and first-blood payout','real LMB double kill and triple/all-kill banners','bounty scoreboard/shutdown reward','execution after ten seconds','tower/boss notifications','nonblocking responsive banner and pause','Starbuck widened .3s chain and 2.875 dash','Ahab ammo/guard/6.5 ultimate','infinite Queequeg link and CC sharing','Yi shield heal and depletion','nested mark damage keeps Hohenheim delayed death','codex rules and champion tooltips'],'page_errors':errors},ensure_ascii=False))
