import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHAMPIONS } from '../src/data.js';
import { Game } from '../src/game.js';
import { FRAMES,visualForm,spriteHeight } from '../src/art.js';
import { SPRITE_FRAMES } from '../src/sprites-v36.js';
import { WEAPON_ART,HANDLE_EXTENSIONS,weaponGeometry,drawWeapon } from '../src/weapon-art.js';
import { projectileAsset } from '../src/projectile-vfx.js';
import { decodePNG } from '../tools/png.mjs';

test('all 29 champions and their three temporary body forms use latest equal-height art',()=>{
 for(const key of [...Object.keys(CHAMPIONS),'soraEgo','yanDistorted','queequegUlt']){const f=FRAMES[key];assert.equal(f.sheet,9,key);assert.equal(f.referenceHeight,400,key);assert.equal(f.heightBasis,'crown');assert.ok(Math.abs(f.h*f.foot[1]-f.crownOffset-400)<1e-8,key);assert.ok(Math.abs(spriteHeight(key)*(f.foot[1]-f.crownOffset/f.h)-2.1)<1e-9,key);if(['soraEgo','rudolph','dongbaek','alisa','marton'].includes(key))assert.ok(f.h>400,key);assert.ok(f.w>0);const [x,y,w,h]=f.face;assert.ok(x>=0&&y>=0&&x+w<=f.w&&y+h<=f.h,key+' portrait must not sample a neighboring sprite');}
 assert.equal(Object.values(SPRITE_FRAMES).filter(f=>f.sheet===9).length,32);
 for(const key of Object.keys(CHAMPIONS)){assert.ok(WEAPON_ART[key],key);assert.equal(FRAMES[WEAPON_ART[key][0]].sheet,10,key);}
});
test('separate body and weapon revisions retain the actual last user-approved sources',()=>{
 const latest={yi:'4514bc2e',faust:'4514bc2e',myo:'62c2b150',rudolph:'62c2b150',queequegUlt:'f11b4e23',yan:'fd5af700',sora:'fd5af700',dongbaekFan:'3c8d3b2a',dongrangScythe:'3c8d3b2a',myoRifle:'ddcdf24a',myoDagger:'ddcdf24a',rudolphStaff:'ddcdf24a',donLance:'a771ab59',sinclairHalberd:'7f3e21e2',starbuckHarpoon:'5551e26f'};
 for(const [key,id] of Object.entries(latest))assert.ok(FRAMES[key].source.startsWith('exec-'+id),key);
 assert.notEqual(FRAMES.yi.source,FRAMES.yiDagger.source);
});
test('packed sprites have binary alpha, transparent gutters and no out-of-sheet samples',async()=>{
 for(const [sheet,name] of [[9,'champions'],[10,'weapons']]){
  const a=decodePNG(await readFile(new URL(`../src/assets/${name}-v36.png`,import.meta.url)));
  for(let i=3;i<a.data.length;i+=4)assert.ok(a.data[i]===0||a.data[i]===255);
  for(const [key,f] of Object.entries(SPRITE_FRAMES).filter(([,f])=>f.sheet===sheet)){
   assert.ok(f.x>0&&f.y>0&&f.x+f.w<a.width&&f.y+f.h<a.height,key);
   for(let x=f.x-1;x<=f.x+f.w;x++){assert.equal(a.data[((f.y-1)*a.width+x)*4+3],0,key);assert.equal(a.data[((f.y+f.h)*a.width+x)*4+3],0,key);}
   for(let y=f.y-1;y<=f.y+f.h;y++){assert.equal(a.data[(y*a.width+f.x-1)*4+3],0,key);assert.equal(a.data[(y*a.width+f.x+f.w)*4+3],0,key);}
  }
 }
});
test('long handles extend only the intended shaft interval, leaving the metal head unstretched',()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;
 globalThis.Image=class{complete=true;naturalWidth=2048;};globalThis.document={getElementById:()=>null};
 try{for(const [key,e] of Object.entries(HANDLE_EXTENSIONS)){
  const f=FRAMES[key],m=weaponGeometry(key,2),calls=[],c={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...args){calls.push(args);}};
  assert.ok(m.span>2);assert.ok(e.scale>1);assert.ok(drawWeapon(c,key,2));assert.equal(calls.length,e.from===0?2:3);
  const last=calls.at(-1),headStart=Math.round(f.w*e.to);assert.equal(last[1],f.x+headStart);assert.equal(last[3],f.w-headStart);assert.equal(last[7],last[3]);
 }}finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
test('Queequeg alone swaps to her mask during the ultimate buff and restores when it expires',()=>{
 const g=new Game('queequeg'),p=g.player,ally=g.makeChampion('faust',0,2);g.addBuff(p,'queequegUlt',4);g.addBuff(ally,'queequegUlt',4);
 assert.equal(visualForm(g,p),'queequegUlt');assert.equal(visualForm(g,ally),'faust');g.time+=4.01;assert.equal(visualForm(g,p),'queequeg');
});
test('missiles use the corresponding latest independent weapon rather than another champion’s art',()=>{
 for(const [key,asset] of [['ppui','ppuiNail'],['ahab','ahabHarpoon'],['starbuck','starbuckHarpoon'],['ishmael','ishmaelMace'],['nelly','nellyKnife'],['rodya','rodyaAxe']])assert.equal(projectileAsset({source:{key}}),asset);
 assert.equal(FRAMES.myoRifle.sheet,10);assert.equal(FRAMES.myoDagger.sheet,10);assert.notEqual(FRAMES.ishmaelMace.x,FRAMES.ishmaelShield.x);
});
