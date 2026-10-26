import {rooftopImages} from './rooftop.js';
export const CAMP_RANGE_COLOR='#142342';
export function drawMist(r,b,front=false,time=0){
 const c=r.ctx;c.save();c.beginPath();if(b.polygon){b.polygon.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}else c.rect(b.x,b.y,b.w,b.h);c.clip();c.globalAlpha*=front?.18:.72;
 // Dark blue smoke fills the same exact concealment polygon. Soft billows
 // and cyan-edged folds drift within it, without changing its straight edges.
 const vertical=b.h>b.w,base=c.createLinearGradient(b.x,b.y,b.x+(vertical?b.w:0),b.y+(vertical?0:b.h));
 base.addColorStop(0,'#102c3ad9');base.addColorStop(.5,'#205365ed');base.addColorStop(1,'#102c3ad9');c.fillStyle=base;c.fillRect(b.x,b.y,b.w,b.h);
 const smoke=rooftopImages().smoke;
 if(smoke?.complete&&smoke.naturalWidth){
  const length=vertical?b.h:b.w,breadth=vertical?b.w:b.h,span=Math.min(5,Math.max(2.4,breadth*2.5)),rows=Math.max(1,Math.ceil(breadth/2.3)),count=Math.ceil(length/(span*.62))+1;
  c.save();c.translate(b.x+b.w/2,b.y+b.h/2);if(vertical)c.rotate(Math.PI/2);
  for(let row=0;row<rows;row++)for(let i=-1;i<count;i++){const x=-length/2+i*span*.62+Math.sin(time*.18+row)*.18,y=-breadth/2+(row+.5)*breadth/rows;c.save();c.translate(x,y);if((i+row)%2)c.scale(-1,1);c.drawImage(smoke,-span/2,-Math.max(2,breadth/rows*1.7)/2,span,Math.max(2,breadth/rows*1.7));c.restore();}c.restore();
 }
 const count=Math.max(3,Math.min(12,Math.ceil(b.w*b.h/2))),radius=Math.max(.6,Math.min(b.w,b.h)*.7);
 for(let i=0;i<count;i++){
  const phase=(i*.61803398875)%1,other=(i*.381966+.2)%1,x=b.x+b.w*phase+Math.sin(time*.45+i)*.12,y=b.y+b.h*other+Math.cos(time*.35+i*2)*.1;
  const gradient=c.createRadialGradient(x,y,0,x,y,radius);gradient.addColorStop(0,'#397e9430');gradient.addColorStop(.5,'#23566618');gradient.addColorStop(1,'#102c3a00');c.fillStyle=gradient;c.beginPath();c.ellipse(x,y,radius,radius*.72,0,0,Math.PI*2);c.fill();
 }c.restore();
}
