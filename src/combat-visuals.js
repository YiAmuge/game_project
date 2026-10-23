import { dashLength,dashBasic } from './skills.js';
import * as Hohenheim from './hohenheim.js';
import { FAUST_WAVE_HALF_WIDTH,projectileHitWidth } from './projectile-rules.js';
import { metric } from './training.js';

export function behind(){}
export function front(){}
export function preview(r,e,g){
 const angle=Math.atan2(g.input.aim.y-e.y,g.input.aim.x-e.x),d={x:Math.cos(angle),y:Math.sin(angle)},ctx=r.ctx;
 const polygon=(range,width)=>{const s={x:-d.y*width/2,y:d.x*width/2},to={x:e.x+d.x*range,y:e.y+d.y*range};r.polygon([[e.x+s.x,e.y+s.y],[to.x+s.x,to.y+s.y],[to.x-s.x,to.y-s.y],[e.x-s.x,e.y-s.y]],'#b8d8d313','#c3e8df66');};
 if(e.key==='gahwan')polygon(g.attackRange(e),1.5);
 if(e.key==='faust')polygon(g.attackRange(e),projectileHitWidth({width:FAUST_WAVE_HALF_WIDTH})*2);
 if(e.key==='queequeg')polygon(g.attackRange(e),1.8);
 if(e.key==='rudolph'){const len=Math.min(g.attackRange(e),Math.hypot(g.input.aim.x-e.x,g.input.aim.y-e.y));r.circle(e.x+d.x*len,e.y+d.y*len,2.1675,'#ffb56813','#ffb56888',.045);}
 if(e.key==='hohenheim'){const shape=Hohenheim.chargeShape(g,e,g.input.aim);polygon(shape.range,shape.width*2);}
 if(dashBasic(g,e)){
  const len=e.key==='myo'?g.attackRange(e):dashLength(e,{don:2,rodya:2.4,starbuck:2.875,gregor:2.5}[e.key]||g.attackRange(e));
  polygon(len,({don:.72,gregor:1.08}[e.key]||.6)*2*1.2);
 }
 const cones={sinclair:1.6,ryoshu:1.7,heathcliff:1.7,ishmael:1.6,rodya:2.16,gregor:g.buff(e,'mutant')?1.8*1.3*1.2:1.8,nelly:1.2,dongbaek:1.3,dongrang:1.9,alisa:1.1,kim:e.state.followSlashUntil>g.time?1.9*1.3*1.2*1.08:1.2*1.3,starbuck:.975*1.2};
 if(cones[e.key]){const range=g.attackRange(e)*(e.key==='kim'&&e.state.followSlashUntil>g.time?1.2*1.08:1);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,range,angle-cones[e.key]/2,angle+cones[e.key]/2);ctx.closePath();ctx.fillStyle='#bddfd20b';ctx.fill();ctx.strokeStyle='#bddfd255';ctx.lineWidth=.035;ctx.stroke();}

 if(e.key==='marton'){r.circle(e.x,e.y,2.5,null,'#dbcba999',.04);r.circle(e.x,e.y,g.attackRange(e),null,'#a4ce9477',.04);r.text('근접 2.5 · 뿌리 시전 5',e.x,e.y+1.8,'#c9ddba',.24);const dx=g.input.aim.x-e.x,dy=g.input.aim.y-e.y,len=Math.hypot(dx,dy);if(len>=2.5){const cap=Math.min(g.attackRange(e),len);r.circle(e.x+dx/(len||1)*cap,e.y+dy/(len||1)*cap,2.2,'#b5cf8f0e','#b5cf8f77',.045);}}
 if(e.key==='meursault'){const a=e.facing||0,d={x:Math.cos(a),y:Math.sin(a)},s={x:-d.y*1.3,y:d.x*1.3},end={x:e.x+d.x*g.attackRange(e),y:e.y+d.y*g.attackRange(e)};r.polygon([[e.x+s.x,e.y+s.y],[end.x+s.x,end.y+s.y],[end.x-s.x,end.y-s.y],[e.x-s.x,e.y-s.y]],'#c2d5e90b','#c2d5e95a');}
}
export function meter(r,e,g){
 const m=metric(g,e);if(!m)return;const healing=m.kind==='healing',labels=healing?['초당 치유량','총 치유량','마지막 치유기 치유량']:['초당 피해량','총 피해량','마지막 공격 피해량'],values=[m.perSecond,m.total,m.last],c=r.ctx;
 c.save();c.fillStyle='#102123e8';c.fillRect(e.x-1.95,e.y-5.7,3.9,1.35);c.strokeStyle=healing?'#7fbcb0':'#c49382';c.lineWidth=.025;c.strokeRect(e.x-1.95,e.y-5.7,3.9,1.35);
 values.forEach((v,i)=>r.text(`${labels[i]} ${Math.round(v).toLocaleString('ko-KR')}`,e.x,e.y-5.45+i*.4,healing?'#b5ecda':'#f2c6b8',.23));c.restore();
}
