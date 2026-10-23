import { noise,organicPixels } from './organic-particles.js';

// Original grayscale brushwork inspired by the reference silhouettes only.
// No reference pixels, colors, lettering or watermarks are used.
export class AttackStrokes {
 constructor(){this.masks=new Map();this.tints=new Map();}
 mask(kind,variant=0){
  const key=kind+'/'+variant;if(this.masks.has(key))return this.masks.get(key);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;
  const c=canvas.getContext('2d'),white=(a=1)=>`rgba(255,255,255,${a})`;
  c.lineCap='round';c.lineJoin='round';
  if(kind==='slash'){
   // Several curved, feathered blades share one sweep; both ends taper away.
   for(let layer=0;layer<8;layer++){
    const radius=68+layer*3,offset=layer*.06,width=layer===0?19:3+noise(layer,variant,4)*7,points=[];
    for(let i=0;i<=64;i++){
     const t=i/64,a=-1.35+t*2.7+offset,w=Math.sin(Math.PI*t)**1.5*width*(.65+noise(t*8,layer+variant,8)*.6),r=radius+(noise(t*12,layer,variant+3)-.5)*3;
     points.push({a,r,w});
    }
    c.beginPath();points.forEach((p,i)=>{const x=118+Math.cos(p.a)*p.r,y=96+Math.sin(p.a)*p.r*.9;i?c.lineTo(x,y):c.moveTo(x,y);});
    for(const p of [...points].reverse())c.lineTo(118+Math.cos(p.a)*(p.r-p.w),96+Math.sin(p.a)*(p.r-p.w)*.9);
    c.closePath();const fill=c.createLinearGradient(120,18,218,165);fill.addColorStop(0,white(.02));fill.addColorStop(.4,white(layer===0?.85:.3));fill.addColorStop(.8,white(1));fill.addColorStop(1,white(.15));c.fillStyle=fill;c.fill();
   }
   for(let i=0;i<50;i++){
    const a=-1.25+noise(i,variant,3)*2.5,r=72+noise(i,variant,7)*24,len=6+noise(i,variant,11)*36;
    c.beginPath();c.moveTo(118+Math.cos(a)*r,96+Math.sin(a)*r*.9);c.quadraticCurveTo(118+Math.cos(a-.2)*(r+4),96+Math.sin(a-.2)*r*.9,118+Math.cos(a-.4)*(r-len*.18),96+Math.sin(a-.4)*(r-len)*.9);
    c.strokeStyle=white(.15+noise(i,variant,5)*.4);c.lineWidth=.35+noise(i,variant,13);c.stroke();
   }
  }else if(kind==='pierce'){
   // A dense nose and axial spine peel into asymmetric, flowing filaments.

   for(let layer=0;layer<16;layer++){
    const side=layer%2?1:-1,spread=8+noise(layer,variant,3)*24,end=208+noise(layer,variant,8)*28,start=8+noise(layer,variant,5)*70;
    c.beginPath();c.moveTo(start,96+side*spread*.5);c.bezierCurveTo(95,96+side*spread*1.8,170,96+side*spread*.4,end,96);
    c.bezierCurveTo(170,96+side*spread*.1,95,96+side*spread*.5,start,96+side*spread*.5);c.closePath();
    const grad=c.createLinearGradient(start,96,end,96);grad.addColorStop(0,white(0));grad.addColorStop(.6,white(.35));grad.addColorStop(.9,white(.8));grad.addColorStop(1,white(.02));c.fillStyle=grad;c.fill();
   }
   const core=c.createLinearGradient(18,96,242,96);core.addColorStop(0,white(0));core.addColorStop(.75,white(.95));core.addColorStop(1,white(0));
   c.strokeStyle=core;c.lineWidth=2;c.beginPath();c.moveTo(18,96);c.bezierCurveTo(90,94,175,98,242,96);c.stroke();
   for(let i=0;i<14;i++){const x=135+noise(i,variant,4)*75,y=96+(noise(i,variant,7)-.5)*62;
    c.strokeStyle=white(.15+noise(i,variant,10)*.45);c.lineWidth=.5;c.beginPath();c.moveTo(x-40,y);c.quadraticCurveTo(x,y+8,x+16,y*.15+81);c.stroke();}
  }else{
   // A broken hollow pressure front, with dozens of fine outward brush spikes.
   const contour=[];
   for(let i=0;i<=160;i++){const a=i*Math.PI/80,r=49+(noise(i*.7,variant,2)-.5)*12,spike=noise(i,variant,6)**5*32;contour.push({a,inner:r,outer:r+10+spike});}
   c.beginPath();contour.forEach((p,i)=>{const x=128+Math.cos(p.a)*p.outer*1.25,y=96+Math.sin(p.a)*p.outer;i?c.lineTo(x,y):c.moveTo(x,y);});
   for(const p of [...contour].reverse())c.lineTo(128+Math.cos(p.a)*p.inner*1.25,96+Math.sin(p.a)*p.inner);c.closePath();
   const glow=c.createRadialGradient(128,96,32,128,96,90);glow.addColorStop(0,white(.05));glow.addColorStop(.45,white(.9));glow.addColorStop(.7,white(.7));glow.addColorStop(1,white(0));c.fillStyle=glow;c.fill();
   for(let i=0;i<115;i++){
    const a=i*2.399+variant*.4,start=43+noise(i,variant,3)*15,len=7+noise(i,variant,5)**2*42;
    const grad=c.createLinearGradient(128+Math.cos(a)*start,96+Math.sin(a)*start,128+Math.cos(a)*(start+len),96+Math.sin(a)*(start+len));grad.addColorStop(0,white(.8));grad.addColorStop(1,white(0));
    c.strokeStyle=grad;c.lineWidth=.3+noise(i,variant,7)*1.4;c.beginPath();c.moveTo(128+Math.cos(a)*start*1.25,96+Math.sin(a)*start);c.lineTo(128+Math.cos(a+.02)*(start+len)*1.25,96+Math.sin(a+.02)*(start+len));c.stroke();
   }
  }
  this.masks.set(key,canvas);return canvas;
 }
 texture(kind,e){
  const variant=Math.floor((e.x+e.y+e.born)*13)&1,key=[kind,variant,e.color].join('/');
  if(this.tints.has(key)){const hit=this.tints.get(key);this.tints.delete(key);this.tints.set(key,hit);return hit;}
  if(this.tints.size>=64)this.tints.delete(this.tints.keys().next().value);
  const mask=this.mask(kind,variant),canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;
  const c=canvas.getContext('2d');c.drawImage(mask,0,0);c.globalCompositeOperation='source-in';c.fillStyle=e.color;c.fillRect(0,0,256,192);this.tints.set(key,canvas);return canvas;
 }
 draw(ctx,camera,e,time){
  const age=time-e.born,duration=e.kind==='explosion'?.48:e.kind==='shot'?.18:.34;if(age<0||age>duration)return;
  const kind=e.kind==='slash'?'slash':['pierce','shot'].includes(e.kind)?'pierce':'impact',t=age/duration,ease=1-Math.exp(-t*7),radius=e.kind==='explosion'?e.radius:e.kind==='impact'?.8+ease*1.2:e.radius;
  const origin=camera.worldToScreen(e,.16),x=camera.worldToScreen({x:e.x+1,y:e.y},.16),y=camera.worldToScreen({x:e.x,y:e.y+1},.16);
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=(1-t)**1.25*(e.kind==='explosion'?.22:.55);
  ctx.translate(origin.x,origin.y);ctx.transform(x.x-origin.x,x.y-origin.y,y.x-origin.x,y.y-origin.y,0,0);
  ctx.rotate(e.angle+(kind==='slash'?(ease-.5)*.8:0));
  if(kind==='pierce'){
   const reach=(e.kind==='shot'?1.5:radius)*(.35+ease*.65),width=e.kind==='shot'?.75:Math.min(2.2,Math.max(1.1,radius*.45));
   ctx.drawImage(this.texture(kind,e),0,-width/2,reach,width);
  }else{
   if(kind==='impact'&&e.shape?.kind==='rect')ctx.translate(e.shape.range*.6,0);
   const r=Math.min(e.shape?.kind==='rect'?e.shape.width*.7:Infinity,radius*(kind==='impact'?.3+ease*.7:1));ctx.drawImage(this.texture(kind,e),-r,-r*.8,r*2,r*1.6);
  }
  ctx.restore();
 }
}
