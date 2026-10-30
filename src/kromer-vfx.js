import{KROMER_WEAPON_MOTION}from'./weapon-art.js';
function nail(c,x,y,size,color,alpha=1,angle=-.3){
 c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=alpha;c.fillStyle='#0a0b0e';c.strokeStyle=color;c.lineWidth=.045;
 c.beginPath();c.moveTo(-size*.14,-size*.55);c.lineTo(size*.14,-size*.55);c.lineTo(size*.14,-size*.36);c.lineTo(size*.065,-size*.36);c.lineTo(size*.045,size*.3);c.lineTo(0,size*.5);c.lineTo(-size*.045,size*.3);c.lineTo(-size*.065,-size*.36);c.lineTo(-size*.14,-size*.36);c.closePath();c.fill();c.stroke();
 c.fillStyle=color;c.fillRect(-size*.10,-size*.52,size*.20,size*.07);c.restore();
}
function blood(c,r,x,y,t,seed,strong){
 c.save();c.translate(x,y);c.globalAlpha*=1-t;c.shadowColor='#ec2948';c.shadowBlur=strong?15:9;
 const radius=(strong?.85:.65)+t*.4,light=c.createRadialGradient(0,0,0,0,0,radius);light.addColorStop(0,'#ffbfad');light.addColorStop(.13,'#ff3155cc');light.addColorStop(.4,'#bb102b88');light.addColorStop(1,'#65041500');c.globalCompositeOperation='lighter';c.fillStyle=light;c.fillRect(-radius,-radius,radius*2,radius*2);c.globalCompositeOperation='source-over';
 for(let i=0;i<(strong?14:10);i++){const a=i*2.399+seed,d=.07+t*(.65+i%3*.16),px=Math.cos(a)*d,py=Math.sin(a)*d+t*t*.3;c.strokeStyle=i%3?'#bc1735':'#ff6b77';c.lineWidth=.045+(i%3)*.018;c.lineCap='round';c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.cos(a)*(.08+t*.16),py+Math.sin(a)*(.08+t*.16));c.stroke();}
 c.restore();
}
export function drawKromerEffects(r,e,g){
 const c=r.ctx,marks=Object.values(e.state.kromerNails||{}).filter(m=>m.until>g.time),n=Math.max(0,...marks.map(m=>m.n));
 if(n===1)nail(c,e.x,e.y-1.05,.95,'#e3dbcc');
 if(n>=2){c.save();c.shadowColor='#ed3c4e';c.shadowBlur=7;nail(c,e.x,e.y-1.05,1.12,'#ed3c4e',1,-Math.PI/4);nail(c,e.x,e.y-1.05,1.12,'#ed3c4e',1,Math.PI/4);c.restore();}
 for(const owner of g.champions().filter(a=>a.key==='kromer'&&a.state.kromerQMark?.targetId===e.id&&a.state.kromerQMark.until>g.time)){const alpha=.7+.3*Math.sin(g.time*12);nail(c,e.x+.30,e.y-1,.85,'#f2ebe0',alpha);}
 for(const f of g.effects.filter(f=>f.type==='kromerNailBreak'&&f.target===e.id)){const t=1-f.life/f.maxLife;blood(c,r,e.x,e.y-1,t,f.source,true);c.save();c.globalCompositeOperation='lighter';nail(c,e.x,e.y-1,1.1+t*.3,'#fff0eb',1-t);c.restore();}
 for(const f of g.effects.filter(f=>f.type==='kromerImpale'&&f.target===e.id)){const t=1-f.life/f.maxLife,side=Math.cos(f.angle)<0?-1:1,drop=KROMER_WEAPON_MOTION.torsoDrop;blood(c,r,e.x,e.y-1.05+drop,t,f.source+f.angle,false);c.save();c.globalAlpha=1-t;r.line([{x:e.x-.4*side,y:e.y-1.3+drop},{x:e.x+.25*side,y:e.y-.55+drop}],'#ff7880',.085);c.restore();}
}
