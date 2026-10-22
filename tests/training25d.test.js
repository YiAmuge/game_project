import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { Camera25D } from '../src/camera-25d.js';
import { TRAINING_25D as MAP } from '../src/training-25d-map.js';
import * as T from '../src/training.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const training=key=>new Game(key||'faust','bottom',{seed:51,mode:'training25d'});
const run=(g,s)=>{for(let i=0;i<Math.ceil(s*30);i++)g.step(1/30);};

test('2.5D has separate geometry, spawn, targets and per-session collision data',()=>{
 const g=training(),legacy=new Game('faust','bottom',{mode:'training'}),other=training();
 assert.equal(g.training,true);assert.equal(g.training25d,true);assert.equal(legacy.training25d,false);
 assert.equal(g.map.id,'training-25d');assert.notDeepEqual(g.map.walls,legacy.map.walls);
 assert.notEqual(g.map,other.map);assert.notEqual(g.map.walls[0],other.map.walls[0]);
 assert.deepEqual({x:g.player.x,y:g.player.y},MAP.spawn);assert.deepEqual({x:legacy.player.x,y:legacy.player.y},T.SPAWN);
 assert.equal(g.champions().length,6);assert.equal(g.units.filter(e=>e.kind==='neutral').length,7);
 assert.ok(g.champions().filter(e=>e.trainingDummy?.infinite).every(e=>e.x<T.hazard(g).x));
 assert.deepEqual(T.AREAS[0],{id:1,x:1,y:32,w:39,h:13,name:'회복 · 피해 실험',color:'#688c79'});
});
test('orthographic ray picking round-trips world positions on desktop, ultrawide and mobile',()=>{
 const c=new Camera25D();
 for(const [w,h] of [[1440,900],[1920,1080],[2560,1080],[390,844],[844,390]])for(const player of [MAP.spawn,{x:41,y:23},{x:80,y:2}]){
  c.update(w,h,player);const center=c.worldToScreen(player,.85);close(center.x,w/2);close(center.y,h/2);
  for(const [dx,dy] of [[0,0],[4,-3],[-7,5],[1,10]]){const p={x:player.x+dx,y:player.y+dy},s=c.worldToScreen(p),back=c.screenToWorld(s.x,s.y);close(back.x,p.x);close(back.y,p.y);}
  assert.ok(c.bounds.w<=32.0001&&c.bounds.w>0&&c.bounds.h>0);
  const top=c.screenToWorld(0,0),bottom=c.screenToWorld(w,h);close(c.bounds.x,top.x);close(c.bounds.y,top.y);close(c.bounds.h,bottom.y-top.y);
 }
});
test('stationary cursor tracks the player and camera changes do not affect combat coordinates',()=>{
 const c=new Camera25D();c.update(1440,900,{x:10,y:20});const a=c.screenToWorld(900,400);
 c.update(1440,900,{x:15,y:23});const b=c.screenToWorld(900,400);close(b.x-a.x,5);close(b.y-a.y,3);
 const g=training('sora'),t=g.champions(1).find(e=>e.trainingDummy?.infinite);Object.assign(g.player,{x:t.x-1.2,y:t.y});c.update(1440,900,g.player);
 const s=c.worldToScreen(t),aim=c.screenToWorld(s.x,s.y);const before=T.metric(g,t).total;
 assert.ok(g.attack(g.player,aim));run(g,.3);assert.ok(T.metric(g,t).total>before);
});
test('2.5D options, death, revival, recall and champion replacement stay inside their map',()=>{
 const g=training(),p=g.player;g.practice.noCooldown=true;g.practice.infiniteAmmo=true;g.practice.invincible=true;
 p.qCd=p.rCd=50;p.ammo=0;T.refreshOptions(g);close(p.qCd,0);close(p.ammo,g.ammoCap(p));
 assert.ok(g.buy(p,'power'));assert.ok(T.teleport(g,{x:18,y:35}));assert.ok(g.recall(p));run(g,3.1);close(p.x,MAP.spawn.x);close(p.y,MAP.spawn.y);
 assert.ok(T.deathOrRespawn(g));assert.equal(p.alive,false);assert.ok(T.deathOrRespawn(g));close(p.x,MAP.spawn.x);close(p.y,MAP.spawn.y);
 assert.ok(T.changeChampion(g,'rudolph'));assert.equal(g.training25d,true);assert.equal(g.player.upgrades.power,1);
 const summoned=T.summon(g,'yan',1,{x:28,y:34});assert.ok(summoned);assert.ok(T.removeSummoned(g,summoned.id));
 g.time=1800;g.step(.1);assert.equal(g.winner,null);
});
test('2.5D hazard, duel and lane use the new layout and still measure combat',()=>{
 const g=training(),p=g.player,h=T.hazard(g);Object.assign(p,{x:h.x+1,y:h.y+1,lastAttackAt:100,lastDamageAt:100});
 const hp=p.hp;run(g,1);close(hp-p.hp,p.maxHp*.033);
 const pair=g.champions().filter(e=>e.trainingDummy?.mode==='duel');assert.equal(pair[1].x-pair[0].x,10);assert.ok(pair.every(e=>e.hp<e.maxHp));
 run(g,3);const minions=g.units.filter(e=>e.kind==='minion');assert.ok(minions.length);assert.ok(minions.every(e=>Math.abs(e.y-MAP.lane[0].y)<.05));
 g.kill(g.towers(1)[0],p);assert.ok(g.practice.lineStopped);T.resetLane(g);assert.equal(g.practice.lineStopped,false);assert.equal(g.towers(0)[0].x,MAP.lane[0].x);
});
