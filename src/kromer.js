import{distance,direction,segmentDistance}from'./geometry.js';
import{canOccupy,settleBody}from'./collision.js';
import{carried}from'./attachments.js';
export const KROMER={basicWidth:2,basicDamage:185,basicPen:.1,nailDuration:4.5,nailRatio:.025,qRange:9,qDamage:170,qDashDamage:210,qPen:.15,qMarkDuration:3.5,qStun:1.17,rRange:3,rDamage:120,rPen:.2,rEvery:.3,rHits:6,throwRange:3.5,turnSpeed:Math.PI,moveMultiplier:.75};
export const qTarget=(g,e)=>e.state.kromerQMark?.until>g.time?g.units.find(t=>t.id===e.state.kromerQMark.targetId&&t.alive):null;
export const recast=(g,e,slot)=>e.key==='kromer'&&slot==='q'&&Boolean(qTarget(g,e));
export function validate(g,e,slot){if(e.state.kromerGrab)return false;return !(slot==='r'||slot==='q'&&recast(g,e,slot))||!g.stat(e,'root')&&!g.stat(e,'captured');}
export function basic(g,e,d){const to={x:e.x+d.x*g.attackRange(e),y:e.y+d.y*g.attackRange(e)};
 for(const t of [...g.units]){if(!g.hostile(e,t)||!g.clearLine(e,t))continue;const dx=t.x-e.x,dy=t.y-e.y,along=dx*d.x+dy*d.y,across=Math.abs(dx*d.y-dy*d.x);if(along>=-t.radius&&along<=g.attackRange(e)+t.radius&&across<=KROMER.basicWidth/2+t.radius)g.deal(e,t,KROMER.basicDamage,{armorPen:KROMER.basicPen});}
 g.effects.push({type:'slash',source:e.id,theme:e.key,damageKind:'basic',x:e.x,y:e.y,angle:Math.atan2(d.y,d.x),spread:.2,r:g.attackRange(e),shape:{kind:'rect',range:g.attackRange(e),width:KROMER.basicWidth},life:.25,maxLife:.25});
}
export function afterDamage(g,e,t,actual,proc,kind,absorbed=0){
 if(!proc||actual+absorbed<=0||e.key!=='kromer'||t.kind!=='champion'||e.team===t.team||!t.alive||t.hp<=0)return;
 const marks=t.state.kromerNails??={},old=marks[e.id],n=old?.until>g.time?old.n:0;
 if(n>=2){delete marks[e.id];g.effects.push({type:'kromerNailBreak',source:e.id,target:t.id,x:t.x,y:t.y,life:.32,maxLife:.32});const dealt=g.deal(e,t,t.maxHp*KROMER.nailRatio,{proc:false,rawPower:true,damageKind:kind});g.heal(e,e,dealt,false);}
 else if(!g.debuffImmune(t)){marks[e.id]={n:n+1,until:g.time+KROMER.nailDuration};g.triggerDisrupt(e,t);}
}
function startGrab(g,e,t,d){
 if(e.state.kromerGrab||t.state.kromerHeldBy)return false;
 const previous=t.status.stun;g.status(t,'stun',1,KROMER.rHits*KROMER.rEvery+.08,e);if(t.status.stun===previous||!g.stat(t,'stun'))return false;
 if(t.state.swordHeldBy){const owner=g.units.find(a=>a.id===t.state.swordHeldBy);if(owner)delete owner.state.swordGrab;delete t.state.swordHeldBy;}
 delete t.motion;const from=e.motion?.lastClear;delete e.motion;settleBody(g,e,from);
 t.status.stun.grabOwner=e.id;t.state.kromerHeldBy=e.id;
 e.state.kromerGrab={target:t,angle:Math.atan2(d.y,d.x),startedAt:g.time,until:t.status.stun.until,next:g.time+KROMER.rEvery,hits:0,distance:e.radius+t.radius+.08};
 e.state.kromerStrikeAt=g.time-.3;return true;
}
export function release(g,e,throwTarget=false){
 const grab=e.state.kromerGrab;if(!grab)return;delete e.state.kromerGrab;const t=grab.target;
 if(t.status.stun?.grabOwner===e.id)delete t.status.stun;if(t.state.kromerHeldBy===e.id)delete t.state.kromerHeldBy;
 if(!t.alive)return;settleBody(g,t,t.bodySafe);
 if(throwTarget){const d={x:Math.cos(grab.angle),y:Math.sin(grab.angle)};e.state.kromerThrowAt=g.time;g.startMotion(t,d,KROMER.throwRange,{kind:'knock',source:e,speed:12,forcedMaxSpeed:12});}
}
export function cast(g,e,slot,p,d){
 if(slot==='q'){
  const target=qTarget(g,e);
  if(target){delete e.state.kromerQMark;g.startMotion(e,direction(e,target),distance(e,target),{speed:30,maxSpeed:30,ignoreWalls:true,phaseEnemies:true,follow:target,stopDistance:e.radius+target.radius+.05,actionTag:'kromerQDash',onComplete:()=>{if(target.alive&&distance(e,target)<=e.radius+target.radius+.6){e.state.kromerQStrikeAt=g.time;e.state.kromerQStrikeFacing=Math.atan2(target.y-e.y,target.x-e.x);g.deal(e,target,KROMER.qDashDamage,{armorPen:KROMER.qPen});g.status(target,'stun',1,KROMER.qStun,e);}}});}
  else{e.state.kromerThrownUntil=g.time+KROMER.qRange/24;g.bullet(e,d,KROMER.qDamage,KROMER.qRange,{speed:24,width:.22,championsOnly:true,theme:'kromerNail',beforeHit:(t,p)=>{p.beforeShield=g.shield(t);},onHit:(t,p,actual)=>{if(t.alive&&(actual>0||p.beforeShield>g.shield(t))){e.state.kromerQMark={targetId:t.id,until:g.time+KROMER.qMarkDuration};t.revealedUntil=Math.max(t.revealedUntil||0,g.time+KROMER.qMarkDuration);}e.state.kromerThrownUntil=g.time;},onEnd:()=>{e.state.kromerThrownUntil=g.time;}});}
 }else{g.startMotion(e,d,KROMER.rRange,{speed:30,maxSpeed:30,phaseEnemies:true,actionTag:'kromerRDash',onStep:(from,to)=>{for(const t of g.champions(1-e.team).filter(t=>t.alive&&!g.hidden(t)&&segmentDistance(t,from,to)<=t.radius+e.radius+.08&&g.clearLine(e,t))){if(startGrab(g,e,t,d))break;}}});}
}
export function tick(g,e,dt){
 if(e.state.kromerNails)for(const[id,m]of Object.entries(e.state.kromerNails))if(m.until<=g.time)delete e.state.kromerNails[id];
 if(e.key!=='kromer')return;
 if(e.state.kromerQMark&&!qTarget(g,e))delete e.state.kromerQMark;
 const grab=e.state.kromerGrab;if(!grab)return;
 if(!carried(g,e)||g.stat(e,'stun')||e.motion?.forced){release(g,e);return;}
 const t=grab.target,aim=e.player?g.input.aim:null;
 if(aim&&distance(aim,e)>.1){const desired=Math.atan2(aim.y-e.y,aim.x-e.x),delta=Math.atan2(Math.sin(desired-grab.angle),Math.cos(desired-grab.angle)),turn=Math.sign(delta)*Math.min(Math.abs(delta),KROMER.turnSpeed*dt),angle=grab.angle+turn,point={x:e.x+Math.cos(angle)*grab.distance,y:e.y+Math.sin(angle)*grab.distance};if(canOccupy(g,t,point,{includeCarry:false})&&g.clearLine(t,point,t.radius)){Object.assign(t,point);t.bodyMoved=true;grab.angle=angle;}}
 const hold={x:e.x+Math.cos(grab.angle)*grab.distance,y:e.y+Math.sin(grab.angle)*grab.distance};if(canOccupy(g,t,hold,{includeCarry:false})&&g.clearLine(t,hold,t.radius)){Object.assign(t,hold);t.bodyMoved=true;}
 while(e.state.kromerGrab===grab&&t.alive&&grab.hits<KROMER.rHits&&grab.next<=g.time+1e-8){grab.next+=KROMER.rEvery;grab.hits++;e.state.kromerStrikeAt=g.time;e.state.kromerStrikeFacing=grab.angle;g.emitSound('swing',e,{slot:'r',phase:'kromer-impale'});g.deal(e,t,KROMER.rDamage,{armorPen:KROMER.rPen,damageKind:'skill'});g.effects.push({type:'kromerImpale',source:e.id,target:t.id,x:t.x,y:t.y,angle:grab.angle,life:.18,maxLife:.18});}
 if(e.state.kromerGrab===grab&&(grab.hits>=KROMER.rHits||!t.alive))release(g,e,t.alive);
}
export function onDeath(g,e){if(e.key==='kromer')release(g,e);for(const owner of g.champions())if(owner.state.kromerGrab?.target===e)release(g,owner);}
