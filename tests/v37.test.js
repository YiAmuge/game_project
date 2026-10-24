import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,damageFormula } from '../src/game.js';
import { CHAMPIONS,WORLD } from '../src/data.js';
import * as Don from '../src/don.js';
import * as Skills from '../src/skills.js';
import * as Infestation from '../src/infestation.js';
import * as Sora from '../src/sora.js';
import * as Yan from '../src/yan.js';
import { FRAMES } from '../src/art.js';
import { HAND_ANCHORS,MIDDLE_GRIP,equipmentPose,spriteOrigin,clawMotion,drawEquipment,drawBackEquipment,WEAPON_ART } from '../src/weapon-art.js';
import { projectileAsset,projectileAppearance } from '../src/projectile-vfx.js';
import { fallingSwordHeight,healingRipples } from '../src/champion-vfx.js';
import { leapLift } from '../src/projection-25d.js';
import { skillTargeting } from '../src/targeting.js';
import { eyeGlowPoints } from '../src/sprite-eyes.js';
import { SkillVFX } from '../src/skill-vfx.js';

const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function arena(key){const g=new Game(key,'top',{seed:370});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player;Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};g.input.aim={x:47,y:7};return {g,p};}
function target(g,x=42,y=7,key='faust'){const t=g.makeChampion(key,1,9);Object.assign(t,{x,y,maxHp:100000,hp:100000,lastAttackAt:100,lastDamageAt:100});return t;}
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
const damage=(g,p,n)=>damageFormula(n,CHAMPIONS[p.key].power,1)*g.powerScale(p);

test('every body has a mirrored anatomical right-hand anchor independent of aim rotation and ornament size',()=>{
 for(const key of Object.keys(CHAMPIONS)){const {g,p}=arena(key);assert.ok(HAND_ANCHORS[key],key);p.facing=0;const right=equipmentPose(g,p);assert.ok(right.right.x<p.x,key);p.facing=Math.PI;const left=equipmentPose(g,p);close(left.right.x-p.x,p.x-right.right.x);close(left.right.y,right.right.y);}
 assert.deepEqual([...MIDDLE_GRIP].sort(),['starbuck','don','sinclair','honglu','dongrang','hohenheim','marton','rudolph'].sort());
 const {g,p}=arena('myo');p.team=1;delete p.facing;assert.ok(equipmentPose(g,p).right.x>p.x);close(equipmentPose(g,p).angle,Math.PI);
});
test('hand and body origins move by exactly the same Z during jumps and presentation levitation',()=>{
 for(const key of ['don','myo','starbuck','rudolph']){const {g,p}=arena(key),base=equipmentPose(g,p,.2);p.motion={kind:'leap',elapsed:.5,minDuration:1,total:3,speed:3,arcHeight:3};const flying=equipmentPose(g,p,.2);close(base.right.y-flying.right.y,leapLift(p));close(base.left.y-flying.left.y,leapLift(p));close(base.origin.y-flying.origin.y,leapLift(p));close(spriteOrigin(g,p,.2).y,flying.origin.y);}
});
test('Sora claws complete left clockwise then right counterclockwise full turns in 0.24 seconds',()=>{
 const a=clawMotion(.06),b=clawMotion(.18),done=clawMotion(.24);close(a.left.angle,Math.PI);assert.ok(a.left.active&&!a.right.active);close(b.left.angle,2*Math.PI);close(b.right.angle,-Math.PI);assert.ok(!b.left.active&&b.right.active);close(done.right.angle,-2*Math.PI);assert.ok(!done.right.active);
 close(WEAPON_ART.sora[1],1.05*.8);close(WEAPON_ART.yan[1],2.5*1.2);assert.equal(WEAPON_ART.ppui[0],'ppuiHand');assert.ok(WEAPON_ART.ppui[1]<.6);
});
test('Starbuck harpoon points down through descent and the landing impact',()=>{
 const {g,p}=arena('starbuck');p.motion={kind:'leap',elapsed:.6,minDuration:.7,total:3,speed:3};close(equipmentPose(g,p).angle,Math.PI/2);delete p.motion;p.state.starbuckLandedAt=g.time;close(equipmentPose(g,p).angle,Math.PI/2);g.time+=.23;close(equipmentPose(g,p).angle,p.facing||0);
});
test('Myo eye glow uses two source pupil landmarks in the same local body coordinates',()=>{
 const f=FRAMES.myo,rect={left:-.8,top:-2.1,w:1.2,h:2.1},eyes=eyeGlowPoints(f,rect);assert.equal(eyes.length,2);for(const eye of eyes){assert.ok(eye.x>rect.left&&eye.x<rect.left+rect.w);assert.ok(eye.y>rect.top&&eye.y<rect.top+.8);}const raised=eyeGlowPoints(f,{...rect,top:rect.top-3});for(let i=0;i<2;i++)close(eyes[i].y-raised[i].y,3);
});

// Record real Canvas transform calls without a DOM so shield and weapon state
// transitions are checked independently of game damage and cooldown assertions.
function artRecorder(){const records=[],translations=[],rotations=[],scales=[];const c={save(){},restore(){},translate(x,y){translations.push([x,y]);},rotate(a){rotations.push(a);},scale(x,y){scales.push([x,y]);},drawImage(image,x,y,w,h,dx,dy,dw,dh){const key=Object.keys(FRAMES).find(k=>FRAMES[k].sheet===10&&FRAMES[k].x===x&&FRAMES[k].y===y);records.push({key,dw,dh});}};return {records,translations,rotations,scales,ctx:c,weaponTrail(){}};}
test('Myo keeps rifle behind her body, swaps exclusively to it for Q, and holds two reversed knives during R',()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;globalThis.Image=class{complete=true;naturalWidth=2048;};globalThis.document={getElementById:()=>null};
 try{const {g,p}=arena('myo');let r=artRecorder();drawBackEquipment(r,p,g);drawEquipment(r,p,g);assert.deepEqual(r.records.map(x=>x.key),['myoRifle','myoDagger']);assert.ok(r.rotations.includes(.95));
  p.castSlot='q';p.castAt=g.time;r=artRecorder();drawBackEquipment(r,p,g);drawEquipment(r,p,g);assert.deepEqual(r.records.map(x=>x.key),['myoRifle']);
  g.time+=.51;g.addBuff(p,'rabbitFrenzy',4.5);r=artRecorder();drawBackEquipment(r,p,g);drawEquipment(r,p,g);assert.deepEqual(r.records.map(x=>x.key),['myoRifle','myoDagger','myoDagger']);assert.ok(r.rotations.includes(Math.PI+.25)&&r.rotations.includes(Math.PI-.25));
 }finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
test('shield transforms stay fixed during Ishmael attacks and Nelly enlarges only the attacking knife',()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;globalThis.Image=class{complete=true;naturalWidth=2048;};globalThis.document={getElementById:()=>null};
 try{const {g,p}=arena('ishmael');p.facing=0;let r=artRecorder();drawEquipment(r,p,g);const idle=r.rotations.slice(0,3),idleHand=r.translations[0];p.attackAt=0;p.attackFacing=0;p.attackSerial=1;g.time=.1;r=artRecorder();drawEquipment(r,p,g);assert.deepEqual(r.rotations.slice(0,3),idle);const pose=equipmentPose(g,p);close(r.translations[0][0],pose.left.x);assert.ok(r.rotations.some(x=>Math.abs(x)>.1));
  const n=arena('nelly');r=artRecorder();drawEquipment(r,n.p,n.g);const width=r.scales[0][0];n.p.attackAt=0;n.p.attackSerial=1;n.g.time=.1;r=artRecorder();drawEquipment(r,n.p,n.g);close(r.scales[0][0]/width,1.5);n.g.time=.31;r=artRecorder();drawEquipment(r,n.p,n.g);close(r.scales[0][0],width);
  assert.ok(idleHand[0]>p.x);assert.ok(FRAMES.nellyKnife.source.includes('b41ae069'));
 }finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
test('projectile display changes preserve damage, widths, ranges and held weapon assets',()=>{
 const {g,p}=arena('yi'),q={source:p,theme:'yi',damageKind:'basic',width:.27};assert.equal(projectileAsset(q),false);assert.equal(projectileAppearance(q,g).type,'glass');assert.equal(WEAPON_ART.yi[0],'yiDagger');
 close(projectileAppearance({theme:'ppui',source:p,width:.2},g).visualScale,.7);close(projectileAppearance({theme:'nelly',source:p,slot:'q',width:.18},g).visualScale,.8);close(projectileAppearance({theme:'nelly',source:p,damageKind:'basic'},g).visualScale,1);
 close(fallingSwordHeight(.15),11);close(fallingSwordHeight(0),0);assert.equal(fallingSwordHeight(.151),null);close(Yan.YAN.distortedQDelay,1.75);
});
test('Meursault spends one round for two 120 hits, with debuffs only on hit two and unchanged interval',()=>{
 const {g,p}=arena('meursault'),t=target(g);const ammo=p.ammo;g.attack(p,t);close(100000-t.hp,damage(g,p,120));close(g.stat(t,'slow'),0);close(p.attackCd,.715);assert.equal(p.ammo,ammo-1);run(g,.1);close(100000-t.hp,damage(g,p,240));close(g.stat(t,'slow'),.2);assert.equal(g.effects.filter(x=>x.type==='impact'&&x.target===t.id).length,2);
});
test('Meursault Q cleanses status, burn, infestation, marks and a forced movement, then blocks their reapplication',()=>{
 const {g,p}=arena('meursault'),t=target(g,44,7,'sora'),y=target(g,45,7,'yan');g.status(p,'weak',.4,5,t);g.status(p,'taunt',1,5,t);Skills.applyBurn(g,t,p);Infestation.apply(g,p);Sora.mark(g,t,p);Yan.mark(g,y,p);p.state.mentalWhip={1:{stage:3,at:0}};p.state.ishmaelWeak={1:2};p.state.nellyMarks={1:{active:true}};g.startMotion(p,{x:1,y:0},2,{kind:'knock'});assert.ok(g.cast(p,'q',p));assert.deepEqual(p.status,{});assert.equal(p.burn,undefined);assert.equal(p.plague,undefined);assert.equal(p.motion,undefined);assert.equal(p.state.mentalWhip,undefined);assert.equal(p.state.ishmaelWeak,undefined);assert.equal(p.state.nellyMarks,undefined);assert.equal(t.state.orders[p.id],undefined);assert.equal(y.state.falseOrders[p.id],undefined);
 for(const key of ['slow','stun','root','silence','weak','armorDown','armorWeak','hasteWeak','reloadWeak','vulnerable','yanLock','disarm','captured','netCapture','taunt']){g.status(p,key,.5,5,t);close(g.stat(p,key),0);}
 Skills.applyBurn(g,t,p);Infestation.apply(g,p);assert.equal(Sora.mark(g,t,p),false);assert.equal(Yan.mark(g,y,p),false);assert.equal(p.burn,undefined);assert.equal(p.plague,undefined);assert.equal(g.startMotion(p,{x:1,y:0},1,{kind:'knock'}),false);
 g.time=4.01;g.status(p,'weak',.2,1,t);close(g.stat(p,'weak'),.2);Skills.applyBurn(g,t,p);assert.ok(p.burn);
});
test('Meursault next basic roots only on its second hit and only for that attack',()=>{
 const {g,p}=arena('meursault'),t=target(g);g.cast(p,'q',p);g.attack(p,t);close(g.stat(t,'root'),0);run(g,.1);close(g.stat(t,'root'),1);close(t.status.root.until-g.time,.3);run(g,.62);g.attack(p,t);run(g,.1);close(g.stat(t,'root'),0);
});
for(const progress of [0,.5,1])test(`Don release at ${progress} interpolates one rectangle and refills only a fully charged hit`,()=>{
 const {g,p}=arena('don'),t=target(g,42.8);p.ammo=0;g.cast(p,'q',t);g.time=progress*1.5;const shape=Don.chargeShape(g,p,t);close(shape.range,3+3.5*progress);close(shape.damage,120+330*progress);assert.ok(Don.release(g,p,t));close(100000-t.hp,damage(g,p,shape.damage));close(p.qCd,12);assert.equal(p.ammo,progress===1?2:0);close(g.stat(t,'stun'),progress===1?1:0);assert.equal(p.state.donCharge,undefined);assert.equal(Don.release(g,p,t),false);
});
test('Don full-charge hitbox includes body edges, refunds once across multiple enemies and misses do not refund',()=>{
 const {g,p}=arena('don'),edge=target(g,46,8.5),outside=target(g,46,8.6);target(g,44);p.ammo=0;g.cast(p,'q',{x:47,y:7});g.time=1.5;Don.release(g,p,{x:47,y:7});assert.ok(edge.hp<100000);close(outside.hp,100000);assert.equal(p.ammo,2);
 const b=arena('don');b.p.ammo=0;b.g.cast(b.p,'q',{x:47,y:7});b.g.time=1.5;Don.release(b.g,b.p,{x:47,y:7});assert.equal(b.p.ammo,0);
 const c=arena('don'),invincible=target(c.g);invincible.invulnerableUntil=3;c.p.ammo=0;c.g.cast(c.p,'q',invincible);c.g.time=1.5;Don.release(c.g,c.p,invincible);assert.equal(c.p.ammo,0);
});
test('Don charging defense and movement modifiers end on release or interruption and maximum charge auto-fires once',()=>{
 const {g,p}=arena('don'),t=target(g,45);const speed=g.speed(p),armor=g.armor(p);g.cast(p,'q',t);close((100+g.armor(p))/(100+armor),1.5);close(g.speed(p)/speed,.9);assert.equal(g.attack(p,t),false);assert.equal(g.cast(p,'q',t),false);assert.equal(skillTargeting(g,p,'q').confirm,false);run(g,1.51);assert.equal(p.state.donCharge,undefined);close(g.armor(p),armor);close(g.speed(p),speed);const hp=t.hp;run(g,.2);close(t.hp,hp);
 const b=arena('don');b.g.cast(b.p,'q',t);b.g.status(b.p,'silence',1,1);run(b.g,.01);assert.equal(b.p.state.donCharge,undefined);assert.ok(b.p.qCd>11.9);assert.equal(b.p.state.donThrust,undefined);
});
test('Honglu healing emits three expanding water ripples from the actual healing center',()=>{
 const {g,p}=arena('honglu');p.hp-=1000;g.cast(p,'q',p);run(g,1.21);const f=g.effects.find(x=>x.type==='hongluRipple');assert.ok(f);close(f.x,p.x);close(f.y,p.y);close(f.r,5);assert.equal(healingRipples(f,.3).length,3);assert.ok(healingRipples(f,.4)[0].r>healingRipples(f,.3)[0].r);assert.equal(healingRipples(f,.81).length,0);
});
test('Alisa swings a blunt weapon from side to side and emits fire in the actual attack footprint',()=>{
 const {g,p}=arena('alisa'),t=target(g);g.attack(p,t);assert.equal(g.attackStyle(p),'slash');const stroke=g.effects.find(x=>x.type==='slash');assert.ok(stroke);close(stroke.shape.range,g.attackRange(p));const v=new SkillVFX();v.sync(g,{width:1000,height:1000,worldToScreen:()=>({x:400,y:400})});assert.ok(v.emitters.some(x=>x.kind==='slash'&&x.element==='fire'));const a=equipmentPose(g,p).angle;p.attackSerial++;const b=equipmentPose(g,p).angle;assert.ok(a<0&&b>0);
});
