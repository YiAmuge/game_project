import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{Game,damageFormula}from'../src/game.js';import*as Ezra from'../src/ezra.js';import{preview}from'../src/combat-visuals.js';
import{equippedWeapon,equipmentPose,ezraWeaponPose,weaponGeometry}from'../src/weapon-art.js';import{gripLayout}from'../src/weapon-grips.js';
import{ezraDrillAxis}from'../src/ezra-weapon-vfx.js';import{combatStyle}from'../src/combat-style.js';import{recordingProfile,SWING_SAMPLES}from'../src/weapon-swings.js';import{soundVoice}from'../src/sound-profiles.js';
import{SnapshotWriter,applySnapshot}from'../src/online-state.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(){const g=new Game('ezra','top',{mode:'training',seed:105}),p=g.player;g.units=[p];g.map={walls:[],bounds:{x:0,y:0,w:100,h:100}};g.bounds=g.map.bounds;Object.assign(g.practice,{lineStopped:true,pauseXp:true});Object.assign(p,{x:40,y:20,lastAttackAt:100,lastDamageAt:100});g.input.aim={x:50,y:20};for(const k of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};return{g,p};}
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
const select=(p,i)=>{p.state.weapon=i;p.attackCd=0;p.ammo=4;delete p.state.ezraAttack;delete p.motion;};
const target=(g,x,y)=>g.entity({kind:'minion',team:1,x,y,maxHp:100000,armor:0,radius:.05,range:0});

test('the fists are fifteen percent larger, five percent higher, and Alas extends straight forward',()=>{
 for(const angle of[0,Math.PI/2,Math.PI]){const{g,p}=arena();for(const i of[0,3]){select(p,i);const body=equipmentPose(g,p),pose=ezraWeaponPose(g,p,body);near(equippedWeapon(g,p)[1],.42*1.15);near(pose.hand.y,body.right.y-2.1*.05);}
  select(p,0);const aim={x:40+Math.cos(angle)*10,y:20+Math.sin(angle)*10};g.input.aim=aim;g.attack(p,aim);g.time=.08;let body=equipmentPose(g,p),pose=ezraWeaponPose(g,p,body),dx=pose.hand.x-body.right.x,dy=pose.hand.y-(body.right.y-.105);near(dx*(-Math.sin(angle))+dy*Math.cos(angle),0);assert.ok(dx*Math.cos(angle)+dy*Math.sin(angle)>.8);near(pose.angle,angle);g.time=.25;body=equipmentPose(g,p);pose=ezraWeaponPose(g,p,body);near(pose.hand.x,body.right.x);near(pose.hand.y,body.right.y-.105);
 }
});
test('Nester hits the rear on all three strikes and alternates every turn, including tactical repeats',()=>{
 const{g,p}=arena();select(p,1);const rear=target(g,38,20),edge=target(g,42.55,20),outside=target(g,42.8,20);g.attack(p,g.input.aim);const directions=[p.state.ezraAttack.spinDirection];run(g,.31);directions.push(p.state.ezraAttack.spinDirection);run(g,.30);directions.push(p.state.ezraAttack.spinDirection);assert.deepEqual(directions,[1,-1,1]);near(rear.maxHp-rear.hp,damageFormula(55,2,1)*3);near(edge.maxHp-edge.hp,damageFormula(55,2,1)*3);near(outside.hp,outside.maxHp);assert.equal(g.effects.find(f=>f.type==='slash').shape.kind,'circle');assert.ok(g.effects.some(f=>f.type==='ezraHammerGlow'));assert.equal(combatStyle('ezra',g,p,{weaponIndex:1}).accent,'#fff58c');run(g,.3);assert.ok(g.cast(p,'q',g.input.aim));assert.equal(p.state.ezraAttack.spinDirection,-1);
});
test('Nester rotates about the torso in opposite directions on successive strikes',()=>{
 const{g,p}=arena();select(p,1);g.attack(p,g.input.aim);const changes=[];
 for(let i=0;i<3;i++){run(g,.025);const first=ezraWeaponPose(g,p,equipmentPose(g,p));run(g,.025);const body=equipmentPose(g,p),next=ezraWeaponPose(g,p,body);assert.equal(next.mode,'orbit');near(next.hand.x,body.origin.x);changes.push(Math.sign(next.angle-first.angle));if(i<2)run(g,.25);}
 assert.deepEqual(changes,[1,-1,1]);
});
test('the drill motor is one supplied recording per attack rather than one per damage tick',()=>{
 const{g,p}=arena();select(p,2);g.attack(p,g.input.aim);run(g,.61);let motors=g.soundEvents.filter(e=>e.phase==='ezra-drill');assert.equal(motors.length,1);const profile=recordingProfile(soundVoice(motors[0]));assert.equal(profile.id,'ezraDrillMotor');near(profile.duration,.54);near(profile.gain,.58*1.5);assert.ok(g.cast(p,'q',g.input.aim));run(g,.61);motors=g.soundEvents.filter(e=>e.phase==='ezra-drill');assert.equal(motors.length,2);
 const spec=SWING_SAMPLES.find(s=>s.id==='ezraDrillMotor');assert.ok(spec.start>=1&&spec.end<3);const bytes=readFileSync(new URL('../src/assets/audio/'+spec.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),'d872e77fd80aeb02a93f6e548f92a15c353d808a62ed086eb37cc1d426c5698c');
});
test('the rotating electrical threads attach to the blue bit below the hammer head',()=>{
 const m=weaponGeometry('ezraDrill',Ezra.EZRA_WEAPONS[2].length),axis=ezraDrillAxis(m,.18);near(axis.base.x,axis.tip.x);assert.ok(axis.tip.y>axis.base.y+.5);assert.ok(axis.base.x>.8);assert.ok(axis.tip.y<1);
});
test('Namir plays the existing landing recording only on impact, for basic and repeat',()=>{
 const{g,p}=arena();select(p,3);g.attack(p,{x:42,y:20});run(g,.4);assert.equal(g.soundEvents.some(e=>e.phase==='ezra-landing'),false);run(g,.06);let sounds=g.soundEvents.filter(e=>e.phase==='ezra-landing');assert.equal(sounds.length,1);const landing=recordingProfile(soundVoice(sounds[0]));assert.equal(landing.id,'groundImpact');near(landing.gain,.82);const swing=g.soundEvents.find(e=>e.kind==='swing'),quiet=recordingProfile(soundVoice(swing)),normal=recordingProfile(soundVoice({...swing,phase:undefined}));near(quiet.gain,normal.gain*.5);run(g,.3);assert.ok(g.cast(p,'q',{x:43,y:20}));run(g,.46);sounds=g.soundEvents.filter(e=>e.phase==='ezra-landing');assert.equal(sounds.length,2);
});
test('axe preview follows near cursor positions and stops at the 2.5 dash limit',()=>{
 for(const fourth of[false,true])for(const len of[0,.8,2.5,8]){const{g,p}=arena();g.cast(p,'r',g.input.aim);p.state.ultAttacks=fourth?3:0;g.input.aim={x:p.x,y:p.y+len};const marks=[],ctx=new Proxy({arc:(x,y,r)=>marks.push({x,y,r})},{get:(o,k)=>o[k]||(()=>{})});preview({ctx,circle:(x,y,r)=>marks.push({x,y,r})},p,g);near(marks[0].x,p.x);near(marks[0].y,p.y+Math.min(len,2.5));near(marks[0].r,3);}
});
test('only the axe uses two shaft hands, with Rudolph spacing and mirrored resting stance',()=>{
 const{g,p}=arena();for(const side of[1,-1]){g.time=1;g.cast(p,'r',g.input.aim);g.time=2;g.mobileInput=true;g.input.x=side;p.facing=side>0?0:Math.PI;const body=equipmentPose(g,p),pose=ezraWeaponPose(g,p,body),hands=gripLayout('ezra','ezraAxe',weaponGeometry('ezraAxe',3.35),.28);assert.equal(hands.length,2);near(hands[1].x-hands[0].x,.625);near(pose.hand.x,body.origin.x-.32*body.flip);near(pose.hand.y,body.origin.y-.8);near(pose.angle,side>0?-11*Math.PI/180:Math.PI+11*Math.PI/180);near(hands[0].y-pose.gripY*3.35,0);Ezra.endUltimate(g,p);p.rCd=0;}
 for(const index of[1,2]){const w=Ezra.EZRA_WEAPONS[index];assert.equal(gripLayout('ezra',w.asset,weaponGeometry(w.asset,w.length),w.pivot).length,1);}
});
test('online snapshots retain the current opposite hammer turn and next direction',()=>{
 const{g,p}=arena();select(p,1);g.attack(p,g.input.aim);run(g,.31);const client=arena().g;assert.ok(applySnapshot(client,new SnapshotWriter().capture(g,true),p.id));assert.equal(client.player.state.ezraAttack.spinDirection,-1);assert.equal(client.player.state.ezraHammerDirection,-1);assert.equal(ezraWeaponPose(client,client.player,equipmentPose(client,client.player)).mode,'orbit');
});
