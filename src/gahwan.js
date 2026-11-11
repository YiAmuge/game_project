import{distance}from'./geometry.js';

export const GAHWAN={charge:1.5,chargeArmor:15,range:10,angle:Math.PI,damage:350,bonus:100,contemptTime:3,slow:.5,slowTime:1,weak:.15,weakTime:3,stunTime:.5};
export const hasContempt=(g,t)=>Object.values(t.state?.contempt||{}).some(until=>until>g.time);
export function contempt(g,e,t){
 if(!t.alive||t.hp<=0||g.debuffImmune?.(t))return;
 t.state.gaze={};(t.state.contempt??={})[e.id]=g.time+GAHWAN.contemptTime;
 t.revealedUntil=Math.max(t.revealedUntil||0,g.time+GAHWAN.contemptTime);t.visuals.contempt={until:g.time+GAHWAN.contemptTime,theme:'gahwan'};g.triggerDisrupt(e,t);
}
export function gaze(g,e,t,n=1){
 if(t.kind!=='champion'||!t.alive||t.hp<=0||g.debuffImmune?.(t)||hasContempt(g,t))return;
 g.triggerDisrupt(e,t);const mark=(t.state.gaze??={})[e.id]??={n:0,until:0};if(mark.until<=g.time)mark.n=0;mark.n+=n;mark.until=g.time+5;
 if(mark.n>=5)contempt(g,e,t);
}
export function cast(g,e,d){e.channelUntil=g.time+GAHWAN.charge;e.state.gahwanR={at:g.time,until:e.channelUntil,angle:Math.atan2(d.y,d.x)};}
export function cancel(e){if(e.state?.gahwanR){delete e.state.gahwanR;e.channelUntil=0;}}
export function tick(g,e){
 if(e.key!=='gahwan')return;const r=e.state.gahwanR;if(!r)return;
 if(!e.alive||g.stat(e,'stun')||g.stat(e,'silence')||g.hidden(e)){cancel(e);return;}
 if(g.time+1e-8<r.until)return;cancel(e);e.state.gahwanRelease={at:g.time,angle:r.angle};
 g.action(e,'skill',()=>{
  const d={x:Math.cos(r.angle),y:Math.sin(r.angle)};
  for(const t of [...g.champions(1-e.team)]){
   if(!g.hostile(e,t)||distance(e,t)>GAHWAN.range+t.radius||!g.clearLine(e,t))continue;
   const dx=t.x-e.x,dy=t.y-e.y;if(dx*d.x+dy*d.y< -1e-8)continue;
   // Resolve the stronger hit from the mark that existed before this attack.
   const marked=hasContempt(g,t),shield=g.shield(t),actual=g.deal(e,t,GAHWAN.damage+(marked?GAHWAN.bonus:0),{damageKind:'skill',sound:{family:'blade',slot:'r'}});
   if(actual<=0&&g.shield(t)>=shield)continue;
   g.status(t,'slow',GAHWAN.slow,GAHWAN.slowTime,e);
   if(marked){g.status(t,'weak',GAHWAN.weak,GAHWAN.weakTime,e);g.status(t,'armorWeak',GAHWAN.weak,GAHWAN.weakTime,e);g.status(t,'stun',1,GAHWAN.stunTime,e);}
   contempt(g,e,t);
  }
 });
 g.emitSound('swing',e,{slot:'r',damageKind:'skill',family:'blade'});
 g.effects.push({type:'gahwanWave',source:e.id,theme:'gahwan',slot:'r',x:e.x,y:e.y,r:GAHWAN.range,angle:r.angle,spread:GAHWAN.angle,shape:{kind:'cone',range:GAHWAN.range,angle:r.angle,spread:GAHWAN.angle},life:.32,maxLife:.32});
}
