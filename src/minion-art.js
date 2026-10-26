import{MINION_FRAMES}from'./minion-sprites.js';
import{loadAtlas}from'./art.js';
export const MINION_ART={championHeight:2.1,regularScale:.83,siegeScale:.90,attackDuration:.28};
export const minionHeight=e=>MINION_ART.championHeight*(e.siege?MINION_ART.siegeScale:MINION_ART.regularScale);
export function minionPresentation(g,e){
 const family=e.faction||g.minionFactions?.[e.team]||(e.team?'suit':'uniform'),color=e.team?'red':'blue',role=e.siege?'siege':e.ranged?'ranged':'melee',attacking=e.attackUntil>g.time,pose=attacking?'attack':'idle',key=[family,color,role,pose].join('_'),f=MINION_FRAMES[key];
 const h=minionHeight(e)*f.heightScale,w=h*f.w/f.h,flip=(Math.cos(e.facing??(e.team?Math.PI:0))<0)!==f.facesLeft;
 return{key,f,h,w,left:-w*f.foot[0],top:-h*f.foot[1],flip,attacking};
}
export function drawMinion(r,e,g){
 const a=loadAtlas(12);if(!a.complete||!a.naturalWidth)return;
 const p=minionPresentation(g,e),{f}=p,c=r.ctx;c.save();c.translate(e.x,e.y);if(p.flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(a,f.x,f.y,f.w,f.h,p.left,p.top,p.w,p.h);c.restore();
}
