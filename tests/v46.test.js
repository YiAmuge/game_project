import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {WORLD} from '../src/data.js';
import {Camera25D} from '../src/camera-25d.js';
import {skillWeaponPose,equipmentPose,hohenheimWeaponCharge,rudolphForwardPose,rudolphChantPose,frontGroundPoint,forwardGroundStrikePose,ahabSlamPose,starbuckSlamPose,WEAPON_ART,weaponGeometry,gripPivot,weaponMotionAccent} from '../src/weapon-art.js';
import {rudolphWeaponProgress} from '../src/rudolph-weapon.js';
import {gripLayout,gripSourcePoint} from '../src/weapon-grips.js';
import {DashTrails,dashAppearance,DASH_TRAIL_FADE} from '../src/dash-trails.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*240);i++)g.step(1/240);};
function arena(key){const g=new Game(key,'top',{seed:46}),e=g.player;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(e,{x:30,y:20,facing:0});g.units=[e];g.effects=[];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};g.input.aim={x:36,y:20};return {g,e};}
function target(g,x=32,y=20){const t=g.makeChampion('faust',1,9);Object.assign(t,{x,y,hp:100000,maxHp:100000});g.units.push(t);return t;}
test('Sinclair basic reaches both sides of a two-unit forward semicircle while missing the rear and distant targets',()=>{
 const {g,e}=arena('sinclair'),front=target(g,31.8),left=target(g,30+1.8*Math.cos(1.35),20+1.8*Math.sin(1.35)),right=target(g,30+1.8*Math.cos(1.35),20-1.8*Math.sin(1.35)),back=target(g,29),far=target(g,33);g.attack(e,{x:36,y:20});for(const t of [front,left,right])assert.ok(t.hp<100000);for(const t of [back,far])assert.equal(t.hp,100000);close(g.attackRange(e),2);const fx=g.effects.find(f=>f.source===e.id&&f.damageKind==='basic'&&f.shape);close(fx.shape.range,2);close(fx.shape.spread,Math.PI);
});
test('Gubo Q keeps the same range and cannot hit the former extended-range target',()=>{
 const {g,e}=arena('gubo'),range=g.attackRange(e),t=target(g,e.x+range*1.15);g.cast(e,'q',e);close(g.attackRange(e),range);g.attack(e,t);assert.equal(g.projectiles[0].damage,288);run(g,.8);assert.equal(t.hp,100000);assert.ok(g.buff(e,'guboReload'));
});
test('Kim extends the sword forward and trembles deterministically while keeping the torso inside its blade',()=>{
 const {g,e}=arena('kim'),t=target(g);g.cast(e,'q',t);run(g,.2);const camera=new Camera25D();let previous;
 for(const facing of [0,Math.PI/2,Math.PI,-Math.PI/2]){e.facing=facing;for(let i=0;i<3;i++){camera.update(1440,900,e);const p=equipmentPose(g,e),pose=skillWeaponPose(g,e,p,camera),again=skillWeaponPose(g,e,p,camera);assert.deepEqual(pose,again);assert.ok(pose.thrust>.4);assert.ok(Math.abs(pose.shake)<=.018+1e-8);assert.ok(pose.bladeFraction>=.25-1e-8&&pose.bladeFraction<.9);const reach=pose.thrust+(pose.bladeFraction-.12)*WEAPON_ART.kim[1];close(pose.hand.x+Math.cos(pose.angle)*reach,pose.target.x);close(pose.hand.y+Math.sin(pose.angle)*reach,pose.target.y);if(previous!==undefined)assert.notEqual(pose.shake,previous);previous=pose.shake;g.time+=1/240;}}
});
test('Ryoshu and Sinclair Q keep stronger colored ghosts through the normal trail fade',()=>{
 for(const [key,color] of [['ryoshu','#c3424a'],['sinclair','#b2dc70']]){const {g,e}=arena(key),trails=new DashTrails();g.cast(e,'q',{x:36,y:20});assert.equal(dashAppearance(g,e).color,color);assert.equal(dashAppearance(g,e).wind,true);for(let i=0;i<10;i++){g.step(1/240);trails.sync(g);}let h=trails.histories.get(e);assert.equal(h.samples.length,5);assert.ok(h.appearance.opacity>.28);while(e.motion){g.step(1/240);trails.sync(g);}h=trails.histories.get(e);assert.ok(h);assert.equal(h.appearance.color,color);g.time=h.at+DASH_TRAIL_FADE-.001;trails.sync(g);assert.ok(trails.histories.get(e));g.time+=.002;trails.sync(g);assert.equal(trails.histories.get(e),undefined);}
});
test('Hohenheim weapon illumination follows charge and full posthumous charge, clearing on cancel',()=>{
 const {g,e}=arena('hohenheim');close(hohenheimWeaponCharge(g,e),0);g.attack(e,{x:36,y:20});for(const [amount,expected] of [[0,0],[.3,.2],[.75,.5],[1.5,1],[3,1]]){e.state.hohenCharge.progress=amount;close(hohenheimWeaponCharge(g,e),expected);}delete e.state.hohenCharge;close(hohenheimWeaponCharge(g,e),0);e.state.posthumous={until:2.5};close(hohenheimWeaponCharge(g,e),1);
});
test('Rudolph smoothly extends, keeps the staff forward across attack ticks and smoothly retracts on release',()=>{
 const {g,e}=arena('rudolph');g.input.fire=true;g.attack(e,g.input.aim);close(rudolphWeaponProgress(g,e),0);run(g,.05);const half=rudolphForwardPose(g,e);assert.ok(half.thrust>.075&&half.thrust<.15);run(g,.06);close(rudolphForwardPose(g,e).thrust,.225);const start=e.state.rudolphWeapon.at;run(g,.26);assert.ok(e.attackSerial>=2);close(e.state.rudolphWeapon.at,start);close(rudolphForwardPose(g,e).thrust,.225);g.input.fire=false;g.step(1/240);const stopped=e.state.rudolphWeapon.stop;assert.ok(Number.isFinite(stopped));run(g,.07);const retract=rudolphForwardPose(g,e);assert.ok(retract.thrust>.075&&retract.thrust<.15);run(g,.08);assert.equal(rudolphForwardPose(g,e),null);
});
test('Rudolph restart preserves partial extension without a discontinuity',()=>{
 const {g,e}=arena('rudolph');g.input.fire=true;g.attack(e,g.input.aim);run(g,.11);g.input.fire=false;run(g,.07);const before=rudolphWeaponProgress(g,e);g.input.fire=true;e.attackCd=0;g.attack(e,g.input.aim);close(rudolphWeaponProgress(g,e),before);run(g,.11);close(rudolphWeaponProgress(g,e),1);
});
test('Rudolph has a middle support hand and centers an upright staff during the ultimate channel',()=>{
 const {g,e}=arena('rudolph'),m=weaponGeometry(...WEAPON_ART.rudolph),points=gripLayout('rudolph','rudolphStaff',m,gripPivot('rudolph'));assert.equal(points.length,2);close(points[1].source[0],.5);close(points[1].x,m.span*.25);g.cast(e,'r',{x:34,y:20});const p=equipmentPose(g,e),chant=rudolphChantPose(g,e,p);close(chant.hand.x,p.origin.x);close(chant.angle,-Math.PI/2);assert.equal(rudolphForwardPose(g,e,p),null);g.time=1.251;assert.equal(rudolphChantPose(g,e,equipmentPose(g,e)),null);
});
test('Marton, Ahab and Starbuck slam their actual enlarged weapon heads onto a point in front',()=>{
 for(const key of ['marton','ahab','starbuck'])for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const {g,e}=arena(key);e.facing=angle;e.attackFacing=angle;e.visualCast={slot:'r',at:0,angle};const camera=new Camera25D();camera.update(1440,900,e);let pose,head;
  if(key==='marton'){e.attackAt=0;g.time=.11;pose=forwardGroundStrikePose(g,e,equipmentPose(g,e),camera,.11);head=[.9,.5];}
  else if(key==='ahab'){e.state.ahabSlamAt=.45;g.time=.42;pose=ahabSlamPose(g,e,equipmentPose(g,e),camera);head=[.99,.5];}
  else{e.state.starbuckLandedAt=0;pose=starbuckSlamPose(g,e,equipmentPose(g,e),camera);head=[.99,.46];}
  assert.ok(pose);const p=equipmentPose(g,e),front=frontGroundPoint(e,p,camera,{angle}),accent=weaponMotionAccent(key,'swing',pose.progress),m=weaponGeometry(WEAPON_ART[key][0],WEAPON_ART[key][1]*accent.scale),tip=gripSourcePoint(head,m,gripPivot(key));close(pose.hand.x-tip.y,front.x);close(pose.hand.y+tip.x+accent.outward,pose.headY);close(pose.impactPoint.x,front.x);close(pose.impactPoint.y,front.y);const center=camera.worldToScreen(e,.075),target=camera.worldToScreen({x:e.x+Math.cos(angle)*.85,y:e.y+Math.sin(angle)*.85},.075);close((front.x-e.x)*camera.scale,target.x-center.x);close((front.y-e.y-.325)*camera.scale,target.y-center.y);
 }
});
