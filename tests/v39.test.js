import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WORLD } from '../src/data.js';
import { Camera25D } from '../src/camera-25d.js';
import { FRAMES } from '../src/art.js';
import { guboWeaponPose,weaponEmissionScreen,equipmentPose,gregorThrust,gregorCenterline,drawWeapon,gahwanSlash,yanWeaponAngle,WEAPON_ART,weaponGeometry,gripPivot } from '../src/weapon-art.js';
import { ProjectileVFX,projectileAsset } from '../src/projectile-vfx.js';
import { SkillVFX } from '../src/skill-vfx.js';

const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function arena(key){const g=new Game(key,'top',{seed:390}),p=g.player;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(p,{x:40,y:7,facing:0});g.units=[p];g.effects=[];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};g.input.aim={x:47,y:7};return {g,p};}

test('Gubo aligns his barrel with the projected bullet ray in every aim direction and keeps the flight straight',()=>{
 for(let i=0;i<24;i++){
  const {g,p}=arena('gubo'),a=i*Math.PI/12,camera=new Camera25D();p.facing=a;camera.update(1440,900,p);const pose=guboWeaponPose(g,p,camera),zero=camera.worldToScreen(p,.95),unit=camera.worldToScreen({x:p.x+Math.cos(a),y:p.y+Math.sin(a)},.95),dx=unit.x-zero.x,dy=unit.y-zero.y,n=Math.hypot(dx,dy),ux=dx/n,uy=dy/n;close(Math.cos(pose.angle),ux);close(Math.sin(pose.angle),uy);
  g.bullet(p,{x:Math.cos(a),y:Math.sin(a)},360,7);const bullet=g.projectiles[0],fx=new ProjectileVFX({}),muzzle=weaponEmissionScreen(g,p,camera),start=fx.position(bullet,g,camera,.95);close((muzzle.x-start.x)*uy-(muzzle.y-start.y)*ux,0);assert.equal(fx.clearedMuzzle(bullet,g,camera,.95),false);
  const times=[.025,.05,.1,.14,.2,.3],samples=[];for(const time of times){g.time=time;bullet.x=p.x+bullet.dx*bullet.speed*time;bullet.y=p.y+bullet.dy*bullet.speed*time;const before={...bullet},at=fx.position(bullet,g,camera,.95);assert.deepEqual(bullet,before);close((at.x-start.x)*uy-(at.y-start.y)*ux,0);samples.push(at);}
  for(let j=1;j<samples.length;j++)close(((samples[j].x-samples[j-1].x)*ux+(samples[j].y-samples[j-1].y)*uy)/(times[j]-times[j-1]),n*bullet.speed);assert.equal(fx.clearedMuzzle(bullet,g,camera,.95),true);
 }
});
test('Gubo muzzle particles originate on the painted muzzle instead of the body center',()=>{
 const {g,p}=arena('gubo'),camera=new Camera25D();camera.update(1440,900,p);g.attack(p,{x:47,y:8});const vfx=new SkillVFX(),tip=weaponEmissionScreen(g,p,camera);vfx.sync(g,camera);const flash=vfx.emitters.find(e=>e.kind==='shot'),at=camera.worldToScreen(flash,.875);close(at.x,tip.x);close(at.y,tip.y);
});
test('Gregor Q temporarily straightens and extends the latest claw, including the mutant reach',()=>{
 for(const mutant of [false,true]){const {g,p}=arena('gregor');if(mutant)g.addBuff(p,'mutant',20);assert.equal(gregorThrust(g,p),null);g.cast(p,'q',{x:46,y:7});g.time=.08;const out=gregorThrust(g,p);close(out.straighten,1);close(out.length,mutant?8.5:6);close(out.angle,0);assert.ok(out.thrust>0);g.time=.3;assert.ok(gregorThrust(g,p).straighten<1);g.time=.401;assert.equal(gregorThrust(g,p),null);}
});
test('Gregor deformation puts the curved source spine on one line without increasing arm thickness',()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;globalThis.Image=class{complete=true;naturalWidth=2048;};globalThis.document={getElementById:()=>null};
 try{const f=FRAMES.gregorClaw,calls=[],scales=[],c={save(){},restore(){},translate(){},rotate(){},scale(x,y){scales.push([x,y]);},drawImage(...a){calls.push(a);}};drawWeapon(c,'gregorClaw',6,{straighten:1,pivot:.12});assert.ok(calls.length>100);close(scales.at(-1)[1],WEAPON_ART.gregor[1]/6);for(const a of calls){const u=(a[1]-f.x+a[3]/2)/f.w;close(a[6]+gregorCenterline(u)*f.h,0);}}
 finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
test('Gahwan weapon cuts follow all five tactical pulses and three ultimate pulses, then stop',()=>{
 for(const slot of ['q','r']){const {g,p}=arena('gahwan');g.cast(p,slot,{x:46,y:7});const period=slot==='q'?.13:.75,count=slot==='q'?5:3,duration=slot==='q'?.13:.24;for(let i=0;i<count;i++){g.time=i*period+.015;const a=gahwanSlash(g,p);g.time=i*period+duration-.015;const b=gahwanSlash(g,p);assert.ok(a&&b);assert.ok(Math.abs(a.angle-b.angle)>1);assert.equal(a.part,`skill-${slot}-${i}`);}g.time=(count-1)*period+duration+.001;assert.equal(gahwanSlash(g,p),null);}
});
test('Yan raises the sword upward for both left-facing and right-facing charge and basic animations',()=>{
 for(const facing of [0,Math.PI]){const {g,p}=arena('yan');p.facing=facing;p.state.yanCharge={progress:1.5};assert.ok(Math.sin(yanWeaponAngle(p,equipmentPose(g,p)))<-.1);delete p.state.yanCharge;p.attackAt=0;p.attackFacing=facing;for(const time of [.01,.05,.1]){g.time=time;assert.ok(Math.sin(yanWeaponAngle(p,equipmentPose(g,p)))<0);}g.time=.31;close(yanWeaponAngle(p,equipmentPose(g,p)),facing);}
});
test('ultimate throws use the procedural harpoon and ice axe while held and ordinary missile art stays independent',()=>{
 for(const key of ['ishmael','rodya']){assert.equal(projectileAsset({source:{key},slot:'r',damageKind:'skill'}),false);assert.equal(projectileAsset({source:{key},slot:'q'}),key==='ishmael'?'ishmaelMace':'rodyaAxe');assert.equal(WEAPON_ART[key][0],key==='ishmael'?'ishmaelMace':'rodyaAxe');}
 const before=weaponGeometry('dongrangScythe',2.1),after=weaponGeometry(...WEAPON_ART.dongrang);close(after.span/before.span,1.5);close(after.scale/before.scale,1.5);close(gripPivot('dongrang'),.25);
});
test('Yi briefly marks the real 5.5-radius buff area at his landing position, independent of later movement',()=>{
 const {g,p}=arena('yi'),a=g.makeChampion('faust',0,4),b=g.makeChampion('sinclair',0,5);Object.assign(a,{x:51,y:7});Object.assign(b,{x:53,y:7});g.units.push(a,b);g.cast(p,'r',{x:46,y:7});const f=g.effects.find(f=>f.type==='yiBuffRange');assert.ok(f);close(f.r,5.5);close(f.x,p.x);close(f.y,p.y);close(f.maxLife,.45);assert.ok(g.buff(a,'ogamdo'));assert.ok(!g.buff(b,'ogamdo'));p.x++;assert.notEqual(f.x,p.x);for(let i=0;i<60;i++)g.step(1/120);assert.ok(!g.effects.includes(f));
});
