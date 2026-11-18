"""Regressions for focused options, text entry and Escape in real fullscreen."""
import asyncio, ast, os, re
from pathlib import Path
from playwright.async_api import async_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')
SETUP=next(ast.literal_eval(n.value) for n in ast.parse((ROOT/'tests/champion-refresh_browser.py').read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SETUP' for t in n.targets))
ART=ROOT/'artifacts/keyboard-input';ART.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mode in os.getenv('KEYBOARD_BROWSER_MODES','desktop,offline').split(','):
   ctx=await browser.new_context(viewport={'width':1440,'height':900});page=await ctx.new_page();errors=[];external=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   url=URL+('/dist/city-border.html?debug' if mode=='offline' else '/?debug')
   if mode=='offline':
    async def route(r):
     if r.request.url.split('#')[0]==url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await page.route('**/*',route)
   await page.goto(url,wait_until='networkidle',timeout=90000)
   await page.click('#training-open');await page.get_by_role('button',name=re.compile('^막심 선택')).click();await page.click('#start')
   await page.wait_for_function('__moba.mode==="playing"&&!__moba.presentation.blocking')
   await page.evaluate(SETUP,'maxim')
   await page.click('#training-ai');await page.keyboard.press('g');await expect(page.locator('#shop')).to_be_visible()
   await page.keyboard.press('g');await expect(page.locator('#shop')).to_be_hidden()
   await page.locator('#training-ai').focus();await page.keyboard.press('Escape');assert await page.evaluate('__moba.paused')
   await page.keyboard.press('Escape');assert not await page.evaluate('__moba.paused')
   await page.locator('#training-ai').focus();await page.keyboard.down('d');await page.wait_for_function('__moba.game.input.x>0');await page.evaluate('advance(.2)');await page.keyboard.up('d');assert await page.evaluate('__moba.game.player.x>40.5')
   await page.locator('#training-ai').focus();checked=await page.locator('#training-ai').is_checked();await page.keyboard.press('Space');assert await page.evaluate('!!__moba.game.player.state.maximR');assert await page.locator('#training-ai').is_checked()==checked
   await page.evaluate(SETUP,'maxim')
   await page.evaluate('''()=>{const s=document.createElement('select');s.id='keyboard-select';s.innerHTML='<option>First</option><option>Second</option>';Object.assign(s.style,{position:'fixed',right:'10px',bottom:'10px',zIndex:9999});document.body.append(s);s.focus();}''')
   await page.keyboard.press('g');await expect(page.locator('#shop')).to_be_visible();await page.keyboard.press('Escape');await expect(page.locator('#shop')).to_be_hidden()
   await page.locator('#keyboard-select').focus();await page.keyboard.down('Tab');await expect(page.locator('#scoreboard')).to_be_visible();await page.keyboard.up('Tab');await expect(page.locator('#scoreboard')).to_be_hidden();await page.locator('#keyboard-select').evaluate('e=>e.remove()')
   # Text editing clears held movement and keeps game actions isolated.
   for kind in ['input','editable']:
    await page.evaluate('''kind=>{const e=document.createElement(kind==='input'?'input':'div');e.id='keyboard-editor';if(kind==='editable')e.contentEditable='true';Object.assign(e.style,{position:'fixed',right:'10px',bottom:'10px',zIndex:9999,minWidth:'80px',minHeight:'20px'});document.body.append(e);}''',kind)
    await page.locator('#arena').focus();await page.keyboard.down('d');await page.wait_for_function('__moba.game.input.x>0');await page.locator('#keyboard-editor').focus();assert await page.evaluate('__moba.game.input.x===0')
    await page.keyboard.up('d');await page.keyboard.type('g wasd');await page.keyboard.press('Enter');assert not await page.locator('#shop').is_visible();assert not await page.evaluate('__moba.chat.opened||!!__moba.game.player.state.maximR')
    await page.keyboard.press('Escape');assert await page.evaluate('__moba.paused');await page.keyboard.press('Escape');assert not await page.evaluate('__moba.paused');await page.locator('#keyboard-editor').evaluate('e=>e.remove()')
   # Escape closes chat, a modal, a held rush and global selection before pausing.
   await page.keyboard.press('Enter');assert await page.evaluate('__moba.chat.opened')
   await page.keyboard.type('g wasd');await page.locator('#chat-input').evaluate("e=>e.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',isComposing:true,bubbles:true,cancelable:true}))");assert await page.evaluate('__moba.chat.opened')
   await page.keyboard.press('Escape');assert not await page.evaluate('__moba.chat.opened||__moba.paused')
   await page.click('#training-level-open');await expect(page.locator('#training-level-dialog')).to_be_visible();await page.keyboard.press('Escape');await expect(page.locator('#training-level-dialog')).to_be_hidden();assert not await page.evaluate('__moba.paused')
   await page.click('#training-teleport');assert await page.evaluate('__moba.globalTarget');await page.keyboard.press('Escape');assert not await page.evaluate('__moba.globalTarget||__moba.paused')
   box=await page.locator('#q-btn').bounding_box();await page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);await page.mouse.down();assert await page.evaluate('!!__moba.game.player.state.maximQ');await page.keyboard.press('Escape');assert not await page.evaluate('!!__moba.game.player.state.maximQ||__moba.paused');await page.mouse.up()
   await page.click('#fullscreen');await page.wait_for_function('document.fullscreenElement')
   await page.keyboard.press('g');await expect(page.locator('#shop')).to_be_visible();await page.keyboard.press('Escape');await expect(page.locator('#shop')).to_be_hidden();assert await page.evaluate('!!document.fullscreenElement&&!__moba.paused')
   await page.keyboard.press('Escape');assert await page.evaluate('!!document.fullscreenElement&&__moba.paused');await page.keyboard.press('Escape');assert not await page.evaluate('__moba.paused')
   await page.keyboard.press('Enter');assert await page.evaluate('__moba.chat.opened');await page.keyboard.press('Escape');assert await page.evaluate('!!document.fullscreenElement&&!__moba.chat.opened&&!__moba.paused')
   await page.keyboard.press('Escape');assert await page.evaluate('!!document.fullscreenElement&&__moba.paused');await page.keyboard.press('Escape')
   await page.screenshot(path=str(ART/f'{mode}-fullscreen.png'));await page.click('#fullscreen');await page.wait_for_function('!document.fullscreenElement')
   assert not errors,(mode,errors);assert not external,external
   print(mode+': checkbox/select G, Escape, WASD, Space, Tab; text/IME isolation; modal/rush/selection cancellation; fullscreen and chat lock passed.',flush=True)
   await ctx.close()
  await browser.close()
asyncio.run(main())
