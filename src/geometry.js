import { WALLS, WORLD, RULES, terrainContains } from './data.js';
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const direction = (a,b) => { const d = distance(a,b) || 1; return {x:(b.x-a.x)/d,y:(b.y-a.y)/d}; };
export function blocked(x,y,r=.4) {
  const interior=x>=r&&y>=r&&x<=RULES.width-r&&y<=RULES.height-r;
  const footprint=interior?[]:[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.707,r*.707],[-r*.707,r*.707],[r*.707,-r*.707],[-r*.707,-r*.707]];
  return (!interior&&footprint.some(([dx,dy])=>!terrainContains(x+dx,y+dy))) || WALLS.some(w => {
    const px=clamp(x,w.x,w.x+w.w), py=clamp(y,w.y,w.y+w.h);
    return Math.hypot(x-px,y-py) < r;
  });
}
export function clearLine(a,b,r=.12) {
  const n=Math.ceil(distance(a,b)/.3);
  for(let i=1;i<=n;i++) if(blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,r)) return false;
  return true;
}
export function slide(e,dx,dy) {
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.2));
  for(let i=0;i<n;i++) {
    if(!blocked(e.x+dx/n,e.y,e.radius)) e.x+=dx/n;
    if(!blocked(e.x,e.y+dy/n,e.radius)) e.y+=dy/n;
  }
}
export function segmentDistance(p,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1),0,1);
  return distance(p,{x:a.x+dx*t,y:a.y+dy*t});
}
// A small deterministic breadth-first grid search. Recomputed only when an AI path expires.
export function findPath(start,goal,r=.48) {
  const sx=Math.floor(start.x-WORLD.x),sy=Math.floor(start.y-WORLD.y),gx=Math.floor(goal.x-WORLD.x),gy=Math.floor(goal.y-WORLD.y);
  const cols=Math.ceil(WORLD.w),rows=Math.ceil(WORLD.h);
  const key=(x,y)=>y*cols+x, origin=key(sx,sy), dest=key(gx,gy);
  const queue=[origin], prev=new Map([[origin,null]]); let found=null;
  for(let i=0;i<queue.length;i++) {
    const k=queue[i],x=k%cols,y=Math.floor(k/cols);
    if(k===dest) {found=k;break;}
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      const nx=x+dx,ny=y+dy,nk=key(nx,ny);
      if(nx<0||ny<0||nx>=cols||ny>=rows||prev.has(nk)||blocked(nx+.5+WORLD.x,ny+.5+WORLD.y,r)) continue;
      prev.set(nk,k);queue.push(nk);
    }
  }
  if(found===null) return [];
  const path=[];
  for(let k=found;k!==origin;k=prev.get(k)) path.push({x:k%cols+.5+WORLD.x,y:Math.floor(k/cols)+.5+WORLD.y});
  return path.reverse();
}
