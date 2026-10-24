import { combatStyle,clipShape } from './combat-style.js';
import { noise } from './organic-particles.js';
import { guardAlly } from './new-champions.js';
import { leapLift,renderAnchor,leapOpacity } from './projection-25d.js';
import { PROJECTILE_VISUAL_SCALE } from './projectile-rules.js';
import { FRAMES } from './art.js';
import { drawWeapon } from './weapon-art.js';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const FORMULAS=['E = mc²','∇·E = ρ/ε₀','Σ F = ma','Δx·Δp ≥ ℏ/2','∂ψ/∂t = Hψ','F = −∇V'];
export function fanFlight(f,age){
 const nails=f.type==='nailFan',count=nails?22:28,out=[];
 for(let i=0;i<count;i++){
  const delay=nails?noise(i,f.at||0,19)*.16:Math.floor(i/14)*.025,duration=nails?.23+noise(i,f.at||0,23)*.13:.3,t=(age-delay)/duration;if(t<0||t>1)continue;
  const aim=nails?noise(i+.37,f.at||0,31)-.5:(i%15)/14-.5,a=f.angle+aim*(f.spread||1.5)*.98,u=1-(1-t)**1.35,origin={x:f.x+Math.cos(f.angle)*(nails?.45:0),y:f.y+Math.sin(f.angle)*(nails?.45:0)},target={x:f.x+Math.cos(a)*f.r,y:f.y+Math.sin(a)*f.r},x=origin.x+(target.x-origin.x)*u,y=origin.y+(target.y-origin.y)*u;
  out.push({id:i,x,y,origin,target,height:nails?.95*(1-u)+.25*u:.25,angle:Math.atan2(target.y-origin.y,target.x-origin.x),distance:Math.hypot(x-f.x,y-f.y),alpha:Math.min(1,(1-t)*3),type:nails?'nail':'bullet'});
 }
 return out;
}
export function petalBursts(f,age){
 const out=[];for(let i=0;i<22;i++){const delay=i*.053,t=(age-delay)/.3;if(t<0||t>1)continue;const a=i*2.399,rad=f.r*Math.sqrt(noise(i,f.at,4))*.97;out.push({x:f.x+Math.cos(a)*rad,y:f.y+Math.sin(a)*rad,r:.4+(1-(1-t)**3)*1.3,angle:a,alpha:(1-t)**.7,delay});}return out;
}
export function petalFanFlight(f,age){
 const out=[];for(let i=0;i<36;i++){
  const delay=noise(i,f.at,11)*.055,t=(age-delay)/.4;if(t<0||t>1)continue;
  const a=f.angle+(i/35-.5)*f.spread*.98,r=f.r*(.08+.92*(1-(1-t)**1.7));
  out.push({id:i,x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r,angle:a,distance:r,height:.15+Math.sin(t*Math.PI)*.32,alpha:Math.min(1,(1-t)*4)});
 }return out;
}
export function treeBillboard(camera,z){
 const at=camera.worldToScreen(z,.075),scale=camera.scale;
 return {x:at.x-1.5*scale,y:at.y-3.84375*scale,width:3*scale,height:4*scale,foot:at};
}
export function treeAttackArea(z,time){
 return z.kind==='desireTree'&&!z.golden&&z.damage!==0&&z.until>time?{x:z.x,y:z.y,r:z.r}:null;
}
export function fallingSwordHeight(remaining){return remaining>=0&&remaining<=.15?11*(1-(1-remaining/.15)**2):null;}
export function healingRipples(f,age){return [0,.12,.24].map(delay=>{const t=(age-delay)/.56;return {r:f.r*Math.max(0,Math.min(1,t))**.75,alpha:t<0||t>1?0:(1-t)*.85};}).filter(p=>p.alpha>0);}
export function inwardWaves(time,startedAt,r){
 if(time<startedAt)return [];return Array.from({length:3},(_,i)=>{const progress=((time-startedAt)/.85+i/3)%1;return {id:i,r:r*(1-progress)**.8,alpha:.25+.4*Math.sin(progress*Math.PI)};});
}
export function championPresentation(g,e){
 const s=e.state||{},buff=k=>g.buff(e,k),status=k=>g.stat(e,k);let aura=null,dim=1,frozen=false;
 const set=(color,element='smoke',strength=.65)=>{aura={color,form:element,strength};};
 if(Object.values(e.buffs||{}).some(t=>t>g.time))set('#c6cbd0','smoke',.5);
 if(g.shield(e)>0)set('#b5c7ce','mist',.7);
 if(e.key==='alisa'&&(s.heat||0)>0)set('#b86132','flame',.7);if(s.detonatesAt>g.time)set('#f05832','flame',.65+.3*Math.min(1,(g.time-(s.detonationAt??g.time))/2));
 if(buff('marks'))set('#a2c879');if(buff('resolve'))set('#d9dce0','glow');if(buff('chainArmor'))set('#eef0e7','glow',.7);
 if(buff('donLifesteal'))set('#8e2d3e');if(buff('guboReload'))set('#6c1429','flame',.8);
 if(buff('tetherGuard')||buff('tetherArmor'))set('#3c807e');if(buff('queequegUlt'))set('#a7333c','flame',.8);
 if(buff('redEncouragement'))set('#ad485b','petal');if(buff('insight'))set('#6bb7ad','mist',.75);
 if(buff('rabbitFrenzy'))set('#db8a49','bolt',e.motion?.actionKind==='basic'?.95:.7);
 if(buff('mutant'))set('#5c412d');if(buff('alisaReload'))set('#b86132','flame',.75);
 if(buff('flowerStride')||buff('flowerReload'))set('#dcc66e','petal');
 if(buff('ishmaelSurvive'))set('#d29b59','glow',.75);
 if(buff('ahabCover')||e.key==='ahab'&&s.order==='guard'||g.champions(e.team).some(a=>a.key==='ahab'&&a.alive&&guardAlly(g,a)===e))set('#3d7472');
 if(e.key==='kim'&&s.counter){set('#233a5d','smoke',.8);dim=.7;}
 if(e.key==='rudolph'&&s.exhaustedUntil>g.time)dim=.67;
 if(e.key==='dongbaek'&&status('disarm'))dim=.7;
 if(status('stun')&&e.status.stun.theme==='rodya')frozen=true;
 return {aura,dim,frozen,lift:e.key==='rudolph'&&e.castSlot==='r'&&e.channelUntil>g.time?.16+.04*Math.sin(g.time*5):0};
}
export class ChampionVFX {
 constructor(vfx,projectiles,art){this.vfx=vfx;this.projectiles=projectiles;this.art=art;this.previous=new WeakMap();this.effects=[];this.seen=new WeakSet();this.cache=new Map();this.pulse=new WeakMap();}
 reset(game){this.game=game;this.previous=new WeakMap();this.effects=[];this.seen=new WeakSet();this.pulse=new WeakMap();}
 event(type,e,g,options={}){this.effects.push({type,owner:e.id,x:e.x,y:e.y,at:g.time,life:1,...options});if(this.effects.length>72)this.effects.shift();}
 sync(g){
  if(this.game!==g||g.time<(this.time||0))this.reset(g);this.time=g.time;this.effects=this.effects.filter(f=>g.time-f.at<f.life);
  for(const e of g.champions().filter(e=>e.alive&&!e.trainingDummy)){
   const s=e.state,old=this.previous.get(e)||{},cast=e.visualCast,buff=k=>g.buff(e,k);
   if(e.castSerial!==old.cast&&cast&&g.time-cast.at<.2){
    const slot=cast.slot;
    if(e.key==='yi'&&slot==='r')this.event('arrival',e,g,{life:.8});
    if(e.key==='don'&&slot==='r')this.event('spotlight',e,g,{life:1.4});
    if(e.key==='meursault'&&slot==='q')this.event('chains',e,g,{life:.65});
    if(e.key==='meursault'&&slot==='r')this.event('chainStrike',e,g,{angle:cast.angle,r:8,spread:Math.PI*100/180,life:.65});
    if(e.key==='rudolph')this.event('electricCast',e,g,{life:slot==='r'?1.25:.5});
    if(e.key==='ahab'&&slot==='q')this.event('shout',e,g,{life:.5});
    if(e.key==='ppui'&&slot==='q')this.event('petalField',e,g,{...cast.point,r:3.5,life:2});
   }
   if(old.reload&&!buff('alisaReload'))this.event('embers',e,g,{life:.7});
   if(!old.exhausted&&s.exhaustedUntil>g.time)this.event('electricCast',e,g,{life:.25});
   if((s.heathExtensions||0)>(old.extension||0))this.event('purplePetals',e,g,{life:1});
   if(s.jackpot&&s.coinAt!==old.coinAt&&g.time-s.coinAt<.2)this.event('coins',e,g,{life:1});
   this.previous.set(e,{cast:e.castSerial,reload:buff('alisaReload'),exhausted:s.exhaustedUntil>g.time,extension:s.heathExtensions,coinAt:s.coinAt});
  }
  for(const f of g.effects){
   if(this.seen.has(f))continue;this.seen.add(f);const e=g.units.find(a=>a.id===f.source)||g.champions().find(a=>a.key===f.theme);if(!e)continue;
   if(f.type==='counterSignal')this.event('counter',e,g,{life:.25});
   if(f.type==='burst'&&e.key==='faust')this.event('formulaField',e,g,{x:f.x,y:f.y,r:f.r,life:.9});
   if(f.type==='burst'&&['heathcliff','dongrang'].includes(e.key))this.event('cracks',e,g,{x:f.x,y:f.y,r:f.r,life:1});
   if(f.type==='soraCracks'||f.type==='yanGreatsword')this.event('cracks',e,g,{x:f.x,y:f.y,r:f.r,life:1.2});
   if(f.type==='yanGreatsword')this.event('fallenSword',e,g,{x:f.x,y:f.y,r:f.r,life:.55});
   if(f.type==='burst'&&e.key==='marton'&&f.r<3)this.event('roots',e,g,{x:f.x,y:f.y,r:f.r,life:.6});
   if(f.type==='impact'&&e.key==='marton'&&g.buff(e,'martonDrain'))this.event('molecules',e,g,{x:f.x,y:f.y,life:.65});
   if(f.type==='guboBlast')this.event('barrage',e,g,{x:f.x,y:f.y,r:f.r,angle:f.angle,spread:f.spread,life:f.maxLife||.8});
   if(f.type==='ryoshuStorm')this.event('fireSwirl',e,g,{r:f.r,life:.7});
   if(f.type==='burst'&&e.key==='dongbaek')this.event('petalExplosions',e,g,{x:f.x,y:f.y,r:f.r,life:1.5});
   if(f.type==='burst'&&e.key==='gahwan'&&f.slot==='r')this.event('gazeSlash',e,g,{x:f.x,y:f.y,r:f.r,life:.65});
   if(f.type==='nailVolley')this.event('nailFan',e,g,{x:f.x,y:f.y,r:f.r,angle:f.angle,spread:f.spread,life:.55});
   if(f.type==='burst'&&e.key==='sinclair')this.event('branchSlash',e,g,{x:f.x,y:f.y,r:f.r,healthy:e.visualCast?.healthy,life:.55});
   if(f.type==='soraClaw')this.event('claws',e,g,{x:f.x,y:f.y,r:f.r,shape:f.shape||{kind:'circle',range:f.r},angle:f.angle||0,life:f.maxLife});
   if(f.type==='outisShotgun')this.event('shotgun',e,g,{x:f.x,y:f.y,r:f.r,angle:f.angle,spread:f.spread,life:.55});
   if(f.type==='outisSpin')this.event('spinSlash',e,g,{x:f.x,y:f.y,r:f.r,life:.4});
   if(f.type==='ahabSpin')this.event('waterSpin',e,g,{x:f.x,y:f.y,r:f.r,life:.28});
   if(f.type==='petalFan')this.event('petalFan',e,g,{x:f.x,y:f.y,r:f.r,angle:f.angle,spread:f.spread,life:.48});
  }
 }
 texture(form,color,variant=0){return this.vfx.sprite(form,color,3,{accent:color,dark:color},variant);}
 mote(c,form,color,x,y,size,angle=0,alpha=.7,variant=0){c.save();c.globalAlpha*=clamp(alpha*1.3);c.translate(x,y);c.rotate(angle);c.drawImage(this.texture(form,color,variant),-size,-size,size*2,size*2);c.restore();}
 rimTexture(color,form){
  const key='aura/'+color+'/'+form;if(this.cache.has(key))return this.cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;const c=canvas.getContext('2d'),p=c.createImageData(128,192),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  for(let y=0;y<192;y++)for(let x=0;x<128;x++){
   const nx=(x+.5)/64-1,ny=(y+.5)/96-1,n=noise(nx*5,ny*6,17),r=Math.hypot(nx,ny)+(n-.5)*.13,edge=Math.exp(-(((r-.78)*23)**2)),halo=Math.exp(-(((r-.77)*8)**2)),a=clamp(edge*.9+halo*.25),i=(y*128+x)*4;
   for(let j=0;j<3;j++)p.data[i+j]=Math.round(rgb[j]+(255-rgb[j])*edge*.38);p.data[i+3]=Math.round(a*255);
  }c.putImageData(p,0,0);this.cache.set(key,canvas);return canvas;
 }
 aura(c,a,time){
  c.save();c.globalAlpha=a.strength*(.92+.08*Math.sin(time*3));c.drawImage(this.rimTexture(a.color,a.form),-1.35,-2.9,2.7,3.2);c.restore();
  for(let i=0;i<3;i++){const x=Math.sin(time*.8+i*2)*.5,y=-.8+Math.cos(time+i)*.2;c.save();c.scale(1,1.45);this.mote(c,a.form==='bolt'?'smoke':a.form,a.color,x,y,1.1+i*.08,time*.15+i,a.strength*.45,i);c.restore();}
 }
 motes(c,form,color,time,count=8,radius=1,alpha=.5){
  for(let i=0;i<count;i++){const a=i*2.4+time*.5,r=radius*(.55+noise(i,time*.2,3)*.45),y=-.9+Math.sin(a)*radius*.6;this.mote(c,form,color,Math.cos(a)*r,y,.1+noise(i,time*.4,6)*.1,a,alpha,i%4);}
 }
 formulas(c,time,radius=1.4,alpha=.7){
  c.save();c.font='.23px monospace';c.textAlign='center';c.fillStyle='#ffffff';c.shadowColor='#e6f5ff';c.shadowBlur=2;
  const count=radius<.5?2:6;for(let i=0;i<count;i++){const phase=(time*.3+i*.17)%1,x=(i/(count-1)-.5)*radius*2,text=Array.from(FORMULAS[i].replace(/\s/g,''));c.globalAlpha=alpha*(.5+.5*Math.sin(phase*Math.PI));for(let j=0;j<text.length;j++)c.fillText(text[j],x,-.4-phase*1.1-(text.length-j)*.23);}
  c.restore();
 }
 formulaArea(c,camera,p,time,alpha=.8){
  for(let i=0;i<5;i++){const a=i*2.4,rad=p.r*(i===0?0:.7),at=camera.worldToScreen({x:p.x+Math.cos(a)*rad,y:p.y+Math.sin(a)*rad},.12);c.save();c.translate(at.x,at.y);c.scale(camera.scale,camera.scale);this.formulas(c,time+i*.15,.3,alpha);c.restore();}
 }
 fairy(c,time,size=1){
  c.save();c.scale(size,size);for(const side of [-1,1]){c.save();c.translate(side*.18,-.12);c.rotate(side*(.5+Math.sin(time*17)*.15));c.scale(.8,1.7);this.mote(c,'petal','#a7e4d7',0,0,.3,0,.7,1);c.restore();}
  this.mote(c,'glow','#7ccdbf',0,0,.5,0,.12);this.mote(c,'drop','#c0e7d9',0,0,.13,0,.9);c.restore();
 }
 body(c,camera,e,g,front=false){
  const p=camera.worldToScreen(renderAnchor(e),.075),scale=camera.scale,presentation=championPresentation(g,e),time=g.time,s=e.state||{};
  c.save();c.globalAlpha*=leapOpacity(e);c.translate(p.x,p.y-(leapLift(e)+presentation.lift)*scale);c.scale(scale,scale);
  if(!front){
   if(presentation.aura)this.aura(c,presentation.aura,time);
   if(g.buff(e,'chainArmor')){c.save();c.globalAlpha=.2;const light=c.createLinearGradient(0,-7,0,0);light.addColorStop(0,'#e9ece100');light.addColorStop(1,'#e9ece1');c.fillStyle=light;for(let i=0;i<4;i++)c.fillRect((i-1.5)*.4,-7,.23,7);c.restore();}
   if(e.visuals?.hongluShare?.until>time){this.aura(c,{color:'#5caba4',form:'mist',strength:.7},time);this.motes(c,'petal','#d3aeb8',time,8,1.15,.85);}
   if(e.key==='alisa'&&s.detonatesAt>time)for(const side of [-1,1])for(let i=0;i<7;i++){const a=i/7*Math.PI*1.1-.6,x=side*(.5+Math.sin(a)*.75),y=-1.25-Math.cos(a)*.8;c.save();c.scale(1,1.3);this.mote(c,'flame','#9e3036',x,y,.38,a*side,.45,i%4);c.restore();}
   if(e.key==='faust'&&g.buff(e,'faustUlt'))this.formulas(c,time);
   if(e.key==='yi'&&g.buff(e,'ogamdo'))for(const side of [-1,1])for(let i=0;i<6;i++)this.mote(c,'crystal','#dce7e8',side*(.55+i*.15),-1-i*.18+Math.sin(time)*.04,.19+i*.025,side*(.4+i*.15),.6,i%4);
   if(e.key==='marton'&&s.fairy){c.save();c.translate(0,-3.1);this.fairy(c,time,.65);c.restore();}
  }else{
   if(e.burn?.until>time||e.key==='alisa'&&(s.heat||0)>0)this.motes(c,'flame','#cf8a4a',time*2,8,.65,.9);
   if(e.key==='ryoshu'&&time-e.lastCombat>=2){c.save();c.translate(0,-1.7);this.mote(c,'smoke','#d4d2cf',.12,-.08,.3+Math.sin(time)*.025,0,.55,Math.floor(time)%4);c.restore();}
   if(e.key==='hohenheim'&&(s.hohenCharge||s.posthumous)){const progress=s.posthumous?1:Math.min(1,s.hohenCharge.progress/1.5),stage=Math.min(3,1+Math.floor((progress+1e-8)/.3));this.electric(c,time,'#8dc8c6',stage*.3,stage*3);}
   if(e.key==='myo'&&g.buff(e,'rabbitFrenzy'))this.electric(c,time,'#d79954',.7,8);
   if(e.key==='rudolph'&&e.castSlot==='r'&&e.channelUntil>time)this.electric(c,time,'#d2944e',1,12);
   if(g.buff(e,'queequegUlt'))this.motes(c,'spark','#df5f40',time*1.5,7,.7,.65);
   if(e.bossEmpowered)this.aura(c,{color:'#a797d8',form:'smoke',strength:.45},time);
   if(e.key==='dongbaek')this.motes(c,'petal','#dbc875',time,7,1,.8);
   if(e.visuals?.hongluShare?.until>time)this.motes(c,'petal','#e8b9c7',time,8,1.15,.85);
   if(s.swordHeldBy)this.motes(c,'spark','#e4dfd5',time*8,7,.3,.8);
   if(g.shield(e)>0){c.save();c.globalAlpha=.85;c.drawImage(this.rimTexture('#d7edf5','shield'),-1.28,-2.82,2.56,3.04);c.restore();}
   if(e.rodyaSlowUntil>time)this.motes(c,'frost','#d3d8dc',time,6,.8,.65);
   if(s.harpoon?.until>time)this.mote(c,'glow','#e8894c',.08,-1,.24+Math.sin(time*7)*.035,0,.95);
   if(s.counter)this.aura(c,{color:'#233a5d',form:'smoke',strength:.45},time);
   if(g.stat(e,'yanLock')){c.save();c.translate(0,-1.05);c.globalAlpha=.8;c.strokeStyle='#8798aa';c.fillStyle='#c9cdd1';c.lineWidth=.035;c.beginPath();c.arc(0,-.14,.13,Math.PI,Math.PI*2);c.stroke();c.fillRect(-.18,-.12,.36,.28);c.strokeRect(-.18,-.12,.36,.28);c.fillStyle='#697b8e';c.fillRect(-.025,-.035,.05,.1);c.restore();}
   if(g.champions(1-e.team).some(a=>a.key==='gubo'&&a.state.guboAim?.target===e&&a.state.guboAim.until>time)){
    c.save();c.translate(0,-1.05);c.strokeStyle='#8f3042';c.globalAlpha=.6;c.lineWidth=.035;const r=.45+Math.sin(time*10)*.04;for(let i=0;i<4;i++){c.save();c.rotate(i*Math.PI/2);c.beginPath();c.moveTo(r,-.13);c.lineTo(r,.13);c.moveTo(r,0);c.lineTo(r+.15,0);c.stroke();c.restore();}c.restore();
   }
   if(e.key==='rodya'&&time-(s.coinAt??-99)<2.2)this.coins(c,e,g);
   if(e.key==='don'&&e.motion?.actionKind==='skill'&&e.castSlot==='r'){c.save();c.rotate(e.facing||0);c.globalAlpha=.65;c.drawImage(this.vfx.strokes.texture('pierce',{x:e.x,y:e.y,born:e.castAt,color:'#a43944'}),0,-1,3,1);c.restore();}
  }
  c.restore();
 }
 electric(c,time,color,strength=1,count=6){
  c.save();c.strokeStyle=color;c.lineWidth=.035;c.globalAlpha=.9*strength;
  for(let i=0;i<count;i++){const a=i*2.4+time*.8,x=Math.cos(a)*.5,y=-.8+Math.sin(a)*.8;c.beginPath();c.moveTo(x,y);for(let j=1;j<5;j++)c.lineTo(x+(noise(i+j,time*13,5)-.5)*.24,y-j*.075);c.stroke();}c.restore();
 }
 coins(c,e,g){
  const age=g.time-e.state.coinAt;for(const [i,head] of (e.state.coinResults||[]).entries()){
   const x=(i-1)*.6,y=-4.4-Math.sin(Math.min(1,age/.9)*Math.PI)*.6,flip=age<.9?Math.max(.12,Math.abs(Math.cos(age*17+i))):1;
   c.save();c.translate(x,y);c.scale(flip,1);const grad=c.createLinearGradient(-.2,-.2,.2,.2);grad.addColorStop(0,head?'#e5d29b':'#a1a5a4');grad.addColorStop(.5,head?'#8b713b':'#4b5257');grad.addColorStop(1,head?'#d5bb7d':'#909895');c.fillStyle=grad;c.beginPath();c.ellipse(0,0,.21,.24,0,0,Math.PI*2);c.fill();c.strokeStyle='#e6dfca';c.lineWidth=.025;c.stroke();c.restore();
  }
 }
 localEvent(c,f,e,g){
  const age=g.time-f.at,t=age/f.life,fade=Math.sin(Math.PI*t),owner=e||f;
  if(f.type==='spotlight'){
   c.save();c.globalAlpha=.4*(1-t);const light=c.createLinearGradient(0,-9,0,0);light.addColorStop(0,'#e2c16c00');light.addColorStop(1,'#e2c16c');c.fillStyle=light;c.beginPath();c.moveTo(-.4,-9);c.lineTo(.4,-9);c.lineTo(1.2,.3);c.lineTo(-1.2,.3);c.closePath();c.fill();c.restore();
   for(let i=0;i<24;i++){const a=i*2.4,x=Math.cos(a)*age*2.2,y=-1.1-age*3+age*age*3+Math.sin(a)*.5;this.mote(c,'petal',['#d8b565','#a55b64','#709caa','#9caf6b'][i%4],x,y,.075,age*4+i,.75*(1-t),i%4);}
  }else if(f.type==='arrival'){this.motes(c,'smoke','#17191e',age,7,1,.7*(1-t));this.motes(c,'feather','#101217',age*2,11,1.5,.95*(1-t));
  }else if(f.type==='chains'){
   c.save();c.strokeStyle='#b7bbc0';c.lineWidth=.035;c.globalAlpha=1-t;
   for(let i=0;i<12;i++){const a=i*2.4,x=Math.cos(a)*age*3,y=-1+Math.sin(a)*age*2+age*age*2;c.save();c.translate(x,y);c.rotate(a+age*3);for(let j=0;j<2;j++){c.beginPath();c.ellipse(j*.13,0,.105,.055,j*.6,0,Math.PI*2);c.stroke();}c.restore();}c.restore();
  }else if(['electricCast','counter'].includes(f.type)){this.electric(c,age,f.type==='counter'?'#668eb6':'#d99c53',1-t,18);
  }else if(f.type==='embers'){this.motes(c,'spark','#b67a45',age*3,18,age*2+.2,(1-t)*.7);
  }else if(f.type==='purplePetals')this.motes(c,'petal','#796080',age*2,14,.4+age,.5*(1-t));
  else if(f.type==='coins'){for(let i=0;i<15;i++){const a=i*2.4,x=Math.cos(a)*age*2,y=-1-age*4+age*age*4;this.mote(c,'chip','#d0b575',x,y,.1,age*8+i,(1-t)*.7,i%4);}}
  else if(f.type==='shout'){c.save();c.translate(.2,-1.7);c.strokeStyle='#b2c8c2';c.lineWidth=.025;c.globalAlpha=(1-t)*.45;for(let i=0;i<3;i++){const size=.15+age*(1+i*.3);c.beginPath();c.arc(0,0,size,-.65,.65);c.stroke();}c.restore();}
 }
 events(c,camera,g){
  c.save();
  for(const f of this.effects){
   if(f.type==='formulaField'){this.formulaArea(c,camera,f,g.time-f.at,1-(g.time-f.at)/f.life);continue;}
   if(f.type==='fallenSword'){this.fallingSword(c,camera,f,0,1-(g.time-f.at)/f.life);continue;}
   if(f.type==='molecules'){const owner=g.units.find(e=>e.id===f.owner);if(owner)this.molecules(c,camera,f,owner,g.time);continue;}
   if(['cracks','roots','formulaField','petalField','barrage','petalExplosions','branchSlash','claws','gazeSlash','nailFan','shotgun','chainStrike','spinSlash','waterSpin','petalFan'].includes(f.type))continue;
   if(f.type==='fireSwirl')continue;
   const e=g.units.find(e=>e.id===f.owner),at=camera.worldToScreen(e||f,.075);c.save();c.translate(at.x,at.y-leapLift(e||{})*camera.scale);c.scale(camera.scale,camera.scale);this.localEvent(c,f,e,g);c.restore();
  }
  for(const f of g.pending)if(f.source.key==='faust'&&f.type==='burst'&&f.at>g.time)this.formulaArea(c,camera,f,g.time,.65);
  for(const f of g.effects)if(f.type==='yanSwordWarning'){
   this.countdown(c,camera,f,f.life,f.maxLife,'#adbed9');
   const height=fallingSwordHeight(f.life);if(height!==null)this.fallingSword(c,camera,f,height,1);
  }
  for(const z of g.zones){const area=treeAttackArea(z,g.time);if(!area)continue;
   const at=camera.worldToScreen({x:z.x,y:z.y+z.r*.8},.12),font=Math.max(11,camera.scale*.27),text=`욕망의 나무 · 공격 반경 ${Number(z.r.toFixed(2))}`;
   c.save();c.font=`600 ${font}px sans-serif`;c.textAlign='center';const w=c.measureText(text).width;c.fillStyle='#201a12e8';c.fillRect(at.x-w/2-6,at.y-font,w+12,font+7);c.fillStyle='#ffe1a0';c.fillText(text,at.x,at.y);c.restore();
  }
  c.restore();
 }
 ground(c,camera,g){
  const world=(p,h=0)=>camera.worldToScreen(p,h),sprite=(form,color,p,h,size,alpha=.5,angle=0)=>{const at=world(p,h);this.mote(c,form,color,at.x,at.y,size*camera.scale,angle,alpha);};
  for(const z of g.zones){
   const time=g.time,kind=z.kind||'mirror',r=z.r;let color=kind==='waterfall'?'#70aaa5':kind==='ice'?'#d1dbe3':kind==='desireTree'?(z.golden?'#c9a958':'#785838'):kind==='electricBloom'?'#8abcb9':'#d8e1e5';
   c.save();const at=world(z,.08),x=world({x:z.x+1,y:z.y},.08),y=world({x:z.x,y:z.y+1},.08);c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();
   if(kind!=='waterfall'){const style=combatStyle(z.source?.key,g,z.source,{kind:'zone',slot:'r',type:kind});if(!z.golden){c.save();c.globalAlpha=.95;c.drawImage(this.vfx.strokes.fieldTexture({...z,...style,kind:'field',born:0,shape:{kind:'circle',range:r}}),-r,-r,r*2,r*2);c.restore();}}
   const grad=c.createRadialGradient(0,0,0,0,0,r);grad.addColorStop(0,color+'35');grad.addColorStop(.8,color+'28');grad.addColorStop(1,color+'08');c.fillStyle=grad;c.fillRect(-r,-r,r*2,r*2);
   if(kind==='waterfall')for(let j=0;j<9;j++){c.beginPath();for(let i=0;i<=48;i++){const x=-r+i*r/24,y=(j-4)*r*.22+Math.sin(x*2+time*2+j)*.15;i?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=j%3?'#8ad5cfb8':'#cfefebe0';c.lineWidth=j%3?.075:.11;c.stroke();}
   c.restore();
   for(let i=0;i<(['desireTree','waterfall'].includes(kind)?0:18);i++){const a=i*2.4+time*.13,rad=r*Math.sqrt(noise(i,Math.floor(time*.1),3)),p={x:z.x+Math.cos(a)*rad,y:z.y+Math.sin(a)*rad};sprite(kind==='ice'?'frost':kind==='electricBloom'?'spark':'crystal',color,p,.08,.13+(i%3)*.055,.7,a);if(kind==='ice'&&i%4===0)this.snowflake(c,world(p,.12),camera.scale*.13,.8);}
   if(kind==='desireTree'){this.field(c,camera,z,.9,z.golden?'#ffe27e':'#281e17',z.golden?.45:.3);this.treeRange(c,camera,z,g.time);}
  }
  for(const f of g.pending)if(f.source.key==='faust'&&f.type==='burst'&&f.at>g.time)this.field(c,camera,f,f.r,'#eef4f5',.16);
  for(const f of g.effects)if(f.type==='hongluRipple'){
   const at=world(f,.08),x=world({x:f.x+1,y:f.y},.08),y=world({x:f.x,y:f.y+1},.08);c.save();c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);
   for(const wave of healingRipples(f,f.maxLife-f.life)){c.globalAlpha=wave.alpha;c.strokeStyle='#9cf1e5';c.lineWidth=.07;c.beginPath();c.arc(0,0,wave.r,0,Math.PI*2);c.stroke();c.strokeStyle='#417d79';c.lineWidth=.035;c.beginPath();c.arc(0,0,Math.max(0,wave.r-.12),0,Math.PI*2);c.stroke();}c.restore();
  }
  for(const f of g.effects)if(f.type==='yanSwordWarning'){
   const progress=clamp(1-f.life/f.maxLife);this.rangeField(c,camera,f,f.r,'#384759',.5,'#b2c7d6');
   for(let i=0;i<12;i++){const a=i*Math.PI/6,p={x:f.x+Math.cos(a)*f.r*(1-progress*.05),y:f.y+Math.sin(a)*f.r*(1-progress*.05)};sprite('spark','#64717d',p,.1,.06,.25);}
  }
  for(const h of g.units.filter(e=>e.alive&&e.key==='yanHand')){
   for(let i=0;i<9;i++){const a=i*2.4+g.time*.18,r=3.1*Math.sqrt(noise(i,1,3)),p={x:h.x+Math.cos(a)*r,y:h.y+Math.sin(a)*r};sprite('mist','#272a38',p,.12,.65,.45,a);}
  }
  for(const f of this.effects){
   const age=g.time-f.at,t=age/f.life,fade=1-t,e=g.units.find(e=>e.id===f.owner)||f;
   if(f.type==='cracks')this.cracks(c,camera,f,f.r||2,fade);
   if(f.type==='chainStrike')for(let i=0;i<7;i++){const a=f.angle+(i/6-.5)*f.spread*.94,len=f.r*(1-Math.exp(-age*18));for(let j=0;j<Math.floor(len/.3);j++){const p=world({x:f.x+Math.cos(a)*j*.3,y:f.y+Math.sin(a)*j*.3},.18);c.save();c.translate(p.x,p.y);c.rotate(a);c.globalAlpha=fade*.5;c.strokeStyle=j%2?'#d5d8d9':'#78818b';c.lineWidth=camera.scale*.023;c.beginPath();c.ellipse(0,0,camera.scale*.15,camera.scale*.06,j%2*.7,0,Math.PI*2);c.stroke();c.restore();}}
   if(f.type==='roots')for(let i=0;i<7;i++){const a=i*2.4,p={x:f.x+Math.cos(a)*(f.r||2)*.7,y:f.y+Math.sin(a)*(f.r||2)*.7};this.root(c,camera,p,Math.sin(Math.PI*t)*1.8,fade);}
   if(f.type==='petalField'||f.type==='petalExplosions')for(let i=0;i<24;i++){const a=i*2.4,rad=(f.r||3)*Math.sqrt(noise(i,f.at,4)),p={x:f.x+Math.cos(a)*rad,y:f.y+Math.sin(a)*rad};sprite('petal',f.type==='petalField'?'#b35765':'#e0c56b',p,.15+Math.sin(age*4+i)*.2,.14,fade*.55,a+age);}
   if(f.type==='petalField')this.rangeField(c,camera,f,f.r,'#b83c55',fade*.55,'#ef9ca9');
   if(f.type==='formulaField')this.field(c,camera,f,f.r,'#f5f5f0',fade*.3);
   if(f.type==='fireSwirl')for(let wave=0;wave<4;wave++){const phase=clamp((age-wave*.12)/.2);if(!phase||phase>=1)continue;for(let i=0;i<9;i++){const a=i*2.4+phase*3,p={x:e.x+Math.cos(a)*f.r*.7,y:e.y+Math.sin(a)*f.r*.7};sprite('flame','#ad513b',p,.25,.4,fade*.4,a);this.smallSlash(c,camera,p,.65,a,'#9c3a3b',fade*.55);}}
   if(f.type==='barrage'){
    this.coneField(c,camera,f,fade);
    this.magicCircles(c,camera,f,fade);
    for(let i=0;i<24;i++){const a=f.angle+(noise(i,f.at,3)-.5)*f.spread,rad=Math.sqrt(noise(i,f.at,9))*f.r,p={x:f.x+Math.cos(a)*rad,y:f.y+Math.sin(a)*rad};this.smallImpact(c,camera,p,.3,a,'#88303e',fade*.45);}
   }
   if(f.type==='branchSlash')for(let i=0;i<(f.healthy?6:3);i++){const a=i*2.4,p={x:f.x+Math.cos(a)*f.r*.5,y:f.y+Math.sin(a)*f.r*.5},color=f.healthy?(i%3===0?'#a85f65':'#a9c978'):'#71884d';this.smallSlash(c,camera,p,f.r*.45,a+age*4,color,fade*.55);}
   if(f.type==='claws'){
    c.save();clipShape(c,camera,{...f,shape:f.shape});
    for(let i=0;i<11;i++){const a=i*2.4+Math.floor(age*25)*.3;let x=Math.cos(a)*(f.r||2)*.65,y=Math.sin(a)*(f.r||2)*.65;
     if(f.shape.kind==='rect'){const u=noise(i,f.at,4),side=(noise(i,f.at,8)-.5)*f.shape.width*.8;x=Math.cos(f.angle)*f.shape.range*u-Math.sin(f.angle)*side;y=Math.sin(f.angle)*f.shape.range*u+Math.cos(f.angle)*side;}
     this.smallSlash(c,camera,{x:f.x+x,y:f.y+y},.45+noise(i,f.at,3)*.4,a,'#101218',fade*.85);
    }c.restore();
   }
   if(f.type==='shotgun'||f.type==='nailFan')this.fan(c,camera,f,age);
   if(f.type==='petalFan'){
    c.save();clipShape(c,camera,{...f,shape:{kind:'cone',range:f.r,angle:f.angle,spread:f.spread}});
    this.vfx.strokes.drawFootprint(c,camera,{...f,kind:'field',born:0,color:'#e6ce77',accent:'#fff0b3',element:'petal',shape:{kind:'cone',range:f.r,angle:f.angle,spread:f.spread}},fade*.8);
    for(const p of petalFanFlight(f,age)){const at=world(p,p.height);this.mote(c,'petal','#f3d569',at.x,at.y,camera.scale*.22,p.angle+age*4,p.alpha);}
    c.restore();
   }
   if(f.type==='petalExplosions'){
    this.areaMaterial(c,camera,f,f.r,'#e5cb70','#ffe99d',fade*.55);
    c.save();clipShape(c,camera,{...f,shape:{kind:'circle',range:f.r}});
    for(const burst of petalBursts(f,age)){this.field(c,camera,burst,burst.r,'#ffe6a0',burst.alpha*.35);this.smallImpact(c,camera,burst,burst.r,burst.angle,'#ffe69d',burst.alpha);for(let j=0;j<7;j++){const a=j*2.4+burst.angle,p={x:burst.x+Math.cos(a)*burst.r*.7,y:burst.y+Math.sin(a)*burst.r*.7};sprite('petal','#e9cb68',p,.3,.16,burst.alpha,a);}}
    c.restore();
   }
   if(f.type==='gazeSlash'){
    c.save();clipShape(c,camera,{...f,shape:{kind:'circle',range:f.r}});
    for(let i=0;i<9;i++){const angle=age*14+i*Math.PI*2/9;this.smallSlash(c,camera,f,f.r,angle,'#f8d45e',fade*.85);const a=i*2.4,r=f.r*Math.sqrt(noise(i,f.at,6)),p={x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r};sprite('drop','#963641',p,.3+age,.13,fade*.8,a);}
    c.restore();
   }
   if(f.type==='spinSlash'){
    c.save();clipShape(c,camera,{...e,shape:{kind:'circle',range:f.r}});for(let i=0;i<3;i++)this.smallSlash(c,camera,e,f.r,age/f.life*Math.PI*2-i*.24,'#edf0f3',fade*(.95-i*.22));c.restore();
   }
   if(f.type==='waterSpin'){
    c.save();clipShape(c,camera,{...f,shape:{kind:'circle',range:f.r}});
    for(let i=0;i<3;i++)this.smallSlash(c,camera,f,f.r,age/f.life*Math.PI*2-i*.3,i===0?'#76bfb9':'#2c6166',fade*(1-i*.2));
    for(let i=0;i<14;i++){const a=i*2.4+age*16,p={x:f.x+Math.cos(a)*f.r*.85,y:f.y+Math.sin(a)*f.r*.85};sprite('drop','#438a8a',p,.15,.16,fade*.85,a);}c.restore();
   }
  }
  for(const e of g.champions().filter(e=>e.alive)){
   if(g.buff(e,'mutant')){this.rangeField(c,camera,e,5.5,'#805735',.32,'#bb946b');for(let i=0;i<36;i++){const a=i*2.4+g.time*1.8,r=5.3*Math.sqrt(noise(i,1,3)),p=world({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r},.2+Math.sin(i+g.time*8)*.12);this.insect(c,p,camera.scale*.095,a+g.time*2,g.time);}}
   if(g.buff(e,'heathUlt')){
    this.areaMaterial(c,camera,e,7.5,'#63455f','#b780a6',.6);c.save();clipShape(c,camera,{...e,shape:{kind:'circle',range:7.5}});
    for(let i=0;i<18;i++){const shifted=g.time*4+i*.137,tick=Math.floor(shifted),phase=shifted%1;if(phase>.75)continue;const a=i*2.4+tick,r=7.5*Math.sqrt(noise(i,tick,5)),p={x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r},at=world(p,.2),alpha=1-phase/.75;this.smallImpact(c,camera,p,.6+phase*2,a,i%3?'#b97ba5':'#dfa4aa',alpha);this.mote(c,'glow','#cb92b4',at.x,at.y,camera.scale*.4,a,alpha*.2);for(let j=0;j<3;j++)this.mote(c,'chip','#dfc7dc',at.x+Math.cos(j*2.4)*phase*camera.scale,at.y-Math.sin(j*2.4)*phase*camera.scale,camera.scale*.07,j,alpha);}c.restore();
   }
   if(e.state.tether){const target=g.units.find(t=>t.id===e.state.tether.target&&t.alive);if(target)this.rope(c,camera,e,target);}
   if(e.state.swordGrab?.target?.alive)this.sword(c,camera,e,e.state.swordGrab.target);
   if(e.key==='marton'&&e.state.fairy?.until>g.time){
    c.save();clipShape(c,camera,{...e,shape:{kind:'circle',range:6.8}});for(const wave of inwardWaves(g.time,e.state.fairy.at??e.state.fairy.until-2.5,6.8))this.smallImpact(c,camera,e,wave.r,0,'#7ad7c4',wave.alpha);
    for(let i=0;i<24;i++){const a=i*2.4,u=(g.time*1.4+i*.13)%1,r=6.8*(1-u),p=camera.worldToScreen({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r},.25+u*.5);this.mote(c,'spark','#8ed8c6',p.x,p.y,camera.scale*.08,a,.75);}c.restore();
   }
   if(e.key==='honglu'&&g.time-(e.attackAt??-99)<.3)for(let i=0;i<3;i++){const a=(g.time-e.attackAt)*20+i*Math.PI*2/3,r=g.attackRange(e);this.smallSlash(c,camera,{x:e.x,y:e.y},r,a,'#73aaa6',.28);}
  }
 }
 smallSlash(c,camera,p,r,angle,color,alpha){this.stamp(c,camera,p,r,angle,color,alpha,'slash');}
 areaMaterial(c,camera,p,r,color,accent,alpha){this.vfx.strokes.drawFootprint(c,camera,{...p,kind:'field',element:'metal',color,accent,born:0,radius:r,shape:{kind:'circle',range:r}},alpha);}
 rangeField(c,camera,p,r,color,alpha,edge=color){
  this.areaMaterial(c,camera,p,r,color,edge,alpha);const o=camera.worldToScreen(p,.12),x=camera.worldToScreen({x:p.x+1,y:p.y},.12),y=camera.worldToScreen({x:p.x,y:p.y+1},.12);
  c.save();c.translate(o.x,o.y);c.transform(x.x-o.x,x.y-o.y,y.x-o.x,y.y-o.y,0,0);c.globalAlpha=clamp(alpha*1.6);c.strokeStyle=edge;c.lineWidth=.06;c.beginPath();c.arc(0,0,Math.max(.001,r-.03),0,Math.PI*2);c.stroke();c.restore();
 }
 countdown(c,camera,p,remaining,total,color){
  const progress=clamp(1-remaining/total),o=camera.worldToScreen(p,.14),x=camera.worldToScreen({x:p.x+1,y:p.y},.14),y=camera.worldToScreen({x:p.x,y:p.y+1},.14);
  c.save();c.translate(o.x,o.y);c.transform(x.x-o.x,x.y-o.y,y.x-o.x,y.y-o.y,0,0);c.strokeStyle=color;c.lineWidth=.12;c.globalAlpha=.95;c.beginPath();c.arc(0,0,p.r*.95,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);c.stroke();c.restore();
  c.save();c.font=`600 ${Math.max(13,camera.scale*.4)}px sans-serif`;c.textAlign='center';c.strokeStyle='#101722';c.lineWidth=4;c.strokeText(`${Math.max(0,remaining).toFixed(2)}s`,o.x,o.y);c.fillStyle=color;c.fillText(`${Math.max(0,remaining).toFixed(2)}s`,o.x,o.y);c.restore();
 }
 magicCircles(c,camera,f,alpha){
  c.save();clipShape(c,camera,{...f,shape:{kind:'cone',range:f.r,angle:f.angle,spread:f.spread}});
  for(let i=0;i<6;i++){
   const a=f.angle+(i%3-1)*f.spread*.26,rad=f.r*(i<3?.38:.76),p={x:f.x+Math.cos(a)*rad,y:f.y+Math.sin(a)*rad},o=camera.worldToScreen(p,.14),x=camera.worldToScreen({x:p.x+1,y:p.y},.14),y=camera.worldToScreen({x:p.x,y:p.y+1},.14),r=i<3?1.15:1.65;
   c.save();c.translate(o.x,o.y);c.transform(x.x-o.x,x.y-o.y,y.x-o.x,y.y-o.y,0,0);c.globalAlpha=alpha*.85;c.fillStyle='#330712aa';c.strokeStyle='#b63752';c.lineWidth=.065;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();
   c.beginPath();c.arc(0,0,r*.76,0,Math.PI*2);c.stroke();c.rotate(a);
   for(let j=0;j<2;j++){c.beginPath();for(let k=0;k<3;k++){const t=(k*2+j)*Math.PI/3,px=Math.cos(t)*r*.7,py=Math.sin(t)*r*.7;k?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.stroke();}
   for(let j=0;j<12;j++){const t=j*Math.PI/6;c.beginPath();c.moveTo(Math.cos(t)*r*.85,Math.sin(t)*r*.85);c.lineTo(Math.cos(t+.05)*r*.96,Math.sin(t+.05)*r*.96);c.stroke();}c.restore();
  }c.restore();
 }
 coneField(c,camera,f,alpha){
  const o=camera.worldToScreen(f,.12),x=camera.worldToScreen({x:f.x+1,y:f.y},.12),y=camera.worldToScreen({x:f.x,y:f.y+1},.12);
  c.save();c.translate(o.x,o.y);c.transform(x.x-o.x,x.y-o.y,y.x-o.x,y.y-o.y,0,0);c.beginPath();c.moveTo(0,0);c.arc(0,0,f.r,f.angle-f.spread/2,f.angle+f.spread/2);c.closePath();
  c.globalAlpha=clamp(alpha)*.38;c.fillStyle='#6c0d26';c.fill();c.globalAlpha=clamp(alpha)*.95;c.strokeStyle='#b73551';c.lineWidth=.085;c.stroke();c.restore();
 }
 fan(c,camera,f,age){
  if(!this.projectiles)return;c.save();clipShape(c,camera,{...f,shape:{kind:'cone',range:f.r,angle:f.angle,spread:f.spread}});
  for(const p of fanFlight(f,age)){
   const at=camera.worldToScreen(p,p.height),next=camera.worldToScreen(p.target,.25),a=Math.atan2(next.y-at.y,next.x-at.x),scale=camera.scale;
   if(f.type==='shotgun'){this.mote(c,'flame',p.distance%2>1?'#d7894e':'#738456',at.x,at.y,.24*scale,a,p.alpha*.75);}
   const nails=f.type==='nailFan',factor=PROJECTILE_VISUAL_SCALE/(nails?1.5:1)*(nails?.7:1),height=(nails?.6:.4)*factor,length=1.3*factor;c.save();c.translate(at.x,at.y);c.rotate(a);c.globalAlpha=p.alpha;c.drawImage(this.projectiles.sprite(p.type,nails?'#cc354f':'#e6b27a',{tint:nails}),-scale*length/2,-scale*height/2,scale*length,scale*height);c.restore();
  }c.restore();
 }
 smallImpact(c,camera,p,r,angle,color,alpha){this.stamp(c,camera,p,r,angle,color,alpha,'impact');}
 stamp(c,camera,p,r,angle,color,alpha,kind){const at=camera.worldToScreen(p,.12),x=camera.worldToScreen({x:p.x+1,y:p.y},.12),y=camera.worldToScreen({x:p.x,y:p.y+1},.12);c.save();c.globalAlpha=alpha;c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);c.rotate(angle);c.drawImage(this.vfx.strokes.texture(kind,{x:p.x,y:p.y,born:0,color}),-r,-r,r*2,r*2);c.restore();}
 field(c,camera,p,r,color,alpha){const at=camera.worldToScreen(p,.06),x=camera.worldToScreen({x:p.x+1,y:p.y},.06),y=camera.worldToScreen({x:p.x,y:p.y+1},.06);c.save();c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);const shade=c.createRadialGradient(0,0,0,0,0,r);shade.addColorStop(0,color);shade.addColorStop(1,color+'00');c.globalAlpha=alpha;c.fillStyle=shade;c.fillRect(-r,-r,r*2,r*2);c.restore();}
 fallingSword(c,camera,p,height,alpha){
  const f=FRAMES.yanSword,atlas=this.art?.atlasFor('yanSword');if(!atlas?.complete||!atlas.naturalWidth)return;
  const tip=camera.worldToScreen(p,height+.1),length=camera.scale*6.5,width=length*f.h/f.w;
  c.save();c.globalAlpha=alpha;c.translate(tip.x,tip.y);c.rotate(Math.PI/2);c.drawImage(atlas,f.x,f.y,f.w,f.h,-length,-width/2,length,width);c.restore();
 }
 molecules(c,camera,f,owner,time){
  const age=time-f.at,from=camera.worldToScreen(f,1.1),to=camera.worldToScreen(owner,1.15),scale=camera.scale;
  for(let i=0;i<8;i++){
   const u=(age-i*.018)/.45;if(u<0||u>1)continue;const x=from.x+(to.x-from.x)*u,y=from.y+(to.y-from.y)*u-Math.sin(u*Math.PI)*scale*.6,alpha=Math.min(1,(1-u)*5),a=i*2.4+u*3,nodes=[[0,0],[Math.cos(a)*.21,Math.sin(a)*.21],[Math.cos(a+2)*.19,Math.sin(a+2)*.19]];
   c.save();c.globalAlpha=alpha;c.strokeStyle='#8be0c5';c.lineWidth=Math.max(1.2,scale*.035);c.beginPath();for(const [dx,dy] of nodes.slice(1)){c.moveTo(x,y);c.lineTo(x+dx*scale,y+dy*scale);}c.stroke();
   for(const [j,[dx,dy]] of nodes.entries()){this.mote(c,'glow','#8fe9cf',x+dx*scale,y+dy*scale,scale*.16,0,.95);c.fillStyle=j?'#a2ebd4':'#e5fff2';c.strokeStyle='#367d71';c.lineWidth=1;c.beginPath();c.arc(x+dx*scale,y+dy*scale,scale*(j?.065:.095),0,Math.PI*2);c.fill();c.stroke();}c.restore();
  }
 }
 cracks(c,camera,p,r,alpha){c.save();c.globalAlpha=alpha*.5;c.strokeStyle='#211f22';c.lineWidth=camera.scale*.035;for(let i=0;i<9;i++){const a=i*2.4;c.beginPath();for(let j=0;j<6;j++){const b=a+(noise(i,j,3)-.5)*.25,q=camera.worldToScreen({x:p.x+Math.cos(b)*r*j/6,y:p.y+Math.sin(b)*r*j/6},.07);j?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);}c.stroke();}c.restore();}
 root(c,camera,p,height,alpha){const base=camera.worldToScreen(p,.08),tip=camera.worldToScreen({x:p.x+.2,y:p.y},height);c.save();c.globalAlpha=alpha;const grad=c.createLinearGradient(base.x,base.y,tip.x,tip.y);grad.addColorStop(0,'#302218');grad.addColorStop(.65,'#71533b');grad.addColorStop(1,'#b69b6c');c.fillStyle=grad;c.beginPath();c.moveTo(base.x-camera.scale*.22,base.y);c.bezierCurveTo(base.x,tip.y+camera.scale*.35,tip.x,tip.y,tip.x,tip.y);c.quadraticCurveTo(base.x+camera.scale*.35,base.y,base.x+camera.scale*.22,base.y);c.closePath();c.fill();c.restore();}
 treeRange(c,camera,z,time){
  const area=treeAttackArea(z,time);if(!area)return;
  const at=camera.worldToScreen(z,.12),x=camera.worldToScreen({x:z.x+1,y:z.y},.12),y=camera.worldToScreen({x:z.x,y:z.y+1},.12),r=area.r;
  c.save();c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();
  const shade=c.createRadialGradient(0,0,r*.15,0,0,r);shade.addColorStop(0,'#b98a4020');shade.addColorStop(.75,'#b98a4038');shade.addColorStop(1,'#f2cd7755');c.fillStyle=shade;c.fillRect(-r,-r,r*2,r*2);
  c.beginPath();c.arc(0,0,Math.max(.01,r-.04),0,Math.PI*2);c.strokeStyle='#704923';c.lineWidth=.12;c.stroke();c.strokeStyle='#f5d489';c.lineWidth=.065;c.stroke();
  for(let i=0;i<24;i++){const a=i*Math.PI/12,rad=r-.13-noise(i,z.x+z.y,9)*.1;c.beginPath();c.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);c.quadraticCurveTo(Math.cos(a+.035)*(rad-.1),Math.sin(a+.035)*(rad-.1),Math.cos(a+.06)*(rad-.22),Math.sin(a+.06)*(rad-.22));c.strokeStyle=i%2?'#efcf8c':'#986c37';c.lineWidth=.035;c.stroke();}
  c.restore();
 }
 treeTexture(golden=false){
  const key=golden?'tree/golden':'tree/bare';if(this.cache.has(key))return this.cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=256;const c=canvas.getContext('2d');c.translate(96,246);c.scale(64,64);c.lineCap='round';c.lineJoin='round';
  const branch=(a,b,w)=>{c.strokeStyle=golden?'#8e6523':'#34241b';c.lineWidth=w+.045;c.beginPath();c.moveTo(a[0],-a[1]);c.quadraticCurveTo((a[0]+b[0])*.55+.03,-(a[1]+b[1])*.5,b[0],-b[1]);c.stroke();c.strokeStyle=golden?'#edc752':'#96724e';c.lineWidth=w;c.stroke();c.strokeStyle=golden?'#fff3ad':'#c2a580';c.lineWidth=w*.25;c.stroke();};
  branch([0,0],[.08,2.9],.2);for(const side of [-1,1])branch([0,.1],[side*.48,.02],.08);
  for(let i=0;i<7;i++){
   const side=i%2?1:-1,a=[.04,.6+i*.26],b=[side*(.5+i*.065),1.35+i*.24],tip=[b[0]*1.35,b[1]+.58];branch(a,b,.09);branch(b,tip,.05);branch(b,[b[0]*1.45,b[1]+.13],.035);
   if(golden){const s=.18;c.save();c.translate(tip[0],-tip[1]+.12);c.rotate(side*.16);c.fillStyle=i%2?'#fff9e5':'#ffdc5c';c.strokeStyle='#a16e20';c.lineWidth=.024;c.beginPath();c.moveTo(-s,-s*.9);c.lineTo(s,-s*.9);c.lineTo(s*.75,s*.65);c.lineTo(-s*.7,s*.65);c.closePath();c.fill();c.stroke();c.fillStyle='#f2c243';c.fillRect(-s*.15,s*.6,s*.3,s*.45);c.fillRect(-s*.6,s,s*1.2,s*.16);c.restore();}
  }
  this.cache.set(key,canvas);return canvas;
 }
 tree(c,camera,z,g){
  const p=treeBillboard(camera,z);if(p.x+p.width<0||p.x>camera.width||p.y+p.height<0||p.y>camera.height)return;
  c.save();c.drawImage(this.treeTexture(z.golden),p.x,p.y,p.width,p.height);
  if(z.golden)for(let i=0;i<12;i++){const a=i*2.4+g.time*.3,x=p.foot.x+Math.cos(a)*camera.scale,y=p.foot.y-(1.7+Math.sin(a)*1.3)*camera.scale;this.mote(c,'spark','#ffe99b',x,y,camera.scale*.11,a,.95);}
  c.restore();
 }
 snowflake(c,p,size,alpha){c.save();c.globalAlpha=alpha;c.strokeStyle='#e5edf1';c.lineWidth=.6;for(let i=0;i<3;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(p.x-Math.cos(a)*size,p.y-Math.sin(a)*size);c.lineTo(p.x+Math.cos(a)*size,p.y+Math.sin(a)*size);c.stroke();}c.restore();}
 insect(c,p,size,a,time){c.save();c.translate(p.x,p.y);c.rotate(a);c.fillStyle='#76583e';c.beginPath();c.ellipse(0,0,size*.7,size,0,0,Math.PI*2);c.fill();c.strokeStyle='#aa8a65';c.lineWidth=.6;for(const side of [-1,1]){c.beginPath();c.ellipse(side*size*.65,0,size*.7,size*.3,Math.sin(time*48)*.9,0,Math.PI*2);c.stroke();}c.restore();}
 rope(c,camera,a,b){const from=camera.worldToScreen(a,1),to=camera.worldToScreen(b,1),dx=to.x-from.x,dy=to.y-from.y,n=Math.hypot(dx,dy)||1;c.save();for(const side of [-1,1]){c.strokeStyle=side<0?'#765834':'#b49669';c.lineWidth=1.6;c.beginPath();for(let i=0;i<=32;i++){const u=i/32,w=Math.sin(i*1.9)*side*.8,x=from.x+dx*u-dy/n*w,y=from.y+dy*u+dx/n*w+Math.sin(u*Math.PI)*6;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}c.restore();}
 sword(c,camera,e,t){const a=camera.worldToScreen(e,1),b=camera.worldToScreen(t,1.15),dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy);c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(dy,dx));drawWeapon(c,'kimSword',n+10);c.restore();}
}
