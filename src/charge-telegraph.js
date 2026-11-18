// A fixed attack boundary with an expanding inner arc shows charge progress.
export function drawChargeFan(c,camera,area,progress,{height=.12,fill='#9c15301c',border='#e44966b0',wave='#ff3e6077'}={}){
 const at=camera.worldToScreen(area,height),x=camera.worldToScreen({x:area.x+1,y:area.y},height),y=camera.worldToScreen({x:area.x,y:area.y+1},height),half=area.spread/2;
 c.save();c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);c.rotate(area.angle);
 c.beginPath();c.moveTo(0,0);c.arc(0,0,area.range,-half,half);c.closePath();c.fillStyle=fill;c.fill();c.clip();c.strokeStyle=border;c.lineWidth=.035;c.stroke();
 c.beginPath();c.arc(0,0,area.range*Math.max(0,Math.min(1,progress)),-half,half);c.strokeStyle=wave;c.lineWidth=.04;c.stroke();c.restore();
}
