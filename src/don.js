import { clamp } from './geometry.js';
import { rectangle } from './reworks.js';

export const DON_CHARGE={duration:1.2,width:2.1,minRange:3,maxRange:6.5,minDamage:120,maxDamage:450};
export const chargeDuration=(g,e)=>DON_CHARGE.duration/(1+g.buffValue(e,'donLifesteal',.5));
export function chargeShape(g,e,point){
 const progress=clamp((g.time-(e.state.donCharge?.at??g.time))/chargeDuration(g,e),0,1),d=g.aim(e,point||e.state.donCharge?.aim||e);
 return {progress,d,width:DON_CHARGE.width,range:DON_CHARGE.minRange+(DON_CHARGE.maxRange-DON_CHARGE.minRange)*progress,damage:(DON_CHARGE.minDamage+(DON_CHARGE.maxDamage-DON_CHARGE.minDamage)*progress)*(1+g.buffValue(e,'donLifesteal',.5))};
}
export function start(g,e,point){if(e.state.donCharge)return false;e.state.donCharge={at:g.time,aim:{...point}};e.qCd=0;return true;}
export function cancel(g,e){if(!e.state.donCharge)return false;delete e.state.donCharge;e.qCd=g.cooldown(e,'q');return true;}
export function release(g,e,point){
 if(e.key!=='don'||!e.state.donCharge)return false;
 if(!e.alive||g.stat(e,'stun')||g.stat(e,'silence')||g.stat(e,'captured')||g.stat(e,'netCapture')||g.hidden(e)||e.motion||e.recall){cancel(g,e);return false;}
 const shape=chargeShape(g,e,point),full=shape.progress>=1-1e-8;cancel(g,e);e.lastAttackAt=g.time;e.revealedUntil=g.time+1.25;e.facing=Math.atan2(shape.d.y,shape.d.x);e.state.donThrust={at:g.time,angle:e.facing,progress:shape.progress};
 return g.action(e,'skill',()=>{
  g.emitSound?.('swing',e,{slot:'q',phase:'charged-thrust',charge:shape.progress,weight:.9+shape.progress*.5});
  let connected=false,champion=false;
  rectangle(g,e,shape.d,shape.range,shape.width,shape.damage,t=>{if(t.invulnerableUntil>g.time||t.state?.posthumous||g.locked(t))return;connected=true;champion||=t.kind==='champion';if(full)g.status(t,'stun',1,1,e);});
  if(full&&connected)e.ammo=Math.min(g.ammoCap(e),e.ammo+2);
  if(full&&champion)e.qCd=Math.max(0,e.qCd-g.cooldown(e,'q')*.1);
  return true;
 });
}
export function tick(g,e){
 if(e.key!=='don'||!e.state.donCharge)return;
 if(!e.alive||g.stat(e,'stun')||g.stat(e,'silence')||g.stat(e,'captured')||g.stat(e,'netCapture')||g.hidden(e)||e.motion||e.recall){cancel(g,e);return;}
 const aim=e.player?g.input.aim:e.state.donCharge.aim;e.facing=Math.atan2(aim.y-e.y,aim.x-e.x);e.lastAttackAt=g.time;
 if(g.time-e.state.donCharge.at>=chargeDuration(g,e)-1e-8)release(g,e,aim);
}
