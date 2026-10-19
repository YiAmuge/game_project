import { RUNTIME_CHAMPIONS as CHAMPIONS } from './data.js';
import { distance, direction, clearLine, blocked } from './geometry.js';
import { area, dash } from './skills.js';

export function init(g,e){if(e.key==='dongrang'){e.state.treeCharges=2;e.state.treeReady=Infinity;e.totalHealingReceived=0;}}
export function ultGrowth(e){const n=Math.floor((e.totalHealingReceived||0)/800);return {radius:3.2+Math.min(8,n)*.25,damage:180+Math.min(10,n)*35};}
export function validate(g,e,slot,p){
 if(e.key==='myo'&&slot==='q')return e.ammo>=2&&!g.buff(e,'rabbitFrenzy');
 if(e.key==='dongrang'&&slot==='q')return (e.state.treeCharges??2)>0&&!blocked(p.x,p.y,.15)&&g.zones.filter(z=>z.kind==='desireTree'&&z.source===e&&z.until>g.time).length<6;
 return true;
}
export function beforeBasic(g,e){
 if(e.key==='myo'&&g.stat(e,'root'))return false;
 if(e.key==='dongbaek'){
  if(e.ammo>=1)e.state.extraPetals=0;
  else if((e.state.extraPetals||0)<3){e.state.extraPetals=(e.state.extraPetals||0)+1;e.ammo=1;e.qCd+=1.5;e.rCd+=1.5;}
 }
 return true;
}
export function basic(g,e,p,d){
 if(e.key==='myo'){
  dash(g,e,d,g.attackRange(e),t=>220*(g.buff(e,'rabbitFrenzy')?1.3:1)*(t.state?.rabbitMark?.[e.id]>g.time?1.25:1));return true;
 }
 if(e.key==='dongbaek'){
  e.state.flowerHits??={};
  for(const t of [...g.units])if(g.hostile(e,t)&&distance(e,t)<=g.attackRange(e)+t.radius&&clearLine(e,t)){
   const td=direction(e,t);if(td.x*d.x+td.y*d.y<Math.cos(.65))continue;
   let hits=e.state.flowerHits[t.id];if(!hits||hits.at<g.time-4)hits=e.state.flowerHits[t.id]={n:0,at:g.time};
   g.deal(e,t,170*(1+.12*Math.min(4,hits.n)+.15*(g.buff(e,'flowerFragrance')?(e.state.fragranceStacks||0):0)));hits.n++;hits.at=g.time;
  }
  g.effects.push({type:'slash',x:e.x,y:e.y,angle:e.facing,spread:1.3,r:g.attackRange(e),theme:e.key,life:.4,maxLife:.4});return true;
 }
 if(e.key==='dongrang'){g.cone(e,d,g.attackRange(e),1.9,260);return true;}
 return false;
}
export function cast(g,e,slot,p,d){
 const s=e.state;
 if(e.key==='myo'){
  if(slot==='q'){
   e.ammo-=2;e.attackCd=Math.max(e.attackCd,.35);e.lastAttackAt=g.time;
   for(let i=0;i<4;i++)g.schedule(e,i*.075,()=>{const a=Math.atan2(d.y,d.x)+(i-1.5)*.045;g.bullet(e,{x:Math.cos(a),y:Math.sin(a)},80,7,{speed:24,width:.14,onHit:t=>{if(t.kind==='champion'){t.state.rabbitMark??={};t.state.rabbitMark[e.id]=g.time+3;t.visuals.rabbitMark={until:g.time+3,theme:'myo'};}}});});
  }else g.addBuff(e,'rabbitFrenzy',5,{copy:false});return true;
 }
 if(e.key==='dongbaek'){
  if(slot==='q'){g.addShield(e,e.maxHp*.08,`petals-${e.id}`,3);g.addBuff(e,'flowerStride',3);}
  else{e.channelUntil=g.time+1.75;g.pending.push({type:'flowerBurst',source:e,...p,r:4.2,at:g.time+1.75,windup:1.75,damage:500,onHit:t=>{if(t.kind==='champion'){s.fragranceStacks=Math.min(4,(s.fragranceStacks||0)+1);g.addBuff(e,'flowerFragrance',6,{copy:false});}}});}
  return true;
 }
 if(e.key==='dongrang'){
  if(slot==='q'){
   s.treeCharges=(s.treeCharges??2)-1;if(!Number.isFinite(s.treeReady))s.treeReady=g.time+g.cooldown(e,'q');e.qCd=s.treeCharges>0?0:s.treeReady-g.time;
   g.zones.push({kind:'desireTree',source:e,...p,r:2.5,until:g.time+8,nextTick:g.time+1.5,tickEvery:1.5,damage:70,fixed:true,lifesteal:.4,slow:.2});
  }else{
   const ult=ultGrowth(e);g.zones=g.zones.filter(z=>!(z.kind==='desireTree'&&z.source===e&&distance(e,z)<=ult.radius));
   let dealt=0;area(g,e,e,ult.radius,0,t=>{dealt+=g.deal(e,t,ult.damage,{fixed:true});g.status(t,'root',1,.8,e);});g.heal(e,e,dealt*.3,false);
   g.effects.push({type:'burst',x:e.x,y:e.y,r:ult.radius,theme:e.key,life:.7,maxLife:.7});
  }return true;
 }
 return false;
}
export function takedown(g,e,victim,direct){
 if(e.key==='myo'&&victim.kind==='champion'&&direct&&e.team!==victim.team){e.state.rabbitStacks=g.buff(e,'rabbitHunt')?Math.min(2,(e.state.rabbitStacks||0)+1):1;g.addBuff(e,'rabbitHunt',4,{copy:false});}
}
export function tick(g,e){
 if(e.key==='dongrang'){
  const s=e.state;s.treeCharges??=2;s.treeReady??=Infinity;
  if(s.treeCharges<2&&g.time>=s.treeReady){s.treeCharges++;s.treeReady=s.treeCharges<2?g.time+g.cooldown(e,'q'):Infinity;}
  e.qCd=s.treeCharges>0?0:Math.max(0,s.treeReady-g.time);
 }
 if(e.key==='dongbaek'&&e.ammo>=1)e.state.extraPetals=0;
}
