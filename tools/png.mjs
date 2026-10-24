// Small lossless RGBA PNG codec for the checked-in sprite import pipeline.
import { inflateSync, deflateSync } from 'node:zlib';
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
export function decodePNG(b){
 if(!b.subarray(0,8).equals(signature))throw new Error('Not a PNG');
 let width,height,channels;const chunks=[];
 for(let at=8;at<b.length;){const n=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8),d=b.subarray(at+8,at+8+n);at+=12+n;
  if(type==='IHDR'){width=d.readUInt32BE(0);height=d.readUInt32BE(4);channels=d[9]===6?4:d[9]===2?3:0;if(d[8]!==8||!channels||d[12])throw new Error('Expected non-interlaced RGB/RGBA8 PNG');}
  if(type==='IDAT')chunks.push(d);
 }
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,scan=Buffer.alloc(stride*height),data=new Uint8Array(width*height*4);let at=0;
 for(let y=0;y<height;y++){const filter=raw[at++];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=channels?scan[i-channels]:0,p=y?scan[i-stride]:0,c=y&&x>=channels?scan[i-stride-channels]:0;scan[i]=(raw[at++]+(filter===0?0:filter===1?a:filter===2?p:filter===3?Math.floor((a+p)/2):filter===4?paeth(a,p,c):NaN))&255;}}
 for(let i=0;i<width*height;i++){data.set(scan.subarray(i*channels,i*channels+3),i*4);data[i*4+3]=channels===4?scan[i*4+3]:255;}
 return {width,height,data};
}
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,data){const t=Buffer.from(type),all=Buffer.concat([t,data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);all.copy(out,4);let crc=0xffffffff;for(const v of all)crc=table[(crc^v)&255]^(crc>>>8);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
export function encodePNG({width,height,data}){const h=Buffer.alloc(13);h.writeUInt32BE(width);h.writeUInt32BE(height,4);h[8]=8;h[9]=6;const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++){raw[y*(width*4+1)]=0;Buffer.from(data.buffer,data.byteOffset+y*width*4,width*4).copy(raw,y*(width*4+1)+1);}return Buffer.concat([signature,chunk('IHDR',h),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
