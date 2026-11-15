import {MEI as P} from './mei-data.js';
import {distance,direction,segmentDistance} from './geometry.js';
export const armorRate=(g,e)=>e.key==='mei'?Math.floor(e.level/3)*(.1+(g.buff(e,'meiGuard')?.06:0)):0;
export const finalArmor=(g,e)=>Math.max(0,g.armor(e)-g.stat(e,'armorDown'));
export const burning=(g,t)=>t.burn?.until>g.time||Object.values(t.meiBurns||{}).some(b=>b.until>g.time);
export const recast=(g,e)=>e.key==='mei'&&(e.state.meiQRecastUntil||0)>g.time;
export const quickR=(g,e)=>e.key==='mei'&&e.state.meiKickAt!==undefined&&g.time-e.state.meiKickAt<=P.kickWindow+1e-8;
const fx=(g,e,type,values={})=>g.effects.push({type,source:e.id,theme:'mei',x:e.x,y:e.y,angle:e.facing,life:.4,maxLife:.4,...values});
const fireSound=(g,e,slot,phase='mei-attack')=>g.emitSound('swing',e,{family:'punch',element:'fire',slot,phase});
function refreshBurn(g,e,t){const b=t.meiBurns?.[e.id];if(b?.until>=g.time)b.until=g.time+2;}
function hit(g,e,t,damage,{slot,fixed=false}={}){
 const shield=g.shield(t),actual=g.deal(e,t,damage,{fixed,damageKind:slot?'skill':'basic',sound:{family:'punch',element:'fire',slot,phase:'mei-hit',periodic:false}}),contact=actual+Math.max(0,shield-g.shield(t));
 if(slot&&contact>0)refreshBurn(g,e,t);return contact;
}
export function afterDamage(g,e,t,actual,proc,absorbed){
 if(e.key!=='mei'||!proc||actual+absorbed<=0||!t.alive||t.hp<=0)return;
 const counts=e.state.meiHits??={};counts[t.id]=(counts[t.id]||0)+1;
 if(counts[t.id]<3)return;counts[t.id]-=3;
 if(g.debuffImmune(t)||t.ccImmuneUntil>g.time||t.invulnerableUntil>g.time)return;
 t.meiBurns??={};const prior=t.meiBurns[e.id];t.meiBurns[e.id]={source:e,until:g.time+2,next:prior?.until>=g.time?prior.next:g.time+.5};g.triggerDisrupt(e,t);
}
export function tickBurn(g,t){
 if(!t.meiBurns)return;if(!t.alive||t.returning){delete t.meiBurns;return;}
 for(const [id,b]of Object.entries(t.meiBurns)){
  while(t.alive&&b.next<=Math.min(g.time,b.until)+1e-8){b.next+=.5;g.deal(b.source,t,20+finalArmor(g,b.source)*.25,{fixed:true,proc:false,damageKind:'skill',augmentOrigin:'meiBurn',sound:{family:'punch',element:'fire',periodic:true,phase:'mei-burn'}});}
  if(!t.alive)return;if(b.next>b.until+1e-8)delete t.meiBurns[id];
 }if(!Object.keys(t.meiBurns).length)delete t.meiBurns;
}
export function charges(g,e){
 if(e.key!=='mei'||!e.goldenBough)return null;
 return {current:e.state.meiRCharges??2,max:2,remaining:(e.state.meiRCharges??2)<2?Math.max(0,(e.state.meiRReady||0)-g.time):0};
}
export function tickCharges(g,e){
 if(!charges(g,e))return;const s=e.state;s.meiRCharges??=2;s.meiRQueue??=[];
 while(s.meiRCharges<2&&s.meiRReady<=g.time+1e-8){s.meiRCharges++;s.meiRQueue.shift();s.meiRReady+=s.meiRQueue[0]||0;}
 e.rCd=s.meiRCharges>0?0:Math.max(0,s.meiRReady-g.time);
}
function spendR(g,e,fast){
 const duration=g.cooldown(e,'r')*(fast?.5:1);
 if(!e.goldenBough){e.rCd=duration;return;}
 const s=e.state;s.meiRCharges??=2;s.meiRQueue??=[];if(s.meiRCharges===2)s.meiRReady=g.time+duration;s.meiRQueue.push(duration);s.meiRCharges--;e.rCd=s.meiRCharges>0?0:Math.max(0,s.meiRReady-g.time);
}
export function init(g,e){if(e.key!=='mei')return;delete e.state.meiCombo;delete e.state.meiRCharge;delete e.state.meiQPhase;delete e.state.meiQRecastUntil;}
export function validate(g,e,slot){
 if(slot==='q'&&recast(g,e))return true;
 if(g.stat(e,'root')||g.stat(e,'captured'))return false;
 if(slot==='q')return !e.state.meiQPhase;
 return !e.state.meiRCharge&&(!e.goldenBough||(charges(g,e).current>0));
}
export function attack(g,e,p){
 if(e.state.meiCombo||g.stat(e,'root')||g.stat(e,'captured')||e.ammo<1)return false;
 const count=Math.floor(e.ammo),dir=g.aim(e,p),at=g.safeLanding(e,p,g.attackRange(e));g.cancelRecall(e);e.ammo-=count;e.reloadProgress=0;e.attackCd=P.interval;e.attackSerial=(e.attackSerial||0)+1;e.lastAttackAt=g.time;e.facing=Math.atan2(dir.y,dir.x);e.revealedUntil=g.time+1.25;
 const combo=e.state.meiCombo={count,angle:e.facing,dashing:true,serial:e.attackSerial};
 const arrived=()=>{
  if(e.state.meiCombo!==combo)return;combo.dashing=false;combo.until=g.time+count*P.interval;
  for(let i=0;i<count;i++)g.schedule(e,i*P.interval,()=>{
   if(e.state.meiCombo!==combo)return;e.attackAt=e.lastAttackAt=g.time;e.attackFacing=combo.angle;e.state.meiPunch={at:g.time,until:g.time+P.interval,index:i,last:i===count-1,angle:combo.angle};
   fireSound(g,e);for(const t of [...g.units])if(g.hostile(e,t)&&distance(e,t)<=P.strikeRange+t.radius&&g.clearLine(e,t))hit(g,e,t,P.damage);
   fx(g,e,'meiPunch',{angle:combo.angle,index:i,last:i===count-1,r:P.strikeRange,life:.3,maxLife:.3});
  });
 };
 const len=distance(e,at);if(len<.02)arrived();else if(!g.startMotion(e,direction(e,at),len,{speed:P.dashSpeed,maxSpeed:P.dashSpeed,phaseEnemies:true,actionTag:'meiBasic',onComplete:arrived})){delete e.state.meiCombo;return false;}return true;
}
function finishQ(g,e){e.state.meiQPhase='recast';e.state.meiQRecastUntil=g.time+P.qRecast;}
function cooldownQ(g,e){delete e.state.meiQRecastUntil;delete e.state.meiQPhase;e.qCd=g.cooldown(e,'q');}
function kick(g,e,d){
 cooldownQ(g,e);e.state.meiKickAt=g.time;
 e.state.meiKick={at:g.time,until:g.time+.45,angle:Math.atan2(d.y,d.x)};
 fx(g,e,'meiFlameField',{r:P.kickRadius,life:.65,maxLife:.65,follow:true});
 for(let i=0;i<2;i++)g.schedule(e,i*P.kickEvery,()=>{
  fireSound(g,e,'q','mei-kick');fx(g,e,'meiVortex',{r:P.kickRadius,life:.45,maxLife:.45,follow:true});
  for(const t of [...g.units])if(g.hostile(e,t)&&distance(e,t)<=P.kickRadius+t.radius&&g.clearLine(e,t)){
   const contact=hit(g,e,t,66+finalArmor(g,e)*.066,{slot:'q'});if(i!==1||!t.alive||!contact)continue;
   const front={x:e.x+d.x*(e.radius+t.radius+.12),y:e.y+d.y*(e.radius+t.radius+.12)},v=direction(t,front),len=distance(t,front);
   const slow=burning(g,t)?.3:.15,applySlow=()=>{if(t.alive)g.status(t,'slow',slow,3,e);};
   if(len<=.01||!g.startMotion(t,v,len,{kind:'knock',source:e,speed:16,forcedMaxSpeed:16,onComplete:applySlow}))applySlow();
  }
 });
}
function throughTargets(g,e,contact){
 const hits=new Set();return(from,to)=>{for(const t of [...g.units])if(t.kind!=='champion'&&!hits.has(t.id)&&g.hostile(e,t)&&segmentDistance(t,from,to)<=e.radius+t.radius&&g.clearLine(from,t)){hits.add(t.id);contact(t);}};
}
function rush(g,e,d,fast){
 delete e.state.meiRCharge;e.channelUntil=Math.min(e.channelUntil||0,g.time);const scale=fast?.5:1;
 e.state.meiRush={at:g.time,until:g.time+.3,angle:Math.atan2(d.y,d.x),fast};fireSound(g,e,'r','mei-rush');
 const strike=t=>{const contact=hit(g,e,t,(60+finalArmor(g,e)*3)*scale,{slot:'r',fixed:true});if(t.kind==='champion'&&contact>0&&t.alive)g.status(t,'stun',1,P.rStun*scale,e);fx(g,e,'meiCollision',{x:t.x,y:t.y,r:1.3,life:.55,maxLife:.55});};
 g.startMotion(e,d,P.rRange*scale,{speed:P.dashSpeed,maxSpeed:P.dashSpeed,phaseNonChampions:true,actionTag:'meiR',onStep:throughTargets(g,e,strike),onCollision:({obstacle:t})=>{if(t&&g.hostile(e,t))strike(t);}});
}
export function cast(g,e,slot,p,d){
 if(slot==='q'){
  if(recast(g,e)){const angle=e.state.meiKickFacing??e.facing;delete e.state.meiKickFacing;e.facing=angle;kick(g,e,{x:Math.cos(angle),y:Math.sin(angle)});return;}
  g.addBuff(e,'meiGuard',P.qGuardTime,{copy:false});e.qCd=0;e.state.meiQPhase='dash';fireSound(g,e,'q','mei-dash');
  e.state.meiQThrust={at:g.time,until:g.time+.23,angle:Math.atan2(d.y,d.x)};
  const strike=t=>{const contact=hit(g,e,t,P.qDamage,{slot:'q'});if(contact>0)g.addShield(e,finalArmor(g,e)*.6,`mei-q-${e.id}`,2);};
  g.startMotion(e,d,P.qRange,{speed:P.dashSpeed,maxSpeed:P.dashSpeed,phaseNonChampions:true,actionTag:'meiQ',onStep:throughTargets(g,e,strike),onComplete:()=>finishQ(g,e),onCollision:({obstacle:t})=>{if(t&&g.hostile(e,t))strike(t);}});return;
 }
 const fast=quickR(g,e);spendR(g,e,fast);
 if(fast){rush(g,e,d,true);return;}
 e.state.meiRCharge={at:g.time,until:g.time+P.rCharge,dx:d.x,dy:d.y};e.channelUntil=g.time+P.rCharge;fx(g,e,'meiGather',{life:P.rCharge,maxLife:P.rCharge,r:2});
}
export function tick(g,e){
 if(e.key!=='mei')return;const s=e.state,c=s.meiCombo;
 if(c&&(c.dashing&&!e.motion||!c.dashing&&c.until<=g.time+1e-8))delete s.meiCombo;
 if(s.meiQPhase==='dash'&&!e.motion)finishQ(g,e);
 if(s.meiQRecastUntil&&s.meiQRecastUntil<=g.time+1e-8)cooldownQ(g,e);
 const r=s.meiRCharge;if(!r)return;
 if(g.stat(e,'stun')||g.stat(e,'silence')||e.motion?.forced||e.channelUntil+1e-8<r.until){delete s.meiRCharge;e.channelUntil=Math.min(e.channelUntil||0,g.time);return;}
 if(g.time+1e-8>=r.until)g.action(e,'skill',()=>rush(g,e,{x:r.dx,y:r.dy},false));
}
export function abilityInfo(g,e){return e.key==='mei'&&recast(g,e)?{tactical:'회축'}:{};}
