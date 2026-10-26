"""Native minion pose atlas, clerk light and centered XP-border level badges, live/offline."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
meta=json.loads((root/'src/assets/minions-v52.json').read_text());offline=os.environ.get('MOBA_OFFLINE')=='1'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 if offline:
  page.route('http*://**/*',lambda r:r.abort());html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)');page.set_content(html,wait_until='networkidle',timeout=60000)
 else:page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
 page.click('#practice-open');page.get_by_role('button',name='뫼르소 선택',exact=True).click();page.click('#start')
 page.wait_for_function('__moba.renderer.minionAtlas.naturalWidth&&__moba.renderer.clerkAtlas.naturalWidth&&__moba.renderer.scene25d.skin.ready')
 result=page.evaluate('''meta=>{
 const g=__moba.game,r=__moba.renderer,p=g.player;g.step=()=>{};g.time=100;g.wave=100;g.minionQueue=[];g.units=[p];g.effects=[];g.projectiles=[];g.zones=[];Object.assign(p,{x:35.36,y:23.4,xp:125});for(const k of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};
 const c=r.ctx,fill=c.fillText.bind(c),centers=[],strokes=[],begin=c.beginPath.bind(c),move=c.moveTo.bind(c),line=c.lineTo.bind(c),stroke=c.stroke.bind(c);let points=[];
 c.beginPath=()=>{points=[];return begin();};c.moveTo=(x,y)=>{points.push([x,y]);return move(x,y);};c.lineTo=(x,y)=>{points.push([x,y]);return line(x,y);};c.stroke=()=>{if(c.strokeStyle==='#efd39a'&&Math.abs(c.lineWidth-.045)<1e-8){let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);strokes.push(length);}return stroke();};
 c.fillText=(s,x,y,...a)=>{if(c.font==='bold 100px Arial'&&/^\\d+$/.test(String(s))){const m=c.measureText(String(s)),v=c.getTransform(),xx=x+(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2,yy=y-(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2;centers.push({level:Number(s),x:v.a*xx+v.c*yy+v.e,y:v.b*xx+v.d*yy+v.f});}return fill(s,x,y,...a);};
 for(const [level,xp,progress]of [[1,0,0],[1,125,.5],[7,3825,.5],[10,6900,1]]){p.level=level;p.xp=xp;centers.length=0;strokes.length=0;r.draw(g,true);const label=centers.find(t=>t.level===level),feet=r.camera.worldToScreen(p,.075),expected={x:feet.x-1.69*r.camera.scale,y:feet.y-(2.53+.325)*r.camera.scale};if(!label||Math.abs(label.x-expected.x)>.01||Math.abs(label.y-expected.y)>.01)throw Error('Digit ink not centered '+JSON.stringify(label));if(progress===0?strokes.length!==0:!strokes.some(s=>Math.abs(s-1.9*progress)<1e-7))throw Error('XP perimeter progress wrong '+JSON.stringify(strokes));}
 c.fillText=fill;c.beginPath=begin;c.moveTo=move;c.lineTo=line;c.stroke=stroke;p.level=1;p.xp=125;
 const cards=[],snapshot=(label,e,glow=false)=>{const canvas=document.createElement('canvas');canvas.width=360;canvas.height=340;const ctx=canvas.getContext('2d');ctx.fillStyle='#34424a';ctx.fillRect(0,0,360,340);ctx.translate(180,314);const scale=glow?100:140;ctx.scale(scale,scale);ctx.translate(-e.x,-e.y);ctx.strokeStyle='#b2d1a5';ctx.lineWidth=.01;ctx.beginPath();ctx.moveTo(e.x-1.3,e.y);ctx.lineTo(e.x+1.3,e.y);ctx.stroke();const saved=r.ctx,pass=r.billboardPass;r.ctx=ctx;r.billboardPass=true;r.unit(e,g);r.ctx=saved;r.billboardPass=pass;cards.push({label,canvas});};
 const normal=r.ctx.drawImage.bind(r.ctx),draws=[];r.ctx.drawImage=(im,...a)=>{if(im===r.minionAtlas)draws.push(a);return normal(im,...a);};
 for(const family of ['uniform','suit'])for(const team of [0,1])for(const role of ['melee','ranged','siege'])for(const attack of [false,true]){
  const e=g.entity({kind:'minion',faction:family,team,x:35.36,y:23.4,maxHp:500,siege:role==='siege',ranged:role==='ranged',facing:team?Math.PI:0,attackUntil:attack?101:0}),key=[family,team?'red':'blue',role,attack?'attack':'idle'].join('_'),f=meta.frames[key];draws.length=0;r.unit(e,g);const draw=draws.find(a=>a[0]===f.x&&a[1]===f.y);if(!draw)throw Error('Wrong minion frame '+key);const h=2.1*(e.siege?.9:.83);if(Math.abs(draw[7]/f.heightScale-h)>1e-7||Math.abs(draw[5]+draw[7]*f.foot[1])>1e-7)throw Error('Minion height/feet mismatch '+key);snapshot(key,e);
 }
 r.ctx.drawImage=normal;
 const minionCards=cards.splice(0);for(const camp of ['amplify','blessing'])for(const progress of [0,.5,.99]){const e=g.makeNeutral(35.36,23.4,camp);e.facing=0;e.pattern={startedAt:100-progress*2.65,at:100+(1-progress)*2.65};snapshot(camp+' focus '+progress,e,true);}
 const clerkCards=cards.splice(0),wrap=document.createElement('div');wrap.id='proof52';Object.assign(wrap.style,{position:'absolute',left:0,top:0,zIndex:99999,width:'2160px',display:'grid',gridTemplateColumns:'repeat(6,360px)',background:'#34424a',color:'white',font:'16px Arial'});for(const item of [...minionCards,...clerkCards]){const cell=document.createElement('div'),title=document.createElement('div');title.textContent=item.label;item.canvas.style.cssText='width:360px;height:340px;max-height:none;aspect-ratio:auto';cell.append(title,item.canvas);wrap.append(cell);}document.body.append(wrap);
 g.units=[p];g.minionFactions=['uniform','suit'];for(const team of [0,1])for(let i=0;i<3;i++){const e=g.entity({kind:'minion',faction:g.minionFactions[team],team,x:31+i*2,y:22+team*2.8,maxHp:500,siege:i===2,ranged:i===1,facing:team?Math.PI:0,attackUntil:i===1?101:0});}r.draw(g,true);
 return{poses:24,sourceSheets:meta.provenance.length,regularHeight:2.1*.83,siegeHeight:2.1*.9,grounded:true,centeredDigits:true,experiencePerimeter:true,clerkChargeSnapshots:6,gl:r.scene25d.webgl.getContext().getError()};
 }''',meta)
 page.locator('#proof52').screenshot(path=str(art/('v52-sprite-proof'+('-offline'if offline else'')+'.png')))
 page.evaluate('document.querySelector("#proof52").remove()');page.screenshot(path=str(art/('v52-in-game'+('-offline'if offline else'')+'.png')))
 for w,h in [(390,844),(1920,1080)]:page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
 assert not errors,errors
 if offline:assert not requests,requests;assert page.evaluate('__moba.renderer.minionAtlas.src.startsWith("data:image/png;base64,")')
 b.close();print(json.dumps({'result':result,'errors':errors,'offline':offline},ensure_ascii=False))
