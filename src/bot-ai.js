import { CHAMPIONS, POSITIONS, CORE_POSITIONS } from './data.js';
import { distance,direction } from './geometry.js';
import { DRAG_KEYS } from './skills.js';

export function draft(g,position,used=[]){
 const pool=Object.keys(CHAMPIONS).filter(key=>!used.includes(key)&&POSITIONS[position].recommend.includes(CHAMPIONS[key].role));
 const choices=pool.length?pool:Object.keys(CHAMPIONS).filter(key=>!used.includes(key));return choices[Math.floor(g.random()*choices.length)];
}
export function combatSkills(g,e,target){
 const d=distance(e,target);
 if(e.key==='hohenheim'&&e.state.hohenCharge)return;
 if(e.key==='yan'){g.cast(e,'r',target);if(d<=5)g.cast(e,'q',target);return;}
 if(e.key==='sora'){g.cast(e,'r',target);if(d<=4.5)g.cast(e,'q',target);return;}
 if(e.key==='ppui'){const ally=g.champions(e.team).filter(a=>a!==e&&a.alive&&distance(e,a)<=6).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(ally){g.attack(e,ally);if(ally.hp<ally.maxHp*.85)g.cast(e,'q',ally);}}else if(e.key==='queequeg'){
  const ally=g.champions(e.team).filter(a=>a!==e&&a.alive&&distance(e,a)<=5).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(ally&&!e.state.tether)g.cast(e,'q',ally);
 }else if(d<=7&&!(e.key==='alisa'&&g.buff(e,'alisaReload')&&e.hp/e.maxHp>.65&&e.buffs.alisaReload-g.time>.4))g.cast(e,'q',target,DRAG_KEYS.includes(e.key)?{direction:'right'}:{});
 if(d<=(e.key==='meursault'?5:e.key==='alisa'?4:8))g.cast(e,'r',target);
}
export function supportAnchor(g,e){return g.champions(e.team).find(a=>a!==e&&a.alive&&a.hp>0&&a.position==='bottom'&&!a.retreat&&!g.inSpawn(a));}
export function formation(g,e,anchor,objective){
 const forward=direction(anchor,objective||CORE_POSITIONS[1-e.team]);
 return {x:anchor.x-forward.x*1.8,y:anchor.y-forward.y*1.8-2.1};
}
export function bossObjective(g,e,dt){
 const living=team=>g.champions(team).filter(c=>c.alive&&c.hp>0&&!c.state.posthumous).length;
 const boss=g.units.find(u=>u.camp==='boss'&&u.alive);
 if(!boss||living(e.team)<=living(1-e.team))return false;
 const radius=Math.max(2.1,Math.min(6,g.attackRange(e)*.8+boss.radius)),a=(e.team?0:Math.PI)+(e.index-1.5)*.38;
 const point={x:boss.x+Math.cos(a)*radius,y:boss.y+Math.sin(a)*radius};
 e.objective='boss';
 if(distance(e,boss)>g.attackRange(e)+boss.radius||!g.clearLine(e,boss))g.moveToward(e,point,dt);
 else {g.attack(e,boss);combatSkills(g,e,boss);}
 return true;
}
