import {FRAMES} from './art.js';
export function drawDenisBody(r,c,g,e,atlas,f,{left,top,w,h}){
 if(e.key==='denis'&&(e.state.denisBurst||e.state.denisExpressionUntil>g.time))for(const key of ['denisEye','denisMouth']){const p=FRAMES[key];c.drawImage(atlas,p.x,p.y,p.w,p.h,left+p.bodyOffset[0]*w/f.w,top+p.bodyOffset[1]*h/f.h,p.w*w/f.w,p.h*h/f.h);}
 if(e.visuals?.denisIce>g.time&&r.skillVfx){c.save();c.globalCompositeOperation='screen';c.globalAlpha*=.22;c.drawImage(r.skillVfx.tintFrame(atlas,f,'#a9e7ff'),left,top,w,h);c.restore();}
}
export function drawDenisScene(c,camera,g){
 for(const f of g.effects)if(f.type==='denisCold'){
  const t=g.units.find(t=>t.id===f.target)||f;if(!g.visibleTo(g.player.team,t))continue;const p=camera.worldToScreen(t,1),age=1-f.life/f.maxLife;c.save();c.translate(p.x,p.y);c.globalAlpha=(1-age)*.85;c.strokeStyle='#bdefff';c.shadowColor='#69cfff';c.shadowBlur=12;c.lineWidth=2;
  for(let i=0;i<10;i++){const a=i*Math.PI/5+age*.4,r=camera.scale*(.65+age*.6),x=Math.cos(a)*r,y=Math.sin(a)*r*.7;c.beginPath();c.moveTo(x,y-6);c.lineTo(x+3,y);c.lineTo(x,y+6);c.lineTo(x-3,y);c.closePath();c.stroke();}c.restore();
 }
}
