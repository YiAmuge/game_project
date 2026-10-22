import { AUGMENTS,AUGMENT_RULES } from './data.js';
export { AUGMENTS,AUGMENT_RULES };
export const has=(e,key)=>e.augments?.includes(key)||false;
export function unlocked(e,group){return group==='combat'?e.upgrades.power>=3:group==='survival'?e.upgrades.health>=3:e.upgrades.speed+e.upgrades.reload+e.upgrades.haste>=3;}
export const categoryCount=(e,group)=>e.augments.filter(key=>AUGMENTS.find(a=>a.key===key)?.group===group).length;
export const resentment=e=>has(e,'resentment')?Math.min(8,Math.floor((1-e.hp/e.maxHp+1e-8)*10))*.05:0;
export function tick(g,e){
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
export function afterHit(g,e,t,actual,proc){
 if(!proc)return;
 if(e.kind==='champion'&&e.team!==t.team){
  if(has(e,'reloadStacks')){e.state.augReloadStacks=Math.min(5,(e.state.augReloadStacks||0)+1);e.state.augReloadDecay=g.time+3;g.addBuff(e,'augReload',e.state.augReloadStacks*3,{copy:false});}
  if(actual>0&&t.kind==='champion'&&has(e,'finalBullet')&&(e.state.augBulletReady||0)<=g.time){e.state.augBulletReady=g.time+7;if(t.hp>0)g.deal(e,t,actual*.07,{fixed:true,proc:false});}
 }
}
