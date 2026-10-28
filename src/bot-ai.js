import { CHAMPIONS, POSITIONS, CORE_POSITIONS } from './data.js';
import { distance,direction } from './geometry.js';
import { DRAG_KEYS } from './skills.js';

const towerFrames=new WeakMap();
function enemyTowers(g,e){let frame=towerFrames.get(g);if(!frame||frame.at!==g.time||frame.units!==g.units||frame.nextId!==g.nextId){frame={at:g.time,units:g.units,nextId:g.nextId,towers:g.units.filter(t=>t.kind==='tower')};towerFrames.set(g,frame);}return frame.towers.filter(t=>t.alive&&t.team!==e.team);}
export function canSiege(g,e,tower){
 if(e.hp/e.maxHp<.55||tower.aggro===e.id||tower.targetId===e.id)return false;
 if(e.aiTowerCover?.has(tower.id))return e.aiTowerCover.get(tower.id);
 let count=0;for(const t of g.units)if(t.alive&&t.kind==='minion'&&t.team===e.team&&t.hp/t.maxHp>.3&&distance(t,tower)<=tower.range-.4){count+=t.siege?2:1;if(count>=2)break;}
 const covered=count>=2;e.aiTowerCover?.set(tower.id,covered);return covered;
}
export function safeTowerPoint(g,e,p){return enemyTowers(g,e).every(t=>distance(t,p)>t.range+e.radius+.9||canSiege(g,e,t));}
export function safeTowerTarget(g,e,t){
 if(t.team===e.team)return true;
 if(t.kind==='tower')return canSiege(g,e,t);
 return enemyTowers(g,e).every(tower=>distance(tower,t)>tower.range+t.radius+.4||t.kind!=='champion'&&canSiege(g,e,tower));
}
export function safeTowerStep(g,e,next){return enemyTowers(g,e).every(t=>canSiege(g,e,t)||distance(t,next)>t.range+e.radius+.9||distance(t,next)>distance(t,e)+1e-6);}
export function leaveTower(g,e,dt){
 const towers=enemyTowers(g,e);let retreat=e.aiTowerRetreat,threat=retreat&&towers.find(t=>t.id===retreat.towerId);
 if(retreat&&(!threat||distance(e,threat)>=threat.range+e.radius+1.15&&g.time>=retreat.until)){delete e.aiTowerRetreat;retreat=null;}
 if(!retreat){threat=towers.filter(t=>distance(e,t)<t.range+e.radius+.6&&!canSiege(g,e,t)).sort((a,b)=>distance(e,a)-distance(e,b))[0];if(!threat)return false;
  let d=direction(threat,e);if(Math.hypot(d.x,d.y)<.01)d=direction(threat,g.spawnPoint(e));
  retreat=e.aiTowerRetreat={towerId:threat.id,until:g.time+1,point:{x:threat.x+d.x*(threat.range+e.radius+1.35),y:threat.y+d.y*(threat.range+e.radius+1.35)}};e.path=[];e.pathAt=0;
 }
 e.objective='tower-safety';if(distance(e,threat)<threat.range+e.radius+1.2)g.moveToward(e,retreat.point,dt);return true;
}
export function combatTarget(g,e,range=9){
 const attackRange=g.attackRange(e);let best,bestScore=Infinity,bestDistance=Infinity;
 for(const t of g.units){if(!g.hostile(e,t)||t.team===2)continue;const d=distance(e,t);if(d>range+t.radius||!g.visibleTo(e.team,t)||g.locked(t)||!g.clearLine(e,t)||!safeTowerTarget(g,e,t))continue;const score=(d>attackRange+t.radius?10:0)+(t.kind==='champion'?0:t.kind==='minion'?1:2);if(score<bestScore||score===bestScore&&d<bestDistance){best=t;bestScore=score;bestDistance=d;}}
 return best;
}

export function draft(g,position,used=[]){
 const pool=Object.keys(CHAMPIONS).filter(key=>!used.includes(key)&&CHAMPIONS[key].recommendedPosition===position);
 const choices=pool.length?pool:Object.keys(CHAMPIONS).filter(key=>!used.includes(key));return choices[Math.floor(g.random()*choices.length)];
}
export function combatSkills(g,e,target){
 if(!safeTowerTarget(g,e,target))return;
 const d=distance(e,target);
 if(e.key==='hohenheim'&&e.state.hohenCharge)return;
 if(e.state.donCharge)return;
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
