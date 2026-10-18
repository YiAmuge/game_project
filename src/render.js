import { WALLS, BUSHES, CHAMPIONS, lanePath } from './data.js';
import { distance } from './geometry.js';
import { Camera } from './camera.js';
import { FRAMES, THEMES, loadAtlas } from './art.js';

export class Renderer {
  constructor(canvas) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera=new Camera();this.atlas=loadAtlas();this.scale=1;this.ox=0;this.oy=0;this.resize();}
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
    c.fillStyle='#111d20';c.fillRect(0,0,64,36);
    const g=c.createRadialGradient(32,18,1,32,18,35);g.addColorStop(0,'#2a3736');g.addColorStop(1,'#192a2c');
    c.fillStyle=g;c.beginPath();c.moveTo(10,2);c.lineTo(54,2);c.quadraticCurveTo(58,2,59,8);c.quadraticCurveTo(63.5,9,63.5,18);c.quadraticCurveTo(63.5,27,59,28);c.quadraticCurveTo(58,34,54,34);c.lineTo(10,34);c.quadraticCurveTo(6,34,5,28);c.quadraticCurveTo(.5,27,.5,18);c.quadraticCurveTo(.5,9,5,8);c.quadraticCurveTo(6,2,10,2);c.fill();c.strokeStyle='#3a4a46';c.lineWidth=.14;c.stroke();
    c.save();c.clip();
    for(let y=0;y<36;y+=2)for(let x=0;x<64;x+=2) {
      const n=(x*17+y*11)%7;c.fillStyle=`rgba(134,153,132,${.012+n*.003})`;c.fillRect(x+.08,y+.08,1.84,1.84);
    }
    for(let lane=0;lane<2;lane++) {
      const points=lanePath(0,lane);this.line(points,'#414b4140',3.3);this.line(points,'#56614a30',.08);this.line(points,'#a9ab7130',.06,[.15,.6]);
    }
    this.line([{x:6,y:18},{x:58,y:18}],'#414e3e40',2);
    this.circle(32,18,5.3,'#202c2d','#64705a44');this.circle(32,18,4.5,null,'#72745b33',.05);
    for(let a=0;a<Math.PI*2;a+=Math.PI/6)this.line([{x:32+Math.cos(a)*4.8,y:18+Math.sin(a)*4.8},{x:32+Math.cos(a)*5.1,y:18+Math.sin(a)*5.1}],'#7d846357',.08);
    for(const b of BUSHES)this.bush(b);
    for(const w of WALLS) {
      c.fillStyle='#0a141bbb';c.fillRect(w.x+.35,w.y+.45,w.w,w.h);
      c.fillStyle='#152329';c.fillRect(w.x,w.y+.3,w.w,w.h);
      c.fillStyle='#3a4946';c.fillRect(w.x,w.y,w.w,w.h);
      c.strokeStyle='#647061';c.lineWidth=.07;c.strokeRect(w.x+.08,w.y+.08,w.w-.16,w.h-.16);
      this.line([{x:w.x+.2,y:w.y+.22},{x:w.x+w.w-.2,y:w.y+.22}],'#84917a66',.06);
      for(let x=w.x+1;x<w.x+w.w;x+=1.4)this.line([{x,y:w.y},{x:x-.15,y:w.y+w.h}],'#16262a88',.05);
    }
    this.circle(2,18,3.4,'#4b99ab12','#73a5ac55',.09);this.circle(62,18,3.4,'#b8645312','#a8706655',.09);
    this.text('SUPPLY',2.5,21.9,'#789a98',.36);this.text('SUPPLY',61.5,21.9,'#9d7e71',.36);
    this.text('UPPER LINE',32,3.6,'#84907866',.43);this.text('LOWER LINE',32,32.5,'#84907866',.43);
    c.restore();
    this.text('N',2,2,'#617972',.5);this.line([{x:2,y:4},{x:2,y:2.6}],'#617972',.08);this.polygon([[1.8,2.9],[2,2.5],[2.2,2.9]],'#617972');
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
      else this.text('본진',e.x,e.y+2.35,color,.5);
      this.bar(e,3.3,e.y-2.2,game);
    } else {
      this.polygon([[e.x-.8,e.y+.7],[e.x-.7,e.y-.4],[e.x-.45,e.y-.95],[e.x+.45,e.y-.95],[e.x+.7,e.y-.4],[e.x+.8,e.y+.7]],dark,color);
      this.polygon([[e.x-.4,e.y+.35],[e.x-.4,e.y-.45],[e.x-.16,e.y-.45],[e.x-.16,e.y-.15],[e.x+.16,e.y-.15],[e.x+.16,e.y-.45],[e.x+.4,e.y-.45],[e.x+.4,e.y+.35]],color);
      this.bar(e,2.3,e.y-1.4,game);
    }
  }
  unit(e,game) {
    if(!e.alive||game.hidden(e)||!game.visibleTo(0,e))return;
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
    const f=FRAMES[e.key],h=2.1,w=h*f.w/f.h,bob=Math.sin(game.time*3+e.id)*.025;
    c.save();c.translate(e.x,e.y+.3+bob);if(Math.cos(angle)<0)c.scale(-1,1);
    if(this.atlas.complete&&this.atlas.naturalWidth){c.imageSmoothingEnabled=false;c.drawImage(this.atlas,f.x,f.y,f.w,f.h,-w/2,-h,w,h);}
    else {c.fillStyle=def.color;c.fillRect(-.42,-1.8,.84,.8);c.fillStyle='#273642';c.fillRect(-.38,-1,.76,1);}
    c.restore();
    if(Math.sin(angle)>=-.2)this.weapon(e,game);
    c.restore();
    this.bar(e,1.65,e.y-2.1,game);this.text(`${e.name}  ${e.level}`,e.x,e.y-2.43,e.player?'#f1dda5':team,.32);
    if(e.player){this.polygon([[e.x-.14,e.y-2.95],[e.x+.14,e.y-2.95],[e.x,e.y-2.7]],'#e9ce87');if(inBush)this.text(e.revealedUntil>game.time?'노출 중':'수풀 은닉',e.x,e.y+.8,'#a9d890',.32);}
    const status=game.stat(e,'silence')?'침묵':game.stat(e,'root')?'속박':game.stat(e,'slow')?'감속':'';
    if(status)this.text(status,e.x,e.y+1.1,'#d5b293',.44);
  }
  draw(game,playing) {
    this.follow(game,playing);
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#111b20';c.fillRect(0,0,this.width,this.height);c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);
    this.floor();
    if(!game.bossSpawned){this.text('CENTRAL CAMP',32,18,'#b8ae7766',.4);this.text('05:00',32,18.7,'#a5a58b66',.48);}
    for(const z of game.zones){this.circle(z.x,z.y,z.r,'#a2b4c72a','#bfc8be88',.06);for(let i=0;i<12;i++){const a=i*2.4+game.time*.25,r=z.r*.7*(.3+(i%3)/3);this.shard(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,.13,a,'#d1e8e8');}}
    for(const p of game.pending){const color=THEMES[p.source.key]?.light||'#d3b978';this.circle(p.x,p.y,p.r,`${color}18`,`${color}99`,.05);this.circle(p.x,p.y,p.r*(1-Math.min(1,(p.at-game.time)/1.25)),null,color,.08);for(let i=0;i<8;i++){const a=i*Math.PI/4+game.time;this.line([{x:p.x+Math.cos(a)*(p.r-.3),y:p.y+Math.sin(a)*(p.r-.3)},{x:p.x+Math.cos(a)*p.r,y:p.y+Math.sin(a)*p.r}],color,.06);}}
    for(const e of game.units.filter(e=>e.kind==='core'||e.kind==='tower'))this.structure(e,game);
    if(playing&&game.player.alive&&!game.hidden(game.player)) {
      const p=game.player,aim=game.input.aim,theta=Math.atan2(aim.y-p.y,aim.x-p.x);
      c.setLineDash([.1,.24]);this.circle(p.x,p.y,p.range,null,'#b7d3c727',.035);c.setLineDash([]);
      this.line([{x:p.x+Math.cos(theta),y:p.y+Math.sin(theta)},{x:p.x+Math.cos(theta)*p.range,y:p.y+Math.sin(theta)*p.range}],'#dfcfaa50',.04,[.18,.2]);
      this.circle(aim.x,aim.y,.22,null,'#d8c9a177',.04);
    }
    for(const e of game.units.filter(e=>!['core','tower'].includes(e.kind)).sort((a,b)=>a.y-b.y))this.unit(e,game);
    for(const b of BUSHES)this.bush(b,true);
    for(const p of game.projectiles){
      if(p.theme==='yi')this.shard(p.x,p.y-.45,.27,Math.atan2(p.dy,p.dx),'#d5e9ef');
      else if(p.theme==='faust'){c.save();c.translate(p.x,p.y-.45);c.rotate(Math.atan2(p.dy,p.dx));this.line([{x:-.85,y:0},{x:.3,y:0}],'#a7ebec77',.22);c.beginPath();c.arc(-.5,0,.65,-1,1);c.strokeStyle='#d3ffff';c.lineWidth=.12;c.stroke();c.restore();}
      else {this.line([{x:p.x-p.dx*.5,y:p.y-p.dy*.5},{x:p.x,y:p.y}],p.color,.1);this.circle(p.x,p.y,.12,'#edf0cf');}
    }
    for(const fx of game.effects) {
      c.save();c.globalAlpha=Math.max(0,fx.life/fx.maxLife);
      if(fx.type==='line'){this.line([{x:fx.x,y:fx.y},fx.to],fx.color,.1);if(fx.theme==='sinclair')this.line([{x:fx.x,y:fx.y-.2},{x:fx.to.x,y:fx.to.y-.2}],'#f5e997',.08);}
      if(fx.type==='ring'){this.circle(fx.x,fx.y,fx.r*(1-fx.life/fx.maxLife*.3),`${fx.color}11`,fx.color,.1);}
      if(fx.type==='number')this.text(fx.text,fx.x,fx.y-(1-fx.life/fx.maxLife),fx.color,.48);
      if(fx.type==='arc'){const color=THEMES[fx.theme]?.light||fx.color;c.beginPath();c.moveTo(fx.x,fx.y);c.arc(fx.x,fx.y,fx.r,fx.angle-fx.spread/2,fx.angle+fx.spread/2);c.closePath();c.fillStyle=color+'20';c.fill();c.strokeStyle=color;c.lineWidth=.12;c.stroke();if(fx.theme==='meursault')this.chain({x:fx.x,y:fx.y},{x:fx.x+Math.cos(fx.angle)*fx.r,y:fx.y+Math.sin(fx.angle)*fx.r},color);}
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
    const c=this.ctx,a=e.facing??(e.team?Math.PI:0),swing=(game.time-(e.attackAt??-10))/.3,lunge=swing>=0&&swing<1?Math.sin(swing*Math.PI)*.28:0;
    c.save();c.translate(e.x,e.y-.45);c.rotate(a);c.translate(.25+lunge,0);
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
    } else {
      this.chain({x:-.1,y:-.2},{x:.7,y:-.25},'#9aa8b4');this.chain({x:.1,y:.2},{x:.95,y:.25},'#9aa8b4');
      for(const [x,y] of [[.65,-.23],[.95,.23]]){c.fillStyle='#243340';c.fillRect(x-.17,y-.16,.4,.32);c.strokeStyle='#9da8b4';c.lineWidth=.055;c.strokeRect(x-.17,y-.16,.4,.32);this.line([{x:x-.06,y:y-.08},{x:x+.12,y:y-.08}],'#c0b296',.06);}
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
    } else {
      this.circle(fx.x,fx.y,r*(.4+t*.6),'#a3f5f511',theme.light,.09);
      for(let i=0;i<16;i++){const a=i*Math.PI/8,from={x:fx.x+Math.cos(a)*r*.25,y:fx.y+Math.sin(a)*r*.25},to={x:fx.x+Math.cos(a)*r,y:fx.y+Math.sin(a)*r};this.line([from,{x:(from.x+to.x)/2+Math.sin(i)*.25,y:(from.y+to.y)/2-.2},to],i%2?theme.dark:theme.light,.06);}
    }
  }
  minimap(canvas,game){
    const c=canvas.getContext('2d'),sx=canvas.width/64,sy=canvas.height/36;
    c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#142321e8';c.fillRect(0,0,canvas.width,canvas.height);
    c.save();c.scale(sx,sy);c.fillStyle='#4e6252';for(const w of WALLS)c.fillRect(w.x,w.y,w.w,w.h);
    c.fillStyle='#486c39';for(const b of BUSHES)c.fillRect(b.x,b.y,b.w,b.h);
    for(const u of game.units.filter(e=>e.alive&&['champion','core','tower'].includes(e.kind)&&game.visibleTo(0,e))){c.beginPath();c.arc(u.x,u.y,u.player?1.1:u.kind==='champion'?.65:.8,0,Math.PI*2);c.fillStyle=u.player?'#f2da95':u.team===0?'#89c9dd':'#e09484';c.fill();}
    const b=this.camera.bounds;c.strokeStyle='#e3d8aa';c.lineWidth=.25;c.strokeRect(b.x,b.y,b.w,b.h);c.restore();
  }
}
