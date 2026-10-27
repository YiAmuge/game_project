import { RULES } from './data.js';
import { clamp,distance,direction } from './geometry.js';
import { has } from './augments.js';

export const HOHENHEIM={chargeTime:1.5,minDamage:100,maxDamage:100,minRange:6,maxRange:9,interval:.65,width:.2,burstGap:.12,duration:2.1,every:.25,damage:15,radius:7.5,castRange:8,followSpeed:6};
export const isChampion=e=>e.key==='hohenheim';
export function cancelCharge(e){if(isChampion(e))delete e.state.hohenCharge;}
export const reloadRate=(g,e)=>(RULES.reload[3]/RULES.reloadEfficiency)/g.reloadInterval(e);
export function chargeShape(g,e,p){
 const progress=e.state.posthumous?1:clamp((e.state.hohenCharge?.progress||0)/HOHENHEIM.chargeTime,0,1),extra=g.ammoCap(e);
 return {progress,d:g.aim(e,p),range:(HOHENHEIM.minRange+(HOHENHEIM.maxRange-HOHENHEIM.minRange)*progress+extra*.75)+(has(e,'range7')?2.5:0),damage:(HOHENHEIM.minDamage+(HOHENHEIM.maxDamage-HOHENHEIM.minDamage)*progress)*(1+.05*extra),hits:Math.min(3,1+Math.floor((progress+1e-8)/.3)),width:HOHENHEIM.width};
}
export function attackRange(g,e){return chargeShape(g,e,{x:e.x+1,y:e.y}).range;}
function fire(g,e,point){
 const shape=chargeShape(g,e,point);cancelCharge(e);g.cancelRecall(e);
 e.attackCd=HOHENHEIM.interval;e.lastAttackAt=g.time;e.attackAt=g.time;e.attackSerial=(e.attackSerial||0)+1;e.attackFacing=e.facing=Math.atan2(shape.d.y,shape.d.x);e.revealedUntil=g.time+1.25;
 g.action(e,'basic',()=>{const beam=()=>{g.emitSound?.('shot',e);
  const targets=g.units.filter(t=>g.hostile(e,t)&&g.clearLine(e,t)&&distance(e,t)<=shape.range+t.radius).filter(t=>{const dx=t.x-e.x,dy=t.y-e.y;return dx*shape.d.x+dy*shape.d.y>=0&&Math.abs(dx*shape.d.y-dy*shape.d.x)<=shape.width+t.radius;}).sort((a,b)=>distance(e,a)-distance(e,b));
  targets.forEach((t,j)=>g.deal(e,t,shape.damage*(j?.8:1)));
  g.effects.push({type:'line',source:e.id,x:e.x,y:e.y,to:{x:e.x+shape.d.x*shape.range,y:e.y+shape.d.y*shape.range},color:'#84edee',theme:'hohenheim',charge:shape.progress,life:.19,maxLife:.19});
 };beam();for(let i=1;i<shape.hits;i++)g.schedule(e,i*HOHENHEIM.burstGap,beam);});return true;
}
export function attack(g,e,p){
 g.cancelRecall(e);e.lastAttackAt=g.time;
 if(e.state.posthumous){if((e.state.posthumous.attacks||0)>=2)return false;e.state.posthumous.attacks=(e.state.posthumous.attacks||0)+1;return fire(g,e,p);}
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
export function activeZone(g,e){return isChampion(e)?g.zones.find(z=>z.kind==='electricBloom'&&z.source===e&&z.until>g.time):null;}
export function validate(){return true;}
export function cast(g,e,p){
 cancelCharge(e);g.zones.push({kind:'electricBloom',source:e,...p,r:4,createdAt:g.time,growUntil:g.time+1.75,until:g.time+2.1,nextTick:g.time+.25,burst:0});return true;
}
export function updateZone(g,z){
 z.r=4+3.5*clamp((g.time-z.createdAt)/1.75,0,1);
 const hit=(damage,stun=false)=>{for(const t of [...g.units])if(g.hostile(z.source,t)&&distance(z,t)<=z.r+t.radius&&g.clearLine(z,t)){g.deal(z.source,t,damage);if(stun)g.status(t,'stun',1,1,z.source);}};
 while(z.nextTick<=z.growUntil+1e-8&&z.nextTick<=g.time+1e-8){hit(15);z.nextTick+=.25;}
 while(z.burst<3&&g.time+1e-8>=z.growUntil+z.burst*.1){hit(150,true);z.burst++;g.effects.push({type:'burst',x:z.x,y:z.y,r:7.5,theme:'hohenheim',life:.28,maxLife:.28});}
}
export function abilityInfo(){return {};}
