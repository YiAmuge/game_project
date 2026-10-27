import{NEEDLE_FRAMES}from'./needle-sprites.js';
import{loadAtlas}from'./art.js';
export const needleHeight=e=>e.camp==='sewingKing'?4.2:1.45;
export function needlePresentation(g,e){
 const attacking=!e.returning&&e.swingUntil>g.time,key=(e.camp==='sewingKing'?'sewingKing':e.needleColor==='red'?'needleRed':'needleGreen')+(attacking?'Attack':'Idle'),f=NEEDLE_FRAMES[key],h=needleHeight(e)*f.heightScale,w=h*f.w/f.h;
 return{key,f,h,w,left:-w*f.foot[0],top:-h*f.foot[1],attacking};
}
export const needleVisualHeight=e=>{const f=NEEDLE_FRAMES[e.camp==='sewingKing'?'sewingKingIdle':'needleGreenIdle'];return needleHeight(e)*f.heightScale*f.foot[1];};
export function drawNeedle(r,e,g){if(!['needle','sewingKing'].includes(e.camp))return false;const a=loadAtlas(13);if(!a.complete||!a.naturalWidth)return true;const p=needlePresentation(g,e),c=r.ctx,f=p.f;c.save();c.translate(e.x,e.y);if(e.summonedNeedle&&e.invulnerableUntil>g.time)c.globalAlpha*=.45;c.imageSmoothingEnabled=false;c.drawImage(a,f.x,f.y,f.w,f.h,p.left,p.top,p.w,p.h);c.restore();return true;}
