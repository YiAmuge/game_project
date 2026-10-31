// Local billboard effects share the champion's feet, leap height and scale.
const tau=Math.PI*2;
const active=(g,records)=>Object.values(records||{}).filter(m=>(typeof m==='number'?m:m.until)>g.time);
export function debuffBadges(g,e){
 const badges=[],state=e.state||{};
 if(active(g,state.gaze).some(m=>m.n>0))badges.push({kind:'gaze',size:.30,color:'#f6cd48',border:'#080a0c'});
 if(active(g,state.contempt).length)badges.push({kind:'contempt',size:.42,color:'#ffd19a',border:'#e33b42'});
 if(Object.values(state.mentalWhip||{}).some(m=>m.stage>0))badges.push({kind:'whip',size:.32,color:'#ff9b32',border:'#21100a'});
 return badges;
}
export function drawDebuffBadges(r,e,g,head){
 const c=r.ctx,badges=debuffBadges(g,e);
 for(const [i,b]of badges.entries()){
  c.save();c.translate(e.x+.65+i*.85,head-.13);c.lineWidth=b.kind==='contempt'?.055:.03;c.strokeStyle=b.border;c.fillStyle=b.color;
  if(b.kind==='whip'){
   c.beginPath();for(const [i,[x,y]]of [[-.02,-.34],[-.23,.05],[-.02,.01],[-.08,.33],[.25,-.09],[.05,-.04]].entries())i?c.lineTo(x,y):c.moveTo(x,y);c.closePath();c.fill();c.stroke();
  }else{
   c.beginPath();c.moveTo(-b.size,0);c.quadraticCurveTo(0,-b.size*.95,b.size,0);c.quadraticCurveTo(0,b.size*.95,-b.size,0);c.fill();c.stroke();
   c.fillStyle='#141312';c.beginPath();c.ellipse(0,0,b.size*.29,b.size*.45,0,0,tau);c.fill();c.fillStyle='#fff2c2';c.beginPath();c.arc(-b.size*.08,-b.size*.13,b.size*.11,0,tau);c.fill();
  }
  c.restore();
 }
}
function petal(c,x,y,angle,size,color){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.beginPath();c.moveTo(0,-size);c.bezierCurveTo(size,-size*.3,size*.7,size*.7,0,size*.65);c.bezierCurveTo(-size*.7,size*.5,-size,-size*.4,0,-size);c.fill();c.restore();}
export function blueEmberPulse(c,age,seed){
 const t=Math.max(0,Math.min(1,age/.28));c.save();c.globalCompositeOperation='lighter';c.globalAlpha*=1-t;
 const glow=c.createRadialGradient(0,-1.05,0,0,-1.05,.72);glow.addColorStop(0,'#d8f8ff');glow.addColorStop(.15,'#52baffbb');glow.addColorStop(1,'#1259ff00');c.fillStyle=glow;c.fillRect(-.72,-1.77,1.44,1.44);
 c.lineCap='round';for(let i=0;i<12;i++){const a=i*2.399+seed*.7,r=.08+t*(.5+i%3*.14),x=Math.cos(a)*r,y=-1.05+Math.sin(a)*r-t*.25;c.strokeStyle=i%3?'#389cff':'#d9f6ff';c.shadowColor='#2e8dff';c.shadowBlur=13;c.lineWidth=i%3?.045:.065;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*.14,y+Math.sin(a)*.14-.09);c.stroke();}c.restore();
}
export function drawBodyAdditions(c,e,g,front){
 const time=g.time,state=e.state||{};
 if(!front&&g.buff(e,'hongluCare')){
  c.save();c.strokeStyle='#8ee7e5';c.lineWidth=.045;c.globalAlpha*=.7;
  for(let i=0;i<3;i++){const t=(time*.65+i/3)%1;c.globalAlpha=.65*(1-t);c.beginPath();c.ellipse(0,-.14,Math.max(.01,t*1.2),Math.max(.01,t*.26),0,0,tau);c.stroke();}c.restore();
 }
 if(front&&g.buff(e,'ppuiMending')){
  c.save();c.shadowColor='#b52c52';c.shadowBlur=7;
  for(let i=0;i<18;i++){const a=time*1.7+i*2.399,r=.65+(i%4)*.13;petal(c,Math.cos(a)*r,-.9+Math.sin(a)*.65,a+time,.08+i%3*.025,i%3?'#c73d60':'#ffadb8');}c.restore();
 }
 if(front&&state.swordHeldBy)for(const f of g.effects)if(f.type==='kimEmbers'&&f.target===e.id)blueEmberPulse(c,f.maxLife-f.life,f.at||0);
 if(front&&(e.burn?.until>time||e.key==='alisa'&&(state.heat||0)>0)){
  c.save();const intensity=e.burn?.until>time?1:Math.min(1,state.heat/5);c.globalAlpha*=intensity;c.globalCompositeOperation='lighter';const glow=c.createRadialGradient(0,-1,0,0,-1,1.5);glow.addColorStop(0,'#ffb03f55');glow.addColorStop(.5,'#ee3f202d');glow.addColorStop(1,'#a50e1600');c.fillStyle=glow;c.fillRect(-1.5,-2.5,3,3);c.shadowColor='#f75325';c.shadowBlur=14;
  for(let i=0;i<10;i++){const t=(time*(1.1+i%3*.1)+i*.137)%1,x=Math.sin(i*2.4+t*3)*(.3+i%3*.17),y=-.15-t*1.9,w=(.12+(1-t)*.17)*.8,h=(.32+(1-t)*.55)*.8;c.globalAlpha=intensity*.85*(1-t*.55);c.fillStyle=i%3?'#ed5428':'#ffcf61';c.beginPath();c.moveTo(x-w,y);c.bezierCurveTo(x-w*1.2,y-h*.4,x+w*.6,y-h*.55,x,y-h);c.bezierCurveTo(x+w*1.7,y-h*.35,x+w,y-h*.12,x+w,y);c.closePath();c.fill();}c.restore();
 }
}
