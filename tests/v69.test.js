import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game} from '../src/game.js';
import {WORLD_ART,campPresentation,campVisualHeight,structurePresentation,structureVisualHeight,factionFor} from '../src/world-art.js';
import {WORLD_FRAMES} from '../src/world-sprites.js';
import {minionPresentation} from '../src/minion-art.js';
import {feetOffset,projectFeet,airborneShadow} from '../src/projection-25d.js';
import {Camera25D} from '../src/camera-25d.js';
import {MONSTER_GUIDE} from '../src/reference-content.js';
import {decodePNG} from '../tools/png.mjs';

const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('camp and building atlas contains only the latest six approved source images and fourteen complete poses',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../src/assets/world-v69.json',import.meta.url)));
 assert.deepEqual(manifest.frames,WORLD_FRAMES);assert.equal(Object.keys(WORLD_FRAMES).length,14);
 assert.deepEqual(manifest.provenance.map(p=>p.file),[
  'exec-88741915-c245-4e48-97da-5a4aac7a0f78.png','exec-7274a9c9-17af-454e-9632-b2809a36b39f.png',
  'exec-879a5f70-af22-425c-8c71-a864b4bc62f0.png','exec-b920172d-50e6-432e-9714-ab3adcf7b825.png',
  'exec-36fa0b6b-cfd1-4fc2-81fc-dd4397b1847e.png','exec-c7bd15e4-fcf8-486e-bc58-37e2ea762f01.png',
 ]);assert.ok(manifest.provenance.every(p=>/^[a-f0-9]{64}$/.test(p.sha256)));
 const atlas=decodePNG(await readFile(new URL('../src/assets/world-v69.png',import.meta.url)));
 for(const [key,f] of Object.entries(WORLD_FRAMES)){
  const im=decodePNG(await readFile(new URL(`../src/assets/world/${key}.png`,import.meta.url)));let solid=0,bottom=0;
  assert.equal(im.width,f.w);assert.equal(im.height,f.h);near(f.h*f.foot[1]-f.crownOffset,400);
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
   const at=(y*f.w+x)*4,from=((f.y+y)*atlas.width+f.x+x)*4,a=im.data[at+3];assert.ok(a===0||a===255);
   for(let channel=0;channel<4;channel++)assert.equal(im.data[at+channel],atlas.data[from+channel]);
   if(a){solid++;bottom=Math.max(bottom,y+1);assert.ok(x>=7&&x<f.w-7&&y>=7&&y<f.h-7,`${key} clipped`);}
  }
  assert.ok(solid>10000);assert.ok(Math.abs(bottom-f.h*f.foot[1])<1.01,`${key} has padding below its ground anchor`);
 }
});
test('both base-front camps spawn one of each Leccaki costume and retain the costume through death and respawn',()=>{
 const g=new Game('faust','top',{seed:69});
 for(const id of ['side-west','side-east']){
  const pair=g.units.filter(e=>e.campId===id);assert.equal(pair.length,2);assert.deepEqual(pair.map(e=>e.creepVariant),[0,1]);
  for(const e of pair){assert.equal(e.name,'굶주린 르카키');assert.equal(e.maxHp,850);assert.equal(e.armor,15);assert.equal(e.damage,100);const before=campPresentation(g,e).key;g.kill(e,g.player);g.time=e.respawnAt;g.step(.001);assert.ok(e.alive);assert.equal(campPresentation(g,e).key,before);}
 }
});
test('real ordinary neutral hits select attack poses briefly, then idle, without changing damage or attack intervals',()=>{
 for(const camp of ['side','central'])for(const variant of [0,1]){
  const g=new Game('faust','top',{seed:69}),p=g.player;g.units=[p];g.time=10;const e=g.makeNeutral(p.x+1,p.y,camp);e.creepVariant=variant;
  const expected=camp==='side'?`leccaki${variant?'Brown':'Teal'}`:'sisyphus',hp=p.hp;
  assert.equal(campPresentation(g,e).key,expected+'Idle');g.simpleAttack(e,p);assert.equal(campPresentation(g,e).key,expected+'Attack');assert.ok(p.hp<hp);assert.equal(e.interval,camp==='side'?1.2:1.3);
  g.time=e.swingUntil;assert.equal(campPresentation(g,e).key,expected+'Idle');e.swingUntil=g.time+1;e.returning=true;assert.equal(campPresentation(g,e).key,expected+'Idle');
 }
});
test('neutral names and encyclopedia entries agree in matches, training and camp reset',async()=>{
 const Training=await import('../src/training.js');
 for(const mode of ['match','training']){const g=new Game('faust','top',{seed:69,mode});if(g.training)Training.resetCreeps(g);for(const e of g.units.filter(e=>['side','central'].includes(e.camp)))assert.equal(e.name,e.camp==='side'?'굶주린 르카키':'시지프의 잔재');}
 assert.equal(MONSTER_GUIDE.find(e=>e.id==='side').name,'굶주린 르카키');assert.equal(MONSTER_GUIDE.find(e=>e.id==='central').name,'시지프의 잔재');
});
test('every faction, color, role and successive wave uses corresponding building and minion families',()=>{
 const assignments=new Set();for(const seed of [68,69])for(const mode of ['match','training']){
  const g=new Game('faust','top',{seed,mode});assignments.add(g.minionFactions[0]);
  for(let wave=0;wave<3;wave++){g.spawnWave();g.time+=2;g.flushMinions();}
  for(const e of g.units.filter(e=>e.kind==='minion')){
   const p=minionPresentation(g,e),building=structurePresentation(g,{kind:'tower',team:e.team});
   assert.equal(p.f.family,building.family);assert.equal(p.f.color,building.color);assert.equal(building.color,e.team?'red':'blue');
  }
  for(const kind of ['tower','core'])for(const team of [0,1]){const e={kind,team},p=structurePresentation(g,e);assert.equal(p.key,`${g.minionFactions[team]}_${team?'red':'blue'}_${kind}`);}
 }
 assert.deepEqual([...assignments].sort(),['suit','uniform']);assert.equal(factionFor({minionFactions:['suit','uniform']},{team:0,faction:'uniform'}),'uniform');
});
test('all color/faction structures keep equal hardware height and near-identical width, with a 1.7-champion turret',()=>{
 near(WORLD_ART.towerHeight/WORLD_ART.championHeight,1.7);
 for(const kind of ['tower','core']){
  const poses=[];for(const family of ['uniform','suit'])for(const team of [0,1]){
   const e={kind,team,faction:family},g={},p=structurePresentation(g,e);poses.push(p);near(p.h*p.f.foot[1]-p.h*p.f.crownOffset/p.f.h,kind==='tower'?3.57:2.94);assert.equal(p.flip,kind==='tower'&&team===1);near(structureVisualHeight(g,e),-p.top);
  }
  const widths=poses.map(p=>p.w);assert.ok(Math.max(...widths)/Math.min(...widths)<1.02,`${kind} faction mismatch`);
 }
 near(campVisualHeight({camp:'central'}),1.35);near(campVisualHeight({camp:'side'}),2.1);
});
test('all fourteen rendered poses have boots, puddles and plinths on the projected ground at every tested camera size',()=>{
 for(const [width,height] of [[1440,950],[844,390],[2560,1080]]){
  const camera=new Camera25D();camera.update(width,height,{x:25,y:24});
  for(const [key,f] of Object.entries(WORLD_FRAMES))for(const facing of [0,Math.PI]){
   const e={x:25.25,y:24.5,kind:f.kind,camp:f.camp,creepVariant:f.variant==='Brown'?1:0,swingUntil:f.pose==='attack'?11:0,facing,team:f.color==='red'?1:0,faction:f.family};
   const p=e.kind==='neutral'?campPresentation({time:10},e):structurePresentation({},e),feet=projectFeet(camera,e),ground=camera.worldToScreen(e,.075);
   assert.equal(p.key,key);near(feetOffset(e),0);near(p.top+p.h*p.anchor[1],0);
   near(feet.y+(p.top+p.h*p.anchor[1]-feet.offset)*feet.scale,ground.y);near(p.left+p.w*p.anchor[0],0);near(p.w/p.h,f.w/f.h);
  }
 }
});
test('grounded building plinths do not receive the floating circular unit shadow; creature shadows remain',()=>{
 for(const kind of ['tower','core'])assert.equal(airborneShadow({kind}),false);
 for(const camp of ['side','central'])assert.equal(airborneShadow({kind:'neutral',camp}),true);
 assert.equal(airborneShadow({kind:'champion',key:'starbuck',motion:{kind:'leap'}}),false);
});
test('headquarters circular-footprint centers, rather than front lips, occupy the world ground position',async()=>{
 for(const [key,f]of Object.entries(WORLD_FRAMES).filter(([,f])=>f.kind==='core')){
  assert.equal(f.groundBasis,'plinth-footprint-center');assert.ok(f.ground[1]<f.foot[1]);
  const im=decodePNG(await readFile(new URL(`../src/assets/world/${key}.png`,import.meta.url)));let l=im.width,r=0,left=-1,right=-1;
  for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x+1);}
  const edge=(r-l)*.02;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){if(x<=l+edge)left=Math.max(left,y);if(x>=r-1-edge)right=Math.max(right,y);}
  near(f.ground[1]*f.h,(left+right)/2+1,1.6);
  const pose=structurePresentation({},{kind:'core',team:f.color==='red'?1:0,faction:f.family});near(pose.top+pose.h*f.ground[1],0);assert.ok(pose.top+pose.h*f.foot[1]>.2);
 }
});
