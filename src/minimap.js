import { TERRAIN,APPROACH_CUTOUTS,WALLS,BUSHES,FOUNTAIN_AREAS } from './data.js';
import * as Training from './training.js';
import { drawFace,visualForm } from './art.js';
import { live,PING_COLORS } from './pings.js';
import { drawPingIcon } from './ping-icons.js';
export function drawMinimap(r,canvas,g){
 const c=canvas.getContext('2d'),b=g.bounds,sx=canvas.width/b.w,sy=canvas.height/b.h,ui=canvas.width/Math.max(1,canvas.getBoundingClientRect().width),expanded=canvas.id!=='minimap';
 const screen=p=>({x:(p.x-b.x)*sx,y:(p.y-b.y)*sy});
 c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#142321';c.fillRect(0,0,canvas.width,canvas.height);
 c.save();c.scale(sx,sy);c.translate(-b.x,-b.y);c.fillStyle='#253f35';for(const room of g.training?[b]:TERRAIN)c.fillRect(room.x,room.y,room.w,room.h);
 if(g.training)for(const a of Training.areas(g)){c.fillStyle=a.color+'55';c.fillRect(a.x,a.y,a.w,a.h);}
 if(!g.training){c.fillStyle='#142321';for(const points of APPROACH_CUTOUTS){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}}c.fillStyle='#526558';for(const w of g.map?.walls||WALLS){c.save();c.translate(w.x+w.w/2,w.y+w.h/2);c.rotate(w.angle||0);c.fillRect(-w.w/2,-w.h/2,w.w,w.h);c.restore();}c.fillStyle='#3e6582';for(const w of g.training?[]:BUSHES){if(w.polygon){c.beginPath();w.polygon.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}else c.fillRect(w.x,w.y,w.w,w.h);}
 if(!g.training)for(const a of FOUNTAIN_AREAS){c.fillStyle=a.team?'#aa4d4266':'#4eabb366';c.fillRect(a.x,a.y,a.w,a.h);}
 const view=r.camera.bounds;c.strokeStyle='#e3d8aa88';c.lineWidth=.22;c.strokeRect(view.x,view.y,view.w,view.h);c.restore();
 for(const camp of g.campViews()){const p=screen(camp.home),timer=g.campTimers().find(t=>t.campId===camp.id);c.fillStyle=timer?'#d1b176':'#89946d';c.beginPath();c.arc(p.x,p.y,3*ui,0,Math.PI*2);c.fill();if(timer){c.font=`bold ${10*ui}px Arial`;c.textAlign='center';c.fillText(timer.seconds,p.x,p.y-5*ui);}}
 const visible=g.units.filter(e=>e.alive&&g.visibleTo(0,e)&&!g.hidden(e));
 for(const e of visible.filter(e=>e.kind==='minion')){const p=screen(e);c.fillStyle=e.team?'#ef9987':'#8bcce0';c.fillRect(p.x-1.4*ui,p.y-1.4*ui,2.8*ui,2.8*ui);}
 for(const e of visible.filter(e=>['tower','core'].includes(e.kind))){const p=screen(e),size=(expanded?9:6)*ui,color=e.team?'#ef9987':'#8bcce0';c.save();c.translate(p.x,p.y);c.beginPath();if(e.kind==='tower')c.rect(-size*.65,-size,size*1.3,size*2);else for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;i?c.lineTo(Math.cos(a)*size,Math.sin(a)*size):c.moveTo(Math.cos(a)*size,Math.sin(a)*size);}c.closePath();c.fillStyle='#142126';c.fill();c.save();c.clip();c.fillStyle=color;const fraction=Math.max(0,e.hp/e.maxHp);c.fillRect(-size,-size+2*size*(1-fraction),size*2,size*2*fraction);c.restore();c.strokeStyle=color;c.lineWidth=1.2*ui;c.stroke();c.restore();}
 for(const e of visible.filter(e=>e.kind==='champion').sort((a,b)=>Number(a.player)-Number(b.player))){const p=screen(e),size=(expanded?26:15)*ui,form=visualForm(g,e);c.save();c.beginPath();c.arc(p.x,p.y,size/2,0,Math.PI*2);c.clip();c.fillStyle='#1b242a';c.fillRect(p.x-size/2,p.y-size/2,size,size);drawFace(c,form,r.atlasFor(form),p.x-size/2,p.y-size/2,size);c.restore();c.strokeStyle=e.player?'#ffe2a1':e.team?'#ef9987':'#8bcce0';c.lineWidth=(e.player?2:1.3)*ui;c.beginPath();c.arc(p.x,p.y,size/2,0,Math.PI*2);c.stroke();}
 for(const ping of live(g)){const p=screen(ping),phase=(g.time-ping.at)%1;c.strokeStyle=PING_COLORS[ping.kind];c.lineWidth=2*ui;c.beginPath();c.arc(p.x,p.y,(7+phase*10)*ui,0,Math.PI*2);c.stroke();const size=(expanded?24:17)*ui;drawPingIcon(c,ping.icon||{type:ping.kind},p.x-size/2,p.y-size/2,size,g.player.team);}
}
