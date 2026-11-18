import {MAXIM as P,maximUltimateArea} from './maxim-data.js';
import {distance,direction,segmentDistance} from './geometry.js';

export const rushing=e=>e.key==='maxim'&&Boolean(e.state?.maximQ);
export const speedBonus=(g,e)=>rushing(e)?Math.min(P.qSpeedCap,Math.floor((g.time-e.state.maximQ.at+1e-8)/P.qStep)*P.qSpeedStep):0;
export const startupFactor=(g,e)=>rushing(e)&&g.time-e.state.maximQ.at<P.qStartup-1e-8?.2:1;
export const rushDamage=length=>P.qDamage+Math.min(P.qBonusCap,Math.max(0,length)/P.qDistance*P.qBonus);
const sound=(g,e,kind,slot,phase)=>g.emitSound(kind,e,{slot,family:'hammer',element:'physical',phase,weight:1.4});
const fx=(g,e,type,values={})=>g.effects.push({type,source:e.id,theme:'maxim',x:e.x,y:e.y,angle:e.facing,life:.45,maxLife:.45,...values});
function impact(g,e,slot,damage,radius,stun=0){
 sound(g,e,'slam',slot,'maxim-impact');
 for(const t of [...g.units])if(g.hostile(e,t)&&distance(e,t)<=radius+t.radius&&g.clearLine(e,t)){
  g.deal(e,t,damage,{damageKind:'skill',sound:{family:'hammer',element:'physical',slot}});
  if(stun&&t.alive)g.status(t,'stun',1,stun,e);
 }
 fx(g,e,'maximImpact',{r:radius,life:.5,maxLife:.5});
}
export function init(g,e){if(e.key!=='maxim')return;delete e.state.maximQ;delete e.state.maximR;}
export function moved(g,e,from,{forced=false}={}){
 if(e.key!=='maxim'||!e.alive||forced||!from)return;
 const length=distance(from,e);if(length<=1e-8)return;
 const s=e.state;s.rhinoDistance=Math.min(P.passiveDistance,(s.rhinoDistance||0)+length);
 if(s.rhinoDistance<P.passiveDistance-1e-8||(s.rhinoReady||0)>g.time+1e-8)return;
 s.rhinoDistance=0;s.rhinoReady=g.time+P.passiveCooldown;
 const source=`maxim-rhino-${e.id}`,old=e.shields.find(v=>v.source===source&&v.until>g.time),value=Math.min(e.maxHp*P.shieldCap,(old?.value||0)+e.maxHp*P.shield);
 g.addShield(e,value,source,P.shieldDuration,false);e.rCd=Math.max(0,e.rCd-P.rRefund);fx(g,e,'maximGuard',{r:.8,life:.4,maxLife:.4});
}
export function attack(g,e,point){
 if(rushing(e)||e.state.maximR||e.ammo<1)return false;
 const near=distance(e,point)<=P.nearRange+1e-8;
 if(!near&&(g.stat(e,'root')||g.stat(e,'captured')))return false;
 const d=g.aim(e,point),angle=Math.atan2(d.y,d.x),origin={x:e.x,y:e.y};
 e.state.fullAmmo=e.ammo>=g.ammoCap(e);e.ammo--;e.reloadProgress=0;e.attackCd=g.attackInterval(e);e.attackAt=e.lastAttackAt=g.time;e.attackFacing=e.facing=angle;e.attackSerial=(e.attackSerial||0)+1;e.healingEvent={key:`basic-${e.id}-${e.attackSerial}`,at:g.time};e.revealedUntil=g.time+1.25;
 e.state.maximAttack={at:g.time,until:g.time+(near?.28:.3),angle,near};g.cancelRecall(e);sound(g,e,'swing',undefined,near?'maxim-sweep':'maxim-charge');
 if(near){g.cone(e,d,P.nearRange,Math.PI,P.swingDamage,()=>{},{sound:{family:'hammer',element:'physical'}});fx(g,e,'maximSwing',{r:P.nearRange,life:.25,maxLife:.25});return true;}
 const len=Math.min(g.attackRange(e),distance(e,point)),hits=new Set();
 return g.startMotion(e,d,len,{speed:P.dashSpeed,maxSpeed:P.dashSpeed,phaseEnemies:true,actionTag:'maximBasic',onStep:(from,to)=>{
  for(const t of [...g.units])if(g.hostile(e,t)&&!hits.has(t.id)&&segmentDistance(t,from,to)<=t.radius+e.radius+.18&&g.clearLine(from,t)){
   hits.add(t.id);g.deal(e,t,P.dashDamage,{damageKind:'basic',sound:{family:'hammer',element:'physical'}});
  }
 },onComplete:()=>fx(g,e,'maximDust',{x:e.x,y:e.y,from:origin,r:.8,life:.3,maxLife:.3})});
}
export function stop(g,e){
 if(!rushing(e))return false;
 delete e.state.maximQ;e.qCd=g.cooldown(e,'q');if(e.motion?.actionTag==='maximQ')delete e.motion;return true;
}
export const release=(g,e)=>stop(g,e);
export function validate(g,e,slot){return !rushing(e)&&!e.state.maximR&&(slot!=='q'||!g.stat(e,'root')&&!g.stat(e,'captured'));}
export function cast(g,e,slot,point,d){
 if(slot==='q'){
  e.qCd=0;const q=e.state.maximQ={at:g.time,until:g.time+P.qDuration,distance:0,target:point.id};sound(g,e,'charge','q','maxim-rush');
  if(!g.startMotion(e,d,1000000,{speed:g.speed(e),maxSpeed:1000,phaseCreeps:true,actionTag:'maximQ',onStep:(from,to)=>{if(e.state.maximQ===q)q.distance+=distance(from,to);},onCollision:({obstacle:t})=>{
   if(e.state.maximQ!==q)return;
   const duration=g.time-q.at;stop(g,e);
   if(t?.kind==='champion'&&g.hostile(e,t))impact(g,e,'q',rushDamage(q.distance),P.qRadius,duration+1e-8>=P.qStunAfter?P.qStun:0);
  },onComplete:()=>stop(g,e)}))stop(g,e);
  return;
 }
 delete e.state.maximRFade;e.state.maximR={at:g.time,until:g.time+P.rWindup,angle:Math.atan2(d.y,d.x)};e.channelUntil=g.time+P.rWindup;sound(g,e,'charge','r','maxim-raise');
}
export function prepare(g,e,dt){
 if(!rushing(e))return;const q=e.state.maximQ,m=e.motion;
 if(m?.actionTag!=='maximQ'||g.stat(e,'stun')||g.stat(e,'root')||g.stat(e,'captured')||g.stat(e,'silence')||g.stat(e,'taunt')){stop(g,e);return;}
 const aim=e.player?g.input.aim:g.units.find(t=>t.id===q.target&&t.alive)||{x:e.x+Math.cos(e.facing),y:e.y+Math.sin(e.facing)},d=direction(e,aim);
 if(distance(e,aim)>.03){m.dx=d.x;m.dy=d.y;e.facing=Math.atan2(d.y,d.x);}
 m.speed=g.speed(e);if(g.time+1e-8>=q.until){m.speed*=Math.max(0,Math.min(1,(q.until-(g.time-dt))/dt));q.finished=true;}
}
export function tick(g,e){
 if(e.key!=='maxim')return;
 if(e.state.maximQ?.finished||e.state.maximQ&&e.motion?.actionTag!=='maximQ')stop(g,e);
 const r=e.state.maximR;if(!r)return;
 if(g.stat(e,'stun')||g.stat(e,'silence')||e.motion?.forced||e.channelUntil+1e-8<r.until){e.state.maximRFade={at:g.time,from:r.at};delete e.state.maximR;e.channelUntil=Math.min(e.channelUntil||0,g.time);return;}
 if(g.time+1e-8<r.until)return;
 delete e.state.maximR;e.channelUntil=Math.min(e.channelUntil||0,g.time);e.state.maximSlam={at:g.time,angle:r.angle};const area=maximUltimateArea(e,r.angle);
 g.action(e,'skill',()=>{sound(g,e,'slam','r','maxim-earth');g.cone(e,{x:Math.cos(area.angle),y:Math.sin(area.angle)},area.range,area.spread,P.rDamage,t=>{if(t.alive){g.status(t,'stun',1,P.rStun,e);g.status(t,'armorWeak',P.rArmorDown,P.rStun,e);}},{sound:{family:'hammer',element:'physical',slot:'r'},visual:false});});
 fx(g,e,'maximEarth',{area,x:area.x,y:area.y,angle:area.angle,r:area.range,spread:area.spread,life:.65,maxLife:.65});
}
