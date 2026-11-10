import{GAHWAN}from'./gahwan.js';

function ground(c,camera,p,draw){
 const o=camera.worldToScreen(p,.12),x=camera.worldToScreen({x:p.x+1,y:p.y},.12),y=camera.worldToScreen({x:p.x,y:p.y+1},.12);
 c.save();c.translate(o.x,o.y);c.transform(x.x-o.x,x.y-o.y,y.x-o.x,y.y-o.y,0,0);draw();c.restore();
}
function sector(c,r){c.beginPath();c.moveTo(0,0);c.arc(0,0,r,-Math.PI/2,Math.PI/2);c.closePath();}
export function drawGahwanEffects(c,camera,g){
 for(const e of g.champions())if(e.key==='gahwan'&&e.alive&&e.state.gahwanR&&g.visibleTo(g.player.team,e)&&!g.hidden(e)){
  const r=e.state.gahwanR,progress=Math.min(1,(g.time-r.at)/GAHWAN.charge);
  ground(c,camera,e,()=>{c.rotate(r.angle);sector(c,GAHWAN.range);c.fillStyle='#9c15301c';c.fill();c.strokeStyle='#e44966b0';c.lineWidth=.035;c.stroke();c.clip();c.strokeStyle='#ff3e6077';c.lineWidth=.04;c.beginPath();c.arc(0,0,GAHWAN.range*progress,-Math.PI/2,Math.PI/2);c.stroke();});
 }
 for(const f of g.effects){
  if(!['gahwanCut','gahwanWave'].includes(f.type)||f.life<=0)continue;const e=g.units.find(e=>e.id===f.source);if(e&&!g.visibleTo(g.player.team,e))continue;
  const age=f.maxLife-f.life,t=Math.min(1,age/f.maxLife),fade=Math.min(1,f.life/.12);
  ground(c,camera,f,()=>{
   c.rotate(f.angle);c.shadowColor='#ff173b';c.shadowBlur=12;
   if(f.type==='gahwanCut'){
    c.beginPath();c.arc(0,0,f.r,0,Math.PI*2);c.clip();c.globalAlpha=fade;c.lineCap='round';
    for(let i=0;i<3;i++){const off=(i-1)*.5-t*.6;c.beginPath();c.moveTo(-f.r,off+.65);c.quadraticCurveTo(0,off-.45,f.r,off-.25);c.strokeStyle=i===1?'#ffb1b7':'#cc163b';c.lineWidth=i===1?.065:.14;c.stroke();}
   }else{
    sector(c,f.r);c.globalAlpha=fade*.45;c.strokeStyle='#ed3c60';c.lineWidth=.025;c.stroke();c.clip();const radius=f.r*Math.min(1,.08+age/.15);c.globalAlpha=fade;
    const fill=c.createRadialGradient(0,0,Math.max(.01,radius*.55),0,0,Math.max(.02,radius));fill.addColorStop(0,'#790d2200');fill.addColorStop(.8,'#b9113b88');fill.addColorStop(1,'#ff5774cc');sector(c,radius);c.fillStyle=fill;c.fill();
    for(const [width,color]of[[.25,'#760e27'],[.11,'#ee214d'],[.035,'#ffc1ca']]){c.beginPath();c.arc(0,0,Math.max(.05,radius-.14),-Math.PI/2,Math.PI/2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
    c.shadowBlur=4;c.strokeStyle='#ff567b';c.lineWidth=.025;for(let i=0;i<15;i++){const a=(i/14-.5)*Math.PI,r=radius*(.58+.25*Math.sin(i*5)**2);c.beginPath();c.moveTo(Math.cos(a)*r,Math.sin(a)*r);c.lineTo(Math.cos(a)*radius*.94,Math.sin(a)*radius*.94);c.stroke();}
   }
  });
 }
}
