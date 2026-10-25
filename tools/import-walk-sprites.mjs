// Asset preparation: register the approved walking legs under the unchanged body.
import { readFile,writeFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { decodePNG,encodePNG } from './png.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source='exec-c695953f-e4ce-4253-a8da-f81fed871cb9.png';
const bytes=await readFile(resolve(process.argv[2]||'/workspace/generated_images',source));
const image=decodePNG(bytes),manifest=JSON.parse(await readFile(resolve(root,'src/assets/sprites-v36.json'),'utf8'));
const atlas=decodePNG(await readFile(resolve(root,'src/assets/champions-v36.png'))),body=manifest.frames.meursault;
const width=256,height=424,padX=27,padY=8,waist=289,count=6;
if(image.width%count)throw new Error('Expected six equally sized walking cells');
const cellWidth=image.width/count,data=new Uint8Array(width*count*height*4),frames={},registration=[];
const bronze=(p,i)=>p[i+3]>=160&&p[i]>p[i+1]*1.25&&p[i+1]>60&&p[i+2]<p[i+1]*.8;
function buckle(p,x,y,w,h){
 let left=Infinity,right=-Infinity;
 for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(bronze(p.data,(yy*p.width+xx)*4)){left=Math.min(left,xx);right=Math.max(right,xx);}
 if(!Number.isFinite(left))throw new Error('Missing belt registration');return (left+right)/2;
}
const bodyBuckle=buckle(atlas,body.x,body.y+265,body.w,23)-body.x;
for(let n=0;n<count;n++){
 const sx=n*cellWidth;let top=image.height,bottom=0;
 for(let y=0;y<image.height;y++)for(let x=sx;x<sx+cellWidth;x++)if(image.data[(y*image.width+x)*4+3]>=160){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
 const sourceBuckle=buckle(image,sx,430,cellWidth,42),scale=400/(bottom-top);
 // All frames share the original crown, upper-body pixels and feet anchor.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let p,i;
  if(y<padY+waist){
   const bx=x-padX,by=y-padY;if(bx<0||by<0||bx>=body.w||by>=waist)continue;
   p=atlas.data;i=((body.y+by)*atlas.width+body.x+bx)*4;
  }else{
   const xx=Math.round(sourceBuckle+(x-padX-bodyBuckle)/scale),yy=Math.round(bottom+(y-padY-body.h)/scale);
   if(xx<sx||xx>=sx+cellWidth||yy<0||yy>=image.height)continue;
   p=image.data;i=(yy*image.width+xx)*4;
  }
  if(p[i+3]<160)continue;const at=(y*width*count+n*width+x)*4;data.set(p.subarray(i,i+3),at);data[at+3]=255;
 }
 const key=`meursaultWalk${n}`;
 frames[key]={x:n*width,y:0,w:width,h:height,sheet:11,heightBasis:'crown',referenceHeight:400,crownOffset:body.crownOffset+padY,heightScale:height/400,foot:[(body.foot[0]*body.w+padX)/width,(body.foot[1]*body.h+padY)/height],face:body.face.map((v,i)=>v+(i===0?padX:i===1?padY:0)),source,upperSource:body.source};
 registration.push({sourceRect:[sx,0,cellWidth,image.height],sourceBuckle,sourceCrown:top,sourceSole:bottom,scale});
}
await writeFile(resolve(root,'src/assets/meursault-walk.png'),encodePNG({width:width*count,height,data}));
await writeFile(resolve(root,'src/walking-sprites.js'),'// Registered by tools/import-walk-sprites.mjs; upper body is copied unchanged.\nexport const WALK_FRAMES='+JSON.stringify(frames,null,2)+';\n');
manifest.animations={...manifest.animations,meursaultWalk:{source,sha256:createHash('sha256').update(bytes).digest('hex'),upperSource:body.source,atlas:'meursault-walk.png',frames:Object.keys(frames),waistRow:waist,padding:[padX,padY],registration}};
await writeFile(resolve(root,'src/assets/sprites-v36.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Registered ${count} walking frames with unchanged upper-body pixels.`);
