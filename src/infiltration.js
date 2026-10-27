import { distance,clamp } from './geometry.js';
import { canOccupy,settleBody } from './collision.js';
import { has } from './augments.js';
import { withinTrap } from './confinement.js';
export const INFILTRATION={range:35,channel:1.75,arrival:.5,cooldown:75,cancelCooldown:1.5,stride:.1,strideDuration:2,cursorSpeed:45,precisionSpeed:9};
export const range=(g,e)=>INFILTRATION.range+(e.key==='jamila'?10:0);
export const replacesRecall=(g,e)=>has(e,'highRisk');
export const absent=e=>Boolean(e.state?.infiltration);
export const selecting=e=>e.state?.infiltration?.phase==='selecting';
export const origin=(g,e)=>e.state?.infiltration?.origin||e.recall?.origin||e;
export function ready(g,e){return replacesRecall(g,e)&&e.alive&&!e.state.posthumous&&!e.motion&&!g.hidden(e)&&!g.stat(e,'stun')&&!g.stat(e,'silence')&&!g.stat(e,'root')&&!(e.channelUntil>g.time)&&(e.state.infiltrationReady||0)<=g.time&&g.winner===null;}
export function valid(g,e,point){return Boolean(point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&distance(origin(g,e),point)<=range(g,e)+1e-8&&withinTrap(g,e,point)&&canOccupy(g,e,point,{phaseEnemies:false}));}
export function begin(g,e){
 if(!ready(g,e)||e.recall)return false;
 e.recall={infiltration:true,origin:{x:e.x,y:e.y},startedAt:g.time,until:g.time+INFILTRATION.channel,x:e.x,y:e.y};
 e.state.infiltrationReady=g.time+INFILTRATION.cooldown;
 if(e.player){g.input.x=0;g.input.y=0;g.input.fire=false;}return true;
}
// The vulnerable channel ends before the actor disappears and the landing cursor moves.
export function complete(g,e){
 const cast=e.recall;if(!cast?.infiltration)return false;
 if(!replacesRecall(g,e)){g.cancelRecall(e);return false;}
 delete e.recall;e.path=[];e.retreat=false;
 e.state.infiltration={phase:'selecting',origin:{...cast.origin},point:{x:e.x,y:e.y},at:g.time};
 if(e.player)g.input.fire=false;
 g.effects.push({type:'ring',x:e.x,y:e.y,r:1.3,color:'#8bbfe7',life:.45,maxLife:.45});return true;
}
export function confirm(g,e,point=e.state?.infiltration?.point){
 const cast=e.state?.infiltration;if(!selecting(e)||!valid(g,e,point))return false;
 cast.point={x:point.x,y:point.y};cast.phase='arriving';cast.until=g.time+INFILTRATION.arrival;
 if(e.player)g.input.fire=false;return true;
}
export function arrive(g,e,point=e.state?.infiltration?.point){
 if(!absent(e)||!valid(g,e,point))return false;Object.assign(e,point);delete e.state.infiltration;e.path=[];e.retreat=false;g.addBuff(e,'infiltrationStride',INFILTRATION.strideDuration,{copy:false});g.effects.push({type:'ring',x:e.x,y:e.y,r:2.5,color:'#8bbfe7',life:.65,maxLife:.65});return true;
}
export function cancel(g,e){
 const cast=e.state?.infiltration;if(!cast&&!e.recall?.infiltration)return false;
 if(cast){Object.assign(e,cast.origin);delete e.state.infiltration;settleBody(g,e,cast.origin);}
 delete e.recall;e.state.infiltrationReady=g.time+INFILTRATION.cancelCooldown;return true;
}
export function tick(g,e,dt){
 const cast=e.state?.infiltration;if(!cast)return;
 if(!e.alive||!replacesRecall(g,e)){cancel(g,e);return;}
 if(cast.phase==='selecting'){
  const input=e.player?g.input:{x:0,y:0},length=Math.hypot(input.x,input.y)||1,speed=input.precision?INFILTRATION.precisionSpeed:INFILTRATION.cursorSpeed,b=g.bounds;
  const point={x:clamp(cast.point.x+input.x/length*speed*dt,b.x+e.radius,b.x+b.w-e.radius),y:clamp(cast.point.y+input.y/length*speed*dt,b.y+e.radius,b.y+b.h-e.radius)},d=distance(cast.origin,point);
  if(d>range(g,e)){point.x=cast.origin.x+(point.x-cast.origin.x)*range(g,e)/d;point.y=cast.origin.y+(point.y-cast.origin.y)*range(g,e)/d;}
  cast.point=point;
  if(e.player&&input.fire)confirm(g,e);
  if(!e.player&&g.time-cast.at>.2)confirm(g,e);
 }else if(g.time+1e-8>=cast.until){
  if(!valid(g,e,cast.point)){cast.phase='selecting';return;}
  arrive(g,e,cast.point);
 }
}
export function draw(c,camera,g){
 const e=g.player,cast=e.state?.infiltration;if(!cast)return;
 const point=cast.point,color=valid(g,e,point)?'#94d5ff':'#f27b79',base=camera.worldToScreen(point,.1),edge=camera.worldToScreen({x:point.x+1,y:point.y},.1),radius=Math.abs(edge.x-base.x),arriving=cast.phase==='arriving';
 c.save();c.strokeStyle='#80bde17a';c.lineWidth=2;c.setLineDash([6,5]);c.beginPath();for(let i=0;i<=96;i++){const a=i*Math.PI/48,p=camera.worldToScreen({x:cast.origin.x+Math.cos(a)*range(g,e),y:cast.origin.y+Math.sin(a)*range(g,e)},.07);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();c.setLineDash([]);
 c.strokeStyle=color;c.fillStyle=arriving?'#8ccfff44':'#80caff18';c.lineWidth=2.5;c.beginPath();c.ellipse(base.x,base.y,radius*.85,radius*.55,0,0,Math.PI*2);c.fill();c.stroke();
 if(arriving){c.lineWidth=5;c.beginPath();c.ellipse(base.x,base.y,radius*.85,radius*.55,0,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,1-(cast.until-g.time)/INFILTRATION.arrival));c.stroke();}
 for(const side of [-1,1]){c.beginPath();c.moveTo(base.x+side*radius*1.15,base.y);c.lineTo(base.x+side*radius*.5,base.y);c.moveTo(base.x,base.y+side*radius*.8);c.lineTo(base.x,base.y+side*radius*.35);c.stroke();}c.restore();
}
