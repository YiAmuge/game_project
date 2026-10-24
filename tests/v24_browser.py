"""Regression for sunken/cut sprites, terrain panning and GPU upload growth."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if 'GL_INVALID_' in m.text else None)
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.35.0');page.click('#training-open');page.get_by_role('button',name='소라 선택',exact=True).click();page.click('#start')
    page.wait_for_function('__moba.renderer.atlasV17.naturalWidth>0&&__moba.renderer.atlasV13.naturalWidth>0')
    page.evaluate('''()=>{const g=__moba.game,p=g.player,s=__moba.renderer.scene25d;window.__step=g.step;g.step=()=>{};g.time=4;g.effects=[];g.pending=[];g.zones=[];g.projectiles=[];g.practice.lineStopped=true;g.units=[p,...g.units.filter(e=>e.kind==='tower')];p.buffs={};p.status={};p.facing=0;p.naturalHealing=false;p.attackAt=-99;window.__ground=s.groundFrame;s.groundFrame=()=>{const r=__moba.renderer;r.ctx.setTransform(1,0,0,1,0,0);r.ctx.clearRect(0,0,r.canvas.width,r.canvas.height);};}''')
    def pose(x,y):
        page.evaluate('([x,y])=>{const g=__moba.game;Object.assign(g.player,{x,y});g.input.aim={x:x+4,y};__moba.renderer.draw(g,true);}',[x,y])
    def pixels(entity='__moba.game.player'):
        return page.evaluate('''e=>{const r=__moba.renderer,s=r.scene25d,feet=s.camera.worldToScreen(e,.075),scale=s.camera.scale,d=r.dpr,x=Math.floor((feet.x-.6*scale)*d),y=Math.floor((feet.y-2.5*scale)*d),w=Math.ceil(1.2*scale*d),h=Math.ceil(2.65*scale*d),data=r.ctx.getImageData(x,y,w,h).data;let n=0,bottom=-Infinity;for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(data[(j*w+i)*4+3]>=192){n++;bottom=Math.max(bottom,(y+j)/d-feet.y);}return {opaque:n,bottom,scale};}''',page.evaluate_handle(entity))
    counts=[]
    for name,x,y in [('open',20,38),('above-wall',20,30),('below-wall',20,31.8),('left-wall',36.5,38),('right-wall',38.5,38)]:
        pose(x,y);p=pixels();counts.append(p['opaque']);assert p['opaque']>1000,(name,p);assert -.2*p['scale']<p['bottom']<2,(name,p)
        page.screenshot(path=str(art/f'v24-sora-{name}.png'))
    assert max(counts)/min(counts)<1.05,counts
    # Every non-champion body also has its lowest opaque pixels at the ground.
    pose(20,38)
    types=[('dummy',"const e=g.makeChampion('faust',1,20);e.trainingDummy={infinite:true};"),('creep',"const e=g.makeNeutral(24,38,'central');"),('boss',"const e=g.makeNeutral(24,38,'boss');"),('melee',"const e=g.entity({kind:'minion',team:1,maxHp:500,radius:.3});"),('ranged',"const e=g.entity({kind:'minion',team:1,maxHp:500,radius:.3,ranged:true});"),('siege',"const e=g.entity({kind:'minion',team:1,maxHp:500,radius:.5,siege:true});")]
    for name,create in types:
        page.evaluate('()=>{const g=__moba.game;g.units=g.units.filter(e=>e.player||e.kind==="tower");'+create+'Object.assign(e,{x:24,y:38});window.__unit=e;__moba.renderer.draw(g,true);}')
        p=pixels('__unit');assert p['opaque']>50,(name,p);assert -.22*p['scale']<p['bottom']<2,(name,p)
    page.evaluate('()=>{const g=__moba.game;g.units=g.units.filter(e=>e.player||e.kind==="tower");__moba.renderer.scene25d.groundFrame=__ground;}')
    # Warm all GPU allocations, then count calls rather than imposing machine-specific FPS.
    pose(25,38);page.wait_for_timeout(100)
    page.evaluate('''()=>{const gl=__moba.renderer.scene25d.webgl.getContext();window.__uploads=0;for(const key of ['texImage2D','texSubImage2D']){const f=gl[key].bind(gl);gl[key]=(...args)=>{__uploads++;return f(...args);};}}''')
    before=page.evaluate('__moba.renderer.scene25d.webgl.info.render.frame')
    performance=page.evaluate('''async()=>{const g=__moba.game,s=__moba.renderer.scene25d;for(let i=0;i<20;i++){const e=g.makeChampion(['faust','sora','yan','gregor','honglu'][i%5],i%2,20+i);Object.assign(e,{x:20+(i%5)*2,y:35+Math.floor(i/5)*2,trainingSummoned:true});}const times=[];let last=performance.now();for(let i=0;i<40;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>4)times.push(now-last);last=now;}return {fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),uploads:__uploads,renders:s.webgl.info.render.frame};}''')
    assert performance['uploads']==0,performance;assert performance['renders']-before<=2,performance
    page.screenshot(path=str(art/'v24-crowded.png'))
    # Small camera pans reuse scenery, while a pan past the guard band refreshes it.
    previous=page.evaluate('__moba.renderer.scene25d.webgl.info.render.frame');pose(25.5,38.2)
    assert page.evaluate('__moba.renderer.scene25d.webgl.info.render.frame')==previous
    assert page.locator('#arena-3d').evaluate('e=>e.style.transform')!='translate3d(0px, 0px, 0px)'
    pose(31,38);assert page.evaluate('__moba.renderer.scene25d.webgl.info.render.frame')>previous
    moving=page.evaluate('''async()=>{const times=[];let last=performance.now();for(let i=0;i<100;i++){__moba.game.player.x=27+2.5*Math.sin(i*.055);__moba.game.player.y=38+.4*Math.cos(i*.055);await new Promise(requestAnimationFrame);const now=performance.now();if(i>4)times.push(now-last);last=now;}return {fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),uploads:__uploads};}''')
    assert moving['uploads']==0,moving
    # Window/fullscreen-sized reallocations cannot move the feet or stretch scenery.
    for w,h in [(1920,1080),(390,844),(844,390)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);pose(25,38)
        assert page.evaluate('()=>{const s=__moba.renderer.scene25d,c=s.webgl.getContext();return c.drawingBufferWidth*c.drawingBufferHeight<=921600&&c.getError()===0;}')
    page.screenshot(path=str(art/'v24-mobile.png'));assert not errors,errors;browser.close()
    print(json.dumps({'all_wall_sides':'full sprite visible','all_body_feet':'grounded','twenty_extra_champions':performance,'moving_camera':moving,'scenery_pan_and_resize':'passed','errors':errors},ensure_ascii=False))
