"""Native map targeting, cancellable infiltration and 2D structures, live/offline."""
import json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];art=root/'artifacts';art.mkdir(exist_ok=True)
offline=os.environ.get('MOBA_OFFLINE')=='1'
patches=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{BUSHES}from'./src/data.js';console.log(JSON.stringify([BUSHES[0],BUSHES.find(b=>b.polygon)]));"],cwd=root,text=True))
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':950});errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
    if offline:
        page.route('http*://**/*',lambda route:route.abort())
        html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)')
        page.set_content(html,wait_until='networkidle',timeout=60000)
    else:page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    page.click('#practice-open');page.get_by_role('button',name='뫼르소 선택',exact=True).click();page.click('#start')
    page.wait_for_function('__moba.renderer.scene25d.skin.ready&&__moba.renderer.clerkAtlas.naturalWidth')
    page.evaluate('''()=>{const g=__moba.game;window.step50=g.step.bind(g);g.step=()=>{};g.time=100;g.minionQueue=[];g.wave=100;for(const k of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};const p=g.player;Object.assign(p,g.spawnPoint(p));p.augments=['highRisk'];p.lastCombat=-99;window.origin50={x:p.x,y:p.y};}''')
    expect(page.locator('#recall-btn span')).to_have_text('침투')
    page.keyboard.press('b');expect(page.locator('#global-target')).to_be_visible();expect(page.locator('#global-title')).to_have_text('침투 위치 선택')
    expect(page.locator('#global-description')).to_contain_text('2초')
    def select(x,y):
        bounds=page.evaluate('__moba.game.bounds');rect=page.locator('#target-map').bounding_box()
        page.mouse.click(rect['x']+(x-bounds['x'])/bounds['w']*rect['width'],rect['y']+(y-bounds['y'])/bounds['h']*rect['height'])
    select(65,23.4);expect(page.locator('#global-target')).to_be_visible();assert not page.evaluate('!!__moba.game.player.recall')
    page.screenshot(path=str(art/('v50-infiltration-offline.png'if offline else'v50-infiltration.png')))
    select(29,7.15);expect(page.locator('#global-target')).to_be_hidden()
    assert page.evaluate('Math.abs(__moba.game.player.recall.until-__moba.game.time-2)<1e-8')
    page.click('#recall-btn');assert page.evaluate('!__moba.game.player.recall&&Math.abs(__moba.game.player.state.infiltrationReady-__moba.game.time-1.5)<1e-8')
    page.keyboard.press('b');expect(page.locator('#global-target')).to_be_hidden()
    page.evaluate('__moba.game.time+=1.5');page.keyboard.press('b');expect(page.locator('#global-target')).to_be_visible();select(29,7.15)
    page.evaluate('step50(1.99)');assert page.evaluate('Math.abs(__moba.game.player.x-origin50.x)<1e-8')
    page.evaluate('step50(.01)');assert page.evaluate('Math.abs(__moba.game.player.x-29)<.05&&__moba.game.buff(__moba.game.player,"infiltrationStride")&&!__moba.game.player.recall')
    result=page.evaluate('''patches=>{
      const g=__moba.game,r=__moba.renderer,p=g.player;const calls=[],old=r.structure.bind(r),labels=[],text=r.text.bind(r);
      r.structure=(e,game)=>{calls.push(e.kind);return old(e,game);};r.text=(s,x,y,...args)=>{labels.push({s,x,y});return text(s,x,y,...args);};
      const target=g.makeChampion('faust',1,8);Object.assign(target,{x:31,y:7.15,player:false});target.state.gaze={1:{n:3,until:g.time+5}};g.status(target,'slow',.2,5,p);r.draw(g,true);
      if(!calls.includes('tower'))throw Error('2D tower was not drawn');if(!labels.some(t=>t.s.includes('시선 3')&&t.y<target.y-2.7))throw Error('Debuff is not above HP');
      const core=g.units.find(e=>e.kind==='core'&&e.team===0);Object.assign(p,{x:core.x+3,y:core.y});r.draw(g,true);if(!calls.includes('core'))throw Error('2D core was not drawn');
      if(r.scene25d.structures.size)throw Error('3D structures remain');r.structure=old;r.text=text;
      const saved=r.ctx;for(const patch of patches){const canvas=document.createElement('canvas');canvas.width=Math.ceil((patch.w+2)*40);canvas.height=Math.ceil((patch.h+2)*40);const c=canvas.getContext('2d');c.scale(40,40);c.translate(1-patch.x,1-patch.y);r.ctx=c;r.bush(patch);const alpha=(x,y)=>c.getImageData(Math.floor((x-patch.x+1)*40),Math.floor((y-patch.y+1)*40),1,1).data[3];if(alpha(patch.x-.1,patch.y+.2)!==0)throw Error('Mist spilled beyond straight boundary');if(!patch.polygon){for(const x of [patch.x+.1,patch.x+patch.w-.1])for(const y of [patch.y+.1,patch.y+patch.h-.1])if(alpha(x,y)<35)throw Error('Mist leaves empty wall corners');}else{const x=patch.polygon.reduce((n,p)=>n+p[0],0)/4,y=patch.polygon.reduce((n,p)=>n+p[1],0)/4;if(alpha(x,y)<35||alpha(patch.x+.1,patch.y+.1)!==0)throw Error('Diagonal mist footprint mismatch');}}r.ctx=saved;

      return {wholeMapSelection:true,range60Enforced:true,channel:2,cancelCooldown:1.5,blinkAndStride:true,structures2D:true,debuffAboveHP:true,mistFullyFilledAndClipped:true,gl:r.scene25d.webgl.getContext().getError()};
    }''',patches)
    for location,label in [({'x':3,'y':23.4},'base'),({'x':20,'y':23.4},'camp'),({'x':35.36,'y':23.4},'central-mist'),({'x':35.36,'y':-3},'mist')]:
        page.evaluate('(p)=>{Object.assign(__moba.game.player,p);__moba.renderer.draw(__moba.game,true)}',location);page.wait_for_timeout(120)
        page.screenshot(path=str(art/('v50-'+label+('-offline'if offline else'')+'.png')))
    for w,h in [(390,844),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150);assert page.evaluate('__moba.renderer.scene25d.webgl.getContext().getError()')==0
    assert not errors,errors
    if offline:assert not requests,requests
    browser.close();print(json.dumps({'result':result,'errors':errors,'offline':offline},ensure_ascii=False))
