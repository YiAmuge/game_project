import { withinTrap } from './confinement.js';
import { blocked,clearLine,distance,segmentDistance } from './geometry.js';

const structure=e=>['tower','core'].includes(e.kind);
export function solid(g,e,other,{phaseEnemies=e.motion?.phaseEnemies||false}={}){
 if(e===other||!other.alive||g.hidden(other)||other.state?.posthumous)return false;
 if(structure(other))return true;
 if(e.team===other.team&&e.team<2&&(['champion','minion'].includes(e.kind)||['champion','minion'].includes(other.kind)))return false;
 if((phaseEnemies||other.motion?.phaseEnemies)&&e.team!==other.team)return false;
 return true;
}
export function canOccupy(g,e,p,options={}){
 return withinTrap(g,e,p)&&!blocked(p.x,p.y,e.radius)&&g.units.every(t=>!solid(g,e,t,options)||distance(p,t)>=e.radius+t.radius+.006-1e-6);
}
export function moveBody(g,e,dx,dy,options={}){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.12));
 const safe=p=>withinTrap(g,e,p)&&!blocked(p.x,p.y,e.radius)&&g.units.every(t=>{
  if(!solid(g,e,t,options))return true;
  const before=distance(e,t),after=distance(p,t),gap=e.radius+t.radius+.006;
  return after>=gap-1e-6||before<gap&&after>before+1e-7;
 });
 for(let i=0;i<n;i++){
  const x={x:e.x+dx/n,y:e.y};if(safe(x)){e.x=x.x;e.bodyMoved=true;}
  const y={x:e.x,y:e.y+dy/n};if(safe(y)){e.y=y.y;e.bodyMoved=true;}
 }
}
// Resolve only the moving/arriving body; never transfer its overlap into an enemy's movement.
export function settleBody(g,e,fallback){
 if(canOccupy(g,e,e,{phaseEnemies:false}))return true;
 const origin={x:e.x,y:e.y};
 const reachable=p=>clearLine(origin,p,e.radius)&&g.units.every(t=>!t.alive||!structure(t)||segmentDistance(t,origin,p)>=e.radius+t.radius-.001||distance(p,t)>distance(origin,t)&&distance(origin,t)<e.radius+t.radius);
 for(let radius=.08;radius<=3.2;radius+=.08)for(let i=0;i<32;i++){
  const a=i*Math.PI/16,p={x:origin.x+Math.cos(a)*radius,y:origin.y+Math.sin(a)*radius};
  if(canOccupy(g,e,p,{phaseEnemies:false})&&reachable(p)){Object.assign(e,p);return true;}
 }
 if(fallback&&canOccupy(g,e,fallback,{phaseEnemies:false})&&reachable(fallback)){Object.assign(e,fallback);return true;}
 return false;
}
export function separate(g){
 const moved=e=>Boolean(e.bodyMoved)||e.bodyOrigin&&distance(e,e.bodyOrigin)>1e-6;
 for(const e of [...g.units].sort((a,b)=>Number(Boolean(moved(b)))-Number(Boolean(moved(a)))||b.id-a.id)){
  if(!e.alive||structure(e)||e.camp==='boss'||g.hidden(e)||e.state?.posthumous||e.motion?.phaseEnemies)continue;
  if(!canOccupy(g,e,e))settleBody(g,e,e.bodySafe);
  if(canOccupy(g,e,e))e.bodySafe={x:e.x,y:e.y};delete e.bodyMoved;
 }
}
