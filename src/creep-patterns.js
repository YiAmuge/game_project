import { CAMP_RULES } from './data.js';
import { distance, direction, clearLine } from './geometry.js';

export function engage(g,e){if(!e.hostile){e.patternReady=g.time+CAMP_RULES.firstPattern;}e.hostile=true;}
export function cancel(e){delete e.pattern;delete e.channelUntil;}
export function update(g,e,target){
 if(!['amplify','blessing'].includes(e.camp))return false;
 if(e.pattern){
  if(g.stat(e,'stun')||g.stat(e,'silence')||e.motion?.forced){cancel(e);return true;}
  const p=e.pattern;
  if(g.time+1e-8>=p.at){
   cancel(e);
   for(const t of [...g.units]){
    if(!g.hostile(e,t))continue;
    const inside=distance(p,t)<=p.r+t.radius&&(()=>{const d=direction(p,t);return d.x*p.dx+d.y*p.dy>=Math.cos(p.spread/2);})();
    if(inside&&clearLine(p,t))g.deal(e,t,p.damage);
   }
   g.effects.push({type:'slash',x:p.x,y:p.y,r:p.r,angle:Math.atan2(p.dy,p.dx),spread:p.spread,color:'#9be2df',life:.4,maxLife:.4});
  }
  return true;
 }
 if(target&&g.time+1e-8>=(e.patternReady??Infinity)&&!g.stat(e,'stun')&&!g.stat(e,'silence')){
  const d=direction(e,target);
  e.pattern={kind:e.camp,x:e.x,y:e.y,dx:d.x,dy:d.y,r:4.6,spread:Math.PI*.65,damage:160,startedAt:g.time,at:g.time+2.65};
  e.channelUntil=e.pattern.at;e.patternReady=g.time+CAMP_RULES.patternEvery;return true;
 }
 return false;
}
export function draw(r,e,g){
 const p=e.pattern;if(!p||!e.alive||e.returning)return;
 const c=r.ctx,color=p.kind==='amplify'?'#df9cdb':'#9de5e2',left=Math.max(0,p.at-g.time),progress=1-left/(p.at-p.startedAt);
 c.save();c.strokeStyle=color;c.lineWidth=.08;c.fillStyle=color+'25';c.beginPath();
 {const a=Math.atan2(p.dy,p.dx);c.moveTo(p.x,p.y);c.arc(p.x,p.y,p.r,a-p.spread/2,a+p.spread/2);c.closePath();}c.fill();c.stroke();
  {const a=Math.atan2(p.dy,p.dx);r.line([{x:p.x,y:p.y},{x:p.x+Math.cos(a)*p.r*progress,y:p.y+Math.sin(a)*p.r*progress}],color,.1);}
 const label={x:p.x+p.dx*p.r*.6,y:p.y+p.dy*p.r*.6};r.text(`${left.toFixed(2)}s`,label.x,label.y,color,.42);r.text('집중 중 · 받는 피해 +20%',e.x,e.y-1.7,color,.28);c.restore();
}
