import { WALLS, BUSHES, RULES, MAP_SCALE, MAP_CENTER, FOUNTAINS, WELL_ROOMS, WORLD, TERRAIN, worldPoint, RUNTIME_CHAMPIONS as CHAMPIONS, lanePath } from './data.js';
import { distance } from './geometry.js';
import { Camera } from './camera.js';
import { FRAMES, THEMES, loadAtlas } from './art.js';
import { draw as creepPattern } from './creep-patterns.js';
import { targetingPreview } from './targeting.js';
import { championHud, championEffects, chargePreview } from './overlays.js';

export class Renderer {
  constructor(canvas) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera=new Camera();this.atlas=loadAtlas();this.atlasExtra=loadAtlas(1);this.atlasV05=loadAtlas(2);this.atlasV06=loadAtlas(3);this.scale=1;this.ox=0;this.oy=0;this.resize();}
  resize() {
    const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);
    this.dpr=dpr;this.width=r.width;this.height=r.height;
  }
  follow(game,playing){this.camera.update(this.width,this.height,game.player,playing);this.scale=this.camera.scale;this.ox=this.camera.ox;this.oy=this.camera.oy;}
  point(clientX,clientY) {const r=this.canvas.getBoundingClientRect();return this.camera.screenToWorld(clientX-r.left,clientY-r.top);}
  circle(x,y,r,fill,stroke=null,width=.07) {const c=this.ctx;c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  line(points,color,width,dash=[]) {const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.stroke();c.setLineDash([]);}
  text(text,x,y,color='#afbdac',size=.5,align='center',serif=false) {const c=this.ctx;c.fillStyle=color;c.font=`${size}px ${serif?'Georgia':'"Malgun Gothic", Arial'}, sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y);}
  polygon(points,fill,stroke=null) {const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.08;c.stroke();}}
  floor() {
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
    for(const [i,p] of WELL_ROOMS.entries()){const color=i===0?'#88d5dc':'#db9a85';c.beginPath();c.arc(p.x,p.y,p.r,i===0?Math.PI/2:-Math.PI/2,i===0?Math.PI*1.5:Math.PI/2);c.closePath();c.fillStyle=color+'16';c.fill();c.strokeStyle=color+'aa';c.lineWidth=.16;c.stroke();for(let j=1;j<=3;j++){c.beginPath();c.arc(p.x,p.y,p.r-j*.35,i===0?Math.PI/2:-Math.PI/2,i===0?Math.PI*1.5:Math.PI/2);c.strokeStyle=color+'33';c.lineWidth=.045;c.stroke();}const f=FOUNTAINS[i];this.circle(f.x,f.y,.85,color+'18',color,.07);this.text('부활소',f.x,f.y+2.2,color,.36);}
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
    c.fillStyle=e.team===0?'#87b8bc':e.team===1?'#c78578':e.camp==='boss'?'#b38ecb':'#b0a16d';
    c.fillRect(x,y,width*Math.max(0,e.hp/e.maxHp),.21);
    const shield=game.shield(e);if(shield){c.fillStyle='#e2e1bb';c.fillRect(x,y-.13,width*Math.min(1,shield/e.maxHp),.08);}
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
      else this.text(game.towers(e.team).length===1?'본진 · 받는 피해 −50%':'본진',e.x,e.y+2.35,color,.4);
      this.bar(e,3.3,e.y-2.2,game);
    } else {
      this.polygon([[e.x-.8,e.y+.7],[e.x-.7,e.y-.4],[e.x-.45,e.y-.95],[e.x+.45,e.y-.95],[e.x+.7,e.y-.4],[e.x+.8,e.y+.7]],dark,color);
      this.polygon([[e.x-.4,e.y+.35],[e.x-.4,e.y-.45],[e.x-.16,e.y-.45],[e.x-.16,e.y-.15],[e.x+.16,e.y-.15],[e.x+.16,e.y-.45],[e.x+.4,e.y-.45],[e.x+.4,e.y+.35]],color);
      this.bar(e,2.3,e.y-1.4,game);
    }
  }
  unit(e,game) {
    if(!e.alive||game.hidden(e)&&e.motion?.kind!=='leap'||!game.visibleTo(0,e))return;
    const c=this.ctx,team=e.team===0?'#92cad3':e.team===1?'#d99588':e.camp==='boss'?'#c1a0d9':e.camp==='blessing'?'#84bdc5':e.camp==='amplify'?'#c69db6':'#c7b67c';
    this.circle(e.x+.1,e.y+.3,e.radius+.14,'#07161a77');
    if(e.kind==='minion') {
      if(e.siege)this.polygon([[e.x-.45,e.y-.3],[e.x+.45,e.y-.3],[e.x+.45,e.y+.3],[e.x-.45,e.y+.3]],team,'#182528');
      else if(e.ranged)this.polygon([[e.x,e.y-.38],[e.x+.32,e.y+.22],[e.x-.32,e.y+.22]],team);
      else this.circle(e.x,e.y,.24,team);
      this.bar(e,.8,e.y-.65,game);return;
    }
    if(e.kind==='neutral') {
      if(e.camp==='boss') {
        this.circle(e.x,e.y,1.6,'#b788d312','#c6a6dd55');
        this.polygon([[e.x-1.1,e.y-.9],[e.x-.3,e.y-.6],[e.x+.3,e.y-.6],[e.x+1.1,e.y-.9],[e.x+.8,e.y+.4],[e.x,e.y+1],[e.x-.8,e.y+.4]],'#705982',team);
        this.line([{x:e.x-.55,y:e.y-.15},{x:e.x-.2,y:e.y+.05}],'#ead3f0',.14);this.line([{x:e.x+.2,y:e.y+.05},{x:e.x+.55,y:e.y-.15}],'#ead3f0',.14);
      } else {
        this.circle(e.x,e.y,.62,'#111d21',`${team}66`);this.polygon([[e.x,e.y-.4],[e.x+.3,e.y],[e.x,e.y+.4],[e.x-.3,e.y]],team);
      }
      this.bar(e,e.camp==='boss'?3.4:1.2,e.y-(e.camp==='boss'?1.8:.95),game);
      if(e.returning)this.text('복귀 중',e.x,e.y+1.5,'#d1dec5',.32);
      if(e.camp==='boss'||['amplify','blessing'].includes(e.camp))this.text(e.name,e.x,e.y+(e.camp==='boss'?1.7:1.05),team,.4);
      return;
    }
    const def=CHAMPIONS[e.key],inBush=game.bushAt(e),angle=e.facing??(e.team===0?0:Math.PI);
    c.save();if(inBush)c.globalAlpha=.72;
    c.beginPath();c.ellipse(e.x,e.y+.2,.65,.25,0,0,Math.PI*2);c.fillStyle='#06131599';c.fill();
    this.circle(e.x,e.y,.67,null,e.player?'#f2d98e':team,.07);
    if(game.shield(e)>0)this.circle(e.x,e.y-.65,1.05,'#9fc9d711','#c8e4df99',.055);
    if(game.buff(e,'marks')||game.buff(e,'resolve'))this.circle(e.x,e.y,1,null,'#d9be78aa',.09);
    if(Math.sin(angle)<-.2)this.weapon(e,game);
    const f=FRAMES[e.key],h=2.1*(game.buff(e,'mutant')?1.15:1),w=f?h*f.w/f.h:1.25,bob=Math.sin(game.time*3+e.id)*.025,atlas=this.atlasFor(e.key);
    const lift=e.motion?.kind==='leap'?Math.sin(Math.PI*Math.min(1,e.motion.elapsed/Math.max(.01,e.motion.minDuration)))*1.1:0;
    c.save();if(e.hitFlashUntil>game.time)c.filter='brightness(2.4) saturate(.4)';c.translate(e.x,e.y+.3+bob-lift);if(Math.cos(angle)<0)c.scale(-1,1);
    if(f&&atlas.complete&&atlas.naturalWidth){c.imageSmoothingEnabled=false;c.drawImage(atlas,f.x,f.y,f.w,f.h,-w/2,-h,w,h);}
    else {c.fillStyle=def.color;c.fillRect(-.42,-1.8,.84,.8);c.fillStyle='#273642';c.fillRect(-.38,-1,.76,1);}
    c.restore();
    if(e.naturalHealing){this.text('+',e.x+.85,e.y-1.6+Math.sin(game.time*5)*.1,'#a4e9a1',.55);this.circle(e.x,e.y,.8,null,'#a3d89766',.05);}
    if(Math.sin(angle)>=-.2)this.weapon(e,game);
    c.restore();
    championEffects(this,e,game);championHud(this,e,game);
    if(e.player&&inBush)this.text(e.revealedUntil>game.time?'노출 중':'수풀 은닉',e.x,e.y+.8,'#a9d890',.32);
  }
  atlasFor(key){return FRAMES[key]?.sheet===3?this.atlasV06:FRAMES[key]?.sheet===2?this.atlasV05:FRAMES[key]?.sheet===1?this.atlasExtra:this.atlas;}
  corpse(e,game){if(!e.visible)return;const c=this.ctx,f=FRAMES[e.key],atlas=this.atlasFor(e.key);if(!f||!atlas.complete||!atlas.naturalWidth)return;const h=1.7,w=h*f.w/f.h;c.save();c.globalAlpha=Math.min(.65,(e.until-game.time)/2);c.filter='grayscale(.8) brightness(.55)';c.translate(e.x,e.y);c.rotate(e.facing+Math.PI/2);c.scale(1,.66);c.imageSmoothingEnabled=false;c.drawImage(atlas,f.x,f.y,f.w,f.h,-w/2,-h/2,w,h);c.restore();}
  draw(game,playing) {
    this.follow(game,playing);
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#111b20';c.fillRect(0,0,this.width,this.height);c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);
    this.floor();this.camps(game);for(const n of game.units.filter(n=>n.kind==='neutral'))creepPattern(this,n,game);for(const corpse of game.corpses)this.corpse(corpse,game);
    if(!game.bossSpawned){this.text('CENTRAL CAMP',MAP_CENTER.x,MAP_CENTER.y,'#b8ae7766',.4);this.text('05:00',MAP_CENTER.x,MAP_CENTER.y+.7,'#a5a58b66',.48);}
    for(const z of game.zones){if(z.kind==='desireTree'){this.line([{x:z.x,y:z.y+.25},{x:z.x,y:z.y-1.1}],'#9c855b',.18);for(let i=0;i<5;i++){const a=i*1.25;this.shard(z.x+Math.cos(a)*.45,z.y-1+Math.sin(a)*.4,.3,a,'#b8bf77');}if(z.golden){this.line([{x:z.x,y:z.y+.25},{x:z.x,y:z.y-1.1}],'#ffda66',.2);for(let i=0;i<5;i++){const a=i*1.25;this.shard(z.x+Math.cos(a)*.45,z.y-1+Math.sin(a)*.4,.32,a,'#f4cc52');}for(let i=0;i<7;i++){const a=game.time*1.5+i*2.4,x=z.x+Math.cos(a)*(.65+(i%2)*.2),y=z.y-.8+Math.sin(a*1.3)*.8;this.line([{x:x-.1,y},{x:x+.1,y}],'#fff2bc',.045);this.line([{x,y:y-.1},{x,y:y+.1}],'#fff2bc',.045);}}this.text((z.golden?'빛나는 욕망 · ':`${Math.floor(z.dealt||0)}/350 · `)+Math.ceil(z.until-game.time)+'s',z.x,z.y+.6,z.golden?'#ffe08b':'#c4ca8d',.24);}const tone=z.kind==='desireTree'?(z.golden?'#f4cf61':'#abbc78'):z.kind==='waterfall'?'#8febd7':z.kind==='ice'?'#a5d6ff':'#c8dfe5';this.circle(z.x,z.y,z.r,`${tone}22`,tone,.05);for(let i=0;i<12;i++){const a=i*2.4+game.time*.25,r=z.r*.7*(.3+(i%3)/3);if(z.kind==='waterfall')this.line([{x:z.x+Math.cos(a)*r,y:z.y+Math.sin(a)*r},{x:z.x+Math.cos(a)*r,y:z.y+Math.sin(a)*r-.8}],`${tone}88`,.1);else this.shard(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,.13,a,tone);}}
    for(const p of game.pending){const color=THEMES[p.source.key]?.light||'#d3b978';this.circle(p.x,p.y,p.r,`${color}18`,`${color}99`,.05);this.circle(p.x,p.y,p.r*(1-Math.min(1,(p.at-game.time)/(p.windup||1.25))),null,color,.08);for(let i=0;i<8;i++){const a=i*Math.PI/4+game.time;this.line([{x:p.x+Math.cos(a)*(p.r-.3),y:p.y+Math.sin(a)*(p.r-.3)},{x:p.x+Math.cos(a)*p.r,y:p.y+Math.sin(a)*p.r}],color,.06);}}
    for(const e of game.champions())if(game.visibleTo(0,e))chargePreview(this,e,game);
    for(const e of game.units.filter(e=>e.kind==='core'||e.kind==='tower'))this.structure(e,game);
    if(playing&&game.player.alive&&!game.hidden(game.player)) {
      const p=game.player,aim=game.input.aim,theta=Math.atan2(aim.y-p.y,aim.x-p.x);
      c.setLineDash([.1,.24]);this.circle(p.x,p.y,game.attackRange(p),null,'#b7d3c727',.035);c.setLineDash([]);
      this.line([{x:p.x+Math.cos(theta),y:p.y+Math.sin(theta)},{x:p.x+Math.cos(theta)*game.attackRange(p),y:p.y+Math.sin(theta)*game.attackRange(p)}],'#dfcfaa50',.04,[.18,.2]);
      this.circle(aim.x,aim.y,.22,null,'#d8c9a177',.04);
    }
    targetingPreview(this,game);
    for(const e of game.units.filter(e=>!['core','tower'].includes(e.kind)).sort((a,b)=>a.y-b.y))this.unit(e,game);
    for(const b of BUSHES)this.bush(b,true);
    for(const p of game.projectiles){
      if(p.ultimate&&p.theme==='gubo'){const d={x:p.dx||Math.cos(p.source.facing),y:p.dy||Math.sin(p.source.facing)};this.line([{x:p.x-d.x*1.5,y:p.y-d.y*1.5},{x:p.x,y:p.y}],'#ffc181',.19);this.shard(p.x,p.y,.3,Math.atan2(d.y,d.x),'#fff0b2');}
      else if(p.theme==='ishmael'){c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.dy,p.dx));c.scale(1.3,1.3);this.line([{x:-1.4,y:0},{x:.25,y:0}],'#a6d9e899',.13);this.polygon([[.65,0],[.08,-.38],[.18,-.1],[-.12,-.21],[.05,0],[-.12,.21],[.18,.1],[.08,.38]],'#d1edf0','#6d9dad');c.restore();}
      else if(p.theme==='yi')this.shard(p.x,p.y-.45,.27,Math.atan2(p.dy,p.dx),'#d5e9ef');
      else if(p.theme==='faust'){c.save();c.translate(p.x,p.y-.45);c.rotate(Math.atan2(p.dy,p.dx));this.line([{x:-.85,y:0},{x:.3,y:0}],'#a7ebec77',.22);c.beginPath();c.arc(-.5,0,.65,-1,1);c.strokeStyle='#d3ffff';c.lineWidth=.12;c.stroke();c.restore();}
      else {const theme=THEMES[p.theme];this.line([{x:p.x-p.dx*.7,y:p.y-p.dy*.7},{x:p.x,y:p.y}],theme?.light||p.color,.12);if(p.theme==='rodya')this.shard(p.x,p.y,.32,Math.atan2(p.dy,p.dx),theme.light);else this.circle(p.x,p.y,.14,theme?.light||'#edf0cf');}
    }
    for(const fx of game.effects) {
      c.save();c.globalAlpha=Math.max(0,fx.life/fx.maxLife);
      if(fx.type==='line'){this.line([{x:fx.x,y:fx.y},fx.to],fx.color,.1);if(fx.theme==='rudolph'){this.line([{x:fx.x,y:fx.y-.45},fx.to],'#ffb65f',.18);for(let i=1;i<5;i++)this.shard(fx.x+(fx.to.x-fx.x)*i/5,fx.y+(fx.to.y-fx.y)*i/5,.13,game.time*8+i,'#ffd09b');}if(fx.theme==='sinclair')this.line([{x:fx.x,y:fx.y-.2},{x:fx.to.x,y:fx.to.y-.2}],'#f5e997',.08);}
      if(fx.type==='ring'){this.circle(fx.x,fx.y,fx.r*(1-fx.life/fx.maxLife*.3),`${fx.color}11`,fx.color,.1);}
      if(fx.type==='number')this.text(fx.text,fx.x,fx.y-(1-fx.life/fx.maxLife),fx.color,.48);
      if(fx.type==='slash'){
        const t=1-fx.life/fx.maxLife,color=THEMES[fx.theme]?.light||fx.color,side=fx.side||1,a=fx.angle+(t-.5)*fx.spread*side,r=fx.r*(.68+.22*t);
        c.translate(fx.x,fx.y-.35);c.rotate(a);c.beginPath();c.arc(0,0,r,-.62,.62);c.strokeStyle=color;c.lineWidth=.19*(1-t)+.035;c.stroke();c.beginPath();c.arc(-.12,0,r*.85,-.48,.48);c.strokeStyle=color+'88';c.lineWidth=.07;c.stroke();
        for(let i=0;i<3;i++)this.shard(Math.cos((i-1)*.36)*r,Math.sin((i-1)*.36)*r,.09,0,color);
      }
      if(fx.type==='thrust'){
        const t=1-fx.life/fx.maxLife,color=THEMES[fx.theme]?.light||fx.color,d={x:Math.cos(fx.angle),y:Math.sin(fx.angle)},len=fx.r*(.45+.5*t);
        this.line([{x:fx.x+d.x*.6,y:fx.y+d.y*.6-.35},{x:fx.x+d.x*len,y:fx.y+d.y*len-.35}],color,.12*(1-t)+.035);this.shard(fx.x+d.x*len,fx.y+d.y*len-.35,.2,fx.angle,color);
      }
      if(fx.type==='impact'){
        const t=1-fx.life/fx.maxLife,color=THEMES[fx.theme]?.accent||fx.color;
        for(let i=0;i<6;i++){const a=fx.angle+(i-2.5)*.86,r=.2+t*.65;this.line([{x:fx.x+Math.cos(a)*r*.5,y:fx.y-.45+Math.sin(a)*r*.5},{x:fx.x+Math.cos(a)*r,y:fx.y-.45+Math.sin(a)*r}],color,.08*(1-t)+.02);}if(t<.4)this.circle(fx.x,fx.y-.45,.18,'#fff6da');
      }

      if(fx.type==='cast'||fx.type==='burst')this.skillEffect(fx,game);
      c.restore();
    }
  }
  shard(x,y,r,a,color){const c=this.ctx;c.save();c.translate(x,y);c.rotate(a);this.polygon([[-r,0],[0,-r*.35],[r,0],[0,r*.65]],color,'#f2ffff');c.restore();}
  bush(b,front=false){
    const c=this.ctx;
    if(!front){c.fillStyle='#122a20';c.fillRect(b.x-.1,b.y-.1,b.w+.2,b.h+.2);}
    for(let x=b.x+.16;x<b.x+b.w;x+=.4)for(let y=b.y+.15;y<b.y+b.h;y+=.4){
      if(front&&y<b.y+b.h-.45)continue;
      const n=Math.floor((x*17+y*13)%5),offset=Math.sin(x*9+y*3)*.06;
      this.polygon([[x-.23,y+.15],[x-.25,y-.12],[x-.1,y-.4+offset],[x+.04,y-.18],[x+.21,y-.34],[x+.27,y+.06],[x+.15,y+.25]],['#355737','#466a3b','#567943','#3a633d','#668449'][n],'#1a3c28');
      this.line([{x,y:y+.15},{x:x+.02,y:y-.18}],'#8b9a4d77',.03);
    }
  }
  chain(from,to,color='#b8bccc'){
    const c=this.ctx,len=distance(from,to),angle=Math.atan2(to.y-from.y,to.x-from.x),n=Math.max(1,Math.ceil(len/.26));
    c.save();c.translate(from.x,from.y);c.rotate(angle);c.strokeStyle=color;c.lineWidth=.055;
    for(let i=0;i<n;i++){c.beginPath();c.ellipse(i*len/n,Math.sin(i*1.4)*.035,.15,i%2?.055:.09,0,0,Math.PI*2);c.stroke();}c.restore();
  }
  weapon(e,game){
    const c=this.ctx,style=game.attackStyle(e),swing=(game.time-(e.attackAt??-10))/.3,attacking=swing>=0&&swing<1,slash=['slash','sweep'].includes(style),side=(e.attackSerial||0)%2?1:-1;
    let a=attacking?(e.attackFacing??e.facing):e.facing??(e.team?Math.PI:0);if(slash&&attacking)a+=(swing-.5)*2.25*side;if(e.state.donBarrage?.until>game.time)a=Math.atan2(e.state.donBarrage.d.y,e.state.donBarrage.d.x);
    const lunge=!slash&&attacking?Math.sin(swing*Math.PI)*.38:0;
    c.save();c.translate(e.x,e.y-.45);c.rotate(a);c.translate(.25+lunge,0);
    if(game.buff(e,'mutant'))c.scale(1.15,1.15);
    if(e.key==='faust'){
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
      }else if(['ryoshu','outis'].includes(e.key)){
        this.line([{x:-.2,y:0},{x:1.7,y:0}],e.key==='ryoshu'?'#3a2027':'#c2d3c0',.13);this.line([{x:.3,y:-.22},{x:.3,y:.22}],theme.accent,.08);this.line([{x:.45,y:-.055},{x:1.7,y:-.03}],theme.light,.04);
        if(e.key==='outis'){this.polygon([[-.1,-.18],[.8,-.18],[.95,-.03],[.48,.1],[.24,.36],[.02,.3],[.1,.05]],'#3c4b45',theme.accent);this.line([{x:.7,y:-.12},{x:1.1,y:-.12}],'#c8d4bc',.12);}
      }else if(e.key==='heathcliff'){
        this.polygon([[-.2,-.07],[.3,-.09],[1.3,-.22],[1.6,-.2],[1.7,0],[1.6,.2],[1.3,.22],[.3,.09],[-.2,.07]],'#7d5b48','#bd9a72');
      }else if(e.key==='rodya'){
        this.line([{x:-.15,y:0},{x:1.2,y:0}],'#6c4f3e',.15);this.polygon([[.9,-.1],[1.1,-.52],[1.52,-.38],[1.42,.38],[1.05,.52]],'#acc9d9',theme.dark);
      }else if(e.key==='ishmael'){
        this.line([{x:-.05,y:0},{x:1,y:0}],'#665243',.16);this.circle(1.15,0,.3,'#a5adad','#d3d7cf');c.save();if(game.buff(e,'ishmaelShield')){c.translate(.35,-.85);c.scale(1.8,1.8);}this.polygon([[-.2,.4],[.2,.32],[.42,.55],[.35,.88],[.1,1],[-.18,.85]],'#405b70','#b7ccd4');if(game.buff(e,'ishmaelShield'))this.line([{x:-.12,y:.55},{x:.1,y:.42},{x:.31,y:.57}],'#e0f5ff',.075);c.restore();
      }else if(e.key==='rudolph'){
        this.line([{x:-.25,y:0},{x:1.65,y:0}],'#62442b',.15);this.line([{x:-.2,y:-.035},{x:1.6,y:-.035}],'#d7a260',.045);this.circle(1.58,0,.18,'#ff9c3e','#ffe4ab');for(const side of [-1,1]){this.line([{x:1.55,y:side*.1},{x:1.7,y:side*.35},{x:1.54,y:side*.62},{x:1.75,y:side*.82}],'#d7b47f',.09);this.line([{x:1.67,y:side*.38},{x:1.98,y:side*.48}],'#edcf99',.07);this.line([{x:1.58,y:side*.59},{x:1.31,y:side*.72}],'#edcf99',.07);}
      }else if(e.key==='gregor'){
        this.polygon([[0,-.14],[.65,-.26],[1.25,-.12],[1.55,-.4],[1.37,.06],[.72,.25],[0,.15]],'#5f7640','#acbd79');
        for(let i=0;i<3;i++)this.line([{x:.65+i*.2,y:.1},{x:.75+i*.3,y:.45}],theme.accent,.09);
      }else if(e.key==='moses'){
        this.line([{x:-.1,y:0},{x:1,y:0}],'#886044',.13);this.circle(1,.1,.18,'#8a5b48',theme.light);this.shard(1.1,-.25,.14,game.time,theme.light);
      }else if(e.key==='ezra'){
        this.line([{x:-.2,y:0},{x:1.1,y:0}],'#5b4832',.17);c.fillStyle=theme.accent;c.fillRect(.8,-.32,.6,.64);
      }else if(e.key==='gubo'){
        this.polygon([[0,-.12],[1.65,-.12],[1.65,.05],[.7,.07],[.3,.27],[0,.2]],'#34404c',theme.accent);
      }else if(e.key==='gahwan'){this.line([{x:-.3,y:0},{x:1.65,y:0}],'#94745d',.16);this.polygon([[1.3,-.15],[2,0],[1.3,.15]],theme.light,theme.dark);for(let i=0;i<3;i++)this.shard(.8+i*.25,-.2,.12,0,theme.accent);
      }else if(e.key==='nelly'){for(const y of [-.22,.22]){this.line([{x:.05,y},{x:.5,y}],'#524242',.13);this.polygon([[.5,y-.07],[1.3,y],[.5,y+.07]],theme.light,theme.dark);}
      }else if(e.key==='ahab'){this.line([{x:-.4,y:0},{x:1.4,y:0}],'#765e42',.17);this.polygon([[1.1,-.17],[1.95,0],[1.1,.17],[1.4,0]],theme.light,theme.dark);this.line([{x:1.2,y:.12},{x:.5,y:.5}],theme.accent,.045);
      }else if(e.key==='myo'){this.line([{x:0,y:0},{x:1.5,y:0}],'#cac6dd',.13);this.line([{x:.25,y:-.2},{x:.25,y:.2}],theme.accent,.09);this.polygon([[0,.2],[.75,.2],[.75,.35],[.3,.35],[.12,.6],[-.08,.5]],'#332a3b',theme.light);
      }else if(e.key==='dongbaek'){for(let i=0;i<8;i++){const a=-.65+i*.185;this.polygon([[0,0],[Math.cos(a)*1.45,Math.sin(a)*1.45],[Math.cos(a+.16)*1.45,Math.sin(a+.16)*1.45]],i%2?theme.light:theme.accent,theme.dark);}
      }else if(e.key==='dongrang'){this.line([{x:-.4,y:0},{x:1.55,y:0}],'#756643',.15);this.polygon([[1.1,-.1],[1.4,-.6],[2,-.4],[2.2,.2],[1.9,.12],[1.65,-.25]],theme.light,theme.dark);
      }else this.chain({x:0,y:0},{x:1.5,y:Math.sin(game.time*5)*.3},theme.light);
    }
    c.restore();
  }
  skillEffect(fx,game){
    const c=this.ctx,t=1-fx.life/fx.maxLife,theme=THEMES[fx.theme]||THEMES.faust,r=fx.r;
    if(fx.theme==='meursault'){
      if(fx.slot==='r')for(let i=-3;i<=3;i++){const a=fx.angle+i*.22;this.chain({x:fx.x,y:fx.y-.4},{x:fx.x+Math.cos(a)*r*(.6+t*.4),y:fx.y+Math.sin(a)*r},theme.light);}
      else {this.circle(fx.x,fx.y-.4,1.2+t*.4,'#7396b222',theme.light,.07);for(let i=0;i<6;i++){const a=i*Math.PI/3;this.chain({x:fx.x+Math.cos(a),y:fx.y-.4+Math.sin(a)},{x:fx.x+Math.cos(a+.6),y:fx.y-.4+Math.sin(a+.6)},theme.accent);}}
    } else if(fx.theme==='yi'){
      this.circle(fx.x,fx.y,r*(.4+t*.6),null,theme.light,.07);
      for(let i=0;i<13;i++){const a=i*2.4+t*2;this.shard(fx.x+Math.cos(a)*r*(.3+t*.6),fx.y+Math.sin(a)*r*(.3+t*.6),.12+(.12*(i%3)),a,theme.light);}
    } else if(fx.theme==='sinclair'){
      if(fx.type==='burst')for(let i=0;i<9;i++){const a=i*Math.PI*2/9,x=fx.x+Math.cos(a)*r*.8,y=fx.y+Math.sin(a)*r*.8;this.line([{x:fx.x,y:fx.y},{x:fx.x+(x-fx.x)*.5,y:fx.y+(y-fx.y)*.3},{x,y}],theme.dark,.11);this.line([{x,y},{x:x+.4*Math.cos(a-.8),y:y+.7*Math.sin(a-.8)}],theme.light,.065);this.shard(x,y,.18,a,theme.light);}
      else for(let i=0;i<5;i++){const a=fx.angle+(i-2)*.18;this.line([{x:fx.x,y:fx.y},{x:fx.x+Math.cos(a)*r*(.4+t*.6),y:fx.y+Math.sin(a)*r*(.4+t*.6)}],theme.light,.07);}
    } else if(fx.theme==='dongbaek'){for(let i=0;i<16;i++){const a=i*2.4+t*2;this.shard(fx.x+Math.cos(a)*r*t,fx.y+Math.sin(a)*r*t,.15+(i%3)*.08,a,i%2?theme.light:theme.accent);}this.circle(fx.x,fx.y,r*(.4+t*.6),null,theme.accent,.07);
    } else if(fx.theme==='dongrang'){for(let i=0;i<8;i++){const a=i*Math.PI/4;this.line([{x:fx.x,y:fx.y},{x:fx.x+Math.cos(a)*r,y:fx.y+Math.sin(a)*r}],theme.dark,.07);this.shard(fx.x+Math.cos(a)*r,fx.y+Math.sin(a)*r,.25,a,theme.accent);}
    } else if(fx.theme==='faust') {
      this.circle(fx.x,fx.y,r*(.4+t*.6),'#a3f5f511',theme.light,.09);
      for(let i=0;i<16;i++){const a=i*Math.PI/8,from={x:fx.x+Math.cos(a)*r*.25,y:fx.y+Math.sin(a)*r*.25},to={x:fx.x+Math.cos(a)*r,y:fx.y+Math.sin(a)*r};this.line([from,{x:(from.x+to.x)/2+Math.sin(i)*.25,y:(from.y+to.y)/2-.2},to],i%2?theme.dark:theme.light,.06);}
    } else {
      const color=theme.light;
      if(fx.theme==='honglu'||fx.theme==='ishmael'){for(let i=0;i<3;i++)this.circle(fx.x,fx.y,r*(t*.5+.2+i*.16),null,`${color}bb`,.09);if(fx.theme==='ishmael')this.chain({x:fx.x,y:fx.y},{x:fx.x+Math.cos(fx.angle)*r,y:fx.y+Math.sin(fx.angle)*r},theme.accent);}
      else if(fx.theme==='rodya'){for(let i=0;i<3;i++){const a=i*2.1+t*4;this.circle(fx.x+Math.cos(a)*(1+t),fx.y-1+Math.sin(a)*.6,.18,theme.accent,theme.dark);this.shard(fx.x+Math.cos(a)*r*t,fx.y+Math.sin(a)*r*t,.22,a,color);}}
      else if(fx.theme==='gregor'){for(let i=0;i<5;i++){const a=fx.angle+(i-2)*.26;this.line([{x:fx.x,y:fx.y},{x:fx.x+Math.cos(a)*r*.6,y:fx.y+Math.sin(a)*r*.6},{x:fx.x+Math.cos(a-.2)*r,y:fx.y+Math.sin(a-.2)*r}],i%2?theme.dark:color,.12);}}
      else if(fx.theme==='ryoshu'||fx.theme==='outis'){for(let i=0;i<4;i++){const a=fx.angle+(i-1.5)*.2;this.line([{x:fx.x-Math.cos(a)*r*.4,y:fx.y-Math.sin(a)*r*.4},{x:fx.x+Math.cos(a)*r*.7,y:fx.y+Math.sin(a)*r*.7}],color,.045+i*.025);}}
      else {this.circle(fx.x,fx.y,r*(.35+t*.65),`${color}15`,color,.07);for(let i=0;i<7;i++){const a=fx.angle+(i-3)*.25;this.shard(fx.x+Math.cos(a)*r*t,fx.y+Math.sin(a)*r*t,.18,a,i%2?theme.accent:color);}}
    }
  }
  minimap(canvas,game){
    const c=canvas.getContext('2d'),sx=canvas.width/WORLD.w,sy=canvas.height/WORLD.h;
    c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#142321e8';c.fillRect(0,0,canvas.width,canvas.height);
    c.save();c.scale(sx,sy);c.translate(-WORLD.x,-WORLD.y);c.fillStyle='#253f35';for(const room of TERRAIN)c.fillRect(room.x,room.y,room.w,room.h);c.fillStyle='#4e6252';for(const w of WALLS)c.fillRect(w.x,w.y,w.w,w.h);
    c.fillStyle='#486c39';for(const b of BUSHES)c.fillRect(b.x,b.y,b.w,b.h);
    for(const u of game.units.filter(e=>e.alive&&['champion','core','tower'].includes(e.kind)&&game.visibleTo(0,e))){c.beginPath();c.arc(u.x,u.y,u.player?1.1:u.kind==='champion'?.65:.8,0,Math.PI*2);c.fillStyle=u.player?'#f2da95':u.team===0?'#89c9dd':'#e09484';c.fill();}
    const b=this.camera.bounds;c.strokeStyle='#e3d8aa';c.lineWidth=.25;c.strokeRect(b.x,b.y,b.w,b.h);c.restore();
    const uiScale=canvas.width/Math.max(1,canvas.getBoundingClientRect().width);
    c.font=`bold ${11*uiScale}px Arial`;c.textAlign='center';c.textBaseline='middle';
    for(const camp of game.campViews()){
      const timer=game.campTimers().filter(t=>t.campId===camp.id).sort((a,b)=>a.seconds-b.seconds)[0];
      const x=(camp.home.x-WORLD.x)*sx,y=(camp.home.y-WORLD.y)*sy;c.beginPath();c.arc(x,y,(timer?4:2.2)*uiScale,0,Math.PI*2);c.fillStyle=timer?'#d1b176':'#77865c';c.fill();
      if(timer){const label=String(timer.seconds);c.strokeStyle='#101f1a';c.lineWidth=3*uiScale;c.strokeText(label,x,y-10*uiScale);c.fillStyle='#f2dda1';c.fillText(label,x,y-10*uiScale);}
    }
  }
}
