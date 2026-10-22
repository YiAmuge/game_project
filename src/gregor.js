import { distance,direction } from './geometry.js';

export const GREGOR={range:6,halfWidth:1.2,pullDamage:250,knock:6,collisionDamage:120,collisionStun:1.5};

export function cast(g,e,slot,d,onChampionHit=()=>{}){
 if(slot==='q'){
  for(const t of [...g.units])if(g.hostile(e,t)&&g.clearLine(e,t)){
   const dx=t.x-e.x,dy=t.y-e.y,along=dx*d.x+dy*d.y,side=Math.abs(dy*d.x-dx*d.y);
   if(Math.hypot(Math.max(0,-along,along-GREGOR.range),Math.max(0,side-GREGOR.halfWidth))>t.radius)continue;
   g.deal(e,t,GREGOR.pullDamage);
   const front=e.radius+t.radius+.15;
   if(g.startMotion(t,direction(t,e),Math.max(0,distance(t,e)-front),{kind:'knock',source:e,follow:e,stopDistance:front,speed:12,forcedMaxSpeed:12})){e.state.gregorPulls??=[];e.state.gregorPulls.push(t.id);}
  }
  g.effects.push({type:'gregorPierce',x:e.x,y:e.y,angle:Math.atan2(d.y,d.x),r:GREGOR.range,width:GREGOR.halfWidth,theme:'gregor',life:.4,maxLife:.4});
 }else{
  // The two swings share one displacement and collision bonus per target.
  const knocked=new Set();
  for(let i=0;i<2;i++)g.schedule(e,i*.35,()=>{
   g.cone(e,d,7,3.6,270,t=>{
    if(t.kind==='champion')onChampionHit();
    if(knocked.has(t.id))return;
    if(g.startMotion(t,d,GREGOR.knock,{kind:'knock',source:e,onCollision:collision=>{
     if(!['terrain','structure'].includes(collision.kind)||!t.alive)return;
     g.deal(e,t,GREGOR.collisionDamage);if(t.alive)g.status(t,'stun',1,GREGOR.collisionStun,e);
     g.effects.push({type:'burst',x:t.x,y:t.y,r:1.2,theme:'gregor',life:.45,maxLife:.45});
    }}))knocked.add(t.id);
   });g.heal(e,e,250);
  });
 }
 return true;
}
