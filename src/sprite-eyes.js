export const eyeGlowPoints=(frame,{left,top,w,h})=>(frame.eyes||[]).map(([x,y])=>({x:left+x/frame.w*w,y:top+y/frame.h*h}));
export function drawEyeGlow(c,frame,rect,time){
 c.save();c.globalCompositeOperation='lighter';const pulse=.8+.2*Math.sin(time*14),alpha=c.globalAlpha;
 for(const p of eyeGlowPoints(frame,rect)){
  const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,.115);glow.addColorStop(0,'#ff3644');glow.addColorStop(.35,'#f51835b0');glow.addColorStop(1,'#d4072400');c.globalAlpha=alpha*.8*pulse;c.fillStyle=glow;c.fillRect(p.x-.115,p.y-.115,.23,.23);
  c.globalAlpha=alpha*pulse;c.fillStyle='#ff4250';c.fillRect(p.x-.035,p.y-.018,.07,.036);c.fillStyle='#ffd2cc';c.fillRect(p.x-.012,p.y-.012,.024,.024);
 }c.restore();
}
