"""Current codex facts, equipped stances, shield-ammunition UI and real tower grounding."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
offline=os.getenv('MOBA_OFFLINE')=='1';suffix='-offline'if offline else''
frames=json.loads((root/'src/assets/world-v69.json').read_text())['frames']
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for mobile in [False,True]:
  kind='mobile'if mobile else'desktop';ctx=browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 950},is_mobile=mobile,has_touch=mobile)
  p=ctx.new_page();errors=[];requests=[]
  p.on('pageerror',lambda e:(errors.append(str(e)),print(e.stack,flush=True)))
  p.on('request',lambda r:requests.append(r.url))
  if offline:
   p.route('http*://**/*',lambda r:r.abort());p.set_content((root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)'),wait_until='networkidle',timeout=60000)
  else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
  p.wait_for_function('__moba.renderer.worldAtlas.naturalWidth>0');p.evaluate('(f)=>window.frames70=f',frames)
  p.click('#menu-codex');p.wait_for_function('document.querySelector("#archive-body").dataset.pose==="basic"')
  p.wait_for_timeout(200)
  result=p.evaluate('''()=>{const s=__moba.codex,out=[];for(const b of document.querySelectorAll('.archive-champion')){const key=b.dataset.key;s.key=key;for(const form of ['sora','yan'].includes(key)?[false,true]:[false]){s.transformed=form;s.skill=0;s.championDetail();const canvas=document.getElementById('archive-body'),d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let solid=0,edge=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(d[(y*canvas.width+x)*4+3]){solid++;if(x<3||y<3||x>=canvas.width-3||y>=canvas.height-3)edge++;}if(solid<500||edge)throw Error('Clipped/empty stance '+key+' '+form);for(let i=0;i<(form?3:4);i++){s.skill=i;s.descriptionMode='summary';s.championDetail();const summary=document.querySelector('.skill-body').textContent;s.descriptionMode='details';s.championDetail();const body=document.querySelector('.skill-body'),info=document.querySelector('.skill-heading'),ranges=document.querySelector('.skill-ranges'),detail=document.querySelector('#roster-detail');if(!summary.trim()||!body.textContent.trim()||!info.querySelector('h3').textContent.trim()||!info.querySelector('.skill-cooldown').textContent.trim()||!ranges.textContent.trim())throw Error('Missing skill record '+key+'/'+form+'/'+i);if(detail.scrollWidth>detail.clientWidth+1)throw Error('Horizontal overflow '+key+'/'+form+'/'+i);if(document.querySelector('.champion-overview>p'))throw Error('Passive intro retained');out.push({key,form,i});}}}s.key='don';s.transformed=false;s.skill=2;s.descriptionMode='details';s.championDetail();return out;}''')
  assert len(result)==126,len(result)
  assert p.locator('.skill-value.damage').count()>0
  expect(p.locator('.skill-body')).to_contain_text('최소 120 ~ 최대 450')
  assert p.locator('.skill-heading h3').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>20
  p.screenshot(path=str(art/f'v70-{kind}-codex-charge{suffix}.png'))
  # Actual UI switches preserve the selected skill and remain reachable on small phones.
  p.click('[data-description-mode="summary"]');expect(p.locator('[data-description-mode="summary"]')).to_have_attribute('aria-pressed','true')
  p.click('[data-description-mode="details"]');expect(p.locator('[data-description-mode="details"]')).to_have_attribute('aria-pressed','true')
  for key,index,css in [('yan',0,'healing'),('nelly',0,'true'),('alisa',1,'true')]:
   p.evaluate('''([key,index])=>{const s=__moba.codex;s.key=key;s.transformed=false;s.skill=index;s.descriptionMode='details';s.championDetail();}''',[key,index]);assert p.locator('.skill-value.'+css).count()>0,(key,css)
  p.evaluate('''()=>{const s=__moba.codex;s.key='sora';s.transformed=false;s.skill=3;s.championDetail();}''');assert p.locator('.skill-record').count()==2
  p.click('[data-form="transformed"]');assert p.locator('.empty-skill').count()==1;expect(p.locator('.skill-heading h3')).to_contain_text('당연한 믿음')
  # A visual contact sheet uses the actual equipped codex canvases, without changing game art.
  if not mobile:
   p.evaluate('''()=>{const c=document.createElement('canvas');c.id='stances70';c.width=1600;c.height=1200;Object.assign(c.style,{position:'fixed',left:0,top:0,width:'1200px',height:'900px',zIndex:99999});document.body.append(c);const x=c.getContext('2d');x.fillStyle='#1a2933';x.fillRect(0,0,c.width,c.height);const s=__moba.codex,keys=['jamila','rudolph','gubo','dongrang','meursault','outis','yi','marton','nelly','alisa','sinclair','starbuck','sora','soraEgo','yanDistorted','honglu'];for(let i=0;i<keys.length;i++){const key=keys[i];s.key=key==='soraEgo'?'sora':key==='yanDistorted'?'yan':key;s.transformed=key==='soraEgo'||key==='yanDistorted';s.skill=0;s.championDetail();x.drawImage(document.getElementById('archive-body'),(i%8)*200+10,Math.floor(i/8)*570+10,180,520);x.fillStyle='#d7e3e9';x.font='18px sans-serif';x.textAlign='center';x.fillText(key,(i%8)*200+100,Math.floor(i/8)*570+550);}}''')
   p.locator('#stances70').screenshot(path=str(art/f'v70-stances{suffix}.png'));p.evaluate('document.getElementById("stances70").remove()')
  else:
   p.set_viewport_size({'width':568,'height':320});p.wait_for_timeout(100);assert p.locator('#roster-detail').evaluate('e=>e.scrollWidth<=e.clientWidth+1');p.screenshot(path=str(art/f'v70-small-mobile-codex{suffix}.png'));p.set_viewport_size({'width':844,'height':390})
  print(kind,'126 skill records / equipped portraits / summary and details PASS',flush=True)
  p.click('#codex-back');p.click('#training-open');p.click('.champion-option[data-key="jamila"]');p.click('#start');p.wait_for_function('__moba.mode==="playing"&&__moba.game.training')
  p.evaluate('''()=>{const g=__moba.game;g.step=()=>{};g.time=20;g.practice.lineStopped=true;Object.assign(g.player,{x:35,y:23,ammo:12});for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};}''');p.wait_for_timeout(100)
  expect(p.locator('.fps-ammo-numbers')).to_have_text('12 | 16');assert p.locator('.shield-round.ready').count()==3;assert p.locator('.shield-round').count()==4
  layout=p.locator('#jamila-ammo').evaluate('''e=>{const a=e.querySelector('.fps-ammo-numbers').getBoundingClientRect(),b=e.querySelector('.fps-shield-rounds').getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return{ordered:a.right<=b.left+1,inside:a.left>=p.left&&b.right<=p.right&&a.top>=p.top&&b.bottom<=p.bottom};}''');assert layout['ordered']and layout['inside'],layout
  p.screenshot(path=str(art/f'v70-{kind}-ammo{suffix}.png'))
  probes=p.evaluate('''()=>{const g=__moba.game,r=__moba.renderer,c=r.ctx,draw=c.drawImage,results=[];let current;c.drawImage=function(image,...a){if(image===r.worldAtlas){const f=Object.values(frames70).find(f=>f.x===a[0]&&f.y===a[1]),m=c.getTransform(),p=m.transformPoint(new DOMPoint(a[4]+a[6]*(f.ground||f.foot)[0],a[5]+a[7]*(f.ground||f.foot)[1])),ground=r.camera.worldToScreen(current,.075);results.push({x:p.x/r.dpr,y:p.y/r.dpr,gx:ground.x,gy:ground.y});}return draw.call(this,image,...a);};try{for(const[key,f]of Object.entries(frames70).filter(([k])=>k.endsWith('_tower')||k.endsWith('_core'))){const e=g.entity({kind:f.kind,team:f.color==='red'?1:0,x:37,y:23,maxHp:5000,radius:.9});e.faction=f.family;g.units=[g.player,e];current=e;r.draw(g,true);}}finally{c.drawImage=draw;}return results;}''')
  assert len(probes)==8 and all(abs(a['x']-a['gx'])<.001 and abs(a['y']-a['gy'])<.001 for a in probes),probes
  assert not errors,errors
  if offline:assert not requests,requests
  print(json.dumps({'mobile':mobile,'offline':offline,'skills':len(result),'groundedStructures':len(probes),'blueRounds':True,'errors':errors}),flush=True);ctx.close()
 browser.close()
