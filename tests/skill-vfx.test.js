import test from 'node:test';
import assert from 'node:assert/strict';
import { SkillVFX,VFX_LIMITS,VFX_PRESETS,CHAMPION_ELEMENTS,particlePose,coolingColor,effectRecipe } from '../src/skill-vfx.js';
import { Game } from '../src/game.js';
import { THEMES } from '../src/art.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const camera={width:1440,height:900,scale:40,worldToScreen:(p,z=0)=>({x:p.x*40,y:p.y*30-z*24})};
test('ballistic fragments rise and fall, slow in the ground plane, shrink and fade',()=>{
 const v=new SkillVFX();v.emit('explosion',{x:4,y:5},0,{seed:1});
 const p=v.particles[0],start=particlePose(p,0),up=particlePose(p,.15),apex=particlePose(p,p.vz/p.gravity),fall=particlePose(p,p.vz/p.gravity+.1),land=particlePose(p,2);
 assert.ok(up.z>start.z&&apex.z>up.z&&fall.z<apex.z);assert.equal(land.z,0);assert.ok(land.landed);
 assert.ok(Math.hypot(up.vx,up.vy)<Math.hypot(start.vx,start.vy));
 assert.ok(up.size<start.size&&up.alpha<start.alpha);assert.equal(land.alpha,0);assert.equal(land.size,0);
 close(up.x,p.x+p.vx*(1-Math.exp(-p.drag*.15))/p.drag);
});
test('fire cools from white yellow through orange into dark grey',()=>{
 const start=coolingColor('#ff852b',0),hot=coolingColor('#ff852b',.35),end=coolingColor('#ff852b',1);
 assert.ok(start[1]>hot[1]&&start[2]>hot[2]);assert.deepEqual(hot,[255,133,43]);assert.deepEqual(end,[42,39,44]);
});
test('all attack families have nonzero lift, drag, fading and the requested emission pattern',()=>{
 for(const kind of ['explosion','slash','pierce','impact','shot']){
  const v=new SkillVFX();v.emit(kind,{x:0,y:0},0,{radius:3,angle:0,seed:2});
  assert.equal(v.particles.length,VFX_PRESETS[kind].count);
  for(const p of v.particles){assert.ok(p.vz>0&&p.gravity>0&&p.drag>0);assert.ok(particlePose(p,p.life/2).alpha<1);}
  if(['pierce','shot'].includes(kind))assert.ok(v.particles.every(p=>p.vx>Math.abs(p.vy)));
  if(kind==='slash')assert.ok(v.particles.every(p=>Math.hypot(p.x,p.y)>=1));
 }
});
test('the object pool bounds heavy combat and returns every particle after expiry',()=>{
 const v=new SkillVFX(),pool=new Set(v.free);
 for(let i=0;i<200;i++)v.emit('explosion',{x:0,y:0},i/100);
 assert.equal(v.particles.length,VFX_LIMITS.particles);assert.equal(new Set(v.particles).size,VFX_LIMITS.particles);
 assert.ok(v.particles.every(p=>pool.has(p)));assert.equal(v.emitters.length,VFX_LIMITS.emitters);
 v.advance(10);assert.equal(v.particles.length,0);assert.equal(v.emitters.length,0);assert.equal(new Set(v.free).size,VFX_LIMITS.particles);
});
test('rendering at different frame rates and while paused gives the same physical positions',()=>{
 const a=new SkillVFX(),b=new SkillVFX();a.emit('explosion',{x:2,y:2},0,{seed:7});b.emit('explosion',{x:2,y:2},0,{seed:7});
 for(let i=0;i<=30;i++)a.advance(i/60);b.advance(.5);
 assert.deepEqual(a.particles.map(p=>particlePose(p,.5)),b.particles.map(p=>particlePose(p,.5)));
 const before=structuredClone(a.particles);for(let i=0;i<100;i++)a.advance(.5);assert.deepEqual(a.particles,before);
 a.advance(.1);assert.equal(a.particles.length,0);
});
test('classification covers slash, pierce, hit, gun and themed explosions',()=>{
 for(const [type,kind] of [['slash','slash'],['yanCleave','slash'],['thrust','pierce'],['gregorPierce','pierce'],['impact','impact'],['guboLaser','shot'],['whipArc','shot'],['burst','explosion']])assert.equal(effectRecipe({type}).kind,kind);
 assert.equal(effectRecipe({type:'ryoshuStorm',theme:'ryoshu'}).kind,'explosion');
 assert.equal(effectRecipe({type:'cast'}),null);assert.equal(effectRecipe({type:'number'}),null);
});
test('every champion keeps its established primary, highlight and dark colors in every effect family',()=>{
 const g=new Game('faust','top',{mode:'training'}),v=new SkillVFX();g.projectiles=[];
 for(const [key,theme] of Object.entries(THEMES))for(const type of ['slash','thrust','impact','burst','guboLaser','ryoshuStorm']){
  g.effects=[{type,theme:key,x:5,y:5,r:3,maxLife:.7,life:.7}];v.sync(g,camera,THEMES);
  const e=v.emitters.at(-1),p=v.particles.at(-1);assert.equal(e.color,theme.light);assert.equal(p.color,theme.light);assert.equal(p.accent,theme.accent);assert.equal(p.dark,theme.dark);
 }
 g.projectiles=[{source:g.player,origin:{x:5,y:5},dx:1,dy:0,theme:'gubo'}];v.sync(g,camera,THEMES);assert.equal(v.emitters.at(-1).color,THEMES.gubo.light);
});
test('automatic observation emits each event once, culls offscreen attacks and never consumes gameplay random state',()=>{
 const g=new Game('faust','top',{mode:'training'}),v=new SkillVFX();g.time=1;
 g.effects=[{type:'slash',x:5,y:5,r:2,maxLife:.3,life:.3,theme:'faust'}];g.projectiles=[];
 const random=g.randomState;v.sync(g,camera,{});const n=v.particles.length;assert.equal(n,18);assert.equal(g.randomState,random);
 v.sync(g,camera,{});assert.equal(v.particles.length,n);
 g.effects.push({type:'burst',x:1000,y:1000,r:4,maxLife:.7,life:.7});v.sync(g,camera,{});assert.equal(v.particles.length,n);
 const p={source:g.player,origin:{x:6,y:6},x:6,y:6,dx:1,dy:0,theme:'faust'};g.projectiles=[p];v.sync(g,camera,{});assert.equal(v.particles.length,n+12);v.sync(g,camera,{});assert.equal(v.particles.length,n+12);
 const other=new Game('faust','top',{mode:'training'});other.effects=[];other.projectiles=[];v.sync(other,camera,{});assert.equal(v.particles.length,0);
});
test('height projection, camera changes, emitter light and depth sorting stay in world coordinates',()=>{
 const v=new SkillVFX();v.emit('explosion',{x:5,y:5},0,{seed:5});v.advance(.1);v.prepare(camera,1440,900);
 assert.ok(v.frame.length>0);assert.ok(v.frame.every(f=>f.screen.y<camera.worldToScreen(f.pose).y));
 assert.ok(v.frame.every((f,i)=>i===0||f.pose.y>=v.frame[i-1].pose.y));
 const first=v.frame[0].screen,before=structuredClone(v.particles),pan={...camera,worldToScreen:(p,z=0)=>{const s=camera.worldToScreen(p,z);return {x:s.x+10,y:s.y-20};}};
 v.prepare(pan,1440,900);close(v.frame[0].screen.x,first.x+10);close(v.frame[0].screen.y,first.y-20);assert.deepEqual(v.particles,before);
 assert.ok(v.lightAt({x:5,y:5}).strength>v.lightAt({x:7,y:5}).strength);assert.equal(v.lightAt({x:100,y:100}).strength,0);
 const light=v.lightAt({x:5,y:5}).strength;v.advance(.3);assert.ok(v.lightAt({x:5,y:5}).strength<light);
});
test('elements use distinct geometry and non-fire skills never emit fire or smoke particles',()=>{
 const forms={electric:'bolt',ice:'crystal',wood:'woodchip',water:'drop',petal:'petal',mirror:'crystal',arcane:'rune',blood:'drop'};
 for(const [element,required] of Object.entries(forms))for(const kind of Object.keys(VFX_PRESETS)){
  const v=new SkillVFX();v.emit(kind,{x:5,y:5},0,{element,seed:2});
  assert.ok(v.particles.some(p=>p.form===required),`${element}/${kind}`);assert.ok(v.particles.every(p=>!['flame','smoke'].includes(p.form)));
  assert.ok(v.particles.every(p=>particlePose(p,.1).z>0));
 }
 const v=new SkillVFX();v.emit('explosion',{x:5,y:5},0,{element:'fire'});assert.ok(v.particles.some(p=>p.form==='flame'));assert.ok(v.particles.some(p=>p.form==='smoke'));
 for(const [key,element] of [['hohenheim','electric'],['rodya','ice'],['marton','wood'],['dongrang','wood'],['honglu','water'],['alisa','fire']])assert.equal(CHAMPION_ELEMENTS[key],element);
});
test('water, ice, wood and electric zones emit their own attributed burst exactly once',()=>{
 const g=new Game('faust','top',{mode:'training'}),v=new SkillVFX();g.effects=[];g.projectiles=[];
 for(const [kind,key,element] of [['waterfall','honglu','water'],['ice','rodya','ice'],['desireTree','dongrang','wood'],['electricBloom','hohenheim','electric']]){
  g.zones=[{kind,source:{key},x:5,y:5,r:4}];v.sync(g,camera,THEMES);assert.equal(v.emitters.at(-1).element,element);assert.equal(v.emitters.at(-1).color,THEMES[key].light);
  const n=v.emitters.length;v.sync(g,camera,THEMES);assert.equal(v.emitters.length,n);
 }
});
test('a missed rectangular punch still emits an attack, and hit effects are not duplicated by the fallback',()=>{
 const g=new Game('meursault','top',{mode:'training'}),v=new SkillVFX(),p=g.player;g.units=[p];g.time=1;g.effects=[];g.projectiles=[];g.zones=[];
 Object.assign(p,{x:5,y:5,attackSerial:1,attackAt:1,attackFacing:0});v.sync(g,camera,THEMES);assert.equal(v.emitters.length,1);assert.equal(v.emitters[0].kind,'impact');
 v.sync(g,camera,THEMES);assert.equal(v.emitters.length,1);
 g.time=1.5;p.attackSerial=2;p.attackAt=1.5;g.effects=[{type:'impact',theme:'meursault',x:6,y:5,maxLife:.24,life:.24}];v.sync(g,camera,THEMES);assert.equal(v.emitters.length,2);
 assert.equal(effectRecipe({type:'yanWave'}).theme,'yan');assert.equal(effectRecipe({type:'hongluSweep'}).theme,'honglu');assert.equal(effectRecipe({type:'line',theme:'hohenheim'}).kind,'shot');
});
test('electric sparks move quickly and expire early, water and ice fall heavily, wood drifts under drag',()=>{
 const sample=element=>{const v=new SkillVFX();v.emit('explosion',{x:5,y:5},0,{element,seed:1});return v.particles[0];};
 const metal=sample('metal'),electric=sample('electric'),ice=sample('ice'),water=sample('water'),wood=sample('wood');
 assert.ok(electric.life<metal.life&&Math.hypot(electric.vx,electric.vy)>Math.hypot(metal.vx,metal.vy));
 assert.ok(ice.gravity>metal.gravity&&water.gravity>metal.gravity);assert.ok(wood.drag>metal.drag&&wood.gravity<metal.gravity);
});
