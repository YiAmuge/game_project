import{distance}from'./geometry.js';
import{rangeBonus}from'./augments.js';
import{MOSES,BREATHS}from'./moses-data.js';
export{MOSES,BREATHS};
export const rawBonus=(g,e)=>Math.max(0,g.rawPowerScale(e)*(1+g.buffValue(e,'power',.12))*(g.buff(e,'marks')?1.12:1)-1);
export const passiveRate=(g,e)=>e.key==='moses'?rawBonus(g,e)*.15:0;
export const pending=e=>e.state.smokeQueue||[];
export const airCap=(g,e)=>MOSES.airMax+Math.max(0,g.ammoCap(e))*MOSES.extraAir;
export const air=(g,e)=>Math.max(0,Math.min(airCap(g,e),e.state.mosesAir??airCap(g,e)));
export const refillRate=(g,e)=>Math.max(.1,1+(g.reloadMultiplier(e)-1)/3);
export function breath(g,e){const b=BREATHS[pending(e)[0]];return{color:b?.color||'#b6bdb9',range:(b?.range??MOSES.range)+rangeBonus(e),angle:b?.angle??MOSES.angle};}
export function init(g,e){if(e.key!=='moses')return;cancel(g,e);Object.assign(e.state,{smoke:null,smokeQueue:[],mosesLastSmoke:null,mosesCharges:2,mosesReady:Infinity,mosesAir:airCap(g,e),mosesAirProgress:0,mosesLastShot:g.time-MOSES.regenDelay});}
export function charges(g,e){const current=e.state.mosesCharges??2;return{current,max:2,remaining:current<2&&Number.isFinite(e.state.mosesReady)?Math.max(0,e.state.mosesReady-g.time):0};}
export function validate(g,e,slot,options={}){return slot==='r'?!e.state.mosesR:charges(g,e).current>0&&pending(e).length<MOSES.queueMax&&!e.state.mosesR&&Boolean(BREATHS[options.direction]);}
export function selectInput(g,e,active,direction){return g.netCommand?g.netCommand({action:'mosesChoose',active,direction}):choose(g,e,active,direction);}
function lowerPipe(g,e){const s=e.state,pose=s.mosesChoosing||s.mosesSmoking;if(pose)s.mosesPipeLowering={at:s.mosesChoosing?Math.max(g.time,pose.at+.25):g.time,raisedAt:pose.at};delete s.mosesChoosing;delete s.mosesSmoking;}
export function choose(g,e,active,direction){
 if(e.key!=='moses')return false;
 if(!active){lowerPipe(g,e);return true;}
 if(!e.alive||g.stat(e,'stun')||g.stat(e,'silence')||g.hidden(e)||e.channelUntil>g.time||pending(e).length>=MOSES.queueMax||!charges(g,e).current)return false;
 if(!e.state.mosesChoosing){e.state.mosesChoosing={at:g.time};g.emitSound('breath',e,{slot:'q',phase:'moses-inhale'});}
 e.state.mosesChoosing.direction=BREATHS[direction]?direction:null;return true;
}
export function inside(e,t,d,b){const dx=t.x-e.x,dy=t.y-e.y,len=Math.hypot(dx,dy);return len<=b.range+(t.radius||0)&&(len<1e-8||(dx*d.x+dy*d.y)/len>=Math.cos(b.angle/2));}
export function cancelCharge(e){if(e.key==='moses')delete e.state.mosesCharge;}
function resetExhale(g,e){
 const s=e.state,control=e.player?g.input:g.controllers?.get(e.id)?.connected?g.controllers.get(e.id).input:null;
 if(s.mosesExhaleAt!==undefined&&(control&&!control.fire||g.time-s.mosesExhaleAt>MOSES.interval+.05||g.stat(e,'stun')||g.stat(e,'disarm')||g.hidden(e)||e.motion||e.channelUntil>g.time))delete s.mosesExhaleAt;
}
export function attack(g,e,p,options={}){
 const s=e.state;if(s.mosesRecovering?.until>g.time)return false;
 const enhanced=pending(e).length>0;if(enhanced&&e.player&&g.mobileInput&&!options.mosesRelease)return false;
 if(!enhanced&&air(g,e)<1){s.mosesRecovering={at:g.time,until:g.time+MOSES.emptyRefill};s.mosesSmoking={at:g.time};s.mosesAirProgress=0;s.mosesLastShot=g.time;g.status(e,'disarm',1,MOSES.emptyRefill,e);g.emitSound('breath',e,{phase:'moses-inhale'});return false;}
 g.cancelRecall(e);lowerPipe(g,e);if(!enhanced)s.mosesAir=air(g,e)-1;s.mosesAirProgress=0;s.mosesLastShot=g.time;
 const d=g.aim(e,p);e.attackCd=MOSES.interval;e.lastAttackAt=e.attackAt=g.time;e.attackSerial=(e.attackSerial||0)+1;e.facing=e.attackFacing=Math.atan2(d.y,d.x);e.revealedUntil=g.time+1.25;e.healingEvent={key:`basic-${e.id}-${e.attackSerial}`,at:g.time};
 g.action(e,'basic',()=>basic(g,e,d));return true;
}
export function release(g,e,p){
 return e.key==='moses'&&pending(e).length>0?g.attack(e,p,{mosesRelease:true}):false;
}
export function basic(g,e,d,damage=MOSES.damage,progress=1){
 const choice=pending(e)[0],b=breath(g,e),redHealing=65+300*g.haste(e);let redAllies=0;if(choice)e.state.smokeQueue.shift();e.state.smoke=pending(e)[0]||null;lowerPipe(g,e);e.state.mosesBreath={at:g.time,color:b.color,choice,progress,angle:Math.atan2(d.y,d.x)};
 resetExhale(g,e);if(e.state.mosesExhaleAt===undefined)g.emitSound('breath',e,{phase:'moses-exhale',breath:choice});e.state.mosesExhaleAt=g.time;
 g.effects.push({type:'mosesBreath',source:e.id,theme:'moses',x:e.x,y:e.y,color:b.color,r:b.range,progress,angle:Math.atan2(d.y,d.x),spread:b.angle,life:.8,maxLife:.8});
 for(const t of[...g.units])if(t.alive&&inside(e,t,d,b)&&g.clearLine(e,t)){
  if(g.hostile(e,t)){
   g.deal(e,t,damage,{damageKind:'basic',sound:{family:'smoke'}});
   if(choice==='down')g.status(t,'stun',1,1.6,e);
   if(choice==='left'){
    g.status(t,'slow',.25,2,e);g.status(t,'armorWeak',.2,2,e);
    for(let n=1;n<=3;n++)g.schedule(e,n*.3,()=>{if(t.alive)g.deal(e,t,MOSES.purpleDamage,{damageKind:'basic',sound:{family:'smoke'}});});
   }
  }else if(t.kind==='champion'&&t.team===e.team){
   if(t!==e&&!g.hidden(t)&&!t.state.posthumous){const id=`moses-breath-${e.id}`,shields=t.shields.filter(s=>s.until>g.time&&s.source.startsWith('moses-breath-')),old=shields.find(s=>s.source===id)?.value||0,others=shields.filter(s=>s.source!==id).reduce((n,s)=>n+s.value,0);g.addShield(t,Math.min(old+MOSES.shield,Math.max(0,t.maxHp*MOSES.shieldCap-others)),id,MOSES.shieldTime);}
   if(choice==='up'){g.addBuff(t,'mosesWhite',3,{copy:false});g.addShield(t,t.maxHp*.1,`moses-white-${e.id}`,1.5);}
   if(choice==='right'){
    if(t!==e&&!g.hidden(t)&&!t.state.posthumous)redAllies++;
    (t.state.mosesMending??={})[e.id]={source:e,until:g.time+5,next:g.time+.5,heal:redHealing,event:e.healingEvent};g.addBuff(t,'mosesMending',5,{copy:false});t.supporters[e.id]=g.time;
   }
  }
 }
 if(choice==='right')e.rCd=Math.max(0,e.rCd-Math.min(1.5,redAllies*.5));
}
export function cast(g,e,slot,d,options={}){
 if(slot==='q'){
  const s=e.state,direction=options.direction;s.mosesCharges=(s.mosesCharges??2)-1;if(!Number.isFinite(s.mosesReady))s.mosesReady=g.time+g.cooldown(e,'q');
  if(!s.mosesChoosing){g.emitSound('breath',e,{slot:'q',phase:'moses-inhale'});s.mosesChoosing={at:g.time};}lowerPipe(g,e);(s.smokeQueue??=[]).push(direction);s.smoke=pending(e)[0];s.mosesLastSmoke=direction;
  if(direction==='down')g.selfDamage(e,e.maxHp*MOSES.blueCost,{nonLethal:true});if(direction==='right')g.heal(e,e,e.maxHp*.05,false,{skillHeal:true});sync(g,e);return;
 }
 cancelCharge(e);delete e.state.mosesChoosing;e.channelUntil=g.time+MOSES.rCharge;e.state.mosesR={at:g.time,until:e.channelUntil,angle:Math.atan2(d.y,d.x),x:e.x,y:e.y};g.emitSound('breath',e,{slot:'r',phase:'moses-inhale'});
}
function sync(g,e){e.qCd=(e.state.mosesCharges??2)>0?0:Math.max(0,e.state.mosesReady-g.time);}
function refill(g,e,dt){
 const s=e.state,cap=airCap(g,e);s.mosesAir=air(g,e);
 if(s.mosesRecovering){if(g.time+1e-8>=s.mosesRecovering.until){s.mosesAir=cap;s.mosesAirProgress=0;delete s.mosesRecovering;lowerPipe(g,e);}return;}
 const start=Math.max(g.time-dt,(s.mosesLastShot??g.time)+MOSES.regenDelay);
 if(s.mosesR||e.channelUntil>g.time){s.mosesLastShot=g.time;return;}
 if(s.mosesAir>=cap){s.mosesAirProgress=0;if(s.mosesSmoking)lowerPipe(g,e);return;}if(g.time<=start+1e-8)return;
 if(!s.mosesSmoking){s.mosesSmoking={at:start};g.emitSound('breath',e,{phase:'moses-inhale'});}
 s.mosesAirProgress=(s.mosesAirProgress||0)+(g.time-start)*refillRate(g,e);
 while(s.mosesAirProgress+1e-8>=MOSES.regenEvery&&s.mosesAir<cap){s.mosesAir++;s.mosesAirProgress-=MOSES.regenEvery;}
 if(s.mosesAir>=cap){s.mosesAirProgress=0;lowerPipe(g,e);}
}
export function onDamage(g,source,target,amount){
 if(amount<=0||target.kind!=='champion')return;
 for(const e of g.champions(target.team))if(e.key==='moses'&&e.alive&&e.rCd>0&&(e.state.mosesRefundReady||0)<=g.time&&distance(e,target)<=MOSES.rSupportRange){e.rCd=Math.max(0,e.rCd-MOSES.rRefund);e.state.mosesRefundReady=g.time+MOSES.rRefundEvery;}
}
export function tick(g,e,dt=0){
 if(e.key==='moses'){
  const s=e.state;resetExhale(g,e);while((s.mosesCharges??2)<2&&s.mosesReady<=g.time+1e-8){s.mosesCharges++;s.mosesReady=s.mosesCharges<2?s.mosesReady+g.cooldown(e,'q'):Infinity;}sync(g,e);
  if(s.mosesChoosing&&(!e.alive||g.stat(e,'stun')||g.stat(e,'silence')||g.hidden(e)||g.time-s.mosesChoosing.at>15))lowerPipe(g,e);
  if(s.mosesPipeLowering&&g.time-s.mosesPipeLowering.at>=.12)delete s.mosesPipeLowering;
  refill(g,e,dt);
  const r=s.mosesR;if(r){
   const control=e.player?g.input:e.networkControl;if(control?.aim){const d=g.aim(e,control.aim);r.angle=Math.atan2(d.y,d.x);e.facing=r.angle;}
   if(!e.alive||g.stat(e,'stun')||g.stat(e,'silence'))cancel(g,e);
   else if(g.time+1e-8>=r.until){delete s.mosesR;e.channelUntil=0;s.mosesCameraReturn=g.time+.3;s.mosesBreath={at:g.time,color:BREATHS.right.color,angle:r.angle};
    g.emitSound('breath',e,{slot:'r',phase:'moses-red-point'});
    g.bullet(e,{x:Math.cos(r.angle),y:Math.sin(r.angle)},750,Infinity,{slot:'r',damageKind:'skill',type:'mosesPoint',width:1,speed:26,ignoreTerrain:true,pierce:Infinity,beforeHit:(t,p)=>{p.damage=t.kind==='champion'?MOSES.rDamage:MOSES.rDamage*.1;},visualLength:3.7,visualWidth:2,sound:{family:'smoke',phase:'moses-point-hit'},onHit:(t,p)=>{if(t.kind==='champion'){p.pierce=0;p.remaining=0;p.hit=true;g.status(t,'stun',1,1.5,e);g.status(t,'mosesExposure',.2,3,e);if(t.status.mosesExposure)t.status.mosesExposure.team=e.team;}}});
   }
  }
 }
 for(const[id,b]of Object.entries(e.state.mosesMending||{})){
  while(e.alive&&b.next<=Math.min(g.time,b.until)+1e-8){b.next+=.5;g.heal(b.source,e,b.heal,false,{skillHeal:true,healingKey:b.event?.key,startedAt:b.event?.at});}
  if(!e.alive||b.next>b.until+1e-8)delete e.state.mosesMending[id];
 }
 if(e.state.mosesMending&&!Object.keys(e.state.mosesMending).length){delete e.state.mosesMending;delete e.buffs.mosesMending;}
}
export function cancel(g,e){if(e.key!=='moses'||!e.state)return;if(e.state.mosesR)e.channelUntil=0;for(const key of['mosesR','mosesCharge','mosesChoosing','mosesPipeLowering','mosesBreath','mosesCameraReturn','mosesRecovering','mosesSmoking','mosesExhaleAt'])delete e.state[key];}
export function zoom(g,e){if(e.key!=='moses')return 1;const r=e.state.mosesR;if(r){const p=Math.max(0,Math.min(1,(g.time-r.at)/MOSES.rCharge));return 1+.65*p*p*(3-2*p);}return e.state.mosesCameraReturn>g.time?1+.65*(e.state.mosesCameraReturn-g.time)/.3:1;}
