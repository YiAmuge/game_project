"""Actual weapon poses, tapered ribbons, camera anchoring and texture reuse."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if 'GL_INVALID_' in m.text else None)
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.29.0')
 page.click('#training-open');page.click('#start');page.wait_for_function('Array.from(document.images).every(i=>i.complete)&&__moba.renderer.atlasV17.naturalWidth>0')
 page.evaluate('''async()=>{window.__Y=await import('./src/yan.js');window.__trail=await import('./src/weapon-trails.js');const g=__moba.game;g.step=()=>{};g.practice.lineStopped=true;window.pose=(key,form)=>{g.time=10;g.units=[];g.effects=[];g.projectiles=[];g.pending=[];g.zones=[];const e=g.makeChampion(key,0,0,'top');g.player=e;Object.assign(e,{x:25,y:38,attackCd:0,attackAt:-99});g.input.aim={x:30,y:38};if(form)g.addBuff(e,form,20);g.attack(e,g.input.aim);if(key==='yan')__Y.release(g,e,g.input.aim);g.effects=[];__moba.renderer.draw(g,true);return e;};window.frames=n=>{const g=__moba.game;for(let i=1;i<=n;i++){g.time=10+i/60;__moba.renderer.draw(g,true);}};}''')
 results={}
 for key,form in [('faust',None),('sinclair',None),('ryoshu',None),('honglu',None),('heathcliff',None),('rodya',None),('ishmael',None),('gregor','mutant'),('nelly',None),('myo',None),('dongbaek',None),('dongrang',None),('marton',None),('kim',None),('yan',None),('sora','soraEgo')]:
  page.evaluate('([key,form])=>{pose(key,form);frames(9);}',[key,form])
  tracks=page.evaluate('''()=>{const r=__moba.renderer,g=__moba.game,tracks=r.weaponTrails.owners.get(g.player);return [...tracks].map(([part,h])=>({part,count:h.samples.length,sections:__trail.ribbonSections(h.samples,g.time,s=>__trail.projectBlade(s,p=>r.camera.worldToScreen(p,.075),r.scale)).map(s=>({width:s.width,alpha:s.alpha}))}));}''')
  assert len(tracks)==(2 if key=='sora' else 1),(key,tracks)
  for t in tracks:
   assert t['count']==5 and t['sections'][0]['width']==0 and t['sections'][0]['alpha']==0,(key,t)
   assert all(t['sections'][i]['width']<t['sections'][i+1]['width'] and t['sections'][i]['alpha']<t['sections'][i+1]['alpha'] for i in range(4)),(key,t)
  results[key]=[t['count'] for t in tracks]
  if key in ['honglu','yan','sora','gregor']:page.screenshot(path=str(art/f'v26-trail-{key}.png'))
 # A real raster difference must exist, beyond just history bookkeeping.
 page.evaluate("pose('faust');frames(9)")
 pixels=page.evaluate('''()=>{const r=__moba.renderer,g=__moba.game,c=r.ctx;const before=c.getImageData(0,0,r.canvas.width,r.canvas.height).data;window.savedTrails=r.weaponTrails;r.weaponTrails=new __trail.MotionTrails();r.draw(g,true);const after=c.getImageData(0,0,r.canvas.width,r.canvas.height).data;let changed=0;for(let i=0;i<before.length;i+=4)if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])+Math.abs(before[i+3]-after[i+3])>8)changed++;r.weaponTrails=savedTrails;r.draw(g,true);return changed;}''')
 assert pixels>100,pixels;page.screenshot(path=str(art/'v26-trail-faust.png'))
 # Paused redraws and camera-only pans preserve world samples and do not grow the buffer.
 paused=page.evaluate('''()=>{const r=__moba.renderer,g=__moba.game,tracks=r.weaponTrails.owners.get(g.player),before=JSON.stringify([...tracks]);for(let i=0;i<10;i++)r.draw(g,true);r.camera.update(r.width,r.height,{x:g.player.x+2,y:g.player.y+1});r.scene25d.unitsFrame(g);r.scene25d.hud(g,true);return before===JSON.stringify([...tracks]);}''')
 assert paused
 for w,h in [(1920,1080),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100)
  assert page.evaluate('()=>{const g=__moba.game,r=__moba.renderer;return r.weaponTrails.owners.get(g.player).get("weapon").samples.length===5&&r.scene25d.webgl.getContext().getError()===0;}')
 page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(100)
 page.evaluate('''()=>{const r=__moba.renderer,g=__moba.game;g.player.x+=12;r.draw(g,true);}''')
 assert page.evaluate('__moba.renderer.weaponTrails.owners.get(__moba.game.player).get("weapon").samples.length')==1
 page.evaluate('''()=>{const g=__moba.game;g.time=11;__moba.renderer.draw(g,true);}''')
 assert page.evaluate('__moba.renderer.weaponTrails.owners.get(__moba.game.player).size')==0
 # Guns and thrusts do not create sweeping weapon ribbons.
 for key in ['outis','rudolph','meursault','don']:
  page.evaluate('(key)=>{pose(key);frames(9);}',key)
  assert page.evaluate('()=>{const h=__moba.renderer.weaponTrails.owners.get(__moba.game.player);return !h||h.size===0;}'),key
 # Skill slash FX also keep five positions in their own ground-space history.
 skill=page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer;g.time=20;const fx={type:'slash',x:26,y:38,angle:0,spread:1.7,r:3,theme:'ryoshu',life:.28,maxLife:.28};g.effects=[fx];for(let i=0;i<9;i++){g.time=20+i/60;fx.life=.28-i/60;r.draw(g,true);}return r.scene25d.groundPainter.slashTrails.owners.get(fx).get('cut').samples.length;}''')
 assert skill==5
 # Warm caches, then confirm ribbons require no repeated WebGL texture uploads.
 page.evaluate('''()=>{pose('honglu');frames(3);const gl=__moba.renderer.scene25d.webgl.getContext();window.uploads=0;for(const key of ['texImage2D','texSubImage2D']){const f=gl[key].bind(gl);gl[key]=(...args)=>{uploads++;return f(...args);};}frames(14);}''')
 assert page.evaluate('uploads')==0
 assert not errors,errors;browser.close()
 print(json.dumps({'swinging_champions':results,'trail_pixels':pixels,'pause_camera_resize':'passed','teleport_expiry':'passed','skill_frames':skill,'texture_uploads':0,'errors':errors},ensure_ascii=False))
