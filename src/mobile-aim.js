import{distance,direction}from'./geometry.js';
import{skillTargeting,castPoint}from'./targeting.js';
import{YAN,distorted}from'./yan.js';

const healthOrder=e=>e.hp/Math.max(1,e.maxHp);
export const ATTACK_CATEGORIES={champion:'챔피언',minion:'미니언',structure:'건물',creep:'크립'};
export const autoAimReach=spec=>(spec.range||0)+(spec.kind==='circle'||spec.kind==='self'?(spec.radius||0):spec.kind==='line'?(spec.impact||0):0);
export const attackCategory=t=>t.kind==='champion'?'champion':['minion','trooper'].includes(t.kind)?'minion':['tower','core'].includes(t.kind)?'structure':t.kind==='neutral'?'creep':null;
export function mobileAttackTargets(g,e,range=g.attackRange(e)){
 return g.units.filter(t=>t.alive&&g.hostile(e,t)&&!g.hidden(t)&&g.visibleTo(e.team,t)&&g.clearLine(e,t)&&!g.locked(t)&&!t.returning&&!t.state?.posthumous&&!(t.invulnerableUntil>g.time)&&distance(e,t)<=range+(t.radius||0)+1e-8).sort((a,b)=>(b.kind==='champion')-(a.kind==='champion')||(a.kind==='champion'&&b.kind==='champion'?a.hp-b.hp:0)||distance(e,a)-distance(e,b)||a.id-b.id);
}
export function mobileAutoAim(g,e,slot='basic',{category}={}){
 const spec=slot==='basic'?{range:distorted(g,e)?YAN.handLeash:g.attackRange(e),radius:0,kind:'basic'}:skillTargeting(g,e,slot);
 const range=spec.range||0,visible=t=>t.alive&&!g.hidden(t)&&g.visibleTo(e.team,t)&&g.clearLine(e,t),inRange=(t,r=range)=>distance(e,t)<=r+(t.radius||0)+1e-8;
 const enemies=mobileAttackTargets(g,e,slot==='basic'?range:autoAimReach(spec)).filter(t=>!category||attackCategory(t)===category);
 const allies=g.champions(e.team).filter(t=>t!==e&&visible(t)&&inRange(t)),wounded=allies.filter(t=>t.hp<t.maxHp).sort((a,b)=>healthOrder(a)-healthOrder(b)||distance(e,a)-distance(e,b));
 let target;
 if(!category&&e.key==='gubo'&&['basic','r'].includes(slot))target=allies.filter(t=>g.canGuboHitAlly(e,t)).sort((a,b)=>distance(e,a)-distance(e,b))[0];
 if(!category&&!target&&e.key==='ppui'&&slot==='basic')target=wounded.filter(t=>!(t.state.ppuiEmpowerReady>g.time))[0];
 if(!target&&e.key==='queequeg'&&slot==='q')target=[...allies].sort((a,b)=>healthOrder(a)-healthOrder(b)||distance(e,a)-distance(e,b))[0];
 if(!target&&e.key==='honglu'&&slot==='r'){
  target=g.champions(e.team).filter(t=>visible(t)&&inRange(t,range+spec.radius)&&t.hp<t.maxHp).sort((a,b)=>healthOrder(a)-healthOrder(b)||distance(e,a)-distance(e,b))[0];
 }
 if(!target&&(e.key==='yi'&&slot==='r'||e.key==='ppui'&&slot==='q'))target=g.champions(e.team).filter(t=>visible(t)&&inRange(t,range+spec.radius)&&t.hp<t.maxHp).sort((a,b)=>healthOrder(a)-healthOrder(b)||distance(e,a)-distance(e,b))[0];
 if(!target)target=enemies[0];
 if(e.key==='marton'&&slot==='basic'){
  const melee=enemies.find(t=>distance(e,t)<=2.5+t.radius);if(melee){target=melee;const d=direction(e,target);return{point:{x:e.x+d.x*2.45,y:e.y+d.y*2.45},target,mode:'melee'};}
 }
 const fallback={x:e.x+Math.cos(e.facing||0)*Math.max(1,range),y:e.y+Math.sin(e.facing||0)*Math.max(1,range)},point=target?{x:target.x,y:target.y}:fallback;
 return{point:slot==='basic'?point:castPoint(e,point,spec,g.bounds),target,mode:'auto',unavailable:Boolean(category&&!target)};
}
export function mobileManualAim(g,e,slot,dx,dy,camera){
 const a=camera.screenToWorld(0,0),b=camera.screenToWorld(dx,dy),vx=b.x-a.x,vy=b.y-a.y,n=Math.hypot(vx,vy)||1;
 const spec=slot==='basic'?{range:distorted(g,e)?YAN.handLeash:g.attackRange(e)}:skillTargeting(g,e,slot),range=spec.range||spec.radius||3,magnitude=Math.min(1,Math.hypot(dx,dy)/60);
 return{x:e.x+vx/n*range*magnitude,y:e.y+vy/n*range*magnitude};
}
