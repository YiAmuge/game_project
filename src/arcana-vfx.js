import{FRAMES,loadAtlas}from'./art.js';
import{drawMagicCircle}from'./magic-circle.js';
import{stage as queenStage,telegraph}from'./queen.js';
const TAU=Math.PI*2;
export function drawBloodBat(r,e,g){const f=FRAMES.bloodBat,a=loadAtlas(f.sheet);if(!a.complete||!a.naturalWidth)return;const c=r.ctx,w=1.26,h=w*f.h/f.w,flap=.85+.15*Math.sin(g.time*23+e.id);c.save();c.translate(e.x,e.y-.55);c.scale(Math.cos(e.facing||0)<0?-1:1,flap);c.shadowColor='#c1143a';c.shadowBlur=5;c.drawImage(a,f.x,f.y,f.w,f.h,-w/2,-h/2,w,h);c.restore();}
function roundedStar(c,r){const points=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,rad=i%2?r*.5:r;return{x:Math.cos(a)*rad,y:Math.sin(a)*rad};});c.beginPath();for(let i=0;i<10;i++){const p=points[i],next=points[(i+1)%10],prev=points[(i+9)%10],a={x:p.x*.8+prev.x*.2,y:p.y*.8+prev.y*.2},b={x:p.x*.8+next.x*.2,y:p.y*.8+next.y*.2};i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y);c.quadraticCurveTo(p.x,p.y,b.x,b.y);}c.closePath();}
export function drawArcanaProjectile(c,camera,g,p){
 if(!p.queenStar&&!p.bloodBlade)return false;const at=camera.worldToScreen(p,1),scale=camera.scale,age=g.time-(p.bornAt||0);c.save();c.translate(at.x,at.y);c.shadowColor=p.queenStar?'#ffdc43':'#ed254f';c.shadowBlur=p.queenStar?15:12;
 if(p.queenStar){c.rotate(age*3);roundedStar(c,scale*.31);c.fillStyle='#ffe66d';c.strokeStyle='#fff5c3';c.lineWidth=scale*.035;c.fill();c.stroke();c.fillStyle='#fff7cf';roundedStar(c,scale*.14);c.fill();c.rotate(-age*3);for(let i=0;i<8;i++){const t=(age*3+i/8)%1,x=-p.dx*t*scale*1.5+Math.sin(i*2.4+age*4)*scale*.17,y=-p.dy*t*scale*1.5+Math.cos(i*2.4+age*4)*scale*.17,r=scale*.045*(1-t);c.globalAlpha=1-t;c.fillStyle=['#ff88d0','#85dfff','#ffeb68'][i%3];c.beginPath();c.moveTo(x-r,y);c.lineTo(x,y-r*1.5);c.lineTo(x+r,y);c.lineTo(x,y+r*1.5);c.closePath();c.fill();}}
 else{const next=camera.worldToScreen({x:p.x+p.dx,y:p.y+p.dy},1);c.rotate(Math.atan2(next.y-at.y,next.x-at.x));const h=scale*p.width*1.1;
  for(const [w,color]of [[1,'#8c0629b8'],[.72,'#ed214dda'],[.18,'#ffd1dc']]){c.fillStyle=color;c.beginPath();c.moveTo(-scale*.11,-h*w);c.quadraticCurveTo(scale*.34,-h*w*.3,scale*.38,0);c.quadraticCurveTo(scale*.34,h*w*.3,-scale*.11,h*w);c.lineTo(scale*.08,0);c.closePath();c.fill();}
 }c.restore();return true;
}
function drawTelegraph(c,camera,s,time,ally){
 const d={x:Math.cos(s.angle),y:Math.sin(s.angle)},n={x:-d.y,y:d.x},points=[[0,-1],[s.range,-1],[s.range,1],[0,1]].map(([along,side])=>camera.worldToScreen({x:s.x+d.x*along+n.x*s.width/2*side,y:s.y+d.y*along+n.y*s.width/2*side},.04));
 c.save();c.fillStyle=ally?'#fa64bd17':'#e5416633';c.strokeStyle=ally?'#ffa6dfb0':'#ff5a7cd9';c.lineWidth=1.5;c.setLineDash([7,5]);c.lineDashOffset=-time*10;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();c.stroke();c.restore();
}
function uprightSeal(c,camera,p,angle,radius,time,alpha=1){
 const at=camera.worldToScreen(p,1.45),side=camera.worldToScreen({x:p.x-Math.sin(angle),y:p.y+Math.cos(angle)},1.45),up=camera.worldToScreen(p,2.45);let ux=up.x-at.x,uy=up.y-at.y;if(Math.hypot(ux,uy)<1){ux=0;uy=-camera.scale;}
 c.save();c.translate(at.x,at.y);c.transform((side.x-at.x<0?-1:1)*Math.max(Math.abs(side.x-at.x),camera.scale*.42),side.y-at.y,ux,uy,0,0);drawMagicCircle(c,time,{radius,alpha});c.restore();
}
function beam(c,camera,f){
 const d={x:Math.cos(f.angle),y:Math.sin(f.angle)},n={x:-d.y,y:d.x},alpha=Math.min(1,f.life/Math.max(.01,f.maxLife)*2),at=(along,side)=>camera.worldToScreen({x:f.x+d.x*along+n.x*side,y:f.y+d.y*along+n.y*side},1.35);
 c.save();c.globalAlpha=alpha;c.globalCompositeOperation='source-over';c.shadowColor='#ff4cac';c.shadowBlur=18+(f.stage||0)*5;
 for(const[ratio,color]of[[1,'#e534a548'],[.72,'#ff5cb79b'],[.35,'#ff9bdcc9'],[.065,'#fff1ff']]){
  const w=f.width/2*ratio,start=f.slot==='r'?.55:0,cap=Math.min(1.05,f.width*.22),p0=at(start,-w*.12),p1=at(start+cap,-w),p2=at(f.range,-w),p3=at(f.range,w),p4=at(start+cap,w),p5=at(start,w*.12),control0=at(start+cap*.15,-w),control1=at(start+cap*.15,w),tip0=at(start-cap*.28,0);
  c.beginPath();c.moveTo(p0.x,p0.y);c.quadraticCurveTo(control0.x,control0.y,p1.x,p1.y);c.lineTo(p2.x,p2.y);c.lineTo(p3.x,p3.y);c.lineTo(p4.x,p4.y);c.quadraticCurveTo(control1.x,control1.y,p5.x,p5.y);c.quadraticCurveTo(tip0.x,tip0.y,p0.x,p0.y);c.closePath();
  const begin=at(start-cap*.3,0),end=at(f.range,0),fade=c.createLinearGradient(begin.x,begin.y,end.x,end.y);fade.addColorStop(0,'#ff5cb700');fade.addColorStop(Math.min(.18,1.6/f.range),color);fade.addColorStop(.90,color);fade.addColorStop(1,'#ff5cb700');c.fillStyle=fade;c.fill();
 }

 const origin=at(0,0);for(let i=0;i<5+(f.stage||0)*3;i++){const a=i*2.4+f.life*6,r=(.1+i%3*.13)*camera.scale;c.strokeStyle=i%2?'#ffe890':'#ffa8ed';c.lineWidth=1.8;c.beginPath();c.moveTo(origin.x+Math.cos(a)*r,origin.y+Math.sin(a)*r);c.lineTo(origin.x+Math.cos(a)*(r+camera.scale*.2),origin.y+Math.sin(a)*(r+camera.scale*.2));c.stroke();}c.restore();
}
function bloodMist(c,camera,g,e,s){
 const a=camera.worldToScreen(s,.25),b=camera.worldToScreen(e,.8),scale=camera.scale;c.save();c.shadowColor='#dc1c47';c.shadowBlur=9;c.strokeStyle='#c42a52aa';c.lineWidth=scale*.07;c.beginPath();c.moveTo(a.x,a.y);c.bezierCurveTo(a.x+(b.x-a.x)*.35,a.y+Math.sin(g.time*3)*scale*.5,a.x+(b.x-a.x)*.65,b.y-scale*.3,b.x,b.y);c.stroke();
 for(let i=0;i<12;i++){const p=(g.time*.8+i/12)%1,r=scale*(.18+i%3*.13),x=a.x+Math.sin(i*2.4+g.time)*scale*.5,y=a.y-p*scale*2.3;c.globalAlpha=Math.sin(p*Math.PI)*.55;const fog=c.createRadialGradient(x,y,0,x,y,r*2);fog.addColorStop(0,i%2?'#d5204899':'#740a2a88');fog.addColorStop(1,'#740a2a00');c.fillStyle=fog;c.fillRect(x-r*2,y-r*2,r*4,r*4);}c.restore();
}
export function drawArcanaEffects(c,camera,g){
 for(const f of g.effects)if(f.type==='arcanaBeam')beam(c,camera,f);
 for(const e of g.champions()){if(!e.alive||g.hidden(e)||!g.visibleTo(g.player.team,e))continue;
  if(e.key==='queen'){
   const q=e.state.queenQ;if(q)uprightSeal(c,camera,q,q.angle,2.1,g.time,q.phase==='preparing'?.8:1);
   for(const slot of ['q','r']){const shape=telegraph(g,e,slot);if(shape)drawTelegraph(c,camera,shape,g.time,e.team===g.player.team);}
   const r=e.state.queenR;if(r){const n=r.phase==='charging'?queenStage(g,e):r.stage;for(let i=0;i<n;i++){const offset=.55+i*.65,p={x:r.x+Math.cos(r.angle)*offset,y:r.y+Math.sin(r.angle)*offset};uprightSeal(c,camera,p,r.angle,1.5*1.1**i,g.time+i*.4,.8+i*.08);}}
  }
  if(e.key==='nosferatu'&&e.state.bloodfiend)bloodMist(c,camera,g,e,e.state.bloodfiend);
 }
 for(const f of g.effects){if(f.type==='queenHeal'){const t=g.units.find(e=>e.id===f.target)||f,p=camera.worldToScreen(t,1.3),r=camera.scale*(.2+(1-f.life/f.maxLife)*.6);c.save();c.globalAlpha=f.life/f.maxLife;c.strokeStyle='#ffbcdf';c.shadowColor='#ff66b6';c.shadowBlur=10;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,r,0,TAU);c.stroke();c.restore();}}
}
