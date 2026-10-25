"""Native Canvas orbit/landing effects and actual multi-charge HUD rendering."""
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
      const A=await import('./src/art.js'),W=await import('./src/weapon-art.js'),Y=await import('./src/yan.js');
      const g=__moba.game,r=__moba.renderer,vfx=r.scene25d.championVfx;g.step=()=>{};g.minionQueue=[];g.map={bounds:g.bounds,walls:[]};
      const close=(a,b)=>{if(Math.abs(a-b)>.001)throw new Error(a+' != '+b);};
      const make=(key,angle=0)=>{g.time=100;g.effects=[];g.pending=[];g.events=[];g.zones=[];g.projectiles=[];const e=g.makeChampion(key,0,0);Object.assign(e,{x:25,y:23,facing:angle,player:true});g.units=[e];g.player=e;vfx.reset(g);return e;};
      const draw=(e,fx=false)=>{
        const real=r.scene25d.camera;real.update(1440,950,e);const zero=real.worldToScreen(e,.075),camera={scale:100,worldToScreen:(p,h=0)=>{const at=real.worldToScreen(p,h);return {x:320+(at.x-zero.x)*100/real.scale,y:350+(at.y-zero.y)*100/real.scale};}};
        const canvas=document.createElement('canvas');canvas.width=720;canvas.height=470;const c=canvas.getContext('2d');c.fillStyle='#34424a';c.fillRect(0,0,720,470);const calls=[],strokes=[],image=c.drawImage.bind(c),stroke=c.stroke.bind(c);
        c.drawImage=(im,...a)=>{const sheet=im===r.atlasV36?9:im===r.weaponAtlas?10:null,f=Object.entries(A.FRAMES).find(([,f])=>f.sheet===sheet&&a[0]===f.x&&a[1]===f.y&&a[2]===f.w&&a[3]===f.h);calls.push({image:im,key:f?.[0],args:a,m:['a','b','c','d','e','f'].map(k=>c.getTransform()[k])});image(im,...a);};c.stroke=()=>{strokes.push({color:c.strokeStyle,alpha:c.globalAlpha,width:c.lineWidth});stroke();};
        if(fx){vfx.sync(g);vfx.ground(c,camera,g);vfx.body(c,camera,e,g,false);}
        c.save();c.translate(320,350);c.scale(100,100);c.translate(-e.x,-e.y-.325);const rr=Object.create(r);rr.ctx=c;rr.camera=camera;rr.billboardPass=true;rr.weaponTrail=()=>{};rr.unit(e,g);c.restore();
        if(fx)vfx.body(c,camera,e,g,true);return {canvas,calls,camera,strokes};
      };
      window.sprite40={A,W,Y,g,r,vfx,make,draw};const sora=make('sora');g.addBuff(sora,'soraEgo',20);sora.state.egoQCharges=2;sora.state.egoQReady=Infinity;sora.attackAt=100;sora.attackFacing=0;let initial,handDistances=[];
      for(const time of [0,.075,.15,.225,.299]){g.time=100+time;const out=draw(sora),left=out.calls.find(c=>c.key==='soraClawLeft'),right=out.calls.find(c=>c.key==='soraClawRight');if(!left||!right)throw new Error('Missing orbit hand');if(initial){for(let i=0;i<4;i++){close(left.m[i],initial[0][i]);close(right.m[i],initial[1][i]);}}else initial=[left.m,right.m];const pose=W.equipmentPose(g,sora),orbit=W.soraOrbitPose(sora,pose);close(orbit.left.hand.x+orbit.right.hand.x,pose.origin.x*2);close(orbit.left.hand.y+orbit.right.hand.y,(pose.origin.y-.8)*2);const distance=Math.hypot(left.m[4]-right.m[4],left.m[5]-right.m[5]);handDistances.push(distance);if(distance<179.9||distance>220.1)throw new Error('Invalid attack orbit radius');close((left.m[4]+right.m[4])/2,320);close((left.m[5]+right.m[5])/2,350+(pose.origin.y-sora.y-.325-.8)*100);}
      if(handDistances[2]<handDistances[0]+30||Math.abs(handDistances[0]-handDistances.at(-1))>1)throw new Error('Attack hands did not extend and return');const dong=make('dongbaek');let petals=0;const old=vfx.mote;vfx.mote=(...a)=>{petals++;return old.apply(vfx,a);};draw(dong,true);g.cast(dong,'q',dong);const active=draw(dong,true);vfx.mote=old;if(petals)throw new Error('Ambient petals still float over Dongbaek');const body=active.calls.findIndex(c=>c.key==='dongbaek'),rim=active.calls.findIndex(c=>c.image===vfx.rimTexture('#d7edf5','shield'));if(rim<0||rim>=body)throw new Error('Tactical rim layer changed');if(active.calls[rim].args[3]<3)throw new Error('Tactical rim is still at the feet');
      const yan=make('yan');g.attack(yan,{x:31,y:23});yan.state.yanCharge.progress=1.5;Y.release(g,yan,{x:31,y:23});vfx.sync(g);g.time+=.1;const quake=draw(yan,true);if(!vfx.effects.some(f=>f.type==='yanGroundSlam')||!quake.strokes.some(s=>s.color==='#17191f')||!quake.strokes.some(s=>s.color==='#e5f5ff'))throw new Error('Missing ground rift or shockwave');
      const victim=make('faust'),gun=g.makeChampion('gubo',1,1);Object.assign(gun,{x:28,y:23});gun.state.guboAim={target:victim,until:102};const target=draw(victim,true);if(!target.strokes.some(s=>s.color==='#cc073d'&&s.alpha>.9&&s.width>=.075))throw new Error('Gubo target mark lacks contrast');
      return {orbitFrames:5,handsSeparated:true,handsDoNotSpin:true,ambientPetals:petals,tacticalBodyRim:true,yanGroundEffects:true,guboBoldTarget:true,gl:r.scene25d.webgl.getContext().getError()};
    }''')
    assert result['gl']==0,result
    for key in ['nelly','sora']:
        page.evaluate('''key=>{const {g,make}=sprite40,e=make(key);if(key==='sora'){e.state.unlock=5;g.cast(e,'r',e);}g.cast(e,'q',{x:e.x+1,y:e.y});delete e.motion;g.time+=1.2;}''',key)
        expect(page.locator('#q-btn small')).to_contain_text('1/2');expect(page.locator('#q-btn .cooldown')).to_have_text('4')
        assert not page.locator('#q-btn').evaluate("b=>b.classList.contains('on-cooldown')")
        assert page.evaluate('''()=>{const g=__moba.game;return g.cast(g.player,'q',{x:g.player.x+1,y:g.player.y});}''')
        expect(page.locator('#q-btn small')).to_contain_text('0/2');assert page.locator('#q-btn').evaluate("b=>b.classList.contains('on-cooldown')")
    page.screenshot(path=str(art/'v40-charge-hud.png'))
    page.evaluate('''()=>{
      const {make,draw,g,r,Y,vfx}=sprite40,wrap=document.createElement('div');wrap.id='proof40';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'1440px',display:'grid',gridTemplateColumns:'repeat(2,720px)',background:'#34424a',color:'white',font:'20px sans-serif'});document.body.append(wrap);
      const cases=[['소라 E.G.O · 양손 반대편 / 시작','sora',{orbit:0}],['소라 E.G.O · 1/4 회전','sora',{orbit:.075}],['소라 E.G.O · 1/2 회전','sora',{orbit:.15}],['소라 E.G.O · 3/4 회전','sora',{orbit:.225}],['오티스 · 돌진 후 베기 시작','outis',{spin:0}],['오티스 · 반 바퀴 베기','outis',{spin:.2}],['히스클리프 · 방망이 들어올리기','heathcliff',{charge:true}],['히스클리프 · 착지 내려찍기','heathcliff',{land:true}],['얀 · 0.075초 내려찍기','yan',{attack:.075}],['얀 · 균열과 충격파','yan',{attack:.16}],['동백 · 기본 입자 없음','dongbaek',{}],['동백 · 몸통 전술기 테두리','dongbaek',{flower:true}],['구보 · 선명한 붉은 조준 표식','faust',{target:true}],['넬리 · 대상 정면 도착','nelly',{front:true}]];
      for(const [label,key,s] of cases){const e=make(key);if(s.orbit!==undefined){g.addBuff(e,'soraEgo',20);e.state.egoQCharges=2;e.state.egoQReady=Infinity;e.attackAt=100;e.attackFacing=0;g.time+=s.orbit;}if(s.spin!==undefined){e.state.outisSpinAt=100;e.state.outisSpinFacing=0;g.time+=s.spin;}if(s.charge)e.state.chargeAt=100;if(s.land){e.state.heathSlamAt=100;e.state.heathSlamFacing=0;}if(s.attack!==undefined){g.attack(e,{x:e.x+6,y:e.y});e.state.yanCharge.progress=1.5;Y.release(g,e,{x:e.x+6,y:e.y});vfx.sync(g);g.time+=s.attack;}if(s.flower)g.cast(e,'q',e);if(s.target){const gun=g.makeChampion('gubo',1,1);Object.assign(gun,{x:e.x+3,y:e.y});gun.state.guboAim={target:e,until:102};}if(s.front){const t=g.makeChampion('faust',1,1);Object.assign(t,{x:e.x+4,y:e.y});g.cast(e,'r',t);}const {canvas}=draw(e,true),title=document.createElement('div'),card=document.createElement('div');title.textContent=label;canvas.style.cssText='width:720px;height:470px;max-height:none;aspect-ratio:auto';card.append(title,canvas);wrap.append(card);}
    }''')
    page.locator('#proof40').screenshot(path=str(art/'v40-combat-poses.png'));page.evaluate('document.querySelector("#proof40").remove()')
    for w,h in [(390,844),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    browser.close();print(json.dumps({'result':result,'hudChargedSkills':2,'errors':errors},ensure_ascii=False))
