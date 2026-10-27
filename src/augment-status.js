import{liveStacks,resentment}from'./augments.js';
export function augmentStatus(g,e,key){
 const cooldowns={finalBullet:['augBulletReady',7],kAmpule:['ampuleReady',60],traumaGuard:['traumaReady',16],maskDeLu:['maskReady',10],highRisk:['infiltrationReady',75]};
 if(cooldowns[key]){const[field,total]=cooldowns[key],remaining=Math.max(0,(e.state[field]||0)-g.time);return{label:remaining>0?Math.ceil(remaining)+'s':'준비',ready:remaining<=0,remaining,total};}
 const stack=key==='reloadStacks'?{value:e.state.augReloadStacks||0,max:5}:key==='writtenOrder'?{value:liveStacks(g,e,'orderStacks').length,max:5}:key==='resentment'?{value:Math.round(resentment(e)/.05),max:8}:null;
 if(stack)return{...stack,label:stack.value+'/'+stack.max,ready:stack.value>=stack.max};
 if(key==='battleHaste'){const active=g.buff(e,'augBattleHaste'),remaining=e.state.augCombatAt===undefined?0:Math.max(0,3-(g.time-e.state.augCombatAt));return{label:active?'활성':remaining>0?remaining.toFixed(1)+'s':'대기',ready:active,remaining,total:3};}
 if(key==='forceBattery'){const active=g.shield(e)>=e.maxHp*.1-1e-8;return{label:Math.round(g.shield(e)/e.maxHp*100)+'%',ready:active};}
 return{label:'',ready:false};
}
