import{lanePath}from'./data.js';
import*as Training from'./training.js';
import{distance}from'./geometry.js';
export const minionLane=(g,e)=>g.training?Training.lanePath(e.team,g):lanePath(e.team,e.lane);
function projection(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return{x:a.x+dx*t,y:a.y+dy*t,t};}
export function laneDistance(g,e,p){const path=minionLane(g,e);return Math.min(...path.slice(1).map((b,i)=>distance(p,projection(p,path[i],b))));}
export function laneGoal(g,e){
 const path=minionLane(g,e);e.waypoint=Math.max(1,Math.min(path.length-1,e.waypoint??1));
 while(e.waypoint<path.length-1){const corner=path[e.waypoint],next=path[e.waypoint+1],p=projection(e,corner,next);if(distance(e,corner)>.22&&!(p.t>0&&distance(e,p)<.75))break;e.waypoint++;}
 const a=path[e.waypoint-1],b=path[e.waypoint],p=projection(e,a,b);
 // Recover sideways displacement before proceeding, so return paths do not cut across the jungle.
 if(distance(e,p)>.65)return{x:p.x,y:p.y};
 return b;
}
export function mayChase(g,e,t){
 // Shooting a reachable target never requires leaving the lane.
 if(distance(e,t)<=e.range+t.radius)return true;
 if(t.kind==='minion'&&t.lane!==e.lane)return false;
 return laneDistance(g,e,t)<=2.5+t.radius;
}
export function marchTarget(e,goal){const d=distance(e,goal),t=Math.min(1,2/(d||1));return{x:e.x+(goal.x-e.x)*t,y:e.y+(goal.y-e.y)*t};}
export function convoyBlocked(g,e,goal){
 const ahead=g.units.find(a=>a.alive&&a.kind==='minion'&&a.team===e.team&&a.lane===e.lane&&a.wave===e.wave&&a.formationIndex===e.formationIndex-1);
 if(!ahead||distance(e,ahead)>=e.radius+ahead.radius+.12)return false;
 // A displaced or trailing predecessor must not stop the remainder of its wave.
 return(ahead.x-e.x)*(goal.x-e.x)+(ahead.y-e.y)*(goal.y-e.y)>0;
}
