import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,damageFormula } from '../src/game.js';
import { FOUNTAIN_AREAS,inWell,AUGMENTS,MINIONS } from '../src/data.js';
import * as A from '../src/augments.js';
import * as F from '../src/fountain.js';
import * as Skills from '../src/skills.js';
import { stackGauge,towerTargeters,threatRanges } from '../src/overlays.js';
import { leapOpacity,leapLift } from '../src/projection-25d.js';
import { moveBody,canOccupy } from '../src/collision.js';
const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function arena(key='faust'){
 const g=new Game(key,'top',{mode:'training',seed:33}),p=g.player;
 Object.assign(g,{units:[p],events:[],effects:[],projectiles:[],pending:[],zones:[],corpses:[],time:10});g.map={bounds:{x:0,y:0,w:80,h:60},walls:[]};g.bounds=g.map.bounds;g.practice.lineStopped=true;
 Object.assign(p,{x:20,y:20,lastAttackAt:100,lastDamageAt:100});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 return {g,p};
}
function hero(g,x=23,y=20,team=1,key='faust'){const t=g.makeChampion(key,team,10+g.units.length);Object.assign(t,{x,y,maxHp:100000,hp:100000,lastAttackAt:100,lastDamageAt:100});return t;}
function run(g,s){for(let i=0;i<Math.round(s*120);i++)g.step(1/120);}
function upgrade(p){p.upgrades={power:3,health:3,speed:1,reload:1,haste:1};p.gold=10000;}
test('fountains cover all four inclusive corners of each rear room and exclude neighboring terrain',()=>{
 for(const [team,a] of FOUNTAIN_AREAS.entries()){for(const [x,y] of [[a.x,a.y],[a.x+a.w,a.y],[a.x,a.y+a.h],[a.x+a.w,a.y+a.h]])assert.ok(inWell({x,y},team));assert.equal(inWell({x:a.x-.001,y:a.y+1},team),false);assert.equal(inWell({x:a.x+a.w+.001,y:a.y+1},team),false);}
});
test('fountain removes 1000 HP every half-second without touching shields or triggering defensive effects',()=>{
 const {g,p}=arena();g.training=false;Object.assign(p,{x:FOUNTAIN_AREAS[1].x+2,y:24,hp:2500,maxHp:3400});p.augments=['kAmpule'];g.addShield(p,800,'test',30);g.addBuff(p,'queequegUlt',30);p.invulnerableUntil=Infinity;p.untargetableUntil=Infinity;p.state.counter={until:100};
 F.tick(g,p,.49);close(p.hp,2500);F.tick(g,p,.01);close(p.hp,1500);close(g.shield(p),800);F.tick(g,p,.5);close(p.hp,500);F.tick(g,p,.5);assert.equal(p.alive,false);close(p.hp,0);assert.equal(p.deaths,1);assert.equal(p.state.ampuleReady,undefined);assert.equal(p.state.posthumous,undefined);
});
for(const key of ['hohenheim','alisa','queequeg','sora','yan'])test(`enemy fountain bypasses ${key} death interception and immortality`,()=>{
 const {g,p}=arena(key);g.training=false;Object.assign(p,{x:FOUNTAIN_AREAS[1].x+2,y:24,hp:1});p.augments=['kAmpule'];p.invulnerableUntil=Infinity;p.state.heat=5;p.state.blastArmed=true;g.addBuff(p,'queequegUlt',10);F.tick(g,p,.5);assert.equal(p.alive,false);assert.equal(p.deaths,1);assert.equal(p.state.posthumous,undefined);assert.equal(p.state.detonating,undefined);assert.equal(p.state.ampuleReady,undefined);
});
test('fountain applies to enemy minions, neutral creeps and invulnerable summons, never allies',()=>{
 const {g,p}=arena();g.training=false;const a=FOUNTAIN_AREAS[0],point={x:a.x+1,y:a.y+1},creep=g.makeNeutral(point.x,point.y,'side');
 const minion=g.entity({kind:'minion',team:1,...point,maxHp:500}),summon=g.entity({kind:'summon',key:'yanHand',team:1,...point,maxHp:1,invulnerableUntil:Infinity});Object.assign(p,point);const hp=p.hp;
 for(const e of [creep,minion,summon,p])F.tick(g,e,.5);assert.ok(!creep.alive&&!minion.alive&&!summon.alive);close(p.hp,hp);
});
test('battery begins at two seconds without taking damage even while attacking, caps and grants ten haste',()=>{
 const {g,p}=arena();p.augments=['forceBattery'];p.lastDamageAt=10;p.lastAttackAt=100;g.time=11.99;A.tick(g,p,.1);close(g.shield(p),0);g.time=12;A.tick(g,p,1);close(g.shield(p),p.maxHp*.13);close(g.haste(p),.1);A.tick(g,p,3);close(g.shield(p),p.maxHp*.3);p.shields[0].value=p.maxHp*.099;close(g.haste(p),0);
});
test('sword union gives ten power and ten percent armor penetration in real damage',()=>{
 const {g,p}=arena(),t=hero(g);t.armor=100;const power=g.powerScale(p);p.augments=['power15'];close(g.powerScale(p)/power,1.1);const hit=g.deal(p,t,100,{proc:false});close(hit,damageFormula(100,4,1)*1.1/(1+.9));
});
test('glaive heals thirty percent of actual HP damage, including periodic damage, without healing from absorbed damage',()=>{
 const {g,p}=arena(),t=hero(g);p.augments=['glaive'];p.hp-=1000;let hp=p.hp;const actual=g.deal(p,t,100);close(p.hp-hp,actual*.3);hp=p.hp;g.addShield(t,1000,'test',3);g.deal(p,t,100);close(p.hp,hp);t.shields=[];g.deal(p,t,100,{fixed:true,proc:false});close(p.hp-hp,30);
});
test('wisdom preserves half-speed magazine reload during attacking and full speed when idle',()=>{
 const {g,p}=arena();p.augments=['wisdom'];p.ammo=0;p.attackCd=10;const gap=g.reloadInterval(p);run(g,gap);close(p.reloadProgress,gap*.5,1/60);assert.equal(p.ammo,0);p.attackCd=0;g.input.fire=false;run(g,gap*.52);assert.ok(p.ammo>=1);
});
test('duel manual power follows actual bonus movement without recursive stat calculation',()=>{
 const {g,p}=arena();p.augments=['duelManual'];close(g.speed(p)/g.baseSpeed(p),1.05);close(g.powerScale(p),1.05);g.addBuff(p,'hohenheimStride',1);close(g.powerScale(p),1.35);p.upgrades.speed=3;close(g.powerScale(p),1.44);
});
test('antimatter adds health and ticks on half-second boundaries only inside range',()=>{
 const {g,p}=arena(),near=hero(g,21.5),far=hero(g,22.2);p.augments=['antimatter'];close(g.maxHp(p),3400*1.1);A.tick(g,p,0);run(g,.49);close(near.hp,100000);run(g,.02);close(near.hp,99980);close(far.hp,100000);run(g,.5);close(near.hp,99960);
});
test('written orders expire individually, grant armor and convert ten percent before armor',()=>{
 const {g,p}=arena(),t=hero(g);p.augments=['writtenOrder'];t.armor=100;
 for(let i=0;i<5;i++){g.time=10+i;g.deal(p,t,1);}close(g.armor(p),25);const hit=g.deal(p,t,100,{proc:false});close(hit,damageFormula(100,4,1)*(.9/2+.1));g.time=15;close(g.armor(p),20);g.time=19;close(g.armor(p),0);
});
test('trauma negates one CC, restores one magazine, retains its sixteen-second cooldown through death and covers knockback',()=>{
 const {g,p}=arena(),t=hero(g);p.augments=['traumaGuard'];p.ammo=0;g.status(p,'armorDown',10,1,t);assert.equal(p.state.traumaReady,undefined);g.status(p,'stun',1,2,t);close(g.stat(p,'stun'),0);close(p.ammo,1);close(p.state.traumaReady,26);g.status(p,'root',1,2,t);close(g.stat(p,'root'),1);g.kill(p,t);close(p.state.traumaReady,26);
 const b=arena();b.p.augments=['traumaGuard'];b.p.ammo=0;assert.equal(b.g.startMotion(b.p,{x:1,y:0},2,{kind:'knock'}),false);close(b.p.ammo,1);assert.equal(b.p.motion,undefined);
});
test('carrier can be bought with four occupied slots, admits a fifth normal augment and is only sellable in training',()=>{
 const {g,p}=arena();upgrade(p);p.augments=['power15','glaive','resentment','kAmpule'];assert.ok(g.buyAugment(p,'carrier'));close(A.usedSlots(p),4);close(A.slots(p),5);assert.ok(g.buyAugment(p,'wisdom')===false);assert.ok(g.buyAugment(p,'magazine2'));close(A.usedSlots(p),5);assert.equal(p.augments.length,6);g.training=false;Object.assign(p,{x:FOUNTAIN_AREAS[0].x+2,y:24,lastCombat:-99});assert.equal(g.sellAugment(p,'carrier'),false);g.training=true;assert.ok(g.sellAugment(p,'carrier'));close(A.slots(p),4);
});
test('mask has independent five-second two-stack timers and high-risk contributes power and cooldown',()=>{
 const {g,p}=arena();p.augments=['maskDeLu','highRisk'];const gap=g.reloadInterval(p);g.cast(p,'q',{x:25,y:20});close(g.speed(p)/g.baseSpeed(p),1.06);close(g.reloadInterval(p),gap/1.26);g.time+=2;p.rCd=0;g.cast(p,'r',{x:25,y:20});close(g.speed(p)/g.baseSpeed(p),1.12);close(g.powerScale(p),1.05);close(g.cooldown(p,'q'),11*.95);g.time=15.1;close(A.liveStacks(g,p,'maskStacks').length,1);g.time=17.1;close(A.liveStacks(g,p,'maskStacks').length,0);
});
test('all three augment categories contain seven unique fully named definitions',()=>{assert.equal(AUGMENTS.length,21);assert.equal(new Set(AUGMENTS.map(a=>a.key)).size,21);for(const group of ['combat','survival','tech'])assert.equal(AUGMENTS.filter(a=>a.group===group).length,7);});
test('stack gauges use under-ammo progress and transformation/awakening time',()=>{
 for(const [key,buff,duration] of [['sinclair','marks',4],['gregor','mutant',5],['sora','soraEgo',20],['yan','yanDistorted',20],['myo','rabbitFrenzy',4.5]]){const {g,p}=arena(key);g.addBuff(p,buff,duration,{copy:false});close(stackGauge(p,g).ratio,1);g.time+=duration/2;close(stackGauge(p,g).ratio,.5);assert.equal(stackGauge(p,g).timer,true);}
 const {g,p}=arena('sora');p.state.unlock=3;close(stackGauge(p,g).ratio,.6);
});
test('Alisa explosion phases opponents, does not leave a corpse and gives max-health-scaled burn',()=>{
 const {g,p}=arena('alisa'),t=hero(g,21);Skills.beginAlisaDetonation(g,p,p);assert.ok(p.phaseEnemiesUntil>g.time);moveBody(g,p,.8,0);assert.ok(p.x>20.7);run(g,2.01);assert.equal(p.alive,false);assert.equal(g.corpses.filter(c=>c.key==='alisa').length,0);assert.ok(t.burn.explosion);close(t.burn.damage,15+p.maxHp*.015);
});
test('lethal burns cannot leave dead creep aggro, pattern or DoT state, and respawn is clean',()=>{
 for(const explosion of [false,true]){const {g,p}=arena('alisa'),n=g.makeNeutral(23,20,'amplify');n.hp=1;Skills.applyBurn(g,p,n,explosion);run(g,.51);assert.equal(n.alive,false);assert.equal(n.burn,undefined);assert.equal(n.aggro,null);assert.equal(n.hostile,false);assert.equal(n.pattern,undefined);Skills.applyBurn(g,p,n,explosion);assert.equal(n.burn,undefined);g.time=n.respawnAt;g.step(.01);assert.ok(n.alive);const hp=n.hp;run(g,3);close(n.hp,hp);assert.equal(n.hostile,false);}
});
test('Hohenheim first-contact dash damages and recoils two units in the opposite direction',()=>{
 const {g,p}=arena('hohenheim'),t=hero(g,21.8);g.cast(p,'q',t);run(g,.6);assert.ok(t.hp<100000);assert.ok(p.x<19.5);assert.ok(!p.motion);assert.ok(canOccupy(g,p,p));
});
test('Outis ultimate kills refund thirty percent of the base cooldown per kill',()=>{
 const {g,p}=arena('outis'),t=hero(g,22);t.hp=1;g.cast(p,'r',t);run(g,.3);assert.equal(t.alive,false);assert.ok(p.rCd<=g.cooldown(p,'r')*.7);assert.ok(g.buff(p,'outisReload'));
});
test('Ahab ultimate grants exactly a five-second recast window for champion kills',()=>{
 const {g,p}=arena('ahab'),t=hero(g,24);t.hp=1;g.cast(p,'r',t);run(g,.46);close(p.state.recastUntil-(10+.45),5,1/120+.00001);assert.equal(p.state.recastSpent,false);
});
test('Honglu shares numerical half-strength buffs and shield amount on a shared two-second timer',()=>{
 const {g,p}=arena('honglu'),ally=hero(g,24,20,0);g.addBuff(p,'blessing',10);close(g.haste(p),.12);close(g.haste(ally),.06);close(p.buffs.blessing,ally.buffs.blessing);close(p.state.copyReady,g.time+2);g.time+=2;g.addShield(p,350,'gift',2);close(g.shield(p),350);close(g.shield(ally),175);
});
test('Honglu Q provides a breakable shield, can end on recast and emits its healing wave',()=>{
 const {g,p}=arena('honglu'),t=hero(g),ally=hero(g,24,20,0);p.hp-=1000;ally.hp-=1000;const hp=p.hp;g.cast(p,'q',p);close(g.cooldown(p,'q'),12);close(g.shield(p),350);assert.ok(!(p.invulnerableUntil>g.time));g.deal(t,p,100,{fixed:true,proc:false});close(p.hp,hp);g.deal(t,p,300,{fixed:true,proc:false});close(p.hp,hp-50);assert.ok(g.cast(p,'q',p));close(p.hp,hp+450);close(ally.hp,99500);assert.ok(!g.buff(p,'insight'));assert.equal(p.phaseEnemiesUntil,0);assert.equal(p.state.insightUntil,undefined);
});
test('Sora base Q follows a high arc over walls and settles on legal ground',()=>{
 const {g,p}=arena('sora');g.map.walls=[{x:22,y:18,w:1,h:4}];g.cast(p,'q',{x:27,y:20});assert.equal(p.motion.kind,'leap');assert.equal(p.motion.ignoreWalls,true);run(g,.4);assert.ok(leapLift(p)>2);run(g,.5);assert.ok(p.x>26);assert.ok(canOccupy(g,p,p));
});
test('Starbuck opacity fades with height on ascent and descent at the same motion timestamps',()=>{
 const e={key:'starbuck',motion:{kind:'leap',minDuration:.7,elapsed:0}};close(leapOpacity(e),1);e.motion.elapsed=.12;const early=leapOpacity(e);assert.ok(early>0&&early<1);e.motion.elapsed=.27;close(leapOpacity(e),0);e.motion.elapsed=.55;assert.ok(leapOpacity(e)>0&&leapOpacity(e)<1);e.motion.elapsed=.7;close(leapOpacity(e),1);
});
test('structure target markers and threat range display follow the current target and actual range',()=>{
 const {g,p}=arena();const t=g.entity({kind:'tower',team:1,x:27,y:20,range:8.5,maxHp:5000,targetId:p.id});assert.equal(towerTargeters(g,p)[0],t);let count=0;const renderer={circle:()=>count++};threatRanges(renderer,g);assert.equal(count,1);t.x=40;threatRanges(renderer,g);assert.equal(count,2);t.targetId=null;threatRanges(renderer,g);assert.equal(count,2);
});
