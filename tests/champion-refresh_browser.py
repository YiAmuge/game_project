"""Exercise actual renderer for all refreshed effects on desktop/mobile/offline."""
import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
URL=os.getenv('MOBA_TEST_URL','http://127.0.0.1:5192')
SETUP='''key=>{
 const g=__moba.game,step=g.step.bind(g);for(const name of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[name]=()=>{};if(!window.originalStep)window.originalStep=step;g.step=()=>{};g.time=0;g.events=[];g.effects=[];g.projectiles=[];g.zones=[];g.pending=[];g.corpses=[];g.winner=null;g.practice.noCooldown=false;g.practice.invincible=false;g.practice.lineStopped=true;g.input={x:0,y:0,fire:false,aim:{x:47,y:20}};g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;
 const p=g.makeChampion(key,0,0,'top');Object.assign(p,{player:true,x:40,y:20,lastCombat:-99,lastDamageAt:100,lastAttackAt:100,facing:0});g.player=p;g.units=[p];
 window.advance=s=>{for(let i=0;i<Math.round(s*120);i++)originalStep(1/120);};
 window.target=(x=43,y=20,team=1,key='faust')=>{const t=g.makeChampion(key,team,g.nextId);Object.assign(t,{x,y,hp:100000,maxHp:100000,armor:0,attackCd:999,lastDamageAt:100,lastAttackAt:100});return t;};
}'''
SCENES={
 'faust':"__moba.game.player.level=10",
 'hohenheim':"{const g=__moba.game,p=g.player,t=target();g.attack(p,t);p.state.hohenCharge.progress=1.5;}",
 'kim':"{const g=__moba.game,p=g.player,t=target(41.5);g.cast(p,'q',t);advance(.4);}",
 'gahwan':"{const g=__moba.game,p=g.player,a=target(37,20),b=target(43,20);g.deal(p,a,1);for(let i=0;i<5;i++)g.deal(p,b,1);}",
 'rudolph':"{const t=target(43,20);t.state.mentalWhip={1:{stage:2,hits:0,at:0,decayAt:2}};}",
 'myo':"{const g=__moba.game,p=g.player,t=target(46);g.cast(p,'q',t);advance(.08);}",
 'gubo':"target(44)",
 'honglu':"{const g=__moba.game,p=g.player,a=target(43,20,0);a.hp-=1000;g.heal(p,a,400,false,{skillHeal:true});g.cast(p,'q',p);advance(1.3);p.x+=1;}",
 'alisa':"{const g=__moba.game,p=g.player,t=target(41.5);p.state.heat=3;g.attack(p,t);advance(.08);}",
 'ppui':"{const g=__moba.game,p=g.player,t=target(46),a=target(42,22,0);a.hp-=1000;g.cast(p,'q',p);g.attack(p,t);advance(.12);}",
 'nelly':"{const g=__moba.game,p=g.player,a=target(37),b=target(43);g.deal(p,a,1);b.visuals.nellyMark={until:7,forced:true};}",
 'ahab':"{const g=__moba.game,p=g.player;g.cast(p,'q',p);advance(.1);}",
 'kromer':"{const g=__moba.game,p=g.player,a=target(37),b=target(40,23),t=target(42);g.deal(p,a,1);g.deal(p,b,1);g.deal(p,b,1);g.cast(p,'r',t);g.input.aim=t;advance(.45);}",
 'sinclair':"{const g=__moba.game,p=g.player;g.addBuff(p,'marks',4);const t=target(41.7);g.attack(p,t);advance(.08);}",
 'ryoshu':"{const g=__moba.game,p=g.player,t=target(41.7);g.attack(p,t);advance(.08);}",
 'marton':"{const g=__moba.game,p=g.player;g.cast(p,'r',p);advance(.1);}",
}
async def main():
 async with async_playwright()as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);errors=[]
  for mode in ['desktop','mobile','offline']:
   mobile=mode=='mobile';ctx=await b.new_context(viewport={'width':844 if mobile else 1440,'height':390 if mobile else 900},is_mobile=mobile,has_touch=mobile);p=await ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));await p.add_init_script("Element.prototype.requestFullscreen=()=>Promise.reject(new Error('fixed viewport'))")
   external=[]
   if mode=='offline':
    html=(ROOT/'dist/index.html').read_text()
    async def route(r):
     if r.request.url=='http://refresh.offline/?debug':await r.fulfill(status=200,content_type='text/html',body=html)
     else:external.append(r.request.url);await r.abort()
    await p.route('**/*',route);await p.goto('http://refresh.offline/?debug',wait_until='networkidle',timeout=90000)
   else:await p.goto(URL+'/?debug')
   await p.wait_for_function('window.__moba');await p.click('#training-open');await p.click('#start');await p.wait_for_function('__moba.game.training');await p.wait_for_timeout(400)
   for key,script in SCENES.items():
    await p.evaluate(SETUP,key);await p.evaluate('()=>{'+script+'}');await p.wait_for_timeout(110)
    if mode=='desktop' or key in ['hohenheim','kromer','kim','honglu','marton','ppui']:await p.screenshot(path=str(ART/f'refresh-{mode}-{key}.png'))
    assert not errors,(mode,key,errors)
   # Use real mobile charge gestures in the movable posthumous state.
   await p.evaluate(SETUP,'hohenheim');result=await p.evaluate('''()=>{const g=__moba.game,p=g.player,t=target();g.deal(t,p,999999,{fixed:true});const x=p.x;g.input.x=1;advance(.1);g.input.x=0;g.attack(p,t);return{duration:p.state.posthumous.until,moved:p.x>x,charge:p.state.hohenCharge.progress};}''');assert result['duration']==4.5 and result['moved'] and result['charge']==0,result
   assert not external,external;print(mode+': all 16 refreshed champion scenes render; posthumous movement and manual charge verified.',flush=True);await ctx.close()
  await b.close();assert not errors,errors
asyncio.run(main())
