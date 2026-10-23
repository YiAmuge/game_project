import { rectangle } from './reworks.js';
import * as Hohenheim from './hohenheim.js';
import { distance,direction } from './geometry.js';
import { area, dash, targetAt } from './skills.js';

export function endurance(e){return Math.max(0,Math.min(5,Math.floor((1-e.hp/e.maxHp+1e-8)/.1)));}
export function init(g,e){if(e.key==='queequeg')e.state.endurance=0;}
export function movementSkill(e,slot){
 const moves={don:['r'],ryoshu:['q','r'],sinclair:['q','r'],heathcliff:['q'],outis:['q','r'],alisa:['q'],nelly:['r'],ahab:['r'],dongrang:['r'],hohenheim:['q'],starbuck:['r'],kim:['q'],sora:['q']};
 return moves[e.key]?.includes(slot);
}
export function validate(g,e,slot,p){
 if(g.stat(e,'captured')&&movementSkill(e,slot)&&!(e.key==='alisa'&&slot==='q'&&g.buff(e,'alisaReload')))return false;
 if(e.key==='queequeg'&&slot==='q')return Boolean(targetAt(g,e,p,8,e.team,t=>t!==e));
 return true;
}
export function basic(g,e,p,d){
 if(e.key==='marton'){
  const len=Math.min(g.attackRange(e),distance(e,p)),point={x:e.x+d.x*len,y:e.y+d.y*len};
  if(len<2.5)g.cone(e,d,2.5,Math.PI,190,()=>g.addBuff(e,'martonStride',2.25));else area(g,e,point,2.2,100);
  g.effects.push({type:len<2.5?'slash':'burst',x:len<2.5?e.x:point.x,y:len<2.5?e.y:point.y,r:len<2.5?2.5:2.2,angle:Math.atan2(d.y,d.x),spread:Math.PI,theme:e.key,life:.4,maxLife:.4});return true;
 }
 if(e.key==='queequeg'){
  g.addBuff(e,'queegAttack',.42,{copy:false});for(let i=0;i<6;i++)g.schedule(e,i*.07,()=>rectangle(g,e,d,g.attackRange(e),1.8,28,t=>{
   if(t.kind==='champion'&&t.alive){e.state.captureHits??={};e.state.captureHits[t.id]=(e.state.captureHits[t.id]||0)+1;if(e.state.captureHits[t.id]%4===0)g.status(t,'captured',1,1.15,e);}
  }));return true;
 }
 return false;
}
export function cast(g,e,slot,p,d){
 if(e.key==='hohenheim'){
  Hohenheim.cancelCharge(e);
  if(slot==='q'){
   g.addBuff(e,'hohenheimStride',1);if(!e.state.posthumous)dash(g,e,d,2.5,180,t=>{if(t.kind==='champion'){g.status(t,'stun',1,.6,e);g.addBuff(e,'hohenheimHitStride',1);}});
  }else Hohenheim.cast(g,e,p);return true;
 }
 if(e.key==='marton'){
  if(slot==='q'){g.addBuff(e,'martonDrain',4);e.state.drainTick=g.time;}
  else{
   e.channelUntil=g.time+2.5;e.ccImmuneUntil=Math.max(e.ccImmuneUntil||0,g.time+2.5);e.state.fairy={at:g.time,until:g.time+2.5,received:0,nextTaunt:g.time};
   for(const t of g.champions(1-e.team).filter(t=>t.alive&&distance(e,t)<=6.8))taunt(g,t,e,.5);
   g.schedule(e,2.5,()=>{const received=e.state.fairy?.received||0;delete e.state.fairy;area(g,e,e,6.8,Math.min(900,received*.3));g.effects.push({type:'martonExplosion',x:e.x,y:e.y,r:6.8,theme:e.key,life:.6,maxLife:.6});});
  }return true;
 }
 if(e.key==='queequeg'){
  if(slot==='q'){
   const t=targetAt(g,e,p,8,e.team,a=>a!==e);detach(g,e);const previous=g.units.find(a=>a.id===t.state.tetherSource);if(previous)detach(g,previous);
   e.state.tether={target:t.id,until:Infinity,nextResistance:g.time+1};g.addBuff(t,'tetherArmor',Infinity,{copy:false});g.addBuff(t,'tetherGuard',Infinity,{copy:false});g.addBuff(e,'tetherGuard',Infinity,{copy:false});t.state.tetherSource=e.id;t.state.tetherResistance=0;
  }else{g.addBuff(e,'queequegUlt',4);e.state.queegHealAt=g.time+4;const tether=e.state.tether,t=g.units.find(t=>t.id===tether?.target&&t.alive);if(t&&tether.until>g.time){g.addBuff(t,'queequegUlt',4,{copy:false});t.state.queegHealAt=g.time+4;}}
  return true;
 }
 return false;
}
function taunt(g,t,source,seconds){g.status(t,'taunt',1,seconds,source);if(g.stat(t,'taunt')){t.state??={};t.state.tauntedBy=source.id;g.cancelRecall(t);}}
export function controlTaunt(g,e,dt){
 if(!g.stat(e,'taunt'))return false;
 const target=g.units.find(t=>t.id===e.state.tauntedBy&&t.alive);
 if(!target){delete e.status.taunt;delete e.state.tauntedBy;return false;}
 if(e.kind==='champion'){
  if(distance(e,target)>g.attackRange(e)+target.radius)g.moveToward(e,target,dt);else g.attack(e,target,{taunted:true});
 }else if(distance(e,target)>e.range+target.radius)g.moveToward(e,target,dt);else if(e.attackCd<=0){g.simpleAttack(e,target);e.attackCd=e.interval;}
 return true;
}
export function detach(g,e){const old=g.units.find(t=>t.id===e.state.tether?.target);if(old?.state.tetherSource===e.id){delete old.buffs.tetherArmor;if(!old.state.tether)delete old.buffs.tetherGuard;delete old.buffs.tetherResistance;delete old.state.tetherResistance;delete old.state.tetherSource;}delete e.state.tether;if(!e.state.tetherSource)delete e.buffs.tetherGuard;}
export function crowdControlled(g,e){return g.stat(e,'netCapture')||['stun','root','silence','disarm','slow','taunt','captured'].some(key=>g.stat(e,key)>0)||Boolean(e.motion?.forced);}
export function transfer(g,source,target,amount,kind){
 const owner=g.units.find(e=>e.id===target.state?.tetherSource&&e.alive&&e.state.tether?.target===target.id&&e.state.tether.until>g.time);
 if(!owner)return amount;
 const fraction=crowdControlled(g,target)?.5:.3;
 g.deal(source,owner,amount*fraction,{fixed:true,proc:false,damageKind:kind,transferred:true});return amount*(1-fraction);
}
export function afterDamage(g,source,target,actual){
 if(actual<=0)return;
 if(source.key==='marton'&&source.alive)g.heal(source,source,actual*.1,false);
 if(target.key==='marton'&&target.state.fairy)target.state.fairy.received+=actual;
 if(target.key==='queequeg'){target.state.endurance=endurance(target);}
}
export function interceptDeath(g,e,killer){
 if(e.key!=='hohenheim'||e.state.posthumous)return false;
 Hohenheim.cancelCharge(e);e.hp=0;e.state.posthumous={until:g.time+2.5,killer};e.qCd=0;e.ccImmuneUntil=Infinity;e.invulnerableUntil=Infinity;e.status={};delete e.motion;delete e.recall;e.channelUntil=0;return true;
}
export function onDeath(g,e){
 if(e.kind!=='champion')return;
 if(e.key==='queequeg')detach(g,e);
 const owner=g.units.find(a=>a.id===e.state.tetherSource);if(owner)detach(g,owner);
 if(e.key==='marton')g.entity({kind:'bait',key:'marton',name:'초롱 미끼',team:e.team,x:e.x,y:e.y,maxHp:500,radius:.5,until:g.time+5,owner:e.id,state:{},buffs:{},visuals:{},tauntReady:{}});
}
export function tick(g,e){
 const s=e.state;
 if(s.posthumous){e.hp=0;e.ammo=g.ammoCap(e);if(g.time+1e-8>=s.posthumous.until){g.kill(e,s.posthumous.killer);return;}if(!e.player&&(!e.trainingSummoned||g.practice.championAI)){const t=g.nearest(e,g.attackRange(e),false);if(t)g.attack(e,t);}}
 if(e.key==='marton'&&g.buff(e,'martonDrain')&&g.time+1e-8>=(s.drainTick||0)){s.drainTick=g.time+.25;area(g,e,e,5.5,27.5,t=>g.status(t,'slow',.2,.4,e));}
 if(s.queegHealAt&&g.time+1e-8>=s.queegHealAt){delete s.queegHealAt;g.heal(e,e,(e.maxHp-e.hp)*.25,false);}
 if(s.fairy&&g.time<s.fairy.until&&g.time+1e-8>=s.fairy.nextTaunt){s.fairy.nextTaunt=g.time+.25;for(const t of g.champions(1-e.team).filter(t=>t.alive&&distance(e,t)<=6.8))taunt(g,t,e,.5);}
 if(e.key==='queequeg'){
  if(s.tether){const t=g.units.find(t=>t.id===s.tether.target);if(!t?.alive||s.tether.until<=g.time)detach(g,e);else{if(distance(e,t)>8){s.tether.outside??=g.time;if(g.time-s.tether.outside>=1.5)detach(g,e);}else delete s.tether.outside;if(s.tether&&g.time+1e-8>=s.tether.nextResistance){const count=Math.floor((g.time-s.tether.nextResistance+1e-8)/1)+1;s.tether.nextResistance+=count;t.state.tetherResistance=Math.min(4,(t.state.tetherResistance||0)+count);g.addBuff(t,'tetherResistance',s.tether.until-g.time,{copy:false});}}}
 }
}
export function tickObjects(g){
 for(const b of g.units.filter(u=>u.kind==='bait'&&u.alive))for(const t of g.units.filter(t=>t.alive&&['champion','minion'].includes(t.kind)&&t.team===1-b.team&&distance(t,b)<=6.5)){
  if((b.tauntReady[t.id]||0)<=g.time){b.tauntReady[t.id]=g.time+1.5;taunt(g,t,b,.75);}
 }

}
