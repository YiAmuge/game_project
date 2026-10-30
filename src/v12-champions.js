import * as Ppui from './ppui.js';
import { RULES,RUNTIME_CHAMPIONS as CHAMPIONS } from './data.js';
import { carried } from './attachments.js';
import { distance,direction } from './geometry.js';
import { settleBody } from './collision.js';
import { dash } from './skills.js';
import { KIM_WAVE_HALF_WIDTH,KIM_COUNTER_HALF_WIDTH } from './projectile-rules.js';

export const KIM={shield:60,shieldRatio:.012,shieldTime:5,qRange:2.8,qDamage:250,grab:1.8,throwDamage:100,rDamage:450,counterDamage:338};
export function recast(g,e,slot){return e.key==='kim'&&slot==='q'&&e.state.swordGrab?.until>g.time&&Boolean(carried(g,e));}
export function validate(g,e,slot,p){
 if(e.key==='kim'&&slot==='q'&&!recast(g,e,slot)&&(g.stat(e,'root')||g.stat(e,'captured')))return false;
 return true;
}
export function beforeBasic(){return true;}
export function basic(g,e,p,d){
 if(e.key==='kim'){
  if(e.state.followSlashUntil>g.time){e.state.kimWideSlashSerial=e.attackSerial;delete e.state.followSlashUntil;g.cone(e,d,g.attackRange(e)*1.2*1.08,1.9*1.3*1.2*1.08,210);g.addShield(e,100,`draw-${e.id}`,3);}
  else{delete e.state.kimWideSlashSerial;e.state.followSlashUntil=g.time+1.2;for(let i=0;i<3;i++)g.schedule(e,i*.1,()=>g.cone(e,d,g.attackRange(e),1.2*1.3,75));}return true;
 }
 if(e.key==='ppui'){
  for(let i=0;i<3;i++)g.schedule(e,i*.1,()=>g.bullet(e,d,75,g.attackRange(e),{theme:'ppui',width:.2}));
  return true;
 }return false;
}
export function releaseGrab(g,e,throwDirection){
 const grab=e.state.swordGrab;if(!grab)return;delete e.state.swordGrab;
 const t=grab.target;if(t.status.stun?.grabOwner===e.id)delete t.status.stun;if(t.state.swordHeldBy===e.id)delete t.state.swordHeldBy;
 settleBody(g,t,t.bodySafe);
 if(throwDirection&&t.alive){e.state.kimThrowAt=g.time;e.state.kimThrowFacing=Math.atan2(throwDirection.y,throwDirection.x);g.deal(e,t,KIM.throwDamage);g.startMotion(t,throwDirection,2.5,{kind:'knock'});}
}
function counterWave(g,e,counter){
 const s=e.state.counter;if(!s)return;if(counter)g.effects.push({type:'counterSignal',source:e.id,theme:'kim',x:e.x,y:e.y,r:1,life:.25,maxLife:.25});delete e.state.counter;e.channelUntil=0;e.ccImmuneUntil=s.immune;
 const fire=()=>{e.state.kimWaveAt=g.time;e.state.kimWaveFacing=s.angle;e.state.kimWaveDuration=counter?.115:.24;e.state.kimWaveSerial=(e.state.kimWaveSerial||0)+1;g.bullet(e,{x:Math.cos(s.angle),y:Math.sin(s.angle)},counter?KIM.counterDamage:KIM.rDamage,counter?8:6,{slot:'r',damageKind:'skill',width:counter?KIM_COUNTER_HALF_WIDTH:KIM_WAVE_HALF_WIDTH,pierce:Infinity,theme:'kim',swordWave:true,onHit:t=>{if(counter)g.status(t,'slow',.25,1.5,e);}});};
 fire();if(counter)for(let i=1;i<4;i++)g.schedule(e,i*.125,fire);
 g.effects.push({source:e.id,slot:'r',damageKind:'skill',type:'slash',x:e.x,y:e.y,r:(counter?5:3)/1.5,angle:s.angle,spread:counter?2.2:1.1,theme:'kim',life:.5,maxLife:.5});
}
export function cast(g,e,slot,p,d){
 if(e.key==='kim'){
  if(slot==='q'){
   if(recast(g,e,slot)){releaseGrab(g,e,d);return true;}
   let grabbed=false;dash(g,e,d,KIM.qRange,KIM.qDamage,t=>{
    if(grabbed||t.kind!=='champion'||!t.alive)return;grabbed=true;
    const previous=t.status.stun;g.status(t,'stun',1,KIM.grab,e);
    if(!g.stat(t,'stun')||t.status.stun===previous)return;
    const fallback=e.motion?.lastClear;delete e.motion;settleBody(g,e,fallback);
    if(t.state.swordHeldBy){const owner=g.units.find(a=>a.id===t.state.swordHeldBy);if(owner)releaseGrab(g,owner);}
    if(t.state.swordGrab)releaseGrab(g,t);
    delete t.motion;t.status.stun.grabOwner=e.id;t.state.swordHeldBy=e.id;e.state.swordGrab={target:t,until:t.status.stun.until,at:g.time};
   });
  }else{releaseGrab(g,e);e.state.counter={until:g.time+.5,angle:Math.atan2(d.y,d.x),immune:e.ccImmuneUntil||0};e.channelUntil=g.time+.5;e.ccImmuneUntil=g.time+.5;const counter=e.state.counter;g.schedule(e,.5,()=>{if(e.state.counter===counter)counterWave(g,e,false);});}
  return true;
 }
 if(e.key==='ppui'){
  if(slot==='q'){
   Ppui.cast(g,e);
  }else{
   e.ammo=g.ammoCap(e);e.reloadProgress=0;e.state.nailStorm={d:{...d},aim:{...p},until:g.time+2};
   for(let i=0;i<5;i++)g.schedule(e,i*.4,()=>{
    if(g.stat(e,'stun')||g.stat(e,'silence')){delete e.state.nailStorm;return;}
    const storm=e.state.nailStorm;if(!storm)return;const aim=distance(e,storm.aim)>.1?direction(e,storm.aim):storm.d;storm.d={...aim};const angle=Math.atan2(aim.y,aim.x);e.facing=angle;
    g.effects.push({type:'nailVolley',source:e.id,theme:'ppui',slot:'r',shape:{kind:'cone',range:7,spread:1.5,angle},x:e.x,y:e.y,angle,r:7,spread:1.5,life:.36,maxLife:.36});g.cone(e,aim,7,1.5,144,(t,actual)=>{g.heal(e,e,actual*.4,false);if((t.state?.nailPushReady||0)<=g.time){if(t.state)t.state.nailPushReady=g.time+.6;g.startMotion(t,aim,.5,{kind:'knock'});}});
   });
  }return true;
 }return false;
}
export function afterDamage(g,e,t,actual,proc,kind,absorbed=0){
 if(t.key==='kim'&&t.state.counter&&actual+absorbed>0&&e.team!==t.team)counterWave(g,t,true);
 if(proc&&actual+absorbed>0&&e.key==='kim'&&t.kind==='champion'&&e.team!==t.team&&e.passiveReady<=g.time){
  e.passiveReady=g.time+1;for(const ally of g.champions(e.team).filter(a=>a.alive&&distance(a,e)<=4)){g.addShield(ally,KIM.shield+e.maxHp*KIM.shieldRatio,`sword-${e.id}`,KIM.shieldTime);g.addBuff(ally,'swordDiscipline',KIM.shieldTime,{copy:false});}g.support(e);
 }
}

export function tick(g,e,dt){
 if(e.key==='kim'&&e.state.swordGrab&&(!carried(g,e)||g.stat(e,'stun')))releaseGrab(g,e);
 if(e.key!=='ppui')return;
 if(e.state.nailStorm?.until<=g.time)delete e.state.nailStorm;
}
export function onDeath(g,e){
 if(e.key==='kim')releaseGrab(g,e);
 for(const kim of g.champions().filter(a=>a.key==='kim'&&a.state.swordGrab?.target===e))releaseGrab(g,kim);
}
