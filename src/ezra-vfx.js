import{EZRA_WEAPONS}from'./ezra-data.js';
// Ground-space fields retain round silhouettes under the 2.5D camera transform.
export function drawEzraGround(c,camera,g){
 for(const f of g.effects){
  if(!['ezraElectric','ezraGravity'].includes(f.type)||f.life<=0)continue;
  const age=f.maxLife-f.life,t=Math.min(1,age/f.maxLife),fade=Math.sin(Math.PI*Math.min(1,t*1.4))*(1-t),at=camera.worldToScreen(f,.09),x=camera.worldToScreen({x:f.x+1,y:f.y},.09),y=camera.worldToScreen({x:f.x,y:f.y+1},.09);
  c.save();c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);c.beginPath();
  if(f.type==='ezraElectric'){
   c.rotate(f.angle);c.moveTo(0,0);c.arc(0,0,f.r,-f.spread/2,f.spread/2);c.closePath();c.clip();
   const glow=c.createRadialGradient(0,0,.1,0,0,f.r);glow.addColorStop(0,'#c8ffff88');glow.addColorStop(.65,'#00bfffa0');glow.addColorStop(1,'#0066ff00');c.globalAlpha=fade*.7;c.fillStyle=glow;c.fillRect(-f.r,-f.r,f.r*2,f.r*2);
   c.globalCompositeOperation='lighter';c.shadowColor='#00cfff';c.shadowBlur=11;c.lineCap='round';
   for(let i=0;i<10;i++){const angle=(i/9-.5)*f.spread*.96,reach=f.r*(.55+.45*Math.sin(i*2.7+1)**2);c.beginPath();c.moveTo(.18,0);for(let j=1;j<=6;j++){const r=reach*j/6,a=angle+Math.sin(i*13+j*7+Math.floor(age*24))*.055;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.strokeStyle=i%3?'#30dfff':'#e5ffff';c.lineWidth=i%3?.025:.045;c.globalAlpha=fade*(.5+(i%3)*.15);c.stroke();}
  }else{
   c.arc(0,0,f.r,0,Math.PI*2);c.clip();const shade=c.createRadialGradient(0,0,0,0,0,f.r);shade.addColorStop(0,'#05030de0');shade.addColorStop(.35,'#0e081ec9');shade.addColorStop(.8,'#1c132b70');shade.addColorStop(1,'#20162b00');c.fillStyle=shade;c.globalAlpha=Math.min(1,age/.08)*(1-t);c.fillRect(-f.r,-f.r,f.r*2,f.r*2);
   c.shadowColor=EZRA_WEAPONS[3].color;c.shadowBlur=5;c.lineCap='round';
   for(let i=0;i<18;i++){const progress=(age*1.6+i/18)%1,r=f.r*(1-progress)**1.4,a=i*2.399+progress*1.3;c.beginPath();c.arc(0,0,Math.max(.035,r),a,a+.18+.28*(1-progress));c.strokeStyle=i%4?'#aa835b':'#ffe398';c.globalAlpha=(1-t)*Math.sin(Math.PI*progress)*.7;c.lineWidth=.025+.015*(1-progress);c.stroke();}
   c.globalAlpha=(1-t)*.65;c.strokeStyle='#f8ce6c';c.lineWidth=.025;c.beginPath();c.arc(0,0,Math.max(.08,f.r*(1-t)**2),0,Math.PI*2);c.stroke();
  }
  c.restore();
 }
}
