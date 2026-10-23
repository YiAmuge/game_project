import * as THREE from './vendor/three.js';
import { Camera25D } from './camera-25d.js';
import { TRAINING_25D as MAP } from './training-25d-map.js';
import { WORLD,WALLS,TERRAIN,FOUNTAINS,BUSHES,lanePath } from './data.js';
import * as Training from './training.js';
import { championHud,orderMark,championEffects } from './overlays.js';
import * as CombatVisuals from './combat-visuals.js';
import { ChampionVFX } from './champion-vfx.js';
import { ProjectileVFX } from './projectile-vfx.js';
import { DashTrails } from './dash-trails.js';
import { SkillVFX } from './skill-vfx.js';
import { THEMES } from './art.js';
import { projectFeet,leapLift,airborneShadow,sceneryPixelRatio,sceneryOutline,sceneryPan } from './projection-25d.js';

const ATLAS_KEYS=['atlas','atlasExtra','atlasV05','atlasV06','atlasV08','atlasV10','atlasV12','atlasV13','atlasV17'];
const material=(color,extra={})=>new THREE.MeshLambertMaterial({color,...extra});
function painter(base,canvas){
 const p=Object.create(Object.getPrototypeOf(base));p.canvas=canvas;p.ctx=canvas.getContext('2d');
 for(const key of ATLAS_KEYS)p[key]=base[key];return p;
}
function dispose(object){object.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});object.removeFromParent();}

export class Renderer25D {
 constructor(base){
  this.base=base;this.layout=MAP;this.camera=new Camera25D();this.vfx=new SkillVFX();this.dashTrails=new DashTrails();this.projectileVfx=new ProjectileVFX(this.vfx);this.championVfx=new ChampionVFX(this.vfx,this.projectileVfx,base);this.sceneryCamera=this.camera.native.clone();this.units=new Map();this.structures=new Map();this.walls=[];this.occlusionRay=new THREE.Raycaster();
  this.canvas=document.createElement('canvas');this.canvas.id='arena-3d';this.canvas.setAttribute('aria-hidden','true');
  this.canvas.hidden=true;base.canvas.before(this.canvas);
  try{this.webgl=new THREE.WebGLRenderer({canvas:this.canvas,antialias:false,alpha:false,powerPreference:'high-performance',precision:'mediump'});}
  catch(error){this.canvas.remove();throw new Error('게임은 WebGL을 지원하는 브라우저가 필요합니다. 브라우저의 하드웨어 가속 설정을 확인해 주세요.',{cause:error});}
  this.webgl.outputColorSpace=THREE.SRGBColorSpace;this.webgl.setClearColor('#101e2a');
  this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog('#101e2a',55,110);
  this.scene.add(new THREE.AmbientLight('#d9efff',2));
  const sun=new THREE.DirectionalLight('#ffe4b9',3.1);sun.position.set(-12,35,8);this.scene.add(sun);
  const rim=new THREE.DirectionalLight('#789acb',1.5);rim.position.set(15,12,-20);this.scene.add(rim);
  this.world=new THREE.Group();this.scene.add(this.world);this.buildArena();
  this.groundPainter=painter(base,base.canvas);
  const p=this.groundPainter;p.groundPass=true;p.dpr=1;p.unit=()=>{};p.structure=()=>{};
  p.floor=()=>{};p.follow=()=>{};
  this.floorCanvas=document.createElement('canvas');this.floorCanvas.width=2048;this.floorCanvas.height=1152;
  this.floorPainter=painter(base,this.floorCanvas);this.floorTexture=new THREE.CanvasTexture(this.floorCanvas);
  this.floorTexture.colorSpace=THREE.SRGBColorSpace;this.floorTexture.minFilter=THREE.LinearFilter;this.floorTexture.generateMipmaps=false;
  this.floor=new THREE.Mesh(new THREE.PlaneGeometry(this.layout.bounds.w,this.layout.bounds.h),new THREE.MeshBasicMaterial({map:this.floorTexture,transparent:true,depthWrite:false}));
  this.floor.rotation.x=-Math.PI/2;this.floor.position.set(this.layout.bounds.x+this.layout.bounds.w/2,.045,this.layout.bounds.y+this.layout.bounds.h/2);this.floor.renderOrder=1;this.scene.add(this.floor);
  this.resize();
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;});
  this.canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;this.sceneryDirty=true;this.floorStamp=null;this.occlusionStamp=null;});
 }
 resize(){
  const b=this.base,pad=Math.ceil(Math.max(b.width/32,b.height/21)*5),width=Math.max(1,b.width+pad*2),height=Math.max(1,b.height+pad*2),ratio=sceneryPixelRatio(width,height,window.devicePixelRatio||1),stamp=[b.width,b.height,ratio].join('/');
  if(stamp===this.sizeStamp)return;this.sizeStamp=stamp;this.sceneryDirty=true;this.padding=pad;
  this.webgl.setPixelRatio(ratio);this.webgl.setSize(width,height,false);
  Object.assign(this.canvas.style,{width:width+'px',height:height+'px',left:-pad+'px',top:-pad+'px'});
 }
 box(w,h,d,x,y,z,color,group=this.world){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y,z);group.add(mesh);return mesh;}
 cylinder(radius,height,x,y,z,color,group=this.world,top=radius){const m=new THREE.Mesh(new THREE.CylinderGeometry(top,radius,height,12),material(color));m.position.set(x,y,z);group.add(m);return m;}
 buildArena(){
  const b=this.layout.bounds;
  if(this.layout.terrain){for(const t of this.layout.terrain){this.box(t.w,.8,t.h,t.x+t.w/2,-.55,t.y+t.h/2,'#263c4c');this.box(t.w-.08,.12,t.h-.08,t.x+t.w/2,-.09,t.y+t.h/2,'#344b43');}}
  else {this.box(b.w,.8,b.h,b.x+b.w/2,-.43,b.y+b.h/2,'#263c4c');this.box(b.w-.3,.16,b.h-.3,b.x+b.w/2,-.1,b.y+b.h/2,'#344b50');}
  for(const a of this.layout.areas){
   this.box(a.w,.08,a.h,a.x+a.w/2,-.015,a.y+a.h/2,a.id===2?'#4b5148':a.id===5?'#525349':'#3c5252');
   for(const z of [a.y,a.y+a.h])this.box(a.w,.03,.06,a.x+a.w/2,.035,z,a.color);
   for(const x of [a.x,a.x+a.w])this.box(.06,.03,a.h,x,.035,a.y+a.h/2,a.color);
  }
  for(const w of this.layout.walls){
   this.box(w.w+.22,.18,w.h+.22,w.x+w.w/2,.09,w.y+w.h/2,'#1d303b');
   const wall=this.box(w.w,1.25,w.h,w.x+w.w/2,.78,w.y+w.h/2,'#657a7b');
   wall.material.transparent=true;this.walls.push({mesh:wall,rect:w});
   const cap=this.box(w.w+.08,.1,w.h+.08,w.x+w.w/2,1.455,w.y+w.h/2,'#a5b2a4');
   cap.material.transparent=true;this.walls.push({mesh:cap,rect:w});
  }
  // Perimeter rails sit outside the playable rectangle; they add no hidden obstacles.
  for(const z of [b.y-.35,b.y+b.h+.35])this.box(b.w+.7,.45,.35,b.x+b.w/2,.18,z,'#71817d');
  for(const x of [b.x-.35,b.x+b.w+.35])this.box(.35,.45,b.h+.7,x,.18,b.y+b.h/2,'#71817d');
  for(const [x,z] of [[b.x+1,b.y+1],[b.x+b.w-1,b.y+1],[b.x+1,b.y+b.h-1],[b.x+b.w-1,b.y+b.h-1]]){
   this.cylinder(.55,2.5,x,1.25,z,'#516775');this.cylinder(.65,.18,x,2.56,z,'#b9ba99');
   const gem=new THREE.Mesh(new THREE.ConeGeometry(.28,.65,5),material('#a4ddd9',{emissive:'#407b87',emissiveIntensity:.6}));gem.position.set(x,2.95,z);this.world.add(gem);
  }
  for(const f of this.layout.spawns||[this.layout.spawn]){
  this.cylinder(2.45,.13,f.x,.02,f.y,'#476e75');this.cylinder(1.9,.16,f.x,.12,f.y,'#6a9392');this.cylinder(1.5,.12,f.x,.22,f.y,'#7fa8a1');
  // Keep the visual pedestal below the combat plane; movement has no elevation.
  for(const obj of this.world.children.slice(-3))obj.position.y-=.32;}
 }
 floorMarks(game,r,v){
  const c=r.ctx;
  c.clearRect(v.x,v.y,v.w,v.h);
  const b=this.layout.bounds;
  c.save();c.beginPath();c.rect(b.x,b.y,b.w,b.h);c.clip();if(this.layout.terrain){c.beginPath();for(const t of this.layout.terrain)c.rect(t.x,t.y,t.w,t.h);c.clip();}
  const left=Math.max(b.x,Math.floor(v.x/2)*2),top=Math.max(b.y,Math.floor(v.y/2)*2);
  for(let x=left;x<Math.min(b.x+b.w,v.x+v.w);x+=2)r.line([{x,y:Math.max(b.y,v.y)},{x,y:Math.min(b.y+b.h,v.y+v.h)}],'#c1d0c619',.025);
  for(let y=top;y<Math.min(b.y+b.h,v.y+v.h);y+=2)r.line([{x:Math.max(b.x,v.x),y},{x:Math.min(b.x+b.w,v.x+v.w),y}],'#c1d0c619',.025);
  for(const a of this.layout.areas){r.text(`${String(a.id).padStart(2,'0')} / ${a.name}`,a.x+a.w/2,a.y+1.2,a.color,.52);}
  const f=this.layout.spawn;r.circle(f.x,f.y,2.45,'#a8f2e91c','#bbf7e1aa',.08);r.circle(f.x,f.y,1.65,null,'#dcffef66',.055);r.text('부활소',f.x,f.y+3.1,'#c3e9dc',.42);
  if(!game.training){for(let team=0;team<2;team++)for(let lane=0;lane<2;lane++)r.line(lanePath(team,lane),'#c2af7c33',3.2);for(const bush of BUSHES){c.fillStyle='#4c7856aa';c.fillRect(bush.x,bush.y,bush.w,bush.h);}c.restore();return;}
  const h=this.layout.hazard;c.fillStyle='#b3574d70';c.fillRect(h.x,h.y,h.w,h.h);c.strokeStyle='#f1b18d';c.lineWidth=.07;c.strokeRect(h.x,h.y,h.w,h.h);
  for(let i=.35;i<h.w;i+=.7)r.line([{x:h.x+i,y:h.y+.2},{x:h.x+i,y:h.y+h.h-.2}],'#efae8c55',.04);
  r.text('피해 장판 · 초당 3.3%',h.x+h.w/2,h.y+h.h/2,'#ffe1b8',.32);
  r.line(Training.lanePath(0,game),'#d5c28b35',2.6);r.text(game.practice.lineStopped?'라인 정지 · 옵션에서 초기화':'미니언 · 포탑 회랑',41.6,11,'#e3d2a5',.42);
  c.restore();
 }
 staticFloor(game){
  const stamp=game.training?game.practice.lineStopped:'match';if(this.floorStamp===stamp)return;this.floorStamp=stamp;
  const r=this.floorPainter,c=r.ctx,b=this.layout.bounds;c.setTransform(this.floorCanvas.width/b.w,0,0,this.floorCanvas.height/b.h,-b.x*this.floorCanvas.width/b.w,-b.y*this.floorCanvas.height/b.h);
  this.floorMarks(game,r,b);this.floorTexture.needsUpdate=true;this.sceneryDirty=true;
 }
 groundFrame(game,playing){
  const p=this.groundPainter,b=this.base,camera=this.camera,origin=camera.worldToScreen({x:0,y:0},.055),dx=camera.worldToScreen({x:1,y:0},.055),dy=camera.worldToScreen({x:0,y:1},.055);
  p.width=b.width;p.height=b.height;p.dpr=b.dpr;p.scale=camera.scale;
  // An orthographic ground plane is affine. Draw straight to Canvas2D instead
  // of copying a large changing texture back to WebGL on every frame.
  p.groundTransform=[dx.x-origin.x,dx.y-origin.y,dy.x-origin.x,dy.y-origin.y,origin.x,origin.y];
  p.draw(game,playing);
  const baseCtx=b.ctx;baseCtx.save();baseCtx.setTransform(b.dpr,0,0,b.dpr,0,0);this.championVfx.ground(baseCtx,camera,game);baseCtx.restore();
  for(const {entity:e} of this.units.values()){
   if(airborneShadow(e)){const c=p.ctx;c.beginPath();c.ellipse(e.x,e.y,e.radius+.12,(e.radius+.12)*.65,0,0,Math.PI*2);c.fillStyle='#07161a77';c.fill();}
   if(e.kind==='champion'&&!e.trainingDummy)p.circle(e.x,e.y,.67,null,e.player?'#f2d98e':e.team?'#d99588':'#92cad3',.06);
  }
  const c=b.ctx;c.save();c.setTransform(b.dpr,0,0,b.dpr,0,0);this.vfx.drawGround(c,camera);c.restore();
  this.maskScenery(game);
 }
 maskScenery(game){
  const c=this.base.ctx;c.save();c.setTransform(this.base.dpr,0,0,this.base.dpr,0,0);c.globalCompositeOperation='destination-out';c.fillStyle='#000';
  const erase=(rect,alpha)=>{c.globalAlpha=alpha;const points=sceneryOutline(this.camera,rect);c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();};
  for(let i=0;i<this.walls.length;i+=2){const {rect:w,mesh}=this.walls[i];erase({...w,height:1.51},mesh.material.opacity);}
  for(const e of game.units.filter(e=>e.kind==='tower'||e.kind==='core')){const group=this.structures.get(e.id);if(group){const w=e.kind==='core'?3.3:2.1;erase({x:e.x-w/2,y:e.y-w/2,w,h:w,height:e.alive?3:.36},group.userData.occluding?.22:1);}}
  c.restore();
 }
 unitsFrame(game){
  this.units.clear();
  for(const e of game.units){
   if(['tower','core'].includes(e.kind))continue;
   const s=this.camera.worldToScreen(e),visible=e.alive&&(!game.hidden(e)||e.motion?.kind==='leap')&&game.visibleTo(0,e)&&s.x>-220&&s.x<this.base.width+220&&s.y>-220&&s.y<this.base.height+220;
   if(visible)this.units.set(e.id,{entity:e,feet:projectFeet(this.camera,e)});
  }
 }
 makeTower(e){
  const group=new THREE.Group(),color=e.team===0?'#7bbbd0':'#d49080',dark=e.team===0?'#355d71':'#704e49';
  if(e.kind==='core'){this.cylinder(1.6,.35,0,.175,0,dark,group);this.cylinder(1.2,.5,0,.6,0,color,group);const crystal=new THREE.Mesh(new THREE.ConeGeometry(1.05,2.1,6),material(color,{emissive:color,emissiveIntensity:.45}));crystal.position.y=1.9;group.add(crystal);for(let i=0;i<4;i++){const a=i*Math.PI/2;this.box(.2,1.5,.2,Math.cos(a)*1.3,.8,Math.sin(a)*1.3,dark,group);}}else{
  this.cylinder(1.05,.22,0,.11,0,'#283b43',group);
  this.cylinder(.8,.35,0,.35,0,dark,group);
  this.cylinder(.57,1.6,0,1.25,0,dark,group,.48);
  this.cylinder(.8,.22,0,2.13,0,color,group);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;this.box(.27,.5,.27,Math.cos(a)*.55,2.42,Math.sin(a)*.55,color,group);}
  const gem=new THREE.Mesh(new THREE.ConeGeometry(.3,.65,4),material(color,{emissive:color,emissiveIntensity:.35}));gem.position.y=2.65;group.add(gem);group.position.set(e.x,0,e.y);}
  group.position.set(e.x,0,e.y);group.traverse(o=>{if(o.material)o.material.transparent=true;});this.scene.add(group);return group;
 }
 structureFrame(game){
  const keep=new Set();
  for(const e of game.units.filter(e=>e.kind==='tower'||e.kind==='core')){
   keep.add(e.id);let group=this.structures.get(e.id);if(!group){group=this.makeTower(e);this.structures.set(e.id,group);this.sceneryDirty=true;}
   const sy=e.alive?1:.12;if(group.scale.y!==sy){group.scale.y=sy;this.sceneryDirty=true;}
  }
  for(const [id,group] of this.structures)if(!keep.has(id)){dispose(group);this.structures.delete(id);this.sceneryDirty=true;}
 }
 occlusion(game){
  const champions=game.champions().filter(e=>e.alive&&!game.hidden(e)&&game.visibleTo(0,e));
  const stamp=[this.camera.x,this.camera.y,this.sizeStamp,...champions.flatMap(e=>[e.id,e.x,e.y]),...Array.from(this.structures,([id,g])=>`${id}:${g.scale.y}`)].join('/');
  if(stamp===this.occlusionStamp)return;this.occlusionStamp=stamp;
  const groups=[...this.walls.map(w=>w.mesh),...this.structures.values()],faded=new Set();
  // Test actual 3D geometry along the view rays through every visible champion.
  // Using screen rays also works for the orthographic camera near wall ends.
  this.scene.updateMatrixWorld(true);
  for(const e of champions){
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
  for(const root of groups){const fade=faded.has(root);if(root.userData.occluding!==fade)this.sceneryDirty=true;root.userData.occluding=fade;root.traverse(o=>{if(o.material){o.material.opacity=fade?.22:1;o.material.depthWrite=!fade;}});}
 }
 hud(game,playing){
  this.groundFrame(game,playing);
  const r=this.base,c=r.ctx;c.setTransform(r.dpr,0,0,r.dpr,0,0);
  const at=(e,fn,followLeap=false)=>{const p=projectFeet(this.camera,e);if(p.x<-230||p.x>r.width+230||p.y<-230||p.y>r.height+230)return;c.save();c.translate(p.x,p.y);c.scale(p.scale,p.scale);c.translate(-e.x,-e.y-p.offset);if(followLeap)c.translate(0,-leapLift(e));fn();c.restore();};
  // Upright screen-space art has no tilted quad extending through ground/walls.
  // Reuse atlas draws directly instead of uploading a canvas texture per entity.
  this.vfx.prepare(this.camera,r.width,r.height);
  const old=r.billboardPass,oldVfx=r.skillVfx;r.billboardPass=true;r.skillVfx=this.vfx;
  const actors=[...this.units.values()].map(a=>({e:a.entity,tree:false}));for(const z of game.zones)if(z.kind==='desireTree'&&z.until>game.time)actors.push({e:z,tree:true});
  try{for(const {e,tree} of actors.sort((a,b)=>a.e.y-b.e.y||(a.e.id||0)-(b.e.id||0))){
   this.vfx.drawUntil(c,e.y);if(tree){this.championVfx.tree(c,this.camera,e,game);continue;}if(e.kind==='champion')this.dashTrails.draw(c,this.camera,e,game,r,this.vfx);this.championVfx.body(c,this.camera,e,game);at(e,()=>r.unit(e,game));this.championVfx.body(c,this.camera,e,game,true);
  }this.vfx.drawUntil(c);this.vfx.drawFlashes(c,this.camera);this.vfx.drawBodyHits(c,this.camera);this.projectileVfx.draw(c,this.camera,game);this.projectileVfx.beams(c,this.camera,game);this.championVfx.events(c,this.camera,game);}finally{r.billboardPass=old;r.skillVfx=oldVfx;}
  for(const e of game.units.filter(e=>e.alive&&game.visibleTo(0,e)&&!game.hidden(e)&&e.kind!=='champion'))at(e,()=>{
   if(e.kind==='neutral'){orderMark(r,e,game);r.bar(e,e.camp==='boss'?3.4:1.2,e.y-(e.camp==='boss'?1.8:.95),game);if(e.camp!=='central')r.text(e.name,e.x,e.y-1.55,'#d2d4b9',.3);if(e.exposedUntil>game.time)r.text(`받는 피해 +20% ${(e.exposedUntil-game.time).toFixed(1)}s`,e.x,e.y-2,'#edbb97',.25);if(e.returning)r.text('복귀 중',e.x,e.y+.8,'#d1dec5',.25);}
   else if(e.kind==='minion')r.bar(e,.8,e.y-.65,game);
   else if(e.kind==='tower'||e.kind==='core')r.bar(e,e.kind==='core'?3.3:2.3,e.y-3.5,game);
  });
  for(const e of game.champions().filter(e=>e.alive&&game.visibleTo(0,e)&&(!game.hidden(e)||e.motion?.kind==='leap')).sort((a,b)=>Number(a.player)-Number(b.player)))at(e,()=>{
   championEffects(r,e,game);CombatVisuals.front(r,e,game);championHud(r,e,game);CombatVisuals.meter(r,e,game);
   if(e.easterText?.until>game.time)r.text(e.easterText.text,e.x,e.y-3.2,'#ffe3a7',.36);
  },true);
  if(this.contextLost){c.fillStyle='#102331dd';c.fillRect(0,r.height/2-45,r.width,90);c.fillStyle='#ffe1a6';c.font='16px sans-serif';c.textAlign='center';c.fillText('3D 화면 복구 중 · 계속 표시되면 페이지를 새로고침해 주세요.',r.width/2,r.height/2);}
 }
 configureArena(game){
  const layout=game.training?MAP:{bounds:WORLD,walls:WALLS,areas:[],terrain:TERRAIN,spawn:FOUNTAINS[0],spawns:FOUNTAINS};
  if(this.layout===layout||this.layout.id==='match'&&!game.training)return;
  for(const child of [...this.world.children])dispose(child);this.walls=[];this.layout=layout;if(!game.training)this.layout.id='match';this.buildArena();
  const b=layout.bounds;this.floor.geometry.dispose();this.floor.geometry=new THREE.PlaneGeometry(b.w,b.h);this.floor.position.set(b.x+b.w/2,.045,b.y+b.h/2);this.floorStamp=null;
 }
 draw(game,playing){
  if(this.game!==game){for(const group of this.structures.values())dispose(group);this.units.clear();this.structures.clear();this.sceneryDirty=true;this.floorStamp=null;this.occlusionStamp=null;this.game=game;this.configureArena(game);}
  this.vfx.sync(game,this.camera,THEMES);this.championVfx.sync(game);this.dashTrails.sync(game);
  this.unitsFrame(game);this.staticFloor(game);this.structureFrame(game);
  this.occlusion(game);
  const pan=this.sceneryAnchor?sceneryPan(this.camera,this.sceneryAnchor):{x:Infinity,y:Infinity};
  // Orthographic camera motion is a screen translation. Keep a guard band of
  // scenery and pan that cached image until its edge approaches the viewport.
  // Units, aiming and floor effects continue updating on every animation frame.
  if(this.sceneryDirty||Math.abs(pan.x)>this.padding*.7||Math.abs(pan.y)>this.padding*.7){
   const c=this.sceneryCamera;c.copy(this.camera.native);const extra=this.padding/this.camera.scale;c.left-=extra;c.right+=extra;c.top+=extra;c.bottom-=extra;c.updateProjectionMatrix();
   this.webgl.render(this.scene,c);this.sceneryAnchor={x:this.camera.x,y:this.camera.y};this.sceneryDirty=false;this.canvas.style.transform='translate3d(0,0,0)';
  }else this.canvas.style.transform=`translate3d(${pan.x}px,${pan.y}px,0)`;
  this.hud(game,playing);
 }
}
