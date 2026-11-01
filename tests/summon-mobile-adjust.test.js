import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import * as Jamila from '../src/jamila.js';
import * as Queen from '../src/queen.js';
import * as Nos from '../src/nosferatu.js';
import * as Infiltration from '../src/infiltration.js';
import {mobileAutoAim} from '../src/mobile-aim.js';
import {leapLift} from '../src/projection-25d.js';
import {makeOnlineGame,executeCommand,OnlineMatch} from '../src/online-game.js';
import {SnapshotWriter,applySnapshot} from '../src/online-state.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(key){
 const g=new Game(key,'bottom',{mode:'training',seed:26}),p=g.player;
 g.units=[p];g.practice.lineStopped=true;g.practice.pauseXp=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;
 for(const k of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};
 Object.assign(p,{x:40,y:25,lastDamageAt:999,lastAttackAt:999});return {g,p};
}
function hero(g,team=1,x=44,y=25){const t=g.makeChampion('faust',team,g.nextId);Object.assign(t,{x,y,hp:100000,maxHp:100000,armor:0,lastDamageAt:999,lastAttackAt:999});return t;}
function run(g,s){for(let i=0;i<Math.round(s*120);i++)g.step(1/120);}
function infiltrate(g,p){p.augments=['highRisk'];assert.ok(g.recall(p,{mode:'infiltration'}));run(g,1.75);assert.ok(Infiltration.selecting(p));p.state.infiltration.point={x:70,y:25};}
test('Jamila summons have no combat presence or squad bonus until landing, then receive full lifetime and cooldown',()=>{
 const {g,p}=arena('jamila'),speed=g.speed(p);assert.ok(g.cast(p,'r',p));near(p.rCd,75);
 assert.equal(Jamila.army(g,p).length,0);near(g.speed(p),speed);const ghosts=Jamila.deploymentGhosts(g);assert.equal(ghosts.length,2);assert.ok(ghosts.every(e=>!g.units.includes(e)&&leapLift(e)===8));
 run(g,.125);near(p.rCd,75);assert.equal(Jamila.army(g,p).length,0);assert.ok(Jamila.deploymentGhosts(g).every(e=>leapLift(e)>0&&leapLift(e)<8));
 run(g,.125);assert.equal(Jamila.deploymentGhosts(g).length,0);assert.equal(Jamila.army(g,p).length,2);near(p.rCd,75);near(g.speed(p),speed*1.1);
 for(const u of Jamila.army(g,p)){near(u.until-g.time,10);assert.ok(u.visuals.deployment.until>g.time);}
 run(g,.5);near(p.rCd,74.5);run(g,9.51);assert.equal(Jamila.army(g,p).length,0);
});
test('Jamila infiltration drops commander and two soldiers together only after 0.25 seconds',()=>{
 const {g,p}=arena('jamila');infiltrate(g,p);assert.ok(g.cast(p,'r',p));const ready=p.state.infiltrationReady;
 assert.equal(Jamila.deploymentGhosts(g).length,3);run(g,.2416666667);near(p.x,40);assert.ok(Infiltration.absent(p));assert.equal(Jamila.army(g,p).length,0);near(p.rCd,75);
 run(g,1/120);near(p.x,70);assert.equal(Infiltration.absent(p),false);near(p.rCd,75);near(p.state.infiltrationReady,ready);assert.ok(p.visuals.deployment.until>g.time);
 for(const u of Jamila.army(g,p))near(u.until-g.time,15);
});
test('cancelling or obstructing infiltration during the drop refunds an uncompleted summon and leaves no ghost army',()=>{
 for(const cancel of [true,false]){
  const {g,p}=arena('jamila');infiltrate(g,p);g.cast(p,'r',p);run(g,.1);
  if(cancel)g.cancelRecall(p);else g.map.walls=[{x:68,y:23,w:4,h:4}];
  run(g,.2);assert.equal(p.state.jamilaSummon,undefined);assert.equal(Jamila.army(g,p).length,0);assert.equal(Jamila.deploymentGhosts(g).length,0);near(p.rCd,0);near(p.x,40);
  assert.equal(Infiltration.absent(p),!cancel);
 }
});
test('death during a normal summon does not create soldiers after death or respawn',()=>{
 const {g,p}=arena('jamila'),t=hero(g);g.cast(p,'r',p);g.kill(p,t);run(g,.3);assert.equal(Jamila.army(g,p).length,0);assert.equal(Jamila.deploymentGhosts(g).length,0);
 g.time=p.respawnAt;g.step(1/120);assert.equal(Jamila.army(g,p).length,0);assert.equal(p.state.jamilaSummon,undefined);
});
test('pending drop and gold release states survive online snapshots without adding ghost entities',()=>{
 const {g,p}=arena('jamila');infiltrate(g,p);g.cast(p,'r',p);run(g,.1);const copy=arena('jamila').g;
 applySnapshot(copy,new SnapshotWriter().capture(g,true),p.id);assert.equal(Jamila.deploymentGhosts(copy).length,3);assert.equal(copy.units.filter(e=>e.lcaTrooper).length,0);near(copy.player.rCd,75);
 run(g,.15);applySnapshot(copy,new SnapshotWriter().capture(g,true),p.id);assert.equal(Jamila.deploymentGhosts(copy).length,0);assert.equal(Jamila.army(copy,copy.player).length,2);assert.ok(copy.player.visuals.deployment);
});
test('Queen mobile autoaim ignores a wounded ally for basic, tactical and ultimate while manual ally hits still heal',()=>{
 const {g,p}=arena('queen'),ally=hero(g,0,41),enemy=hero(g,1,45);ally.hp=1;
 for(const slot of ['basic','q','r'])assert.equal(mobileAutoAim(g,p,slot).target.id,enemy.id);
 enemy.alive=false;for(const slot of ['basic','q','r'])assert.equal(mobileAutoAim(g,p,slot).target,undefined);
 Queen.healHit(g,p,ally,180);assert.ok(ally.hp>1);
});
test('Queen charge tap selects lowest current HP within maximum range, keeps slow steering and spends no ammo',()=>{
 const {g,p}=arena('queen'),nearby=hero(g,1,44),weak=hero(g,1,40,75),outside=hero(g,1,110),ally=hero(g,0,41);
 nearby.hp=500;weak.hp=250;outside.hp=1;ally.hp=1;g.mobileInput=true;g.input.aim={x:50,y:25};g.cast(p,'r',g.input.aim);const ammo=p.ammo;
 assert.ok(g.attack(p,nearby,{queenAim:true}));assert.equal(p.state.queenR.mobileTargetId,weak.id);near(p.state.queenR.angle,0);assert.equal(p.ammo,ammo);assert.equal(p.attackSerial||0,0);
 run(g,.25);near(p.state.queenR.angle,Math.PI*.15);assert.equal(p.state.queenR.phase,'charging');
 weak.alive=false;assert.ok(g.attack(p,p,{queenAim:true}));assert.equal(p.state.queenR.mobileTargetId,nearby.id);
});
test('Queen charge tap requires a charge and manual ultimate aiming releases its automatic lock',()=>{
 const {g,p}=arena('queen'),t=hero(g);g.mobileInput=true;assert.equal(g.attack(p,t,{queenAim:true}),false);g.cast(p,'r',t);g.attack(p,t,{queenAim:true});
 g.mobileAim={slot:'r',point:{x:40,y:35}};g.input.aim=g.mobileAim.point;run(g,1/120);assert.equal(p.state.queenR.mobileTargetId,undefined);assert.ok(p.state.queenR.angle>0);
});
test('bloodfiend loses five percent every half second, deals 130 base damage and heals thirty percent',()=>{
 const {g,p}=arena('nosferatu');p.state.bloodFeast=0;g.cast(p,'r',p);p.state.bloodfiend.nextAttack=99;p.hp=2000;run(g,.5);near(p.hp,2000-p.maxHp*.05);
 const target=hero(g,1,41),before=p.hp;p.attackCd=0;assert.ok(g.attack(p,target));const actual=target.maxHp-target.hp;near(actual,130*1.008);near(p.hp-before,actual*.3);near(p.state.bloodFeast,actual*.3);
});
test('bat target search stays bounded with many enemies and immediately follows owner priority and target death',()=>{
 const {g,p}=arena('nosferatu');p.state.bloodFeast=1000;for(let i=0;i<3;i++)g.cast(p,'q',{x:42,y:25});
 const targets=Array.from({length:80},(_,i)=>hero(g,1,43+i*.02,25)),bats=g.units.filter(e=>e.bloodBat);let visibilityCalls=0;const visible=g.visibleTo.bind(g);g.visibleTo=(...args)=>{visibilityCalls++;return visible(...args);};
 for(let i=0;i<120;i++){g.time+=1/120;for(const b of bats)Nos.tickBat(g,b,1/120);}
 assert.ok(visibilityCalls<2000,`visibility checks: ${visibilityCalls}`);const chosen=targets.at(-1);p.state.lastBloodTarget=chosen.id;g.time+=1/120;for(const b of bats){Nos.tickBat(g,b,1/120);assert.equal(b.targetId,chosen.id);}
 chosen.alive=false;g.time+=1/120;for(const b of bats){Nos.tickBat(g,b,1/120);assert.notEqual(b.targetId,chosen.id);}p.alive=false;for(const b of bats){Nos.tickBat(g,b,1/120);assert.equal(b.alive,false);}
});
test('recall and infiltration are independently selectable, including normal recall during infiltration cooldown',()=>{
 const {g,p}=arena('faust');p.augments=['highRisk'];assert.ok(g.recall(p,{mode:'recall'}));assert.equal(p.recall.infiltration,undefined);near(p.state.infiltrationReady||0,0);g.cancelRecall(p);
 assert.ok(g.recall(p,{mode:'infiltration'}));assert.ok(p.recall.infiltration);g.cancelRecall(p);assert.equal(g.recall(p,{mode:'infiltration'}),false);
 assert.ok(g.recall(p));assert.equal(p.recall.infiltration,undefined);run(g,3.01);assert.equal(p.recall,undefined);assert.ok(g.inSpawn(p));
});
const match=()=>({seed:21,slots:[{memberId:'host',team:0,position:'top',champion:'faust'},{memberId:'guest',team:1,position:'bottom',champion:'queen'}]});
test('online Queen tap is resolved by the host controller and cannot select a client supplied ally',()=>{
 const g=makeOnlineGame(match(),'host'),p=g.champions(1)[0];Object.assign(p,{x:40,y:25});Object.assign(g.player,{x:40,y:60,hp:100});g.units=[p,g.player];g.controllers.get(p.id).mobileInput=true;
 assert.ok(executeCommand(g,p,{action:'cast',slot:'r',point:{x:50,y:25}}));assert.ok(executeCommand(g,p,{action:'attack',point:p,options:{queenAim:true}}));assert.equal(p.state.queenR.mobileTargetId,g.player.id);assert.equal(g.player.key,'faust');
});
test('guest recall choice is transmitted and the host preserves normal recall while infiltration is cooling down',()=>{
 const client=makeOnlineGame(match(),'guest'),sent=[];new OnlineMatch(client,{isHost:false,room:{hostId:'host'},sendHost:p=>{sent.push(p);return true;}},'guest');
 client.recall(client.player,{mode:'recall'});client.attack(client.player,{x:40,y:25},{queenAim:true});assert.equal(sent[0].mode,'recall');assert.equal(sent[1].options.queenAim,true);
 const host=makeOnlineGame(match(),'host'),p=host.champions(1)[0];p.augments=['highRisk'];p.state.infiltrationReady=75;assert.ok(executeCommand(host,p,sent[0]));assert.equal(p.recall.infiltration,undefined);
});
