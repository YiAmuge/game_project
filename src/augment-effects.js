import{has,resentment}from'./augments.js';
import{leapLift,levitationLift}from'./projection-25d.js';
const frames={butterflyWhite:{x:0,y:0,w:128,h:128},butterflyBlack:{x:128,y:0,w:128,h:128},resentment:{x:256,y:0,w:128,h:128}};
export const AUGMENT_FX={butterflies:5,butterflyRadius:1.15,antimatterRadius:1.6,antimatterParticles:24};
let atlas;const layers=new WeakMap();
export function effectAtlas(){if(!atlas){atlas=new Image();const embedded=document.getElementById('augment-effects-data-v71');atlas.src=embedded?JSON.parse(embedded.textContent):'./src/assets/augment-effects-v71.png';}return atlas;}
const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function mourningButterflies(g,e){
 if(!e.alive||!has(e,'reloadStacks')||(e.state.augReloadStacks||0)<5)return[];
 return Array.from({length:AUGMENT_FX.butterflies},(_,i)=>{const duration=.85+random(e.id*13+i)*.55,clock=g.time/duration+i*.213,cycle=Math.floor(clock),phase=clock-cycle,seed=e.id*937+i*53+cycle*197,a=random(seed)*Math.PI*2,r=.35+random(seed+1)*.8;return{x:Math.cos(a)*r,y:Math.sin(a)*r,height:.35+random(seed+2)*1.85,angle:random(seed+3)*Math.PI*2,alpha:Math.sin(phase*Math.PI)**2*.9,size:.30+random(seed+4)*.14,frame:i%2?'butterflyBlack':'butterflyWhite'};});
}
export function antimatterParticles(g,e){
 if(!e.alive||!has(e,'antimatter'))return[];
 return Array.from({length:AUGMENT_FX.antimatterParticles},(_,i)=>{const seed=e.id*97+i*43,a=random(seed)*Math.PI*2+Math.sin(g.time*.7+i)*.04,r=Math.sqrt(random(seed+1))*(AUGMENT_FX.antimatterRadius-.04);return{x:Math.cos(a)*r,y:Math.sin(a)*r,height:.06+.08*(1+Math.sin(g.time*1.3+i)),alpha:.13+.18*(.5+.5*Math.sin(g.time*2.1+i*1.7)),size:.018+.016*random(seed+2),color:i%2?'#626dff':'#ac6aff'};});
}
export function drawPassiveAugmentGround(c,camera,g){
 for(const e of g.champions())if(e.alive&&!g.hidden(e)&&g.visibleTo(0,e)){const particles=antimatterParticles(g,e);if(!particles.length)continue;c.save();c.globalCompositeOperation='lighter';for(const f of particles){const p=camera.worldToScreen({x:e.x+f.x,y:e.y+f.y},f.height),size=Math.max(.65,camera.scale*f.size);c.globalAlpha=f.alpha;c.fillStyle=f.color;c.shadowColor=f.color;c.shadowBlur=3;c.beginPath();c.arc(p.x,p.y,size,0,Math.PI*2);c.fill();}c.restore();}
}
export function drawPassiveAugmentFront(c,camera,g){
 const im=effectAtlas();if(!im.complete||!im.naturalWidth)return;
 for(const e of g.champions())if(e.alive&&!g.hidden(e)&&g.visibleTo(0,e)){const particles=mourningButterflies(g,e);if(!particles.length)continue;c.save();c.imageSmoothingEnabled=false;for(const p of particles){const at=camera.worldToScreen({x:e.x+p.x,y:e.y+p.y},p.height+leapLift(e)+levitationLift(g,e)),f=frames[p.frame],size=camera.scale*p.size;c.save();c.translate(at.x,at.y);c.rotate(p.angle);c.globalAlpha=p.alpha;c.shadowColor=p.frame==='butterflyBlack'?'#d7dbec':'#ffffff';c.shadowBlur=5;c.drawImage(im,f.x,f.y,f.w,f.h,-size/2,-size/2,size,size);c.restore();}c.restore();}
}
function tattooLayer(f,body){
 const im=effectAtlas();if(!im.complete||!im.naturalWidth)return null;let cache=layers.get(body);if(!cache){cache=new Map();layers.set(body,cache);}const key=[f.x,f.y,f.w,f.h].join('/');if(cache.has(key))return cache.get(key);
 const layer=document.createElement('canvas');layer.width=f.w;layer.height=f.h;const c=layer.getContext('2d'),glyph=frames.resentment;
 for(const [x,y,scale,angle]of [[.33,.56,.32,-.25],[.65,.64,.28,.35],[.38,.85,.25,-.4],[.68,.89,.23,.5]]){const size=f.w*scale;c.save();c.translate(f.w*x,f.h*y);c.rotate(angle);c.drawImage(im,glyph.x,glyph.y,glyph.w,glyph.h,-size/2,-size*.65,size,size*1.3);c.restore();}
 c.globalCompositeOperation='destination-in';c.drawImage(body,f.x,f.y,f.w,f.h,0,0,f.w,f.h);cache.set(key,layer);return layer;
}
// Called inside the body's own mirrored, lifted sprite transform. The original
// purple icon motif is masked by body alpha so it cannot spill onto the weapon.
export function drawResentmentBody(c,g,e,f,body,rect){
 if(resentment(e)<.2-1e-8)return false;const layer=tattooLayer(f,body);if(!layer)return false;c.save();c.globalCompositeOperation='screen';c.globalAlpha*=.62+.18*Math.sin(g.time*3.6+e.id);c.shadowColor='#a15bff';c.shadowBlur=5;c.drawImage(layer,rect.left,rect.top,rect.w,rect.h);c.restore();return true;
}
