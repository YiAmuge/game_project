import{leapLift,feetOffset}from'./projection-25d.js';
export function drawDeploymentGlow(c,e,g){
 const release=e.visuals?.deployment,falling=e.deploymentGhost;if(!falling&&!(release?.until>g.time))return;
 const t=falling?e.dropProgress:Math.max(0,Math.min(1,(g.time-release.at)/(release.until-release.at))),alpha=falling?.8:1-t;
 c.save();c.translate(e.x,e.y+feetOffset(e)-leapLift(e)-1);c.globalAlpha*=alpha;c.globalCompositeOperation='lighter';c.shadowColor='#ffdb6e';c.shadowBlur=18;
 const w=falling?.75:.75+t*.65,h=falling?1.4:1.4-t*.3;c.save();c.scale(w,h);const glow=c.createRadialGradient(0,0,.05,0,0,1);glow.addColorStop(0,'#fff3b8a0');glow.addColorStop(.5,'#ffd35e80');glow.addColorStop(1,'#d8991900');c.fillStyle=glow;c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fill();c.restore();
 c.strokeStyle='#ffe9a5';c.lineWidth=.035;
 for(let i=0;i<7;i++){const a=i*2.399,r=falling?.3:.4+t*.9,x=Math.cos(a)*r,y=Math.sin(a)*.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+(falling?0:Math.cos(a)*.2),y+(falling?-1.8*(1-t):Math.sin(a)*.2));c.stroke();}
 c.restore();
}
