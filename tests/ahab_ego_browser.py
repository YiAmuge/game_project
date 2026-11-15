"""Actual PC/mobile/standalone rendering and input checks for GasHarpoon."""
import asyncio,os,re,json
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
BASE_FRAME=json.loads((ROOT/'src/assets/sprites-v36.json').read_text())['frames']['ahab']
EGO_FRAME=json.loads((ROOT/'src/assets/ahab-gasharpoon.json').read_text())['frames']['ahabGasBody']
CAPTURE_BODY='''async frame=>{const c=__moba.renderer.ctx,draw=c.drawImage;let bounds=null;c.drawImage=function(...a){if(a.length===9&&a[1]===frame.x&&a[2]===frame.y&&a[3]===frame.w&&a[4]===frame.h)bounds=a.slice(5);return draw.apply(this,a);};try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}finally{c.drawImage=draw;}return bounds;}'''
ART=ROOT/'artifacts/ahab-ego';ART.mkdir(parents=True,exist_ok=True)
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  for mobile,offline in [(False,False),(True,False),(False,True)]:
   label='offline' if offline else 'mobile' if mobile else 'desktop'
   if os.getenv('AHAB_BROWSER_CASE') and os.getenv('AHAB_BROWSER_CASE')!=label:continue
   ctx=await browser.new_context(viewport={'width':932 if mobile else 1440,'height':430 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   url=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5173')+('/dist/city-border.html?debug' if offline else '/?debug')
   external=[]
   if offline:
    async def route(request):
     if request.request.url.split('#')[0]==url:await request.continue_()
     else:external.append(request.request.url);await request.abort()
    await page.route('**/*',route)
   await page.goto(url,wait_until='networkidle',timeout=90000)
   await page.click('#training-open');await page.get_by_role('button',name=re.compile(r'^에이해브 선택')).click();await page.click('#start');await page.wait_for_timeout(300)
   await page.evaluate(SETUP,'ahab')
   base_bounds=await page.evaluate(CAPTURE_BODY,BASE_FRAME)
   await page.evaluate("()=>{const g=__moba.game,p=g.player;g.buyAugment(p,'goldenBough');target(47);g.cast(p,'r',p);}")
   await page.wait_for_timeout(500)
   ego_bounds=await page.evaluate(CAPTURE_BODY,EGO_FRAME)
   assert base_bounds and ego_bounds,(base_bounds,ego_bounds)
   for landmark in EGO_FRAME['faceAlignment']['landmarks']:
    a=[ego_bounds[i]+landmark['source'][i]/[EGO_FRAME['w'],EGO_FRAME['h']][i]*ego_bounds[i+2] for i in range(2)]
    b=[base_bounds[i]+landmark['target'][i]/[BASE_FRAME['w'],BASE_FRAME['h']][i]*base_bounds[i+2] for i in range(2)]
    assert sum((a[i]-b[i])**2 for i in range(2))**.5<.008,(label,landmark['name'],a,b)
   assert await page.locator('#basic-btn span').inner_text()=='탄식의 메아리',(errors,await page.locator('#basic-btn span').inner_text(),await page.evaluate('({state:__moba.game.player.state,training:__moba.game.training,gift:__moba.game.player.goldenBough,mode:__moba.mode})'))
   assert await page.locator('#q-btn span').inner_text()=='죄책감의 무게'
   assert await page.locator('#r-btn span').inner_text()=='탈색된 참회'
   assert await page.locator('#r-btn').is_enabled()
   await page.screenshot(path=str(ART/f'{label}-form.png'))
   await page.evaluate("()=>{const g=__moba.game;g.attack(g.player,g.input.aim);advance(.025);}")
   await page.wait_for_timeout(80);await page.screenshot(path=str(ART/f'{label}-echo.png'))
   await page.evaluate("advance(.8)")
   assert await page.evaluate("__moba.game.player.ammo===0&&!__moba.game.player.state.gasharpoon.volley&&__moba.game.soundEvents.filter(s=>s.phase==='gasharpoon-thrust').length===5")
   if not mobile:
    await page.click('#q-btn')
   else:
    box=await page.locator('#q-btn').bounding_box();await page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2)
   await page.wait_for_timeout(100)
   assert await page.evaluate("Boolean(__moba.game.player.state.gasharpoon.channel)")
   await page.evaluate('advance(.25)');await page.wait_for_timeout(80);await page.screenshot(path=str(ART/f'{label}-charge.png'))
   await page.evaluate('advance(.3)');await page.wait_for_timeout(80);await page.screenshot(path=str(ART/f'{label}-weight.png'))
   assert await page.locator('#q-btn').is_disabled()
   await page.evaluate(SETUP,'ahab')
   await page.evaluate("()=>{const g=__moba.game,p=g.player;g.buyAugment(p,'goldenBough');target(47);g.cast(p,'r',p);g.cast(p,'r',g.input.aim);advance(.51);}")
   await page.wait_for_timeout(80);await page.screenshot(path=str(ART/f'{label}-penance.png'))
   assert await page.evaluate("__moba.game.projectiles.some(p=>p.gasharpoon)&&__moba.game.player.state.gasharpoon.bladeMissingUntil>__moba.game.time")
   assert await page.locator('#r-btn').is_disabled()
   await page.evaluate("()=>{const g=__moba.game,p=g.player;g.cast(p,'q',g.input.aim);advance(.7);g.attack(p,g.input.aim);advance(.81);}")
   assert await page.evaluate('!__moba.game.player.state.gasharpoon')
   await page.wait_for_timeout(100)
   await expect(page.locator('#r-btn span')).to_have_text('개화 E.G.O::가스하푼',timeout=5000)
   assert not errors,(label,errors)
   await page.goto(url+'#codex/champions',wait_until='networkidle');await page.reload(wait_until='networkidle');await page.wait_for_timeout(200)
   await page.click('#roster-list [data-key=ahab]')
   await page.click('#skill-tab-3');assert '개화 E.G.O::가스하푼' in await page.locator('.golden-skill').inner_text()
   assert await page.locator('.golden-form-preview').count()==0
   await page.click('#skill-tab-0');await page.click('.golden-skill-link')
   await expect(page.locator('[data-form=transformed]')).to_have_attribute('aria-pressed','true')
   await page.click('[data-description-mode=details]')
   for index,name in [(1,'탄식의 메아리'),(2,'죄책감의 무게'),(3,'탈색된 참회')]:
    await page.click(f'#skill-tab-{index}');assert name in await page.locator('#skill-description').inner_text()
    assert await page.locator('#skill-description .skill-record').count()==1
    assert await page.locator('#skill-description .golden-skill').count()==0
    if index==1:
     text=await page.locator('#skill-description').inner_text();assert '1발' in text and '5회' in text
   await page.screenshot(path=str(ART/f'{label}-codex.png'))
   await page.click('[data-form=base]');await expect(page.locator('[data-form=base]')).to_have_attribute('aria-pressed','true')
   for key in ['mei','queen','nosferatu']:
    await page.click(f'#roster-list [data-key={key}]');await page.screenshot(path=str(ART/f'{label}-{key}-shoulders.png'))
   await page.click('#roster-list [data-key=sora]');await page.click('[data-form=transformed]')
   assert await page.locator('.empty-skill').count()==1
   assert not errors,(label,errors)
   if offline:assert not external,external
   print(label,'passed: transform, fixed ammo, UI input, three white effects, codex, no page errors',flush=True)
   await ctx.close()
  await browser.close()
asyncio.run(main())
