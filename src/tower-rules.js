import { distance } from './geometry.js';

export const TOWER_RULES={victimRange:1.75,heatPerStack:.2,maxHeat:6,heatReset:3,armorPen:.3};
// Summons may name their champion owner by entity or ID. Never loop on bad ownership.
export function damageOwner(g,source){
 const seen=new Set();let e=source;
 while(e&&!seen.has(e)){
  if(e.kind==='champion')return e;seen.add(e);
  const owner=e.owner??e.source;e=typeof owner==='object'?owner:g.units.find(u=>u.id===owner);
 }
 return null;
}
export function onDamage(g,source,victim,damage){
 const attacker=damageOwner(g,source);
 if(!(damage>0)||victim.kind!=='champion'||!attacker?.alive||attacker.team===victim.team)return;
 for(const tower of g.towers(victim.team))if(distance(tower,attacker)<=tower.range&&distance(tower,victim)<=tower.range*TOWER_RULES.victimRange){
  tower.aggro=attacker.id;tower.targetId=attacker.id;
 }
}
export function attackable(g,tower,u){
 return u.alive&&u.team!==tower.team&&u.team!==2&&!g.hidden(u)&&g.visibleTo(tower.team,u)&&u.invulnerableUntil!==Infinity&&['champion','minion','bait','summon','trooper'].includes(u.kind)&&distance(tower,u)<=tower.range;
}
const rank=u=>u.kind==='minion'?(u.siege?0:u.ranged?2:1):u.kind==='champion'?4:3;
export function acquire(g,tower){
 const targets=g.units.filter(u=>attackable(g,tower,u)),forced=targets.find(u=>u.id===tower.aggro);
 if(!forced)delete tower.aggro;
 const target=forced||targets.find(u=>u.id===tower.targetId)||targets.sort((a,b)=>rank(a)-rank(b)||distance(tower,a)-distance(tower,b)||a.id-b.id)[0];
 tower.targetId=target?.id??null;return target;
}
export function resetHeat(g,tower){if(g.time-(tower.lastShotAt??-Infinity)>=TOWER_RULES.heatReset-1e-8)tower.heat=0;}
export function shotDamage(g,tower,target){
 resetHeat(g,tower);
 if(target.kind!=='champion')tower.heat=0;
 // The opening shot is unheated; each following champion shot gains one stack.
 const damage=tower.damage*(1+(tower.heat||0)*TOWER_RULES.heatPerStack);
 if(target.kind==='champion')tower.heat=Math.min(TOWER_RULES.maxHeat,(tower.heat||0)+1);
 tower.lastShotAt=g.time;return damage;
}
