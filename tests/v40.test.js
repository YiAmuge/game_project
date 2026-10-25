import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WORLD } from '../src/data.js';
import { skillCharges,gregorStack,releaseHeath } from '../src/skills.js';
import * as Yan from '../src/yan.js';
import { equipmentPose,soraOrbitPose,outisSpinPose,heathSlamPose,yanWeaponAngle,swingProgress,WEAPON_ART } from '../src/weapon-art.js';
import { ChampionVFX,championPresentation } from '../src/champion-vfx.js';
import { canOccupy } from '../src/collision.js';

const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function arena(key){const g=new Game(key,'top',{seed:400}),p=g.player;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(p,{x:40,y:7,facing:0});g.units=[p];g.effects=[];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};g.input.aim={x:47,y:7};return {g,p};}
function target(g,x=44,y=7,team=1){const t=g.makeChampion('faust',team,9);Object.assign(t,{x,y,maxHp:100000,hp:100000});return t;}

test('Sora claws keep opposite orbital positions and fixed individual orientation through one full turn',()=>{
 const {g,p}=arena('sora');g.addBuff(p,'soraEgo',20);p.attackAt=0;p.attackFacing=.4;let previous;
 for(let i=0;i<=24;i++){g.time=i*.299/24;const pose=equipmentPose(g,p),orbit=soraOrbitPose(p,pose),center={x:pose.origin.x,y:pose.origin.y-.8};assert.ok(orbit.active);close(orbit.left.hand.x+orbit.right.hand.x,2*center.x);close(orbit.left.hand.y+orbit.right.hand.y,2*center.y);const radius=Math.hypot(orbit.right.hand.x-center.x,orbit.right.hand.y-center.y);assert.ok(radius>=.9-1e-7&&radius<=1.1+1e-7);if(i===0)close(radius,.9);if(i===12)assert.ok(radius>1.099);close(orbit.left.angle,.4+Math.PI);close(orbit.right.angle,.4);if(previous)assert.ok(Math.hypot(orbit.right.hand.x-previous.x,orbit.right.hand.y-previous.y)>.02);previous=orbit.right.hand;}
 g.time=.3;assert.equal(soraOrbitPose(p,equipmentPose(g,p)).active,false);
});
test('Outis starts one body-centered orbit only after her tactical dash lands',()=>{
 const {g,p}=arena('outis');g.cast(p,'q',{x:47,y:7});assert.equal(outisSpinPose(g,p,equipmentPose(g,p)),null);run(g,.4);assert.equal(p.motion,undefined);assert.ok(p.state.outisSpinAt>0);const start=p.state.outisSpinAt;
 for(const progress of [0,.25,.5,.75,.999]){g.time=start+progress*.4;const body=equipmentPose(g,p),pose=outisSpinPose(g,p,body);close(Math.hypot(pose.hand.x-body.origin.x,pose.hand.y-body.origin.y+.8),.5);close(pose.angle,swingProgress(progress)*Math.PI*2);}
 g.time=start+.401;assert.equal(outisSpinPose(g,p,equipmentPose(g,p)),null);
});
test('Heathcliff holds his bat overhead and brings its tip to the floor on the actual landing frame',()=>{
 for(const duration of [.2,1.5]){const {g,p}=arena('heathcliff');g.cast(p,'q',{x:47,y:7});close(heathSlamPose(g,p,equipmentPose(g,p)).angle,-Math.PI/2);g.time=duration;assert.ok(releaseHeath(g,p,{x:47,y:7}));const m=p.motion;m.elapsed=Math.max(m.minDuration,m.total/m.speed)*.3;close(heathSlamPose(g,p,equipmentPose(g,p)).angle,-Math.PI/2);m.elapsed=0;let guard=0;while(p.motion&&guard++<300)g.step(1/120);assert.ok(guard<300);close(p.state.heathSlamAt,g.time);const body=equipmentPose(g,p),slam=heathSlamPose(g,p,body);close(slam.angle,Math.PI/2);close(slam.hand.y+WEAPON_ART.heathcliff[1]*.88,body.origin.y+.06);assert.ok(g.effects.some(f=>f.type==='burst'&&f.theme==='heathcliff'));run(g,.19);assert.equal(heathSlamPose(g,p,equipmentPose(g,p)),null);}
});
test('Yan finishes his basic downstroke twice as fast and the ground effect keeps the exact attack rectangle',()=>{
 const {g,p}=arena('yan');g.attack(p,{x:47,y:7});p.state.yanCharge.progress=1.5;Yan.release(g,p,{x:47,y:7});g.time=.075;close(Math.abs(yanWeaponAngle(p,equipmentPose(g,p))),.9*(1-swingProgress(.5)));g.time=.151;close(yanWeaponAngle(p,equipmentPose(g,p)),0);const vfx=new ChampionVFX({});vfx.sync(g);const ground=vfx.effects.find(f=>f.type==='yanGroundSlam'),hit=g.effects.find(f=>f.type==='yanCleave');assert.ok(ground);close(ground.range,6.5);close(ground.width,1.8);close(ground.range,Math.hypot(hit.to.x-hit.x,hit.to.y-hit.y));assert.deepEqual(ground.shape,{kind:'rect',range:6.5,width:1.8,angle:0});
});
test('multi-charge skills expose the next recharge timer while a usable charge remains',()=>{
 for(const key of ['nelly','sora']){const {g,p}=arena(key);if(key==='sora'){p.state.unlock=5;g.cast(p,'r',p);}assert.deepEqual(skillCharges(g,p,'q'),{current:2,max:2,remaining:0});assert.ok(g.cast(p,'q',{x:41,y:7}));run(g,.2);const partial=skillCharges(g,p,'q');assert.equal(partial.current,1);assert.ok(partial.remaining>4.7&&partial.remaining<4.9);close(p.qCd,0);assert.ok(g.cast(p,'q',{x:42,y:7}));run(g,.2);assert.equal(skillCharges(g,p,'q').current,0);assert.ok(p.qCd>4);run(g,4.61);assert.equal(skillCharges(g,p,'q').current,1);assert.ok(skillCharges(g,p,'q').remaining>4.9);close(p.qCd,0);run(g,5);assert.deepEqual(skillCharges(g,p,'q'),{current:2,max:2,remaining:0});assert.equal(skillCharges(g,p,'r'),null);}
});
test('Gregor mutation blocks new stacks for thirty seconds from activation',()=>{
 const {g,p}=arena('gregor');gregorStack(g,p,12);close(p.state.mutateReady,30);close(g.passiveCooldown(p),30);run(g,5.1);assert.equal(g.buff(p,'mutant'),false);g.time=15;gregorStack(g,p,12);assert.equal(p.state.mutations,0);g.time=29.999;gregorStack(g,p,12);assert.equal(p.state.mutations,0);g.time=30;gregorStack(g,p,12);assert.ok(g.buff(p,'mutant'));close(p.state.mutateReady,60);
});
test('Nelly arrives on the approach side in front of her target without changing the opening hit or held mark',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){const {g,p}=arena('nelly');p.y=20;const from={x:p.x,y:p.y},t=target(g,p.x+Math.cos(angle)*4,p.y+Math.sin(angle)*4),hp=t.hp;assert.ok(g.cast(p,'r',t));assert.ok((p.x-t.x)*(from.x-t.x)+(p.y-t.y)*(from.y-t.y)>0);assert.ok(canOccupy(g,p,p,{phaseEnemies:false}));assert.ok(hp-t.hp>0);assert.equal(t.state.nellyMarks[p.id].hold,3);assert.ok(g.stat(t,'root'));}
});
test('Nelly searches the same front half when terrain blocks the direct arrival',()=>{
 const {g,p}=arena('nelly'),t=target(g);g.map.walls=[{x:42.4,y:7.25,w:1,h:.6}];assert.ok(g.cast(p,'r',t));assert.ok(p.x<t.x);assert.ok(!g.blocked(p.x,p.y,p.radius));
});
test('Dongbaek body aura has no drifting petal layer and Gubo targeting marks allies as well as enemies',()=>{
 const {g,p}=arena('dongbaek');g.cast(p,'q',p);const aura=championPresentation(g,p).aura;assert.equal(aura.rimOnly,true);assert.equal(aura.anchor,undefined);
 for(const team of [0,1]){const a=arena('gubo'),t=target(a.g,44,7,team);a.p.state.guboAim={target:t,until:2};const vfx=new ChampionVFX({}),c={save(){},restore(){},translate(){},scale(){}};let calls=0;vfx.guboReticle=()=>calls++;vfx.body(c,{scale:40,worldToScreen:()=>({x:0,y:0})},t,a.g,true);assert.equal(calls,1);}
});
