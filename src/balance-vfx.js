import{drawMagicCircle}from'./magic-circle.js';
import{clipShape}from'./combat-style.js';
const noise=n=>{const x=Math.sin(n*91.73)*43758.5453;return x-Math.floor(x);};
export function drawBalanceEffects(c,camera,g){
 for(const f of g.effects.filter(f=>f.type==='guboBlast'||f.type==='wisdomSlash').slice(-24)){
  const owner=g.units.find(e=>e.id===f.source);if(owner&&!g.visibleTo(g.player.team,owner))continue;
  const age=f.maxLife-f.life,alpha=Math.min(1,f.life/.18);c.save();
  if(f.type==='wisdomSlash'){
   const p=camera.worldToScreen(f,.9),size=camera.scale*.8;c.translate(p.x,p.y);c.rotate(f.angle);c.shadowColor='#278cff';c.shadowBlur=24;c.globalAlpha=alpha;
   for(const[width,color]of[[.24,'#1766ff'],[.09,'#8dd9ff'],[.025,'#f0fbff']]){c.strokeStyle=color;c.lineWidth=size*width;c.beginPath();c.moveTo(-size,-size*.22);c.quadraticCurveTo(0,size*.4,size,size*.04);c.stroke();}
  }else{
   const grow=Math.min(1,age/.5),scale=grow*grow*(3-2*grow),d={x:Math.cos(f.angle),y:Math.sin(f.angle)},center={x:f.x+d.x*f.r*.45,y:f.y+d.y*f.r*.45},o=camera.worldToScreen(center,.10),x=camera.worldToScreen({x:center.x+1,y:center.y},.10),y=camera.worldToScreen({x:center.x,y:center.y+1},.10);
   clipShape(c,camera,{...f,shape:{kind:'cone',range:f.r,angle:f.angle,spread:f.spread}});c.save();c.translate(o.x,o.y);c.transform(x.x-o.x,x.y-o.y,y.x-o.x,y.y-o.y,0,0);c.scale(1,.35);c.rotate(f.angle);c.shadowColor='#ff315d';c.shadowBlur=18;c.fillStyle='#24081180';c.beginPath();c.arc(0,0,f.r*.54*scale,0,Math.PI*2);c.fill();drawMagicCircle(c,g.time*4,{radius:f.r*.54*scale,color:'#a41a3c',accent:'#ff496e',alpha:alpha*(.45+.55*grow)});c.restore();
   if(age>=.5)for(let i=0;i<28;i++){
    const seed=i+Math.floor((age-.5)*30)*37+f.source*17,a=f.angle+(noise(seed)-.5)*f.spread,rad=f.r*(.12+.86*noise(seed+5)),p={x:f.x+Math.cos(a)*rad,y:f.y+Math.sin(a)*rad},from=camera.worldToScreen(p,.12),to=camera.worldToScreen({x:p.x+Math.cos(a)*(.3+noise(seed+7)),y:p.y+Math.sin(a)*(.3+noise(seed+7))},.8+noise(seed+9));
    c.globalAlpha=alpha;c.shadowColor='#ff174b';c.shadowBlur=13;c.strokeStyle='#c72c56';c.lineWidth=4;c.beginPath();c.moveTo(from.x,from.y);c.lineTo(to.x,to.y);c.stroke();c.strokeStyle='#ffb7c9';c.lineWidth=1.2;c.stroke();
   }
  }c.restore();
 }
}
