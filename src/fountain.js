import { FOUNTAIN_AREAS,inWell } from './data.js';
import{ejectHand}from'./yan.js';
export const FOUNTAIN_RULES={interval:.5,damage:1000};
export function returnHaste(g,e,key,seconds){g.addBuff(e,key,seconds);e.state.departureHaste={key,seconds};}
export function tickReturnHaste(g,e){
 const held=e.state?.departureHaste;if(!held)return;
 const until=g.time+held.seconds;e.buffs[held.key]=until;
 if(e.buffHistory[held.key])e.buffHistory[held.key].until=until;
 if(e.visuals[held.key])e.visuals[held.key].until=until;
 if(!g.inSpawn(e))delete e.state.departureHaste;
}
export function tick(g,e,dt){
 if(!e.alive)return;
 if(e.key==='yanHand'){ejectHand(g,e);e.fountainTick=0;return;}
 if(g.training)return;
 const zone=FOUNTAIN_AREAS.find(z=>e.team!==z.team&&inWell(e,z.team));
 if(!zone){e.fountainTick=0;return;}
 e.fountainTick=(e.fountainTick||0)+dt;
 while(e.alive&&e.fountainTick>=FOUNTAIN_RULES.interval-1e-8){
  e.fountainTick-=FOUNTAIN_RULES.interval;
  // Direct HP loss deliberately bypasses the damage/defense/resurrection pipeline.
  e.hp=Math.max(0,e.hp-FOUNTAIN_RULES.damage);e.lastDamageAt=g.time;g.cancelRecall(e);
  g.effects.push({type:'number',x:e.x,y:e.y-.7,text:1000,color:'#fff0cc',life:.7,maxLife:.7});
  if(e.hp<=0)g.kill(e,{kind:'fountain',team:zone.team,name:'부활소'},{absolute:true});
 }
}
