import{FAN_ANGLE}from'../src/data.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,damageFormula } from '../src/game.js';
import { RULES,MINIONS } from '../src/data.js';
import * as Towers from '../src/tower-rules.js';
import { combatStyle } from '../src/combat-style.js';
import { airborneShadow,feetOffset } from '../src/projection-25d.js';
import { projectileHitWidth,FAUST_WAVE_HALF_WIDTH } from '../src/projectile-rules.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function arena(key='faust'){
 const g=new Game(key,'top',{mode:'training',seed:32}),p=g.player;
 Object.assign(g,{units:[p],effects:[],events:[],pending:[],zones:[],projectiles:[],time:10,winner:null});
 g.map={bounds:{x:0,y:0,w:80,h:60},walls:[]};g.bounds=g.map.bounds;g.practice.lineStopped=false;
 for(const f of ['aiChampion','aiMinion','aiNeutral'])g[f]=()=>{};
 Object.assign(p,{x:20,y:20,lastAttackAt:100,lastDamageAt:100});return {g,p};
}
function hero(g,x,y,team=1,key='faust'){const e=g.makeChampion(key,team,10+g.units.length);Object.assign(e,{armor:0,x,y,hp:100000,maxHp:100000,lastAttackAt:100,lastDamageAt:100});return e;}
function tower(g){return g.entity({kind:'tower',team:0,x:20,y:20,maxHp:5168,armor:120,range:8.5,damage:280,interval:1.05});}
function minion(g,x,y,flags={}){return g.entity({kind:'minion',team:1,x,y,maxHp:100000,radius:.3,...flags});}
function run(g,seconds){for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120);}
function power(g,p,base){return damageFormula(base,4,1)*g.powerScale(p);}
test('tower acquisition obeys class priority and nearest distance, then retains its valid target',()=>{
 const {g}=arena(),t=tower(g),champ=hero(g,20.5,20),ranged=minion(g,21,20,{ranged:true}),melee=minion(g,22,20),farSiege=minion(g,27,20,{siege:true}),nearSiege=minion(g,24,20,{siege:true});
 assert.equal(Towers.acquire(g,t),nearSiege);nearSiege.x=27.5;assert.equal(Towers.acquire(g,t),nearSiege);
 nearSiege.alive=false;assert.equal(Towers.acquire(g,t),farSiege);farSiege.alive=false;assert.equal(Towers.acquire(g,t),melee);melee.alive=false;assert.equal(Towers.acquire(g,t),ranged);ranged.alive=false;assert.equal(Towers.acquire(g,t),champ);
});
for(const options of [{damageKind:'basic'},{damageKind:'skill'},{fixed:true,proc:false},{fixed:true,proc:false,transferred:true}])test(`actual ${JSON.stringify(options)} damage immediately steals tower focus during cooldown`,()=>{
 const {g,p}=arena(),t=tower(g),m=minion(g,21,20),enemy=hero(g,26,20);g.aiStructure(t);assert.equal(t.targetId,m.id);assert.equal(g.projectiles.length,1);
 g.deal(enemy,p,10,options);assert.equal(t.targetId,enemy.id);g.aiStructure(t);assert.equal(g.projectiles.length,1);assert.equal(Towers.acquire(g,t),enemy);
});
test('tower dive uses attacker range and victim 1.75 range with inclusive edges',()=>{
 const {g,p}=arena(),t=tower(g),a=hero(g,28.5,20);p.x=34.875;g.deal(a,p,1,{fixed:true,proc:false});assert.equal(t.aggro,a.id);
 delete t.aggro;delete t.targetId;p.x+=.001;g.deal(a,p,1,{fixed:true,proc:false});assert.equal(t.aggro,undefined);
 p.x=34.875;a.x+=.001;g.deal(a,p,1,{fixed:true,proc:false});assert.equal(t.aggro,undefined);
});
test('CC, zero damage, invulnerability and friendly damage do not steal tower focus; shields do',()=>{
 const {g,p}=arena(),t=tower(g),a=hero(g,26,20);g.status(p,'slow',.5,1,a);g.deal(a,p,0,{fixed:true,proc:false});assert.equal(t.aggro,undefined);
 p.invulnerableUntil=11;g.deal(a,p,10,{fixed:true});assert.equal(t.aggro,undefined);p.invulnerableUntil=0;
 g.addShield(p,100,'test',3);const hp=p.hp;g.deal(a,p,10,{fixed:true,proc:false});close(p.hp,hp);assert.equal(t.aggro,a.id);
});
test('summon damage blames its champion owner, never the summoned body or a cyclic owner',()=>{
 const {g,p}=arena(),t=tower(g),owner=hero(g,26,20,1,'yan'),summon=g.entity({kind:'summon',team:1,owner:owner.id,x:21,y:20,maxHp:1});
 g.deal(summon,p,10,{fixed:true,proc:false});assert.equal(t.aggro,owner.id);assert.equal(t.targetId,owner.id);summon.owner=summon;assert.equal(Towers.damageOwner(g,summon),null);
});
test('fixed champion focus survives new minions and releases on range exit or death',()=>{
 const {g,p}=arena(),t=tower(g),a=hero(g,26,20);g.deal(a,p,1,{fixed:true});const m=minion(g,21,20,{siege:true});assert.equal(Towers.acquire(g,t),a);g.time+=8;assert.equal(Towers.acquire(g,t),a);
 a.x=29;assert.equal(Towers.acquire(g,t),m);assert.equal(t.aggro,undefined);a.x=25;t.aggro=a.id;a.alive=false;assert.equal(Towers.acquire(g,t),m);
});
test('tower heat snapshots each missile, caps at six stacks and transfers between champions',()=>{
 const {g}=arena(),t=tower(g),a=hero(g,23,20),b=hero(g,24,20);const damage=[];
 for(let i=0;i<9;i++){g.simpleAttack(t,i%2?a:b);damage.push(g.projectiles.at(-1).damage);g.time+=1;}
 damage.forEach((d,i)=>close(d,280*(1+Math.min(6,i)*.2)));close(g.projectiles[0].damage,280);assert.equal(t.heat,6);
});
test('tower heat resets on any non-champion shot and exactly three idle seconds, never on target change alone',()=>{
 const {g}=arena(),t=tower(g),a=hero(g,23,20),m=minion(g,24,20);g.simpleAttack(t,a);g.time+=1;g.simpleAttack(t,a);close(g.projectiles.at(-1).damage,336);
 g.time+=1;g.simpleAttack(t,m);assert.equal(t.heat,0);g.simpleAttack(t,a);close(g.projectiles.at(-1).damage,280);
 g.time+=2.999;g.simpleAttack(t,a);close(g.projectiles.at(-1).damage,336);g.time+=3;g.simpleAttack(t,a);close(g.projectiles.at(-1).damage,280);
});
test('Faust only releases a widened sword wave and max level pierces at the same range',()=>{
 for(const level of [1,10]){const {g,p}=arena();p.level=level;const near=hero(g,21,20),far=hero(g,24,20);g.attack(p,far);close(near.hp,100000);assert.equal(g.projectiles.length,1);close(g.attackRange(p),7.5);close(g.ammoCap(p),level===10?4:3);close(projectileHitWidth(g.projectiles[0])*2,projectileHitWidth({width:.18})*2+1.8);run(g,.25);assert.ok(near.hp<100000);assert.equal(far.hp<100000,level===10);}
 close(projectileHitWidth({width:FAUST_WAVE_HALF_WIDTH})*2,2.196);
});
test('maximum-level Faust freely moves and attacks while the original point detonates after 1.25 seconds',()=>{
 const {g,p}=arena();p.level=10;const t=hero(g,24,20);g.cast(p,'r',t);close(p.channelUntil,g.time);assert.equal(g.pending[0].autonomous,true);assert.equal(g.pending[0].windup,1.25);
 Object.assign(p,{x:17,y:20});assert.ok(g.attack(p,{x:17,y:10}));run(g,1.24);close(t.hp,100000);run(g,.02);assert.ok(t.hp<100000);assert.equal(g.buff(p,'faustUlt'),true);close(p.ultStacks,1);
});
for(const interrupted of ['stunned','dead'])test(`maximum-level Faust delayed field still explodes with its caster ${interrupted}`,()=>{
 const {g,p}=arena();p.level=10;const t=hero(g,24,20);g.cast(p,'r',t);if(interrupted==='dead')g.kill(p,t);else g.status(p,'stun',1,3,t);run(g,1.24);close(t.hp,100000);run(g,.02);assert.ok(t.hp<100000);
});
test('Dongbaek pulses four times at a locked point while visual burst is emitted once',()=>{
 const {g,p}=arena('dongbaek'),t=hero(g,24,20),hits=[],deal=g.deal.bind(g);g.deal=(source,target,base,opts)=>{if(source===p&&target===t)hits.push({at:g.time,base});return deal(source,target,base,opts);};
 g.cast(p,'r',t);p.x=16;run(g,.76);assert.equal(hits.length,4);hits.forEach((h,i)=>{close(h.base,105);close(h.at,10+i*.25);});assert.equal(g.events.length,0);assert.equal(g.buff(p,'flowerReload'),true);
});
test('Outis close attack passive applies at impact through 2.5 but does not reload on normal kills',()=>{
 for(const x of [22.5,22.501]){const {g,p}=arena('outis'),t=hero(g,x,20),before=g.ammoCap(p);g.deal(p,t,100,{proc:false});close(100000-t.hp,power(g,p,100)*(x<=22.5?1.25:1));p.ammo=0;t.hp=1;g.deal(p,t,100);close(p.ammo,0);assert.equal(g.buff(p,'outisReload'),false);assert.ok(before>0);}
});
for(const contact of [true,false])test(`Outis R earns a nonstacking three-second reload buff on ${contact?'contact':'shotgun'} kill`,()=>{
 const {g,p}=arena('outis'),t=hero(g,contact?22:28,20),base=g.reloadInterval(p);t.hp=1;g.cast(p,'r',{x:30,y:20});run(g,.6);assert.equal(t.alive,false);assert.equal(g.buff(p,'outisReload'),true);close(g.reloadInterval(p),base/1.3);run(g,3.1);close(g.reloadInterval(p),base);
});
test('Gahwan line hits near its rectangle corner and excludes targets outside width',()=>{
 const {g,p}=arena('gahwan'),edge=hero(g,26,21.22),outside=hero(g,26,21.24);g.attack(p,{x:30,y:20});run(g,.13);assert.ok(edge.hp<100000);close(outside.hp,100000);const rect=g.effects.filter(f=>f.type==='strikeRect');assert.ok(rect.length>=2);assert.ok(rect.every(f=>f.shape.width===1.5));
});
test('distorted Yan displays full warning before an 80 percent slow and central stun',()=>{
 const {g,p}=arena('yan');p.state.ominous=6;g.cast(p,'r',p);g.units=g.units.filter(e=>e.key!=='yanHand');const t=hero(g,27,20);g.cast(p,'q',t);const f=g.effects.find(f=>f.type==='yanSwordWarning');close(f.life,1.75);close(f.r,7.5);run(g,1.74);close(t.hp,100000);run(g,.02);assert.ok(t.hp<100000);close(g.stat(t,'slow'),.8);close(g.stat(t,'stun'),1);
});
test('Don attacks stay yellow and use red throughout the seven-second lifesteal buff',()=>{
 const {g,p}=arena('don'),normal=combatStyle('don',g,p,{slot:'r'});assert.equal(normal.color,'#e5bd38');g.addBuff(p,'donLifesteal',7);for(const slot of [undefined,'q','r'])assert.equal(combatStyle('don',g,p,{slot}).color,'#a7323f');g.time+=7;assert.equal(combatStyle('don',g,p).color,normal.color);
});
test('Starbuck shadow returns only when leap motion finishes',()=>{const e={key:'starbuck'};assert.ok(airborneShadow(e));e.motion={kind:'leap',elapsed:0};assert.equal(airborneShadow(e),false);e.motion.elapsed=.699;assert.equal(airborneShadow(e),false);delete e.motion;assert.ok(airborneShadow(e));});
test('cores and minion body/collider/feet share their current sizes',()=>{
 const g=new Game();assert.ok(g.units.filter(e=>e.kind==='core').every(e=>e.hp===6000&&e.maxHp===6000));g.spawnWave();const m=g.units.find(e=>e.kind==='minion');close(m.radius,.28*1.15*1.2);close(MINIONS.size,1.38);close(feetOffset(m),0);
});

test('Dongbaek released flower pulses finish through caster crowd control',()=>{
 const {g,p}=arena('dongbaek'),t=hero(g,24,20),hp=t.hp;g.cast(p,'r',t);g.status(p,'stun',1,2,t);run(g,.76);close(hp-t.hp,damageFormula(420,3,1)*g.powerScale(p));
});
test('Gubo ally executions reserve one dedicated 14.7 cone footprint for basic and ultimate fire',()=>{
 for(const slot of ['basic','r']){
  const {g,p}=arena('gubo'),a=hero(g,24,20,0,'rodya'),enemy=hero(g,28,20);a.hp=1;
  if(slot==='basic'){g.attack(p,a);run(g,.25);}else{g.cast(p,'r',a);run(g,1.26);}
  assert.equal(a.alive,false);const f=g.effects.find(f=>f.type==='guboBlast');assert.equal(f.source,p.id);close(f.r,14.7);close(f.angle,0);close(f.spread,FAN_ANGLE);assert.ok(enemy.hp<100000);
 }
});
