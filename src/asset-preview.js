import{campPresentation,structurePresentation}from'./world-art.js';
import{FRAMES,loadAtlas,portrait,spriteHeight}from'./art.js';
import{Renderer}from'./render.js';
import{bossPresentation}from'./boss-art.js';
import{needlePresentation}from'./needle-art.js';
import{clerkPresentation}from'./clerk-art.js';
import{minionPresentation}from'./minion-art.js';
import{drawBackEquipment,drawEquipment,spriteOrigin,WEAPON_ART}from'./weapon-art.js';
import{bodyFacing}from'./champion-pose.js';
const activePreviews=new WeakMap();
const stanceImages=new Map();
function championStance(key){
 if(stanceImages.has(key))return stanceImages.get(key);
 const base=key==='bloodfiend'?'nosferatu':key==='soraEgo'?'sora':key==='yanDistorted'?'yan':key,f=FRAMES[key],e={id:0,key:base,previewStance:true,alive:true,team:0,x:0,y:0,facing:Math.PI,state:{},status:{},buffs:{},attackAt:-99},g={time:0,buff:(_,k)=>key==='bloodfiend'&&k==='bloodfiend'||key==='soraEgo'&&k==='soraEgo'||key==='yanDistorted'&&k==='yanDistorted',stat:()=>0,attackStyle:()=> 'slash'};
 const stage=document.createElement('canvas');stage.width=1024;stage.height=768;const c=stage.getContext('2d',{willReadFrequently:true}),r={ctx:c,weaponTrail(){}};c.translate(512,640);c.scale(120,120);c.imageSmoothingEnabled=false;
 drawBackEquipment(r,e,g);const h=spriteHeight(key),w=h*f.w/f.h,origin=spriteOrigin(g,e);c.save();c.translate(origin.x,origin.y);if((Math.cos(bodyFacing(g,e))<0)!==Boolean(f.mirror))c.scale(-1,1);c.drawImage(loadAtlas(f.sheet||0),f.x,f.y,f.w,f.h,-w*(f.foot?.[0]??.5),-h*(f.foot?.[1]??1),w,h);c.restore();drawEquipment(r,e,g);
 // Fit the complete body, ornaments and equipped weapons without clipping.
 const pixels=c.getImageData(0,0,stage.width,stage.height).data;let left=stage.width,top=stage.height,right=0,bottom=0;
 for(let y=0;y<stage.height;y++)for(let x=0;x<stage.width;x++)if(pixels[(y*stage.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const crop=document.createElement('canvas');crop.width=right-left+9;crop.height=bottom-top+9;crop.getContext('2d').drawImage(stage,left-4,top-4,crop.width,crop.height,0,0,crop.width,crop.height);stanceImages.set(key,crop);return crop;
}
export function preview(canvas,spec){
 if(!canvas?.isConnected)return;activePreviews.set(canvas,spec);const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
 const retry=sheet=>{const a=loadAtlas(sheet);if(!a.complete||!a.naturalWidth){a.addEventListener('load',()=>{if(canvas.isConnected&&activePreviews.get(canvas)===spec)preview(canvas,spec);},{once:true});return null;}return a;};
 if(spec.key){const f=FRAMES[spec.key];if(!f){c.fillStyle='#91aabc';c.font=`${Math.round(canvas.width*.3)}px serif`;c.textAlign='center';c.textBaseline='middle';c.fillText((spec.label||spec.key)[0],canvas.width/2,canvas.height/2);return;}const a=retry(f.sheet||0);if(!a)return;if(spec.portrait){portrait(canvas,spec.key,a);return;}
  if(spec.stance){const base=spec.key==='bloodfiend'?'nosferatu':spec.key==='soraEgo'?'sora':spec.key==='yanDistorted'?'yan':spec.key,weapon=WEAPON_ART[base];if(weapon&&!retry(FRAMES[weapon[0]].sheet))return;const image=championStance(spec.key),scale=Math.min(canvas.width*.92/image.width,canvas.height*.92/image.height);c.drawImage(image,(canvas.width-image.width*scale)/2,(canvas.height-image.height*scale)/2,image.width*scale,image.height*scale);canvas.dataset.pose='basic';return;}
  const scale=Math.min(canvas.width*.86/f.w,canvas.height*.92/f.h);c.drawImage(a,f.x,f.y,f.w,f.h,(canvas.width-f.w*scale)/2,(canvas.height-f.h*scale)/2,f.w*scale,f.h*scale);return;}
 const e={alive:true,team:2,x:0,y:0,radius:.5,hp:100,maxHp:100,status:{},state:{},buffs:{},facing:0,...spec},g={time:0,minionFactions:['uniform','suit'],visibleTo:()=>true,hidden:()=>false,locked:()=>false,shield:()=>0};let p;
 if(['tower','core'].includes(e.kind))p=structurePresentation(g,e);else if(['side','central'].includes(e.camp))p=campPresentation(g,e);else if(e.kind==='minion')p=minionPresentation(g,e);else if(e.camp==='boss')p=bossPresentation(g,e);else if(['needle','sewingKing'].includes(e.camp))p=needlePresentation(g,e);else if(['amplify','blessing'].includes(e.camp))p=clerkPresentation(g,e);
 if(p){if(!retry(p.f.sheet))return;const scale=Math.min(canvas.width*.85/p.w,canvas.height*.88/p.h);c.save();c.translate((canvas.width-p.w*scale)/2-p.left*scale,canvas.height*.94-(p.top+p.h)*scale);c.scale(scale,scale);}else{const scale=Math.min(canvas.width,canvas.height)*(['core','tower'].includes(e.kind)?.22:.38);c.save();c.translate(canvas.width/2,canvas.height/2);c.scale(scale,scale);}
 const painter=Object.create(Renderer.prototype);painter.ctx=c;painter.billboardPass=true;painter.text=()=>{};if(['tower','core'].includes(e.kind))painter.structure(e,g);else painter.unit(e,g);c.restore();
}
