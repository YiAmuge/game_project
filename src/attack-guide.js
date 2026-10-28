import{basicAimReach}from'./mobile-aim.js';
import{distance,clamp}from'./geometry.js';

export const ATTACK_GUIDE={idle:2,fade:1};
const activity=(g,e)=>Math.max(-Infinity,...['lastAttackAt','lastDamageAt','lastCombat','attackAt'].map(k=>Number.isFinite(e[k])&&e[k]<=g.time?e[k]:-Infinity));
// Keep this presentation timestamp after a nearby combatant leaves the area.
export function attackGuideOpacity(g,e=g.player){
 if(!e?.alive)return 0;
 let at=Math.max(0,e.attackGuideAt??0,activity(g,e));const reach=basicAimReach(g,e);
 for(const t of g.units){if(t===e||activity(g,t)<=at||distance(e,t)>reach+(t.radius||0)||g.hidden(t)||!g.visibleTo(e.team,t)||!g.clearLine(e,t))continue;at=activity(g,t);}
 e.attackGuideAt=at;return clamp(1-(g.time-at-ATTACK_GUIDE.idle)/ATTACK_GUIDE.fade,0,1);
}
