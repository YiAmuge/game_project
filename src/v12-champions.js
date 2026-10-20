import { distance,direction,clearLine } from './geometry.js';
import { settleBody } from './collision.js';
import { dash,targetAt } from './skills.js';

export const KIM={shield:120,qRange:2.8,qDamage:250,grab:1.2,throwDamage:100,rDamage:450,counterDamage:338};
export function recast(g,e,slot){return e.key==='kim'&&slot==='q'&&e.state.swordGrab?.until>g.time&&e.state.swordGrab.target.alive&&g.stat(e.state.swordGrab.target,'root')&&e.state.swordGrab.target.status.root.grabOwner===e.id;}
export function validate(g,e,slot,p){
 if(e.key==='kim'&&slot==='q'&&!recast(g,e,slot)&&(g.stat(e,'root')||g.stat(e,'captured')))return false;
 return true;
}
export function basic(g,e,p,d){
 if(e.key==='kim'){
  if(e.state.followSlashUntil>g.time){delete e.state.followSlashUntil;g.cone(e,d,g.attackRange(e),1.9,190);g.addShield(e,70,`draw-${e.id}`,3);}
  else{e.state.followSlashUntil=g.time+1.2;for(let i=0;i<3;i++)g.schedule(e,i*.1,()=>g.cone(e,d,g.attackRange(e),1.2,75));}return true;
 }
 if(e.key==='ppui'){
  const ally=targetAt(g,e,p,6,e.team,a=>a!==e);
  if(ally){const old=g.units.find(a=>a.id===e.state.empower?.target);if(old)delete old.buffs.redEncouragement;e.state.empower={target:ally.id,until:g.time+4,healUntil:g.time+3};g.support(e);g.addBuff(ally,'redEncouragement',4,{copy:false});ally.supporters[e.id]=g.time;}
  else g.bullet(e,d,150,g.attackRange(e),{theme:'ppui',width:.2});
  return true;
 }return false;
}
function releaseGrab(g,e,throwDirection){
 const grab=e.state.swordGrab;if(!grab)return;delete e.state.swordGrab;
 const t=grab.target;if(t.status.root?.grabOwner===e.id)delete t.status.root;
 if(throwDirection&&t.alive){g.deal(e,t,KIM.throwDamage);g.startMotion(t,throwDirection,2.5,{kind:'knock'});}
}
function counterWave(g,e,counter){
 const s=e.state.counter;if(!s)return;delete e.state.counter;e.channelUntil=0;e.ccImmuneUntil=s.immune;
 const angles=counter?[-.3,-.1,.1,.3]:[0];
 for(const offset of angles){const a=s.angle+offset;g.bullet(e,{x:Math.cos(a),y:Math.sin(a)},counter?KIM.counterDamage:KIM.rDamage,counter?8:6,{width:counter?.42:.3,pierce:Infinity,theme:'kim',swordWave:true,onHit:t=>{if(counter)g.status(t,'slow',.25,1.5,e);}});}
 g.effects.push({type:'slash',x:e.x,y:e.y,r:counter?5:3,angle:s.angle,spread:counter?2.2:1.1,theme:'kim',life:.5,maxLife:.5});
}
export function cast(g,e,slot,p,d){
 if(e.key==='kim'){
  if(slot==='q'){
   if(recast(g,e,slot)){releaseGrab(g,e,d);return true;}
   let grabbed=false;dash(g,e,d,KIM.qRange,KIM.qDamage,t=>{if(!grabbed&&t.kind==='champion'&&t.alive){grabbed=true;g.status(t,'root',1,KIM.grab,e);if(g.stat(t,'root')){const fallback=e.motion?.lastClear;delete e.motion;settleBody(g,e,fallback);t.status.root.grabOwner=e.id;e.state.swordGrab={target:t,until:t.status.root.until};}}});
  }else{e.state.counter={until:g.time+1.5,angle:Math.atan2(d.y,d.x),immune:e.ccImmuneUntil||0};e.channelUntil=g.time+1.5;e.ccImmuneUntil=g.time+1.5;g.schedule(e,1.5,()=>counterWave(g,e,false));}
  return true;
 }
 if(e.key==='ppui'){
  if(slot==='q'){
   const allies=g.champions(e.team).filter(a=>a.alive&&distance(a,p)<=3.5&&clearLine(p,a)).sort((a,b)=>a.maxHp-b.maxHp||a.hp-b.hp),t=allies[0];
   if(t){const cc=g.stat(t,'netCapture')||['stun','root','silence','disarm','taunt','captured','slow'].some(k=>g.stat(t,k))||t.motion?.forced;if(cc){t.status={};delete t.state.netTrap;if(t.motion?.forced)delete t.motion;t.ccImmuneUntil=Math.max(t.ccImmuneUntil||0,g.time+1);}e.state.helping={target:t.id,until:g.time+2};t.supporters[e.id]=g.time;g.support(e);}
   g.effects.push({type:'ring',...p,r:3.5,color:'#efadb5',life:.6,maxLife:.6});
  }else{
   e.channelUntil=g.time+2;e.state.nailStorm={d:{...d},until:g.time+2};
   for(let i=0;i<5;i++)g.schedule(e,i*.4,()=>{
    if(g.stat(e,'stun')||g.stat(e,'silence')){delete e.state.nailStorm;e.channelUntil=0;return;}
    if(!e.state.nailStorm)return;g.effects.push({type:'nailVolley',x:e.x,y:e.y,angle:Math.atan2(d.y,d.x),r:7,life:.36,maxLife:.36});g.cone(e,d,7,1.5,120,t=>{if((t.state?.nailPushReady||0)<=g.time){if(t.state)t.state.nailPushReady=g.time+.6;g.startMotion(t,d,.5,{kind:'knock'});}});
   });
  }return true;
 }return false;
}
export function afterDamage(g,e,t,actual,proc,kind,absorbed=0){
 if(t.key==='kim'&&t.state.counter&&actual+absorbed>0&&e.team!==t.team)counterWave(g,t,true);
 if(proc&&actual+absorbed>0&&e.key==='kim'&&t.kind==='champion'&&e.team!==t.team&&e.passiveReady<=g.time){
  e.passiveReady=g.time+1;for(const ally of g.champions(e.team).filter(a=>a.alive&&distance(a,e)<=4)){g.addShield(ally,KIM.shield,`sword-${e.id}`,3);g.addBuff(ally,'swordDiscipline',3,{copy:false});}g.support(e);
 }
 if(!proc||actual+absorbed<=0||t.kind!=='champion'||e.kind!=='champion'||e.team===t.team)return;
 for(const owner of g.champions(e.team).filter(a=>a.alive&&a.key==='ppui')){
  const buff=owner.state.empower,token=kind==='basic'?`b${e.attackSerial}`:`s${e.castAt}`;
  if(buff?.target!==e.id||buff.until<=g.time||distance(owner,t)>6||buff.lastToken===token)continue;
  buff.lastToken=token;t.contributors[owner.id]=g.time;
  g.bullet(owner,direction(owner,t),150,4,{homing:true,target:t,speed:18,theme:'ppui',nonLethal:true,proc:false,damageKind:'skill'});
 }
}
export function tick(g,e,dt){
 if(e.key==='kim'&&e.state.swordGrab&&(e.state.swordGrab.until<=g.time||!e.state.swordGrab.target.alive||!g.stat(e.state.swordGrab.target,'root')||e.state.swordGrab.target.status.root.grabOwner!==e.id||g.stat(e,'stun')))releaseGrab(g,e);
 if(e.key!=='ppui')return;
 for(const [key,rate] of [['empower',50],['helping',150]]){
  const s=e.state[key];if(!s)continue;const target=g.champions(e.team).find(a=>a.id===s.target&&a.alive),until=s.healUntil??s.until;
  if(target){if(until>g.time-dt)g.heal(e,target,rate*Math.min(dt,Math.max(0,until-(g.time-dt))));if(s.until>g.time)target.supporters[e.id]=g.time;}
  if(!target||s.until<=g.time)delete e.state[key];
 }
 if(e.state.nailStorm?.until<=g.time)delete e.state.nailStorm;
}
export function onDeath(g,e){
 if(e.key==='kim')releaseGrab(g,e);if(e.key==='ppui'){const old=g.units.find(a=>a.id===e.state.empower?.target);if(old)delete old.buffs.redEncouragement;}
 for(const kim of g.champions().filter(a=>a.key==='kim'&&a.state.swordGrab?.target===e))releaseGrab(g,kim);
}
