// Death ghosts are presentation-only snapshots, never simulation entities.
export function captureDissolve(g,e){
 const unit={...e,state:{...e.state},buffs:{...e.buffs},visuals:{},status:{},alive:true,motion:null,shields:[],naturalHealing:false,arayashikiWeapon:e.key==='ryoshu'&&Boolean(g.zones.find(z=>z.kind==='arayashiki'&&z.source===e&&!z.posthumous)),attackAt:-99,castAt:-99,hitFlashUntil:0};
 g.effects.push({type:'arayashikiDissolve',x:e.x,y:e.y,unit,life:1.25,maxLife:1.25});
}
export function dissolveProgress(f){const t=Math.max(0,Math.min(1,1-f.life/f.maxLife));return {white:Math.min(1,t/.55),alpha:t<.55?1:Math.max(0,(1-t)/.45),glow:Math.sin(Math.PI*t)};}
export function drawDissolve(r,g,f){
 if(!g.visibleTo(g.player.team,f.unit))return;
 const c=r.ctx,e=f.unit,{white,alpha,glow}=dissolveProgress(f),presentation=Object.create(g);presentation.bushAt=()=>null;const draw=()=>['tower','core'].includes(e.kind)?r.structure(e,presentation):r.unit(e,presentation);
 c.save();const halo=c.createRadialGradient(e.x,e.y-1,0,e.x,e.y-1,2.8);halo.addColorStop(0,`rgba(255,255,255,${glow*.7})`);halo.addColorStop(.35,`rgba(240,247,255,${glow*.28})`);halo.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=halo;c.fillRect(e.x-2.8,e.y-3.8,5.6,5.6);
 c.globalAlpha*=alpha;draw();c.globalAlpha*=white;c.filter='brightness(0) invert(1)';c.shadowColor='#ffffff';c.shadowBlur=24*glow;draw();c.restore();
}

const noise=n=>{const v=Math.sin(n*91.73)*43758.5453;return v-Math.floor(v);};
// Deterministic per strike: render frames never consume the combat RNG.
export function arayashikiCuts(f){return Array.from({length:9},(_,i)=>{const seed=f.seed+i*19,angle=noise(seed)*Math.PI*2,offset=(noise(seed+2)-.5)*f.r*1.5,half=Math.sqrt(Math.max(0,f.r*f.r-offset*offset))*(.6+.35*noise(seed+3)),bend=(noise(seed+7)-.5)*.55;return {angle,offset,half,bend,delay:noise(seed+11)*.07};});}
export function drawArayashikiCuts(c,camera,g){
 for(const f of g.effects){
  if(f.type!=='arayashikiCuts'||f.life<=0||!g.visibleTo(g.player.team,f))continue;
  const origin=camera.worldToScreen(f,.12),x=camera.worldToScreen({x:f.x+1,y:f.y},.12),y=camera.worldToScreen({x:f.x,y:f.y+1},.12),age=f.maxLife-f.life;
  c.save();c.translate(origin.x,origin.y);c.transform(x.x-origin.x,x.y-origin.y,y.x-origin.x,y.y-origin.y,0,0);
  c.beginPath();c.arc(0,0,f.r,0,Math.PI*2);c.clip();c.lineCap='round';
  for(const cut of arayashikiCuts(f)){
   const t=(age-cut.delay)/.18;if(t<0||t>1)continue;const alpha=Math.sin(Math.PI*t)**.55,reveal=Math.min(1,t*6),end=-cut.half+2*cut.half*reveal;
   c.save();c.rotate(cut.angle);c.translate(0,cut.offset);c.globalAlpha=alpha;c.shadowColor='#ffffff';c.shadowBlur=18;
   // A curved, tapered blade flash: needle tips, broad belly and razor edge.
   const belly=.18+.10*noise(f.seed+cut.angle*71),curve=-.38-cut.bend*.6,mid=(-cut.half+end)/2;
   const ribbon=(width,color)=>{c.beginPath();c.moveTo(-cut.half,cut.bend);c.quadraticCurveTo(mid,curve-width,end,0);c.quadraticCurveTo(mid,curve+width,-cut.half,cut.bend);c.closePath();c.fillStyle=color;c.fill();};
   c.globalAlpha=alpha*.26;ribbon(belly*1.8,'#dce9ff');c.globalAlpha=alpha;ribbon(belly,'#c7d5e5');ribbon(belly*.55,'#ffffff');
   c.beginPath();c.moveTo(-cut.half,cut.bend);c.quadraticCurveTo(mid,curve-belly*.38,end,0);c.strokeStyle='#ffffff';c.lineWidth=.022;c.stroke();
   // Short secondary arc suggests blade travel, without a flame or explosion.
   c.globalAlpha=alpha*.38;c.shadowBlur=7;c.beginPath();c.moveTo(-cut.half*.72,cut.bend+.15);c.quadraticCurveTo(mid,curve+.28,end*.83,.18);c.strokeStyle='#e5efff';c.lineWidth=.025;c.stroke();
   c.restore();
  }c.restore();
 }
}
