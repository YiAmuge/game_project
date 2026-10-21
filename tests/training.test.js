import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WALLS,UPGRADES,RUNTIME_CHAMPIONS } from '../src/data.js';
import { blocked,distance } from '../src/geometry.js';
import * as T from '../src/training.js';
import * as Sora from '../src/sora.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*60);i++)g.step(1/60);};
const training=(key='faust')=>new Game(key,'bottom',{mode:'training',seed:54});

test('training has one player, five champion dummies, requested seven creeps and two lane towers',()=>{
 const g=training();assert.ok(g.training);assert.equal(g.champions().length,6);assert.equal(g.champions().filter(c=>!c.player&&!c.trainingDummy).length,0);
 assert.deepEqual(g.units.filter(e=>e.kind==='neutral').map(e=>e.camp).sort(),['central','central','central','central','amplify','blessing','boss'].sort());assert.equal(g.units.filter(e=>e.kind==='tower').length,2);assert.equal(g.units.filter(e=>e.kind==='core').length,0);
 assert.ok(T.AREAS[0].y>T.AREAS[2].y&&T.AREAS[2].y>T.AREAS[4].y);
});
test('training terrain is independent of the match walls and keeps its rectangular boundary',()=>{
 const g=training(),match=new Game('faust','top',{seed:54}),w=WALLS.find(w=>!g.blocked(w.x+w.w/2,w.y+w.h/2));assert.ok(w);
 assert.ok(match.blocked(w.x+w.w/2,w.y+w.h/2));assert.equal(g.blocked(w.x+w.w/2,w.y+w.h/2),false);assert.ok(g.blocked(-1,20));assert.ok(g.blocked(41.5,18));
 assert.equal(blocked(w.x+w.w/2,w.y+w.h/2),true);
});
test('zone one fountain and hazard are separate, spawning is safe, and the hazard deals one percent per second',()=>{
 const g=training(),p=g.player,h=T.HAZARD;assert.ok(T.SPAWN.x<h.x-2.5);run(g,1);close(p.hp,p.maxHp);
 Object.assign(p,{x:h.x+2,y:h.y+2});p.lastDamageAt=100;p.lastAttackAt=100;const hp=p.hp;run(g,1);close(hp-p.hp,p.maxHp*.01);
 g.recall(p);run(g,3);assert.equal(p.recall,undefined); // The damaging floor cancels recall.
 Object.assign(p,{x:10,y:34});g.recall(p);run(g,3.05);close(p.x,T.SPAWN.x);close(p.y,T.SPAWN.y);
});
test('infinite dummies survive lethal damage, count as champions and reset after displacement',()=>{
 const g=training(),t=g.champions(1).find(e=>e.trainingDummy.infinite),p=g.player;Object.assign(p,{x:t.x-3,y:t.y});g.deal(p,t,1e9,{fixed:true});assert.ok(t.alive);assert.ok(t.hp>=1);assert.ok(p.totalDamage>0);run(g,.02);close(t.hp,t.maxHp);
 t.x+=13;run(g,.02);close(t.x,t.trainingDummy.home.x);close(t.y,t.trainingDummy.home.y);
});
test('duel dummies remain ten apart, exchange 100 damage projectiles, and respawn after five seconds',()=>{
 const g=training(),a=g.champions().find(e=>e.trainingDummy?.mode==='duel'),b=g.units.find(e=>e.id===a.trainingDummy.opponent);close(distance(a,b),10);assert.ok(a.range>10);
 run(g,1.1);close(a.hp,2900);close(b.hp,2900);g.kill(a,g.player);const at=g.time;run(g,4.9);assert.equal(a.alive,false);run(g,.12);assert.ok(a.alive);assert.ok(a.hp>0);close(a.x,a.trainingDummy.home.x);assert.ok(g.time>=at+5);
});
test('moving dummy routes around its obstacle, remains inside its patrol region, and respawns',()=>{
 const g=training(),t=g.champions().find(e=>e.trainingDummy?.mode==='patrol');let side=0,maxY=t.y;
 for(let i=0;i<1200;i++){g.step(1/60);side=Math.max(side,Math.abs(t.x-62));maxY=Math.max(maxY,t.y);assert.equal(g.blocked(t.x,t.y,t.radius),false);assert.ok(t.y>=17.5&&t.y<=28.5);}
 assert.ok(side>1.4&&maxY>27.5);g.kill(t,g.player);run(g,5.02);assert.ok(t.alive);close(t.maxHp,1000);
});
test('finite dummy takedowns count as champion kills and activate takedown passives',()=>{
 const g=training('rodya'),p=g.player,t=g.champions(1).find(e=>!e.trainingDummy.infinite);p.qCd=10;p.rCd=20;g.deal(p,t,10000,{fixed:true});
 assert.equal(p.kills,1);close(p.qCd,6);close(p.rCd,16);close(t.respawnAt-g.time,5);assert.equal(g.corpses.length,0);
});
test('destroying either lane tower freezes its minions, towers and waves until reset',()=>{
 const g=training();run(g,4.5);assert.ok(g.units.some(e=>e.kind==='minion'));const tower=g.towers(1)[0];g.kill(tower,g.player);assert.ok(g.practice.lineStopped);
 const minions=g.units.filter(e=>e.kind==='minion'),positions=minions.map(e=>({x:e.x,y:e.y})),wave=g.wave;run(g,27);assert.equal(g.wave,wave);minions.forEach((e,i)=>{close(e.x,positions[i].x);close(e.y,positions[i].y);});assert.equal(g.projectiles.filter(p=>p.source.trainingLane).length,0);
 T.resetLane(g);assert.equal(g.towers(0).length+g.towers(1).length,2);assert.equal(g.units.filter(e=>e.kind==='minion').length,0);run(g,2.9);assert.equal(g.wave,0);run(g,.12);assert.equal(g.wave,1);assert.equal(g.practice.lineStopped,false);
});
test('training shop is free anywhere and while dead, and sell-all removes upgrades and augments',()=>{
 const g=training(),p=g.player;Object.assign(p,{x:40,y:23,gold:0,lastCombat:0});assert.ok(!g.inSpawn(p));
 for(let i=0;i<3;i++)assert.ok(g.buy(p,'power'));assert.ok(g.buyAugment(p,'power15'));assert.ok(g.sellAugment(p,'power15'));close(p.gold,0);g.kill(p,p);
 assert.ok(g.canUpgrade(p));for(let i=0;i<3;i++)assert.ok(g.buy(p,'health'));assert.ok(g.buyAugment(p,'health15'));T.sellAll(g);assert.ok(UPGRADES.every(u=>p.upgrades[u.key]===0));assert.equal(p.augments.length,0);close(p.gold,0);
});
test('training toggles honor invincibility, finite/mind ammunition and zero cooldowns without leaking to matches',()=>{
 for(const key of ['faust','rudolph','sora']){
  const g=training(key),p=g.player;g.practice.invincible=true;const enemy=g.champions(1)[0];assert.equal(g.deal(enemy,p,1000,{fixed:true}),0);g.status(p,'stun',1,5,enemy);assert.equal(g.stat(p,'stun'),0);
  g.practice.infiniteAmmo=true;g.practice.noCooldown=true;p.ammo=0;p.qCd=p.rCd=5;T.refreshOptions(g);close(p.ammo,g.ammoCap(p));close(p.qCd,0);close(p.rCd,0);
  if(key==='sora'){p.state.unlock=5;g.cast(p,'r',p);p.state.egoQCharges=0;T.refreshOptions(g);close(p.state.egoQCharges,2);}
 }
 const match=new Game('faust','top',{seed:54});assert.equal(match.training,false);assert.equal(T.sellAll(match),false);
});
test('manual death stays dead until revived, and champion changes preserve build but clean prior spell objects',()=>{
 const g=training('dongrang'),p=g.player;g.award(p,1000,0);g.buy(p,'power');const level=p.level;T.deathOrRespawn(g);assert.equal(p.alive,false);run(g,6);assert.equal(p.alive,false);T.deathOrRespawn(g);assert.ok(p.alive);close(p.x,T.SPAWN.x);close(p.hp,p.maxHp);
 g.cast(p,'q',{x:14,y:40});assert.ok(g.zones.length);assert.ok(T.changeChampion(g,'sora'));assert.equal(g.player.key,'sora');assert.equal(g.player.level,level);assert.equal(g.player.upgrades.power,1);assert.equal(g.units.filter(e=>e.player).length,1);assert.equal(g.zones.filter(e=>e.source===p).length,0);close(g.player.hp,g.player.maxHp);
 for(const key of Object.keys(RUNTIME_CHAMPIONS)){assert.ok(T.changeChampion(g,key));assert.ok(Number.isFinite(g.player.maxHp));}
});
test('map teleport accepts clear destinations while rejecting walls, units and map exterior',()=>{
 const g=training();assert.equal(T.teleport(g,{x:62,y:22.5}),false);assert.equal(T.teleport(g,{x:-2,y:40}),false);const t=g.champions(1)[0];assert.equal(T.teleport(g,t),false);
 assert.ok(T.teleport(g,{x:50,y:26}));close(g.player.x,50);close(g.player.y,26);
});
test('training passes twenty minutes without a result or replacing central creeps',()=>{
 const g=training();g.time=1200;g.step(.02);g.step(0);assert.equal(g.winner,null);assert.equal(g.units.filter(e=>e.camp==='central').length,4);assert.equal(g.units.filter(e=>e.camp==='boss').length,1);
});
