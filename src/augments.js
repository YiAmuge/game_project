import { distance } from './geometry.js';
import { AUGMENTS,AUGMENT_RULES } from './data.js';
export { AUGMENTS,AUGMENT_RULES };
export const has=(e,key)=>e.augments?.includes(key)||false;
export function unlocked(e,group){return group==='combat'?e.upgrades.power>=3:group==='survival'?e.upgrades.health>=3:e.upgrades.speed+e.upgrades.reload+e.upgrades.haste>=3;}
export const categoryCount=(e,group)=>e.augments.filter(key=>AUGMENTS.find(a=>a.key===key)?.group===group).length;
export const resentment=e=>has(e,'resentment')?Math.min(8,Math.floor((1-e.hp/e.maxHp+1e-8)*10))*.05:0;
export function tick(g,e,dt=0){
 for(const key of ['maskStacks','orderStacks'])e.state[key]=liveStacks(g,e,key);
 if(has(e,'forceBattery')&&g.time-e.lastDamageAt>=2-1e-8)naturalShield(g,e,e.maxHp*.13*dt);
 if(has(e,'antimatter'))e.state.antimatterNext??=g.time+.5;
 if(has(e,'antimatter')&&g.time+1e-8>=e.state.antimatterNext){e.state.antimatterNext=g.time+.5;for(const t of [...g.units])if(g.hostile(e,t)&&distance(e,t)<=1.6+t.radius&&g.clearLine(e,t))g.deal(e,t,20,{fixed:true,proc:false});}
 const s=e.state;
 if(g.time-e.lastCombat>3){delete s.augCombatAt;delete e.buffs.augBattleHaste;}
 else{s.augCombatAt??=g.time;if(has(e,'battleHaste')&&g.time-s.augCombatAt>=3){if(!g.buff(e,'augBattleHaste'))g.addBuff(e,'augBattleHaste',3,{copy:false});else e.buffs.augBattleHaste=g.time+3;}}
 if(s.augReloadStacks>0&&g.time+1e-8>=s.augReloadDecay){while(s.augReloadStacks>0&&g.time+1e-8>=s.augReloadDecay){s.augReloadStacks--;s.augReloadDecay+=3;}if(!s.augReloadStacks)delete e.buffs.augReload;}
}
export function interceptFatal(g,e,remaining){
 if(e.kind!=='champion'||remaining<e.hp||!has(e,'kAmpule')||(e.state.ampuleReady||0)>g.time)return false;
 e.state.ampuleReady=g.time+60;e.hp=e.maxHp*.5;
 for(const key of ['stun','root','silence','slow','disarm','taunt','captured','netCapture','yanLock'])delete e.status[key];
 delete e.state.netCapture;delete e.state.taunt;if(e.motion?.forced)delete e.motion;const owner=g.units.find(a=>a.state?.swordGrab?.target===e);if(owner)delete owner.state.swordGrab;delete e.state.swordHeldBy;
 e.ccImmuneUntil=Math.max(e.ccImmuneUntil||0,g.time+1);g.addBuff(e,'ampuleStride',1,{copy:false});
 g.effects.push({type:'ring',x:e.x,y:e.y,r:2,color:'#76e8bd',life:.5,maxLife:.5});return true;
}
export function naturalShield(g,e,amount){
 if(!has(e,'forceBattery')||amount<=0)return;
 const id=`battery-${e.id}`,old=e.shields.find(s=>s.source===id&&s.until>g.time)?.value||0;
 g.addShield(e,Math.min(e.maxHp*.3,old+amount),id,Infinity,false);
}
export function afterHit(g,e,t,actual,proc,absorbed=0){
 if(e.kind==='champion'&&e.team!==t.team&&has(e,'glaive')&&actual>0)g.heal(e,e,actual*.3,false);
 if(!proc||actual+absorbed<=0)return;
 if(e.kind==='champion'&&e.team!==t.team&&has(e,'writtenOrder')){stack(g,e,'orderStacks',5);g.addBuff(e,'writtenOrder',5,{copy:false});}
 if(e.kind==='champion'&&e.team!==t.team){
  if(has(e,'reloadStacks')){e.state.augReloadStacks=Math.min(5,(e.state.augReloadStacks||0)+1);e.state.augReloadDecay=g.time+3;g.addBuff(e,'augReload',e.state.augReloadStacks*3,{copy:false});}
  if(actual>0&&t.kind==='champion'&&has(e,'finalBullet')&&(e.state.augBulletReady||0)<=g.time){e.state.augBulletReady=g.time+7;if(t.hp>0)g.deal(e,t,actual*.07,{fixed:true,proc:false});}
 }
}
export const slots=e=>AUGMENT_RULES.slots+(has(e,'carrier')?1:0);
export const usedSlots=e=>e.augments.filter(k=>k!=='carrier').length;
export const fits=(e,key)=>key==='carrier'||usedSlots(e)<slots(e);
export const sellable=(g,key)=>key!=='carrier'||g.training;
export const liveStacks=(g,e,key)=>(e.state[key]||[]).filter(at=>at>g.time+1e-8);
function stack(g,e,key,max){const list=liveStacks(g,e,key);if(list.length>=max)list.shift();list.push(g.time+5);e.state[key]=list;}
export function powerRate(g,e){return (has(e,'power15')?.1:0)+(has(e,'glaive')?.1:0)+(has(e,'wisdom')?.05:0)+(has(e,'highRisk')?.05:0)+(has(e,'duelManual')?Math.max(0,g.speed(e)/g.baseSpeed(e)-1):0);}
export const speedRate=(g,e)=>(has(e,'duelManual')?.05:0)+(has(e,'maskDeLu')?liveStacks(g,e,'maskStacks').length*.06:0);
export const reloadRate=(g,e)=>has(e,'maskDeLu')?liveStacks(g,e,'maskStacks').length*.06:0;
export const armorRate=(g,e)=>has(e,'writtenOrder')?liveStacks(g,e,'orderStacks').length*.05:0;
export const armorPen=e=>has(e,'power15')?.1:0;
export const converts=(g,e)=>has(e,'writtenOrder')&&liveStacks(g,e,'orderStacks').length>=5;
export const healthRate=e=>(has(e,'antimatter')?.1:0)+(has(e,'traumaGuard')?.05:0);
export const cooldownFactor=e=>has(e,'highRisk')?.95:1;
export function onCast(g,e){if(has(e,'maskDeLu')){stack(g,e,'maskStacks',2);g.addBuff(e,'maskBoost',5,{copy:false});}}
const CC=new Set(['stun','root','silence','slow','disarm','taunt','captured','netCapture','yanLock','knock']);
export function interceptCC(g,e,key,amount,seconds){
 if(!has(e,'traumaGuard')||!CC.has(key)||!(amount>0&&seconds>0)||(e.state.traumaReady||0)>g.time)return false;
 e.state.traumaReady=g.time+16;e.ammo=Math.min(g.ammoCap(e),e.ammo+(e.key==='rudolph'?15:1));
 g.effects.push({type:'ring',x:e.x,y:e.y,r:1,color:'#b6d5df',life:.35,maxLife:.35});return true;
}
export function cleanup(e){for(const k of ['maskStacks','orderStacks','antimatterNext'])delete e.state[k];}
