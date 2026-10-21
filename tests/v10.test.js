import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {Game,respawnTime} from '../src/game.js';
import {CHAMPIONS,RULES,WALLS} from '../src/data.js';
import {distance,blocked} from '../src/geometry.js';
import {dash} from '../src/skills.js';
import {canOccupy} from '../src/collision.js';
import {ultGrowth} from '../src/v06-champions.js';
import * as Catalog from '../src/catalog.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*60);i++)g.step(1/60);};
function quiet(key='meursault'){
 const g=new Game(key,'top',{seed:17});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 const p=g.player,t=g.makeChampion('faust',1,8);Object.assign(p,{x:40,y:7});Object.assign(t,{x:43,y:7,maxHp:100000,hp:100000});g.units=[p,t];g.minionQueue=[];return{g,p,t};
}
function ally(g,key='meursault',x=42,y=9){const a=g.makeChampion(key,0,9);Object.assign(a,{x,y});return a;}
test('neutral and buff creep XP drops ten percent without changing gold or boss rewards',()=>{
 for(const [camp,xp,gold]of[['central',56.25,18],['side',56.25,18],['amplify',112.5,40],['blessing',112.5,40]]){const {g,p}=quiet();const n=g.makeNeutral(44,7,camp);g.kill(n,p);close(p.xp,xp);close(p.gold,250+gold);}
 const {g,p}=quiet();g.spawnBoss();g.kill(g.units.find(u=>u.camp==='boss'),p);close(p.xp,180);
});
test('first minion wave waits three seconds and following waves remain twenty-five seconds apart',()=>{
 const g=new Game('meursault','top',{seed:1});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 assert.equal(g.wave,0);assert.equal(g.units.filter(e=>e.kind==='minion').length,0);run(g,2.99);assert.equal(g.wave,0);run(g,.02);assert.equal(g.wave,1);assert.equal(g.units.filter(e=>e.kind==='minion').length,4);run(g,24.98);assert.equal(g.wave,1);run(g,.02);assert.equal(g.wave,2);
 const m=g.units.find(e=>e.kind==='minion');close(m.radius,.28*1.15);
});
test('siege minions resist all non-building final damage and retain building protection',()=>{
 const {g,p}=quiet();const m=g.entity({kind:'minion',siege:true,team:1,x:43,y:7,maxHp:10000,radius:.552});const hp=m.hp;g.deal(p,m,100,{fixed:true});close(hp-m.hp,92.5);
 const tower=g.entity({kind:'tower',team:0,x:42,y:7,maxHp:1000,radius:.9,range:9});const before=m.hp;g.deal(tower,m,100);close(before-m.hp,50);
});
test('siege building damage gains eight percent on its existing multiplier',()=>{
 const {g}=quiet();g.units=[];const m=g.entity({kind:'minion',siege:true,team:0,x:42,y:7,maxHp:1000,radius:.552});const tower=g.entity({kind:'tower',team:1,x:44,y:7,maxHp:10000,radius:.9,range:9});g.deal(m,tower,100,{fixed:true});close(10000-tower.hp,145.8);
});
test('core ward first appears after ten quiet seconds and cannot stack or refill immediately after a hit',()=>{
 const {g,p}=quiet();p.team=1;g.units=[p];const core=g.entity({kind:'core',team:0,x:43,y:7,maxHp:10000,radius:1.3,range:9,lastDamageAt:0});g.entity({kind:'minion',team:1,x:44,y:9,maxHp:1000});
 run(g,9.98);close(g.shield(core),0);run(g,.04);close(g.shield(core),1500);g.deal(p,core,1000,{fixed:true});close(g.shield(core),500);const at=g.time;run(g,9.98);close(g.shield(core),500);run(g,.04);close(g.shield(core),1500);run(g,1);close(g.shield(core),1500);assert.ok(g.time>at+10);
});
test('respawn growth increases thirteen percent while base and existing twenty-second cap stay fixed',()=>{
 close(respawnTime(0,1),6);close(respawnTime(60,2),Math.ceil(6+1.13*(.8+1.2)));close(respawnTime(600,5),20);close(respawnTime(1200,10),20);
});
test('walking into a hostile champion stops the mover without shifting its enemy',()=>{
 const {g,p,t}=quiet();g.input.x=1;const start={x:t.x,y:t.y};run(g,2);close(t.x,start.x);close(t.y,start.y);assert.ok(distance(p,t)>=p.radius+t.radius);assert.ok(p.x<t.x);
});
test('allied champions and minions pass through one another and never push teammates',()=>{
 const {g,p,t}=quiet();g.units=[p];const a=ally(g,'meursault',41.5,7);const m=g.entity({kind:'minion',team:0,x:42,y:7,maxHp:1000,radius:.322});g.input.x=1;run(g,1.2);assert.ok(p.x>43);close(a.x,41.5);close(m.x,42);assert.ok(canOccupy(g,p,a));
});
test('attacking dash passes through an enemy, hits it once and does not push it while overlapping',()=>{
 const {g,p,t}=quiet('myo');t.x=41.2;const hp=t.hp;g.attack(p,t);for(let i=0;i<22;i++){g.step(1/60);close(t.x,41.2);close(t.y,7);}assert.ok(p.x>t.x&&t.hp<hp);assert.ok(distance(p,t)>=p.radius+t.radius);assert.equal(p.motion,undefined);
});
test('attacking dash resolves an endpoint inside an enemy by moving only its caster',()=>{
 const {g,p,t}=quiet('myo');t.x=42.4;g.attack(p,t);run(g,.4);close(t.x,42.4);close(t.y,7);assert.ok(distance(p,t)>=p.radius+t.radius);assert.equal(blocked(p.x,p.y,p.radius),false);
});
test('a stunned offensive dash settles its caster without moving the overlapped enemy',()=>{
 const {g,p,t}=quiet('myo');t.x=41.2;g.attack(p,t);run(g,.15);assert.ok(distance(p,t)<p.radius+t.radius);g.status(p,'stun',1,1,t);run(g,.02);assert.equal(p.motion,undefined);close(t.x,41.2);close(t.y,7);assert.ok(distance(p,t)>=p.radius+t.radius);assert.equal(blocked(p.x,p.y,p.radius),false);
});
test('Rodion hits an enemy crossed by her basic exactly once and can also hit an enemy beyond the landing',()=>{
 const {g,p,t}=quiet('rodya');t.x=41.4;const beyond=g.makeChampion('faust',1,9);Object.assign(beyond,{x:44.5,y:7,hp:100000,maxHp:100000});const hits=new Map(),deal=g.deal.bind(g);g.deal=(source,target,n,o)=>{if(source===p&&o?.proc!==false)hits.set(target.id,(hits.get(target.id)||0)+1);return deal(source,target,n,o);};g.attack(p,{x:46,y:7});run(g,.4);assert.equal(hits.get(t.id),1);assert.equal(hits.get(beyond.id),1);close(t.x,41.4);close(beyond.x,44.5);
});
test('minion departures start outside the core and preserve each lane centerline',()=>{
 const g=new Game('meursault','top',{seed:1});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};run(g,4.2);for(const m of g.units.filter(e=>e.kind==='minion')){const c=g.units.find(e=>e.kind==='core'&&e.team===m.team);assert.ok(distance(m,c)>=m.radius+c.radius);assert.ok(canOccupy(g,m,m));}
});
test('attacking dashes stop at both friendly and enemy buildings',()=>{
 for(const team of [0,1]){const {g,p}=quiet('myo');g.units=[p];const tower=g.entity({kind:'tower',team,x:42,y:7,maxHp:10000,radius:.9,range:9});g.attack(p,{x:46,y:7});run(g,.5);assert.ok(p.x<42);assert.ok(distance(p,tower)>=p.radius+tower.radius);close(tower.x,42);}
});
test('phasing cannot cross a wall or terrain edge when settling from an overlap',()=>{
 for(const edge of [false,true]){const {g,p,t}=quiet('myo'),wall=WALLS[0];if(edge){Object.assign(p,{x:.7,y:7});Object.assign(t,{x:.5,y:7});}else{Object.assign(p,{x:wall.x-2,y:wall.y+wall.h/2});Object.assign(t,{x:wall.x-.75,y:p.y});}const enemy={x:t.x,y:t.y};dash(g,p,{x:edge?-1:1,y:0},5,100);run(g,1);assert.equal(blocked(p.x,p.y,p.radius),false);close(t.x,enemy.x);close(t.y,enemy.y);assert.ok(distance(p,t)>=p.radius+t.radius-.001);}
});
test('non-attacking Alisa tactical movement does not phase through an enemy',()=>{
 const {g,p,t}=quiet('alisa');t.x=41.4;g.cast(p,'q',{x:48,y:7});run(g,.5);assert.ok(p.x<t.x);close(t.x,41.4);
});
test('Yi passive shields every nearby ally by their own HP with a twenty-percent source cap and 1.5-second gate',()=>{
 const {g,p,t}=quiet('yi'),a=ally(g,'meursault',49.8,7),far=ally(g,'meursault',50.1,7);
 g.deal(p,t,1);close(g.shield(p),p.maxHp*.05);close(g.shield(a),a.maxHp*.05);close(g.shield(far),0);g.time=1;g.deal(p,t,1);close(g.shield(a),a.maxHp*.05);
 for(let i=1;i<=7;i++){g.time=i*1.5;g.deal(p,t,1);}close(g.shield(a),a.maxHp*.2);
});
test('Yi ultimate fans seven bullets across the widened angle with one extra range',()=>{
 const {g,p,t}=quiet('yi');g.cast(p,'r',p);close(g.attackRange(p),7.5);g.attack(p,t);assert.equal(g.projectiles.length,7);assert.ok(g.projectiles.every(b=>b.remaining===7.5));const angles=g.projectiles.map(b=>Math.atan2(b.dy,b.dx));assert.ok(Math.max(...angles)-Math.min(...angles)>1.4);
});
test('Rudolph whip radius and range shrink while ultimate scales with actual SP spent',()=>{
 const {g,p,t}=quiet('rudolph');close(g.attackRange(p),7.65);t.x=44;t.y=10.1;g.attack(p,{x:44,y:7});close(t.hp,100000);p.ammo=37;g.cast(p,'r',{x:43,y:7});close(g.pending[0].damage,37*8.5);close(p.ammo,0);
});
test('Dongrang level power converts to health and armor but never multiplies incoming healing',()=>{
 const {g,p,t}=quiet('dongrang');const hp=p.maxHp,armor=g.armor(p);g.award(p,250,0);assert.equal(p.level,2);const power=CHAMPIONS.dongrang.growth.power;close(g.desireEfficiency(p),1.13+power);assert.ok(p.maxHp>hp&&g.armor(p)>armor);p.hp-=1000;const before=p.hp;g.heal(t,p,100,false);close(p.hp-before,100);close(g.deal(p,t,100),100);
});
test('Dongrang can place overlapping trees and golden trees with radius 3.8',()=>{
 const {g,p}=quiet('dongrang');g.cast(p,'q',{x:44,y:7});g.zones[0].golden=true;p.qCd=0;assert.ok(g.cast(p,'q',{x:44,y:7}));assert.equal(g.zones.length,2);assert.ok(g.zones.every(z=>z.r===3.8));close(p.qCd,10);
});
test('Dongrang ultimate has uncapped 1200-healing damage steps and fixed radius/cooldown, and preserves trees',()=>{
 const {g,p,t}=quiet('dongrang');p.totalHealingReceived=1200*21;assert.deepEqual(ultGrowth(p),{radius:3.2,damage:1230});g.cast(p,'q',{x:44,y:7});p.rCd=0;t.x=45;const hp=t.hp;assert.ok(g.cast(p,'r',{x:44,y:7}));close(p.motion.total,4);close(p.rCd,50);run(g,.6);assert.ok(t.hp<hp);assert.equal(g.zones.length,1);assert.ok(g.stat(t,'root'));close(t.status.root.until-(p.castAt+.5),1.2,.03);
});
test('Dongbaek refills all three petals every ten seconds and pauses ammo recovery throughout disarm',()=>{
 const {g,p,t}=quiet('dongbaek');t.x=41.5;for(let i=0;i<3;i++){p.ammo=0;p.attackCd=0;g.attack(p,t);}close(p.state.petals,0);run(g,2.8);close(p.reloadProgress,0);close(p.ammo,0);run(g,.1);assert.ok(p.reloadProgress>0);run(g,7.08);close(p.state.petals,0);run(g,.04);close(p.state.petals,3);assert.equal(p.state.petalReady,Infinity);
});
test('Queequeg is support, grants stacking resistance while linked, and clears it when detached',()=>{
 const {g,p}=quiet('queequeg'),a=ally(g);assert.equal(CHAMPIONS.queequeg.role,'지원');g.cast(p,'q',a);run(g,4.02);assert.equal(a.state.tetherResistance,4);g.status(a,'silence',1,2);close(a.status.silence.until-g.time,2*.85*.8);a.x=60;run(g,1.6);assert.equal(p.state.tether,undefined);assert.equal(g.buff(a,'tetherResistance'),false);
});
test('Queequeg ultimate preserves the infinite link and shares four seconds of movement speed',()=>{
 const {g,p}=quiet('queequeg'),a=ally(g,'faust');g.cast(p,'q',a);run(g,2);const speed=g.speed(a);g.cast(p,'r',p);assert.equal(p.state.tether.until,Infinity);close(a.buffs.tetherStride-g.time,4);close(g.speed(a)/speed,1.25);run(g,4.1);assert.equal(g.buff(a,'tetherStride'),false);
});
test('Ahab starts and respawns with cover, is sniper and gains range plus baseline reload',()=>{
 const {g,p,t}=quiet('ahab');assert.equal(CHAMPIONS.ahab.role,'저격');assert.equal(p.state.order,'cover');close(p.range,10.8);close(g.reloadInterval(p),RULES.reload[CHAMPIONS.ahab.reload]/(RULES.reloadEfficiency*1.15));g.kill(p,t);g.time=p.respawnAt;g.step(.01);assert.equal(p.state.order,'cover');assert.ok(g.buff(p,'ahabOrder'));
});
test('Ahab cover gives allies thirty percent damage while granting only the captain three gated reload stacks',()=>{
 const {g,p,t}=quiet('ahab'),a=ally(g,'meursault',41,8);const baseline=g.deal(a,t,100);t.state.harpoon={source:p.id,team:0,until:20};close(g.deal(a,t,100),baseline*1.3);assert.equal(p.state.coverStacks,1);assert.equal(a.state.coverStacks,undefined);g.deal(a,t,100);assert.equal(p.state.coverStacks,1);for(let i=1;i<=4;i++){g.time=i*1.61;g.deal(a,t,100);}assert.equal(p.state.coverStacks,3);close(p.buffs.ahabCover-g.time,5);a.x=60;close(g.deal(a,t,100),baseline);
});
test('Ahab guard redirects damage to the highest-current-HP eligible ally and respects the twenty-percent floor',()=>{
 const {g,p,t}=quiet('ahab'),a=ally(g,'meursault',41,9),b=ally(g,'faust',40,9);a.hp=3000;b.hp=2000;g.cast(p,'q',p);const hp=p.hp;g.deal(t,p,100,{fixed:true});close(hp-p.hp,70);close(a.hp,2970);close(b.hp,2000);g.deal(t,p,100000,{fixed:true});assert.ok(a.alive);close(a.hp,a.maxHp*.2);assert.ok(b.alive);
});
test('Ahab return moves at twelve units per second and keeps its attack immunity',()=>{
 const {g,p,t}=quiet('ahab');t.x=46;g.cast(p,'r',{x:44,y:7});run(g,.47);assert.ok(p.motion);close(p.motion.speed,12);const x=p.x,hp=p.hp;run(g,.1);close(x-p.x,1.2,.02);g.deal(t,p,1000,{fixed:true});close(p.hp,hp);
});
test('consumables have no live module, champion resource, purchase, use or codex API',()=>{
 const {g,p}=quiet();assert.equal(existsSync(new URL('../src/items.js',import.meta.url)),false);assert.equal(g.usePotion,undefined);assert.equal(g.buyConsumable,undefined);assert.equal(g.sellConsumable,undefined);assert.equal('potion' in p,false);assert.equal('CONSUMABLES' in Catalog,false);assert.equal(g.buy(p,'potion'),false);
});
test('Starbuck joins ordinary drafts with requested grades, harpoon damage and jungle rewards',()=>{
 const {g,p,t}=quiet('starbuck');assert.equal(Object.keys(CHAMPIONS).length,29);assert.deepEqual([CHAMPIONS.starbuck.power,CHAMPIONS.starbuck.health,CHAMPIONS.starbuck.speed,p.ammo,CHAMPIONS.starbuck.reload],[3,4,2,2,3]);g.units=[p];const n=g.makeNeutral(42,7,'side');const before=n.hp;g.deal(p,n,100,{fixed:true});close(before-n.hp,112);g.kill(n,p);close(p.xp,56.25*1.1);
});
test('Starbuck every basic stabs once then advances 2.875 with either full or partial ammo',()=>{
 const {g,p,t}=quiet('starbuck');t.x=41.4;const hp=t.hp;g.attack(p,t);close(hp-t.hp,218.5*.9);close(p.motion.total,2.875);run(g,.4);assert.ok(p.x>t.x);p.attackCd=0;p.ammo=1;const x=p.x;g.attack(p,{x:x+1,y:p.y});assert.ok(p.motion);close(p.motion.total,2.875);
});
test('Starbuck tactical hits five times at .3 intervals with increasing damage and stops after a miss',()=>{
 const {g,p,t}=quiet('starbuck');t.x=42;const hits=[],deal=g.deal.bind(g);g.deal=(e,t,n,o)=>{if(e===p)hits.push({at:g.time,n});return deal(e,t,n,o);};g.cast(p,'q',t);run(g,1.9);assert.equal(hits.length,5);for(let i=0;i<5;i++){close(hits[i].at,.3*i,.02);close(hits[i].n,150*1.045**i);}close(g.stat(t,'slow'),.2);p.qCd=0;t.y=14;hits.length=0;g.cast(p,'q',{x:45,y:7});run(g,2);assert.equal(hits.length,0);
});
test('Starbuck ultimate disappears for .7 seconds, teleports and resets tactical on either hit or miss',()=>{
 const {g,p,t}=quiet('starbuck');t.x=46;p.qCd=5;assert.ok(g.cast(p,'r',{x:46,y:7}));assert.ok(g.hidden(p));const hp=t.hp;run(g,.65);close(p.x,40);close(t.hp,hp);run(g,.1);assert.equal(g.hidden(p),false);assert.ok(p.x>44&&t.hp<hp);close(p.qCd,0);assert.ok(distance(p,t)>=p.radius+t.radius);
 const f=quiet('starbuck');f.t.y=14;f.p.qCd=5;f.g.cast(f.p,'r',{x:46,y:7});run(f.g,.8);close(f.p.qCd,0);
});
