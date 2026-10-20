import { distance, direction, clearLine } from './geometry.js';
import { area, dash, targetAt } from './skills.js';

export function init(g,e){if(e.key==='queequeg')e.state.endurance=0;}
export function movementSkill(e,slot){
 const moves={don:['r'],ryoshu:['q','r'],sinclair:['q','r'],heathcliff:['q'],outis:['q','r'],alisa:['q'],nelly:['r'],ahab:['r'],dongrang:['r'],hohenheim:['q'],starbuck:['r']};
 return moves[e.key]?.includes(slot);
}
export function validate(g,e,slot,p){
 if(g.stat(e,'captured')&&movementSkill(e,slot)&&!(e.key==='alisa'&&slot==='q'&&g.buff(e,'alisaReload')))return false;
 if(e.key==='queequeg'&&slot==='q')return Boolean(targetAt(g,e,p,5,e.team,t=>t!==e));
 return true;
}
export function basic(g,e,p,d){
 if(e.key==='hohenheim'){
  for(let i=0;i<3;i++)g.schedule(e,i*.12,()=>{
   const end={x:e.x+d.x*g.attackRange(e),y:e.y+d.y*g.attackRange(e)};
   const targets=g.units.filter(t=>g.hostile(e,t)&&clearLine(e,t)&&distance(e,t)<=g.attackRange(e)+t.radius).filter(t=>{const v=direction(e,t);return v.x*d.x+v.y*d.y>0&&Math.abs((t.x-e.x)*d.y-(t.y-e.y)*d.x)<=.2+t.radius;}).sort((a,b)=>distance(e,a)-distance(e,b));
   targets.forEach((t,j)=>g.deal(e,t,125*(j? .8:1)*(t.state?.electricWeak?.[e.id]>g.time?1.2:1)));
   g.effects.push({type:'line',x:e.x,y:e.y,to:end,color:'#84edee',theme:e.key,life:.19,maxLife:.19});
  });return true;
 }
 if(e.key==='marton'){
  const len=Math.min(g.attackRange(e),distance(e,p)),point={x:e.x+d.x*len,y:e.y+d.y*len};
  area(g,e,point,2.2,180,t=>{if(t.kind==='champion')g.addBuff(e,'martonStride',2.5);});g.effects.push({type:'burst',...point,r:2.2,theme:e.key,life:.4,maxLife:.4});return true;
 }
 if(e.key==='queequeg'){
  for(let i=0;i<6;i++)g.schedule(e,i*.07,()=>g.cone(e,d,g.attackRange(e),.8,28,t=>{
   if(t.kind==='champion'&&t.alive){e.state.captureHits??={};e.state.captureHits[t.id]=(e.state.captureHits[t.id]||0)+1;if(e.state.captureHits[t.id]%4===0)g.status(t,'captured',1,1.15,e);}
  }));return true;
 }
 return false;
}
export function cast(g,e,slot,p,d){
 if(e.key==='hohenheim'){
  if(slot==='q'){
   g.addBuff(e,'hohenheimStride',1);if(!e.state.posthumous)dash(g,e,d,2.5,180,t=>{if(t.kind==='champion'){g.status(t,'stun',1,.6,e);g.addBuff(e,'hohenheimHitStride',1);}});
  }else g.zones.push({kind:'electricDevice',source:e,...p,r:4.2,until:g.time+4,nextTick:g.time,tickEvery:.5,damage:40});return true;
 }
 if(e.key==='marton'){
  if(slot==='q'){g.addBuff(e,'martonDrain',4);e.state.drainTick=g.time;}
  else{
   e.channelUntil=g.time+1.2;e.ccImmuneUntil=Math.max(e.ccImmuneUntil||0,g.time+1.2);e.state.fairy={until:g.time+1.2,received:0};
   for(const t of g.champions(1-e.team).filter(t=>t.alive&&distance(e,t)<=4))taunt(g,t,e,1.2);
   g.schedule(e,1.2,()=>{const received=e.state.fairy?.received||0;delete e.state.fairy;area(g,e,e,5,Math.min(900,received*.3));g.effects.push({type:'burst',x:e.x,y:e.y,r:5,theme:e.key,life:.6,maxLife:.6});});
  }return true;
 }
 if(e.key==='queequeg'){
  if(slot==='q'){
   const t=targetAt(g,e,p,5,e.team,a=>a!==e);detach(g,e);e.state.tether={target:t.id,until:g.time+8,nextResistance:g.time+1};g.addBuff(t,'tetherArmor',8,{copy:false});t.state.tetherSource=e.id;t.state.tetherResistance=0;
  }else{g.addBuff(e,'queequegUlt',4);e.state.queegHealAt=g.time+4;const tether=e.state.tether,t=g.units.find(t=>t.id===tether?.target&&t.alive);if(t&&tether.until>g.time){tether.until=g.time+8;g.addBuff(t,'tetherArmor',8,{copy:false});if(g.buff(t,'tetherResistance'))t.buffs.tetherResistance=tether.until;g.addBuff(t,'tetherStride',4,{copy:false});}}
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
function detach(g,e){const old=g.units.find(t=>t.id===e.state.tether?.target);if(old?.state.tetherSource===e.id){delete old.buffs.tetherArmor;delete old.buffs.tetherResistance;delete old.state.tetherResistance;delete old.state.tetherSource;}delete e.state.tether;}
export function transfer(g,source,target,amount,kind){
 const owner=g.units.find(e=>e.id===target.state?.tetherSource&&e.alive&&e.state.tether?.target===target.id&&e.state.tether.until>g.time);
 if(!owner)return amount;
 g.deal(source,owner,amount*.3,{fixed:true,proc:false,damageKind:kind,transferred:true});return amount*.7;
}
export function afterDamage(g,source,target,actual){
 if(actual<=0)return;
 if(source.key==='marton'&&source.alive)g.heal(source,source,actual*.1,false);
 if(target.key==='marton'&&target.state.fairy)target.state.fairy.received+=actual;
 if(target.key==='queequeg'){target.state.lostHpFraction=(target.state.lostHpFraction||0)+actual/target.maxHp;target.state.endurance=Math.min(5,Math.floor((target.state.lostHpFraction+1e-8)/.1));}
}
export function interceptDeath(g,e,killer){
 if(e.key!=='hohenheim'||e.state.posthumous)return false;
 e.hp=0;e.state.posthumous={until:g.time+2.5,killer};e.qCd=0;e.ccImmuneUntil=Infinity;e.invulnerableUntil=Infinity;e.status={};delete e.motion;delete e.recall;e.channelUntil=0;return true;
}
export function onDeath(g,e){
 if(e.kind!=='champion')return;
 if(e.key==='queequeg')detach(g,e);
 if(e.key==='marton')g.entity({kind:'bait',key:'marton',name:'초롱 미끼',team:e.team,x:e.x,y:e.y,maxHp:500,radius:.5,until:g.time+5,owner:e.id,state:{},buffs:{},visuals:{},tauntReady:{}});
}
export function tick(g,e){
 const s=e.state;
 if(s.posthumous){e.hp=0;e.ammo=g.ammoCap(e);if(g.time+1e-8>=s.posthumous.until){g.kill(e,s.posthumous.killer);return;}if(!e.player){const t=g.nearest(e,g.attackRange(e),false);if(t)g.attack(e,t);}}
 if(e.key==='marton'&&g.buff(e,'martonDrain')&&g.time+1e-8>=(s.drainTick||0)){s.drainTick=g.time+.25;area(g,e,e,3,27.5,t=>g.status(t,'slow',.2,.4,e));}
 if(e.key==='queequeg'){
  if(s.queegHealAt&&g.time+1e-8>=s.queegHealAt){delete s.queegHealAt;g.heal(e,e,(e.maxHp-e.hp)*.25,false);}
  if(s.tether){const t=g.units.find(t=>t.id===s.tether.target);if(!t?.alive||s.tether.until<=g.time)detach(g,e);else{if(distance(e,t)>8){s.tether.outside??=g.time;if(g.time-s.tether.outside>=1.5)detach(g,e);}else delete s.tether.outside;if(s.tether&&g.time+1e-8>=s.tether.nextResistance){const count=Math.floor((g.time-s.tether.nextResistance+1e-8)/1)+1;s.tether.nextResistance+=count;t.state.tetherResistance=Math.min(4,(t.state.tetherResistance||0)+count);g.addBuff(t,'tetherResistance',s.tether.until-g.time,{copy:false});}}}
 }
}
export function tickObjects(g){
 for(const b of g.units.filter(u=>u.kind==='bait'&&u.alive))for(const t of g.units.filter(t=>t.alive&&['champion','minion'].includes(t.kind)&&t.team===1-b.team&&distance(t,b)<=4)){
  if((b.tauntReady[t.id]||0)<=g.time){b.tauntReady[t.id]=g.time+1.5;taunt(g,t,b,.75);}
 }
 for(const z of g.zones.filter(z=>z.kind==='electricDevice'&&z.until>g.time))for(const t of g.champions(1-z.source.team).filter(t=>t.alive&&distance(t,z)<=z.r)){t.state.electricWeak??={};t.state.electricWeak[z.source.id]=g.time+3;}
}
