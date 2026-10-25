import { WALLS, WORLD, RULES, terrainContains,inApproachCutout } from './data.js';
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const direction = (a,b) => { const d = distance(a,b) || 1; return {x:(b.x-a.x)/d,y:(b.y-a.y)/d}; };
export function blocked(x,y,r=.4,map) {
  if(map){const b=map.bounds;if(x<b.x+r||y<b.y+r||x>b.x+b.w-r||y>b.y+b.h-r)return true;}
  if(!map&&inApproachCutout(x,y))return true;
  const interior=x>=r&&y>=r&&x<=RULES.width-r&&y<=RULES.height-r;
  const footprint=interior?[]:[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.707,r*.707],[-r*.707,r*.707],[r*.707,-r*.707],[-r*.707,-r*.707]];
  return (!map&&!interior&&footprint.some(([dx,dy])=>!terrainContains(x+dx,y+dy))) || (map?.walls||WALLS).some(w => {
    if(!w.angle){const px=clamp(x,w.x,w.x+w.w),py=clamp(y,w.y,w.y+w.h);return Math.hypot(x-px,y-py)<r;}
    const cx=w.x+w.w/2,cy=w.y+w.h/2,angle=w.angle||0,c=Math.cos(angle),s=Math.sin(angle),dx=x-cx,dy=y-cy,lx=dx*c+dy*s,ly=-dx*s+dy*c;
    return Math.hypot(lx-clamp(lx,-w.w/2,w.w/2),ly-clamp(ly,-w.h/2,w.h/2))<r;
  });
}
export function clearLine(a,b,r=.12,map) {
  const n=Math.ceil(distance(a,b)/.3);
  for(let i=1;i<=n;i++) if(blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,r,map)) return false;
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
export function findPath(start,goal,r=.48,map) {
  const bounds=map?.bounds||WORLD;
  const sx=Math.floor(start.x-bounds.x),sy=Math.floor(start.y-bounds.y),gx=Math.floor(goal.x-bounds.x),gy=Math.floor(goal.y-bounds.y);
  const cols=Math.ceil(bounds.w),rows=Math.ceil(bounds.h);
  const key=(x,y)=>y*cols+x, origin=key(sx,sy), dest=key(gx,gy);
  const queue=[origin], prev=new Map([[origin,null]]); let found=null;
  for(let i=0;i<queue.length;i++) {
    const k=queue[i],x=k%cols,y=Math.floor(k/cols);
    if(k===dest) {found=k;break;}
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      const nx=x+dx,ny=y+dy,nk=key(nx,ny);
      if(nx<0||ny<0||nx>=cols||ny>=rows||prev.has(nk)||blocked(nx+.5+bounds.x,ny+.5+bounds.y,r,map)) continue;
      prev.set(nk,k);queue.push(nk);
    }
  }
  if(found===null) return [];
  const path=[];
  for(let k=found;k!==origin;k=prev.get(k)) path.push({x:k%cols+.5+bounds.x,y:Math.floor(k/cols)+.5+bounds.y});
  return path.reverse();
}

export function wallCorners(w){const cx=w.x+w.w/2,cy=w.y+w.h/2,c=Math.cos(w.angle||0),s=Math.sin(w.angle||0);return[[-w.w/2,-w.h/2],[w.w/2,-w.h/2],[w.w/2,w.h/2],[-w.w/2,w.h/2]].map(([x,y])=>({x:cx+x*c-y*s,y:cy+x*s+y*c}));}

// Concealment strips are rectangles or convex polygons with matching visual/collision footprints.
export function regionContains(region,p){
 if(p.x<region.x||p.x>region.x+region.w||p.y<region.y||p.y>region.y+region.h)return false;
 if(!region.polygon)return true;
 let sign=0;for(let i=0;i<region.polygon.length;i++){const a=region.polygon[i],b=region.polygon[(i+1)%region.polygon.length],cross=(b[0]-a[0])*(p.y-a[1])-(b[1]-a[1])*(p.x-a[0]);if(Math.abs(cross)<1e-8)continue;if(sign&&sign*cross<0)return false;sign=Math.sign(cross);}return true;
}
