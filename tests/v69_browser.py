"""Latest world sprites: real draw calls, grounded anchors, faction parity and offline previews."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

root=Path(__file__).resolve().parents[1]
art=root/'artifacts';art.mkdir(exist_ok=True)
offline=os.getenv('MOBA_OFFLINE')=='1';suffix='-offline' if offline else ''
frames=json.loads((root/'src/assets/world-v69.json').read_text())['frames']
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for mobile in [False,True]:
  kind='mobile' if mobile else 'desktop'
  context=browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 950},is_mobile=mobile,has_touch=mobile)
  page=context.new_page();errors=[];requests=[]
  page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',e.stack,flush=True)))
  page.on('request',lambda r:requests.append(r.url))
  if offline:
   page.route('http*://**/*',lambda r:r.abort())
   page.set_content((root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)'),wait_until='networkidle',timeout=60000)
  else:page.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
  page.wait_for_function('__moba.renderer.worldAtlas.naturalWidth>0')
  notice=page.locator('#menu-fan-notice');expect(notice).to_be_visible()
  assert notice.locator('span').all_text_contents()==['이 게임은 Project Moon과 관계없는 비공식 · 비영리 2차 팬메이드 창작물입니다.','원작의 세계관과 인물에 대한 모든 권리는 Project Moon에 있습니다.']
  for width,height in ([(844,390),(667,375),(568,320)] if mobile else [(1440,950)]):
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
   layout=notice.evaluate('''e=>{const a=e.getBoundingClientRect(),overlap=[...document.querySelectorAll('#main-menu button,.lobby-copy')].some(b=>{const r=b.getBoundingClientRect();return a.left<r.right&&a.right>r.left&&a.top<r.bottom&&a.bottom>r.top;});return{x:a.x,y:a.y,w:a.width,h:a.height,overflow:e.scrollWidth>e.clientWidth+1,overlap};}''')
   assert layout['x']>=0 and layout['y']>=0 and layout['x']+layout['w']<=width and layout['y']+layout['h']<=height and not layout['overlap'] and not layout['overflow'],layout
  page.screenshot(path=str(art/f'v69-{kind}-fan-notice{suffix}.png'))
  page.set_viewport_size({'width':844 if mobile else 1440,'height':390 if mobile else 950})
  page.evaluate('(f)=>window.frames69=f',frames)
  page.click('#menu-codex');page.click('#codex-tabs [data-category="monsters"]')
  expect(notice).to_be_hidden()
  for name in ['굶주린 르카키','시지프의 잔재','포탑','본진']:
   page.locator('.monster-choice').filter(has_text=name).click()
   expect(page.locator('.monster-detail h2')).to_contain_text(name)
   result=page.locator('.monster-overview canvas').evaluate('''c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0,edge=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]){count++;if(x<2||y<2||x>=c.width-2||y>=c.height-2)edge++;}return{count,edge};}''')
   assert result['count']>1000 and result['edge']==0,(name,result)
  page.screenshot(path=str(art/f'v69-{kind}-codex{suffix}.png'))
  page.click('#codex-back');page.click('#practice-open');page.click('#start')
  page.wait_for_function('__moba.mode==="playing"&&!__moba.presentation.blocking',timeout=60000)
  expect(notice).to_be_hidden()
  page.evaluate('''()=>{const g=__moba.game;g.step=()=>{};g.time=20;g.minionQueue=[];window.originalUnits69=g.units.slice();Object.assign(g.player,{x:35,y:23});for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};}''')
  # Capture the real Canvas2D atlas draws made by the 2.5D actor renderer.
  # Compare the transformed boot/puddle/plinth anchor with camera ground.
  probes=page.evaluate('''()=>{
   const g=__moba.game,r=__moba.renderer,c=r.ctx,draw=c.drawImage,results=[];let current;
   c.drawImage=function(image,...a){if(image===r.worldAtlas){const f=Object.values(frames69).find(f=>f.x===a[0]&&f.y===a[1]);if(!f)throw Error('Unexpected world frame');const m=c.getTransform(),p=m.transformPoint(new DOMPoint(a[4]+a[6]*(f.ground||f.foot)[0],a[5]+a[7]*(f.ground||f.foot)[1])),ground=r.camera.worldToScreen(current,.075);results.push({key:Object.keys(frames69).find(k=>frames69[k]===f),x:p.x/r.dpr,y:p.y/r.dpr,gx:ground.x,gy:ground.y,scale:r.camera.scale});}return draw.call(this,image,...a);};
   try{for(const[key,f]of Object.entries(frames69)){
    const e=f.kind==='neutral'?g.makeNeutral(37,23,f.camp):g.entity({kind:f.kind,team:f.color==='red'?1:0,x:37,y:23,maxHp:5000,radius:.9});
    Object.assign(e,{creepVariant:f.variant==='Brown'?1:0,swingUntil:f.pose==='attack'?g.time+1:0,faction:f.family,facing:0});g.units=[g.player,e];current=e;r.draw(g,true);
    if(results.at(-1)?.key!==key)throw Error('Wrong or missing rendered sprite: '+key);
   }}finally{c.drawImage=draw;g.units=originalUnits69;}
   return results;
  }''')
  assert len(probes)==14,probes
  assert all(abs(r['x']-r['gx'])<.001 and abs(r['y']-r['gy'])<.001 for r in probes),probes
  print(kind,'all 14 real sprite ground anchors PASS',flush=True)
  # In-game previews of every latest pose, at one shared world scale with a
  # visible ground line. Uses the game's actual drawing methods, not new art.
  if not mobile:
   page.evaluate('''()=>{
    const g=__moba.game,r=__moba.renderer,canvas=document.createElement('canvas');canvas.id='world-proof69';canvas.width=1360;canvas.height=1280;Object.assign(canvas.style,{position:'fixed',left:'0',top:'0',zIndex:99999,width:'1020px',height:'960px'});document.body.append(canvas);
    const c=canvas.getContext('2d'),previous=r.ctx,pass=r.billboardPass;c.fillStyle='#1b292f';c.fillRect(0,0,canvas.width,canvas.height);
    const order=['leccakiTealIdle','leccakiBrownIdle','leccakiTealAttack','leccakiBrownAttack','sisyphusIdle','sisyphusAttack','uniform_blue_tower','uniform_blue_core','uniform_red_tower','uniform_red_core','suit_blue_tower','suit_blue_core','suit_red_tower','suit_red_core'];
    try{r.ctx=c;r.billboardPass=true;for(const[key,index]of order.map((k,i)=>[k,i])){const f=frames69[key],x=(index%4)*340+170,y=Math.floor(index/4)*310+275;c.save();c.strokeStyle='#7ab4a2';c.lineWidth=1;c.beginPath();c.moveTo(x-150,y);c.lineTo(x+150,y);c.stroke();c.fillStyle='#d5e6eb';c.font='14px sans-serif';c.textAlign='center';c.fillText(key,x,y+25);c.translate(x,y);c.scale(64,64);const e={id:-index-10,kind:f.kind,camp:f.camp,team:f.color==='red'?1:f.kind==='neutral'?2:0,x:0,y:0,alive:true,state:{},status:{},buffs:{},maxHp:5000,hp:5000,radius:.5,faction:f.family,creepVariant:f.variant==='Brown'?1:0,swingUntil:f.pose==='attack'?g.time+1:0,facing:0};if(f.kind==='neutral')r.unit(e,g);else r.structure(e,g);c.restore();}}finally{r.ctx=previous;r.billboardPass=pass;}
   }''')
   page.locator('#world-proof69').screenshot(path=str(art/f'v69-world-sprites{suffix}.png'))
   page.evaluate('document.querySelector("#world-proof69").remove()')
  # Preserve the existing side assignment, but always pair each architecture
  # with its own minions in either ally/enemy color and successive waves.
  result=page.evaluate('''()=>{const g=__moba.game;g.units=originalUnits69;g.wave=2;g.spawnWave();g.time+=2;g.flushMinions();return{families:g.minionFactions,minions:g.units.filter(e=>e.kind==='minion').map(e=>({team:e.team,family:e.faction})),names:g.units.filter(e=>['side','central'].includes(e.camp)).map(e=>e.name)};}''')
  assert all(m['family']==result['families'][m['team']] for m in result['minions'])
  assert set(result['names'])=={'굶주린 르카키','시지프의 잔재'}
  # Actual map screenshots: bodies stay on their real camp/base coordinates.
  for camp,shot in [('side','leccaki'),('central','sisyphus'),('core','base'),('tower','tower')]:
   page.evaluate('''camp=>{const g=__moba.game,e=g.units.find(e=>camp==='core'||camp==='tower'?e.kind===camp&&e.team===0:e.camp===camp);Object.assign(g.player,{x:e.x+2.8,y:e.y+3});__moba.renderer.draw(g,true);}''',camp)
   page.wait_for_timeout(80);page.screenshot(path=str(art/f'v69-{kind}-{shot}{suffix}.png'))
  # Ending animation must still draw the new core during the glow, then remove
  # it at the explosion instead of falling back to the procedural old core.
  count=page.evaluate('''()=>{const g=__moba.game,r=__moba.renderer,e=g.units.find(e=>e.kind==='core'&&e.team===0),c=r.ctx,draw=c.drawImage;let count=0;g.presentation={type:'outro',elapsed:.5,coreId:e.id};e.alive=false;c.drawImage=function(image,...a){if(image===r.worldAtlas)count++;return draw.call(this,image,...a);};try{r.structure(e,g);if(count!==1)throw Error('New core missing during glow');g.presentation.elapsed=1.1;r.structure(e,g);if(count!==1)throw Error('Core remained after explosion');}finally{c.drawImage=draw;delete g.presentation;e.alive=true;}return count;}''')
  assert count==1
  assert not errors,errors
  if offline:assert not requests,requests
  print(json.dumps({'mobile':mobile,'offline':offline,'frames':len(probes),'grounded':True,'latestPreviews':True,'linkedFactions':True,'outroPreserved':True,'errors':errors}),flush=True)
  context.close()
 browser.close()
