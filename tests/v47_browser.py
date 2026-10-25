"""Live and offline Meursault walk cycle, movement-only selection and body registration."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':950});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    offline=os.environ.get('MOBA_OFFLINE')=='1';requests=[]
    if offline: page.route('http*://**/*',lambda route:(requests.append(route.request.url),route.abort()))
    if offline:
        html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)')
        page.set_content(html,wait_until='networkidle',timeout=60000)
    else: page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text(json.loads((root/'package.json').read_text())['version'])
    page.click('#training-open');page.get_by_role('button',name='뫼르소 선택',exact=True).click();page.click('#start')
    page.wait_for_function('__moba.renderer.walkAtlas.naturalWidth&&__moba.renderer.scene25d.skin.ready')
    frames={'meursault':json.loads((root/'src/assets/sprites-v36.json').read_text())['frames']['meursault'],**json.loads((root/'src/walking-sprites.js').read_text().split('=',1)[1].strip().rstrip(';'))}
    result=page.evaluate('''async(frames)=>{
      const A={FRAMES:frames};
      const g=__moba.game,r=__moba.renderer,e=g.player,step=g.step.bind(g);g.step=()=>{};g.time=100;g.minionQueue=[];g.units=[e];g.map={bounds:g.bounds,walls:[]};for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};
      Object.assign(e,{x:25,y:23,facing:0});g.input.aim={x:35,y:23};g.input.x=0;g.input.y=0;g.input.fire=false;
      const old=r.ctx.drawImage.bind(r.ctx),calls=[];r.ctx.drawImage=(im,...a)=>{if(im===r.walkAtlas||im===r.atlasV36||im===r.weaponAtlas)calls.push({sheet:im===r.walkAtlas?11:im===r.weaponAtlas?10:9,a,m:r.ctx.getTransform()});old(im,...a);};
      const draw=()=>{calls.length=0;r.draw(g,true);return calls.find(c=>c.sheet===11||c.sheet===9);};
      let body=draw();if(body.sheet!==9)throw new Error('Idle Meursault is animated');const seen=new Set(),matrices=[],cards=[];
      const snapshot=(label,call)=>{const f=call.sheet===11?A.FRAMES['meursaultWalk'+call.a[0]/256]:A.FRAMES.meursault,canvas=document.createElement('canvas');canvas.width=240;canvas.height=340;const c=canvas.getContext('2d'),h=290*f.heightScale,w=h*f.w/f.h;c.fillStyle='#34424a';c.fillRect(0,0,240,340);c.imageSmoothingEnabled=false;if(call.m.a<0){c.translate(240,0);c.scale(-1,1);}c.drawImage(call.sheet===11?r.walkAtlas:r.atlasV36,f.x,f.y,f.w,f.h,120-w*f.foot[0],325-h*f.foot[1],w,h);cards.push({label,canvas});};
      snapshot('정지',body);g.input.x=1;
      for(let i=0;i<24;i++){step(1/30);body=draw();if(body.sheet!==11)throw new Error('Moving Meursault is static');const index=body.a[0]/256,f=A.FRAMES['meursaultWalk'+index];if(!seen.has(index))snapshot('걷기 '+(index+1),body);seen.add(index);if(Math.abs(body.a[7]*400/f.h-2.1)>1e-8)throw new Error('Changed crown-to-sole height');if(Math.abs(body.a[5]+body.a[7]*f.foot[1])>1e-8)throw new Error('Changed feet anchor');const before=body.a[0];if(before!==draw().a[0])throw new Error('Render frequency advances walk');matrices.push(body.m.a);}
      if(seen.size!==6)throw new Error('Missing frames: '+[...seen]);if(matrices.some(a=>a<=0))throw new Error('Right-facing walk mirrored');
      g.input.fire=true;step(1/30);body=draw();if(body.sheet!==11||calls.filter(c=>c.sheet===10).length!==2)throw new Error('Walking punches lost their two fists');g.input.fire=false;
      g.input.x=-1;g.input.aim={x:10,y:23};step(1/30);body=draw();if(body.sheet!==11||body.m.a>=0)throw new Error('Left-facing walk not mirrored');snapshot('왼쪽 이동',body);
      g.input.x=0;step(1/30);if(draw().sheet!==9)throw new Error('Stopping does not restore idle');
      g.input.x=1;e.status.root={amount:1,until:g.time+.2};step(1/30);if(draw().sheet!==9)throw new Error('Rooted input walks');delete e.status.root;
      g.map.walls=[{x:e.x+e.radius+.001,y:e.y-2,w:1,h:4}];step(1/30);if(draw().sheet!==9)throw new Error('Walking against a wall animates');g.map.walls=[];
      g.input.x=0;e.x+=7;step(1/30);if(draw().sheet!==9)throw new Error('Teleport walks');
      const faust=g.makeChampion('faust',0,1);Object.assign(faust,{x:25,y:23,player:true});e.player=false;g.player=faust;g.units=[faust];g.input.x=1;step(1/30);if(draw().sheet!==9)throw new Error('Another champion uses Meursault walk');
      g.player=e;e.player=true;g.units=[e];Object.assign(e,{x:25,y:23});g.input.aim={x:35,y:23};g.input.x=1;step(1/30);draw();g.input.x=0;
      const wrap=document.createElement('div');wrap.id='proof47';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'1920px',display:'flex',background:'#34424a',color:'white',font:'18px sans-serif'});for(const {label,canvas} of cards){const div=document.createElement('div'),title=document.createElement('div');title.textContent=label;canvas.style.cssText='width:240px;height:340px;max-height:none;aspect-ratio:auto';div.append(title,canvas);wrap.append(div);}document.body.append(wrap);
      r.ctx.drawImage=old;return {frames:[...seen].sort(),walkingPunches:true,leftMirror:true,stopsOnWall:true,otherChampionsUnchanged:true,gl:r.scene25d.webgl.getContext().getError()};
    }''',frames)
    page.locator('#proof47').screenshot(path=str(art/('v47-meursault-walk-offline.png' if offline else 'v47-meursault-walk.png')));page.evaluate('document.querySelector("#proof47").remove()')
    page.screenshot(path=str(art/('v47-meursault-in-game-offline.png' if offline else 'v47-meursault-in-game.png')))
    for w,h in [(390,844),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    assert not requests,requests
    if offline: assert page.evaluate('__moba.renderer.walkAtlas.src.startsWith("data:image/png;base64,")')
    browser.close();print(json.dumps({'result':result,'errors':errors,'offline':offline,'network_requests':requests},ensure_ascii=False))
