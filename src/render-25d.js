import{minionHeight}from'./minion-art.js';
import { isClerk,CLERK_HEIGHT } from './clerk-art.js';
import { BackstreetSkin } from './backstreet.js';
import { RooftopScenery,roofPath } from './rooftop.js';
import { drawWorld as drawPings } from './pings.js';
import * as THREE from './vendor/three.js';
import { Camera25D } from './camera-25d.js';
import { TRAINING_25D as MAP } from './training-25d-map.js';
import { WORLD,WALLS,TERRAIN,FOUNTAINS,FOUNTAIN_AREAS,BUSHES,lanePath } from './data.js';
import * as Training from './training.js';
import { championHud,orderMark,championEffects,towerMark } from './overlays.js';
import * as CombatVisuals from './combat-visuals.js';
import { ChampionVFX } from './champion-vfx.js';
import { ProjectileVFX } from './projectile-vfx.js';
import { DashTrails } from './dash-trails.js';
import { SkillVFX } from './skill-vfx.js';
import { THEMES } from './art.js';
import { projectFeet,leapLift,airborneShadow,sceneryPixelRatio,sceneryOutline,sceneryPan } from './projection-25d.js';

const ATLAS_KEYS=['atlas','atlasExtra','atlasV05','atlasV06','atlasV08','atlasV10','atlasV12','atlasV13','atlasV17','atlasV36','weaponAtlas','clerkAtlas','minionAtlas'];
const material=(color,extra={})=>new THREE.MeshLambertMaterial({color,...extra});
function painter(base,canvas){
 const p=Object.create(Object.getPrototypeOf(base));p.canvas=canvas;p.ctx=canvas.getContext('2d');
 for(const key of ATLAS_KEYS)p[key]=base[key];return p;
}
function dispose(object){object.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m.map?.userData?.backstreetShared&&!m.map?.userData?.rooftopShared)m.map?.dispose();m.dispose();}}});object.removeFromParent();}

export class Renderer25D {
 constructor(base){
  this.base=base;this.layout=MAP;this.camera=new Camera25D();this.vfx=new SkillVFX();this.dashTrails=new DashTrails();this.projectileVfx=new ProjectileVFX(this.vfx);this.championVfx=new ChampionVFX(this.vfx,this.projectileVfx,base);this.sceneryCamera=this.camera.native.clone();this.units=new Map();this.structures=new Map();this.walls=[];this.occlusionRay=new THREE.Raycaster();
  this.canvas=document.createElement('canvas');this.canvas.id='arena-3d';this.canvas.setAttribute('aria-hidden','true');
  this.canvas.hidden=true;base.canvas.before(this.canvas);
  try{this.webgl=new THREE.WebGLRenderer({canvas:this.canvas,antialias:false,alpha:false,powerPreference:'high-performance',precision:'mediump'});}
  catch(error){this.canvas.remove();throw new Error('게임은 WebGL을 지원하는 브라우저가 필요합니다. 브라우저의 하드웨어 가속 설정을 확인해 주세요.',{cause:error});}
  this.webgl.outputColorSpace=THREE.SRGBColorSpace;this.webgl.setClearColor('#141919');
  this.skin=new BackstreetSkin(()=>{this.floorStamp=null;this.sceneryDirty=true;});
  this.rooftop=new RooftopScenery(()=>{this.floorStamp=null;this.sceneryDirty=true;});
  this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog('#141919',55,110);
  this.scene.add(new THREE.AmbientLight('#d2d2c9',1.7));
  const sun=new THREE.DirectionalLight('#e4d4b8',1.8);sun.position.set(-12,35,8);this.scene.add(sun);
  const rim=new THREE.DirectionalLight('#a3b4bd',.65);rim.position.set(15,12,-20);this.scene.add(rim);
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
  this.rooftop.build(this.layout,this.world);
  for(const a of this.layout.areas){
   this.box(a.w,.08,a.h,a.x+a.w/2,-.015,a.y+a.h/2,a.id===2?'#4b5148':a.id===5?'#525349':'#3c5252');
   for(const z of [a.y,a.y+a.h])this.box(a.w,.03,.06,a.x+a.w/2,.035,z,a.color);
   for(const x of [a.x,a.x+a.w])this.box(.06,.03,a.h,x,.035,a.y+a.h/2,a.color);
  }
  for(const w of this.layout.walls){
   const footing=this.box(w.w+.22,.18,w.h+.22,w.x+w.w/2,.09,w.y+w.h/2,'#1d303b');footing.rotation.y=-(w.angle||0);
   const wall=this.box(w.w,1.25,w.h,w.x+w.w/2,.78,w.y+w.h/2,'#657a7b');
   wall.rotation.y=-(w.angle||0);this.skin.box(wall,'wall');this.skin.decorateWall(wall,w,this.walls.length/2);wall.material.transparent=true;this.walls.push({mesh:wall,rect:w});
   const cap=this.box(w.w+.08,.1,w.h+.08,w.x+w.w/2,1.455,w.y+w.h/2,'#a5b2a4');
   cap.rotation.y=-(w.angle||0);this.skin.box(cap,'wall','#c8d0d1');cap.material.transparent=true;this.walls.push({mesh:cap,rect:w});
  }
  for(const f of this.layout.spawns||[this.layout.spawn]){
  this.cylinder(2.45,.13,f.x,.02,f.y,'#476e75');this.cylinder(1.9,.16,f.x,.12,f.y,'#6a9392');this.cylinder(1.5,.12,f.x,.22,f.y,'#7fa8a1');
  // Keep the visual pedestal below the combat plane; movement has no elevation.
  for(const obj of this.world.children.slice(-3)){obj.position.y-=.32;this.skin.cylinder(obj,'metal','#9dada7');}}
  for(const mesh of this.world.children){
   if(!mesh.isMesh||mesh.material.map)continue;
   if(mesh.geometry.type==='BoxGeometry')this.skin.box(mesh,'wall');
   else if(mesh.geometry.type==='CylinderGeometry')this.skin.cylinder(mesh,'metal');
   else if(mesh.geometry.type==='ConeGeometry'){mesh.geometry.dispose();mesh.geometry=new THREE.BoxGeometry(.35,.45,.35);mesh.material.color.set('#d1bd8a');mesh.material.emissive.set('#88764b');mesh.material.emissiveIntensity=.35;}
  }
 }
 floorMarks(game,r,v){
  const c=r.ctx;
  c.clearRect(v.x,v.y,v.w,v.h);
  const b=this.layout.bounds;
  c.save();roofPath(c,this.layout);c.clip();
  this.skin.floor(c,b);
  for(const a of this.layout.areas){r.text(`${String(a.id).padStart(2,'0')} / ${a.name}`,a.x+a.w/2,a.y+1.2,a.color,.52);}
  const f=this.layout.spawn;r.circle(f.x,f.y,2.45,'#a8f2e91c','#bbf7e1aa',.08);r.circle(f.x,f.y,1.65,null,'#dcffef66',.055);r.text('부활소',f.x,f.y+3.1,'#c3e9dc',.42);
  if(!game.training){for(const a of FOUNTAIN_AREAS){c.fillStyle=a.team?'#a84e3940':'#4096a347';c.fillRect(a.x,a.y,a.w,a.h);c.strokeStyle=a.team?'#f0a58b':'#a1ebe2';c.lineWidth=.14;c.strokeRect(a.x+.07,a.y+.07,a.w-.14,a.h-.14);r.text('부활소 · 적에게 1000 고정 피해 / 0.5초',a.x+a.w/2,a.y+1.1,a.team?'#f5bba4':'#c7fff1',.27);}for(let team=0;team<2;team++)for(let lane=0;lane<2;lane++)r.line(lanePath(team,lane),'#a6a09214',3.2);for(const bush of BUSHES)r.bush(bush);c.restore();return;}
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

   const s=this.camera.worldToScreen(e),visible=e.alive&&(!game.hidden(e)||e.motion?.kind==='leap')&&game.visibleTo(0,e)&&s.x>-220&&s.x<this.base.width+220&&s.y>-220&&s.y<this.base.height+220;
   if(visible)this.units.set(e.id,{entity:e,feet:projectFeet(this.camera,e)});
  }
 }
 structureFrame(){
  // All structures are upright Canvas2D actors; no 3D structure meshes remain.
  if(this.structures.size){for(const group of this.structures.values())dispose(group);this.structures.clear();this.sceneryDirty=true;}
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
   this.vfx.drawUntil(c,e.y);if(tree){this.championVfx.tree(c,this.camera,e,game);continue;}if(e.kind==='champion')this.dashTrails.draw(c,this.camera,e,game,r,this.vfx);this.championVfx.body(c,this.camera,e,game);at(e,()=>['tower','core'].includes(e.kind)?r.structure(e,game):r.unit(e,game));this.championVfx.body(c,this.camera,e,game,true);
  }this.vfx.drawUntil(c);this.vfx.drawFlashes(c,this.camera);this.vfx.drawBodyHits(c,this.camera);this.projectileVfx.draw(c,this.camera,game);this.projectileVfx.beams(c,this.camera,game);this.championVfx.events(c,this.camera,game);}finally{r.billboardPass=old;r.skillVfx=oldVfx;}
  for(const e of game.units.filter(e=>e.alive&&game.visibleTo(0,e)&&!game.hidden(e)&&e.kind!=='champion'))at(e,()=>{
   if(e.kind==='neutral'){orderMark(r,e,game);r.bar(e,e.camp==='boss'?3.4:1.2,e.y-(e.camp==='boss'?1.8:isClerk(e)?CLERK_HEIGHT+.18:.95),game);if(e.camp!=='central')r.text(e.name,e.x,e.y-(isClerk(e)?CLERK_HEIGHT+.5:1.55),'#d2d4b9',.3);if(e.exposedUntil>game.time)r.text(`받는 피해 +20% ${(e.exposedUntil-game.time).toFixed(1)}s`,e.x,e.y-(isClerk(e)?CLERK_HEIGHT+.85:2),'#edbb97',.25);if(e.returning)r.text('복귀 중',e.x,e.y+.8,'#d1dec5',.25);}
   else if(e.kind==='minion')r.bar(e,.95,e.y-minionHeight(e)-.18,game);
   else if(e.kind==='tower'||e.kind==='core')r.bar(e,e.kind==='core'?3.3:2.3,e.y-(e.kind==='core'?1.45:1.1),game);towerMark(r,e,game);
  });
  for(const e of game.champions().filter(e=>e.alive&&game.visibleTo(0,e)&&(!game.hidden(e)||e.motion?.kind==='leap')).sort((a,b)=>Number(a.player)-Number(b.player)))at(e,()=>{
   championEffects(r,e,game);CombatVisuals.front(r,e,game);championHud(r,e,game);CombatVisuals.meter(r,e,game);
   if(e.easterText?.until>game.time)r.text(e.easterText.text,e.x,e.y-3.2,'#ffe3a7',.36);
  },true);
  c.save();c.setTransform(r.dpr,0,0,r.dpr,0,0);drawPings(c,this.camera,game);c.restore();
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
   this.webgl.render(this.rooftop.background,c);this.webgl.autoClear=false;this.webgl.clearDepth();this.webgl.render(this.scene,c);this.webgl.autoClear=true;this.sceneryAnchor={x:this.camera.x,y:this.camera.y};this.sceneryDirty=false;this.canvas.style.transform='translate3d(0,0,0)';
  }else this.canvas.style.transform=`translate3d(${pan.x}px,${pan.y}px,0)`;
  this.hud(game,playing);
 }
}
