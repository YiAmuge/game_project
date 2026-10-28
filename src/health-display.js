// Render-only state: damage remains immediate in the simulation.
const states=new WeakMap();
export function healthTrail(e,time){
 const hp=Math.max(0,Math.min(1,e.hp/e.maxHp));let s=states.get(e);
 if(!s||time<s.time||!e.alive){s={hp,trail:hp,at:time,time};states.set(e,s);return hp;}
 const dt=Math.max(0,time-s.time);if(hp<s.hp-1e-8){s.trail=Math.max(s.trail,s.hp);s.at=time;}
 if(hp>s.hp)s.trail=Math.max(hp,s.trail);
 if(time-s.at>.16)s.trail=Math.max(hp,s.trail-(s.trail-hp)*(1-Math.exp(-dt*9))-dt*.045);
 s.hp=hp;s.time=time;return Math.max(hp,s.trail);
}
export function paintHealth(c,e,g,x,y,width,height,color){
 const shield=g.shield(e),total=Math.max(e.maxHp,e.hp+shield),trail=healthTrail(e,g.time)*e.maxHp/total;
 c.fillStyle='#081317';c.fillRect(x,y,width,height);c.fillStyle='#d8aaa4';c.fillRect(x,y,width*trail,height);
 c.fillStyle=color;c.fillRect(x,y,width*Math.max(0,e.hp/total),height);
 if(shield){c.fillStyle='#d9e5df';c.fillRect(x+width*e.hp/total,y,width*Math.min(shield/total,1-e.hp/total),height);}
 const m=c.getTransform?.(),scale=Math.hypot(m?.a??1,m?.b??0)||1,ticks=healthTicks(total,width*scale);
 c.save();c.lineWidth=1/scale;
 for(const tick of ticks){const px=x+width*tick.ratio;c.strokeStyle=tick.major?'#071019dd':'#07101988';c.beginPath();c.moveTo(px,y+(tick.major?0:height*.45));c.lineTo(px,y+height);c.stroke();}
 c.restore();
}
export function healthTicks(total,widthPixels){
 if(!(total>0)||widthPixels<6)return [];
 const step=[100,200,250,500,1000,2000,5000,10000].find(n=>widthPixels*n/total>=3)||Math.ceil(3*total/widthPixels/1000)*1000;
 const out=[];for(let value=step;value<total;value+=step)out.push({ratio:value/total,value,major:value%(step*5)===0});return out;
}
