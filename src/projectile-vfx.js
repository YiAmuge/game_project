import { combatStyle } from './combat-style.js';
import { projectileDimensions } from './projectile-rules.js';
import { FRAMES,loadAtlas } from './art.js';
import { drawWeapon,weaponGeometry,weaponEmissionScreen } from './weapon-art.js';
const tintTone=(color,light=0)=>'#'+[1,3,5].map(i=>{const n=parseInt(color.slice(i,i+2),16);return Math.round(light<0?n*(1+light):n+(255-n)*light).toString(16).padStart(2,'0');}).join('');

export function projectileAppearance(p,g){
 const key=p.theme||p.source?.key,style=combatStyle(key,g,p.source,{kind:p.damageKind==='basic'?'basic':'projectile',slot:p.slot,type:key==='rodya'?'iceAxe':undefined});
 const type=p.swordWave||key==='faust'||p.theme==='boss'?'wave':({yi:'glass',nelly:'knife',rodya:'axe',ppui:'nail',ishmael:'harpoon',ahab:'harpoon',starbuck:'harpoon'}[key])||(['tower','core'].includes(p.source?.kind)?'cannon':'bullet');
 const h=p.source?.kind==='minion'?.45:p.source?.kind==='tower'?2.1:p.source?.kind==='core'?1.7:.95;
 const empowered=key==='gubo'&&(p.guboEmpowered??(p.source&&g.buff(p.source,'guboReload')));
 return {...style,...(key==='gubo'?{color:empowered?'#8e2039':'#651b2d',accent:'#be5265',dark:'#230912'}:{}),type,height:h,width:Math.max(.1,(p.width||.14)*2),spin:type==='axe',visualScale:(p.slot==='r'&&['rodya','ishmael'].includes(key)?1/1.5:1)*(key==='nelly'&&p.slot==='q'?.8:key==='ppui'?.7:1),tint:key==='gubo'||key==='myo'&&p.slot==='q',aura:empowered?'#a32b44':null};
}
export function beamAppearance(key){
 const width=key==='gubo'?2.5:key==='rudolph'?3.5:1,color=key==='gubo'?'#74192e':key==='rudolph'?'#dc9852':'#a3d6d2',tuned=['gubo','rudolph'].includes(key);
 return {color,layers:[[.2*width,tuned?.18:.09,color],[.075*width,tuned?.8:.6,color],[.023*width,tuned?.95:.8,key==='gubo'?'#bd5266':key==='rudolph'?'#ffe7b8':'#eef1ed']]};
}
export const whipVisualInterval=(g,e)=>g.attackInterval(e)*1.2;
export function projectileAsset(p){
 const key=p.theme||p.source?.key;if(key==='yi'&&p.damageKind!=='skill'||p.slot==='r'&&['ishmael','rodya'].includes(key))return false;
 return {yi:'yiDagger',nelly:'nellyKnife',rodya:'rodyaAxe',ppui:'ppuiNail',ishmael:'ishmaelMace',ahab:'ahabHarpoon',starbuck:'starbuckHarpoon'}[key];
}
export class ProjectileVFX {
 constructor(vfx){this.vfx=vfx;this.sprites=new Map();this.histories=new WeakMap();this.muzzles=new WeakMap();}
 muzzle(p,g,camera,height){
  if(p.source?.key!=='gubo'||!p.origin)return null;
  let muzzle=this.muzzles.get(p);
  if(!muzzle){
   const tip=weaponEmissionScreen(g,p.source,camera,p.origin),start=camera.worldToScreen(p.origin,height),next=camera.worldToScreen({x:p.origin.x+p.dx,y:p.origin.y+p.dy},height),dx=next.x-start.x,dy=next.y-start.y,n=Math.hypot(dx,dy)||1,ux=dx/n,uy=dy/n,tx=(tip.x-start.x)/camera.scale,ty=(tip.y-start.y)/camera.scale,along=tx*ux+ty*uy;
   muzzle={x:tx-along*ux,y:ty-along*uy,along,ux,uy};this.muzzles.set(p,muzzle);
  }return muzzle;
 }
 position(p,g,camera,height){
  const at=camera.worldToScreen(p,height),muzzle=this.muzzle(p,g,camera,height);if(!muzzle)return at;
  // A fixed perpendicular offset keeps the entire flight on one straight line.
  return {x:at.x+muzzle.x*camera.scale,y:at.y+muzzle.y*camera.scale};
 }
 clearedMuzzle(p,g,camera,height){
  const muzzle=this.muzzle(p,g,camera,height);if(!muzzle)return true;const at=camera.worldToScreen(p,height),start=camera.worldToScreen(p.origin,height);
  return ((at.x-start.x)*muzzle.ux+(at.y-start.y)*muzzle.uy)/camera.scale>=muzzle.along;
 }
 sprite(type,color,{tint=false,asset:override}={}){
  const key=type+color+tint+String(override??'');if(this.sprites.has(key))return this.sprites.get(key);
  if(this.sprites.size>=64)this.sprites.delete(this.sprites.keys().next().value);
  const asset=override===false?null:override||{axe:'rodyaAxe',nail:'ppuiNail',knife:'nellyKnife',harpoon:'ahabHarpoon',glass:'yiDagger'}[type],f=FRAMES[asset],atlas=f&&loadAtlas(f.sheet);
  if(f&&atlas.complete&&atlas.naturalWidth){const canvas=document.createElement('canvas'),geometry=weaponGeometry(asset,256);canvas.width=Math.ceil(geometry.span);canvas.height=Math.max(24,Math.round(256*f.h/f.w));canvas.dataset.spriteAsset=asset;canvas.dataset.lengthScale=String(canvas.width/256);const c=canvas.getContext('2d');drawWeapon(c,asset,256,{y:canvas.height/2});if(tint){c.globalCompositeOperation='source-atop';c.globalAlpha=.5;c.fillStyle=color;c.fillRect(0,0,canvas.width,canvas.height);}this.sprites.set(key,canvas);return canvas;}
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;const c=canvas.getContext('2d');c.translate(64,48);
  const metal=c.createLinearGradient(0,-15,0,15);metal.addColorStop(0,tint?tintTone(color,.45):'#fafbfc');metal.addColorStop(.3,color);metal.addColorStop(.52,tint?tintTone(color,.12):'#f4f4f4');metal.addColorStop(1,tint?tintTone(color,-.6):'#4b5057');
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
   c.strokeStyle=tint?tintTone(color,.5):'#f5f8fa';c.lineWidth=1;c.beginPath();c.moveTo(-12,-3);c.lineTo(43,-1);c.stroke();
  }else if(type==='glass'){
   c.fillStyle=metal;c.beginPath();c.moveTo(-28,-7);c.lineTo(19,-14);c.lineTo(45,0);c.lineTo(5,14);c.lineTo(-32,4);c.closePath();c.fill();
   c.strokeStyle='#f7ffff';for(const pts of [[[-28,-7],[5,4],[45,0]],[[19,-14],[5,4],[5,14]]]){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  }else if(type==='cannon'){
   const shade=c.createRadialGradient(-5,-6,1,0,0,22);shade.addColorStop(0,'#fcfcfc');shade.addColorStop(.35,color);shade.addColorStop(1,'#29323b');c.fillStyle=shade;c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fill();
  }else{
   // A bevelled metal bullet, with cap, seams and a tapered nose.
   c.beginPath();c.moveTo(-39,-7);c.lineTo(12,-7);c.quadraticCurveTo(37,-5,48,0);c.quadraticCurveTo(37,5,12,7);c.lineTo(-39,7);c.closePath();c.fill();c.stroke();
   c.fillStyle=tint?tintTone(color,-.2):'#aeb2b5';c.fillRect(-40,-8,5,16);c.strokeStyle='#3a424b';c.beginPath();c.moveTo(10,-7);c.lineTo(10,7);c.stroke();c.strokeStyle=tint?tintTone(color,.65):'#fff';c.beginPath();c.moveTo(-30,-3);c.lineTo(22,-2);c.stroke();
  }
  if(!asset)this.sprites.set(key,canvas);return canvas;
 }
 draw(c,camera,game){
  c.save();
  for(const p of game.projectiles){
   const style=projectileAppearance(p,game),base=camera.worldToScreen(p,style.height),at=this.position(p,game,camera,style.height),dir=p.target?Math.atan2(p.target.y-p.y,p.target.x-p.x):Math.atan2(p.dy??0,p.dx??1),next=camera.worldToScreen({x:p.x+Math.cos(dir),y:p.y+Math.sin(dir)},style.height);
   const {width,length}=projectileDimensions(style,camera.scale),margin=Math.max(150,Math.hypot(width,length)/2+30);
   if(at.x<-margin||at.x>camera.width+margin||at.y<-margin||at.y>camera.height+margin)continue;
   if(!this.clearedMuzzle(p,game,camera,style.height))continue;
   let h=this.histories.get(p);if(!h){h=[];this.histories.set(p,h);}if(!h.length||h.at(-1).time!==game.time){h.push({x:p.x,y:p.y,time:game.time,ox:(at.x-base.x)/camera.scale,oy:(at.y-base.y)/camera.scale});if(h.length>5)h.shift();}
   const rotation=style.spin?(game.time-(p.bornAt||0))*28:Math.atan2(next.y-base.y,next.x-base.x);
   if(h.length>1){const tail=camera.worldToScreen(h[0],style.height);tail.x+=h[0].ox*camera.scale;tail.y+=h[0].oy*camera.scale;const dx=at.x-tail.x,dy=at.y-tail.y,n=Math.hypot(dx,dy);if(n>1){c.save();c.translate(tail.x,tail.y);c.rotate(Math.atan2(dy,dx));c.globalAlpha=.16;c.drawImage(this.vfx.strokes.texture('pierce',{...style,x:p.x,y:p.y,born:p.bornAt||0}),0,-Math.max(1,width*.45),n,Math.max(2,width*.9));c.restore();}}
   c.save();c.translate(at.x,at.y);c.rotate(rotation);
   if(style.aura){c.save();c.globalAlpha=.75;c.drawImage(this.vfx.strokes.texture('pierce',{...style,x:p.x,y:p.y,born:p.bornAt||0}),-length*.8,-width,length*1.6,width*2);c.restore();}
   const texture=this.sprite(style.type,style.color,{tint:style.tint,asset:projectileAsset(p)}),span=length*Number(texture.dataset.lengthScale||1),height=texture.dataset.spriteAsset?span*texture.height/texture.width:width*1.2;
   c.globalAlpha=1;c.drawImage(texture,-span/2,-height/2,span,height);c.restore();
  }
  c.restore();
 }
 syncWhips(game){
  if(this.game!==game||game.time<(this.time??0)){this.game=game;this.whips=new Map();this.whipPulses=[];this.seenWhips=new WeakSet();}this.time=game.time;
  this.whipPulses=this.whipPulses.filter(p=>game.time-p.bornAt<.2&&game.units.some(e=>e.id===p.source&&e.alive));
  for(const f of game.effects){
   if(f.type!=='whipArc'||this.seenWhips.has(f))continue;this.seenWhips.add(f);const owner=game.units.find(e=>e.id===f.source);if(!owner)continue;
   const at=game.time-(f.maxLife-f.life),interval=whipVisualInterval(game,owner);let s=this.whips.get(owner.id);
   if(!s||at-s.lastAt>interval+.1){s={nextAt:at};this.whips.set(owner.id,s);}Object.assign(s,{fx:f,lastAt:at,interval});
  }
  for(const [id,s] of this.whips){
   const owner=game.units.find(e=>e.id===id&&e.alive);if(!owner||game.time-s.lastAt>s.interval*2){this.whips.delete(id);continue;}
   if(game.time+1e-8<s.nextAt)continue;
   const at=s.nextAt+Math.floor(Math.max(0,game.time-s.nextAt)/s.interval)*s.interval;s.nextAt=at+s.interval;
   if(game.time-at<.2&&at-s.lastAt<=game.attackInterval(owner)+.05)this.whipPulses.push({...s.fx,x:owner.x,y:owner.y,to:{...s.fx.to},bornAt:at,maxLife:.2});
  }
 }
 beams(c,camera,game){
  this.syncWhips(game);
  c.save();
  for(const fx of [...game.effects.filter(f=>f.type!=='whipArc'),...this.whipPulses.map(p=>({...p,life:Math.max(0,.2-(game.time-p.bornAt))}))]){
   if(!['guboLaser','whipArc'].includes(fx.type)&&!(fx.type==='line'&&fx.theme==='hohenheim'))continue;
   const owner=game.units.find(e=>e.id===fx.source),key=fx.theme||(fx.type==='guboLaser'?'gubo':'rudolph');
   const end=fx.to;if(!end)continue;
   const from=owner&&['gubo','rudolph'].includes(key)?weaponEmissionScreen(game,owner,camera):camera.worldToScreen(fx,key==='gubo'?1.35:.95),to=camera.worldToScreen(end,key==='gubo'?1.25:.5),style=beamAppearance(key);
   c.globalAlpha=Math.max(0,fx.life/fx.maxLife)*.7;c.lineCap='round';
   for(const [w,a,tone] of style.layers){c.save();c.globalAlpha*=a;c.strokeStyle=tone;c.lineWidth=w*camera.scale;c.beginPath();c.moveTo(from.x,from.y);if(key==='rudolph')c.quadraticCurveTo((from.x+to.x)/2,Math.min(from.y,to.y)-camera.scale*1.3,to.x,to.y);else c.lineTo(to.x,to.y);c.stroke();c.restore();}
   if(key==='gubo'&&owner)c.drawImage(this.sprite('bullet','#953247'),to.x-3,to.y-2,6,4);
  }
  c.restore();
 }
}
