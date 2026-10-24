"""Attack coverage, visible dash phases, portrait trails and live champion casts."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle');expect(page.locator('.build-tag')).to_contain_text('0.34.0')
 page.click('#training-open');page.click('#start');page.click('#training-panel-toggle');page.wait_for_function('__moba.renderer.atlasV17.naturalWidth>0')
 page.evaluate('''async()=>{window.D=await import('./src/data.js');window.S=await import('./src/combat-style.js');window.Y=await import('./src/yan.js');window.H=await import('./src/hohenheim.js');window.P=await import('./src/projection-25d.js');const g=__moba.game;g.step=()=>{};
 window.setup=(key)=>{g.units=[];g.effects=[];g.events=[];g.projectiles=[];g.pending=[];g.zones=[];g.time=10;g.winner=null;g.input.fire=false;g.input.x=g.input.y=0;g.practice.lineStopped=true;g.practice.championAI=false;const p=g.makeChampion(key,0,0,'top'),t=g.makeChampion('faust',1,0,'top'),a=g.makeChampion('queequeg',0,1,'support');g.player=p;Object.assign(p,{x:25,y:38,player:true});Object.assign(t,{x:29,y:38,trainingSummoned:true,maxHp:100000,hp:100000});Object.assign(a,{x:23,y:39,trainingSummoned:true,maxHp:100000,hp:50000});g.input.aim={x:29,y:38};__moba.renderer.draw(g,true);return {p,t,a};};window.run=(s)=>{for(let i=0;i<Math.round(s*120);i++){Object.getPrototypeOf(g).step.call(g,1/120);__moba.renderer.draw(g,true);}};}''')
 coverage=page.evaluate('''()=>{const v=__moba.renderer.scene25d.vfx,c=document.createElement('canvas');c.width=1000;c.height=900;const ctx=c.getContext('2d'),cam={scale:50,worldToScreen:(p)=>({x:450+p.x*50,y:450+p.y*50})},out=[];
 for(const shape of [{kind:'circle',range:4},{kind:'cone',range:5,spread:1.5,angle:.4},{kind:'rect',range:6.5,width:1.8,angle:0},{kind:'rect',range:6.5,width:1.8,angle:1.2}]){
 ctx.clearRect(0,0,1000,900);v.strokes.draw(ctx,cam,{kind:'impact',x:0,y:0,born:0,radius:shape.range,shape,angle:shape.angle||0,element:'metal',color:'#e6e7e9',accent:'#ffffff'},.04);const pixels=ctx.getImageData(0,0,1000,900).data;let inside=0,painted=0,outside=0,leaks=[];
 for(let y=-5;y<=7;y+=.15)for(let x=-5;x<=7;x+=.15){const inner=S.insideShape({...shape,range:shape.range-.08,spread:shape.spread?shape.spread-.04:undefined,width:shape.width?shape.width-.16:undefined},x,y),outer=shape.kind==='rect'?(()=>{const along=x*Math.cos(shape.angle||0)+y*Math.sin(shape.angle||0),side=y*Math.cos(shape.angle||0)-x*Math.sin(shape.angle||0);return along>=-.1&&along<=shape.range+.1&&Math.abs(side)<=shape.width/2+.1;})():S.insideShape({...shape,range:shape.range+.1,spread:shape.spread?shape.spread+.1/Math.max(.05,Math.hypot(x,y)):undefined},x,y),pt=cam.worldToScreen({x,y}),a=pixels[(Math.round(pt.y)*1000+Math.round(pt.x))*4+3];if(inner){inside++;if(a>20)painted++;}else if(!outer&&a>12){outside++;leaks.push({x,y,a});}}
 out.push({shape,coverage:painted/inside,outside,leaks});}return out;}''')
 for result in coverage:assert result['coverage']>.98 and result['outside']==0,result
 # Real channel text must be vertical, while a blast and the buff use that same layout.
 formulas=page.evaluate('''()=>{const g=__moba.game,{p,t}=setup('faust');g.cast(p,'r',t);run(.3);const v=__moba.renderer.scene25d.championVfx,c=document.createElement('canvas').getContext('2d'),points=[];c.fillText=(text,x,y)=>points.push({text,x,y});v.formulas(c,.5,.3,.8);return {pending:g.pending.length,points};}''')
 assert formulas['pending']==1 and len(formulas['points'])>5 and all(len(p['text'])<=2 for p in formulas['points']),formulas
 assert len(set(p['y'] for p in formulas['points']))>4
 page.screenshot(path=str(art/'v29-faust-channel.png'))
 page.evaluate('run(1.1)');page.screenshot(path=str(art/'v29-faust-blast.png'))
 scenes={}
 for key,slot,seconds in [('sinclair','q',.15),('ppui','r',.16),('gahwan','r',.82),('dongbaek','r',.8),('outis','q',.4),('outis','r',.38),('heathcliff','r',.33),('honglu','r',.6),('dongrang','q',.2)]:
  result=page.evaluate('''([key,slot,s])=>{const g=__moba.game,{p,t}=setup(key);const cast=g.cast(p,slot,t);run(s);const scene=__moba.renderer.scene25d;return {cast,events:scene.championVfx.effects.map(f=>f.type),emitters:scene.vfx.emitters.filter(e=>!e.body).length,gl:scene.webgl.getContext().getError()};}''',[key,slot,seconds]);assert result['cast'] and result['gl']==0,result;scenes[key+slot]=result
  page.screenshot(path=str(art/f'v29-{key}-{slot}.png'))
 red=page.evaluate('''()=>{const s=__moba.renderer.scene25d.projectileVfx.sprite('nail','#cc354f',{tint:true}),p=s.getContext('2d').getImageData(0,0,s.width,s.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i+3]>64&&p[i]>p[i+1]*1.3&&p[i]>p[i+2]*1.1)n++;return n;}''')
 assert red>300,red
 assert 'nailFan' in scenes['ppuir']['events'];assert 'gazeSlash' in scenes['gahwanr']['events'];assert 'spinSlash' in scenes['outisq']['events'];assert 'shotgun' in scenes['outisr']['events'];assert scenes['honglur']['emitters']==0
 page.evaluate("()=>{const g=__moba.game;g.zones.find(z=>z.kind==='desireTree').golden=true;__moba.renderer.draw(g,true);}");page.screenshot(path=str(art/'v29-golden-tree.png'))
 # Five actual dash poses and visible rise/landing; sampling must freeze with simulation time.
 dash=page.evaluate('''()=>{const g=__moba.game,{p}=setup('don');g.attack(p,{x:31,y:38});run(.1);const v=__moba.renderer.scene25d.dashTrails,h=v.histories.get(p),s=JSON.stringify(h.samples);for(let i=0;i<8;i++)__moba.renderer.draw(g,true);return {count:h.samples.length,paused:JSON.stringify(h.samples)===s};}''')
 assert dash=={'count':5,'paused':True},dash
 page.screenshot(path=str(art/'v29-dash-trail.png'))
 starbuck=page.evaluate('''()=>{const g=__moba.game,{p}=setup('starbuck');g.cast(p,'r',{x:31,y:38});run(.1);const r=__moba.renderer,old=r.weapon;let calls=0;r.weapon=function(...a){calls++;return old.apply(this,a);};const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d'),save=r.ctx;r.ctx=c;c.translate(128,128);c.scale(25,25);c.translate(-p.x,-p.y);r.weapon(p,g);const weaponPixels=[...c.getImageData(0,0,256,256).data].filter((v,i)=>i%4===3&&v>0).length;r.ctx=save;r.weapon=old;return {height:P.leapLift(p),weaponPixels,count:r.scene25d.dashTrails.histories.get(p).samples.length};}''')
 assert starbuck['height']>4 and starbuck['height']<7 and starbuck['weaponPixels']==0 and starbuck['count']==5,starbuck
 page.screenshot(path=str(art/'v29-starbuck-rise.png'))
 page.evaluate('run(.48)');page.screenshot(path=str(art/'v29-starbuck-land.png'))
 page.evaluate('run(.13)');assert page.evaluate('__moba.game.player.motion===undefined')
 # Long charged sword is one continuous lit rectangle rather than four separated impacts.
 page.evaluate("()=>{const {p,t}=setup('yan');const g=__moba.game;g.attack(p,t);p.state.yanCharge.progress=1.5;Y.release(g,p,t);run(.08);}");page.screenshot(path=str(art/'v29-yan-slam.png'))
 # Every champion still runs both skills through the active render pipeline.
 for key in page.evaluate('Object.keys(D.CHAMPIONS)'):
  page.evaluate('''key=>{const g=__moba.game,{p,t,a}=setup(key);g.cast(p,'q',key==='queequeg'?a:t);run(.1);p.rCd=0;p.channelUntil=0;delete p.motion;if(key==='sora')p.state.unlock=5;if(key==='yan')p.state.ominous=6;g.cast(p,'r',t);run(.05);}''',key)
 for w,h in [(390,844),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
 assert not errors,errors;b.close();print(json.dumps({'coverage':coverage,'scenes':scenes,'dash':dash,'starbuck':starbuck,'errors':errors},ensure_ascii=False))
