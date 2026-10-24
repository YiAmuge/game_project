import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,damageFormula } from '../src/game.js';
import { WORLD,RULES,RUNTIME_CHAMPIONS } from '../src/data.js';
import { distance } from '../src/geometry.js';
import { canOccupy,moveBody } from '../src/collision.js';
import { skillTargeting } from '../src/targeting.js';
import * as Skills from '../src/skills.js';
import * as H from '../src/hohenheim.js';
import * as Y from '../src/yan.js';
import * as T from '../src/training.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function quiet(key){const g=new Game(key,'top',{seed:210});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};const p=g.player;Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};return {g,p};}
function target(g,x=43,y=7,team=1,key='faust'){const t=g.makeChampion(key,team,9);Object.assign(t,{x,y,maxHp:100000,hp:100000,level:10,lastAttackAt:100,lastDamageAt:100});return t;}
const expected=(g,p,base)=>damageFormula(base,RUNTIME_CHAMPIONS[p.key].power,1)*g.powerScale(p);
test('Yan receives one instant maximum sword only in the second after natural Q completion',()=>{
 const {g,p}=quiet('yan'),t=target(g,44);g.cast(p,'q',t);run(g,1.81);const hp=t.hp;assert.ok(g.attack(p,t));assert.equal(p.state.yanCharge,undefined);close(hp-t.hp,expected(g,p,200));assert.equal(p.state.yanInstantUntil,undefined);p.attackCd=0;assert.ok(g.attack(p,t));assert.ok(p.state.yanCharge);Y.cancelCharge(p);
 const b=quiet('yan');b.g.cast(b.p,'q',b.p);run(b.g,2.85);b.g.attack(b.p,{x:44,y:7});assert.ok(b.p.state.yanCharge);
});
test('Yan distorted sword and Don R cast without coordinate confirmation',()=>{const {g,p}=quiet('yan');p.state.ominous=6;g.cast(p,'r',p);assert.equal(skillTargeting(g,p,'q').confirm,false);const d=quiet('don');assert.equal(skillTargeting(d.g,d.p,'r').confirm,false);assert.ok(d.g.cast(d.p,'r',{x:47,y:7}));assert.ok(d.p.motion);});
test('Sinclair cannot acquire marks from any source during awakening',()=>{const {g,p}=quiet('sinclair');g.addMark(p,3);assert.ok(g.buff(p,'marks'));g.addMark(p,1);g.addMark(p,3);close(p.marks,0);run(g,4.01);g.addMark(p);close(p.marks,1);});
test('Don rectangle hits side edges, excludes outside and heals only on each fourth pulse',()=>{
 const {g,p}=quiet('don'),t=target(g,44,8.4),out=target(g,43,8.6);p.hp-=1000;g.cast(p,'q',{x:47,y:7});run(g,.74);const hp=p.hp,enemy=t.hp;close(out.hp,100000);assert.ok(t.hp<100000);run(g,.02);close(p.hp-hp,(enemy-t.hp)*.2);assert.equal(p.state.donBarrage.hits,4);
});
test('Faust gains nine automatic XP, loses the old earned-XP bonus and keeps max-level basic bonuses',()=>{
 const {g,p}=quiet('faust');run(g,1);close(p.xp,9);g.award(p,100,0);close(p.xp,109);g.kill(p,p);run(g,1);close(p.xp,118);g.award(p,7000,0);close(p.level,10);close(g.ammoCap(p),4);close(g.attackRange(p),7.5);
});
test('Faust semicircle knocks near and far enemies beyond radius three at speed eighteen, not enemies behind',()=>{
 const {g,p}=quiet('faust'),near=target(g,41,7),far=target(g,42.8,8),behind=target(g,38,7);g.cast(p,'q',{x:44,y:7});assert.equal(near.motion.speed,18);assert.equal(far.motion.speed,18);close(behind.hp,100000);run(g,.3);assert.ok(distance(p,near)>3+near.radius);assert.ok(distance(p,far)>3+far.radius);
 const b=quiet('faust');b.p.level=10;const t=target(b.g);b.g.cast(b.p,'q',t);assert.equal(b.g.stat(t,'slow'),.2);
});
test('Faust R automatically detonates after 1.25 seconds at ten and stacks power and armor for five seconds without reload or haste',()=>{
 const {g,p}=quiet('faust');p.level=10;const t=target(g,45),power=g.powerScale(p),reload=g.reloadInterval(p),haste=g.haste(p);g.cast(p,'r',t);close(p.channelUntil,g.time);g.updateDelayed(0);assert.equal(g.buff(p,'faustUlt'),false);run(g,1.25);assert.ok(g.buff(p,'faustUlt'));close(g.powerScale(p)/power,1.1);close(g.armor(p),10);close(g.reloadInterval(p),reload);close(g.haste(p),haste);close(p.buffs.faustUlt-g.time,5);
});
test('Gubo bullet crosses terrain and every enemy with linear five-percent decay capped at thirty',()=>{
 const {g,p}=quiet('gubo');p.range=20;p.sniperReady=100;const ts=Array.from({length:9},(_,i)=>target(g,42+i*1.5));g.map.walls=[{x:44,y:4,w:.4,h:6}];g.attack(p,{x:65,y:7});run(g,1.3);ts.forEach((t,i)=>close(100000-t.hp,expected(g,p,360)*(1-Math.min(.3,i*.05))));
});
test('Gubo always deals full damage to an eligible ally after piercing enemies',()=>{const {g,p}=quiet('gubo');target(g,42);target(g,44);const a=target(g,46,7,0);a.hp=20000;g.attack(p,{x:50,y:7});run(g,.5);close(20000-a.hp,expected(g,p,360));});
for(const [slot,ratio] of [['basic',.2],['r',.25]])test(`Gubo ${slot} allied execution has one uncapped 14.7 cone using current power`,()=>{
 const {g,p}=quiet('gubo'),a=target(g,42,7,0),t=target(g,55),behind=target(g,25);a.maxHp=1000;a.hp=1;const power=g.combatPower(p);
 if(slot==='r'){g.cast(p,'r',a);a.x=70;run(g,1.19);assert.ok(a.alive);a.x=42;run(g,.02);}else g.attack(p,a),run(g,.2);
 assert.ok(!a.alive);close(100000-t.hp,(power+t.maxHp)*ratio);close(behind.hp,100000);assert.equal(g.effects.filter(f=>f.type==='guboBlast').length,1);if(slot==='r'){assert.equal(g.projectiles.length,0);assert.ok(g.effects.some(f=>f.type==='guboLaser'));}
});
test('Gubo aimed R hits a locked target beyond range and through terrain with instant laser',()=>{const {g,p}=quiet('gubo'),t=target(g);g.cast(p,'r',t);t.x=78;g.map.walls=[{x:50,y:0,w:1,h:15}];run(g,1.19);close(t.hp,100000);run(g,.02);assert.ok(t.hp<100000);assert.equal(g.projectiles.length,0);});
test('Queequeg straight six hits and attack bonuses expire after the volley',()=>{const {g,p}=quiet('queequeg'),t=target(g,42.9,8.2),outside=target(g,42,8.5);const speed=g.speed(p),armor=g.armor(p);g.attack(p,{x:45,y:7});close(g.speed(p)/speed,1.07);close((100+g.armor(p))/(100+armor),1.07);run(g,.4);assert.equal(p.state.captureHits[t.id],6);close(outside.hp,100000);run(g,.03);close(g.speed(p),speed);});
test('Queequeg links at eight and shares immortality, reload, movement and end healing with any ally',()=>{
 const {g,p}=quiet('queequeg'),a=target(g,47.8,7,0,'yi'),enemy=target(g,43);a.level=1;assert.ok(g.cast(p,'q',a));const reload=g.reloadInterval(a),speed=g.speed(a);g.cast(p,'r',p);assert.ok(g.buff(a,'queequegUlt'));close(g.speed(a)/speed,1.25);assert.ok(g.reloadInterval(a)<reload);g.deal(enemy,a,1e9,{fixed:true});close(a.hp,1);run(g,4.01);assert.ok(a.alive&&a.hp>1);assert.equal(a.state.queegHealAt,undefined);
});
test('Ishmael cannot walk during flight or pull, hooks at eighteen and unlocks after both end',()=>{
 const {g,p}=quiet('ishmael'),t=target(g,49);g.input.x=1;g.cast(p,'r',t);close(g.speed(p),0);run(g,.57);close(p.x,40);assert.equal(t.motion?.speed,18);assert.ok(t.x<49&&t.x>46);run(g,.6);assert.ok(p.x>40);assert.equal(p.state.ishmaelCast,undefined);assert.ok(distance(p,t)<2);
});
test('missed or terrain-blocked Ishmael harpoons release the movement lock',()=>{for(const blocked of [false,true]){const {g,p}=quiet('ishmael');if(blocked)g.map.walls=[{x:43,y:3,w:1,h:8}];g.cast(p,'r',{x:60,y:7});run(g,1.3);assert.ok(g.speed(p)>0);}});
test('Gregor slows only while victims travel, at double pull speed, and clears interrupted hooks',()=>{
 const {g,p}=quiet('gregor'),t=target(g,45),speed=g.speed(p);g.cast(p,'q',t);close(g.speed(p)/speed,.8);assert.equal(t.motion.speed,12);run(g,.4);close(g.speed(p),speed);assert.ok(distance(p,t)<1.3);
 p.qCd=0;t.x=45;g.cast(p,'q',t);delete t.motion;run(g,.01);close(g.speed(p),speed);
});
for(const progress of [0,.49,.5,1])test(`Heathcliff hold/release charge ${progress} has interpolated range, damage and stun`,()=>{
 const {g,p}=quiet('heathcliff');g.cast(p,'q',{x:60,y:7});g.time=progress*1.5;const c=Skills.heathCharge(g,p,{x:60,y:7});close(c.range,.5+6.5*progress);close(c.damage,80+170*progress);close(c.stun,progress<.5?0:progress);assert.ok(Skills.releaseHeath(g,p,{x:60,y:7}));assert.equal(p.state.chargeAt,undefined);assert.ok(p.motion);close(p.motion.total,c.range);assert.ok(p.qCd>0);
});
test('Heathcliff holds a full charge until release and cancels under CC without cooldown',()=>{const {g,p}=quiet('heathcliff');g.cast(p,'q',{x:47,y:7});run(g,2);close(p.x,40);assert.equal(Skills.heathCharge(g,p,{x:47,y:7}).progress,1);g.status(p,'stun',1,1);run(g,.01);assert.equal(p.state.chargeAt,undefined);close(p.qCd,0);});
test('Outis basic damage gains 25 percent within 2.5 range',()=>{for(const x of [42,47]){const {g,p}=quiet('outis'),t=target(g,x);g.attack(p,t);run(g,.5);close(100000-t.hp,damageFormula(215,4,1)*g.powerScale(p)*(x===42?1.25:1));}});
test('Outis R contact damages once then retreats and excludes that target from the forward blast',()=>{
 const {g,p}=quiet('outis'),t=target(g,43),back=target(g,47);g.cast(p,'r',{x:48,y:7});assert.ok(p.state.outisRush);const hp=p.hp;g.deal(t,p,100,{damageKind:'skill'});close(hp-p.hp,damageFormula(100,4,1)*g.powerScale(t)*.5);run(g,.8);close(100000-t.hp,damageFormula(450,4,1)*g.powerScale(p)*1.25);close(100000-back.hp,damageFormula(220,4,1)*g.powerScale(p));assert.ok(p.x<41);assert.equal(p.state.outisRush,undefined);assert.ok(canOccupy(g,p,p));
});
test('Outis R maximum distance produces a forward blast and terrain blocks that blast',()=>{for(const wall of [false,true]){const {g,p}=quiet('outis'),t=target(g,48);if(wall)g.map.walls=[{x:43,y:3,w:1,h:8}];g.cast(p,'r',{x:50,y:7});run(g,.6);if(wall)close(t.hp,100000);else assert.ok(t.hp<100000);assert.equal(g.projectiles.length,0);assert.ok(!p.motion);assert.ok(!g.blocked(p.x,p.y,p.radius));}});
test('Marton uses a near 190 sweep with stride or distant 100 root and channel refreshes taunt',()=>{
 for(const [x,damage] of [[42,190],[45,100]]){const {g,p}=quiet('marton'),t=target(g,x);g.attack(p,t);close(100000-t.hp,damageFormula(damage,RUNTIME_CHAMPIONS[p.key].power,1)*g.powerScale(p));assert.equal(g.buff(p,'martonStride'),damage===190);}
 const {g,p}=quiet('marton'),t=target(g,46.7);g.cast(p,'r',p);close(p.channelUntil,2.5);run(g,2.3);assert.ok(g.stat(t,'taunt'));assert.ok(t.status.taunt.until>2.5);
});
test('Honglu insight phases enemies, respects walls, separates safely and heals all allies when ending',()=>{
 const {g,p}=quiet('honglu'),enemy=target(g,41.2),ally=target(g,44,7,0,'yi');ally.hp-=1000;p.hp-=1000;const hp=p.hp,speed=g.speed(p);g.cast(p,'q',p);close(p.qCd,12);close(g.speed(p)/speed,1.4);g.deal(enemy,p,100,{fixed:true});close(p.hp,hp);close(g.shield(p),250);moveBody(g,p,1.2,0);assert.ok(p.x>41);run(g,1.21);close(p.hp,hp+500);close(ally.hp,99500);assert.ok(canOccupy(g,p,p));assert.ok(!g.buff(p,'insight'));
 const b=quiet('honglu');b.g.map.walls=[{x:41,y:3,w:1,h:8}];b.g.cast(b.p,'q',b.p);moveBody(b.g,b.p,3,0);assert.ok(b.p.x<40.53);
});
test('Honglu waterfall moves in the initial direction and recast toggles without resetting duration or cooldown',()=>{const {g,p}=quiet('honglu');g.cast(p,'r',{x:45,y:7});const z=g.zones[0];run(g,.5);close(z.x,45.75);const until=z.until,cd=p.rCd;assert.ok(g.cast(p,'r',p));run(g,.5);close(z.x,45.75);close(z.until,until);close(p.rCd,cd-.5);g.cast(p,'r',p);run(g,.2);close(z.x,46.05);});
test('Hohenheim fixed electric field has no chase target',()=>{
 const {g,p}=quiet('hohenheim');g.cast(p,'r',{x:44,y:7});const z=g.zones[0];run(g,.5);close(z.x,44);close(z.y,7);close(z.r,5);
});
test('training supports duplicate allied/enemy champions, AI defaults off, controls only summons and preserves home on respawn',()=>{
 const g=new Game('honglu','top',{mode:'training',seed:21});g.practice.lineStopped=true;const dummy=g.champions().find(e=>e.trainingDummy),a=T.summon(g,'outis',0,{x:30,y:35}),b=T.summon(g,'outis',1,{x:34,y:35});assert.ok(a&&b&&a.id!==b.id);assert.equal(g.practice.championAI,false);const hp=b.hp;run(g,.3);close(b.hp,hp);g.practice.invincible=true;g.practice.infiniteAmmo=true;g.practice.noCooldown=true;T.setChampionAI(g,true);run(g,.8);assert.ok(b.hp<hp);assert.ok(a.qCd>0||a.rCd>0);assert.ok(dummy.trainingDummy);T.setChampionAI(g,false);a.ammo=0;a.attackCd=1;a.reloadProgress=0;a.qCd=3;g.events=[];g.projectiles=[];const x=a.x;run(g,.2);close(a.x,x);close(a.ammo,0);assert.ok(a.qCd>2);g.kill(a,b);a.respawnAt=g.time;run(g,.01);close(a.x,30);close(a.y,35);
});
test('training rejects bad summon positions, supports dead-player summon and cancels held bot charges when AI is disabled',()=>{
 const g=new Game('faust','top',{mode:'training'});assert.equal(T.summon(g,'outis',1,{x:37.5,y:20}),false);assert.equal(T.summon(g,'missing',1,{x:30,y:35}),false);T.deathOrRespawn(g);const e=T.summon(g,'heathcliff',1,{x:30,y:35});assert.ok(e);g.cast(e,'q',{x:32,y:35});assert.ok(e.state.chargeAt!==undefined);T.setChampionAI(g,false);assert.equal(e.state.chargeAt,undefined);
});
