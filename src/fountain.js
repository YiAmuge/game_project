import { FOUNTAIN_AREAS,inWell } from './data.js';
export const FOUNTAIN_RULES={interval:.5,damage:1000};
export function tick(g,e,dt){
 if(g.training||!e.alive)return;
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
