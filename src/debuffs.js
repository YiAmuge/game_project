import { clear as clearInfestation } from './infestation.js';
import { settleBody } from './collision.js';

export const immune=(g,e)=>e.key==='meursault'&&g.buff(e,'resolve')||e.key==='don'&&Boolean(e.state?.donCharge);
export function cleanse(g,e){
 e.status={};delete e.burn;delete e.needleBleeds;clearInfestation(g,e);
 for(const key of ['netTrap','swordHeldBy','tauntedBy','harpoon','harpoons','mentalWhip','ishmaelWeak','gaze','contempt','nellyMarks','rabbitMark'])delete e.state[key];
 for(const key of ['harpoon','contempt','nellyMark','rabbitMark'])delete e.visuals[key];
 for(const owner of g.champions())if(owner.team!==e.team){
  for(const key of ['orders','falseOrders'])if(owner.state[key])delete owner.state[key][e.id];
  if(owner.state.swordGrab?.target===e)delete owner.state.swordGrab;
 }
 if(e.motion?.forced){const previous=e.motion.lastClear;delete e.motion;settleBody(g,e,previous);}
}
