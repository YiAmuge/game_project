// Only the 3D scenery uses this budget. Canvas characters and HUD remain sharp.
export function sceneryPixelRatio(width,height,dpr=1){return Math.min(dpr,1,Math.sqrt(921600/Math.max(1,width*height)));}

// Original 2D art uses a different local feet coordinate for each body type.
// Project the ground first, then draw the upright art from that feet coordinate.
export function feetOffset(e){
 if(e.trainingDummy)return .37;
 if(e.kind==='champion')return .325;
 if(e.kind==='neutral')return e.camp==='boss'?1.04:.65;
 if(e.kind==='minion')return e.siege?.39:e.ranged?.28:.3;
 if(e.kind==='bait')return .67;
 if(e.kind==='summon')return 1.1;
 return .35;
}
export function projectFeet(camera,e){
 const point=camera.worldToScreen(e,.075);
 return {x:point.x,y:point.y,offset:feetOffset(e),scale:camera.scale};
}
export function sceneryPan(camera,anchor){
 const a=camera.worldToScreen(anchor),b=camera.worldToScreen({x:camera.x,y:camera.y});return {x:a.x-b.x,y:a.y-b.y};
}

// Convex silhouette of a scenery box in screen space, used only to mask floor
// effects. Character art is drawn afterwards and cannot be cut by this mask.
export function sceneryOutline(camera,{x,y,w,h,height}){
 const points=[];for(const px of [x,x+w])for(const py of [y,y+h])for(const z of [0,height])points.push(camera.worldToScreen({x:px,y:py},z));
 points.sort((a,b)=>a.x-b.x||a.y-b.y);
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),half=items=>{const out=[];for(const p of items){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 const lower=half(points),upper=half([...points].reverse());return [...lower.slice(0,-1),...upper.slice(0,-1)];
}

export function leapLift(e){const m=e.motion;if(m?.kind!=='leap')return 0;const duration=Math.max(.01,m.minDuration||m.total/m.speed);return Math.sin(Math.PI*Math.min(1,m.elapsed/duration))*(m.arcHeight||1.1);}
