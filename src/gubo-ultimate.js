import{distance,direction}from'./geometry.js';
export const GUBO_ULTIMATE={aim:1.2,speed:160,damage:500};
function valid(g,w){return w.until>g.time&&w.target.alive&&(w.projectile?g.projectiles.includes(w.projectile):w.source.alive&&g.units.includes(w.source)&&w.source.state.guboAim?.ward===w);}
export function guarded(g,e){return Object.values(e.guboWards||{}).some(w=>valid(g,w));}
function release(w){if(w?.target.guboWards)delete w.target.guboWards[w.id];}
export function cancel(g,e){const a=e.state?.guboAim;if(!a)return;release(a.ward);delete e.state.guboAim;e.channelUntil=Math.min(e.channelUntil||g.time,g.time);}
export function start(g,e,target){
 cancel(g,e);const allied=target.team===e.team,at=g.time,aim={target,at,until:at+GUBO_ULTIMATE.aim,allied};
 if(allied){const id=`${e.id}/${e.castSerial}`,ward={id,source:e,target,until:at+4};(target.guboWards??={})[id]=ward;aim.ward=ward;}
 e.channelUntil=aim.until;e.state.guboAim=aim;
 g.schedule(e,GUBO_ULTIMATE.aim,()=>{
  if(e.state.guboAim!==aim||!target.alive||!g.units.includes(target)){cancel(g,e);return;}
  delete e.state.guboAim;const d=direction(e,target),p={source:e,target,homing:true,guboUltimate:true,ward:aim.ward,allied,damageKind:'skill',slot:'r',theme:'gubo',bornAt:g.time,origin:{x:e.x,y:e.y},x:e.x,y:e.y,dx:d.x,dy:d.y,speed:GUBO_ULTIMATE.speed,width:.16,remaining:3,damage:GUBO_ULTIMATE.damage};
  if(p.ward){p.ward.projectile=p;p.ward.until=g.time+3;}g.emitSound?.('shot',e);g.projectiles.push(p);g.effects.push({source:e.id,theme:'gubo',type:'guboLaser',x:e.x,y:e.y,to:{x:target.x,y:target.y},life:.16,maxLife:.16});
 });return true;
}
export function tick(g){
 for(const e of g.units){const a=e.state?.guboAim;if(a&&(!e.alive||!a.target.alive||!g.units.includes(a.target)||g.stat(e,'stun')))cancel(g,e);if(e.guboWards)for(const [id,w]of Object.entries(e.guboWards))if(!valid(g,w))delete e.guboWards[id];}
}
export function flight(g,p,dt){
 if(g.time<=p.bornAt+1e-8)return;
 const t=p.target;p.remaining-=dt;if(p.remaining<=0||!t.alive||!g.units.includes(t)||g.hidden(t)){p.remaining=0;release(p.ward);return;}
 const d=direction(p,t);p.dx=d.x;p.dy=d.y;const step=p.speed*dt;
 if(distance(p,t)>step+t.radius){p.x+=d.x*step;p.y+=d.y*step;return;}
 p.x=t.x;p.y=t.y;p.remaining=0;p.hit=true;release(p.ward);const e=p.source;
 g.action(e,'skill',()=>{e.state.guboLaserFiring=true;try{if(p.allied){e.state.guboUltimateExecuting=t.id;g.kill(t,e);}else g.deal(e,t,p.damage,{damageKind:'skill'});}finally{delete e.state.guboLaserFiring;delete e.state.guboUltimateExecuting;}});
 g.effects.push({source:e.id,target:t.id,type:'guboBulletImpact',theme:'gubo',x:t.x,y:t.y,r:.8,life:.35,maxLife:.35});
}
