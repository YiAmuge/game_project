import { distance,blocked } from './geometry.js';
import { dash,area } from './skills.js';
import { canOccupy,settleBody } from './collision.js';

export const STARBUCK={basicRange:2.6,qDamage:150,qRange:2.6,qSlow:1.5,rRange:8,rRadius:1.8,rDamage:320};
export function validate(g,e,slot,p){return e.key!=='starbuck'||slot!=='r'||!blocked(p.x,p.y,e.radius)&&canOccupy(g,e,p,{phaseEnemies:true});}
export function basic(g,e,p,d){
 if(e.key!=='starbuck')return false;
 const strike=()=>g.cone(e,d,g.attackRange(e),.75,190);
 strike();if(e.state.fullAmmo)dash(g,e,d,2.5,0,()=>{},{offensive:true});return true;
}
export function cast(g,e,slot,p,d){
 if(e.key!=='starbuck')return false;
 if(slot==='q'){
  const stab=index=>{
   if(!e.alive||g.stat(e,'silence')||g.stat(e,'stun'))return;
   e.lastAttackAt=g.time;e.attackAt=g.time;e.attackFacing=Math.atan2(d.y,d.x);
   let hit=false;g.cone(e,d,STARBUCK.qRange,.7,STARBUCK.qDamage*1.03**index,t=>{hit=true;g.status(t,'slow',.2,STARBUCK.qSlow,e);});
   if(hit&&index<4)g.schedule(e,.45,()=>stab(index+1));
  };stab(0);
 }else{
  const origin={x:e.x,y:e.y},destination={...p};e.untargetableUntil=g.time+.7;e.channelUntil=g.time+.7;
  g.effects.push({type:'ring',...origin,r:1,color:'#b4d9ce',life:.7,maxLife:.7});
  g.effects.push({type:'ring',...destination,r:STARBUCK.rRadius,color:'#b4d9ce',life:.7,maxLife:.7});
  g.schedule(e,.7,()=>{
   e.untargetableUntil=0;e.channelUntil=0;
   if(!blocked(destination.x,destination.y,e.radius)&&canOccupy(g,e,destination,{phaseEnemies:true})){Object.assign(e,destination);settleBody(g,e,origin);}
   let hit=false;area(g,e,e,STARBUCK.rRadius,0,t=>{const before=t.hp+g.shield(t);g.deal(e,t,STARBUCK.rDamage);if(t.hp+g.shield(t)<before)hit=true;});
   if(hit)e.qCd=0;g.effects.push({type:'burst',x:e.x,y:e.y,r:STARBUCK.rRadius,theme:e.key,life:.6,maxLife:.6});
  });
 }
 return true;
}
