import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,damageFormula } from '../src/game.js';
import { CHAMPIONS,WORLD } from '../src/data.js';
import { distance } from '../src/geometry.js';
import { solid } from '../src/collision.js';
import { skillTargeting } from '../src/targeting.js';
import * as Yan from '../src/yan.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function quiet(){const g=new Game('yan','bottom',{seed:101});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player;Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];return {g,p};}
function target(g,x=42,y=7,team=1,key='faust'){const t=g.makeChampion(key,team,9);Object.assign(t,{x,y,maxHp:10000,hp:10000,lastAttackAt:100,lastDamageAt:100});return t;}
function transform(g,p){p.state.ominous=10;assert.ok(g.cast(p,'r',p));}

test('Yan has requested grades, no ammunition, and a charge resource instead',()=>{
 const {g,p}=quiet(),c=CHAMPIONS.yan;assert.deepEqual([c.role,c.power,c.health,c.speed,c.ammo,c.reload],['방해',2,3,3,0,2]);close(g.ammoCap(p),0);assert.ok(g.attack(p,{x:44,y:7}));assert.ok(p.state.yanCharge);close(p.ammo,0);
});
test('the applying hit cannot consume its own false mark, while an allied next hit can',()=>{
 const {g,p}=quiet(),t=target(g),a=target(g,40,10,0);g.deal(p,t,1,{fixed:true});assert.ok(Yan.marked(g,p,t));close(p.state.ominous,0);const until=p.state.falseOrders[t.id].until;
 g.time=.2;assert.equal(Yan.mark(g,p,t),false);close(p.state.falseOrders[t.id].until,until);g.deal(a,t,1,{fixed:true});assert.equal(Yan.marked(g,p,t),false);close(p.state.ominous,1);close(g.stat(t,'weak'),.15);g.deal(p,t,1,{fixed:true});assert.equal(Yan.marked(g,p,t),false);
 g.time=3.21;g.deal(p,t,1,{fixed:true});assert.ok(Yan.marked(g,p,t));
});
test('expired marks, enemy damage and neutral damage cannot grant ominous power',()=>{
 const {g,p}=quiet(),t=target(g),foe=target(g,44);Yan.mark(g,p,t);g.deal(foe,t,1,{allowFriendly:true,fixed:true});close(p.state.ominous,0);g.time=3.01;g.deal(p,t,1,{fixed:true});close(p.state.ominous,0);assert.ok(Yan.marked(g,p,t));
});
test('shield-only hit consumes an existing mark, at most once for that mark',()=>{
 const {g,p}=quiet(),t=target(g);g.addShield(t,100,'shield');Yan.mark(g,p,t);const hp=t.hp;g.deal(p,t,1,{fixed:true});close(t.hp,hp);close(p.state.ominous,1);g.deal(p,t,1,{fixed:true});close(p.state.ominous,1);
});
test('allied periodic damage can consume a mark, while Yan secondary on-hit damage cannot consume its applying hit',()=>{
 const {g,p}=quiet(),t=target(g),ally=target(g,40,10,0,'gregor');p.augments=['finalBullet'];g.deal(p,t,100,{fixed:true});close(p.state.ominous,0);assert.ok(Yan.marked(g,p,t));g.deal(ally,t,35,{proc:false});close(p.state.ominous,1);assert.equal(Yan.marked(g,p,t),false);
});
test('consuming a directive on a lethal allied hit awards a stack without stealing the allied kill',()=>{
 const {g,p}=quiet(),t=target(g),ally=target(g,40,10,0);Yan.mark(g,p,t);g.deal(ally,t,20000,{fixed:true});assert.equal(t.alive,false);close(p.state.ominous,1);close(p.kills,0);close(ally.kills,1);assert.equal(t.lastDeath.killerId,ally.id);
});
test('ultimate applies to all nearby champions and refreshes existing marks despite the normal lockout',()=>{
 const {g,p}=quiet(),a=target(g),b=target(g,45),far=target(g,50);Yan.mark(g,p,a);g.deal(p,a,1,{fixed:true});assert.ok(!Yan.marked(g,p,a));assert.ok(g.cast(p,'r',p));assert.ok(Yan.marked(g,p,a)&&Yan.marked(g,p,b));assert.equal(Yan.marked(g,p,far),false);close(p.state.falseOrders[a.id].until,6);close(p.rCd,g.cooldown(p,'r'));
 g.time=1;p.rCd=0;g.cast(p,'r',p);close(p.state.falseOrders[b.id].until,7);
});
test('normal clicks charge without instant damage and a tap releases the 50 damage rectangular strike',()=>{
 const {g,p}=quiet(),t=target(g,42.5),miss=target(g,44),side=target(g,42,8.4);g.attack(p,t);close(t.hp,10000);Yan.release(g,p,t);close(10000-t.hp,damageFormula(50,2,1));close(miss.hp,10000);close(side.hp,10000);close(p.ammo,0);assert.equal(p.state.yanCharge,undefined);
});
test('uncharged taps cannot repeat faster than .85 seconds; charged time counts toward the floor',()=>{
 const {g,p}=quiet(),t=target(g);p.upgrades.reload=3;g.attack(p,t);Yan.release(g,p,t);close(p.attackCd,.85);run(g,.84);assert.equal(g.attack(p,t),false);run(g,.02);assert.ok(g.attack(p,t));run(g,.5);Yan.release(g,p,t);close(p.attackCd,.65);
 transform(g,p);p.attackCd=0;g.attack(p,p);close(p.attackCd,.15);
});
test('full charge reaches 6.5, uses 200 maximum damage, slows movement ten percent, and never autofires for players',()=>{
 const {g,p}=quiet(),t=target(g,46.5),base=g.speed(p);g.attack(p,t);close(g.speed(p),base*.9);run(g,1.6);close(t.hp,10000);close(Yan.chargeShape(g,p,t).progress,1);Yan.release(g,p,t);close(10000-t.hp,damageFormula(200,2,1));close(g.speed(p),base);
});
test('half charge interpolates between minimum 50 and the fully charged 200',()=>{
 const {g,p}=quiet(),t=target(g);g.attack(p,t);run(g,.75);Yan.release(g,p,t);close(10000-t.hp,damageFormula(125,2,1));
});
test('reload upgrades change charge time and extra magazine increases damage without adding ammo use',()=>{
 const {g,p}=quiet(),t=target(g);p.upgrades.reload=3;p.augments=['magazine2'];close(g.ammoCap(p),2);g.attack(p,t);run(g,1);close(Yan.chargeShape(g,p,t).progress,1.15/1.5);Yan.release(g,p,t);assert.ok(10000-t.hp>damageFormula(50,2,1)*1.2);close(p.ammo,0);
});
test('stun cancels charge and death or a new champion cannot retain it',()=>{
 const {g,p}=quiet(),t=target(g);g.attack(p,t);run(g,.5);g.status(p,'stun',1,.3,t);run(g,.02);assert.equal(p.state.yanCharge,undefined);assert.equal(Yan.release(g,p,t),false);close(t.hp,10000);
});
test('six moving semicircle waves deal six thirty-damage hits and only full attendance earns the long slow',()=>{
 const {g,p}=quiet(),t=target(g,44),outside=target(g,37);const hits=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t&&n===30&&o?.proc!==false)hits.push(n);return deal(a,b,n,o);};g.cast(p,'q',{x:48,y:7});run(g,1.55);assert.equal(hits.length,6);close(g.stat(t,'slow'),.5);close(outside.hp,10000);close(p.channelUntil||0,0);assert.equal(skillTargeting(g,p,'q').confirm,false);
});
test('ten stacks bypass normal R cooldown and transformation preserves health ratio with all requested changes',()=>{
 const {g,p}=quiet(),hp=p.maxHp,power=g.powerScale(p),armor=g.armor(p);p.hp=hp*.4;p.rCd=8;transform(g,p);close(p.hp/p.maxHp,.4);close(p.maxHp,hp*1.12);close(g.powerScale(p),power*.9);close((g.armor(p)+100)/(armor+100),1.12);close(p.radius,.48*1.1);close(p.state.ominous,0);assert.ok(Yan.hand(g,p)?.attached);assert.equal(Yan.abilityInfo(g,p).basic,'잠금');
});
test('while distorted R is rejected and mark consumption still weakens without gaining any stacks',()=>{
 const {g,p}=quiet(),t=target(g);transform(g,p);assert.equal(g.cast(p,'r',p),false);Yan.mark(g,p,t);g.deal(p,t,1,{fixed:true});close(p.state.ominous,0);close(g.stat(t,'weak'),.15);assert.equal(Yan.marked(g,p,t),false);close(p.rCd,0);
});
test('hand is invincible, CC immune, nonsolid and cannot attract hostile attacks',()=>{
 const {g,p}=quiet(),t=target(g);transform(g,p);const h=Yan.hand(g,p);close(g.deal(t,h,10000,{fixed:true}),0);g.status(h,'stun',1,10,t);close(g.stat(h,'stun'),0);assert.equal(solid(g,t,h),false);assert.equal(solid(g,h,t),false);assert.equal(g.hostile(t,h),false);assert.equal(g.startMotion(h,{x:1,y:0},4),false);
});
test('hand follows a clicked enemy, applies lock and returns when the owner is clicked',()=>{
 const {g,p}=quiet(),t=target(g,46);transform(g,p);g.attack(p,t);run(g,.65);const h=Yan.hand(g,p);assert.equal(h.targetId,t.id);assert.ok(distance(h,t)<.5);close(g.stat(t,'yanLock'),.3);close(g.powerWeak(t),.3);g.attack(p,p);assert.equal(h.attached,true);run(g,.4);assert.ok(distance(h,p)<2);
});
test('hand never exceeds its ten-unit leash after a command or owner relocation and avoids a wall',()=>{
 const {g,p}=quiet();g.map={bounds:WORLD,walls:[{x:44,y:5,w:.6,h:3}]};transform(g,p);Yan.command(g,p,{x:60,y:7});for(let i=0;i<240;i++){g.step(1/120);const h=Yan.hand(g,p);assert.ok(distance(h,p)<=10+1e-6);assert.equal(g.blocked(h.x,h.y,h.radius),false);}
 Object.assign(p,{x:60,y:10});run(g,.02);assert.ok(distance(Yan.hand(g,p),p)<=10+1e-6);
});
test('hand damage gains ten percent per extra ammo and reload upgrades shorten its attack interval',()=>{
 const {g,p}=quiet(),t=target(g,44);g.input.aim={x:48,y:7};p.augments=['magazine2'];p.upgrades.reload=3;transform(g,p);const amounts=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)amounts.push(n);return deal(a,b,n,o);};run(g,1.4);assert.ok(amounts.filter(n=>Math.abs(n-66)<1e-8).length>=3);close(p.state.ominous,0);
});
test('the hand hits target body edges inside radius 3.5 and leaves nearby targets beyond that radius untouched',()=>{
 const {g,p}=quiet();transform(g,p);const h=Yan.hand(g,p);Object.assign(h,{x:40,y:7,attached:false,goal:{x:40,y:7}});
 const inside=target(g,43.97),outside=target(g,43.99),oldRange=target(g,46);run(g,.55);
 assert.ok(inside.hp<10000);close(outside.hp,10000);close(oldRange.hp,10000);
});
test('distorted sword preview and actual damage share radius 7.5 including target body edges',()=>{
 const {g,p}=quiet(),inside=target(g,51.97),outside=target(g,51.99);transform(g,p);close(skillTargeting(g,p,'q').radius,7.5);
 g.cast(p,'q',{x:44,y:7});run(g,1.7);close(inside.hp,10000);close(outside.hp,10000);run(g,.06);
 assert.ok(inside.hp<10000);assert.ok(g.stat(inside,'stun'));close(outside.hp,10000);close(g.stat(outside,'stun'),0);
});
test('distorted Q confirms coordinates, waits 1.75 seconds, and hits a 7.5-radius area with stun',()=>{
 const {g,p}=quiet(),t=target(g,49,7);transform(g,p);assert.equal(skillTargeting(g,p,'q').confirm,true);g.cast(p,'q',{x:45,y:7});close(p.qCd,5);run(g,1.7);assert.equal(g.stat(t,'stun'),0);run(g,.06);assert.ok(g.stat(t,'stun'));assert.ok(t.hp<10000);
});
test('twenty-second expiry restores size, stats, abilities and removes the hand',()=>{
 const {g,p}=quiet(),hp=p.maxHp;transform(g,p);run(g,20.02);assert.equal(Yan.distorted(g,p),false);close(p.maxHp,hp);close(p.radius,.48);close(p.state.ominous,0);assert.equal(Yan.hand(g,p),undefined);assert.equal(Yan.abilityInfo(g,p).ultimate,'도시의 의지');
});
test('death and training champion changes clean summons and respawn to original size and stack state',()=>{
 const {g,p}=quiet(),t=target(g);transform(g,p);g.kill(p,t);assert.equal(g.corpses.at(-1).form,'yanDistorted');assert.equal(Yan.hand(g,p),undefined);g.time=p.respawnAt;g.step(.01);assert.ok(p.alive);close(p.radius,.48);close(p.state.ominous,0);
});
