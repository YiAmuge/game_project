import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5190').rstrip('/');ART=Path('artifacts');ART.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
  pc=await b.new_context(viewport={'width':1440,'height':900});phone=await b.new_context(viewport={'width':844,'height':390},has_touch=True,is_mobile=True);h=await pc.new_page();c=await phone.new_page();errors=[]
  for page in [h,c]:page.on('pageerror',lambda e:errors.append(str(e)))
  await c.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Fixed test viewport'))")
  await h.goto(URL+'/?debug');await h.wait_for_function('window.__moba');assert await h.locator('#menu-version').is_visible();assert await h.inner_text('#menu-version')=='v1.0.3'
  await h.click('#practice-open');await h.click('#position-select [data-position="top"]')
  assert await h.locator('#champion-select .champion-recommend').count()>0
  await h.click('#pick-roles [data-role="암살"]');assert await h.locator('#champion-select .pick-role-heading').all_text_contents()==['주 역할군','부 역할군']
  assert await h.locator('#champion-select [data-key="heathcliff"]').count()==0
  assert await h.locator('#champion-select [data-key="don"]').count()==1
  await h.screenshot(path=str(ART/'v110-pick-recommendations.png'));await h.click('#practice-back');await h.click('#online');await h.fill('#online-name','방장');await h.click('#online-create');await h.wait_for_function('__moba.online.room');code=await h.evaluate('__moba.online.room.code')
  await c.goto(URL+'/?debug&room='+code);await c.wait_for_function('window.__moba');await c.fill('#online-name','손님');await c.locator('#online-join').tap();await c.wait_for_function('__moba.online.room')
  await c.evaluate("__moba.online.send({type:'choose',slot:4,champion:'jamila'})");await c.wait_for_function("__moba.online.room.members.find(m=>m.id===__moba.online.id).slot===4")
  await h.fill('#online-chat-input','대기실 인사');await h.locator('#online-chat-input').press('Enter');await c.wait_for_function("document.querySelector('#online-chat-lines').textContent.includes('방장(파우스트): 대기실 인사')")
  await c.fill('#online-chat-input','안녕하세요');await c.locator('#online-chat-form button').tap();await h.wait_for_function("document.querySelector('#online-chat-lines .team-1')")
  await c.screenshot(path=str(ART/'v110-mobile-lobby-chat.png'));assert await c.locator('#online-champions .champion-recommend').count()>0
  await h.wait_for_function("[...__moba.online.peers.values()].some(p=>p.channel?.readyState==='open')");await c.locator('#online-ready').tap();await h.click('#online-start');await c.wait_for_function("__moba.mode==='playing'&&__moba.game.time>.3",timeout=15000)
  print('Shared pick recommendations, primary/secondary role grouping and lobby chat passed.',flush=True)
  await h.wait_for_function("!document.querySelector('#match-chat').classList.contains('hidden')");box=await h.locator('#match-chat').bounding_box();await h.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2);assert not await h.evaluate('__moba.chat.opened');assert await h.locator('#match-chat-lines').get_attribute('role')=='log';assert await h.locator('#match-chat').evaluate("e=>getComputedStyle(e).pointerEvents")=='none'
  await h.locator('#match-chat').dispatch_event('click');assert not await h.evaluate('__moba.chat.opened')
  await h.keyboard.press('Enter');assert await h.evaluate('__moba.chat.opened');time=await h.evaluate('__moba.game.time');at=await h.evaluate('[__moba.game.player.x,__moba.game.player.y]');await h.keyboard.type('wasd hello');await asyncio.sleep(.25);assert await h.evaluate('[__moba.game.player.x,__moba.game.player.y]')==at;assert await h.evaluate('__moba.game.time')>time
  await h.keyboard.press('Enter');assert not await h.evaluate('__moba.chat.opened');await c.wait_for_function("document.querySelector('#match-chat-lines').textContent.includes('방장(파우스트): wasd hello')")
  await h.keyboard.press('Enter');await h.keyboard.press('Escape');assert not await h.evaluate('__moba.chat.opened');assert not await h.evaluate('__moba.paused')
  await h.keyboard.press('Enter');await h.keyboard.press('Enter');assert not await h.evaluate('__moba.chat.opened')
  await h.keyboard.down('Tab');await h.keyboard.down('KeyD');x=await h.evaluate('__moba.game.player.x');await asyncio.sleep(.35);await h.keyboard.up('KeyD');assert await h.evaluate('__moba.game.player.x')>x;await h.keyboard.up('Tab')
  await h.evaluate("()=>{const p=__moba.game.player;p.upgrades={power:3,health:2,speed:1,haste:2,reload:2};p.augments=['power15','forceBattery'];}")
  await h.keyboard.down('Tab');await h.wait_for_function("document.querySelector('#score-rows .score-upgrades [data-upgrade=power] b').textContent==='+3'")
  assert await h.locator('#score-rows tr:first-child td').count()==6;assert await h.locator('#score-rows tr:first-child .score-augments canvas').count()==2
  async def all_eight_visible(page):
   await page.wait_for_function("document.querySelectorAll('#score-rows tr').length===8")
   assert await page.evaluate('''()=>{const panel=document.querySelector('.score-scroll').getBoundingClientRect();return [...document.querySelectorAll('#score-rows tr')].every(r=>{const b=r.getBoundingClientRect();return b.height>=20&&b.top>=panel.top-.5&&b.bottom<=panel.bottom+.5&&b.bottom<=innerHeight;});}''')
  for width,height in [(1440,900),(1280,720),(1024,600)]:
   await h.set_viewport_size({'width':width,'height':height});await asyncio.sleep(.15);await all_eight_visible(h);assert await h.evaluate("document.querySelector('#score-map').getBoundingClientRect().bottom<=document.querySelector('.score-scroll').getBoundingClientRect().top")
  await h.set_viewport_size({'width':1440,'height':900});await asyncio.sleep(.15)
  await h.screenshot(path=str(ART/'v110-scoreboard.png'));await h.keyboard.up('Tab')
  await h.click('#fullscreen');await h.wait_for_function('document.fullscreenElement');await h.keyboard.press('Enter');await asyncio.sleep(.2);await h.keyboard.press('Escape');assert await h.evaluate('!!document.fullscreenElement&&!__moba.chat.opened&&!__moba.paused');await h.click('#fullscreen')
  await c.locator('#minimap').tap();await c.locator('#mobile-score-tabs [data-page=scores]').tap();await all_eight_visible(c);await c.screenshot(path=str(ART/'v110-mobile-scoreboard.png'));await c.locator('#score-close').tap()

  session=await phone.new_cdp_session(c)
  async def send(kind,points):await session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':x,'y':y,'id':i}for i,x,y in points]})
  stick=await c.locator('#mobile-stick').bounding_box();chat=await c.locator('#match-chat').bounding_box();sx=stick['x']+stick['width']/2;sy=stick['y']+stick['height']/2;cx=chat['x']+chat['width']/2;cy=chat['y']+chat['height']/2
  await send('touchStart',[(1,sx,sy)]);await send('touchStart',[(1,sx,sy),(2,cx,cy)]);await send('touchEnd',[(1,sx,sy)]);assert not await c.evaluate('__moba.chat.opened');await send('touchEnd',[]);await asyncio.sleep(.55)
  await c.locator('#match-chat-lines').tap();assert await c.evaluate('__moba.chat.opened');assert await c.evaluate("document.activeElement.id==='chat-input'");assert await c.evaluate("+getComputedStyle(document.querySelector('#chat-editor')).zIndex>=24000")
  await c.fill('#chat-input','모바일 채팅');await c.locator('#chat-editor form button').tap();await h.wait_for_function("document.querySelector('#match-chat-lines').textContent.includes('손님(자밀라): 모바일 채팅')")
  await c.locator('#match-chat-lines').tap();await c.screenshot(path=str(ART/'v110-mobile-chat.png'));await c.evaluate('history.back()');await c.wait_for_function('!__moba.chat.opened');assert await c.evaluate("__moba.mode==='playing'")
  print('Match chat, typing input isolation, Escape/empty Enter, scoreboard movement, icons, mobile input and Back passed.',flush=True)
  await h.keyboard.press('KeyQ');await h.wait_for_function("document.querySelector('#match-chat-lines').textContent.includes('[핑]')");await h.screenshot(path=str(ART/'v110-chat-log.png'))
  assert not errors,errors;await b.close()
asyncio.run(main())
