"""Latest sprite provenance, live rendering, equal heights, equipment and mask expiry."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=b.new_page(viewport={'width':1440,'height':900});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.37.0')
    page.wait_for_function('__moba.renderer.atlasV36.naturalWidth>0&&__moba.renderer.weaponAtlas.naturalWidth>0')
    page.click('#training-open');page.get_by_role('button',name='묘 선택',exact=True).click();page.click('#start')
    page.wait_for_function('__moba.renderer.scene25d.skin.ready')
    result=page.evaluate('''async()=>{
      const {FRAMES,visualForm}=await import('./src/art.js'),{CHAMPIONS}=await import('./src/data.js');
      const g=__moba.game,r=__moba.renderer;g.step=()=>{};g.minionQueue=[];
      const bodyCalls=[],weaponCalls=[],old=r.ctx.drawImage.bind(r.ctx);
      r.ctx.drawImage=(image,...a)=>{if(image===r.atlasV36)bodyCalls.push(a);if(image===r.weaponAtlas)weaponCalls.push(a);return old(image,...a);};
      let forms=0;const checked=[];
      for(const key of Object.keys(CHAMPIONS)){
        const e=g.makeChampion(key,0,0);Object.assign(e,{x:25,y:23,facing:.1,player:true});g.player=e;g.units=[e];g.input.aim={x:30,y:23};
        const before=bodyCalls.length,wb=weaponCalls.length;r.draw(g,true);
        if(bodyCalls.length<=before||weaponCalls.length<=wb)throw new Error('Missing new body/equipment: '+key);
        const call=bodyCalls[before],f=FRAMES[key];if(call[0]!==f.x||call[1]!==f.y||call[3]!==f.h||Math.abs(call[7]*400/f.h-2.1)>1e-9||Math.abs(call[5]+call[7]*f.foot[1])>1e-9)throw new Error('Wrong atlas/height/feet: '+key);
        checked.push(key);
        for(const buff of key==='sora'?['soraEgo']:key==='yan'?['yanDistorted']:key==='queequeg'?['queequegUlt']:[]){g.addBuff(e,buff,4);const at=bodyCalls.length;r.draw(g,true);const v=FRAMES[visualForm(g,e)],c=bodyCalls[at];if(!c||c[0]!==v.x||c[1]!==v.y||Math.abs(c[7]*400/v.h-2.1)>1e-9)throw new Error('Wrong variant '+buff);delete e.buffs[buff];forms++;}
      }
      r.ctx.drawImage=old;
      const q=g.makeChampion('queequeg',0,0);Object.assign(q,{x:25,y:23,player:true,facing:.1});g.units=[q];g.player=q;g.time=100;r.draw(g,true);
      const {weaponGeometry}=await import('./src/weapon-art.js'),texture=r.scene25d.projectileVfx.sprite('harpoon','#ffffff',{asset:'starbuckHarpoon'}),projectileLengthScale=Number(texture.dataset.lengthScale);
      if(projectileLengthScale<=1||texture.width!==Math.ceil(weaponGeometry('starbuckHarpoon',256).span))throw new Error('Thrown Starbuck harpoon must retain its longer shaft');
      return {champions:checked.length,forms,heights:[...new Set(bodyCalls.map(c=>Math.round(c[7]*400/c[3]*1e6)/1e6))],decorationHeights:Object.fromEntries(['soraEgo','rudolph','dongbaek','alisa','marton'].map(k=>[k,FRAMES[k].h])),projectileLengthScale,bodyCalls:bodyCalls.length,weaponCalls:weaponCalls.length,gl:r.scene25d.webgl.getContext().getError()};
    }''')
    assert result['champions']==29 and result['forms']==3 and result['heights']==[2.1] and result['gl']==0,result
    page.wait_for_function('document.querySelector("#hud-face").dataset.form==="queequeg"')
    before=page.locator('#hud-face').evaluate('(c)=>c.toDataURL()')
    page.evaluate('__moba.game.addBuff(__moba.game.player,"queequegUlt",4)')
    page.wait_for_function('document.querySelector("#hud-face").dataset.form==="queequegUlt"')
    masked=page.locator('#hud-face').evaluate('(c)=>c.toDataURL()');assert masked!=before
    page.screenshot(path=str(art/'v36-queequeg-mask.png'))
    page.evaluate('__moba.game.time+=4.1')
    page.wait_for_function('document.querySelector("#hud-face").dataset.form==="queequeg"')
    assert page.locator('#hud-face').evaluate('(c)=>c.toDataURL()')==before
    # Inspect all body silhouettes and their real portrait crop on a neutral backdrop.
    proof=page.evaluate('''async()=>{
      const {FRAMES,drawFace}=await import('./src/art.js'),{CHAMPIONS}=await import('./src/data.js'),r=__moba.renderer;
      const wrap=document.createElement('div');wrap.id='sprite-proof';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'1360px',display:'grid',gridTemplateColumns:'repeat(8,170px)',background:'#394650',color:'white',font:'14px sans-serif'});document.body.append(wrap);
      const values=[];for(const [key,f] of Object.entries(FRAMES).filter(([,f])=>f.sheet===9)){
        const card=document.createElement('div'),label=document.createElement('div'),canvas=document.createElement('canvas');label.textContent=CHAMPIONS[key]?.name||key;canvas.width=170;canvas.height=315;canvas.style.cssText='width:170px;height:315px;max-height:none;aspect-ratio:auto';const c=canvas.getContext('2d'),image=r.atlasFor(key),h=195*f.heightScale,w=h*f.w/f.h;c.imageSmoothingEnabled=false;c.drawImage(image,f.x,f.y,f.w,f.h,(170-w)/2,311-h*f.foot[1],w,h);drawFace(c,key,image,118,4,48);
        const pixels=c.getImageData(118,4,48,48).data,opaque=Array.from(pixels).filter((v,i)=>i%4===3&&v>0).length;if(opaque<200)throw new Error('Empty portrait '+key);values.push({key,opaque});card.append(label,canvas);wrap.append(card);
      }return values;
    }''')
    assert len(proof)==32
    page.locator('#sprite-proof').screenshot(path=str(art/'v36-characters.png'))
    page.evaluate('document.querySelector("#sprite-proof").remove()')
    page.evaluate('''async()=>{
      const {FRAMES}=await import('./src/art.js'),{drawWeapon}=await import('./src/weapon-art.js');
      const wrap=document.createElement('div');wrap.id='weapon-proof';Object.assign(wrap.style,{position:'absolute',zIndex:99999,left:0,top:0,width:'1320px',display:'grid',gridTemplateColumns:'repeat(3,440px)',background:'#394650',color:'white',font:'14px sans-serif'});document.body.append(wrap);
      for(const [key,f] of Object.entries(FRAMES).filter(([,f])=>f.sheet===10)){
        const card=document.createElement('div'),label=document.createElement('div'),canvas=document.createElement('canvas');label.textContent=key;canvas.width=440;canvas.height=240;canvas.style.cssText='width:440px;height:240px;max-height:none;aspect-ratio:auto';const c=canvas.getContext('2d'),a=f.rotation||0,bw=Math.abs(f.w*Math.cos(a))+Math.abs(f.h*Math.sin(a)),bh=Math.abs(f.w*Math.sin(a))+Math.abs(f.h*Math.cos(a)),length=Math.min(220,190*bw/bh);drawWeapon(c,key,length,{x:18,y:120});card.append(label,canvas);wrap.append(card);
      }
    }''')
    page.locator('#weapon-proof').screenshot(path=str(art/'v36-weapons.png'))
    page.evaluate('document.querySelector("#weapon-proof").remove()')
    # Actual training and match canvases at desktop/mobile sizes must keep rendering.
    for key in ['myo','rudolph','don','sinclair','starbuck','sora','yan']:
      page.evaluate('''key=>{const g=__moba.game,e=g.makeChampion(key,0,0);Object.assign(e,{x:25,y:23,player:true,facing:.2});g.units=[e];g.player=e;}''',key)
      page.wait_for_timeout(70);page.screenshot(path=str(art/f'v36-{key}-game.png'))
    for w,h in [(390,844),(1920,1080)]:
      page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100)
      assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    b.close();print(json.dumps({'result':result,'portraits':len(proof),'errors':errors},ensure_ascii=False))
