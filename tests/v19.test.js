import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,damageFormula } from '../src/game.js';
import { WORLD } from '../src/data.js';
import { distance } from '../src/geometry.js';
import { guardAlly } from '../src/new-champions.js';
import { skillTargeting } from '../src/targeting.js';
import { stackInfo } from '../src/overlays.js';
import * as Yan from '../src/yan.js';

const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function quiet(key){
 const g=new Game(key,'top',{seed:191});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 const p=g.player;Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};return {g,p};
}
function target(g,x=44,y=7,team=1,key='faust'){
 const t=g.makeChampion(key,team,9);Object.assign(t,{x,y,maxHp:10000,hp:10000,lastAttackAt:100,lastDamageAt:100});return t;
}
test('six consumed directives cap ominous power and switch R even while normal R is cooling down',()=>{
 const {g,p}=quiet('yan');for(let i=0;i<7;i++){const t=target(g);Yan.mark(g,p,t);p.rCd=9;g.deal(p,t,1,{fixed:true});close(p.state.ominous,Math.min(i+1,6));assert.equal(Yan.ready(g,p),i>=5);}
 close(stackInfo(p,g).max,6);close(p.rCd,0);assert.ok(g.cast(p,'r',p));assert.ok(Yan.distorted(g,p));
});
test('normal barrage grants exactly thirty percent defense and rejects all CC and forced motion only while active',()=>{
 const {g,p}=quiet('yan'),t=target(g);const base=g.deal(t,p,100);g.cast(p,'q',t);close(g.deal(t,p,100),base*.7);
 for(const key of ['stun','root','slow','silence','taunt','disarm','captured','netCapture']){g.status(p,key,1,3,t);close(g.stat(p,key),0);}
 assert.equal(g.startMotion(p,{x:1,y:0},2,{kind:'knock',source:t}),false);
 const hp=p.hp;g.deal(t,p,100,{fixed:true});close(hp-p.hp,100);g.status(p,'weak',.1,3,t);close(g.stat(p,'weak'),.1);
 run(g,1.81);g.status(p,'stun',1,1,t);assert.ok(g.stat(p,'stun'));t.status={};close(g.deal(t,p,100),base);
});
test('transforming out of barrage removes its temporary defense and immunity immediately',()=>{
 const {g,p}=quiet('yan'),t=target(g);g.cast(p,'q',t);p.state.ominous=6;g.cast(p,'r',p);assert.equal(Yan.barraging(g,p),false);g.status(p,'root',1,2,t);assert.ok(g.stat(p,'root'));
});
for(const key of ['slow','stun','weak','armorDown','reloadWeak'])test(`role metadata grants no disruption bonus on ${key}`,()=>{
 const {g,p}=quiet('gahwan'),t=target(g);p.qCd=8;p.rCd=40;const reload=g.reloadInterval(p),haste=g.haste(p),hp=t.hp;
 g.status(t,key,key==='armorDown'?10:.2,2,p);close(t.hp,hp);close(p.qCd,8);close(p.rCd,40);close(g.reloadInterval(p),reload);close(g.haste(p),haste);
 g.time=1;g.status(t,'weak',.25,2,p);close(p.qCd,8);close(p.rCd,40);assert.equal(p.buffs.disrupt,undefined);
 g.time=1.51;close(g.reloadInterval(p),reload);g.time=9.99;g.status(t,key,.3,2,p);close(p.qCd,8);
 g.time=10;g.status(t,key,.4,2,p);close(p.qCd,8);close(p.rCd,40);
});
test('immune, allied and non-champion targets cannot consume the disruption cooldown',()=>{
 const {g,p}=quiet('gahwan'),t=target(g),ally=target(g,42,9,0),creep=g.makeNeutral(42,10,'side');p.qCd=8;p.rCd=40;
 t.ccImmuneUntil=2;g.status(t,'slow',.2,1,p);g.status(ally,'slow',.2,1,p);g.status(creep,'slow',.2,1,p);assert.equal(g.buff(p,'disrupt'),false);close(p.qCd,8);
 t.ccImmuneUntil=0;g.status(t,'slow',.2,1,p);close(p.qCd,8);
});
test('Gahwan knockback and Ishmael power loss have no role bonus',()=>{
 for(const key of ['gahwan','ishmael']){const {g,p}=quiet(key),t=target(g,42);p.rCd=40;g.attack(p,t);run(g,.15);assert.equal(g.buff(p,'disrupt'),false,key);assert.equal(p.state.disruptReady,undefined);assert.ok(p.rCd>39);}
});
test('Gregor piercing rectangle has six range, 1.2 half width and pulls every intersected enemy without teleporting',()=>{
 const {g,p}=quiet('gregor'),a=target(g,42),b=target(g,45,8.65),miss=target(g,45,8.7),far=target(g,46.5);
 const spec=skillTargeting(g,p,'q');close(spec.range,6);close(spec.radius,1.2);g.cast(p,'q',{x:48,y:7});close(a.x,42);close(b.x,45);assert.ok(a.motion?.forced&&b.motion?.forced);close(miss.hp,10000);close(far.hp,10000);
 run(g,1);assert.ok(distance(a,p)<1.12);assert.ok(b.x<45);assert.ok(!g.blocked(a.x,a.y,a.radius));
});
test('Gregor pull follows the caster and cannot pull through intervening terrain or move a tower',()=>{
 const {g,p}=quiet('gregor'),t=target(g,45);g.cast(p,'q',t);p.y+=.5;run(g,1);close(distance(p,t),1.11,.02);
 const {g:g2,p:p2}=quiet('gregor'),hidden=target(g2,45);g2.map.walls=[{x:43,y:5,w:.4,h:4}];g2.cast(p2,'q',hidden);close(hidden.hp,10000);assert.equal(hidden.motion,undefined);
 const tower=g2.entity({kind:'tower',team:1,x:41.5,y:8.5,maxHp:6000,radius:.9,range:8});p2.qCd=0;g2.cast(p2,'q',tower);assert.equal(tower.motion,undefined);close(tower.x,41.5);
});
test('Gregor ultimate moves targets six units total across both swings',()=>{
 const {g,p}=quiet('gregor'),t=target(g,43);g.cast(p,'r',{x:49,y:7});run(g,1.1);close(t.x,49);close(g.stat(t,'stun'),0);
});
for(const kind of ['terrain','structure'])test(`Gregor ultimate gives one 120-damage collision and 1.5-second stun on ${kind}`,()=>{
 const {g,p}=quiet('gregor'),t=target(g,43),hits=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)hits.push(n);return deal(a,b,n,o);};
 if(kind==='terrain')g.map.walls=[{x:46,y:5,w:.5,h:4}];else g.entity({kind:'tower',team:1,x:46,y:7,radius:.9,maxHp:6000,range:8});
 g.cast(p,'r',{x:50,y:7});run(g,.8);assert.equal(hits.filter(n=>n===120).length,1);assert.ok(g.stat(t,'stun'));assert.ok(t.status.stun.until>1.7&&t.status.stun.until<2);assert.ok(!g.blocked(t.x,t.y,t.radius));
});
test('collisions with a minion or a confinement boundary do not receive the wall bonus',()=>{
 for(const kind of ['unit','confinement']){
  const {g,p}=quiet('gregor'),t=target(g,43),hits=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)hits.push(n);return deal(a,b,n,o);};
  if(kind==='unit')g.entity({kind:'minion',team:0,x:45,y:7,radius:.4,maxHp:5000});else{t.state.netTrap={x:43,y:7,r:1,until:10};g.status(t,'netCapture',1,10);}
  g.cast(p,'r',{x:50,y:7});run(g,1.1);assert.ok(!hits.includes(120));close(g.stat(t,'stun'),0);
 }
});
test('Ahab third-hit damage counts direct impact and explosion once per attack and keeps target counters separate',()=>{
 const {g,p}=quiet('ahab'),a=target(g,43),other=target(g,50);const losses=[];
 for(let i=0;i<4;i++){p.attackCd=0;p.ammo=3;const hp=a.hp;g.attack(p,a);run(g,.25);losses.push(hp-a.hp);}
 close(losses[0],damageFormula(182+84,4,1)*.88);close(losses[2],losses[1]*1.3);close(losses[3],losses[1]);assert.equal(p.basicHits[a.id],4);assert.equal(p.basicHits[other.id],undefined);
});
test('Ahab cover buffs real projectiles, linked proc-free damage and periodic ally damage without stacking within 1.6 seconds',()=>{
 const {g,p}=quiet('ahab'),t=target(g,43),ally=target(g,41,9,0);g.attack(p,t);run(g,.25);assert.ok(t.state.harpoon);
 const hp=t.hp;g.deal(ally,t,100,{fixed:true,proc:false});close(hp-t.hp,130);close(p.state.coverStacks,1);const interval=g.reloadInterval(p);
 g.deal(ally,t,100,{fixed:true});close(p.state.coverStacks,1);g.time=1.86;g.deal(ally,t,100,{fixed:true,proc:false});close(p.state.coverStacks,2);assert.ok(g.reloadInterval(p)<interval);
 p.qCd=0;g.cast(p,'q',p);const h=t.hp;g.deal(ally,t,100,{fixed:true,proc:false});close(h-t.hp,100);
});
test('one captains mark does not overwrite another captains cover eligibility',()=>{
 const {g,p}=quiet('ahab'),t=target(g,43),captain=target(g,40,9,0,'ahab'),ally=target(g,41,10,0);g.attack(p,t);run(g,.25);g.attack(captain,t);run(g,.3);g.kill(captain,t);const hp=t.hp;g.deal(ally,t,100,{fixed:true,proc:false});close(hp-t.hp,130);assert.ok(g.buff(p,'ahabCover'));
});
test('guard excludes invulnerable allies, redirects thirty percent and never lowers an ally below twenty percent',()=>{
 const {g,p}=quiet('ahab'),t=target(g),invalid=target(g,41,8,0),ally=target(g,42,9,0);invalid.hp=9000;invalid.invulnerableUntil=10;ally.hp=4000;g.cast(p,'q',p);assert.equal(guardAlly(g,p),ally);
 const hp=p.hp;g.deal(t,p,100,{fixed:true});close(hp-p.hp,70);close(ally.hp,3970);close(invalid.hp,9000);
 g.deal(t,p,100000,{fixed:true});close(ally.hp,ally.maxHp*.2);assert.ok(ally.alive);
});
