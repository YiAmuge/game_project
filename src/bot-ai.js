import*as Ezra from'./ezra.js';
import{CHAMPIONS,CORE_POSITIONS,FOUNTAIN_AREAS,UPGRADE_STEPS}from'./data.js';
import{distance,direction}from'./geometry.js';
import{DRAG_KEYS}from'./skills.js';
import{skillTargeting,castPoint}from'./targeting.js';
import{shoppingTrip,rallyPing,buyEquipment}from'./bot-build.js';
export{buyEquipment,rallyPing};
const frames=new WeakMap();
export function frame(g){
 let f=frames.get(g);if(f&&f.at===g.time&&f.units===g.units&&f.nextId===g.nextId)return f;
 f={at:g.time,units:g.units,nextId:g.nextId,byId:new Map(),champions:[[],[]],minions:[[],[]],towers:[[],[]],cover:new Map(),reach:new Map()};
 for(const t of g.units){f.byId.set(t.id,t);if(t.team!==0&&t.team!==1)continue;if(t.kind==='champion')f.champions[t.team].push(t);if(t.kind==='minion')f.minions[t.team].push(t);if(t.kind==='tower')f.towers[t.team].push(t);}
 frames.set(g,f);return f;
}
const enemyTowers=(g,e)=>frame(g).towers[1-e.team];
export const basicReach=(g,e)=>e.key==='ezra'?Ezra.attackReach(g,e):g.attackRange(e)+(e.key==='marton'?2.2:e.key==='rudolph'?2.1675:0);
export function canSiege(g,e,tower){
 if(e.hp/e.maxHp<.55||tower.aggro===e.id||tower.targetId===e.id)return false;
 const f=frame(g);let memo=f.cover.get(e.id);if(!memo){memo=new Map();f.cover.set(e.id,memo);}if(memo.has(tower.id))return memo.get(tower.id);
 let count=0;for(const t of f.minions[e.team])if(t.alive&&t.hp/t.maxHp>.3&&distance(t,tower)<=tower.range-.4){count+=t.siege?2:1;if(count>=2)break;}
 const result=count>=2;memo.set(tower.id,result);return result;
}
function criticalChase(g,e,t){return t?.kind==='champion'&&t.alive&&t.hp/t.maxHp<.08&&e.hp/e.maxHp>.9&&distance(e,t)<2.5;}
function baseSafe(g,e,p,t){
 const z=FOUNTAIN_AREAS[1-e.team],inside=p.x>=z.x&&p.x<=z.x+z.w&&p.y>=z.y&&p.y<=z.y+z.h;
 if(inside){const depth=e.team===0?p.x-z.x:z.x+z.w-p.x;if(!criticalChase(g,e,t)||depth>1)return false;}
 if(enemyTowers(g,e).some(t=>t.alive)&&distance(p,CORE_POSITIONS[1-e.team])<4.5&&!criticalChase(g,e,t))return false;
 return true;
}
export function canDive(g,e,t,tower){
 if(!t?.alive||t.kind!=='champion'||t.team===e.team||g.time<(e.aiDiveCooldown||0)||!g.visibleTo(e.team,t)||t.invulnerableUntil>g.time||g.buff(t,'queequegUlt')||t.state?.posthumous||!baseSafe(g,e,t,t))return false;
 const covered=canSiege(g,e,tower);if(e.hp/e.maxHp<(covered?.70:.84)||e.hp<Math.max(1200,t.hp*2.4)||t.hp/t.maxHp>(covered?.28:.18))return false;
 const others=frame(g).champions[1-e.team].filter(c=>c!==t&&c.alive&&c.hp/c.maxHp>.3&&distance(c,t)<7&&g.visibleTo(e.team,c)).length;
 return others<=(covered?1:0);
}
const moving={ezra:['basic','q'],yi:['r'],dongrang:['r'],don:['q','r'],ryoshu:['q','r'],sinclair:['q','r'],myo:['basic'],heathcliff:['q'],sora:['q'],yan:['q'],outis:['q','r'],nelly:['r'],nosferatu:['r'],hohenheim:['q'],jamila:['q'],ahab:['r'],starbuck:['r'],kim:['q'],alisa:['q']};
function skillReach(g,e,slot){const s=skillTargeting(g,e,slot);return moving[e.key]?.includes(slot)||['self','ally','quick'].includes(s.kind)?0:s.range+(['circle','global'].includes(s.kind)?s.radius:s.impact||0);}
function pokeReach(g,e){const f=frame(g);if(f.reach.has(e.id))return f.reach.get(e.id);const reach=Math.max(['don','starbuck','myo'].includes(e.key)?0:basicReach(g,e),skillReach(g,e,'q'),skillReach(g,e,'r'));f.reach.set(e.id,reach);return reach;}
export function safeTowerPoint(g,e,p){return baseSafe(g,e,p)&&enemyTowers(g,e).every(t=>!t.alive||distance(t,p)>t.range+e.radius+.9||canSiege(g,e,t));}
export function safeTowerTarget(g,e,t){
 if(t.team===e.team)return true;if(!baseSafe(g,e,t,t))return false;if(t.kind==='tower')return canSiege(g,e,t);
 return enemyTowers(g,e).every(tower=>!tower.alive||distance(tower,t)>tower.range+t.radius+.4||canSiege(g,e,tower)||t.kind==='champion'&&(canDive(g,e,t,tower)||distance(e,t)<=pokeReach(g,e)+t.radius));
}
export function safeTowerStep(g,e,next){
 const target=frame(g).byId.get(e.aiDive?.targetId);
 if(!baseSafe(g,e,next,target)&&distance(next,g.spawnPoint(e))>=distance(e,g.spawnPoint(e)))return false;
 return enemyTowers(g,e).every(t=>!t.alive||canSiege(g,e,t)||e.aiDive?.towerId===t.id&&target?.alive&&e.hp/e.maxHp>.5&&g.time<e.aiDive.until||distance(t,next)>t.range+e.radius+.9||distance(t,next)>distance(t,e)+1e-6);
}
export function leaveTower(g,e,dt){
 const towers=enemyTowers(g,e);let threat;
 if(e.aiDive){const dive=e.aiDive,target=frame(g).byId.get(dive.targetId);threat=frame(g).byId.get(dive.towerId);
  if(threat?.alive&&target?.alive&&target.hp/target.maxHp<.4&&e.hp/e.maxHp>.5&&g.time<dive.until&&baseSafe(g,e,target,target))return false;
  delete e.aiDive;e.aiDiveCooldown=g.time+4;if(threat?.alive)e.aiTowerRetreat={towerId:threat.id,until:g.time+1};
 }
 let retreat=e.aiTowerRetreat;threat=retreat?towers.find(t=>t.id===retreat.towerId&&t.alive):null;
 if(retreat&&(!threat||distance(e,threat)>=threat.range+e.radius+1.15&&g.time>=retreat.until)){delete e.aiTowerRetreat;retreat=null;}
 if(!retreat){threat=towers.filter(t=>t.alive&&distance(e,t)<t.range+e.radius+.6&&!canSiege(g,e,t)).sort((a,b)=>distance(e,a)-distance(e,b))[0];if(!threat)return false;retreat=e.aiTowerRetreat={towerId:threat.id,until:g.time+1};}
 if(!retreat.point){let d=direction(threat,e);if(Math.hypot(d.x,d.y)<.01)d=direction(threat,g.spawnPoint(e));retreat.point={x:threat.x+d.x*(threat.range+e.radius+1.35),y:threat.y+d.y*(threat.range+e.radius+1.35)};e.path=[];e.pathAt=0;}
 e.objective='tower-safety';if(distance(e,threat)<threat.range+e.radius+1.2)g.moveToward(e,retreat.point,dt);return true;
}
export function combatTarget(g,e,range=9){
 const f=frame(g),cached=f.byId.get(e.aiCombatTarget);
 if(g.time<(e.aiCombatAt||0)&&e.aiCombatTarget===undefined)return;
 if(g.time<(e.aiCombatAt||0)&&cached?.alive&&g.hostile(e,cached)&&distance(e,cached)<=Math.max(range,pokeReach(g,e))+cached.radius&&g.visibleTo(e.team,cached)&&safeTowerTarget(g,e,cached))return cached;
 const reach=basicReach(g,e),scan=Math.min(24,Math.max(range,pokeReach(g,e)));let best,bestScore=Infinity,bestDistance=Infinity;
 for(const t of g.units){if(!g.hostile(e,t)||t.team===2)continue;const d=distance(e,t);if(d>scan+t.radius||!g.visibleTo(e.team,t)||g.locked(t)||!g.clearLine(e,t)||!safeTowerTarget(g,e,t))continue;const score=(d>reach+t.radius?10:0)+(t.kind==='champion'?0:t.kind==='minion'?1:2);if(score<bestScore||score===bestScore&&d<bestDistance){best=t;bestScore=score;bestDistance=d;}}
 e.aiCombatAt=g.time+.125;e.aiCombatTarget=best?.id;
 if(best?.kind==='champion'&&!e.aiDive){const tower=enemyTowers(g,e).find(t=>t.alive&&distance(best,t)<=t.range+best.radius&&canDive(g,e,best,t));if(tower)e.aiDive={targetId:best.id,towerId:tower.id,until:g.time+2.6};}
 return best;
}
export function poke(g,e,target,dt){
 const tower=enemyTowers(g,e).find(t=>t.alive&&distance(t,target)<t.range+target.radius+.4);
 if(!tower||canSiege(g,e,tower)||e.aiDive)return false;
 const d=direction(tower,e),point={x:tower.x+d.x*(tower.range+e.radius+.95),y:tower.y+d.y*(tower.range+e.radius+.95)};
 e.objective='tower-poke';if(distance(e,point)>1&&safeTowerPoint(g,e,point))g.moveToward(e,point,dt);
 if(!['don','starbuck','myo'].includes(e.key)&&distance(e,target)<=basicReach(g,e)+target.radius&&g.clearLine(e,target))g.attack(e,target);
 if(g.time>=(e.aiPokeAt||0)){e.aiPokeAt=g.time+.2;for(const slot of ['q','r']){if(skillReach(g,e,slot)<=0||distance(e,target)>skillReach(g,e,slot)+target.radius)continue;const spec=skillTargeting(g,e,slot);if(spec.ignoreWalls||g.clearLine(e,target))g.cast(e,slot,castPoint(e,target,spec,g.bounds));}}
 return true;
}
function cleansable(g,e){return Object.values(e.status||{}).some(s=>s.until>g.time&&s.amount>0&&!s.hideVisual)||Boolean(e.burn||e.needleBleeds)||Object.values(e.state?.queenMarks||{}).some(m=>m.until>g.time);}
export function healTarget(g,e,range=8){
 const allies=frame(g).champions[e.team].filter(a=>a!==e&&a.alive&&!g.hidden(a)&&distance(e,a)<=range&&g.clearLine(e,a));
 return allies.filter(a=>a.hp/a.maxHp<.65).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]||allies.find(a=>cleansable(g,a))||(e.hp/e.maxHp<.3?e:null);
}
function jointAim(g,e,enemy,ally,range,radius){if(!enemy)return ally||e;if(!ally)return enemy;const p={x:(enemy.x+ally.x)/2,y:(enemy.y+ally.y)/2};if(distance(enemy,ally)<=radius*2&&distance(e,p)<=range)return p;return enemy;}
const supportKeys=new Set(['ppui','honglu','queequeg','meursault','yi','queen']);
export function supportSkills(g,e,enemy){
 if(!supportKeys.has(e.key))return;
 if(g.time<(e.aiSupportAt||0))return;e.aiSupportAt=g.time+.15;const ally=healTarget(g,e,8),lowEnemy=enemy?.kind==='champion'&&enemy.hp/enemy.maxHp<.3;
 if(e.key==='ppui'&&ally&&distance(e,ally)<=7&&ally.hp/ally.maxHp<.65)g.cast(e,'q',e);
 if(e.key==='honglu'){
  if((ally&&distance(e,ally)<=6||enemy&&distance(e,enemy)<=6)&&(!e.state.insightUntil||ally&&ally.hp/ally.maxHp<.25||e.state.insightUntil-g.time<.15))g.cast(e,'q',e);
  const urgent=ally&&(ally.hp/ally.maxHp<.25||cleansable(g,ally))&&!lowEnemy;if(!g.zones.some(z=>z.kind==='waterfall'&&z.source===e&&z.until>g.time)&&(enemy?.kind==='champion'||urgent))g.cast(e,'r',jointAim(g,e,enemy,urgent?ally:null,8.5,6.5));
 }
 if(e.key==='queequeg'){
  const link=ally||frame(g).champions[e.team].find(a=>a!==e&&a.alive&&distance(a,e)<=8);if(link&&!e.state.tether)g.cast(e,'q',link);
  if(!g.buff(e,'queequegUlt')&&(e.hp/e.maxHp<.4||link&&link.hp/link.maxHp<.5))g.cast(e,'r',e);
 }
 if(e.key==='queen'&&enemy?.kind!=='champion'&&ally&&ally.hp/ally.maxHp<.25&&!e.state.queenQ)g.cast(e,'q',ally);
 if(e.key==='meursault'&&cleansable(g,e))g.cast(e,'q',e);
 if(e.key==='yi'&&ally&&(ally.hp/ally.maxHp<.4||cleansable(g,ally)))g.cast(e,'r',jointAim(g,e,enemy,ally,6.4,5.5));
}
export function basicTarget(g,e,enemy){
 if(e.key!=='queen')return enemy;const ally=healTarget(g,e,Math.min(8,g.attackRange(e)));if(!ally||ally.hp/ally.maxHp>=.25||enemy?.hp/enemy?.maxHp<.3)return enemy;
 if(enemy){const d=direction(e,enemy),x=ally.x-e.x,y=ally.y-e.y;if(x*d.x+y*d.y>0&&Math.abs(x*d.y-y*d.x)<.28+ally.radius)return enemy;}
 return ally;
}
export function combatSkills(g,e,target){
 if(!target||!safeTowerTarget(g,e,target)||g.time<(e.aiSkillAt||0))return;e.aiSkillAt=g.time+.15;supportSkills(g,e,target);const d=distance(e,target);
 if(e.key==='ezra'){if(!Ezra.ultimate(g,e)){if(e.state.ezraLastWeapon!=null&&d<=Ezra.attackReach(g,e,e.state.ezraLastWeapon))g.cast(e,'q',target);if(target.kind==='champion'&&d<=5.5)g.cast(e,'r',target);}return;}
 if(e.key==='queen'){const ally=healTarget(g,e,8),urgent=ally?.hp/ally?.maxHp<.25&&!(target.hp/target.maxHp<.3),aim=jointAim(g,e,target,urgent?ally:null,10.5,2.1);if(!e.state.queenQ)g.cast(e,'q',aim);if(!e.state.queenR)g.cast(e,'r',aim);return;}
 if(e.key==='nosferatu'){if((e.state.bloodFeast||0)>=100&&d<=6.8)g.cast(e,'q',target);if(!e.state.bloodfiend&&d<=7.5)g.cast(e,'r',target);return;}
 if(e.state.hohenCharge||e.state.donCharge)return;
 if(e.key==='yan'){g.cast(e,'r',target);if(d<=5)g.cast(e,'q',target);return;}
 if(e.key==='sora'){g.cast(e,'r',target);if(d<=4.5)g.cast(e,'q',target);return;}
 if(!['ppui','queequeg','honglu','meursault'].includes(e.key)&&d<=7&&!(e.key==='alisa'&&g.buff(e,'alisaReload')&&e.hp/e.maxHp>.65&&e.buffs.alisaReload-g.time>.4))g.cast(e,'q',target,DRAG_KEYS.includes(e.key)?{direction:'right'}:{});
 if(!['queequeg','honglu'].includes(e.key)&&d<=(e.key==='meursault'?5:e.key==='alisa'?4:8))g.cast(e,'r',target);
}
export function shop(g,e,dt){return shoppingTrip(g,e,dt);}
export function waitForWave(g,e,dt){
 if(!e.laneEntered)return false;const f=frame(g),nearEnemy=[...f.champions[1-e.team],...f.minions[1-e.team]].some(t=>t.alive&&distance(t,e)<10&&g.visibleTo(e.team,t));if(nearEnemy)return false;
 const tower=enemyTowers(g,e).find(t=>t.alive&&t.lane===e.lane),goal=tower||CORE_POSITIONS[1-e.team];
 const wave=f.minions[e.team].filter(t=>t.alive&&t.lane===e.lane).sort((a,b)=>distance(a,goal)-distance(b,goal))[0];
 let point;if(wave){const d=direction(wave,goal);point={x:wave.x-d.x*1.8,y:wave.y-d.y*1.8};}else point=f.towers[e.team].find(t=>t.alive&&t.lane===e.lane)||g.spawnPoint(e);
 e.objective='wave';if(distance(e,point)>1.5)g.moveToward(e,point,dt);return true;
}
export function draft(g,position,used=[]){const pool=Object.keys(CHAMPIONS).filter(key=>!used.includes(key)&&CHAMPIONS[key].recommendedPosition===position);const choices=pool.length?pool:Object.keys(CHAMPIONS).filter(key=>!used.includes(key));return choices[Math.floor(g.random()*choices.length)];}
export function supportAnchor(g,e){return frame(g).champions[e.team].find(a=>a!==e&&a.alive&&a.hp>0&&a.position==='bottom'&&!a.retreat&&!g.inSpawn(a));}
export function formation(g,e,anchor,objective){const forward=direction(anchor,objective||CORE_POSITIONS[1-e.team]);return{x:anchor.x-forward.x*1.8,y:anchor.y-forward.y*1.8-2.1};}
export function bossObjective(g,e,dt){const f=frame(g),living=team=>f.champions[team].filter(c=>c.alive&&c.hp>0&&!c.state.posthumous).length,boss=g.units.find(u=>u.camp==='boss'&&u.alive);if(!boss||living(e.team)<=living(1-e.team))return false;const radius=Math.max(2.1,Math.min(6,g.attackRange(e)*.8+boss.radius)),a=(e.team?0:Math.PI)+(e.index-1.5)*.38,point={x:boss.x+Math.cos(a)*radius,y:boss.y+Math.sin(a)*radius};e.objective='boss';if(distance(e,boss)>g.attackRange(e)+boss.radius||!g.clearLine(e,boss))g.moveToward(e,point,dt);else{g.attack(e,boss);combatSkills(g,e,boss);}return true;}
