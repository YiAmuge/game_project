export const CAMP_RANGE_COLOR='#142342';
export function drawMist(r,b,front=false,time=0){
 const c=r.ctx;c.save();c.beginPath();if(b.polygon){b.polygon.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}else c.rect(b.x,b.y,b.w,b.h);c.clip();c.globalAlpha*=front?.16:.38;
 // A continuous haze fills the entire concealment strip; drifting wisps stay inside its straight edges.
 const vertical=b.h>b.w,base=c.createLinearGradient(b.x,b.y,b.x+(vertical?b.w:0),b.y+(vertical?0:b.h));
 base.addColorStop(0,'#426b9fa8');base.addColorStop(.5,'#759bc2bb');base.addColorStop(1,'#426b9fa8');c.fillStyle=base;c.fillRect(b.x,b.y,b.w,b.h);
 const count=Math.max(3,Math.min(18,Math.ceil(b.w*b.h/1.3))),radius=Math.max(.6,Math.min(b.w,b.h)*.8);
 for(let i=0;i<count;i++){
  const phase=(i*.61803398875)%1,other=(i*.381966+.2)%1,x=b.x+b.w*phase+Math.sin(time*.45+i)*.12,y=b.y+b.h*other+Math.cos(time*.35+i*2)*.1;
  const gradient=c.createRadialGradient(x,y,0,x,y,radius);gradient.addColorStop(0,'#739ac4b0');gradient.addColorStop(.5,'#3d699aa0');gradient.addColorStop(1,'#1c3f7000');c.fillStyle=gradient;c.beginPath();c.ellipse(x,y,radius,radius*.72,0,0,Math.PI*2);c.fill();
 }c.restore();
}
