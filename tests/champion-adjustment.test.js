import test from'node:test';import assert from'node:assert/strict';
import{Game,damageFormula}from'../src/game.js';import{RUNTIME_CHAMPIONS as CHAMPIONS,basicFanAngle}from'../src/data.js';
import{combatSeconds}from'../src/combat-timing.js';import*as Ezra from'../src/ezra.js';import*as Hohenheim from'../src/hohenheim.js';import*as Yan from'../src/yan.js';
import{skillTargeting}from'../src/targeting.js';import{skillReference}from'../src/skill-reference.js';import{combatStyle,visualShape}from'../src/combat-style.js';import{leapLift}from'../src/projection-25d.js';
import{equippedWeapon,equipmentPose,ezraWeaponPose,weaponOrientation}from'../src/weapon-art.js';
const near=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function arena(key='ezra'){const g=new Game(key,'top',{mode:'training',seed:104}),p=g.player;g.units=[p];g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;Object.assign(g.practice,{lineStopped:true,pauseXp:true});Object.assign(p,{x:40,y:20,lastAttackAt:100,lastDamageAt:100});g.input.aim={x:50,y:20};for(const k of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};return{g,p};}
const advance=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
const target=(g,x=42,y=20)=>g.entity({kind:'minion',team:1,x,y,maxHp:100000,armor:0,range:0,radius:.05});
const factor=(p,n)=>damageFormula(n,CHAMPIONS[p.key].power,1);
function select(p,index){p.state.weapon=index;p.attackCd=0;p.ammo=4;delete p.motion;}

test('actual basic intervals and reload durations share tenth-second clocks for every champion and upgrade',()=>{
 for(const key of Object.keys(CHAMPIONS)){const{g,p}=arena(key);for(const reload of[0,1,2]){p.upgrades.reload=reload;for(const n of[g.attackInterval(p),g.reloadInterval(p)]){assert.ok(n>0,key);near(n*10,Math.round(n*10));}}}
 near(combatSeconds(.65),.7);near(combatSeconds(.333333),.3);near(combatSeconds(.075),.1);
 for(const[key,n]of[['jamila',.2],['hohenheim',.7],['ezra',.7],['rudolph',.3]]){const{g,p}=arena(key);near(g.attackInterval(p),n);}
});
test('Ezra completes her base reload at 2.7 seconds and keeps the fifteen-percent empty-magazine shield only',()=>{
 const{g,p}=arena();select(p,3);p.ammo=1;p.hp=500;assert.ok(g.attack(p,{x:42,y:20}));near(g.shield(p),p.maxHp*.15);assert.ok(p.shields.every(s=>!s.source.startsWith('ezra-basic-')));advance(g,2.69);assert.equal(p.ammo,0);advance(g,.02);assert.equal(p.ammo,4);
});
for(const[key,len,damage]of[['don',3.5,230],['starbuck',3.75,200]])test(`${key} uses the extended dash as its exact 1.5-wide damage corridor`,()=>{
 const{g,p}=arena(key),yes=target(g,40+len-.05,20.72),no=target(g,41,20.86),behind=target(g,39.5,20);near(g.attackRange(p),len);assert.ok(g.attack(p,g.input.aim));advance(g,.7);near(p.x,40+len);near(yes.maxHp-yes.hp,factor(p,damage));near(no.hp,no.maxHp);near(behind.hp,behind.maxHp);const f=g.effects.find(f=>f.shape?.kind==='rect');if(f)near(f.shape.width,1.5);
});
test('Sinclair has 2.5 reach and a 150-degree fan',()=>{
 const{g,p}=arena('sinclair'),at=a=>target(g,40+Math.cos(a*Math.PI/180)*2.45,20+Math.sin(a*Math.PI/180)*2.45),inside=at(74),outside=at(76);near(g.attackRange(p),2.5);near(basicFanAngle('sinclair'),150*Math.PI/180);g.attack(p,g.input.aim);near(inside.maxHp-inside.hp,factor(p,210));near(outside.hp,outside.maxHp);
});
test('distorted Yan advertises the inner bonus/stun radius in aim preview, warning and codex',()=>{
 const{g,p}=arena('yan');g.addBuff(p,'yanDistorted',20);const spec=skillTargeting(g,p,'q');assert.equal(spec.innerRadius,3);assert.ok(g.cast(p,'q',{x:45,y:20}));const f=g.effects.find(f=>f.type==='yanSwordWarning');near(f.innerR,3);assert.match(skillReference('yan',2,true).ranges[1].text,/中心|중심 반경 3/);
});
test('Hohenheim posthumous charge is fifty percent faster without changing ordinary charge',()=>{
 for(const active of[false,true]){const{g,p}=arena('hohenheim');if(active)p.state.posthumous={until:4.5};g.attack(p,g.input.aim);advance(g,.4);near(p.state.hohenCharge.progress,active?.6:.4);}
 const{g,p}=arena('hohenheim');g.cast(p,'q',g.input.aim);advance(g,.5);near(p.x,43.5);near(skillTargeting(g,p,'q').range,3.5);
});
test('Dongbaek builds damage on enemy-hit attacks and preserves it when changing targets',()=>{
 const{g,p}=arena('dongbaek'),first=target(g),second=target(g,60);g.attack(p,g.input.aim);near(first.maxHp-first.hp,factor(p,165));first.x=60;second.x=42;p.attackCd=0;p.ammo=3;g.attack(p,g.input.aim);near(second.maxHp-second.hp,factor(p,165*1.12));assert.equal(p.state.flowerChain.n,2);const at=p.state.flowerChain.at;g.input.aim={x:30,y:20};p.attackCd=0;p.ammo=3;g.attack(p,g.input.aim);assert.equal(p.state.flowerChain.n,2);assert.equal(p.state.flowerChain.at,at);assert.doesNotMatch(CHAMPIONS.dongbaek.passiveText,/같은 적|피해 중첩|데미지 증가/);assert.match(CHAMPIONS.dongbaek.basicText,/적중/);
});
test('ammo slot colors are fixed by slot, spent slots keep their hue, and only the current slot is active',()=>{
 const{g,p}=arena(),colors=Ezra.EZRA_WEAPONS.map(w=>w.color);for(let n=0;n<4;n++){p.state.weapon=n;p.ammo=4-n;const slots=Ezra.ammoSlots(g,p);assert.deepEqual(slots.map(s=>s.color),colors);assert.deepEqual(slots.map(s=>s.active),[0,1,2,3].map(i=>i===n));assert.deepEqual(slots.map(s=>s.loaded),[0,1,2,3].map(i=>i>=n));}g.cast(p,'r',g.input.aim);assert.ok(Ezra.ammoSlots(g,p).every(s=>s.color===Ezra.EZRA_AXE.color));
});
test('Alas and Namir fist sprites are slightly larger than ordinary hands and Alas rushes twice as fast',()=>{
 const{g,p}=arena();for(const w of[Ezra.EZRA_WEAPONS[0],Ezra.EZRA_WEAPONS[3]])assert.ok(w.length>.36&&w.length<.5);g.attack(p,g.input.aim);near(p.motion.speed,44);advance(g,.1);near(p.x,43.8);
});
test('Nester tracks facing while all three strikes hit the full circle',()=>{
 const{g,p}=arena();select(p,1);const east=target(g,42),north=target(g,40,22);g.attack(p,g.input.aim);near(east.maxHp-east.hp,factor(p,55));g.input.aim={x:40,y:30};advance(g,.61);near(east.maxHp-east.hp,factor(p,165));near(north.maxHp-north.hp,factor(p,165));near(p.state.ezraAttack.angle,Math.PI/2);for(const f of g.effects.filter(f=>f.theme==='ezra'&&f.type==='slash'))assert.equal(f.shape.kind,'circle');
});
test('drill swings once over 150 degrees and 3.3 reach, keeping its three ticks and electric field',()=>{
 const{g,p}=arena();select(p,2);const yes=target(g,41,22.8),no=target(g,39,22),cc=target(g,43.25,20);g.status(cc,'slow',.1,2,p);g.attack(p,g.input.aim);advance(g,.41);near(yes.maxHp-yes.hp,factor(p,57*3));near(no.hp,no.maxHp);near(cc.maxHp-cc.hp,factor(p,57*3)*1.15);assert.equal(g.soundEvents.filter(f=>f.kind==='swing'&&f.key==='ezra').length,1);assert.equal(p.state.ezraAttack.at,0);assert.ok(g.effects.some(f=>f.type==='ezraElectric'));const f=g.effects.find(f=>f.type==='slash');near(visualShape(f).spread,150*Math.PI/180);assert.equal(combatStyle('ezra',g,p,{weaponIndex:2}).element,'electric');near(skillTargeting(g,{...p,state:{...p.state,ezraLastWeapon:2}},'q').radius,150*Math.PI/180);
});
test('the drill points along the swing tangent on both sides of the character',()=>{
 for(const facing of[0,Math.PI]){const{g,p}=arena();select(p,2);p.facing=facing;g.input.aim={x:p.x+Math.cos(facing)*10,y:p.y};g.attack(p,g.input.aim);advance(g,.17);const pose=ezraWeaponPose(g,p,equipmentPose(g,p)),side=weaponOrientation(pose.angle).flip,blue={x:-Math.sin(pose.angle)*side,y:Math.cos(pose.angle)*side},wantedSide=weaponOrientation(facing).flip,tangent={x:-Math.sin(pose.angle)*wantedSide,y:Math.cos(pose.angle)*wantedSide};near(blue.x*tangent.x+blue.y*tangent.y,1);}
});
test('Namir leaps before applying damage, slams forward, and leaves an inward gravity field',()=>{
 const{g,p}=arena();select(p,3);const t=target(g,45);g.attack(p,{x:42.5,y:20});assert.equal(p.motion.kind,'leap');advance(g,.2);assert.ok(leapLift(p)>1);near(t.hp,t.maxHp);advance(g,.26);near(t.maxHp-t.hp,factor(p,200));assert.ok(g.effects.some(f=>f.type==='ezraGravity'&&f.r===3.5));advance(g,.1);const pose=ezraWeaponPose(g,p,equipmentPose(g,p));near(pose.angle,Math.PI/2);assert.ok(pose.hand.x>p.x);near(g.shield(p),0);
});
test('axe dash distance is selectable up to 2.5 and every axe effect is cerise',()=>{
 for(const[len,expected]of[[.8,.8],[8,2.5]]){const{g,p}=arena();g.cast(p,'r',g.input.aim);const x=p.x;g.attack(p,{x:x+len,y:p.y});advance(g,.2);near(p.x-x,expected);const f=g.effects.find(f=>f.type==='slash');assert.equal(f.weaponIndex,4);assert.equal(combatStyle('ezra',g,p,{weaponIndex:f.weaponIndex}).color,'#de3163');}
});
test('public descriptions remove basic-attack shields, use Korean skill names, and show the new reload time',()=>{
 assert.doesNotMatch(CHAMPIONS.ezra.basicText,/보호막/);assert.doesNotMatch(CHAMPIONS.ezra.rText,/보호막/);assert.match(CHAMPIONS.ezra.passiveText,/2.7초/);assert.match(skillReference('ezra',1).cooldown,/2.7초/);for(const c of Object.values(CHAMPIONS))for(const field of['passiveText','basicText','qText','rText'])assert.doesNotMatch(c[field]||'',/\b[QR]\b/);
});

test('the fourth axe attack completes one Hong Lu-style turn about Ezra after the dash',()=>{
 for(const facing of[0,Math.PI]){
  const{g,p}=arena();g.cast(p,'r',g.input.aim);p.ammo=1;p.state.ultAttacks=3;p.facing=facing;
  const aim={x:p.x+Math.cos(facing)*2.5,y:p.y};g.input.aim=aim;g.attack(p,aim);
  advance(g,.1);let pose=ezraWeaponPose(g,p,equipmentPose(g,p));assert.equal(pose.mode,null);assert.equal(pose.trail,false);
  advance(g,.08);const at=p.state.ezraAttack.at,angles=[];
  for(const age of[0,.05,.15,.299999]){
   g.time=at+age;const body=equipmentPose(g,p);pose=ezraWeaponPose(g,p,body);assert.equal(pose.mode,'orbit');assert.equal(pose.weapon,4);near(pose.hand.x,body.origin.x);near(pose.hand.y,body.origin.y-.65);angles.push(pose.angle);assert.equal(equippedWeapon(g,p)[0],'ezraAxe');
  }
  for(let i=1;i<angles.length;i++)assert.ok(angles[i]>angles[i-1]);near(angles.at(-1)-angles[0],Math.PI*2,1e-4);
  g.time=at+.31;assert.notEqual(equippedWeapon(g,p)[0],'ezraAxe');
 }
});
