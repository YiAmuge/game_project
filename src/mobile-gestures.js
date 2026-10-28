export const HOLD=180;
// A short touch always autoaims, even if the finger slides across the button.
// Once a continuous auto gesture is chosen, later finger motion cannot steer it.
export function gestureMode(s,now,continuous=false){
 if(s.autoLocked||s.autoHeld)return 'auto';
 if(now-s.at<HOLD)return 'tap';
 if(s.manual||Math.hypot(s.x-s.startX,s.y-s.startY)>12)return 'manual';
 if(continuous)s.autoLocked=true;
 return 'auto';
}
export function targetButtonPositions(rect,kinds){
 const radius=78,cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
 return kinds.map((kind,i)=>{const angle=(kinds.length===1?270:235+90*i/(kinds.length-1))*Math.PI/180;return{kind,x:cx+Math.sin(angle)*radius,y:cy-Math.cos(angle)*radius};});
}
