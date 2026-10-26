import * as THREE from './vendor/three.js';
import {BUSHES} from './data.js';
export const BLUE_SMOKE_HEIGHT=1.5;
export const GARDEN_WALLS=[4,11],LAMP_WALLS=[5,6,12,13];
export function smokeSlices(b){
 const points=b.polygon||[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]],rows=Math.min(6,Math.max(2,Math.ceil(b.h/.7))),out=[];
 for(let i=0;i<rows;i++){const y=b.y+b.h*(i+.5)/rows,xs=[];for(let j=0;j<points.length;j++){const a=points[j],c=points[(j+1)%points.length];if((a[1]<=y&&c[1]>y)||(c[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(c[0]-a[0])/(c[1]-a[1]));}if(xs.length>=2)out.push({y,left:Math.min(...xs),right:Math.max(...xs)});}
 return out;
}
export class ArenaDecor{
 constructor(skin,invalidate){
  this.skin=skin;this.ready=false;this.image=new Image();this.garden=new THREE.Texture(this.image);this.garden.colorSpace=THREE.SRGBColorSpace;this.garden.wrapS=this.garden.wrapT=THREE.RepeatWrapping;this.garden.magFilter=THREE.LinearFilter;this.garden.userData.rooftopShared=true;
  this.image.onload=()=>{this.garden.needsUpdate=true;this.ready=true;invalidate();};const embedded=document.getElementById('rooftop-garden-data');this.image.src=embedded?JSON.parse(embedded.textContent):'./src/assets/rooftop-garden.png';
 }
 wall(mesh,cap,w,index,match){
  if(w.baseDivider){
   mesh.material.dispose();mesh.material=this.skin.material('metal','#a3b5bc');
   const n=Math.max(1,Math.floor(w.h/1.7));for(let i=0;i<n;i++)for(const side of [-1,1])this.skin.facade(mesh,'vent',w.h/n*.9,.95,side*(w.w/2+.015),0,-w.h/2+(i+.5)*w.h/n,side*Math.PI/2);
   for(let i=0;i<n;i++){const panel=new THREE.Mesh(new THREE.PlaneGeometry(w.w*.94,w.h/n*.92),this.skin.material('vent','#bcc9cb'));panel.rotation.x=-Math.PI/2;panel.position.set(0,.056,-w.h/2+(i+.5)*w.h/n);panel.name='rooftop-vent';cap.add(panel);}
   for(const side of [-1,1])this.skin.facade(mesh,'vent',w.w*.94,.95,0,0,side*(w.h/2+.015),side<0?Math.PI:0);return;
  }
  if(match&&GARDEN_WALLS.includes(index)){
   for(const m of [mesh,cap]){m.material.dispose();m.material=new THREE.MeshLambertMaterial({map:this.garden,color:'#adba9c',transparent:true});}return;
  }
  if(match&&LAMP_WALLS.includes(index)){
   mesh.material.color.set('#687575');cap.material.color.set('#8e9890');
   const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.13,.65,8),new THREE.MeshLambertMaterial({color:'#303f47',transparent:true}));post.position.y=1.05;mesh.add(post);
   const housing=new THREE.Mesh(new THREE.BoxGeometry(.65,.18,.55),new THREE.MeshLambertMaterial({color:'#d6d5b6',emissive:'#f4dd93',emissiveIntensity:.9,transparent:true}));housing.position.y=1.45;mesh.add(housing);
   const light=new THREE.Mesh(new THREE.PlaneGeometry(.52,.13),new THREE.MeshBasicMaterial({color:'#fff3b9',transparent:true}));light.position.set(0,1.44,.285);mesh.add(light);
   const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),new THREE.MeshBasicMaterial({map:this.skin.textures.amber,color:'#dfc88d',transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide}));glow.rotation.x=-Math.PI/2;glow.position.y=.74;mesh.add(glow);return;
  }
  this.skin.decorateWall(mesh,w,index);
 }
 smoke(parent,texture){
  const group=new THREE.Group();group.name='blue-smoke-volumes';parent.add(group);this.smokeGroup=group;
  const material=new THREE.MeshBasicMaterial({map:texture,color:'#81b6cf',transparent:true,opacity:.46,depthWrite:false,side:THREE.DoubleSide,fog:false});
  for(const b of BUSHES){
   for(const p of smokeSlices(b)){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(p.right-p.left,BLUE_SMOKE_HEIGHT),material);mesh.name='blue-smoke-sprite';mesh.position.set((p.left+p.right)/2,BLUE_SMOKE_HEIGHT/2,p.y);mesh.userData={regionId:b.id,height:BLUE_SMOKE_HEIGHT};mesh.renderOrder=3;group.add(mesh);}
   const mask=document.createElement('canvas');mask.width=mask.height=128;const c=mask.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,128,128);c.fillStyle='#fff';c.beginPath();(b.polygon||[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]]).forEach(([x,y],i)=>i?c.lineTo((x-b.x)/b.w*128,(y-b.y)/b.h*128):c.moveTo((x-b.x)/b.w*128,(y-b.y)/b.h*128));c.closePath();c.fill();const alphaMap=new THREE.CanvasTexture(mask),capMat=new THREE.MeshBasicMaterial({map:texture,alphaMap,color:'#6d9cb6',transparent:true,opacity:.30,depthWrite:false,side:THREE.DoubleSide,fog:false});
   for(const height of [.55,1,BLUE_SMOKE_HEIGHT-.03]){const layer=new THREE.Mesh(new THREE.PlaneGeometry(b.w,b.h),capMat);layer.name='blue-smoke-layer';layer.position.set(b.x+b.w/2,height,b.y+b.h/2);layer.rotation.x=-Math.PI/2;layer.userData={regionId:b.id,height};layer.renderOrder=3;group.add(layer);}
  }
 }
}
export function campStains(c,g){
 for(const camp of g.campViews())for(let i=0;i<9;i++){
  const seed=camp.home.x*13.7+camp.home.y*7.3+i*3.7,x=camp.home.x+Math.sin(seed)*camp.radius*.58,y=camp.home.y+Math.cos(seed*1.3)*camp.radius*.5,r=.35+(Math.sin(seed*3)+1)*.28,gradient=c.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,'#081c2d60');gradient.addColorStop(.55,'#0e263338');gradient.addColorStop(1,'#10253600');c.fillStyle=gradient;c.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5,rr=r*(.75+.2*Math.sin(seed+k*2));k?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.7):c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.7);}c.closePath();c.fill();
 }
}
