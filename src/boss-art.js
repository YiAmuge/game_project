import{BOSS_FRAMES}from'./boss-sprites.js';
import{loadAtlas}from'./art.js';
export const BOSS_HEIGHT=3.8*1.3;
export function bossPresentation(g,e){
 const key=e.swingUntil>g.time?'heapedAttack':'heapedIdle',f=BOSS_FRAMES[key],h=BOSS_HEIGHT*f.heightScale,w=h*f.w/f.h;
 return{key,f,h,w,left:-w*f.foot[0],top:-h*f.foot[1]};
}
export const bossVisualHeight=e=>{const f=BOSS_FRAMES.heapedIdle;return BOSS_HEIGHT*f.heightScale*f.foot[1];};
export function drawBoss(r,e,g){
 if(e.camp!=='boss')return false;const a=loadAtlas(14);if(!a.complete||!a.naturalWidth)return true;
 const p=bossPresentation(g,e),c=r.ctx,f=p.f;c.save();c.translate(e.x,e.y);c.imageSmoothingEnabled=false;c.drawImage(a,f.x,f.y,f.w,f.h,p.left,p.top,p.w,p.h);c.restore();return true;
}
