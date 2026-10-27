import { distance,direction } from './geometry.js';
import { dash,area,dashLength } from './skills.js';
import { canOccupy,settleBody } from './collision.js';
import { trapPoint } from './confinement.js';

export const STARBUCK={basicRange:3.38,basicDash:2.875,qDamage:150,qRange:2.782,qAngle:1.6478,qInterval:.3,qSlow:1.5,rRange:8,rRadius:1.8,rDamage:320,trapDuration:2.5};
export function validate(g,e,slot,p){return e.key!=='starbuck'||slot!=='r'||!g.blocked(p.x,p.y,e.radius)&&canOccupy(g,e,trapPoint(g,e,p),{phaseEnemies:true});}
export function basic(g,e,p,d){
 if(e.key!=='starbuck')return false;
 g.cone(e,d,g.attackRange(e),.975*1.2,218.5);dash(g,e,d,dashLength(e,STARBUCK.basicDash),0,()=>{},{offensive:true});return true;
}
export function cast(g,e,slot,p,d){
 if(e.key!=='starbuck')return false;
 if(slot==='q'){
  const hits=new Map(),chain={d:{...d},until:g.time+.3};e.state.starbuckStab=chain;
  const stab=index=>{
   if(!e.alive||g.stat(e,'silence')||g.stat(e,'stun')){delete e.state.starbuckStab;return;}
   e.lastAttackAt=g.time;e.attackAt=g.time;e.attackFacing=Math.atan2(d.y,d.x);
   let hit=false;g.cone(e,d,STARBUCK.qRange,STARBUCK.qAngle,STARBUCK.qDamage*1.045**index,t=>{
    hit=true;g.status(t,'slow',.2,STARBUCK.qSlow,e);const count=(hits.get(t.id)||0)+1;hits.set(t.id,count);
    if(count>=3&&t.kind==='champion')g.status(t,'root',1,.35,e);
   });
   g.effects.push({type:'slash',x:e.x,y:e.y,r:STARBUCK.qRange,angle:Math.atan2(d.y,d.x),spread:STARBUCK.qAngle,theme:e.key,life:.2,maxLife:.2});
   chain.until=g.time+(hit&&index<4?STARBUCK.qInterval+.08:.16);
   if(hit&&index<4)g.schedule(e,STARBUCK.qInterval,()=>stab(index+1));
  };stab(0);
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
    g.status(target,'netCapture',1,STARBUCK.trapDuration,e);
    if(g.stat(target,'netCapture'))target.state.netTrap={x:e.x,y:e.y,r:STARBUCK.rRadius,until:target.status.netCapture.until,source:e.id};
    g.status(target,'armorWeak',.1,STARBUCK.trapDuration,e);
   }
   e.qCd=0;e.ammo=g.ammoCap(e);e.reloadProgress=0;g.effects.push({type:'burst',x:e.x,y:e.y,r:STARBUCK.rRadius,theme:e.key,life:.6,maxLife:.6});
  }});
 }
 return true;
}
