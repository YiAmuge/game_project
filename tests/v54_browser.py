"""Front-facing sewing sprites, timed boss, permanent reward and dimensional rooftop smoke, live/offline."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True);offline=os.environ.get('MOBA_OFFLINE')=='1'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[];invalid=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.on('console',lambda m:invalid.append(m.text) if m.type in ['warning','error'] and any(s in m.text for s in ['INVALID','THREE.WebGL']) else None)
 if offline:
  page.route('http*://**/*',lambda route:route.abort());html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)');page.set_content(html,wait_until='networkidle',timeout=60000)
 else:page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
 page.click('#practice-open');page.get_by_role('button',name='뫼르소 선택',exact=True).click();page.click('#start')
 page.wait_for_function('__moba.renderer.needleAtlas.naturalWidth&&__moba.renderer.scene25d.decor.ready&&__moba.renderer.scene25d.rooftop.ready&&__moba.renderer.scene25d.skin.ready')
 result=page.evaluate('''()=>{
  const g=__moba.game,r=__moba.renderer,s=r.scene25d;window.step54=g.step.bind(g);g.step=()=>{};g.wave=100;g.minionQueue=[];for(const key of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[key]=()=>{};
  const needles=g.units.filter(e=>e.camp==='needle');if(needles.length!==4||needles.map(e=>e.needleColor).join(',')!=='green,red,green,red')throw Error('Alternating needle camp missing');
  const sprites=s.decor.smokeGroup.children.filter(e=>e.name==='blue-smoke-sprite'),layers=s.decor.smokeGroup.children.filter(e=>e.name==='blue-smoke-layer');if(sprites.length<56||layers.length!==84||sprites.some(e=>Math.abs(e.position.y+e.geometry.parameters.height/2-1.5)>1e-7||e.material.opacity<.4)||layers.some(e=>e.material.opacity<.25))throw Error('Smoke does not fill visibly to wall height');
  const gardens=s.walls.filter(e=>e.mesh.material.map===s.decor.garden);if(gardens.length!==4)throw Error('Central flower garden missing');if(s.walls.filter(e=>e.rect.baseDivider).some(e=>e.mesh.geometry.parameters.height===1.25&&e.mesh.children.filter(p=>p.material.map===s.skin.textures.vent).length<8))throw Error('Fountain vent facade missing');let lamps=0;for(const {mesh}of s.walls)mesh.traverse(e=>{if(e.geometry?.parameters?.height===.18&&e.material?.emissiveIntensity===.9)lamps++;});if(lamps!==4)throw Error('Four corner lamps missing');
  const proof=document.createElement('div');proof.id='proof54';Object.assign(proof.style,{position:'absolute',left:0,top:0,zIndex:99999,width:'900px',display:'grid',gridTemplateColumns:'repeat(2,450px)',background:'#34424a',color:'#fff',font:'18px Arial'});
  for(const camp of ['green','red','king'])for(const attack of [false,true]){const e={kind:'neutral',camp:camp==='king'?'sewingKing':'needle',needleColor:camp,x:0,y:0,alive:true,swingUntil:attack?1:0},canvas=document.createElement('canvas');canvas.width=450;canvas.height=460;const c=canvas.getContext('2d');c.fillStyle='#34424a';c.fillRect(0,0,450,460);c.translate(225,430);const scale=camp==='king'?98:225;c.scale(scale,scale);const old=r.ctx,pass=r.billboardPass;r.ctx=c;r.billboardPass=true;r.unit(e,{...g,time:0,hidden:()=>false,visibleTo:()=>true});r.ctx=old;r.billboardPass=pass;canvas.style.cssText='width:450px;height:460px;max-height:none;aspect-ratio:auto';const wrap=document.createElement('div'),label=document.createElement('div');label.textContent=camp+(attack?' attack':' idle');wrap.append(label,canvas);proof.append(wrap);}document.body.append(proof);
  return{frontPoses:6,regularNeedles:4,volumeSprites:sprites.length,volumeLayers:layers.length,gardenWalls:2,lamps,vents:true,gl:s.webgl.getContext().getError()};
 }''')
 page.locator('#proof54').screenshot(path=str(art/('v54-pose-proof'+('-offline'if offline else'')+'.png')));page.evaluate('document.querySelector("#proof54").remove()')
 def location(x,y,label):
  page.evaluate('p=>{Object.assign(__moba.game.player,p);__moba.renderer.draw(__moba.game,true)}',{'x':x,'y':y});page.wait_for_timeout(150);page.screenshot(path=str(art/('v54-'+label+('-offline'if offline else'')+'.png')))
 location(35.36,1.2,'needle-camp');location(35.36,23.4,'central-garden');location(21.6,13.7,'diagonal-smoke');location(3,23.4,'fountain-entrance')
 battle=page.evaluate('''()=>{
  const g=__moba.game,r=__moba.renderer,p=g.player;g.time=269.999;step54(.001);const king=g.units.find(e=>e.camp==='sewingKing');if(!king||g.units.some(e=>e.camp==='needle'&&!e.summonedNeedle&&e.alive))throw Error('Timed king spawn failed');Object.assign(p,{x:35.36,y:1.2});g.deal(p,king,1,{fixed:true,proc:false});g.time+=12;Object.getPrototypeOf(g).aiNeutral.call(g,king,0);if(!king.needleCast||Math.abs(king.needleCast.at-g.time-1.5)>1e-6)throw Error('King telegraph missing');r.draw(g,true);return{kingHealth:king.maxHp,warning:1.5};
 }''')
 page.wait_for_timeout(120);page.screenshot(path=str(art/('v54-king-warning'+('-offline'if offline else'')+'.png')))
 page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer,k=g.units.find(e=>e.camp==='sewingKing');g.time+=1.5;Object.getPrototypeOf(g).aiNeutral.call(g,k,0);if(!g.projectiles.some(p=>p.theme==='sewingNeedle'&&p.pierce===Infinity))throw Error('Piercing needle not fired');g.updateProjectiles(.05);r.draw(g,true);}''');page.wait_for_timeout(120);page.screenshot(path=str(art/('v54-king-attack'+('-offline'if offline else'')+'.png')))
 reward=page.evaluate('''()=>{const g=__moba.game,k=g.units.find(e=>e.camp==='sewingKing'),p=g.player;k.hp=1300;g.deal(p,k,200,{fixed:true,proc:false});const summoned=g.units.filter(e=>e.summonedNeedle);if(summoned.map(e=>e.needleColor).join(',')!=='green,red')throw Error('King did not summon a color pair');const team=g.champions(0),before=team.map(e=>[e.xp,e.gold]);g.kill(k,p);for(let i=0;i<team.length;i++)if(Math.abs(team[i].xp-before[i][0]-125)>1e-7||Math.abs(team[i].gold-before[i][1]-200)>1e-7||!g.buff(team[i],'sewingStitches'))throw Error('Permanent team reward mismatch');return{team:team.length,experience:125,gold:200,permanent:true,summoned:2};}''')
 expect(page.locator('#buff-list')).to_contain_text('땀수!');expect(page.locator('#buff-list')).to_contain_text('∞')
 page.screenshot(path=str(art/('v54-permanent-reward'+('-offline'if offline else'')+'.png')))
 for w,h in [(390,844),(1920,1080),(844,390)]:page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(130);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
 page.set_viewport_size({'width':1440,'height':950});page.wait_for_timeout(180)
 cache=page.evaluate('''async()=>{const s=__moba.renderer.scene25d,gl=s.webgl.getContext();let uploads=0;const original={};for(const key of ['texImage2D','texSubImage2D']){original[key]=gl[key].bind(gl);gl[key]=(...a)=>{uploads++;return original[key](...a);};}const frame=s.webgl.info.render.frame;for(let i=0;i<16;i++)await new Promise(requestAnimationFrame);for(const key of Object.keys(original))gl[key]=original[key];return{uploads,renders:s.webgl.info.render.frame-frame,gl:gl.getError()};}''');assert cache['uploads']==0 and cache['renders']==0 and cache['gl']==0,cache
 assert not errors,errors;assert not invalid,invalid
 if offline:assert not requests,requests;assert page.evaluate('__moba.renderer.needleAtlas.src.startsWith("data:image/png;base64,")&&__moba.renderer.scene25d.decor.image.src.startsWith("data:image/png;base64,")')
 b.close();print(json.dumps({'result':result,'battle':battle,'reward':reward,'cache':cache,'errors':errors,'offline':offline},ensure_ascii=False))
