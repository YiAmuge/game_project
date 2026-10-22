"""Yan's actual hold/release input, forms, summon commands and coordinate tactical."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

art=Path(__file__).resolve().parents[1]/'artifacts';art.mkdir(exist_ok=True)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=b.new_page(viewport={'width':1440,'height':900});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('MOBA_TEST_URL','http://127.0.0.1:5180')+'/?debug=1',wait_until='networkidle')
    expect(page.locator('.build-tag')).to_contain_text('0.24.0')
    page.click('#practice-open');expect(page.locator('.champion-option')).to_have_count(29)
    page.get_by_role('button',name='얀 선택',exact=True).click();expect(page.locator('#selected-role')).to_have_text('방해')
    page.wait_for_function('__moba.renderer.atlasV17.naturalWidth>0')
    assert page.locator('.champion-option[aria-pressed=true] canvas').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(0,0,c.width,c.height).data).some((n,i)=>i%4===3&&n>0)')
    page.screenshot(path=str(art/'v17-yan-selection.png'))
    page.click('#archive-open');page.fill('#roster-search','얀');page.click('#roster-list button')
    for text in ['가짜 지령','불길한 힘','enlxmfflsdis','중첩 획득 불가','충돌/피격 반경 +10%','프로토타입']:
        expect(page.locator('#roster-detail')).to_contain_text(text)
    page.screenshot(path=str(art/'v17-yan-codex.png'));page.click('#archive .close-dialog');page.click('#start')
    page.evaluate('''() => {const g=__moba.game,p=g.player;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];const t=g.makeChampion('faust',1,9);Object.assign(t,{x:42,y:7,hp:10000,maxHp:10000,lastAttackAt:100,lastDamageAt:100});window.__target=t;window.__normalMax=p.maxHp;}''')
    def aim(x,y):
        s=page.evaluate('([x,y])=>{const r=__moba.renderer;r.resize();r.follow(__moba.game,true);const s=r.camera.worldToScreen({x,y}),b=r.canvas.getBoundingClientRect();return {x:s.x+b.left,y:s.y+b.top};}',[x,y]);page.mouse.move(s['x'],s['y'])
    def click(x,y,button='left'):
        aim(x,y);page.mouse.down(button=button);page.mouse.up(button=button)
    aim(42,7);page.mouse.down();page.wait_for_function('__moba.game.player.state.yanCharge')
    page.wait_for_timeout(650)
    assert page.evaluate('__target.hp===10000&&__moba.game.player.ammo===0&&__moba.game.player.state.yanCharge.progress>.3')
    page.screenshot(path=str(art/'v17-yan-sword-charging.png'))
    page.mouse.up();page.wait_for_function('__target.hp<10000&&__moba.game.player.state.falseOrders[__target.id]')
    assert page.evaluate('__moba.game.player.state.ominous===0&&!__moba.game.player.state.yanCharge')
    page.screenshot(path=str(art/'v17-yan-muted-directive.png'))
    page.wait_for_function('__moba.game.player.attackCd===0')
    aim(42,7);page.mouse.down();page.wait_for_timeout(1650);page.mouse.up()
    page.wait_for_function('__moba.game.player.state.ominous===1')
    assert page.evaluate('__moba.game.stat(__target,"weak")===.15')
    page.keyboard.press('Space');page.wait_for_function('__moba.game.player.rCd>0')
    assert page.evaluate('__moba.game.player.state.falseOrders[__target.id].until-__moba.game.time>5')
    # The tenth actual consumption makes transformation available despite previous R cooldown.
    page.evaluate('const g=__moba.game;g.player.state.ominous=5;g.deal(g.player,__target,1,{fixed:true})')
    expect(page.locator('#r-btn span')).to_have_text('enlxmfflsdis')
    normal=page.locator('#hud-face').evaluate('(c)=>c.toDataURL()')
    page.keyboard.press('Space');page.wait_for_function('__moba.game.player.state.yanActive')
    expect(page.locator('#r-btn')).to_be_disabled();expect(page.locator('#basic-btn span')).to_have_text('잠금');expect(page.locator('#q-btn span')).to_have_text('뒤틀린 검')
    assert abs(page.evaluate('__moba.game.player.maxHp/__normalMax')-1.12)<1e-6
    assert abs(page.evaluate('__moba.game.player.radius')-.528)<1e-6
    page.wait_for_function('document.querySelector("#hud-face").dataset.form==="yanDistorted"')
    assert normal!=page.locator('#hud-face').evaluate('(c)=>c.toDataURL()')
    page.keyboard.press('Space');assert page.evaluate('__moba.game.player.state.ominous===0')
    page.evaluate('Object.assign(__target,{x:46,y:7});__moba.game.player.attackCd=0')
    click(46,7);page.wait_for_function('__moba.game.units.some(h=>h.kind==="summon"&&h.targetId===__target.id)')
    page.wait_for_function('__moba.game.stat(__target,"yanLock")===.3')
    assert page.evaluate('__moba.game.player.state.ominous===0')
    # A persistent floor aura must darken its full area between attack frames too.
    page.evaluate('''() => {const r=__moba.renderer;window.__aura=r.yanAura.bind(r);r.yanAura=()=>{};}''')
    page.wait_for_timeout(80)
    sample='''() => {const r=__moba.renderer,h=__moba.game.units.find(h=>h.kind==='summon'),s=r.camera.worldToScreen({x:h.x,y:h.y+2.5}),p=r.ctx.getImageData(Math.round(s.x*r.dpr),Math.round(s.y*r.dpr),1,1).data;return p[0]+p[1]+p[2];}'''
    without=page.evaluate(sample)
    page.evaluate('() => {__moba.renderer.yanAura=__aura;}')
    page.wait_for_timeout(80)
    assert page.evaluate(sample)<without
    assert page.evaluate('!__moba.game.effects.some(f=>f.type==="ring"&&f.color==="#9dcfe4")')
    page.screenshot(path=str(art/'v17-yan-distorted-hand-lock.png'))
    click(40,7);page.wait_for_function('__moba.game.units.some(h=>h.kind==="summon"&&h.attached&&Math.hypot(h.x-40,h.y-7)<2)')
    page.screenshot(path=str(art/'v17-yan-hand-recalled.png'))
    click(45,7,button='right');assert page.evaluate('!__moba.game.targeting')
    page.screenshot(path=str(art/'v17-yan-distorted-sword-preview.png'))
    page.wait_for_function('__moba.game.effects.some(f=>f.type==="yanSwordWarning")')
    assert page.evaluate('__moba.game.effects.find(f=>f.type==="yanSwordWarning").r')==7.5
    page.wait_for_function('__moba.game.stat(__target,"stun")>0')
    page.screenshot(path=str(art/'v17-yan-distorted-sword-impact.png'))
    assert page.evaluate('__moba.game.player.state.ominous===0')
    page.evaluate('__moba.game.time+=20.05')
    page.wait_for_function('!__moba.game.player.state.yanActive');expect(page.locator('#r-btn')).to_be_enabled()
    expect(page.locator('#basic-btn span')).to_have_text('의지의 검')
    assert abs(page.evaluate('__moba.game.player.radius')-.48)<1e-6
    assert page.evaluate('__moba.game.units.every(h=>h.kind!=="summon")')
    page.evaluate('__moba.game.player.attackCd=0');aim(44,7);page.mouse.down();page.keyboard.press('Escape');page.mouse.up()
    assert page.evaluate('!__moba.game.player.state.yanCharge&&!__moba.game.input.fire')
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150);assert page.evaluate('document.body.scrollWidth<=innerWidth')
    page.screenshot(path=str(art/'v17-yan-mobile.png'))
    assert not errors,errors;b.close()
    print(json.dumps({'status':'passed','checks':['selection and original generated atlas','codex and explicit prototype values','LMB charge and release without ammo','muted false flower and second-hit consumption','six-second normal R mark bypass','sixth-stack transformation','disabled R, zero stacks during transformation and enlarged hitbox','generated hand targeting, lock and self-click recall','quick-cast delayed giant sword','expiry restores size/form/skills','Escape cancels charge','mobile layout'],'page_errors':errors},ensure_ascii=False))
