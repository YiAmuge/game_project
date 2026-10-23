import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionTrails,TRAIL_FRAMES,TRAIL_FADE,ribbonSections,captureBlade,projectBlade } from '../src/weapon-trails.js';

const point=(x,y)=>({x,y});
const pose=(time,overrides={})=>({time,key:'attack-1',active:true,anchor:point(20,20),inner:point(Math.cos(time),Math.sin(time)),outer:point(2*Math.cos(time),2*Math.sin(time)),...overrides});
const project=s=>({inner:point(s.anchor.x+s.inner.x,s.anchor.y+s.inner.y),outer:point(s.anchor.x+s.outer.x,s.anchor.y+s.outer.y)});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('a long attack keeps only its latest five poses, with independent weapons and owners',()=>{
 const trails=new MotionTrails(),a={},b={};let samples;
 for(let i=0;i<30;i++)samples=trails.sample(a,'blade',pose(i/60));
 assert.equal(samples.length,TRAIL_FRAMES);close(samples[0].time,25/60);close(samples.at(-1).time,29/60);
 assert.equal(trails.sample(a,'second-blade',pose(.5)).length,1);
 assert.equal(trails.sample(b,'blade',pose(.5)).length,1);
 assert.equal(samples.length,5);
});

test('repainting a paused attack does not erase or duplicate its motion history',()=>{
 const trails=new MotionTrails(),e={};for(let i=0;i<5;i++)trails.sample(e,'blade',pose(i/60));
 const before=structuredClone(trails.sample(e,'blade',pose(4/60)));
 for(let i=0;i<100;i++)assert.deepEqual(trails.sample(e,'blade',pose(4/60)),before);
});

test('tail sections taper continuously to a transparent point and disappear after the swing',()=>{
 const trails=new MotionTrails(),e={};let samples;
 for(let i=0;i<5;i++)samples=trails.sample(e,'blade',pose(i/60));
 const sections=ribbonSections(samples,4/60,project);assert.equal(sections.length,5);
 close(sections[0].alpha,0);assert.deepEqual(sections[0].inner,sections[0].outer);
 for(let i=1;i<sections.length;i++){assert.ok(sections[i].width>sections[i-1].width);assert.ok(sections[i].alpha>sections[i-1].alpha);}
 close(sections.at(-1).width,1);
 const fading=ribbonSections(samples,4/60+TRAIL_FADE/2,project);close(fading.at(-1).alpha,sections.at(-1).alpha/2);
 assert.deepEqual(trails.sample(e,'blade',pose(4/60+TRAIL_FADE+.001,{active:false})),[]);
});

test('a new swing, form, teleport, time rewind or visibility gap cannot bridge unrelated positions',()=>{
 for(const next of [pose(.05,{key:'attack-2'}),pose(.05,{key:'transformed'}),pose(.05,{anchor:point(40,20)}),pose(-1),pose(1)]){
  const trails=new MotionTrails(),e={};for(let i=0;i<3;i++)trails.sample(e,'blade',pose(i/60));
  const samples=trails.sample(e,'blade',next);assert.equal(samples.length,1);close(samples[0].time,next.time);
 }
});

test('captured blade coordinates follow the current camera and resolution, without retaining screen pixels',()=>{
 const matrix={a:0,b:80,c:-80,d:0,e:1000,f:600};
 const captured=captureBlade(matrix,2,40,point(500,300),point(1,0),point(2,0));
 assert.deepEqual(captured,{inner:point(0,1),outer:point(0,2)});
 const sample={anchor:point(12,14),...captured};
 const first=projectBlade(sample,()=>point(300,400),40),moved=projectBlade(sample,()=>point(250,390),60);
 assert.deepEqual(first,{inner:point(300,440),outer:point(300,480)});
 assert.deepEqual(moved,{inner:point(250,450),outer:point(250,510)});
});
