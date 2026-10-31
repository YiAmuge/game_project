import{RULES,RUNTIME_CHAMPIONS,FOUNTAIN_AREAS,upgradeRate,FAN_ANGLE}from'./data.js';
import{distance,direction,clamp}from'./geometry.js';
import{settleBody,moveBody}from'./collision.js';
export const NOSFERATU={lifesteal:.25,capacity:1200,cost:100,qRange:6.8,qDamage:35,batDuration:5,bats:4,batDamage:35,batEvery:.5,batRange:2.5,leash:8,basicDamage:160,basicRange:1.7,bladeWidth:2*3.3*Math.sin(FAN_ANGLE/2)-2,bladeRange:6.8,bladeDamage:80,rRange:7.5,rDuration:10,rEvery:.5,rDrain:.045,rAttackEvery:.35,rLifesteal:.4,rSize:1.15,rFeast:.3};
export const bloodfiend=(g,e)=>e.key==='nosferatu'&&Boolean(e.state?.bloodfiend);
export function healthRatio(g,e){return Math.max(1,(1+RUNTIME_CHAMPIONS.nosferatu.growth.health*(e.level-1))*(1+upgradeRate(e,'health'))*(1+g.nosHealthAugments(e)));}
export const capacity=(g,e)=>NOSFERATU.capacity+Math.max(0,healthRatio(g,e)-1)*2000;
export const powerBonus=(g,e)=>Math.max(0,healthRatio(g,e)-1)*.4;
export const recast=(g,e,slot)=>e.key==='nosferatu'&&slot==='r'&&bloodfiend(g,e);
export const validBatPoint=(g,e,p)=>!FOUNTAIN_AREAS.some(z=>z.team!==e.team&&p.x>=z.x-e.radius&&p.x<=z.x+z.w+e.radius&&p.y>=z.y-e.radius&&p.y<=z.y+z.h+e.radius);
export function ejectBat(g,e){
 if(validBatPoint(g,e,e))return;
 const z=FOUNTAIN_AREAS[1-e.team],r=e.radius+.025,points=[{x:z.x-r,y:clamp(e.y,z.y-r,z.y+z.h+r)},{x:z.x+z.w+r,y:clamp(e.y,z.y-r,z.y+z.h+r)},{x:clamp(e.x,z.x-r,z.x+z.w+r),y:z.y-r},{x:clamp(e.x,z.x-r,z.x+z.w+r),y:z.y+z.h+r}].sort((a,b)=>distance(e,a)-distance(e,b));
 const owner=g.units.find(o=>o.id===e.owner),p=points.find(p=>validBatPoint(g,e,p)&&!g.blocked(p.x,p.y,e.radius))||owner;if(p)Object.assign(e,{x:p.x,y:p.y});delete e.motion;e.fountainTick=0;
}
export function validate(g,e,slot,p){if(slot==='q')return(e.state.bloodFeast||0)>=NOSFERATU.cost&&validBatPoint(g,e,p);return bloodfiend(g,e)||!g.stat(e,'root')&&!g.stat(e,'captured');}
export function afterDamage(g,e,t,actual,kind){
 if(e.key!=='nosferatu'||e.kind!=='champion'||e.team===t.team||actual<=0||!e.alive)return;
 if(e.state.bloodfiend&&e.state.bloodStriking&&kind==='basic')e.state.bloodfiend.damage=(e.state.bloodfiend.damage||0)+actual;
 if(!e.state.batStriking)e.state.lastBloodTarget=t.id;const amount=actual*(bloodfiend(g,e)?NOSFERATU.rLifesteal:NOSFERATU.lifesteal);g.heal(e,e,amount,false);e.state.bloodFeast=Math.min(capacity(g,e),(e.state.bloodFeast||0)+amount);
}
export const basicBonus=e=>1+Math.min(5,Math.floor((e.state.bloodFeast||0)/200))*.05;
export function basic(g,e,d){
 const bonus=basicBonus(e);
 if(bloodfiend(g,e)){const form=e.state.bloodfiend;e.state.bloodStriking=true;try{for(const t of [...g.units]){if(e.state.bloodfiend!==form)break;if(g.hostile(e,t)&&distance(e,t)<=g.attackRange(e)+t.radius&&g.clearLine(e,t))g.deal(e,t,NOSFERATU.basicDamage*bonus,{damageKind:'basic'});}}finally{delete e.state.bloodStriking;}g.effects.push({type:'bloodCleave',source:e.id,theme:e.key,x:e.x,y:e.y,r:g.attackRange(e),angle:e.facing,shape:{kind:'circle',range:g.attackRange(e)},life:.3,maxLife:.3});}
 else{g.cone(e,d,g.attackRange(e),FAN_ANGLE,NOSFERATU.basicDamage*bonus);g.bullet(e,d,NOSFERATU.bladeDamage*bonus,NOSFERATU.bladeRange+(g.attackRange(e)-NOSFERATU.basicRange),{bloodBlade:true,speed:17,width:(NOSFERATU.bladeWidth/2+Math.max(0,g.attackRange(e)-NOSFERATU.basicRange)*Math.sin(FAN_ANGLE/2))/1.1});}
}
export function restore(g,e){
 if(e.key!=='nosferatu')return false;const s=e.state?.bloodfiend;if(!s)return false;delete e.state.bloodfiend;delete e.buffs.bloodfiend;e.phaseEnemiesUntil=0;delete e.motion;e.hp=Math.min(e.maxHp,s.hp);e.radius=s.radius??.48;e.state.bloodFeast=Math.min(capacity(g,e),s.feast+(s.damage||0)*NOSFERATU.rFeast);e.attackCd=0;
 for(const owner of g.champions())for(const key of ['swordGrab','kromerGrab'])if(owner.state[key]?.target===e){delete owner.state[key];if(e.status.stun?.grabOwner===owner.id)delete e.status.stun;}delete e.state.swordHeldBy;delete e.state.kromerHeldBy;delete e.state.netTrap;delete e.status.netCapture;
 Object.assign(e,{x:s.x,y:s.y});settleBody(g,e,s);g.effects.push({type:'bloodReturn',source:e.id,theme:e.key,x:e.x,y:e.y,r:2,life:.7,maxLife:.7});return true;
}
export function cast(g,e,slot,p){
 if(slot==='q'){
  e.state.bloodFeast-=NOSFERATU.cost;const army=g.units.filter(t=>t.bloodBat&&t.owner===e.id&&t.alive).sort((a,b)=>a.id-b.id);while(army.length>=NOSFERATU.bats){const old=army.shift();old.alive=false;old.hp=0;}
  const point=g.safeLanding(e,p,NOSFERATU.qRange),b=g.entity({kind:'trooper',bloodBat:true,key:'nosferatu',owner:e.id,team:e.team,x:point.x,y:point.y,radius:.22,maxHp:e.maxHp*.5,armor:0,until:g.time+NOSFERATU.batDuration,nextStrike:g.time,snapshot:{speed:g.speed(e)*.8,power:RULES.power[RUNTIME_CHAMPIONS.nosferatu.power]*.9*g.powerScale(e)*.5},name:'핏빛 박쥐'});ejectBat(g,b);
  for(const t of [...g.units])if(t!==b&&g.hostile(e,t)&&distance(t,b)<=.75+t.radius&&g.clearLine(b,t))g.deal(e,t,NOSFERATU.qDamage,{damageKind:'skill'});
 }else if(bloodfiend(g,e))restore(g,e);
 else{e.state.bloodfiend={radius:e.radius,damage:0,x:e.x,y:e.y,hp:e.hp,feast:e.state.bloodFeast||0,at:g.time,until:g.time+NOSFERATU.rDuration,nextDrain:g.time+NOSFERATU.rEvery,nextAttack:g.time};e.radius*=NOSFERATU.rSize;Object.assign(e,g.safeLanding(e,p,NOSFERATU.rRange));e.hp=e.maxHp;e.phaseEnemiesUntil=g.time+NOSFERATU.rDuration;g.addBuff(e,'bloodfiend',NOSFERATU.rDuration,{copy:false});e.attackCd=0;}
}
export function tick(g,e){
 if(e.key!=='nosferatu'||e.bloodBat)return;e.state.bloodFeast=Math.min(capacity(g,e),e.state.bloodFeast||0);
 const s=e.state.bloodfiend;if(!s)return;if(g.time>=s.until-1e-8){restore(g,e);return;}
 while(g.time+1e-8>=s.nextDrain){s.nextDrain+=NOSFERATU.rEvery;e.hp=Math.max(0,e.hp-e.maxHp*NOSFERATU.rDrain);if(e.hp<=0){restore(g,e);return;}}
 if(g.time+1e-8>=s.nextAttack){if(e.attackCd>1e-8)return;e.attackCd=0;s.nextAttack=g.time+NOSFERATU.rAttackEvery;g.attack(e,{x:e.x+Math.cos(e.facing||0),y:e.y+Math.sin(e.facing||0)});}
}
export function tickBat(g,b,dt){
 const owner=g.units.find(e=>e.id===b.owner&&e.alive);if(!owner||g.time>=b.until){b.alive=false;b.hp=0;return;}ejectBat(g,b);if(g.stat(b,'stun'))return;
 const candidates=g.units.filter(t=>t!==b&&g.hostile(owner,t)&&g.visibleTo(b.team,t)&&distance(owner,t)<=NOSFERATU.leash+t.radius&&g.clearLine(b,t));
 const target=candidates.find(t=>t.id===owner.state.lastBloodTarget)||candidates.sort((a,c)=>distance(b,a)-distance(b,c)||a.id-c.id)[0];
 const goal=distance(b,owner)>NOSFERATU.leash?owner:target||owner;
 if(target&&distance(b,owner)<=NOSFERATU.leash&&distance(b,target)<=NOSFERATU.batRange+target.radius&&!g.stat(b,'disarm')){
  if(g.time>=b.nextStrike){b.nextStrike=g.time+NOSFERATU.batEvery;b.facing=Math.atan2(target.y-b.y,target.x-b.x);b.struckAt=g.time;owner.state.batStriking=true;try{g.deal(owner,target,NOSFERATU.batDamage*b.snapshot.power,{rawPower:true,damageKind:'skill',sound:{slot:'q',element:'blood'}});}finally{delete owner.state.batStriking;}g.effects.push({type:'bloodBatHit',source:owner.id,target:target.id,theme:owner.key,x:target.x,y:target.y,life:.22,maxLife:.22});}
 }else if(!g.stat(b,'root')&&distance(b,goal)>.5){const d=direction(b,goal),step=Math.min(distance(b,goal),b.snapshot.speed*dt),next={x:b.x+d.x*step,y:b.y+d.y*step};if(validBatPoint(g,b,next))moveBody(g,b,d.x*step,d.y*step,{phaseEnemies:true});}
 if(distance(b,owner)>NOSFERATU.leash+.01){const d=direction(owner,b),point={x:owner.x+d.x*(NOSFERATU.leash-.1),y:owner.y+d.y*(NOSFERATU.leash-.1)};if(validBatPoint(g,b,point)&&!g.blocked(point.x,point.y,b.radius))Object.assign(b,point);else Object.assign(b,{x:owner.x,y:owner.y});}ejectBat(g,b);
}
export function onDeath(g,e){if(e.key!=='nosferatu')return;for(const b of g.units)if(b.bloodBat&&b.owner===e.id){b.alive=false;b.hp=0;}}
