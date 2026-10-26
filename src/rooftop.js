import * as THREE from './vendor/three.js';
import {TERRAIN,APPROACH,RULES} from './data.js';

export const ROOFTOP={depth:72,windowWidth:36,windowHeight:36,skyAspect:1981/793,skyRise:3.5};
export const ROOFTOP_ASSETS={skyline:'rooftop-skyline',smoke:'rooftop-smoke',windows:'rooftop-windows'};
let images;
export function rooftopImages(){
 if(typeof Image==='undefined')return{};
 if(images)return images;images={};
 for(const [key,name]of Object.entries(ROOFTOP_ASSETS)){const image=new Image(),embedded=document.getElementById(name+'-data');image.src=embedded?JSON.parse(embedded.textContent):`./src/assets/${name}.png`;images[key]=image;}
 return images;
}
// The visible roof follows the existing walkable outline, including the rear
// wings and the four narrowed approaches. This adds no gameplay boundaries.
export function roofOutline(layout){
 const b=layout.bounds;if(!layout.terrain)return[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]];
 const [,left,right,top,bottom]=TERRAIN,W=RULES.width,H=RULES.height,a=APPROACH.tipX,s=APPROACH.stopX,n=APPROACH.tipY*(1-s/a),t=left.y,v=left.y+left.h;
 return[[a,0],[top.x,0],[top.x,top.y],[top.x+top.w,top.y],[top.x+top.w,0],[W-a,0],[W-s,n],[W-s,t],[right.x+right.w,t],[right.x+right.w,v],[W-s,v],[W-s,H-n],[W-a,H],[bottom.x+bottom.w,H],[bottom.x+bottom.w,bottom.y+bottom.h],[bottom.x,bottom.y+bottom.h],[bottom.x,H],[a,H],[s,H-n],[s,v],[left.x,v],[left.x,t],[s,t],[s,n]];
}
export function roofSegments(layout){const p=roofOutline(layout);return p.map((a,i)=>{const b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1];return{a,b,length:Math.hypot(dx,dz),angle:-Math.atan2(dz,dx)};});}
export function roofPath(c,layout){c.beginPath();roofOutline(layout).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}

export class RooftopScenery{
 constructor(invalidate){
  this.images=rooftopImages();this.textures={};this.ready=false;this.background=new THREE.Scene();this.background.background=new THREE.Color('#0c0e13');
  const fade=document.createElement('canvas');fade.width=1;fade.height=128;const c=fade.getContext('2d'),gradient=c.createLinearGradient(0,0,0,128);for(const [at,color]of [[0,'#000000'],[.06,'#ffffff'],[.82,'#ffffff'],[1,'#000000']])gradient.addColorStop(at,color);c.fillStyle=gradient;c.fillRect(0,0,1,128);this.fade=new THREE.CanvasTexture(fade);this.fade.userData.rooftopShared=true;
  for(const [key,image]of Object.entries(this.images)){
   const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.userData.rooftopShared=true;
   if(key==='windows')texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
   this.textures[key]=texture;
   const loaded=()=>{texture.needsUpdate=true;this.ready=Object.values(this.images).every(i=>i.complete&&i.naturalWidth);invalidate();};
   image.addEventListener('load',loaded);if(image.complete&&image.naturalWidth)loaded();
  }
 }
 build(layout,parent){
  const group=new THREE.Group();group.name='rooftop-environment';group.userData.decorative=true;parent.add(group);this.group=group;
  const outline=roofOutline(layout),shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
  const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.8,bevelEnabled:false}),new THREE.MeshLambertMaterial({color:'#373d3e'}));slab.rotation.x=Math.PI/2;slab.position.y=-.12;slab.name='roof-slab';group.add(slab);
  const windowMat=new THREE.MeshBasicMaterial({map:this.textures.windows,color:'#b6c9cd',side:THREE.DoubleSide,fog:false});
  const fogMat=new THREE.MeshBasicMaterial({map:this.textures.smoke,color:'#6095a8',transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide,fog:false});
  for(const edge of roofSegments(layout)){
   const {a,b,length,angle}=edge,x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
   const geometry=new THREE.PlaneGeometry(length,ROOFTOP.depth),uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*length/ROOFTOP.windowWidth,uv.getY(i)*ROOFTOP.depth/ROOFTOP.windowHeight);
   const wall=new THREE.Mesh(geometry,windowMat);wall.name='skyscraper-windows';wall.position.set(x,-ROOFTOP.depth/2-.16,z);wall.rotation.y=angle;group.add(wall);
   const coping=new THREE.Mesh(new THREE.BoxGeometry(length+.02,.22,.22),new THREE.MeshLambertMaterial({color:'#59676a'}));coping.name='roof-edge';coping.position.set(x,.02,z);coping.rotation.y=angle;group.add(coping);
   // Only the facing edges need a veil. It stays below the roof and never
   // paints across the playable floor or participates in concealment checks.
   if(b[0]<a[0]){
    const fog=new THREE.Mesh(new THREE.PlaneGeometry(length+1,13),fogMat);fog.name='blue-smoke-below';fog.position.set(x,-ROOFTOP.depth+2,z+.12);fog.rotation.y=angle;fog.renderOrder=2;group.add(fog);
   }
  }
  for(const sky of [...this.background.children]){sky.geometry.dispose();sky.material.dispose();this.background.remove(sky);}
  const skyMat=new THREE.MeshBasicMaterial({map:this.textures.skyline,alphaMap:this.fade,transparent:true,depthWrite:false,depthTest:false,fog:false,side:THREE.DoubleSide});
  const b=layout.bounds,tilt=-Math.atan2(24.15,19),up=new THREE.Vector3(0,Math.cos(tilt),Math.sin(tilt)),width=b.w+12,image=this.images.skyline,height=width/(image.naturalWidth?image.naturalWidth/image.naturalHeight:ROOFTOP.skyAspect);
  // Exactly one full painting covers the entire upper edge. Its own background
  // pass permits a soft vertical fade without ever covering the roof or actors.
  // Keep the original painting's aspect ratio. Anchor the tower's smoke outlet
  // above the roof instead of compressing a tall skyline into a shallow strip.
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(width,height),skyMat);sky.name='crimson-city-backdrop';sky.rotation.x=tilt;sky.position.set(b.x+b.w/2,0,b.y-ROOFTOP.skyRise);sky.position.addScaledVector(up,(.42-.5)*height);sky.renderOrder=-100;this.background.add(sky);
  return group;
 }
}
