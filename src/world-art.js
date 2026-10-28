import {WORLD_FRAMES} from './world-sprites.js';
import {loadAtlas} from './art.js';

export const WORLD_ART={championHeight:2.1,sideHeight:2.1,centralHeight:1.35,towerHeight:2.1*1.7,coreHeight:2.1*1.4,attackDuration:.28};
// Buildings and minions share the same per-match faction assignment. Blue/red
// identify sides; uniform/suit identify Limbus Company/N Corp respectively.
export const factionFor=(g,e)=>e.faction||g.minionFactions?.[e.team]||(e.team?'suit':'uniform');
export const isCampCreep=e=>e.kind==='neutral'&&['side','central'].includes(e.camp);
function placement(key,height,flip=false){
 const f=WORLD_FRAMES[key],h=height*f.heightScale,w=h*f.w/f.h,anchor=f.ground||f.foot;
 return{key,f,h,w,left:-w*anchor[0],top:-h*anchor[1],anchor,flip,height};
}
export function campPresentation(g,e){
 if(!isCampCreep(e))return null;
 const attacking=!e.returning&&e.swingUntil>g.time,pose=attacking?'Attack':'Idle';
 const key=e.camp==='central'?`sisyphus${pose}`:`leccaki${e.creepVariant===1?'Brown':'Teal'}${pose}`;
 return{...placement(key,e.camp==='side'?WORLD_ART.sideHeight:WORLD_ART.centralHeight,e.camp==='side'&&Math.cos(e.facing||0)<0),attacking};
}
export const campVisualHeight=e=>e.camp==='side'?WORLD_ART.sideHeight:WORLD_ART.centralHeight;
export function structurePresentation(g,e){
 if(!['tower','core'].includes(e.kind))return null;
 const family=factionFor(g,e),color=e.team===1?'red':'blue',key=`${family}_${color}_${e.kind}`;
 return{...placement(key,e.kind==='tower'?WORLD_ART.towerHeight:WORLD_ART.coreHeight,e.kind==='tower'&&e.team===1),family,color};
}
export const structureVisualHeight=(g,e)=>-structurePresentation(g,e).top;
function draw(r,e,p){
 const a=loadAtlas(p.f.sheet);if(!a.complete||!a.naturalWidth)return false;
 const c=r.ctx,f=p.f;c.save();c.translate(e.x,e.y);if(p.flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(a,f.x,f.y,f.w,f.h,p.left,p.top,p.w,p.h);c.restore();return true;
}
export function drawCampCreep(r,e,g){const p=campPresentation(g,e);return p?draw(r,e,p):false;}
export function drawStructure(r,e,g){const p=structurePresentation(g,e);return p?draw(r,e,p):false;}
