"""Native Canvas checks for muzzle alignment, limb deformation and skill poses."""
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
      const A=await import('./src/art.js'),W=await import('./src/weapon-art.js'),P=await import('./src/projectile-vfx.js');
      const g=__moba.game,r=__moba.renderer,vfx=r.scene25d.championVfx;g.step=()=>{};g.minionQueue=[];g.map={bounds:g.bounds,walls:[]};
      const close=(a,b)=>{if(Math.abs(a-b)>.001)throw new Error(a+' != '+b);};
      const make=(key,angle=0)=>{g.time=100;g.effects=[];g.pending=[];g.zones=[];g.projectiles=[];const e=g.makeChampion(key,0,0);Object.assign(e,{x:25,y:23,facing:angle,player:true});g.units=[e];g.player=e;return e;};
      const draw=(e,fx=false)=>{
        const real=r.scene25d.camera;real.update(1440,950,e);const zero=real.worldToScreen(e,.075),camera={scale:100,worldToScreen:(p,h=0)=>{const at=real.worldToScreen(p,h);return {x:230+(at.x-zero.x)*100/real.scale,y:350+(at.y-zero.y)*100/real.scale};}};
        const canvas=document.createElement('canvas');canvas.width=900;canvas.height=450;const c=canvas.getContext('2d');c.fillStyle='#34424a';c.fillRect(0,0,900,450);const calls=[],image=c.drawImage.bind(c);
        c.drawImage=(im,...a)=>{const sheet=im===r.atlasV36?9:im===r.weaponAtlas?10:null,f=Object.entries(A.FRAMES).find(([,f])=>f.sheet===sheet&&a[0]>=f.x&&a[0]<f.x+f.w&&a[1]===f.y&&a[3]===f.h);calls.push({image:im,key:f?.[0],args:a,m:['a','b','c','d','e','f'].map(k=>c.getTransform()[k])});image(im,...a);};
        if(fx){vfx.ground(c,camera,g);vfx.body(c,camera,e,g,false);}
        c.save();c.translate(230,350);c.scale(100,100);c.translate(-e.x,-e.y-.325);const rr=Object.create(r);rr.ctx=c;rr.camera=camera;rr.billboardPass=true;rr.weaponTrail=()=>{};rr.unit(e,g);c.restore();
        if(fx)vfx.body(c,camera,e,g,true);return {canvas,calls,camera};
      };
      window.sprite39={A,W,P,g,r,vfx,make,draw};let muzzleCases=0;
      for(const angle of [0,.4,1.4,Math.PI,Math.PI*1.3,-.7]){
        const e=make('gubo',angle),out=draw(e),image=out.calls.find(c=>c.key==='guboRifle'),f=A.FRAMES.guboRifle,[u,v]=W.EMISSION_ANCHORS.gubo,[a,b,c,d,x,y]=image.m,tip=W.weaponEmissionScreen(g,e,out.camera),px=(u-.5)*f.w,py=(v-.5)*f.h;
        close(a*px+c*py+x,tip.x);close(b*px+d*py+y,tip.y);const zero=out.camera.worldToScreen(e,.95),next=out.camera.worldToScreen({x:e.x+Math.cos(angle),y:e.y+Math.sin(angle)},.95),dx=next.x-zero.x,dy=next.y-zero.y;
        close((a*dy-b*dx)/Math.hypot(a,b)/Math.hypot(dx,dy),0);muzzleCases++;
      }
      const dong=make('dongbaek');g.cast(dong,'q',dong);const petals=draw(dong,true),body=petals.calls.findIndex(c=>c.key==='dongbaek'),rims=petals.calls.map((c,i)=>({c,i})).filter(({c})=>[vfx.rimTexture('#dcc66e','petal'),vfx.rimTexture('#d7edf5','shield')].includes(c.image));if(rims.length!==2||rims.some(({i})=>i>=body))throw new Error('Dongbaek persistent effect is in front');
      const greg=make('gregor'),idle=draw(greg).calls.find(c=>c.key==='gregorClaw');if(idle.m[3]>=0)throw new Error('Gregor is not vertically flipped');g.cast(greg,'q',{x:31,y:23});g.time+=.1;const straight=draw(greg).calls.filter(c=>c.key==='gregorClaw');if(straight.length<100)throw new Error('Gregor source was not deformed');close(Math.abs(straight[0].m[3]),Math.abs(idle.m[3]));
      const nelly=make('nelly');nelly.attackAt=g.time-.15;nelly.attackFacing=0;nelly.attackSerial=1;const n=draw(nelly),knife=n.calls.find(c=>c.key==='nellyKnife'),pose=W.equipmentPose(g,nelly),m=W.weaponGeometry('nellyKnife',W.WEAPON_ART.nelly[1]*1.5),axis={x:knife.m[0]/Math.hypot(knife.m[0],knife.m[1]),y:knife.m[1]/Math.hypot(knife.m[0],knife.m[1])},grip={x:knife.m[4]-axis.x*(.5-.12)*m.span*100,y:knife.m[5]-axis.y*(.5-.12)*m.span*100},hand={x:230+(pose.right.x-nelly.x)*100,y:350+(pose.right.y-nelly.y-.325)*100};close(Math.hypot(grip.x-hand.x,grip.y-hand.y),60);
      const myo=make('myo');g.addBuff(myo,'rabbitFrenzy',4.5);const gripDot=()=>{const pose=W.equipmentPose(g,myo),knives=draw(myo).calls.filter(c=>c.key==='myoDagger');return knives.map(k=>(k.m[0]*Math.cos(pose.angle)+k.m[1]*Math.sin(pose.angle))/Math.hypot(k.m[0],k.m[1]));};if(gripDot().some(n=>n>=0))throw new Error('Myo idle knives must be reversed');myo.attackAt=g.time-.15;myo.attackFacing=0;myo.attackSerial=1;if(gripDot().some(n=>n<=0))throw new Error('Myo basic knives must face forward');g.time+=.2;if(gripDot().some(n=>n>=0))throw new Error('Myo knives did not return to reversed grip');
      for(const [key,type] of [['ishmael','harpoon'],['rodya','axe']]){const texture=r.scene25d.projectileVfx.sprite(type,key==='rodya'?'#c0d8e7':'#416e70',{asset:P.projectileAsset({theme:key,slot:'r'})});if(texture.dataset.spriteAsset)throw new Error('Ultimate still uses held weapon '+key);}
      const yi=make('yi');g.cast(yi,'r',{x:30,y:23});const range=g.effects.find(f=>f.type==='yiBuffRange');if(!range||range.x!==yi.x||range.y!==yi.y||range.r!==5.5)throw new Error('Missing landing buff area');
      return {muzzleCases,dongbaekBehind:true,gregorSlices:straight.length,nellyReachPixels:60,myoGrips:true,ultimateThrows:true,yiRadius:range.r,gl:r.scene25d.webgl.getContext().getError()};
    }''')
    assert result['gl']==0,result
    page.evaluate('''()=>{
      const {make,draw,g,r}=sprite39,wrap=document.createElement('div');wrap.id='proof39';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'1800px',display:'grid',gridTemplateColumns:'repeat(2,900px)',background:'#34424a',color:'white',font:'20px sans-serif'});document.body.append(wrap);
      const cases=[['구보 · 총구와 같은 직선','gubo',{angle:.4}],['구보 · 왼쪽 조준','gubo',{angle:Math.PI}],['동백 · 몸체 뒤 지속 효과','dongbaek',{flower:true}],['그레고르 · 상하 반전','gregor',{}],['그레고르 · 곧게 편 찌르기','gregor',{q:.1}],['그레고르 · 벌레팔 회수','gregor',{q:.3}],['가환 · 전술기 베기','gahwan',{q:.025}],['가환 · 궁극기 베기','gahwan',{r:.17}],['넬리 · 손에서 나이프 뻗기','nelly',{attack:.15}],['동랑 · 낫 크기 150%','dongrang',{}],['얀 · 오른쪽 검 들어올리기','yan',{charge:true}],['얀 · 왼쪽 검 들어올리기','yan',{charge:true,angle:Math.PI}],['묘 · 역수 대기','myo',{frenzy:true}],['묘 · 기본 공격 정수','myo',{frenzy:true,attack:.15}],['이스마엘 · 궁극기 작살','ishmael',{missile:'harpoon'}],['로쟈 · 궁극기 얼음도끼','rodya',{missile:'axe'}]];
      for(const [label,key,s] of cases){const e=make(key,s.angle||0);if(s.flower)g.cast(e,'q',e);if(s.frenzy)g.addBuff(e,'rabbitFrenzy',4.5);if(s.charge)e.state.yanCharge={progress:1.5};for(const slot of ['q','r'])if(s[slot]!==undefined){g.cast(e,slot,{x:e.x+6,y:e.y});g.time+=s[slot];}if(s.attack!==undefined){e.attackAt=g.time-s.attack;e.attackFacing=e.facing;e.attackSerial=1;}const {canvas}=draw(e,Boolean(s.flower));if(s.missile){const c=canvas.getContext('2d'),tex=r.scene25d.projectileVfx.sprite(s.missile,key==='rodya'?'#c0d8e7':'#416e70',{asset:false});c.drawImage(tex,420,170,360,150);}const title=document.createElement('div'),card=document.createElement('div');title.textContent=label;canvas.style.cssText='width:900px;height:450px;max-height:none;aspect-ratio:auto';card.append(title,canvas);wrap.append(card);}
    }''')
    page.locator('#proof39').screenshot(path=str(art/'v39-sprite-poses.png'));page.evaluate('document.querySelector("#proof39").remove()')
    page.evaluate('''()=>{const {g,r,make}=sprite39,e=make('yi');g.cast(e,'r',{x:30,y:23});r.draw(g,true);}''')
    page.screenshot(path=str(art/'v39-yi-buff-range.png'))
    for w,h in [(390,844),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    browser.close();print(json.dumps({'result':result,'errors':errors},ensure_ascii=False))
