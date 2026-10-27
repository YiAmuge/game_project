import {RULES} from './data.js';
import {distance,direction} from './geometry.js';
import {canOccupy} from './collision.js';
import * as Infiltration from './infiltration.js';

export const JAMILA={ammo:16,range:6.6,damage:25,trooperDamage:15,interval:.25,idle:3,reload:1.75,powerRatio:.3,shield:.01,shieldCap:.2,shieldTime:5,threshold:.15,trueDamage:.15,qRange:3.5,qDamage:225,qRetreat:4,qSpeed:20,qSlash:.2,qDebuff:.07,qDebuffTime:3,duration:10,infiltrationDuration:15};
export const isTrooper=e=>Boolean(e.lcaTrooper);
export const army=(g,e)=>g.units.filter(t=>t.lcaTrooper&&t.owner===e.id&&t.alive&&t.until>g.time);
export const commander=(g,e)=>e.lcaTrooper?g.units.find(t=>t.id===e.owner):e;
export const squadBonus=(g,e)=>{const owner=commander(g,e);return owner?.key==='jamila'?army(g,owner).length*.05:0;};
export const reloadDuration=(g,e)=>JAMILA.reload/Math.max(.2,1+1.5*(g.reloadMultiplier(e)-1));
export const reloading=e=>Boolean(e.state?.lcaReload);
export const reloadFraction=e=>Math.min(1,(e.state?.lcaReload?.progress||0)/JAMILA.reload);
export function beginReload(g,e){if(!e.state.lcaReload&&e.ammo<g.ammoCap(e)){e.state.lcaReload={at:g.time,progress:0};e.reloadProgress=0;g.emitSound('reload',e,{phase:'lca-reload'});}}
export function tickReload(g,e,dt){
 // Avoid an extra simulation frame between rounds from floating-point residue.
 if(e.attackCd<1e-8)e.attackCd=0;
 const cap=g.ammoCap(e);if(e.ammo>=cap){delete e.state.lcaReload;e.reloadProgress=0;return;}
 if(!reloading(e)&&(e.ammo<1||g.time-(e.state.lcaShotAt??-Infinity)>=JAMILA.idle-1e-8))beginReload(g,e);
 const r=e.state.lcaReload;if(!r)return;
 r.progress+=dt*Math.max(.2,1+1.5*(g.reloadMultiplier(e)-1));e.reloadProgress=reloadFraction(e)*reloadDuration(g,e);
 if(r.progress+1e-8>=JAMILA.reload){e.ammo=cap;delete e.state.lcaReload;e.reloadProgress=0;g.emitSound('reload',e,{phase:'lca-ready'});}
}
export function basic(g,e,p,d){
 if(e.key!=='jamila')return false;
 delete e.state.lcaReload;e.reloadProgress=0;e.state.lcaShotAt=g.time;
 g.bullet(e,d,e.lcaTrooper?JAMILA.trooperDamage:JAMILA.damage,g.attackRange(e),{speed:28,width:.11,color:'#e6cd77',theme:'jamila',lca:true});
 if(e.ammo<1)beginReload(g,e);return true;
}
export function afterDamage(g,e,t,actual,proc,damageKind,absorbed){
 if(e.lcaTrooper){const owner=commander(g,e);if(owner&&actual+absorbed>0){owner.lastCombat=owner.lastAttackAt=g.time;owner.totalDamage=(owner.totalDamage||0)+actual;if(owner.player)g.damageDone+=actual;if(t.kind==='champion'){t.lastEnemyDamage={id:owner.id,at:g.time};t.contributors[owner.id]=g.time;}}return;}
 if(e.key!=='jamila'||e.kind!=='champion'||!proc||!(actual+absorbed>0)||e.team===t.team||!e.alive)return;
 e.state.lcaTarget=t.id;
 const id=`udjat-${e.id}`,old=e.shields.find(s=>s.source===id&&s.until>g.time)?.value||0,increment=e.maxHp*JAMILA.shield;
 g.addShield(e,Math.min(e.maxHp*JAMILA.shieldCap,old+increment),id,JAMILA.shieldTime);
 for(const u of army(g,e)){const shared=`udjat-shared-${e.id}`,before=u.shields.find(s=>s.source===shared&&s.until>g.time)?.value||0;g.addShield(u,before+increment*.5,shared,JAMILA.shieldTime);}
 if(g.shield(e)+1e-8>=e.maxHp*JAMILA.threshold&&t.alive&&t.hp>0)g.deal(e,t,(actual+absorbed)*JAMILA.trueDamage,{fixed:true,proc:false,campBonus:false,damageKind});
}
export function validate(g,e,slot){return !e.state.jamilaQ&&(slot!=='q'||!g.stat(e,'root')&&!g.stat(e,'captured')&&!g.stat(e,'netCapture'));}
function endQ(e){delete e.state.jamilaQ;}
function retreat(g,e,q){
 if(e.state.jamilaQ!==q||!e.alive)return;
 q.phase='retreat';e.channelUntil=Math.min(e.channelUntil||0,g.time);
 if(!g.startMotion(e,{x:-q.d.x,y:-q.d.y},JAMILA.qRetreat,{speed:18,maxSpeed:18,actionTag:'jamila-retreat',onComplete:()=>endQ(e)}))endQ(e);
}
function slash(g,e,q){
 if(e.state.jamilaQ!==q||!e.alive)return;
 q.phase='slash';q.slashAt=g.time;e.channelUntil=g.time+JAMILA.qSlash;
 g.emitSound('swing',e,{slot:'q',phase:'kopis-cut',family:'blade'});
 g.cone(e,q.d,JAMILA.qRange,Math.PI,JAMILA.qDamage,t=>{g.status(t,'weak',JAMILA.qDebuff,JAMILA.qDebuffTime,e);g.status(t,'armorWeak',JAMILA.qDebuff,JAMILA.qDebuffTime,e);});
 g.schedule(e,JAMILA.qSlash,()=>retreat(g,e,q));
}
export function tactical(g,e,d){
 const q=e.state.jamilaQ={at:g.time,phase:'dash',d:{...d},angle:Math.atan2(d.y,d.x)};let attack=true;
 if(!g.startMotion(e,d,JAMILA.qRange,{speed:JAMILA.qSpeed,maxSpeed:JAMILA.qSpeed,actionTag:'jamila-dash',onCollision:c=>{attack=c.kind==='unit'&&g.hostile(e,c.obstacle);},onComplete:()=>attack?slash(g,e,q):retreat(g,e,q)})){endQ(e);return false;}return true;
}
export function formationPoint(e,index){const side=index?1:-1,a=e.facing||0;return {x:e.x+Math.cos(a)*side*1.7-Math.sin(a)*.9,y:e.y+Math.sin(a)*side*1.7+Math.cos(a)*.9};}
function spawnPoint(g,e,index){
 const desired=formationPoint(e,index),dummy={...e,kind:'trooper',radius:.38};
 if(canOccupy(g,dummy,desired))return desired;
 for(let r=.65;r<=3;r+=.25)for(let i=0;i<16;i++){const a=i*Math.PI/8+index*Math.PI,p={x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r};if(canOccupy(g,dummy,p)&&g.clearLine(e,p,.38))return p;}
 return {x:e.x,y:e.y};
}
export function ultimate(g,e,{infiltrationBonus=false}={}){
 for(const u of army(g,e)){u.alive=false;u.hp=0;}
 const snapshot={maxHp:e.maxHp*.45,armor:g.armor(e)*.45,power:g.combatPower(e)*.2,damagePower:RULES.power[1]*.9*g.powerScale(e)*(1-g.powerWeak(e))*.2,reload:g.reloadMultiplier(e),speed:g.speed(e)},duration=infiltrationBonus?JAMILA.infiltrationDuration:JAMILA.duration;
 for(let i=0;i<2;i++){
  const u=g.entity({kind:'trooper',key:'jamila',name:'LCA 우제트 전투원',lcaTrooper:true,owner:e.id,formation:i,team:e.team,...spawnPoint(g,e,i),maxHp:snapshot.maxHp,armor:snapshot.armor,snapshot:{...snapshot},until:g.time+duration,range:JAMILA.range,radius:.38,ammo:16,level:e.level,path:[],facing:e.facing||0,attackSerial:0,attackAt:-99,lastAttackAt:-99,lastDamageAt:-99,state:{lcaShotAt:g.time},buffs:{},buffHistory:{},buffPotency:{},visuals:{},supporters:{},contributors:{},augments:[],upgrades:{power:0,health:0,speed:0,haste:0,reload:0},reloadProgress:0});
  g.effects.push({type:'ring',x:u.x,y:u.y,r:.9,color:'#e5c75d',life:.45,maxLife:.45});
 }e.state.udjatUntil=g.time+duration;return true;
}
export function cast(g,e,slot,p,d,options){if(e.key!=='jamila')return false;return slot==='q'?tactical(g,e,d):ultimate(g,e,options);}
export function tick(g,e,dt){
 if(e.key!=='jamila')return;
 tickReload(g,e,dt);const q=e.state.jamilaQ;
 if(q&&(g.stat(e,'stun')||g.stat(e,'root')||g.time-q.at>2||q.phase!=='slash'&&!e.motion)){if(e.motion?.actionTag?.startsWith('jamila-'))delete e.motion;endQ(e);}
}
export function tickTrooper(g,e,dt,{moving=false}={}){
 if(g.time+1e-8>=e.until){e.alive=false;e.hp=0;return;}
 tickReload(g,e,dt);if(moving||g.stat(e,'stun')||g.stat(e,'captured')||g.stat(e,'netCapture'))return;
 const owner=commander(g,e);if(!owner){e.alive=false;return;}
 const valid=t=>t&&g.hostile(e,t)&&!g.locked(t)&&g.visibleTo(e.team,t)&&distance(owner,t)<=14;
 let target=g.stat(e,'taunt')?g.units.find(t=>t.id===e.state.tauntedBy&&g.hostile(e,t)):undefined;
 if(!target)target=g.units.find(t=>t.id===owner.state.lcaTarget&&valid(t));
 if(!target)target=g.units.filter(t=>valid(t)&&(t.team!==2||t.hostile)&&distance(e,t)<=9).sort((a,b)=>distance(e,a)-distance(e,b))[0];
 e.targetId=target?.id;
 if(target){
  if(distance(e,target)>g.attackRange(e)+target.radius||!g.clearLine(e,target)){if(!g.stat(e,'root'))g.moveToward(e,target,dt);}
  else if(e.ammo>0&&e.attackCd<=0&&!g.stat(e,'disarm')){
   const d=direction(e,target);e.facing=e.attackFacing=Math.atan2(d.y,d.x);e.attackAt=e.lastAttackAt=g.time;e.attackSerial++;e.ammo--;e.attackCd=JAMILA.interval;g.emitSound('shot',e);
   g.action(e,'basic',()=>basic(g,e,target,d));
  }
 }else if(owner.alive&&!g.stat(e,'root')){
  const point=formationPoint(owner,e.formation);if(distance(e,point)>.25&&!g.blocked(point.x,point.y,e.radius))g.moveToward(e,point,dt);
 }
}
export const infiltrationUltimate=(g,e,slot)=>e.key==='jamila'&&slot==='r'&&Infiltration.absent(e)&&e.augments.includes('highRisk');
export function deployFromInfiltration(g,e,slot){
 if(!infiltrationUltimate(g,e,slot)||!e.alive||e.rCd>0||g.winner!==null||!Infiltration.valid(g,e,e.state.infiltration.point))return false;
 const point={...e.state.infiltration.point};Infiltration.arrive(g,e,point);
 return g.cast(e,'r',point,{infiltrationBonus:true});
}
