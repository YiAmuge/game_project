import{readFile,writeFile,mkdir}from'node:fs/promises';import{createHash}from'node:crypto';import{decodePNG,encodePNG}from'./png.mjs';
const source='exec-d41ae17b-d01c-4f57-b580-1286a7a2c183.png',bytes=await readFile('/workspace/generated_images/'+source),im=decodePNG(bytes),{width:w,height:h}=im,seen=new Uint8Array(w*h),q=new Int32Array(w*h),parts=[];
for(let p=0;p<w*h;p++){
 if(seen[p]||im.data[p*4+3]<192)continue;let head=0,n=1,l=w,t=h,r=0,b=0;seen[p]=1;q[0]=p;
 while(head<n){const at=q[head++],x=at%w,y=at/w|0;l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1);for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++){const j=yy*w+xx;if(xx<0||yy<0||xx>=w||yy>=h||seen[j]||im.data[j*4+3]<192)continue;seen[j]=1;q[n++]=j;}}
 if(n>2000)parts.push({l,t,r,b,pixels:q.slice(0,n)});
}
parts.sort((a,b)=>Math.floor((a.t+a.b)/2/(h/3))-Math.floor((b.t+b.b)/2/(h/3))||a.l-b.l);if(parts.length!==6)throw Error('Expected six approved front poses');
const keys=['needleGreenIdle','needleGreenAttack','needleRedIdle','needleRedAttack','sewingKingIdle','sewingKingAttack'],axes=[270,715,270,715,270,735],crowns=[26,27,449,451,995,995],feet=[410,410,828,828,1502,1495],frames={},aw=2048,ah=1536,atlas=new Uint8Array(aw*ah*4);await mkdir('src/assets/needles',{recursive:true});
for(let i=0;i<parts.length;i++){
 const p=parts[i],scale=360/(feet[i]-crowns[i]),sw=Math.round((p.r-p.l)*scale)+16,sh=Math.round((p.b-p.t)*scale)+16,pixels=new Uint8Array(sw*sh*4),mask=new Uint8Array(w*h);for(const n of p.pixels)mask[n]=1;
 for(let y=8;y<sh-8;y++)for(let x=8;x<sw-8;x++){const sx=Math.min(p.r-1,p.l+Math.floor((x-8)/scale)),sy=Math.min(p.b-1,p.t+Math.floor((y-8)/scale)),from=sy*w+sx,at=(y*sw+x)*4;if(mask[from]){pixels.set(im.data.subarray(from*4,from*4+3),at);pixels[at+3]=255;}}
 const ax=i%2*1024+8,ay=Math.floor(i/2)*512+8;if(sw>1008||sh>496)throw Error('Atlas cell overflow '+keys[i]);for(let y=0;y<sh;y++)atlas.set(pixels.subarray(y*sw*4,(y+1)*sw*4),((ay+y)*aw+ax)*4);
 frames[keys[i]]={x:ax,y:ay,w:sw,h:sh,sheet:13,referenceHeight:360,heightScale:sh/360,crownOffset:8+(crowns[i]-p.t)*scale,foot:[(8+(axes[i]-p.l)*scale)/sw,(8+(feet[i]-p.t)*scale)/sh],sourceRect:[p.l,p.t,p.r-p.l,p.b-p.t]};await writeFile('src/assets/needles/'+keys[i]+'.png',encodePNG({width:sw,height:sh,data:pixels}));
}
await writeFile('src/assets/needles-v54.png',encodePNG({width:aw,height:ah,data:atlas}));await writeFile('src/assets/needles-v54.json',JSON.stringify({source,sha256:createHash('sha256').update(bytes).digest('hex'),orientation:'front',extraction:'alpha >= 192, connected silhouettes; no detached residue; original RGB',frames},null,2)+'\n');await writeFile('src/needle-sprites.js','// Generated from the latest approved front-facing sheet by tools/import-needles.mjs.\nexport const NEEDLE_FRAMES='+JSON.stringify(frames,null,2)+';\n');console.log('Imported six front-facing needle/king poses.');
