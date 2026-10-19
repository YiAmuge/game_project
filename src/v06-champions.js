import { RUNTIME_CHAMPIONS as CHAMPIONS } from './data.js';
import { distance, direction, clearLine, blocked } from './geometry.js';
import { area, dash } from './skills.js';

export function init(g,e){if(e.key==='dongrang'){e.totalHealingReceived=0;}}
export function ultGrowth(e){const n=Math.min(5,Math.floor((e.totalHealingReceived||0)/100));return {radius:3.2+n*.6,damage:180+n*50};}
export function validate(g,e,slot,p){
 if(e.key==='myo'&&slot==='q')return e.ammo>=1&&!g.buff(e,'rabbitFrenzy');
 if(e.key==='dongrang'&&slot==='r')return !g.stat(e,'root')&&!blocked(p.x,p.y,e.radius);
 if(e.key==='dongrang'&&slot==='q')return !blocked(p.x,p.y,.15)&&!g.zones.some(z=>z.kind==='desireTree'&&z.source===e&&z.until>g.time);
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
   g.deal(e,t,170*(1+.12*Math.min(4,hits.n)));hits.n++;hits.at=g.time;
  }
  if(e.state.extraPetals===3)g.status(e,'disarm',1,1.35);
  g.effects.push({type:'slash',x:e.x,y:e.y,angle:e.facing,spread:1.3,r:g.attackRange(e),theme:e.key,life:.4,maxLife:.4});return true;
 }
 if(e.key==='dongrang'){for(const z of g.zones)if(z.kind==='desireTree'&&z.source===e&&z.golden&&z.until>g.time&&distance(e,z)<=g.attackRange(e)&&clearLine(e,z)){const v=direction(e,z);if(v.x*d.x+v.y*d.y>=Math.cos(.95)){z.until=g.time;g.heal(e,e,e.maxHp*.07,false);}}g.zones=g.zones.filter(z=>z.until>g.time);g.cone(e,d,g.attackRange(e),1.9,260);return true;}
 return false;
}
export function cast(g,e,slot,p,d){
 const s=e.state;
 if(e.key==='myo'){
  if(slot==='q'){
   e.ammo-=1;e.attackCd=Math.max(e.attackCd,.35);e.lastAttackAt=g.time;
   for(let i=0;i<4;i++)g.schedule(e,i*.075,()=>{const a=Math.atan2(d.y,d.x)+(i-1.5)*.045;g.bullet(e,{x:Math.cos(a),y:Math.sin(a)},80,7,{speed:24,width:.14,onHit:t=>{if(t.kind==='champion'){t.state.rabbitMark??={};t.state.rabbitMark[e.id]=g.time+3;t.visuals.rabbitMark={until:g.time+3,theme:'myo'};}}});});
  }else{g.addBuff(e,'rabbitFrenzy',6,{copy:false});s.frenzyWas=true;e.ammo=Math.min(g.ammoCap(e),e.ammo+1);}return true;
 }
 if(e.key==='dongbaek'){
  if(slot==='q'){g.addShield(e,e.maxHp*.08,`petals-${e.id}`,3);g.addBuff(e,'flowerStride',3);}
  else{area(g,e,p,4.2,360);g.addBuff(e,'flowerReload',3,{copy:false});g.effects.push({type:'burst',...p,r:4.2,theme:e.key,life:.65,maxLife:.65});}
  return true;
 }
 if(e.key==='dongrang'){
  if(slot==='q'){
   g.zones.push({kind:'desireTree',source:e,...p,r:2.5,until:g.time+8,nextTick:g.time+.5,tickEvery:.5,damage:35,fixed:true,lifesteal:1,dealt:0,golden:false,slow:.2});
  }else{
   const strike=()=>{const ult=ultGrowth(e),trees=g.zones.filter(z=>z.kind==='desireTree'&&z.source===e&&z.until>g.time&&distance(e,z)<=ult.radius);g.zones=g.zones.filter(z=>!trees.includes(z));g.heal(e,e,e.maxHp*.025*trees.length,false);
   let dealt=0;area(g,e,e,ult.radius,0,t=>{dealt+=g.deal(e,t,ult.damage,{fixed:true});g.status(t,'root',1,.8,e);});g.heal(e,e,dealt*.3,false);
   g.effects.push({type:'burst',x:e.x,y:e.y,r:ult.radius,theme:e.key,life:.7,maxLife:.7});};
   dash(g,e,d,Math.min(2.5,distance(e,p)),0,()=>{},{onComplete:strike});
  }return true;
 }
 return false;
}
export function takedown(g,e,victim,direct){
 if(e.key==='myo'&&victim.kind==='champion'&&direct&&e.team!==victim.team){e.state.rabbitStacks=g.buff(e,'rabbitHunt')?Math.min(2,(e.state.rabbitStacks||0)+1):1;g.addBuff(e,'rabbitHunt',4,{copy:false});e.ammo=Math.min(g.ammoCap(e),e.ammo+2);}
}
export function tick(g,e){
 if(e.key==='myo'){if(e.state.frenzyWas&&!g.buff(e,'rabbitFrenzy'))e.ammo=Math.min(e.ammo,g.ammoCap(e));e.state.frenzyWas=g.buff(e,'rabbitFrenzy');}
 if(e.key==='dongbaek'&&e.ammo>=1)e.state.extraPetals=0;
}
