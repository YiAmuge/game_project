import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WORLD } from '../src/data.js';
import { Camera25D } from '../src/camera-25d.js';
import { swingProgress,weaponMotionAccent,basicWeaponAccent,equipmentPose,skillWeaponPose,targetTorsoPoint,rudolphForwardPose,weaponEmissionPoint,weaponEmissionScreen,WEAPON_ART } from '../src/weapon-art.js';
import { projectileAppearance } from '../src/projectile-vfx.js';
import { projectileDimensions } from '../src/projectile-rules.js';
import { ahabMarkPresentation,harpoonBonusReady } from '../src/new-champions.js';
import { gripAppearance } from '../src/weapon-grips.js';
import { SkillVFX } from '../src/skill-vfx.js';
import { tickRudolphWeapon } from '../src/rudolph-weapon.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*240);i++)g.step(1/240);};
function arena(key){const g=new Game(key,'top',{seed:45}),e=g.player;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(e,{x:30,y:20,facing:0});g.units=[e];g.effects=[];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};return {g,e};}
function target(g,x=32,y=20){const t=g.makeChampion('faust',1,9);Object.assign(t,{x,y,hp:100000,maxHp:100000});g.units.push(t);return t;}
test('sweeps traverse 80 percent at triple speed, then slow sharply and retain their end time',()=>{
 for(const t of [0,.02,.1,.2,.8/3])close(swingProgress(t),3*t);close(swingProgress(.8/3),.8);close(swingProgress(1),1);close(swingProgress(-1),0);close(swingProgress(2),1);
 close((swingProgress(.7)-swingProgress(.6))/.1,.2/(1-.8/3));let last=0;for(let i=0;i<=1000;i++){const p=swingProgress(i/1000);assert.ok(p>=last&&p<=1);last=p;}
});
test('swing reach is 0.18 and the general maximum growth is twenty percent',()=>{
 assert.deepEqual(weaponMotionAccent('faust','swing',.5),{scale:1.2,outward:.18});for(const mode of ['thrust','orbit'])assert.deepEqual(weaponMotionAccent('faust',mode,.5),{scale:1.2,outward:0});assert.deepEqual(weaponMotionAccent('nelly','swing',.5),{scale:1,outward:0});
});
test('Outis basics draw a very thin long sword ray without changing the bullet damage or collision width',()=>{
 const {g,e}=arena('outis');g.attack(e,{x:36,y:20});const p=g.projectiles[0],style=projectileAppearance(p,g),size=projectileDimensions(style);assert.equal(style.type,'swordRay');close(size.width,.15);close(size.length,2.25);assert.ok(size.length/size.width>=15-1e-8);assert.equal(p.damage,215);assert.equal(p.width,.16);assert.equal(p.speed,22);
});
test('Outis thrusts on the forward ultimate dash and withdraws after shotgun fire',()=>{
 const {g,e}=arena('outis');target(g,32.5);g.cast(e,'r',{x:36,y:20});run(g,.04);let pose=skillWeaponPose(g,e);assert.equal(pose.part,'outis-thrust');assert.ok(pose.thrust>0);let guard=0;while(e.state.outisRecoilAt===undefined&&guard++<150)g.step(1/240);assert.ok(guard<150);assert.ok(e.motion?.dx<0);pose=skillWeaponPose(g,e);assert.equal(pose.part,'outis-withdraw');close(pose.angle,0);g.time=e.state.outisRecoilAt+.14;assert.ok(skillWeaponPose(g,e).thrust<0);g.time=e.state.outisRecoilAt+.201;assert.equal(skillWeaponPose(g,e),null);
});
test('Faust Q is one broad fast-then-slow sweep within the same 0.36 second window',()=>{
 const {g,e}=arena('faust');g.cast(e,'q',{x:36,y:20});const start=skillWeaponPose(g,e);close(start.angle,-Math.PI/2);g.time=.36*.8/3;const next=skillWeaponPose(g,e);close(next.angle-start.angle,Math.PI*.8);g.time=.361;assert.equal(skillWeaponPose(g,e),null);
});
test('Kim wide follow-up grows by thirty-two percent, and the next ordinary attack resets the bonus',()=>{
 const {g,e}=arena('kim');g.attack(e,{x:36,y:20});g.time=.15;close(basicWeaponAccent(g,e).scale,1.2);e.attackCd=0;g.attack(e,{x:36,y:20});g.time=.3;close(basicWeaponAccent(g,e).scale,1.32);assert.equal(e.state.kimWideSlashSerial,e.attackSerial);g.time=2;e.attackCd=0;e.ammo=2;g.attack(e,{x:36,y:20});g.time=2.15;close(basicWeaponAccent(g,e).scale,1.2);
});
test('Kim keeps the held torso inside the forward blade while carrying, then sweeps only on the throw',()=>{
 const {g,e}=arena('kim'),t=target(g,32);g.cast(e,'q',t);assert.equal(skillWeaponPose(g,e).part,'kim-thrust');run(g,.2);assert.equal(e.state.swordGrab?.target,t);const camera=new Camera25D();
 for(let i=0;i<2;i++){camera.update(1440,900,e);const p=equipmentPose(g,e),pose=skillWeaponPose(g,e,p,camera),torso=targetTorsoPoint(g,e,t,camera),reach=pose.thrust+(pose.bladeFraction-.12)*WEAPON_ART.kim[1];assert.equal(pose.part,'kim-embedded');close(pose.hand.x+Math.cos(pose.angle)*reach,torso.x);close(pose.hand.y+Math.sin(pose.angle)*reach,torso.y);g.input.y=1;run(g,.15);g.input.y=0;}
 g.cast(e,'q',{x:e.x+6,y:e.y});assert.equal(e.state.swordGrab,undefined);assert.equal(skillWeaponPose(g,e).part,'kim-throw');assert.ok(t.motion?.forced);g.time+=.261;assert.equal(skillWeaponPose(g,e),null);
});
test('Kim counter wave gives each of its four projectiles a separate sword sweep event',()=>{
 const {g,e}=arena('kim'),t=target(g),shots=[],bullet=g.bullet.bind(g);g.bullet=(...a)=>{shots.push({time:g.time,serial:e.state.kimWaveSerial,part:skillWeaponPose(g,e)?.part});return bullet(...a);};g.cast(e,'r',t);g.deal(t,e,10,{fixed:true});run(g,.39);assert.equal(shots.length,4);assert.deepEqual(shots.map(s=>s.serial),[1,2,3,4]);for(let i=0;i<4;i++)assert.equal(shots[i].part,`kim-wave-${i+1}`);for(let i=1;i<4;i++)close(shots[i].time-shots[i-1].time,.125);
});
test('Hohenheim Q keeps the staff pointed forward through dash and recoil',()=>{
 const {g,e}=arena('hohenheim');target(g,32);g.cast(e,'q',{x:36,y:20});run(g,.03);let p=skillWeaponPose(g,e);assert.equal(p.part,'hohenheim-thrust');assert.ok(p.thrust>0);close(p.angle,0);run(g,.15);p=skillWeaponPose(g,e);if(p)close(p.angle,0);
});
test('Rudolph keeps the same forward staff offset and size across attack ticks, then rests when released',()=>{
 const {g,e}=arena('rudolph');g.attack(e,{x:36,y:20});g.input.fire=true;const samples=[];for(const time of [.12,.20,.28,.36]){g.time=time;const p=rudolphForwardPose(g,e);assert.ok(p);close(p.thrust,.225);close(basicWeaponAccent(g,e).scale,1.2);samples.push(weaponEmissionPoint(g,e));}for(const s of samples){close(s.x-samples[0].x,0);}
 g.input.fire=false;tickRudolphWeapon(g,e);g.time+=.15;assert.equal(rudolphForwardPose(g,e),null);close(basicWeaponAccent(g,e).scale,1);
});
test('Ahab readied harpoon presentation follows the next third hit and never consumes hit counts',()=>{
 const {g,e}=arena('ahab'),t=target(g),mark={source:e.id,team:e.team,until:4};t.state.harpoon=mark;t.state.harpoons={[e.id]:mark};assert.deepEqual(ahabMarkPresentation(g,t),{active:true,bonusReady:false});e.basicHits[t.id]=2;assert.ok(harpoonBonusReady(g,e,t));assert.deepEqual(ahabMarkPresentation(g,t),{active:true,bonusReady:true});assert.equal(e.basicHits[t.id],2);t.invulnerableUntil=1;assert.deepEqual(ahabMarkPresentation(g,t),{active:true,bonusReady:false});t.invulnerableUntil=0;g.time=4.01;assert.deepEqual(ahabMarkPresentation(g,t),{active:false,bonusReady:false});
});
test('Alisa round hands have a restrained dark red palette',()=>{
 const p=gripAppearance('alisa');assert.equal(p.base,'#5a292b');assert.ok(parseInt(p.base.slice(1,3),16)>parseInt(p.base.slice(3,5),16)*1.5);assert.equal(gripAppearance('dongrang').base,'#805a3b');
});
test('Myo tactical emits four orange muzzle flashes with dark intervals between the four shots',()=>{
 const {g,e}=arena('myo'),camera=new Camera25D();camera.update(1440,900,e);g.cast(e,'q',{x:36,y:20});const vfx=new SkillVFX(),seen=new Set(),flashes=[],rising=[];let lit=false;
 for(let i=0;i<80;i++){g.step(1/240);vfx.sync(g,camera);const active=vfx.emitters.filter(f=>f.muzzle==='myo');assert.ok(active.length<=1);for(const f of active)if(!seen.has(f)){seen.add(f);flashes.push(f);}if(active.length&&!lit)rising.push(g.time);lit=active.length>0;}
 assert.equal(flashes.length,4);assert.equal(rising.length,4);for(const f of flashes){close(f.life,.05);assert.equal(f.color,'#d56827');assert.equal(f.accent,'#ffb45c');}for(let i=1;i<4;i++)assert.ok(flashes[i].born-flashes[i-1].born>.07);assert.equal(weaponEmissionScreen(g,e,camera)===null,false);
});
