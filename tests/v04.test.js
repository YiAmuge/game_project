import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { RULES, WALLS, FOUNTAINS, MINIONS, CAMP_RULES, RUNTIME_CHAMPIONS, worldPoint } from '../src/data.js';
import { blocked, clearLine, distance, findPath } from '../src/geometry.js';
import { heathCharge } from '../src/skills.js';
import { stackInfo } from '../src/overlays.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*30);i++)g.step(1/30);};
function quiet(key='faust'){
 const g=new Game(key);g.aiChampion=()=>{};g.aiMinion=()=>{};g.aiNeutral=()=>{};g.aiStructure=()=>{};
 const p=g.player,t=g.champions(1).find(c=>c.key==='faust');Object.assign(p,{x:40,y:7});Object.assign(t,{x:44,y:7});g.units=[p,t];return {g,p,t};
}
test('map expands 30 percent in each axis, old walls only 10 percent, entities keep their sizes',()=>{
 const g=new Game();close(RULES.width,64*1.3);close(RULES.height,36*1.3);close(WALLS[0].w,6*1.1);close(WALLS[0].h,1.6*1.1);
 assert.equal(WALLS.filter(w=>w.baseDivider).length,2);assert.ok(g.units.every(u=>!blocked(u.x,u.y,u.radius)));
 assert.equal(g.player.radius,.48);assert.equal(g.towers(0)[0].radius,.9);assert.equal(g.towers(0)[0].range,8.5);
 const side=g.units.find(e=>e.camp==='side');assert.equal(clearLine(FOUNTAINS[0],side),false);assert.ok(findPath(FOUNTAINS[0],side).length>0);
 const expanded=findPath({x:76,y:40},{x:81,y:43});assert.ok(expanded.length>0);assert.ok(expanded.every(p=>!blocked(p.x,p.y,.48)));
});
test('35 percent additional reload reduction applies to all runtime and future roster champions',()=>{
 close(RULES.reloadEfficiency,.8*.65);const roster=JSON.parse(readFileSync(new URL('../src/roster.json',import.meta.url)));assert.ok(roster.every(c=>c.reloadEfficiency===RULES.reloadEfficiency));
 for(const key of Object.keys(RUNTIME_CHAMPIONS)){const {g,p}=quiet(key);p.lastCombat=g.time;const grade=key==='ezra'?3:RUNTIME_CHAMPIONS[key].reload;close(g.reloadInterval(p),RULES.reload[grade]/.8/.65);}
});
test('growth reaches level ten, caps there, and updates health and score growth',()=>{
 const {g,p}=quiet('meursault');g.award(p,RULES.xp[9],0);assert.equal(p.level,10);close(p.maxHp,4600*1.675);assert.equal(g.bonusStats(p).health,68);g.award(p,1e6,0);assert.equal(p.level,10);assert.ok(Number.isFinite(g.bonusStats(p).power));
});
test('there is no time adjudication after ten minutes or several hours',()=>{
 const {g}=quiet();g.time=599.99;g.wave=23;g.step(.05);assert.equal(g.winner,null);assert.ok(g.time>600);g.time=14400;g.wave=576;g.step(.1);assert.equal(g.winner,null);assert.equal(g.time,14400.1);
});
test('waves are faster, base health is higher, and minion scaling stops at twelve minutes',()=>{
 const {g}=quiet();assert.equal(g.wave,1);run(g,24.9);assert.equal(g.wave,1);run(g,.1);assert.equal(g.wave,2);const first=g.units.find(u=>u.kind==='minion'&&!u.ranged&&!u.siege);assert.equal(first.maxHp,680);
 const spawn=time=>{g.units=g.units.filter(e=>e.kind!=='minion');g.time=time;g.spawnWave();return g.units.filter(u=>u.kind==='minion').map(u=>({hp:u.maxHp,damage:u.damage,siege:u.siege}));};
 const mid=spawn(120);assert.ok(mid[0].hp>680);const capped=spawn(720),late=spawn(36000);close(capped[0].hp,680*1.36);close(capped[0].damage,58*1.3);close(late[0].hp,capped[0].hp);close(late[0].damage,capped[0].damage);assert.equal(MINIONS.maxGrowth,6);
});
test('Don Quixote moves gradually and damages each target only when the path reaches it',()=>{
 const {g,p,t}=quiet('don');t.x=42.5;t.hp=t.maxHp=10000;const initial=t.hp;assert.ok(g.attack(p,t));close(p.x,40);close(t.hp,initial);g.step(.05);assert.ok(p.x>40&&p.x<41);close(t.hp,initial);run(g,.3);close(p.x,42);assert.ok(t.hp<initial);const hp=t.hp;run(g,.1);close(t.hp,hp);
});
test('dashes respect a visible speed cap even with movement input, and stun interrupts them',()=>{
 const {g,p,t}=quiet('don');t.x=50;g.input.x=1;g.attack(p,t);let x=p.x;
 for(let i=0;i<12;i++){g.step(1/30);assert.ok(p.x-x<=RULES.dashSpeed/30+1e-6);x=p.x;}
 g.input.x=0;p.attackCd=0;p.ammo=3;g.attack(p,t);g.step(1/30);const stop=p.x;g.status(p,'stun',1,1);run(g,.5);close(p.x,stop);assert.equal(p.motion,undefined);
});
test('explicit Ryoshu teleport remains instant, while Sinclair leap travels before landing damage',()=>{
 const a=quiet('ryoshu');a.t.x=46;assert.ok(a.g.cast(a.p,'r',a.t));close(a.p.x,46);
 const {g,p,t}=quiet('sinclair');t.x=45;t.hp=t.maxHp=10000;g.cast(p,'r',t);close(p.x,40);g.step(.1);assert.ok(p.x>40&&p.x<45);close(t.hp,10000);run(g,.3);close(t.hp,10000);run(g,.4);close(p.x,45);assert.ok(t.hp<10000);
});
test('Ryoshu dash invulnerability blocks forced movement and ends at wall collision',()=>{
 const {g,p}=quiet('ryoshu');Object.assign(p,{x:16.5,y:15});assert.ok(g.cast(p,'q',{x:22,y:15}));
 assert.equal(g.startMotion(p,{x:-1,y:0},1,{kind:'knock'}),false);run(g,.2);assert.equal(p.motion,undefined);assert.equal(p.invulnerableUntil,0);
 assert.ok(g.startMotion(p,{x:-1,y:0},1,{kind:'knock'}));
});
test('Ishmael pulls over time at the forced movement speed cap',()=>{
 const {g,p,t}=quiet('ishmael');g.cast(p,'r',t);close(t.x,44);run(g,.2);close(t.x,44);run(g,.1);assert.ok(t.x<44&&t.x>42.5);run(g,.3);close(t.x,42.5);
});
test('Gregor knockback triggers extra damage and stun at wall contact, not at cast time',()=>{
 const {g,p,t}=quiet('gregor');Object.assign(p,{x:13,y:15});Object.assign(t,{x:16.2,y:15,hp:10000,maxHp:10000});assert.ok(!blocked(t.x,t.y,t.radius));
 g.cast(p,'q',t);close(t.x,16.2);const hp=t.hp;assert.equal(g.stat(t,'stun'),0);run(g,.2);assert.ok(t.x>16.2&&t.x<17.1);assert.ok(t.hp<hp);assert.ok(g.stat(t,'stun')>0);assert.ok(!blocked(t.x,t.y,t.radius));
});
test('Heathcliff preview and actual landing share progressive charge range and wall constraints',()=>{
 const {g,p}=quiet('heathcliff'),aim={x:50,y:7};g.cast(p,'q',aim);g.time=1.2;close(heathCharge(g,p,aim).range,5);g.time=1.8;close(heathCharge(g,p,aim).range,6);g.time=2.4;const charged=heathCharge(g,p,aim);close(charged.range,7);g.cast(p,'q',aim);close(p.x,40);run(g,1);close(p.x,charged.landing.x);close(p.y,charged.landing.y);
});
test('all seventeen implemented champions can finish a three second recall to their fountain',()=>{
 for(const key of Object.keys(RUNTIME_CHAMPIONS)){const {g,p}=quiet(key);assert.ok(g.recall(p),key);run(g,2.9);close(p.x,40);run(g,.1);assert.equal(p.recall,undefined);close(distance(p,FOUNTAINS[0]),0);}
 const {g,t}=quiet();t.player=false;assert.ok(g.recall(t));run(g,3);close(distance(t,FOUNTAINS[1]),0);
});
test('enemy damage through a shield cancels recall, and Alisa self-burn does not',()=>{
 const {g,p,t}=quiet();g.addShield(p,500,'test');g.recall(p);const hp=p.hp;g.deal(t,p,100,{fixed:true});close(p.hp,hp);assert.equal(p.recall,undefined);
 const a=quiet('alisa');a.p.state.heat=5;a.p.lastAttackAt=0;assert.ok(a.g.recall(a.p));run(a.g,2);assert.ok(a.p.recall);run(a.g,1);assert.equal(a.p.recall,undefined);assert.ok(a.g.inSpawn(a.p));
});
test('recall can be canceled by movement, attacks, skills, B again, and crowd control',()=>{
 const {g,p,t}=quiet();g.recall(p);g.input.x=1;g.step(1/30);assert.equal(p.recall,undefined);g.input.x=0;
 g.recall(p);p.attackCd=0;g.attack(p,t);assert.equal(p.recall,undefined);
 g.recall(p);g.cast(p,'q',t);assert.equal(p.recall,undefined);
 g.recall(p);g.recall(p);assert.equal(p.recall,undefined);
 g.recall(p);g.status(p,'stun',1,1);g.step(1/30);assert.equal(p.recall,undefined);
});
test('creeps leash after distance and time, ignore attacks while returning, and reset at home',()=>{
 const {g,p}=quiet();Object.assign(p,{x:36.4,y:7});const n=g.makeNeutral(30,7,'side');n.x=35.6;n.aggro=p.id;n.hostile=true;n.hp=100;g.aiNeutral=Game.prototype.aiNeutral;
 run(g,1.8);assert.equal(n.returning,undefined);run(g,.2);assert.ok(n.returning);const hp=n.hp;assert.equal(g.deal(p,n,1000,{fixed:true}),0);close(n.hp,hp);run(g,1);assert.equal(n.returning,false);close(n.x,30);close(n.hp,n.maxHp);assert.equal(n.aggro,null);
});
test('distant hostile creeps also wait 1.85 seconds before a visible return',()=>{
 const {g}=quiet();const n=g.makeNeutral(30,7,'side');n.x=40;n.hostile=true;n.aggro=g.player.id;g.aiNeutral=Game.prototype.aiNeutral;g.step(1/30);assert.ok(!n.returning);g.time+=1.86;const before=n.x;g.step(1/30);assert.ok(n.returning);assert.ok(n.x<before&&n.x>before-1);assert.ok(CAMP_RULES.returnSpeed>2.7);
});
test('camp timers count down, disappear on respawn, and never revive removed central creeps',()=>{
 const {g,p}=quiet();const n=g.makeNeutral(30,7,'side');g.kill(n,p);assert.equal(g.campTimers()[0].seconds,90);g.time=30;assert.equal(g.campTimers()[0].seconds,60);g.time=89.99;g.wave=3;g.step(.02);assert.ok(n.alive);assert.equal(g.campTimers().length,0);
 const c=g.makeNeutral(40,23,'central');g.kill(c,p);g.spawnBoss();assert.ok(!g.campTimers().some(t=>t.id===c.id));g.time=500;g.step(.02);assert.equal(c.alive,false);
});
test('stack UI reflects actual Sinclair, Gregor and Alisa state',()=>{
 for(const [key,state,max] of [['sinclair',2,3],['gregor',11,12],['alisa',4,5]]){const {g,p}=quiet(key);if(key==='sinclair')p.marks=state;if(key==='gregor')p.state.mutations=state;if(key==='alisa')p.state.heat=state;assert.equal(stackInfo(p,g).value,state);assert.equal(stackInfo(p,g).max,max);}
});
test('Hong Lu shared effects carry water aura metadata and Rodion displays the actual coin outcomes',()=>{
 const {g,p}=quiet('honglu');const ally=g.makeChampion('yi',0,5,'support');Object.assign(ally,{x:41,y:7});g.addBuff(p,'blessing',25);assert.ok(g.buff(ally,'blessing'));assert.equal(ally.visuals.hongluShare.theme,'honglu');assert.ok(ally.visuals.hongluShare.until>g.time);
 const a=quiet('rodya');a.g.cast(a.p,'q',a.p);assert.equal(a.p.state.coinResults.length,3);assert.equal(a.p.state.coinResults.filter(Boolean).length,a.p.state.coinHeads);assert.equal(a.p.state.coinResults.filter(v=>!v).length,a.p.state.coinTails);
});
