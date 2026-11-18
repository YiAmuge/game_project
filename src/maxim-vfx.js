import {maximUltimateArea} from './maxim-data.js';
import {drawChargeFan} from './charge-telegraph.js';
const ground=(camera,x,y,h=0)=>camera.worldToScreen({x,y},h);
const path=(c,camera,points)=>{c.beginPath();points.forEach((p,i)=>{const q=ground(camera,p.x,p.y);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});};
const fanArc=(a,r,reverse=false)=>Array.from({length:41},(_,i)=>{const angle=a.angle-a.spread/2+a.spread*(reverse?40-i:i)/40;return{x:a.x+Math.cos(angle)*r,y:a.y+Math.sin(angle)*r};});
function shockwave(c,camera,f,t){
 const a=f.area||{x:f.x,y:f.y,angle:f.angle,range:f.r,spread:f.spread};
 // The complete hit fan is fixed from the first frame. Only the wavefront moves.
 path(c,camera,[{x:a.x,y:a.y},...fanArc(a,a.range)]);c.closePath();c.clip();
 c.fillStyle='#ff9f3028';c.fill();c.strokeStyle='#ffb347d0';c.lineWidth=2;c.stroke();
 const wave=a.range*Math.min(1,t*2.7),inner=Math.max(0,wave-.35);
 path(c,camera,[...fanArc(a,wave),...fanArc(a,inner,true)]);c.closePath();c.shadowColor='#ff9c34';c.shadowBlur=9;c.fillStyle='#ffad4270';c.fill();
 for(let ray=0;ray<9;ray++){
  const angle=a.angle-a.spread*.47+a.spread*.94*ray/8,points=[];
  for(let i=0;i<=9;i++){const r=a.range*i/9,bend=angle+Math.sin(i*7.9+ray*3)*.025;points.push({x:a.x+Math.cos(bend)*r,y:a.y+Math.sin(bend)*r});}
  path(c,camera,points);c.strokeStyle=ray%2?'#b96522aa':'#ffb34ddd';c.lineWidth=ray%2?2:1.5;c.stroke();
 }
 for(let bolt=0;bolt<7;bolt++){
  const angle=a.angle-a.spread*.45+a.spread*.9*bolt/6,points=[];
  for(let i=0;i<10;i++){const r=a.range*i/9,bend=angle+Math.sin(i*17+bolt*9+Math.floor(t*20))*.045;points.push({x:a.x+Math.cos(bend)*r,y:a.y+Math.sin(bend)*r});}
  path(c,camera,points);c.strokeStyle=bolt%2?'#ff8c32cc':'#ffd28bee';c.lineWidth=1.2;c.stroke();
 }
}
export function drawMaximScene(c,camera,g){
 for(const e of g.champions())if(e.key==='maxim'&&e.alive&&e.state.maximR&&g.visibleTo(g.player.team,e)&&!g.hidden(e)){
  const r=e.state.maximR;drawChargeFan(c,camera,maximUltimateArea(e,r.angle),(g.time-r.at)/(r.until-r.at),{height:0,fill:'#f5a13a1c',border:'#ffb347b0',wave:'#ff9f3077'});
 }
 for(const f of g.effects){
  if(!f.type?.startsWith('maxim')||f.life<=0)continue;
  const owner=g.units.find(e=>e.id===f.source);if(owner&&!g.visibleTo(g.player.team,owner))continue;
  const t=Math.min(1,Math.max(0,1-f.life/f.maxLife)),fade=1-t;
  c.save();c.globalAlpha=fade;c.lineCap='round';
  if(f.type==='maximEarth')shockwave(c,camera,f,t);
  else if(f.type==='maximImpact'||f.type==='maximDust'){
   const radius=(f.r||1)*(.3+.7*t),points=[];
   for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;points.push({x:f.x+Math.cos(a)*radius,y:f.y+Math.sin(a)*radius});}
   if(f.type==='maximImpact'){path(c,camera,points);c.strokeStyle='#edb368a0';c.lineWidth=2;c.stroke();}
   for(let i=0;i<14;i++){const a=i*2.4,r=radius*(.4+(i%3)*.2),at=ground(camera,f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,.1+Math.sin(t*Math.PI)*.35);c.fillStyle=i%3?'#665449aa':'#f9b758bb';c.fillRect(at.x,at.y,2+(i%3),2+(i%3));}
  }
  c.restore();
 }
}
