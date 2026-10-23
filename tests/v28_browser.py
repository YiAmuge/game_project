"""All champions exercise real attacks, casts, passive states and projectiles."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.28.0')
 page.click('#training-open');page.click('#start');page.click('#training-panel-toggle');page.wait_for_function('__moba.renderer.atlasV17.naturalWidth>0')
 page.evaluate('''async()=>{window.D=await import('./src/data.js');window.S=await import('./src/combat-style.js');window.Y=await import('./src/yan.js');window.H=await import('./src/hohenheim.js');window.P=await import('./src/projectile-vfx.js');const g=__moba.game;g.step=()=>{};window.setup=(key)=>{g.units=[];g.effects=[];g.pending=[];g.projectiles=[];g.zones=[];g.events=[];g.time=10;g.winner=null;g.input.fire=false;g.input.x=g.input.y=0;g.practice.lineStopped=true;g.practice.championAI=false;const p=g.makeChampion(key,0,0,'top'),t=g.makeChampion('faust',1,0,'top'),a=g.makeChampion('queequeg',0,1,'support');g.player=p;Object.assign(p,{x:25,y:38,player:true});Object.assign(t,{x:27,y:38,trainingSummoned:true,maxHp:100000,hp:100000});Object.assign(a,{x:24,y:38,trainingSummoned:true,maxHp:100000,hp:50000});g.input.aim={x:27,y:38};__moba.renderer.draw(g,true);return {p,t,a};};window.run=(seconds)=>{for(let i=0;i<seconds*60;i++){Object.getPrototypeOf(g).step.call(g,1/60);if(i%4===0)__moba.renderer.draw(g,true);}__moba.renderer.draw(g,true);};}''')
 keys=page.evaluate('Object.keys(D.RUNTIME_CHAMPIONS)');results={}
 for key in keys:
  result=page.evaluate('''key=>{const g=__moba.game,{p,t,a}=setup(key);g.attack(p,t);if(key==='yan')Y.release(g,p,t);if(key==='hohenheim')H.release(g,p,t);run(.4);p.qCd=p.rCd=0;p.channelUntil=0;delete p.motion;p.status={};const q=g.cast(p,'q',key==='queequeg'?a:t);if(key==='heathcliff'){p.state.chargeAt=g.time-1.5;}run(2.8);p.rCd=0;p.channelUntil=0;delete p.motion;p.status={};if(key==='alisa')p.state.heat=5;if(key==='sora')p.state.unlock=5;if(key==='yan')p.state.ominous=6;const r=g.cast(p,'r',t);run(.12);const scene=__moba.renderer.scene25d;return {q,r,emitters:scene.vfx.emitters.length,particleCount:scene.vfx.particles.length,events:scene.championVfx.effects.map(f=>f.type),gl:scene.webgl.getContext().getError()};}''',key)
  assert result['gl']==0 and result['particleCount']<=640,(key,result);results[key]=result
  if key in ['hohenheim','alisa','sora','yan','faust','marton']:page.screenshot(path=str(art/f'v28-{key}.png'))
 # Delayed impacts and alternate forms are exercised after their real activation time.
 persistent={}
 for key in ['faust','yan','sora','hohenheim','meursault','gregor','honglu','queequeg','rodya','don','myo']:
  result=page.evaluate('''key=>{const g=__moba.game,{p,t,a}=setup(key),v=__moba.renderer.scene25d.championVfx;
   if(key==='faust'){g.cast(p,'r',t);run(1.4);}
   if(key==='yan'){p.state.ominous=6;g.cast(p,'r',t);g.cast(p,'q',t);run(1.8);}
   if(key==='sora'){t.x=65;g.cast(p,'q',{x:30,y:38});run(.8);}
   if(key==='hohenheim'){g.attack(p,t);run(.95);}
   if(key==='meursault'){g.cast(p,'q',t);g.cast(p,'r',t);run(.15);}
   if(key==='gregor'){g.addBuff(p,'mutant',10);run(.15);}
   if(key==='honglu'){g.cast(p,'r',t);g.cast(p,'q',t);run(.15);}
   if(key==='queequeg'){g.cast(p,'q',a);g.cast(p,'r',t);run(.15);}
   if(key==='rodya'){g.cast(p,'r',t);run(.15);g.status(t,'stun',1,1,p);}
   if(key==='don'||key==='myo'){g.cast(p,'r',t);run(.15);}
   __moba.renderer.draw(g,true);return {events:v.effects.map(e=>e.type),look:__moba.renderer.scene25d.vfx.particles.length,gl:__moba.renderer.scene25d.webgl.getContext().getError()};}''',key)
  assert result['gl']==0,(key,result);persistent[key]=result
  page.screenshot(path=str(art/f'v28-state-{key}.png'))
 assert 'formulaField' in persistent['faust']['events'],persistent['faust']
 assert 'fallenSword' in persistent['yan']['events'] and 'cracks' in persistent['yan']['events'],persistent['yan']
 assert 'cracks' in persistent['sora']['events'],persistent['sora']
 # A basic neutral hit must attach to the enemy's torso with no liquid forms.
 hit=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('meursault'),r=__moba.renderer;g.deal(p,t,100);r.draw(g,true);const e=r.scene25d.vfx.emitters.find(e=>e.body);return {height:e.height,target:e.ownerId,expected:t.id,color:e.color,forms:r.scene25d.vfx.particles.filter(p=>p.body).map(p=>p.form)};}''')
 assert hit['height']==1.25 and hit['target']==hit['expected'] and hit['color']=='#e6e7e9',hit
 assert set(hit['forms'])<={'chip','spark'},hit
 # Every ranged projectile is rendered by the new material sprite pipeline.
 projectiles=page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer,out={};for(const key of ['gubo','nelly','rodya','myo','ppui','ishmael','ahab','yi','kim','outis']){const {p,t}=setup(key);g.bullet(p,{x:1,y:0},0,8,{swordWave:key==='kim',width:key==='kim'?1.8:.2,slot:'r'});r.draw(g,true);out[key]=P.projectileAppearance(g.projectiles[0],g).type;}return out;}''')
 assert projectiles=={'gubo':'bullet','nelly':'knife','rodya':'axe','myo':'bullet','ppui':'nail','ishmael':'harpoon','ahab':'harpoon','yi':'glass','kim':'wave','outis':'bullet'},projectiles
 for w,h in [(390,844),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100)
  assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
 assert not errors,errors;browser.close()
 print(json.dumps({'champions':results,'persistent_states':persistent,'torso_hit':hit,'projectiles':projectiles,'errors':errors},ensure_ascii=False))
