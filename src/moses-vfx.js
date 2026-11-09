import{BREATHS}from'./moses-data.js';
const sprites=new Map();
function smoke(color){if(sprites.has(color))return sprites.get(color);const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const c=canvas.getContext('2d');for(const[x,y,r]of[[47,49,42],[31,43,27],[61,38,25],[59,62,22]]){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color+'b0');g.addColorStop(.45,color+'72');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}sprites.set(color,canvas);return canvas;}
function puff(c,camera,point,z,r,color,alpha){const p=camera.worldToScreen(point,z),size=r*camera.scale;c.globalAlpha=Math.max(0,Math.min(1,alpha));c.drawImage(smoke(color),p.x-size,p.y-size,size*2,size*2);}
export function mosesWeaponPose(g,e,p){const s=e.state,r=s.mosesR,at=s.mosesChoosing?.at??(r&&g.time-r.at<.25?r.at:undefined),blend=at===undefined?0:Math.max(0,Math.min(1,(g.time-at)/.15)),side=p.flip,angle=side>0?Math.PI+.28:-.28,mouth={x:p.origin.x+side*.16,y:p.origin.y-1.5},raised={x:mouth.x-Math.cos(angle)*.735,y:mouth.y-Math.sin(angle)*.735},rest={x:p.origin.x+side*.42,y:p.origin.y-.72};return{hand:{x:rest.x+(raised.x-rest.x)*blend,y:rest.y+(raised.y-rest.y)*blend},angle:blend?angle:side>0?.48:Math.PI-.48};}
function column(c,camera,p,d,length,width,progress=1){const color=BREATHS.right.color;for(let i=0;i<18;i++){const t=i/17,phase=i*2.399,pnt={x:p.x-d.x*t*length-Math.sin(phase)*d.y*width*.23,y:p.y-d.y*t*length+Math.sin(phase)*d.x*width*.23};puff(c,camera,pnt,1.35+Math.cos(phase)*.12,width*(.28+.15*Math.sin(Math.PI*t)),color,(.42+.22*Math.sin(Math.PI*t))*progress);}}
export function drawMosesPoint(c,camera,p){if(p.type!=='mosesPoint')return false;c.save();column(c,camera,p,{x:p.dx,y:p.dy},3.7,2);c.restore();return true;}
export function drawMosesScene(c,camera,g){
 c.save();
 for(const f of g.effects.filter(f=>f.type==='mosesBreath').slice(-24)){
  const age=f.maxLife-f.life,t=Math.max(0,Math.min(1,age/f.maxLife)),fade=Math.sin(Math.PI*t);const owner=g.units.find(e=>e.id===f.source);if(owner&&!g.visibleTo(g.player.team,owner))continue;
  for(let i=0;i<18;i++){const n=(i+.5)/18,angle=f.angle+(n-.5)*f.spread,travel=f.r*Math.min(1,t*1.45)*(.58+.42*((i*7)%13)/12),p={x:f.x+Math.cos(angle)*travel,y:f.y+Math.sin(angle)*travel};puff(c,camera,p,1.45-travel/f.r*.55,.16+t*.46,f.color,fade*.67);}
 }
 for(const e of g.champions().filter(e=>e.key==='moses'&&e.alive&&!g.hidden(e)&&g.visibleTo(g.player.team,e))){
  const s=e.state,r=s.mosesR,attack=s.mosesBreath,age=g.time-(attack?.at??-99),choosing=s.mosesChoosing,color=r?BREATHS.right.color:attack&&age>=0&&age<.65?attack.color:BREATHS[choosing?.direction??s.smoke]?.color||'#b6bdb9',active=r||choosing||s.smoke||age>=0&&age<.65;
  if(active){const d={x:Math.cos(e.facing||0),y:Math.sin(e.facing||0)};for(let i=0;i<5;i++){const t=(g.time*.8+i*.19)%1,p={x:e.x+d.x*(.18+t*.4),y:e.y+d.y*(.18+t*.4)};puff(c,camera,p,1.5+t*.2,.1+t*.16,color,(1-t)*.5);}
   if(choosing||s.smoke)for(let i=0;i<6;i++){const a=g.time*.55+i*Math.PI/3;puff(c,camera,{x:e.x+Math.cos(a)*.6,y:e.y+Math.sin(a)*.6},.45+((g.time*.25+i/6)%1)*.8,.25,color,.17);}
  }
  if(r&&g.time-r.at>=.25){const progress=Math.max(0,Math.min(1,(g.time-r.at-.25)/1.25)),d={x:Math.cos(r.angle),y:Math.sin(r.angle)},head={x:e.x+d.x*(.65+3.7*progress),y:e.y+d.y*(.65+3.7*progress)};column(c,camera,head,d,3.7*progress,.3+1.7*progress,.35+.65*progress);}
 }
 c.restore();
}
