"""Native Canvas proof for attack easing, held swords, marks and four muzzle blinks."""
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
      const A=await import('./src/art.js'),W=await import('./src/weapon-art.js'),P=await import('./src/projectile-vfx.js'),V=await import('./src/skill-vfx.js'),N=await import('./src/new-champions.js'),R=await import('./src/rudolph-weapon.js');
      const g=__moba.game,r=__moba.renderer,cv=r.scene25d.championVfx;const step=g.step.bind(g);g.step=()=>{};g.map={bounds:g.bounds,walls:[]};g.minionQueue=[];for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};
      const close=(a,b)=>{if(Math.abs(a-b)>.02)throw new Error(a+' != '+b);};
      const make=(key,angle=0)=>{g.time=100;g.effects=[];g.projectiles=[];g.zones=[];g.events=[];g.pending=[];g.input.fire=false;g.input.x=0;g.input.y=0;const e=g.makeChampion(key,0,0);Object.assign(e,{x:25,y:23,facing:angle,player:true});g.units=[e];g.player=e;g.input.aim={x:e.x+6*Math.cos(angle),y:e.y+6*Math.sin(angle)};return e;};
      const target=(e,dx=2)=>{const t=g.makeChampion('faust',1,9);Object.assign(t,{x:e.x+dx,y:e.y,hp:100000,maxHp:100000,facing:Math.PI});g.units.push(t);return t;};
      const run=s=>{for(let i=0;i<Math.round(s*240);i++)step(1/240);};
      const draw=e=>{
        const real=r.scene25d.camera;real.update(1440,950,e);const zero=real.worldToScreen(e,.075),ratio=100/real.scale,camera={scale:100,width:720,height:420,worldToScreen:(p,h=0)=>{const a=real.worldToScreen(p,h);return {x:320+(a.x-zero.x)*ratio,y:300+(a.y-zero.y)*ratio};},screenToWorld:(x,y)=>real.screenToWorld(zero.x+(x-320)/ratio,zero.y+(y-300)/ratio)};
        const canvas=document.createElement('canvas');canvas.width=720;canvas.height=420;const c=canvas.getContext('2d');c.fillStyle='#34424a';c.fillRect(0,0,720,420);const calls=[],trails=[],image=c.drawImage.bind(c);
        c.drawImage=(im,...a)=>{const sheet=im===r.atlasV36?9:im===r.weaponAtlas?10:null,f=Object.entries(A.FRAMES).find(([,f])=>f.sheet===sheet&&a[0]>=f.x&&a[0]<f.x+f.w&&a[1]===f.y&&a[3]===f.h);calls.push({image:im,key:f?.[0],args:a,m:c.getTransform(),hand:im.dataset?.gripMaterial,layer:im.dataset?.gripLayer});image(im,...a);};
        const paint=t=>{const at=camera.worldToScreen(t,.075);c.save();c.translate(at.x,at.y);c.scale(100,100);c.translate(-t.x,-t.y-.325);const rr=Object.create(r);rr.ctx=c;rr.camera=camera;rr.billboardPass=true;rr.weaponTrail=(e,g,part,a,b,active)=>{if(active)trails.push(part);};rr.unit(t,g);c.restore();};paint(e);return {canvas,c,calls,trails,camera,paint};
      };
      const cards=[],details=[],blinks=[],card=(list,label,out)=>list.push([label,out]);let cases=0;
      const faust=make('faust');g.cast(faust,'q',{x:31,y:23});g.time+=.096;let out=draw(faust);if(!out.trails.includes('faust-sweep'))throw new Error('Faust Q sweep missing');card(cards,'파우스트 · 빠르게 휩쓸기',out);cases++;
      const outis=make('outis');g.attack(outis,{x:31,y:23});g.projectiles[0].x+=1.5;out=draw(outis);const pv=new P.ProjectileVFX(new V.SkillVFX());pv.draw(out.c,out.camera,g);const style=P.projectileAppearance(g.projectiles[0],g);if(style.type!=='swordRay')throw new Error('Outis basic is still a bullet');card(cards,'오티스 · 가늘고 긴 검기',out);cases++;
      const ou=make('outis'),ot=target(ou,2.5);g.cast(ou,'r',{x:31,y:23});run(.04);out=draw(ou);if(W.skillWeaponPose(g,ou).part!=='outis-thrust')throw new Error('Outis rush is not a thrust');card(cards,'오티스 · 궁극기 전진 찌르기',out);let guard=0;while(ou.state.outisRecoilAt===undefined&&guard++<180)step(1/240);run(.14);out=draw(ou);if(W.skillWeaponPose(g,ou).thrust>=0)throw new Error('Outis did not withdraw weapon');card(cards,'오티스 · 산탄 후 검 회수',out);cases++;
      const kim=make('kim');g.attack(kim,{x:31,y:23});kim.attackCd=0;g.attack(kim,{x:31,y:23});g.time+=.15;out=draw(kim);close(W.basicWeaponAccent(g,kim).scale,1.32);card(cards,'김삿갓 · 넓은 베기 32% 확대',out);cases++;
      const kg=make('kim'),kt=target(kg);g.cast(kg,'q',kt);run(.03);card(cards,'김삿갓 · 전술기 찌르기',draw(kg));run(.17);
      for(let i=0;i<2;i++){out=draw(kg);const call=out.calls.find(c=>c.key==='kimSword');if(!call)throw new Error('Held sword is hidden');const fraction=W.skillWeaponPose(g,kg,W.equipmentPose(g,kg),out.camera).bladeFraction,f=A.FRAMES.kimSword,m=call.m,torso=W.targetTorsoPoint(g,kg,kt,out.camera),x=320+(torso.x-kg.x)*100,y=300+(torso.y-kg.y-.325)*100;close(m.e+m.a*(fraction-.5)*f.w,x);close(m.f+m.b*(fraction-.5)*f.w,y);out.paint(kt);card(cards,i?'김삿갓 · 이동 중에도 검날 고정':'김삿갓 · 몸통에 찔러 유지',out);g.input.y=1;run(.1);g.input.y=0;cases++;}
      g.cast(kg,'q',{x:kg.x+6,y:kg.y});run(.04);out=draw(kg);if(!out.trails.includes('kim-throw'))throw new Error('Kim throw has no slash');card(cards,'김삿갓 · 밀칠 때 휘두르기',out);cases++;
      const kr=make('kim'),rt=target(kr);g.cast(kr,'r',rt);g.deal(rt,kr,10,{fixed:true});let serial=0,waves=0;for(let i=0;i<98;i++){step(1/240);if(kr.state.kimWaveSerial!==serial){serial=kr.state.kimWaveSerial;out=draw(kr);if(!out.trails.includes('kim-wave-'+serial))throw new Error('Missing per-projectile slash');if(serial===1||serial===4)card(cards,'김삿갓 · 반격 검기 '+serial,out);waves++;}}if(waves!==4)throw new Error('Wrong Kim wave count');cases++;
      const ho=make('hohenheim');g.cast(ho,'q',{x:31,y:23});run(.04);out=draw(ho);if(W.skillWeaponPose(g,ho).thrust<=0)throw new Error('Hohenheim Q did not thrust');card(cards,'호엔하임 · 전진 찌르기',out);cases++;
      const ru=make('rudolph');g.attack(ru,{x:31,y:23});g.input.fire=true;let original;
      for(const age of [.12,.20,.36]){g.time=100+age;out=draw(ru);const call=out.calls.find(c=>c.key==='rudolphStaff');if(original){close(call.m.a,original.a);close(call.m.b,original.b);close(call.m.e,original.e);}else original=call.m;const point=W.weaponEmissionScreen(g,ru,out.camera),f=A.FRAMES.rudolphStaff,u=.94,v=.48;close(call.m.e+call.m.a*(u-.5)*f.w+call.m.c*(v-.5)*f.h,point.x);close(call.m.f+call.m.b*(u-.5)*f.w+call.m.d*(v-.5)*f.h,point.y);if(age!==.20)card(cards,'루돌프 · 전방 유지 '+age+'초',out);cases++;}g.input.fire=false;R.tickRudolphWeapon(g,ru);g.time+=.15;if(W.rudolphForwardPose(g,ru))throw new Error('Rudolph did not stop holding forward');
      for(const key of ['faust','kim','alisa','dongrang','ahab']){const e=make(key);out=draw(e);const hand=out.calls.find(c=>c.hand&&c.layer==='front');if(!hand)throw new Error('No round hand '+key);const tex=hand.image,c=tex.getContext('2d'),pixel=(x,y)=>[...c.getImageData(x,y,1,1).data],lit=pixel(14,14),shadow=pixel(36,36);if(lit.slice(0,3).reduce((a,b)=>a+b,0)<=shadow.slice(0,3).reduce((a,b)=>a+b,0))throw new Error('Hand has no directional shade '+key);if(tex.width!==48||tex.height!==48||pixel(0,0)[3])throw new Error('Round hand shape changed');card(details,key+' · 원형 손의 약한 명암',out);cases++;}
      const ah=make('ahab'),victim=target(ah,0);victim.x=27;const mark={source:ah.id,team:ah.team,until:104};victim.state.harpoon=mark;victim.state.harpoons={[ah.id]:mark};
      for(const ready of [false,true]){ah.basicHits[victim.id]=ready?2:1;out=draw(victim);const expected=N.ahabMarkPresentation(g,victim);if(expected.bonusReady!==ready)throw new Error('Ahab readiness mismatch');cv.body(out.c,out.camera,victim,g,true);card(details,ready?'에이해브 · 추가 피해 준비 / 작살날':'에이해브 · 선명한 가스작살 표식',out);cases++;}
      for(const facing of [0,Math.PI,.6]){const my=make('myo',facing);g.cast(my,'q',{x:my.x+6*Math.cos(facing),y:my.y+6*Math.sin(facing)});const sv=new V.SkillVFX();let newFlashes=0;const seen=new Set();
        for(let i=0;i<72;i++){step(1/240);out=draw(my);sv.sync(g,out.camera);const active=sv.emitters.filter(e=>e.muzzle==='myo');if(active.length>1)throw new Error('Myo muzzle flashes overlap');for(const e of active)if(!seen.has(e)){seen.add(e);newFlashes++;close(my.facing,facing);const call=out.calls.find(c=>c.key==='myoRifle'),f=A.FRAMES.myoRifle,m=call.m,u=.995,v=.5,tip=W.weaponEmissionScreen(g,my,out.camera);close(m.e+m.a*(u-.5)*f.w+m.c*(v-.5)*f.h,tip.x);close(m.f+m.b*(u-.5)*f.w+m.d*(v-.5)*f.h,tip.y);const transforms=[],translate=out.c.translate.bind(out.c);out.c.translate=(x,y)=>{transforms.push({x,y});translate(x,y);};sv.drawFlashes(out.c,out.camera);close(transforms[0].x,tip.x);close(transforms[0].y,tip.y);if(facing===0)card(blinks,'묘 · 주황색 총구 화염 '+newFlashes,out);}}
        if(newFlashes!==4)throw new Error('Myo did not flash four times');cases++;
      }
      for(const [id,list] of [['poses45',cards],['details45',details],['blinks45',blinks]]){const wrap=document.createElement('div');wrap.id=id;Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'2160px',display:'grid',gridTemplateColumns:'repeat(3,720px)',background:'#34424a',color:'white',font:'20px sans-serif'});for(const [label,out] of list){const card=document.createElement('div'),title=document.createElement('div');title.textContent=label;out.canvas.style.cssText='width:720px;height:420px;max-height:none;aspect-ratio:auto';card.append(title,out.canvas);wrap.append(card);}document.body.append(wrap);wrap.style.display='none';}
      return {cases,kimWaves:waves,myoFacings:3,myoFlashesPerVolley:4,gl:r.scene25d.webgl.getContext().getError()};
    }''')
    for ident,name in [('poses45','v45-weapon-poses.png'),('details45','v45-hand-marks.png'),('blinks45','v45-myo-flashes.png')]:
        page.evaluate('(id)=>document.getElementById(id).style.display="grid"',ident)
        page.locator('#'+ident).screenshot(path=str(art/name))
        page.evaluate('(id)=>document.getElementById(id).style.display="none"',ident)
    for w,h in [(390,844),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    browser.close();print(json.dumps({'result':result,'errors':errors},ensure_ascii=False))
