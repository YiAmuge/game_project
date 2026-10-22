import { dashLength,dashBasic } from './skills.js';
import * as Hohenheim from './hohenheim.js';
import { metric } from './training.js';

export function behind(r,e,g){
 if(e.key!=='yi'||!g.buff(e,'ogamdo'))return;
 const beat=Math.sin(g.time*3)*.1;
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const x=e.x+side*(.5+i*.16),y=e.y-1.1-i*.15+beat,reach=.65+(6-i)*.06;
  r.polygon([[x,y],[x+side*reach,y-.75-i*.035],[x+side*reach*.78,y-.05],[x+side*.14,y+.23]],i%2?'#d5f4f5b8':'#a5c9e5b8','#f4ffffcc');
  r.line([{x,y},{x:x+side*reach*.83,y:y-.55}],'#ffffff99',.035);
 }
}
export function front(r,e,g){
 const c=r.ctx,windup=e.state.ishmaelCast;
 if(windup?.windupUntil>g.time){const d=windup.d,progress=1-(windup.windupUntil-g.time)/.235;r.line([{x:e.x,y:e.y-.6},{x:e.x+d.x*3,y:e.y-.6+d.y*3}],'#c1e8efaa',.045,[.12,.12]);r.text('작살 조준',e.x,e.y-3.55,'#c8eff6',.26);r.circle(e.x+d.x*1.6,e.y-.6+d.y*1.6,.15+progress*.08,null,'#eab778',.04);}
 if(e.state.harpoon?.until>g.time){const owner=g.units.find(t=>t.id===e.state.harpoon.source&&t.alive);if(owner&&e.motion?.ishmaelOwner===owner.id){const a=Math.atan2(owner.y-e.y,owner.x-e.x);c.save();c.translate(e.x,e.y-.75);c.rotate(a);r.line([{x:-.45,y:0},{x:.55,y:0}],'#86bdcb',.13);r.polygon([[-.65,0],[-.1,-.27],[-.22,0],[-.1,.27]],'#e4f2ed','#54869e');c.restore();r.line([{x:e.x,y:e.y-.75},{x:owner.x,y:owner.y-.55}],'#9eb8baaa',.045);}}
 const fairy=e.state.fairy;
 if(fairy?.until>g.time){
  const x=e.x+Math.sin(g.time*3)*.22,y=e.y-3.65+Math.sin(g.time*5)*.12;r.circle(x,y,.4,'#6effd21f');r.circle(x,y,.13,'#caffee','#62e1ce',.04);
  for(const side of [-1,1]){c.beginPath();c.ellipse(x+side*.2,y-.04,.19,.1,side*.55,0,Math.PI*2);c.fillStyle='#7dffdcaa';c.fill();}
  for(let i=0;i<14;i++){const a=i*2.4,travel=(g.time*1.5+i*.13)%1,rad=6.8*(1-travel);r.line([{x:e.x+Math.cos(a)*rad,y:e.y+Math.sin(a)*rad},{x:e.x+Math.cos(a)*Math.max(0,rad-.5),y:e.y+Math.sin(a)*Math.max(0,rad-.5)}],'#88e9cba0',.05);}
  r.circle(e.x,e.y,6.8,'#64d7c30a','#78d8c577',.04);r.text(`미끼 요정 ${(fairy.until-g.time).toFixed(1)}s`,e.x,e.y-4.25,'#a4f3df',.29);
 }
}
export function preview(r,e,g){
 const angle=Math.atan2(g.input.aim.y-e.y,g.input.aim.x-e.x),d={x:Math.cos(angle),y:Math.sin(angle)},ctx=r.ctx;
 const polygon=(range,width)=>{const s={x:-d.y*width/2,y:d.x*width/2},to={x:e.x+d.x*range,y:e.y+d.y*range};r.polygon([[e.x+s.x,e.y+s.y],[to.x+s.x,to.y+s.y],[to.x-s.x,to.y-s.y],[e.x-s.x,e.y-s.y]],'#b8d8d313','#c3e8df66');};
 if(e.key==='queequeg')polygon(g.attackRange(e),1.8);
 if(e.key==='rudolph'){const len=Math.min(g.attackRange(e),Math.hypot(g.input.aim.x-e.x,g.input.aim.y-e.y));r.circle(e.x+d.x*len,e.y+d.y*len,2.1675,'#ffb56813','#ffb56888',.045);}
 if(e.key==='hohenheim'){const shape=Hohenheim.chargeShape(g,e,g.input.aim);polygon(shape.range,shape.width*2);}
 if(dashBasic(g,e)){
  const len=e.key==='myo'?g.attackRange(e):dashLength(e,{don:2,rodya:2.4,starbuck:2.875,gregor:2.5}[e.key]||g.attackRange(e));
  polygon(len,({don:.72,gregor:1.08}[e.key]||.6)*2*1.2);
 }
 const cones={sinclair:1.6,ryoshu:1.7,heathcliff:1.7,ishmael:1.6,rodya:2.16,gregor:g.buff(e,'mutant')?1.8*1.3*1.2:1.8,gahwan:.85,nelly:1.2,dongbaek:1.3,dongrang:1.9,alisa:1.1,kim:e.state.followSlashUntil>g.time?1.9*1.3*1.2*1.08:1.2*1.3,starbuck:.975*1.2};
 if(cones[e.key]){const range=g.attackRange(e)*(e.key==='kim'&&e.state.followSlashUntil>g.time?1.2*1.08:1);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,range,angle-cones[e.key]/2,angle+cones[e.key]/2);ctx.closePath();ctx.fillStyle='#bddfd20b';ctx.fill();ctx.strokeStyle='#bddfd255';ctx.lineWidth=.035;ctx.stroke();}

 if(e.key==='marton'){r.circle(e.x,e.y,2.5,null,'#dbcba999',.04);r.circle(e.x,e.y,g.attackRange(e),null,'#a4ce9477',.04);r.text('근접 2.5 · 뿌리 시전 5',e.x,e.y+1.8,'#c9ddba',.24);const dx=g.input.aim.x-e.x,dy=g.input.aim.y-e.y,len=Math.hypot(dx,dy);if(len>=2.5){const cap=Math.min(g.attackRange(e),len);r.circle(e.x+dx/(len||1)*cap,e.y+dy/(len||1)*cap,2.2,'#b5cf8f0e','#b5cf8f77',.045);}}
 if(e.key==='meursault'){const a=e.facing||0,d={x:Math.cos(a),y:Math.sin(a)},s={x:-d.y*1.3,y:d.x*1.3},end={x:e.x+d.x*g.attackRange(e),y:e.y+d.y*g.attackRange(e)};r.polygon([[e.x+s.x,e.y+s.y],[end.x+s.x,end.y+s.y],[end.x-s.x,end.y-s.y],[e.x-s.x,e.y-s.y]],'#c2d5e90b','#c2d5e95a');}
}
export function effect(r,fx,g){
 const c=r.ctx,t=1-fx.life/fx.maxLife;
 if(fx.type==='ishmaelShock'){const e=g.units.find(e=>e.id===fx.source);if(!e?.alive)return;for(let i=0;i<3;i++)r.circle(e.x,e.y,fx.r*Math.min(1,t+i*.15),null,'#b7e7f2',.11*(1-t)+.025);return;}
 if(fx.type==='ryoshuTrail'){const dx=fx.to.x-fx.x,dy=fx.to.y-fx.y,a=Math.atan2(dy,dx);for(const side of [-1,1])r.line([{x:fx.x-Math.cos(a+.5*side)*.65,y:fx.y-Math.sin(a+.5*side)*.65},{x:fx.to.x+Math.cos(a+.5*side)*.65,y:fx.to.y+Math.sin(a+.5*side)*.65}],'#f4b1a7',.09);return;}
 if(fx.type==='ryoshuStorm'){const owner=g.units.find(e=>e.id===fx.source&&e.alive);if(owner)fx={...fx,x:owner.x,y:owner.y};r.circle(fx.x,fx.y,fx.r,'#dc574712','#f0b09a66',.035);for(let i=0;i<15;i++){const a=i*2.4+t*3,rad=fx.r*(.2+(i%5)*.15),x=fx.x+Math.cos(a)*rad,y=fx.y+Math.sin(a)*rad;const fire=Math.sin(t*25+i);r.polygon([[x-.12,y+.15],[x-.2,y-.05],[x+fire*.1,y-.6],[x+.18,y+.1]],i%2?'#e66736aa':'#ffb66cbb');if(i%2===0)r.line([{x:x-.4,y:y-.35},{x:x+.4,y:y+.35}],'#ffe0c0',.07);}return;}
 if(fx.type==='martonExplosion'){for(let i=0;i<3;i++){const phase=Math.max(0,t-i*.13);r.circle(fx.x,fx.y,fx.r*phase,null,i?'#8ddfd299':'#cfffe9',.18*(1-t)+.03);}return;}
}
export function meter(r,e,g){
 const m=metric(g,e);if(!m)return;const healing=m.kind==='healing',labels=healing?['초당 치유량','총 치유량','마지막 치유기 치유량']:['초당 피해량','총 피해량','마지막 공격 피해량'],values=[m.perSecond,m.total,m.last],c=r.ctx;
 c.save();c.fillStyle='#102123e8';c.fillRect(e.x-1.95,e.y-5.7,3.9,1.35);c.strokeStyle=healing?'#7fbcb0':'#c49382';c.lineWidth=.025;c.strokeRect(e.x-1.95,e.y-5.7,3.9,1.35);
 values.forEach((v,i)=>r.text(`${labels[i]} ${Math.round(v).toLocaleString('ko-KR')}`,e.x,e.y-5.45+i*.4,healing?'#b5ecda':'#f2c6b8',.23));c.restore();
}
