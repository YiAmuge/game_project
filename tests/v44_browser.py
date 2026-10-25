"""Native Canvas checks for attack accents, grips, cast poses and central Gubo rays."""
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
      const A=await import('./src/art.js'),W=await import('./src/weapon-art.js'),P=await import('./src/projectile-vfx.js'),V=await import('./src/skill-vfx.js'),Don=await import('./src/don.js');
      const g=__moba.game,r=__moba.renderer;g.step=()=>{};g.map={bounds:g.bounds,walls:[]};
      const close=(a,b)=>{if(Math.abs(a-b)>.02)throw new Error(a+' != '+b);};
      const make=(key,angle=0)=>{g.time=100;g.effects=[];g.projectiles=[];g.zones=[];g.events=[];g.pending=[];const e=g.makeChampion(key,0,0);Object.assign(e,{x:25,y:23,facing:angle,player:true});g.units=[e];g.player=e;return e;};
      const draw=e=>{
        const real=r.scene25d.camera;real.update(1440,950,e);const zero=real.worldToScreen(e,.075),ratio=100/real.scale,camera={scale:100,width:720,height:420,worldToScreen:(p,h=0)=>{const a=real.worldToScreen(p,h);return {x:320+(a.x-zero.x)*ratio,y:300+(a.y-zero.y)*ratio};},screenToWorld:(x,y)=>real.screenToWorld(zero.x+(x-320)/ratio,zero.y+(y-300)/ratio)};
        const canvas=document.createElement('canvas');canvas.width=720;canvas.height=420;const c=canvas.getContext('2d');c.fillStyle='#34424a';c.fillRect(0,0,720,420);const calls=[],trails=[],image=c.drawImage.bind(c);
        c.drawImage=(im,...a)=>{const sheet=im===r.atlasV36?9:im===r.weaponAtlas?10:null,f=Object.entries(A.FRAMES).find(([,f])=>f.sheet===sheet&&a[0]>=f.x&&a[0]<f.x+f.w&&a[1]===f.y&&a[3]===f.h);calls.push({image:im,key:f?.[0],args:a,m:c.getTransform(),hand:im.dataset?.gripMaterial,layer:im.dataset?.gripLayer});image(im,...a);};
        c.save();c.translate(320,300);c.scale(100,100);c.translate(-e.x,-e.y-.325);const rr=Object.create(r);rr.ctx=c;rr.camera=camera;rr.billboardPass=true;rr.weaponTrail=(e,g,part,a,b,active)=>{if(active)trails.push(part);};rr.unit(e,g);c.restore();return {canvas,c,calls,trails,camera};
      };
      const handScreen=(e,hand)=>({x:320+(hand.x-e.x)*100,y:300+(hand.y-e.y-.325)*100});
      const pivot=(out,e,length,angle,p=.12)=>{const call=out.calls.find(a=>a.key===W.WEAPON_ART[e.key][0]),m=W.weaponGeometry(call.key,length);return {x:call.m.e-Math.cos(angle)*(.5-p)*m.span*100,y:call.m.f-Math.sin(angle)*(.5-p)*m.span*100,call};};
      const cards=[],card=(label,e)=>{const out=draw(e);cards.push([label,out]);return out;};let cases=0;
      for(const [key,label] of [['faust','휘두르기 · 20% 확대 / 바깥 이동'],['don','찌르기 · 확대'],['honglu','홍루 · 허리 축 / 휩쓸기']]){
        const e=make(key);e.attackAt=99.85;e.attackFacing=0;e.attackSerial=1;const out=card(label,e),p=W.equipmentPose(g,e),length=W.WEAPON_ART[key][1]*1.20,at=pivot(out,e,length,p.angle,W.gripPivot(key)),hand=handScreen(e,p.right),offset=key==='faust'?.18:key==='don'?.38:0;
        close(at.x,hand.x+Math.cos(p.angle)*offset*100);close(at.y,hand.y+Math.sin(p.angle)*offset*100);close(Math.hypot(at.call.m.a,at.call.m.b),W.weaponGeometry(W.WEAPON_ART[key][0],length).scale*100);cases++;
      }
      const ry=make('ryoshu');let out=card('료슈 · 검 가운데 역수 대기',ry),weapon=out.calls.find(c=>c.key==='ryoshuSword'),hand=out.calls.find(c=>c.hand&&c.layer==='front');close(weapon.m.e,hand.m.e);close(weapon.m.f,hand.m.f);if(weapon.m.a>=0)throw new Error('Ryoshu idle is not reverse grip');ry.attackAt=99.85;ry.attackFacing=0;ry.attackSerial=1;out=card('료슈 · 공격 손잡이 축',ry);if(out.calls.find(c=>c.key==='ryoshuSword').m.a<=0)throw new Error('Ryoshu attack kept reverse grip');cases+=2;
      for(const key of ['sinclair','ryoshu','outis']){
        const e=make(key);if(key==='sinclair'){e.state.sinclairSpinAt=100;e.state.sinclairSpinFacing=0;}else if(key==='ryoshu')g.cast(e,'r',{x:29,y:23});else{e.state.outisSpinAt=100;e.state.outisSpinFacing=0;}
        g.time=100.2;const out=card(key+' · 몸체 중심 360도 휩쓸기',e),p=W.equipmentPose(g,e),spin=key==='outis'?W.outisSpinPose(g,e,p):W.ultimateOrbitPose(g,e,p),at=pivot(out,e,W.WEAPON_ART[key][1]*1.20,spin.angle,W.gripPivot(key)),expected=handScreen(e,spin.hand);close(at.x,expected.x);close(at.y,expected.y);cases++;
      }
      for(const slot of ['q','r']){
        const e=make('gahwan');g.cast(e,slot,{x:29,y:23});g.time=100+(slot==='q'?.13:.16);const out=card('가환 · '+slot+' 한 번 휘두르기',e);if(out.trails.filter(s=>s==='skill-'+slot).length!==1)throw new Error('Gahwan sweep missing');for(const age of [.4,.75,1.5]){g.time=100+age;if(draw(e).trails.some(s=>s.startsWith('skill-')))throw new Error('Gahwan repeated the weapon sweep');}cases++;
      }
      const db=make('dongbaek');g.cast(db,'r',{x:29,y:23});g.time=100.19;if(!card('동백 · 궁극기 부채 휘두르기',db).trails.includes('ultimate-swing'))throw new Error('Dongbaek ultimate swing missing');g.time=100.5;if(draw(db).trails.includes('ultimate-swing'))throw new Error('Dongbaek repeated ultimate swing');cases++;
      const don=make('don');g.cast(don,'q',{x:31,y:23});for(const age of [0,.75,1.4]){g.time=100+age;const out=card('돈키호테 · 충전 '+age+'초',don),p=W.equipmentPose(g,don),at=pivot(out,don,W.WEAPON_ART.don[1],p.angle,.25),expected=handScreen(don,p.right);close(at.x,expected.x-.45*age/1.5*100);close(at.y,expected.y);cases++;}Don.release(g,don,{x:31,y:23});const p=W.equipmentPose(g,don),at=pivot(draw(don),don,W.WEAPON_ART.don[1],p.angle,.25);close(at.x,handScreen(don,p.right).x-.45*1.4/1.5*100);cases++;
      const nelly=make('nelly');g.cast(nelly,'q',{x:31,y:23});g.time=100.1;out=card('넬리 · 전술기 중 나이프 숨김',nelly);if(out.calls.some(c=>c.key==='nellyKnife'||c.hand))throw new Error('Nelly Q did not hide held knife and hand');g.time=100.25;if(!draw(nelly).calls.some(c=>c.key==='nellyKnife'))throw new Error('Nelly knife did not return');nelly.attackAt=100.1;nelly.attackFacing=0;nelly.attackSerial=1;const n=draw(nelly);close(Math.hypot(n.calls.find(c=>c.key==='nellyKnife').m.a,n.calls.find(c=>c.key==='nellyKnife').m.b),W.weaponGeometry('nellyKnife',1.65).scale*100);cases++;
      const gu=make('gubo',.5);g.attack(gu,{x:31,y:26});out=draw(gu);const sv=new V.SkillVFX();sv.sync(g,out.camera);const flash=sv.emitters.find(e=>e.muzzle),axis=W.guboEffectAxis(g,gu,out.camera,g.projectiles[0].origin,{angle:gu.attackFacing}),move=[],translate=out.c.translate.bind(out.c);out.c.translate=(x,y)=>{move.push({x,y});translate(x,y);};sv.drawFlashes(out.c,out.camera);close(move[0].x,axis.start.x);close(move[0].y,axis.start.y);cards.push(['구보 · 중심 조준 축의 발사 효과',out]);cases++;
      const ob=make('outis');card('오티스 · 직선 칼등 팔카타',ob);const dr=make('dongrang');card('동랑 · 허리 축',dr);
      const wrap=document.createElement('div');wrap.id='proof44';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'2160px',display:'grid',gridTemplateColumns:'repeat(3,720px)',background:'#34424a',color:'white',font:'20px sans-serif'});document.body.append(wrap);
      for(const [label,out] of cards){const card=document.createElement('div'),title=document.createElement('div');title.textContent=label;out.canvas.style.cssText='width:720px;height:420px;max-height:none;aspect-ratio:auto';card.append(title,out.canvas);wrap.append(card);}
      return {cases,cards:cards.length,gl:r.scene25d.webgl.getContext().getError()};
    }''')
    page.locator('#proof44').screenshot(path=str(art/'v44-weapon-motion.png'));page.evaluate('document.querySelector("#proof44").remove()')
    for w,h in [(390,844),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    browser.close();print(json.dumps({'result':result,'errors':errors},ensure_ascii=False))
