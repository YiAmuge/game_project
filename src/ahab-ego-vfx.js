import {drawWeapon} from './weapon-art.js';
const noise=n=>{const v=Math.sin(n*91.17)*43758.5453;return v-Math.floor(v);};
const point=(camera,f,a,r,h=.95)=>camera.worldToScreen({x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r},h);
function lance(c,a,b,color,width){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,px=-dy/len,py=dx/len;
 c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
 c.fillStyle='#ffffff';c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-dx/len*8+px*2.3,b.y-dy/len*8+py*2.3);c.lineTo(b.x-dx/len*6,b.y-dy/len*6);c.lineTo(b.x-dx/len*8-px*2.3,b.y-dy/len*8-py*2.3);c.closePath();c.fill();
}
export function drawGasharpoonScene(c,camera,g){
 for(const f of g.effects){
  if(!f.type.startsWith('gasharpoon'))continue;
  const owner=g.units.find(e=>e.id===f.source);if(owner&&!g.visibleTo(g.player.team,owner))continue;
  const age=f.maxLife-f.life,alpha=Math.min(1,f.life/.1);c.save();c.globalAlpha=alpha;c.lineCap='round';
  if(f.type==='gasharpoonTransform'){
   const p=camera.worldToScreen(owner||f,.9),radius=camera.scale*(.25+age*2.5);c.shadowColor='#ffffff';c.shadowBlur=18;c.strokeStyle='#ffffff';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,radius,radius*.7,0,0,Math.PI*2);c.stroke();
   for(let i=0;i<16;i++){const a=i*Math.PI/8+f.source,len=camera.scale*(.4+age*2),x=p.x+Math.cos(a)*len,y=p.y+Math.sin(a)*len;c.strokeStyle='#ffffff';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*5,y+Math.sin(a)*5);c.stroke();}
  }else if(f.type==='gasharpoonVolley'){
   const pulse=Math.min(2,Math.floor(age/(.2/3))),phase=(age%(.2/3))/(.2/3);
   c.shadowColor='#a5ffca';c.shadowBlur=8;
   for(let i=0;i<24;i++){
    const seed=f.seed*89+pulse*71+i*13,a=f.angle+(i/23-.5)*f.spread,reach=f.r*(.55+.45*phase),tip=point(camera,f,a,reach),tail=point(camera,f,a,Math.max(.2,reach-(2.2+noise(seed)*2.8)));
    c.globalAlpha=alpha*(.65+noise(seed+4)*.35);lance(c,tail,tip,'#a8e7bc',3);lance(c,tail,tip,'#ffffff',1.35);
   }
  }else if(f.type==='gasharpoonShock'){
   const radius=f.r*Math.min(1,age/.2),pts=[];for(let i=0;i<=40;i++)pts.push(point(camera,f,f.angle-f.spread/2+f.spread*i/40,radius,.55));
   c.shadowColor='#67aaff';c.shadowBlur=14;for(const[color,width]of[['#7daeff',7],['#ffffff',2.5]]){c.strokeStyle=color;c.lineWidth=width;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
   for(let i=0;i<12;i++){const a=f.angle+(i/11-.5)*f.spread;lance(c,point(camera,f,a,radius*.55,.55),point(camera,f,a,radius,.55),'#f7fbff',1.2);}
  }else if(f.type==='gasharpoonCharge'&&owner?.state.gasharpoon?.channel){
   const ch=owner.state.gasharpoon.channel,progress=Math.min(1,age/.5),p=camera.worldToScreen(owner,1.1);c.globalAlpha=.25+progress*.55;c.shadowColor=ch.slot==='q'?'#77b5ff':'#d392ff';c.shadowBlur=10+progress*14;
   c.strokeStyle='#ffffff';c.lineWidth=1+progress;c.beginPath();c.arc(p.x,p.y,camera.scale*(.25+.35*progress),0,Math.PI*2);c.stroke();
   if(ch.slot==='q'){
    const pts=[point(camera,owner,ch.angle,0,.1)];for(let i=0;i<=40;i++)pts.push(point(camera,owner,ch.angle-f.spread/2+f.spread*i/40,f.r,.1));c.globalAlpha=.25;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.strokeStyle='#b8d9ff';c.lineWidth=1.2;c.stroke();
   }
  }c.restore();
 }
 for(const p of g.projectiles){
  if(!p.gasharpoon)continue;const at=camera.worldToScreen(p,1),ahead=camera.worldToScreen({x:p.x+p.dx,y:p.y+p.dy},1),tail=camera.worldToScreen({x:p.x-p.dx*3,y:p.y-p.dy*3},1);
  c.save();c.shadowColor='#c186ff';c.shadowBlur=24;c.globalAlpha=.75;lance(c,tail,at,'#bc8cff',7);c.globalAlpha=1;c.translate(at.x,at.y);c.rotate(Math.atan2(ahead.y-at.y,ahead.x-at.x));drawWeapon(c,'ahabGasBlade',camera.scale*3.8,{pivot:.65});c.restore();
 }
}
