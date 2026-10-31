import{drawMagicCircle}from'./magic-circle.js';
export function battleHasteLights(time){return Array.from({length:16},(_,i)=>{const phase=(time*.65+i/16)%1,angle=i*2.4+time*.18,radius=.25+i%4*.15;return{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,height:.06+phase*(2.3+i%3*.15),alpha:Math.sin(phase*Math.PI)*.95,color:i%2?'#ffe77c':'#ff73bd',size:.035+.025*(.5+.5*Math.sin(time*10+i*1.7))};});}
export function drawAugmentGround(c,camera,g){
 for(const e of g.champions().filter(e=>e.alive&&!g.hidden(e)&&g.visibleTo(g.player.team,e)&&g.buff(e,'augBattleHaste'))){const o=camera.worldToScreen(e,.09),dx=camera.worldToScreen({x:e.x+1,y:e.y},.09),dy=camera.worldToScreen({x:e.x,y:e.y+1},.09);c.save();c.translate(o.x,o.y);c.transform(dx.x-o.x,dx.y-o.y,dy.x-o.x,dy.y-o.y,0,0);const glow=c.createRadialGradient(0,0,.15,0,0,1.15);glow.addColorStop(0,'#ff4daf08');glow.addColorStop(.7,'#ff4daf33');glow.addColorStop(1,'#ff4daf00');c.fillStyle=glow;c.fillRect(-1.2,-1.2,2.4,2.4);drawMagicCircle(c,g.time);c.restore();
 }
}
export function drawAugmentEffects(c,camera,g){
 for(const f of g.effects){if(!['traumaField','maskSplash'].includes(f.type))continue;const e=g.units.find(e=>e.id===f.source)||f,t=1-f.life/f.maxLife,fade=1-t,center=camera.worldToScreen(e,1.2),scale=camera.scale;c.save();
  if(f.type==='traumaField'){c.globalAlpha=fade;c.shadowColor='#fff';c.shadowBlur=12;c.strokeStyle='#ffffff';c.fillStyle='#f5fbff22';c.lineWidth=scale*.06;c.beginPath();c.ellipse(center.x,center.y,scale*(.7+t*.25),scale*(1.1+t*.25),0,0,Math.PI*2);c.fill();c.stroke();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(center.x+Math.cos(a)*scale*.35,center.y+Math.sin(a)*scale*.55);c.lineTo(center.x+Math.cos(a)*scale*.75,center.y+Math.sin(a)*scale*1.1);c.stroke();}}
  else for(let i=0;i<28;i++){const side=i%2?1:-1,a=i*2.4,d=.15+t*(1+i%4*.2),p=camera.worldToScreen({x:e.x+Math.cos(a)*d+side*t*.5,y:e.y+Math.sin(a)*d*.7},.8+Math.sin(t*Math.PI)*(1+i%3*.3));c.globalAlpha=fade*.9;c.fillStyle=side>0?'#ff3e55':'#36a9ff';c.shadowColor=c.fillStyle;c.shadowBlur=4;c.beginPath();c.ellipse(p.x,p.y,scale*.06,scale*.13,a,0,Math.PI*2);c.fill();}
  c.restore();
 }
 for(const e of g.champions().filter(e=>e.alive&&!g.hidden(e)&&g.visibleTo(g.player.team,e)&&g.buff(e,'augBattleHaste'))){c.save();const scale=camera.scale;for(const light of battleHasteLights(g.time)){const p=camera.worldToScreen({x:e.x+light.x,y:e.y+light.y},light.height),r=scale*light.size;c.globalAlpha=light.alpha;c.shadowColor=light.color;c.shadowBlur=9;c.strokeStyle=light.color;c.fillStyle=light.color;c.lineWidth=scale*.025;c.beginPath();c.moveTo(p.x-r,p.y);c.lineTo(p.x+r,p.y);c.moveTo(p.x,p.y-r*1.45);c.lineTo(p.x,p.y+r*1.45);c.stroke();c.beginPath();c.arc(p.x,p.y,r*.35,0,Math.PI*2);c.fill();}c.restore();}
}
