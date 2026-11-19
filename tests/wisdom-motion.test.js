import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {AUGMENTS} from '../src/data.js';
import {SnapshotWriter,applySnapshot} from '../src/online-state.js';
import {equipmentPose,skillWeaponPose,meiFistPoses,bloodClawPoses,kromerWeaponPose,targetTorsoPoint,KROMER_WEAPON_MOTION,WEAPON_ART,weaponStrikePulse,weaponMotionAccent} from '../src/weapon-art.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const run=(g,seconds)=>{for(let i=0;i<Math.round(seconds*200);i++)g.step(.005);};
function arena(key='faust'){
 const g=new Game(key,'top',{mode:'training',seed:110}),p=g.player;
 g.units=[p];g.effects=[];g.events=[];g.map={walls:[],bounds:{x:0,y:0,w:120,h:80}};g.bounds=g.map.bounds;
 Object.assign(g.practice,{lineStopped:true,pauseXp:true});
 Object.assign(p,{x:40,y:20,lastDamageAt:999,lastAttackAt:999,augments:['wisdom']});
 g.input.aim={x:46,y:20};g.aiChampion=g.aiMinion=g.aiNeutral=g.aiStructure=()=>{};
 return{g,p};
}
function enemy(g){const t=g.makeChampion('faust',1,g.nextId);Object.assign(t,{x:43,y:20,maxHp:100000,hp:100000,armor:99999,radius:.1,range:0,lastDamageAt:999,lastAttackAt:999});return t;}

test('Wisdom deals five armor-independent hits at 0.2-second intervals using activation power',()=>{
 const{g,p}=arena(),t=enemy(g),hits=[],deal=g.deal.bind(g),amount=75+g.powerScale(p)*140;
 g.deal=(s,target,n,o={})=>{if(o.augmentOrigin==='wisdom')hits.push({at:g.time,n,fixed:o.fixed});return deal(s,target,n,o);};
 g.deal(p,t,1,{fixed:true});p.upgrades.power=3;run(g,.19);assert.equal(hits.length,0);run(g,.82);
 assert.equal(hits.length,5);hits.forEach((h,i)=>{near(h.at,(i+1)*.2);near(h.n,amount);assert.equal(h.fixed,true);});
 near(100000-t.hp,1+5*amount);near(p.state.wisdomReady,10);assert.equal(g.events.length,0);
 g.deal(p,t,1,{fixed:true});assert.equal(g.events.length,0);g.time=10;g.deal(p,t,1,{fixed:true});assert.equal(g.events.length,5);
});
test('Wisdom pending hits survive source death but stop when their target dies',()=>{
 const{g,p}=arena(),t=enemy(g),amount=75+g.powerScale(p)*140;g.deal(p,t,1,{fixed:true});g.kill(p,t);run(g,1.01);near(100000-t.hp,1+5*amount);
 const second=arena(),victim=enemy(second.g);second.g.deal(second.p,victim,1,{fixed:true});second.g.kill(victim,second.p);run(second.g,1.01);assert.equal(second.g.effects.filter(f=>f.type==='wisdomSlash').length,0);
});
test('dash and teleport share the two-second reduction gate and subtract two seconds from remaining cooldown',()=>{
 const{g,p}=arena();p.state.wisdomReady=10;
 assert.ok(g.startMotion(p,{x:1,y:0},1));near(p.state.wisdomReady,8);near(p.state.wisdomMoveReady,2);delete p.motion;
 g.time=.5;g.teleport(p,{x:42,y:20});near(p.state.wisdomReady,8);near(p.state.wisdomMoveReady,2);
 g.time=1.999;g.teleport(p,{x:43,y:20});near(p.state.wisdomReady,8);
 g.time=2;g.teleport(p,{x:44,y:20});near(p.state.wisdomReady,6);near(p.state.wisdomMoveReady,4);
 g.time=3;assert.ok(g.startMotion(p,{x:1,y:0},1));near(p.state.wisdomReady,6);
});
test('unused or expired Wisdom cooldown never arms the two-second gate',()=>{
 const{g,p}=arena();g.teleport(p,{x:42,y:20});assert.equal(p.state.wisdomMoveReady,undefined);
 p.state.wisdomReady=1;g.time=1;g.teleport(p,{x:43,y:20});assert.equal(p.state.wisdomMoveReady,undefined);
 p.state.wisdomReady=11;g.teleport(p,{x:44,y:20});near(p.state.wisdomReady,9);near(p.state.wisdomMoveReady,3);
});
test('one multi-stage skill cannot reduce cooldown twice even when its later movement is after two seconds',()=>{
 const{g,p}=arena();p.state.wisdomReady=10;
 g.action(p,'skill',()=>{g.teleport(p,{x:42,y:20});g.schedule(p,3,()=>g.teleport(p,{x:40,y:20}));});
 run(g,3.01);near(p.state.wisdomReady,8);near(p.x,40);
 g.teleport(p,{x:41,y:20});near(p.state.wisdomReady,6);
});
test('motion callbacks retain the originating skill across a long return movement',()=>{
 const{g,p}=arena();p.state.wisdomReady=10;
 g.action(p,'skill',()=>g.startMotion(p,{x:1,y:0},3,{speed:1,onComplete:()=>g.teleport(p,{x:40,y:20})}));
 run(g,3.01);near(p.state.wisdomReady,8);near(p.x,40);near(p.state.wisdomMoveReady,2);
});
test('failed and forced movement and normal walking do not activate the reduction',()=>{
 const{g,p}=arena();p.state.wisdomReady=10;g.status(p,'root',1,1,p);assert.equal(g.startMotion(p,{x:1,y:0},2),false);near(p.state.wisdomReady,10);
 delete p.status.root;assert.ok(g.startMotion(p,{x:1,y:0},1,{kind:'knock'}));near(p.state.wisdomReady,10);run(g,.1);
 delete p.motion;g.input.x=1;run(g,.1);g.input.x=0;near(p.state.wisdomReady,10);assert.equal(p.state.wisdomMoveReady,undefined);
});
test('valid blink ultimates activate Wisdom and rejected casts do not',()=>{
 for(const key of ['yi','ryoshu','nelly']){
  const{g,p}=arena(key);p.state.wisdomReady=10;assert.ok(g.cast(p,'r',g.input.aim),key);near(p.state.wisdomReady,8);near(p.state.wisdomMoveReady,2);
  p.rCd=0;g.time=2;g.status(p,'silence',1,1,p);assert.equal(g.cast(p,'r',g.input.aim),false,key);near(p.state.wisdomReady,8);
 }
});
test('Arayashiki counts its opening teleport and does not count its ending recast',()=>{
 const{g,p}=arena('ryoshu');p.goldenBough=true;p.state.wisdomReady=10;p.hp=p.maxHp=100000;
 assert.ok(g.cast(p,'r',g.input.aim));near(p.state.wisdomReady,8);run(g,2.01);assert.ok(g.cast(p,'r',p));near(p.state.wisdomReady,8);near(p.state.wisdomMoveReady,2);
});
test('Nosferatu manual return is a new mobility use but automatic reversion is not',()=>{
 for(const manual of [true,false]){
  const{g,p}=arena('nosferatu');p.state.wisdomReady=10;assert.ok(g.cast(p,'r',g.input.aim));near(p.state.wisdomReady,8);
  if(manual){run(g,2.01);assert.ok(g.cast(p,'r',p));near(p.state.wisdomReady,6);}
  else{run(g,5.01);near(p.state.wisdomReady,8);near(p.state.wisdomMoveReady,2);}
 }
});
test('dash basic attacks activate the same shared two-second gate',()=>{
 for(const key of ['mei','ezra','don']){
  const{g,p}=arena(key);p.state.wisdomReady=10;assert.ok(g.attack(p,g.input.aim),key);near(p.state.wisdomReady,8);near(p.state.wisdomMoveReady,2);
 }
});
test('Wisdom readiness and mobility gate survive the online snapshot round trip',()=>{
 const{g,p}=arena(),guest=arena('yi').g;p.state.wisdomReady=10;g.teleport(p,{x:42,y:20});
 const packet=JSON.parse(JSON.stringify(new SnapshotWriter().capture(g,true)));assert.ok(applySnapshot(guest,packet,p.id));near(guest.player.state.wisdomReady,8);near(guest.player.state.wisdomMoveReady,2);
 assert.equal(guest.player.state.wisdomMovement,undefined);
});
test('normal swings finish at forty percent and stay active at the arrival angle until the original end',()=>{
 const{g,p}=arena();p.attackAt=0;p.attackSerial=1;p.attackFacing=0;const angles=[];
 for(const time of [0,.03,.12,.2,.299]){g.time=time;const pose=equipmentPose(g,p);assert.ok(pose.attacking);angles.push(pose.angle);}
 near(angles[1]-angles[0],2.25*.25);near(angles[2]-angles[0],2.25);near(angles[2],angles[3]);near(angles[3],angles[4]);
 g.time=.3;assert.equal(equipmentPose(g,p).attacking,false);
});
test('skill sweeps keep their full 0.36-second window and hold their completed pose',()=>{
 const{g,p}=arena();assert.ok(g.cast(p,'q',g.input.aim));const poses=[];
 for(const time of [0,.144,.2,.359]){g.time=time;poses.push(skillWeaponPose(g,p));assert.ok(poses.at(-1));}
 near(poses[1].angle-poses[0].angle,Math.PI);near(poses[1].angle,poses[2].angle);near(poses[2].angle,poses[3].angle);
 g.time=.361;assert.equal(skillWeaponPose(g,p),null);
});
test('Mei fists and bloodfiend claws hold final angles without shortening their attack windows',()=>{
 for(const index of [0,1]){
  const{g,p}=arena('mei');p.state.meiPunch={at:0,until:.15,index,last:false,angle:0};const poses=[];
  for(const time of [.06,.1,.149]){g.time=time;const pose=meiFistPoses(g,p).find(f=>f.active);assert.ok(pose);poses.push(pose);}
  near(poses[0].angle,poses[1].angle);near(poses[1].angle,poses[2].angle);g.time=.15;assert.ok(meiFistPoses(g,p).every(f=>!f.active));
 }
 const{g,p}=arena('nosferatu');p.attackAt=0;p.attackSerial=1;p.attackFacing=0;g.time=.14;const end=bloodClawPoses(g,p);g.time=.349;const held=bloodClawPoses(g,p);held.forEach((f,i)=>near(f.angle,end[i].angle));
});
test('forward strikes extend 2.5 times faster, hold full reach and recover at their original end',()=>{
 near(weaponStrikePulse(.1),Math.sin(.25*Math.PI));for(const t of [.2,.3,.5])near(weaponStrikePulse(t),1);
 near(weaponStrikePulse(.75),Math.sin(.75*Math.PI));near(weaponStrikePulse(1),0);
 assert.deepEqual(weaponMotionAccent('faust','swing',.2),{scale:1.2,outward:.18});
 for(const t of [.4,.6,.99])assert.deepEqual(weaponMotionAccent('faust','swing',t),{scale:1,outward:0});
});
test('Kromer impalement keeps its penetration aligned to the torso at the faster peak and held peak',()=>{
 const{g,p}=arena('kromer'),t=enemy(g),camera={scale:40,worldToScreen:e=>({x:e.x*40,y:e.y*25})};
 p.state.kromerGrab={target:t,angle:0};p.state.kromerStrikeAt=0;
 for(const time of [.024,.04,.06])for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  g.time=time;p.state.kromerGrab.angle=angle;t.x=p.x+Math.cos(angle);t.y=p.y+Math.sin(angle);
  const pose=kromerWeaponPose(g,p,equipmentPose(g,p),camera),torso=targetTorsoPoint(g,p,t,camera),reach=WEAPON_ART.kromer[1]*weaponMotionAccent('kromer','thrust',pose.progress).scale*.5+pose.thrust;
  near(pose.hand.x+Math.cos(pose.angle)*reach,torso.x+Math.cos(pose.angle)*.35);
  near(pose.hand.y+Math.sin(pose.angle)*reach,torso.y+KROMER_WEAPON_MOTION.torsoDrop+Math.sin(pose.angle)*.35);
 }
});
test('Wisdom description includes the shared two-second mobility gate',()=>{
 const item=AUGMENTS.find(a=>a.key==='wisdom'),text=item.text||item.description||item.desc;
 assert.match(text,/0.2초.*총 5회/);assert.match(text,/남은.*2초/);assert.match(text,/2초마다 1회/);
});
