import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Game} from '../src/game.js';
import {FRAMES,ATLAS_FILES,spriteHeight,visualForm} from '../src/art.js';
import {JAMILA_FRAMES} from '../src/jamila-sprites.js';
import {equipmentPose,jamilaWeaponPose,weaponGeometry,weaponOrientation} from '../src/weapon-art.js';
import {gripAppearance,gripLayout} from '../src/weapon-grips.js';
import {feetOffset} from '../src/projection-25d.js';
import {decodePNG} from '../tools/png.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('new body and weapon frames use only the final armless generation and keep crown-to-sole height',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../src/assets/jamila-v62.json',import.meta.url))),source=await readFile(new URL('../src/assets/source/jamila-v62.png',import.meta.url));
 assert.equal(createHash('sha256').update(source).digest('hex'),manifest.source.sha256);
 for(const key of ['jamila','jamilaTrooper']){const f=FRAMES[key];assert.equal(f,JAMILA_FRAMES[key]);assert.equal(f.h,400);assert.equal(f.referenceHeight,400);near(spriteHeight(key),2.1);assert.equal(ATLAS_FILES[f.sheet],'jamila-v62');}
 assert.notEqual(FRAMES.jamila,FRAMES.jamilaTrooper);assert.notEqual(FRAMES.jamilaKopis,FRAMES.jamilaRifle);
});
test('packed silhouettes are separate, have transparent gutters and no detached debris',async()=>{
 const image=decodePNG(await readFile(new URL('../src/assets/jamila-v62.png',import.meta.url)));
 for(const [key,f]of Object.entries(JAMILA_FRAMES)){
  const points=new Set();for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)if(image.data[((f.y+y)*image.width+f.x+x)*4+3]>=24)points.add(y*f.w+x);
  const queue=[points.values().next().value];points.delete(queue[0]);for(let i=0;i<queue.length;i++){const n=queue[i],x=n%f.w,y=Math.floor(n/f.w);for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,j=yy*f.w+xx;if(xx>=0&&yy>=0&&xx<f.w&&yy<f.h&&points.delete(j))queue.push(j);}}
  assert.equal(points.size,0,key+' has detached pixels');
  for(let x=f.x-1;x<=f.x+f.w;x++)for(const y of [f.y-1,f.y+f.h])assert.equal(image.data[(y*image.width+x)*4+3],0,key);
  for(let y=f.y-1;y<=f.y+f.h;y++)for(const x of [f.x-1,f.x+f.w])assert.equal(image.data[(y*image.width+x)*4+3],0,key);
 }
});
test('black round glove positions touch both handles and coincide with the rotation axes',()=>{
 assert.equal(gripAppearance('jamila').material,'black');
 for(const [asset,pivot,gripY,length]of [['jamilaRifle',.238,.3,2.25],['jamilaKopis',.12,-.02,1.75]]){
  const m=weaponGeometry(asset,length),hands=gripLayout('jamila',asset,m,pivot);assert.equal(hands.length,asset==='jamilaRifle'?2:1);near(hands[0].x,0);near(hands[0].y-gripY*m.height*m.scale,0);
 }
});
test('tactical uses the shared swing pose, returns to rifle after the cut and dims only during reload',()=>{
 const g=new Game('jamila','bottom',{mode:'training'}),e=g.player;
 assert.equal(jamilaWeaponPose(g,e).asset,'jamilaRifle');e.state.lcaReload={progress:.2};near(jamilaWeaponPose(g,e).dim,.5);delete e.state.lcaReload;
 e.state.jamilaQ={phase:'dash',d:{x:1,y:0},angle:0};assert.equal(jamilaWeaponPose(g,e).asset,'jamilaKopis');
 e.state.jamilaQ.phase='slash';e.state.jamilaQ.slashAt=g.time;g.time+=.07;assert.equal(jamilaWeaponPose(g,e).mode,'swing');assert.ok(jamilaWeaponPose(g,e).trail);
 e.state.jamilaQ.phase='retreat';assert.equal(jamilaWeaponPose(g,e).asset,'jamilaRifle');
});
test('troopers retain champion proportions and grounded feet without a second weapon',()=>{
 const g=new Game('jamila','bottom',{mode:'training'});g.cast(g.player,'r',g.player);const u=g.units.find(e=>e.lcaTrooper);
 assert.equal(visualForm(g,u),'jamilaTrooper');assert.equal(jamilaWeaponPose(g,u).asset,'jamilaRifle');near(feetOffset(u),feetOffset(g.player));
 const a=equipmentPose(g,u);u.y+=2;const b=equipmentPose(g,u);near(b.right.y-a.right.y,2);
 for(const angle of [-Math.PI,-2,-1,0,1,2,Math.PI])assert.ok(Math.abs(weaponOrientation(angle).angle)<=Math.PI/2+1e-8);
});
