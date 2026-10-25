import { distance } from './geometry.js';
import { canOccupy } from './collision.js';
import { has } from './augments.js';
import { withinTrap } from './confinement.js';
export const INFILTRATION={range:60,channel:2,cooldown:75,cancelCooldown:1.5,stride:.1,strideDuration:2};
export const origin=(g,e)=>g.spawnPoint(e);
export const replacesRecall=(g,e)=>has(e,'highRisk')&&g.inSpawn(e);
export function ready(g,e){return replacesRecall(g,e)&&e.alive&&!e.state.posthumous&&!e.motion&&!g.hidden(e)&&!g.stat(e,'stun')&&!g.stat(e,'silence')&&!(e.channelUntil>g.time)&&(e.state.infiltrationReady||0)<=g.time&&g.winner===null;}
export function valid(g,e,point){return Boolean(point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&distance(origin(g,e),point)<=INFILTRATION.range+1e-8&&withinTrap(g,e,point)&&canOccupy(g,e,point,{phaseEnemies:false}));}
export function begin(g,e,point){
 if(!ready(g,e)||e.recall||!valid(g,e,point))return false;
 e.recall={infiltration:true,destination:{x:point.x,y:point.y},startedAt:g.time,until:g.time+INFILTRATION.channel,x:e.x,y:e.y};
 e.state.infiltrationReady=g.time+INFILTRATION.cooldown;delete e.state.infiltrationSelecting;
 if(e.player){g.input.x=0;g.input.y=0;g.input.fire=false;}return true;
}
export function complete(g,e){
 const cast=e.recall;if(!cast?.infiltration)return false;
 if(!replacesRecall(g,e)||!valid(g,e,cast.destination)){g.cancelRecall(e);return false;}
 Object.assign(e,cast.destination);delete e.recall;e.path=[];e.retreat=false;
 g.addBuff(e,'infiltrationStride',INFILTRATION.strideDuration,{copy:false});
 g.effects.push({type:'ring',x:e.x,y:e.y,r:2.5,color:'#8bbfe7',life:.65,maxLife:.65});return true;
}
