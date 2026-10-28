import{readFile,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import{decodePNG,encodePNG}from'./png.mjs';
const root=new URL('../',import.meta.url),butterfly='/workspace/generated_images/exec-b92365d1-fcbf-4457-8521-890991894a23.png',tattoo=new URL('src/assets/augments-survival.png',root);
const sources=await Promise.all([butterfly,tattoo].map(p=>readFile(p))),[b,t]=sources.map(decodePNG);
// The image edit removes the crossed rifles from the approved mourning icon.
// Retain that single butterfly's pixels; the dark version swaps its monochrome ink.
const bounds={l:b.width,t:b.height,r:0,b:0};for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){const at=(y*b.width+x)*4;if(b.data[at+3]>80&&Math.max(...b.data.subarray(at,at+3))>80){bounds.l=Math.min(bounds.l,x);bounds.t=Math.min(bounds.t,y);bounds.r=Math.max(bounds.r,x+1);bounds.b=Math.max(bounds.b,y+1);}}
const width=384,height=128,data=new Uint8Array(width*height*4),frames={};
for(const [i,key]of ['butterflyWhite','butterflyBlack','resentment'].entries()){
 const rect=i<2?[bounds.l,bounds.t,bounds.r-bounds.l,bounds.b-bounds.t]:[10,20,370,395],im=i<2?b:t,scale=112/Math.max(rect[2],rect[3]),w=Math.round(rect[2]*scale),h=Math.round(rect[3]*scale),dx=i*128+(128-w>>1),dy=128-h>>1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=rect[0]+Math.min(rect[2]-1,Math.floor(x/scale)),sy=rect[1]+Math.min(rect[3]-1,Math.floor(y/scale)),from=(sy*im.width+sx)*4,to=((dy+y)*width+dx+x)*4,r=im.data[from],g=im.data[from+1],blue=im.data[from+2],alpha=im.data[from+3];if(i===2&&!(r>g*1.25&&blue>g*1.3&&Math.max(r,blue)>35))continue;for(let c=0;c<3;c++)data[to+c]=i===1?255-im.data[from+c]:im.data[from+c];data[to+3]=alpha;}
 frames[key]={x:i*128,y:0,w:128,h:128};
}
// Remove the remaining black matte around the edited butterfly. Closing a
// one-pixel white-wing mask keeps black veins/body and a narrow outer outline,
// while the dark variant's inverse ink can never turn that matte into a box.
const mask=new Uint8Array(128*128),outside=new Uint8Array(mask.length),queue=[];
for(let y=1;y<127;y++)for(let x=1;x<127;x++){const at=(y*width+x)*4;if(data[at+3]>60&&Math.max(data[at],data[at+1],data[at+2])>80)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)mask[(y+dy)*128+x+dx]=1;}
for(let n=0;n<128;n++)for(const at of [n,127*128+n,n*128,n*128+127])if(!mask[at]&&!outside[at]){outside[at]=1;queue.push(at);}
for(let k=0;k<queue.length;k++){const at=queue[k],x=at%128,y=at/128|0;for(const next of [x?at-1:-1,x<127?at+1:-1,y?at-128:-1,y<127?at+128:-1])if(next>=0&&!mask[next]&&!outside[next]){outside[next]=1;queue.push(next);}}
for(let y=0;y<128;y++)for(let x=0;x<128;x++)for(let variant=0;variant<2;variant++){const at=(y*width+variant*128+x)*4;data[at+3]=outside[y*128+x]?0:255;}
await writeFile(new URL('src/assets/augment-effects-v71.png',root),encodePNG({width,height,data}));
await writeFile(new URL('src/assets/augment-effects-v71.json',root),JSON.stringify({frames,sources:[{file:butterfly.split('/').at(-1),sha256:createHash('sha256').update(sources[0]).digest('hex'),purpose:'single butterfly; both guns removed from mourning reference'},{file:'augments-survival.png',sha256:createHash('sha256').update(sources[1]).digest('hex'),rect:[10,20,370,395],purpose:'original resentment purple motif'}]},null,2)+'\n');
console.log('Imported gun-free butterfly variants and the original resentment motif.');
