"""Real-input carry movement, shared support effects, sprite mirroring and mobile HUD."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
art = root / 'artifacts'
art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    page = b.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(os.environ.get('MOBA_TEST_URL', 'http://127.0.0.1:5180') + '/?debug=1', wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.14.0')

    def choose(name):
        if page.evaluate('__moba.mode') == 'playing':
            page.click('#pause')
            page.click('#leave')
        if page.evaluate('__moba.mode') == 'menu':
            page.click('#practice-open')
        page.get_by_role('button', name=name + ' 선택').click()
        page.click('#start')
        page.evaluate('''() => {
          const g=__moba.game,p=g.player;
          for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
          Object.assign(p,{x:40,y:7,lastDamageAt:1000,lastAttackAt:1000});
          g.units=[p];g.minionQueue=[];
          const t=g.makeChampion('faust',1,9);Object.assign(t,{x:42,y:7,hp:10000,maxHp:10000,lastDamageAt:1000,lastAttackAt:1000});window.__target=t;
        }''')
        page.wait_for_timeout(120)

    def click(x, y, button='left'):
        s = page.evaluate('([x,y])=>__moba.renderer.camera.worldToScreen({x,y})', [x, y])
        page.mouse.move(s['x'], s['y'])
        page.mouse.click(s['x'], s['y'], button=button)

    choose('김삿갓')
    # Verify every portrait pixel is the horizontal mirror of the original frame.
    assert page.evaluate('''async () => {
      const {portrait,FRAMES}=await import('./src/art.js'),r=__moba.renderer;
      const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=80;a.height=b.height=80;
      const args=[r.atlas,r.atlasExtra,r.atlasV05,r.atlasV06,r.atlasV08,r.atlasV10,r.atlasV12,r.atlasV13];
      portrait(a,'kim',...args);FRAMES.kim.mirror=false;portrait(b,'kim',...args);FRAMES.kim.mirror=true;
      const x=a.getContext('2d').getImageData(0,0,80,80).data,y=b.getContext('2d').getImageData(0,0,80,80).data;
      for(let row=0;row<80;row++)for(let col=0;col<80;col++)for(let c=0;c<4;c++)if(x[(row*80+col)*4+c]!==y[(row*80+79-col)*4+c])return false;
      return true;
    }''')
    click(42, 7, 'right')
    page.wait_for_function('__moba.game.player.state.swordGrab')
    before = page.evaluate('({p:__moba.game.player.y,t:__target.y})')
    page.keyboard.down('s')
    page.wait_for_timeout(300)
    page.keyboard.up('s')
    after = page.evaluate('({p:__moba.game.player.y,t:__target.y,stun:__moba.game.stat(__target,"stun"),root:__moba.game.stat(__target,"root")})')
    assert after['p'] > before['p'] + .5 and abs((after['p']-before['p'])-(after['t']-before['t'])) < 1e-5
    assert after['stun'] == 1 and after['root'] == 0
    page.screenshot(path=str(art / 'v14-kim-stunned-carry.png'))
    click(48, after['p'], 'right')
    page.wait_for_function('!__moba.game.player.state.swordGrab')
    assert page.evaluate('!__target.state.swordHeldBy&&__moba.game.stat(__target,"stun")===0')

    choose('뿌이')
    page.evaluate('''() => {
      const g=__moba.game;window.__allies=['yi','meursault'].map((key,i)=>{
        const a=g.makeChampion(key,0,10+i);Object.assign(a,{x:42+i,y:8,hp:1000,lastDamageAt:1000,lastAttackAt:1000});g.status(a,'stun',1,5);return a;
      });
    }''')
    click(42, 8, 'right')
    assert page.evaluate('__moba.game.targeting.slot') == 'q'
    click(42, 8)
    page.wait_for_function('__allies.every(a=>__moba.game.stat(a,"stun")===0&&a.hp>1000)')
    assert page.evaluate('__moba.game.player.state.helping.targets.length') == 3
    page.evaluate('__moba.game.player.ammo=0;__moba.game.player.qCd=8')
    page.keyboard.press('Space')
    page.wait_for_function('__moba.game.player.state.nailStorm')
    assert page.evaluate('__moba.game.player.ammo===__moba.game.ammoCap(__moba.game.player)&&__moba.game.player.qCd===0')
    y = page.evaluate('__moba.game.player.y')
    page.keyboard.down('s')
    page.wait_for_timeout(350)
    page.keyboard.up('s')
    assert page.evaluate('__moba.game.player.y') > y + .5
    assert page.evaluate('__moba.game.player.state.nailStorm.until>__moba.game.time')
    page.screenshot(path=str(art / 'v14-ppui-moving-ultimate.png'))

    choose('소라')
    page.screenshot(path=str(art / 'v14-sora-chibi-normal.png'))
    page.evaluate('''() => {const g=__moba.game,p=g.player;p.state.unlock=5;g.cast(p,'r',p);}''')
    page.wait_for_function('document.querySelector("#hud-face").dataset.form==="soraEgo"')
    assert page.evaluate('Math.abs(__moba.game.attackRange(__moba.game.player)-2.7)<1e-6')
    page.screenshot(path=str(art / 'v14-sora-chibi-ego.png'))
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(150)
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    page.screenshot(path=str(art / 'v14-mobile.png'))
    assert not errors, errors
    b.close()
    print(json.dumps({'status':'passed','checks':['mirrored Kim portrait pixels','real RMB grab and WASD carry with stun/recast release','all-allies Ppui cleanse/heal','moving R with refill/Q reset','two Sora chibi forms and unchanged EGO radius','mobile layout'],'page_errors':errors}, ensure_ascii=False))
