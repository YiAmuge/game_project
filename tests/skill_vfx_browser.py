"""Projected height, element shapes, actual combat, pause, palette and GPU cache."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if 'GL_INVALID_' in m.text else None)
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.28.0')
 page.click('#training-open');page.get_by_role('button',name='알리사 선택',exact=True).click();page.click('#start');page.click('#training-panel-toggle')
 page.wait_for_function('__moba.renderer.atlasV08.naturalWidth>0')
 page.evaluate('''async()=>{window.V=await import('./src/skill-vfx.js');window.A=await import('./src/art.js');const g=__moba.game;g.step=()=>{};g.practice.lineStopped=true;g.units=[g.player];g.effects=[];g.projectiles=[];g.zones=[];Object.assign(g.player,{x:25,y:38});g.time=10;__moba.renderer.draw(g,true);window.burst=(kind,key,element,age=.2)=>{const g=__moba.game,r=__moba.renderer,v=r.scene25d.vfx;v.clear();g.effects=[];g.projectiles=[];g.zones=[];g.time=10;v.advance(10);const t=A.THEMES[key];v.emit(kind,{x:28,y:38},10,{radius:kind==='explosion'?4:2,angle:-.25,color:t.light,accent:t.accent,dark:t.dark,element,seed:12});g.time+=age;r.draw(g,true);};}''')
 masks=page.evaluate("""()=>{const v=__moba.renderer.scene25d.vfx,out={};for(const kind of ['slash','pierce','impact']){const c=v.strokes.mask(kind),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0,left=0,right=0;const levels=new Set();for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3];levels.add(a);if(a>30){ink++;if(x<128)left++;else right++;}}out[kind]={ink,left,right,levels:levels.size,center:d[(96*256+128)*4+3],reused:v.strokes.mask(kind)===c};}return out;}""")
 for kind,m in masks.items():assert m['ink']>1000 and m['levels']>80 and m['reused'],(kind,m)
 assert masks['slash']['right']>masks['slash']['left']*2,masks
 assert masks['impact']['center']==0,masks
 results={}
 for element,key in [('fire','alisa'),('electric','hohenheim'),('ice','rodya'),('wood','marton'),('water','honglu')]:
  page.evaluate('([element,key])=>burst("explosion",key,element)',[element,key])
  state=page.evaluate('''()=>{const r=__moba.renderer,v=r.scene25d.vfx;return {count:v.particles.length,forms:[...new Set(v.particles.map(p=>p.form))],height:Math.max(...v.frame.map(f=>f.pose.z)),pixelsAboveGround:v.frame.filter(f=>f.screen.y<v.camera.worldToScreen(f.pose).y).length,color:v.emitters[0].color};}''')
  assert state['count']==80 and state['height']>1 and state['pixelsAboveGround']==80,(element,state)
  if element!='fire':assert 'flame' not in state['forms'] and 'smoke' not in state['forms'],state
  results[element]=state;page.screenshot(path=str(art/f'v27-{element}.png'))
 for kind,key in [('slash','kim'),('pierce','gregor'),('impact','meursault'),('shot','gubo')]:
  page.evaluate('([kind,key])=>burst(kind,key,"metal",.06)',[kind,key]);assert page.evaluate('__moba.renderer.scene25d.vfx.frame.length')>0
  page.screenshot(path=str(art/f'v27-{kind}.png'))
 # Simulated time freezes both trajectories and light, independent of redraws.
 before=page.evaluate('JSON.stringify(__moba.renderer.scene25d.vfx.frame.map(f=>f.pose))')
 page.evaluate('()=>{for(let i=0;i<10;i++)__moba.renderer.draw(__moba.game,true);}')
 assert page.evaluate('JSON.stringify(__moba.renderer.scene25d.vfx.frame.map(f=>f.pose))')==before
 # Sprite highlight is clipped to alpha, not a rectangle covering the character.
 highlight=page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer,v=r.scene25d.vfx;v.clear();g.time=12;v.advance(12);v.emit('impact',g.player,12,{radius:3,color:A.THEMES.alisa.light});g.time=12.04;r.draw(g,true);const feet=r.camera.worldToScreen(g.player,.075),s=r.scale,x=Math.floor(feet.x-.6*s),y=Math.floor(feet.y-2.4*s),w=Math.ceil(1.2*s),h=Math.ceil(2.5*s),a=r.ctx.getImageData(x,y,w,h).data;const save=v.lightAt;v.lightAt=()=>({strength:0});r.draw(g,true);const b=r.ctx.getImageData(x,y,w,h).data;v.lightAt=save;let diff=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>5)diff++;return diff;}''')
 assert 0<=highlight<1000,highlight
 # Gameplay events automatically feed the renderer without test-only emit calls.
 events=page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer,v=r.scene25d.vfx;v.clear();g.time=20;g.effects=[];g.projectiles=[];g.zones=[];g.pending=[];g.events=[];const p=g.player;p.state.heat=5;p.attackCd=0;p.rCd=0;p.channelUntil=0;p.invulnerableUntil=0;p.buffs={};p.status={};g.cast(p,'r',p);for(let i=0;i<220;i++)Object.getPrototypeOf(g).step.call(g,1/60);r.draw(g,true);return {kinds:v.emitters.map(e=>e.kind),elements:v.emitters.map(e=>e.element)};}''')
 assert 'explosion' in events['kinds'] and 'fire' in events['elements'],events
 # Verify a real cone and projectile directly as well.
 auto=page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer,v=r.scene25d.vfx;v.clear();g.time=30;g.effects=[];g.projectiles=[];g.zones=[];const p=g.player;g.cone(p,{x:1,y:0},3,1.1,0);g.bullet(p,{x:1,y:0},0,5);r.draw(g,true);return v.emitters.map(e=>({kind:e.kind,color:e.color,element:e.element}));}''')
 assert {e['kind'] for e in auto}=={'pierce','shot'},auto
 # Warm scenery: particles, highlights, flashes and ground glow do not upload GPU textures.
 uploads=page.evaluate('''()=>{burst('explosion','honglu','water');const g=__moba.game,r=__moba.renderer,gl=r.scene25d.webgl.getContext();let n=0;for(const key of ['texImage2D','texSubImage2D']){const f=gl[key].bind(gl);gl[key]=(...a)=>{n++;return f(...a);};}for(let i=0;i<20;i++){g.time+=1/60;r.draw(g,true);}return n;}''')
 assert uploads==0,uploads
 for w,h in [(390,844),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100)
  assert page.evaluate('()=>{const r=__moba.renderer;return r.scene25d.webgl.getContext().getError()===0&&r.scene25d.vfx.frame.every(f=>Number.isFinite(f.screen.x)&&Number.isFinite(f.screen.y));}')
 page.evaluate('()=>{__moba.game.time+=5;__moba.renderer.draw(__moba.game,true);}')
 assert page.evaluate('__moba.renderer.scene25d.vfx.particles.length')==0
 assert not errors,errors;browser.close()
 print(json.dumps({'elements':results,'attack_families':'passed','reference_masks':masks,'highlight_pixels':highlight,'real_events':auto,'texture_uploads':uploads,'pause_resize_expiry':'passed','errors':errors},ensure_ascii=False))
