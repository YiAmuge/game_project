import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Game } from '../src/game.js';
import { WORLD } from '../src/data.js';
import { FRAMES,visualForm,spriteHeight } from '../src/art.js';
import { walkingBodyForm } from '../src/walk-animation.js';
import { decodePNG } from '../tools/png.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function arena(key='meursault'){
 const g=new Game(key,'top',{seed:47}),e=g.player;
 for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};
 Object.assign(e,{x:30,y:20});g.units=[e];g.effects=[];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};g.input.aim={x:40,y:20};return {g,e};
}
test('Meursault walks through all six frames using actual movement and returns to idle immediately when stopped',()=>{
 const {g,e}=arena(),seen=new Set();assert.equal(walkingBodyForm(g,e),null);g.input.x=1;
 for(let i=0;i<24;i++){g.step(1/30);const f=walkingBodyForm(g,e);seen.add(f);assert.equal(walkingBodyForm(g,e),f,'rendering twice cannot advance the phase');assert.equal(visualForm(g,e),'meursault','portraits and weapons keep the original body form');}
 assert.deepEqual([...seen].sort(),Array.from({length:6},(_,i)=>`meursaultWalk${i}`));
 g.input.x=0;g.step(1/30);assert.equal(walkingBodyForm(g,e),null);
});
test('Rooted movement input and blocked movement do not animate walking',()=>{
 const {g,e}=arena();g.input.x=1;e.status.root={amount:1,until:.5};g.step(1/30);close(e.x,30);assert.equal(walkingBodyForm(g,e),null);
 g.time=.6;g.map.walls=[{x:e.x+e.radius+.001,y:18,w:1,h:4}];g.step(1/30);close(e.x,30);assert.equal(walkingBodyForm(g,e),null);
});
test('Meursault still walks when his passive converts an incoming root to silence',()=>{
 const {g,e}=arena();g.status(e,'root',1,.5);g.input.x=1;g.step(1/30);assert.ok(e.x>30);assert.ok(g.stat(e,'silence'));assert.ok(walkingBodyForm(g,e));
});
test('Walking follows distance, including slower movement, and does not advance during a stationary attack or teleport',()=>{
 const normal=arena(),slow=arena();normal.g.input.x=slow.g.input.x=1;slow.g.status(slow.e,'slow',.5,3);
 for(let i=0;i<5;i++){normal.g.step(1/30);slow.g.step(1/30);}
 assert.notEqual(walkingBodyForm(normal.g,normal.e),walkingBodyForm(slow.g,slow.e));
 normal.g.input.x=0;normal.g.input.fire=true;normal.g.step(1/30);assert.ok(normal.e.attackSerial);assert.equal(walkingBodyForm(normal.g,normal.e),null);
 normal.g.input.fire=false;normal.e.x+=10;normal.g.step(1/30);assert.equal(walkingBodyForm(normal.g,normal.e),null);
});
test('The same walking animation works for bots while other champions remain on their body sprites',()=>{
 const {g,e}=arena();e.player=false;g.aiChampion=(unit,dt)=>g.moveToward(unit,{x:40,y:20},dt);g.step(1/30);assert.ok(walkingBodyForm(g,e)?.startsWith('meursaultWalk'));
 const other=arena('faust');other.g.input.x=1;other.g.step(1/30);assert.equal(walkingBodyForm(other.g,other.e),null);assert.equal(visualForm(other.g,other.e),'faust');
 e.alive=false;assert.equal(walkingBodyForm(g,e),null);
});
test('All six frames have exactly the original upper body, original scale and common feet registration',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../src/assets/sprites-v36.json',import.meta.url))),meta=manifest.animations.meursaultWalk;
 const original=decodePNG(await readFile(new URL('../src/assets/champions-v36.png',import.meta.url))),walk=decodePNG(await readFile(new URL('../src/assets/meursault-walk.png',import.meta.url))),base=FRAMES.meursault,[px,py]=meta.padding;
 assert.equal(meta.frames.length,6);assert.equal(meta.source,'exec-c695953f-e4ce-4253-a8da-f81fed871cb9.png');
 const legs=new Set();for(const key of meta.frames){const f=FRAMES[key];assert.equal(f.sheet,11);close(f.h*f.foot[1]-f.crownOffset,400);close(spriteHeight(key)/f.h,spriteHeight('meursault')/base.h);close(f.w*f.foot[0]-px,base.w*base.foot[0]);close(f.h*f.foot[1]-py,base.h*base.foot[1]);
  for(let y=0;y<meta.waistRow;y++){const start=((base.y+y)*original.width+base.x)*4,at=((f.y+py+y)*walk.width+f.x+px)*4;assert.deepEqual(walk.data.subarray(at,at+base.w*4),original.data.subarray(start,start+base.w*4),`${key} upper row ${y}`);}
  const hash=createHash('sha256');for(let y=py+meta.waistRow;y<f.h;y++)hash.update(walk.data.subarray((y*walk.width+f.x)*4,(y*walk.width+f.x+f.w)*4));legs.add(hash.digest('hex'));
  for(let y=0;y<f.h;y++){assert.equal(walk.data[(y*walk.width+f.x)*4+3],0);assert.equal(walk.data[(y*walk.width+f.x+f.w-1)*4+3],0);}
 }
 assert.equal(legs.size,6);for(let i=3;i<walk.data.length;i+=4)assert.ok(walk.data[i]===0||walk.data[i]===255);
});
