import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,damageFormula} from '../src/game.js';
import {CHAMPIONS,RULES} from '../src/data.js';
import * as Jamila from '../src/jamila.js';
import * as Infiltration from '../src/infiltration.js';
import * as Augments from '../src/augments.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function arena(key='jamila'){
 const g=new Game(key,'bottom',{mode:'training',seed:62}),p=g.player;
 g.units=[p];g.events=[];g.projectiles=[];g.effects=[];g.pending=[];g.zones=[];g.practice.lineStopped=true;
 g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;
 g.aiChampion=g.aiMinion=g.aiNeutral=g.aiStructure=()=>{};
 Object.assign(p,{x:40,y:25,lastDamageAt:999,lastAttackAt:999});return {g,p};
}
function enemy(g,x=45,y=25){const e=g.makeChampion('faust',1,g.nextId+20);Object.assign(e,{x,y,maxHp:100000,hp:100000,armor:0,lastDamageAt:999,lastAttackAt:999});return e;}
test('Jamila is a bottom marksman/protector with the specified stats, ammo and cadence',()=>{
 const {g,p}=arena();assert.deepEqual(CHAMPIONS.jamila.roles,['저격','보호']);assert.equal(CHAMPIONS.jamila.recommendedPosition,'bottom');
 near(p.maxHp,3400);near(g.armor(p),40);near(g.speed(p),3.45);near(g.attackInterval(p),.25);near(g.reloadInterval(p),1.75);near(g.ammoCap(p),16);near(g.bonusStats(p).reload,0);
});
test('one rifle round uses range 6.6 and only thirty percent of power correction',()=>{
 const {g,p}=arena(),e=enemy(g);assert.ok(g.attack(p,e));assert.equal(g.projectiles.length,1);near(g.projectiles[0].remaining,6.6);assert.equal(p.ammo,15);run(g,.2);
 const normal=damageFormula(1,1,1)*g.powerScale(p);near(100000-e.hp,25*(1+(normal-1)*.3));near(g.shield(p),p.maxHp*.01);
});
test('one-point reload upgrades gain 1.5 times their percentage and extra magazines are quadrupled',()=>{
 const {g,p}=arena();g.buy(p,'reload');near(g.reloadInterval(p),1.75/1.09);p.augments=['magazine2'];near(g.ammoCap(p),24);
});
test('holding fire produces actual shots every quarter second without accumulating an extra frame',()=>{
 const {g,p}=arena();g.input.fire=true;g.input.aim={x:27,y:25};run(g,1.05);const shots=g.soundEvents.filter(e=>e.kind==='shot'&&e.sourceId===p.id);assert.equal(shots.length,5);for(let i=1;i<shots.length;i++)near(shots[i].at-shots[i-1].at,.25);
});
test('a partial magazine waits three seconds and then fills after a complete 1.75 second reload',()=>{
 const {g,p}=arena();g.attack(p,{x:47,y:25});run(g,2.99);assert.equal(p.ammo,15);assert.equal(Jamila.reloading(p),false);
 run(g,.02);assert.ok(Jamila.reloading(p));run(g,1.7);assert.equal(p.ammo,15);run(g,.05);assert.equal(p.ammo,16);assert.equal(Jamila.reloading(p),false);
});
test('an empty magazine starts immediate full reload and cannot fire during it',()=>{
 const {g,p}=arena();for(let n=0;n<16;n++){p.attackCd=0;assert.ok(g.attack(p,{x:47,y:25}));}assert.equal(p.ammo,0);assert.ok(Jamila.reloading(p));assert.equal(g.attack(p,{x:47,y:25}),false);
 run(g,1.74);assert.equal(p.ammo,0);run(g,.02);assert.equal(p.ammo,16);
});
test('shooting a remaining round during reload discards progress and restarts the idle delay',()=>{
 const {g,p}=arena();g.attack(p,{x:47,y:25});run(g,3.8);assert.ok(Jamila.reloadFraction(p)>.4);assert.ok(g.attack(p,{x:47,y:25}));
 assert.equal(p.ammo,14);assert.equal(Jamila.reloading(p),false);near(p.reloadProgress,0);run(g,2.99);assert.equal(Jamila.reloading(p),false);
});
test('Udjat shield stacks to twenty percent, refreshes for five seconds, and adds true damage above fifteen percent',()=>{
 const {g,p}=arena(),e=enemy(g);for(let n=0;n<14;n++)g.deal(p,e,10,{damageKind:'basic'});near(g.shield(p),p.maxHp*.14);
 const before=e.hp;g.deal(p,e,10,{damageKind:'basic'});near(before-e.hp,10*(1+(damageFormula(1,1,1)-1)*.3)*1.15);near(g.shield(p),p.maxHp*.15);
 for(let n=0;n<20;n++)g.deal(p,e,10,{damageKind:'basic'});near(g.shield(p),p.maxHp*.2);run(g,5.01);near(g.shield(p),0);
});
test('tactical sweeps a forward semicircle after its dash and retreats four units once',()=>{
 const {g,p}=arena(),front=enemy(g,46),behind=enemy(g,42,28.8);assert.ok(g.cast(p,'q',{x:50,y:25}));assert.equal(p.state.jamilaQ.phase,'dash');run(g,.19);
 assert.equal(p.state.jamilaQ.phase,'slash');near(100000-front.hp,damageFormula(225,1,1));near(behind.hp,100000);near(g.stat(front,'weak'),.07);near(g.stat(front,'armorWeak'),.07);
 run(g,.55);near(p.x,39.5,.02);assert.equal(p.state.jamilaQ,undefined);assert.equal(g.effects.filter(e=>e.type==='slash'&&e.theme==='jamila').length<=1,true);
});
test('an enemy collision triggers an early slash, while terrain only stops the dash and causes retreat',()=>{
 const {g,p}=arena(),e=enemy(g,42);g.cast(p,'q',{x:50,y:25});run(g,.1);assert.equal(p.state.jamilaQ.phase,'slash');assert.ok(e.hp<100000);assert.ok(p.x<42);
 const second=arena();second.g.map.walls=[{x:41,y:20,w:.5,h:10}];const t=enemy(second.g,44);assert.ok(second.g.cast(second.p,'q',{x:50,y:25}));run(second.g,.8);near(t.hp,100000);assert.equal(second.p.state.jamilaQ,undefined);
});
test('low-health tactical cooldown runs fifty percent faster and adjusts immediately when health changes',()=>{
 const {g,p}=arena();p.qCd=6;p.hp=p.maxHp*.49;run(g,1);near(p.qCd,4.5);p.hp=p.maxHp;run(g,1);near(p.qCd,3.5);
});
test('ultimate snapshots two targetable soldiers, keeps cooldown running and expires both after ten seconds',()=>{
 const {g,p}=arena(),baseSpeed=g.speed(p);assert.ok(g.cast(p,'r',p));const units=Jamila.army(g,p);assert.equal(units.length,2);
 for(const u of units){near(u.maxHp,p.maxHp*.45);near(g.armor(u),40*.45);near(g.combatPower(u),g.combatPower(p)*.2);near(g.ammoCap(u),16);assert.ok(g.hostile(enemy(g,70),u));near(g.speed(u),baseSpeed*1.1);}
 near(g.speed(p),baseSpeed*1.1);near(g.reloadMultiplier(p),1.1);const hp=units[0].maxHp,armor=g.armor(units[0]);p.upgrades.health=3;p.upgrades.power=3;p.armor=90;g.refreshEquipment(p);near(units[0].maxHp,hp);near(g.armor(units[0]),armor);
 run(g,1);near(p.rCd,74);g.kill(units[0],p);near(Jamila.squadBonus(g,p),.05);run(g,9.02);assert.equal(Jamila.army(g,p).length,0);near(p.rCd,64.975,.02);
});
test('soldiers receive half of the passive shield and never trigger the extra true damage themselves',()=>{
 const {g,p}=arena(),e=enemy(g);g.cast(p,'r',p);const [u]=Jamila.army(g,p);g.deal(p,e,10,{damageKind:'basic'});near(g.shield(u),p.maxHp*.005);
 g.addShield(p,p.maxHp*.2,'test',5);const before=e.hp,shield=g.shield(p);g.deal(u,e,15,{damageKind:'basic'});near(before-e.hp,15*(1+(u.snapshot.damagePower-1)*.3));near(g.shield(p),shield);
});
test('soldiers prefer the commanded enemy over a nearer enemy and inherit no extra-magazine bonuses',()=>{
 const {g,p}=arena(),a=enemy(g,44,26),b=enemy(g,42,24);p.augments=['magazine2'];g.cast(p,'r',p);g.deal(p,a,1,{damageKind:'basic'});run(g,.01);
 for(const u of Jamila.army(g,p)){assert.equal(u.targetId,a.id);near(g.ammoCap(u),16);}assert.ok(b.alive);
});
test('exclusive augment prerequisites and descriptions apply only to the matching champion',()=>{
 for(const [key,item]of [['jamila','highRisk'],['kim','power15']]){const {g,p}=arena(key);assert.equal(Augments.unlocked(p,item==='highRisk'?'tech':'combat'),false);assert.equal(Augments.unlockedItem(p,item),true);assert.ok(g.buyAugment(p,item));assert.match(Augments.augmentText(p,Augments.AUGMENTS.find(a=>a.key===item)),/전용/);}
 const {g,p}=arena('faust');assert.equal(g.buyAugment(p,'highRisk'),false);assert.equal(g.buyAugment(p,'power15'),false);assert.doesNotMatch(Augments.augmentText(p,Augments.AUGMENTS.find(a=>a.key==='power15')),/전용/);
});
test('Kim exclusive shield pulses every two seconds, caps at twelve percent and expires without renewal',()=>{
 const {g,p}=arena('kim');g.buyAugment(p,'power15');run(g,2);near(g.shield(p),p.maxHp*.01);run(g,24);near(g.shield(p),p.maxHp*.12);p.augments=[];run(g,5.01);near(g.shield(p),0);
});
test('Jamila infiltration covers forty-five and can deploy instantly with a fifteen-second army',()=>{
 const {g,p}=arena();g.buyAugment(p,'highRisk');assert.ok(g.recall(p));run(g,1.76);assert.ok(Infiltration.selecting(p));near(Infiltration.range(g,p),45);
 p.state.infiltration.point={x:84,y:25};assert.ok(g.cast(p,'r',p));near(p.x,84);assert.equal(Infiltration.absent(p),false);near(p.rCd,75);near(p.state.infiltrationReady,75);
 for(const u of Jamila.army(g,p))near(u.until-g.time,15);
});
test('infiltration ultimate refuses an invalid landing and preserves both cooldowns and absence',()=>{
 const {g,p}=arena();g.buyAugment(p,'highRisk');g.recall(p);run(g,1.76);p.state.infiltration.point={x:100,y:25};assert.equal(g.cast(p,'r',p),false);near(p.rCd,0);assert.ok(Infiltration.absent(p));
});
test('soldiers are affected by disarm and forced movement, without a hidden crowd-control immunity',()=>{
 const {g,p}=arena(),t=enemy(g,45);g.cast(p,'r',p);const [u]=Jamila.army(g,p);g.status(u,'disarm',1,2,t);run(g,.1);assert.equal(u.ammo,16);
 const x=u.x;assert.ok(g.startMotion(u,{x:-1,y:0},1,{kind:'knock',source:t}));run(g,.1);assert.ok(u.x<x-.3);assert.equal(u.ammo,16);
});
test('soldier kills credit the commander while killing a soldier yields no champion or minion bounty',()=>{
 const {g,p}=arena(),t=enemy(g,45);g.cast(p,'r',p);const [u]=Jamila.army(g,p);t.hp=1;const dealt=p.totalDamage;g.deal(u,t,100,{fixed:true});near(p.totalDamage-dealt,1);near(p.lastCombat,g.time);assert.equal(p.kills,1);assert.equal(g.kills[0],1);
 const killer=enemy(g,60),xp=killer.xp,gold=killer.gold;g.kill(u,killer);near(killer.xp,xp);near(killer.gold,gold);assert.equal(killer.kills,0);
});
test('an unavailable ultimate cannot exit infiltration or extend the army',()=>{
 const {g,p}=arena();g.buyAugment(p,'highRisk');g.recall(p);run(g,1.76);p.rCd=1;assert.equal(g.cast(p,'r',p),false);assert.ok(Infiltration.absent(p));near(p.rCd,1);assert.equal(Jamila.army(g,p).length,0);
});
test('taunt overrides the command target and Yan lock slows soldiers normally',()=>{
 const {g,p}=arena(),priority=enemy(g,45,24),taunter=enemy(g,45,26);g.cast(p,'r',p);const [u]=Jamila.army(g,p);p.state.lcaTarget=priority.id;
 const speed=g.speed(u);g.status(u,'yanLock',.2,2,taunter);near(g.speed(u),speed*.8);g.status(u,'taunt',1,1,taunter);u.state.tauntedBy=taunter.id;run(g,.01);assert.equal(u.targetId,taunter.id);
});
