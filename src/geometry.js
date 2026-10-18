import { WALLS, RULES } from './data.js';
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const direction = (a,b) => { const d = distance(a,b) || 1; return {x:(b.x-a.x)/d,y:(b.y-a.y)/d}; };
export function blocked(x,y,r=.4) {
  return x < r || y < r || x > RULES.width-r || y > RULES.height-r || WALLS.some(w => {
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
  const sx=Math.floor(start.x),sy=Math.floor(start.y),gx=Math.floor(goal.x),gy=Math.floor(goal.y);
  const key=(x,y)=>y*64+x, origin=key(sx,sy), dest=key(gx,gy);
  const queue=[origin], prev=new Map([[origin,null]]); let found=null;
  for(let i=0;i<queue.length;i++) {
    const k=queue[i],x=k%64,y=Math.floor(k/64);
    if(k===dest) {found=k;break;}
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      const nx=x+dx,ny=y+dy,nk=key(nx,ny);
      if(nx<0||ny<0||nx>=64||ny>=36||prev.has(nk)||blocked(nx+.5,ny+.5,r)) continue;
      prev.set(nk,k);queue.push(nk);
    }
  }
  if(found===null) return [];
  const path=[];
  for(let k=found;k!==origin;k=prev.get(k)) path.push({x:k%64+.5,y:Math.floor(k/64)+.5});
  return path.reverse();
}
