import { FRAMES,loadAtlas,drawFace } from './art.js';
import { BOSS_FRAMES } from './boss-sprites.js';
import { NEEDLE_FRAMES } from './needle-sprites.js';
export function drawPingIcon(c,item,x,y,size,team=0){
 const color=item.team===2?'#d9bc82':item.team===undefined?'#c6d9e6':item.team===team?'#4eacff':'#ff5d66';
 c.save();c.translate(x,y);const frame=()=>{c.beginPath();if(item.type==='lane')c.rect(size*.03,size*.03,size*.94,size*.94);else c.arc(size/2,size/2,size*.47,0,Math.PI*2);};frame();c.fillStyle='#101b28';c.fill();c.save();c.clip();c.imageSmoothingEnabled=false;
 if(item.type==='champion'){
  const f=FRAMES[item.key];if(f)drawFace(c,item.key,loadAtlas(f.sheet||0),size*.05,size*.05,size*.9);
 }else if(item.type==='boss'){
  const king=item.camp==='sewingKing',f=king?NEEDLE_FRAMES.sewingKingIdle:BOSS_FRAMES.heapedIdle,a=loadAtlas(f.sheet),face=king?[.33,.245,.35,.275]:[.38,.04,.39,.35];
  if(a.complete&&a.naturalWidth)c.drawImage(a,f.x+f.w*face[0],f.y+f.h*face[1],f.w*face[2],f.h*face[3],size*.06,size*.06,size*.88,size*.88);
 }else if(item.type==='core'){
  c.strokeStyle=color;c.fillStyle=item.team===team?'#244c80':'#6b263d';c.lineWidth=size*.04;for(const r of [.36,.27]){c.beginPath();c.arc(size/2,size/2,size*r,0,Math.PI*2);c.fill();c.stroke();}c.beginPath();c.moveTo(size*.5,size*.24);c.lineTo(size*.72,size*.5);c.lineTo(size*.5,size*.76);c.lineTo(size*.28,size*.5);c.closePath();c.fillStyle=color;c.fill();
 }else if(item.type==='lane'){
  const top=item.lane==='top',cy=top?.60:.36;c.fillStyle='#38586d';c.strokeStyle='#a6cede';c.lineWidth=size*.025;c.beginPath();c.moveTo(size*.25,size*(cy+.19));c.lineTo(size*.29,size*(cy-.12));c.lineTo(size*.36,size*(cy-.25));c.lineTo(size*.64,size*(cy-.25));c.lineTo(size*.71,size*(cy-.12));c.lineTo(size*.75,size*(cy+.19));c.closePath();c.fill();c.stroke();c.fillStyle='#c9e5ed';c.fillRect(size*.42,size*(cy-.16),size*.16,size*.25);c.font=`bold ${size*.21}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(top?'TOP':'BOT',size*.5,size*(top?.19:.81));
 }else{
  c.strokeStyle=item.type==='danger'?'#ff6774':item.type==='attack'?'#ffab72':'#90dcff';c.fillStyle=c.strokeStyle;c.lineWidth=size*.065;c.lineCap='round';
  if(item.type==='danger'){c.beginPath();c.moveTo(size*.5,size*.22);c.lineTo(size*.5,size*.55);c.stroke();c.beginPath();c.arc(size*.5,size*.73,size*.045,0,Math.PI*2);c.fill();}
  else if(item.type==='defend'){c.beginPath();c.moveTo(size*.5,size*.2);c.lineTo(size*.75,size*.32);c.lineTo(size*.69,size*.63);c.lineTo(size*.5,size*.8);c.lineTo(size*.31,size*.63);c.lineTo(size*.25,size*.32);c.closePath();c.stroke();}
  else for(const side of [-1,1]){c.beginPath();c.moveTo(size*(.5-side*.24),size*.75);c.lineTo(size*(.5+side*.24),size*.25);c.stroke();}
 }
 c.restore();c.strokeStyle=color;c.lineWidth=size*.05;frame();c.stroke();c.restore();
}
export function paintPingIcon(canvas,item,team){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);drawPingIcon(c,item,0,0,canvas.width,team);const sheet=item.type==='champion'?FRAMES[item.key]?.sheet:item.type==='boss'?item.camp==='boss'?14:13:null;if(sheet!==null&&sheet!==undefined){const a=loadAtlas(sheet);if(!a.complete)a.addEventListener('load',()=>paintPingIcon(canvas,item,team),{once:true});}}
