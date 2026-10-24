"""Latest body/weapon sheets also work in an offline opaque-origin HTML preview."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
html=(root/'dist/city-border.html').read_text()
needle='if (new URLSearchParams(location.search).has("debug"))'
assert needle in html;html=html.replace(needle,'if (true)')
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    context=b.new_context(viewport={'width':1440,'height':900});errors=[];requests=[]
    context.route('**/*',lambda route:(requests.append(route.request.url),route.abort()))
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<iframe id="preview" sandbox="allow-scripts" style="width:100%;height:900px"></iframe>')
    page.evaluate('(html)=>document.querySelector("iframe").srcdoc=html',html)
    frame=page.frame_locator('#preview');expect(frame.locator('.build-tag')).to_contain_text('0.37.0')
    frame.locator('#training-open').click();frame.get_by_role('button',name='퀴케그 선택',exact=True).click();frame.locator('#start').click()
    frame.locator('body').evaluate('''async()=>{const at=performance.now();__moba.game.step=()=>{};while(!__moba.renderer.atlasV36.naturalWidth||!__moba.renderer.weaponAtlas.naturalWidth||!__moba.renderer.scene25d.skin.ready){if(performance.now()-at>10000)throw new Error(JSON.stringify({body:__moba.renderer.atlasV36.naturalWidth,weapon:__moba.renderer.weaponAtlas.naturalWidth,skin:__moba.renderer.scene25d.skin.ready,ids:[...document.querySelectorAll('script[id*=v36]')].map(s=>s.id)}));await new Promise(r=>setTimeout(r,30));}__moba.game.addBuff(__moba.game.player,'queequegUlt',4);}''')
    expect(frame.locator('#hud-face')).to_have_attribute('data-form','queequegUlt')
    data=frame.locator('body').evaluate('''()=>{const r=__moba.renderer;return {bodies:r.atlasV36.src.startsWith('data:image/png;base64,'),weapons:r.weaponAtlas.src.startsWith('data:image/png;base64,'),gl:r.scene25d.webgl.getContext().getError()};}''')
    assert data=={'bodies':True,'weapons':True,'gl':0},data
    myo=frame.locator('body').evaluate('''()=>{const g=__moba.game,r=__moba.renderer,e=g.makeChampion('myo',0,0);Object.assign(e,{x:g.player.x,y:g.player.y,player:true});g.units=[e];g.player=e;g.addBuff(e,'rabbitFrenzy',4.5);let eyes=0;const old=r.ctx.createRadialGradient.bind(r.ctx);r.ctx.createRadialGradient=(...a)=>{if(a[5]===.115)eyes++;return old(...a);};r.draw(g,true);r.ctx.createRadialGradient=old;return eyes;}''')
    assert myo==2,myo
    page.screenshot(path=str(root/'artifacts/v36-offline.png'))
    assert not errors,errors;assert not requests,requests
    b.close();print(json.dumps({'result':data,'errors':errors,'network_requests':requests}))
