import {procedurePrice} from './match-modes.js';
import{AUGMENTS,RULES,UPGRADE_STEPS}from'./data.js';
import*as Augments from'./augments.js';
import{distance,direction}from'./geometry.js';
const healthUsers=new Set(['ezra','nosferatu','marton','kim','yi','honglu','ppui','alisa','queequeg','meursault','sora']);
const skillUsers=new Set(['moses','queen','yi','rudolph','hohenheim','gahwan','dongbaek','honglu','ppui','queequeg','kromer','nelly','yan']);
const magazineUsers=new Set(['ezra','rudolph','hohenheim','jamila','yan']);
const priorities={combat:['power15','range7','blackOrb','reloadStacks','wisdom','finalBullet','duelManual'],survival:['glaive','forceBattery','traumaGuard','writtenOrder','resentment','kAmpule','antimatter'],tech:['cooldown15','maskDeLu','magazine2','battleHaste','carrier','adaptiveSpeed','highRisk']};
export function buildPlan(e){
 let categories=e.position==='top'?['survival','combat','tech']:e.position==='support'?['survival','tech','combat']:['combat','tech','survival'];
 if(healthUsers.has(e.key))categories=['survival','tech','combat'];if(skillUsers.has(e.key))categories=['tech','survival','combat'];if(e.key==='nosferatu')categories=['survival','combat','tech'];if(['dongrang','kim'].includes(e.key))categories=['combat','survival','tech'];
 const stats=e.key==='ezra'?['health','reload','haste','power','speed']:e.key==='dongrang'?['power','health','haste','reload','speed']:magazineUsers.has(e.key)?['reload','haste','power','health','speed']:healthUsers.has(e.key)?['health','haste','power','speed','reload']:skillUsers.has(e.key)?['haste','reload','power','health','speed']:['power','reload','health','speed','haste'];
 if(e.key==='ezra')categories=['survival','combat','tech'];
 return{categories,stats};
}
function itemScore(e,a,plan){
 if(a.group==='special')return 110;
 let score=120-plan.categories.indexOf(a.group)*30+(priorities[a.group].length-priorities[a.group].indexOf(a.key))*2;
 if(Augments.exclusive(e,a.key))score+=40;if(magazineUsers.has(e.key)&&a.key==='magazine2')score+=35;
 if(skillUsers.has(e.key)&&['cooldown15','maskDeLu','battleHaste'].includes(a.key))score+=20;
 if(healthUsers.has(e.key)&&['forceBattery','antimatter','traumaGuard','writtenOrder'].includes(a.key))score+=18;
 if(['jamila','rudolph','hohenheim','dongbaek'].includes(e.key)&&['reloadStacks','wisdom','blackOrb'].includes(a.key))score+=20;
 return score;
}
function unlockStat(e,group,plan){
 if(group==='combat')return e.upgrades.power<3?'power':null;if(group==='survival')return e.upgrades.health<3?'health':null;
 return plan.stats.filter(k=>['speed','haste','reload'].includes(k)).find(k=>e.upgrades[k]<UPGRADE_STEPS[k].length);
}
export function buyEquipment(g,e){
 if(e.player||e.trainingDummy||!(g.inSpawn(e)||!e.alive)||!g.canUpgrade(e)||g.time<(e.aiShopAt||0))return false;e.aiShopAt=g.time+.75;
 const plan=buildPlan(e);let bought=false;
 for(let n=0;n<12;n++){
  const items=AUGMENTS.filter(a=>!Augments.has(e,a.key)&&Augments.unlockedItem(e,a.key)&&Augments.fits(e,a.key)&&Augments.categoryFits(e,a.key)).sort((a,b)=>itemScore(e,b,plan)-itemScore(e,a,plan));
  const item=items.find(a=>Augments.cost(e,a.key)<=e.gold);
  if(item&&(e.augments.length<4||plan.stats.every(k=>e.upgrades[k]>=UPGRADE_STEPS[k].length))){const before=e.gold,price=Augments.cost(e,item.key);if(!g.buyAugment(e,item.key))break;if(g.training)e.gold=before-price;bought=true;continue;}
  let stat;
  if(e.augments.length<4){
   const locked=plan.categories.find(group=>!Augments.unlocked(e,group)&&AUGMENTS.some(a=>a.group===group&&!Augments.has(e,a.key)&&Augments.categoryFits(e,a.key)));
   if(locked)stat=unlockStat(e,locked,plan);else break;
   // Save for an already-unlocked augment before opening another category.
   if(items.length&&e.gold<Math.min(...items.map(a=>Augments.cost(e,a.key))))break;
  }else stat=plan.stats.find(k=>e.upgrades[k]<UPGRADE_STEPS[k].length);
  if(!stat)break;const price=procedurePrice(e,e.upgrades[stat]);if(e.gold<price)break;const before=e.gold;if(!g.buy(e,stat))break;if(g.training)e.gold=before-price;bought=true;
 }
 if(bought){e.aiLastShop=g.time;delete e.aiShopTrip;}return bought;
}
export function rallyPing(g,e,since=-Infinity){return(g.pings||[]).some(p=>p.team===e.team&&p.until>g.time&&p.at>=since&&distance(p,e)<=27);}
function recallPoint(g,e){
 const home=g.spawnPoint(e),d=direction(e,home),points=[{x:e.x,y:e.y}];
 for(const length of [3,6,9])for(const side of [0,-2,2])points.push({x:e.x+d.x*length-d.y*side,y:e.y+d.y*length+d.x*side});
 const enemies=g.units.filter(t=>t.alive&&(t.kind!=='champion'||g.visibleTo(e.team,t))&&t.team!==e.team&&t.team!==2&&['champion','minion','tower'].includes(t.kind));
 return points.filter(p=>!g.blocked(p.x,p.y,e.radius)&&!enemies.some(t=>distance(t,p)<(t.kind==='champion'?Math.max(7,g.attackRange(t)+1):t.range+2))).sort((a,b)=>(g.bushAt(a)?-6:0)+distance(e,a)-(g.bushAt(b)?-6:0)-distance(e,b))[0]||home;
}
export function shoppingTrip(g,e,dt){
 buyEquipment(g,e);if(!e.alive||g.inSpawn(e))return false;
 if(e.aiShopTrip&&rallyPing(g,e,e.aiShopTrip.at)){g.cancelRecall(e);delete e.aiShopTrip;e.aiShoppingDelay=g.time+10;return false;}
 if(!e.aiShopTrip){
  if(g.time<(e.aiShoppingDelay||0)||g.time-(e.aiLastShop||0)<25||e.gold<(e.augments.length<4?650:900)||g.time-e.lastCombat<3||e.hp/e.maxHp<.5||rallyPing(g,e))return false;
  const enemies=g.champions(1-e.team).filter(t=>t.alive&&g.visibleTo(e.team,t)&&distance(t,e)<12),allies=g.champions(e.team).filter(t=>t.alive&&distance(t,e)<12);
  if(enemies.some(t=>t.hp/t.maxHp<.3)||enemies.length>2||enemies.length>allies.length)return false;
  const mine=g.units.filter(t=>t.alive&&t.kind==='minion'&&t.team===e.team&&distance(t,e)<12).length,theirs=g.units.filter(t=>t.alive&&t.kind==='minion'&&t.team===1-e.team&&distance(t,e)<12).length;
  if(e.position!=='jungle'&&mine<theirs)return false;
  if(buildPlan(e).stats.every(k=>e.upgrades[k]>=UPGRADE_STEPS[k].length)&&e.augments.length>=6)return false;
  e.aiShopTrip={point:recallPoint(g,e),at:g.time};e.path=[];e.pathAt=0;
 }
 e.objective='shopping';if(distance(e,e.aiShopTrip.point)>1)g.moveToward(e,e.aiShopTrip.point,dt);else if(g.time-e.lastCombat>=3)g.recall(e,{mode:'recall'});return true;
}
