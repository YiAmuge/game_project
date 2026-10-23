"""Render-layer, cast-warning, palette, terrain and input regressions."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.33.0')
 page.click('#training-open');page.click('#start');page.click('#training-panel-toggle');page.wait_for_function('__moba.renderer.atlasV17.naturalWidth>0')
 page.evaluate('''async()=>{window.P=await import('./src/projectile-vfx.js');window.C=await import('./src/combat-style.js');const g=__moba.game;g.step=()=>{};
 window.setup=key=>{g.units=[];g.corpses=[];g.logs=[];g.announcements=[];g.effects=[];g.events=[];g.projectiles=[];g.pending=[];g.zones=[];g.time=10;g.winner=null;g.input.fire=false;g.input.x=g.input.y=0;g.practice.lineStopped=true;g.practice.championAI=false;const p=g.makeChampion(key,0,0,'top'),t=g.makeChampion('faust',1,1,'top');g.player=p;Object.assign(p,{x:25,y:38,player:true});Object.assign(t,{x:30,y:38,trainingSummoned:true,maxHp:100000,hp:100000,lastDamageAt:100});g.input.aim={x:30,y:38};const s=__moba.renderer.scene25d;s.vfx.clear();s.championVfx.reset(g);s.projectileVfx.game=null;__moba.renderer.draw(g,true);return {p,t};};window.run=seconds=>{for(let i=0;i<Math.round(seconds*120);i++)Object.getPrototypeOf(g).step.call(g,1/120);__moba.renderer.draw(g,true);};}''')
 result={}
 result['coins']=page.evaluate('''()=>{const g=__moba.game,{p}=setup('rodya');g.cast(p,'q',p);run(.35);const c=document.createElement('canvas').getContext('2d'),v=__moba.renderer.scene25d.championVfx,at=[],translate=c.translate.bind(c);c.translate=(x,y)=>{at.push({x,y});translate(x,y);};v.coins(c,p,g);return at;}''')
 assert len(result['coins'])==3 and all(p['y']< -4.4 for p in result['coins']),result['coins']
 page.screenshot(path=str(art/'v32-rodya-coins.png'))
 for boosted in [False,True]:
  out=page.evaluate('''boosted=>{const g=__moba.game,{p,t}=setup('don');if(boosted)g.addBuff(p,'donLifesteal',7);g.attack(p,t);run(.1);return C.combatStyle('don',g,p,{kind:'basic'});}''',boosted)
  assert out['color']==('#a7323f' if boosted else '#e5bd38');result['don_red' if boosted else 'don_yellow']=out
  page.screenshot(path=str(art/f'v32-don-{boosted}.png'))
 result['circles']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('gubo'),a=g.makeChampion('rodya',0,9,'top');Object.assign(a,{x:29,y:38,hp:1,lastDamageAt:100,lastAttackAt:100});t.x=34;g.deal(p,a,100,{fixed:true,allowFriendly:true});run(.15);const s=__moba.renderer.scene25d,v=s.championVfx,f=v.effects.find(f=>f.type==='barrage'),c=document.createElement('canvas');c.width=c.height=900;const ctx=c.getContext('2d'),cam={scale:20,worldToScreen:(p,h=0)=>({x:90+(p.x-29)*20,y:450+(p.y-38)*14-h*20})};let arcs=0;ctx.arc=()=>arcs++;v.magicCircles(ctx,cam,f,1);return {source:g.effects.find(f=>f.type==='guboBlast').source,owner:p.id,arcs,r:f.r};}''')
 assert result['circles']['arcs']==12 and result['circles']['source']==result['circles']['owner'],result['circles']
 page.screenshot(path=str(art/'v32-gubo-magic-circles.png'))
 result['rudolph']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('rudolph');g.attack(p,t);const s=__moba.renderer.scene25d,c=document.createElement('canvas').getContext('2d'),ends=[],old=c.quadraticCurveTo.bind(c);c.quadraticCurveTo=(...a)=>{ends.push(a.slice(2));old(...a);};s.projectileVfx.beams(c,s.camera,g);const pulse=s.projectileVfx.whipPulses[0];return {ends,expected:s.camera.worldToScreen(pulse.to,.5)};}''')
 assert len(result['rudolph']['ends'])==3 and all(abs(x-result['rudolph']['expected']['x'])<1e-6 and abs(y-result['rudolph']['expected']['y'])<1e-6 for x,y in result['rudolph']['ends']),result['rudolph']
 page.screenshot(path=str(art/'v32-rudolph-center.png'))
 result['shadow']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('starbuck'),s=__moba.renderer.scene25d,c=s.groundPainter.ctx,original=c.ellipse.bind(c);let shadows=0;c.ellipse=(x,y,rx,ry,...a)=>{if(x===p.x&&y===p.y&&Math.abs(rx-p.radius-.12)<1e-7)shadows++;original(x,y,rx,ry,...a);};__moba.renderer.draw(g,true);const before=shadows;shadows=0;g.cast(p,'r',t);run(.32);const airborne=shadows;shadows=0;run(.39);const landed=shadows;c.ellipse=original;return {before,airborne,landed};}''')
 assert result['shadow']=={'before':1,'airborne':0,'landed':1},result['shadow']
 page.screenshot(path=str(art/'v32-starbuck-landed.png'))
 result['faust']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('faust');p.level=10;g.cast(p,'r',t);run(.6);const s=__moba.renderer.scene25d,c=document.createElement('canvas').getContext('2d'),v=s.championVfx,old=v.formulaArea;let formulas=0;v.formulaArea=function(...a){formulas++;old.apply(this,a);};v.events(c,s.camera,g);v.formulaArea=old;return {formulas,channel:p.channelUntil,now:g.time,remaining:g.pending[0].at-g.time,hp:t.hp};}''')
 assert result['faust']['formulas']==1 and result['faust']['channel']<result['faust']['now'] and result['faust']['hp']==100000,result['faust']
 page.screenshot(path=str(art/'v32-faust-pending.png'))
 page.evaluate('run(.66)');page.screenshot(path=str(art/'v32-faust-impact.png'))
 result['yan']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('yan');p.state.ominous=6;g.cast(p,'r',p);g.units=g.units.filter(e=>e.key!=='yanHand');g.cast(p,'q',t);run(.75);const s=__moba.renderer.scene25d,c=document.createElement('canvas').getContext('2d'),v=s.championVfx,text=[],arcs=[];c.fillText=(t)=>text.push(t);c.arc=(...a)=>arcs.push(a);const f=g.effects.find(f=>f.type==='yanSwordWarning');v.countdown(c,s.camera,f,f.life,f.maxLife,'#adbed9');return {text,arcs,remaining:f.life};}''')
 assert result['yan']['text']==['1.00s'] and len(result['yan']['arcs'])==1,result['yan']
 page.screenshot(path=str(art/'v32-yan-countdown.png'))
 page.evaluate('run(1.02)');page.screenshot(path=str(art/'v32-yan-slow.png'))
 for slot in ['basic','r']:
  out=page.evaluate('''slot=>{const g=__moba.game,{p,t}=setup('gubo'),a=g.makeChampion('rodya',0,9,'top');Object.assign(a,{x:29,y:38,hp:1,lastDamageAt:100,lastAttackAt:100});t.x=34;if(slot==='basic')g.attack(p,a);else g.cast(p,'r',a);run(slot==='basic'?.25:1.26);const s=__moba.renderer.scene25d,v=s.championVfx,f=v.effects.find(f=>f.type==='barrage'),canvas=document.createElement('canvas');canvas.width=canvas.height=900;const c=canvas.getContext('2d'),cam={scale:16,worldToScreen:(p,h=0)=>({x:450+(p.x-f.x)*16,y:450+(p.y-f.y)*12-h*16})};v.coneField(c,cam,f,1);const data=c.getImageData(0,0,900,900).data;let inside=0,red=0;for(let x=-14.5;x<14.5;x+=.2)for(let y=-14;y<14;y+=.2){if(!C.insideShape({kind:'cone',range:14.5,spread:f.spread-.06,angle:f.angle},x,y))continue;inside++;const i=(Math.floor(448.08+y*12)*900+Math.floor(450+x*16))*4;if(data[i]>data[i+1]*2&&data[i]>data[i+2]*1.5&&data[i+3]>60)red++;}return {range:f.r,angle:f.angle,life:f.life,coverage:red/inside,duplicate:s.vfx.emitters.some(e=>!e.body&&e.shape?.kind==='cone'&&e.shape.range===14.7)};}''',slot)
  assert out['range']==14.7 and out['coverage']>.99 and not out['duplicate'],out
  result['gubo_range_'+slot]=out
  page.screenshot(path=str(art/f'v32-gubo-range-{slot}.png'))
 # Exercise match scenery, not just the separate training floor.
 result['terrain']=page.evaluate('''()=>{const r=__moba.renderer,g=new (__moba.game.constructor)('meursault','top',{seed:32});g.units=[g.player];Object.assign(g.player,{x:35,y:23});const draw=r.draw.bind(r);r.draw=()=>draw(g,true);window.terrainGame=g;r.draw();const s=r.scene25d,top=s.world.children.filter(o=>o.geometry?.type==='BoxGeometry'&&o.geometry?.parameters?.height===.12),support=s.world.children.filter(o=>o.geometry?.parameters?.height===.8);return {tiles:top.length,support:support.map(o=>o.position.y+.4),top:top.map(o=>o.position.y+.06)};}''')
 assert result['terrain']['tiles']==5 and max(result['terrain']['support'])<min(result['terrain']['top'])-.05,result['terrain']
 result['floor_pixels']=page.evaluate('''()=>{const r=__moba.renderer,s=r.scene25d,g=terrainGame,gl=s.webgl.getContext(),pixels=[];for(let i=0;i<24;i++){g.player.x=35+Math.sin(i*.3)*2;g.player.y=23+Math.cos(i*.3);s.sceneryDirty=true;r.draw();const p=s.camera.native.position.clone().set(35.375,-.03,23.375).project(s.sceneryCamera),rgba=new Uint8Array(4);gl.readPixels(Math.floor((p.x+1)/2*gl.drawingBufferWidth),Math.floor((p.y+1)/2*gl.drawingBufferHeight),1,1,gl.RGBA,gl.UNSIGNED_BYTE,rgba);pixels.push([...rgba]);}return {pixels,variation:[0,1,2].map(c=>Math.max(...pixels.map(p=>p[c]))-Math.min(...pixels.map(p=>p[c])))};}''')
 assert max(result['floor_pixels']['variation'])<=3,result['floor_pixels']
 # Browser selection must not paint the canvas/scenery blue while aiming.
 page.mouse.move(700,450);page.mouse.down();page.mouse.move(1050,700,steps=10);page.mouse.up()
 assert page.evaluate("getComputedStyle(document.querySelector('#arena')).userSelect")=='none'
 assert page.evaluate("getComputedStyle(document.querySelector('#arena-3d')).pointerEvents")=='none'
 assert page.evaluate('getSelection().toString()')==''
 page.screenshot(path=str(art/'v32-match-floor.png'))
 for w,h in [(390,844),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
 assert not errors,errors;b.close();print(json.dumps({'results':result,'errors':errors},ensure_ascii=False))
