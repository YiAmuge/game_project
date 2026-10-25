import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,damageFormula } from '../src/game.js';
import { CHAMPIONS,WORLD } from '../src/data.js';
import { Camera25D } from '../src/camera-25d.js';
import { weaponOrientation,gripPivot,MIDDLE_GRIP,WEAPON_ART,HANDLE_EXTENSIONS,weaponGeometry,EMISSION_ANCHORS,equipmentPose,groundStrikePose,ahabSlamPose,weaponEmissionPoint,weaponEmissionScreen,SORA_CLAW_LENGTH,ISHMAEL_SHIELD_LENGTH } from '../src/weapon-art.js';
import { DashTrails,DASH_TRAIL_FADE,teleportSamples } from '../src/dash-trails.js';
import { ProjectileVFX } from '../src/projectile-vfx.js';
import { championPresentation } from '../src/champion-vfx.js';

const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function arena(key){const g=new Game(key,'top',{seed:380});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player;Object.assign(p,{x:40,y:7,facing:0,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};g.input.aim={x:46,y:7};return {g,p};}
function target(g,x=44,y=7){const t=g.makeChampion('faust',1,9);Object.assign(t,{x,y,maxHp:100000,hp:100000,lastAttackAt:100,lastDamageAt:100});return t;}
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};

test('held art rotates through only a half circle and mirrors horizontally without reversing its aim',()=>{
 for(let i=-240;i<=240;i++){const angle=i*Math.PI/60,p=weaponOrientation(angle);assert.ok(Math.abs(p.angle)<=Math.PI/2+1e-9);assert.ok(p.flip===1||p.flip===-1);close(p.flip*Math.cos(p.angle),Math.cos(angle));close(Math.sin(p.angle),Math.sin(angle));}
 assert.equal(weaponOrientation(Math.PI).flip,-1);assert.equal(weaponOrientation(0).flip,1);
});
test('long weapon grips move halfway from center toward the rear, leaving 50 percent more weapon in front',()=>{
 for(const key of MIDDLE_GRIP){close(gripPivot(key),.25);close((1-gripPivot(key))/.5,1.5);}close(gripPivot('faust'),.12);
 close(WEAPON_ART.honglu[1],2.65);close(HANDLE_EXTENSIONS.hongluGlaive.scale,1.25);close(WEAPON_ART.sora[1],.84*.75);close(SORA_CLAW_LENGTH,1.65*.8);assert.ok(ISHMAEL_SHIELD_LENGTH<.5);
 const {g,p}=arena('honglu');close(g.attackRange(p),2.7);
});
test('Marton distinguishes ranged root attacks from melee swings without changing their damage',()=>{
 const {g,p}=arena('marton'),t=target(g);const hp=t.hp;assert.ok(g.attack(p,t));assert.equal(p.state.martonGroundStrike,p.attackSerial);close(hp-t.hp,damageFormula(100,CHAMPIONS.marton.power,1)*g.powerScale(p));assert.equal(p.motion,undefined);
 const pose=equipmentPose(g,p),a=groundStrikePose(pose,2.4,.25,0),b=groundStrikePose(pose,2.4,.25,.11);assert.ok(a.headY<pose.origin.y);assert.ok(b.headY>pose.origin.y);close(a.angle,Math.PI/2);close(b.angle,a.angle);assert.ok(b.hand.y>a.hand.y);
 p.attackCd=0;p.ammo=3;t.x=p.x+1;assert.ok(g.attack(p,t));assert.equal(p.state.martonGroundStrike,null);assert.ok(g.buff(p,'martonStride'));
});
test('Ahab keeps an instant relocation and adds an origin-to-destination visual trail that expires',()=>{
 const {g,p}=arena('ahab'),from={x:p.x,y:p.y};assert.ok(g.cast(p,'r',{x:46,y:7}));close(p.x,46);close(p.y,7);assert.equal(p.motion,undefined);assert.deepEqual(p.state.ahabUlt.origin,from);
 const samples=teleportSamples(g,p);assert.equal(samples.length,5);assert.deepEqual({x:samples[0].x,y:samples[0].y},from);close(samples.at(-1).x,p.x);close(samples.at(-1).y,p.y);
 const trails=new DashTrails();trails.sync(g);assert.equal(trails.histories.get(p).samples.length,5);g.time=DASH_TRAIL_FADE/2;trails.sync(g);close(trails.histories.get(p).at,0);g.time=DASH_TRAIL_FADE+.001;trails.sync(g);assert.equal(teleportSamples(g,p),null);assert.equal(trails.histories.get(p),undefined);
});
test('Ahab completes her fast harpoon slam before the unchanged 0.45-second return',()=>{
 const {g,p}=arena('ahab');g.cast(p,'r',{x:46,y:7});assert.equal(ahabSlamPose(g,p,equipmentPose(g,p)),null);g.time=.33;const high=ahabSlamPose(g,p,equipmentPose(g,p));g.time=.42;const impact=ahabSlamPose(g,p,equipmentPose(g,p));assert.ok(high.headY<impact.headY);close(impact.angle,Math.PI/2);close(impact.headY-impact.groundY,.06);
 for(const time of [.441,.45,.46]){g.time=time;assert.equal(ahabSlamPose(g,p,equipmentPose(g,p)),null);}
 const b=arena('ahab'),t=target(b.g,46);b.g.cast(b.p,'r',t);run(b.g,.46);assert.ok(b.p.motion);assert.equal(b.p.motion.kind,'dash');assert.equal(ahabSlamPose(b.g,b.p,equipmentPose(b.g,b.p)),null);assert.deepEqual(b.p.state.ahabUlt.origin,{x:40,y:7});
});
test('gun and staff emission points match the visible tip across body mirroring and Z levitation',()=>{
 for(const key of ['gubo','rudolph']){const {g,p}=arena(key);for(const angle of [0,.6,Math.PI,Math.PI*1.3]){p.facing=angle;const pose=equipmentPose(g,p),tip=weaponEmissionPoint(g,p),m=weaponGeometry(...WEAPON_ART[key]),[u,v]=EMISSION_ANCHORS[key],dx=tip.x-pose.right.x,dy=tip.y-pose.right.y;close(dx*Math.cos(angle)+dy*Math.sin(angle),m.span*(u-gripPivot(key)));close(-dx*Math.sin(angle)+dy*Math.cos(angle),weaponOrientation(angle).flip*(v-.5)*m.height*m.scale);}
  p.facing=0;const before=weaponEmissionPoint(g,p);p.motion={kind:'leap',elapsed:.5,minDuration:1,arcHeight:3,total:3,speed:3};close(before.y-weaponEmissionPoint(g,p).y,3);delete p.motion;
  if(key==='rudolph'){p.castSlot='r';p.channelUntil=2;assert.ok(weaponEmissionPoint(g,p).y<before.y-1);}
 }
});
test('Gubo bullets start at the original body origin without changing projectile collision coordinates',()=>{
 const {g,p}=arena('gubo'),t=target(g,48);g.attack(p,t);const bullet=g.projectiles[0],fields=['x','y','dx','dy','remaining','width','speed','damage'],before=fields.map(k=>bullet[k]),camera=new Camera25D();camera.update(1280,720,p);
 const fx=new ProjectileVFX({}),start=fx.position(bullet,g,camera,.95),origin=camera.worldToScreen(bullet.origin,.95);assert.deepEqual(start,origin);assert.deepEqual(fields.map(k=>bullet[k]),before);
 g.time=.15;const point=fx.position(bullet,g,camera,.95);close(point.x,start.x);close(point.y,start.y);assert.deepEqual(fields.map(k=>bullet[k]),before);
});
test('Dongbaek tactical body rim suppresses floating petals while shield and movement rules remain intact',()=>{
 const {g,p}=arena('dongbaek');g.cast(p,'q',p);assert.equal(championPresentation(g,p).aura.rimOnly,true);assert.ok(g.shield(p)>0);assert.ok(g.buff(p,'flowerStride'));g.time=3.01;assert.equal(g.buff(p,'flowerStride'),false);
});
