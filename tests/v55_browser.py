"""Current title menu, north camp divider, boss art and tower warning, live/offline."""
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
 expect(page).to_have_title('도시 경계');expect(page.locator('.lobby-copy h1')).to_have_text('도시 경계');page.wait_for_function('document.querySelector("#menu-background").naturalWidth>0')
 for selector in ['.masthead','.match-bar','.field-top','.field-legend','.hud','.underbar','footer','#event-feed']:expect(page.locator(selector)).not_to_be_visible()
 page.screenshot(path=str(art/('v55-menu'+('-offline'if offline else'')+'.png')))
 for w,h in [(390,844),(844,390)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100)
  for selector in ['#practice-open','#training-open','#menu-codex']:
   rect=page.locator(selector).bounding_box();assert rect and rect['x']>=0 and rect['y']>=0 and rect['x']+rect['width']<=w+1 and rect['y']+rect['height']<=h+1,(selector,rect,w,h)
  page.screenshot(path=str(art/(f'v55-menu-{w}'+('-offline.png'if offline else'.png'))))
 page.set_viewport_size({'width':1440,'height':950});page.click('#menu-codex');expect(page.locator('#archive')).to_be_visible();page.locator('#archive .close-dialog').click();page.click('#training-open');expect(page.locator('#practice-panel')).to_be_visible();page.click('#practice-back');expect(page.locator('#main-menu')).to_be_visible()
 page.click('#practice-open');page.get_by_role('button',name='뫼르소 선택',exact=True).click();page.click('#start');page.wait_for_function('__moba.renderer.bossAtlas.naturalWidth&&__moba.renderer.scene25d.decor.ready')
 result=page.evaluate('''()=>{
  const g=__moba.game,r=__moba.renderer,s=r.scene25d;window.step55=g.step.bind(g);g.step=()=>{};g.wave=100;g.minionQueue=[];for(const k of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};
  if(document.body.classList.contains('menu-screen'))throw Error('Title mode persisted into match');
  const wall=s.walls.find(w=>w.rect.northDivider);if(!wall||wall.rect.w!==2||wall.rect.h!==1)throw Error('North divider missing');
  const layers=s.decor.smokeGroup.children.filter(e=>e.name==='blue-smoke-layer');if(layers.length!==96)throw Error('New perimeter smoke missing');
  Object.assign(g.player,{x:35.36,y:7.5});r.draw(g,true);return{wall:[wall.rect.x,wall.rect.y,wall.rect.w,wall.rect.h],smokeLayers:layers.length};
 }''')
 page.wait_for_timeout(150);page.screenshot(path=str(art/('v55-north-wall'+('-offline'if offline else'')+'.png')))
 boss=page.evaluate('''()=>{
  const g=__moba.game,r=__moba.renderer;g.time=300;g.spawnBoss();const boss=g.units.find(e=>e.camp==='boss');if(boss.name!=='쌓인 것')throw Error('Boss name mismatch');Object.assign(g.player,{x:boss.x,y:boss.y+5});
  const proof=document.createElement('div');proof.id='boss-proof55';Object.assign(proof.style,{position:'fixed',left:0,top:0,zIndex:99999,width:'1000px',display:'flex',background:'#38424b',color:'white',font:'18px Arial'});
  for(const attack of [false,true]){const canvas=document.createElement('canvas');canvas.width=500;canvas.height=500;canvas.style.cssText='width:500px;height:500px;max-height:none;aspect-ratio:auto';const c=canvas.getContext('2d');c.fillStyle='#38424b';c.fillRect(0,0,500,500);c.translate(250,460);c.scale(65,65);const old=r.ctx,pass=r.billboardPass;r.ctx=c;r.billboardPass=true;r.unit({...boss,x:0,y:0,swingUntil:attack?g.time+1:0},g);r.ctx=old;r.billboardPass=pass;proof.append(canvas);}document.body.append(proof);r.draw(g,true);return{name:boss.name,height:boss.maxHp,poses:2};
 }''')
 page.locator('#boss-proof55').screenshot(path=str(art/('v55-boss-poses'+('-offline'if offline else'')+'.png')));page.evaluate('document.querySelector("#boss-proof55").remove()');page.wait_for_timeout(150);page.screenshot(path=str(art/('v55-boss-idle'+('-offline'if offline else'')+'.png')))
 page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer,k=g.units.find(e=>e.camp==='boss');k.swingUntil=g.time+.3;r.draw(g,true);}''');page.wait_for_timeout(120);page.screenshot(path=str(art/('v55-boss-attack'+('-offline'if offline else'')+'.png')))
 warning=page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer,t=g.towers(1)[0],p=g.player,gp=r.scene25d.groundPainter,rings=[],original=gp.circle;gp.circle=function(x,y,radius,...args){rings.push({x,y,radius});return original.call(this,x,y,radius,...args);};Object.assign(p,{x:t.x-4,y:t.y});r.draw(g,true);gp.circle=original;if(!rings.some(c=>c.x===t.x&&c.y===t.y&&c.radius===t.range))throw Error('Tower ground warning missing');return{range:t.range,ground:true};}''')
 page.wait_for_timeout(120);page.screenshot(path=str(art/('v55-tower-warning'+('-offline'if offline else'')+'.png')))
 page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer;Object.assign(g.player,{x:35.36,y:28.4});r.draw(g,true);}''');page.wait_for_timeout(180)
 cache=page.evaluate('''async()=>{const s=__moba.renderer.scene25d,gl=s.webgl.getContext();let uploads=0;const original={};for(const key of ['texImage2D','texSubImage2D']){original[key]=gl[key].bind(gl);gl[key]=(...a)=>{uploads++;return original[key](...a);};}const frame=s.webgl.info.render.frame;for(let i=0;i<16;i++)await new Promise(requestAnimationFrame);for(const key of Object.keys(original))gl[key]=original[key];return{uploads,renders:s.webgl.info.render.frame-frame,gl:gl.getError()};}''');assert cache['uploads']==0 and cache['renders']==0 and cache['gl']==0,cache
 assert not errors,errors;assert not invalid,invalid
 if offline:assert not requests,requests;assert page.evaluate('__moba.renderer.bossAtlas.src.startsWith("data:image/png;base64,")&&document.querySelector("#menu-background").src.startsWith("data:image/png;base64,")')
 b.close();print(json.dumps({'titleMenu':True,'result':result,'boss':boss,'warning':warning,'cache':cache,'errors':errors,'offline':offline},ensure_ascii=False))
