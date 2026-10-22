import * as THREE from './vendor/three.js';
import { Camera25D } from './camera-25d.js';
import { TRAINING_25D as MAP } from './training-25d-map.js';
import * as Training from './training.js';
import { championHud,orderMark } from './overlays.js';
import * as CombatVisuals from './combat-visuals.js';

const ATLAS_KEYS=['atlas','atlasExtra','atlasV05','atlasV06','atlasV08','atlasV10','atlasV12','atlasV13','atlasV17'];
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.88,metalness:.12,...extra});
function painter(base,canvas){
 const p=Object.create(Object.getPrototypeOf(base));p.canvas=canvas;p.ctx=canvas.getContext('2d');
 for(const key of ATLAS_KEYS)p[key]=base[key];return p;
}
function dispose(object){object.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});object.removeFromParent();}

export class Renderer25D {
 constructor(base){
  this.base=base;this.camera=new Camera25D();this.units=new Map();this.structures=new Map();this.walls=[];this.occlusionRay=new THREE.Raycaster();
  this.canvas=document.createElement('canvas');this.canvas.id='arena-3d';this.canvas.setAttribute('aria-hidden','true');
  this.canvas.hidden=true;base.canvas.before(this.canvas);
  try{this.webgl=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}
  catch(error){this.canvas.remove();throw new Error('2.5D 연습장은 WebGL을 지원하는 브라우저가 필요합니다. 브라우저의 하드웨어 가속 설정을 확인해 주세요.',{cause:error});}
  this.webgl.outputColorSpace=THREE.SRGBColorSpace;this.webgl.setClearColor('#101e2a');
  this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog('#101e2a',55,110);
  this.scene.add(new THREE.AmbientLight('#d9efff',2));
  const sun=new THREE.DirectionalLight('#ffe4b9',3.1);sun.position.set(-12,35,8);this.scene.add(sun);
  const rim=new THREE.DirectionalLight('#789acb',1.5);rim.position.set(15,12,-20);this.scene.add(rim);
  this.world=new THREE.Group();this.scene.add(this.world);this.buildArena();
  this.groundCanvas=document.createElement('canvas');this.groundPainter=painter(base,this.groundCanvas);
  const p=this.groundPainter;p.groundPass=true;p.dpr=1;p.unit=()=>{};p.structure=()=>{};
  p.floor=game=>this.floorMarks(game);p.follow=()=>{};
  this.groundTexture=new THREE.CanvasTexture(this.groundCanvas);this.groundTexture.colorSpace=THREE.SRGBColorSpace;
  this.groundTexture.minFilter=THREE.LinearFilter;this.groundTexture.generateMipmaps=false;
  this.ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:this.groundTexture,transparent:true,depthWrite:false}));
  this.ground.rotation.x=-Math.PI/2;this.ground.position.y=.045;this.ground.renderOrder=1;this.scene.add(this.ground);
  this.unitPainter=painter(base,document.createElement('canvas'));
  this.resize();
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;});
  this.canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;});
 }
 resize(){const b=this.base;this.webgl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));this.webgl.setSize(Math.max(1,b.width),Math.max(1,b.height),false);}
 box(w,h,d,x,y,z,color,group=this.world){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y,z);group.add(mesh);return mesh;}
 cylinder(radius,height,x,y,z,color,group=this.world,top=radius){const m=new THREE.Mesh(new THREE.CylinderGeometry(top,radius,height,12),material(color));m.position.set(x,y,z);group.add(m);return m;}
 buildArena(){
  const b=MAP.bounds;
  this.box(b.w,.8,b.h,b.w/2,-.43,b.h/2,'#263c4c');
  this.box(b.w-.3,.16,b.h-.3,b.w/2,-.1,b.h/2,'#344b50');
  for(const a of MAP.areas){
   this.box(a.w,.08,a.h,a.x+a.w/2,-.015,a.y+a.h/2,a.id===2?'#4b5148':a.id===5?'#525349':'#3c5252');
   for(const z of [a.y,a.y+a.h])this.box(a.w,.03,.06,a.x+a.w/2,.035,z,a.color);
   for(const x of [a.x,a.x+a.w])this.box(.06,.03,a.h,x,.035,a.y+a.h/2,a.color);
  }
  for(const w of MAP.walls){
   this.box(w.w+.22,.18,w.h+.22,w.x+w.w/2,.09,w.y+w.h/2,'#1d303b');
   const wall=this.box(w.w,1.25,w.h,w.x+w.w/2,.78,w.y+w.h/2,'#657a7b');
   wall.material.transparent=true;this.walls.push({mesh:wall,rect:w});
   const cap=this.box(w.w+.08,.1,w.h+.08,w.x+w.w/2,1.455,w.y+w.h/2,'#a5b2a4');
   cap.material.transparent=true;this.walls.push({mesh:cap,rect:w});
  }
  // Perimeter rails sit outside the playable rectangle; they add no hidden obstacles.
  for(const z of [-.35,b.h+.35])this.box(b.w+.7,.45,.35,b.w/2,.18,z,'#71817d');
  for(const x of [-.35,b.w+.35])this.box(.35,.45,b.h+.7,x,.18,b.h/2,'#71817d');
  for(const [x,z] of [[1,1],[82,1],[1,46],[82,46]]){
   this.cylinder(.55,2.5,x,1.25,z,'#516775');this.cylinder(.65,.18,x,2.56,z,'#b9ba99');
   const gem=new THREE.Mesh(new THREE.ConeGeometry(.28,.65,5),material('#a4ddd9',{emissive:'#407b87',emissiveIntensity:.6}));gem.position.set(x,2.95,z);this.world.add(gem);
  }
  const f=MAP.spawn;
  this.cylinder(2.45,.13,f.x,.02,f.y,'#476e75');this.cylinder(1.9,.16,f.x,.12,f.y,'#6a9392');this.cylinder(1.5,.12,f.x,.22,f.y,'#7fa8a1');
  // Keep the visual pedestal below the combat plane; movement has no elevation.
  for(const obj of this.world.children.slice(-3))obj.position.y-=.32;
 }
 floorMarks(game){
  const r=this.groundPainter,c=r.ctx,v=this.groundView;
  c.clearRect(v.x,v.y,v.w,v.h);
  const b=MAP.bounds;
  c.save();c.beginPath();c.rect(b.x,b.y,b.w,b.h);c.clip();
  const left=Math.max(0,Math.floor(v.x/2)*2),top=Math.max(0,Math.floor(v.y/2)*2);
  for(let x=left;x<Math.min(b.w,v.x+v.w);x+=2)r.line([{x,y:Math.max(0,v.y)},{x,y:Math.min(b.h,v.y+v.h)}],'#c1d0c619',.025);
  for(let y=top;y<Math.min(b.h,v.y+v.h);y+=2)r.line([{x:Math.max(0,v.x),y},{x:Math.min(b.w,v.x+v.w),y}],'#c1d0c619',.025);
  for(const a of MAP.areas){r.text(`${String(a.id).padStart(2,'0')} / ${a.name}`,a.x+a.w/2,a.y+1.2,a.color,.52);}
  const f=MAP.spawn;r.circle(f.x,f.y,2.45,'#a8f2e91c','#bbf7e1aa',.08);r.circle(f.x,f.y,1.65,null,'#dcffef66',.055);r.text('부활소',f.x,f.y+3.1,'#c3e9dc',.42);
  const h=MAP.hazard;c.fillStyle='#b3574d70';c.fillRect(h.x,h.y,h.w,h.h);c.strokeStyle='#f1b18d';c.lineWidth=.07;c.strokeRect(h.x,h.y,h.w,h.h);
  for(let i=.35;i<h.w;i+=.7)r.line([{x:h.x+i,y:h.y+.2},{x:h.x+i,y:h.y+h.h-.2}],'#efae8c55',.04);
  r.text('피해 장판 · 초당 3.3%',h.x+h.w/2,h.y+h.h/2,'#ffe1b8',.32);
  r.line(Training.lanePath(0,game),'#d5c28b35',2.6);r.text(game.practice.lineStopped?'라인 정지 · 옵션에서 초기화':'미니언 · 포탑 회랑',41.6,11,'#e3d2a5',.42);
  c.restore();
 }
 groundFrame(game,playing){
  const view=this.camera.bounds,p=this.groundPainter;
  this.groundView={x:view.x-3,y:view.y-3,w:view.w+6,h:view.h+6};const v=this.groundView;
  // Only upload the visible part of the ground, not a full-map texture every frame.
  const scale=Math.min(40,1536/Math.max(v.w,v.h)),w=Math.ceil(v.w*scale/32)*32,h=Math.ceil(v.h*scale/32)*32;
  if(this.groundCanvas.width!==w||this.groundCanvas.height!==h){
   this.groundCanvas.width=w;this.groundCanvas.height=h;
   // WebGL texture storage cannot be resized by a subsequent texSubImage2D.
   // Allocate a fresh texture when the viewport changes (including fullscreen).
   this.groundTexture.dispose();this.groundTexture=new THREE.CanvasTexture(this.groundCanvas);
   this.groundTexture.colorSpace=THREE.SRGBColorSpace;this.groundTexture.minFilter=THREE.LinearFilter;this.groundTexture.generateMipmaps=false;
   this.ground.material.map=this.groundTexture;
  }
  v.w=w/scale;v.h=h/scale;
  p.width=w;p.height=h;p.scale=scale;p.ox=-v.x*scale;p.oy=-v.y*scale;
  p.draw(game,playing);this.groundTexture.needsUpdate=true;
  this.ground.scale.set(w/scale,h/scale,1);this.ground.position.set(v.x+w/scale/2,.045,v.y+h/scale/2);
 }
 unitRecord(e){
  let item=this.units.get(e.id);if(item)return item;
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,alphaTest:.015}));
  sprite.center.set(.5,.25);sprite.scale.set(320/48,320/48,1);sprite.renderOrder=3;this.scene.add(sprite);
  const shadow=new THREE.Mesh(new THREE.CylinderGeometry(e.radius+.08,e.radius+.08,.012,20),new THREE.MeshBasicMaterial({color:'#0a161d',transparent:true,opacity:.4,depthWrite:false}));
  this.scene.add(shadow);item={canvas,texture,sprite,shadow};this.units.set(e.id,item);return item;
 }
 unitsFrame(game){
  const keep=new Set();
  for(const e of game.units){
   if(['tower','core'].includes(e.kind))continue;keep.add(e.id);
   const s=this.camera.worldToScreen(e),visible=e.alive&&(!game.hidden(e)||e.motion?.kind==='leap')&&game.visibleTo(0,e)&&s.x>-220&&s.x<this.base.width+220&&s.y>-220&&s.y<this.base.height+220;
   if(!visible){const old=this.units.get(e.id);if(old){old.sprite.visible=false;old.shadow.visible=false;}continue;}
   const item=this.unitRecord(e),r=this.unitPainter;r.canvas=item.canvas;r.ctx=item.canvas.getContext('2d');const c=r.ctx;
   c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,320,320);c.setTransform(48,0,0,48,160-e.x*48,240-e.y*48);
   r.unit(e,game);item.texture.needsUpdate=true;item.sprite.position.set(e.x,.04,e.y);item.sprite.visible=true;
   item.shadow.position.set(e.x,.027,e.y);item.shadow.visible=true;
  }
  for(const [id,item] of this.units)if(!keep.has(id)){dispose(item.sprite);dispose(item.shadow);this.units.delete(id);}
 }
 makeTower(e){
  const group=new THREE.Group(),color=e.team===0?'#7bbbd0':'#d49080',dark=e.team===0?'#355d71':'#704e49';
  this.cylinder(1.05,.22,0,.11,0,'#283b43',group);
  this.cylinder(.8,.35,0,.35,0,dark,group);
  this.cylinder(.57,1.6,0,1.25,0,dark,group,.48);
  this.cylinder(.8,.22,0,2.13,0,color,group);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;this.box(.27,.5,.27,Math.cos(a)*.55,2.42,Math.sin(a)*.55,color,group);}
  const gem=new THREE.Mesh(new THREE.ConeGeometry(.3,.65,4),material(color,{emissive:color,emissiveIntensity:.35}));gem.position.y=2.65;group.add(gem);group.position.set(e.x,0,e.y);
  group.traverse(o=>{if(o.material)o.material.transparent=true;});this.scene.add(group);return group;
 }
 structureFrame(game){
  const keep=new Set();
  for(const e of game.units.filter(e=>e.kind==='tower'||e.kind==='core')){
   keep.add(e.id);let group=this.structures.get(e.id);if(!group){group=this.makeTower(e);this.structures.set(e.id,group);}
   group.scale.y=e.alive?1:.12;
  }
  for(const [id,group] of this.structures)if(!keep.has(id)){dispose(group);this.structures.delete(id);}
 }
 occlusion(game){
  const groups=[...this.walls.map(w=>w.mesh),...this.structures.values()],faded=new Set();
  // Test actual 3D geometry along the view rays through every visible champion.
  // Using screen rays also works for the orthographic camera near wall ends.
  this.scene.updateMatrixWorld(true);
  for(const e of game.champions().filter(e=>e.alive&&!game.hidden(e)&&game.visibleTo(0,e))){
   const s=this.camera.worldToScreen(e,1);if(s.x<-50||s.x>this.base.width+50||s.y<-100||s.y>this.base.height+100)continue;
   for(const [dx,height] of [[0,.35],[-.35,1],[.35,1],[0,1.8]]){
    const point=new THREE.Vector3(e.x+dx,height,e.y),v=point.clone().project(this.camera.native);
    this.occlusionRay.setFromCamera({x:v.x,y:v.y},this.camera.native);
    this.occlusionRay.far=Math.max(0,point.clone().sub(this.occlusionRay.ray.origin).dot(this.occlusionRay.ray.direction)-.1);
    for(const hit of this.occlusionRay.intersectObjects(groups,true)){
     let root=hit.object;while(root.parent&&root.parent!==this.scene&&root.parent!==this.world)root=root.parent;
     faded.add(root);
    }
   }
  }
  for(const root of groups){const fade=faded.has(root);root.userData.occluding=fade;root.traverse(o=>{if(o.material){o.material.opacity=fade?.22:1;o.material.depthWrite=!fade;}});}
 }
 hud(game){
  const r=this.base,c=r.ctx;c.setTransform(r.dpr,0,0,r.dpr,0,0);c.clearRect(0,0,r.width,r.height);
  const at=(e,fn)=>{const p=this.camera.worldToScreen(e);if(p.x<-230||p.x>r.width+230||p.y<-230||p.y>r.height+230)return;c.save();c.translate(p.x,p.y);c.scale(this.camera.scale,this.camera.scale);c.translate(-e.x,-e.y);fn();c.restore();};
  for(const e of game.units.filter(e=>e.alive&&game.visibleTo(0,e)&&!game.hidden(e)&&e.kind!=='champion'))at(e,()=>{
   if(e.kind==='neutral'){orderMark(r,e,game);r.bar(e,e.camp==='boss'?3.4:1.2,e.y-(e.camp==='boss'?1.8:.95),game);}
   else if(e.kind==='minion')r.bar(e,.8,e.y-.65,game);
   else if(e.kind==='tower')r.bar(e,2.3,e.y-3.5,game);
  });
  for(const e of game.champions().filter(e=>e.alive&&game.visibleTo(0,e)&&!game.hidden(e)).sort((a,b)=>Number(a.player)-Number(b.player)))at(e,()=>{
   championHud(r,e,game);CombatVisuals.meter(r,e,game);
   if(e.easterText?.until>game.time)r.text(e.easterText.text,e.x,e.y-3.2,'#ffe3a7',.36);
  });
  if(this.contextLost){c.fillStyle='#102331dd';c.fillRect(0,r.height/2-45,r.width,90);c.fillStyle='#ffe1a6';c.font='16px sans-serif';c.textAlign='center';c.fillText('3D 화면 복구 중 · 계속 표시되면 페이지를 새로고침해 주세요.',r.width/2,r.height/2);}
 }
 draw(game,playing){
  if(this.game!==game){for(const item of this.units.values()){dispose(item.sprite);dispose(item.shadow);}for(const group of this.structures.values())dispose(group);this.units.clear();this.structures.clear();this.game=game;}
  this.groundFrame(game,playing);this.unitsFrame(game);this.structureFrame(game);
  this.occlusion(game);
  this.webgl.render(this.scene,this.camera.native);this.hud(game);
 }
}
