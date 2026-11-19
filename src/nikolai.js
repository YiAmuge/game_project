import {NIKOLAI as P} from './nikolai-data.js';
import {distance,direction} from './geometry.js';
const fx=(g,e,type,more={})=>g.effects.push({type,source:e.id,theme:'nikolai',x:e.x,y:e.y,life:.45,maxLife:.45,...more});
export const marked=(g,e,t)=>Boolean(t?.alive&&t.state?.nikolaiMarks?.[e.id]?.until>g.time);
export const target=(g,e)=>g.units.find(t=>marked(g,e,t));
export const empowered=(g,e)=>e.key==='nikolai'&&Boolean(target(g,e)&&distance(e,target(g,e))<=P.markRange);
export const order=(g,e)=>Object.values(e.state?.nikolaiOrders||{}).filter(v=>v.until>g.time);
export const speedBonus=(g,e)=>(empowered(g,e)?P.markSpeed:0)+(order(g,e).length?P.qSpeed:0);
export const powerBonus=(g,e)=>order(g,e).some(v=>v.mode==='power')?P.qPower:0;
export function receivedMultiplier(g,s,t){return s.kind==='champion'&&s.team!==t.team&&Object.values(t.state?.nikolaiMarks||{}).some(v=>v.until>g.time&&v.team===s.team)?1+P.markDamage:1;}
export function mark(g,e,t){
 if(t.kind!=='champion'||t.team===e.team||!t.alive)return;g.triggerDisrupt(e,t);
 for(const old of g.units)if(old!==t&&old.state?.nikolaiMarks)delete old.state.nikolaiMarks[e.id];
 e.state.nikolaiTarget={id:t.id,until:g.time+P.markDuration};t.state.nikolaiMarks??={};t.state.nikolaiMarks[e.id]={team:e.team,until:g.time+P.markDuration};
}
export function afterDamage(g,e,t,total,{kind,origin,sound}={}){
 if(total<=0||e.kind!=='champion'||e.team===t.team||origin==='nikolai')return;
 if(e.key==='nikolai'){mark(g,e,t);if(kind==='basic'&&sound?.phase==='nikolai-empowered-hit')g.heal(e,e,total*P.drain,false);}
 if(t.kind!=='champion'||origin&&origin!=='arayashiki')return;
 const active=Object.values(t.state?.nikolaiDisposals||{}).some(v=>v.team===e.team&&v.until>g.time);
 if(!active)return;
 if(t.hp>0)g.deal(e,t,total*P.rTrue,{fixed:true,proc:false,damageKind:kind,augmentOrigin:'nikolai',sound:{family:'blade',phase:'nikolai-disposal-proc'}});
 g.heal(e,e,P.rHeal+e.maxHp*P.rHealth,false,{skillHeal:true});
}
export const recast=(g,e)=>e.key==='nikolai'&&Boolean(e.state.nikolaiCommand?.until>g.time&&!e.state.nikolaiCommand.converted);
export function ultimateTarget(g,e,p){return g.units.filter(t=>t.kind==='champion'&&g.hostile(e,t)&&g.visibleTo(e.team,t)&&distance(e,t)<=P.rRange+t.radius&&g.clearLine(e,t)).sort((a,b)=>distance(a,p)-distance(b,p))[0];}
export const validate=(g,e,slot,p)=>slot==='q'||Boolean(ultimateTarget(g,e,p));
export function basic(g,e,d){
 const enhanced=empowered(g,e);
 g.bullet(e,d,P.damage,g.attackRange(e),{pierce:Infinity,width:.3,speed:23,swordWave:true,nikolaiWave:true,nikolaiEmpowered:enhanced,color:enhanced?'#ff9a36':'#fff5e6',sound:{family:'blade',phase:enhanced?'nikolai-empowered-hit':'nikolai-basic-hit'},beforeHit:(t,p)=>{p.damage=P.damage+(enhanced&&marked(g,e,t)?P.closeBonus:0);}});
}
function disposal(g,e,t){
 const bonus=marked(g,e,t)?P.rBonus:0;
 if(bonus)mark(g,e,t);
 g.status(t,'stun',1,P.rStun,e);t.exposedUntil=Math.max(t.exposedUntil||0,g.time+P.rDuration);t.state.nikolaiDisposals??={};t.state.nikolaiDisposals[e.id]={team:e.team,until:g.time+P.rDuration};
 for(let i=0;i<P.rHits;i++){
  const hit=()=>{if(!t.alive||t.invulnerableUntil>g.time)return;g.action(e,'skill',()=>g.deal(e,t,P.rDamage+bonus,{damageKind:'skill',sound:{slot:'r',family:'blade',phase:'nikolai-disposal-hit'}}));fx(g,e,'nikolaiCut',{x:t.x,y:t.y,target:t.id,angle:i%2?.7:-.7,life:.3,maxLife:.3});};
  if(i===0)hit();else g.schedule(e,i*P.rEvery,hit,{autonomous:true});
 }
}
export function cast(g,e,slot,p,d){
 if(slot==='r'){
  const t=ultimateTarget(g,e,p);if(!t)return false;
  g.emitSound('swing',e,{family:'blade',slot:'r',phase:'nikolai-disposal'});
  g.bullet(e,direction(e,t),0,2,{target:t,homing:true,speed:28,width:.35,remaining:2,championsOnly:true,nikolaiWave:true,nikolaiEmpowered:true,slot:'r',swordWave:true,onHit:(t,p)=>{if(t.alive&&!(t.invulnerableUntil>g.time))disposal(g,e,t);}});return true;
 }
 if(recast(g,e)){
  e.state.nikolaiCommand.converted=true;
  for(const a of g.champions(e.team)){const v=a.state.nikolaiOrders?.[e.id];if(v?.until>g.time){v.mode='power';fx(g,e,'nikolaiConvert',{x:a.x,y:a.y,target:a.id});}}
 }else{
  const until=g.time+P.qDuration;e.state.nikolaiCommand={until,converted:false};
  for(const a of g.champions(e.team))if(a.alive&&!g.hidden(a)&&distance(e,a)<=P.qRange+a.radius){a.state.nikolaiOrders??={};a.state.nikolaiOrders[e.id]={source:e.id,until,mode:'regen',next:g.time+P.qEvery};fx(g,e,'nikolaiBuff',{x:a.x,y:a.y,target:a.id});}
  fx(g,e,'nikolaiCommand',{r:P.qRange,life:.65,maxLife:.65});
 }
 g.emitSound('cast',e,{slot:'q',phase:'nikolai-command'});return true;
}
export function tick(g,e){
 for(const [id,v]of Object.entries(e.state.nikolaiOrders||{})){
  if(v.mode==='regen'){const s=g.units.find(a=>a.id===v.source);while(v.next<=Math.min(g.time,v.until)+1e-8){v.next+=P.qEvery;if(s)g.heal(s,e,P.qHeal+e.maxHp*P.qHealth,false,{skillHeal:true});}}
  if(v.until<=g.time)delete e.state.nikolaiOrders[id];
 }
 for(const key of ['nikolaiMarks','nikolaiDisposals'])for(const [id,v]of Object.entries(e.state[key]||{}))if(v.until<=g.time)delete e.state[key][id];
}
