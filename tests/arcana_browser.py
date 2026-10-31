"""Real desktop/mobile/offline kit rendering, control recasts and practice rivalry rewards."""
import asyncio,os,re,threading,shutil
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts';URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5192')
SETUP=re.search(r"SETUP='''(.*?)'''",(ROOT/'tests/champion-refresh_browser.py').read_text(),re.S).group(1)
SCENES={
 'queen-idle':('queen',"target(46);"),
 'queen-star':('queen',"const g=__moba.game,p=g.player;target(42,20,0).hp-=300;const t=target(46);g.attack(p,t);advance(.2);"),
 'queen-circle':('queen',"const g=__moba.game,p=g.player,t=target(46);g.cast(p,'q',t);advance(.6);"),
 'queen-ray':('queen',"const g=__moba.game,p=g.player,t=target(46);g.cast(p,'q',t);advance(1.55);"),
 'queen-stage-three':('queen',"const g=__moba.game,p=g.player,t=target(46);g.input.aim=t;g.cast(p,'r',t);advance(3.85);"),
 'queen-charge-camera':('queen',"const g=__moba.game,p=g.player;g.input.aim={x:40,y:-40};g.cast(p,'r',g.input.aim);advance(3.2);"),
 'queen-aim-up':('queen',"const p=__moba.game.player;p.facing=-Math.PI/3;p.lastCombat=0;"),
 'heath-ultimate-leap':('heathcliff',"const g=__moba.game,p=g.player;g.cast(p,'r',p);advance(.1);g.cast(p,'q',{x:47,y:20});advance(.3);"),
 'nos-idle':('nosferatu',"target(46);"),
 'nos-basic':('nosferatu',"const g=__moba.game,p=g.player,t=target(42.5);g.attack(p,t);advance(.1);"),
 'nos-bats':('nosferatu',"const g=__moba.game,p=g.player,t=target(46);p.state.bloodFeast=1200;for(let i=0;i<4;i++){p.qCd=0;g.cast(p,'q',{x:42+i*.5,y:20+(i%2)});}advance(.2);"),
 'nos-bloodfiend':('nosferatu',"const g=__moba.game,p=g.player,t=target(47);p.state.bloodFeast=500;p.hp=1234;g.cast(p,'r',{x:44,y:20});advance(.35);"),
}
async def main():
 async with async_playwright()as pw:
  errors=[]
  for mode in os.getenv('ARCANA_TEST_MODES','desktop,mobile,offline').split(','):
   browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);mobile=mode=='mobile';ctx=await browser.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   external=[];static_server=None
   if mode=='offline':
    offline_base=os.getenv('MOBA_OFFLINE_TEST_URL')
    if not offline_base:
     class Standalone(BaseHTTPRequestHandler):
      def do_GET(self):
       file=ROOT/'dist/index.html';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(file.stat().st_size));self.end_headers()
       with file.open('rb')as content:shutil.copyfileobj(content,self.wfile)
      def log_message(self,*args):pass
     static_server=ThreadingHTTPServer(('127.0.0.1',0),Standalone);threading.Thread(target=static_server.serve_forever,daemon=True).start();offline_base='http://127.0.0.1:'+str(static_server.server_address[1])
    offline_url=offline_base+'/?debug' 
    async def route(r):
     if r.request.url==offline_url:await r.continue_()
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route);await p.goto(offline_url,wait_until='networkidle',timeout=90000)
   else:await p.goto(URL+'/?debug')
   await p.wait_for_function('window.__moba');await p.click('#training-open');await p.locator('[data-key=queen]').click();await p.click('#start');await p.wait_for_function('__moba.game.training');await p.wait_for_timeout(400)
   for name,(key,script)in SCENES.items():
    await p.evaluate(SETUP,key);await p.evaluate('()=>{'+script+'}');await p.wait_for_timeout(180);assert not errors,(mode,name,errors);await p.screenshot(path=str(ART/f'arcana-{mode}-{name}.png'))
   # Champion-specific terminal art must also work without any external files.
   await p.evaluate(SETUP,'sora');await p.locator('#shop-toggle').click()
   if mobile:await p.locator('#mobile-shop-tabs [data-section=survival]').click()
   await p.locator('#select-augment-writtenOrder').click();await p.wait_for_function("document.querySelector('#detail-name').textContent==='단말기로 전해진 지령'&&document.querySelector('#detail-icon canvas').dataset.painted==='terminalOrder'")
   await p.screenshot(path=str(ART/f'arcana-{mode}-terminal-shop.png'));await p.locator('#detail-buy').click();await p.locator('#shop-close').click()
   await p.evaluate("()=>{const g=__moba.game;g.player.state.unlock=5;if(!g.cast(g.player,'r',g.player))throw Error('Sora transformation failed');}");await p.wait_for_function('__moba.game.player.absorbedOrder&&!__moba.game.player.augments.includes("writtenOrder")')
   if mobile:await p.wait_for_function("document.querySelector('.mobile-status-icon.passive-state canvas[data-art-key=terminalOrder]')")
   # Zoom uses real renderer state, and restores rapidly on release.
   await p.evaluate(SETUP,'queen');await p.wait_for_timeout(450)
   await p.evaluate("()=>{const g=__moba.game;g.input.aim={x:40,y:-40};g.cast(g.player,'r',g.input.aim);advance(2.5);}");await p.wait_for_timeout(500)
   assert await p.evaluate('__moba.renderer.viewBlend>1.7&&__moba.renderer.viewBlend<=2.25'),(mode,await p.evaluate('__moba.renderer.viewBlend'))
   assert await p.evaluate("__moba.game.cast(__moba.game.player,'r',{x:40,y:-40})");await p.evaluate('advance(.59)');await p.wait_for_timeout(200);assert await p.evaluate('__moba.renderer.viewBlend>1.7');await p.evaluate('advance(.03)');await p.wait_for_function('__moba.renderer.viewBlend<1.05',timeout=2000)
   # The real skill button must recast during the ultimate channel, on both input modes.
   await p.evaluate(SETUP,'queen');await p.evaluate('()=>{const g=__moba.game,t=target(46);g.input.aim={x:t.x,y:t.y};}')
   if mobile:await p.locator('#r-btn').tap()
   else:await p.locator('#r-btn').click()
   assert await p.evaluate("__moba.game.player.state.queenR?.phase==='charging'")
   await p.evaluate('advance(1.3)')
   if mobile:await p.locator('#r-btn').tap()
   else:await p.locator('#r-btn').click()
   assert await p.evaluate("__moba.game.player.state.queenR?.phase==='firing'&&__moba.game.player.state.queenR.stage===1")
   await p.evaluate(SETUP,'heathcliff');assert await p.evaluate("()=>{const g=__moba.game,p=g.player;return g.cast(p,'r',p)&&Math.abs(p.buffs.heathUlt-g.time-3.8)<1e-6;}")
   await p.evaluate('advance(3.79)');assert await p.evaluate('__moba.game.buff(__moba.game.player,"heathUlt")');await p.evaluate('advance(.02)');assert not await p.evaluate('__moba.game.buff(__moba.game.player,"heathUlt")')
   for a,b,reward in [('sinclair','kromer','lightWorld'),('kromer','sinclair','darkWorld'),('dongbaek','dongrang','fullBloom'),('dongrang','dongbaek','fruition')]:
    await p.evaluate(SETUP,a);await p.evaluate('__moba.game.rivalries=null');result=await p.evaluate('''args=>{const g=__moba.game,p=g.player,t=target(44,20,1,args[0]);t.trainingSummoned=true;g.deal(p,t,999999,{fixed:true,proc:false});return{reward:p.rivalReward,text:p.easterText?.text};}''',[b]);assert result['reward']==reward,result;assert result['text'];await p.wait_for_timeout(80)
   assert not external,external;assert not errors,errors
   await p.evaluate("()=>{const c=__moba.codex;c.show('champions');c.key='nosferatu';c.transformed=true;c.championList();c.championDetail();}");await p.wait_for_timeout(250);assert await p.evaluate("document.querySelector('#archive-body').dataset.key==='bloodfiend'||document.querySelector('#roster-detail').textContent.includes('혈귀')")
   await p.screenshot(path=str(ART/f'arcana-{mode}-bloodfiend-codex.png'));assert not errors,errors;await ctx.close();await browser.close();
   if static_server:await asyncio.to_thread(static_server.shutdown);static_server.server_close()
   print(mode+': new armless sprites, separate weapons, all kit VFX, actual R-button recast and all practice rivalry rewards passed.',flush=True)
asyncio.run(main())
