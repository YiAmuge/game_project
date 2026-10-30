import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,damageFormula} from '../src/game.js';
import {CHAMPIONS} from '../src/data.js';
import * as Jamila from '../src/jamila.js';
import * as Yan from '../src/yan.js';
import * as Sora from '../src/sora.js';
import {ultGrowth} from '../src/v06-champions.js';
import {healthTrail,paintHealth} from '../src/health-display.js';
import {restingStance,STANCE_ANGLES} from '../src/champion-pose.js';
import {equipmentPose,SORA_CLAW_LENGTH} from '../src/weapon-art.js';
import {skillReference,championReferenceStats,skillTextHTML} from '../src/skill-reference.js';
import {WORLD_FRAMES} from '../src/world-sprites.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function arena(key='jamila'){
 const g=new Game(key,'bottom',{mode:'training',seed:70}),p=g.player;g.units=[p];g.events=[];g.projectiles=[];g.effects=[];g.pending=[];g.zones=[];g.practice.lineStopped=true;g.practice.pauseXp=true;
 g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};
 Object.assign(p,{x:40,y:25,lastAttackAt:999,lastDamageAt:999,attackAt:-99});return{g,p};
}
function hero(g,key='faust',team=1,x=44,y=25){const t=g.makeChampion(key,team,g.nextId+20);Object.assign(t,{x,y,maxHp:100000,hp:100000,armor:0,lastAttackAt:999,lastDamageAt:999});return t;}
test('Jamila shields on every fourth fired round, including misses, with blue special bullets and a three second cap',()=>{
 const{g,p}=arena();for(let n=1;n<=20;n++){p.attackCd=0;if(!p.ammo)p.ammo=16;assert.ok(g.attack(p,{x:47,y:25}));const b=g.projectiles.at(-1);assert.equal(b.lcaShieldRound,n%4===0);if(n%4===0)assert.equal(b.color,'#59b8ff');near(g.shield(p),p.maxHp*.015*Math.floor(n/4));}
 for(let n=0;n<4;n++){p.attackCd=0;g.attack(p,{x:47,y:25});}near(g.shield(p),p.maxHp*.075);near(p.shields.find(s=>s.source===`udjat-${p.id}`).until-g.time,3);run(g,3.01);near(g.shield(p),0);
});
test('generic hits retain Jamila bonus damage without creating passive shields',()=>{
 const{g,p}=arena(),t=hero(g),hp=t.hp;g.deal(p,t,100,{damageKind:'basic'});near(hp-t.hp,100*(1+(damageFormula(1,1,1)-1)*.55)*1.15);near(g.shield(p),0);
});
test('remaining shield round counts and idle delays follow the actual magazine',()=>{
 const{g,p}=arena();for(const[n,bullets,delay]of[[16,4,1.8],[15,4,1.8],[12,3,1.8],[9,3,1.92],[4,1,2.52],[1,1,2.88],[0,0,3]]){p.ammo=n;assert.equal(Jamila.shieldRounds(p),bullets);near(Jamila.idleDelay(p),delay);}
 p.ammo=15;p.state.lcaShotAt=g.time;run(g,1.79);assert.equal(Jamila.reloading(p),false);run(g,.02);assert.ok(Jamila.reloading(p));run(g,1.5);assert.equal(p.ammo,16);
});
test('ultimate shares only newly gained shields, preserves separate durations, and does not copy old shields on summon',()=>{
 const{g,p}=arena();g.addShield(p,100,'before',8);g.cast(p,'r',p);const[u,v]=Jamila.army(g,p);near(g.shield(u),0);
 g.addShield(p,200,'a',3);near(g.shield(u),100);g.addShield(p,200,'a',3);near(g.shield(u),100);g.addShield(p,300,'a',3);near(g.shield(u),150);g.addShield(p,100,'b',6);near(g.shield(u),200);near(g.shield(v),200);
 run(g,3.01);near(g.shield(u),50);g.addShield(p,200,'b',6);near(g.shield(u),100);run(g,6.01);near(g.shield(u),0);
});
test('squad power and movement affect commander and actual soldier damage while reload stays at snapshot speed',()=>{
 const{g,p}=arena(),power=g.combatPower(p),speed=g.speed(p),reload=g.reloadMultiplier(p),t=hero(g);g.cast(p,'r',p);const[u,v]=Jamila.army(g,p);
 near(g.combatPower(p),power*1.1);near(g.combatPower(u),power*.2*1.1);near(g.speed(p),speed*1.1);near(g.reloadMultiplier(p),reload);near(g.reloadMultiplier(u),reload);
 const dealt=g.deal(u,t,15,{damageKind:'basic'});near(dealt,15*(1+(u.snapshot.damagePower*1.1-1)*.55));v.alive=false;near(g.combatPower(p),power*1.05);near(g.combatPower(u),power*.2*1.05);near(g.deal(u,t,15,{damageKind:'basic'}),15*(1+(u.snapshot.damagePower*1.05-1)*.55));
});
test('false orders heal their consuming champion once, including a lethal hit, with half healing for distorted Yan',()=>{
 const{g,p}=arena('yan'),t=hero(g),a=hero(g,'faust',0,40,28);a.hp-=1000;Yan.mark(g,p,t);const hp=a.hp;g.deal(a,t,200000,{fixed:true});near(a.hp-hp,200);assert.equal(t.alive,false);near(a.kills,1);
 const second=hero(g);p.state.ominous=6;g.cast(p,'r',p);p.hp-=500;Yan.mark(g,p,second);const old=p.hp;g.deal(p,second,1,{fixed:true});near(p.hp-old,100);g.deal(p,second,1,{fixed:true});near(p.hp-old,100);
});
test('Yan reaches seven on full charge, gains temporary armor, and moves faster during tactical barrage',()=>{
 const{g,p}=arena('yan'),t=hero(g,'faust',1,47.4),armor=g.armor(p),speed=g.speed(p);g.attack(p,t);near(g.armor(p),armor*1.065);run(g,1.5);near(Yan.chargeShape(g,p,t).range,7);Yan.release(g,p,t);assert.ok(t.hp<100000);near(g.armor(p),armor);g.cast(p,'q',{x:48,y:25});near(g.speed(p),speed*1.12);run(g,1.81);near(g.speed(p),speed);
});
test('distorted sword has a damaging stunned inner area and the unchanged slowed outer area',()=>{
 const{g,p}=arena('yan');p.state.ominous=6;g.cast(p,'r',p);const inner=hero(g,'faust',1,46),outer=hero(g,'faust',1,49);g.cast(p,'q',{x:45,y:25});run(g,1.76);
 near(100000-inner.hp,damageFormula(435,2,1)*.9);near(100000-outer.hp,damageFormula(360,2,1)*.9);near(g.stat(inner,'stun'),1);near(inner.status.stun.until-g.time,.85,.02);near(g.stat(outer,'stun'),0);near(g.stat(outer,'slow'),.8);
});
test('Sora EGO maintains twelve second form stats and delivers two 110 hits with one ammunition',()=>{
 const{g,p}=arena('sora'),t=hero(g,'faust',1,42),hp=p.maxHp,armor=g.armor(p),speed=g.speed(p),reload=g.reloadMultiplier(p);p.hp*=.4;p.state.unlock=5;g.cast(p,'r',p);near(p.maxHp,hp*.8);near(p.hp/p.maxHp,.4);near(g.powerScale(p),1.12);near(g.armor(p),armor*.9);near(g.reloadMultiplier(p),reload+.15);near(g.speed(p),speed*1.1);
 const ammo=p.ammo;g.attack(p,t);near(ammo-p.ammo,1);near(100000-t.hp,110*.9*1.12);run(g,.11);near(100000-t.hp,220*.9*1.12);run(g,11.91);assert.equal(Sora.ego(g,p),false);near(p.maxHp,hp);near(p.hp/p.maxHp,.4);near(g.armor(p),armor);
});
test('Sora EGO tactical uses two six-second charges, 120 dash damage and four trail ticks spaced by .3',()=>{
 const{g,p}=arena('sora');p.state.unlock=5;g.cast(p,'r',p);const t=hero(g,'faust',1,44),hits=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)hits.push({n,at:g.time});return deal(a,b,n,o);};g.cast(p,'q',{x:44.5,y:25});run(g,1.3);assert.deepEqual(hits.map(h=>h.n),[120,45,45,45,45]);for(let n=2;n<hits.length;n++)near(hits[n].at-hits[n-1].at,.3);near(Sora.SORA.egoQCooldown,6);near(Sora.SORA.egoQCharges,2);
});
test('Dongrang converts bonus power with a 3:1 health and armor ratio and applies temporary conversions immediately without healing',()=>{
 const{g,p}=arena('dongrang'),hp=p.maxHp,armor=g.armor(p);p.augments=['blackOrb'];g.refreshEquipment(p);near(p.maxHp,hp*1.03);near(g.armor(p),armor*1.01);near(g.powerScale(p),1);near(g.combatPower(p),CHAMPIONS.dongrang.power);
 p.hp=p.maxHp*.4;g.addBuff(p,'power',1);const extra=1.1*1.12-1;near(p.maxHp,hp*(1+extra*.3));near(g.armor(p),armor*(1+extra*.1));near(p.hp/p.maxHp,.4);near(p.totalHealingReceived,0);run(g,1.01);near(p.maxHp,hp*1.03);near(p.hp/p.maxHp,.4);near(p.totalHealingReceived,0);
});
test('Dongrang nutrients require actual own healing and increase only ultimate damage, respecting armor',()=>{
 const{g,p}=arena('dongrang'),t=hero(g,'faust',1,42);t.armor=100;p.hp-=2000;g.heal(null,p,500,false);g.heal(t,p,500,false);g.heal(p,p,500,false,{natural:true});near(p.totalHealingReceived,0);g.heal(p,p,500,false);near(p.totalHealingReceived,500);p.hp-=1000;g.heal(p,p,500,false);near(p.totalHealingReceived,1000);assert.deepEqual(ultGrowth(p),{radius:3.2,damage:205});near(g.deal(p,t,260),130);near(g.deal(p,t,35,{fixed:true}),35);
 const old=t.hp;g.cast(p,'r',p);near(old-t.hp,102.5);assert.ok(g.stat(t,'root'));p.totalHealingReceived=0;near(ultGrowth(p).damage,180);
});
test('health draws one thin black damage boundary rather than repeated tick marks',()=>{
 const e={hp:3400,maxHp:3400,alive:true},g={time:0,shield:()=>0},lines=[],c={fillRect(){},save(){},restore(){},beginPath(){},moveTo(x,y){lines.push([x,y]);},lineTo(x,y){lines.push([x,y]);},stroke(){}};
 paintHealth(c,e,g,0,0,100,7,'green');assert.equal(lines.length,0);e.hp=1700;g.time=.1;paintHealth(c,e,g,0,0,100,7,'green');assert.deepEqual(lines,[[50,0],[50,7]]);assert.equal(c.strokeStyle,'#000');near(c.lineWidth,1);
});
test('rest angles mirror in both directions while manual aim and active attacks retain their target',()=>{
 for(const[key,angle]of Object.entries(STANCE_ANGLES)){const{g,p}=arena(key==='soraEgo'?'sora':key);if(key==='soraEgo')p.buffs.soraEgo=Infinity;p.previewStance=true;near(equipmentPose(g,p).facing,angle);near(restingStance(g,p,Math.PI).weaponFacing,Math.PI-angle);delete p.previewStance;p.facing=.7;near(equipmentPose(g,p).facing,.7);p.attackAt=g.time;p.attackFacing=.6;near(equipmentPose(g,p).facing,.7);}
 near(SORA_CLAW_LENGTH,1.32*.88);
});
test('tower plinth anchors use the ground-plane midpoint inside the front foot lip',()=>{
 for(const f of Object.entries(WORLD_FRAMES).filter(([key])=>key.endsWith('_tower')).map(([,f])=>f)){assert.ok(f.ground);assert.ok(f.ground[1]<f.foot[1]);assert.ok(Math.abs(f.ground[0]-.5)<.025);}
});
test('every champion and form exposes complete summary, detail, resources and range facts',()=>{
 for(const key of Object.keys(CHAMPIONS))for(const form of(key==='sora'||key==='yan'?[false,true]:[false])){const stats=championReferenceStats(key,form);assert.ok(stats.health>0&&stats.armor>=0);for(let n=0;n<(form?3:4);n++){const r=skillReference(key,n,form);assert.ok(r.title&&r.cooldown&&r.summary&&r.details&&r.ranges.length,`${key}/${form}/${n}`);assert.ok(r.ranges.every(p=>p.label&&p.text));}}
 for(const key of ['nelly','ryoshu'])assert.match(skillReference(key,2).cooldown,/최대 2회/);assert.match(skillReference('sora',2,true).cooldown,/6초 · 최대 2회/);assert.match(skillReference('don',2).details,/최소 120 ~ 최대 450/);assert.match(skillReference('don',2).details,/탄창.*2개/);assert.match(skillReference('don',2).details,/10%.*돌려/);assert.match(skillReference('dongrang',0).details,/1000.*궁극기 피해.*25/);assert.doesNotMatch(skillReference('dongrang',3).details,/고정|일반 피해/);
 assert.match(skillReference('jamila',1).details,/0.12초/);assert.match(skillReference('jamila',3).details,/전투력.*이동속도/);assert.equal(skillReference('sora',0,true).title,'당연한 믿음');
});
test('numeric effect colors distinguish healing, damage and fixed damage and always escape markup',()=>{
 assert.match(skillTextHTML('200 회복한다.'),/class="skill-value healing">200/);assert.match(skillTextHTML('최소 120 ~ 최대 450 피해를 입힌다.'),/class="skill-value damage">최소 120 ~ 최대 450/);assert.match(skillTextHTML('최대 체력의 4.5% 고정 피해'),/class="skill-value true">4.5%/);assert.match(skillTextHTML('(12 + 현재 체력의 1.5%) 고정 화상'),/class="skill-value true">\(12 \+ 현재 체력의 1.5%\)/);assert.doesNotMatch(skillTextHTML('<img src=x onerror=alert(1)>'),/<img/);
});
