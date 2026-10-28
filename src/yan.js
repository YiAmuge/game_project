import{championDescription}from'./champion-reference.js';
import { settleBody } from './collision.js';
import { RULES, WORLD, FOUNTAIN_AREAS } from './data.js';
import { clamp,distance,direction } from './geometry.js';

// Unspecified tuning is documented in the codex: Q 9s, R radius 7.5, distorted Q 360 damage.
export const YAN={maxPower:6,markDuration:3,reapply:3,weak:.15,markHeal:200,distortedHeal:.5,duration:20,radius:7.5,chargeTime:1.5,basicRange:3,fullRange:7,width:1.8,basicDamage:50,fullDamage:200,chargeArmor:.065,qSpeed:.12,qRange:5,qDuration:1.8,qEvery:.3,qDamage:30,distortedQRange:9,distortedQRadius:7.5,distortedQDamage:360,distortedQDelay:1.75,distortedQInner:3,distortedQBonus:75,distortedQStun:.85,handDamage:55,handEvery:.5,handRadius:3.5,handLeash:10,handSpeed:18,lockDuration:1};
export const distorted=(g,e)=>e.key==='yan'&&g.buff(e,'yanDistorted');
export const barraging=(g,e)=>e.key==='yan'&&e.state?.yanBarrage?.until>g.time;
export const ready=(g,e)=>e.key==='yan'&&!distorted(g,e)&&(e.state.ominous||0)>=YAN.maxPower;
export const form=(g,e)=>distorted(g,e)?'yanDistorted':e.key;
export const reloadRate=(g,e)=>(RULES.reload[2]/RULES.reloadEfficiency)/g.reloadInterval(e);
export const ammoBonus=(g,e)=>1+.1*g.ammoCap(e);
export function init(g,e){if(e.key==='yan'){e.state.ominous=0;e.state.falseOrders={};e.state.orderLocks={};}}
export function marked(g,e,t){return e.key==='yan'&&e.state.falseOrders?.[t.id]?.until>g.time;}
export function orders(g,e){
 const marks=e.state.falseOrders??={};for(const [id,m] of Object.entries(marks)){const t=g.units.find(u=>u.id===m.target);if(m.until<=g.time||!t?.alive||t.returning)delete marks[id];}return Object.values(marks);
}
export function mark(g,e,t,{ultimate=false}={}){
 if(!g.hostile(e,t)||t.kind==='summon'||t.returning||g.debuffImmune?.(t))return false;
 if(!ultimate&&(marked(g,e,t)||(e.state.orderLocks?.[t.id]||0)>g.time))return false;
 g.triggerDisrupt(e,t);e.state.falseOrders??={};e.state.orderLocks??={};e.state.falseOrders[t.id]={target:t.id,until:g.time+(ultimate?6:YAN.markDuration)};
 e.state.orderLocks[t.id]=g.time+YAN.reapply;return true;
}
export function afterDamage(g,source,t,actual,proc,absorbed=0){
 if(!proc&&source.key==='yan'||source.kind!=='champion'||!source.alive||actual+absorbed<=0||source.team===t.team)return;
 // Consume existing marks before placing a new mark, so the applying hit cannot consume itself.
 for(const owner of g.champions(source.team).filter(e=>e.key==='yan'&&e.alive&&marked(g,e,t))){
  delete owner.state.falseOrders[t.id];owner.state.orderLocks[t.id]=g.time+YAN.reapply;
  g.heal(owner,source,YAN.markHeal*(distorted(g,source)?YAN.distortedHeal:1),false);
  if(!distorted(g,owner)){owner.state.ominous=Math.min(YAN.maxPower,(owner.state.ominous||0)+1);if(ready(g,owner))owner.rCd=0;}
  // A lethal allied hit must retain its kill credit; no on-status proc is needed on a dead target.
  if(t.hp>0)g.status(t,'weak',YAN.weak,3,owner);
 }
 if(source.key==='yan')mark(g,source,t);
}
export function cancelCharge(e){if(e.key==='yan')delete e.state.yanCharge;}
export function chargeShape(g,e,p){
 const progress=clamp((e.state.yanCharge?.progress||0)/YAN.chargeTime,0,1),d=g.aim(e,p),extraRange=g.attackRange(e)-YAN.basicRange;
 return {progress,d,range:YAN.basicRange+(YAN.fullRange-YAN.basicRange)*progress+extraRange,width:YAN.width,damage:(YAN.basicDamage+(YAN.fullDamage-YAN.basicDamage)*progress)*ammoBonus(g,e)};
}
export function attack(g,e,p){
 g.cancelRecall(e);e.lastAttackAt=g.time;e.facing=Math.atan2(p.y-e.y,p.x-e.x);
 if(distorted(g,e)){command(g,e,p);e.attackCd=.15;return true;}
 if(e.state.yanCharge){e.state.yanCharge.aim={...p};return false;}
 e.state.yanCharge={progress:0,startedAt:g.time,aim:{...p}};if(e.state.yanInstantUntil>g.time){delete e.state.yanInstantUntil;e.state.yanCharge.progress=YAN.chargeTime;return release(g,e,p);}return true;
}
export function release(g,e,p){
 if(e.key!=='yan'||!e.state.yanCharge)return false;
 if(!e.alive||distorted(g,e)||g.stat(e,'stun')||g.stat(e,'disarm')||g.hidden(e)||e.motion||e.recall){cancelCharge(e);return false;}
 const shape=chargeShape(g,e,p||e.state.yanCharge.aim),elapsed=Math.max(0,g.time-e.state.yanCharge.startedAt);cancelCharge(e);
 g.emitSound?.('swing',e);e.attackCd=Math.max(g.attackInterval(e),.85-elapsed);e.lastAttackAt=g.time;e.attackAt=g.time;e.attackSerial=(e.attackSerial||0)+1;e.facing=e.attackFacing=Math.atan2(shape.d.y,shape.d.x);e.revealedUntil=g.time+1.25;
 g.action(e,'basic',()=>{
  for(const t of [...g.units])if(g.hostile(e,t)&&g.clearLine(e,t)){
   const dx=t.x-e.x,dy=t.y-e.y,along=dx*shape.d.x+dy*shape.d.y,side=Math.abs(dy*shape.d.x-dx*shape.d.y);
   if(Math.hypot(Math.max(0,-along,along-shape.range),Math.max(0,side-shape.width/2))<=t.radius)g.deal(e,t,shape.damage);
  }
 });
 g.effects.push({source:e.id,theme:'yan',type:'yanCleave',x:e.x,y:e.y,to:{x:e.x+shape.d.x*shape.range,y:e.y+shape.d.y*shape.range},width:shape.width,progress:shape.progress,life:.4,maxLife:.4});return true;
}
function enemyWell(g,e,p,r=.25){return !g.training&&FOUNTAIN_AREAS.find(z=>z.team!==e.team&&p.x+r>=z.x&&p.x-r<=z.x+z.w&&p.y+r>=z.y&&p.y-r<=z.y+z.h);}
function handFits(g,e,p,{leash=true}={}){return (!leash||distance(e,p)<=YAN.handLeash)&&!enemyWell(g,e,p)&&!g.blocked(p.x,p.y,.25)&&!g.units.some(t=>t.alive&&['tower','core'].includes(t.kind)&&distance(t,p)<t.radius+.25);}
function wellExit(g,e,p,{leash=true}={}){
 const z=enemyWell(g,e,p);if(!z)return;
 const margin=.26,candidates=[];
 for(let n=0;n<=Math.ceil(z.w/.1);n++){const x=z.x+Math.min(z.w,n*.1);candidates.push({x,y:z.y-margin},{x,y:z.y+z.h+margin});}
 for(let n=0;n<=Math.ceil(z.h/.1);n++){const y=z.y+Math.min(z.h,n*.1);candidates.push({x:z.x-margin,y},{x:z.x+z.w+margin,y});}
 return candidates.filter(q=>handFits(g,e,q,{leash})).sort((a,b)=>distance(p,a)-distance(p,b))[0];
}
export function ejectHand(g,h){
 if(h.key!=='yanHand'||!enemyWell(g,h,h,h.radius))return false;
 const e=g.units.find(u=>u.id===h.owner)||h,p=wellExit(g,e,h,{leash:false});if(!p)return false;
 Object.assign(h,p);h.path=[];delete h.pathGoal;delete h.targetId;h.goal={...p};h.attached=false;h.fountainTick=0;return true;
}
function safeHandPoint(g,e,point){
 const b=g.bounds||WORLD,d=direction(e,point),len=Math.min(YAN.handLeash-.05,distance(e,point)),p={x:clamp(e.x+d.x*len,b.x+.3,b.x+b.w-.3),y:clamp(e.y+d.y*len,b.y+.3,b.y+b.h-.3)};
 const fits=p=>handFits(g,e,p);
 if(fits(p))return p;
 const exit=wellExit(g,e,p);if(exit)return exit;
 for(let r=.3;r<=3;r+=.3)for(let i=0;i<16;i++){const a=i*Math.PI/8,q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};if(fits(q))return q;}
 return {x:e.x,y:e.y};
}
export function hand(g,e){return g.units.find(t=>t.kind==='summon'&&t.owner===e.id&&t.alive);}
export function command(g,e,p){
 const h=hand(g,e);if(!h)return false;
 if(distance(e,p)<=e.radius+.35){h.attached=true;delete h.targetId;delete h.goal;return true;}
 h.attached=false;h.goal=safeHandPoint(g,e,p);delete h.targetId;
 const target=g.units.filter(t=>g.hostile(e,t)&&!enemyWell(g,e,t,0)&&g.visibleTo(e.team,t)&&distance(t,p)<=t.radius+.65&&distance(e,t)<=YAN.handLeash+t.radius).sort((a,b)=>distance(a,p)-distance(b,p))[0];
 if(target)h.targetId=target.id;return true;
}
function transform(g,e){
 cancelCharge(e);delete e.state.yanBarrage;const ratio=e.hp/e.maxHp;e.state.ominous=0;e.state.yanActive=true;e.rCd=0;e.qCd=0;
 g.addBuff(e,'yanDistorted',YAN.duration,{copy:false});e.maxHp=g.maxHp(e);e.hp=e.maxHp*ratio;e.radius=.48*1.1;settleBody(g,e);
 const d={x:Math.cos(e.facing||0),y:Math.sin(e.facing||0)},p=safeHandPoint(g,e,{x:e.x+d.x*1.6,y:e.y+d.y*1.6});
 g.entity({kind:'summon',key:'yanHand',name:'뒤틀린 전령의 손',team:e.team,owner:e.id,...p,maxHp:1,radius:.25,invulnerableUntil:Infinity,ccImmuneUntil:Infinity,attached:true,nextStrike:g.time+YAN.handEvery});
 g.effects.push({type:'burst',x:e.x,y:e.y,r:3,theme:'yan',life:.7,maxLife:.7});
}
export function removeHand(g,e){for(const h of g.units.filter(t=>t.kind==='summon'&&t.owner===e.id))h.alive=false;}
function endTransform(g,e){const ratio=e.hp/e.maxHp;delete e.buffs.yanDistorted;delete e.state.yanActive;removeHand(g,e);e.maxHp=g.maxHp(e);e.hp=Math.min(e.maxHp,e.maxHp*ratio);e.radius=.48;e.qCd=e.rCd=0;}
export function validate(g,e,slot){return e.key!=='yan'||(slot!=='r'||!distorted(g,e));}
export function cast(g,e,slot,p){
 if(e.key!=='yan')return false;cancelCharge(e);
 if(slot==='r'){
  if(ready(g,e))transform(g,e);
  else{for(const m of orders(g,e))m.until=g.time+6;for(const t of g.champions(1-e.team).filter(t=>g.hostile(e,t)&&distance(e,t)<=YAN.radius+t.radius&&g.visibleTo(e.team,t)&&g.clearLine(e,t)))mark(g,e,t,{ultimate:true});}
 }else if(distorted(g,e)){
  const point={...p};g.effects.push({source:e.id,theme:'yan',slot:'q',type:'yanSwordWarning',...point,r:YAN.distortedQRadius,life:YAN.distortedQDelay,maxLife:YAN.distortedQDelay});
  g.schedule(e,YAN.distortedQDelay,()=>{
   for(const t of [...g.units])if(g.hostile(e,t)&&distance(point,t)<=YAN.distortedQRadius+t.radius&&g.clearLine(point,t)){const inner=distance(point,t)<=YAN.distortedQInner+t.radius;g.deal(e,t,YAN.distortedQDamage+(inner?YAN.distortedQBonus:0));g.status(t,'slow',.8,1.5,e);if(inner)g.status(t,'stun',1,YAN.distortedQStun,e);}
   g.effects.push({source:e.id,theme:'yan',type:'yanGreatsword',...point,r:YAN.distortedQRadius,life:.7,maxLife:.7});
  });
 }else{
  e.state.yanBarrage={until:g.time+YAN.qDuration,next:g.time,ticks:0,hits:{},d:g.aim(e,p)};
 }
 return true;
}
export function tickHand(g,h,dt){
 const e=g.units.find(u=>u.id===h.owner);if(!e?.alive||!distorted(g,e)){h.alive=false;return;}
 ejectHand(g,h);
 const d={x:Math.cos(e.facing||0),y:Math.sin(e.facing||0)},target=g.units.find(t=>t.id===h.targetId&&g.hostile(e,t)&&!enemyWell(g,e,t,0)&&g.visibleTo(e.team,t));
 if(h.targetId&&!target)delete h.targetId;
 let desired=h.attached?{x:e.x+d.x*1.6,y:e.y+d.y*1.6}:target||h.goal||h;
 desired=safeHandPoint(g,e,desired);if(distance(h,e)>YAN.handLeash){Object.assign(h,safeHandPoint(g,e,h));h.path=[];}
 let goal=desired;
 if(!g.clearLine(h,desired,h.radius)){
  if(!h.path?.length||g.time>=(h.pathAt||0)||distance(h.pathGoal||desired,desired)>1){h.path=g.findPath(h,desired,h.radius);h.pathAt=g.time+.4;h.pathGoal={...desired};}
  while(h.path?.length&&distance(h,h.path[0])<.3)h.path.shift();goal=h.path?.[0]||safeHandPoint(g,e,{x:e.x+d.x*1.6,y:e.y+d.y*1.6});
 }
 const move=direction(h,goal),step=Math.min(distance(h,goal),YAN.handSpeed*dt),next={x:h.x+move.x*step,y:h.y+move.y*step};
 if(distance(e,next)<=YAN.handLeash&&!enemyWell(g,e,next,h.radius)&&g.clearLine(h,next,h.radius))Object.assign(h,next);
 if(g.blocked(h.x,h.y,h.radius)||distance(h,e)>YAN.handLeash)Object.assign(h,safeHandPoint(g,e,desired));
 h.facing=target?Math.atan2(target.y-h.y,target.x-h.x):e.facing||0;
 if(g.time+1e-8>=h.nextStrike){
  h.nextStrike=g.time+YAN.handEvery/reloadRate(g,e);h.struckAt=g.time;
  g.action(e,'skill',()=>{for(const t of [...g.units])if(g.hostile(e,t)&&distance(h,t)<=YAN.handRadius+t.radius&&g.clearLine(h,t)){
   g.deal(e,t,YAN.handDamage*ammoBonus(g,e));if(t.id===h.targetId)g.status(t,'yanLock',.3,YAN.lockDuration,e);
  }});
 }
}
export function tick(g,e,dt){
 if(e.key!=='yan')return;orders(g,e);
 if(e.state.yanActive&&!distorted(g,e))endTransform(g,e);
 const charge=e.state.yanCharge;
 if(charge){
  if(g.stat(e,'stun')||g.stat(e,'disarm')||g.hidden(e)||e.motion||e.recall)cancelCharge(e);
  else{e.lastAttackAt=g.time;charge.progress=Math.min(YAN.chargeTime,charge.progress+dt*reloadRate(g,e));if(e.player)charge.aim={...g.input.aim};else if(charge.progress>=YAN.chargeTime)release(g,e,charge.aim);}
 }
 const q=e.state.yanBarrage;if(!q)return;
 if(g.stat(e,'stun')||g.stat(e,'silence')||g.time>=q.until){if(g.time>=q.until)e.state.yanInstantUntil=q.until+1;delete e.state.yanBarrage;return;}
 while(q.ticks<6&&g.time+1e-8>=q.next){q.next+=YAN.qEvery;q.ticks++;e.lastAttackAt=g.time;e.state.yanSweep={at:g.time,angle:Math.atan2(q.d.y,q.d.x),serial:q.ticks};g.emitSound?.('swing',e);
  g.action(e,'skill',()=>{for(const t of [...g.units]){const d=direction(e,t);if(g.hostile(e,t)&&distance(e,t)<=YAN.qRange+t.radius&&d.x*q.d.x+d.y*q.d.y>=0&&g.clearLine(e,t)){
   g.deal(e,t,YAN.qDamage);q.hits[t.id]=(q.hits[t.id]||0)+1;if(q.hits[t.id]===6)g.status(t,'slow',.5,1.5,e);
  }}});
  g.effects.push({source:e.id,theme:'yan',type:'yanWave',x:e.x,y:e.y,angle:Math.atan2(q.d.y,q.d.x),r:YAN.qRange,life:.28,maxLife:.28});
 }
}
export function onDeath(g,e){if(e.key==='yan'){cancelCharge(e);removeHand(g,e);}}
export function abilityInfo(g,e){
 if(e.key!=='yan')return {};const transformed=distorted(g,e),c=championDescription(e.key,transformed);
 return {basic:c.basic,tactical:c.tactical,ultimate:transformed?'':ready(g,e)?'enlxmfflsdis':'도시의 의지',qText:c.qText,rText:transformed?'':ready(g,e)?c.baseUltimates[1].description:c.baseUltimates[0].description};
}
