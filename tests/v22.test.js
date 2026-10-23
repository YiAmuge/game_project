import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,damageFormula } from '../src/game.js';
import { WORLD,RUNTIME_CHAMPIONS } from '../src/data.js';
import { distance } from '../src/geometry.js';
import { stackInfo } from '../src/overlays.js';
import { skillTargeting } from '../src/targeting.js';
import * as T from '../src/training.js';
import * as Yan from '../src/yan.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function quiet(key){const g=new Game(key,'top',{seed:22});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player;Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.wave=100;g.minionQueue=[];g.map={bounds:WORLD,walls:[]};return {g,p};}
function target(g,x=44,y=7,team=1,key='faust'){const t=g.makeChampion(key,team,9);Object.assign(t,{x,y,maxHp:100000,hp:100000,level:10,lastAttackAt:100,lastDamageAt:100});return t;}
const damage=(g,e,n)=>damageFormula(n,RUNTIME_CHAMPIONS[e.key].power,1)*g.powerScale(e);
test('Ishmael winds up for .235 seconds, aims a fixed direction, then fires one speed-28 range-16 harpoon',()=>{
 const {g,p}=quiet('ishmael');g.cast(p,'r',{x:60,y:7});assert.equal(g.projectiles.length,0);close(p.channelUntil,.235);close(g.speed(p),0);run(g,.225);assert.equal(g.projectiles.length,0);run(g,.017);const b=g.projectiles[0];assert.ok(b);close(b.speed,28);close(b.remaining+distance(b.origin,b),16);close(b.dx,1);close(skillTargeting(g,p,'r').range,16);
});
test('Ishmael hits and hooks only the first champion, leaving the champion behind untouched',()=>{
 const {g,p}=quiet('ishmael'),a=target(g,45),b=target(g,49);g.cast(p,'r',b);run(g,.42);assert.ok(a.motion?.ishmaelOwner===p.id);assert.equal(a.state.harpoon.source,p.id);close(b.hp,100000);assert.equal(g.projectiles.length,0);close(g.speed(p),0);run(g,.3);assert.equal(p.state.ishmaelCast,undefined);close(distance(p,a),p.radius+a.radius+.15);close(b.hp,100000);
});
test('Ishmael still passes minions before the first champion and stops after that champion',()=>{
 const {g,p}=quiet('ishmael');const m=g.entity({kind:'minion',team:1,x:42,y:7,maxHp:1000,radius:.3}),a=target(g,45),b=target(g,48);g.cast(p,'r',b);run(g,.6);assert.ok(m.hp<1000);assert.ok(a.hp<100000);close(b.hp,100000);
});
test('interrupted windup, terrain collision, a miss and victim death all release Ishmael movement',()=>{
 for(const mode of ['stun','wall','miss','death']){const {g,p}=quiet('ishmael'),t=target(g,mode==='death'?45:60);if(mode==='wall')g.map.walls=[{x:43,y:3,w:.5,h:8}];g.cast(p,'r',t);if(mode==='stun')g.status(p,'stun',1,1);if(mode==='death'){run(g,.42);g.kill(t,p);}run(g,1.3);assert.equal(p.state.ishmaelCast,undefined,mode);assert.ok(g.speed(p)>0,mode);}
});
test('Ishmael shock visual carries the moving source while damage resolves at the current center',()=>{
 const {g,p}=quiet('ishmael'),t=target(g,43);g.cast(p,'q',p);p.x=42;g.cast(p,'q',p);const fx=g.effects.find(f=>f.type==='ishmaelShock');assert.equal(fx.source,p.id);close(fx.x,42);assert.ok(t.hp<100000);p.x=45;assert.equal(g.units.find(e=>e.id===fx.source).x,45);
});
test('Outis followup faces the dash direction, excludes the direct victim, and does not hit enemies behind',()=>{
 const {g,p}=quiet('outis'),victim=target(g,43),ahead=target(g,47),behind=target(g,38);g.cast(p,'r',victim);run(g,.8);close(100000-victim.hp,damage(g,p,450)*1.25);close(100000-ahead.hp,damage(g,p,220));close(behind.hp,100000);assert.ok(p.x<41);
});
test('Honglu insight uses a text-only countdown, not fractional stack counts',()=>{const {g,p}=quiet('honglu');g.cast(p,'q',p);const s=stackInfo(p,g);assert.equal(s.textOnly,true);assert.equal(s.label,'통찰 1.2s');assert.equal(s.max,undefined);run(g,.5);assert.match(stackInfo(p,g).label,/통찰 0\.7s/);});
test('Meursault square reaches its far corners and excludes targets past the full width',()=>{
 const {g,p}=quiet('meursault'),inside=target(g,42.8,8.6),outside=target(g,42,8.9);g.attack(p,{x:45,y:7});assert.ok(inside.hp<100000);close(outside.hp,100000);close(g.attackRange(p),2.6);
});
test('Meursault R reaches eight and recovers from a 99-percent movement penalty over .275 seconds',()=>{
 const {g,p}=quiet('meursault'),t=target(g,47.9),base=g.speed(p);g.cast(p,'r',t);assert.ok(t.hp<100000);close(skillTargeting(g,p,'r').range,8);close(g.speed(p)/base,.01);g.time=.1375;close(g.speed(p)/base,.505);g.time=.275;close(g.speed(p),base);
});
test('Meursault resolve immunity cannot bypass his own short casting movement penalty',()=>{const {g,p}=quiet('meursault');g.cast(p,'q',p);const base=g.speed(p);g.cast(p,'r',{x:48,y:7});close(g.speed(p)/base,.01);});
test('Ryoshu damaging dash leaves sword cuts and R creates a short-lived fixed attack field',()=>{const {g,p}=quiet('ryoshu');g.cast(p,'q',{x:45,y:7});assert.ok(p.invulnerableUntil>g.time);run(g,.1);assert.ok(g.effects.some(f=>f.type==='ryoshuTrail'));run(g,.5);g.cast(p,'r',{x:46,y:7});const fx=g.effects.find(f=>f.type==='ryoshuStorm');close(fx.r,2.6);close(fx.x,p.x);run(g,.8);assert.ok(!g.effects.includes(fx));});
test('Marton fairy persists through the channel and only then creates the outward explosion',()=>{const {g,p}=quiet('marton');g.cast(p,'r',p);assert.ok(p.state.fairy);assert.ok(!g.effects.some(f=>f.type==='martonExplosion'));run(g,2.4);assert.ok(p.state.fairy);run(g,.11);assert.equal(p.state.fairy,undefined);assert.ok(g.effects.some(f=>f.type==='martonExplosion'&&f.r===6.8));});
test('Ppui refuses repeated empowerment for 2.5 seconds without spending ammo or attack cooldown',()=>{
 const {g,p}=quiet('ppui'),a=target(g,44,7,0);g.attack(p,a);p.attackCd=0;p.ammo=1;assert.equal(g.attack(p,a),false);close(p.ammo,1);close(p.attackCd,0);run(g,2.51);p.attackCd=0;p.ammo=1;assert.ok(g.attack(p,a));close(a.state.ppuiEmpowerReady,g.time+2.5);
});
test('the empowerment lock is shared by duplicate Ppui and allied attacks never launch support nails',()=>{
 const {g,p}=quiet('ppui'),a=target(g,42,7,0,'meursault'),other=target(g,40,9,0,'ppui'),enemy=target(g,44);other.level=1;other.ammo=1;g.attack(p,a);assert.equal(g.attack(other,a),false);g.attack(a,enemy);run(g,.25);assert.equal(g.projectiles.filter(b=>b.theme==='ppui').length,0);
});
test('enemy infinite dummy records uncapped actual damage after armor and shields, total and rolling DPS',()=>{
 const g=new Game('faust','top',{mode:'training'}),t=g.champions().find(e=>e.trainingDummy?.meter?.kind==='damage');g.units=[g.player,t];g.practice.lineStopped=true;const hp=t.hp;close(g.deal(g.player,t,25000,{fixed:true}),25000);close(t.hp,hp);close(T.metric(g,t).total,25000);g.addShield(t,100,'test');g.deal(g.player,t,150,{fixed:true});close(T.metric(g,t).last,50);close(T.metric(g,t).perSecond,25050);g.time=1.01;close(T.metric(g,t).perSecond,0);close(T.metric(g,t).total,25050);assert.ok(t.alive);
});
test('ally infinite dummy accepts unlimited full-health healing, separates overlapping skill totals and ignores natural regen',()=>{
 const g=new Game('ppui','top',{mode:'training'}),p=g.player,t=g.champions().find(e=>e.trainingDummy?.meter?.kind==='healing');close(g.heal(p,t,500,false,{healingKey:'old',startedAt:0}),500);g.time=.2;g.heal(p,t,300,false,{healingKey:'new',startedAt:.2});g.heal(p,t,100,false,{healingKey:'old',startedAt:0});close(T.metric(g,t).last,300);g.heal(p,t,200,false,{healingKey:'new',startedAt:.2});close(T.metric(g,t).total,1100);close(T.metric(g,t).last,500);close(t.hp,t.maxHp);g.heal(null,t,99,false,{natural:true});close(T.metric(g,t).total,1100);g.time=1.3;close(T.metric(g,t).perSecond,0);
});
test('Ppui continuous healing is measured as one healing skill, without overheal being discarded',()=>{
 const g=new Game('ppui','top',{mode:'training'}),p=g.player,t=g.champions().find(e=>e.trainingDummy?.meter?.kind==='healing');g.practice.lineStopped=true;g.units=[p,t];Object.assign(p,{x:21,y:40});g.attack(p,t);run(g,1);const m=T.metric(g,t);assert.ok(m.total>100);close(m.last,m.total);close(t.hp,t.maxHp);
});
test('Yi shields do not accumulate healing on an infinite friendly dummy',()=>{const g=new Game('yi','top',{mode:'training'}),p=g.player,t=g.champions().find(e=>e.trainingDummy?.meter?.kind==='healing');g.practice.lineStopped=true;g.units=[p,t];g.addShield(t,500,`yi-${p.id}`);t.shields.at(-1).passive='yi';run(g,1);close(T.metric(g,t).total,0);close(T.metric(g,t).last,0);});
test('practice hazard deals exactly 3.3 percent maximum HP per second and still respects invincibility',()=>{const g=new Game('faust','top',{mode:'training'}),p=g.player;g.units=[p];g.practice.lineStopped=true;Object.assign(p,{x:T.HAZARD.x+1,y:T.HAZARD.y+1,lastAttackAt:100,lastDamageAt:100});const hp=p.hp;run(g,1);close(hp-p.hp,p.maxHp*.033);g.practice.invincible=true;const before=p.hp;run(g,1);close(p.hp,before);});
test('summon numbering preserves creation order even after removal, duplicates and dead units remain individually selectable',()=>{
 const g=new Game('faust','top',{mode:'training'}),a=T.summon(g,'marton',0,{x:30,y:35}),b=T.summon(g,'marton',1,{x:34,y:35});assert.match(T.summonLabel(a),/마튼 1 · 아군/);assert.match(T.summonLabel(b),/마튼 2 · 적군/);const kills=[...g.kills],first=g.firstBlood;assert.ok(T.removeSummoned(g,a.id));assert.deepEqual(g.kills,kills);assert.equal(g.firstBlood,first);assert.ok(!g.units.some(e=>e.kind==='bait'));const c=T.summon(g,'marton',0,{x:30,y:35});close(c.summonNumber,3);b.alive=false;assert.ok(T.summoned(g).includes(b));assert.match(T.summonLabel(b),/사망/);assert.equal(T.removeSummoned(g,g.player.id),false);
});
test('selected summon removal releases grabs and tethers and removes only its spells and owned summons',()=>{
 const g=new Game('queequeg','top',{mode:'training'}),p=g.player;Object.assign(p,{x:30,y:35});const a=T.summon(g,'yan',0,{x:32,y:35}),b=T.summon(g,'marton',1,{x:35,y:35});g.cast(p,'q',a);a.state.ominous=6;g.cast(a,'r',a);assert.ok(Yan.hand(g,a));g.zones.push({source:a,until:100},{source:b,until:100});g.schedule(a,1,()=>assert.fail('removed source event'));g.bullet(a,{x:1,y:0},100,10);assert.ok(T.removeSummoned(g,a.id));assert.equal(p.state.tether,undefined);assert.ok(!g.units.some(e=>e.owner===a.id));assert.ok(!g.events.some(e=>e.source===a));assert.ok(!g.projectiles.some(e=>e.source===a));assert.ok(g.zones.some(z=>z.source===b));assert.ok(!g.zones.some(z=>z.source===a));assert.ok(g.units.includes(p)&&g.units.includes(b));
});
test('removing an armed Alisa or Marton causes no death effects, rewards or first blood; remove-all retains the original map',()=>{
 const g=new Game('faust','top',{mode:'training'}),original=[...g.units];const a=T.summon(g,'alisa',1,{x:30,y:35});a.state.heat=5;g.cast(a,'r',a);T.summon(g,'marton',0,{x:35,y:35});const gold=g.player.gold;assert.ok(T.removeSummoned(g));assert.deepEqual(g.units,original);assert.equal(g.firstBlood,null);close(g.player.gold,gold);assert.ok(!g.events.some(e=>e.source===a));assert.equal(T.removeSummoned(g),false);
});
test('removing a targeted champion cancels an aiming Gubo and leaves a following Hohenheim zone waiting',()=>{
 const g=new Game('gubo','top',{mode:'training'}),p=g.player;Object.assign(p,{x:30,y:35});const a=T.summon(g,'faust',1,{x:34,y:35});g.cast(p,'r',a);const h=T.summon(g,'hohenheim',0,{x:32,y:37});g.zones.push({kind:'electricDevice',source:h,targetId:a.id,until:100});T.removeSummoned(g,a.id);assert.equal(p.state.guboAim,undefined);close(p.channelUntil,g.time);assert.ok(g.zones.at(-1).waitingForTarget);
});
