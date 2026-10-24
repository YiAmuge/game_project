"""Hand pivots, body Z, independent shields, Myo loadout/eyes and Don hold input."""
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
    page.click('#training-open');page.get_by_role('button',name='돈키호테 선택',exact=True).click();page.click('#start')
    page.wait_for_function('__moba.renderer.atlasV36.naturalWidth&&__moba.renderer.weaponAtlas.naturalWidth&&__moba.renderer.scene25d.skin.ready')
    page.evaluate('''()=>{const g=__moba.game;window.realStep=g.step.bind(g);g.step=()=>{};g.units=[g.player];g.minionQueue=[];g.input.aim={x:g.player.x+7,y:g.player.y};}''')
    # Native press/release paths, including capture, keyboard and cancelled holds.
    button=page.locator('#q-btn').bounding_box();page.mouse.move(button['x']+button['width']/2,button['y']+button['height']/2);page.mouse.down()
    assert page.evaluate('Boolean(__moba.game.player.state.donCharge)')
    page.evaluate('realStep(.75)');expect(page.locator('#q-btn').locator('span').first).to_contain_text('50%')
    page.mouse.up()
    assert page.evaluate('!__moba.game.player.state.donCharge&&__moba.game.player.qCd>0&&Math.abs(__moba.game.player.state.donThrust.progress-.5)<1e-8')
    page.evaluate('__moba.game.player.qCd=0');page.keyboard.down('q');assert page.evaluate('Boolean(__moba.game.player.state.donCharge)');page.keyboard.press('Escape');page.keyboard.up('q')
    assert page.evaluate('!__moba.game.player.state.donCharge&&__moba.game.player.qCd>0')
    result=page.evaluate('''async()=>{
      const A=await import('./src/art.js'),W=await import('./src/weapon-art.js'),G=await import('./src/game.js'),C=await import('./src/champion-vfx.js'),P=await import('./src/projectile-vfx.js');
      const g=__moba.game,r=__moba.renderer;g.time=100;g.units=[];g.map={bounds:g.bounds,walls:[]};
      window.sprite37={A,W,G,C,P};
      const make=key=>{const e=g.makeChampion(key,0,0);Object.assign(e,{x:0,y:0,facing:0,player:true});g.units=[e];g.player=e;return e;};
      const draw=e=>{
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=430;const c=canvas.getContext('2d');c.fillStyle='#34424a';c.fillRect(0,0,640,430);c.translate(230,320);c.scale(100,100);
        const calls=[],glows=[],image=c.drawImage.bind(c),radial=c.createRadialGradient.bind(c);c.drawImage=(a,...v)=>{const f=Object.entries(A.FRAMES).find(([,f])=>v[0]===f.x&&v[1]===f.y&&v[2]===f.w&&v[3]===f.h);calls.push({key:f?.[0],matrix:[...['a','b','c','d','e','f'].map(k=>c.getTransform()[k])],args:v});image(a,...v);};c.createRadialGradient=(...v)=>{if(v[5]===.115)glows.push(v);return radial(...v);};
        const rr=Object.create(r);rr.ctx=c;rr.billboardPass=true;rr.skillVfx=r.scene25d.vfx;rr.weaponTrail=()=>{};rr.unit(e,g);return {canvas,calls,glows};
      };
      window.sprite37.make=make;window.sprite37.draw=draw;
      const m=make('myo'),normal=draw(m);if(normal.calls.findIndex(c=>c.key==='myoRifle')>=normal.calls.findIndex(c=>c.key==='myo'))throw new Error('Rifle must be behind body');if(normal.glows.length)throw new Error('Normal Myo eye glow');
      m.castAt=g.time;m.castSlot='q';const q=draw(m);if(q.calls.some(c=>c.key==='myoDagger')||q.calls.filter(c=>c.key==='myoRifle').length!==1)throw new Error('Q must replace dagger with rifle');
      m.castAt=0;g.addBuff(m,'rabbitFrenzy',4.5);const ult=draw(m);if(ult.calls.filter(c=>c.key==='myoDagger').length!==2||ult.glows.length!==2)throw new Error('Myo R needs two daggers and two eye lights');
      delete m.buffs.rabbitFrenzy;if(draw(m).glows.length)throw new Error('Eye glow must end with R');
      const i=make('ishmael'),idle=draw(i).calls.find(c=>c.key==='ishmaelShield');i.attackAt=g.time-.1;i.attackFacing=0;i.attackSerial=1;const attack=draw(i).calls.find(c=>c.key==='ishmaelShield');if(JSON.stringify(idle.matrix)!==JSON.stringify(attack.matrix))throw new Error('Shield moved with attack');
      g.addBuff(i,'ishmaelShield',2.5);const shield=draw(i).calls.find(c=>c.key==='ishmaelShield');if(Math.abs(shield.matrix[0]/idle.matrix[0]-1.35)>1e-6)throw new Error('Shield Q enlargement lost '+JSON.stringify({buff:g.buff(i,'ishmaelShield'),idle:idle.matrix,shield:shield.matrix,idleArgs:idle.args,args:shield.args}));
      const f=make('faust');f.attackAt=g.time-.1;f.attackSerial=1;const pose=W.equipmentPose(g,f),sword=draw(f).calls.find(c=>c.key==='faustSword'),frame=A.FRAMES.faustSword,[a,b,c,d,x,y]=sword.matrix,local=(.12-.5)*frame.w;
      if(Math.hypot(a*local+x-(230+pose.right.x*100),b*local+y-(320+pose.right.y*100))>.001)throw new Error('Sword rotation must pivot on right-hand grip');
      f.motion={kind:'leap',elapsed:.5,minDuration:1,arcHeight:3,total:3,speed:3};const jump=draw(f).calls.find(c=>c.key==='faustSword');if(Math.abs(sword.matrix[5]-jump.matrix[5]-300)>.001)throw new Error('Weapon does not follow body Z');
      const yi=make('yi'),texture=r.scene25d.projectileVfx.sprite('glass','#dce9ef',{asset:P.projectileAsset({theme:'yi',damageKind:'basic'})});if(texture.dataset.spriteAsset||texture.width!==128)throw new Error('Yi must use original mirror projectile');
      return {myoNormal:normal.calls.map(c=>c.key),myoQ:q.calls.map(c=>c.key),myoR:ult.calls.map(c=>c.key),eyeLights:ult.glows.length,shieldIndependent:true,handPivot:true,weaponZ:true,legacyYi:true,gl:r.scene25d.webgl.getContext().getError()};
    }''')
    assert result['gl']==0,result
    page.evaluate('''()=>{
      const {make,draw}=sprite37,g=__moba.game,wrap=document.createElement('div');wrap.id='proof37';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'1280px',display:'grid',gridTemplateColumns:'repeat(2,640px)',background:'#34424a',color:'white',font:'20px sans-serif'});document.body.append(wrap);
      const cases=[['묘 · 등에 멘 소총 / 기본 단검','myo',{}],['묘 · 전술기 소총','myo',{q:true}],['묘 · 역수 쌍단검 / 붉은 동공','myo',{r:true}],['이스마엘 · 공격 중 고정된 방패','ishmael',{attack:.1}],['소라 · 왼손 시계 방향','sora',{ego:true,attack:.06}],['소라 · 오른손 반시계 방향','sora',{ego:true,attack:.18}],['뿌이 · 간결한 붉은 손','ppui',{}],['스타벅 · 착지 내려찍기','starbuck',{landing:true}],['알리사 · 좌우 화염 휘두르기','alisa',{attack:.1}],['돈키호테 · 중앙 손잡이','don',{}],['얀 · 오른손 대검','yan',{}],['에이해브 · 키 조정','ahab',{}],['넬리 · 기본 공격 나이프','nelly',{attack:.1}],['퀴케그 · 기준 키','queequeg',{}]];
      for(const [label,key,state] of cases){const e=make(key);if(state.q){e.castAt=g.time;e.castSlot='q';}if(state.r)g.addBuff(e,'rabbitFrenzy',4.5);if(state.ego)g.addBuff(e,'soraEgo',20);if(state.attack!==undefined){e.attackAt=g.time-state.attack;e.attackFacing=0;e.attackSerial=1;}if(state.landing)e.state.starbuckLandedAt=g.time;const {canvas}=draw(e),card=document.createElement('div'),title=document.createElement('div');canvas.style.cssText='width:640px;height:430px;max-height:none;aspect-ratio:auto';title.textContent=label;card.append(title,canvas);wrap.append(card);}
    }''')
    page.locator('#proof37').screenshot(path=str(art/'v37-weapon-poses.png'));page.evaluate('document.querySelector("#proof37").remove()')
    assert not errors,errors
    browser.close();print(json.dumps({'result':result,'errors':errors},ensure_ascii=False))
