import{FAIRY_FRAME}from'./fairy-sprites.js';
export const FAIRY_COLORS={main:'#02ebf7',light:'#c8ffff',dark:'#0e5967'};
let image;
export function fairyImage(){if(typeof Image==='undefined')return null;if(image)return image;image=new Image();const embedded=document.getElementById('fairy-data-v58');image.src=embedded?JSON.parse(embedded.textContent):'./src/assets/fairy-v58.png';return image;}
export function drawMartonFairy(c,time,size=1){
 const a=fairyImage();if(!a?.complete||!a.naturalWidth)return false;const f=FAIRY_FRAME,w=.88*size,h=w*f.h/f.w;c.save();c.imageSmoothingEnabled=false;
 const glow=c.createRadialGradient(0,0,0,0,0,size*.65);glow.addColorStop(0,'#75fff557');glow.addColorStop(.4,'#02ebf723');glow.addColorStop(1,'#02ebf700');c.fillStyle=glow;c.fillRect(-size*.65,-size*.65,size*1.3,size*1.3);
 c.drawImage(a,f.x,f.y,f.w,f.h,-w/2,-h/2,w,h);
 c.globalCompositeOperation='lighter';for(let i=0;i<7;i++){const angle=i*2.4+time*.65,radius=(.36+(i%3)*.09)*size,x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*.75,pulse=Math.max(0,Math.sin(time*4.2+i*1.7));if(pulse<.15)continue;const r=(.018+.035*pulse)*size;c.globalAlpha=.25+.65*pulse;c.fillStyle=FAIRY_COLORS.light;c.beginPath();c.moveTo(x-r,y);c.lineTo(x,y-r*1.7);c.lineTo(x+r,y);c.lineTo(x,y+r*1.7);c.closePath();c.fill();}c.restore();return true;
}
