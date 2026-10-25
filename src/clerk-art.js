import {FRAMES,loadAtlas} from './art.js';
export const CLERK_HEIGHT=2.4;
export const CLERK_ART={
 amplify:{idle:'leRougeIdle',attack:'leRougeAttack',weapon:'leRougeBlade',size:1.55,axis:'width',idleAngle:-.10},
 blessing:{idle:'leNoirIdle',attack:'leNoirAttack',weapon:'leNoirCase',size:.70,axis:'height',idleAngle:0},
};
export const isClerk=e=>e.kind==='neutral'&&Boolean(CLERK_ART[e.camp]);
export function clerkPresentation(g,e){
 const spec=CLERK_ART[e.camp];if(!spec)return null;
 const striking=!e.returning&&!e.pattern&&e.swingUntil>g.time,key=striking?spec.attack:spec.idle,f=FRAMES[key],weapon=FRAMES[spec.weapon],h=CLERK_HEIGHT*f.heightScale,w=h*f.w/f.h,left=-w*f.foot[0],top=-h*f.foot[1];
 const t=striking?Math.max(0,Math.min(1,(g.time-e.swingAt)/.28)):0,progress=1-(1-t)**3;
 const angle=striking?(e.camp==='amplify'?-.90+1.20*progress:-1.55+.45*progress):spec.idleAngle;
 return{key,f,weaponKey:spec.weapon,weapon,h,w,left,top,striking,hand:{x:left+f.hand[0]*h/f.h,y:top+f.hand[1]*h/f.h},weaponScale:spec.size/(spec.axis==='width'?weapon.w:weapon.h),angle:angle-weapon.forwardAngle};
}
export function drawClerk(r,e,g){
 if(!isClerk(e))return false;
 const pose=clerkPresentation(g,e),a=loadAtlas(11);if(!a.complete||!a.naturalWidth)return false;
 const c=r.ctx,{f,weapon,hand,weaponScale:k}=pose;
 c.save();c.translate(e.x,e.y);if(Math.cos(e.facing||0)<0)c.scale(-1,1);c.imageSmoothingEnabled=false;
 // The exact handle pivot is attached to this pose's gloved hand. Drawing the
 // body last lets the original glove cover the handle naturally.
 c.save();c.translate(hand.x,hand.y);c.rotate(pose.angle);c.drawImage(a,weapon.x,weapon.y,weapon.w,weapon.h,-weapon.grip[0]*k,-weapon.grip[1]*k,weapon.w*k,weapon.h*k);c.restore();
 c.drawImage(a,f.x,f.y,f.w,f.h,pose.left,pose.top,pose.w,pose.h);c.restore();return true;
}
