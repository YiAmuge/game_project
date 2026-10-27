import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { CHAMPIONS,RUNTIME_CHAMPIONS,WALLS } from '../src/data.js';
import { distance,blocked } from '../src/geometry.js';
import { skillTargeting } from '../src/targeting.js';
import * as Sora from '../src/sora.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*60);i++)g.step(1/60);};
function quiet(){const g=new Game('sora','jungle',{seed:42});for(const fn of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[fn]=()=>{};const p=g.player;Object.assign(p,{x:40,y:7,lastCombat:0,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];return {g,p};}
function enemy(g,x=42,y=7,key='faust'){const t=g.makeChampion(key,1,9);Object.assign(t,{armor:0,x,y,maxHp:10000,hp:10000,lastDamageAt:100,lastAttackAt:100});return t;}
function creep(g,x=42,y=7,camp='side'){const t=g.makeNeutral(x,y,camp);t.maxHp=t.hp=1000;return t;}
function transform(g,p){p.state.unlock=5;assert.ok(g.cast(p,'r',p));}
test('Sora is an ordinary assassin with requested grades and default two-ammo reload rules',()=>{
 const {g,p}=quiet(),c=CHAMPIONS.sora;assert.equal(Object.keys(CHAMPIONS).length,29);assert.equal(Object.keys(RUNTIME_CHAMPIONS).length,31);assert.deepEqual([c.role,c.power,c.health,c.speed,c.ammo,c.reload],['암살',3,2,3,2,3]);close(g.reloadInterval(p),.56/.52);assert.ok(c.growth.power>0);
});
test('passive marks every three seconds, includes bosses and maintains two expiring six-second marks',()=>{
 const {g,p}=quiet(),a=creep(g,42,7),b=creep(g,43,8),boss=creep(g,41,7,'boss');run(g,2.99);assert.equal(Sora.orders(g,p).length,0);run(g,.02);assert.ok(Sora.marked(g,p,boss));assert.equal(boss.hostile,undefined);boss.x=70;run(g,3);assert.equal(Sora.orders(g,p).length,2);assert.ok(Sora.marked(g,p,a));run(g,3);assert.equal(Sora.orders(g,p).length,2);assert.ok(Sora.marked(g,p,b));assert.equal(Sora.marked(g,p,boss),false);
});
test('the first own hit consumes the mark and awards one unlock, never per extra hit',()=>{
 const {g,p}=quiet(),t=creep(g);Sora.mark(g,p,t);g.deal(p,t,1,{fixed:true});close(p.state.unlock,1);assert.equal(Sora.marked(g,p,t),false);g.deal(p,t,400,{fixed:true});close(p.state.unlock,1);
});
test('foreign damage and expired/returning marks cannot award unlock; absorbed damage does count',()=>{
 const {g,p}=quiet(),t=creep(g),a=g.makeChampion('faust',0,3);Sora.mark(g,p,t);g.deal(a,t,100,{fixed:true});assert.equal(Sora.marked(g,p,t),true);g.time=6;g.deal(p,t,200,{fixed:true});close(p.state.unlock,0);assert.equal(Sora.orders(g,p).length,0);
 const e=enemy(g);Sora.mark(g,p,e,'ultimate');g.addShield(e,500,'test');const hp=e.hp;g.deal(p,e,2000,{fixed:true});assert.equal(p.state.unlock,1);assert.ok(e.hp<hp);
 const returning=creep(g);Sora.mark(g,p,returning);returning.returning=true;assert.equal(Sora.orders(g,p).some(m=>m.target===returning.id),false);
});
test('ultimate prioritizes nearby ordinary creeps over buffs then lowest current champion HP',()=>{
 const {g,p}=quiet(),n=creep(g,47,7),b=creep(g,42,7,'blessing'),e=enemy(g,43,8),f=enemy(g,45,7);e.hp=900;f.hp=1000;assert.equal(Sora.ultimateTarget(g,p),n);n.alive=false;assert.equal(Sora.ultimateTarget(g,p),b);b.alive=false;assert.equal(Sora.ultimateTarget(g,p),e);const boss=creep(g,41,7,'boss');assert.equal(Sora.ultimateTarget(g,p),boss);boss.alive=false;assert.equal(Sora.ultimateTarget(g,p),e);e.x=60;assert.equal(Sora.ultimateTarget(g,p),f);
});
test('ultimate refresh keeps active marks, allows a third mark and does not wake neutral creeps',()=>{
 const {g,p}=quiet(),a=creep(g,43,7),b=creep(g,44,8),c=creep(g,42,7);Sora.mark(g,p,a);Sora.mark(g,p,b);g.time=1;assert.ok(g.cast(p,'r',p));assert.equal(Sora.orders(g,p).length,3);close(p.state.orders[a.id].until,7);assert.equal(p.state.orders[c.id].origin,'ultimate');assert.equal(c.hostile,undefined);close(p.rCd,10);
});
test('empty normal ultimate cannot spend cooldown, but an existing distant mark can be refreshed',()=>{
 const {g,p}=quiet();assert.equal(g.cast(p,'r',p),false);close(p.rCd,0);const t=creep(g);Sora.mark(g,p,t);t.x=60;assert.ok(g.cast(p,'r',p));close(p.state.orders[t.id].until,6);
});
test('normal basic gets ten percent bonus only against its own directive',()=>{
 const {g,p}=quiet(),t=enemy(g);const hp=t.hp;g.attack(p,t);close(hp-t.hp,220*.9);p.attackCd=0;p.ammo=1;Sora.mark(g,p,t,'ultimate');const before=t.hp;g.attack(p,t);close(before-t.hp,220*.9*1.1);
});
test('normal dash contacts only first enemy, stuns, refills a consumed directive and never pushes the victim',()=>{
 const {g,p}=quiet(),t=creep(g),behind=enemy(g,44,7);Sora.mark(g,p,t);p.ammo=0;assert.equal(skillTargeting(g,p,'q').confirm,true);g.cast(p,'q',{x:44.5,y:7});assert.ok(p.motion);run(g,.35);assert.equal(p.motion,undefined);assert.equal(g.stat(t,'stun'),1);close(t.x,42);close(behind.hp,10000);close(p.ammo,2);close(p.state.unlock,1);assert.ok(distance(p,t)>=p.radius+t.radius);
});
for(const cc of ['root','captured'])test(`${cc} rejects either form of dash without spending cooldown`,()=>{
 const {g,p}=quiet();g.status(p,cc,1,3);assert.equal(g.cast(p,'q',{x:45,y:7}),false);close(p.qCd,0);delete p.status[cc];transform(g,p);g.status(p,cc,1,3);assert.equal(g.cast(p,'q',{x:45,y:7}),false);assert.equal(p.invulnerableUntil,undefined);
});
test('five unlocks override an existing normal-ultimate cooldown and consume exactly five',()=>{
 const {g,p}=quiet();p.state.unlock=5;p.rCd=8;assert.equal(skillTargeting(g,p,'r').confirm,false);assert.equal(Sora.abilityInfo(g,p).ultimate,'개화 E.G.O::대행');assert.ok(g.cast(p,'r',p));assert.equal(Sora.ego(g,p),true);close(p.state.unlock,0);close(p.rCd,0);assert.equal(g.cast(p,'r',p),false);
});
test('transformation lasts twenty seconds, applies requested stats and restores original HP ratio and names',()=>{
 const {g,p}=quiet();p.hp=p.maxHp*.4;const hp=p.maxHp,power=g.powerScale(p),reload=g.reloadInterval(p),speed=g.speed(p);transform(g,p);close(p.maxHp,hp*.8);close(p.hp/p.maxHp,.4);close(g.powerScale(p)/power,1.25);close(g.reloadInterval(p),reload/1.3);close(g.speed(p)/speed,1.1);assert.equal(Sora.abilityInfo(g,p).basic,'대행: 새기기');run(g,19.9);assert.equal(Sora.ego(g,p),true);run(g,.12);assert.equal(Sora.ego(g,p),false);close(p.maxHp,hp);close(p.hp/p.maxHp,.4);assert.equal(Sora.abilityInfo(g,p).ultimate,'단말기로 정해진 지령');close(g.powerScale(p),power);
});
test('EGO basic hits in all directions, permits reload during attacking, and grants temporary five percent stride',()=>{
 const {g,p}=quiet(),front=enemy(g,42,7),back=enemy(g,38,7);transform(g,p);const speed=g.speed(p);g.attack(p,front);assert.ok(front.hp<10000&&back.hp<10000);close(10000-front.hp,260*.9*1.25);close(g.speed(p)-speed,3.8*.05);assert.equal(g.reloadPaused(p),false);p.ammo=0;p.reloadProgress=0;g.input.fire=true;run(g,.15);assert.ok(p.reloadProgress>0);g.input.fire=false;run(g,.25);close(g.speed(p),speed);
});
test('EGO dash is invulnerable only while moving, passes enemies and leaves six nonstacking-slow cuts',()=>{
 const {g,p}=quiet(),t=enemy(g);transform(g,p);const hits=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)hits.push(n);return deal(a,b,n,o);};g.cast(p,'q',{x:44.5,y:7});assert.ok(p.motion);assert.equal(g.deal(t,p,1000,{fixed:true}),0);run(g,.2);close(p.x,44.5);assert.equal(p.state.soraGuard,undefined);assert.ok(p.invulnerableUntil<=g.time);run(g,1.2);assert.deepEqual(hits,[240,45,45,45,45,45,45]);close(g.stat(t,'slow'),.3);const hp=p.hp;g.deal(t,p,100,{fixed:true});close(hp-p.hp,100);
});
test('wall and capture boundaries truncate the actual trail without leaving permanent immunity or overlaps',()=>{
 const {g,p}=quiet(),w=WALLS[0];Object.assign(p,{x:w.x-1.5,y:w.y+w.h/2});transform(g,p);g.cast(p,'q',{x:w.x+4,y:p.y});run(g,.7);assert.equal(blocked(p.x,p.y,p.radius),false);assert.ok(p.x<w.x);assert.equal(p.state.soraGuard,undefined);const trail=g.effects.find(f=>f.type==='soraTrail');assert.ok(trail.to.x<w.x);
 const f=quiet();transform(f.g,f.p);f.g.status(f.p,'netCapture',1,3);f.p.state.netTrap={x:40,y:7,r:1.2,until:3};f.g.cast(f.p,'q',{x:45,y:7});run(f.g,.3);assert.ok(distance(f.p,{x:40,y:7})<=1.2+1e-6);assert.equal(f.p.state.soraGuard,undefined);
});
test('forced motion cancellation and zero-length EGO casts release immunity reliably',()=>{
 const {g,p}=quiet();transform(g,p);g.cast(p,'q',{x:44,y:7});p.status.root={amount:1,until:1};run(g,.02);assert.equal(p.motion,undefined);assert.equal(p.state.soraGuard,undefined);assert.ok(p.invulnerableUntil<=g.time);
 const f=quiet();transform(f.g,f.p);f.g.cast(f.p,'q',f.p);assert.equal(f.p.state.soraGuard,undefined);assert.ok(!(f.p.invulnerableUntil>0));
});
test('equipment and level growth use transformed max HP, and death resets unlock but preserves transformed corpse',()=>{
 const {g,p}=quiet();transform(g,p);g.award(p,250,0);const hp=g.maxHp(p);p.state.unlock=4;g.kill(p,enemy(g));assert.equal(g.corpses.at(-1).form,'soraEgo');assert.ok(p.maxHp>hp);assert.equal(p.state.unlock,undefined);g.time=p.respawnAt;g.step(.01);assert.ok(p.alive);assert.equal(p.state.unlock,0);assert.equal(Sora.ego(g,p),false);close(p.state.orderAt-g.time,3);
});
test('two Sora owners track separate marks and cap their own unlocks at five',()=>{
 const {g,p}=quiet(),a=g.makeChampion('sora',0,2),t=creep(g);Object.assign(a,{x:40,y:8});Sora.mark(g,p,t);Sora.mark(g,a,t);p.state.unlock=4;g.deal(p,t,250,{fixed:true});close(p.state.unlock,5);close(a.state.unlock,0);assert.equal(Sora.marked(g,a,t),true);Sora.mark(g,p,t);g.deal(p,t,250,{fixed:true});close(p.state.unlock,5);
});

test('normal Q really stops a jungle creep attacking for its stun, and minion stuns cannot fire early',()=>{
 const {g,p}=quiet(),t=creep(g);g.cast(p,'q',{x:44.5,y:7});run(g,.2);assert.equal(g.stat(t,'stun'),1);g.aiNeutral=Game.prototype.aiNeutral;const hp=p.hp;run(g,.5);close(p.hp,hp);run(g,2.2);assert.ok(p.hp<hp);
 const f=quiet(),m=f.g.entity({kind:'minion',team:1,x:41,y:7,maxHp:1000,range:2,damage:50,interval:1,radius:.3,waypoint:1,lane:0});f.g.aiMinion=Game.prototype.aiMinion;f.g.status(m,'stun',1,1,f.p);const before=f.p.hp;run(f.g,.5);close(f.p.hp,before);run(f.g,.6);assert.ok(f.p.hp<before);
});
