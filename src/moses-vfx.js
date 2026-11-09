import{BREATHS}from'./moses-data.js';
import{MOSES_FRAMES}from'./moses-sprites.js';
import{bodyFacing}from'./champion-pose.js';
import{projectFeet,leapLift,levitationLift}from'./projection-25d.js';
const sprites=new Map();
function smoke(color){if(sprites.has(color))return sprites.get(color);const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const c=canvas.getContext('2d');for(const[x,y,r]of[[47,49,42],[31,43,27],[61,38,25],[59,62,22]]){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color+'b0');g.addColorStop(.45,color+'72');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}sprites.set(color,canvas);return canvas;}
function puff(c,camera,point,z,r,color,alpha){const p=camera.worldToScreen(point,z),size=r*camera.scale;c.globalAlpha=Math.max(0,Math.min(1,alpha));c.drawImage(smoke(color),p.x-size,p.y-size,size*2,size*2);}
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function mosesMouth(p){const f=MOSES_FRAMES.moses,h=2.1*f.heightScale,w=h*f.w/f.h;return{x:p.origin.x+(f.mouth[0]-f.foot[0])*w*p.flip,y:p.origin.y+(f.mouth[1]-f.foot[1])*h};}
export function mosesWeaponPose(g,e,p){
 const s=e.state,r=s.mosesR,lowering=s.mosesPipeLowering,side=p.flip;
 let blend=0;
 if(r){const age=g.time-r.at;blend=age<=1?ease(age/.15):1-ease((age-1)/.12);}
 else if(s.mosesChoosing)blend=ease((g.time-s.mosesChoosing.at)/.15);
 else if(lowering)blend=ease((g.time-lowering.raisedAt)/.15)*(1-ease((g.time-lowering.at)/.12));
 // Anchor the actual mouthpiece pixel to the lips, rather than the weapon box.
 const pipe=MOSES_FRAMES.mosesPipe,length=1.05,height=length*pipe.h/pipe.w,smokingAngle=side>0?Math.PI+.28:-.28,restAngle=side>0?Math.PI+.35:-.35;
 const mouth=mosesMouth(p),dx=(pipe.mouth[0]-pipe.grip[0])*length,dy=(pipe.mouth[1]-pipe.grip[1])*height,flip=Math.cos(smokingAngle)<0?-1:1,a=Math.atan2(Math.sin(smokingAngle),Math.abs(Math.cos(smokingAngle)));
 const raised={x:mouth.x-flip*(dx*Math.cos(a)-dy*Math.sin(a)),y:mouth.y-dx*Math.sin(a)-dy*Math.cos(a)},rest={x:p.origin.x+side*.8,y:p.origin.y-.60};
 return{hand:{x:rest.x+(raised.x-rest.x)*blend,y:rest.y+(raised.y-rest.y)*blend},angle:restAngle+(smokingAngle-restAngle)*blend,pivot:pipe.grip[0],gripY:pipe.grip[1]-.5,blend};
}
function breathFan(c,camera,f,alpha){
 const origin=camera.worldToScreen(f,.12),points=[origin];for(let i=0;i<=32;i++){const a=f.angle-f.spread/2+f.spread*i/32;points.push(camera.worldToScreen({x:f.x+Math.cos(a)*f.r,y:f.y+Math.sin(a)*f.r},.12));}
 c.save();c.globalAlpha=alpha;c.shadowColor=f.color;c.shadowBlur=10;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=f.color+'42';c.fill();c.strokeStyle=f.color+'e8';c.lineWidth=1.6;c.stroke();
 c.strokeStyle='#f0f6f0a0';c.lineWidth=.9;for(let i=0;i<13;i++){const a=f.angle+(i/12-.5)*f.spread,start=camera.worldToScreen({x:f.x+Math.cos(a)*f.r*.2,y:f.y+Math.sin(a)*f.r*.2},.35),end=camera.worldToScreen({x:f.x+Math.cos(a)*f.r*.92,y:f.y+Math.sin(a)*f.r*.92},.35);c.beginPath();c.moveTo(start.x,start.y);c.lineTo(end.x,end.y);c.stroke();}c.restore();
}
function column(c,camera,p,d,length,width,progress=1){
 if(length<=.01)return;const color=BREATHS.right.color,tail={x:p.x-d.x*length,y:p.y-d.y*length},n={x:-d.y*width/2,y:d.x*width/2},at=q=>camera.worldToScreen(q,1.35),a=at(tail),b=at(p),corners=[at({x:tail.x+n.x,y:tail.y+n.y}),at({x:p.x+n.x,y:p.y+n.y}),at({x:p.x-n.x,y:p.y-n.y}),at({x:tail.x-n.x,y:tail.y-n.y})];
 c.save();c.globalAlpha=progress;c.shadowColor='#ff2448';c.shadowBlur=22;const glow=c.createLinearGradient(a.x,a.y,b.x,b.y);glow.addColorStop(0,'#a80f36cc');glow.addColorStop(.5,'#ee294de8');glow.addColorStop(1,'#ff7388f0');c.fillStyle=glow;c.strokeStyle='#ffadba';c.lineWidth=1.8;c.beginPath();corners.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();c.stroke();
 const edge=at({x:p.x+n.x,y:p.y+n.y}),radius=Math.max(2,Math.hypot(edge.x-b.x,edge.y-b.y)),angle=Math.atan2(edge.y-b.y,edge.x-b.x);for(const cap of[a,b]){c.beginPath();c.ellipse(cap.x,cap.y,radius,radius*.3,angle,0,Math.PI*2);c.fill();c.stroke();}c.strokeStyle='#ffe1e7';c.lineWidth=Math.max(2,camera.scale*.09);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.restore();
 for(let i=0;i<10;i++){const t=i/9;puff(c,camera,{x:p.x-d.x*t*length,y:p.y-d.y*t*length},1.35,width*.24,color,.19*progress);}
}
export function drawMosesPoint(c,camera,p){if(p.type!=='mosesPoint')return false;c.save();column(c,camera,p,{x:p.dx,y:p.dy},3.7,2);c.restore();return true;}
export function drawMosesScene(c,camera,g){
 c.save();
 for(const f of g.effects.filter(f=>f.type==='mosesBreath').slice(-24)){
  const age=f.maxLife-f.life,t=Math.max(0,Math.min(1,age/f.maxLife)),fade=Math.sin(Math.PI*t);const owner=g.units.find(e=>e.id===f.source);if(owner&&!g.visibleTo(g.player.team,owner))continue;
  breathFan(c,camera,f,fade*(.6+.4*(f.progress||0)));
  for(let i=0;i<24;i++){const n=(i+.5)/24,angle=f.angle+(n-.5)*f.spread,travel=f.r*Math.min(1,t*1.45)*(.58+.42*((i*7)%13)/12),p={x:f.x+Math.cos(angle)*travel,y:f.y+Math.sin(angle)*travel};puff(c,camera,p,1.45-travel/f.r*.55,.16+t*.46,f.color,fade*.67);}
 }
 for(const e of g.champions().filter(e=>e.key==='moses'&&e.alive&&!g.hidden(e)&&g.visibleTo(g.player.team,e))){
  const s=e.state,r=s.mosesR,attack=s.mosesBreath,age=g.time-(attack?.at??-99),choosing=s.mosesChoosing,color=r?BREATHS.right.color:attack&&age>=0&&age<.65?attack.color:BREATHS[choosing?.direction??s.smoke]?.color||'#b6bdb9',active=r||choosing||s.mosesCharge||s.smoke||age>=0&&age<.65;
  if(active){const flip=(Math.cos(bodyFacing(g,e))<0)!==Boolean(MOSES_FRAMES.moses.mirror)?-1:1,feet=projectFeet(camera,e),mouth=mosesMouth({origin:{x:e.x,y:e.y+.3+Math.sin(g.time*3+e.id)*.025-leapLift(e)-levitationLift(g,e)},flip});for(let i=0;i<5;i++){const t=(g.time*.8+i*.19)%1,size=(.06+t*.11)*camera.scale,x=feet.x+(mouth.x-e.x+flip*t*.15)*camera.scale,y=feet.y+(mouth.y-e.y-feet.offset-t*.24)*camera.scale;c.globalAlpha=(1-t)*.4;c.drawImage(smoke(color),x-size,y-size,size*2,size*2);}
   if(choosing||s.smoke)for(let i=0;i<6;i++){const a=g.time*.55+i*Math.PI/3;puff(c,camera,{x:e.x+Math.cos(a)*.6,y:e.y+Math.sin(a)*.6},.45+((g.time*.25+i/6)%1)*.8,.25,color,.17);}
  }
  if(r&&g.time-r.at>=1){const progress=Math.max(0,Math.min(1,(g.time-r.at-1)/.5)),d={x:Math.cos(r.angle),y:Math.sin(r.angle)},head={x:e.x+d.x*(.65+3.7*progress),y:e.y+d.y*(.65+3.7*progress)};column(c,camera,head,d,3.7*progress,.3+1.7*progress,.35+.65*progress);}
 }
 c.restore();
}
