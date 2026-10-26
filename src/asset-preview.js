import{FRAMES,loadAtlas,portrait}from'./art.js';
import{Renderer}from'./render.js';
import{bossPresentation}from'./boss-art.js';
import{needlePresentation}from'./needle-art.js';
import{clerkPresentation}from'./clerk-art.js';
import{minionPresentation}from'./minion-art.js';
const activePreviews=new WeakMap();
export function preview(canvas,spec){
 if(!canvas?.isConnected)return;activePreviews.set(canvas,spec);const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
 const retry=sheet=>{const a=loadAtlas(sheet);if(!a.complete||!a.naturalWidth){a.addEventListener('load',()=>{if(canvas.isConnected&&activePreviews.get(canvas)===spec)preview(canvas,spec);},{once:true});return null;}return a;};
 if(spec.key){const f=FRAMES[spec.key];if(!f){c.fillStyle='#91aabc';c.font=`${Math.round(canvas.width*.3)}px serif`;c.textAlign='center';c.textBaseline='middle';c.fillText((spec.label||spec.key)[0],canvas.width/2,canvas.height/2);return;}const a=retry(f.sheet||0);if(!a)return;if(spec.portrait){portrait(canvas,spec.key,a);return;}const scale=Math.min(canvas.width*.86/f.w,canvas.height*.92/f.h);c.drawImage(a,f.x,f.y,f.w,f.h,(canvas.width-f.w*scale)/2,(canvas.height-f.h*scale)/2,f.w*scale,f.h*scale);return;}
 const e={alive:true,team:2,x:0,y:0,radius:.5,hp:100,maxHp:100,status:{},state:{},buffs:{},facing:0,...spec},g={time:0,minionFactions:['uniform','suit'],visibleTo:()=>true,hidden:()=>false,locked:()=>false,shield:()=>0};let p;
 if(e.kind==='minion')p=minionPresentation(g,e);else if(e.camp==='boss')p=bossPresentation(g,e);else if(['needle','sewingKing'].includes(e.camp))p=needlePresentation(g,e);else if(['amplify','blessing'].includes(e.camp))p=clerkPresentation(g,e);
 if(p){if(!retry(p.f.sheet))return;const scale=Math.min(canvas.width*.85/p.w,canvas.height*.88/p.h);c.save();c.translate((canvas.width-p.w*scale)/2-p.left*scale,canvas.height*.94);c.scale(scale,scale);}else{const scale=Math.min(canvas.width,canvas.height)*(['core','tower'].includes(e.kind)?.22:.38);c.save();c.translate(canvas.width/2,canvas.height/2);c.scale(scale,scale);}
 const painter=Object.create(Renderer.prototype);painter.ctx=c;painter.billboardPass=true;painter.text=()=>{};if(['tower','core'].includes(e.kind))painter.structure(e,g);else painter.unit(e,g);c.restore();
}
