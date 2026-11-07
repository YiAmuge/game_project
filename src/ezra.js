import{distance,direction,segmentDistance}from'./geometry.js';
import{has,rangeBonus}from'./augments.js';
import{combatSeconds}from'./combat-timing.js';
import{EZRA,EZRA_WEAPONS,EZRA_AXE}from'./ezra-data.js';
export{EZRA,EZRA_WEAPONS,EZRA_AXE};
export const ultimate=(g,e)=>Boolean(e.key==='ezra'&&g.buff(e,'ezraUlt'));
export const weapon=(g,e,index)=>index===4||index===undefined&&ultimate(g,e)?EZRA_AXE:EZRA_WEAPONS[index??e.state.weapon??0];
export const extraAmmo=e=>e.key==='ezra'&&has(e,'magazine2')?2:0;
export const ammoBonus=e=>extraAmmo(e)*EZRA.extraAmmoRatio;
export const reloadMultiplier=(g,e)=>Math.max(.2,1+(g.reloadMultiplier(e)-1)*EZRA.reloadScale);
export const reloadDuration=(g,e)=>combatSeconds(EZRA.reload/reloadMultiplier(g,e));
export const currentIndex=(g,e)=>ultimate(g,e)?4:e.state.weapon??0;
export const attackReach=(g,e,index=currentIndex(g,e))=>weapon(g,e,index).range+rangeBonus(e)+(index===3?EZRA_WEAPONS[3].dash:index===4?EZRA_AXE.dash:0);
export const movementWeapon=(g,e,index=currentIndex(g,e))=>[0,3,4].includes(index);
export function ammoSlots(g,e){
 const index=currentIndex(g,e),count=Math.floor(e.ammo),start=index===4?4-count:index;
 return Array.from({length:4},(_,i)=>({color:(index===4?EZRA_AXE:EZRA_WEAPONS[i]).color,loaded:index===4?i>=start:(i-start+4)%4<count,active:i===(index===4?Math.min(3,4-count):index)}));
}
export function init(g,e){
 if(e.key!=='ezra')return;delete e.buffs.ezraUlt;Object.assign(e.state,{weapon:0,ezraLastWeapon:null,ultAttacks:0,ezraBusyUntil:0,ezraHammerDirection:-1});
 for(const k of['ezraNormal','ezraReloading','ezraAttack'])delete e.state[k];e.ammo=EZRA.ammo;e.reloadProgress=0;e.range=EZRA_WEAPONS[0].range;
}
export function beginReload(g,e){if(e.state.ezraReloading||ultimate(g,e))return;e.state.ezraReloading=true;e.reloadProgress=0;g.addShield(e,e.maxHp*EZRA.emptyShield,`ezra-bag-${e.id}`,EZRA.shieldTime);}
export function validateBasic(g,e){return e.ammo>=1&&!e.state.ezraReloading&&!(movementWeapon(g,e)&&(g.stat(e,'root')||g.stat(e,'captured')));}
export function validate(g,e,slot){if(e.state.ezraBusyUntil>g.time)return false;if(slot==='r')return !ultimate(g,e);const index=e.state.ezraLastWeapon;return index!=null&&!ultimate(g,e)&&!(movementWeapon(g,e,index)&&(g.stat(e,'root')||g.stat(e,'captured')));}
const controlled=(g,t)=>Boolean(t.motion?.forced||['stun','root','slow','captured','netCapture','taunt','fear','silence','disarm'].some(k=>g.stat(t,k)>0));
function hit(g,e,t,w,index,kind,slot){
 const cc=index===2&&controlled(g,t),shield=g.shield(t),actual=g.deal(e,t,w.damage,{damageKind:kind,weaponIndex:index,sound:{family:w.family,slot}}),absorbed=Math.max(0,shield-g.shield(t));
 if(cc&&actual+absorbed>0&&t.alive)g.deal(e,t,(actual+absorbed)*.15,{fixed:true,proc:false,damageKind:kind,weaponIndex:index,sound:{family:'drill',slot}});
 if(!t.alive)return;
 if(index===1)g.status(t,'slow',.12,1.5,e);
 if(index===3){const toward=direction(t,e),len=Math.min(2.5,Math.max(0,distance(t,e)-e.radius-t.radius));if(len>0)g.startMotion(t,toward,len,{kind:'knock',source:e,speed:12,forcedMaxSpeed:12});g.status(t,'slow',.30,1.25,e);}
 if(index===4){g.status(t,'slow',.25,1,e);if(t.status?.slow?.theme==='ezra')t.status.slow.decayAt=g.time;}
}
function liveAim(g,e){return e.player?g.aim(e,g.input.aim):{x:Math.cos(e.facing||0),y:Math.sin(e.facing||0)};}
function strike(g,e,w,index,d,kind,slot,{circle=false,fourth=false}={}){
 const a=e.state.ezraAttack;if(index!==2||a.phase!=='strike')a.at=g.time;a.phase='strike';
 if(fourth)a.until=g.time+.3;
 if(index===1){d=liveAim(g,e);a.angle=Math.atan2(d.y,d.x);a.spinDirection=e.state.ezraHammerDirection=-(e.state.ezraHammerDirection??-1);circle=true;}
 const range=w.range+rangeBonus(e),angle=[1,2].includes(index)?w.angle:circle?Math.PI*2:Math.PI,shape=circle?{kind:'circle',range}:{kind:'cone',range,spread:angle,angle:a.angle};
 // Drill's three damage ticks belong to one visible swing and one swing sound.
 if(index!==2||!a.sounded){g.emitSound('swing',e,{damageKind:kind,slot,stance:index,family:w.family,phase:index===3?'ezra-gauntlet':undefined,weight:index===4?1.6:1.1});a.sounded=true;}
 for(const t of[...g.units]){
  if(!g.hostile(e,t)||!g.clearLine(e,t))continue;
  const dx=t.x-e.x,dy=t.y-e.y,len=Math.hypot(dx,dy),along=dx*d.x+dy*d.y;
  if(len<=range+t.radius&&(circle||len<1e-8||along/len>=Math.cos(angle/2))){hit(g,e,t,w,index,kind,slot);if(fourth&&t.alive)g.status(t,'stun',1,1.3,e);}
 }
 if(index!==2||!a.drawn){g.effects.push({type:'slash',source:e.id,theme:'ezra',weaponIndex:index,damageKind:kind,slot,x:e.x,y:e.y,r:range,spread:angle,angle:a.angle,shape,life:index===2?.55:.28,maxLife:index===2?.55:.28});a.drawn=true;}
 if(index===1)g.effects.push({type:'ezraHammerGlow',source:e.id,theme:'ezra',weaponIndex:index,x:e.x,y:e.y,r:range,angle:a.angle,spinDirection:a.spinDirection,life:.28,maxLife:.28});
 if(index===2&&!a.electric){a.electric=true;g.emitSound('drill',e,{cue:'drillMotor',phase:'ezra-drill',family:'drill',damageKind:kind,slot,duration:.54});g.effects.push({type:'ezraElectric',source:e.id,theme:'ezra',weaponIndex:index,x:e.x,y:e.y,r:range,angle:a.angle,spread:angle,life:.55,maxLife:.55});}
 if(index===3){g.emitSound('slam',e,{phase:'ezra-landing',family:'punch',damageKind:kind,slot});g.effects.push({type:'ezraGravity',source:e.id,theme:'ezra',weaponIndex:index,x:e.x,y:e.y,r:range,life:.8,maxLife:.8});}
}
function perform(g,e,index,p,d,kind,slot){
 const w=weapon(g,e,index),serial=(e.state.ezraSerial||0)+1,fourth=index===4&&e.state.ultAttacks===4;
 e.state.ezraBusyUntil=g.time+(w.hits?((w.hits-1)*w.every):0);e.state.ezraSerial=serial;
 e.state.ezraAttack={weapon:index,angle:Math.atan2(d.y,d.x),at:g.time,startedAt:g.time,until:g.time+(index===1?.88:index===2?.6:.85),phase:index===3?'leap':movementWeapon(g,e,index)?'dash':'strike',fourth,serial};
 const valid=()=>e.alive&&e.state.ezraSerial===serial&&!g.stat(e,'stun'),apply=()=>{if(valid())strike(g,e,w,index,d,kind,slot,{circle:index===3||fourth,fourth});};
 if(index===0){
  const hits=new Set(),len=w.dash+rangeBonus(e);g.emitSound('swing',e,{damageKind:kind,slot,stance:index,family:w.family});
  g.effects.push({type:'thrust',source:e.id,theme:'ezra',weaponIndex:index,damageKind:kind,slot,x:e.x,y:e.y,r:len,angle:Math.atan2(d.y,d.x),shape:{kind:'rect',range:len,width:1.2,angle:Math.atan2(d.y,d.x)},life:.18,maxLife:.18});
  g.startMotion(e,d,len,{speed:44,maxSpeed:44,phaseEnemies:true,actionTag:'ezraGlove',onStep:(from,to)=>{if(!valid())return;for(const t of[...g.units])if(g.hostile(e,t)&&!hits.has(t.id)&&segmentDistance(t,from,to)<=t.radius+.6&&g.clearLine(e,t)){hits.add(t.id);hit(g,e,t,w,index,kind,slot);}},onComplete:()=>{if(valid())e.state.ezraAttack.phase='strike';}});
 }else if(index===1||index===2){
  e.attackCd=Math.max(e.attackCd,combatSeconds((w.hits-1)*w.every+.1));for(let i=0;i<w.hits;i++)if(i===0)apply();else g.schedule(e,i*w.every,apply);
 }else if(index===3){
  const landing=g.safeLanding(e,p,w.dash),len=Math.max(.001,distance(e,landing));g.startMotion(e,direction(e,landing),len,{kind:'leap',speed:len/.45,maxSpeed:Infinity,minDuration:.45,arcHeight:2.2,ignoreWalls:true,phaseEnemies:true,actionTag:'ezraSlam',onComplete:apply});
 }else{
  const len=Math.min(w.dash,distance(e,p)),done=()=>{apply();if(e.ammo<1)endUltimate(g,e);};if(len<.001)done();else g.startMotion(e,d,len,{speed:15,maxSpeed:15,phaseEnemies:true,actionTag:'ezraAxe',onComplete:done});
 }
}
export function basic(g,e,p,d){
 const index=currentIndex(g,e);if(index===4){e.state.ultAttacks=(e.state.ultAttacks||0)+1;perform(g,e,index,p,d,'basic');}
 else{e.state.ezraLastWeapon=index;perform(g,e,index,p,d,'basic');if(e.ammo<1)beginReload(g,e);else e.state.weapon=(index+1)%4;}e.range=weapon(g,e).range;
}
export function endUltimate(g,e){const saved=e.state.ezraNormal;if(!saved)return;delete e.buffs.ezraUlt;delete e.state.ezraNormal;e.state.ultAttacks=0;e.state.weapon=e.state.ezraLastWeapon??saved.weapon;e.ammo=saved.ammo;e.reloadProgress=saved.progress;e.state.ezraReloading=saved.reloading;e.range=weapon(g,e).range;if(e.ammo<1&&!e.state.ezraReloading)beginReload(g,e);}
export function cast(g,e,slot,p,d){
 if(slot==='q'){perform(g,e,e.state.ezraLastWeapon,p,d,'skill','q');return;}
 delete e.state.ezraAttack;e.state.ezraSerial=(e.state.ezraSerial||0)+1;e.state.ezraNormal={ammo:e.ammo,weapon:e.state.weapon,progress:e.reloadProgress,reloading:Boolean(e.state.ezraReloading)};delete e.state.ezraReloading;e.reloadProgress=0;e.state.ultAttacks=0;g.addBuff(e,'ezraUlt',EZRA.rDuration,{copy:false});e.ammo=EZRA.ammo;e.range=EZRA_AXE.range;
}
export function tick(g,e,dt){
 if(e.key!=='ezra')return;if(e.state.ezraNormal&&!ultimate(g,e))endUltimate(g,e);
 const a=e.state.ezraAttack;if(a?.weapon===1&&a.until>g.time){const d=liveAim(g,e);a.angle=Math.atan2(d.y,d.x);}
 if(!ultimate(g,e)&&e.state.ezraReloading){e.reloadProgress+=dt*EZRA.reload/reloadDuration(g,e);if(e.reloadProgress+1e-8>=EZRA.reload){e.ammo=EZRA.ammo;e.state.weapon=0;e.reloadProgress=0;delete e.state.ezraReloading;g.emitSound('reload',e,{family:'metal'});}}
 if(ultimate(g,e)&&e.ammo<1&&!e.motion)endUltimate(g,e);e.range=weapon(g,e).range;
}
export function onDeath(g,e){if(e.key!=='ezra')return;delete e.buffs.ezraUlt;for(const k of['ezraNormal','ezraReloading','ezraAttack'])delete e.state[k];e.state.ezraSerial=(e.state.ezraSerial||0)+1;e.reloadProgress=0;}
