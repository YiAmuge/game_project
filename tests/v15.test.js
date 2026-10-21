import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import * as Sora from '../src/sora.js';
import { gregorStack } from '../src/skills.js';
import { stackInfo } from '../src/overlays.js';
import { carried } from '../src/attachments.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function quiet(key){const g=new Game(key,'top',{seed:53});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player;Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];return {g,p};}
function target(g,x=42,y=7,team=1){const t=g.makeChampion('faust',team,9);Object.assign(t,{x,y,lastAttackAt:100,lastDamageAt:100});return t;}
test('normal Sora gets one ammo per consumed directive; EGO consumes the same marks without refilling',()=>{
 const {g,p}=quiet('sora'),t=target(g);p.ammo=0;Sora.mark(g,p,t,'ultimate');g.deal(p,t,t.maxHp*.2,{fixed:true});close(p.ammo,1);
 p.state.unlock=5;g.cast(p,'r',p);p.ammo=0;Sora.mark(g,p,t,'ultimate');g.deal(p,t,t.maxHp*.2,{fixed:true});close(p.ammo,0);
});
test('normal Sora tactical has a wider contact zone and grants a flat two-second 250 shield on hit',()=>{
 const {g,p}=quiet('sora'),t=target(g,43,8.55);g.cast(p,'q',{x:47,y:7});run(g,.5);assert.ok(t.hp<t.maxHp);const shield=p.shields.find(s=>s.source===`sora-dash-${p.id}`);assert.ok(shield);close(shield.value,250);assert.ok(shield.until>2&&shield.until<=2.5);run(g,2);assert.equal(g.shield(p),0);
});
test('EGO tactical stores two independent uses and recharges one every five seconds',()=>{
 const {g,p}=quiet('sora');p.state.unlock=5;g.cast(p,'r',p);assert.equal(p.state.egoQCharges,2);close(g.cooldown(p,'q'),5);
 g.cast(p,'q',{x:41,y:7});run(g,.2);close(p.state.egoQCharges,1);close(p.qCd,0);g.cast(p,'q',{x:42,y:7});run(g,.2);close(p.state.egoQCharges,0);assert.equal(g.cast(p,'q',{x:43,y:7}),false);assert.match(stackInfo(p,g).label,/0\/2/);
 run(g,4.61);close(p.state.egoQCharges,1);close(p.qCd,0);run(g,5);close(p.state.egoQCharges,2);assert.equal(p.state.egoQReady,Infinity);
});
test('Kim cannot basic while carrying, moves ten percent slower, and releases immediately on ultimate',()=>{
 const {g,p}=quiet('kim'),t=target(g),speed=g.speed(p);g.cast(p,'q',t);run(g,.2);assert.equal(carried(g,p),t);close(g.speed(p),speed*.9);p.attackCd=0;p.ammo=2;assert.equal(g.attack(p,t),false);close(p.ammo,2);
 assert.ok(g.cast(p,'r',{x:48,y:7}));assert.equal(carried(g,p),null);assert.equal(g.stat(t,'stun'),0);close(g.speed(p),speed);close(p.channelUntil-g.time,.5);
});
test('Kim follow-up slash gets eight percent more reach, 210 damage and a 100 shield',()=>{
 const {g,p}=quiet('kim'),t=target(g,44.3,7);p.state.followSlashUntil=1;g.attack(p,{x:48,y:7});close(t.maxHp-t.hp,210*.9);close(p.shields.find(s=>s.source===`draw-${p.id}`).value,100);close(g.effects.findLast(e=>e.type==='slash').r,3.744*1.08);
});
test('Kim counter waves use the same direction with .125-second cadence and four-and-a-half times width',()=>{
 const {g,p}=quiet('kim'),t=target(g),shots=[],bullet=g.bullet.bind(g);g.bullet=(...a)=>{shots.push({at:g.time,d:a[1],width:a[4].width,n:a[2]});return bullet(...a);};g.cast(p,'r',{x:48,y:7});g.deal(t,p,100,{fixed:true});assert.equal(shots.length,1);run(g,.116);assert.equal(shots.length,1);run(g,.27);assert.equal(shots.length,4);
 shots.forEach((s,i)=>{close(s.at,i*.125,.009);close(s.d.x,1);close(s.d.y,0);close(s.width,.42*4.5);close(s.n,338);});
});
test('Ppui direct and allied-hit basics fire exactly three 65-damage nails per attack',()=>{
 const {g,p}=quiet('ppui'),t=target(g),shots=[],bullet=g.bullet.bind(g);g.bullet=(...a)=>{if(a[0]===p)shots.push(a);return bullet(...a);};g.attack(p,t);run(g,.22);assert.equal(shots.length,3);assert.ok(shots.every(a=>a[2]===65));
 const a=target(g,41,8,0);p.attackCd=0;p.ammo=1;g.attack(p,a);shots.length=0;g.attack(a,t);run(g,.22);assert.equal(shots.length,3);assert.ok(shots.every(a=>a[2]===65&&a[4].nonLethal&&a[4].proc===false));
});
test('Ppui tactical heals its complete group for 450 plus thirty percent current combat power',()=>{
 const {g,p}=quiet('ppui'),a=target(g,42,7,0),b=target(g,43,8,0);a.hp=b.hp=1000;g.cast(p,'q',a);const expected=(450+.3*g.combatPower(p))*.82*.9;run(g,2);close(a.hp-1000,expected);close(b.hp-1000,expected);
});
test('Ppui ultimate heals exactly forty percent of actual health damage across its five waves',()=>{
 const {g,p}=quiet('ppui'),t=target(g,43,7);p.hp-=1000;const hp=p.hp;g.cast(p,'r',t);run(g,2.1);close(p.hp-hp,(t.maxHp-t.hp)*.4);
});
test('Gregor mutation expands range and stride, grants one-second attack stride and has a fifteen-second gate',()=>{
 const {g,p}=quiet('gregor'),range=g.attackRange(p),speed=g.speed(p);gregorStack(g,p,12);close(g.attackRange(p)/range,1.3);close(g.speed(p)-speed,speed*.1);close(p.state.mutateReady,15);g.attack(p,{x:48,y:7});close(g.speed(p)-speed,speed*.2);run(g,1.01);close(g.speed(p)-speed,speed*.1);run(g,4);gregorStack(g,p,12);assert.equal(g.buff(p,'mutant'),false);run(g,10);gregorStack(g,p,12);assert.ok(g.buff(p,'mutant'));
});
test('Gregor infestation hits radius 5.5 and reduces max health up to fifteen percent, restoring after three seconds',()=>{
 const {g,p}=quiet('gregor'),t=target(g,45.3,7),hp=t.maxHp;gregorStack(g,p,12);run(g,2.51);assert.equal(t.plague.stacks,5);close(t.maxHp,hp*.85);assert.ok(t.hp<=t.maxHp);
 p.x=30;run(g,3.02);assert.equal(t.plague,undefined);close(t.maxHp,hp);
});
test('Gregor tactical now pulls near and far enemies to the same front position using visible motion',()=>{
 for(const x of [41.3,44]){const {g,p}=quiet('gregor'),t=target(g,x,7);g.cast(p,'q',{x:48,y:7});assert.ok(t.motion?.forced);assert.equal(t.x,x);run(g,1);close(t.x,41.11);}
});
test('Gregor ultimate uses two doubled cones and two 250 base heals',()=>{
 const {g,p}=quiet('gregor'),t=target(g,46,7);p.hp-=1500;const hp=p.hp;g.cast(p,'r',{x:48,y:7});run(g,.4);assert.ok(t.hp<t.maxHp);close(p.hp-hp,500*.82*.9);assert.ok(g.effects.filter(e=>e.type==='slash').every(e=>e.r===7&&e.spread===3.6));
});
