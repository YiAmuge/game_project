import { carried,paired,shiftCarried } from './attachments.js';
import { withinTrap } from './confinement.js';
import { distance,segmentDistance } from './geometry.js';

const structure=e=>['tower','core'].includes(e.kind);
export function solid(g,e,other,{phaseEnemies=e.motion?.phaseEnemies||e.phaseEnemiesUntil>g.time||false}={}){
 if(e.kind==='summon'||other.kind==='summon')return false;
 if(e===other||!other.alive||g.hidden(other)||other.state?.posthumous)return false;
 if(structure(other))return true;
 if(paired(g,e,other))return false;
 if(e.team===other.team&&e.team<2&&(['champion','minion'].includes(e.kind)||['champion','minion'].includes(other.kind)))return false;
 if((phaseEnemies||e.phaseEnemiesUntil>g.time||other.phaseEnemiesUntil>g.time||other.motion?.phaseEnemies)&&e.team!==other.team)return false;
 return true;
}
export function carryFits(g,e,p){
 const t=carried(g,e);if(!t)return true;
 const to={x:t.x+p.x-e.x,y:t.y+p.y-e.y};
 return g.clearLine(t,to,t.radius)&&canOccupy(g,t,to,{includeCarry:false,phaseEnemies:false})&&g.units.every(other=>
  !solid(g,t,other,{phaseEnemies:false})||segmentDistance(other,t,to)>=t.radius+other.radius-.001);
}
export function canOccupy(g,e,p,options={}){
 return (options.includeCarry===false||carryFits(g,e,p))&&(options.ignoreTrap||withinTrap(g,e,p))&&!g.blocked(p.x,p.y,e.radius)&&g.units.every(t=>!solid(g,e,t,options)||distance(p,t)>=e.radius+t.radius+.006-1e-6);
}
export function moveBody(g,e,dx,dy,options={}){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.12));
 const safe=p=>carryFits(g,e,p)&&withinTrap(g,e,p)&&!g.blocked(p.x,p.y,e.radius)&&g.units.every(t=>{
  if(!solid(g,e,t,options))return true;
  const before=distance(e,t),after=distance(p,t),gap=e.radius+t.radius+.006;
  return after>=gap-1e-6||before<gap&&after>before+1e-7;
 });
 for(let i=0;i<n;i++){
  const x={x:e.x+dx/n,y:e.y};if(safe(x)){const from={x:e.x,y:e.y};e.x=x.x;shiftCarried(g,e,from,e);e.bodyMoved=true;}
  const y={x:e.x,y:e.y+dy/n};if(safe(y)){const from={x:e.x,y:e.y};e.y=y.y;shiftCarried(g,e,from,e);e.bodyMoved=true;}
 }
}
// Resolve only the moving/arriving body; never transfer its overlap into an enemy's movement.
export function settleBody(g,e,fallback){
 if(canOccupy(g,e,e,{phaseEnemies:false}))return true;
 const origin={x:e.x,y:e.y};
 const reachable=p=>g.clearLine(origin,p,e.radius)&&g.units.every(t=>!t.alive||!structure(t)||segmentDistance(t,origin,p)>=e.radius+t.radius-.001||distance(p,t)>distance(origin,t)&&distance(origin,t)<e.radius+t.radius);
 for(let radius=.08;radius<=3.2;radius+=.08)for(let i=0;i<32;i++){
  const a=i*Math.PI/16,p={x:origin.x+Math.cos(a)*radius,y:origin.y+Math.sin(a)*radius};
  if(canOccupy(g,e,p,{phaseEnemies:false})&&reachable(p)){shiftCarried(g,e,e,p);Object.assign(e,p);return true;}
 }
 if(fallback&&canOccupy(g,e,fallback,{phaseEnemies:false})&&reachable(fallback)){shiftCarried(g,e,e,fallback);Object.assign(e,fallback);return true;}
 return false;
}
export function separate(g){
 const moved=e=>Boolean(e.bodyMoved)||e.bodyOrigin&&distance(e,e.bodyOrigin)>1e-6;
 for(const e of [...g.units].sort((a,b)=>Number(Boolean(moved(b)))-Number(Boolean(moved(a)))||b.id-a.id)){
  if(!e.alive||e.kind==='summon'||structure(e)||e.camp==='boss'||g.hidden(e)||e.state?.posthumous||e.motion?.phaseEnemies||e.phaseEnemiesUntil>g.time)continue;
  if(!canOccupy(g,e,e))settleBody(g,e,e.bodySafe);
  if(canOccupy(g,e,e))e.bodySafe={x:e.x,y:e.y};delete e.bodyMoved;
 }
}
