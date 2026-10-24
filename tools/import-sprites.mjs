// Atlas preparation only: source art stays unchanged; crop, remove matte debris,
// normalize alpha, and pack without redrawing or recoloring the supplied sprites.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { decodePNG,encodePNG } from './png.mjs';
import { SOURCES,BODIES,WEAPONS } from './sprite-sources.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),input=resolve(process.argv[2]||'/workspace/generated_images');
const originals=new Map(),provenance={};
for(const [id,file] of Object.entries(SOURCES)){const bytes=await readFile(resolve(input,file));originals.set(id,decodePNG(bytes));provenance[id]={file,sha256:createHash('sha256').update(bytes).digest('hex')};}
function extract(entry,body){
 const original=originals.get(entry.source),[sx,sy,width,height]=entry.rect;
 if(sx<0||sy<0||sx+width>original.width||sy+height>original.height)throw new Error(`Out of source bounds: ${entry.key}`);
 const mask=new Uint8Array(width*height),data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x,q=((sy+y)*original.width+sx+x)*4;
  if(original.data[q+3]<160||entry.exclude?.some(([a,b,w,h])=>sx+x>=a&&sx+x<a+w&&sy+y>=b&&sy+y<b+h))continue;
  mask[p]=1;data.set(original.data.subarray(q,q+3),p*4);data[p*4+3]=255;
 }
 const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length),components=[];
 for(let start=0;start<mask.length;start++){
  if(!mask[start]||seen[start])continue;let head=0,tail=1;queue[0]=start;seen[start]=1;const pixels=[];
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);pixels.push(p);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,q=ny*width+nx;if(nx<0||nx>=width||ny<0||ny>=height||!mask[q]||seen[q])continue;seen[q]=1;queue[tail++]=q;}
  }components.push(pixels);
 }
 components.sort((a,b)=>b.length-a.length);if(!components.length)throw new Error(`Empty sprite: ${entry.key}`);
 const minimum=Math.max(30,components[0].length*.002);let removed=0;
 for(let i=0;i<components.length;i++){const component=components[i];if(component.length<minimum||entry.largestOnly&&i>0){removed+=component.length;for(const p of component){mask[p]=0;data[p*4+3]=0;}}}
 let left=width,top=height,right=0,bottom=0;
 for(let p=0;p<mask.length;p++)if(mask[p]){const x=p%width,y=Math.floor(p/width);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
 const w=right-left,h=bottom-top;
 const referenceHeight=body&&entry.heightBasis==='crown'?entry.foot[1]-entry.crown:h;
 const scale=body?400/referenceHeight:Math.min(1,640/w,380/h);
 const out={width:Math.max(1,Math.round(w*scale)),height:body&&entry.heightBasis!=='crown'?400:Math.max(1,Math.round(h*scale))};out.data=new Uint8Array(out.width*out.height*4);
 for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
  const px=left+Math.min(w-1,Math.floor(x/scale)),py=top+Math.min(h-1,Math.floor(y/scale));let tx=entry.flip?out.width-x-1:x;
  out.data.set(data.subarray((py*width+px)*4,(py*width+px)*4+4),(y*out.width+tx)*4);
 }
 const frame={rotation:entry.rotation||0,source:provenance[entry.source].file,sourceRect:entry.rect,removedFragments:removed};
 if(body){
  frame.heightBasis=entry.heightBasis||'silhouette';frame.referenceHeight=400;frame.crownOffset=entry.heightBasis==='crown'?(entry.crown-sy-top)*scale:0;
  frame.heightScale=out.height/400;frame.foot=[(entry.foot[0]-sx-left)/w,(frame.crownOffset+400)/out.height];
  if(entry.eyes)frame.eyes=entry.eyes.map(([x,y])=>[(x-sx-left)*scale,(y-sy-top)*scale]);
  frame.face=entry.face.map((v,i)=>Math.round((v-(i===0?sx+left:i===1?sy+top:0))*scale));
  const side=Math.min(frame.face[2],out.width,out.height);frame.face=[Math.max(0,Math.min(out.width-side,frame.face[0])),Math.max(0,Math.min(out.height-side,frame.face[1])),side,side];
 }
 return {...out,key:entry.key,frame};
}
async function pack(entries,body){
 const width=2048,padding=8,sprites=entries.map(e=>extract(e,body));let x=padding,y=padding,row=0;
 for(const sprite of sprites){if(x+sprite.width+padding>width){x=padding;y+=row+padding;row=0;}sprite.x=x;sprite.y=y;x+=sprite.width+padding;row=Math.max(row,sprite.height);}
 const height=y+row+padding,data=new Uint8Array(width*height*4),frames={};
 for(const s of sprites){for(let yy=0;yy<s.height;yy++)data.set(s.data.subarray(yy*s.width*4,(yy+1)*s.width*4),((s.y+yy)*width+s.x)*4);frames[s.key]={x:s.x,y:s.y,w:s.width,h:s.height,sheet:body?9:10,...s.frame};}
 await writeFile(resolve(root,`src/assets/${body?'champions':'weapons'}-v36.png`),encodePNG({width,height,data}));
 return frames;
}
await mkdir(resolve(root,'src/assets'),{recursive:true});
const frames={...await pack(BODIES,true),...await pack(WEAPONS,false)};
const manifest={version:1,provenance,frames};
await writeFile(resolve(root,'src/assets/sprites-v36.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(resolve(root,'src/sprites-v36.js'),'// Generated by tools/import-sprites.mjs; original-source hashes are in assets/sprites-v36.json.\nexport const SPRITE_FRAMES='+JSON.stringify(frames,null,2)+';\n');
console.log(`Imported ${BODIES.length} body forms and ${WEAPONS.length} weapons from ${originals.size} latest source sheets.`);
