import { distance } from './geometry.js';

export function trap(g,e){return e.state?.netTrap?.until>g.time&&g.stat(e,'netCapture')?e.state.netTrap:null;}
export function withinTrap(g,e,p){const t=trap(g,e);return !t||distance(t,p)<=Math.max(t.r,distance(t,e))+1e-7;}
export function trapPoint(g,e,p){const t=trap(g,e);if(!t)return {...p};const n=distance(t,p),limit=Math.max(t.r,distance(t,e));return n<=limit?{...p}:{x:t.x+(p.x-t.x)*limit/n,y:t.y+(p.y-t.y)*limit/n};}
