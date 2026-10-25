// Visual phase follows distance actually walked, never input or render frequency.
export const WALK_CYCLE_DISTANCE=1.80;
// Contact, weight-bearing, passing; repeat for the opposite leg.
export const WALK_FRAME_WEIGHTS=Object.freeze([1.25,1.25,.50,1.25,1.25,.50]);
const totalWeight=WALK_FRAME_WEIGHTS.reduce((sum,weight)=>sum+weight,0);
const frameEnds=WALK_FRAME_WEIGHTS.map((_,i)=>WALK_CYCLE_DISTANCE*WALK_FRAME_WEIGHTS.slice(0,i+1).reduce((sum,weight)=>sum+weight,0)/totalWeight);
export function walkFrameIndex(distance){
 const phase=distance%WALK_CYCLE_DISTANCE,index=frameEnds.findIndex(end=>phase<end-1e-9);
 return index<0?WALK_FRAME_WEIGHTS.length-1:index;
}
const cycles=new WeakMap();
export function recordWalk(g,e,distance){
 if(e.key!=='meursault'||e.kind!=='champion'||!e.alive||e.motion||distance<=1e-6)return;
 let cycle=cycles.get(e);
 if(!cycle||g.time<cycle.at){cycle={distance:0};cycles.set(e,cycle);}
 cycle.distance=(cycle.distance+distance)%WALK_CYCLE_DISTANCE;cycle.at=g.time;
}
export function walkingBodyForm(g,e){
 if(e.key!=='meursault'||!e.alive||e.motion||e.recall||e.channelUntil>g.time||g.stat(e,'stun')||g.stat(e,'root'))return null;
 const cycle=cycles.get(e);if(!cycle||Math.abs(g.time-cycle.at)>1e-8)return null;
 return `meursaultWalk${walkFrameIndex(cycle.distance)}`;
}
