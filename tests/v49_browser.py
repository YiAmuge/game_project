"""Static champion restore and charged clerk body/weapon attachment, live/offline."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
frames={**json.loads((root/'src/assets/sprites-v36.json').read_text())['frames'],**json.loads((root/'src/assets/clerks-v49.json').read_text())['frames']}
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[];offline=os.environ.get('MOBA_OFFLINE')=='1'
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    if offline:
        page.route('http*://**/*',lambda route:route.abort())
        html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)')
        page.set_content(html,wait_until='networkidle',timeout=60000)
    else:page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.49.0')
    page.click('#training-open');page.get_by_role('button',name='뫼르소 선택',exact=True).click();page.click('#start')
    page.wait_for_function('__moba.renderer.clerkAtlas.naturalWidth&&__moba.renderer.atlasV36.naturalWidth&&__moba.renderer.scene25d.skin.ready')
    result=page.evaluate('''frames=>{
      const g=__moba.game,r=__moba.renderer,step=g.step.bind(g),neutralAI=g.aiNeutral.bind(g);g.step=()=>{};g.time=100;g.minionQueue=[];g.wave=100;g.map={bounds:g.bounds,walls:[]};for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};
      const old=r.ctx.drawImage.bind(r.ctx),calls=[],cards=[];r.ctx.drawImage=(im,...a)=>{if(im===r.atlasV36||im===r.clerkAtlas)calls.push({sheet:im===r.clerkAtlas?11:9,a,m:r.ctx.getTransform()});old(im,...a);};
      const bodyCall=(key)=>{const f=frames[key];return calls.find(c=>c.sheet===f.sheet&&c.a[0]===f.x&&c.a[1]===f.y&&c.a[2]===f.w&&c.a[3]===f.h);};
      const draw=e=>{calls.length=0;r.unit(e,g);};
      const championKeys=Object.keys(frames).filter(k=>frames[k].sheet===9&&!['soraEgo','queequegUlt','yanDistorted'].includes(k));
      for(const key of championKeys){const e=g.makeChampion(key,0,0);Object.assign(e,{x:25,y:23,player:true});g.player=e;g.units=[e];g.input.x=1;g.input.y=0;g.input.fire=false;g.input.aim={x:35,y:23};for(let n=0;n<5;n++){step(1/30);draw(e);if(!bodyCall(key))throw new Error(key+' changed static body while moving');}}
      if('walkAtlas'in r||'walkAtlases'in r)throw new Error('Walking assets still registered');
      const p=g.makeChampion('meursault',0,0);Object.assign(p,{x:26,y:23,player:true});g.player=p;g.units=[p];g.input.x=0;g.input.aim={x:35,y:23};
      const snapshot=(label,e)=>{const canvas=document.createElement('canvas');canvas.width=400;canvas.height=360;const c=canvas.getContext('2d');c.fillStyle='#34424a';c.fillRect(0,0,400,360);c.translate(Math.cos(e.facing||0)<0?290:110,340);c.scale(105,105);c.translate(-e.x,-e.y);const previous=r.ctx,pass=r.billboardPass;r.ctx=c;r.billboardPass=true;r.unit(e,g);r.ctx=previous;r.billboardPass=pass;cards.push({label,canvas});};
      const transform=(m,x,y)=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f});
      const attach=(e,key,weapon)=>{draw(e);const body=bodyCall(key),w=bodyCall(weapon);if(!body||!w)throw new Error('Missing clerk pose '+key);const f=frames[key],wf=frames[weapon],hp=transform(body.m,body.a[4]+f.hand[0]*body.a[6]/f.w,body.a[5]+f.hand[1]*body.a[7]/f.h),wp=transform(w.m,w.a[4]+wf.grip[0]*w.a[6]/wf.w,w.a[5]+wf.grip[1]*w.a[7]/wf.h);if(Math.hypot(hp.x-wp.x,hp.y-wp.y)>1e-7)throw new Error(key+' handle detached');if(Math.abs(body.a[7]*400/f.h-2.4)>1e-7)throw new Error('Wrong clerk height');};
      const clerks=[];for(const [camp,prefix,weapon,name]of[['amplify','leRouge','leRougeBlade','르루주'],['blessing','leNoir','leNoirCase','르누아르']]){
        const e=g.makeNeutral(25,23,camp);g.units=[p,e];e.hp-=200;g.simpleAttack(e,p);attach(e,prefix+'Idle',weapon);snapshot(name+' 일반',e);e.hostile=true;e.aggro=p.id;e.patternReady=g.time;neutralAI(e,.01);if(!e.pattern)throw new Error('Focus not started');attach(e,prefix+'Idle',weapon);g.time=e.pattern.at;neutralAI(e,.01);attach(e,prefix+'Attack',weapon);snapshot(name+' 충전 타격',e);e.facing=Math.PI;attach(e,prefix+'Attack',weapon);snapshot(name+' 좌측 타격',e);e.facing=0;g.time=e.swingUntil;attach(e,prefix+'Idle',weapon);clerks.push(e);
      }
      g.units=[p,...clerks];g.effects=[];g.projectiles=[];for(const e of clerks)e.exposedUntil=0;Object.assign(p,{x:25,y:23});Object.assign(clerks[0],{x:27,y:23,facing:Math.PI});Object.assign(clerks[1],{x:29,y:23,facing:Math.PI});r.ctx.drawImage=old;r.draw(g,true);
      const wrap=document.createElement('div');wrap.id='proof49';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'1200px',display:'grid',gridTemplateColumns:'repeat(3,400px)',background:'#34424a',color:'white',font:'18px sans-serif'});for(const {label,canvas}of cards){const cell=document.createElement('div'),title=document.createElement('div');title.textContent=label;canvas.style.cssText='width:400px;height:360px;max-height:none;aspect-ratio:auto';cell.append(title,canvas);wrap.append(cell);}document.body.append(wrap);
      return{staticChampions:championKeys.length,clerkPoses:4,independentWeapons:2,gripsAttachedBothDirections:true,chargedPoseOnly:true,height:2.4,gl:r.scene25d.webgl.getContext().getError()};
    }''',frames)
    page.locator('#proof49').screenshot(path=str(art/('v49-clerks-offline.png'if offline else'v49-clerks.png')))
    page.evaluate('document.querySelector("#proof49").remove()');page.screenshot(path=str(art/('v49-in-game-offline.png'if offline else'v49-in-game.png')))
    for w,h in [(390,844),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    assert not any('walk-'in url or'meursault-walk'in url for url in requests),requests
    if offline:assert not requests,requests;assert page.evaluate('__moba.renderer.clerkAtlas.src.startsWith("data:image/png;base64,")')
    b.close();print(json.dumps({'result':result,'errors':errors,'offline':offline},ensure_ascii=False))
