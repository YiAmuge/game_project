"""Native hand back layers, post-extension grips, glove colors and weapon state swaps."""
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
      const A=await import('./src/art.js'),W=await import('./src/weapon-art.js'),H=await import('./src/weapon-grips.js'),D=await import('./src/data.js');
      const g=__moba.game,r=__moba.renderer;g.step=()=>{};g.minionQueue=[];g.map={bounds:g.bounds,walls:[]};
      const close=(a,b)=>{if(Math.abs(a-b)>.02)throw new Error(a+' != '+b);};
      const make=(key,angle=0)=>{g.time=100;g.effects=[];g.pending=[];g.events=[];g.zones=[];g.projectiles=[];const e=g.makeChampion(key,0,0);Object.assign(e,{x:25,y:23,facing:angle,player:true});g.units=[e];g.player=e;return e;};
      const draw=e=>{
        const real=r.scene25d.camera;real.update(1440,950,e);const zero=real.worldToScreen(e,.075),camera={scale:100,worldToScreen:(p,h=0)=>{const at=real.worldToScreen(p,h);return {x:320+(at.x-zero.x)*100/real.scale,y:300+(at.y-zero.y)*100/real.scale};}};
        const canvas=document.createElement('canvas');canvas.width=720;canvas.height=390;const c=canvas.getContext('2d');c.fillStyle='#34424a';c.fillRect(0,0,720,390);const calls=[],image=c.drawImage.bind(c);
        c.drawImage=(im,...a)=>{const sheet=im===r.atlasV36?9:im===r.weaponAtlas?10:null,f=Object.entries(A.FRAMES).find(([,f])=>f.sheet===sheet&&a[0]>=f.x&&a[0]<f.x+f.w&&a[1]===f.y&&a[3]===f.h);calls.push({image:im,key:f?.[0],sheet,args:a,m:['a','b','c','d','e','f'].map(k=>c.getTransform()[k]),material:im.dataset?.gripMaterial,kind:im.dataset?.gripKind,layer:im.dataset?.gripLayer,color:im.dataset?.gripColor});image(im,...a);};
        c.save();c.translate(320,300);c.scale(100,100);c.translate(-e.x,-e.y-.325);const rr=Object.create(r);rr.ctx=c;rr.camera=camera;rr.billboardPass=true;rr.weaponTrail=()=>{};rr.unit(e,g);c.restore();return {canvas,calls,camera};
      };
      window.sprite41={A,W,H,D,g,r,make,draw};let cases=0,anchors=0;const textures=new Set();
      for(const key of Object.keys(D.CHAMPIONS))for(const state of ['right','left','attack','leap']){
        const e=make(key,state==='left'?Math.PI:state==='attack'?.6:0);if(state==='attack'){e.attackAt=99.9;e.attackFacing=e.facing;e.attackSerial=1;}if(state==='leap')e.motion={kind:'leap',actionKind:'basic',elapsed:.5,minDuration:1,total:3,speed:3,arcHeight:3};
        const out=draw(e),hands=out.calls.filter(c=>c.material),front=hands.filter(c=>c.layer==='front');if(H.UNCHANGED_HANDS.has(key)){if(hands.length)throw new Error('Original hands changed '+key);cases++;continue;}if(key==='ahab'&&state==='attack'||key==='starbuck'&&state==='leap'){if(hands.length)throw new Error('Hand remains on a hidden weapon '+key);cases++;continue;}
        const profile=H.gripAppearance(key);if(hands.some(c=>c.material!==profile.material||c.color!==profile.base))throw new Error('Wrong glove or skin '+key);const body=out.calls.findIndex(c=>c.sheet===9);if(out.calls.some((c,i)=>c.material&&i<body))throw new Error('New grip behind body '+key);
        const [asset,base]=W.WEAPON_ART[key],length=base*(key==='nelly'&&state==='attack'?1.5:1),m=W.weaponGeometry(asset,length),points=H.gripLayout(key,asset,m,W.gripPivot(key)),weapon=out.calls.filter(c=>c.key===asset);if(front.length!==points.length)throw new Error('Wrong number of gripping hands '+key);
        for(let i=0;i<points.length;i++){const p=points[i],sx=m.frame.x+p.source[0]*m.frame.w,sy=m.frame.y+p.source[1]*m.frame.h,s=weapon.find(c=>sx>=c.args[0]&&sx<=c.args[0]+c.args[2]),a=s.args,t=s.m,x=a[4]+(sx-a[0])/a[2]*a[6],y=a[5]+(sy-a[1])/a[3]*a[7];close(front[i].m[4],t[0]*x+t[2]*y+t[4]);close(front[i].m[5],t[1]*x+t[3]*y+t[5]);anchors++;}
        for(const h of hands){textures.add(h.image);const index=out.calls.indexOf(h);if(h.layer==='front'&&index<out.calls.indexOf(weapon.at(-1)))throw new Error('Hand back beneath handle '+key);if(h.layer==='back'&&index>out.calls.indexOf(weapon[0]))throw new Error('Shield hand above handle '+key);}cases++;
      }
      const myo=make('myo');if(draw(myo).calls.filter(c=>c.material&&c.layer==='front').length!==1)throw new Error('Back rifle has a phantom hand');myo.castSlot='q';myo.castAt=100;let fire=draw(myo).calls.filter(c=>c.material&&c.layer==='front');if(fire.length!==1||fire[0].kind!=='gun')throw new Error('Myo did not grip rifle for Q');g.time=100.6;g.addBuff(myo,'rabbitFrenzy',4.5);if(draw(myo).calls.filter(c=>c.material&&c.layer==='front').length!==2)throw new Error('Myo dual daggers lost a hand');
      const yan=make('yan');g.addBuff(yan,'yanDistorted',20);if(draw(yan).calls.some(c=>c.material))throw new Error('Distorted Yan got a normal glove');
      for(const texture of textures){const data=texture.getContext('2d').getImageData(0,0,texture.width,texture.height).data,w=texture.width,h=texture.height;for(let x=0;x<w;x++)if(data[x*4+3]||data[((h-1)*w+x)*4+3])throw new Error('Hand has an opaque background');for(let y=0;y<h;y++)if(data[(y*w)*4+3]||data[(y*w+w-1)*4+3])throw new Error('Hand has edge debris');}
      return {cases,anchors,transparentHandTextures:textures.size,myoWeaponSwap:true,normalYanOnly:true,gl:r.scene25d.webgl.getContext().getError()};
    }''')
    assert result['gl']==0,result
    page.evaluate('''()=>{
      const {make,draw,g,D,H}=sprite41,wrap=document.createElement('div');wrap.id='proof41';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'2160px',display:'grid',gridTemplateColumns:'repeat(3,720px)',background:'#34424a',color:'white',font:'20px sans-serif'});document.body.append(wrap);
      const cards=Object.keys(D.CHAMPIONS).filter(key=>!H.UNCHANGED_HANDS.has(key)).map(key=>[D.CHAMPIONS[key].name,key,{}]);cards.push(['구보 · 방아쇠 쪽 검정 장갑','gubo',{angle:Math.PI}],['묘 · 소총 그립','myo',{firing:true}],['묘 · 역수 쌍단검','myo',{frenzy:true}],['싱클레어 · 연장된 자루 / 양손','sinclair',{attack:true}],['스타벅 · 연장된 손잡이','starbuck',{angle:Math.PI}],['동랑 · 회전한 자루 / 양손','dongrang',{attack:true}]);
      for(const [label,key,s] of cards){const e=make(key,s.angle||0);if(s.firing){e.castSlot='q';e.castAt=100;}if(s.frenzy)g.addBuff(e,'rabbitFrenzy',4.5);if(s.attack){e.attackAt=99.9;e.attackFacing=e.facing;e.attackSerial=1;}const {canvas}=draw(e),card=document.createElement('div'),title=document.createElement('div');title.textContent=label;canvas.style.cssText='width:720px;height:390px;max-height:none;aspect-ratio:auto';card.append(title,canvas);wrap.append(card);}
    }''')
    page.locator('#proof41').screenshot(path=str(art/'v41-weapon-grips.png'));page.evaluate('document.querySelector("#proof41").remove()')
    for w,h in [(390,844),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    browser.close();print(json.dumps({'result':result,'errors':errors},ensure_ascii=False))
