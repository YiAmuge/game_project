import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
const run=(g,s)=>{for(let i=0;i<Math.ceil(s*60);i++)g.step(1/60);};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function fixture(key='gubo'){
 const g=new Game(key);for(const fn of ['aiChampion','aiMinion','aiStructure','aiNeutral'])g[fn]=()=>{};
 const p=g.player,a=g.makeChampion('faust',0,6);Object.assign(p,{x:40,y:7});Object.assign(a,{x:44,y:7,maxHp:2000,hp:420,lastDamageAt:0});g.units=[p,a];g.minionQueue=[];return {g,p,a};
}
test('ordinary manually aimed Gubo bullets damage a 21% ally only on arrival, without an input flag',()=>{
 const {g,p,a}=fixture();g.attack(p,a);close(a.hp,420);run(g,.3);assert.ok(a.hp<420);assert.ok(p.ammo<3);
});
test('healthy allies and the shooter never intercept a Gubo shot; ordinary attacks still hit enemies',()=>{
 const {g,p,a}=fixture();a.hp=421;p.hp=1;p.lastDamageAt=0;const t=g.makeChampion('faust',1,8);Object.assign(t,{x:46,y:7,hp:10000,maxHp:10000});g.attack(p,t);run(g,.5);close(a.hp,421);close(p.hp,1);assert.ok(t.hp<10000);
});
test('35% ally becomes a valid projectile and R target during Q while range stays fixed',()=>{
 const {g,p,a}=fixture();a.hp=700;a.x=48;const range=g.attackRange(p);assert.equal(g.cast(p,'r',a),false);g.cast(p,'q',p);close(g.attackRange(p),range);assert.ok(g.canGuboHitAlly(p,a));g.attack(p,a);run(g,.6);assert.ok(a.hp<700);assert.ok(g.cast(p,'r',a));assert.equal(p.state.guboAim.target,a);
});
test('crossing above the live health threshold while the shot travels prevents allied damage',()=>{
 const {g,p,a}=fixture();g.attack(p,a);a.hp=421;run(g,.3);close(a.hp,421);
});
test('Q expiry while the shot travels protects a 35% ally instead of using the firing-time condition',()=>{
 const {g,p,a}=fixture();a.hp=700;g.addBuff(p,'guboReload',.05);g.attack(p,a);run(g,.3);close(a.hp,700);
});
test('a shot aimed away from a low-health ally never homes onto them',()=>{
 const {g,p,a}=fixture();g.attack(p,{x:45,y:9});run(g,.5);close(a.hp,420);
});
test('other champions cannot damage allies even if a projectile carries allowFriendly',()=>{
 const {g,p,a}=fixture('faust');g.bullet(p,{x:1,y:0},1000,8,{allowFriendly:true});run(g,.5);close(a.hp,420);
});
test('Gubo R without a flag selects the valid ally directly under the cursor over a nearby enemy',()=>{
 const {g,p,a}=fixture();const t=g.makeChampion('faust',1,8);Object.assign(t,{x:45,y:7});assert.ok(g.cast(p,'r',a));assert.equal(p.state.guboAim.target,a);run(g,1.6);assert.equal(a.alive,false);
});
test('Gubo R still selects an enemy directly under the cursor instead of a nearby eligible ally',()=>{
 const {g,p,a}=fixture();const t=g.makeChampion('faust',1,8);Object.assign(t,{x:45,y:7});assert.ok(g.cast(p,'r',t));assert.equal(p.state.guboAim.target,t);
});
test('self and healthier allies are filtered before choosing an eligible allied R target',()=>{
 const {g,p,a}=fixture();a.x=41;p.hp=1;const b=g.makeChampion('faust',0,8);Object.assign(b,{x:40.1,y:7,hp:1000,maxHp:1000});assert.ok(g.cast(p,'r',{x:40,y:7}));assert.equal(p.state.guboAim.target,a);
});
test('R cannot spend cooldown on a healthy ally, on self, or across a wall',()=>{
 const {g,p,a}=fixture();a.hp=421;assert.equal(g.cast(p,'r',a),false);close(p.rCd,0);a.x=50;p.hp=1;assert.equal(g.cast(p,'r',p),false);close(p.rCd,0);p.x=16;p.y=15;a.x=20;a.y=15;a.hp=420;assert.equal(g.cast(p,'r',a),false);close(p.rCd,0);
});
test('allied R rechecks health on bullet impact and does not kill a teammate healed during aiming',()=>{
 const {g,p,a}=fixture();assert.ok(g.cast(p,'r',a));a.hp=1000;run(g,1.6);assert.ok(a.alive);close(a.hp,1000);
});
test('allied execution damage does not make friendly minions or towers aggro onto Gubo',()=>{
 const {g,p,a}=fixture();const minion=g.entity({kind:'minion',team:0,x:41,y:7,maxHp:1000,range:6}),tower=g.entity({kind:'tower',team:0,x:42,y:8,maxHp:1000,range:6});g.attack(p,a);run(g,.3);assert.equal(minion.aggro,undefined);assert.equal(tower.aggro,undefined);assert.equal(a.contributors[p.id],undefined);
});
