import { combatStyle } from './combat-style.js';
import { noise } from './organic-particles.js';

export function projectileAppearance(p,g){
 const key=p.theme||p.source?.key,style=combatStyle(key,g,p.source,{kind:p.damageKind==='basic'?'basic':'projectile',slot:p.slot,type:key==='rodya'?'iceAxe':undefined});
 const type=p.swordWave||p.theme==='boss'?'wave':({yi:'glass',nelly:'knife',rodya:'axe',ppui:'nail',ishmael:'harpoon',ahab:'harpoon',starbuck:'harpoon'}[key])||(['tower','core'].includes(p.source?.kind)?'cannon':'bullet');
 const h=p.source?.kind==='minion'?.45:p.source?.kind==='tower'?2.1:p.source?.kind==='core'?1.7:.95;
 return {...style,type,height:h,width:Math.max(.1,(p.width||.14)*2),spin:type==='axe'};
}
export class ProjectileVFX {
 constructor(vfx){this.vfx=vfx;this.sprites=new Map();this.histories=new WeakMap();}
 sprite(type,color,{tint=false}={}){
  const key=type+color+tint;if(this.sprites.has(key))return this.sprites.get(key);
  if(this.sprites.size>=64)this.sprites.delete(this.sprites.keys().next().value);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;const c=canvas.getContext('2d');c.translate(64,48);
  const metal=c.createLinearGradient(0,-15,0,15);metal.addColorStop(0,tint?'#ff9aa7':'#fafbfc');metal.addColorStop(.3,color);metal.addColorStop(.52,tint?'#f3657e':'#f4f4f4');metal.addColorStop(1,tint?'#4f1224':'#4b5057');
  c.fillStyle=metal;c.strokeStyle='#27313b';c.lineWidth=1.2;c.lineJoin='round';
  if(type==='wave'){
   for(let i=0;i<7;i++){c.beginPath();c.moveTo(-25-i*2,-40+i*3);c.bezierCurveTo(35+i,0,35+i,0,-25-i*2,40-i*3);c.strokeStyle=i%2?color:'#f2f5fa';c.lineWidth=5-i*.6;c.globalAlpha=.8-i*.08;c.stroke();}c.globalAlpha=1;
  }else if(type==='axe'){
   c.save();c.rotate(.6);c.fillStyle='#554b42';c.fillRect(-36,-3,65,6);c.fillStyle=metal;c.beginPath();c.moveTo(5,-5);c.bezierCurveTo(9,-28,40,-36,49,-15);c.lineTo(34,9);c.lineTo(9,4);c.closePath();c.fill();c.stroke();
   c.strokeStyle='#e9f6ff';c.lineWidth=2;c.beginPath();c.moveTo(14,-19);c.lineTo(30,-25);c.lineTo(43,-15);c.stroke();c.restore();
  }else if(type==='harpoon'||type==='nail'||type==='knife'){
   c.fillStyle=tint?color:type==='knife'?'#51453f':'#53616b';c.fillRect(-45,-3,75,6);c.fillStyle=metal;
   c.beginPath();c.moveTo(type==='knife'?-15:16,-8);c.quadraticCurveTo(30,-10,52,0);c.lineTo(19,9);c.lineTo(type==='knife'?-15:16,6);c.closePath();c.fill();c.stroke();
   if(type==='harpoon'){for(const side of [-1,1]){c.beginPath();c.moveTo(27,side*4);c.lineTo(14,side*18);c.lineTo(16,side*5);c.closePath();c.fill();c.stroke();}}
   if(type==='nail'){c.fillStyle=metal;c.fillRect(-45,-10,6,20);}else{c.fillStyle='#afa18c';c.fillRect(-21,-10,5,20);for(let i=0;i<5;i++){c.strokeStyle='#958474';c.beginPath();c.moveTo(-43+i*4,-4);c.lineTo(-39+i*4,4);c.stroke();}}
   c.strokeStyle=tint?'#ff9ca9':'#f5f8fa';c.lineWidth=1;c.beginPath();c.moveTo(-12,-3);c.lineTo(43,-1);c.stroke();
  }else if(type==='glass'){
   c.fillStyle=metal;c.beginPath();c.moveTo(-28,-7);c.lineTo(19,-14);c.lineTo(45,0);c.lineTo(5,14);c.lineTo(-32,4);c.closePath();c.fill();
   c.strokeStyle='#f7ffff';for(const pts of [[[-28,-7],[5,4],[45,0]],[[19,-14],[5,4],[5,14]]]){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  }else if(type==='cannon'){
   const shade=c.createRadialGradient(-5,-6,1,0,0,22);shade.addColorStop(0,'#fcfcfc');shade.addColorStop(.35,color);shade.addColorStop(1,'#29323b');c.fillStyle=shade;c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fill();
  }else{
   // A bevelled metal bullet, with cap, seams and a tapered nose.
   c.beginPath();c.moveTo(-39,-7);c.lineTo(12,-7);c.quadraticCurveTo(37,-5,48,0);c.quadraticCurveTo(37,5,12,7);c.lineTo(-39,7);c.closePath();c.fill();c.stroke();
   c.fillStyle='#aeb2b5';c.fillRect(-40,-8,5,16);c.strokeStyle='#3a424b';c.beginPath();c.moveTo(10,-7);c.lineTo(10,7);c.stroke();c.strokeStyle='#fff';c.beginPath();c.moveTo(-30,-3);c.lineTo(22,-2);c.stroke();
  }
  this.sprites.set(key,canvas);return canvas;
 }
 draw(c,camera,game){
  c.save();
  for(const p of game.projectiles){
   const style=projectileAppearance(p,game),at=camera.worldToScreen(p,style.height),dir=p.target?Math.atan2(p.target.y-p.y,p.target.x-p.x):Math.atan2(p.dy||0,p.dx||1),next=camera.worldToScreen({x:p.x+Math.cos(dir),y:p.y+Math.sin(dir)},style.height);
   if(at.x<-150||at.x>camera.width+150||at.y<-150||at.y>camera.height+150)continue;
   let h=this.histories.get(p);if(!h){h=[];this.histories.set(p,h);}if(!h.length||h.at(-1).time!==game.time){h.push({x:p.x,y:p.y,time:game.time});if(h.length>5)h.shift();}
   const width=style.width*camera.scale,length=style.type==='wave'?width*.7:Math.max(width*2.5,camera.scale*.65),rotation=style.spin?(game.time-(p.bornAt||0))*28:Math.atan2(next.y-at.y,next.x-at.x);
   if(h.length>1){const tail=camera.worldToScreen(h[0],style.height),dx=at.x-tail.x,dy=at.y-tail.y,n=Math.hypot(dx,dy);if(n>1){c.save();c.translate(tail.x,tail.y);c.rotate(Math.atan2(dy,dx));c.globalAlpha=.16;c.drawImage(this.vfx.strokes.texture('pierce',{...style,x:p.x,y:p.y,born:p.bornAt||0}),0,-Math.max(1,width*.45),n,Math.max(2,width*.9));c.restore();}}
   c.save();c.translate(at.x,at.y);c.rotate(rotation);c.globalAlpha=.9;c.drawImage(this.sprite(style.type,style.color),-length/2,-width*.6,length,width*1.2);c.restore();
  }
  c.restore();
 }
 beams(c,camera,game){
  c.save();
  for(const fx of game.effects){
   if(!['guboLaser','whipArc'].includes(fx.type)&&!(fx.type==='line'&&fx.theme==='hohenheim'))continue;
   const age=1-fx.life/fx.maxLife,owner=game.units.find(e=>e.id===fx.source),key=fx.theme||(fx.type==='guboLaser'?'gubo':'rudolph');
   let end=fx.to;if(!end)continue;
   if(key==='rudolph'){const a=noise(fx.x+fx.y,Math.floor(age*12),8)*Math.PI*2,r=Math.sqrt(noise(fx.y,Math.floor(age*12),4))*2.1675;end={x:end.x+Math.cos(a)*r,y:end.y+Math.sin(a)*r};}
   const from=camera.worldToScreen(fx,key==='gubo'?1.35:.95),to=camera.worldToScreen(end,key==='gubo'?1.25:.5),color=key==='gubo'?'#a33043':key==='rudolph'?'#dc9852':'#a3d6d2';
   c.globalAlpha=Math.max(0,fx.life/fx.maxLife)*.7;c.lineCap='round';
   for(const [w,a,tone] of [[.2,.09,color],[.075,.6,color],[.023,.8,'#eef1ed']]){c.save();c.globalAlpha*=a;c.strokeStyle=tone;c.lineWidth=w*camera.scale;c.beginPath();c.moveTo(from.x,from.y);if(key==='rudolph')c.quadraticCurveTo((from.x+to.x)/2,Math.min(from.y,to.y)-camera.scale*1.3,to.x,to.y);else c.lineTo(to.x,to.y);c.stroke();c.restore();}
   if(key==='gubo'&&owner)c.drawImage(this.sprite('bullet','#953247'),to.x-3,to.y-2,6,4);
  }
  c.restore();
 }
}
