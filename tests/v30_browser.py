"""Vivid persistent effects, scaled projectiles, upright trees and directional fans."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.31.0')
 page.click('#training-open');page.click('#start');page.click('#training-panel-toggle');page.wait_for_function('__moba.renderer.atlasV17.naturalWidth>0')
 page.evaluate('''async()=>{window.D=await import('./src/data.js');window.C=await import('./src/champion-vfx.js');window.Y=await import('./src/yan.js');window.P=await import('./src/projectile-vfx.js');window.R=await import('./src/projectile-rules.js');const g=__moba.game;g.step=()=>{};
 window.setup=(key)=>{g.units=[];g.effects=[];g.events=[];g.projectiles=[];g.pending=[];g.zones=[];g.time=10;g.winner=null;g.input.fire=false;g.input.x=g.input.y=0;g.practice.lineStopped=true;g.practice.championAI=false;const p=g.makeChampion(key,0,0,'top'),t=g.makeChampion('faust',1,0,'top'),a=g.makeChampion('queequeg',0,1,'support');g.player=p;Object.assign(p,{x:25,y:38,player:true});Object.assign(t,{x:30,y:38,trainingSummoned:true,maxHp:100000,hp:100000});Object.assign(a,{x:22,y:39,trainingSummoned:true,maxHp:100000,hp:50000});g.input.aim={x:30,y:38};__moba.renderer.draw(g,true);return {p,t,a};};window.run=(s)=>{for(let i=0;i<Math.round(s*120);i++){Object.getPrototypeOf(g).step.call(g,1/120);__moba.renderer.draw(g,true);}};}''')
 # Measure the actual cached state artwork, including dark-colored auras and shields.
 auras=page.evaluate('''()=>{const g=__moba.game,{p}=setup('gubo'),v=__moba.renderer.scene25d.championVfx,c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.translate(128,218);ctx.scale(65,65);g.addBuff(p,'guboReload',4);v.aura(ctx,C.championPresentation(g,p).aura,g.time);const a=ctx.getImageData(0,0,256,256).data;let visible=0,peak=0;for(let i=3;i<a.length;i+=4){peak=Math.max(peak,a[i]);if(a[i]>100)visible++;}g.addShield(p,400,'test',5);__moba.renderer.draw(g,true);return {visible,peak};}''')
 assert auras['visible']>1000 and auras['peak']>180,auras
 page.screenshot(path=str(art/'v30-gubo-aura-shield.png'))
 # Every persistent zone must have a readable interior, not only a faint outer border.
 zones={}
 for key,kind in [('honglu','waterfall'),('rodya','ice'),('yi','mirror'),('hohenheim','electricBloom')]:
  result=page.evaluate('''([key,kind])=>{const g=__moba.game,{p}=setup(key),v=__moba.renderer.scene25d.championVfx;g.zones=[{kind,source:p,x:p.x+3,y:p.y,r:4,until:20}];const c=document.createElement('canvas');c.width=c.height=600;const ctx=c.getContext('2d'),cam={scale:48,width:600,height:600,worldToScreen:(p,h=0)=>({x:300+(p.x-28)*48,y:300+(p.y-38)*35-h*48})};v.ground(ctx,cam,g);const data=ctx.getImageData(150,190,300,220).data;let alpha=0,visible=0;for(let i=3;i<data.length;i+=4){alpha+=data[i];if(data[i]>100)visible++;}__moba.renderer.draw(g,true);return {meanAlpha:alpha/(data.length/4),visible};}''',[key,kind])
  assert result['meanAlpha']>25 and result['visible']>500,result;zones[kind]=result
  page.screenshot(path=str(art/f'v30-{kind}-zone.png'))
 # A real body impact stays at torso height and survives the 0.2-second point.
 hit=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('meursault');g.deal(p,t,100);__moba.renderer.draw(g,true);g.time+=.22;__moba.renderer.draw(g,true);const v=__moba.renderer.scene25d.vfx,e=v.emitters.find(e=>e.body),c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),cam={scale:100,worldToScreen:(p,h=0)=>({x:128,y:240-h*100})};v.drawBodyHits(ctx,cam);let visible=0;const d=ctx.getImageData(0,0,256,256).data;for(let i=3;i<d.length;i+=4)if(d[i]>20)visible++;return {height:e.height,owner:e.ownerId,target:t.id,visible};}''')
 assert hit['height']==1.25 and hit['owner']==hit['target'] and hit['visible']>200,hit
 page.screenshot(path=str(art/'v30-torso-impact.png'))
 # All four tactical rounds use orange metal, with the real sprite draw enlarged in both axes.
 projectiles=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('myo');t.x=45;g.cast(p,'q',t);run(.24);const pv=__moba.renderer.scene25d.projectileVfx,shot=g.projectiles[0],style=P.projectileAppearance(shot,g),sprite=pv.sprite(style.type,style.color,{tint:true}),d=sprite.getContext('2d').getImageData(0,0,128,96).data;let orange=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>100&&d[i]>d[i+1]*1.2&&d[i+1]>d[i+2]*1.2)orange++;const c=document.createElement('canvas');c.width=c.height=1000;const ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx),draws=[],cam={scale:40,width:1000,height:1000,worldToScreen:p=>({x:300+(p.x-25)*40,y:300+(p.y-38)*25})};ctx.drawImage=(...a)=>{if(a[0]===sprite)draws.push(a.slice(-2));draw(...a);};pv.draw(ctx,cam,g);return {orange,count:g.projectiles.length,width:shot.width,collision:R.projectileHitWidth(shot),expected:R.projectileDimensions(style,40),draws};}''')
 assert projectiles['orange']>400 and projectiles['count']==4,projectiles
 assert abs(projectiles['collision']/projectiles['width']-1.1)<1e-10
 assert all(abs(d[0]-projectiles['expected']['length'])<1e-8 and abs(d[1]-projectiles['expected']['width']*1.2)<1e-8 for d in projectiles['draws']) and len(projectiles['draws'])==4,projectiles
 page.screenshot(path=str(art/'v30-myo-orange-projectiles.png'))
 # Vertical and horizontal shots must face their actual flight direction.
 angles=page.evaluate('''()=>{const g=__moba.game,{p}=setup('myo'),v=__moba.renderer.scene25d.projectileVfx,c=document.createElement('canvas'),ctx=c.getContext('2d'),cam={scale:40,width:1000,height:1000,worldToScreen:p=>({x:300+(p.x-25)*40,y:300+(p.y-38)*40})},angles=[];ctx.rotate=a=>angles.push(a);for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){g.projectiles=[{source:p,theme:'myo',slot:'q',x:25,y:38,dx,dy,width:.14}];v.draw(ctx,cam,g);}return angles;}''')
 assert len(angles)==4 and abs(angles[0]-1.57079632679)<1e-8 and abs(angles[1]+1.57079632679)<1e-8 and angles[2]==0 and abs(angles[3]-3.14159265359)<1e-8,angles
 # The visible tree boundary reaches the true radius, and does not mark an inactive tree as attacking.
 tree_range=page.evaluate('''()=>{const g=__moba.game,{p}=setup('dongrang'),v=__moba.renderer.scene25d.championVfx,z={kind:'desireTree',source:p,x:25,y:38,r:3.8,damage:35,until:20},c=document.createElement('canvas');c.width=c.height=600;const ctx=c.getContext('2d'),cam={scale:50,width:600,height:600,worldToScreen:p=>({x:300+(p.x-z.x)*50,y:300+(p.y-z.y)*50})};v.treeRange(ctx,cam,z,g.time);const d=ctx.getImageData(0,0,600,600).data,edge=d[(300*600+488)*4+3],outside=d[(300*600+493)*4+3];ctx.clearRect(0,0,600,600);z.golden=true;v.treeRange(ctx,cam,z,g.time);let inactive=0;const gold=ctx.getImageData(0,0,600,600).data;for(let i=3;i<gold.length;i+=4)inactive+=gold[i];return {edge,outside,inactive};}''')
 assert tree_range['edge']>180 and tree_range['outside']==0 and tree_range['inactive']==0,tree_range
 # The whole tree, including its root and awards, remains upright on either side of a wall.
 trees=[]
 for golden in [False,True]:
  for y in [30,31.65]:
   result=page.evaluate('''([golden,y])=>{const g=__moba.game,{p}=setup('dongrang'),s=__moba.renderer.scene25d;p.y=y;p.x=20;g.zones=[{kind:'desireTree',source:p,x:22,y,r:3.8,golden,until:20}];const tree=s.championVfx.tree.bind(s.championVfx),mask=s.maskScenery.bind(s),order=[];s.maskScenery=(...a)=>{order.push('mask');return mask(...a);};s.championVfx.tree=(...a)=>{order.push('tree');return tree(...a);};__moba.renderer.draw(g,true);s.maskScenery=mask;s.championVfx.tree=tree;const v=s.championVfx,c=document.createElement('canvas');c.width=300;c.height=300;const ctx=c.getContext('2d'),cam={scale:60,width:300,height:300,worldToScreen:(p,h)=>({x:150,y:270-h*60})};v.tree(ctx,cam,g.zones[0],g);let n=0,top=300,bottom=0;const data=ctx.getImageData(0,0,300,300).data;for(let y=0;y<300;y++)for(let x=0;x<300;x++)if(data[(y*300+x)*4+3]>100){n++;top=Math.min(top,y);bottom=Math.max(bottom,y);}return {order,n,top,bottom,cache:v.treeTexture(golden)===v.treeTexture(golden)};}''',[golden,y])
   assert result['order']==['mask','tree'] and result['cache'] and result['n']>1800 and result['bottom']>260 and result['top']<80,result;trees.append(result)
   page.screenshot(path=str(art/f'v30-tree-{golden}-{y}.png'))
 # Outward petals remain inside the real fan. Normal Yan has one continuous pressure field.
 petal=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('dongbaek');g.attack(p,t);run(.2);const s=__moba.renderer.scene25d,f=s.championVfx.effects.find(e=>e.type==='petalFan');return {count:C.petalFanFlight(f,.2).length,r:f.r,real:g.attackRange(p),emitters:s.vfx.emitters.filter(e=>!e.body).length};}''')
 assert petal['count']==36 and petal['r']==petal['real'] and petal['emitters']==0,petal
 page.screenshot(path=str(art/'v30-dongbaek-outward-fan.png'))
 pressure=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('yan');g.attack(p,t);p.state.yanCharge.progress=1.5;Y.release(g,p,t);run(.06);const v=__moba.renderer.scene25d.vfx;return {fields:v.emitters.filter(e=>!e.body).map(e=>({pressure:e.pressure,shape:e.shape})),debris:v.particles.filter(e=>!e.body).length};}''')
 assert len(pressure['fields'])==1 and pressure['fields'][0]['pressure'] and pressure['debris']==0,pressure
 page.screenshot(path=str(art/'v30-yan-shockwave.png'))
 # Electric sparks, heat and facial smoke must be visible on the front of the body.
 states={}
 for key in ['myo','hohenheim','rudolph','alisa','ryoshu']:
  result=page.evaluate('''key=>{const g=__moba.game,{p}=setup(key),v=__moba.renderer.scene25d.championVfx;if(key==='myo')g.addBuff(p,'rabbitFrenzy',4.5);if(key==='hohenheim')p.state.hohenCharge={progress:1.5};if(key==='rudolph'){p.castSlot='r';p.channelUntil=g.time+1;}if(key==='alisa')p.state.heat=5;if(key==='ryoshu')p.lastCombat=0;const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),cam={scale:65,worldToScreen:()=>({x:128,y:220})};v.body(ctx,cam,p,g,true);const data=ctx.getImageData(0,0,256,256).data;let visible=0;for(let i=3;i<data.length;i+=4)if(data[i]>40)visible++;__moba.renderer.draw(g,true);return {visible};}''',key)
  assert result['visible']>30,(key,result);states[key]=result
  page.screenshot(path=str(art/f'v30-{key}-body-state.png'))
 # State art stays cached and does not create GPU texture uploads during repeated frames.
 performance=page.evaluate('''()=>{const g=__moba.game,{p}=setup('myo'),s=__moba.renderer.scene25d;g.addBuff(p,'rabbitFrenzy',4.5);g.addShield(p,400,'test',5);__moba.renderer.draw(g,true);const gl=s.webgl.getContext();let uploads=0;for(const key of ['texImage2D','texSubImage2D']){const f=gl[key].bind(gl);gl[key]=(...a)=>{uploads++;return f(...a);};}const before=s.championVfx.cache.size;for(let i=0;i<80;i++)__moba.renderer.draw(g,true);return {uploads,before,after:s.championVfx.cache.size,error:gl.getError()};}''')
 assert performance['uploads']==0 and performance['before']==performance['after'] and performance['error']==0,performance
 for w,h in [(390,844),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
 assert not errors,errors;b.close();print(json.dumps({'auras':auras,'zones':zones,'hit':hit,'projectiles':projectiles,'angles':angles,'tree_range':tree_range,'trees':trees,'petal':petal,'pressure':pressure,'states':states,'performance':performance,'errors':errors},ensure_ascii=False))
