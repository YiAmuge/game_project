import { drawClerk,isClerk,CLERK_HEIGHT } from './clerk-art.js';
import { drawMinimap } from './minimap.js';
import { paintHealth } from './health-display.js';
import { combatStyle } from './combat-style.js';
import { championPresentation } from './champion-vfx.js';
import { drawEyeGlow } from './sprite-eyes.js';
import { leapLift,renderAnchor,leapOpacity } from './projection-25d.js';
import { MotionTrails,ribbonSections,drawRibbon,captureBlade,projectBlade } from './weapon-trails.js';
import * as CombatVisuals from './combat-visuals.js';
import * as Yan from './yan.js';
import * as Hohenheim from './hohenheim.js';
import * as Training from './training.js';
import { ego as soraEgo,basicImpact as soraImpact } from './sora.js';
import { WALLS, BUSHES, RULES, MAP_SCALE, MAP_CENTER, FOUNTAINS, WELL_ROOMS, FOUNTAIN_AREAS, WORLD, TERRAIN, MINIONS, worldPoint, RUNTIME_CHAMPIONS as CHAMPIONS, lanePath } from './data.js';
import { distance } from './geometry.js';
import { Camera } from './camera.js';
import { Renderer25D } from './render-25d.js';
import { FRAMES, THEMES, loadAtlas,visualForm,spriteHeight } from './art.js';
import { drawEquipment,drawBackEquipment,equipmentPose,spriteOrigin,orientWeapon } from './weapon-art.js';
import { draw as bossPattern } from './boss-patterns.js';
import { draw as creepPattern } from './creep-patterns.js';
import { targetingPreview } from './targeting.js';
import { championHud, championEffects, championGroundEffects, chargePreview, orderMark, threatRanges } from './overlays.js';

export class Renderer {
  constructor(canvas) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera=new Camera();this.atlas=loadAtlas();this.atlasExtra=loadAtlas(1);this.atlasV05=loadAtlas(2);this.atlasV06=loadAtlas(3);this.atlasV08=loadAtlas(4);this.atlasV10=loadAtlas(5);this.atlasV12=loadAtlas(6);this.atlasV13=loadAtlas(7);this.atlasV17=loadAtlas(8);this.atlasV36=loadAtlas(9);this.weaponAtlas=loadAtlas(10);this.clerkAtlas=loadAtlas(11);this.scale=1;this.ox=0;this.oy=0;this.resize();}
  resize() {
    const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);
    this.dpr=dpr;this.width=r.width;this.height=r.height;
    this.scene25d?.resize();
  }
  prepare(game){
    if(game.training25d&&!this.scene25d)this.scene25d=new Renderer25D(this);
    this.flatCamera??=this.camera;
    this.camera=game.training25d?this.scene25d.camera:this.flatCamera;
    if(this.scene25d)this.scene25d.canvas.hidden=!game.training25d;
  }
  follow(game,playing){this.prepare(game);this.camera.update(this.width,this.height,renderAnchor(game.player),playing);this.scale=this.camera.scale;this.ox=this.camera.ox;this.oy=this.camera.oy;}
  point(clientX,clientY) {const r=this.canvas.getBoundingClientRect();return this.camera.screenToWorld(clientX-r.left,clientY-r.top);}
  circle(x,y,r,fill,stroke=null,width=.07) {const c=this.ctx;c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  line(points,color,width,dash=[]) {const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.stroke();c.setLineDash([]);}
  text(text,x,y,color='#afbdac',size=.5,align='center',serif=false) {const c=this.ctx;c.fillStyle=color;c.font=`${size}px ${serif?'Georgia':'"Malgun Gothic", Arial'}, sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y);}
  polygon(points,fill,stroke=null) {const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.08;c.stroke();}}
  trainingFloor(game){
    const c=this.ctx,b=game.bounds;c.fillStyle='#0c191e';c.fillRect(b.x-20,b.y-20,b.w+40,b.h+40);c.fillStyle='#243733';c.fillRect(b.x,b.y,b.w,b.h);
    for(const a of Training.areas(game)){c.fillStyle=a.color+'18';c.fillRect(a.x,a.y,a.w,a.h);c.strokeStyle=a.color+'66';c.lineWidth=.06;c.strokeRect(a.x,a.y,a.w,a.h);this.text(`${a.id} · ${a.name}`,a.x+a.w/2,a.y+1,a.color,.52);}
    for(let x=0;x<b.w;x+=2)this.line([{x,y:0},{x,y:b.h}],'#96bba60a',.03);
    for(let y=0;y<b.h;y+=2)this.line([{x:0,y},{x:b.w,y}],'#96bba60a',.03);
    for(const w of game.map.walls){c.fillStyle='#53665b';c.fillRect(w.x,w.y,w.w,w.h);c.strokeStyle='#9caf90';c.lineWidth=.04;c.strokeRect(w.x,w.y,w.w,w.h);}
    const h=Training.HAZARD;c.fillStyle='#a554472d';c.fillRect(h.x,h.y,h.w,h.h);c.strokeStyle='#d09370';c.lineWidth=.08;c.strokeRect(h.x,h.y,h.w,h.h);
    this.text('피해 장판',h.x+h.w/2,h.y+h.h/2-.25,'#e3ab88',.3);this.text('초당 최대 체력 3.3%',h.x+h.w/2,h.y+h.h/2+.3,'#e3ab88',.23);
    const f=Training.SPAWN;this.circle(f.x,f.y,2.5,'#7ed3d21a','#a4ded8',.08);this.circle(f.x,f.y,1.6,null,'#a4ded855',.06);this.text('부활소',f.x,f.y+3,'#b7e4db',.4);
    this.line(Training.lanePath(0),'#ab9c6644',2.5);this.text(game.practice.lineStopped?'라인 정지 · 우측 상단 옵션에서 초기화':'미니언 · 포탑 실험 라인',41.5,12,'#d4bf89',.43);
  }
  floor(game) {
    if(game.training){this.trainingFloor(game);return;}
    const c=this.ctx;
    c.fillStyle='#0b161c';c.fillRect(WORLD.x,WORLD.y,WORLD.w,WORLD.h);c.save();c.beginPath();for(const room of TERRAIN)c.rect(room.x,room.y,room.w,room.h);c.clip();c.fillStyle='#203331';c.fillRect(WORLD.x,WORLD.y,WORLD.w,WORLD.h);c.save();c.scale(MAP_SCALE,MAP_SCALE);
    const g=c.createRadialGradient(32,18,1,32,18,35);g.addColorStop(0,'#2a3736');g.addColorStop(1,'#192a2c');
    c.fillStyle=g;c.beginPath();c.moveTo(10,2);c.lineTo(54,2);c.quadraticCurveTo(58,2,59,8);c.quadraticCurveTo(63.5,9,63.5,18);c.quadraticCurveTo(63.5,27,59,28);c.quadraticCurveTo(58,34,54,34);c.lineTo(10,34);c.quadraticCurveTo(6,34,5,28);c.quadraticCurveTo(.5,27,.5,18);c.quadraticCurveTo(.5,9,5,8);c.quadraticCurveTo(6,2,10,2);c.fill();c.strokeStyle='#3a4a46';c.lineWidth=.14;c.stroke();
    c.restore();c.save();
    for(let y=WORLD.y;y<WORLD.y+WORLD.h;y+=2)for(let x=WORLD.x;x<WORLD.x+WORLD.w;x+=2) {
      const n=(x*17+y*11)%7;c.fillStyle=`rgba(134,153,132,${.012+n*.003})`;c.fillRect(x+.08,y+.08,1.84,1.84);
    }
    for(let lane=0;lane<2;lane++) {
      const points=lanePath(0,lane);this.line(points,'#414b4140',3.3);this.line(points,'#56614a30',.08);this.line(points,'#a9ab7130',.06,[.15,.6]);
    }
    this.line([worldPoint(6,18),worldPoint(58,18)],'#414e3e40',2);
    for(const b of BUSHES)this.bush(b);
    for(const w of WALLS) {
      c.fillStyle='#0a141bbb';c.fillRect(w.x+.35,w.y+.45,w.w,w.h);
      c.fillStyle='#152329';c.fillRect(w.x,w.y+.3,w.w,w.h);
      c.fillStyle='#3a4946';c.fillRect(w.x,w.y,w.w,w.h);
      c.strokeStyle='#647061';c.lineWidth=.07;c.strokeRect(w.x+.08,w.y+.08,w.w-.16,w.h-.16);
      this.line([{x:w.x+.2,y:w.y+.22},{x:w.x+w.w-.2,y:w.y+.22}],'#84917a66',.06);
      for(let x=w.x+1;x<w.x+w.w;x+=1.4)this.line([{x,y:w.y},{x:x-.15,y:w.y+w.h}],'#16262a88',.05);
    }
    for(const a of FOUNTAIN_AREAS){const color=a.team?'#df9b82':'#8adfe1';c.fillStyle=color+'22';c.fillRect(a.x,a.y,a.w,a.h);c.strokeStyle=color;c.lineWidth=.13;c.strokeRect(a.x,a.y,a.w,a.h);this.text('부활소',a.x+a.w/2,a.y+a.h/2,color,.42);}
    this.text('UPPER LINE',MAP_CENTER.x,4.7,'#84907866',.43);this.text('LOWER LINE',MAP_CENTER.x,RULES.height-4.5,'#84907866',.43);
    c.restore();
    this.text('N',2,2,'#617972',.5);this.line([{x:2,y:4},{x:2,y:2.6}],'#617972',.08);this.polygon([[1.8,2.9],[2,2.5],[2.2,2.9]],'#617972');c.restore();for(const room of TERRAIN.slice(1)){c.strokeStyle='#6c887855';c.lineWidth=.12;c.strokeRect(room.x+.08,room.y+.08,room.w-.16,room.h-.16);}
  }
  camps(game){
    const c=this.ctx;
    for(const camp of game.campViews()){
      const color=camp.kind==='boss'?'#ae83c4':camp.kind==='blessing'?'#74abb1':camp.kind==='amplify'?'#b587a5':'#92966e';
      this.circle(camp.home.x,camp.home.y,camp.radius,color+'12',color+'55',.065);c.setLineDash([.15,.22]);this.circle(camp.home.x,camp.home.y,camp.radius+.15,null,color+'44',.04);c.setLineDash([]);
      this.text(camp.name+' 캠프',camp.home.x,camp.home.y+camp.radius+.45,color,.29);
    }
    for(const timer of game.campTimers()){const p=timer.home;this.circle(p.x,p.y,.65,'#182720', '#9b9568',.05);this.text(`${Math.floor(timer.seconds/60)}:${String(timer.seconds%60).padStart(2,'0')}`,p.x,p.y,'#ecd59b',.38);this.text('재생성',p.x,p.y+.55,'#97a586',.22);}
  }
  bar(e,width,y,game) {
    const c=this.ctx,x=e.x-width/2;
    c.fillStyle='#081317';c.fillRect(x-.05,y-.05,width+.1,.31);
    paintHealth(c,e,game,x,y,width,.21,e.team===0?'#87b8bc':e.team===1?'#c78578':e.camp==='boss'?'#b38ecb':'#b0a16d');
  }
  structure(e,game) {
    const color=e.team===0?'#8bb8c2':'#c4897e',dark=e.team===0?'#3b6169':'#704941';
    if(!e.alive){this.circle(e.x,e.y,e.radius,'#151f22','#536058');this.line([{x:e.x-.5,y:e.y-.5},{x:e.x+.5,y:e.y+.5}],'#64705a',.12);return;}
    const locked=game.locked(e);
    if(game.player.alive&&e.team!==0&&distance(e,game.player)<e.range+2){const c=this.ctx;c.setLineDash([.2,.22]);this.circle(e.x,e.y,e.range,'#b66b5520','#c4816b70',.055);c.setLineDash([]);}
    this.circle(e.x,e.y+.15,e.radius+.3,'#101b1f');
    if(e.kind==='core') {
      this.circle(e.x,e.y,1.9,`${dark}55`,`${color}66`);this.circle(e.x,e.y,1.45,dark,color,.1);this.circle(e.x,e.y,1.1,'#192b2c',color,.06);
      this.polygon([[e.x,e.y-.8],[e.x+.65,e.y],[e.x,e.y+.8],[e.x-.65,e.y]],color);
      if(locked){this.circle(e.x,e.y,2.25,null,`${color}66`,.045);this.text('LOCKED',e.x,e.y+2.5,color,.39);}
      else this.text('본진',e.x,e.y+2.35,color,.4);

    } else {
      this.polygon([[e.x-.8,e.y+.7],[e.x-.7,e.y-.4],[e.x-.45,e.y-.95],[e.x+.45,e.y-.95],[e.x+.7,e.y-.4],[e.x+.8,e.y+.7]],dark,color);
      this.polygon([[e.x-.4,e.y+.35],[e.x-.4,e.y-.45],[e.x-.16,e.y-.45],[e.x-.16,e.y-.15],[e.x+.16,e.y-.15],[e.x+.16,e.y-.45],[e.x+.4,e.y-.45],[e.x+.4,e.y+.35]],color);

    }
  }
  unit(e,game) {
    if(!e.alive||game.hidden(e)&&e.motion?.kind!=='leap'||!game.visibleTo(0,e))return;
    if(e.kind==='summon'){this.yanHand(e,game);return;}
    const c=this.ctx,team=e.team===0?'#92cad3':e.team===1?'#d99588':e.camp==='boss'?'#c1a0d9':e.camp==='blessing'?'#84bdc5':e.camp==='amplify'?'#c69db6':'#c7b67c';
    if(!this.billboardPass)this.circle(e.x+.1,e.y+.3,e.radius+.14,'#07161a77');
    if(e.kind==='minion') {
      c.save();c.translate(e.x,e.y);c.scale(MINIONS.size,MINIONS.size);c.translate(-e.x,-e.y);
      if(e.siege)this.polygon([[e.x-.45,e.y-.3],[e.x+.45,e.y-.3],[e.x+.45,e.y+.3],[e.x-.45,e.y+.3]],team,'#182528');
      else if(e.ranged)this.polygon([[e.x,e.y-.38],[e.x+.32,e.y+.22],[e.x-.32,e.y+.22]],team);
      else this.circle(e.x,e.y,.24,team);
      c.restore();return;
    }
    if(e.kind==='neutral') {
      if(drawClerk(this,e,game)) {
        // Clerk body and independent held weapon are drawn together.
      } else if(e.camp==='boss') {
        if(!this.billboardPass)this.circle(e.x,e.y,1.6,'#b788d312','#c6a6dd55');
        this.polygon([[e.x-1.1,e.y-.9],[e.x-.3,e.y-.6],[e.x+.3,e.y-.6],[e.x+1.1,e.y-.9],[e.x+.8,e.y+.4],[e.x,e.y+1],[e.x-.8,e.y+.4]],'#705982',team);
        this.line([{x:e.x-.55,y:e.y-.15},{x:e.x-.2,y:e.y+.05}],'#ead3f0',.14);this.line([{x:e.x+.2,y:e.y+.05},{x:e.x+.55,y:e.y-.15}],'#ead3f0',.14);
      } else {
        this.circle(e.x,e.y,.62,'#111d21',`${team}66`);this.polygon([[e.x,e.y-.4],[e.x+.3,e.y],[e.x,e.y+.4],[e.x-.3,e.y]],team);
      }

      if(!this.billboardPass){
        if(e.exposedUntil>game.time)this.text(`받는 피해 +20% ${(e.exposedUntil-game.time).toFixed(1)}s`,e.x,e.y-(isClerk(e)?CLERK_HEIGHT+.9:1.6),'#edbb97',.25);
        if(e.returning)this.text('복귀 중',e.x,e.y+1.5,'#d1dec5',.32);
        if(e.camp==='boss'||['amplify','blessing'].includes(e.camp))this.text(e.name,e.x,e.y+(e.camp==='boss'?1.7:1.05),team,.4);
      }
      return;
    }
    if(e.trainingDummy){const team=e.team===0?'#a9d3df':'#e2a79a';this.line([{x:e.x,y:e.y+.25},{x:e.x,y:e.y-1.8}],'#8d7959',.2);this.line([{x:e.x-.7,y:e.y-.85},{x:e.x+.7,y:e.y-.85}],'#a49171',.18);this.circle(e.x,e.y-1.5,.48,'#a99772',team,.085);this.circle(e.x,e.y-1.5,.23,null,team,.05);this.line([{x:e.x-.5,y:e.y+.3},{x:e.x+.5,y:e.y+.3}],'#9f8c66',.14);return;}
    if(e.kind==='bait'&&this.billboardPass){const v=this.scene25d.championVfx;const c=this.ctx;c.save();c.translate(e.x,e.y-.65);v.fairy(c,game.time,.8);c.restore();return;}
    if(e.kind==='bait'){this.circle(e.x,e.y,.65,'#344725','#bdd079');this.polygon([[e.x-.25,e.y-.9],[e.x+.25,e.y-.9],[e.x+.3,e.y-.3],[e.x-.3,e.y-.3]],'#f1d779','#ffe9a4');this.text('초롱 미끼',e.x,e.y-1.3,'#e8dc9a',.27);return;}
    const def=CHAMPIONS[e.key],inBush=game.bushAt(e),angle=e.facing??(e.team===0?0:Math.PI);
    if(!this.billboardPass)CombatVisuals.behind(this,e,game);c.save();if(inBush)c.globalAlpha=.72;if(e.key==='ryoshu'&&e.invulnerableUntil>game.time)c.globalAlpha*=.65;c.globalAlpha*=leapOpacity(e);
    if(!this.billboardPass){c.beginPath();c.ellipse(e.x,e.y+.2,.65,.25,0,0,Math.PI*2);c.fillStyle='#06131599';c.fill();this.circle(e.x,e.y,.67,null,e.player?'#f2d98e':team,.07);}
    if(!this.billboardPass&&game.shield(e)>0)this.circle(e.x,e.y-.65,1.05,'#9fc9d711','#c8e4df99',.055);
    if(!this.billboardPass&&(game.buff(e,'marks')||game.buff(e,'resolve')))this.circle(e.x,e.y,1,null,'#d9be78aa',.09);
    drawBackEquipment(this,e,game,{lift:championPresentation(game,e).lift});
    const visual=visualForm(game,e),f=FRAMES[visual],h=spriteHeight(visual),w=f?h*f.w/f.h:1.25,left=-w*(f?.foot?.[0]??.5),top=-h*(f?.foot?.[1]??1),atlas=this.atlasFor(visual);
    c.save();const appearance=championPresentation(game,e),origin=spriteOrigin(game,e,appearance.lift);c.globalAlpha*=appearance.dim;if(appearance.frozen)c.filter='grayscale(.6) sepia(.2) hue-rotate(155deg) brightness(1.12)';c.translate(origin.x,origin.y);if((Math.cos(angle)<0)!==Boolean(f?.mirror))c.scale(-1,1);
    if(f&&atlas.complete&&atlas.naturalWidth){
      c.imageSmoothingEnabled=false;c.drawImage(atlas,f.x,f.y,f.w,f.h,left,top,w,h);
      if(e.key==='alisa'&&e.state.detonatesAt>game.time&&this.skillVfx){c.save();c.globalAlpha*=.15+.65*Math.max(0,Math.min(1,(game.time-e.state.detonationAt)/2));c.drawImage(this.skillVfx.tintFrame(atlas,f,'#f25934'),left,top,w,h);c.restore();}
      if(game.buff(e,'queequegUlt')&&this.skillVfx){c.save();c.globalAlpha*=.22;c.drawImage(this.skillVfx.tintFrame(atlas,f,'#c44034'),left,top,w,h);c.restore();}
      if(appearance.frozen&&this.skillVfx){c.save();c.globalAlpha*=.28;c.drawImage(this.skillVfx.tintFrame(atlas,f,'#a7d0e5'),left,top,w,h);c.restore();}
      const light=this.skillVfx?.lightAt(e);if(light?.strength>.01){c.save();c.globalCompositeOperation='lighter';c.globalAlpha*=light.strength;c.drawImage(this.skillVfx.tintFrame(atlas,f,light.color),left,top,w,h);c.restore();}
      if(e.key==='myo'&&game.buff(e,'rabbitFrenzy'))drawEyeGlow(c,f,{left,top,w,h},game.time);
    }
    else {c.fillStyle=def.color;c.fillRect(-.42,-1.8,.84,.8);c.fillStyle='#273642';c.fillRect(-.38,-1,.76,1);}
    c.restore();
    if(e.naturalHealing){this.text('+',e.x+.85,e.y-1.6+Math.sin(game.time*5)*.1,'#a4e9a1',.55);if(!this.billboardPass)this.circle(e.x,e.y,.8,null,'#a3d89766',.05);}
    this.weapon(e,game);
    c.restore();

    if(e.player&&inBush)this.text(e.revealedUntil>game.time?'노출 중':'수풀 은닉',e.x,e.y+.8,'#a9d890',.32);
  }
  yanHand(e,game){
    const c=this.ctx,f=FRAMES.yanHand,a=this.atlasFor('yanHand');if(!a.complete||!a.naturalWidth)return;
    c.save();c.translate(e.x,e.y-.5);c.rotate(e.facing||0);const pulse=Math.max(0,1-(game.time-(e.struckAt??-99))/.18);c.scale(1+pulse*.12,1+pulse*.12);c.imageSmoothingEnabled=false;const h=3.2*f.h/f.w;c.drawImage(a,f.x,f.y,f.w,f.h,-1.6,-h/2,3.2,h);c.restore();
  }
  hohenheimChargePreview(e,game){
    const shape=Hohenheim.chargeShape(game,e,game.input.aim),d=shape.d,side={x:-d.y*shape.width,y:d.x*shape.width},end={x:e.x+d.x*shape.range,y:e.y+d.y*shape.range};
    this.polygon([[e.x+side.x,e.y+side.y],[end.x+side.x,end.y+side.y],[end.x-side.x,end.y-side.y],[e.x-side.x,e.y-side.y]],'#84edee22','#b5f6faaa');
    this.text(`전류 ${Math.round(shape.progress*100)}% · ${shape.hits}회`,e.x,e.y+1.1,'#b5f6fa',.3);
    for(let i=0;i<3;i++){const a=game.time*5+i*Math.PI*2/3;this.shard(e.x+Math.cos(a)*(.45+shape.progress*.3),e.y-.5+Math.sin(a)*.4,.06+shape.progress*.09,a,'#a8fbff');}
  }
  yanChargePreview(e,game){
    const shape=Yan.chargeShape(game,e,e.player?game.input.aim:e.state.yanCharge?.aim||{x:e.x+1,y:e.y}),d=shape.d,side={x:-d.y*shape.width/2,y:d.x*shape.width/2},end={x:e.x+d.x*shape.range,y:e.y+d.y*shape.range};
    this.polygon([[e.x+side.x,e.y+side.y],[end.x+side.x,end.y+side.y],[end.x-side.x,end.y-side.y],[e.x-side.x,e.y-side.y]],e.state.yanCharge?'#a6d5f12a':'#a6d5f107',e.state.yanCharge?'#b3e1ffbb':'#b3e1ff33');
    if(e.state.yanCharge)this.text(`충전 ${Math.round(shape.progress*100)}%`,e.x,e.y+1.1,'#c3e6ff',.3);
  }
  atlasFor(key){return FRAMES[key]?.sheet>=9?loadAtlas(FRAMES[key].sheet):FRAMES[key]?.sheet===8?this.atlasV17:FRAMES[key]?.sheet===7?this.atlasV13:FRAMES[key]?.sheet===6?this.atlasV12:FRAMES[key]?.sheet===5?this.atlasV10:FRAMES[key]?.sheet===4?this.atlasV08: FRAMES[key]?.sheet===3?this.atlasV06:FRAMES[key]?.sheet===2?this.atlasV05:FRAMES[key]?.sheet===1?this.atlasExtra:this.atlas;}
  corpse(e,game){if(!e.visible)return;const c=this.ctx,f=FRAMES[e.form||e.key],atlas=this.atlasFor(e.form||e.key);if(!f||!atlas.complete||!atlas.naturalWidth)return;const h=spriteHeight(e.form||e.key,1.7),w=h*f.w/f.h;c.save();c.globalAlpha=Math.min(.65,(e.until-game.time)/2);c.filter='grayscale(.8) brightness(.55)';c.translate(e.x,e.y);c.rotate(e.facing+Math.PI/2);c.scale(f.mirror?-1:1,.66);c.imageSmoothingEnabled=false;c.drawImage(atlas,f.x,f.y,f.w,f.h,-w/2,-h/2,w,h);c.restore();}
  draw(game,playing) {
    if(!this.groundPass&&!playing){if(this.scene25d)this.scene25d.canvas.hidden=true;this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.ctx.fillStyle='#14252a';this.ctx.fillRect(0,0,this.width,this.height);return;}
    if(!this.groundPass&&game.training25d){this.follow(game,playing);this.scene25d.draw(game,playing);return;}
    this.follow(game,playing);
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);if(this.groundPass)c.clearRect(0,0,this.width,this.height);else{c.fillStyle='#111b20';c.fillRect(0,0,this.width,this.height);}if(this.groundTransform)c.transform(...this.groundTransform);else{c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);}
    this.floor(game);this.camps(game);for(const n of game.units.filter(n=>n.kind==='neutral')){creepPattern(this,n,game);if(n.camp==='boss')bossPattern(this,n,game);}for(const corpse of game.corpses)this.corpse(corpse,game);
    if(!game.training&&!game.bossSpawned){this.text('CENTRAL CAMP',MAP_CENTER.x,MAP_CENTER.y,'#b8ae7766',.4);this.text('05:00',MAP_CENTER.x,MAP_CENTER.y+.7,'#a5a58b66',.48);}
    for(const p of game.pending){const color=THEMES[p.source.key]?.light||'#d3b978';this.circle(p.x,p.y,p.r,`${color}18`,`${color}99`,.05);this.circle(p.x,p.y,p.r*(1-Math.min(1,(p.at-game.time)/(p.windup||1.25))),null,color,.08);for(let i=0;i<8;i++){const a=i*Math.PI/4+game.time;this.line([{x:p.x+Math.cos(a)*(p.r-.3),y:p.y+Math.sin(a)*(p.r-.3)},{x:p.x+Math.cos(a)*p.r,y:p.y+Math.sin(a)*p.r}],color,.06);}}
    for(const e of game.champions())if(game.visibleTo(0,e))chargePreview(this,e,game);
    for(const e of game.units.filter(e=>e.kind==='core'||e.kind==='tower'))this.structure(e,game);threatRanges(this,game);
    if(playing&&game.player.alive&&!game.hidden(game.player)) {
      const p=game.player,aim=game.input.aim,theta=Math.atan2(aim.y-p.y,aim.x-p.x);
      if(p.key==='yan'){
        if(Yan.distorted(game,p))this.circle(p.x,p.y,Yan.YAN.handLeash,null,'#b3dfff44',.04);
        else this.yanChargePreview(p,game);
      }else if(p.key==='sora'&&!soraEgo(game,p)){
        const impact=soraImpact(game,p,{x:Math.cos(theta),y:Math.sin(theta)});this.circle(impact.x,impact.y,impact.r,'#9ddce80b','#b7d3c766',.035);this.line([{x:p.x,y:p.y},impact],'#dfcfaa50',.04,[.18,.2]);
      }else{
        c.setLineDash([.1,.24]);this.circle(p.x,p.y,game.attackRange(p),null,'#b7d3c727',.035);c.setLineDash([]);
        this.line([{x:p.x+Math.cos(theta),y:p.y+Math.sin(theta)},{x:p.x+Math.cos(theta)*game.attackRange(p),y:p.y+Math.sin(theta)*game.attackRange(p)}],'#dfcfaa50',.04,[.18,.2]);
      }
      CombatVisuals.preview(this,p,game);this.circle(aim.x,aim.y,.22,null,'#d8c9a177',.04);
    }
    if(playing&&game.player.alive&&game.player.key==='hohenheim'&&(game.player.state.hohenCharge||game.player.state.posthumous))this.hohenheimChargePreview(game.player,game);
    targetingPreview(this,game);
    if(!this.groundPass)for(const e of game.units.filter(e=>!['core','tower'].includes(e.kind)).sort((a,b)=>a.y-b.y))this.unit(e,game);
    if(!game.training)for(const b of BUSHES)this.bush(b,true);
    for(const fx of game.effects){
      if(fx.type==='number'){c.save();c.globalAlpha=Math.max(0,fx.life/fx.maxLife);this.text(fx.text,fx.x,fx.y-(1-fx.life/fx.maxLife),fx.color,.48);c.restore();}
      if(fx.type==='slash'){
        const t=1-fx.life/fx.maxLife,side=fx.side||1,a=fx.angle+(t-.5)*fx.spread*side,r=fx.r*(.68+.22*t);
        this.slashTrails??=new MotionTrails();this.slashTrails.sample(fx,'cut',{time:game.time,key:'cut',active:true,anchor:{x:fx.x,y:fx.y-.35},inner:{x:Math.cos(a)*r*.65,y:Math.sin(a)*r*.65},outer:{x:Math.cos(a)*r,y:Math.sin(a)*r}});
      }
    }
    if(this.groundPass){
      for(const e of game.champions().filter(e=>e.alive&&game.visibleTo(0,e)&&!game.hidden(e))){championGroundEffects(this,e,game);}
      return;
    }
    // Nameplates render after bushes and effects; the player's is always last.
    for(const e of game.units.filter(e=>e.alive&&game.visibleTo(0,e)&&!game.hidden(e)&&e.kind!=='champion')){if(e.kind==='neutral')orderMark(this,e,game);if(e.kind==='minion')this.bar(e,.8,e.y-.65,game);else if(e.kind==='neutral')this.bar(e,e.camp==='boss'?3.4:1.2,e.y-(e.camp==='boss'?1.8:isClerk(e)?CLERK_HEIGHT+.18:.95),game);else if(e.kind==='bait')this.bar(e,1.5,e.y-1.8,game);else if(e.kind==='core')this.bar(e,3.3,e.y-2.2,game);else if(e.kind==='tower')this.bar(e,2.3,e.y-1.4,game);}
    for(const e of game.champions().filter(e=>e.alive&&game.visibleTo(0,e)&&!game.hidden(e)).sort((a,b)=>Number(a.player)-Number(b.player))){championEffects(this,e,game);CombatVisuals.front(this,e,game);championHud(this,e,game);CombatVisuals.meter(this,e,game);}
    for(const e of game.champions().filter(e=>e.easterText?.until>game.time))this.text(e.easterText.text,e.x,e.y-3.2,'#ffe3a7',.36);
  }
  shard(x,y,r,a,color){const c=this.ctx;c.save();c.translate(x,y);c.rotate(a);this.polygon([[-r,0],[0,-r*.35],[r,0],[0,r*.65]],color,'#f2ffff');c.restore();}
  bush(b,front=false){
    const c=this.ctx;
    if(!front){c.fillStyle='#122a20';c.fillRect(b.x-.1,b.y-.1,b.w+.2,b.h+.2);}
    for(let x=b.x+.16;x<b.x+b.w;x+=.4)for(let y=b.y+.15;y<b.y+b.h;y+=.4){
      if(front&&y<b.y+b.h-.45)continue;
      const n=Math.floor((x*17+y*13)%5),offset=Math.sin(x*9+y*3)*.06;
      this.polygon([[x-.23,y+.15],[x-.25,y-.12],[x-.1,y-.4+offset],[x+.04,y-.18],[x+.21,y-.34],[x+.27,y+.06],[x+.15,y+.25]],['#354333','#45513a','#536144','#3b4b35','#5c6947'][n],'#1a3c28');
      this.line([{x,y:y+.15},{x:x+.02,y:y-.18}],'#8b9a4d77',.03);
    }
  }
  chain(from,to,color='#b8bccc'){
    const c=this.ctx,len=distance(from,to),angle=Math.atan2(to.y-from.y,to.x-from.x),n=Math.max(1,Math.ceil(len/.26));
    c.save();c.translate(from.x,from.y);c.rotate(angle);c.strokeStyle=color;c.lineWidth=.055;
    for(let i=0;i<n;i++){c.beginPath();c.ellipse(i*len/n,Math.sin(i*1.4)*.035,.15,i%2?.055:.09,0,0,Math.PI*2);c.stroke();}c.restore();
  }
  weaponTrail(e,game,part,inner,outer,active){
    this.weaponTrails??=new MotionTrails();
    const c=this.ctx,project=p=>this.camera.worldToScreen(p,this.billboardPass?.075:0),origin=project(e);
    const blade=active?captureBlade(c.getTransform(),this.dpr,this.scale,origin,inner,outer):{};
    const key=[e.key,e.attackSerial,e.attackAt,soraEgo(game,e),game.buff(e,'mutant'),e.state.weapon].join('/');
    const samples=this.weaponTrails.sample(e,part,{time:game.time,key,active,anchor:{x:e.x,y:e.y},...blade});
    const sections=ribbonSections(samples,game.time,s=>projectBlade(s,project,this.scale));
    c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);drawRibbon(c,sections,combatStyle(e.key,game,e,{kind:'basic'}).color);c.restore();
  }
  weapon(e,game){
    if(drawEquipment(this,e,game,{lift:championPresentation(game,e).lift}))return;
    if(e.key==='kim'&&e.state.swordGrab?.until>game.time)return;
    const c=this.ctx,style=game.attackStyle(e),swing=(game.time-(e.attackAt??-10))/.3,attacking=swing>=0&&swing<1,slash=['slash','sweep'].includes(style),side=(e.attackSerial||0)%2?1:-1;
    let a=attacking?(e.attackFacing??e.facing):e.facing??(e.team?Math.PI:0);if(slash&&attacking)a+=e.key==='honglu'?swing*Math.PI*2:(swing-.5)*2.25*side;
    const lunge=!slash&&attacking?Math.sin(swing*Math.PI)*.38:0;
    c.save();const hand=equipmentPose(game,e,championPresentation(game,e).lift).right;c.translate(hand.x,hand.y);orientWeapon(c,a);c.translate(lunge,0);
    if(game.buff(e,'mutant'))c.scale(1.15,1.15);
    if(e.key!=='sora'&&slash){
      const reach={faust:1.9,sinclair:1.93,honglu:1.95,heathcliff:1.7,rodya:1.52,ishmael:1.45,gregor:1.55,nelly:1.3,myo:1.5,dongbaek:1.45,dongrang:2.2,marton:2.03}[e.key]||1.7;
      this.weaponTrail(e,game,'weapon',{x:reach*.4,y:0},{x:reach,y:0},slash&&attacking);
    }
    if(e.key==='sora'){
      if(soraEgo(game,e)){
        // The body atlas has no arms. These detached weapons follow the cursor.
        for(const side of [-1,1]){c.save();c.translate(.15,side*.6);c.rotate(side*(attacking?.35+Math.sin(swing*Math.PI)*.4:.16));this.weaponTrail(e,game,`claw-${side}`,{x:.8,y:-.08},{x:2.15,y:-.22},attacking);this.polygon([[-.15,-.18],[.55,-.3],[1.18,-.44],[1.6,-.26],[1.74,.08],[1.45,.34],[.8,.3],[.25,.2]],'#171922','#65616c');for(let i=0;i<4;i++)this.polygon([[1.3,i*.16-.26],[2.15-i*.07,i*.2-.46],[1.7,i*.17-.13]],'#292835','#b9adb8');this.line([{x:.2,y:0},{x:.8,y:-.08},{x:1.45,y:.05}],'#756879',.055);c.restore();}
      }else{
        this.chain({x:.3,y:-.3},{x:.3,y:.3},'#d6b45f');
        for(const side of [-1,1]){c.save();c.translate(.7,side*.22);this.polygon([[0,-.19],[.47,-.22],[.64,-.04],[.49,.18],[.05,.16]],'#e3dcd0','#746a54');c.fillStyle='#9d8439';c.fillRect(-.12,-.25,.2,.5);c.strokeStyle='#f4d789';c.lineWidth=.045;c.strokeRect(-.12,-.25,.2,.5);c.restore();}
      }
    } else if(e.key==='faust'){
      this.polygon([[.2,-.13],[1.55,-.13],[1.9,0],[1.55,.13],[.2,.13]],'#12222c','#789eac');
      this.polygon([[.4,-.065],[1.53,-.065],[1.76,0],[1.53,.065],[.4,.065]],'#c5dfe3');
      this.line([{x:.21,y:-.33},{x:.21,y:.33}],'#a6a99f',.12);this.line([{x:-.25,y:0},{x:.18,y:0}],'#534034',.15);this.circle(.19,0,.105,'#b84e42');
    } else if(e.key==='yi'){
      this.line([{x:-.08,y:0},{x:.28,y:0}],'#5e4a35',.14);this.polygon([[.22,-.08],[.95,-.13],[1.2,0],[.4,.12]],'#b9d6e1','#e6f5f1');
      for(let i=0;i<3;i++){const an=game.time*.7+i*2.1;this.shard(.6+Math.cos(an)*.5,Math.sin(an)*.36,.1,an,'#c3d8de');}
    } else if(e.key==='sinclair'){
      this.line([{x:-.45,y:0},{x:1.55,y:0}],'#201d1b',.18);this.line([{x:-.4,y:-.025},{x:1.55,y:-.025}],'#957b45',.07);
      this.polygon([[.95,-.08],[1.1,-.48],[1.5,-.55],[1.27,-.28],[1.38,-.08]],'#a2b2ae','#d6dabc');
      this.polygon([[1.44,-.12],[1.93,0],[1.44,.12]],'#c6d3c1','#8c985f');
      this.polygon([[1.01,.1],[1.04,.37],[1.3,.32],[1.4,.1]],'#b1bfac','#d6dabc');
    } else if(e.key==='meursault') {
      this.chain({x:-.1,y:-.2},{x:.7,y:-.25},'#9aa8b4');this.chain({x:.1,y:.2},{x:.95,y:.25},'#9aa8b4');
      for(const [x,y] of [[.65,-.23],[.95,.23]]){c.fillStyle='#243340';c.fillRect(x-.17,y-.16,.4,.32);c.strokeStyle='#9da8b4';c.lineWidth=.055;c.strokeRect(x-.17,y-.16,.4,.32);this.line([{x:x-.06,y:y-.08},{x:x+.12,y:y-.08}],'#c0b296',.06);}
    } else {
      const theme=THEMES[e.key]||THEMES.faust;
      if(['don','honglu'].includes(e.key)){
        this.line([{x:-.45,y:0},{x:1.7,y:0}],'#3b2e29',.16);this.line([{x:-.4,y:-.03},{x:1.7,y:-.03}],theme.accent,.065);
        if(e.key==='don')this.polygon([[1.25,-.16],[2.15,0],[1.25,.16]],'#e1c985','#655e50');
        else this.polygon([[1.1,-.12],[1.24,-.55],[1.75,-.5],[1.48,-.23],[1.95,0],[1.1,.12]],'#bbdfcb',theme.dark);
      }else if(['ryoshu','outis','kim'].includes(e.key)){
        this.line([{x:-.2,y:0},{x:1.7,y:0}],e.key==='ryoshu'?'#3a2027':'#c2d3c0',.13);this.line([{x:.3,y:-.22},{x:.3,y:.22}],theme.accent,.08);this.line([{x:.45,y:-.055},{x:1.7,y:-.03}],theme.light,.04);
        if(e.key==='outis'){this.polygon([[-.1,-.18],[.8,-.18],[.95,-.03],[.48,.1],[.24,.36],[.02,.3],[.1,.05]],'#3c4b45',theme.accent);this.line([{x:.7,y:-.12},{x:1.1,y:-.12}],'#c8d4bc',.12);}
      }else if(e.key==='ppui'){this.line([{x:.1,y:0},{x:1.05,y:0}],'#9f304d',.13);this.polygon([[.95,-.11],[1.5,0],[.95,.11]],'#f7bec5','#bc3c59');this.line([{x:.15,y:-.25},{x:.15,y:.25}],'#d05671',.11);
      }else if(e.key==='heathcliff'){
        this.polygon([[-.2,-.07],[.3,-.09],[1.3,-.22],[1.6,-.2],[1.7,0],[1.6,.2],[1.3,.22],[.3,.09],[-.2,.07]],'#7d5b48','#bd9a72');
      }else if(e.key==='rodya'){
        this.line([{x:-.15,y:0},{x:1.2,y:0}],'#6c4f3e',.15);this.polygon([[.9,-.1],[1.1,-.52],[1.52,-.38],[1.42,.38],[1.05,.52]],'#acc9d9',theme.dark);
      }else if(e.key==='ishmael'){
        this.line([{x:-.05,y:0},{x:1,y:0}],'#665243',.16);this.circle(1.15,0,.3,'#a5adad','#d3d7cf');c.save();if(game.buff(e,'ishmaelShield')){c.translate(.35,-.85);c.scale(1.8,1.8);}this.polygon([[-.2,.4],[.2,.32],[.42,.55],[.35,.88],[.1,1],[-.18,.85]],'#405b70','#b7ccd4');if(game.buff(e,'ishmaelShield'))this.line([{x:-.12,y:.55},{x:.1,y:.42},{x:.31,y:.57}],'#e0f5ff',.075);c.restore();
      }else if(e.key==='rudolph'){
        this.line([{x:-.25,y:0},{x:1.65,y:0}],'#62442b',.15);this.line([{x:-.2,y:-.035},{x:1.6,y:-.035}],'#d7a260',.045);this.circle(1.58,0,.18,'#ff9c3e','#ffe4ab');for(const side of [-1,1]){this.line([{x:1.55,y:side*.1},{x:1.7,y:side*.35},{x:1.54,y:side*.62},{x:1.75,y:side*.82}],'#d7b47f',.09);this.line([{x:1.67,y:side*.38},{x:1.98,y:side*.48}],'#edcf99',.07);this.line([{x:1.58,y:side*.59},{x:1.31,y:side*.72}],'#edcf99',.07);}
      }else if(e.key==='gregor'){
        this.polygon([[0,-.14],[.65,-.26],[1.25,-.12],[1.55,-.4],[1.37,.06],[.72,.25],[0,.15]],theme.dark,theme.light);
        for(let i=0;i<3;i++)this.line([{x:.65+i*.2,y:.1},{x:.75+i*.3,y:.45}],theme.accent,.09);
      }else if(e.key==='moses'){
        this.line([{x:-.1,y:0},{x:1,y:0}],'#886044',.13);this.circle(1,.1,.18,'#8a5b48',theme.light);this.shard(1.1,-.25,.14,game.time,theme.light);
      }else if(e.key==='ezra'){
        this.line([{x:-.2,y:0},{x:1.1,y:0}],'#5b4832',.17);c.fillStyle=theme.accent;c.fillRect(.8,-.32,.6,.64);
      }else if(e.key==='gubo'){
        this.polygon([[0,-.12],[1.65,-.12],[1.65,.05],[.7,.07],[.3,.27],[0,.2]],'#34404c',theme.accent);
      }else if(e.key==='gahwan'){this.line([{x:-.3,y:0},{x:1.65,y:0}],'#94745d',.16);this.polygon([[1.3,-.15],[2,0],[1.3,.15]],theme.light,theme.dark);for(let i=0;i<3;i++)this.shard(.8+i*.25,-.2,.12,0,theme.accent);
      }else if(e.key==='nelly'){for(const y of [-.22,.22]){this.line([{x:.05,y},{x:.5,y}],'#524242',.13);this.polygon([[.5,y-.07],[1.3,y],[.5,y+.07]],theme.light,theme.dark);}
      }else if(e.key==='hohenheim'){this.line([{x:-.2,y:0},{x:1.5,y:0}],'#3a4e59',.25);for(let i=0;i<3;i++){this.circle(.4+i*.3,0,.18,'#94eee7','#e7fffc');this.line([{x:.3+i*.3,y:-.2},{x:.6+i*.3,y:.2}],'#60c8d3',.055);}
      }else if(e.key==='marton'){this.line([{x:-.2,y:0},{x:1.55,y:0}],'#91643e',.17);this.polygon([[1.15,-.62],[1.9,-.58],[2.03,.48],[1.2,.62]],'#875934','#d1aa70');for(let i=0;i<4;i++)this.line([{x:1.27+i*.15,y:-.49},{x:1.36+i*.15,y:.47}],'#b08552',.035);this.line([{x:1.2,y:-.37},{x:1.97,y:-.34}],'#513b2c',.075);this.line([{x:1.23,y:.35},{x:2,y:.29}],'#513b2c',.075);
      }else if(e.key==='alisa'){
        if(this.skillVfx)for(let i=0;i<3;i++){const phase=game.time*5+i,variant=Math.floor(phase)%4,blend=phase%1,alpha=c.globalAlpha;c.save();c.translate(.45+i*.36,Math.sin(game.time*7+i)*.08);c.rotate(-Math.PI/2+Math.sin(game.time*4+i)*.12);for(const [v,weight] of [[variant,1-blend],[(variant+1)%4,blend]]){c.globalAlpha=alpha*weight;c.drawImage(this.skillVfx.sprite('flame',theme.light,1,theme,v),-.3,-.65,.6,1.3);}c.restore();}
      }else if(['queequeg','starbuck'].includes(e.key)){this.line([{x:-.35,y:0},{x:1.65,y:0}],'#6d6650',.17);this.polygon([[1.3,-.12],[2,0],[1.3,.12],[1.5,.35],[1.08,.05]],'#bad9d4','#4b7e85');this.chain({x:.2,y:.15},{x:1.15,y:.4},'#9fb9b1');
      }else if(e.key==='ahab'){this.line([{x:-.4,y:0},{x:1.4,y:0}],'#765e42',.17);this.polygon([[1.1,-.17],[1.95,0],[1.1,.17],[1.4,0]],theme.light,theme.dark);this.line([{x:1.2,y:.12},{x:.5,y:.5}],theme.accent,.045);
      }else if(e.key==='myo'){this.line([{x:0,y:0},{x:1.5,y:0}],'#cac6dd',.13);this.line([{x:.25,y:-.2},{x:.25,y:.2}],theme.accent,.09);this.polygon([[0,.2],[.75,.2],[.75,.35],[.3,.35],[.12,.6],[-.08,.5]],'#332a3b',theme.light);
      }else if(e.key==='dongbaek'){for(let i=0;i<8;i++){const a=-.65+i*.185;this.polygon([[0,0],[Math.cos(a)*1.45,Math.sin(a)*1.45],[Math.cos(a+.16)*1.45,Math.sin(a+.16)*1.45]],i%2?theme.light:theme.accent,theme.dark);}
      }else if(e.key==='dongrang'){this.line([{x:-.4,y:0},{x:1.55,y:0}],'#756643',.15);this.polygon([[1.1,-.1],[1.4,-.6],[2,-.4],[2.2,.2],[1.9,.12],[1.65,-.25]],theme.light,theme.dark);
      }else this.chain({x:0,y:0},{x:1.5,y:Math.sin(game.time*5)*.3},theme.light);
    }
    c.restore();
  }
  minimap(canvas,game){drawMinimap(this,canvas,game);}
}
