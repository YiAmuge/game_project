import {segmentDistance} from './geometry.js';
export const DASH_ATTACK_REACH=1.2;
export const forwardEnd=(point,d,extra=DASH_ATTACK_REACH)=>({x:point.x+d.x*extra,y:point.y+d.y*extra});
export const forwardDistance=(target,point,d)=>segmentDistance(target,point,forwardEnd(point,d));
