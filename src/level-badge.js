import{RULES}from'./data.js';
export function levelProgress(e){
 if(e.level>=RULES.maxLevel)return 1;
 const start=RULES.xp[e.level-1]||0,end=RULES.xp[e.level]||start+1;
 return Math.max(0,Math.min(1,((e.xp||0)-start)/(end-start)));
}
export function drawLevelBadge(r,e,barX,barY,g){
 const c=r.ctx,x=barX-.61,y=barY-.06,w=.49,h=.46,cx=x+w/2,cy=y+h/2,progress=levelProgress(e),color=e.player?'#efd39a':e.team===(g?.player?.team??0)?'#79bbc9':'#d7877e';
 c.save();c.fillStyle='#12242b';c.fillRect(x,y,w,h);c.strokeStyle='#46565c';c.lineWidth=.035;c.strokeRect(x,y,w,h);
 const points=[[cx,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y],[cx,y]];let length=progress*2*(w+h);c.beginPath();c.moveTo(cx,y);
 for(let i=1;i<points.length&&length>0;i++){const a=points[i-1],b=points[i],distance=Math.hypot(b[0]-a[0],b[1]-a[1]),fraction=Math.min(1,length/distance);c.lineTo(a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction);length-=distance;}
 c.strokeStyle=color;c.lineWidth=.045;if(progress>0)c.stroke();
 // Measure at a normal font size: sub-pixel font metrics are rounded before the world's scale is applied.
 c.translate(cx,cy);c.scale(.27/100,.27/100);c.fillStyle='#fff0cd';c.font='bold 100px Arial';c.textAlign='left';c.textBaseline='alphabetic';const text=String(e.level),m=c.measureText(text);
 c.fillText(text,((m.actualBoundingBoxLeft||0)-(m.actualBoundingBoxRight??m.width))/2,((m.actualBoundingBoxAscent??73)-(m.actualBoundingBoxDescent||0))/2);c.restore();
}
