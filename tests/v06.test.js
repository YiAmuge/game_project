import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { CHAMPIONS, RUNTIME_CHAMPIONS, RULES, WORLD, FOUNTAINS, WELL_ROOMS, CORE_POSITIONS, BUSHES, MINIONS, CAMP_RULES, lanePath } from '../src/data.js';
import { blocked, distance, findPath, segmentDistance } from '../src/geometry.js';
import { skillTargeting } from '../src/targeting.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*30);i++)g.step(1/30);};
function quiet(key='faust'){
 const g=new Game(key);for(const fn of ['aiChampion','aiMinion','aiStructure','aiNeutral'])g[fn]=()=>{};
 const p=g.player,t=g.champions(1).find(c=>c.key==='faust')||g.makeChampion('faust',1,8);Object.assign(p,{x:40,y:7});Object.assign(t,{x:42,y:7,hp:100000,maxHp:100000});g.units=[p,t];g.minionQueue=[];return {g,p,t};
}
test('twenty-four ordinary and two experimental champions retain finite stats and complete unique growth definitions',()=>{
 assert.equal(Object.keys(CHAMPIONS).length,29);assert.equal(Object.keys(RUNTIME_CHAMPIONS).length,31);
 for(const key of Object.keys(RUNTIME_CHAMPIONS)){const g=new Game(key);assert.ok(g.player.maxHp>0);assert.ok(Number.isFinite(g.speed(g.player)));assert.ok(CHAMPIONS[key]?.growth||RUNTIME_CHAMPIONS[key].growth);}
});
test('new rear wings and two flank rooms are walkable and connected; void corners stay blocked',()=>{
 close(WORLD.w,87.72);close(WORLD.h,62.8);
 for(const p of [...FOUNTAINS,{x:41.6,y:-4},{x:41.6,y:50.6}]){assert.ok(!blocked(p.x,p.y,.48));assert.ok(findPath({x:40,y:7},p).length);}
 assert.ok(blocked(-8,-4));assert.ok(blocked(70,-4));assert.ok(blocked(20,51));
 for(const team of [0,1]){assert.ok(distance(FOUNTAINS[team],CORE_POSITIONS[team])>9);const g=new Game();assert.ok(g.inSpawn({...FOUNTAINS[team],team}));assert.ok(!g.inSpawn({...CORE_POSITIONS[team],team}));}
 assert.ok(BUSHES.some(b=>b.y<0));assert.ok(BUSHES.some(b=>b.y>RULES.height));
});
test('four two-unit neutral camps and buff health/respawn data match the new rules',()=>{
 const g=new Game();assert.equal(g.units.filter(u=>u.kind==='neutral').length,16);
 const sides=g.campViews().filter(c=>c.kind==='side');assert.equal(sides.length,4);assert.ok(sides.every(c=>c.units.length===2));
 for(const e of g.units.filter(u=>u.kind==='neutral')){if(['central','side'].includes(e.camp))assert.equal(e.respawnDelay,20);else if(['blessing','amplify'].includes(e.camp)){close(e.maxHp,e.camp==='amplify'?1700:1600);assert.equal(e.respawnDelay,45);}}
});
test('neutral and buff creeps actually respawn after twenty and forty-five seconds',()=>{
 const {g,p}=quiet();for(const [camp,seconds] of [['side',20],['amplify',45],['blessing',45]]){const n=g.makeNeutral(40,7,camp);g.kill(n,p);close(n.respawnAt-g.time,seconds);g.time=n.respawnAt-.02;g.step(.01);assert.equal(n.alive,false);g.step(.02);assert.ok(n.alive);assert.ok(!n.hostile);}
});
test('both camp buffs last sixty seconds without an immediate healing burst',()=>{
 for(const camp of ['amplify','blessing']){const {g,p}=quiet();const n=g.makeNeutral(40,7,camp);g.kill(n,p);close(p.buffs[camp]-g.time,60);assert.equal(p.buffs.blessingHeal,undefined);}
});
function pattern(camp){const {g,p}=quiet();g.player.x=41;const n=g.makeNeutral(40,7,camp);g.deal(p,n,1,{fixed:true});g.aiNeutral=Game.prototype.aiNeutral;return {g,p,n};}
test('amplify pattern starts 1.5s after aggro, locks a frontal sector and strikes after 2.65s',()=>{
 const {g,p,n}=pattern('amplify');run(g,1.4);assert.ok(!n.pattern);run(g,.2);assert.equal(n.pattern.kind,'amplify');close(n.pattern.at-n.pattern.startedAt,2.65);const old={x:n.pattern.x,y:n.pattern.y};p.x+=7;run(g,2.4);assert.ok(n.pattern);close(n.pattern.x,old.x);run(g,.3);assert.ok(!n.pattern);assert.ok(p.alive);
});
test('blessing pattern locks a frontal sector for 2.65 seconds and hurts units inside it',()=>{
 const {g,p,n}=pattern('blessing');run(g,1.6);assert.equal(n.pattern.kind,'blessing');close(n.pattern.at-n.pattern.startedAt,2.65);const hp=p.hp;run(g,2.5);close(p.hp,hp);run(g,.2);assert.ok(p.hp<hp);assert.ok(!n.pattern);
});
test('channeling buff creeps take twenty percent extra damage and repeat on a five-second start cadence',()=>{
 const {g,p,n}=pattern('amplify');run(g,1.6);const first=n.pattern.startedAt,hp=n.hp;g.deal(p,n,100,{fixed:true});close(hp-n.hp,120);assert.ok(n.pattern);run(g,4.8);assert.ok(!n.pattern);run(g,.3);assert.ok(n.pattern);close(n.pattern.startedAt-first,5,1/30+.0001);
});
test('leash, death and stun cancel a telegraphed pattern instead of leaving a ghost attack',()=>{
 for(const action of ['leash','death','stun']){const {g,p,n}=pattern('amplify');run(g,1.6);assert.ok(n.pattern);if(action==='death')g.kill(n,p);if(action==='stun'){g.status(n,'stun',1,1);g.step(1/30);}if(action==='leash'){n.x=n.campCenter.x+4;g.aiNeutral(n,.01);g.time+=1.86;g.aiNeutral(n,.01);assert.ok(n.returning);}assert.ok(!n.pattern,action);}
});
test('wave creation spawns one minion per lane immediately and the rest at .35 second intervals',()=>{
 const g=new Game();g.aiMinion=()=>{};g.aiChampion=()=>{};g.aiStructure=()=>{};g.aiNeutral=()=>{};
 assert.equal(g.units.filter(u=>u.kind==='minion').length,0);run(g,3);assert.equal(g.units.filter(u=>u.kind==='minion').length,4);run(g,.3);assert.equal(g.units.filter(u=>u.kind==='minion').length,4);run(g,.1);assert.equal(g.units.filter(u=>u.kind==='minion').length,8);run(g,.7);assert.equal(g.units.filter(u=>u.kind==='minion').length,16);
 const line=g.units.filter(u=>u.kind==='minion'&&u.team===0&&u.lane===0);assert.deepEqual(line.map(u=>u.formationIndex),[0,1,2,3]);assert.ok(line[3].ranged);line.forEach((m,i)=>close(m.spawnAt,3+i*.35));
 g.wave=2;g.spawnWave();run(g,1.5);const siege=g.units.filter(u=>u.kind==='minion'&&u.wave===3&&u.siege);assert.equal(siege.length,4);siege.forEach(m=>close(m.spawnAt,3+1.1+1.4));
});
test('uncontested minions march along one centerline in spawn order with visible spacing',()=>{
 const g=new Game();g.aiChampion=()=>{};g.aiStructure=()=>{};g.aiNeutral=()=>{};run(g,5);let ms=g.units.filter(m=>m.kind==='minion'&&m.team===0&&m.lane===0),path=lanePath(0,0);
 assert.equal(ms.length,4);for(const m of ms)assert.ok(segmentDistance(m,path[0],path[1])<.4);for(let i=1;i<4;i++)assert.ok(distance(ms[i-1],path[1])<distance(ms[i],path[1]));run(g,5);for(const m of ms){assert.ok(Math.min(...path.slice(1).map((p,i)=>segmentDistance(m,path[i],p)))<.4);assert.ok(!blocked(m.x,m.y,m.radius));}for(let i=1;i<4;i++)assert.ok(distance(ms[i-1],ms[i])>=ms[i-1].radius+ms[i].radius);
});
test('one destroyed tower opens the core with identical damage at either tower count',()=>{
 const g=new Game(),p=g.player,core=g.units.find(e=>e.kind==='core'&&e.team===1);p.x=core.x-2;p.y=core.y;assert.ok(g.locked(core));g.towers(1)[0].alive=false;assert.equal(g.locked(core),false);let hp=core.hp;g.deal(p,core,1000,{fixed:true});const half=hp-core.hp;g.towers(1)[0].alive=false;hp=core.hp;g.deal(p,core,1000,{fixed:true});close((hp-core.hp)/half,1);
});
test('20-minute verdict restores tower count, tower HP, core HP and exact ties in order',()=>{
 const g=new Game();g.towers(0)[0].hp=1;g.towers(1)[0].alive=false;assert.equal(g.timeDecision().team,0);
 g.towers(0)[0].alive=false;assert.equal(g.timeDecision().team,-1);g.towers(0)[0].hp-=1;assert.equal(g.timeDecision().team,1);
 for(const team of [0,1])g.towers(team).forEach(t=>t.alive=false);g.units.find(e=>e.kind==='core'&&e.team===0).hp-=100;assert.equal(g.timeDecision().team,1);
});
test('clock stops at exactly twenty minutes and freezes all simulation after the verdict',()=>{
 const {g}=quiet();g.time=1199.98;g.step(.5);close(g.time,1200);assert.equal(g.winner,-1);const time=g.time;g.step(1);close(g.time,time);assert.match(g.reason,/20분/);
});
test('coordinate creation and ground/target teleports confirm; directional, self and enemy-target shots quickcast',()=>{
 for(const [key,slot] of [['faust','r'],['yi','q'],['gahwan','q'],['gahwan','r'],['ahab','r'],['nelly','r'],['dongbaek','r'],['dongrang','q'],['dongrang','r'],['ryoshu','r'],['sinclair','r']]){const {g,p}=quiet(key);assert.ok(skillTargeting(g,p,slot).confirm,key+slot);}
 for(const [key,slot] of [['faust','q'],['meursault','r'],['rodya','q'],['ishmael','r'],['gubo','r'],['gubo','q'],['myo','q']]){const {g,p}=quiet(key);assert.equal(skillTargeting(g,p,slot).confirm,false,key+slot);}
});
test('Nelly has four 210-damage single-hit ammunition charges and restores the original power growth',()=>{
 const {g,p,t}=quiet('nelly');assert.equal(p.ammo,4);const hp=t.hp;g.attack(p,t);close(hp-t.hp,210*1.12*.9);assert.equal(p.ammo,3);assert.equal(g.events.length,0);g.award(p,250,0);close(g.powerScale(p),1.066);
});
test('Gubo allied threshold changes from 21 to 35 percent only while the four-second tactical buff is live',()=>{
 const {g,p}=quiet('gubo'),a=g.makeChampion('faust',0,5);a.x=41;a.y=7;a.maxHp=1000;a.hp=211;g.units=[p,a];assert.equal(g.cast(p,'r',a),false);assert.equal(p.rCd,0);a.hp=210;assert.ok(g.cast(p,'r',a));
 const b=quiet('gubo');close(b.g.allyExecuteThreshold(b.p),.21);b.g.cast(b.p,'q',b.p);close(b.g.allyExecuteThreshold(b.p),.35);b.g.time=4.01;close(b.g.allyExecuteThreshold(b.p),.21);
});
test('Gahwan ranges and close knockback follow the new percentages',()=>{
 const {g,p,t}=quiet('gahwan');close(g.attackRange(p),7.5);close(skillTargeting(g,p,'q').range,8.2);t.x=41;g.attack(p,t);close(t.motion.total,2.5);
});
test('Gahwan ultimate channels then hits the selected distant area three times instead of himself',()=>{
 const {g,p,t}=quiet('gahwan');t.x=48;const hp=t.hp;g.cast(p,'r',t);assert.equal(g.pending.length,2);assert.ok(g.pending.every(ev=>ev.x===48));assert.ok(t.hp<hp);const first=t.hp;run(g,.7);close(t.hp,first);run(g,.1);assert.ok(t.hp<first);run(g,.8);assert.equal(g.pending.length,0);close(p.x,40);
});
test('Ahab power drops twelve percent and his ultimate teleports before the original attack sequence',()=>{
 const {g,p,t}=quiet('ahab');close(g.powerScale(p),.88);g.cast(p,'r',t);close(p.x,42);assert.equal(p.motion,undefined);const hp=t.hp;run(g,.1);assert.ok(t.hp<hp);run(g,.5);assert.ok(t.hp<hp-500);
});
test('Myo basic dashes at 10.4, Q spends one ammo and frenzy blocks Q',()=>{
 const {g,p,t}=quiet('myo');assert.ok(g.attack(p,t));close(p.x,40);g.step(.1);assert.ok(p.x>40&&p.x<41.1);run(g,.3);assert.ok(t.hp<100000);p.ammo=4;assert.ok(g.cast(p,'q',t));assert.equal(p.ammo,3);run(g,.3);assert.ok(t.state.rabbitMark[p.id]>g.time);assert.ok(g.cast(p,'r',p));assert.ok(g.buff(p,'rabbitFrenzy'));assert.equal(g.cast(p,'q',t),false);close(g.attackRange(p),2.4);
});
test('Myo direct champion takedowns build only two four-second hunt stacks',()=>{
 const {g,p}=quiet('myo');for(let i=0;i<3;i++){const t=g.makeChampion('yi',1,5);g.kill(t,p);}assert.equal(p.state.rabbitStacks,2);close(p.buffs.rabbitHunt-g.time,4);assert.ok(g.speed(p)>RULES.speed[5]);
});
test('Dongbaek extra attacks spend skill readiness and recover independently from real ammo',()=>{
 const {g,p,t}=quiet('dongbaek');p.ammo=0;for(let i=0;i<3;i++){p.attackCd=0;assert.ok(g.attack(p,t));assert.equal(p.ammo,0);}close(p.qCd,7.5);close(p.rCd,7.5);p.attackCd=0;assert.equal(g.attack(p,t),false);p.ammo=1;run(g,2.9);p.attackCd=0;g.attack(p,t);assert.equal(p.state.petals,0);
});
test('Dongbaek Q readiness affects armor/reload and the instant flower ultimate hits at the selected point without fragrance stacks',()=>{
 const {g,p,t}=quiet('dongbaek');close(g.armor(p),20);const reload=g.reloadInterval(p);g.cast(p,'q',p);close(g.armor(p),0);assert.ok(g.reloadInterval(p)>reload);assert.ok(g.shield(p)>0);t.x=47;const hp=t.hp;g.cast(p,'r',t);assert.ok(t.hp<hp);assert.equal(p.state.fragranceStacks,undefined);assert.ok(g.buff(p,'flowerReload'));assert.equal(p.channelUntil,undefined);
});
test('Dongrang power affects health and armor rather than damage or incoming healing and counts only actual healing from his own effects',()=>{
 const {g,p,t}=quiet('dongrang');p.augments=['power15'];p.upgrades.power=5;const hp=t.hp;g.attack(p,t);close(hp-t.hp,260);p.hp=p.maxHp-10;const total=p.totalHealingReceived;g.heal(null,p,100,false);close(p.hp,p.maxHp);close(p.totalHealingReceived-total,0);p.hp-=10;g.heal(p,p,100,false);close(p.totalHealingReceived-total,10);assert.ok(g.maxHp(p)>p.maxHp);assert.ok(g.armor(p)>13);const stored=p.totalHealingReceived;run(g,.5);close(p.totalHealingReceived,stored);
});
test('Dongrang has one tree, fixed damage and healing, and his ultimate preserves it',()=>{
 const {g,p,t}=quiet('dongrang');p.hp-=100;g.cast(p,'q',t);assert.equal(p.state.treeCharges,undefined);assert.equal(g.cast(p,'q',t),false);const hp=t.hp;run(g,1.6);close(hp-t.hp,105);assert.ok(p.totalHealingReceived>0);p.totalHealingReceived=8000;const before=t.hp;g.cast(p,'r',p);assert.ok(before-t.hp>=430);assert.equal(g.zones.filter(z=>z.kind==='desireTree').length,1);
});
