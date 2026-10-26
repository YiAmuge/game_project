"""Rooftop skyline, threefold window scale, bottom-only smoke, concealment and cached rendering."""
import json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
offline=os.environ.get('MOBA_OFFLINE')=='1'
patches=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{BUSHES}from'./src/data.js';console.log(JSON.stringify([BUSHES[0],BUSHES.find(b=>b.polygon)]));"],cwd=root,text=True))
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[];invalid=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.on('console',lambda m:invalid.append(m.text) if m.type in ['warning','error'] and any(s in m.text for s in ['INVALID','THREE.WebGL','GL_INVALID']) else None)
 if offline:
  page.route('http*://**/*',lambda route:route.abort())
  html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)');page.set_content(html,wait_until='networkidle',timeout=60000)
 else:page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
 page.click('#practice-open');page.get_by_role('button',name='뫼르소 선택',exact=True).click();page.click('#start')
 page.wait_for_function('__moba.renderer.scene25d.rooftop.ready&&__moba.renderer.scene25d.skin.ready&&__moba.renderer.atlasV36.naturalWidth')
 result=page.evaluate('''patches=>{
  const g=__moba.game,r=__moba.renderer,s=r.scene25d;g.step=()=>{};g.time=100;g.units=g.units.filter(e=>e.player||e.kind==='tower'||e.kind==='core');g.effects=[];g.projectiles=[];g.zones=[];g.wave=100;g.minionQueue=[];
  const bg=s.rooftop.background.children;if(bg.length!==1||bg[0].geometry.parameters.width!==g.bounds.w+12)throw Error('Background painting is repeated or does not cover the full upper edge');
  if(bg[0].material.map!==s.rooftop.textures.skyline||bg[0].material.depthWrite)throw Error('Background asset/depth mismatch');
  const source=s.rooftop.images.skyline,geometry=bg[0].geometry.parameters;if(Math.abs(geometry.width/geometry.height-source.naturalWidth/source.naturalHeight)>1e-7||geometry.height<39)throw Error('The taller skyline lost its original aspect ratio');
  const fade=s.rooftop.fade.image,mask=fade.getContext('2d'),green=(u,v)=>mask.getImageData(Math.floor(u*fade.width),Math.floor(v*fade.height),1,1).data[1];
  if(green(.01,.4)>35||green(.99,.4)>35||green(.5,.98)>35||green(.5,.4)<250)throw Error('Background sides and bottom do not fade into black');
  const processed=s.rooftop.textures.skyline.image;if(!processed.getContext)throw Error('Edge blur was not prepared');const raw=document.createElement('canvas');raw.width=source.naturalWidth;raw.height=source.naturalHeight;const rawCtx=raw.getContext('2d');rawCtx.drawImage(source,0,0);const finalCtx=processed.getContext('2d'),sample=(ctx,x,y)=>[...ctx.getImageData(x,y,1,1).data];for(const [x,y]of [[955,309],[990,400]])if(JSON.stringify(sample(rawCtx,x,y))!==JSON.stringify(sample(finalCtx,x,y)))throw Error('Central building was blurred');let changed=0;for(let x=25;x<150;x+=25)for(let y=240;y<440;y+=40)if(JSON.stringify(sample(rawCtx,x,y))!==JSON.stringify(sample(finalCtx,x,y)))changed++;if(changed<10)throw Error('Background edge blur was not applied');
  const walls=s.rooftop.group.children.filter(e=>e.name==='skyscraper-windows'),fog=s.rooftop.group.children.filter(e=>e.name.includes('smoke'));
  if(walls.length!==20||fog.length===0)throw Error('Missing roof facade or bottom mist');for(const w of walls){const size=w.geometry.parameters,u=w.geometry.getAttribute('uv');if(Math.abs(Math.max(...[0,1,2,3].map(i=>u.getX(i)))-size.width/36)>1e-5||size.height!==72||Math.abs(w.position.y+size.height/2+.16)>1e-7)throw Error('Window image is not scaled threefold');}
  if(fog.some(f=>f.position.y+f.geometry.parameters.height/2> -63))throw Error('Mist floats above the facade bottom');
  const saved=r.ctx;let smokeDraws=0;for(const patch of patches){const canvas=document.createElement('canvas');canvas.width=Math.ceil((patch.w+2)*48);canvas.height=Math.ceil((patch.h+2)*48);const c=canvas.getContext('2d');c.scale(48,48);c.translate(1-patch.x,1-patch.y);const draw=c.drawImage.bind(c);c.drawImage=(image,...a)=>{if(image===s.rooftop.images.smoke)smokeDraws++;return draw(image,...a);};r.ctx=c;r.bush(patch);const pixel=(x,y)=>c.getImageData(Math.floor((x-patch.x+1)*48),Math.floor((y-patch.y+1)*48),1,1).data;if(pixel(patch.x-.1,patch.y+.2)[3]!==0)throw Error('Smoke left the bush boundary');if(!patch.polygon){for(const x of [patch.x+.1,patch.x+patch.w-.1])for(const y of [patch.y+.1,patch.y+patch.h-.1]){const v=pixel(x,y);if(v[3]<35||v[2]<=v[0])throw Error('Bush corner lacks blue smoke');}}else{const x=patch.polygon.reduce((a,p)=>a+p[0],0)/4,y=patch.polygon.reduce((a,p)=>a+p[1],0)/4;if(pixel(x,y)[3]<35||pixel(patch.x+.1,patch.y+.1)[3]!==0)throw Error('Diagonal smoke footprint changed');}}r.ctx=saved;if(!smokeDraws)throw Error('Smoke painting was not used');
  Object.assign(g.player,{x:20,y:42});r.draw(g,true);
  return{oneFullWidthBackground:true,skylineHeight:geometry.height,originalAspect:true,edgeFadeAndBlur:true,sharpBuilding:true,windowScale:3,facadeHeight:72,bottomSmokeOnly:true,smokeDraws,concealmentClipped:true,gl:s.webgl.getContext().getError()};
 }''',patches)
 for x,y,label in [(35.36,-3,'upper-room'),(20,7,'top'),(20,42,'bottom'),(35.36,23.4,'bush')]:
  page.evaluate('p=>{Object.assign(__moba.game.player,p);__moba.renderer.draw(__moba.game,true);}',{'x':x,'y':y});page.wait_for_timeout(130)
  if label=='upper-room':
   outlet=page.evaluate('''()=>{const r=__moba.renderer,s=r.scene25d,sky=s.rooftop.background.children[0],b=sky.geometry.parameters,v=s.camera.native.position.clone().set((955/1981-.5)*b.width,(.5-309/793)*b.height,0);sky.localToWorld(v);const worldX=v.x;v.project(s.camera.native);return{x:(v.x+1)*r.width/2,worldX,y:(1-v.y)*r.height/2,roof:s.camera.worldToScreen({x:35.36,y:-8}).y};}''')
   assert 80<outlet['y']<outlet['roof']-40,outlet
   assert abs(outlet['worldX']-35.36)<1e-7 and abs(outlet['x']-720)<.01,outlet
  page.screenshot(path=str(art/('v53-'+label+('-offline'if offline else'')+'.png')))
 # The ground retains its own projection and cursor picking through both passes.
 for w,h in [(390,844),(1920,1080),(844,390)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(130)
  camera=page.evaluate('''()=>{const r=__moba.renderer,p=__moba.game.player,c=r.camera,point={x:p.x+3,y:p.y-2},s=c.worldToScreen(point),back=c.screenToWorld(s.x,s.y),gl=r.scene25d.webgl.getContext();return{error:Math.hypot(back.x-point.x,back.y-point.y),gl:gl.getError(),pixels:gl.drawingBufferWidth*gl.drawingBufferHeight};}''')
  assert camera['error']<1e-6 and camera['gl']==0 and camera['pixels']<=921600,camera
 page.set_viewport_size({'width':1440,'height':950});page.wait_for_timeout(150)
 cache=page.evaluate('''async()=>{const s=__moba.renderer.scene25d,gl=s.webgl.getContext();let uploads=0;const original={};for(const k of ['texImage2D','texSubImage2D']){original[k]=gl[k].bind(gl);gl[k]=(...a)=>{uploads++;return original[k](...a);};}const before=s.webgl.info.render.frame;for(let i=0;i<16;i++)await new Promise(requestAnimationFrame);for(const k of Object.keys(original))gl[k]=original[k];return{uploads,renders:s.webgl.info.render.frame-before,gl:gl.getError()};}''')
 assert cache['uploads']==0 and cache['renders']==0 and cache['gl']==0,cache
 # Repeat switching layouts to catch disposed shared textures and stale geometry.
 for training in [True,False,True,False]:
  mode=page.evaluate('''training=>{const r=__moba.renderer,old=__moba.game,g=new old.constructor('meursault','top',{mode:training?'training':'match',seed:53});g.step=()=>{};g.units=[g.player];Object.assign(g.player,{x:training?20:35,y:23});r.draw(g,true);return{training:g.training,backgrounds:r.scene25d.rooftop.background.children.length,gl:r.scene25d.webgl.getContext().getError()};}''',training)
  assert mode['gl']==0 and mode['backgrounds']==1 and mode['training']==training,mode
 assert not errors,errors;assert not invalid,invalid
 if offline:
  assert not requests,requests
  assert page.evaluate('Object.values(__moba.renderer.scene25d.rooftop.images).every(i=>i.src.startsWith("data:image/png;base64,"))')
 b.close();print(json.dumps({'result':result,'cache':cache,'errors':errors,'offline':offline},ensure_ascii=False))
