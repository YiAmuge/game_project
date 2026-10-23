import { organicPixels,shapeWarp,noise } from './organic-particles.js';
import { AttackStrokes } from './attack-strokes.js';
// Render-only effects: gameplay X/Y is the ground, Z is height (Three.js Y).
// Analytic motion uses simulation time, so pause, low FPS and replay stay stable.
export const VFX_LIMITS={particles:640,emitters:32,tintFrames:64,sprites:384};
export const CHAMPION_ELEMENTS={alisa:'fire',ryoshu:'fire',hohenheim:'electric',rodya:'ice',marton:'wood',dongrang:'wood',honglu:'water',dongbaek:'petal',yi:'mirror',sora:'arcane',yan:'arcane',rudolph:'arcane',gubo:'blood'};
const ELEMENT_FORMS={ice:['crystal','crystal','frost'],electric:['bolt','spark','bolt'],wood:['woodchip','leaf','woodchip'],water:['drop','drop','mist'],petal:['petal','petal','spark'],mirror:['crystal','crystal','spark'],arcane:['rune','spark','rune'],blood:['drop','drop','spark']};
const ELEMENT_MOTION={electric:{speed:1.25,life:.75,drag:1.2},ice:{lift:.85,gravity:1.25},wood:{speed:.8,gravity:.75,drag:1.35},water:{lift:.9,gravity:1.2},petal:{gravity:.6,drag:1.4}};
export const VFX_PRESETS={
 explosion:{count:80,speed:23,lift:11,life:1.55,size:.66,drag:6,gravity:22,light:1,ring:true},
 slash:{count:18,speed:12,lift:5.5,life:.8,size:.15,drag:7,gravity:18,light:.35,ring:false},
 pierce:{count:16,speed:22,lift:4,life:.7,size:.13,drag:7.5,gravity:18,light:.3,ring:false},
 impact:{count:20,speed:14,lift:7,life:.85,size:.21,drag:7,gravity:22,light:.48,ring:true},
 shot:{count:12,speed:26,lift:3.5,life:.48,size:.13,drag:9,gravity:20,light:.6,ring:false},
};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const css=(color,a=1)=>`rgba(${color.join(',')},${clamp(a)})`;
export function coolingColor(color,progress,{accent=color,dark='#2a272c'}={}){
 const hot=rgb(color),white=mix(hot,rgb(accent),.3).map(v=>Math.round(v+(255-v)*.86));
 return progress<.35?mix(white,hot,progress/.35):mix(hot,mix(rgb(dark),[42,39,44],.35),(progress-.35)/.65);
}
export function particlePose(p,time){
 const age=Math.max(0,time-p.born),t=clamp(age/p.life),travel=-Math.expm1(-p.drag*age)/p.drag;
 const airborne=p.z+p.vz*age-.5*p.gravity*age*age;
 return {x:p.x+p.vx*travel,y:p.y+p.vy*travel,z:Math.max(0,airborne),
  vx:p.vx*Math.exp(-p.drag*age),vy:p.vy*Math.exp(-p.drag*age),vz:p.vz-p.gravity*age,
  size:p.size*(1-t)**.8,alpha:(1-t)**1.5,progress:t,landed:age>0&&airborne<=0};
}
export function effectRecipe(fx){
 const kinds={burst:'explosion',ryoshuStorm:'explosion',martonExplosion:'explosion',slash:'slash',
  yanCleave:'slash',ryoshuTrail:'slash',soraClaw:'slash',hongluSweep:'slash',thrust:'pierce',gregorPierce:'pierce',yanWave:'pierce',
  impact:'impact',soraShockwave:'impact',ishmaelShock:'impact',yanGreatsword:'impact',guboLaser:'shot',whipArc:'shot',nailVolley:'shot',guboBlast:'explosion'};
 const kind=fx.type==='line'&&fx.theme==='hohenheim'?'shot':kinds[fx.type];if(!kind)return null;
 return {kind,theme:fx.theme||({hongluSweep:'honglu',yanCleave:'yan',yanWave:'yan',yanGreatsword:'yan',nailVolley:'ppui',soraClaw:'sora'}[fx.type])};
}

export class SkillVFX {
 constructor(){
  this.particles=[];this.free=Array.from({length:VFX_LIMITS.particles},()=>({}));this.emitters=[];this.strokes=new AttackStrokes();
  this.seen=new WeakSet();this.seenProjectiles=new WeakSet();this.seenZones=new WeakSet();this.seenAttacks=new WeakMap();this.sprites=new Map();this.masks=new Map();this.tints=new Map();this.atlasIds=new WeakMap();this.serial=0;this.atlasSerial=0;this.time=0;
 }
 clear(){this.free.push(...this.particles);this.particles.length=0;this.emitters.length=0;this.seen=new WeakSet();this.seenProjectiles=new WeakSet();this.seenZones=new WeakSet();this.seenAttacks=new WeakMap();}
 advance(time){
  if(time<this.time)this.clear();this.time=time;
  let n=0;for(const p of this.particles){if(time-p.born<p.life)this.particles[n++]=p;else this.free.push(p);}this.particles.length=n;
  this.emitters=this.emitters.filter(e=>time-e.born<e.life);
 }
 emit(kind,point,time,{radius=1,angle=0,color='#ff852b',accent=color,dark='#2a272c',element='metal',seed,count}={}){
  const preset=VFX_PRESETS[kind];if(!preset||!Number.isFinite(time)||![point.x,point.y,radius,angle].every(Number.isFinite)||!/^#[\da-f]{6}$/i.test(color))return null;
  if(!/^#[\da-f]{6}$/i.test(accent))accent=color;if(!/^#[\da-f]{6}$/i.test(dark))dark='#2a272c';
  radius=clamp(radius,.3,8);const scale=kind==='explosion'?clamp(radius/4,.5,1.8):1,motion=ELEMENT_MOTION[element]||{};
  let state=(seed??++this.serial)>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const emitter={kind,x:point.x,y:point.y,born:time,radius,angle,color,accent,dark,element,life:preset.life*(motion.life||1),light:preset.light,ring:preset.ring};
  if(this.emitters.length>=VFX_LIMITS.emitters)this.emitters.shift();this.emitters.push(emitter);
  const total=clamp(Math.round(count??preset.count),1,VFX_LIMITS.particles);
  for(let i=0;i<total;i++){
   const p=this.free.pop()||this.particles.shift(),fan=random()-.5;
   const a=kind==='slash'?angle+fan*2.4:kind==='pierce'||kind==='shot'?angle+fan*.75:random()*Math.PI*2;
   const speed=preset.speed*(.35+random()*.8)*scale*(motion.speed||1),offset=kind==='slash'?radius*(.35+random()*.55):random()*.2;
   const forms=ELEMENT_FORMS[element],form=forms?forms[i%forms.length]:element==='fire'&&kind==='explosion'?(i<18?'flame':i<52?'spark':i<64?'chunk':'smoke'):(i%4===0?'chunk':'spark');
   const life=emitter.life*(.65+random()*.35),size=preset.size*(.55+random()*.7)*scale*(form==='spark'?.22:['smoke','mist','frost'].includes(form)?1.8:form==='bolt'?.25:.7);
   Object.assign(p,{x:point.x+Math.cos(a)*offset,y:point.y+Math.sin(a)*offset,z:kind==='shot'?.8:.12,
    vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,vz:preset.lift*(.6+random()*.6)*Math.sqrt(scale)*(motion.lift||1),
    gravity:preset.gravity*(motion.gravity||1),drag:preset.drag*(motion.drag||1),born:time,life,size,form,color,accent,dark,element,rotation:random()*Math.PI*2,spin:(random()-.5)*7,variant:Math.floor(random()*4),phase:random()*20});
   this.particles.push(p);
  }
  return emitter;
 }
 sync(game,camera,themes){
  if(this.game!==game){this.clear();this.game=game;}this.advance(game.time);
  const observed=new Set();
  const visible=p=>{const s=camera.worldToScreen(p);return s.x>-300&&s.x<camera.width+300&&s.y>-300&&s.y<camera.height+300;};
  for(const fx of game.effects){
   if(this.seen.has(fx))continue;this.seen.add(fx);const recipe=effectRecipe(fx);if(!recipe||!visible(fx))continue;
   const angle=fx.angle??(fx.to?Math.atan2(fx.to.y-fx.y,fx.to.x-fx.x):0),theme=themes[recipe.theme]||{};observed.add(recipe.theme);
   this.emit(recipe.kind,fx,game.time-Math.max(0,fx.maxLife-fx.life),{radius:fx.r||1,angle,color:theme.light||fx.color||'#bde9f0',accent:theme.accent,dark:theme.dark,element:CHAMPION_ELEMENTS[recipe.theme]||'metal'});
  }
  for(const p of game.projectiles){
   if(this.seenProjectiles.has(p))continue;this.seenProjectiles.add(p);
   const origin=p.origin||p.source;if(!origin||!visible(origin)||p.source&&!game.visibleTo(0,p.source))continue;
   const key=p.theme||p.source?.key,theme=themes[key]||{};observed.add(key);
   this.emit('shot',origin,game.time,{angle:Math.atan2(p.dy??p.target?.y-p.y,p.dx??p.target?.x-p.x),
    color:theme.light||p.color||'#ffe4b0',accent:theme.accent,dark:theme.dark,element:CHAMPION_ELEMENTS[p.theme||p.source?.key]||'metal',count:p.source?.kind==='champion'?12:5});
  }
  // Some rectangular and dash basics have no separate swing effect on a miss.
  for(const e of game.champions()){
   if(this.seenAttacks.get(e)===e.attackSerial)continue;this.seenAttacks.set(e,e.attackSerial);
   if(!e.attackSerial||e.trainingDummy||observed.has(e.key)||!e.alive||game.time-e.attackAt>.3||!visible(e)||!game.visibleTo(0,e))continue;
   const style=game.attackStyle(e),kind=({slash:'slash',sweep:'slash',thrust:'pierce',punch:'impact',shot:'shot',throw:'shot',whip:'pierce',flame:'pierce'})[style];if(!kind)continue;
   const theme=themes[e.key]||{},angle=e.attackFacing??e.facing??0,radius=game.attackRange(e),point=style==='punch'?{x:e.x+Math.cos(angle)*radius*.6,y:e.y+Math.sin(angle)*radius*.6}:e;
   this.emit(kind,point,e.attackAt,{angle,radius,color:theme.light||'#bde9f0',accent:theme.accent,dark:theme.dark,element:CHAMPION_ELEMENTS[e.key]||'metal'});
  }
  const zoneElements={waterfall:'water',ice:'ice',desireTree:'wood',electricBloom:'electric'};
  for(const z of game.zones||[]){
   if(this.seenZones.has(z))continue;this.seenZones.add(z);const element=zoneElements[z.kind];if(!element||!visible(z))continue;
   const theme=themes[z.source?.key]||{};this.emit('explosion',z,game.time,{radius:z.r||3,color:theme.light||'#bde9f0',accent:theme.accent,dark:theme.dark,element});
  }
 }
 prepare(camera,width,height){
  this.camera=camera;this.frame=[];this.cursor=0;
  for(const p of this.particles){
   const pose=particlePose(p,this.time);if(pose.alpha<=0)continue;
   const screen=camera.worldToScreen(pose,pose.z+.075),size=pose.size*camera.scale;
   if(screen.x+size<-30||screen.x-size>width+30||screen.y+size*2<-30||screen.y-size*2>height+30)continue;
   this.frame.push({p,pose,screen,size});
  }
  this.frame.sort((a,b)=>a.pose.y-b.pose.y);
 }
 sprite(form,color,stage,palette,variant=0){
  const key=[form,color,stage,palette.accent,palette.dark,variant].join('/');
  if(this.sprites.has(key)){const hit=this.sprites.get(key);this.sprites.delete(key);this.sprites.set(key,hit);return hit;}
  const maskKey=form+'/'+variant;let mask=this.masks.get(maskKey);
  if(!mask){mask=document.createElement('canvas');mask.width=mask.height=64;const m=mask.getContext('2d'),pixels=m.createImageData(64,64);pixels.data.set(organicPixels(form,variant));m.putImageData(pixels,0,0);this.masks.set(maskKey,mask);}
  if(this.sprites.size>=VFX_LIMITS.sprites)this.sprites.delete(this.sprites.keys().next().value);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),tone=coolingColor(color,stage/7,palette);
  c.fillStyle=css(tone);c.fillRect(0,0,64,64);c.globalCompositeOperation='multiply';c.drawImage(mask,0,0);
  c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);this.sprites.set(key,canvas);return canvas;
 }
 drawOrganic(ctx,{p,pose,screen:s,size}){
  const warp=shapeWarp(p,this.time),phase=Math.floor(warp.frame),blend=warp.frame-phase,alpha=ctx.globalAlpha,stage=Math.min(7,Math.floor(pose.progress*8));
  const stretch=p.form==='flame'?1.55:p.form==='woodchip'||p.form==='crystal'?1.4:1;
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate(warp.turn);ctx.transform(warp.x,0,warp.shear,warp.y*stretch,0,0);
  for(const [variant,weight] of [[phase,1-blend],[(phase+1)%4,blend]]){
   if(weight<.001)continue;ctx.globalAlpha=alpha*weight;
   ctx.drawImage(this.sprite(p.form,p.color,stage,p,variant),-size,-size,size*2,size*2);
  }
  ctx.restore();
 }
 drawUntil(ctx,depth=Infinity){
  ctx.save();
  while(this.cursor<this.frame.length&&this.frame[this.cursor].pose.y<=depth){
   const f=this.frame[this.cursor++],{p,pose,screen:s,size}=f,hot=pose.progress<.65&&!['smoke','mist','frost','woodchip','leaf','petal'].includes(p.form);
   ctx.globalCompositeOperation=hot?'lighter':'source-over';ctx.globalAlpha=pose.alpha;
   if(p.form==='bolt'){this.drawBolt(ctx,f);continue;}
   if(p.form==='spark'){
    const old=particlePose(p,Math.max(p.born,this.time-.035)),tail=this.camera.worldToScreen(old,old.z+.075);
    ctx.strokeStyle=css(coolingColor(p.color,pose.progress,p));ctx.lineWidth=Math.max(.65,size*.4);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(s.x,s.y);ctx.stroke();
   }
   this.drawOrganic(ctx,f);
  }
  ctx.restore();
 }
 drawBolt(ctx,{p,pose,screen:s,size}){
  const age=this.time-p.born,old=particlePose(p,Math.max(p.born,this.time-.065)),tail=this.camera.worldToScreen(old,old.z+.075),dx=s.x-tail.x,dy=s.y-tail.y,n=Math.hypot(dx,dy)||1,points=[];
  for(let i=0;i<=8;i++){
   const offset=i===0||i===8?0:(noise(p.phase+i*2.3,age*22,p.variant+5)-.5)*Math.max(6,size*5);
   points.push({x:tail.x+dx*i/8-dy/n*offset,y:tail.y+dy*i/8+dx/n*offset});
  }
  ctx.beginPath();points.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));
  for(const i of [3,5]){const q=points[i],turn=(noise(p.phase+i,age*18,4)-.5)*2;ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-dy/n*(4+size*2)*turn,q.y+dx/n*(4+size*2)*turn);}
  const alpha=ctx.globalAlpha;ctx.globalAlpha=alpha*.18;ctx.strokeStyle=css(rgb(p.color));ctx.lineWidth=Math.max(5,size*2);ctx.stroke();
  ctx.globalAlpha=alpha*.75;ctx.lineWidth=Math.max(1.4,size*.7);ctx.stroke();ctx.strokeStyle=css(coolingColor(p.color,0,p));ctx.lineWidth=.55;ctx.stroke();ctx.globalAlpha=alpha;
 }
 drawFlashes(ctx,camera){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const e of this.emitters){
   const age=this.time-e.born;if(age<0||age>.12||!['shot','pierce','impact','explosion'].includes(e.kind))continue;
   const s=camera.worldToScreen(e,e.kind==='shot'?.8:.2),toward=camera.worldToScreen({x:e.x+Math.cos(e.angle),y:e.y+Math.sin(e.angle)},e.kind==='shot'?.8:.2);
   const size=camera.scale*(e.kind==='explosion'?.85:e.kind==='impact'?.45:.5)*(1-age/.12);
   ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(toward.y-s.y,toward.x-s.x));ctx.globalAlpha=(1-age/.12)**2;
   const form=({fire:'flame',water:'mist',ice:'frost',wood:'woodchip'}[e.element])||'glow';
   ctx.transform(e.kind==='shot'?2.8:1.4,0,.25,.8,0,0);
   ctx.drawImage(this.sprite(form,e.color,0,e,1),-size,-size,size*2,size*2);ctx.restore();
  }
  ctx.restore();
 }
 groundDisc(ctx,camera,e,radius,draw){
  const o=camera.worldToScreen(e,.06),x=camera.worldToScreen({x:e.x+1,y:e.y},.06),y=camera.worldToScreen({x:e.x,y:e.y+1},.06);
  ctx.save();ctx.translate(o.x,o.y);ctx.transform((x.x-o.x)*radius,(x.y-o.y)*radius,(y.x-o.x)*radius,(y.y-o.y)*radius,0,0);draw();ctx.restore();
 }
 drawGround(ctx,camera){
  ctx.save();
  for(const e of this.emitters){
   const age=this.time-e.born;if(age<0)continue;const power=e.light*Math.exp(-age*6),range=e.radius*(e.kind==='explosion'?1.65:1.2)+1;
   this.strokes.draw(ctx,camera,e,this.time);
   if(power>.005)this.groundDisc(ctx,camera,e,range,()=>{
    ctx.globalCompositeOperation='lighter';const glow=ctx.createRadialGradient(0,0,0,0,0,1);
    glow.addColorStop(0,css(rgb(e.color),power*.58));glow.addColorStop(.35,css(rgb(e.color),power*.28));glow.addColorStop(1,css(rgb(e.color),0));
    ctx.fillStyle=glow;ctx.fillRect(-1,-1,2,2);
   });
   if(e.ring&&age<.55)this.groundDisc(ctx,camera,e,e.radius*Math.max(.001,1-Math.exp(-age*12)),()=>{
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-age/.55)**2;ctx.strokeStyle=css(coolingColor(e.color,age/.55,e));ctx.lineWidth=.035;
    const phase=e.x*.7+e.y*.4+e.born;
    if(e.element==='wood'){
     for(let i=0;i<7;i++){const a=i*.91+noise(phase,i,2)*.45,len=.55+noise(i,phase,5)*.45,x=Math.cos(a)*len,y=Math.sin(a)*len,bend=(noise(i,phase+age,8)-.5)*.4;
      ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(x*.4-y*bend,y*.4+x*bend,x,y);ctx.moveTo(x*.55,y*.55);ctx.quadraticCurveTo(x*.7-y*.12,y*.7+x*.12,x*.6-y*.3,y*.6+x*.3);ctx.stroke();}
    }else if(e.element==='electric'){
     for(let i=0;i<8;i++){const a=i*.79+noise(i,phase,6)*.7,len=.5+noise(phase,i,3)*.5;ctx.beginPath();ctx.moveTo(0,0);
      for(let j=1;j<=6;j++){const turn=(noise(i*3+j,phase+age*20,5)-.5)*.3;ctx.lineTo(Math.cos(a+turn)*j/6*len,Math.sin(a+turn)*j/6*len);}ctx.stroke();}
    }else{
     for(let i=0;i<(e.element==='water'?3:1);i++){ctx.beginPath();for(let j=0;j<=72;j++){const a=j*Math.PI/36,n=noise(Math.cos(a)*3+phase,Math.sin(a)*3+age*2+i,7),r=(1-i*.16)*(1+(n-.5)*.12),x=Math.cos(a)*r,y=Math.sin(a)*r;
      if(j===0||n<.2)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
    }
   });
  }
  // Small ground shadows separate airborne fragments from their landing plane.
  for(const p of this.particles){
   if(!['chunk','woodchip','crystal','drop'].includes(p.form))continue;const pose=particlePose(p,this.time),s=camera.worldToScreen(pose,.06);
   ctx.globalCompositeOperation='source-over';ctx.globalAlpha=pose.alpha*.25/(1+pose.z);ctx.fillStyle='#101018';
   ctx.beginPath();ctx.ellipse(s.x,s.y,Math.max(1,p.size*camera.scale),Math.max(.5,p.size*camera.scale*.45),0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 lightAt(point){
  let strength=0,color='#ffb85d';
  for(const e of this.emitters){const age=this.time-e.born;if(age<0)continue;const range=e.radius*1.65+2,d=Math.hypot(point.x-e.x,point.y-e.y);
   const n=e.light*Math.exp(-age*6)*Math.max(0,1-d/range)**2;if(n>strength){strength=n;color=e.color;}}
  return {strength:Math.min(.8,strength),color};
 }
 tintFrame(atlas,frame,color){
  if(!this.atlasIds.has(atlas))this.atlasIds.set(atlas,++this.atlasSerial);
  const key=[this.atlasIds.get(atlas),frame.x,frame.y,frame.w,frame.h,color].join('/');if(this.tints.has(key))return this.tints.get(key);
  if(this.tints.size>=VFX_LIMITS.tintFrames)this.tints.delete(this.tints.keys().next().value);
  const canvas=document.createElement('canvas');canvas.height=160;canvas.width=Math.max(1,Math.round(160*frame.w/frame.h));
  const c=canvas.getContext('2d');c.drawImage(atlas,frame.x,frame.y,frame.w,frame.h,0,0,canvas.width,canvas.height);
  c.globalCompositeOperation='source-in';c.fillStyle=css(mix(rgb(color),[255,255,255],.45));c.fillRect(0,0,canvas.width,canvas.height);
  this.tints.set(key,canvas);return canvas;
 }
}
