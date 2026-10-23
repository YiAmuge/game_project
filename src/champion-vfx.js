import { clipShape } from './combat-style.js';
import { noise } from './organic-particles.js';
import { guardAlly } from './new-champions.js';
import { leapLift,renderAnchor } from './projection-25d.js';

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const FORMULAS=['E = mc²','∇·E = ρ/ε₀','Σ F = ma','Δx·Δp ≥ ℏ/2','∂ψ/∂t = Hψ','F = −∇V'];
export function championPresentation(g,e){
 const s=e.state||{},buff=k=>g.buff(e,k),status=k=>g.stat(e,k);let aura=null,dim=1,frozen=false;
 const set=(color,element='smoke',strength=.09)=>{aura={color,form:element,strength};};
 if(Object.values(e.buffs||{}).some(t=>t>g.time))set('#c6cbd0','smoke',.045);
 if(g.shield(e)>0)set('#b5c7ce','mist',.065);
 if(buff('marks'))set('#a2c879');if(buff('resolve'))set('#d9dce0','glow',.065);if(buff('chainArmor'))set('#eef0e7','glow',.07);
 if(buff('donLifesteal'))set('#8e2d3e');if(buff('guboReload'))set('#6c1429','flame',.12);
 if(buff('tetherGuard')||buff('tetherArmor'))set('#3c807e');if(buff('queequegUlt'))set('#a7333c','flame',.12);
 if(buff('redEncouragement'))set('#ad485b','petal');if(buff('insight'))set('#6bb7ad','mist',.1);
 if(buff('rabbitFrenzy'))set('#db8a49','bolt',e.motion?.actionKind==='basic'?.15:.09);
 if(buff('mutant'))set('#5c412d');if(buff('alisaReload'))set('#b86132','flame',.1);
 if(buff('flowerStride')||buff('flowerReload'))set('#dcc66e','petal');
 if(buff('ishmaelSurvive'))set('#d29b59','glow',.1);
 if(buff('ahabCover')||e.key==='ahab'&&s.order==='guard'||g.champions(e.team).some(a=>a.key==='ahab'&&a.alive&&guardAlly(g,a)===e))set('#3d7472');
 if(e.key==='kim'&&s.counter){set('#233a5d','smoke',.13);dim=.7;}
 if(e.key==='rudolph'&&s.exhaustedUntil>g.time)dim=.67;
 if(e.key==='dongbaek'&&status('disarm'))dim=.7;
 if(status('stun')&&e.status.stun.theme==='rodya')frozen=true;
 return {aura,dim,frozen,lift:e.key==='rudolph'&&e.castSlot==='r'&&e.channelUntil>g.time?.16+.04*Math.sin(g.time*5):0};
}
export class ChampionVFX {
 constructor(vfx){this.vfx=vfx;this.previous=new WeakMap();this.effects=[];this.seen=new WeakSet();this.cache=new Map();this.pulse=new WeakMap();}
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
   if(f.type==='impact'&&e.key==='marton'&&g.buff(e,'martonDrain'))this.event('molecules',e,g,{x:f.x,y:f.y,life:.5});
   if(f.type==='guboBlast')this.event('barrage',e,g,{x:f.x,y:f.y,r:f.r,angle:f.angle,spread:f.spread,life:.6});
   if(f.type==='ryoshuStorm')this.event('fireSwirl',e,g,{r:f.r,life:.7});
   if(f.type==='burst'&&e.key==='dongbaek')this.event('petalExplosions',e,g,{x:f.x,y:f.y,r:f.r,life:.65});
   if(f.type==='burst'&&e.key==='sinclair')this.event('branchSlash',e,g,{x:f.x,y:f.y,r:f.r,healthy:e.visualCast?.healthy,life:.55});
   if(f.type==='soraClaw')this.event('claws',e,g,{x:f.x,y:f.y,r:f.r,shape:f.shape||{kind:'circle',range:f.r},angle:f.angle||0,life:f.maxLife});
   if(f.type==='yanCleave')this.event('yanSlam',e,g,{x:f.x,y:f.y,r:Math.hypot(f.to.x-f.x,f.to.y-f.y),angle:Math.atan2(f.to.y-f.y,f.to.x-f.x),width:f.width,life:.35});
   if(f.type==='slash'&&e.key==='outis'&&f.slot==='r')this.event('shotgun',e,g,{x:f.x,y:f.y,r:f.r,angle:f.angle,spread:f.spread,life:.45});
  }
 }
 texture(form,color,variant=0){return this.vfx.sprite(form,color,3,{accent:color,dark:color},variant);}
 mote(c,form,color,x,y,size,angle=0,alpha=.7,variant=0){c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);c.drawImage(this.texture(form,color,variant),-size,-size,size*2,size*2);c.restore();}
 aura(c,a,time){
  for(let i=0;i<3;i++){const x=Math.sin(time*.8+i*2)*.3,y=-.8+Math.cos(time+i)*.2;c.save();c.scale(1,1.55);this.mote(c,a.form==='bolt'?'smoke':a.form,a.color,x,y,1.05+i*.08,time*.15+i,a.strength/2,i);c.restore();}
 }
 motes(c,form,color,time,count=8,radius=1,alpha=.5){
  for(let i=0;i<count;i++){const a=i*2.4+time*.5,r=radius*(.55+noise(i,time*.2,3)*.45),y=-.9+Math.sin(a)*radius*.6;this.mote(c,form,color,Math.cos(a)*r,y,.1+noise(i,time*.4,6)*.1,a,alpha,i%4);}
 }
 formulas(c,time,radius=1.4,alpha=.35){
  c.save();c.font='.2px monospace';c.textAlign='center';c.fillStyle='#eef0ed';
  for(let i=0;i<6;i++){const phase=(time*.45+i*.17)%1;c.globalAlpha=alpha*Math.sin(phase*Math.PI);c.fillText(FORMULAS[i],Math.sin(i*9)*radius,-phase*2.7-.2);}
  c.restore();
 }
 fairy(c,time,size=1){
  c.save();c.scale(size,size);for(const side of [-1,1]){c.save();c.translate(side*.18,-.12);c.rotate(side*(.5+Math.sin(time*17)*.15));c.scale(.8,1.7);this.mote(c,'petal','#a7e4d7',0,0,.3,0,.7,1);c.restore();}
  this.mote(c,'glow','#7ccdbf',0,0,.5,0,.12);this.mote(c,'drop','#c0e7d9',0,0,.13,0,.9);c.restore();
 }
 body(c,camera,e,g,front=false){
  const p=camera.worldToScreen(renderAnchor(e),.075),scale=camera.scale,presentation=championPresentation(g,e),time=g.time,s=e.state||{};
  c.save();c.translate(p.x,p.y-(leapLift(e)+presentation.lift)*scale);c.scale(scale,scale);
  if(!front){
   if(e.kind==='summon'&&e.key==='yanHand')this.aura(c,{color:'#14151b',form:'mist',strength:.14},time);
   if(presentation.aura)this.aura(c,presentation.aura,time);
   if(g.buff(e,'chainArmor')){c.save();c.globalAlpha=.035;const light=c.createLinearGradient(0,-7,0,0);light.addColorStop(0,'#e9ece100');light.addColorStop(1,'#e9ece1');c.fillStyle=light;for(let i=0;i<4;i++)c.fillRect((i-1.5)*.4,-7,.23,7);c.restore();}
   if(e.visuals?.hongluShare?.until>time){this.aura(c,{color:'#5caba4',form:'mist',strength:.055},time);this.motes(c,'petal','#d3aeb8',time,6,1,.4);}
   if(e.burn?.until>time||e.key==='alisa'&&(s.heat||0)>0)this.motes(c,'flame','#cf8a4a',time*2,6,.65,.5);
   if(e.key==='alisa'&&s.detonatesAt>time)for(const side of [-1,1])for(let i=0;i<7;i++){const a=i/7*Math.PI*1.1-.6,x=side*(.5+Math.sin(a)*.75),y=-1.25-Math.cos(a)*.8;c.save();c.scale(1,1.3);this.mote(c,'flame','#9e3036',x,y,.38,a*side,.45,i%4);c.restore();}
   if(e.key==='faust'&&g.buff(e,'faustUlt'))this.formulas(c,time);
   if(e.key==='ryoshu'&&time-e.lastCombat>=2){c.save();c.translate(0,-1.7);this.mote(c,'smoke','#d4d2cf',.12,-.08,.3+Math.sin(time)*.025,0,.1,Math.floor(time)%4);c.restore();}
   if(e.key==='hohenheim'&&(s.hohenCharge||s.posthumous)){const progress=s.posthumous?1:Math.min(1,s.hohenCharge.progress/1.5),stage=Math.min(3,1+Math.floor((progress+1e-8)/.3));this.electric(c,time,'#8dc8c6',stage*.3,stage*3);}
   if(e.key==='myo'&&g.buff(e,'rabbitFrenzy'))this.electric(c,time,'#d79954',.7,8);
   if(e.key==='rudolph'&&e.castSlot==='r'&&e.channelUntil>time)this.electric(c,time,'#d2944e',1,12);
   if(e.key==='dongbaek')this.motes(c,'petal','#dbc875',time,5,1,.35);
   if(e.key==='yi'&&g.buff(e,'ogamdo'))for(const side of [-1,1])for(let i=0;i<6;i++)this.mote(c,'crystal','#dce7e8',side*(.55+i*.15),-1-i*.18+Math.sin(time)*.04,.19+i*.025,side*(.4+i*.15),.6,i%4);
   if(e.key==='marton'&&s.fairy){c.save();c.translate(0,-3.1);this.fairy(c,time,.65);c.restore();}
  }else{
   if(s.swordHeldBy)this.motes(c,'spark','#e4dfd5',time*8,7,.3,.8);
   if(e.rodyaSlowUntil>time)this.motes(c,'frost','#d3d8dc',time,4,.7,.22);
   if(s.harpoon?.until>time)this.mote(c,'glow','#c97148',.08,-1,.15+Math.sin(time*7)*.035,0,.5);
   if(s.counter)this.aura(c,{color:'#233a5d',form:'smoke',strength:.07},time);
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
  c.save();c.strokeStyle=color;c.lineWidth=.022;c.globalAlpha=.4*strength;
  for(let i=0;i<count;i++){const a=i*2.4+time*.8,x=Math.cos(a)*.5,y=-.8+Math.sin(a)*.8;c.beginPath();c.moveTo(x,y);for(let j=1;j<5;j++)c.lineTo(x+(noise(i+j,time*13,5)-.5)*.24,y-j*.075);c.stroke();}c.restore();
 }
 coins(c,e,g){
  const age=g.time-e.state.coinAt;for(const [i,head] of (e.state.coinResults||[]).entries()){
   const x=(i-1)*.6,y=-3.1-Math.sin(Math.min(1,age/.9)*Math.PI)*.6,flip=age<.9?Math.max(.12,Math.abs(Math.cos(age*17+i))):1;
   c.save();c.translate(x,y);c.scale(flip,1);const grad=c.createLinearGradient(-.2,-.2,.2,.2);grad.addColorStop(0,head?'#e5d29b':'#a1a5a4');grad.addColorStop(.5,head?'#8b713b':'#4b5257');grad.addColorStop(1,head?'#d5bb7d':'#909895');c.fillStyle=grad;c.beginPath();c.ellipse(0,0,.21,.24,0,0,Math.PI*2);c.fill();c.strokeStyle='#e6dfca';c.lineWidth=.025;c.stroke();c.restore();
  }
 }
 localEvent(c,f,e,g){
  const age=g.time-f.at,t=age/f.life,fade=Math.sin(Math.PI*t),owner=e||f;
  if(f.type==='spotlight'){
   c.save();c.globalAlpha=.1*(1-t);const light=c.createLinearGradient(0,-9,0,0);light.addColorStop(0,'#e2c16c00');light.addColorStop(1,'#e2c16c');c.fillStyle=light;c.beginPath();c.moveTo(-.4,-9);c.lineTo(.4,-9);c.lineTo(1.2,.3);c.lineTo(-1.2,.3);c.closePath();c.fill();c.restore();
   for(let i=0;i<24;i++){const a=i*2.4,x=Math.cos(a)*age*2.2,y=-1.1-age*3+age*age*3+Math.sin(a)*.5;this.mote(c,'petal',['#d8b565','#a55b64','#709caa','#9caf6b'][i%4],x,y,.075,age*4+i,.75*(1-t),i%4);}
  }else if(f.type==='arrival'){this.motes(c,'smoke','#17191e',age,7,1,.25*(1-t));this.motes(c,'feather','#101217',age*2,11,1.5,.65*(1-t));
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
   if(f.type==='fallenSword'){this.fallingSword(c,camera,f,0,1-(g.time-f.at)/f.life);continue;}
   if(['cracks','roots','formulaField','petalField','barrage','petalExplosions','molecules','branchSlash','claws','yanSlam','shotgun','chainStrike'].includes(f.type))continue;
   if(f.type==='fireSwirl')continue;
   const e=g.units.find(e=>e.id===f.owner),at=camera.worldToScreen(e||f,.075);c.save();c.translate(at.x,at.y-leapLift(e||{})*camera.scale);c.scale(camera.scale,camera.scale);this.localEvent(c,f,e,g);c.restore();
  }
  for(const f of g.effects)if(f.type==='yanSwordWarning'){
   const progress=clamp(1-f.life/f.maxLife);if(progress>.72)this.fallingSword(c,camera,f,(1-progress)/.28*13,.85);
  }
  c.restore();
 }
 ground(c,camera,g){
  const world=(p,h=0)=>camera.worldToScreen(p,h),sprite=(form,color,p,h,size,alpha=.5,angle=0)=>{const at=world(p,h);this.mote(c,form,color,at.x,at.y,size*camera.scale,angle,alpha);};
  for(const z of g.zones){
   const time=g.time,kind=z.kind||'mirror',r=z.r;let color=kind==='waterfall'?'#70aaa5':kind==='ice'?'#d1dbe3':kind==='desireTree'?(z.golden?'#c9a958':'#785838'):kind==='electricBloom'?'#8abcb9':'#d8e1e5';
   c.save();const at=world(z,.08),x=world({x:z.x+1,y:z.y},.08),y=world({x:z.x,y:z.y+1},.08);c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();
   const grad=c.createRadialGradient(0,0,0,0,0,r);grad.addColorStop(0,color+'10');grad.addColorStop(.8,color+'0d');grad.addColorStop(1,color+'00');c.fillStyle=grad;c.fillRect(-r,-r,r*2,r*2);
   if(kind==='waterfall')for(let j=0;j<7;j++){c.beginPath();for(let i=0;i<=24;i++){const x=-r+i*r/12,y=(j-3)*r*.25+Math.sin(x*2+time*2+j)*.12;i?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=color+'3d';c.lineWidth=.035;c.stroke();}
   c.restore();
   for(let i=0;i<(kind==='desireTree'?0:18);i++){const a=i*2.4+time*.13,rad=r*Math.sqrt(noise(i,Math.floor(time*.1),3)),p={x:z.x+Math.cos(a)*rad,y:z.y+Math.sin(a)*rad};sprite(kind==='waterfall'?'mist':kind==='ice'?'frost':kind==='electricBloom'?'spark':'crystal',color,p,.08,.08+(i%3)*.04,.2,a);if(kind==='ice'&&i%4===0)this.snowflake(c,world(p,.12),camera.scale*.08,.2);}
   if(kind==='desireTree')this.tree(c,camera,z,g);
  }
  for(const f of g.effects)if(f.type==='yanSwordWarning'){
   const progress=clamp(1-f.life/f.maxLife);this.field(c,camera,f,f.r,'#20232d',.04+progress*.06);
   for(let i=0;i<12;i++){const a=i*Math.PI/6,p={x:f.x+Math.cos(a)*f.r*(1-progress*.05),y:f.y+Math.sin(a)*f.r*(1-progress*.05)};sprite('spark','#64717d',p,.1,.06,.25);}
  }
  for(const h of g.units.filter(e=>e.alive&&e.key==='yanHand')){
   this.field(c,camera,h,3.5,'#101219',.18);
   for(let i=0;i<9;i++){const a=i*2.4+g.time*.18,r=3.1*Math.sqrt(noise(i,1,3)),p={x:h.x+Math.cos(a)*r,y:h.y+Math.sin(a)*r};sprite('mist','#14151c',p,.12,.55,.08,a);}
  }
  for(const f of this.effects){
   const age=g.time-f.at,t=age/f.life,fade=1-t,e=g.units.find(e=>e.id===f.owner)||f;
   if(f.type==='cracks')this.cracks(c,camera,f,f.r||2,fade);
   if(f.type==='chainStrike')for(let i=0;i<7;i++){const a=f.angle+(i/6-.5)*f.spread*.94,len=f.r*(1-Math.exp(-age*18));for(let j=0;j<Math.floor(len/.3);j++){const p=world({x:f.x+Math.cos(a)*j*.3,y:f.y+Math.sin(a)*j*.3},.18);c.save();c.translate(p.x,p.y);c.rotate(a);c.globalAlpha=fade*.5;c.strokeStyle=j%2?'#d5d8d9':'#78818b';c.lineWidth=camera.scale*.023;c.beginPath();c.ellipse(0,0,camera.scale*.15,camera.scale*.06,j%2*.7,0,Math.PI*2);c.stroke();c.restore();}}
   if(f.type==='roots')for(let i=0;i<7;i++){const a=i*2.4,p={x:f.x+Math.cos(a)*(f.r||2)*.7,y:f.y+Math.sin(a)*(f.r||2)*.7};this.root(c,camera,p,Math.sin(Math.PI*t)*1.8,fade);}
   if(f.type==='petalField'||f.type==='petalExplosions')for(let i=0;i<24;i++){const a=i*2.4,rad=(f.r||3)*Math.sqrt(noise(i,f.at,4)),p={x:f.x+Math.cos(a)*rad,y:f.y+Math.sin(a)*rad};sprite('petal',f.type==='petalField'?'#b35765':'#e0c56b',p,.15+Math.sin(age*4+i)*.2,.14,fade*.55,a+age);}
   if(f.type==='formulaField'){this.field(c,camera,f,f.r,'#e9eae7',fade*.07);const at=world(f,.12);c.save();c.translate(at.x,at.y);c.scale(camera.scale,camera.scale);this.formulas(c,age,f.r*.65,.5*fade);c.restore();}
   if(f.type==='fireSwirl')for(let wave=0;wave<4;wave++){const phase=clamp((age-wave*.12)/.2);if(!phase||phase>=1)continue;for(let i=0;i<9;i++){const a=i*2.4+phase*3,p={x:e.x+Math.cos(a)*f.r*.7,y:e.y+Math.sin(a)*f.r*.7};sprite('flame','#ad513b',p,.25,.4,fade*.4,a);this.smallSlash(c,camera,p,.65,a,'#9c3a3b',fade*.55);}}
   if(f.type==='barrage')for(let i=0;i<24;i++){const a=f.angle+(noise(i,f.at,3)-.5)*f.spread,rad=Math.sqrt(noise(i,f.at,9))*f.r,p={x:f.x+Math.cos(a)*rad,y:f.y+Math.sin(a)*rad};this.smallImpact(c,camera,p,.3,a,'#88303e',fade*.45);}
   if(f.type==='molecules'){const from=world(f,1.1),to=world(e,1.15);for(let i=0;i<8;i++){const u=clamp(age/.5+i*.035),x=from.x+(to.x-from.x)*u,y=from.y+(to.y-from.y)*u-Math.sin(u*Math.PI)*camera.scale*.5;for(const [dx,dy] of [[0,0],[.1,.05],[-.08,.07]])this.mote(c,'glow','#74b7a6',x+dx*camera.scale,y+dy*camera.scale,camera.scale*.04,0,.65*fade);}}
   if(f.type==='branchSlash')for(let i=0;i<(f.healthy?6:3);i++){const a=i*2.4,p={x:f.x+Math.cos(a)*f.r*.5,y:f.y+Math.sin(a)*f.r*.5},color=f.healthy?(i%3===0?'#a85f65':'#a9c978'):'#71884d';this.smallSlash(c,camera,p,f.r*.45,a+age*4,color,fade*.55);}
   if(f.type==='claws'){
    c.save();clipShape(c,camera,{...f,shape:f.shape});
    for(let i=0;i<11;i++){const a=i*2.4+Math.floor(age*25)*.3;let x=Math.cos(a)*(f.r||2)*.65,y=Math.sin(a)*(f.r||2)*.65;
     if(f.shape.kind==='rect'){const u=noise(i,f.at,4),side=(noise(i,f.at,8)-.5)*f.shape.width*.8;x=Math.cos(f.angle)*f.shape.range*u-Math.sin(f.angle)*side;y=Math.sin(f.angle)*f.shape.range*u+Math.cos(f.angle)*side;}
     this.smallSlash(c,camera,{x:f.x+x,y:f.y+y},.45+noise(i,f.at,3)*.4,a,'#101218',fade*.85);
    }c.restore();
   }
   if(f.type==='yanSlam'){c.save();clipShape(c,camera,{...f,shape:{kind:'rect',range:f.r,width:f.width,angle:f.angle}});for(let i=0;i<4;i++){const distance=f.r*(i+.5)/4,p={x:f.x+Math.cos(f.angle)*distance,y:f.y+Math.sin(f.angle)*distance};this.smallImpact(c,camera,p,f.width*.7,f.angle,'#81abcf',fade*.5);}c.restore();}
   if(f.type==='shotgun'){c.save();clipShape(c,camera,{...f,shape:{kind:'cone',range:f.r,angle:f.angle,spread:f.spread}});for(let i=0;i<13;i++){const a=f.angle+((i/12)-.5)*f.spread,travel=f.r*(1-Math.exp(-age*17)),p={x:f.x+Math.cos(a)*travel,y:f.y+Math.sin(a)*travel};sprite('flame',i%3?'#b4764b':'#435340',p,.25,.2,fade*.7,a);this.smallSlash(c,camera,p,.25,a,'#b47a50',fade*.4);}c.restore();}
   if(f.type==='petalExplosions')for(let i=0;i<9;i++){const delay=noise(i,f.at,9)*.35,phase=age-delay;if(phase<0||phase>.25)continue;const a=i*2.4,rad=f.r*Math.sqrt(noise(i,f.at,4))*.8,p={x:f.x+Math.cos(a)*rad,y:f.y+Math.sin(a)*rad};this.smallImpact(c,camera,p,.3+phase,a,'#e6d88a',(1-phase/.25)*.55);}
  }
  for(const e of g.champions().filter(e=>e.alive)){
   if(g.buff(e,'mutant'))for(let i=0;i<36;i++){const a=i*2.4+g.time*.7,r=5.4*Math.sqrt(noise(i,1,3)),p=world({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r},.2+Math.sin(i+g.time*6)*.12);this.insect(c,p,camera.scale*.055,a,g.time);}
   if(g.buff(e,'heathUlt')){this.bags(c,camera,e,g);for(let i=0;i<7;i++){const tick=Math.floor(g.time*2),a=i*2.4+tick,r=6.9*Math.sqrt(noise(i,tick,5)),p={x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r};this.smallImpact(c,camera,p,.6,a,'#60415c',.45*(1-(g.time*2)%1));}}
   if(e.state.tether){const target=g.units.find(t=>t.id===e.state.tether.target&&t.alive);if(target)this.rope(c,camera,e,target);}
   if(e.state.swordGrab?.target?.alive)this.sword(c,camera,e,e.state.swordGrab.target);
   if(e.key==='marton'&&e.state.fairy)for(let i=0;i<24;i++){const a=i*2.4,u=(g.time*1.4+i*.13)%1,r=6.8*(1-u),p=camera.worldToScreen({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r},.25+u*.5);this.mote(c,'spark','#74bfae',p.x,p.y,camera.scale*.05,a,.4);}
   if(e.key==='honglu'&&g.time-(e.attackAt??-99)<.3)for(let i=0;i<3;i++){const a=(g.time-e.attackAt)*20+i*Math.PI*2/3,r=g.attackRange(e);this.smallSlash(c,camera,{x:e.x,y:e.y},r,a,'#73aaa6',.28);}
  }
 }
 smallSlash(c,camera,p,r,angle,color,alpha){this.stamp(c,camera,p,r,angle,color,alpha,'slash');}
 smallImpact(c,camera,p,r,angle,color,alpha){this.stamp(c,camera,p,r,angle,color,alpha,'impact');}
 stamp(c,camera,p,r,angle,color,alpha,kind){const at=camera.worldToScreen(p,.12),x=camera.worldToScreen({x:p.x+1,y:p.y},.12),y=camera.worldToScreen({x:p.x,y:p.y+1},.12);c.save();c.globalAlpha=alpha;c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);c.rotate(angle);c.drawImage(this.vfx.strokes.texture(kind,{x:p.x,y:p.y,born:0,color}),-r,-r,r*2,r*2);c.restore();}
 field(c,camera,p,r,color,alpha){const at=camera.worldToScreen(p,.06),x=camera.worldToScreen({x:p.x+1,y:p.y},.06),y=camera.worldToScreen({x:p.x,y:p.y+1},.06);c.save();c.translate(at.x,at.y);c.transform(x.x-at.x,x.y-at.y,y.x-at.x,y.y-at.y,0,0);const shade=c.createRadialGradient(0,0,0,0,0,r);shade.addColorStop(0,color);shade.addColorStop(1,color+'00');c.globalAlpha=alpha;c.fillStyle=shade;c.fillRect(-r,-r,r*2,r*2);c.restore();}
 fallingSword(c,camera,p,height,alpha){const tip=camera.worldToScreen(p,height+.1),top=camera.worldToScreen(p,height+8),w=camera.scale*.62;c.save();c.globalAlpha=alpha;const shade=c.createLinearGradient(tip.x-w,0,tip.x+w,0);shade.addColorStop(0,'#17202a');shade.addColorStop(.45,'#8b969a');shade.addColorStop(.52,'#e1e6e4');shade.addColorStop(1,'#34404a');c.fillStyle=shade;c.beginPath();c.moveTo(tip.x,tip.y);c.lineTo(top.x-w,top.y+camera.scale*.6);c.lineTo(top.x-w*.7,top.y);c.lineTo(top.x+w*.7,top.y);c.lineTo(top.x+w,top.y+camera.scale*.6);c.closePath();c.fill();c.fillStyle='#a5966e';c.fillRect(top.x-w*1.5,top.y,w*3,camera.scale*.16);c.fillStyle='#23272b';c.fillRect(top.x-w*.18,top.y-camera.scale*.8,w*.36,camera.scale*.85);c.restore();}
 cracks(c,camera,p,r,alpha){c.save();c.globalAlpha=alpha*.5;c.strokeStyle='#211f22';c.lineWidth=camera.scale*.035;for(let i=0;i<9;i++){const a=i*2.4;c.beginPath();for(let j=0;j<6;j++){const b=a+(noise(i,j,3)-.5)*.25,q=camera.worldToScreen({x:p.x+Math.cos(b)*r*j/6,y:p.y+Math.sin(b)*r*j/6},.07);j?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);}c.stroke();}c.restore();}
 root(c,camera,p,height,alpha){const base=camera.worldToScreen(p,.08),tip=camera.worldToScreen({x:p.x+.2,y:p.y},height);c.save();c.globalAlpha=alpha;const grad=c.createLinearGradient(base.x,base.y,tip.x,tip.y);grad.addColorStop(0,'#302218');grad.addColorStop(.65,'#71533b');grad.addColorStop(1,'#b69b6c');c.fillStyle=grad;c.beginPath();c.moveTo(base.x-camera.scale*.22,base.y);c.bezierCurveTo(base.x,tip.y+camera.scale*.35,tip.x,tip.y,tip.x,tip.y);c.quadraticCurveTo(base.x+camera.scale*.35,base.y,base.x+camera.scale*.22,base.y);c.closePath();c.fill();c.restore();}
 tree(c,camera,z,g){for(let i=0;i<5;i++){const a=i*2.4,p={x:z.x+Math.cos(a)*.3,y:z.y+Math.sin(a)*.3};this.root(c,camera,p,1.3+i*.15,1);}if(z.golden)for(let i=0;i<12;i++){const a=i*2.4,p=camera.worldToScreen({x:z.x+Math.cos(a)*.7,y:z.y+Math.sin(a)*.4},.8+Math.sin(g.time*3+i)*.5);this.mote(c,'spark','#cfb25e',p.x,p.y,camera.scale*.06,a,.5);}}
 snowflake(c,p,size,alpha){c.save();c.globalAlpha=alpha;c.strokeStyle='#e5edf1';c.lineWidth=.6;for(let i=0;i<3;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(p.x-Math.cos(a)*size,p.y-Math.sin(a)*size);c.lineTo(p.x+Math.cos(a)*size,p.y+Math.sin(a)*size);c.stroke();}c.restore();}
 insect(c,p,size,a,time){c.save();c.translate(p.x,p.y);c.rotate(a);c.fillStyle='#76583e';c.beginPath();c.ellipse(0,0,size*.7,size,0,0,Math.PI*2);c.fill();c.strokeStyle='#aa8a65';c.lineWidth=.6;for(const side of [-1,1]){c.beginPath();c.ellipse(side*size*.65,0,size*.7,size*.3,Math.sin(time*30)*.7,0,Math.PI*2);c.stroke();}c.restore();}
 bags(c,camera,e,g){for(let i=0;i<3;i++){const a=g.time*9+i*2.1,p=camera.worldToScreen({x:e.x+Math.cos(a)*1.8,y:e.y+Math.sin(a)*1.8},.9),size=camera.scale;c.save();c.translate(p.x,p.y);c.rotate(a);c.fillStyle='#655040';c.beginPath();c.moveTo(-size*.55,-size*.2);c.bezierCurveTo(size*.5,-size*.7,size*.7,size*.65,-size*.5,size*.3);c.closePath();c.fill();c.fillStyle='#6a292c';for(let j=0;j<4;j++){c.beginPath();c.ellipse(j*.1*size,Math.sin(j)*.1*size,.12*size,.06*size,j,0,Math.PI*2);c.fill();}c.restore();}}
 rope(c,camera,a,b){const from=camera.worldToScreen(a,1),to=camera.worldToScreen(b,1),dx=to.x-from.x,dy=to.y-from.y,n=Math.hypot(dx,dy)||1;c.save();for(const side of [-1,1]){c.strokeStyle=side<0?'#765834':'#b49669';c.lineWidth=1.6;c.beginPath();for(let i=0;i<=32;i++){const u=i/32,w=Math.sin(i*1.9)*side*.8,x=from.x+dx*u-dy/n*w,y=from.y+dy*u+dx/n*w+Math.sin(u*Math.PI)*6;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}c.restore();}
 sword(c,camera,e,t){const a=camera.worldToScreen(e,1),b=camera.worldToScreen(t,1.15),dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy);c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(dy,dx));const grad=c.createLinearGradient(0,-3,0,3);grad.addColorStop(0,'#dce9ed');grad.addColorStop(.5,'#6e859b');grad.addColorStop(1,'#edf6fa');c.fillStyle=grad;c.beginPath();c.moveTo(0,-2);c.lineTo(n+10,0);c.lineTo(0,2);c.fill();c.restore();}
}
