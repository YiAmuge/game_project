import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { SkillVFX } from '../src/skill-vfx.js';
import { ChampionVFX,championPresentation,petalFanFlight,treeBillboard,treeAttackArea } from '../src/champion-vfx.js';
import { projectileAppearance } from '../src/projectile-vfx.js';
import { projectileDimensions,projectileHitWidth } from '../src/projectile-rules.js';
import { insideShape } from '../src/combat-style.js';
import * as Yan from '../src/yan.js';
const camera={width:1600,height:1000,scale:32,worldToScreen:(p,z=0)=>({x:p.x*32,y:p.y*22-z*32})};
function arena(key='faust'){
 const g=new Game(key,'top',{mode:'training',seed:30}),p=g.player;g.units=[p];g.effects=[];g.events=[];g.projectiles=[];g.pending=[];g.zones=[];g.time=10;g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:80,h:60},walls:[]};g.bounds=g.map.bounds;
 for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(p,{x:20,y:20});const t=g.makeChampion('faust',1,10);Object.assign(t,{x:24,y:20,hp:100000,maxHp:100000});return {g,p,t};
}
test('projectile art scales both dimensions exactly 2.5 times independently of the hit width',()=>{
 for(const type of ['bullet','knife','harpoon','nail','glass','axe','wave','cannon'])for(const width of [.1,.36,3.78]){
  const p={type,width},size=projectileDimensions(p,32),oldWidth=width*32,oldLength=type==='wave'?oldWidth*.7:Math.max(oldWidth*2.5,32*.65);
  assert.equal(size.width,oldWidth*2.5);assert.equal(size.length,oldLength*2.5);
 }
 assert.ok(Math.abs(projectileHitWidth({width:.2})-.22)<1e-12);
});
test('a ranged shot hits within the added ten percent margin and misses outside it',()=>{
 for(const [offset,hit] of [[.21,true],[.221,false]]){
  const {g,p,t}=arena();t.x=20.1;t.y=20+t.radius+offset;const hp=t.hp;g.bullet(p,{x:1,y:0},100,7,{width:.2,speed:20});g.updateProjectiles(.005);
  assert.equal(t.hp<hp,hit);if(!hit){assert.equal(g.projectiles[0].width,.2);assert.equal(g.projectiles[0].remaining,6.9);}
 }
});
test('the projectile size rule cannot bypass terrain or add an attack range bonus',()=>{
 const {g,p,t}=arena();g.map.walls=[{x:21,y:18,w:1,h:4}];t.x=24;const hp=t.hp;g.bullet(p,{x:1,y:0},100,7,{width:.2,speed:20});g.updateProjectiles(.4);assert.equal(t.hp,hp);assert.equal(g.projectiles.length,0);
 g.map.walls=[];t.x=28;g.bullet(p,{x:1,y:0},100,7,{width:.2,speed:20});g.updateProjectiles(.4);assert.equal(t.hp,hp);assert.equal(g.projectiles.length,0);
});
test('Myo tactical shots keep the orange palette and skill identity throughout their volley',()=>{
 const {g,p,t}=arena('myo');t.x=60;g.cast(p,'q',t);for(let i=0;i<28;i++)g.step(.01);
 assert.equal(g.projectiles.length,4);for(const shot of g.projectiles){const style=projectileAppearance(shot,g);assert.equal(shot.slot,'q');assert.equal(style.type,'bullet');assert.equal(style.color,'#df9653');}
});
test('buff and shield presentation has a vivid bounded aura while retaining the champion palette',()=>{
 const {g,p}=arena('gubo');g.addShield(p,100,'test',3);let look=championPresentation(g,p);assert.ok(look.aura.strength>=.5&&look.aura.strength<=1);
 g.addBuff(p,'guboReload',4);look=championPresentation(g,p);assert.equal(look.aura.color,'#6c1429');assert.ok(look.aura.strength>=.65&&look.aura.strength<=1);assert.equal(look.dim,1);
});
test('physical contacts stay attached to the torso and remain visible during their short fade',()=>{
 const {g,p,t}=arena(),v=new SkillVFX();g.deal(p,t,100);v.sync(g,camera);const hit=v.emitters.find(e=>e.body);assert.equal(hit.height,1.25);assert.equal(hit.ownerId,t.id);assert.equal(hit.life,.3);assert.equal(hit.radius,.78);
 assert.equal(v.particles.length,12);assert.ok(v.particles.every(p=>['chip','spark'].includes(p.form)&&p.size<=.12));g.time+=.22;v.advance(g.time);assert.ok(v.emitters.includes(hit));
});
test('Dongbaek basic petals travel outward inside their real fan without a stationary slash emitter',()=>{
 const {g,p,t}=arena('dongbaek'),v=new SkillVFX(),champion=new ChampionVFX(v);g.attack(p,t);const fx=g.effects.find(f=>f.type==='petalFan');assert.ok(fx);assert.equal(fx.source,p.id);assert.equal(fx.r,g.attackRange(p));assert.equal(fx.shape.spread,1.3);
 v.sync(g,camera);champion.sync(g);assert.ok(!v.emitters.some(e=>!e.body));const f=champion.effects.find(f=>f.type==='petalFan'),a=petalFanFlight(f,.09),b=petalFanFlight(f,.25);
 assert.equal(a.length,36);assert.equal(b.length,36);for(const p of b){assert.ok(p.distance>a.find(q=>q.id===p.id).distance);assert.ok(insideShape(fx.shape,p.x-f.x,p.y-f.y));}assert.equal(petalFanFlight(f,.6).length,0);
 const paused=JSON.stringify(b);assert.equal(JSON.stringify(petalFanFlight(f,.25)),paused);
});
test('normal Yan basic uses one pressure field with no slash, fragment or flash emitter',()=>{
 const {g,p}=arena('yan'),v=new SkillVFX();g.attack(p,{x:26,y:20});p.state.yanCharge.progress=1.5;Yan.release(g,p,{x:26,y:20});v.sync(g,camera);
 const range=v.emitters.filter(e=>!e.body);assert.equal(range.length,1);assert.equal(range[0].pressure,true);assert.equal(range[0].shape.range,6.5);assert.equal(range[0].shape.width,1.8);assert.equal(range[0].light,0);assert.equal(v.particles.filter(p=>!p.body).length,0);
});
test('tree art has an upright screen-space size and projects only its rooted feet',()=>{
 let calls=0;const cam={width:1000,height:900,scale:32,worldToScreen:(p,h)=>{calls++;assert.equal(h,.075);return {x:p.x*32,y:p.y*18-h*32};}},z={x:15,y:20};const p=treeBillboard(cam,z);
 assert.equal(calls,1);assert.equal(p.width,96);assert.equal(p.height,128);assert.equal(p.x+p.width/2,p.foot.x);assert.ok(p.y+p.height>p.foot.y);assert.ok(p.y<p.foot.y-100);
});

test('desire tree range display uses the live attack radius and exists only during its attacking state',()=>{
 const {g,p}=arena('dongrang');g.cast(p,'q',{x:23,y:20});const z=g.zones[0];assert.equal(z.r,3.8);assert.deepEqual(treeAttackArea(z,g.time),{x:z.x,y:z.y,r:z.r});z.r=4.1;assert.equal(treeAttackArea(z,g.time).r,4.1);z.golden=true;assert.equal(treeAttackArea(z,g.time),null);z.golden=false;z.until=g.time;assert.equal(treeAttackArea(z,g.time),null);
});
