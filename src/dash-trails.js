import { renderAnchor,leapLift,leapOpacity } from './projection-25d.js';
import { combatStyle } from './combat-style.js';
import { FRAMES } from './art.js';
import { ego } from './sora.js';
import { form } from './yan.js';
import { drawRibbon } from './weapon-trails.js';

export const DASH_TRAIL_FRAMES=5,DASH_TRAIL_FADE=.18;
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
   const m=e.motion,active=e.alive&&m&&!m.forced&&['dash','leap'].includes(m.kind),segment=e.key==='starbuck'&&m?.kind==='leap'?(m.elapsed/(m.minDuration||.7)<.5?0:1):0;
   let h=this.histories.get(e);
   if(active){
    if(!h||h.motion!==m||h.segment!==segment){h={motion:m,segment,samples:[],at:-Infinity};this.histories.set(e,h);}
    if(g.time>h.at){const p=renderAnchor(e);h.samples.push({x:p.x,y:p.y,height:leapLift(e),opacity:leapOpacity(e),time:g.time,facing:e.facing||0,visual:ego(g,e)?'soraEgo':form(g,e),large:g.buff(e,'mutant')?1.15:form(g,e)==='yanDistorted'?1.1:1});if(h.samples.length>DASH_TRAIL_FRAMES)h.samples.shift();h.at=g.time;}
   }else if(h&&(!e.alive||g.time-h.at>=DASH_TRAIL_FADE))this.histories.delete(e);
  }
 }
 draw(c,camera,e,g,renderer,vfx){
  const h=this.histories.get(e);if(!h||h.samples.length<2)return;
  const fade=Math.max(0,1-(g.time-h.at)/DASH_TRAIL_FADE),color=combatStyle(e.key,g,e).color;
  drawRibbon(c,dashSections(h.samples,g.time,camera),color);
  for(let i=0;i<h.samples.length-1;i++){
   const p=h.samples[i],f=FRAMES[p.visual],atlas=renderer.atlasFor(p.visual);if(!f||!atlas.complete||!atlas.naturalWidth)continue;
   const t=(i+1)/h.samples.length,scale=.38+.62*t,height=(p.visual==='soraEgo'?2.22:2.1)*p.large*camera.scale*scale,width=height*f.w/f.h,at=camera.worldToScreen(p,.075);
   c.save();c.globalAlpha=.28*t**1.5*fade*(p.opacity??1);c.translate(at.x,at.y-p.height*camera.scale);if((Math.cos(p.facing)<0)!==Boolean(f.mirror))c.scale(-1,1);
   c.drawImage(vfx.tintFrame(atlas,f,color),-width/2,-height,width,height);c.restore();
  }
 }
}
