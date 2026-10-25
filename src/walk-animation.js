// Visual phase follows distance actually walked, never input or render frequency.
export const WALK_DISTANCE_PER_FRAME=.30;
const cycles=new WeakMap();
export function recordWalk(g,e,distance){
 if(e.key!=='meursault'||e.kind!=='champion'||!e.alive||e.motion||distance<=1e-6)return;
 let cycle=cycles.get(e);
 if(!cycle||g.time<cycle.at){cycle={distance:0};cycles.set(e,cycle);}
 cycle.distance=(cycle.distance+distance)%(WALK_DISTANCE_PER_FRAME*6);cycle.at=g.time;
}
export function walkingBodyForm(g,e){
 if(e.key!=='meursault'||!e.alive||e.motion||e.recall||e.channelUntil>g.time||g.stat(e,'stun')||g.stat(e,'root'))return null;
 const cycle=cycles.get(e);if(!cycle||Math.abs(g.time-cycle.at)>1e-8)return null;
 return `meursaultWalk${Math.floor(cycle.distance/WALK_DISTANCE_PER_FRAME)}`;
}
