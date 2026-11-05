import{distance}from'./geometry.js';
export const YI={qDuration:3,qStartRadius:3.2,qRadius:5.6,qFinal:140,rRadius:5.5,rDamage:200,rShield:.20};
export function updateZone(g,z){
 z.createdAt??=z.until-YI.qDuration;z.r=YI.qStartRadius+(YI.qRadius-YI.qStartRadius)*Math.min(1,Math.max(0,(g.time-z.createdAt)/YI.qDuration));
 const targets=g.units.filter(t=>g.hostile(z.source,t)&&distance(z,t)<=z.r+t.radius&&g.clearLine(z,t));
 if(g.time+1e-8>=z.until){
  if(!z.finished){z.finished=true;for(const t of targets){g.deal(z.source,t,YI.qFinal,{damageKind:'skill',sound:{slot:'q',phase:'yi-zone-final'}});g.status(t,'slow',.50,1,z.source);if(!g.debuffImmune(t))t.ammo=Math.max(0,t.ammo-1);}g.effects.push({type:'burst',source:z.source.id,theme:'yi',x:z.x,y:z.y,r:YI.qRadius,life:.45,maxLife:.45});}
  return;
 }
 const control=g.time+1e-8>=(z.nextControl??0);
 for(const t of targets){
  if(control&&t.kind==='champion'){g.status(t,'silence',1,.25,z.source);g.status(t,'reloadWeak',.1,.25,z.source);}
  if(g.time+1e-8>=z.nextTick){g.deal(z.source,t,45,{sound:{slot:'q',phase:'yi-zone-hit'}});z.hitIds??=new Set();z.slowStacks??={};if(t.kind==='champion'){if(!z.hitIds.has(t.id)){z.hitIds.add(t.id);t.ammo=Math.max(0,t.ammo-1);}z.slowStacks[t.id]=(z.slowStacks[t.id]||0)+1;g.status(t,'slow',Math.min(.9,z.slowStacks[t.id]*.035),.7,z.source);}}
 }
 if(control)z.nextControl=g.time+.1;if(g.time+1e-8>=z.nextTick)z.nextTick+=.5;
}
