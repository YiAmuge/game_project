import {segmentDistance} from './geometry.js';
export const DASH_ATTACK_REACH=1.2;
export const forwardEnd=(point,d,extra=DASH_ATTACK_REACH)=>({x:point.x+d.x*extra,y:point.y+d.y*extra});
export const forwardDistance=(target,point,d)=>segmentDistance(target,point,forwardEnd(point,d));
// A blocked dash still performs its contact strike without moving the body.
export function stationaryContact(g,e,origin,d,strike){if(e.actionKind!=='basic'||Math.hypot(e.x-origin.x,e.y-origin.y)>.12)return false;strike({x:e.x,y:e.y},forwardEnd(e,d,1.5),0);return true;}
