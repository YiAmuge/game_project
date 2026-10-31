// Shared exact geometry for the augment seal and the Queen's upright casting seals.
export function drawMagicCircle(c,time,{radius=1,color='#ff83c9',accent='#ffb7e0',alpha=1}={}){
 c.save();c.scale(radius,radius);c.rotate(time*.13);c.globalAlpha*=alpha;c.shadowColor=color;c.shadowBlur=8;c.strokeStyle=color;c.lineWidth=.028;
 for(const r of[.72,.96]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();}
 c.lineWidth=.022;for(let triangle=0;triangle<2;triangle++){c.beginPath();for(let i=0;i<3;i++){const a=i*Math.PI*2/3+triangle*Math.PI/3,x=Math.cos(a)*.65,y=Math.sin(a)*.65;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();}
 c.strokeStyle=accent;for(let i=0;i<8;i++){const a=i*Math.PI/4;c.save();c.translate(Math.cos(a)*.84,Math.sin(a)*.84);c.rotate(a);c.beginPath();c.moveTo(-.045,0);c.lineTo(0,-.065);c.lineTo(.045,0);c.lineTo(0,.065);c.closePath();c.stroke();c.restore();}c.restore();
}
