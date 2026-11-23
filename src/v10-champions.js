import * as Effects from './bough-effects.js';
import { distance,direction } from './geometry.js';
import { dash,area,dashLength } from './skills.js';
import { canOccupy,settleBody } from './collision.js';
import { trapPoint } from './confinement.js';

export const STARBUCK={basicRange:3.75,basicDash:3.75,qDamage:140,qRange:2.5,qRadius:2.5,qAngle:Math.PI*2,qInterval:0,qSlow:1.5,rRange:8,rRadius:1.8,rDamage:320,trapDuration:2.5};
export function validate(g,e,slot,p){return e.key!=='starbuck'||slot!=='r'||!g.blocked(p.x,p.y,e.radius)&&canOccupy(g,e,trapPoint(g,e,p),{phaseEnemies:true});}
export function basic(g,e,p,d){
 if(e.key!=='starbuck')return false;
 dash(g,e,d,dashLength(e,STARBUCK.basicDash),200,()=>{},{hitWidth:.75,exactWidth:true});return true;
}
export function cast(g,e,slot,p,d){
 if(e.key!=='starbuck')return false;
 if(slot==='q'){
  const old=e.state.starbuckChain,index=old?.until>g.time?old.index:0,bonus=old?.until>g.time?old.bonus:0,damage=STARBUCK.qDamage*(1+bonus);
  const point={x:p.x,y:p.y};e.state.starbuckStab={at:g.time,until:g.time+.32,point,angle:Math.atan2(d.y,d.x)};
  let hit=false;area(g,e,point,STARBUCK.qRadius,0,t=>{const shield=g.shield(t),actual=g.deal(e,t,damage),total=actual+Math.max(0,shield-g.shield(t));if(total<=0)return;hit=true;t.state??={};const stacks=t.state.starbuckSlows??={},prior=stacks[e.id];stacks[e.id]={amount:Math.min(.30,(prior?.until>g.time?prior.amount:0)+.13),until:g.time+1.5};g.status(t,'slow',stacks[e.id].amount,1.5,e);if(index===4&&t.alive)g.deal(e,t,total*.2,{fixed:true,proc:false,augmentOrigin:'starbuckQ'});});
  if(hit&&index<4){e.qCd=0;e.state.starbuckChain={index:index+1,bonus:bonus+.06,until:g.time+5};}else delete e.state.starbuckChain;
  g.effects.push({type:'starbuckSlam',source:e.id,x:point.x,y:point.y,r:STARBUCK.qRadius,angle:Math.atan2(d.y,d.x),theme:e.key,life:.38,maxLife:.38});
 }else{
  const origin={x:e.x,y:e.y},destination=trapPoint(g,e,p);e.untargetableUntil=g.time+.7;e.channelUntil=g.time+.7;
  g.effects.push({type:'ring',...origin,r:1,color:'#b4d9ce',life:.7,maxLife:.7},{type:'ring',...destination,r:STARBUCK.rRadius,color:'#b4d9ce',life:.7,maxLife:.7});
  const landingPoint=g.safeLanding(e,destination,8),len=distance(e,landingPoint);g.startMotion(e,direction(e,landingPoint),len,{kind:'leap',ignoreWalls:true,phaseEnemies:true,arcHeight:5,speed:len/.7,maxSpeed:Infinity,minDuration:.7,onComplete:()=>{
   e.untargetableUntil=0;e.channelUntil=0;e.state.starbuckLandedAt=g.time;g.emitSound?.('slam',e,{slot:'r',phase:'starbuck-landing',family:'spear',element:'water'});
   const landing=trapPoint(g,e,landingPoint);
   if(!g.blocked(landing.x,landing.y,e.radius)&&canOccupy(g,e,landing,{phaseEnemies:true})){Object.assign(e,landing);settleBody(g,e,origin);}
   const candidates=[];area(g,e,e,STARBUCK.rRadius,0,t=>{const before=t.hp+g.shield(t);g.deal(e,t,STARBUCK.rDamage);if(t.kind==='champion'&&t.alive&&t.hp+g.shield(t)<before)candidates.push(t);});
   const target=candidates.sort((a,b)=>a.hp-b.hp||a.id-b.id)[0];
   if(target&&!(target.ccImmuneUntil>g.time)&&!(target.invulnerableUntil>g.time)){
    g.status(target,Effects.empowered(e)?'root':'netCapture',1,STARBUCK.trapDuration,e);
    if(!Effects.empowered(e)&&g.stat(target,'netCapture'))target.state.netTrap={x:e.x,y:e.y,r:STARBUCK.rRadius,until:target.status.netCapture.until,source:e.id};
    g.status(target,'armorWeak',.1,STARBUCK.trapDuration,e);
   }
   e.qCd=0;e.ammo=g.ammoCap(e);e.reloadProgress=0;g.effects.push({type:'burst',x:e.x,y:e.y,r:STARBUCK.rRadius,theme:e.key,life:.6,maxLife:.6});
  }});
 }
 return true;
}
