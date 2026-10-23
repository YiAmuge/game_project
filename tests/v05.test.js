import test from 'node:test';
import { release as releaseYan } from '../src/yan.js';
import { release as releaseHohenheim } from '../src/hohenheim.js';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { CHAMPIONS, RUNTIME_CHAMPIONS, RULES, UPGRADES, FOUNTAINS, WELL_ROOMS, CORE_POSITIONS } from '../src/data.js';
import { AUGMENTS } from '../src/augments.js';
import { skillTargeting, castPoint } from '../src/targeting.js';
import { distance } from '../src/geometry.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*30);i++)g.step(1/30);};
function quiet(key='faust'){
 const g=new Game(key);for(const fn of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[fn]=()=>{};
 const p=g.player,t=g.champions(1).find(c=>c.key==='faust')||g.makeChampion('faust',1,8);Object.assign(p,{x:40,y:7});Object.assign(t,{x:42,y:7,hp:100000,maxHp:100000});g.units=[p,t];return {g,p,t};
}
function ally(g,key='yi'){const a=g.makeChampion(key,0,5,'support');a.x=41;a.y=7;return a;}

test('all ordinary and experimental champions have individual positive growth and defined attack animation',()=>{
 assert.equal(Object.keys(CHAMPIONS).length,29);assert.equal(Object.keys(RUNTIME_CHAMPIONS).length,31);
 for(const key of Object.keys(RUNTIME_CHAMPIONS)){const {g,p,t}=quiet(key),baseHp=p.maxHp,baseSpeed=g.speed(p),basePower=g.powerScale(p);g.award(p,10000,0);assert.equal(p.level,10);assert.ok(p.maxHp>baseHp,key);assert.ok(g.speed(p)>baseSpeed,key);assert.ok(g.powerScale(p)>basePower,key);assert.ok(RUNTIME_CHAMPIONS[key].attackStyle);}
});
test('ammo use interval increases 30 percent except original fast attack profiles',()=>{
 for(const key of Object.keys(RUNTIME_CHAMPIONS)){const {g,p,t}=quiet(key),c=RUNTIME_CHAMPIONS[key];assert.ok(g.attack(p,t));if(key==='yan')releaseYan(g,p,t);if(key==='hohenheim')releaseHohenheim(g,p,t);close(p.attackCd,key==='yan'?.85:c.attackTime*(c.attackTime<=.4?1:1.3));}
});
test('reload pauses throughout ammo consumption, preserving partial progress, and resumes after firing',()=>{
 const {g,p,t}=quiet();p.ammo=2;p.reloadProgress=.25;g.attack(p,t);run(g,.2);close(p.reloadProgress,.25);run(g,.7);assert.ok(p.reloadProgress>.25);
 p.ammo=3;p.attackCd=0;p.reloadProgress=0;g.input.fire=true;g.input.aim=t;run(g,1.1);assert.equal(p.ammo,1);close(p.reloadProgress,0);run(g,.8);assert.equal(p.ammo,0);assert.ok(p.reloadProgress>0);run(g,3);assert.ok(p.totalDamage>0);assert.ok(p.alive);
});
test('Faust maximum level adds exactly one magazine and piercing with an unchanged actual projectile range',()=>{
 const {g,p,t}=quiet();assert.equal(g.ammoCap(p),3);g.award(p,10000,0);assert.equal(g.ammoCap(p),4);close(g.attackRange(p),7.5);p.ammo=4;g.attack(p,t);close(g.projectiles[0].remaining,7.5);assert.equal(g.projectiles[0].pierce,Infinity);
});
test('new fountain is a semicircle behind and separated from its core; recall and respawn use it',()=>{
 for(const team of [0,1]){const {g,p,t}=quiet();const e=team?t:p;Object.assign(e,FOUNTAINS[team]);assert.ok(g.inSpawn(e));Object.assign(e,CORE_POSITIONS[team]);assert.ok(!g.inSpawn(e));assert.ok(distance(WELL_ROOMS[team],CORE_POSITIONS[team])>4);g.kill(e,team?p:t);g.time=e.respawnAt;g.step(.01);assert.ok(e.alive);close(distance(e,FOUNTAINS[team]),0);}
});
test('minion sharing conserves the reward pool and divides the nearby ally share',()=>{
 const {g,p}=quiet('don'),a=ally(g),b=ally(g,'honglu');b.x=43;
 const m=g.entity({kind:'minion',team:1,x:42,y:7,maxHp:1});const before=[p,a,b].map(c=>[c.xp,c.gold]);g.deal(p,m,10,{fixed:true});
 close(p.xp-before[0][0],19.2);close(a.xp-before[1][0],2.4);close(b.xp-before[2][0],2.4);close(p.gold-before[0][1],12);close(a.gold-before[1][1],1.5);close(b.gold-before[2][1],1.5);
});
test('ranged minions and towers have homing flight time, while minion tower resistances differ by type',()=>{
 const {g,p,t}=quiet();const ranged=g.entity({kind:'minion',ranged:true,team:0,x:36,y:7,maxHp:480,damage:72});const hp=t.hp;g.simpleAttack(ranged,t);close(t.hp,hp);g.updateProjectiles(.1);close(t.hp,hp);t.y=8;for(let i=0;i<30;i++)g.updateProjectiles(1/30);close(hp-t.hp,72);
 const tower=g.entity({kind:'tower',team:1,x:42,y:7,maxHp:1000,damage:100});for(const [ranged,siege,mult] of [[false,false,.7],[true,false,.8],[false,true,.5]]){const m=g.entity({kind:'minion',team:0,x:40,y:7,maxHp:1000,ranged,siege});g.simpleAttack(tower,m);close(m.hp,1000);g.updateProjectiles(.3);close(1000-m.hp,100*mult);}
});
test('creeps never initiate attacks before being hurt and deaggro after 1.85 seconds outside their camp',()=>{
 const {g,p}=quiet();const n=g.makeNeutral(40,7,'side');p.x=41;const hp=p.hp;g.aiNeutral=Game.prototype.aiNeutral;run(g,1);close(p.hp,hp);assert.ok(!n.hostile);g.deal(p,n,1,{fixed:true});assert.ok(n.hostile);run(g,.1);assert.ok(p.hp<hp);n.x=45;g.time+=.1;g.aiNeutral(n,.01);assert.ok(n.hostile);g.time+=1.8;g.aiNeutral(n,.01);assert.ok(!n.returning);g.time+=.06;g.aiNeutral(n,.01);assert.ok(n.returning);assert.equal(n.hostile,false);assert.equal(n.aggro,null);
});
test('Don tactical locks its direction while allowing movement and halves frontal damage only',()=>{
 const {g,p,t}=quiet('don');t.x=43;g.cast(p,'q',t);assert.ok(!p.motion);const before=p.x;g.input.y=1;run(g,.3);close(p.x,before);assert.ok(p.y>7);assert.ok(p.state.donBarrage.d.x>.99);assert.equal(g.attack(p,t),false);
 g.input.y=0;t.x=p.x+2;t.y=p.y;let hp=p.hp;g.deal(t,p,100);const front=hp-p.hp;t.x=p.x-2;hp=p.hp;g.deal(t,p,100);close((hp-p.hp)/front,2);run(g,2.5);assert.equal(p.state.donBarrage,undefined);
});
test('Rodion now travels before basic damage and tactical cooldown is twelve seconds',()=>{
 const {g,p,t}=quiet('rodya');t.x=42;g.attack(p,t);close(t.hp,100000);assert.ok(p.motion);run(g,.3);assert.ok(t.hp<100000);assert.equal(CHAMPIONS.rodya.q,12);
});
test('Heath ultimate radius preview matches damage, Ishmael targets the first champion at range 16 and Outis uses a contact dash',()=>{
 const a=quiet('heathcliff');a.t.x=47;a.g.cast(a.p,'r',a.p);run(a.g,.6);assert.ok(a.t.hp<100000);close(skillTargeting(a.g,a.p,'r').radius,7.5);
 const {g,p,t}=quiet('ishmael');t.x=46;const t2=g.makeChampion('yi',1,5);t2.x=50;t2.y=7;g.cast(p,'r',t);assert.equal(g.projectiles.length,0);run(g,.25);assert.ok(g.projectiles[0].remaining<=16);run(g,.6);assert.ok(t.hp<100000);close(t2.hp,t2.maxHp);
 const o=quiet('outis');o.g.cast(o.p,'r',o.t);assert.ok(o.p.motion);close(o.p.motion.total,4.5);run(o.g,.8);assert.ok(o.t.hp<100000);assert.equal(o.g.projectiles.length,0);
});
test('targeting includes ground teleports, self effects and charge releases while dashes stay quick',()=>{
 for(const key of ['ryoshu','sinclair','nelly']){const {g,p}=quiet(key);assert.notEqual(skillTargeting(g,p,'r').kind,'quick');}
 for(const [key,slot] of [['sinclair','q'],['ryoshu','q'],['outis','r']]){const {g,p}=quiet(key);assert.equal(skillTargeting(g,p,slot).kind,'quick');}
 const {g,p}=quiet('yi'),point=castPoint(p,{x:70,y:7},skillTargeting(g,p,'q'));close(distance(p,point),7);g.cast(p,'q',{x:70,y:7});close(g.zones[0].x,47);
});
test('champion death leaves a corpse at the death location before the living unit respawns elsewhere',()=>{
 const {g,p,t}=quiet();t.x=43;t.y=8;g.kill(t,p);assert.equal(g.corpses.length,1);close(g.corpses[0].x,43);close(g.corpses[0].y,8);g.time=t.respawnAt;g.step(.01);close(g.corpses[0].x,43);assert.ok(t.alive);assert.notEqual(t.x,43);
});
test('dead upgrades work up to five/three stages without healing a dead champion',()=>{
 const {g,p,t}=quiet();g.kill(p,t);p.gold=10000;for(const u of UPGRADES){for(let i=0;i<u.max;i++)assert.ok(g.buy(p,u.key),u.key);assert.equal(g.buy(p,u.key),false);}assert.equal(p.hp,0);assert.equal(g.buy(p,'potion'),false);assert.equal(p.upgrades.health,5);assert.equal(p.upgrades.haste,3);
});
test('augment gates, unique ownership, four slots, refund and repurchase are enforced',()=>{
 const {g,p}=quiet();p.alive=false;p.hp=0;p.gold=10000;assert.equal(g.buyAugment(p,'power15'),false);p.upgrades.power=3;p.upgrades.health=3;p.upgrades.speed=3;for(const k of ['power15','blackOrb','magazine2','cooldown15'])assert.ok(g.buyAugment(p,k));assert.equal(g.buyAugment(p,'power15'),false);assert.equal(g.buyAugment(p,'range7'),false);const gold=p.gold;assert.ok(g.sellAugment(p,'power15'));close(p.gold-gold,350);assert.ok(g.buyAugment(p,'range7'));assert.equal(p.hp,0);
});
test('every augment can be purchased after its own category unlock and stat augments change real combat stats',()=>{
 for(const item of AUGMENTS){const {g,p}=quiet();p.alive=false;p.gold=10000;Object.assign(p.upgrades,{power:3,health:3,speed:1,reload:1,haste:1});assert.ok(g.buyAugment(p,item.key),item.key);}
 const {g,p,t}=quiet();p.augments=['power15','blackOrb','range7'];close(g.powerScale(p),1.2);close(g.maxHp(p),3400*1.15);close(g.attackRange(p),7.5+2.5);p.augments=['magazine2','cooldown15','adaptiveSpeed'];assert.equal(g.ammoCap(p),5);g.cast(p,'q',t);close(p.qCd,CHAMPIONS.faust.q*.85);p.lastCombat=-99;const outside=g.speed(p);p.lastCombat=g.time;assert.ok(g.speed(p)<outside);
});
test('final damage augment procs once per 7 seconds and respects final post-armor damage',()=>{
 const {g,p,t}=quiet();p.augments=['finalBullet'];t.armor=100;let hp=t.hp;const hit=g.deal(p,t,100);close(hp-t.hp,hit*1.07);hp=t.hp;g.deal(p,t,100);close(hp-t.hp,hit);g.time=7.1;hp=t.hp;g.deal(p,t,100);close(hp-t.hp,hit*1.07);
});
test('reload augment stacks to five and decays one every three seconds',()=>{
 const {g,p,t}=quiet();p.augments=['reloadStacks'];const base=g.reloadInterval(p);for(let i=0;i<5;i++)g.deal(p,t,1);assert.equal(p.state.augReloadStacks,5);close(g.reloadInterval(p),base/1.25);run(g,3.1);assert.equal(p.state.augReloadStacks,4);run(g,3);assert.equal(p.state.augReloadStacks,3);run(g,9);assert.equal(p.state.augReloadStacks,0);
});
test('K ampule restores fatal damage once per sixty seconds and clears control',()=>{
 const {g,p,t}=quiet();p.augments=['kAmpule'];p.hp=1;g.status(p,'stun',1,5,t);g.deal(t,p,99999,{fixed:true});assert.ok(p.alive);close(p.hp,p.maxHp*.5);close(g.stat(p,'stun'),0);close(p.state.ampuleReady,60);assert.ok(p.ccImmuneUntil>g.time);g.time=1.1;g.deal(t,p,99999,{fixed:true});assert.equal(p.alive,false);
});
test('battle haste requires three seconds of continuous combat and clears out of combat',()=>{
 const {g,p,t}=quiet();p.augments=['battleHaste'];for(let i=0;i<110;i++){if(i%30===0)g.deal(p,t,1);g.step(1/30);}assert.ok(g.buff(p,'augBattleHaste'));close(g.haste(p),.15);run(g,3.1);assert.equal(g.buff(p,'augBattleHaste'),false);
});
test('Gahwan gaze becomes contempt at seven hits and amplifies skills but not basics',()=>{
 const {g,p,t}=quiet('gahwan');for(let i=0;i<7;i++)g.deal(p,t,1,{damageKind:'basic'});assert.ok(t.state.contempt[p.id]>g.time);let hp=t.hp;g.deal(p,t,100,{proc:false,damageKind:'basic'});const basic=hp-t.hp;hp=t.hp;g.deal(p,t,100,{proc:false,damageKind:'skill'});close((hp-t.hp)/basic,1.12);
});
test('Nelly has two replenishing knife charges and a forced ultimate mark preserves the next three hits',()=>{
 const {g,p,t}=quiet('nelly');assert.equal(p.state.knifeCharges,2);g.cast(p,'q',t);assert.equal(p.state.knifeCharges,1);assert.ok(g.cast(p,'q',t));assert.equal(p.state.knifeCharges,0);assert.equal(g.cast(p,'q',t),false);g.time=10.1;g.step(.01);assert.equal(p.state.knifeCharges,1);
 p.rCd=0;g.cast(p,'r',t);const mark=t.state.nellyMarks[p.id];assert.ok(mark.active);assert.equal(mark.hold,3);for(let i=0;i<3;i++)g.deal(p,t,1);assert.ok(mark.active);g.deal(p,t,1);assert.equal(mark.active,false);
});
test('Ahab cover rewards the captain and takedown support retains its bonus',()=>{
 const {g,p,t}=quiet('ahab'),a=ally(g);assert.equal(p.state.order,'cover');p.attackCd=0;g.attack(p,t);run(g,.2);assert.ok(t.state.harpoon);g.deal(a,t,1);assert.ok(g.buff(p,'ahabCover'));assert.equal(g.buff(a,'ahabCover'),false);const xp=a.xp,gold=a.gold;g.deal(p,t,1000000,{fixed:true});close(a.xp-xp,150);close(a.gold-gold,120);
});

test('Ahab execution snapshots below ten percent and grants only one ultimate recast',()=>{
 const {g,p,t}=quiet('ahab');t.maxHp=100000;t.hp=9000;g.cast(p,'r',t);t.hp=90000;run(g,.9);assert.equal(t.alive,false);assert.ok(p.state.recastUntil>g.time);const next=g.makeChampion('yi',1,6);next.x=p.x+1;next.y=p.y;next.maxHp=100000;next.hp=9000;assert.ok(g.cast(p,'r',next));run(g,.8);assert.equal(next.alive,false);assert.ok(!p.state.recastUntil);assert.equal(g.cast(p,'r',p),false);
});

test('charge cooldown reduction and extra ultimate ammunition apply to special resource users',()=>{
 const {g,p,t}=quiet('nelly');p.augments=['cooldown15'];g.cast(p,'q',t);close(p.state.knifeReady-g.time,4.25);
 const a=quiet('ezra');a.p.augments=['magazine2'];a.g.cast(a.p,'r',a.p);assert.equal(a.p.ammo,6);assert.equal(a.g.ammoCap(a.p),6);
});
test('central creep leash clocks use the displayed shared camp boundary',()=>{
 const {g,p}=quiet();g.aiNeutral=Game.prototype.aiNeutral;
 for(const camp of ['central']){const n=g.makeNeutral(40,23.4,camp),view=g.campViews().find(c=>c.units.includes(n));n.hostile=true;n.aggro=p.id;n.x=view.home.x+view.radius-.1;n.y=view.home.y;g.aiNeutral(n,.001);assert.equal(n.outsideSince,undefined);n.x=view.home.x+view.radius+.1;g.aiNeutral(n,.001);assert.equal(n.outsideSince,g.time);}
});
