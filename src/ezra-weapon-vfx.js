import{gripSourcePoint}from'./weapon-grips.js';

// These source anchors follow the blue bit, independently of the hammer's rotation.
export function ezraDrillAxis(m,pivot){
 return {base:gripSourcePoint([.87,.53],m,pivot),tip:gripSourcePoint([.87,.99],m,pivot)};
}
export function drawEzraDrillEffect(c,g,e,m,pivot){
 const attack=e.state.ezraAttack,age=g.time-(attack?.startedAt??-99);
 if(attack?.weapon!==2||age<0||age>=.55||!e.alive)return;
 const{base,tip}=ezraDrillAxis(m,pivot),dx=tip.x-base.x,dy=tip.y-base.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,fade=Math.min(1,age/.025)*Math.min(1,(.55-age)/.12);
 c.save();c.globalCompositeOperation='lighter';c.lineCap='round';c.shadowColor='#00dfff';c.shadowBlur=9;
 const point=(t,side)=>({x:base.x+dx*t+nx*side,y:base.y+dy*t+ny*side});
 // Opposite helical highlights slide down the cone to suggest a rotating bit.
 for(let thread=0;thread<2;thread++){
  c.beginPath();for(let i=0;i<=36;i++){const t=i/36,r=len*.22*(1-t)+.006,phase=age*65-t*15+thread*Math.PI,p=point(t,Math.sin(phase)*r);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}
  c.globalAlpha=fade*(thread?.65:.9);c.strokeStyle=thread?'#28a8ff':'#d9ffff';c.lineWidth=thread?.017:.023;c.stroke();
 }
 for(let bolt=0;bolt<3;bolt++){
  c.beginPath();for(let i=0;i<=7;i++){const t=i/7,side=Math.sin(i*8.7+bolt*11+Math.floor(age*35))*len*.20*(1-t),p=point(t,side);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}
  c.globalAlpha=fade*.6;c.strokeStyle=bolt?'#27dfff':'#f0ffff';c.lineWidth=.013;c.stroke();
 }
 c.restore();
}
