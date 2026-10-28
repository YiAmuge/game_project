import { distance,direction } from './geometry.js';

export const BOSS_RULES={health:9750,attack:297.5,aggroRange:8.5,cleaveRadius:1.15,shockEvery:5,shockWindup:1.15,shockRange:7,shockWidth:.7,shockSpeed:10,shockDamage:240,knock:2,marksEvery:7,markWindup:2.15,markRadius:1.25,markDamage:180,root:.8};
export function engage(g,e){if(!e.hostile){e.bossShockReady=g.time+BOSS_RULES.shockEvery;e.bossMarksReady=g.time+BOSS_RULES.marksEvery;}e.hostile=true;}
export function cancel(e){delete e.bossPattern;e.bossMarkers=[];delete e.bossShockReady;delete e.bossMarksReady;delete e.bossIdleSince;}
export function basic(g,e,t){
 g.emitSound?.('swing',e,{phase:'boss-swing'});
 e.swingAt=g.time;e.swingUntil=g.time+.3;
 for(const u of [...g.units])if(g.hostile(e,u)&&distance(t,u)<=BOSS_RULES.cleaveRadius+u.radius&&g.clearLine(t,u))g.deal(e,u,e.damage);
 g.effects.push({type:'burst',x:t.x,y:t.y,r:BOSS_RULES.cleaveRadius,theme:'boss',life:.3,maxLife:.3});
}
export function update(g,e,dt=1/30){
 // The boss cannot be displaced by navigation, unit separation or forced movement.
 Object.assign(e,e.home);e.returning=false;
 if(!e.hostile){if(g.time-e.lastCombat>5)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*dt);return;}
 e.bossShockReady??=g.time+BOSS_RULES.shockEvery;e.bossMarksReady??=g.time+BOSS_RULES.marksEvery;e.bossMarkers??=[];
 for(const m of e.bossMarkers)if(g.time+1e-8>=m.at&&!m.done){m.done=true;g.emitSound?.('detonation',e,{phase:'boss-mark',x:m.x,y:m.y});for(const t of [...g.units])if(g.hostile(e,t)&&distance(m,t)<=m.r+t.radius&&g.clearLine(m,t)){g.deal(e,t,BOSS_RULES.markDamage);g.status(t,'root',1,BOSS_RULES.root,e);}g.effects.push({type:'burst',x:m.x,y:m.y,r:m.r,theme:'boss',life:.5,maxLife:.5});}
 e.bossMarkers=e.bossMarkers.filter(m=>!m.done);
 const possible=g.units.filter(t=>['champion','minion'].includes(t.kind)&&t.alive&&!g.hidden(t)&&distance(e,t)<=BOSS_RULES.aggroRange&&g.clearLine(e,t));
 const target=possible.find(t=>t.id===e.aggro)||possible.sort((a,b)=>distance(e,a)-distance(e,b))[0];
 if(target)delete e.bossIdleSince;else e.bossIdleSince??=g.time;
 if(!target&&g.time-e.bossIdleSince>3){e.hostile=false;e.aggro=null;cancel(e);return;}
 if(g.time+1e-8>=e.bossMarksReady){
  e.bossMarksReady=g.time+BOSS_RULES.marksEvery;
  for(const t of g.champions().filter(t=>t.alive&&!g.hidden(t)&&distance(e,t)<=BOSS_RULES.aggroRange))e.bossMarkers.push({x:t.x,y:t.y,r:BOSS_RULES.markRadius,at:g.time+BOSS_RULES.markWindup,startedAt:g.time,visible:g.visibleTo(0,t),visibleTeams:[g.visibleTo(0,t),g.visibleTo(1,t)]});
 }
 if(e.bossPattern){
  if(g.stat(e,'stun')||g.stat(e,'silence')){delete e.bossPattern;return;}
  if(g.time+1e-8>=e.bossPattern.at){const p=e.bossPattern;delete e.bossPattern;e.swingAt=g.time;e.swingUntil=g.time+.3;g.bullet(e,p.d,BOSS_RULES.shockDamage,BOSS_RULES.shockRange,{speed:BOSS_RULES.shockSpeed,width:BOSS_RULES.shockWidth,pierce:Infinity,knock:BOSS_RULES.knock,theme:'boss',color:'#d8a7ec'});}
  return;
 }
 if(g.stat(e,'stun')||g.stat(e,'silence'))return;
 if(target&&g.time+1e-8>=e.bossShockReady){const d=direction(e,target);e.bossPattern={x:target.x,y:target.y,d,startedAt:g.time,at:g.time+BOSS_RULES.shockWindup};e.bossShockReady=g.time+BOSS_RULES.shockEvery;return;}
 if(target&&distance(e,target)<=e.range+target.radius&&e.attackCd<=0){basic(g,e,target);e.attackCd=e.interval;}
}
export function draw(r,e,g){
 if(!e.alive)return;const c=r.ctx,p=e.bossPattern,color='#d9a6ef';
 c.save();
 if(p){const d=p.d,n={x:-d.y*BOSS_RULES.shockWidth,y:d.x*BOSS_RULES.shockWidth},end={x:e.x+d.x*BOSS_RULES.shockRange,y:e.y+d.y*BOSS_RULES.shockRange};r.polygon([[e.x+n.x,e.y+n.y],[end.x+n.x,end.y+n.y],[end.x-n.x,end.y-n.y],[e.x-n.x,e.y-n.y]],'#d5a1ed28',color);r.line([{x:e.x,y:e.y},end],color,.055,[.15,.15]);}
 for(const m of e.bossMarkers||[]){if(!(m.visibleTeams?.[g.player.team]??m.visible))continue;const left=Math.max(0,m.at-g.time),progress=Math.max(0,Math.min(1,1-left/BOSS_RULES.markWindup));r.circle(m.x,m.y,m.r,'#c790da22',color,.055);r.circle(m.x,m.y,m.r*progress,null,'#efcaff',.06);}
 c.restore();
}
