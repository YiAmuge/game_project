import { releaseHeath } from '../src/skills.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { CHAMPIONS, RUNTIME_CHAMPIONS, POSITIONS, RULES } from '../src/data.js';
import { dragChoice, ammoCap } from '../src/skills.js';

const run=(g,s)=>{for(let i=0;i<Math.round(s*30)&&g.winner===null;i++)g.step(1/30);};
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function quiet(key='faust'){
 const g=new Game(key);g.aiChampion=()=>{};g.aiMinion=()=>{};g.aiNeutral=()=>{};g.aiStructure=()=>{};
 g.player.x=30;g.player.y=5.5;const t=g.champions(1).find(c=>c.key==='faust')||g.makeChampion('faust',1,8);t.x=31;t.y=5.5;g.units=[g.player,t];return {g,p:g.player,t};
}

test('twenty ordinary champions retain four named abilities, and every team has four positions',()=>{
 assert.equal(Object.keys(CHAMPIONS).length,29);
 for(const key of Object.keys(CHAMPIONS))for(const position of Object.keys(POSITIONS)){
  const g=new Game(key,position);assert.equal(g.champions().length,8);assert.equal(g.player.position,position);
  for(const team of [0,1])assert.deepEqual(g.champions(team).map(c=>c.position).sort(),['bottom','jungle','support','top']);
 }
});
test('all 32 catalog champions and all runtime champions share the cumulative reload nerf',()=>{
 const roster=JSON.parse(readFileSync(new URL('../src/roster.json',import.meta.url)));assert.ok(roster.every(c=>c.reloadEfficiency===RULES.reloadEfficiency));
 for(const key of Object.keys(RUNTIME_CHAMPIONS)){
  const {g,p}=quiet(key);p.lastCombat=g.time;
  if(key==='dongbaek')p.qCd=1;const grade=key==='ezra'?3:RUNTIME_CHAMPIONS[key].reload;
  close(g.reloadInterval(p),RULES.reload[grade]/RULES.reloadEfficiency/(key==='ahab'?1.15:1));
 }
});
test('natural healing waits three seconds after attacks including missed attacks',()=>{
 const {g,p}=quiet();p.hp=1000;p.lastAttackAt=0;p.lastDamageAt=0;
 run(g,2.9);close(p.hp,1000);g.attack(p,{x:20,y:5.5});run(g,2.9);close(p.hp,1000);
 g.time=10;p.lastAttackAt=6;p.lastDamageAt=6;const hp=p.hp;run(g,1);close(p.hp-hp,p.maxHp*.13);
});
test('external damage including shield damage resets natural healing delay',()=>{
 const {g,p,t}=quiet();g.time=5;p.hp=1000;p.lastAttackAt=0;p.lastDamageAt=0;g.addShield(p,500,'test');g.deal(t,p,100,{fixed:true});
 close(p.hp,1000);assert.equal(p.lastDamageAt,5);run(g,2.9);close(p.hp,1000);
});
test('Alisa heat self-damage is nonlethal and excluded from healing; idle healing removes all heat',()=>{
 const {g,p}=quiet('alisa');p.hp=1;p.state.heat=5;p.lastAttackAt=0;p.lastDamageAt=-99;
 run(g,2.9);assert.ok(p.alive);close(p.hp,1);assert.equal(p.lastDamageAt,-99);assert.equal(p.state.heat,5);
 run(g,.2);assert.equal(p.state.heat,0);assert.ok(p.hp>1);assert.ok(p.alive);
});
test('Gubo manually aimed normal bullets permit allied health at 21 percent but not above',()=>{
 const {g,p}=quiet('gubo');const ally=g.makeChampion('faust',0,5,'support');Object.assign(ally,{x:31,y:5.5,maxHp:1000,hp:211,lastDamageAt:0});
 g.units=[p,ally];assert.ok(g.attack(p,ally));run(g,.1);assert.equal(ally.hp,211);
 p.attackCd=0;p.ammo=3;ally.hp=210;g.attack(p,ally);assert.equal(ally.alive,true);run(g,1/30);assert.equal(ally.alive,false);close(ally.respawnAt-g.time,3.5);assert.equal(g.kills[0],0);
});
test('dragging needs distance; Moses supports four directions and Ezra only left/right',()=>{
 assert.equal(dragChoice('moses',0,0),null);assert.equal(dragChoice('moses',4,3),null);
 assert.equal(dragChoice('moses',0,-40),'up');assert.equal(dragChoice('moses',0,40),'down');assert.equal(dragChoice('moses',-40,0),'left');assert.equal(dragChoice('moses',40,0),'right');
 assert.equal(dragChoice('ezra',0,-40),null);assert.equal(dragChoice('ezra',-40,2),'left');
 for(const key of ['moses','ezra']){const {g,p}=quiet(key);const ammo=p.ammo;assert.equal(g.cast(p,'q',{x:34,y:5.5}),false);assert.equal(p.qCd,0);assert.equal(p.ammo,ammo);}
});
test('Moses choice is committed only with a direction and consumed by next attack',()=>{
 const {g,p}=quiet('moses');assert.ok(g.cast(p,'q',{x:34,y:5.5},{direction:'left'}));assert.equal(p.state.smoke,'left');assert.ok(p.qCd>0);g.attack(p,{x:34,y:5.5});assert.equal(p.state.smoke,null);
});
test('Ezra changes and reloads weapons on left/right drag and restores from ultimate',()=>{
 const {g,p}=quiet('ezra');assert.equal(ammoCap(g,p),1);assert.ok(g.cast(p,'q',p,{direction:'right'}));assert.equal(p.state.weapon,1);assert.equal(p.ammo,3);
 assert.ok(g.cast(p,'r',p));assert.equal(p.ammo,4);assert.equal(g.cast(p,'q',p,{direction:'right'}),false);assert.ok(g.cast(p,'r',p));assert.equal(p.ammo,3);assert.equal(g.buff(p,'ezraUlt'),false);
});
test('Rudolph ultimate is ranged, delayed, spends SP at commitment and recharges',()=>{
 const {g,p,t}=quiet('rudolph');t.x=p.x+8;t.y=p.y;t.hp=t.maxHp=5000;
 assert.equal(p.ammo,100);assert.ok(g.cast(p,'r',t));assert.equal(p.ammo,0);const hp=t.hp;run(g,1);assert.equal(t.hp,hp);run(g,.4);assert.ok(t.hp<hp);assert.ok(g.stat(t,'slow')>0);run(g,1.5);assert.equal(p.ammo,100);
});
test('new eight basic attacks and abilities execute without NaN state',()=>{
 for(const key of ['don','ryoshu','honglu','heathcliff','ishmael','rodya','outis','gregor']){
  const {g,p,t}=quiet(key);t.hp=t.maxHp=100000;
  assert.ok(g.attack(p,t),key+' basic');run(g,.6);p.attackCd=0;
  assert.ok(g.cast(p,'q',t),key+' Q');
  if(key==='heathcliff'){run(g,1.3);assert.ok(releaseHeath(g,p,t));}
  if(key==='ishmael')assert.ok(g.cast(p,'q',t));
  run(g,.7);if(key==='don'){t.x=p.x+1;t.y=p.y;}
  assert.ok(g.cast(p,'r',t),key+' R');run(g,5.2);
  assert.ok(Number.isFinite(p.hp)&&Number.isFinite(t.hp));assert.ok(p.totalDamage>0,key+' should damage a target');
 }
});
test('Heathcliff held charge releases at full strength after 1.5 seconds',()=>{
 const {g,p,t}=quiet('heathcliff');t.x=35;g.cast(p,'q',t);run(g,1.5);assert.ok(releaseHeath(g,p,t));assert.equal(p.state.chargeAt,undefined);run(g,1);assert.ok(p.x>33);assert.ok(t.hp<t.maxHp);
});
test('Ishmael shield detonates on recast and on expiry, and low-health passive has cooldown',()=>{
 const {g,p,t}=quiet('ishmael');g.cast(p,'q',t);assert.ok(g.shield(p)>0);assert.ok(g.cast(p,'q',t));assert.ok(t.hp<t.maxHp);assert.ok(g.stat(t,'stun')>0);
 p.qCd=0;p.hp=p.maxHp*.2;g.deal(t,p,1,{fixed:true});assert.ok(g.buff(p,'ishmaelSurvive'));const ready=p.passiveReady;g.deal(t,p,1,{fixed:true});assert.equal(p.passiveReady,ready);
});
test('Hong Lu buff copying has a six-second gate and does not recursively copy',()=>{
 const {g,p}=quiet('honglu');const ally=g.makeChampion('yi',0,4,'support');ally.x=p.x+1;ally.y=p.y;
 g.addBuff(p,'blessing',25);assert.ok(g.buff(ally,'blessing'));g.addBuff(p,'amplify',45);assert.equal(g.buff(ally,'amplify'),false);
 g.time+=6.1;g.addBuff(p,'amplify',45);assert.ok(g.buff(ally,'amplify'));
});
test('Hong Lu receives and copies Yi Sang ultimate before the following shield uses the gate',()=>{
 const {g,p}=quiet('honglu');const yi=g.makeChampion('yi',0,4,'support'),ally=g.makeChampion('faust',0,5,'bottom');yi.x=p.x-5;yi.y=p.y;ally.x=p.x+3;ally.y=p.y;
 assert.ok(g.cast(yi,'r',p));assert.ok(g.buff(p,'ogamdo'));assert.ok(g.buff(ally,'ogamdo'));assert.ok(g.shield(ally)>0);
});
test('Don Quixote lethal marked hit records positive actual damage and only one takedown',()=>{
 const {g,p,t}=quiet('don');t.hp=100;p.state.villain=t.id;g.attack(p,t);run(g,.4);
 assert.equal(t.alive,false);assert.equal(p.kills,1);assert.equal(p.totalDamage,100);assert.equal(g.damageDone,100);
});
test('Gregor transforms at 12 hits and restores max health after five seconds',()=>{
 const {g,p,t}=quiet('gregor');t.hp=t.maxHp=100000;const base=p.maxHp;
 for(let i=0;i<12;i++)g.deal(p,t,1);assert.ok(g.buff(p,'mutant'));close(p.maxHp,base*1.15);t.x+=30;run(g,5.2);close(p.maxHp,base);assert.ok(p.hp<=p.maxHp);
});
test('structures cannot be displaced by Gregor or Ezra area attacks',()=>{
 for(const key of ['gregor','ezra']){const {g,p}=quiet(key);const tower=g.entity({kind:'tower',team:1,x:31,y:5.5,maxHp:7600,range:8.5});const x=tower.x,y=tower.y;g.cast(p,'q',tower,key==='ezra'?{direction:'left'}:{});if(key==='ezra'){p.attackCd=0;g.attack(p,tower);}run(g,.5);close(tower.x,x);close(tower.y,y);}
});
test('direct and assist KDA and Rodion reset trigger once per champion takedown',()=>{
 const {g,p,t}=quiet('rodya');const ally=g.makeChampion('faust',0,4,'bottom');ally.x=30;ally.y=5.5;g.deal(ally,t,1,{fixed:true});p.qCd=10;p.rCd=20;g.deal(p,t,100000,{fixed:true});assert.equal(p.kills,1);assert.equal(ally.assists,1);assert.equal(p.qCd,6);assert.equal(p.rCd,16);g.deal(p,t,100000,{fixed:true});assert.equal(ally.assists,1);
});
test('buff display order tracks last acquired and refreshed buffs',()=>{
 const {g,p}=quiet();g.addBuff(p,'blessing',25);g.addBuff(p,'amplify',45);g.addBuff(p,'explore',4);g.addBuff(p,'blessing',25);assert.deepEqual(g.activeBuffs(p).slice(0,3).map(b=>b.key),['blessing','explore','amplify']);
});
test('score growth includes level, upgrades, and current effects without conditional target damage',()=>{
 const {g,p}=quiet('heathcliff');p.hp=p.maxHp*.5;
 assert.equal(g.bonusStats(p).power,0);
 g.award(p,RULES.xp[1],0);p.upgrades.power=1;
 assert.equal(g.bonusStats(p).health,6);assert.equal(g.bonusStats(p).power,10);
 g.addBuff(p,'power',5);assert.equal(g.bonusStats(p).power,24);
});
test('Gubo ultimate validates the 21 percent ally target before consuming cooldown',()=>{
 const {g,p}=quiet('gubo');const ally=g.makeChampion('faust',0,5,'support');ally.x=31;ally.y=5.5;ally.maxHp=1000;ally.hp=211;g.units=[p,ally];
 assert.equal(g.cast(p,'r',ally),false);assert.equal(p.rCd,0);
 ally.hp=210;assert.ok(g.cast(p,'r',ally));assert.ok(p.rCd>0);assert.equal(ally.hp,210);
 ally.lastAttackAt=g.time;run(g,1.3);assert.equal(ally.alive,false);assert.equal(g.kills[0],0);
});
test('every playable champion completes 60 seconds of active bot simulation',()=>{
 for(const key of Object.keys(CHAMPIONS)){const g=new Game(key,'top');g.player.player=false;run(g,60);assert.equal(g.champions().length,8);assert.ok(g.champions().some(c=>c.totalDamage>0));for(const e of g.units)assert.ok(Number.isFinite(e.hp)&&Number.isFinite(e.x)&&Number.isFinite(e.y),key);}
});
