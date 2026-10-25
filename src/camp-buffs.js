// Buff-camp rules share internal IDs with map spawning and champion interactions.
export const BUFF_CREEPS={
 amplify:{name:'르루주 점원',health:1700,armor:15,damage:80,interval:.85},
 blessing:{name:'르누아르 점원',health:1600,armor:20,damage:100,interval:1.1},
};
export const CAMP_BUFFS={power:.10,pulseDamage:.06,pulseDrain:.06,period:3,shield:30,shieldCap:.20,heal:.005,focusedDrain:.12,focusedShield:70};
export function onBuff(g,e,key,wasActive){
 if(key!=='blessing')return;
 if(!wasActive)e.state.preservationNext=g.time+CAMP_BUFFS.period;
 const ward=e.shields.find(s=>s.source===`preservation-${e.id}`);if(ward)ward.until=e.buffs.blessing;
}
export function tick(g,e){
 if(!g.buff(e,'blessing')){if(e.state.preservationNext!==undefined)e.shields=e.shields.filter(s=>s.source!==`preservation-${e.id}`);delete e.state.preservationNext;return;}
 const ward=e.shields.find(s=>s.source===`preservation-${e.id}`);if(ward)ward.value=Math.min(ward.value,g.buffValue(e,'blessing',e.maxHp*CAMP_BUFFS.shieldCap));
 e.state.preservationNext??=g.time+CAMP_BUFFS.period;
 while(e.state.preservationNext<=g.time+1e-8&&g.buff(e,'blessing')){
  const id=`preservation-${e.id}`,old=e.shields.find(s=>s.source===id&&s.until>g.time)?.value||0;
  const value=Math.min(old+g.buffValue(e,'blessing',CAMP_BUFFS.shield),g.buffValue(e,'blessing',e.maxHp*CAMP_BUFFS.shieldCap));
  g.addShield(e,value,id,e.buffs.blessing-g.time);
  g.heal(null,e,g.buffValue(e,'blessing',e.maxHp*CAMP_BUFFS.heal),false,{healingKey:'blessing'});
  e.state.preservationNext+=CAMP_BUFFS.period;
 }
}
export function afterDamage(g,source,target,dealt,{campBonus=true,transferred=false}={}){
 if(!campBonus||transferred||source.kind!=='champion'||!g.buff(source,'amplify')||dealt<=0)return;
 const drain=g.buffValue(source,'amplify',CAMP_BUFFS.pulseDrain)*dealt;
 g.heal(null,source,drain,false,{healingKey:'amplify'});
 if(target.alive)g.deal(source,target,g.buffValue(source,'amplify',CAMP_BUFFS.pulseDamage)*dealt,{fixed:true,proc:false,campBonus:false});
}
export function swing(g,e,target){
 if(!BUFF_CREEPS[e.camp])return;
 e.facing=Math.atan2(target.y-e.y,target.x-e.x);e.swingAt=g.time;e.swingUntil=g.time+.28;
}
export function focusedHit(g,e,dealt,hits){
 if(!e.alive||!hits)return;
 if(e.camp==='amplify')g.heal(null,e,dealt*CAMP_BUFFS.focusedDrain,false);
 if(e.camp==='blessing')g.addShield(e,CAMP_BUFFS.focusedShield,`clerk-focus-${e.id}`,5,false);
}
