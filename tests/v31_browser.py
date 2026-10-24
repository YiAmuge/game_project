"""Champion-specific effect timing, sprite sizes, palettes and rendered layers."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.35.0')
 page.click('#training-open');page.click('#start');page.click('#training-panel-toggle');page.wait_for_function('__moba.renderer.atlasV17.naturalWidth>0')
 page.evaluate('''async()=>{window.C=await import('./src/champion-vfx.js');window.P=await import('./src/projectile-vfx.js');window.R=await import('./src/projectile-rules.js');window.O=await import('./src/overlays.js');window.A=await import('./src/art.js');const g=__moba.game;g.step=()=>{};
 window.setup=key=>{g.units=[];g.effects=[];g.events=[];g.projectiles=[];g.pending=[];g.zones=[];g.time=10;g.winner=null;g.input.fire=false;g.input.x=g.input.y=0;g.practice.lineStopped=true;g.practice.championAI=false;const p=g.makeChampion(key,0,0,'top'),t=g.makeChampion('faust',1,0,'top'),a=g.makeChampion('queequeg',0,1,'support');g.player=p;Object.assign(p,{x:25,y:38,player:true});Object.assign(t,{x:30,y:38,trainingSummoned:true,maxHp:100000,hp:100000});Object.assign(a,{x:22,y:39,trainingSummoned:true,maxHp:100000,hp:50000});g.input.aim={x:30,y:38};const s=__moba.renderer.scene25d;s.vfx.clear();s.championVfx.reset(g);s.projectileVfx.game=null;__moba.renderer.draw(g,true);return {p,t,a};};window.run=s=>{for(let i=0;i<Math.round(s*120);i++){Object.getPrototypeOf(g).step.call(g,1/120);__moba.renderer.draw(g,true);}};}''')
 result={}
 # Coin sprites continue to flip, but the separate stack HUD has no coin row.
 result['coins']=page.evaluate('''()=>{const g=__moba.game,{p}=setup('rodya');g.cast(p,'q',p);run(.35);const v=__moba.renderer.scene25d.championVfx,c=document.createElement('canvas'),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);let sprites=0;ctx.drawImage=(...a)=>{sprites++;draw(...a);};v.coins(ctx,p,g);return {stack:O.stackInfo(p,g),results:p.state.coinResults.length,heads:p.state.coinHeads,tails:p.state.coinTails,sprites};}''')
 assert result['coins']['stack'] is None and result['coins']['results']==3,result['coins']
 page.screenshot(path=str(art/'v31-rodya-coins.png'))
 # Both ultimate sprites scale only their art; a dedicated preview catches axis and culling errors.
 for key in ['rodya','ishmael']:
  out=page.evaluate('''key=>{const g=__moba.game,{p,t}=setup(key);t.x=40;g.cast(p,'r',t);run(key==='ishmael'?.25:.05);const shot=g.projectiles[0],style=P.projectileAppearance(shot,g),d=R.projectileDimensions(style,40),full=R.projectileDimensions({...style,visualScale:1},40);return {type:style.type,width:shot.width,hit:R.projectileHitWidth(shot),ratio:[d.width/full.width,d.length/full.length],slot:shot.slot};}''',key)
  assert out['slot']=='r' and all(abs(v-2/3)<1e-9 for v in out['ratio']),out;result[key]=out
  page.screenshot(path=str(art/f'v31-{key}-projectile.png'))
 # Gubo metal keeps a dark red silhouette; enhanced shots carry an aura through their flight.
 for boosted in [False,True]:
  out=page.evaluate('''boosted=>{const g=__moba.game,{p,t}=setup('gubo');if(boosted)g.cast(p,'q',p);g.attack(p,t);run(.06);const s=__moba.renderer.scene25d,pv=s.projectileVfx,shot=g.projectiles[0],style=P.projectileAppearance(shot,g),sprite=pv.sprite(style.type,style.color,{tint:style.tint}),data=sprite.getContext('2d').getImageData(0,0,128,96).data;let red=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>100&&data[i]>data[i+1]*1.4&&data[i]>data[i+2]*1.1)red++;return {red,aura:style.aura,color:style.color};}''',boosted)
  assert out['red']>400 and bool(out['aura'])==boosted,out;result['gubo_buff' if boosted else 'gubo_plain']=out
  page.screenshot(path=str(art/f'v31-gubo-bullet-{boosted}.png'))
 result['laser']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('gubo');g.cast(p,'r',t);run(1.25);const s=__moba.renderer.scene25d,c=document.createElement('canvas'),ctx=c.getContext('2d'),widths=[];ctx.stroke=()=>widths.push(ctx.lineWidth);s.projectileVfx.beams(ctx,s.camera,g);return {widths,scale:s.camera.scale,color:P.beamAppearance('gubo').color};}''')
 assert abs(result['laser']['widths'][1]/result['laser']['scale']-.1875)<1e-9,result['laser']
 page.screenshot(path=str(art/'v31-gubo-laser.png'))
 # Gregor has one real-radius translucent area and thirty-six larger, fast rotating insects.
 result['gregor']=page.evaluate('''()=>{const g=__moba.game,{p}=setup('gregor');g.addBuff(p,'mutant',5);__moba.renderer.draw(g,true);const s=__moba.renderer.scene25d,v=s.championVfx,c=document.createElement('canvas');c.width=c.height=700;const ctx=c.getContext('2d'),cam={scale:45,width:700,height:700,worldToScreen:(p,h=0)=>({x:350+(p.x-25)*45,y:350+(p.y-38)*30-h*45})},old=v.insect,calls=[];v.insect=(c,p,size,a)=>calls.push({size,a});v.ground(ctx,cam,g);g.time+=.1;v.ground(ctx,cam,g);v.insect=old;const data=ctx.getImageData(160,220,380,260).data;let alpha=0;for(let i=3;i<data.length;i+=4)alpha+=data[i];return {count:calls.length/2,size:calls[0].size,turn:calls[36].a-calls[0].a,meanAlpha:alpha/(data.length/4)};}''')
 assert result['gregor']['count']==36 and result['gregor']['size']>4 and result['gregor']['turn']>.3 and 15<result['gregor']['meanAlpha']<150,result['gregor']
 page.screenshot(path=str(art/'v31-gregor-infestation.png'))
 result['ahab']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('ahab');g.cast(p,'r',t);run(.22);return __moba.renderer.scene25d.championVfx.effects.filter(e=>e.type==='waterSpin').map(e=>({x:e.x,y:e.y,r:e.r,at:e.at}));}''')
 assert len(result['ahab'])==2 and all(e['r']==2.5 for e in result['ahab']),result['ahab']
 page.screenshot(path=str(art/'v31-ahab-opening-spins.png'))
 result['rudolph']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('rudolph');g.input.aim={x:t.x,y:t.y};g.input.fire=true;const s=__moba.renderer.scene25d,pulses=new Set();for(let i=0;i<110;i++){Object.getPrototypeOf(g).step.call(g,1/120);__moba.renderer.draw(g,true);for(const pulse of s.projectileVfx.whipPulses)pulses.add(pulse.bornAt);}g.input.fire=false;return {pulses:[...pulses],width:P.beamAppearance('rudolph').layers[1][0]};}''')
 assert len(result['rudolph']['pulses'])==3 and abs(result['rudolph']['width']-.2625)<1e-9,result['rudolph']
 page.screenshot(path=str(art/'v31-rudolph-wide-beam.png'))
 # Molecular absorption is composed in the foreground and the R pressure fronts converge.
 result['marton']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('marton');t.x=29;g.cast(p,'q',p);run(.15);const s=__moba.renderer.scene25d,v=s.championVfx,events=v.effects.filter(f=>f.type==='molecules'),c=document.createElement('canvas');c.width=c.height=600;const ctx=c.getContext('2d'),cam={scale:65,width:600,height:600,worldToScreen:(p,h=0)=>({x:180+(p.x-25)*65,y:350+(p.y-38)*40-h*65})};v.events(ctx,cam,g);const data=ctx.getImageData(0,0,600,600).data;let bright=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>80&&data[i+1]>130)bright++;return {events:events.length,bright};}''')
 assert result['marton']['events']>0 and result['marton']['bright']>500,result['marton']
 page.screenshot(path=str(art/'v31-marton-molecules.png'))
 page.evaluate("()=>{const g=__moba.game;g.cast(g.player,'r',g.player);run(.45);}");page.screenshot(path=str(art/'v31-marton-inward-waves.png'))
 # Real sword waves use smaller current collision geometry and atlas-sized wave art.
 result['kim']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('kim');t.x=40;g.cast(p,'r',t);g.deal(t,p,1,{fixed:true});run(.27);return g.projectiles.filter(p=>p.swordWave).map(p=>({width:p.width,hit:R.projectileHitWidth(p),damage:p.damage,slot:p.slot}));}''')
 assert len(result['kim'])==3 and all(abs(e['hit']-1.386)<1e-9 and e['damage']==338 and e['slot']=='r' for e in result['kim']),result['kim']
 page.screenshot(path=str(art/'v31-kim-counter-waves.png'))
 result['ppui_basic']=page.evaluate('''()=>{const g=__moba.game,{p,a}=setup('ppui');g.attack(p,a);__moba.renderer.draw(g,true);return {buff:g.buff(a,'redEncouragement'),fan:__moba.renderer.scene25d.vfx.emitters.some(e=>e.shape&&!e.body)};}''')
 assert result['ppui_basic']=={'buff':True,'fan':False},result['ppui_basic']
 result['ppui_q']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('ppui');g.cast(p,'q',t);run(.1);const s=__moba.renderer.scene25d,f=s.championVfx.effects.find(f=>f.type==='petalField');return {x:f.x,r:f.r,life:f.life};}''')
 assert result['ppui_q']['x']==30 and result['ppui_q']['r']==3.5,result['ppui_q']
 page.screenshot(path=str(art/'v31-ppui-healing-field.png'))
 result['ppui_r']=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('ppui');g.cast(p,'r',t);run(.18);const s=__moba.renderer.scene25d,v=s.championVfx,f=v.effects.find(f=>f.type==='nailFan'),c=document.createElement('canvas'),ctx=c.getContext('2d'),sprite=s.projectileVfx.sprite('nail','#cc354f',{tint:true}),draw=ctx.drawImage.bind(ctx),draws=[];ctx.drawImage=(...a)=>{if(a[0]===sprite)draws.push(a.slice(-2));draw(...a);};v.fan(ctx,s.camera,f,.18);return {count:C.fanFlight(f,.18).length,scale:s.camera.scale,draws};}''')
 assert result['ppui_r']['count']==22 and len(result['ppui_r']['draws'])==22,result['ppui_r']
 assert all(abs(w/result['ppui_r']['scale']-1.3*2.5/1.5)<1e-9 and abs(h/result['ppui_r']['scale']-1)<1e-9 for w,h in result['ppui_r']['draws']),result['ppui_r']
 page.screenshot(path=str(art/'v31-ppui-nails.png'))
 # The hand retains smoke, with no body aura. Falling sword uses the exact normal weapon atlas frame.
 result['hand']=page.evaluate('''()=>{const g=__moba.game,{p}=setup('yan');p.state.ominous=6;g.cast(p,'r',p);run(.1);const s=__moba.renderer.scene25d,v=s.championVfx,h=g.units.find(e=>e.key==='yanHand'),c=document.createElement('canvas'),ctx=c.getContext('2d'),oldAura=v.aura,oldMote=v.mote;let auras=0,smoke=0;v.aura=()=>auras++;v.mote=function(...a){if(a[1]==='mist'&&a[2]==='#272a38')smoke++;return oldMote.apply(this,a);};v.body(ctx,s.camera,h,g,false);v.body(ctx,s.camera,h,g,true);v.ground(ctx,s.camera,g);v.aura=oldAura;v.mote=oldMote;return {auras,smoke};}''')
 assert result['hand']=={'auras':0,'smoke':9},result['hand']
 result['yan']=page.evaluate('''()=>{const g=__moba.game,p=g.player,s=__moba.renderer.scene25d,v=s.championVfx,point={x:31,y:38};g.cast(p,'q',point);window.falls=[];const old=v.fallingSword;window.restoreFall=()=>{v.fallingSword=old;};v.fallingSword=function(c,cam,p,h,alpha){falls.push({at:g.time,height:h});return old.call(this,c,cam,p,h,alpha);};run(1.29);const early=falls.length;run(.06);const c=document.createElement('canvas'),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx),frames=[];ctx.drawImage=(...a)=>{if(a[0]===__moba.renderer.atlasV17)frames.push(a.slice(1,5));draw(...a);};const warning=g.effects.find(f=>f.type==='yanSwordWarning');v.events(ctx,s.camera,g);return {early,first:falls[0],frame:frames[0],expected:[A.FRAMES.yanSword.x,A.FRAMES.yanSword.y,A.FRAMES.yanSword.w,A.FRAMES.yanSword.h],radius:warning.r,remaining:warning.life};}''')
 assert result['yan']['early']==0 and result['yan']['frame']==result['yan']['expected'] and result['yan']['radius']==7.5,result['yan']
 assert result['yan']['first']['height']>10 and result['yan']['remaining']<.45,result['yan']
 page.screenshot(path=str(art/'v31-yan-warning.png'))
 page.evaluate('run(.27)');page.screenshot(path=str(art/'v31-yan-falling-sword.png'))
 page.evaluate('run(.2);restoreFall()');page.screenshot(path=str(art/'v31-yan-impact.png'))
 for w,h in [(390,844),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
 assert not errors,errors;b.close();print(json.dumps({'results':result,'errors':errors},ensure_ascii=False))
