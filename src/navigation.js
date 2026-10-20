import { distance, direction, segmentDistance, clearLine } from './geometry.js';

// Local steering supplements wall paths. Lane convoys keep their queue; other bodies are passed on a stable side.
export function steer(g,e,goal,step){
 const desired=direction(e,goal),horizon=Math.max(1,step+.45),look=Math.max(3,horizon+1);
 const bodies=g.units.filter(u=>u!==e&&u.alive&&!g.hidden(u)&&!u.state?.posthumous&&distance(e,u)<look+u.radius&&
  !(e.kind==='minion'&&u.kind==='minion'&&u.team===e.team&&u.lane===e.lane&&u.wave===e.wave));
 if(!bodies.length){delete e.avoidance;return desired;}
 const probe=d=>({x:e.x+d.x*horizon,y:e.y+d.y*horizon});
 const safe=d=>{
  const to=probe(d);if(!clearLine(e,to,e.radius))return false;
  return bodies.every(u=>{const gap=e.radius+u.radius+.08,start=distance(e,u);return start<gap+1e-6?distance({x:e.x+d.x*step,y:e.y+d.y*step},u)>start+1e-6:segmentDistance(u,e,to)>=gap;});
 };
 if(safe(desired)){delete e.avoidance;return desired;}
 const forward={x:e.x+desired.x*look,y:e.y+desired.y*look};
 const blocker=bodies.filter(u=>segmentDistance(u,e,forward)<e.radius+u.radius+.15).sort((a,b)=>distance(e,a)-distance(e,b))[0];
 const side=e.avoidance&&blocker&&e.avoidance.id===blocker.id?e.avoidance.side:1;e.avoidance={id:blocker?.id,side};
 const angle=Math.atan2(desired.y,desired.x);
 for(const sign of [side,-side])for(const degrees of [20,40,60,80,100]){
  const a=angle+sign*degrees*Math.PI/180,d={x:Math.cos(a),y:Math.sin(a)};
  if(safe(d)){e.avoidance.side=sign;return d;}
 }
 return {x:0,y:0};
}
