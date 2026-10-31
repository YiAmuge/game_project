import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {releaseHeath} from '../src/reworks.js';
import {heathSweepPose,heathSackPoint,equippedWeapon,heathSlamPose,equipmentPose} from '../src/weapon-art.js';
import {skillTargeting} from '../src/targeting.js';
import {skillReference} from '../src/skill-reference.js';
import {SnapshotWriter,applySnapshot} from '../src/online-state.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(key='heathcliff'){
 const g=new Game(key,'top',{mode:'training',seed:102}),p=g.player;g.units=[p];g.practice.lineStopped=true;
 g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;
 for(const name of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[name]=()=>{};
 Object.assign(p,{x:40,y:20,lastDamageAt:100,lastAttackAt:100});return{g,p};
}
function enemy(g,x,y=20){const t=g.makeChampion('faust',1,g.nextId);Object.assign(t,{x,y,hp:10000,maxHp:10000,armor:0,lastDamageAt:100,lastAttackAt:100});return t;}
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
test('normal charge grants 20 percent armor and ultimate blocks basic attacks without consuming ammo',()=>{
 const{g,p}=arena(),base=g.armor(p);g.cast(p,'q',{x:47,y:20});near(g.armor(p),(100+base)*1.2-100);
 assert.ok(g.cast(p,'r',p));assert.equal(p.state.chargeAt,undefined);assert.equal(p.motion?.kind,'leap');
 near(g.armor(p),(100+base)*1.3-100);const ammo=p.ammo;
 for(let i=0;i<3;i++){assert.equal(g.attack(p,{x:45,y:20}),false);run(g,.1);}near(p.ammo,ammo);
 run(g,.7);delete p.buffs.heathUlt;assert.ok(g.attack(p,{x:p.x+2,y:p.y}));
});
test('ultimate uses the five-unit circle, 210 damage every 0.3 seconds and 30 percent actual-damage healing',()=>{
 const{g,p}=arena(),inside=enemy(g,44.9),outside=enemy(g,45.7);p.hp=p.maxHp*.3;g.cast(p,'r',p);
 const rawDeal=g.deal.bind(g),hits=[],heals=[];g.deal=(s,t,n,o)=>{if(s===p)hits.push({target:t,n});return rawDeal(s,t,n,o);};
 const rawHeal=g.heal.bind(g);g.heal=(s,t,n,...rest)=>{if(s===p&&t===p)heals.push(n);return rawHeal(s,t,n,...rest);};
 run(g,.29);assert.equal(hits.length,0);run(g,.32);assert.equal(hits.length,2);assert.ok(hits.every(h=>h.n===210&&h.target===inside));
 near(heals.reduce((a,b)=>a+b,0),(10000-inside.hp)*.3);near(outside.hp,10000);near(skillTargeting(g,p,'r').radius,5);assert.equal(p.state.heathSweepSerial,2);
});
test('ultimate Q immediately starts the existing full-charge leap and deals its damage only on landing',()=>{
 const normal=arena();normal.g.cast(normal.p,'q',{x:47,y:20});normal.g.time=1.5;releaseHeath(normal.g,normal.p,{x:47,y:20});
 const{g,p}=arena(),t=enemy(g,46.5);g.cast(p,'r',p);const hp=t.hp,hits=[],deal=g.deal.bind(g);g.deal=(s,t,n,...args)=>{if(s===p&&n===250)hits.push({x:p.x,y:p.y});return deal(s,t,n,...args);};
 assert.ok(g.cast(p,'q',{x:47,y:20}));near(p.x,40);near(p.y,20);assert.equal(p.state.chargeAt,undefined);near(t.hp,hp);near(g.stat(t,'stun'),0);near(p.qCd,g.cooldown(p,'q'));
 for(const field of ['kind','actionTag','speed','total','arcHeight','minDuration','ignoreWalls','phaseEnemies'])assert.equal(p.motion[field],normal.p.motion[field],field);
 assert.equal(releaseHeath(g,p,t),false);assert.equal(g.cast(p,'q',t),false);run(g,.1);assert.ok(p.x>40&&p.x<47);assert.equal(hits.length,0);run(g,.8);
 assert.equal(p.motion,undefined);near(p.x,47);near(p.y,20);assert.equal(hits.length,1);near(hits[0].x,47);near(hits[0].y,20);near(g.stat(t,'stun'),1);
 p.qCd=0;g.map.walls=[{x:50,y:19,w:2,h:2}];assert.ok(g.cast(p,'q',{x:51,y:20}));assert.equal(p.motion.kind,'leap');run(g,1);assert.equal(g.blocked(p.x,p.y,p.radius),false);
 p.qCd=0;g.status(p,'root',1,2,t);assert.equal(g.cast(p,'q',{x:52,y:20}),false);
});
test('a full-charge ultimate Q keeps its landing damage when the ultimate expires during the leap',()=>{
 const{g,p}=arena();g.cast(p,'r',p);g.time=3.79;p.state.auraTick=4.09;const t=enemy(g,46.5),hits=[],deal=g.deal.bind(g);g.deal=(s,t,n,...args)=>{if(s===p)hits.push(n);return deal(s,t,n,...args);};
 assert.ok(g.cast(p,'q',{x:47,y:20}));run(g,.9);assert.equal(g.buff(p,'heathUlt'),false);assert.equal(p.motion,undefined);assert.deepEqual(hits,[250]);near(g.stat(t,'stun'),1);
});
test('normal Q remains a charged leap after ultimate expires',()=>{
 const{g,p}=arena();g.cast(p,'r',p);g.time=5;assert.ok(g.cast(p,'q',{x:47,y:20}));near(p.x,40);assert.equal(p.state.chargeAt,5);g.time=6.5;assert.ok(releaseHeath(g,p,{x:47,y:20}));assert.equal(p.motion.actionTag,'heathQ');
});
test('ultimate rotation keeps its phase, alternating direction and sack during the entire Q leap and landing',()=>{
 const{g,p}=arena(),control=arena();g.cast(p,'r',p);control.g.cast(control.p,'r',control.p);run(g,.1);run(control.g,.1);
 const before=heathSweepPose(g,p);assert.ok(g.cast(p,'q',{x:47,y:20}));near(heathSweepPose(g,p).angle,before.angle);
 for(const dt of [.1,.2,.15,.25,.2]){
  run(g,dt);run(control.g,dt);const actual=heathSweepPose(g,p),expected=heathSweepPose(control.g,control.p);
  for(const key of ['angle','progress','bend','direction','serial','radius'])near(actual[key],expected[key]);
  assert.equal(equippedWeapon(g,p)[0],'heathBloodSack');assert.equal(heathSlamPose(g,p,equipmentPose(g,p)),null);
  near(actual.center.y,equipmentPose(g,p).origin.y-.8);
 }
 assert.equal(p.motion,undefined);assert.ok(g.time-p.state.heathSlamAt<.18);
});
test('each sack sweep makes a full turn, alternates direction and bends while its tip stays at range five',()=>{
 const{g,p}=arena();g.cast(p,'r',p);const start=heathSweepPose(g,p);g.time=.15;const middle=heathSweepPose(g,p);assert.equal(middle.direction,1);near(middle.angle-start.angle,Math.PI);assert.ok(Math.abs(middle.bend)>1);
 near(Math.hypot(...Object.values(heathSackPoint(middle,1))),5);g.time=.3-1e-8;const end=heathSweepPose(g,p);near(end.angle-start.angle,Math.PI*2-1e-8/.3*Math.PI*2);
 run(g,1/120);g.time=.45;const reversed=heathSweepPose(g,p);assert.equal(reversed.direction,-1);near(reversed.angle-start.angle,-Math.PI);
 const copy=arena(),packet=new SnapshotWriter().capture(g,true);assert.ok(applySnapshot(copy.g,packet,p.id));assert.deepEqual(heathSweepPose(copy.g,copy.g.player),heathSweepPose(g,p));
});
test('Don uses the spiral from the initial ultimate dash to the end of blood thirst',()=>{
 const{g,p}=arena('don');assert.ok(g.cast(p,'r',{x:46,y:20}));assert.equal(p.motion.actionTag,'donR');assert.equal(equippedWeapon(g,p)[0],'donBloodLance');run(g,1);assert.equal(p.motion,undefined);assert.equal(equippedWeapon(g,p)[0],'donBloodLance');g.time=6.99;assert.equal(equippedWeapon(g,p)[0],'donBloodLance');g.time=7;assert.equal(equippedWeapon(g,p)[0],'donLance');
});
test('current codex describes immediate full-charge leaps and current ultimate values',()=>{
 const q=skillReference('heathcliff',2),r=skillReference('heathcliff',3),text=JSON.stringify({q,r});
 for(const n of ['20%','30%','210','즉시 도약','기본공격'])assert.ok(text.includes(n),n);
 assert.ok(!text.includes('순간이동')&&!text.includes('즉시 이동'));
});
