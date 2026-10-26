import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../src/vendor/three.js';
import {WORLD,TERRAIN,terrainContains,BUSHES} from '../src/data.js';
import {roofOutline,roofSegments,RooftopScenery,ROOFTOP_ASSETS,ROOFTOP} from '../src/rooftop.js';
import {regionContains} from '../src/geometry.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const match={bounds:WORLD,terrain:TERRAIN};

test('the rooftop silhouette matches the existing playable terrain, including narrowed corners and rear wings',()=>{
 const p=roofOutline(match),inside=(x,y)=>{let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
 for(let x=WORLD.x+.123;x<WORLD.x+WORLD.w;x+=.37)for(let y=WORLD.y+.147;y<WORLD.y+WORLD.h;y+=.37)assert.equal(inside(x,y),terrainContains(x,y),`roof at ${x},${y}`);
 assert.equal(p.length,20);for(const edge of roofSegments(match)){near(Math.hypot(edge.b[0]-edge.a[0],edge.b[1]-edge.a[1]),edge.length);assert.ok(edge.length>0);}
 const practice={bounds:{x:0,y:0,w:83.2,h:46.8}};assert.deepEqual(roofOutline(practice),[[0,0],[83.2,0],[83.2,46.8],[0,46.8]]);
});
test('skyscraper windows descend below the exact roof edges and the distant backdrop never writes gameplay depth',()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;globalThis.Image=class{addEventListener(){}};globalThis.document={getElementById:()=>null,createElement:()=>({getContext:()=>({createLinearGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 try{
  const art=new RooftopScenery(()=>{}),parent=new THREE.Group(),g=art.build(match,parent),windows=g.children.filter(o=>o.name==='skyscraper-windows'),sky=art.background.children.filter(o=>o.name==='crimson-city-backdrop');
  assert.equal(windows.length,roofSegments(match).length);for(const w of windows){near(w.position.y+w.geometry.parameters.height/2,-.16);assert.equal(w.geometry.parameters.height,ROOFTOP.depth);assert.equal(w.material.map,art.textures.windows);assert.ok(w.material.map.userData.rooftopShared);}
  for(const fog of g.children.filter(o=>o.name==='blue-smoke-below'))assert.ok(fog.position.y+fog.geometry.parameters.height/2<=-ROOFTOP.depth+9);
  assert.equal(ROOFTOP.windowWidth,12*3);assert.equal(ROOFTOP.windowHeight,12*3);assert.equal(sky.length,1);for(const s of sky){assert.equal(s.material.depthWrite,false);assert.equal(s.material.depthTest,false);assert.equal(s.material.fog,false);assert.ok(s.renderOrder<0);assert.equal(s.geometry.parameters.width,WORLD.w+12);near(s.geometry.parameters.width/s.geometry.parameters.height,ROOFTOP.skyAspect);assert.ok(s.geometry.parameters.height>39);assert.deepEqual(Array.from(s.geometry.getAttribute('uv').array).filter((_,i)=>i%2),[1,1,0,0]);}
  const slab=g.children.find(o=>o.name==='roof-slab');assert.ok(slab.geometry.getAttribute('position').count>0);near(slab.position.y,-.12);
  near(sky[0].position.x+(ROOFTOP.skyOutletX-.5)*sky[0].geometry.parameters.width,WORLD.x+WORLD.w/2);
 }finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
test('rooftop painting, smoke and window images have local provenance and stable checksums',async()=>{
 const meta=JSON.parse(await readFile(new URL('../src/assets/rooftop-v53.json',import.meta.url),'utf8'));
 assert.equal(meta.reference,'background.jpg');for(const [key,name]of Object.entries(ROOFTOP_ASSETS)){const bytes=await readFile(new URL(`../src/assets/${name}.png`,import.meta.url));assert.equal(bytes.readUInt32BE(0),0x89504e47);assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.assets[key].sha256);assert.ok(bytes.readUInt32BE(16)>=1024);}
});
test('blue smoke uses the existing bush polygons and does not add or remove concealment',()=>{
 assert.equal(BUSHES.length,32);for(const b of BUSHES){assert.ok(b.w>0&&b.h>0);if(!b.polygon){assert.equal(regionContains(b,{x:b.x+b.w/2,y:b.y+b.h/2}),true);assert.equal(regionContains(b,{x:b.x-.01,y:b.y+b.h/2}),false);}}
});
