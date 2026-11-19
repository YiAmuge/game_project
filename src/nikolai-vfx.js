import {order} from './nikolai.js';
export const disposalActive=(g,e)=>Object.values(e.state?.nikolaiDisposals||{}).some(v=>v.until>g.time);
export function drawNikolaiMark(c,e,g,y){
 if(!Object.values(e.state?.nikolaiMarks||{}).some(v=>v.until>g.time))return;
 c.save();c.translate(e.x,y-.37);c.strokeStyle='#ff9b3c';c.fillStyle='#ffbc68';c.lineWidth=.045;c.shadowColor='#ff7929';c.shadowBlur=6;c.beginPath();c.arc(0,0,.17,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,.045,0,Math.PI*2);c.fill();for(let i=0;i<4;i++){const a=i*Math.PI/2;c.beginPath();c.moveTo(Math.cos(a)*.12,Math.sin(a)*.12);c.lineTo(Math.cos(a)*.26,Math.sin(a)*.26);c.stroke();}c.restore();
}
export function drawNikolaiBody(r,c,g,e,atlas,f,rect){
 if(!disposalActive(g,e)||!r.skillVfx)return;
 const{left,top,w,h}=rect,tint=r.skillVfx.tintFrame(atlas,f,'#ff953c');c.save();c.shadowColor='#ff8d32';c.shadowBlur=7;c.globalAlpha*=.8;for(const [x,y]of [[-.035,0],[.035,0],[0,-.035],[0,.035]])c.drawImage(tint,left+x,top+y,w,h);c.restore();c.drawImage(atlas,f.x,f.y,f.w,f.h,left,top,w,h);
 c.save();c.globalCompositeOperation='screen';c.globalAlpha*=.05+.13*Math.pow(Math.max(0,Math.sin(g.time*5.5)),3);c.shadowColor='#ff3925';c.shadowBlur=12;c.drawImage(r.skillVfx.tintFrame(atlas,f,'#ff3d25'),left,top,w,h);c.restore();
}
const at=(camera,e,h=0)=>camera.worldToScreen(e,h);
function ring(c,camera,p,r,alpha){const q=at(camera,p,.05);c.save();c.globalAlpha*=alpha;c.translate(q.x,q.y);c.scale(1,.43);c.strokeStyle='#ffa64b';c.lineWidth=2;c.shadowColor='#ff8b31';c.shadowBlur=6;c.beginPath();c.arc(0,0,r*camera.scale,0,Math.PI*2);c.stroke();c.restore();}
function bolt(c,camera,p,time,color='#ffb65d',radius=.65){const q=at(camera,p,.8);c.save();c.translate(q.x,q.y);c.strokeStyle=color;c.lineWidth=1.7;c.shadowColor='#ff9b38';c.shadowBlur=7;for(let ray=0;ray<4;ray++){const angle=ray*Math.PI/2+time*2;c.beginPath();for(let k=0;k<7;k++){const a=angle+Math.sin(k*13+time*40)*.18,r=(.2+k*.1)*radius*camera.scale,x=Math.cos(a)*r,y=Math.sin(a)*r;if(k)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();}c.restore();}
export function drawNikolaiScene(c,camera,g){
 const visible=e=>e&&g.visibleTo(g.player.team,e)&&!g.hidden(e);
 for(const p of g.projectiles){if(!p.nikolaiWave||p.remaining<=0||!visible(p.source))continue;const q=at(camera,p,.95),next=at(camera,{x:p.x+p.dx,y:p.y+p.dy},.95),glow=p.nikolaiEmpowered||p.slot==='r';c.save();c.translate(q.x,q.y);c.rotate(Math.atan2(next.y-q.y,next.x-q.x));c.shadowColor=glow?'#ff8b2b':'#ffba7a';c.shadowBlur=glow?17:6;const size=camera.scale*(p.slot==='r'?1.2:.85);c.strokeStyle=glow?'#ffb65f':'#fff7ed';c.lineWidth=glow?4:3;c.beginPath();c.moveTo(-size*.3,-size*.65);c.quadraticCurveTo(size*.5,0,-size*.3,size*.65);c.stroke();c.strokeStyle=glow?'#fff1c4':'#ed9b50';c.lineWidth=1.4;c.beginPath();c.moveTo(-size*.45,-size*.58);c.quadraticCurveTo(size*.22,0,-size*.45,size*.58);c.stroke();if(p.slot==='r'){c.strokeStyle='#ffda8f';c.lineWidth=1.4;c.beginPath();for(let i=0;i<8;i++){const x=-size*.65+i*size*.14,y=Math.sin(i*4+g.time*70)*size*.17;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();}c.restore();}
 for(const e of g.champions()){if(!e.alive||!visible(e))continue;const buffs=order(g,e);if(buffs.length){ring(c,camera,e,.65,.35+.15*Math.sin(g.time*5));if(buffs.some(v=>v.mode==='power'))bolt(c,camera,e,g.time,'#ffb55c',.6);}}
 for(const f of g.effects){if(!f.type?.startsWith('nikolai')||f.life<=0)continue;const owner=g.units.find(e=>e.id===f.source);if(!visible(owner))continue;const t=1-f.life/f.maxLife;c.save();c.globalAlpha*=1-t;
  if(f.type==='nikolaiCommand')ring(c,camera,f,f.r*Math.min(1,t*1.5),.65);
  else if(f.type==='nikolaiBuff')ring(c,camera,f,.4+t,.8);
  else if(f.type==='nikolaiConvert')bolt(c,camera,f,g.time,'#ffe4ad',1.1);
  else if(f.type==='nikolaiCut'){const q=at(camera,f,1);c.translate(q.x,q.y);c.rotate(f.angle);c.shadowColor='#ff8d32';c.shadowBlur=12;c.strokeStyle='#ffac53';c.lineWidth=4;c.beginPath();c.moveTo(-camera.scale*.8,0);c.lineTo(camera.scale*.8,0);c.stroke();c.strokeStyle='#fff0cd';c.lineWidth=1.5;c.stroke();}
  c.restore();
 }
}
