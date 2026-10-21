// A sword-held victim moves with its owner; validate both bodies before moving either.
export function carried(g,e){
 const grab=e.state?.swordGrab,t=grab?.target;
 return e.alive&&grab?.until>g.time&&t?.alive&&t.state?.swordHeldBy===e.id&&g.stat(t,'stun')&&t.status.stun.grabOwner===e.id?t:null;
}
export function paired(g,a,b){return carried(g,a)===b||carried(g,b)===a;}
export function shiftCarried(g,e,from,to){const t=carried(g,e);if(t){t.x+=to.x-from.x;t.y+=to.y-from.y;t.bodyMoved=true;}}
