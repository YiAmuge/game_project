import { distance,slide } from './geometry.js';
// Rebuild a small spatial grid per pass; structures stay fixed while mobile bodies separate.
export function separate(g){
 const bodies=g.units.filter(e=>e.alive&&!g.hidden(e)&&!e.state?.posthumous),size=3;
 const fixed=e=>e.kind==='tower'||e.kind==='core'||Boolean(e.state?.ahabUlt)||e.state?.returnAnchorUntil>g.time;
 for(let pass=0;pass<4;pass++){
  const cells=new Map();for(const e of bodies){const key=`${Math.floor(e.x/size)},${Math.floor(e.y/size)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(e);}
  let overlap=false;
  for(const a of bodies){const x=Math.floor(a.x/size),y=Math.floor(a.y/size);
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const b of cells.get(`${x+dx},${y+dy}`)||[]){
    if(a.id>=b.id||fixed(a)&&fixed(b))continue;
    const gap=a.radius+b.radius+.008,len=distance(a,b);if(len>=gap-.001)continue;overlap=true;
    const nx=len>.0001?(b.x-a.x)/len:((a.id+b.id)%2?1:-1),ny=len>.0001?(b.y-a.y)/len:0,push=gap-len;
    const wa=fixed(a)?0:fixed(b)?1:.5,wb=1-wa,ax=a.x,ay=a.y,bx=b.x,by=b.y;
    if(wa)slide(a,-nx*push*wa,-ny*push*wa);if(wb)slide(b,nx*push*wb,ny*push*wb);
    // Transfer a blocked unit's share so walls do not trap two bodies together.
    const moved=(ax-a.x)*nx+(ay-a.y)*ny+(b.x-bx)*nx+(b.y-by)*ny,left=Math.max(0,push-moved);
    if(left>.001){if(wa)slide(a,-nx*left,-ny*left);if(wb&&distance(a,b)<gap)slide(b,nx*(gap-distance(a,b)),ny*(gap-distance(a,b)));}
   }
  }if(!overlap)break;
 }
}
