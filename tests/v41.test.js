import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHAMPIONS } from '../src/data.js';
import { WEAPON_ART,weaponGeometry,gripPivot,drawWeapon } from '../src/weapon-art.js';
import { UNCHANGED_HANDS,TWO_HANDED_GRIPS,BARE_HAND_COLORS,gripAppearance,gripLayout } from '../src/weapon-grips.js';
import { decodePNG } from '../tools/png.mjs';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('all held weapons have the requested glove or body skin tone, with the five existing hand styles excluded',()=>{
 const black=['sinclair','hohenheim','gubo','gahwan','myo','rudolph','yan','kim','jamila'],brown=['alisa','dongrang'];
 assert.deepEqual([...UNCHANGED_HANDS].sort(),['meursault','sora','ppui','queequeg','gregor'].sort());
 for(const key of Object.keys(CHAMPIONS)){const p=gripAppearance(key);if(UNCHANGED_HANDS.has(key)){assert.equal(p,null,key);continue;}assert.ok(p,key);assert.equal(p.material,black.includes(key)?'black':brown.includes(key)?'brown':key==='ahab'?'white':'skin',key);if(p.material==='skin')assert.equal(p.base,BARE_HAND_COLORS[key]);}
 assert.equal(Object.keys(BARE_HAND_COLORS).length,13);
});
test('two-handed shafts include a middle support hand for Rudolph',()=>{
 assert.deepEqual([...TWO_HANDED_GRIPS].sort(),['sinclair','marton','honglu','dongrang','hohenheim','rudolph'].sort());
 for(const key of Object.keys(CHAMPIONS)){const [asset,length]=WEAPON_ART[key],points=gripLayout(key,asset,weaponGeometry(asset,length),gripPivot(key));assert.equal(points.length,UNCHANGED_HANDS.has(key)?0:TWO_HANDED_GRIPS.has(key)?2:1,key);if(points.length===2){if(key==='rudolph')close(points[1].x,(.5-gripPivot(key))*weaponGeometry(asset,length).span);else close(points[1].x-points[0].x,.27);assert.equal(points[1].offHand,true);}for(const p of points){assert.ok(Math.abs(p.x)<(key==='rudolph'?.9:.5)&&Math.abs(p.y)<.35,key);}}
});
test('every chosen grip touches opaque handle pixels in the latest independent weapon source',async()=>{
 const original=decodePNG(await readFile(new URL('../src/assets/weapons-v36.png',import.meta.url))),jamila=decodePNG(await readFile(new URL('../src/assets/jamila-v62.png',import.meta.url)));
 for(const key of Object.keys(CHAMPIONS)){const [asset,length]=WEAPON_ART[key],m=weaponGeometry(asset,length);for(const p of gripLayout(key,asset,m,gripPivot(key))){const png=m.frame.sheet===15?jamila:original,x=m.frame.x+Math.round(p.source[0]*m.frame.w),y=m.frame.y+Math.round(p.source[1]*m.frame.h);assert.equal(png.data[(y*png.width+x)*4+3],255,key+' must grip the handle');}}
});
test('grips match the actual drawn shaft slices after extension, source rotation and size changes',()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;globalThis.Image=class{complete=true;naturalWidth=2048;};globalThis.document={getElementById:()=>null};
 try{for(const key of ['don','sinclair','starbuck','honglu','dongrang','dongbaek','marton','hohenheim']){
  const [asset,length]=WEAPON_ART[key],m=weaponGeometry(asset,length),pivot=gripPivot(key),points=gripLayout(key,asset,m,pivot),stack=[],calls=[];let a=[1,0,0,1,0,0];
  const c={save(){stack.push([...a]);},restore(){a=stack.pop();},translate(x,y){a[4]+=a[0]*x+a[2]*y;a[5]+=a[1]*x+a[3]*y;},rotate(t){const [x,y,z,w]=a,cs=Math.cos(t),sn=Math.sin(t);a[0]=x*cs+z*sn;a[1]=y*cs+w*sn;a[2]=-x*sn+z*cs;a[3]=-y*sn+w*cs;},scale(x,y){a[0]*=x;a[1]*=x;a[2]*=y;a[3]*=y;},drawImage(image,...rect){calls.push({rect,m:[...a]});}};
  assert.ok(drawWeapon(c,asset,length,{pivot}));for(const p of points){const sx=m.frame.x+p.source[0]*m.frame.w,sy=m.frame.y+p.source[1]*m.frame.h,call=calls.find(({rect:r})=>sx>=r[0]&&sx<=r[0]+r[2]&&sy>=r[1]&&sy<=r[1]+r[3]);assert.ok(call,key);const {rect:r,m:t}=call,x=r[4]+(sx-r[0])/r[2]*r[6],y=r[5]+(sy-r[1])/r[3]*r[7];close(t[0]*x+t[2]*y+t[4],p.x);close(t[1]*x+t[3]*y+t[5],p.y);}
 }}finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
test('gun grips use the trigger area and all hand palettes have valid light and shadow colors',()=>{
 for(const [key,asset,pivot,source] of [['gubo','guboRifle',.12,[.27,.60]],['myo','myoRifle',.32,[.25,.77]]]){const p=gripLayout(key,asset,weaponGeometry(asset,2.4),pivot)[0];assert.equal(p.kind,'gun');close(p.source[0],source[0]);close(p.source[1],source[1]);}
 for(const key of Object.keys(CHAMPIONS)){const p=gripAppearance(key);if(!p)continue;for(const k of ['base','light','shadow','outline'])assert.match(p[k],/^#[0-9a-f]{6}$/i);for(const i of [1,3,5]){const n=k=>parseInt(p[k].slice(i,i+2),16);assert.ok(n('shadow')<=n('base')&&n('light')>=n('base'),key);}}
});
