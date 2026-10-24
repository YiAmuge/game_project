"""Standalone opaque iframe: every approved icon is embedded and needs no network."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1];html=(root/'dist/city-border.html').read_text();needle='if (new URLSearchParams(location.search).has("debug"))';assert needle in html;html=html.replace(needle,'if (true)')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);context=b.new_context(viewport={'width':1440,'height':900});errors=[];requests=[]
 def reject(route):requests.append(route.request.url);route.abort()
 context.route('**/*',reject);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<iframe id="preview" sandbox="allow-scripts" style="width:100%;height:900px;border:0"></iframe>');page.evaluate('(html)=>document.querySelector("iframe").srcdoc=html',html);frame=page.frame_locator('#preview');expect(frame.locator('.build-tag')).to_contain_text('0.34.0');frame.locator('#training-open').click();frame.locator('#start').click();frame.locator('#shop-toggle').click();frame.locator('#training-buy-procedures').click();frame.locator('#select-augment-reloadStacks').hover();expect(frame.locator('#detail-buy')).to_be_enabled();frame.locator('#select-augment-reloadStacks').dblclick()
 frame.locator('body').evaluate('''async()=>{while(document.querySelectorAll('#augment-list canvas[data-painted]').length<21)await new Promise(f=>setTimeout(f,50));}''')
 assert frame.locator('#augment-tray button').count()==1;expect(frame.locator('#shop-tabs [data-group=tech]')).to_be_enabled();frame.locator('#shop-tabs [data-group=tech]').click();frame.locator('#select-augment-carrier').hover();expect(frame.locator('#detail-buy')).to_be_enabled();frame.locator('#select-augment-carrier').dblclick();assert frame.locator('#augment-tray.carrier').count()==1
 result=frame.locator('body').evaluate('''()=>{const g=__moba.game;return {version:'0.34.0',augments:g.player.augments,icons:document.querySelectorAll('#augment-list canvas[data-painted]').length,gl:__moba.renderer.scene25d.webgl.getContext().getError()};}''');assert result['gl']==0;page.screenshot(path=str(root/'artifacts/v34-offline-shop.png'));assert not errors,errors;assert not requests,requests;b.close();print(json.dumps({'result':result,'network_requests':requests,'errors':errors}))
