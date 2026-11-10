import{distance}from'./geometry.js';
import{rangeBonus}from'./augments.js';
import{MOSES,BREATHS}from'./moses-data.js';
import{RULES,RUNTIME_CHAMPIONS}from'./data.js';
import{damageBonus}from'./skills.js';
export{MOSES,BREATHS};
export const rawBonus=(g,e)=>Math.max(0,g.rawPowerScale(e)*(1+g.buffValue(e,'power',.12))*(g.buff(e,'marks')?1.12:1)-1);
export const passiveRate=(g,e)=>e.key==='moses'?rawBonus(g,e)*.15:0;
export function breath(g,e){const b=BREATHS[e.state.smoke],extra=Math.max(0,g.ammoCap(e)-MOSES.ammo);return{color:b?.color||'#b6bdb9',range:(b?.range??MOSES.range)+rangeBonus(e)+extra*.5,angle:Math.min(Math.PI*2,(b?.angle??MOSES.angle)+extra*5*Math.PI/180)};}
export function init(g,e){if(e.key!=='moses')return;Object.assign(e.state,{smoke:null,mosesLastSmoke:null,mosesCharges:2,mosesReady:Infinity});cancel(g,e);}
export function charges(g,e){const current=e.state.mosesCharges??2;return{current,max:2,remaining:current<2&&Number.isFinite(e.state.mosesReady)?Math.max(0,e.state.mosesReady-g.time):0};}
export function validate(g,e,slot,options={}){return slot==='r'?!e.state.mosesR:charges(g,e).current>0&&!e.state.smoke&&!e.state.mosesR&&Boolean(BREATHS[options.direction]);}
export function selectInput(g,e,active,direction){return g.netCommand?g.netCommand({action:'mosesChoose',active,direction}):choose(g,e,active,direction);}
function lowerPipe(g,e){const s=e.state;if(s.mosesChoosing)s.mosesPipeLowering={at:Math.max(g.time,s.mosesChoosing.at+.25),raisedAt:s.mosesChoosing.at};delete s.mosesChoosing;}
export function choose(g,e,active,direction){
 if(e.key!=='moses')return false;
 if(!active){lowerPipe(g,e);return true;}
 if(!e.alive||g.stat(e,'stun')||g.stat(e,'silence')||g.hidden(e)||e.channelUntil>g.time||e.state.smoke||!charges(g,e).current)return false;
 if(!e.state.mosesChoosing){e.state.mosesChoosing={at:g.time};g.emitSound('breath',e,{slot:'q',phase:'moses-inhale'});}
 e.state.mosesChoosing.direction=BREATHS[direction]?direction:null;return true;
}
export function inside(e,t,d,b){const dx=t.x-e.x,dy=t.y-e.y,len=Math.hypot(dx,dy);return len<=b.range+(t.radius||0)&&(len<1e-8||(dx*d.x+dy*d.y)/len>=Math.cos(b.angle/2));}
export function cancelCharge(e){if(e.key==='moses')delete e.state.mosesCharge;}
export function chargeShape(g,e,p){const progress=e.state.smoke?1:Math.max(0,Math.min(1,(e.state.mosesCharge?.progress||0)/MOSES.chargeTime));return{...breath(g,e),d:g.aim(e,p),progress,damage:MOSES.minDamage+(MOSES.damage-MOSES.minDamage)*progress};}
export function attack(g,e,p){
 g.cancelRecall(e);e.lastAttackAt=g.time;
 if(e.state.mosesCharge){e.state.mosesCharge.aim={...p};return false;}
 e.state.mosesCharge={at:g.time,progress:0,aim:{...p}};
 if(e.state.smoke)return release(g,e,p);
 g.emitSound('breath',e,{phase:'moses-inhale'});return true;
}
export function release(g,e,p){
 const charge=e.state.mosesCharge;if(e.key!=='moses'||!charge)return false;
 if(!e.alive||g.stat(e,'stun')||g.stat(e,'disarm')||g.hidden(e)||e.motion||e.recall||e.state.mosesR){cancelCharge(e);return false;}
 const shape=chargeShape(g,e,p||charge.aim);cancelCharge(e);e.attackCd=MOSES.interval;e.lastAttackAt=e.attackAt=g.time;e.attackSerial=(e.attackSerial||0)+1;e.facing=e.attackFacing=Math.atan2(shape.d.y,shape.d.x);e.revealedUntil=g.time+1.25;e.healingEvent={key:`basic-${e.id}-${e.attackSerial}`,at:g.time};
 g.action(e,'basic',()=>basic(g,e,shape.d,shape.damage,shape.progress));return true;
}
export function basic(g,e,d,damage=MOSES.damage,progress=1){
 const choice=e.state.smoke,b=breath(g,e),redHealing=65+300*g.haste(e);let redAllies=0;e.state.smoke=null;lowerPipe(g,e);e.state.mosesBreath={at:g.time,color:b.color,choice,progress,angle:Math.atan2(d.y,d.x)};
 g.emitSound('breath',e,{phase:'moses-exhale',breath:choice});
 g.effects.push({type:'mosesBreath',source:e.id,theme:'moses',x:e.x,y:e.y,color:b.color,r:b.range,progress,angle:Math.atan2(d.y,d.x),spread:b.angle,life:.8,maxLife:.8});
 for(const t of[...g.units])if(t.alive&&inside(e,t,d,b)&&g.clearLine(e,t)){
  if(g.hostile(e,t)){
   g.deal(e,t,damage,{damageKind:'basic',sound:{family:'smoke'}});
   if(choice==='down')g.status(t,'stun',1,1.6,e);
   if(choice==='left'){
    g.status(t,'slow',.25,2,e);g.status(t,'armorWeak',.2,2,e);
    for(let n=1;n<=3;n++)g.schedule(e,n*.3,()=>{if(t.alive)g.deal(e,t,50,{damageKind:'basic',sound:{family:'smoke'}});});
   }
  }else if(t.kind==='champion'&&t.team===e.team){
   if(t!==e&&!g.hidden(t)&&!t.state.posthumous){const value=damage*RULES.power[RUNTIME_CHAMPIONS[e.key].power]*.9*g.powerScale(e)*(1-g.powerWeak(e))*damageBonus(g,e,t)*MOSES.shieldRatio;const id=`moses-breath-${e.id}`,shields=t.shields.filter(s=>s.until>g.time&&s.source.startsWith('moses-breath-')),old=shields.find(s=>s.source===id)?.value||0,others=shields.filter(s=>s.source!==id).reduce((n,s)=>n+s.value,0);g.addShield(t,Math.min(old+value,Math.max(0,t.maxHp*MOSES.shieldCap-others)),id,MOSES.shieldTime);}
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
  if(!s.mosesChoosing){g.emitSound('breath',e,{slot:'q',phase:'moses-inhale'});s.mosesChoosing={at:g.time};}lowerPipe(g,e);s.smoke=s.mosesLastSmoke=direction;
  if(direction==='down')g.selfDamage(e,e.hp*.06,{nonLethal:true});if(direction==='right')g.heal(e,e,e.maxHp*.05,false,{skillHeal:true});sync(g,e);return;
 }
 cancelCharge(e);delete e.state.mosesChoosing;e.channelUntil=g.time+MOSES.rCharge;e.state.mosesR={at:g.time,until:e.channelUntil,angle:Math.atan2(d.y,d.x),x:e.x,y:e.y};g.emitSound('breath',e,{slot:'r',phase:'moses-inhale'});
}
function sync(g,e){e.qCd=(e.state.mosesCharges??2)>0?0:Math.max(0,e.state.mosesReady-g.time);}
export function onDamage(g,source,target,amount){
 if(amount<=0||target.kind!=='champion')return;
 for(const e of g.champions(target.team))if(e.key==='moses'&&e.alive&&e.rCd>0&&(e.state.mosesRefundReady||0)<=g.time&&distance(e,target)<=MOSES.rSupportRange){e.rCd=Math.max(0,e.rCd-MOSES.rRefund);e.state.mosesRefundReady=g.time+MOSES.rRefundEvery;}
}
export function tick(g,e,dt=0){
 if(e.key==='moses'){
  const s=e.state;while((s.mosesCharges??2)<2&&s.mosesReady<=g.time+1e-8){s.mosesCharges++;s.mosesReady=s.mosesCharges<2?s.mosesReady+g.cooldown(e,'q'):Infinity;}sync(g,e);
  if(s.mosesChoosing&&(!e.alive||g.stat(e,'stun')||g.stat(e,'silence')||g.hidden(e)||g.time-s.mosesChoosing.at>15))lowerPipe(g,e);
  if(s.mosesPipeLowering&&g.time-s.mosesPipeLowering.at>=.12)delete s.mosesPipeLowering;
  const charge=s.mosesCharge;if(charge){if(!e.alive||g.stat(e,'stun')||g.stat(e,'disarm')||g.hidden(e)||e.motion||e.recall||s.mosesR)cancelCharge(e);else{e.lastAttackAt=g.time;charge.progress=Math.min(MOSES.chargeTime,charge.progress+dt*g.reloadMultiplier(e));if(e.player)charge.aim={...g.input.aim};else if(charge.progress>=MOSES.chargeTime)release(g,e,charge.aim);}}
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
export function cancel(g,e){if(e.key!=='moses'||!e.state)return;if(e.state.mosesR)e.channelUntil=0;for(const key of['mosesR','mosesCharge','mosesChoosing','mosesPipeLowering','mosesBreath','mosesCameraReturn'])delete e.state[key];}
export function zoom(g,e){if(e.key!=='moses')return 1;const r=e.state.mosesR;if(r){const p=Math.max(0,Math.min(1,(g.time-r.at)/MOSES.rCharge));return 1+.65*p*p*(3-2*p);}return e.state.mosesCameraReturn>g.time?1+.65*(e.state.mosesCameraReturn-g.time)/.3:1;}
