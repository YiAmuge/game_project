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

test('Gubo holds the rifle at the right hand while bullets fly straight from their original body origin',()=>{
 for(let i=0;i<24;i++){
  const {g,p}=arena('gubo'),a=i*Math.PI/12,camera=new Camera25D();p.facing=a;camera.update(1440,900,p);const pose=guboWeaponPose(g,p,camera),hand=equipmentPose(g,p).right,zero=camera.worldToScreen(p,.95),unit=camera.worldToScreen({x:p.x+Math.cos(a),y:p.y+Math.sin(a)},.95),dx=unit.x-zero.x,dy=unit.y-zero.y,n=Math.hypot(dx,dy),ux=dx/n,uy=dy/n;assert.deepEqual(pose.hand,hand);close(pose.angle,a);close(pose.thrust,0);
  g.bullet(p,{x:Math.cos(a),y:Math.sin(a)},360,7);const bullet=g.projectiles[0],fx=new ProjectileVFX({}),start=fx.position(bullet,g,camera,.95);assert.deepEqual(start,zero);
  const times=[.025,.05,.1,.14,.2,.3],samples=[];for(const time of times){g.time=time;p.x=bullet.origin.x+time*2;p.y=bullet.origin.y+time;p.facing=a+time*3;bullet.x=bullet.origin.x+bullet.dx*bullet.speed*time;bullet.y=bullet.origin.y+bullet.dy*bullet.speed*time;const before={...bullet},at=fx.position(bullet,g,camera,.95);assert.deepEqual(bullet,before);close((at.x-start.x)*uy-(at.y-start.y)*ux,0);samples.push(at);}
  for(let j=1;j<samples.length;j++)close(((samples[j].x-samples[j-1].x)*ux+(samples[j].y-samples[j-1].y)*uy)/(times[j]-times[j-1]),n*bullet.speed);
 }
});
test('Gubo basic fire emits one short dark red burst at the painted muzzle with either ammunition state',()=>{
 for(const buffed of [false,true])for(const angle of [0,.7,Math.PI,4]){
  const {g,p}=arena('gubo'),camera=new Camera25D();camera.update(1440,900,p);if(buffed)g.addBuff(p,'guboReload',4);g.attack(p,{x:p.x+Math.cos(angle)*7,y:p.y+Math.sin(angle)*7});
  const vfx=new SkillVFX(),tip=weaponEmissionScreen(g,p,camera),random=g.randomState;vfx.sync(g,camera);const flash=vfx.emitters.find(e=>e.muzzle),at=camera.worldToScreen(flash,flash.height);
  close(at.x,tip.x);close(at.y,tip.y);assert.equal(flash.kind,'shot');assert.equal(flash.color,'#71172c');assert.equal(flash.accent,'#bd354e');assert.equal(flash.dark,'#1b080f');assert.equal(flash.life,.18);assert.equal(g.randomState,random);
  vfx.sync(g,camera);assert.equal(vfx.emitters.filter(e=>e.muzzle).length,1);vfx.advance(g.time+.181);assert.equal(vfx.emitters.length,0);
 }
});
test('Gubo basic push and airborne hand anchor match held art independently of camera projection',()=>{
 const {g,p}=arena('gubo');p.attackAt=0;p.attackFacing=.6;g.time=.15;const p1=guboWeaponPose(g,p);close(p1.thrust,.38);assert.deepEqual(p1.hand,equipmentPose(g,p).right);
 p.motion={kind:'leap',elapsed:.5,minDuration:1,arcHeight:3,total:3,speed:3};const p2=guboWeaponPose(g,p,new Camera25D());close(p1.hand.y-p2.hand.y,3);close(p2.thrust,p1.thrust);close(p2.angle,p1.angle);
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
