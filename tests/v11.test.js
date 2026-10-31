import{FAN_ANGLE}from'../src/data.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {CHAMPIONS} from '../src/data.js';
import {bounty,COMBAT_RULES} from '../src/combat-events.js';
import {skillTargeting} from '../src/targeting.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*60);i++)g.step(1/60);};
function quiet(key='meursault'){
 const g=new Game(key,'top',{seed:17});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 const p=g.player,t=g.makeChampion('faust',1,8);Object.assign(p,{x:40,y:7});Object.assign(t,{armor:0,x:43,y:7,maxHp:100000,hp:100000});g.units=[p,t];g.minionQueue=[];return {g,p,t};
}
function ally(g,key='meursault',x=42,y=9){const a=g.makeChampion(key,0,9);Object.assign(a,{x,y});return a;}
function enemy(g,x=46,y=7){const t=g.makeChampion('faust',1,10+g.nextId);Object.assign(t,{armor:0,x,y,maxHp:100000,hp:100000});return t;}
const minion=(g,team=0)=>g.entity({kind:'minion',team,x:42,y:8,maxHp:1000,radius:.322});
for(const kind of ['tower','core','minion','neutral'])test(`${kind} last-hit credits the last enemy champion at exactly ten seconds`,()=>{
 const {g,p,t}=quiet();g.deal(p,t,100,{fixed:true});g.time=10;const cause=g.entity({kind,team:kind==='neutral'?2:0,x:44,y:7,maxHp:1000});g.deal(cause,t,1e7,{fixed:true});assert.equal(p.kills,1);assert.equal(g.kills[0],1);assert.equal(t.lastDeath.killerId,p.id);assert.equal(t.lastDeath.finisher,kind);assert.equal(t.lastDeath.execution,false);
});
test('environment death after ten seconds is execution without team kills, assists or first blood',()=>{
 const {g,p,t}=quiet(),a=ally(g);g.deal(p,t,100,{fixed:true});g.deal(a,t,50,{fixed:true});g.time=10.001;g.deal(minion(g),t,1e7,{fixed:true});assert.equal(p.kills,0);assert.equal(a.kills,0);assert.deepEqual(g.kills,[0,0]);assert.equal(g.firstBlood,null);close(p.gold,250);close(a.gold,250);assert.equal(t.lastDeath.execution,true);assert.match(g.currentAnnouncement().title,/처형/);
});
test('last positive attacker wins, not the largest damage dealer or the latest support-only contributor',()=>{
 const {g,p,t}=quiet(),a=ally(g),support=ally(g,'yi');g.deal(p,t,1000,{fixed:true});g.time=1;g.deal(a,t,1,{fixed:true});t.contributors[support.id]=2;g.time=3;g.deal(minion(g),t,1e7,{fixed:true});assert.equal(a.kills,1);assert.equal(p.assists,1);assert.equal(support.assists,1);assert.equal(support.kills,0);
});
test('zero or rejected damage cannot replace or extend the last real enemy damage',()=>{
 const {g,p,t}=quiet(),a=ally(g);g.deal(p,t,100,{fixed:true});g.time=5;g.deal(a,t,0,{fixed:true});t.invulnerableUntil=6;g.deal(a,t,100,{fixed:true});assert.equal(t.lastEnemyDamage.id,p.id);g.time=10.01;g.deal(minion(g),t,1e7,{fixed:true});assert.equal(t.lastDeath.execution,true);assert.equal(a.assists,0);
});
test('shield damage counts and an already dead enemy champion can receive environmental kill credit',()=>{
 const {g,p,t}=quiet();g.addShield(t,500,'test');const hp=t.hp;g.deal(p,t,100,{fixed:true});close(t.hp,hp);g.kill(p,p);g.time=4;g.deal(minion(g),t,1e7,{fixed:true});assert.equal(p.kills,1);assert.equal(t.lastDeath.killerId,p.id);
});
test('death and respawn clear old damage ownership',()=>{
 const {g,p,t}=quiet();g.deal(p,t,100,{fixed:true});g.kill(t,t);g.time=t.respawnAt;g.step(.01);assert.ok(t.alive);assert.equal(t.lastEnemyDamage,undefined);g.deal(minion(g),t,1e7,{fixed:true});assert.equal(t.lastDeath.execution,true);assert.equal(p.kills,0);
});
test('Gubo allied execution and self-destruction cannot be stolen by a recent enemy attacker',()=>{
 const {g,p,t}=quiet('gubo'),a=ally(g);Object.assign(t,{x:70,y:7});a.hp=a.maxHp*.2;g.deal(t,a,1,{fixed:true});g.deal(p,a,1e7,{fixed:true,allowFriendly:true});assert.equal(t.kills,0);assert.equal(g.firstBlood,null);assert.equal(a.lastDeath.execution,false);assert.ok(a.state.executedReturn);close(a.respawnAt-g.time,3);g.deal(t,p,1,{fixed:true});g.kill(p,p);assert.equal(t.kills,0);
});
test('delayed Hohenheim death freezes the ten-second decision at the lethal hit',()=>{
 const {g,p,t}=quiet('hohenheim');g.deal(t,p,1,{fixed:true});g.time=9.9;g.deal(minion(g,1),p,1e7,{fixed:true});assert.ok(p.state.posthumous);run(g,4.6);assert.equal(p.alive,false);assert.equal(t.kills,1);assert.equal(p.lastDeath.killerId,t.id);
});
test('nested Nelly mark damage cannot bypass Hohenheim delayed death or award a second takedown',()=>{
 const {g,p}=quiet('nelly'),t=g.makeChampion('hohenheim',1,9);g.units=[p,t];Object.assign(t,{armor:0,x:41.4,y:7,hp:300});t.state.nellyMarks={[p.id]:{active:true,ready:Infinity,hold:0,until:7}};g.attack(p,t);assert.ok(t.alive&&t.state.posthumous);assert.equal(p.kills,0);assert.equal(g.firstBlood,null);run(g,4.6);assert.equal(t.alive,false);assert.equal(p.kills,1);assert.equal(t.deaths,1);assert.equal(g.firstBlood.victimId,t.id);close(p.gold,250+160+g.time);
});
test('first blood adds a third of each participant currency exactly once and leaves XP unchanged',()=>{
 const {g,p,t}=quiet(),a=ally(g);g.deal(a,t,1,{fixed:true});g.deal(p,t,1e7,{fixed:true});close(p.gold,250+160);close(a.gold,250+40*4/3);close(p.xp,120);close(a.xp,70);assert.deepEqual(g.firstBlood.assistIds,[a.id]);assert.ok(g.currentAnnouncement().first);
 const next=enemy(g);g.deal(a,next,1,{fixed:true});g.deal(p,next,1e7,{fixed:true});close(p.gold,250+160+120);close(a.gold,250+40*4/3+40);assert.equal(g.firstBlood.victimId,t.id);g.kill(next,p);close(p.gold,530);assert.equal(p.kills,2);
});
test('Ahab special assist currency also receives first-blood scaling',()=>{
 const {g,p,t}=quiet('ahab'),a=ally(g);g.deal(a,t,1,{fixed:true});g.deal(p,t,1e7,{fixed:true});close(a.gold,250+90*4/3);close(a.xp,150);close(p.gold,410);
});
test('bounty starts on three kills, grows forty per kill and caps at 220',()=>{
 const {g,p}=quiet();for(let i=1;i<=10;i++){g.kill(enemy(g),p);close(bounty(p),i<3?0:Math.min(220,60+40*(i-3)));}assert.equal(p.streak,10);assert.equal(p.kills,10);
});
test('shutdown bounty pays only the killer, is separate from assist and resets on any death',()=>{
 const {g,p,t}=quiet(),a=ally(g);g.firstBlood={killerId:999};t.streak=5;g.deal(a,t,1,{fixed:true});g.deal(p,t,1e7,{fixed:true});close(p.gold,250+120+140);close(a.gold,290);close(bounty(t),0);assert.equal(t.streak,0);assert.equal(t.lastDeath.bounty,140);assert.match(g.currentAnnouncement().detail,/현상금 \+140/);
 const u=enemy(g);u.streak=10;g.kill(u,minion(g));close(bounty(u),0);close(p.gold,510);
});
test('execution before first blood cannot consume its bonus and a fresh game resets first blood',()=>{
 const {g,p,t}=quiet();g.kill(t,minion(g));assert.equal(g.firstBlood,null);g.kill(enemy(g),p);close(p.gold,410);assert.equal(new Game().firstBlood,null);
});
test('kill banners escalate at ten-second intervals through all-kill and reset after a longer gap',()=>{
 const {g,p,t}=quiet();g.kill(t,p);assert.equal(g.currentAnnouncement().title,'파우스트 처치!');for(let i=1;i<=3;i++){g.time=i*10;g.kill(enemy(g),p);assert.equal(g.currentAnnouncement().title,i===3?'올킬!':`${i+1}연킬!`);}g.time=40.01;g.kill(enemy(g),p);assert.equal(g.currentAnnouncement().title,'파우스트 처치!');assert.equal(p.multiKillCount,1);g.kill(p,p);g.time=41;g.kill(enemy(g),p);assert.equal(p.multiKillCount,1);
});
test('rapid multikills upgrade the visible banner, preserve first blood and leave queued objectives visible',()=>{
 const {g,p,t}=quiet();g.kill(t,p);g.announce('boss-spawn','중앙 보스 등장');g.time=1;g.kill(enemy(g),p);assert.equal(g.currentAnnouncement().title,'2연킬!');assert.equal(g.currentAnnouncement().first,true);g.time=4.21;assert.equal(g.currentAnnouncement().kind,'boss-spawn');g.time=7.5;assert.equal(g.currentAnnouncement(),null);
});
test('tower destruction, boss spawn and boss death enqueue objective announcements once',()=>{
 const {g,p}=quiet();const tower=g.entity({kind:'tower',team:1,x:44,y:7,maxHp:1000});g.kill(tower,p);assert.equal(g.currentAnnouncement().kind,'tower');g.time=4;g.spawnBoss();assert.equal(g.currentAnnouncement().kind,'boss-spawn');g.time=8;const boss=g.units.find(e=>e.camp==='boss');g.kill(boss,p);assert.equal(g.currentAnnouncement().kind,'boss-kill');const id=g.announcementSequence;g.kill(boss,p);assert.equal(g.announcementSequence,id);
});
test('announcement queue is bounded and pause without simulation ticks does not expire it',()=>{
 const {g}=quiet();for(let i=0;i<20;i++)g.announce('tower','포탑 '+i);assert.equal(g.announcements.length,4);const entry=g.currentAnnouncement();assert.equal(g.currentAnnouncement(),entry);assert.equal(COMBAT_RULES.announcementDuration,3.2);
});
test('Starbuck all basics advance 2.75 and gain thirty percent range',()=>{
 const {g,p,t}=quiet('starbuck');t.x=41.4;g.attack(p,t);close(p.motion.total,2.75);close(g.attackRange(p),3.38);run(g,.5);close(p.x,42.75);p.attackCd=0;p.ammo=1;g.attack(p,{x:49,y:7});assert.ok(p.motion);
});
test('Starbuck tactical reaches both widened sides, keeps forward range, and repeats every .3 seconds',()=>{
 const {g,p,t}=quiet('starbuck');Object.assign(t,{x:42,y:8.4});const other=enemy(g,42,5.6),back=enemy(g,38,7);const hits=[],deal=g.deal.bind(g);g.deal=(s,t,n,o)=>{if(s===p&&t===other)hits.push({at:g.time,n});return deal(s,t,n,o);};g.cast(p,'q',{x:45,y:7});run(g,1.4);assert.equal(hits.length,5);for(let i=0;i<5;i++){close(hits[i].at,.3*i,.017);close(hits[i].n,150*1.045**i);}assert.ok(t.hp<100000);close(back.hp,100000);close(skillTargeting(g,p,'q').range,2.782);close(skillTargeting(g,p,'q').radius,FAN_ANGLE);
});
test('Ahab gains a third magazine, guard movement and defense, and a 6.5-range ultimate',()=>{
 const {g,p}=quiet('ahab');assert.equal(p.ammo,3);assert.equal(g.ammoCap(p),3);const speed=g.speed(p),armor=g.armor(p);g.cast(p,'q',p);close(g.speed(p)/speed,1.12);close((100+g.armor(p))/(100+armor),1.12);close(skillTargeting(g,p,'r').range,6.5);p.qCd=0;g.cast(p,'q',p);close(g.speed(p),speed);close(g.armor(p),armor);g.cast(p,'r',{x:60,y:7});close(p.x,46.5);close(p.y,7);
});
test('Queequeg link lasts indefinitely and boosts both defense efficiencies while retaining target flat armor',()=>{
 const {g,p}=quiet('queequeg'),a=ally(g,'faust');g.cast(p,'q',a);close(g.armor(p),32);close(g.armor(a),65);assert.equal(p.state.tether.until,Infinity);g.time=100;g.step(.01);assert.equal(p.state.tether.until,Infinity);assert.ok(g.buff(p,'tetherGuard'));assert.ok(g.buff(a,'tetherArmor'));assert.equal(a.state.tetherResistance,4);
});
for(const cc of ['stun','root','silence','disarm','slow','taunt','captured'])test(`Queequeg takes fifty percent while linked ally has ${cc}, then returns to thirty`,()=>{
 const {g,p,t}=quiet('queequeg'),a=ally(g,'faust');g.cast(p,'q',a);g.status(a,cc,cc==='slow'?.2:1,1,t);let hp=a.hp,owner=p.hp;g.deal(t,a,100,{fixed:true});close(hp-a.hp,50);close(owner-p.hp,50);delete a.status[cc];hp=a.hp;owner=p.hp;g.deal(t,a,100,{fixed:true});close(hp-a.hp,70);close(owner-p.hp,30);
});
test('Queequeg forced-motion ally also gets fifty-percent damage sharing',()=>{
 const {g,p,t}=quiet('queequeg'),a=ally(g,'faust');g.cast(p,'q',a);g.startMotion(a,{x:1,y:0},2,{kind:'knock'});const hp=p.hp;g.deal(t,a,100,{fixed:true});close(hp-p.hp,50);
});
test('Queequeg relink, range break, owner death and target death remove the right defense buffs',()=>{
 for(const action of ['relink','range','owner-death','target-death']){const {g,p,t}=quiet('queequeg'),a=ally(g,'faust');g.cast(p,'q',a);if(action==='relink'){p.qCd=0;g.cast(p,'q',ally(g,'faust',41,9));}if(action==='range'){a.x=60;run(g,1.7);}if(action==='owner-death')g.kill(p,t);if(action==='target-death')g.kill(a,t);assert.equal(g.buff(a,'tetherArmor'),false,action);assert.equal(g.buff(a,'tetherGuard'),false,action);if(action!=='relink')assert.equal(g.buff(p,'tetherGuard'),false,action);}
});
test('Queequeg ultimate preserves infinite link and still shares a four-second movement buff',()=>{
 const {g,p}=quiet('queequeg'),a=ally(g);g.cast(p,'q',a);run(g,4);g.cast(p,'r',p);assert.equal(p.state.tether.until,Infinity);assert.equal(a.state.tetherResistance,4);close(a.buffs.queequegUlt-g.time,4);run(g,4.1);assert.ok(p.state.tether);assert.equal(g.buff(a,'queequegUlt'),false);assert.ok(g.buff(a,'tetherGuard'));
});
function shieldHealing(){const f=quiet('yi');f.a=ally(f.g,'meursault');for(const e of [f.p,f.a]){e.hp-=1000;e.lastAttackAt=100;e.lastDamageAt=100;}return f;}
test('Yi passive grants a shield without healing its recipient',()=>{
 const {g,p,t,a}=shieldHealing();g.deal(p,t,1,{fixed:true});const before=a.hp;run(g,1);close(a.hp-before,0);assert.equal(g.yiShield(a).passive,'yi');
});
test('Yi shield healing stops immediately on depletion and after expiry, even during combat',()=>{
 for(const action of ['deplete','expire']){const {g,p,t,a}=shieldHealing();g.deal(p,t,1,{fixed:true});if(action==='deplete')g.deal(t,a,300,{fixed:true});else g.time=3.01;const hp=a.hp;run(g,1);close(a.hp,hp);assert.equal(g.yiShield(a),undefined);}
});
test('Yi ultimate shields alone do not enable the passive heal',()=>{
 const {g,p,a}=shieldHealing();g.cast(p,'r',p);assert.ok(g.shield(a)>0);assert.equal(g.yiShield(a),undefined);const hp=a.hp;run(g,1);close(a.hp,hp);
});
test('multiple Yi passive shields grant no healing and survive source death',()=>{
 const {g,p,t,a}=shieldHealing(),second=ally(g,'yi',41,9);g.deal(p,t,1,{fixed:true});g.deal(second,t,1,{fixed:true});g.kill(p,p);const hp=a.hp;run(g,1);close(a.hp-hp,0);assert.ok(g.yiShield(a));
});
