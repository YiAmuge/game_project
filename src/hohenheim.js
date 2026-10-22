import { RULES } from './data.js';
import { clamp,distance,direction } from './geometry.js';
import { has } from './augments.js';

export const HOHENHEIM={chargeTime:1.5,minDamage:100,maxDamage:150,minRange:6,maxRange:9,interval:.65,width:.2,burstGap:.12,duration:7,every:.4,damage:20,radius:4.2,castRange:8,followSpeed:6};
export const isChampion=e=>e.key==='hohenheim';
export function cancelCharge(e){if(isChampion(e))delete e.state.hohenCharge;}
export const reloadRate=(g,e)=>(RULES.reload[3]/RULES.reloadEfficiency)/g.reloadInterval(e);
export function chargeShape(g,e,p){
 const progress=e.state.posthumous?1:clamp((e.state.hohenCharge?.progress||0)/HOHENHEIM.chargeTime,0,1),extra=g.ammoCap(e);
 return {progress,d:g.aim(e,p),range:(HOHENHEIM.minRange+(HOHENHEIM.maxRange-HOHENHEIM.minRange)*progress+extra*.75)*(has(e,'range7')?1.07:1),damage:(HOHENHEIM.minDamage+(HOHENHEIM.maxDamage-HOHENHEIM.minDamage)*progress)*(1+.05*extra),hits:Math.min(3,1+Math.floor((progress+1e-8)/.3)),width:HOHENHEIM.width};
}
export function attackRange(g,e){return chargeShape(g,e,{x:e.x+1,y:e.y}).range;}
function fire(g,e,point){
 const shape=chargeShape(g,e,point);cancelCharge(e);g.cancelRecall(e);
 e.attackCd=HOHENHEIM.interval;e.lastAttackAt=g.time;e.attackAt=g.time;e.attackSerial=(e.attackSerial||0)+1;e.attackFacing=e.facing=Math.atan2(shape.d.y,shape.d.x);e.revealedUntil=g.time+1.25;
 g.action(e,'basic',()=>{const beam=()=>{
  const targets=g.units.filter(t=>g.hostile(e,t)&&g.clearLine(e,t)&&distance(e,t)<=shape.range+t.radius).filter(t=>{const dx=t.x-e.x,dy=t.y-e.y;return dx*shape.d.x+dy*shape.d.y>=0&&Math.abs(dx*shape.d.y-dy*shape.d.x)<=shape.width+t.radius;}).sort((a,b)=>distance(e,a)-distance(e,b));
  targets.forEach((t,j)=>g.deal(e,t,shape.damage*(j?.8:1)*(t.state?.electricWeak?.[e.id]>g.time?1.2:1)));
  g.effects.push({type:'line',x:e.x,y:e.y,to:{x:e.x+shape.d.x*shape.range,y:e.y+shape.d.y*shape.range},color:'#84edee',theme:'hohenheim',charge:shape.progress,life:.19,maxLife:.19});
 };beam();for(let i=1;i<shape.hits;i++)g.schedule(e,i*HOHENHEIM.burstGap,beam);});return true;
}
export function attack(g,e,p){
 g.cancelRecall(e);e.lastAttackAt=g.time;
 if(e.state.posthumous)return fire(g,e,p);
 if(e.state.hohenCharge){e.state.hohenCharge.aim={...p};return false;}
 e.state.hohenCharge={progress:0,aim:{...p}};return true;
}
export function release(g,e,p){
 if(!isChampion(e)||!e.state.hohenCharge)return false;
 if(!e.alive||e.state.posthumous||g.stat(e,'stun')||g.stat(e,'disarm')||g.hidden(e)||e.motion||e.recall){cancelCharge(e);return false;}
 return fire(g,e,p||e.state.hohenCharge.aim);
}
export function tick(g,e,dt){
 const charge=e.state.hohenCharge;if(!isChampion(e)||!charge)return;
 if(!e.alive||e.state.posthumous||g.stat(e,'stun')||g.stat(e,'disarm')||g.hidden(e)||e.motion||e.recall){cancelCharge(e);return;}
 e.lastAttackAt=g.time;charge.progress=Math.min(HOHENHEIM.chargeTime,charge.progress+dt*reloadRate(g,e));
 if(e.player)charge.aim={...g.input.aim};else if(charge.progress>=HOHENHEIM.chargeTime)release(g,e,charge.aim);
}
export function activeZone(g,e){return isChampion(e)?g.zones.find(z=>z.kind==='electricDevice'&&z.source===e&&z.until>g.time):null;}
function targetAt(g,e,p){return g.champions(1-e.team).filter(t=>t.alive&&!g.hidden(t)&&g.visibleTo(e.team,t)&&distance(e,t)<=HOHENHEIM.castRange+t.radius&&distance(p,t)<=1.5+t.radius&&g.clearLine(e,t)).sort((a,b)=>distance(p,a)-distance(p,b))[0];}
export function validate(g,e,slot,p){return !isChampion(e)||slot!=='r'||!activeZone(g,e)||Boolean(targetAt(g,e,p));}
export function cast(g,e,p){
 cancelCharge(e);const zone=activeZone(g,e);
 if(zone){const target=targetAt(g,e,p);if(!target)return false;zone.manualTargetId=zone.targetId=target.id;delete zone.waitingForTarget;return true;}
 g.zones.push({kind:'electricDevice',source:e,...p,r:HOHENHEIM.radius,until:g.time+HOHENHEIM.duration,nextTick:g.time+HOHENHEIM.every,tickEvery:HOHENHEIM.every,damage:HOHENHEIM.damage});return true;
}
export function updateZone(g,z,dt){
 const eligible=t=>t?.alive&&t.team===1-z.source.team&&t.kind==='champion'&&!g.hidden(t)&&g.visibleTo(z.source.team,t);
 const tracked=g.units.find(t=>t.id===z.targetId);if(tracked&&!tracked.alive)z.waitingForTarget=true;if(z.waitingForTarget)return;
 let target=g.units.find(t=>t.id===z.manualTargetId&&eligible(t));
 if(!target){delete z.manualTargetId;target=g.champions(1-z.source.team).filter(eligible).sort((a,b)=>distance(z,a)-distance(z,b)||a.id-b.id)[0];}
 z.targetId=target?.id;if(!target)return;
 const d=direction(z,target),step=Math.min(distance(z,target),HOHENHEIM.followSpeed*dt);z.x+=d.x*step;z.y+=d.y*step;
}
export function abilityInfo(g,e){return activeZone(g,e)?{ultimate:'추적 대상 변경',rText:'Space 후 사거리 8 내 적 챔피언을 좌클릭해 추적 대상으로 지정. 남은 지속시간과 궁극기 쿨다운은 유지.'}:{};}
