import{rooftopImages}from'./rooftop.js';

export const BRIEFING_LINES=['985.06.██.','N.Corp, █████ Megatalls'];
export function loadBriefingFont(){return typeof document!=='undefined'&&document.fonts?.load?document.fonts.load('700 32px "City Tactical"').catch(()=>[]):Promise.resolve([]);}
const clamp=n=>Math.max(0,Math.min(1,n));
const noise=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
export const briefingOpacity=t=>{const n=clamp((t-.55)/.95);return 1-n*n*(3-2*n);};
export const blackRevealOpacity=t=>{const n=clamp(t/.3);return 1-n*n*(3-2*n);};
export function drawBlackReveal(c,camera,elapsed){const alpha=blackRevealOpacity(elapsed);if(alpha<=0)return;c.save();c.globalAlpha=alpha;c.fillStyle='#000';c.fillRect(0,0,camera.width,camera.height);c.restore();}

// World-anchored rain continues through the introduction, camera travel and play.
// Sampling nearby grid cells keeps the cost independent of the battlefield size.
export function rainParticles(camera,time){
 const b=camera.bounds,particles=[],cell=3;
 for(let iy=Math.floor((b.y-3)/cell);iy<=Math.ceil((b.y+b.h+12)/cell);iy++)for(let ix=Math.floor((b.x-3)/cell);ix<=Math.ceil((b.x+b.w+3)/cell);ix++)for(let j=0;j<2;j++){
  const seed=ix*137+iy*971+j*65537,phase=(time*(.65+noise(seed+3)*.3)+noise(seed+4))%1,height=(1-phase)*7;
  const ground={x:(ix+noise(seed))*cell-phase*.42,y:(iy+noise(seed+1))*cell},from=camera.worldToScreen(ground,height),to=camera.worldToScreen({x:ground.x+.035,y:ground.y+.035},Math.max(0,height-.38-noise(seed+5)*.38));
  if(from.x< -20||from.x>camera.width+20||from.y< -60||from.y>camera.height+60)continue;
  particles.push({from,to,ground,phase,layer:j,width:.65+noise(seed+6)*.4});
 }return particles;
}
export function drawRain(c,camera,g,time){
 if(g.training)return;
 const drops=rainParticles(camera,time);c.save();c.lineCap='round';
 for(let layer=0;layer<2;layer++){c.beginPath();c.strokeStyle=layer?'#507b955c':'#102d49a6';c.lineWidth=layer?.85:1.1;
  for(const d of drops)if(d.layer===layer){c.moveTo(d.from.x,d.from.y);c.lineTo(d.to.x,d.to.y);}c.stroke();
 }
 c.strokeStyle='#3a718348';c.lineWidth=.7;c.beginPath();for(const d of drops)if(d.phase>.94){const p=camera.worldToScreen(d.ground,.025),r=(d.phase-.94)*camera.scale*.7;c.moveTo(p.x+r,p.y);c.ellipse(p.x,p.y,r,r*.4,0,0,Math.PI*2);}c.stroke();c.restore();
}
export function drawBriefing(c,camera,elapsed){
 const alpha=briefingOpacity(elapsed);if(alpha<=0)return;
 const {width:w,height:h}=camera,smoke=rooftopImages().smoke;c.save();c.globalAlpha=alpha;c.fillStyle='#07131f';c.fillRect(0,0,w,h);
 // Broad, slow billows dissolve along with the dark backdrop.
 const drift=elapsed*22;
 for(let i=0;i<7;i++){const x=w*(i/5-.1)+Math.sin(i*2.3+elapsed*.5)*w*.08,y=h*(.3+noise(i)*.55),r=Math.max(w,h)*(.28+noise(i+20)*.18),fog=c.createRadialGradient(x+drift,y,0,x+drift,y,r);fog.addColorStop(0,'#20465b70');fog.addColorStop(.5,'#142f4328');fog.addColorStop(1,'#07131f00');c.fillStyle=fog;c.fillRect(0,0,w,h);}
 if(smoke?.complete&&smoke.naturalWidth){c.globalAlpha=alpha*.18;c.drawImage(smoke,-w*.1+drift,-h*.2,w*1.3,h*1.45);c.globalAlpha=alpha*.11;c.drawImage(smoke,-w*.2-drift,h*.05,w*1.5,h*1.1);}
 c.globalAlpha=alpha;c.fillStyle=c.strokeStyle='#c7cbd0';c.textAlign='left';c.textBaseline='alphabetic';const size=Math.max(17,Math.min(34,w*.024)),x=Math.max(24,w*.055),y=h-Math.max(100,h*.18);c.font=`700 ${size}px "City Tactical", "Arial Narrow", sans-serif`;c.letterSpacing='1.3px';c.lineWidth=size*.018;
 for(let i=0;i<BRIEFING_LINES.length;i++){c.strokeText(BRIEFING_LINES[i],x,y+i*size*1.55,w-x*2);c.fillText(BRIEFING_LINES[i],x,y+i*size*1.55,w-x*2);}c.restore();
}
