import { WORLD } from './data.js';
import { distance, direction, clamp } from './geometry.js';
// Shared by the input controller, simulation and preview so the displayed range is the cast range.
export function skillTargeting(g,e,slot){
 const amp=e.key==='ryoshu'&&g.buff(e,'amplify')?1.2:1;
 const q={faust:['line',7.5,.35],yi:['circle',7,3.2],sinclair:['quick',3.2],meursault:['self',0,2],don:['cone',6,1.8],ryoshu:['quick',4*amp],honglu:['circle',8,6],heathcliff:['quick',7],ishmael:['self',0,4.5],rodya:['self',0,1.6],outis:['quick',3],gregor:['line',5,.8],gubo:['self',0,1.6],gahwan:['circle',8.2,2.5],nelly:['cone',7,.65],ahab:['self',0,5],alisa:['quick',3],rudolph:['self',0,1.5],moses:['self',0,1.5],ezra:['self',0,1.5],myo:['cone',7,.2],dongbaek:['self',0,1.5],dongrang:['circle',7.5,2.5],hohenheim:['quick',2.5],marton:['self',0,3],queequeg:['ally',5,1]};
 const r={faust:['circle',10,4.8],yi:['self',0,5.5],sinclair:['circle',6,3.8],meursault:['cone',5.2,Math.PI*100/180],don:['quick',6.5],ryoshu:['circle',7*amp,2.6],honglu:['circle',8.5,6.5],heathcliff:['self',0,7.5],ishmael:['line',16,.585],rodya:['line',8,.36,4.725],outis:['quick',18],gregor:['cone',3.5,1.8],gubo:['target',12,5.5],gahwan:['circle',10,5],nelly:['target',7,1.2],ahab:['circle',5,2.5],alisa:['self',0,4],rudolph:['global',99,5.25],moses:['line',9,.6],ezra:['self',0,2.5],myo:['self',0,2],dongbaek:['circle',9.5,4.2],hohenheim:['circle',8,4.2],marton:['self',0,5],queequeg:['self',0,2],dongrang:['circle',2.5,3.2+Math.min(5,Math.floor((e.totalHealingReceived||0)/100))*.6]};
 const [kind,range,radius=0,impact=0]=(slot==='q'?q:r)[e.key]||['self',0,2];return {kind,range,radius,impact,confirm:['circle','global'].includes(kind)||e.key==='nelly'&&slot==='r'};
}
export function castPoint(e,point,spec){
 if(spec.kind==='self')return {x:e.x,y:e.y};
 if(!['circle','target'].includes(spec.kind))return {...point};
 const d=direction(e,point),len=Math.min(spec.range,distance(e,point));return {x:clamp(e.x+d.x*len,WORLD.x+e.radius,WORLD.x+WORLD.w-e.radius),y:clamp(e.y+d.y*len,WORLD.y+e.radius,WORLD.y+WORLD.h-e.radius)};
}
export function targetingPreview(r,g){
 if(!g.targeting||!g.player.alive)return;
 const e=g.player,spec=skillTargeting(g,e,g.targeting.slot),p=castPoint(e,g.input.aim,spec),d=direction(e,p),color=g.targeting.slot==='r'?'#e4bbff':'#8ee5ed',c=r.ctx;
 c.save();c.setLineDash([.15,.15]);if(spec.range)r.circle(e.x,e.y,spec.range,color+'08',color+'aa',.045);c.setLineDash([]);
 if(['circle','self','target'].includes(spec.kind)){r.circle(p.x,p.y,spec.radius,color+'25',color,.075);r.circle(p.x,p.y,.16,color);}
 if(spec.kind==='line'){
  const end={x:e.x+d.x*spec.range,y:e.y+d.y*spec.range},side={x:-d.y*spec.radius,y:d.x*spec.radius};
  r.polygon([[e.x+side.x,e.y+side.y],[end.x+side.x,end.y+side.y],[end.x-side.x,end.y-side.y],[e.x-side.x,e.y-side.y]],color+'20',color);if(spec.impact)r.circle(end.x,end.y,spec.impact,null,color+'77',.06);
 }
 if(spec.kind==='cone'){const angle=Math.atan2(d.y,d.x);c.beginPath();c.moveTo(e.x,e.y);c.arc(e.x,e.y,spec.range,angle-spec.radius/2,angle+spec.radius/2);c.closePath();c.fillStyle=color+'22';c.fill();c.strokeStyle=color;c.lineWidth=.06;c.stroke();}
 r.text('좌클릭 시전 · 우클릭 / Esc 취소',e.x,e.y+2.2,color,.32);c.restore();
}
