const rand=n=>{const x=Math.sin(n*93.71)*43758.5453;return x-Math.floor(x);};
export const MEI_COLORS={main:'#ff4b20',accent:'#ffce39',dark:'#a32615'};
function flame(c,p,angle,length,width,phase){
 c.save();c.translate(p.x,p.y);c.rotate(angle);const sway=Math.sin(phase)*width*.5;
 c.fillStyle=MEI_COLORS.main;c.beginPath();c.moveTo(-length*.45,-width*.6);c.bezierCurveTo(-length*.1,-width*1.3,length*.3,sway-width*.7,length,0);c.bezierCurveTo(length*.3,sway+width*.2,length*.1,width*1.25,-length*.45,width*.6);c.quadraticCurveTo(-length*.65,0,-length*.45,-width*.6);c.fill();
 c.fillStyle=MEI_COLORS.accent;c.beginPath();c.moveTo(-length*.4,-width*.23);c.quadraticCurveTo(length*.05,-width*.48,length*.58,sway*.3);c.quadraticCurveTo(length*.05,width*.5,-length*.4,width*.23);c.closePath();c.fill();c.restore();
}
export function drawMeiScene(c,camera,g){
 for(const f of g.effects){
  if(!['meiGather','meiVortex','meiCollision','meiPunch'].includes(f.type))continue;
  const owner=g.units.find(e=>e.id===f.source);if(owner&&!g.visibleTo(g.player.team,owner))continue;
  const age=f.maxLife-f.life,progress=age/f.maxLife,alpha=Math.min(1,f.life/.12),center=f.type==='meiGather'&&owner?owner:f;
  c.save();c.globalAlpha=alpha;c.lineCap='round';c.shadowColor=MEI_COLORS.main;c.shadowBlur=12;
  if(f.type==='meiVortex'){
   const rim=[];for(let i=0;i<=48;i++){const a=i*Math.PI/24;rim.push(camera.worldToScreen({x:f.x+Math.cos(a)*f.r,y:f.y+Math.sin(a)*f.r},.08));}c.beginPath();rim.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();
   c.shadowBlur=7;
   for(let arm=0;arm<7;arm++)for(let i=0;i<10;i++){
    const u=(i+(age*9%1))/11,a=arm*Math.PI*2/7+age*15+u*2.8,r=f.r*(1-u)*(.95-.2*progress),nextU=Math.min(1,u+.04),nextA=a+.112,nextR=f.r*(1-nextU)*(.95-.2*progress),p=camera.worldToScreen({x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r},.15+u*.65),q=camera.worldToScreen({x:f.x+Math.cos(nextA)*nextR,y:f.y+Math.sin(nextA)*nextR},.15+nextU*.65);
    c.globalAlpha=alpha*(.5+.4*rand(arm*19+i));flame(c,p,Math.atan2(q.y-p.y,q.x-p.x),camera.scale*(.28+.24*rand(arm*13+i)),camera.scale*(.065+.045*rand(i+arm)),g.time*19+i*2);
   }
  }else if(f.type==='meiGather'){
   for(let i=0;i<22;i++){const a=i*Math.PI*2/22+progress*2.6,r=2*(1-progress)*(.55+rand(i)*.45),p=camera.worldToScreen({x:center.x+Math.cos(a)*r,y:center.y+Math.sin(a)*r},.6+progress*.45),q=camera.worldToScreen(center,.9);flame(c,p,Math.atan2(q.y-p.y,q.x-p.x),camera.scale*.17,camera.scale*.06,g.time*13+i);}
  }else if(f.type==='meiCollision'){
   for(let i=0;i<22;i++){const a=i*2.4+f.source,r=(.25+progress*1.6)*(.5+rand(i)*.5),p=camera.worldToScreen({x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r},.7+Math.sin(progress*Math.PI)*.8),q=camera.worldToScreen(f,.8);c.strokeStyle=i%3?MEI_COLORS.main:MEI_COLORS.accent;c.lineWidth=i%3?4:2;c.beginPath();c.moveTo(q.x+(p.x-q.x)*.65,q.y+(p.y-q.y)*.65);c.quadraticCurveTo(p.x-3,p.y-5,p.x,p.y);c.stroke();}
  }else{
   for(let i=0;i<8;i++){const a=f.angle+(rand(i+f.index*13)-.5)*1.6,r=.7+progress*.7,p=camera.worldToScreen({x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r},1+progress*.35);c.fillStyle=i%3?MEI_COLORS.main:MEI_COLORS.accent;c.beginPath();c.arc(p.x,p.y,i%3?2.2:1.2,0,Math.PI*2);c.fill();}
  }c.restore();
 }
}
