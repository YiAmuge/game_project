import { renderAnchor,leapLift,leapOpacity } from './projection-25d.js';
import { combatStyle } from './combat-style.js';
import { FRAMES,visualForm,spriteHeight } from './art.js';
import { drawRibbon } from './weapon-trails.js';

export const DASH_TRAIL_FRAMES=5,DASH_TRAIL_FADE=.18;
export function dashAppearance(g,e){
 const enhanced=['ryoshu','sinclair'].includes(e.key)&&e.visualCast?.slot==='q'&&e.motion?.actionKind==='skill';
 return enhanced?{color:e.key==='ryoshu'?'#c3424a':'#b2dc70',opacity:.52,ribbon:1.7,wind:true}:{color:combatStyle(e.key,g,e).color,opacity:.28,ribbon:1,wind:false};
}
export function teleportSamples(g,e){
 const blink=e.state?.ahabTeleportTrail,age=blink?g.time-blink.at:Infinity;
 if(!e.alive||e.key!=='ahab'||age<0||age>=DASH_TRAIL_FADE)return null;
 return Array.from({length:DASH_TRAIL_FRAMES},(_,i)=>{const t=i/(DASH_TRAIL_FRAMES-1);return {x:blink.from.x+(blink.to.x-blink.from.x)*t,y:blink.from.y+(blink.to.y-blink.from.y)*t,height:0,opacity:1,time:blink.at,facing:blink.facing||0,visual:visualForm(g,e)};});
}
export function dashSections(samples,time,camera){
 if(samples.length<2)return [];
 const fade=Math.max(0,1-(time-samples.at(-1).time)/DASH_TRAIL_FADE);
 return samples.map((p,i)=>{
  const at=camera.worldToScreen(p,.075),center={x:at.x,y:at.y-(p.height+.85)*camera.scale},t=i/(samples.length-1),width=t**.85;
  const before=samples[Math.max(0,i-1)],after=samples[Math.min(samples.length-1,i+1)],a=camera.worldToScreen(before,before.height+.85),b=camera.worldToScreen(after,after.height+.85),dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1,w=.48*camera.scale*width;
  return {center,inner:{x:center.x-dy/n*w,y:center.y+dx/n*w},outer:{x:center.x+dy/n*w,y:center.y-dx/n*w},width,alpha:.32*t**1.5*fade*(p.opacity??1)};
 });
}
export class DashTrails {
 constructor(){this.histories=new WeakMap();}
 sync(g){
  if(this.game!==g||g.time<(this.time||0)){this.histories=new WeakMap();this.game=g;}this.time=g.time;
  for(const e of g.champions()){
   const blink=teleportSamples(g,e);if(blink){this.histories.set(e,{motion:e.state.ahabTeleportTrail,samples:blink,at:e.state.ahabTeleportTrail.at});continue;}
   const m=e.motion,active=e.alive&&m&&!m.forced&&['dash','leap'].includes(m.kind),segment=e.key==='starbuck'&&m?.kind==='leap'?(m.elapsed/(m.minDuration||.7)<.5?0:1):0;
   let h=this.histories.get(e);
   if(active){
    if(!h||h.motion!==m||h.segment!==segment){h={motion:m,segment,appearance:dashAppearance(g,e),samples:[],at:-Infinity};this.histories.set(e,h);}
    if(g.time>h.at){const p=renderAnchor(e);h.samples.push({x:p.x,y:p.y,height:leapLift(e),opacity:leapOpacity(e),time:g.time,facing:e.facing||0,visual:visualForm(g,e)});if(h.samples.length>DASH_TRAIL_FRAMES)h.samples.shift();h.at=g.time;}
   }else if(h&&(!e.alive||g.time-h.at>=DASH_TRAIL_FADE))this.histories.delete(e);
  }
 }
 draw(c,camera,e,g,renderer,vfx){
  const h=this.histories.get(e);if(!h||h.samples.length<2)return;
  const fade=Math.max(0,1-(g.time-h.at)/DASH_TRAIL_FADE),look=h.appearance||dashAppearance(g,e),color=look.color;
  drawRibbon(c,dashSections(h.samples,g.time,camera).map(s=>({...s,alpha:Math.min(.8,s.alpha*look.ribbon)})),color);
  for(let i=0;i<h.samples.length-1;i++){
   const p=h.samples[i],f=FRAMES[p.visual],atlas=renderer.atlasFor(p.visual);if(!f||!atlas.complete||!atlas.naturalWidth)continue;
   const t=(i+1)/h.samples.length,scale=.38+.62*t,height=spriteHeight(p.visual)*camera.scale*scale,width=height*f.w/f.h,at=camera.worldToScreen(p,.075);
   c.save();c.globalAlpha=look.opacity*t**1.5*fade*(p.opacity??1);c.translate(at.x,at.y-p.height*camera.scale);if((Math.cos(p.facing)<0)!==Boolean(f.mirror))c.scale(-1,1);
   c.drawImage(vfx.tintFrame(atlas,f,color),-width*(f.foot?.[0]??.5),-height*(f.foot?.[1]??1),width,height);c.restore();
  }
  if(look.wind&&e.motion===h.motion&&!e.motion.forced)this.wind(c,camera,e,g);
 }
 wind(c,camera,e,g){
  const m=e.motion,front={x:e.x+m.dx*.65,y:e.y+m.dy*.65},at=camera.worldToScreen(front,.95+leapLift(e)),next=camera.worldToScreen({x:front.x+m.dx,y:front.y+m.dy},.95+leapLift(e));
  c.save();c.translate(at.x,at.y);c.rotate(Math.atan2(next.y-at.y,next.x-at.x));c.scale(camera.scale,camera.scale);c.strokeStyle='#eaf5ec';c.lineWidth=.018;c.lineCap='round';
  for(let i=0;i<2;i++){c.globalAlpha=(.21+.03*Math.sin(g.time*25))*(1-i*.45);c.beginPath();c.moveTo(-.10-i*.16,-.43);c.quadraticCurveTo(.28-i*.16,0,-.10-i*.16,.43);c.stroke();}
  c.globalAlpha=.13;for(const y of [-.27,0,.27]){c.beginPath();c.moveTo(-.5,y);c.lineTo(-.19,y*.85);c.stroke();}c.restore();
 }
}
