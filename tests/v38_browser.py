"""Native Canvas layering, mirrored aim, grounded poses, tip emitters and blink trails."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':950});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text(json.loads((root/'package.json').read_text())['version'])
    page.click('#training-open');page.click('#start')
    page.wait_for_function('__moba.renderer.atlasV36.naturalWidth&&__moba.renderer.weaponAtlas.naturalWidth&&__moba.renderer.scene25d.skin.ready')
    result=page.evaluate('''async()=>{
      const A=await import('./src/art.js'),W=await import('./src/weapon-art.js'),D=await import('./src/data.js'),T=await import('./src/dash-trails.js');
      const g=__moba.game,r=__moba.renderer;g.step=()=>{};g.units=[];g.minionQueue=[];g.time=100;g.map={bounds:g.bounds,walls:[]};
      const make=(key,angle=0)=>{const e=g.makeChampion(key,0,0);Object.assign(e,{x:0,y:0,facing:angle,player:true});g.units=[e];g.player=e;return e;};
      const draw=(e,fx=false)=>{
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=430;const c=canvas.getContext('2d');c.fillStyle='#34424a';c.fillRect(0,0,640,430);
        const calls=[],rotations=[],image=c.drawImage.bind(c),rotate=c.rotate.bind(c);c.rotate=a=>{rotations.push(a);rotate(a);};c.drawImage=(imageEl,...v)=>{const sheet=imageEl===r.atlasV36?9:imageEl===r.weaponAtlas?10:null,f=Object.entries(A.FRAMES).find(([,f])=>f.sheet===sheet&&v[0]===f.x&&v[1]===f.y&&v[2]===f.w&&v[3]===f.h);calls.push({key:f?.[0],sheet,matrix:['a','b','c','d','e','f'].map(k=>c.getTransform()[k]),args:v});image(imageEl,...v);};
        const camera={scale:100,worldToScreen:p=>({x:230+(p.x-e.x)*100,y:350+(p.y-e.y)*100})},vfx=r.scene25d.championVfx;
        if(fx)vfx.body(c,camera,e,g,false);
        c.save();c.translate(230,350);c.scale(100,100);c.translate(-e.x,-e.y-.325);const rr=Object.create(r);rr.ctx=c;rr.camera=camera;rr.billboardPass=true;rr.skillVfx=r.scene25d.vfx;rr.weaponTrail=()=>{};rr.unit(e,g);c.restore();
        if(fx)vfx.body(c,camera,e,g,true);return {canvas,calls,rotations};
      };
      window.sprite38={A,W,D,T,make,draw};let checked=0;
      for(const key of Object.keys(D.CHAMPIONS))for(const angle of [-Math.PI,-2,-.4,0,.4,2,Math.PI]){
        const e=make(key,angle),p=draw(e),body=p.calls.findIndex(x=>x.sheet===9);if(body<0)throw new Error('No body '+key);
        for(let i=0;i<p.calls.length;i++)if(p.calls[i].sheet===10&&!(key==='myo'&&p.calls[i].key==='myoRifle')&&i<body)throw new Error('Weapon behind '+key);
        if(p.rotations.some(a=>Math.abs(a)>Math.PI/2+1e-6))throw new Error('Rotation exceeds half circle '+key);checked++;
      }
      const palms=draw(make('ppui')).calls.filter(c=>c.key==='ppuiHand');if(palms.length!==2||palms[0].matrix[4]===palms[1].matrix[4])throw new Error('Two separate palms required');
      const a=make('ahab');a.attackAt=g.time-.1;let art=draw(a);if(art.calls.some(c=>c.key==='ahabHarpoon'))throw new Error('Thrown Ahab weapon is still held');a.attackAt=g.time-.31;if(!draw(a).calls.some(c=>c.key==='ahabHarpoon'))throw new Error('Thrown Ahab weapon failed to restore');
      const i=make('ishmael');g.addBuff(i,'ishmaelShield',3);const p=W.equipmentPose(g,i),shield=draw(i).calls.find(x=>x.key==='ishmaelShield'),f=A.FRAMES.ishmaelShield,top=shield.matrix[5]-f.h*shield.matrix[3]/2,foot=350+(p.origin.y-i.y-.325)*100;
      if(top<foot-125-1)throw new Error('Enlarged shield covers face');
      for(const key of ['gubo','rudolph']){
        const e=make(key,.4),art=draw(e).calls.find(x=>x.key===W.WEAPON_ART[key][0]),frame=A.FRAMES[art.key],[u,v]=W.EMISSION_ANCHORS[key],[a,b,c,d,x,y]=art.matrix,px=(u-.5)*frame.w,py=(v-.5)*frame.h;
        const proofCamera={scale:100,worldToScreen:p=>({x:230+(p.x-e.x)*100,y:350+(p.y-e.y)*100})},tip=W.weaponEmissionScreen(g,e,proofCamera);
        if(Math.hypot(a*px+c*py+x-tip.x,b*px+d*py+y-tip.y)>.001)throw new Error('Emitter does not match painted muzzle '+key);
        const camera=r.scene25d.camera;camera.update(r.width,r.height,e);const expected=W.weaponEmissionScreen(g,e,camera),ctx=document.createElement('canvas').getContext('2d'),move=ctx.moveTo.bind(ctx),starts=[];ctx.moveTo=(x,y)=>{starts.push({x,y});move(x,y);};
        g.effects=key==='gubo'?[{type:'guboLaser',source:e.id,theme:key,x:e.x,y:e.y,to:{x:5,y:2},life:.35,maxLife:.35}]:[{type:'whipArc',source:e.id,theme:key,x:e.x,y:e.y,to:{x:5,y:2},life:.2,maxLife:.2}];r.scene25d.projectileVfx.beams(ctx,camera,g);
        if(!starts.length||Math.hypot(starts[0].x-expected.x,starts[0].y-expected.y)>.001)throw new Error('Beam missed weapon tip '+key);
      }
      const b=make('ahab');Object.assign(b,{x:25,y:23});g.input.aim={x:30,y:23};g.cast(b,'r',g.input.aim);if(b.x!==30||b.motion)throw new Error('Ahab teleport timing changed');r.scene25d.dashTrails.sync(g);const trail=r.scene25d.dashTrails.histories.get(b);if(trail.samples[0].x!==25||trail.samples.at(-1).x!==30)throw new Error('Blink trail does not join cast position to destination');
      return {aimAndLayerCases:checked,palms:palms.length,shieldBelowFace:true,beamOrigins:true,teleportInstant:true,blinkSamples:trail.samples.length,gl:r.scene25d.webgl.getContext().getError()};
    }''')
    assert result['gl']==0,result
    page.evaluate('''()=>{
      const {make,draw}=sprite38,g=__moba.game,wrap=document.createElement('div');wrap.id='proof38';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'1280px',display:'grid',gridTemplateColumns:'repeat(2,640px)',background:'#34424a',color:'white',font:'20px sans-serif'});document.body.append(wrap);
      const cases=[['홍루 · 손잡이 25% 연장 / 뒤쪽 회전축','honglu',{}],['홍루 · 좌우 반전','honglu',{angle:Math.PI}],['소라 · 몸통 안쪽 수갑','sora',{}],['소라 E.G.O · 작은 손','sora',{ego:true,attack:.18}],['뿌이 · 양손 붉은 손바닥','ppui',{}],['이스마엘 · 전술기 방패 / 얼굴 노출','ishmael',{shield:true}],['마튼 · 원거리 내려찍기 준비','marton',{ground:0}],['마튼 · 망치 추 지면 아래','marton',{ground:.11}],['에이해브 · 작살날 위로 준비','ahab',{slam:-.12}],['에이해브 · 복귀 전 빠른 내려찍기','ahab',{slam:-.03}],['동백 · 몸통 주변 전술기 효과','dongbaek',{flower:true}],['묘 · 등 뒤 소총 유지','myo',{}]];
      for(const [label,key,state] of cases){g.time=100;const e=make(key,state.angle||0);if(state.ego)g.addBuff(e,'soraEgo',20);if(state.shield)g.addBuff(e,'ishmaelShield',3);if(state.flower)g.cast(e,'q',e);if(state.attack!==undefined){e.attackAt=g.time-state.attack;e.attackSerial=1;e.attackFacing=e.facing;}if(state.ground!==undefined){e.attackSerial=1;e.attackAt=g.time-state.ground;e.state.martonGroundStrike=1;}if(state.slam!==undefined)e.state.ahabSlamAt=g.time-state.slam;
        const {canvas}=draw(e,Boolean(state.flower)),card=document.createElement('div'),title=document.createElement('div');canvas.style.cssText='width:640px;height:430px;max-height:none;aspect-ratio:auto';title.textContent=label;card.append(title,canvas);wrap.append(card);
      }
    }''')
    page.locator('#proof38').screenshot(path=str(art/'v38-weapon-poses.png'));page.evaluate('document.querySelector("#proof38").remove()')
    # Draw the new blink in the actual 2.5D scene and retain a review screenshot.
    page.evaluate('''()=>{const g=__moba.game;g.time=200;const e=sprite38.make('ahab');Object.assign(e,{x:25,y:23});g.effects=[];g.input.aim={x:31,y:23};g.cast(e,'r',g.input.aim);__moba.renderer.draw(g,true);}''')
    page.screenshot(path=str(art/'v38-ahab-blink.png'))
    for w,h in [(390,844),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    browser.close();print(json.dumps({'result':result,'errors':errors},ensure_ascii=False))
