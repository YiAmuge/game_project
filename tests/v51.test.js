import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,damageFormula}from'../src/game.js';
import {WORLD,FOUNTAINS,APPROACH,WALLS,BUSHES,CHAMPIONS,MAP_CENTER}from'../src/data.js';
import {distance,blocked}from'../src/geometry.js';
import {canOccupy}from'../src/collision.js';
import {ultGrowth}from'../src/v06-champions.js';
import * as Towers from'../src/tower-rules.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.ceil(s*120);i++)g.step(1/120);};
function arena(key='faust'){
 const g=new Game(key,'top',{seed:51}),p=g.player;g.time=10;g.map={bounds:WORLD,walls:[]};g.units=[p];g.minionQueue=[];g.wave=100;g.reloadInterval=()=>100;
 Object.assign(p,{x:30,y:20,lastCombat:10,lastAttackAt:999,lastDamageAt:999});for(const k of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[k]=()=>{};
 return{g,p};
}
function target(g,x=31,key='faust'){const t=g.makeChampion(key,1,8);Object.assign(t,{x,y:20,maxHp:100000,hp:100000,armor:0,lastAttackAt:999,lastDamageAt:999});return t;}
test('Ishmael weakness stacks twice, refreshes for 1.5 seconds and expires without lingering power loss',()=>{
 const{g,p}=arena('ishmael'),t=target(g);const hit=()=>{p.ammo=g.ammoCap(p);p.attackCd=0;assert.ok(g.attack(p,t));};hit();near(g.powerWeak(t),.02);g.time=11;hit();near(g.powerWeak(t),.04);near(t.state.ishmaelWeak[p.id].until,12.5);g.time=12.499;near(g.powerWeak(t),.04);g.time=12.5;near(g.powerWeak(t),0);hit();near(g.powerWeak(t),.02);run(g,1.51);near(g.powerWeak(t),0);assert.equal(t.state.ishmaelWeak[p.id],undefined);
});
test('Ishmael respects debuff immunity and weakness from separate owners expires independently',()=>{
 const{g,p}=arena('ishmael'),t=target(g,31,'meursault');g.addBuff(t,'resolve',3);g.attack(p,t);near(g.powerWeak(t),0);delete t.buffs.resolve;
 const other=g.makeChampion('ishmael',0,2);Object.assign(other,{x:30,y:20});p.attackCd=0;p.ammo=2;g.attack(p,t);g.time=11;g.attack(other,t);g.time=11.6;near(g.powerWeak(t),.02);g.time=12.5;near(g.powerWeak(t),0);
});
test('Ryoshu Q recharges at base eight seconds and refills one round per distinct damaged enemy, including shields',()=>{
 const{g,p}=arena('ryoshu'),t=target(g,32);g.addShield(t,5000,'test',10);p.ammo=0;assert.equal(CHAMPIONS.ryoshu.q,8);near(g.cooldown(p,'q'),8);assert.ok(g.cast(p,'q',{x:34,y:20}));near(p.state.ryoshuReady,18);run(g,.55);near(p.ammo,1);near(t.hp,t.maxHp);run(g,.5);near(p.ammo,1);
 const b=arena('ryoshu'),immune=target(b.g,32);immune.invulnerableUntil=100;b.p.ammo=0;b.g.cast(b.p,'q',{x:34,y:20});run(b.g,.55);near(b.p.ammo,0);
 const c=arena('ryoshu');target(c.g,31.2);target(c.g,33);c.p.ammo=0;c.g.cast(c.p,'q',{x:34,y:20});run(c.g,.55);near(c.p.ammo,2);
});
test('Ryoshu ultimate applies twenty-percent vulnerability for five seconds with four hits',()=>{
 const{g,p}=arena('ryoshu'),t=target(g,34);assert.ok(g.cast(p,'r',{x:34,y:20}));run(g,.5);near(g.stat(t,'vulnerable'),.2);near(g.stat(t,'armorDown'),0);const until=t.status.vulnerable.until;assert.ok(until-g.time>4.8&&until-g.time<=5);near(t.maxHp-t.hp,damageFormula(140,CHAMPIONS.ryoshu.power,1)*(1+3*1.2));g.time=until;near(g.stat(t,'vulnerable'),0);
});
test('Dongrang ultimate gains twenty damage per full nutrient stack without changing radius',()=>{
 const{g,p}=arena('dongrang');for(const [healing,damage]of [[0,180],[1499,180],[1500,200],[3000,220],[31500,600]]){p.totalHealingReceived=healing;assert.deepEqual(ultGrowth(p),{radius:3.2,damage});}
});
test('Living towers reveal concealed enemies to their entire team within attack range and acquire them',()=>{
 const{g,p}=arena(),t=target(g);g.map=null;const b=BUSHES[0];Object.assign(t,{x:b.x+b.w/2,y:b.y+b.h/2,lastCombat:-99});Object.assign(p,{x:3,y:23.4});assert.ok(g.bushAt(t));assert.equal(g.visibleTo(0,t),false);
 const tower=g.entity({kind:'tower',team:0,x:t.x,y:t.y-5,range:8.5,radius:.9,maxHp:5000,damage:280});assert.equal(g.visibleTo(0,t),true);assert.equal(Towers.acquire(g,tower),t);tower.alive=false;assert.equal(g.visibleTo(0,t),false);tower.alive=true;tower.y=t.y-8.51;assert.equal(g.visibleTo(0,t),false);tower.y=t.y-8.5;assert.equal(g.visibleTo(0,t),true);t.untargetableUntil=100;assert.equal(Towers.attackable(g,tower,t),false);
});
test('Diagonal meshes are absent and the narrowed terrain edge rejects the full body radius',()=>{
 assert.equal(WALLS.length,16);assert.equal(WALLS.some(w=>w.approach),false);assert.ok(APPROACH.tipX>16.2);near(APPROACH.tipY*(1-APPROACH.stopX/APPROACH.tipX),APPROACH.stopY);
 const x=10,slope=APPROACH.tipY/APPROACH.tipX,y=APPROACH.tipY-slope*x,n=Math.hypot(1,slope);assert.ok(blocked(x,y+.47*n,.48));assert.equal(blocked(x,y+.49*n,.48),false);assert.ok(blocked(1,1));assert.equal(blocked(MAP_CENTER.x,MAP_CENTER.y),false);
});
test('Central vertical mist matches both wall faces and endpoints exactly',()=>{
 for(const [i,side]of [[4,1],[11,-1]]){const wall=WALLS[i],b=BUSHES.find(b=>!b.polygon&&Math.abs(b.y-wall.y)<1e-8&&Math.abs(b.h-wall.h)<1e-8&&(side>0?Math.abs(b.x-wall.x-wall.w):Math.abs(b.x+b.w-wall.x))<1e-8);assert.ok(b);near(b.y+b.h,wall.y+wall.h);}
});
test('Both teams route around their moved core on deployment and retreat without collision or a stall',()=>{
 for(const team of [0,1]){const g=new Game('meursault'),e=g.player,core=g.units.find(u=>u.kind==='core'&&u.team===team);g.units=[e,core];e.team=team;Object.assign(e,FOUNTAINS[team]);const goal={x:team?50.72:20,y:23.4};
  for(const to of [goal,FOUNTAINS[team]]){for(let i=0;i<1200&&distance(e,to)>.06;i++){g.time+=1/60;g.moveToward(e,to,1/60);assert.ok(canOccupy(g,e,e));}assert.ok(distance(e,to)<.06,`team ${team} stopped at ${e.x},${e.y}`);}
 }
});
