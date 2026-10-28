// Cut the latest approved camp/building images into grounded game sprites.
// No repainting, recoloring, stretching, or generated-source substitution.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {decodePNG,encodePNG} from './png.mjs';

const sourceRoot=resolve(process.argv[2]||'/workspace/generated_images');
const sources={
 leccakiIdle:'exec-88741915-c245-4e48-97da-5a4aac7a0f78.png',
 leccakiAttack:'exec-7274a9c9-17af-454e-9632-b2809a36b39f.png',
 sisyphusIdle:'exec-879a5f70-af22-425c-8c71-a864b4bc62f0.png',
 sisyphusAttack:'exec-b920172d-50e6-432e-9714-ab3adcf7b825.png',
 uniform:'exec-36fa0b6b-cfd1-4fc2-81fc-dd4397b1847e.png',
 suit:'exec-c7bd15e4-fcf8-486e-bc58-37e2ea762f01.png',
};
const provenance=[],images={};
function silhouettes(im){
 const {width:w,height:h,data}=im,seen=new Uint8Array(w*h),queue=new Int32Array(w*h),parts=[];
 for(let p=0;p<w*h;p++){
  if(seen[p]||data[p*4+3]<192)continue;
  let head=0,count=1,l=w,t=h,r=0,b=0;queue[0]=p;seen[p]=1;
  while(head<count){
   const at=queue[head++],x=at%w,y=at/w|0;l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1);
   for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){
    const next=yy*w+xx;if(seen[next]||data[next*4+3]<192)continue;seen[next]=1;queue[count++]=next;
   }
  }
  if(count>10000)parts.push({l,t,r,b,pixels:queue.slice(0,count)});
 }
 return parts.sort((a,b)=>Math.floor(a.t/(h/2))-Math.floor(b.t/(h/2))||a.l-b.l);
}
for(const [key,file] of Object.entries(sources)){
 const bytes=await readFile(resolve(sourceRoot,file)),im=decodePNG(bytes),parts=silhouettes(im),expected=['uniform','suit'].includes(key)?4:key.startsWith('leccaki')?2:1;
 if(parts.length!==expected)throw Error(`${file}: expected ${expected} separate silhouettes, found ${parts.length}`);
 images[key]={im,parts};provenance.push({key,file,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const entries=[];
for(const pose of ['Idle','Attack'])for(const [variant,index] of [['Teal',0],['Brown',1]])entries.push({key:`leccaki${variant}${pose}`,source:`leccaki${pose}`,index,kind:'neutral',camp:'side',variant,pose:pose.toLowerCase()});
for(const pose of ['Idle','Attack'])entries.push({key:`sisyphus${pose}`,source:`sisyphus${pose}`,index:0,kind:'neutral',camp:'central',pose:pose.toLowerCase()});
for(const family of ['uniform','suit'])for(const [index,[color,kind]] of [['blue','tower'],['blue','core'],['red','tower'],['red','core']].entries())entries.push({key:`${family}_${color}_${kind}`,source:family,index,kind,family,color});

const pad=8,referenceHeight=400,sprites=entries.map(entry=>{
 const {im,parts}=images[entry.source],p=parts[entry.index],mask=new Uint8Array(im.width*im.height);for(const at of p.pixels)mask[at]=1;
 // Hardware height excludes the translucent intake wisps. The base itself,
 // boots, and slime puddle all anchor at their lowest connected solid pixel.
 const crown=entry.kind==='core'?(entry.family==='uniform'?[81,680]:[83,684])[entry.color==='red'?1:0]:p.t;
 const ground=p.b,k=referenceHeight/(ground-crown),w=Math.ceil((p.r-p.l)*k)+pad*2,h=Math.ceil((p.b-p.t)*k)+pad*2,data=new Uint8Array(w*h*4);
 let anchor=(p.l+p.r)/2;
 if(entry.camp==='side'){
  let left=im.width,right=0;for(const at of p.pixels)if((at/im.width|0)>=p.b-(p.b-p.t)*.09){left=Math.min(left,at%im.width);right=Math.max(right,at%im.width+1);}anchor=(left+right)/2;
 }
 let groundAnchor;
 if(entry.kind==='core'){
  // The headquarters' world location is the center of its round footprint,
  // not the front lip. Opposite plinth side corners define its ground midline.
  const edge=(p.r-p.l)*.02;let left=-Infinity,right=-Infinity;
  for(const at of p.pixels){const x=at%im.width,y=at/im.width|0;if(x<=p.l+edge)left=Math.max(left,y);if(x>=p.r-1-edge)right=Math.max(right,y);}
  if(!Number.isFinite(left+right))throw Error('Missing headquarters footprint corners');
  groundAnchor=[(pad+(anchor-p.l)*k)/w,(pad+((left+right)/2+1-p.t)*k)/h];
 }
 for(let y=pad;y<h-pad;y++)for(let x=pad;x<w-pad;x++){
  const sx=Math.min(p.r-1,p.l+Math.floor((x-pad)/k)),sy=Math.min(p.b-1,p.t+Math.floor((y-pad)/k)),from=sy*im.width+sx,at=(y*w+x)*4;
  if(mask[from]){data.set(im.data.subarray(from*4,from*4+3),at);data[at+3]=255;}
 }
 return{key:entry.key,w,h,data,meta:{...Object.fromEntries(Object.entries(entry).filter(([key])=>!['key','source','index'].includes(key))),sheet:16,source:sources[entry.source],sourceRect:[p.l,p.t,p.r-p.l,p.b-p.t],referenceHeight,heightScale:h/referenceHeight,crownOffset:pad+(crown-p.t)*k,foot:[(pad+(anchor-p.l)*k)/w,(pad+(ground-p.t)*k)/h],...(groundAnchor?{ground:groundAnchor,groundBasis:'plinth-footprint-center'}:{}),heightBasis:entry.kind==='core'?'hardware-to-base':'crown-to-ground'}};
});
const width=2048;let x=pad,y=pad,row=0;
for(const s of sprites){if(x+s.w+pad>width){x=pad;y+=row+pad;row=0;}s.x=x;s.y=y;x+=s.w+pad;row=Math.max(row,s.h);}
const height=y+row+pad,data=new Uint8Array(width*height*4),frames={};await mkdir('src/assets/world',{recursive:true});
for(const s of sprites){
 for(let yy=0;yy<s.h;yy++)data.set(s.data.subarray(yy*s.w*4,(yy+1)*s.w*4),((s.y+yy)*width+s.x)*4);
 frames[s.key]={x:s.x,y:s.y,w:s.w,h:s.h,...s.meta};await writeFile(`src/assets/world/${s.key}.png`,encodePNG({width:s.w,height:s.h,data:s.data}));
}
await writeFile('src/assets/world-v69.png',encodePNG({width,height,data}));
await writeFile('src/assets/world-v69.json',JSON.stringify({provenance,extraction:'Latest approved sources; alpha >= 192, connected silhouettes, no detached residue, original RGB, uniform scale; ground anchors exclude all transparent padding.',frames},null,2)+'\n');
await writeFile('src/world-sprites.js','// Generated by tools/import-world.mjs; latest source hashes are in assets/world-v69.json.\nexport const WORLD_FRAMES='+JSON.stringify(frames,null,2)+';\n');
console.log(`Imported ${sprites.length} grounded camp/building sprites into ${width}x${height}.`);
