import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,damageFormula} from '../src/game.js';
import {CHAMPIONS} from '../src/data.js';
import * as M from '../src/moses.js';
import * as P from '../src/ppui.js';
import {skillCharges} from '../src/skills.js';
import {skillReference} from '../src/skill-reference.js';
import {mobileAutoAim} from '../src/mobile-aim.js';
import {debuffBadges} from '../src/champion-update-effects.js';
import {stackInfo,stackGauge} from '../src/overlays.js';
import {mosesWeaponPose} from '../src/moses-vfx.js';
import {equipmentPose} from '../src/weapon-art.js';
import {SnapshotWriter,applySnapshot} from '../src/online-state.js';
import {executeCommand} from '../src/online-game.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function arena(key='moses'){
 const g=new Game(key,'support',{mode:'training',seed:121}),p=g.player;
 g.units=[p];g.map={walls:[],bounds:{x:0,y:0,w:120,h:100}};g.bounds=g.map.bounds;
 Object.assign(g.practice,{lineStopped:true,pauseXp:true});Object.assign(p,{x:40,y:40,lastDamageAt:999,lastAttackAt:999,lastCombat:999});g.input.aim={x:50,y:40};
 g.aiChampion=g.aiMinion=g.aiNeutral=g.aiStructure=()=>{};return {g,p};
}
function hero(g,team=1,x=43,y=40,key='faust',maxHp=100000){const t=g.makeChampion(key,team,g.nextId+20);Object.assign(t,{x,y,hp:maxHp,maxHp,armor:0,lastDamageAt:999,lastAttackAt:999,lastCombat:999});return t;}
const run=(g,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120);};
const damage=(g,p,n)=>damageFormula(n,CHAMPIONS[p.key].power,1)*g.powerScale(p);
const shoot=(g,p)=>assert.ok(g.attack(p,g.input.aim));
const pool=(g,p,t)=>t.shields.find(s=>s.source===`moses-breath-${p.id}`&&s.until>g.time)?.value||0;

test('Ppui caps at one hundred pulse and counts actual plus thirty-percent excess healing',()=>{
 const {g,p}=arena('ppui'),ally=hero(g,0);ally.hp-=600;g.heal(p,ally,1000,false);near(p.ppuiHealing,720);
 p.ppuiHealing=99900;g.heal(p,ally,1000000,false);near(p.ppuiHealing,100000);near(P.pulse(p),100);near(stackInfo(p,g).max,100);near(stackGauge(p,g).ratio,1);
 g.kill(p,p);near(P.pulse(p),100);
});
test('pulse damage grows only at complete groups of four basic stacks and two ultimate stacks',()=>{
 for(const [stacks,basic,ultimate] of[[0,60,55],[1,60,55],[2,60,56],[3,60,56],[4,61,57],[99,84,104],[100,85,105]]){const e={ppuiHealing:stacks*1000};near(P.basicDamage(e),basic);near(P.ultimateDamage(e),ultimate);}
});
test('Ppui unlocks piercing at twenty, lifesteal at forty and a third magazine slot at sixty',()=>{
 for(const stacks of[19,20,39,40,59,60]){
  const {g,p}=arena('ppui'),front=hero(g),back=hero(g,1,45);p.ppuiHealing=stacks*1000;p.hp=500;shoot(g,p);run(g,.65);
  const perHit=damage(g,p,60+Math.floor(stacks/4));near(front.maxHp-front.hp,perHit*3);near(back.maxHp-back.hp,stacks>=20?perHit*3:0);near(p.hp-500,stacks>=40?perHit*6*.1:0);near(g.ammoCap(p),stacks>=60?3:2);
 }
});
test('Ppui ultimate holds its magazine until it ends and forbids all basic attacks during the storm',()=>{
 const {g,p}=arena('ppui'),t=hero(g,1,48);p.ppuiHealing=60000;p.ammo=1;const hits=[],deal=g.deal.bind(g);
 g.deal=(s,target,n,o)=>{if(s===p&&target===t)hits.push(n);return deal(s,target,n,o);};assert.ok(g.cast(p,'r',g.input.aim));near(p.ammo,1);assert.equal(g.attack(p,t),false);
 run(g,1.99);near(p.ammo,1);assert.equal(g.attack(p,t),false);assert.deepEqual(hits,Array(10).fill(85));run(g,.02);near(p.ammo,3);assert.equal(p.state.nailStorm,undefined);assert.ok(g.attack(p,t));
});
test('Ppui interrupted storms refill once, and old scheduled volleys cannot resume after interruption',()=>{
 const {g,p}=arena('ppui'),t=hero(g);p.ammo=0;p.passiveReady=999;g.cast(p,'r',t);run(g,.4);g.status(p,'silence',1,.2,t);run(g,.01);near(p.ammo,2);assert.equal(p.state.nailStorm,undefined);
 const hp=t.hp;p.ammo=0;g.reloadRate=()=>0;run(g,1.7);near(t.hp,hp);assert.ok(p.ammo<2);
});
test('Moses basic immediately consumes one of thirty breath, deals thirty-five damage and waits 0.3 seconds',()=>{
 const {g,p}=arena(),t=hero(g);shoot(g,p);near(M.air(g,p),29);near(t.maxHp-t.hp,damage(g,p,35));near(p.attackCd,.3);assert.equal(p.state.mosesCharge,undefined);assert.equal(g.attack(p,t),false);run(g,.3);shoot(g,p);near(M.air(g,p),28);
});
test('continuous attacks fire every 0.3 seconds without hidden charging or release shots',()=>{
 const {g,p}=arena(),t=hero(g);g.input.fire=true;run(g,.91);near(M.air(g,p),26);near(t.maxHp-t.hp,damage(g,p,35)*4);g.input.fire=false;assert.equal(M.release(g,p,g.input.aim),false);near(M.air(g,p),26);
});
test('Moses fan is exactly 115 degrees and extra magazine slots only increase breath capacity',()=>{
 const {g,p}=arena(),point=a=>({x:40+5*Math.cos(a*Math.PI/180),y:40+5*Math.sin(a*Math.PI/180)}),inside=point(57),outside=point(58),yes=hero(g,1,inside.x,inside.y),no=hero(g,1,outside.x,outside.y);
 p.augments=['magazine2'];near(M.airCap(g,p),50);near(g.attackRange(p),6);near(M.breath(g,p).angle,115*Math.PI/180);shoot(g,p);assert.ok(yes.hp<yes.maxHp);near(no.hp,no.maxHp);
});
test('breath regeneration begins after 0.7 idle seconds and restores one per 0.5 seconds with the smoking pose',()=>{
 const {g,p}=arena();shoot(g,p);run(g,.7);near(M.air(g,p),29);run(g,.16);assert.ok(p.state.mosesSmoking);near(mosesWeaponPose(g,p,equipmentPose(g,p)).blend,1);run(g,.33);near(M.air(g,p),29);run(g,.02);near(M.air(g,p),30);assert.equal(p.state.mosesSmoking,undefined);run(g,.13);near(mosesWeaponPose(g,p,equipmentPose(g,p)).blend,0);
});
test('reload speed converts three-to-one into breath regeneration and new attacks reset partial charging',()=>{
 const {g,p}=arena();g.reloadMultiplier=()=>1.3;near(M.refillRate(g,p),1.1);shoot(g,p);run(g,1.15);near(M.air(g,p),29);run(g,.01);near(M.air(g,p),30);
 shoot(g,p);run(g,1);assert.ok(p.state.mosesAirProgress>0);shoot(g,p);near(p.state.mosesAirProgress,0);
});
test('attacking with empty breath applies a 1.7-second refill and restores the current maximum',()=>{
 const {g,p}=arena(),t=hero(g);p.state.mosesAir=0;assert.equal(g.attack(p,t),false);near(g.stat(p,'disarm'),1);assert.ok(p.state.mosesRecovering);run(g,.5);near(mosesWeaponPose(g,p,equipmentPose(g,p)).blend,1);
 p.augments=['magazine2'];run(g,1.19);near(M.air(g,p),0);run(g,.02);near(M.air(g,p),50);assert.equal(p.state.mosesRecovering,undefined);near(g.stat(p,'disarm'),0);shoot(g,p);near(M.air(g,p),49);
});
test('two enhanced breaths are FIFO, each applies to one free attack and blue costs sixteen percent maximum health',()=>{
 const {g,p}=arena(),t=hero(g);p.hp=2000;g.cast(p,'q',p,{direction:'down'});near(p.hp,1568);assert.ok(g.cast(p,'q',p,{direction:'left'}));assert.deepEqual(M.pending(p),['down','left']);assert.equal(g.cast(p,'q',p,{direction:'up'}),false);
 near(M.breath(g,p).range,8.6);near(M.breath(g,p).angle,121*Math.PI/180);shoot(g,p);near(M.air(g,p),30);near(g.stat(t,'stun'),1);assert.deepEqual(M.pending(p),['left']);run(g,.3);shoot(g,p);near(M.air(g,p),30);assert.deepEqual(M.pending(p),[]);run(g,.91);near(t.maxHp-t.hp,damage(g,p,35*2+75*3));
});
test('enhanced attacks work at zero breath without triggering empty recovery',()=>{
 const {g,p}=arena();p.state.mosesAir=0;g.cast(p,'q',p,{direction:'up'});shoot(g,p);near(M.air(g,p),0);assert.equal(p.state.mosesRecovering,undefined);run(g,.3);assert.equal(g.attack(p,g.input.aim),false);assert.ok(p.state.mosesRecovering);
});
test('enhanced breath icons follow the two queued colors and disappear in use order',()=>{
 const {g,p}=arena();g.cast(p,'q',p,{direction:'up'});g.cast(p,'q',p,{direction:'right'});let icons=debuffBadges(g,p).filter(b=>b.kind==='mosesSmoke');assert.deepEqual(icons.map(i=>i.color),['#e8eee7','#ca515a']);shoot(g,p);icons=debuffBadges(g,p).filter(b=>b.kind==='mosesSmoke');assert.deepEqual(icons.map(i=>i.color),['#ca515a']);run(g,.3);shoot(g,p);assert.equal(debuffBadges(g,p).filter(b=>b.kind==='mosesSmoke').length,0);
});
test('basic shields add fifteen per hit and cap at 7.5 percent with a refreshed five-second lifetime',()=>{
 const {g,p}=arena(),ally=hero(g,0,43,40,'faust',2000);for(let i=0;i<12;i++){if(i)run(g,.3);shoot(g,p);}near(pool(g,p,ally),150);run(g,4.99);near(pool(g,p,ally),150);run(g,.02);near(pool(g,p,ally),0);
});
test('white shields remain independent of the fifteen-point basic shield',()=>{
 const {g,p}=arena(),ally=hero(g,0,43,40,'faust',3000);g.cast(p,'q',p,{direction:'up'});shoot(g,p);near(g.shield(ally),315);run(g,1.51);near(g.shield(ally),15);
});
test('red healing and ally-hit cooldown refunds apply to exactly one enhanced shot',()=>{
 const {g,p}=arena(),allies=[hero(g,0,42,39,'faust',3000),hero(g,0,43,40,'faust',3000),hero(g,0,42,41,'faust',3000)];p.upgrades.haste=2;p.rCd=20;for(const ally of allies)ally.hp=1000;
 g.cast(p,'q',p,{direction:'right'});shoot(g,p);near(p.rCd,18.5);near(M.air(g,p),30);run(g,.3);shoot(g,p);near(M.air(g,p),29);near(p.rCd,18.2);run(g,.21);for(const ally of allies)near(ally.hp,1110);
});
test('mobile enhanced presses do not fire until the authoritative release command',()=>{
 const {g,p}=arena(),t=hero(g);g.mobileInput=true;g.cast(p,'q',p,{direction:'left'});assert.equal(g.attack(p,t),false);near(t.hp,t.maxHp);near(M.pending(p).length,1);near(M.air(g,p),30);assert.ok(M.release(g,p,t));assert.equal(M.pending(p).length,0);near(t.maxHp-t.hp,damage(g,p,35));
});
test('Moses mobile autoaim chooses the lowest-health nearby enemy champion and ignores out-of-range or allied targets',()=>{
 const {g,p}=arena(),close=hero(g,1,42),low=hero(g,1,45),far=hero(g,1,48),ally=hero(g,0,41);close.hp=2000;low.hp=1000;far.hp=1;ally.hp=1;
 assert.equal(mobileAutoAim(g,p).target,low);low.invulnerableUntil=10;assert.equal(mobileAutoAim(g,p).target,close);
});
test('online release authorizes one enhanced attack without spending breath, and snapshots retain the remaining queue',()=>{
 const {g,p}=arena(),t=hero(g);g.mobileInput=true;g.controllers=new Map([[p.id,{connected:true,input:g.input,mobileInput:true}]]);g.cast(p,'q',p,{direction:'left'});g.cast(p,'q',p,{direction:'right'});
 assert.ok(executeCommand(g,p,{action:'releaseBasic',point:t}));near(M.air(g,p),30);const client=arena().g;assert.ok(applySnapshot(client,JSON.parse(JSON.stringify(new SnapshotWriter().capture(g,true))),p.id));assert.deepEqual(M.pending(client.player),['right']);near(M.air(client,client.player),30);
});
test('Gahwan concentration lasts 1.5 seconds and adds fifteen armor until release or interruption',()=>{
 const {g,p}=arena('gahwan'),t=hero(g),armor=g.armor(p);g.cast(p,'r',t);near(g.armor(p),armor+15);near(p.state.gahwanR.until,1.5);run(g,1.49);near(t.hp,t.maxHp);run(g,.02);assert.ok(t.hp<t.maxHp);near(g.armor(p),armor);
 p.rCd=0;g.cast(p,'r',t);near(g.armor(p),armor+15);g.status(p,'silence',1,1,t);run(g,.01);near(g.armor(p),armor);
});
test('Rudolph mental-whip badges carry the currently active damage-amplification stack count',()=>{
 const {g,p}=arena('rudolph'),t=hero(g);t.state.mentalWhip={[p.id]:{stage:2,hits:4,at:0,decayAt:2}};near(debuffBadges(g,t).find(b=>b.kind==='whip').stacks,2);run(g,2.01);near(debuffBadges(g,t).find(b=>b.kind==='whip').stacks,1);
});
test('Ryoshu tactical has one normal cooldown and retains damage, reload on hit and the next-basic dash',()=>{
 const {g,p}=arena('ryoshu'),t=hero(g,1,42);near(skillCharges(g,p,'q'),null);assert.ok(g.cast(p,'q',t));near(p.qCd,8);run(g,.25);assert.equal(g.cast(p,'q',t),false);assert.ok(p.state.ryoshuStep);assert.equal(p.state.ryoshuCharges,undefined);run(g,7.75);assert.ok(g.cast(p,'q',t));
});
test('Kim follow-up deals 270 and grants one 150 shield for three seconds only on a real hit',()=>{
 for(const hit of['miss','normal','shield','invulnerable']){
  const {g,p}=arena('kim'),t=hero(g,1,hit==='miss'?49:42);p.passiveReady=999;p.state.followSlashUntil=1.2;if(hit==='shield')g.addShield(t,1000,'target',10);if(hit==='invulnerable')t.invulnerableUntil=10;
  shoot(g,p);const shield=p.shields.find(s=>s.source===`draw-${p.id}`);if(hit==='normal'||hit==='shield'){near(shield.value,150);near(shield.until,3);}else assert.equal(shield,undefined);
  if(hit==='normal')near(t.maxHp-t.hp,damage(g,p,270));
 }
});
test('the encyclopedia presents current pulse thresholds, breath resource, one-charge Ryoshu and Kim follow-up values',()=>{
 const basic=skillReference('moses',1),passive=skillReference('moses',0),q=skillReference('moses',2),ppui=skillReference('ppui',1),ryoshu=skillReference('ryoshu',2),kim=skillReference('kim',1);
 assert.match(basic.cooldown,/숨 30.*0.3초/);assert.doesNotMatch(basic.details,/충전량|완충|추가.*각도/);assert.match(passive.details,/1.7초/);assert.match(q.details,/최대 2개/);assert.match(q.details,/16%/);assert.match(q.details,/75 피해/);assert.match(ppui.details,/20.*40.*60/);assert.doesNotMatch(ryoshu.details+ryoshu.cooldown,/2회|비축/);assert.match(kim.details,/270.*150.*3초/);
});
