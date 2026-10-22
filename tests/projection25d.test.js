import test from 'node:test';
import assert from 'node:assert/strict';
import { Camera25D } from '../src/camera-25d.js';
import { sceneryPixelRatio,feetOffset,projectFeet,sceneryPan,sceneryOutline } from '../src/projection-25d.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('3D scenery stays within its pixel budget at desktop, retina and ultrawide sizes',()=>{
 for(const [w,h] of [[1920,1080],[3840,2160],[2560,1080],[390,844],[240,320]])for(const dpr of [1,2,3]){
  const r=sceneryPixelRatio(w,h,dpr);assert.ok(r>0&&r<=1);assert.ok(w*h*r*r<=921601);
 }
});
test('all upright unit feet are placed on the projected ground independently of the pitched camera',()=>{
 const c=new Camera25D();c.update(1440,900,{x:20,y:30});
 for(const e of [{kind:'champion'}, {kind:'champion',trainingDummy:{}},{kind:'neutral',camp:'central'}, {kind:'neutral',camp:'boss'}, {kind:'minion'}, {kind:'minion',ranged:true},{kind:'minion',siege:true}]){
  Object.assign(e,{x:21,y:30});const p=projectFeet(c,e),feet=c.worldToScreen(e,.075);close(p.x,feet.x);close(p.y,feet.y);
  const originalFeetY=e.y+feetOffset(e),screenY=p.y+(originalFeetY-e.y-p.offset)*p.scale;close(screenY,feet.y);
 }
});
test('cached orthographic scenery pans exactly with ground, wall tops and tower tops',()=>{
 const c=new Camera25D();
 for(const [w,h] of [[1440,900],[390,844],[2560,1080]]){
  const start={x:24,y:35};c.update(w,h,start);
  const points=[{x:27,y:39},{x:30,y:32},{x:20,y:38}];
  const old=points.flatMap(p=>[0,1.5,3].map(z=>({p,z,s:c.worldToScreen(p,z)})));
  c.update(w,h,{x:25.7,y:36.2});const pan=sceneryPan(c,start);
  for(const {p,z,s} of old){const now=c.worldToScreen(p,z);close(now.x,s.x+pan.x);close(now.y,s.y+pan.y);}
 }
});
test('floor-effect masks include the full projected wall volume',()=>{
 const c=new Camera25D();c.update(1440,900,{x:20,y:30});const rect={x:15,y:30.5,w:10,h:.8,height:1.51},hull=sceneryOutline(c,rect);
 assert.ok(hull.length>=4);const cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
 for(const x of [rect.x,rect.x+rect.w])for(const y of [rect.y,rect.y+rect.h])for(const z of [0,rect.height]){
  const p=c.worldToScreen({x,y},z);const sides=hull.map((a,i)=>cross(a,hull[(i+1)%hull.length],p));assert.ok(sides.every(v=>v>=-1e-6)||sides.every(v=>v<=1e-6));
 }
});

test('leap lift matches the visual height at launch, apex and landing',async()=>{const {leapLift}=await import('../src/projection-25d.js');for(const height of [3,5]){const e={motion:{kind:'leap',minDuration:.7,elapsed:0,arcHeight:height}};assert.equal(leapLift(e),0);e.motion.elapsed=.35;assert.equal(leapLift(e),height);e.motion.elapsed=.7;assert.ok(Math.abs(leapLift(e))<1e-9);}});
