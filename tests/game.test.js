import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, damageFormula, respawnTime } from '../src/game.js';
import { CHAMPIONS, RULES } from '../src/data.js';
import { blocked, clearLine, slide, findPath } from '../src/geometry.js';

const run=(g,seconds)=>{for(let i=0;i<Math.round(seconds*30);i++)g.step(1/30);};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function isolated(key='faust') {
  const g=new Game(key);g.aiChampion=()=>{};g.aiMinion=()=>{};g.aiNeutral=()=>{};g.aiStructure=()=>{};
  return g;
}
function opponent(g) {return g.champions(1).find(c=>c.key==='faust');}

test('31 original champion records retain four named skills',()=>{
  const roster=JSON.parse(readFileSync(new URL('../src/roster.json',import.meta.url)));
  assert.equal(roster.length,31);assert.equal(new Set(roster.map(c=>c.id)).size,31);
  for(const c of roster){assert.equal(c.skills.length,4);assert.ok(c.skills.every(s=>s.name&&s.description.length>20));}
});
test('match starts with 4+4 champions, four towers, two cores and ten neutrals',()=>{
  const g=new Game();assert.equal(g.champions(0).length,4);assert.equal(g.champions(1).length,4);
  assert.equal(g.champions().filter(c=>c.player).length,1);assert.equal(g.units.filter(u=>u.kind==='tower').length,4);
  assert.equal(g.units.filter(u=>u.kind==='core').length,2);assert.equal(g.units.filter(u=>u.kind==='neutral').length,10);
  assert.equal(g.units.filter(u=>u.camp==='central').length,4);
});
test('damage uses grade, level and armor; example rounds to 246',()=>{
  close(damageFormula(300,4,5,50),246.4);close(damageFormula(300,3,3,0),300);
});
test('base opens only after both of its OWN towers fall',()=>{
  const g=isolated(),core=g.units.find(u=>u.kind==='core'&&u.team===1),p=g.player;
  p.x=58;p.y=18;const hp=core.hp;g.deal(p,core,1000);assert.equal(core.hp,hp);
  for(const t of g.towers(0))t.alive=false;assert.equal(g.locked(core),true);
  g.towers(1)[0].alive=false;assert.equal(g.locked(core),true);
  g.towers(1)[0].alive=false;assert.equal(g.locked(core),false);
  g.deal(p,core,1000);assert.ok(core.hp<hp);
});
test('tower is invulnerable without invading units and reduces lone champion damage by 80%',()=>{
  const g=isolated(),p=g.player,t=g.towers(1)[0];const hp=t.hp;
  g.deal(p,t,1000);assert.equal(t.hp,hp);
  p.x=t.x-2;p.y=t.y;
  g.deal(p,t,1000);const alone=hp-t.hp;t.hp=hp;
  g.entity({kind:'minion',team:0,x:t.x-3,y:t.y,maxHp:520});
  g.deal(p,t,1000);close((hp-t.hp)/alone,5);
});
test('friendly damage is rejected',()=>{
  const g=isolated(),ally=g.champions(0)[1];g.deal(g.player,ally,1000);assert.equal(ally.hp,ally.maxHp);
});
test('wave starts at 30s, both lanes, siege every third wave',()=>{
  const g=isolated();run(g,29);assert.equal(g.wave,0);run(g,1);
  assert.equal(g.wave,1);assert.equal(g.units.filter(u=>u.kind==='minion').length,16);
  g.units=g.units.filter(u=>u.kind!=='minion');g.time=89.99;g.wave=2;g.step(.01);
  assert.equal(g.units.filter(u=>u.kind==='minion').length,20);assert.equal(g.units.filter(u=>u.siege).length,4);
});
test('5:00 permanently removes central creeps, even pending respawns, and spawns one boss',()=>{
  const g=isolated(),central=g.units.filter(u=>u.camp==='central');central[0].alive=false;central[0].respawnAt=301;
  g.time=299.99;g.wave=9;g.step(.01);assert.equal(g.bossSpawned,true);
  assert.ok(central.every(c=>!c.alive&&c.respawnAt===Infinity));assert.equal(g.units.filter(u=>u.camp==='boss').length,1);
  run(g,3);assert.ok(central.every(c=>!c.alive));assert.equal(g.units.filter(u=>u.camp==='boss').length,1);
});
test('boss gives all teammates 180 XP and 160 currency once',()=>{
  const g=isolated();g.spawnBoss();const boss=g.units.find(u=>u.camp==='boss');
  g.deal(g.player,boss,100000,{fixed:true});
  for(const c of g.champions(0)){close(c.gold,410);close(c.xp,c.key==='faust'?207:180);}
  assert.ok(g.champions(1).every(c=>c.xp===0));g.deal(g.player,boss,100000,{fixed:true});close(g.player.gold,410);
});
test('timeout compares count then tower health; no towers compares cores; exact equality draws',()=>{
  const a=isolated();a.judge();assert.equal(a.winner,-1);
  const b=isolated();b.towers(1)[0].alive=false;b.towers(0)[0].hp=1;b.judge();assert.equal(b.winner,0);
  const c=isolated();c.towers(0)[0].hp-=1;c.judge();assert.equal(c.winner,1);
  const d=isolated();d.units.filter(u=>u.kind==='tower').forEach(t=>t.alive=false);d.units.find(u=>u.kind==='core'&&u.team===1).hp-=1;d.judge();assert.equal(d.winner,0);
});
test('core destruction ends immediately and subsequent ticks cannot change the result',()=>{
  const g=isolated();g.towers(1).forEach(t=>t.alive=false);const core=g.units.find(u=>u.kind==='core'&&u.team===1);
  g.player.x=58;g.player.y=18;g.deal(g.player,core,1000000,{fixed:true});
  assert.equal(g.winner,0);assert.equal(g.reason,'본진 파괴');const t=g.time;g.step(1);assert.equal(g.time,t);
});
test('ammo is consumed, dry fire fails and continuous reload respects capacity',()=>{
  const g=isolated(),p=g.player;
  for(let i=0;i<3;i++){p.attackCd=0;assert.equal(g.attack(p,{x:10,y:18}),true);}
  p.attackCd=0;assert.equal(p.ammo,0);assert.equal(g.attack(p,{x:10,y:18}),false);
  run(g,.6);assert.equal(p.ammo,1);run(g,3);assert.equal(p.ammo,3);assert.equal(p.reloadProgress,0);
});
test('basic projectile hits an enemy and collides with walls',()=>{
  const g=isolated(),p=g.player,t=opponent(g);g.units=[p,t];p.x=30;p.y=5;t.x=34;t.y=5;
  g.attack(p,t);run(g,.4);assert.ok(t.hp<t.maxHp);
  p.x=12;p.y=11.7;t.x=20;t.y=11.7;t.hp=t.maxHp;p.attackCd=0;
  g.attack(p,t);run(g,1);assert.equal(t.hp,t.maxHp);
});
test('auto aim ignores enemies beyond range and behind a wall',()=>{
  const g=isolated(),p=g.player,t=opponent(g);g.units=[p,t];p.x=12;p.y=11.7;t.x=20;t.y=11.7;
  assert.equal(g.nearest(p,10),undefined);p.x=30;p.y=5;t.x=40;t.y=5;assert.equal(g.nearest(p,7.5),undefined);
  t.x=35;assert.equal(g.nearest(p,7.5),t);
});
test('Faust ultimate telegraphs before applying damage, then goes on cooldown',()=>{
  const g=isolated(),p=g.player,t=opponent(g);g.units=[p,t];p.x=30;p.y=5;t.x=34;t.y=5;
  assert.ok(g.cast(p,'r',t));const hp=t.hp;run(g,1);assert.equal(t.hp,hp);assert.equal(g.cast(p,'r',t),false);
  run(g,.3);assert.ok(t.hp<hp);assert.ok(p.rCd>46);assert.ok(g.buff(p,'faustUlt'));
});
test('Yi Sang pool silences only after continuous exposure and deals periodic damage',()=>{
  const g=isolated('yi'),p=g.player,t=opponent(g);g.units=[p,t];p.x=30;p.y=5;t.x=34;t.y=5;
  g.cast(p,'q',t);run(g,1);assert.equal(g.stat(t,'silence'),0);assert.ok(t.hp<t.maxHp);
  run(g,.3);assert.equal(g.stat(t,'silence'),1);
});
test('Sinclair marks proc after twelve basic hits and fully refill ammo',()=>{
  const g=isolated('sinclair'),p=g.player,t=opponent(g);g.units=[p,t];p.x=30;p.y=5;t.x=31;t.y=5;t.hp=t.maxHp=100000;
  for(let i=0;i<6;i++){p.ammo=2;p.attackCd=0;g.attack(p,t);}
  assert.ok(g.buff(p,'marks'));assert.equal(p.marks,0);assert.equal(p.ammo,2);
});
test('Meursault converts root to silence and can use Q while silenced',()=>{
  const g=isolated('meursault'),p=g.player;g.status(p,'root',1,2);
  assert.equal(g.stat(p,'root'),0);assert.equal(g.stat(p,'silence'),1);assert.ok(g.cast(p,'q',p));
  assert.equal(g.stat(p,'silence'),0);g.status(p,'slow',.3,2);assert.equal(g.stat(p,'slow'),0);
});
test('shields refresh by source and combined shields cap at 35%',()=>{
  const g=isolated(),p=g.player;g.addShield(p,500,'a');g.addShield(p,100,'a');close(g.shield(p),500);
  g.addShield(p,2000,'b');close(g.shield(p),p.maxHp*.35);run(g,3.1);close(g.shield(p),0);
});
test('shop requires spawn and peace, charges progressive costs, enforces caps',()=>{
  const g=isolated(),p=g.player;assert.ok(g.buy(p,'power'));assert.equal(p.gold,90);assert.equal(p.upgrades.power,1);
  assert.equal(g.buy(p,'power'),false);p.gold=5000;p.lastCombat=g.time;assert.equal(g.buy(p,'power'),false);
  p.lastCombat=-99;p.x=20;assert.equal(g.buy(p,'power'),false);p.x=3;
  assert.ok(g.buy(p,'power'));assert.ok(g.buy(p,'power'));assert.equal(g.buy(p,'power'),false);assert.equal(p.gold,4340);
  assert.ok(g.buy(p,'speed'));assert.ok(g.buy(p,'speed'));assert.equal(g.buy(p,'speed'),false);
});
test('one potion purchase grants two uses; healing continues through damage',()=>{
  const g=isolated(),p=g.player;assert.ok(g.buy(p,'potion'));assert.equal(p.potion,2);assert.equal(g.buy(p,'potion'),false);
  p.x=10;p.y=18;p.hp=1000;assert.ok(g.usePotion(p));assert.equal(g.usePotion(p),false);run(g,1);
  assert.ok(p.hp>1000);g.deal(opponent(g),p,100,{fixed:true});const hp=p.hp;run(g,1);assert.ok(p.hp>hp);assert.equal(p.potion,1);
});
test('experience is personal, caps at level five and increases max HP',()=>{
  const g=isolated(),p=g.player,other=g.champions(0)[1];g.award(p,10000,0);
  assert.equal(p.level,5);close(p.maxHp,3400*1.24);assert.equal(other.level,1);assert.equal(other.xp,0);
});
test('death grants kill/assist rewards and respawns with full health and ammo',()=>{
  const g=isolated(),p=g.player,t=opponent(g),ally=g.champions(0)[1];t.hp=100;
  g.deal(ally,t,20,{fixed:true});g.deal(p,t,1000,{fixed:true});assert.equal(t.alive,false);assert.equal(g.kills[0],1);
  assert.equal(p.kills,1);assert.equal(t.deaths,1);close(ally.gold,290);
  assert.equal(respawnTime(0,1),6);assert.equal(respawnTime(600,5),19);assert.equal(respawnTime(1200,5),20);
  run(g,6.1);assert.ok(t.alive);assert.equal(t.hp,t.maxHp);assert.equal(t.ammo,CHAMPIONS[t.key].ammo);
});
test('walls block movement, paths route around walls, diagonal input cannot speed up',()=>{
  const unit={x:12,y:11.7,radius:.48};slide(unit,10,0);assert.ok(unit.x<13);assert.equal(blocked(unit.x,unit.y,.48),false);
  assert.equal(clearLine({x:12,y:11.7},{x:20,y:11.7}),false);
  const path=findPath({x:12,y:11.7},{x:20,y:11.7});assert.ok(path.length>0);assert.ok(path.every(p=>!blocked(p.x,p.y,.48)));
  const a=isolated(),b=isolated();a.input.x=1;b.input.x=1;b.input.y=1;
  const start={x:a.player.x,y:a.player.y};run(a,1);run(b,1);
  close(Math.hypot(a.player.x-start.x,a.player.y-start.y),Math.hypot(b.player.x-start.x,b.player.y-start.y));
});
test('bots leave their lane entrance and actually fight',()=>{
  const g=new Game();run(g,90);
  assert.ok(g.champions().some(c=>!c.player&&c.totalDamage>1000));
  assert.ok(g.champions().some(c=>c.xp>0));assert.equal(g.wave,3);
});
test('all four selections survive a full autonomous match with finite state and a winner',()=>{
  for(const key of Object.keys(CHAMPIONS)) {
    const g=new Game(key);run(g,600);
    assert.ok([-1,0,1].includes(g.winner),key);assert.ok(g.time<=600);assert.ok(g.bossSpawned||g.time<300);
    for(const u of g.units){assert.ok(Number.isFinite(u.x)&&Number.isFinite(u.y)&&Number.isFinite(u.hp),`${key}: ${u.name}`);assert.ok(u.hp>=0);}
    assert.ok(g.champions().some(c=>c.totalDamage>1000));
  }
});
