import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { DashTrails,dashSections,DASH_TRAIL_FADE } from '../src/dash-trails.js';
import { footprintBounds } from '../src/attack-strokes.js';
import { fanFlight,petalBursts,ChampionVFX } from '../src/champion-vfx.js';
import { SkillVFX,VFX_LIMITS } from '../src/skill-vfx.js';
import { hitStyle,insideShape } from '../src/combat-style.js';
import { leapLift,renderAnchor } from '../src/projection-25d.js';
const camera={width:1800,height:1000,scale:32,worldToScreen:(p,z=0)=>({x:p.x*32,y:p.y*22-z*32})};
function arena(key='outis'){
 const g=new Game(key,'top',{mode:'training',seed:29}),p=g.player;g.units=[p];g.effects=[];g.projectiles=[];g.pending=[];g.events=[];g.zones=[];g.time=10;g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:80,h:60},walls:[]};g.bounds=g.map.bounds;
 for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(p,{x:20,y:20});const t=g.makeChampion('faust',1,10);Object.assign(t,{x:26,y:20,hp:100000,maxHp:100000});return {g,p,t};
}
const run=(g,s,fn=()=>{})=>{for(let i=0;i<s*60;i++){g.step(1/60);fn();}};
test('dash history captures five world poses, freezes on pause, tapers and expires',()=>{
 const {g,p}=arena('don'),trails=new DashTrails();g.startMotion(p,{x:1,y:0},5,{phaseEnemies:true});const random=g.randomState;
 for(let i=0;i<9;i++){g.time+=1/60;p.x+=.1;trails.sync(g);}assert.equal(g.randomState,random);const h=trails.histories.get(p);assert.equal(h.samples.length,5);const before=JSON.stringify(h.samples);trails.sync(g);assert.equal(JSON.stringify(h.samples),before);
 const sections=dashSections(h.samples,g.time,camera);assert.equal(sections[0].width,0);assert.equal(sections[0].alpha,0);for(let i=1;i<5;i++){assert.ok(sections[i].width>sections[i-1].width);assert.ok(sections[i].alpha>sections[i-1].alpha);}
 delete p.motion;g.time+=DASH_TRAIL_FADE+.001;trails.sync(g);assert.equal(trails.histories.get(p),undefined);
});
test('forced displacement and instant repositioning cannot draw a dash ribbon',()=>{
 const {g,p}=arena(),trails=new DashTrails();g.startMotion(p,{x:1,y:0},4,{kind:'knock'});trails.sync(g);assert.equal(trails.histories.get(p),undefined);delete p.motion;p.x+=30;trails.sync(g);assert.equal(trails.histories.get(p),undefined);
});
test('Starbuck ascent and descent are visible phases with separate vertical trail segments',()=>{
 const {g,p}=arena('starbuck'),trails=new DashTrails();g.cast(p,'r',{x:27,y:20});p.motion.elapsed=.14;assert.ok(leapLift(p)>6&&leapLift(p)<9);assert.deepEqual(renderAnchor(p),p.motion.visualOrigin);
 for(let i=0;i<5;i++){g.time+=.016;p.motion.elapsed=.03+i*.016;trails.sync(g);}p.motion.elapsed=.36;g.time+=.016;trails.sync(g);assert.equal(trails.histories.get(p).samples.length,1);assert.equal(renderAnchor(p).x,27);
 p.motion.elapsed=.56;assert.ok(leapLift(p)>4&&leapLift(p)<8);p.motion.elapsed=.7;assert.equal(leapLift(p),0);
});
test('footprint bounds include the full inner and outer extent of each damage shape',()=>{
 assert.deepEqual(footprintBounds({kind:'rect',range:6.5,width:1.8}),{x:0,y:-.9,w:6.5,h:1.8});for(const kind of ['cone','circle'])assert.deepEqual(footprintBounds({kind,range:7.5}),{x:-7.5,y:-7.5,w:15,h:15});
});
test('nails and shotgun pellets move outward within the exact fan and finish their flight',()=>{
 for(const type of ['nailFan','shotgun']){const f={type,x:0,y:0,r:7,angle:.4,spread:1.5},early=fanFlight(f,.06),late=fanFlight(f,.16);assert.ok(early.length>3&&late.length>10);assert.ok(late.find(p=>p.id===early[0].id).distance>early[0].distance);
 for(const p of late)assert.ok(insideShape({kind:'cone',range:f.r,spread:f.spread,angle:f.angle},p.x,p.y));assert.equal(fanFlight(f,1).length,0);}
});
test('Ppui red nail trajectories vary per volley and remain stable while paused',()=>{
 const f={type:'nailFan',x:0,y:0,r:7,angle:0,spread:1.5,at:10},a=fanFlight(f,.16);assert.deepEqual(a,fanFlight(f,.16));assert.notDeepEqual(a,fanFlight({...f,at:10.4},.16));const steps=a.slice(1).map((p,i)=>p.angle-a[i].angle);assert.ok(steps.some(v=>v>0)&&steps.some(v=>v<0));
});
test('Ppui volleys keep pointing at the selected attack position after moving',()=>{
 const {g,p,t}=arena('ppui'),selected={x:t.x,y:t.y};g.cast(p,'r',selected);g.step(.001);assert.equal(g.effects.find(f=>f.type==='nailVolley').angle,0);p.y+=2;run(g,.41);const volley=g.effects.filter(f=>f.type==='nailVolley').at(-1),expected=Math.atan2(selected.y-p.y,selected.x-p.x);assert.ok(Math.abs(volley.angle-expected)<1e-8);const actual=g.effects.filter(f=>f.type==='slash').at(-1);assert.equal(actual.shape.angle,volley.angle);
 for(const shot of fanFlight({...volley,type:'nailFan',at:10},.16)){const direction=Math.atan2(shot.target.y-shot.y,shot.target.x-shot.x);assert.ok(Math.abs(direction-shot.angle)<1e-8);assert.ok(shot.height>=.25&&shot.height<=.95);}
});
test('petal blasts span over a second at different places inside the actual area',()=>{
 const f={x:0,y:0,r:4.2,at:10},seen=new Map();for(let age=0;age<1.5;age+=.05)for(const p of petalBursts(f,age)){seen.set(p.delay,p);assert.ok(Math.hypot(p.x,p.y)<f.r);}
 assert.equal(seen.size,22);assert.ok(Math.max(...seen.keys())>1);assert.ok([...seen.values()].some(p=>Math.hypot(p.x,p.y)>f.r*.85));assert.equal(petalBursts(f,1.5).length,0);
});
test('Sinclair tactical contact gets a physical piercing body hit',()=>{
 const {g,p,t}=arena('sinclair'),v=new SkillVFX();g.action(p,'skill',()=>{p.castSlot='q';g.deal(p,t,100);});v.sync(g,camera);assert.equal(hitStyle(g,p,{slot:'q'}).shape,'pierce');assert.equal(v.emitters.find(e=>e.body).kind,'pierce');assert.equal(v.emitters[0].ownerId,t.id);
});
test('Outis tactical spin appears at the real landing circle, with one neutral slash family',()=>{
 const {g,p}=arena('outis'),v=new ChampionVFX(new SkillVFX());g.cast(p,'q',{x:25,y:20});assert.ok(!g.effects.some(f=>f.type==='outisSpin'));let spin;run(g,.4,()=>{spin||=g.effects.find(f=>f.type==='outisSpin');v.sync(g);});assert.equal(spin.r,2.5);assert.ok(Math.abs(spin.x-23)<.01);assert.ok(v.effects.some(f=>f.type==='spinSlash'&&f.r===2.5));
});
test('Gahwan has three complete circular ultimate slashes, and Ppui uses the real fan size',()=>{
 const {g,p,t}=arena('gahwan'),v=new ChampionVFX(new SkillVFX()),times=[];g.cast(p,'r',t);v.sync(g);times.push(...v.effects.filter(f=>f.type==='gazeSlash').map(f=>f.at));run(g,1.6,()=>{v.sync(g);for(const f of v.effects.filter(f=>f.type==='gazeSlash'))if(!times.includes(f.at))times.push(f.at);});assert.equal(times.length,3);
 const b=arena('ppui');b.g.cast(b.p,'r',b.t);b.g.step(.001);const f=b.g.effects.find(f=>f.type==='nailVolley');assert.equal(f.shape.range,7);assert.equal(f.shape.spread,1.5);
});
test('waterfall is a persistent ripple field without an eruption emitter',()=>{
 const {g,p}=arena('honglu'),v=new SkillVFX();g.zones=[{kind:'waterfall',source:p,x:22,y:20,r:6.5}];v.sync(g,camera);assert.equal(v.emitters.length,0);assert.equal(v.particles.length,0);
});
test('attack lighting is visible but bounded even with many overlapping emitters',()=>{
 const v=new SkillVFX();v.advance(10);v.emit('explosion',{x:10,y:10},10,{radius:5});const light=v.lightAt({x:10,y:10}).strength;assert.ok(light>.2&&light<=VFX_LIMITS.highlight);for(let i=0;i<30;i++)v.emit('explosion',{x:10,y:10},10,{radius:5});assert.equal(v.lightAt({x:10,y:10}).strength,light);
});
