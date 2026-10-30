import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { RULES, WORLD, WALLS } from '../src/data.js';
import { distance } from '../src/geometry.js';
import { skillTargeting } from '../src/targeting.js';
import * as Sora from '../src/sora.js';

const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function quiet(){const g=new Game('sora','jungle',{seed:61});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player;Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];return {g,p};}
function target(g,x=42,y=7,team=1){const t=g.makeChampion('faust',team,9);Object.assign(t,{armor:0,x,y,hp:10000,maxHp:10000,lastAttackAt:100,lastDamageAt:100});return t;}
function ego(g,p){p.state.unlock=5;g.cast(p,'r',p);}

test('one point absorbed by a shield consumes a directive; foreign hits and immunity do not',()=>{
 const {g,p}=quiet(),t=target(g),ally=target(g,40,10,0);Sora.mark(g,p,t,'ultimate');g.addShield(t,500,'test');
 g.deal(ally,t,1,{fixed:true});assert.ok(Sora.marked(g,p,t));t.invulnerableUntil=1;g.deal(p,t,1,{fixed:true});assert.ok(Sora.marked(g,p,t));close(p.state.unlock,0);
 t.invulnerableUntil=0;p.ammo=0;g.deal(p,t,1,{fixed:true});close(t.hp,10000);assert.equal(Sora.marked(g,p,t),false);close(p.state.unlock,1);close(p.ammo,1);g.deal(p,t,1,{fixed:true});close(p.state.unlock,1);
});
test('normal head smash uses a 1.33 offset and a 1.15 impact circle, including target body edges',()=>{
 const {g,p}=quiet(),inside=target(g,42.95),outside=target(g,42.97),side=target(g,41.33,8.62),sideOut=target(g,41.33,8.64),back=target(g,38),oldWide=target(g,44.5),near=target(g,40.6);
 assert.ok(g.attack(p,{x:50,y:7}));for(const t of [inside,side,near])close(10000-t.hp,198);for(const t of [outside,sideOut,back,oldWide])close(t.hp,10000);
 const fx=g.effects.find(e=>e.type==='soraShockwave');close(fx.x,41.33);close(fx.y,7);close(fx.r,1.15);assert.equal(g.effects.some(e=>['thrust','slash'].includes(e.type)),false);
});
test('the small head-smash circle follows diagonal aim and cannot hit through terrain',()=>{
 const {g,p}=quiet(),c={x:40+1.33/Math.SQRT2,y:7+1.33/Math.SQRT2},t=target(g,c.x,c.y),miss=target(g,42.5,7);g.attack(p,{x:45,y:12});assert.ok(t.hp<10000);close(miss.hp,10000);
 const f=quiet(),wallTarget=target(f.g,41.5);f.g.map={bounds:WORLD,walls:[{x:41,y:6,w:.2,h:2}]};f.g.attack(f.p,wallTarget);close(wallTarget.hp,10000);
});
test('range augment adds 1.3 to the normal impact offset and transformed circular range',()=>{
 const {g,p}=quiet();p.augments=['range7'];g.attack(p,{x:50,y:7});close(g.effects.find(e=>e.type==='soraShockwave').x,40+1.33+1.3);
 ego(g,p);p.attackCd=0;p.ammo=2;const front=target(g,42),back=target(g,38);g.attack(p,front);assert.ok(front.hp<10000&&back.hp<10000);close(g.attackRange(p),4);assert.equal(g.effects.at(-1).type,'soraClaw');
});
test('normal tactical keeps first-target-only damage and produces matching shockwave and temporary cracks',()=>{
 const {g,p}=quiet(),first=target(g,42),next=target(g,44);Sora.mark(g,p,first,'ultimate');p.ammo=0;g.cast(p,'q',{x:47,y:7});run(g,.3);
 assert.ok(first.hp<10000);close(next.hp,10000);close(p.ammo,2);close(p.state.unlock,1);close(g.shield(p),250);
 const wave=g.effects.find(f=>f.type==='soraShockwave'),cracks=g.effects.find(f=>f.type==='soraCracks');assert.ok(wave&&cracks);close(wave.r,1.1424);close(cracks.r,wave.r);close(wave.x,first.x);close(cracks.maxLife,1.4);run(g,1.5);assert.equal(g.effects.some(f=>f.type==='soraCracks'),false);
});
test('only transformed tactical quick-casts at triple dash speed and releases immunity on arrival',()=>{
 const normal=quiet();assert.equal(skillTargeting(normal.g,normal.p,'q').confirm,true);normal.g.cast(normal.p,'q',{x:46.5,y:7});close(normal.p.motion.speed,RULES.dashSpeed);
 const {g,p}=quiet();ego(g,p);assert.equal(skillTargeting(g,p,'q').confirm,false);g.cast(p,'q',{x:46.5,y:7});close(p.motion.speed,24);run(g,.21);assert.ok(p.motion);run(g,.03);assert.equal(p.motion,undefined);close(p.x,45.6);assert.ok(p.invulnerableUntil<=g.time);close(p.state.egoQCharges,1);
});
test('follow-up cuts expand lateral width thirty percent and longitudinal length ten percent',()=>{
 const {g,p}=quiet();ego(g,p);const wide=target(g,43,8.51),out=target(g,43,8.53),behind=target(g,39.25),beyond=target(g,39.23),cutIds=new Set(),deal=g.deal.bind(g);g.deal=(a,t,n,o)=>{if(a===p&&n===45)cutIds.add(t.id);return deal(a,t,n,o);};g.cast(p,'q',{x:46,y:7});run(g,.28);
 const fx=g.effects.find(f=>f.type==='soraTrail');assert.ok(fx);close(fx.width,1.04);close(distance(fx,fx.to),6.16);close(fx.x,39.72);close(fx.to.x,45.88);
 assert.ok(cutIds.has(wide.id)&&cutIds.has(behind.id));assert.equal(cutIds.has(out.id),false);assert.equal(cutIds.has(beyond.id),false);close(out.hp,10000);close(g.stat(wide,'slow'),.3);
});
test('triple-speed dash still stops at a thin wall and a building with no lasting invulnerability',()=>{
 for(const building of [false,true]){
  const {g,p}=quiet();ego(g,p);if(building)g.entity({kind:'tower',team:1,x:43,y:7,radius:.9,hp:10000,maxHp:10000});else g.map={bounds:WORLD,walls:[{x:43,y:6,w:.15,h:2}]};
  g.cast(p,'q',{x:46.5,y:7});run(g,.3);assert.equal(p.motion,undefined);assert.ok(p.x<43);assert.equal(g.blocked(p.x,p.y,p.radius),false);assert.ok(p.invulnerableUntil<=g.time);const trail=g.effects.find(f=>f.type==='soraTrail');assert.ok(trail.to.x<43);
 }
});
test('a wall blocks the widened after-cuts as well as the dash itself',()=>{
 const {g,p}=quiet(),w=WALLS[0];Object.assign(p,{x:w.x-1.5,y:w.y+w.h/2});const t=target(g,w.x+w.w+.5,p.y);ego(g,p);g.cast(p,'q',{x:t.x,y:t.y});run(g,1.5);close(t.hp,10000);assert.ok(p.x<w.x);
});
