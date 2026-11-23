import {FRAMES,loadAtlas} from './art.js';
const screen=(camera,p,h=0)=>camera.worldToScreen(p,h);
function sector(c,camera,p,r,angle=0,spread=Math.PI*2){const a=screen(camera,p,.04);c.beginPath();c.moveTo(a.x,a.y);for(let i=0;i<=52;i++){const t=angle-spread/2+spread*i/52,q=screen(camera,{x:p.x+Math.cos(t)*r,y:p.y+Math.sin(t)*r},.04);c.lineTo(q.x,q.y);}c.closePath();}
export function drawBuffetBody(r,c,g,e,atlas,f,{left,top,w,h}){
 const a=e.state.buffetAwakening;if(!a||!r.skillVfx)return;const t=Math.min(1,(g.time-a.at)/1.5);c.save();c.globalCompositeOperation='screen';c.globalAlpha*=t*.85;c.shadowColor='#ff173d';c.shadowBlur=5+28*t;c.drawImage(r.skillVfx.tintFrame(atlas,f,'#ed1742'),left,top,w,h);c.restore();
}
export function drawBuffetWeapon(r,e,g,p){
 const c=r.ctx,f=FRAMES.buffetSword,atlas=loadAtlas(28);if(!f||!atlas.complete||!atlas.naturalWidth)return;const a=e.state.buffetWhip,age=g.time-(a?.at??-99),attacking=age>=0&&age<.15,progress=Math.min(1,age/.1),base=attacking?a.angle:p.facing,angle=attacking?base+(progress-.5)*(a.enhanced?Math.PI:Math.PI*2/3):base+.65,flip=Math.cos(angle)<0?-1:1,rotation=Math.atan2(Math.sin(angle),Math.abs(Math.cos(angle))),length=attacking?(a.enhanced?7.1:5.8):2.65,hand=p.left;
 c.save();c.translate(hand.x,hand.y);c.scale(flip,1);c.rotate(rotation);const height=length*f.h/f.w,bend=attacking?Math.sin(progress*Math.PI)*.65:.3,point=u=>{const v=Math.max(0,(u-(f.bladeFrom||.13))/(1-(f.bladeFrom||.13)));return{x:(u-.055)*length,y:Math.sin(v*Math.PI)*(bend+Math.sin(v*4*Math.PI-progress*7)*.1*(attacking?1:0))};};
 c.shadowColor='#ec1744';c.shadowBlur=attacking?(a.enhanced?23:11):0;
 for(let i=0;i<32;i++){const u=i/32,v=(i+1)/32,a=point(u),b=point(v),dx=b.x-a.x,dy=b.y-a.y;c.save();c.translate((a.x+b.x)/2,(a.y+b.y)/2);c.rotate(Math.atan2(dy,dx));c.drawImage(atlas,f.x+f.w*u,f.y,f.w/32,f.h,-Math.hypot(dx,dy)/2,-height/2,Math.hypot(dx,dy)+.012,height);c.restore();}
 const fist=FRAMES.buffetHand;if(fist){c.save();c.shadowBlur=0;c.drawImage(atlas,fist.x,fist.y,fist.w,fist.h,-.19,-.19,.38,.38*fist.h/fist.w);c.restore();}
 if(attacking){c.globalAlpha*=.55;c.strokeStyle=a.enhanced?'#ff3c63':'#ab193c';c.lineWidth=.045;c.shadowBlur=a.enhanced?16:7;c.beginPath();for(let i=4;i<=32;i++){const q=point(i/32);if(i===4)c.moveTo(q.x,q.y+.08);else c.lineTo(q.x,q.y+.08);}c.stroke();}c.restore();
}
export function drawBuffetScene(c,camera,g,projectiles){
 for(const f of g.effects){if(!['buffetSlash','buffetWave','buffetCharge','buffetNail','buffetAwaken','buffetRescue','starbuckSlam'].includes(f.type)||f.life<=0||!g.visibleTo(g.player.team,f))continue;const t=1-f.life/f.maxLife;c.save();
  if(f.type==='buffetSlash'||f.type==='buffetCharge'){sector(c,camera,f,f.r,f.angle||0,f.spread||Math.PI*2);c.fillStyle=f.type==='buffetCharge'?'#8e16382b':'#e21c4140';c.fill();c.strokeStyle='#f13960';c.globalAlpha*=1-t;c.lineWidth=1.7;c.stroke();}
  else if(f.type==='buffetNail'){const target=g.units.find(e=>e.id===f.target)||f,q=screen(camera,target,1.1+(1-Math.min(1,t*1.8))*3),asset=projectiles?.sprite('nail','#d31c48',{tint:true,asset:'ppuiNail'});if(asset){c.translate(q.x,q.y);c.rotate(Math.PI/2+.1);c.shadowColor='#ed2148';c.shadowBlur=10;c.globalAlpha=1-t*.7;c.drawImage(asset,-camera.scale*.7,-camera.scale*.12,camera.scale*1.4,camera.scale*.24);}}
  else if(f.type==='buffetWave'){sector(c,camera,f,f.r,f.angle,f.spread);c.clip();const dir={x:Math.cos(f.angle),y:Math.sin(f.angle)},p={x:f.x+dir.x*f.r*t,y:f.y+dir.y*f.r*t},q=screen(camera,p,.9),next=screen(camera,{x:p.x+dir.x,y:p.y+dir.y},.9),asset=projectiles?.sprite('wave','#dd1744',{asset:false});if(asset){c.translate(q.x,q.y);c.rotate(Math.atan2(next.y-q.y,next.x-q.x));c.globalAlpha=1-t;c.shadowColor='#ff2655';c.shadowBlur=20;c.drawImage(asset,-camera.scale*.5,-camera.scale*f.r,camera.scale*1.5,camera.scale*f.r*2);}}
  else if(f.type==='starbuckSlam'){sector(c,camera,f,f.r);c.globalAlpha*=1-t;c.fillStyle='#8bbbad30';c.fill();c.strokeStyle='#c3f0dc';c.lineWidth=2;c.shadowColor='#80c0a9';c.shadowBlur=9;c.stroke();}
  else{sector(c,camera,f,(f.r||2)*t);c.globalAlpha*=1-t;c.fillStyle='#cc174c25';c.fill();c.strokeStyle='#fc3c68';c.lineWidth=4;c.shadowColor='#ed1644';c.shadowBlur=20;c.stroke();}c.restore();
 }
}
