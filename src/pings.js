import { distance,direction } from './geometry.js';
export const PING_COLORS={attack:'#ff9b61',defend:'#86d8f7',danger:'#ff626c'};
export function targetAt(g,point){return g.units.filter(e=>e.alive&&g.visibleTo(g.player.team,e)&&['champion','neutral','tower','core'].includes(e.kind)&&!g.hidden(e)&&distance(e,point)<=Math.max(1.35,e.radius+.6)).sort((a,b)=>distance(a,point)-distance(b,point))[0];}
export function text(kind,t){
 const name=t?.name;
 if(kind==='attack')return !t?'해당 지점을 경계하라!':t.kind==='neutral'?`${name} 토벌 개시!`:['tower','core'].includes(t.kind)?`적 ${name}을 철거하라!`:t.kind==='champion'?`${name} 공격!`:'해당 지점을 경계하라!';
 if(kind==='defend')return !t?'해당 지점을 지켜라!':['tower','core'].includes(t.kind)?`아군 ${name} 방어!`:t.kind==='champion'?`${name} 보호!`:'해당 지점을 지켜라!';
 return !t?'해당 지점에서 후퇴하라!':t.kind==='neutral'?`${name} 토벌 포기!`:t.kind==='champion'?`${name}에게서 도주!`:'해당 지점에서 후퇴하라!';
}
export function send(g,kind,point){
 if(!PING_COLORS[kind]||!Number.isFinite(point?.x)||!Number.isFinite(point?.y)||g.winner!==null||g.time<(g.pingReady||0))return false;
 const b=g.bounds;if(point.x<b.x||point.x>b.x+b.w||point.y<b.y||point.y>b.y+b.h)return false;
 let target=targetAt(g,point);if(target&&target.kind!=='neutral'&&(kind==='defend'?target.team!==g.player.team:target.team===g.player.team))target=null;
 const p={kind,x:point.x,y:point.y,targetId:target?.id,at:g.time,until:g.time+8,team:g.player.team,label:text(kind,target)};
 g.pings??=[];g.pings.push(p);g.pings=g.pings.slice(-8);g.pingReady=g.time+.65;g.log(p.label,kind==='danger'?'enemy':'ally');return p;
}
export function live(g){return (g.pings||[]).filter(p=>p.until>g.time);}
// A champion target is a local instruction, not a reason for distant lanes to abandon combat.
export function respond(g,e,dt){
 const p=live(g).filter(p=>p.team===e.team).at(-1);if(!p)return false;
 const target=g.units.find(t=>t.id===p.targetId&&t.alive),champ=target?.kind==='champion';
 if(p.targetId&&!target)return false;
 const point=target||p,d=distance(e,point);if(d>(champ?12:27))return false;
 e.objective='ping-'+p.kind;
 if(p.kind==='danger'){
  if(d>11)return e.pingAvoidUntil===p.until;const v=direction(point,e);g.moveToward(e,{x:e.x+v.x*6,y:e.y+v.y*6},dt);e.pingAvoidUntil=p.until;return true;
 }
 if(p.kind==='attack'&&target){
  if(target.team===e.team||!g.visibleTo(e.team,target))return false;
  if(d>g.attackRange(e)+target.radius||!g.clearLine(e,target))g.moveToward(e,target,dt);else g.attack(e,target);
  const near=g.nearest(e,7,false);if(near?.kind==='champion'&&target.kind!=='champion')return false;
  return true;
 }
 if(p.kind==='defend'){
  if(target?.kind==='champion'&&d<=8){
   if(e.key==='queequeg'&&e.state.tether?.target!==target.id)g.cast(e,'q',target);
   if(e.key==='ppui'){g.attack(e,target);if(target.hp<target.maxHp*.85)g.cast(e,'q',target);}
  }
  const threat=g.champions(1-e.team).filter(t=>t.alive&&g.visibleTo(e.team,t)&&distance(t,point)<=8).sort((a,b)=>distance(a,point)-distance(b,point))[0];
  if(threat){if(distance(e,threat)>g.attackRange(e)+threat.radius)g.moveToward(e,threat,dt);else g.attack(e,threat);return true;}
 }
 if(d>2.8){g.moveToward(e,point,dt);return true;}
 return false;
}
export function drawWorld(c,camera,g){for(const p of live(g)){
 const age=g.time-p.at,phase=age%1,base=camera.worldToScreen(p,.08),top=camera.worldToScreen(p,1.8+.25*Math.sin(age*5)),color=PING_COLORS[p.kind];
 c.save();c.strokeStyle=color;c.fillStyle=color;c.lineWidth=2;c.globalAlpha=.7*(1-phase)+.2;c.beginPath();c.ellipse(base.x,base.y,14+phase*24,7+phase*12,0,0,Math.PI*2);c.stroke();
 c.globalAlpha=.85;c.setLineDash([3,4]);c.beginPath();c.moveTo(top.x,top.y+9);c.lineTo(base.x,base.y);c.stroke();c.setLineDash([]);c.font='bold 24px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(p.kind==='danger'?'!':p.kind==='defend'?'◆':'⚔',top.x,top.y);c.restore();
}}
