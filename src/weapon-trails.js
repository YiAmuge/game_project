// Rendering-only history. Positions remain in world/local units, never pixels.
export const TRAIL_FRAMES=5;
export const TRAIL_FADE=.12;

export class MotionTrails {
  constructor(){this.owners=new WeakMap();}
  sample(owner,part,{time,key,active,anchor,inner,outer}){
    let tracks=this.owners.get(owner),history=tracks?.get(part);
    if(history&&(history.key!==key||time<history.at||active&&Math.hypot(anchor.x-history.anchor.x,anchor.y-history.anchor.y)>3)){
      tracks.delete(part);history=null;
    }
    if(active){
      if(!tracks){tracks=new Map();this.owners.set(owner,tracks);}
      if(!history){history={key,at:-Infinity,anchor,samples:[]};tracks.set(part,history);}
      if(time>history.at){
        if(time-history.at>.3)history.samples.length=0;
        history.samples.push({time,anchor:{...anchor},inner:{...inner},outer:{...outer}});
        if(history.samples.length>TRAIL_FRAMES)history.samples.shift();
        history.at=time;history.anchor={...anchor};
      }
    }
    if(history&&time-history.at>=TRAIL_FADE){tracks.delete(part);history=null;}
    return history?.samples||[];
  }
}

// Oldest section collapses to a transparent point; the newest spans the blade.
export function ribbonSections(samples,time,project){
  if(samples.length<2)return [];
  const fade=Math.max(0,1-(time-samples.at(-1).time)/TRAIL_FADE);
  if(!fade)return [];
  return samples.map((s,i)=>{
    const {inner,outer}=project(s),t=i/(samples.length-1),width=t**.85;
    const center={x:(inner.x+outer.x)/2,y:(inner.y+outer.y)/2},dx=(outer.x-inner.x)*width/2,dy=(outer.y-inner.y)*width/2;
    return {inner:{x:center.x-dx,y:center.y-dy},outer:{x:center.x+dx,y:center.y+dy},center,width,alpha:.52*t**1.5*fade};
  });
}

export function drawRibbon(ctx,sections,color){
  if(sections.length<2)return;
  const hex=color.slice(1),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)).join(',');
  ctx.save();
  for(let i=1;i<sections.length;i++){
    const a=sections[i-1],b=sections[i];
    if(Math.hypot(b.center.x-a.center.x,b.center.y-a.center.y)<1e-6)continue;
    const shade=ctx.createLinearGradient(a.center.x,a.center.y,b.center.x,b.center.y);
    shade.addColorStop(0,`rgba(${rgb},${a.alpha})`);shade.addColorStop(1,`rgba(${rgb},${b.alpha})`);
    ctx.beginPath();ctx.moveTo(a.inner.x,a.inner.y);ctx.lineTo(b.inner.x,b.inner.y);
    ctx.lineTo(b.outer.x,b.outer.y);ctx.lineTo(a.outer.x,a.outer.y);ctx.closePath();ctx.fillStyle=shade;ctx.fill();
  }
  ctx.restore();
}

// Captures the actual weapon drawing matrix, including dual claws and scaling.
export function captureBlade(matrix,dpr,scale,origin,inner,outer){
  const point=p=>({x:((matrix.a*p.x+matrix.c*p.y+matrix.e)/dpr-origin.x)/scale,y:((matrix.b*p.x+matrix.d*p.y+matrix.f)/dpr-origin.y)/scale});
  return {inner:point(inner),outer:point(outer)};
}

export function projectBlade(sample,project,scale){
  const p=project(sample.anchor),point=v=>({x:p.x+v.x*scale,y:p.y+v.y*scale});
  return {inner:point(sample.inner),outer:point(sample.outer)};
}
