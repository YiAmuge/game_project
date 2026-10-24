import * as THREE from './vendor/three.js';

export const BACKSTREET_TILES={road:[0,0,.5,.5],wall:[.5,0,.5,.5],metal:[0,.5,.5,.5],window:[.5,.5,.25,.25],vent:[.75,.5,.25,.25],amber:[.5,.75,.25,.25],teal:[.75,.75,.25,.25]};
export function boxSurfaceUV(geometry,w,h,d){
 const uv=geometry.getAttribute('uv'),sizes=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
 for(let face=0;face<6;face++){const [a,b]=sizes[face];for(let i=0;i<4;i++){const n=face*4+i;uv.setXY(n,uv.getX(n)*a/3,uv.getY(n)*b/2);}}uv.needsUpdate=true;return geometry;
}
// One immutable image, seven small shared textures, no per-frame image uploads.
export class BackstreetSkin {
 constructor(invalidate){
  this.tiles={};this.textures={};this.ready=false;this.revision=0;
  for(const [key,rect] of Object.entries(BACKSTREET_TILES)){
   const c=document.createElement('canvas');c.width=c.height=rect[2]===.5?256:128;const ctx=c.getContext('2d');ctx.fillStyle=key==='road'?'#464641':'#54534c';ctx.fillRect(0,0,c.width,c.height);this.tiles[key]=c;
   const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=rect[2]===.5?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.userData.backstreetShared=true;this.textures[key]=texture;
  }
  this.image=new Image();this.image.onload=()=>{
   for(const [key,[x,y,w,h]] of Object.entries(BACKSTREET_TILES)){const canvas=this.tiles[key],c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(this.image,x*this.image.naturalWidth,y*this.image.naturalHeight,w*this.image.naturalWidth,h*this.image.naturalHeight,0,0,canvas.width,canvas.height);this.textures[key].needsUpdate=true;}
   this.ready=true;this.revision++;invalidate();
  };
  const embedded=document.getElementById('backstreet-data');this.image.src=embedded?JSON.parse(embedded.textContent):'./src/assets/backstreet-materials.png';
 }
 material(kind='wall',tint=kind==='wall'?'#b6bec0':'#b4b4aa'){
  return new THREE.MeshLambertMaterial({map:this.textures[kind],color:tint,transparent:true});
 }
 box(mesh,kind='wall',tint){mesh.material.dispose();mesh.material=this.material(kind,tint);const {width,height,depth}=mesh.geometry.parameters;boxSurfaceUV(mesh.geometry,width,height,depth);return mesh;}
 cylinder(mesh,kind='metal',tint){mesh.material.dispose();mesh.material=this.material(kind,tint);return mesh;}
 facade(parent,kind,w,h,x,y,z,angle=0){
  const mat=this.material(kind,'#bcbcb5');mat.side=THREE.DoubleSide;
  if(['window','amber','teal'].includes(kind)){mat.emissive=new THREE.Color('#8e7850');mat.emissiveMap=this.textures[kind];mat.emissiveIntensity=kind==='window'?.28:.15;}
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);mesh.position.set(x,y,z);mesh.rotation.y=angle;parent.add(mesh);return mesh;
 }
 decorateWall(wall,w,index){
  const horizontal=w.w>=w.h,length=horizontal?w.w:w.h,count=Math.min(5,Math.floor(length/3));
  for(let i=0;i<count;i++){
   const kind=['window','vent','amber','teal'][(index+i)%4],vertical=kind==='amber',width=vertical?.38:Math.min(1.4,length/count*.65),height=vertical?.98:.78,offset=-length/2+(i+.5)*length/count;
   this.facade(wall,kind,width,height,horizontal?offset:w.w/2+.012,.06,horizontal?w.h/2+.012:offset,horizontal?0:Math.PI/2);
  }
 }
 floor(ctx,bounds){
  const tile=this.tiles.road,pattern=ctx.createPattern(tile,'repeat');pattern.setTransform(new DOMMatrix().scale(6/tile.width,6/tile.height));ctx.fillStyle='#3b4140';ctx.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);ctx.save();ctx.globalAlpha=.5;ctx.fillStyle=pattern;ctx.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);ctx.restore();
  // Sparse utility covers and drains are baked into the static floor texture.
  ctx.strokeStyle='#191c1bc0';ctx.fillStyle='#272c2a';ctx.lineWidth=.035;
  for(let x=Math.ceil(bounds.x/14)*14;x<bounds.x+bounds.w;x+=14)for(let y=Math.ceil(bounds.y/12)*12;y<bounds.y+bounds.h;y+=12){
   if((Math.round(x/14)+Math.round(y/12))%3!==0)continue;ctx.beginPath();ctx.ellipse(x+1.4,y+1.6,.43,.43,0,0,Math.PI*2);ctx.fill();ctx.stroke();for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(x+1.12,y+1.6+i*.11);ctx.lineTo(x+1.68,y+1.6+i*.11);ctx.stroke();}
  }
 }
}
