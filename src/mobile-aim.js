import{distance,direction}from'./geometry.js';
import{skillTargeting,castPoint}from'./targeting.js';
import{YAN,distorted}from'./yan.js';

const healthOrder=e=>e.hp/Math.max(1,e.maxHp);
export const ATTACK_CATEGORIES={champion:'챔피언',minion:'미니언',structure:'건물',creep:'크립'};
export const autoAimReach=spec=>(spec.range||0)+(spec.kind==='circle'||spec.kind==='self'?(spec.radius||0):spec.kind==='line'?(spec.impact||0):0);
export const attackCategory=t=>t.kind==='champion'?'champion':['minion','trooper'].includes(t.kind)?'minion':['tower','core'].includes(t.kind)?'structure':t.kind==='neutral'?'creep':null;
// Endpoint areas extend target acquisition, never the actual cast/projectile range.
export const basicAimReach=(g,e)=>e.key==='nosferatu'&&!e.state?.bloodfiend?6.8+g.attackRange(e)-3.3:distorted(g,e)?YAN.handLeash:g.attackRange(e)+(e.key==='rudolph'?2.1675:e.key==='marton'?2.2:0);
export function mobileAttackTargets(g,e,range=basicAimReach(g,e),{ignoreWalls=false}={}){
 return g.units.filter(t=>t.alive&&g.hostile(e,t)&&!g.hidden(t)&&g.visibleTo(e.team,t)&&(ignoreWalls||g.clearLine(e,t))&&!g.locked(t)&&!t.returning&&!t.state?.posthumous&&!(t.invulnerableUntil>g.time)&&distance(e,t)<=range+(t.radius||0)+1e-8).sort((a,b)=>(b.kind==='champion')-(a.kind==='champion')||(a.kind==='champion'&&b.kind==='champion'?a.hp-b.hp:0)||distance(e,a)-distance(e,b)||a.id-b.id);
}
export function nearestMovementAim(g,e,slot){
 const moves={nosferatu:['r'],kromer:['r'],don:['basic','r'],myo:['basic'],starbuck:['basic','r'],jamila:['q'],ryoshu:['q','r'],sinclair:['q','r'],heathcliff:['q'],outis:['q','r'],alisa:['q','r'],nelly:['r'],ahab:['r'],dongrang:['r'],hohenheim:['q'],kim:['q'],sora:['q']};
 return Boolean(moves[e.key]?.includes(slot));
}
export const movementAim=(g,e,slot)=>nearestMovementAim(g,e,slot)||e.key==='yi'&&slot==='r';
export function dashSlidePriority(g,e,slot){
 if(slot==='basic')return ['don','myo','starbuck'].includes(e.key);
 return slot==='q'&&['sinclair','ryoshu','outis','jamila','heathcliff','hohenheim','kim','sora','alisa'].includes(e.key)||slot==='r'&&['kromer','don','outis','alisa'].includes(e.key);
}
export function rememberManualAim(e,slot,point){
 const x=point.x-e.x,y=point.y-e.y;if(Math.hypot(x,y)>.001)(e.mobileManualAim??={})[slot]={x,y};
}
export function mobileAutoAim(g,e,slot='basic',{category,targetId,movement}={}){
 const spec=slot==='basic'?{range:distorted(g,e)?YAN.handLeash:g.attackRange(e),radius:0,kind:'basic'}:skillTargeting(g,e,slot);
 const range=spec.range||0,visible=t=>t.alive&&!g.hidden(t)&&g.visibleTo(e.team,t)&&g.clearLine(e,t),inRange=(t,r=range)=>distance(e,t)<=r+(t.radius||0)+1e-8;
 const reach=slot==='basic'?basicAimReach(g,e):autoAimReach(spec),nearest=nearestMovementAim(g,e,slot),order=(a,b)=>distance(e,a)-distance(e,b)||a.id-b.id;
 const allEnemies=e.key==='yi'&&slot==='r'?[]:mobileAttackTargets(g,e,Infinity,{ignoreWalls:spec.ignoreWalls}).filter(t=>(!category||attackCategory(t)===category)&&(!(e.key==='nelly'&&slot==='r')||t.kind==='champion'));
 const prioritize=list=>[...list.filter(t=>inRange(t,reach)),...list.filter(t=>!inRange(t,reach))];
 const enemies=prioritize(nearest?allEnemies.sort(order):allEnemies);
 const allies=g.champions(e.team).filter(t=>t!==e&&visible(t)),wounded=prioritize(allies.filter(t=>t.hp<t.maxHp).sort((a,b)=>healthOrder(a)-healthOrder(b)||order(a,b)));
 const allyCandidates=[];
 let target;
 if(!category&&e.key==='queen')allyCandidates.push(...wounded);
 if(!category&&e.key==='gubo'&&['basic','r'].includes(slot))allyCandidates.push(...prioritize(allies.filter(t=>g.canGuboHitAlly(e,t)).sort(order)));
 if(!category&&e.key==='queequeg'&&slot==='q')allyCandidates.push(...prioritize([...allies].sort((a,b)=>healthOrder(a)-healthOrder(b)||order(a,b))));
 if(e.key==='honglu'&&slot==='r'){
  allyCandidates.push(...prioritize(g.champions(e.team).filter(t=>visible(t)&&t.hp<t.maxHp).sort((a,b)=>healthOrder(a)-healthOrder(b)||order(a,b))));
 }
 if(e.key==='yi'&&slot==='r')allyCandidates.push(...prioritize(g.champions(e.team).filter(t=>visible(t)&&t.hp<t.maxHp).sort((a,b)=>healthOrder(a)-healthOrder(b)||order(a,b))));
 if(e.key==='yi'&&slot==='r'&&!allyCandidates.length)allyCandidates.push(...prioritize([...allies].sort(order)));
 target=[...allyCandidates,...enemies].find(t=>t.id===targetId)||allyCandidates[0]||enemies[0];
 if(e.key==='kromer'&&slot==='q'&&e.state.kromerQMark?.until>g.time){const marked=g.units.find(t=>t.id===e.state.kromerQMark.targetId&&t.alive);if(marked)return{point:{x:marked.x,y:marked.y},target:marked,mode:'auto'};}
 if(e.key==='marton'&&slot==='basic'){
  const melee=enemies.find(t=>distance(e,t)<2.5+t.radius);if(melee&&(!targetId||target===melee)){target=melee;const d=direction(e,target);return{point:{x:e.x+d.x*2.45,y:e.y+d.y*2.45},target,mode:'melee'};}
 }
 const move=movement||g.input||{},length=Math.hypot(move.x||0,move.y||0),travel=length>.01?{x:move.x/length,y:move.y/length}:e.mobileMoveDirection;
 const d=movementAim(g,e,slot)&&travel?travel:{x:Math.cos(e.facing||0),y:Math.sin(e.facing||0)};
 const memory=!movementAim(g,e,slot)&&e.mobileManualAim?.[slot],fallback=memory?{x:e.x+memory.x,y:e.y+memory.y}:{x:e.x+d.x*Math.max(1,range),y:e.y+d.y*Math.max(1,range)},point=target?{x:target.x,y:target.y}:fallback;
 return{point:slot==='basic'||nearest&&spec.kind==='self'?point:castPoint(e,point,spec,g.bounds),target,manualFallback:Boolean(!target&&memory&&!category),mode:'auto',unavailable:Boolean(category&&!target)};
}
export function mobileManualAim(g,e,slot,dx,dy,camera,{category}={}){
 const a=camera.screenToWorld(0,0),b=camera.screenToWorld(dx,dy),vx=b.x-a.x,vy=b.y-a.y,n=Math.hypot(vx,vy)||1;
 const spec=slot==='basic'?{range:distorted(g,e)?YAN.handLeash:g.attackRange(e)}:skillTargeting(g,e,slot),range=spec.range||spec.radius||3,magnitude=Math.min(1,Math.hypot(dx,dy)/60);
 const point={x:e.x+vx/n*range*magnitude,y:e.y+vy/n*range*magnitude};

 return point;
}
