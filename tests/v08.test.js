import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { CHAMPIONS, RUNTIME_CHAMPIONS, FOUNTAINS } from '../src/data.js';
import { CONSUMABLES, refund } from '../src/items.js';
import { distance } from '../src/geometry.js';
import { separate } from '../src/collision.js';
import { mentalWhip } from '../src/skills.js';
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.ceil(s*60);i++)g.step(1/60);};
function quiet(key='faust'){
 const g=new Game(key);for(const fn of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[fn]=()=>{};
 const p=g.player,t=g.champions(1).find(e=>e.key==='faust');Object.assign(p,{x:40,y:7});Object.assign(t,{x:42,y:7,hp:100000,maxHp:100000});g.units=[p,t];g.minionQueue=[];return {g,p,t};
}
function ally(g,key='yi'){const e=g.makeChampion(key,0,5);Object.assign(e,{x:42,y:9});return e;}
test('24 ordinary champions include all four additions; XP accrues at exactly one per second even while dead',()=>{
 assert.equal(Object.keys(CHAMPIONS).length,24);assert.equal(Object.keys(RUNTIME_CHAMPIONS).length,26);
 for(const key of ['faust','hohenheim','alisa','marton','queequeg']){const {g,p,t}=quiet(key);run(g,1);close(p.xp,1);g.kill(p,t);run(g,1);close(p.xp,2);}
});
test('four ordinary creeps or two buff creeps alone reach level two; buildings lose fifteen percent HP',()=>{
 for(const [camp,n]of [['side',4],['central',4],['amplify',2],['blessing',2]]){const {g,p}=quiet('meursault');for(let i=0;i<n;i++){g.kill(g.makeNeutral(42,7,camp),p);if(i<n-1)assert.equal(p.level,1);}assert.equal(p.level,2);close(p.xp,250);}
 const g=new Game();assert.ok(g.towers(0).every(t=>t.maxHp===6460));assert.equal(g.units.find(t=>t.kind==='core').maxHp,10200);
});
test('every consumable can be bought, used and sold; wards are absent and remaining charges determine refund',()=>{
 assert.equal(CONSUMABLES.length,6);assert.ok(!CONSUMABLES.some(i=>i.key==='ward'));
 for(const item of CONSUMABLES){const {g,p,t}=quiet();Object.assign(p,FOUNTAINS[0]);p.gold=10000;t.x=p.x+2;t.y=p.y;g.input.aim=t;assert.ok(g.buyConsumable(p,item.key));assert.equal(g.buy(p,'potion'),false);assert.equal(p.potion,item.uses);assert.ok(g.usePotion(p));assert.equal(p.potion,item.uses-1);if(p.potion){const gold=p.gold;const value=refund(p);assert.ok(g.sellConsumable(p));close(p.gold-gold,value);}assert.equal(g.buy(p,'ward'),false);}
});
test('cleanse removes crowd control and debuffs; weakness affects only the aimed enemy',()=>{
 const {g,p,t}=quiet();Object.assign(p,{potion:1,itemKey:'cleanse'});g.status(p,'stun',1,2);p.burn={};p.state.ishmaelWeak={9:2};assert.ok(g.usePotion(p));assert.equal(g.stat(p,'stun'),0);assert.equal(p.burn,undefined);g.status(p,'root',1,3);assert.equal(g.stat(p,'root'),0);run(g,1.1);p.itemKey='weakness';p.potion=1;g.input.aim=t;assert.ok(g.usePotion(p));close(g.stat(t,'slow'),.2);close(g.stat(t,'reloadWeak'),.2);
});
test('temporary magazine preserves extra ammunition after expiry and Rudolph converts all magazine bonuses into SP',()=>{
 const {g,p}=quiet('myo');p.itemKey='magazine';p.potion=1;g.usePotion(p);assert.equal(g.ammoCap(p),5);p.ammo=5;run(g,8.1);assert.equal(g.ammoCap(p),4);assert.equal(p.ammo,5);
 const r=quiet('rudolph');r.p.alive=false;r.p.upgrades.reload=3;r.p.gold=5000;assert.ok(r.g.buyAugment(r.p,'magazine2'));assert.equal(r.g.ammoCap(r.p),130);r.p.alive=true;r.p.itemKey='magazine';r.p.potion=1;r.g.usePotion(r.p);assert.equal(r.g.ammoCap(r.p),145);
});
test('Rudolph five-hit chains stack whip vulnerability to thirty percent without ammunition loss or CC',()=>{
 const {g,p,t}=quiet('rudolph');const ammo=t.ammo;for(let i=0;i<20;i++){g.time+=.1;mentalWhip(g,p,t);}assert.equal(t.state.mentalWhip[p.id].stage,3);assert.equal(t.ammo,ammo);assert.equal(g.stat(t,'slow'),0);const hp=t.hp;g.attack(p,t);close(hp-t.hp,48*1.3*.91*.9);p.rCd=0;g.cast(p,'r',t);run(g,1.3);close(g.stat(t,'slow'),.3);assert.equal(g.stat(t,'root'),0);
});
test('Sinclair marks allow reload progress during continuous firing while other champions still pause',()=>{
 for(const key of ['sinclair','meursault']){const {g,p}=quiet(key);p.ammo=0;p.attackCd=1;g.addBuff(p,'marks',4);g.input.fire=true;g.input.aim={x:50,y:7};run(g,.25);assert.equal(p.reloadProgress>0,key==='sinclair');}
});
test('Dongbaek third extra attack lands then applies exactly 1.35 seconds of basic-only disarm',()=>{
 const {g,p,t}=quiet('dongbaek');t.x=41;for(let i=0;i<3;i++){p.ammo=0;p.attackCd=0;assert.ok(g.attack(p,t));}assert.equal(p.state.extraPetals,3);close(p.status.disarm.until-g.time,1.35);p.ammo=3;p.attackCd=0;assert.equal(g.attack(p,t),false);p.qCd=0;assert.ok(g.cast(p,'q',p));run(g,1.4);assert.ok(g.attack(p,t));
});
test('Dongrang has one non-charge tree and all ultimate scaling caps after five hundred non-natural healing',()=>{
 const {g,p,t}=quiet('dongrang');g.cast(p,'q',t);close(p.qCd,10);p.qCd=0;assert.equal(g.cast(p,'q',t),false);assert.equal(p.state.treeCharges,undefined);g.heal(null,p,500,false);close(g.cooldown(p,'r'),35);g.heal(null,p,5000,false,{natural:true});close(p.totalHealingReceived,500);g.heal(null,p,1000,false);close(g.cooldown(p,'r'),35);
});
test('Hohenheim death state lasts 2.5 seconds, cannot move, heal or ult, and only awards one kill',()=>{
 const {g,p,t}=quiet('hohenheim');g.deal(t,p,100000,{fixed:true});assert.ok(p.alive&&p.state.posthumous);close(p.hp,0);p.ammo=0;const x=p.x;g.input.x=1;assert.ok(g.cast(p,'q',t));assert.equal(g.cast(p,'r',t),false);g.heal(null,p,1000,false);close(p.hp,0);run(g,1);close(p.x,x);assert.ok(g.attack(p,t));assert.equal(t.kills,0);run(g,1.6);assert.equal(p.alive,false);assert.equal(t.kills,1);assert.equal(p.state.posthumous,undefined);close(p.ccImmuneUntil,0);
});
test('Hohenheim beam strikes three times and second and later targets each take exactly twenty percent less',()=>{
 const {g,p,t}=quiet('hohenheim');t.x=43;const b=g.makeChampion('faust',1,6),c=g.makeChampion('faust',1,7);Object.assign(b,{x:45,y:7,hp:100000,maxHp:100000});Object.assign(c,{x:47,y:7,hp:100000,maxHp:100000});g.attack(p,t);run(g,.3);close((100000-b.hp)/(100000-t.hp),.8);close(100000-b.hp,100000-c.hp);
});
test('Marton lifesteals, drains without healing theft and leaves a destructible 500HP bait that enemies attack',()=>{
 const {g,p,t}=quiet('marton');p.hp-=1000;p.lastAttackAt=0;const hp=p.hp;g.attack(p,t);assert.ok(p.hp>hp);assert.ok(g.cast(p,'q',p));run(g,.5);assert.ok(g.buff(p,'martonDrain'));assert.equal(g.stat(t,'healingWeak'),0);g.kill(p,t);const bait=g.units.find(e=>e.kind==='bait');assert.equal(bait.hp,500);t.attackCd=0;t.ammo=3;run(g,1.2);assert.ok(bait.hp<500||!bait.alive);assert.ok(t.state.tauntedBy===bait.id||!bait.alive);
});
test('Queequeg spends one of five ammo on six attacks and refreshes capture every fourth hit',()=>{
 const {g,p,t}=quiet('queequeg');g.attack(p,t);assert.equal(p.ammo,4);run(g,.5);assert.equal(p.state.captureHits[t.id],6);assert.ok(g.stat(t,'captured'));t.qCd=0;t.key='sinclair';assert.equal(g.cast(t,'q',p),false);const old=t.x;g.moveToward(t,{x:t.x+1,y:t.y},.1);assert.ok(t.x>old);p.attackCd=0;g.attack(p,t);run(g,.5);assert.equal(p.state.captureHits[t.id],12);assert.ok(t.status.captured.until>g.time+.8);
});
test('Queequeg damage stacks survive healing; tether transfers thirty percent and breaks after sustained separation',()=>{
 const {g,p,t}=quiet('queequeg'),a=ally(g);const hp=p.hp;g.deal(t,p,p.maxHp*.2,{fixed:true});assert.equal(p.state.endurance,2);g.heal(null,p,1000,false);assert.equal(p.state.endurance,2);g.cast(p,'q',a);close(g.armor(a),30);const ahp=a.hp,php=p.hp;g.deal(t,a,100,{fixed:true});close(ahp-a.hp,70);close(php-p.hp,30);a.x=53;run(g,1.7);assert.equal(p.state.tether,undefined);close(g.armor(a),0);assert.ok(p.hp<=hp);
});
test('Queequeg ultimate cannot fall below one HP, including fixed damage, then heals missing health',()=>{
 const {g,p,t}=quiet('queequeg');g.cast(p,'r',p);g.deal(t,p,999999,{fixed:true});close(p.hp,1);p.lastDamageAt=g.time+4;run(g,4.05);assert.ok(p.alive&&p.hp>1);assert.equal(g.buff(p,'queequegUlt'),false);g.deal(t,p,999999,{fixed:true});assert.equal(p.alive,false);
});
test('Alisa third dash consumes all heat to heal and her ultimate blocks CC until explosion',()=>{
 const {g,p,t}=quiet('alisa');p.hp-=1000;p.state.heat=2;for(let i=0;i<3;i++){assert.ok(g.cast(p,'q',{x:48,y:7}));run(g,.4);}assert.equal(p.state.heat,0);assert.ok(p.hp>p.maxHp-1000);p.state.heat=5;assert.ok(g.cast(p,'r',p));g.status(p,'stun',1,3);assert.equal(g.stat(p,'stun'),0);run(g,1);g.deal(t,p,999999,{fixed:true});assert.ok(p.state.detonating);run(g,2.1);assert.equal(p.alive,false);assert.equal(p.ccImmuneUntil,0);
});
test('Ahab is invulnerable and immune until a visible return dash reaches the original position',()=>{
 const {g,p,t}=quiet('ahab');const start={x:p.x,y:p.y};assert.ok(g.cast(p,'r',{x:44,y:7}));close(p.x,44);const hp=p.hp;g.deal(t,p,9999,{fixed:true});close(p.hp,hp);g.status(p,'stun',1,3);assert.equal(g.stat(p,'stun'),0);run(g,.5);assert.ok(p.motion&&p.state.ahabUlt);const x=p.x;run(g,.1);assert.ok(p.x<x&&x-p.x<=.81);run(g,1.5);close(distance(p,start),0);assert.equal(p.state.ahabUlt,undefined);g.deal(t,p,10,{fixed:true});assert.ok(p.hp<hp);
});
test('collision separates coincident champions and keeps them outside structures and walls',()=>{
 const {g,p,t}=quiet();t.x=p.x;t.y=p.y;separate(g);assert.ok(distance(p,t)>=p.radius+t.radius-.001);const tower=g.entity({kind:'tower',team:1,x:41,y:7,maxHp:1000,radius:.9});p.x=tower.x;p.y=tower.y;separate(g);assert.ok(distance(p,tower)>=p.radius+tower.radius-.001);
});
test('Hohenheim bots still fire in the stationary posthumous state and recall is unavailable',()=>{
 const {g,p,t}=quiet('hohenheim');p.player=false;g.deal(t,p,999999,{fixed:true});assert.equal(g.recall(p),false);const x=p.x,hp=t.hp;run(g,.5);close(p.x,x);assert.ok(t.hp<hp);assert.equal(p.naturalHealing,false);
});
test('Queequeg retains earned endurance stacks when maximum health increases with level',()=>{
 const {g,p,t}=quiet('queequeg');g.deal(t,p,p.maxHp*.2,{fixed:true});assert.equal(p.state.endurance,2);g.award(p,6900,0);g.deal(t,p,1,{fixed:true});assert.equal(p.state.endurance,2);
});
test('an expired battle potion does not discard excess ammo retained from a previous magazine potion',()=>{
 const {g,p}=quiet('faust');p.ammo=4;p.buffs.itemBattle=1;p.state.itemBattleWas=true;g.time=1.01;g.step(.01);assert.equal(p.ammo,4);
});
