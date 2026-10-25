import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WORLD } from '../src/data.js';
import { Camera25D } from '../src/camera-25d.js';
import { FRAMES } from '../src/art.js';
import { weaponMotionAccent,basicWeaponAccent,equipmentPose,ultimateOrbitPose,dongbaekUltSwing,donChargePull,ryoshuResting,guboEffectAxis,weaponEmissionScreen,WEAPON_ART } from '../src/weapon-art.js';
import { ProjectileVFX } from '../src/projectile-vfx.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function arena(key){const g=new Game(key,'top',{seed:44}),e=g.player;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(e,{x:30,y:20,facing:0});g.units=[e];g.effects=[];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};return {g,e};}
test('weapon attack accents peak briefly, separate swing reach from thrust and orbit, and preserve Nelly',()=>{
 for(const mode of ['swing','thrust','orbit']){const peak=weaponMotionAccent('faust',mode,.5);close(peak.scale,1.12);close(peak.outward,mode==='swing'?.12:0);for(const t of [-1,0,1,2]){close(weaponMotionAccent('faust',mode,t).scale,1);close(weaponMotionAccent('faust',mode,t).outward,0);}assert.deepEqual(weaponMotionAccent('nelly',mode,.5),{scale:1,outward:0});}
});
test('Honglu and Dongrang hold at the lowered waist anchor and Honglu sweeps without extra outward reach',()=>{
 for(const key of ['honglu','dongrang']){const {g,e}=arena(key),p=equipmentPose(g,e);close(p.right.y-p.origin.y,-.65);if(key==='honglu'){e.attackAt=0;e.attackFacing=0;g.time=.15;const a=basicWeaponAccent(g,e);close(a.scale,1.12);close(a.outward,0);}}
});
test('Sinclair spins once at the ultimate landing while Ryoshu spins once at the blink arrival',()=>{
 for(const key of ['sinclair','ryoshu']){const {g,e}=arena(key);g.cast(e,'r',{x:34,y:20});let start=0;if(key==='sinclair'){assert.equal(ultimateOrbitPose(g,e,equipmentPose(g,e)),null);for(let i=0;i<40&&!Number.isFinite(e.state.sinclairSpinAt);i++)g.step(1/120);start=e.state.sinclairSpinAt;assert.ok(Number.isFinite(start));}const angles=[];for(const age of [0,.1,.2,.3,.399]){g.time=start+age;const p=equipmentPose(g,e),spin=ultimateOrbitPose(g,e,p);assert.ok(spin);close(Math.hypot(spin.hand.x-p.origin.x,spin.hand.y-(p.origin.y-.8)),.5);angles.push(spin.angle);}assert.ok(angles.at(-1)-angles[0]>6.26);g.time=start+.401;assert.equal(ultimateOrbitPose(g,e,equipmentPose(g,e)),null);}
});
test('Dongbaek ultimate has one bounded fan swing and Don pulls his lance back gradually during charge',()=>{
 const d=arena('dongbaek');d.g.cast(d.e,'r',{x:34,y:20});d.g.time=.02;const a=dongbaekUltSwing(d.g,d.e);d.g.time=.36;const b=dongbaekUltSwing(d.g,d.e);assert.ok(b.angle-a.angle>2);for(const t of [.381,.5,.75,1]){d.g.time=t;assert.equal(dongbaekUltSwing(d.g,d.e),null);}
 const {g,e}=arena('don');g.cast(e,'q',{x:36,y:20});for(const t of [0,.3,.75,1.49]){g.time=t;close(donChargePull(g,e),-.45*t/1.5);}assert.equal(e.state.donCharge.at,0);
});
test('Ryoshu rests in a centered reverse grip and uses the normal attack grip while attacking or casting',()=>{
 const {g,e}=arena('ryoshu');assert.ok(ryoshuResting(g,e));e.attackAt=0;e.attackFacing=0;g.time=.15;assert.equal(ryoshuResting(g,e),false);g.time=.4;assert.ok(ryoshuResting(g,e));g.cast(e,'q',{x:34,y:20});assert.equal(ryoshuResting(g,e),false);
});
test('Gubo effects start on the central ray at the barrel reach, without moving bullet gameplay coordinates',()=>{
 for(let i=0;i<24;i++){const {g,e}=arena('gubo'),angle=i*Math.PI/12,camera=new Camera25D();e.facing=angle;camera.update(1440,900,e);const axis=guboEffectAxis(g,e,camera,e,{angle}),tip=weaponEmissionScreen(g,e,camera);close((axis.start.x-axis.center.x)*axis.uy-(axis.start.y-axis.center.y)*axis.ux,0);close((tip.x-axis.start.x)*axis.ux+(tip.y-axis.start.y)*axis.uy,0);g.bullet(e,{x:Math.cos(angle),y:Math.sin(angle)},360,7);const p=g.projectiles[0],before={...p},vfx=new ProjectileVFX({});assert.equal(vfx.effectVisible(p,g,camera,.95),false);assert.deepEqual(vfx.position(p,g,camera,.95),camera.worldToScreen(p,.95));assert.deepEqual(p,before);p.x+=p.dx*5;p.y+=p.dy*5;assert.equal(vfx.effectVisible(p,g,camera,.95),true);}
});
test('Gubo laser uses the central origin-to-target ray and its projected front effect start',()=>{
 const {g,e}=arena('gubo'),camera=new Camera25D();camera.update(1440,900,e);const fx={type:'guboLaser',theme:'gubo',source:e.id,x:e.x,y:e.y,to:{x:e.x+7,y:e.y+2},life:.35,maxLife:.35};g.effects=[fx];const moves=[],c={save(){},restore(){},beginPath(){},moveTo(x,y){moves.push({x,y});},lineTo(){},stroke(){},drawImage(){}};const vfx=new ProjectileVFX({});vfx.sprite=()=>({});vfx.beams(c,camera,g);const to=camera.worldToScreen(fx.to,1.25),axis=guboEffectAxis(g,e,camera,fx,{height:1.35,to});assert.equal(moves.length,3);for(const from of moves){close(from.x,axis.start.x);close(from.y,axis.start.y);close((from.x-axis.center.x)*axis.uy-(from.y-axis.center.y)*axis.ux,0);}
});
test('Outis uses the final straight-spine falcata source and a modestly longer display length',()=>{
 assert.ok(FRAMES.outisFalcata.source.includes('b33e7a4c'));assert.ok(WEAPON_ART.outis[1]>1.85&&WEAPON_ART.outis[1]<2.1);assert.equal(FRAMES.outis.source,'exec-7f3e21e2-d51b-4f93-9345-73810f05be49.png');
});
