import test from 'node:test';
import assert from 'node:assert/strict';
import { noise,organicPixels,shapeWarp } from '../src/organic-particles.js';
import { SkillVFX,particlePose } from '../src/skill-vfx.js';

test('density masks have irregular contours, internal lighting and smooth alpha instead of a flat primitive',()=>{
 for(const form of ['flame','smoke','drop','woodchip','crystal','leaf','frost','spark','rune']){
  const data=organicPixels(form,0),alphas=new Set(),shades=new Set();let asymmetric=0,covered=0;
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,a=data[i+3];alphas.add(a);if(a>15){covered++;shades.add(data[i]);}if(Math.abs(a-data[(y*64+63-x)*4+3])>10)asymmetric++;}
  assert.ok(alphas.size>80,form);assert.ok(shades.size>25,form);assert.ok(asymmetric>80,form);assert.ok(covered>40&&covered<3500,form);
  assert.deepEqual(data,organicPixels(form,0));assert.notDeepEqual(data,organicPixels(form,1));
 }
});
test('temporal warping varies smoothly, stays bounded and is perfectly stable on a paused frame',()=>{
 const p={born:10,phase:3,variant:2,rotation:.5,spin:2},start=shapeWarp(p,10),a=shapeWarp(p,10.2),b=shapeWarp(p,10.201);
 assert.equal(start.x,1);assert.equal(start.y,1);assert.equal(start.shear,0);assert.notDeepEqual(start,a);assert.deepEqual(a,shapeWarp(p,10.2));
 assert.ok(Math.abs(a.x-b.x)<.01&&Math.abs(a.shear-b.shear)<.01);
 for(let t=0;t<2;t+=.01){const w=shapeWarp(p,10+t);assert.ok(w.x>.5&&w.x<=1&&w.y>.5&&w.y<=1&&Math.abs(w.shear)<.3&&w.frame>=0&&w.frame<4);}
 assert.ok(Math.abs(noise(1,2)-noise(1.0001,2.0001))<.001);
});
test('explosive starts lose at least 80 percent of horizontal speed in 0.3 seconds for every attack family',()=>{
 for(const kind of ['explosion','slash','pierce','impact','shot']){
  const v=new SkillVFX();v.emit(kind,{x:0,y:0},0,{seed:1});const p=v.particles[0],first=particlePose(p,0),later=particlePose(p,.3);
  assert.ok(Math.hypot(first.vx,first.vy)>5);assert.ok(Math.hypot(later.vx,later.vy)<Math.hypot(first.vx,first.vy)*.2,kind);
 }
});
