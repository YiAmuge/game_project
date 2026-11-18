import {soleil} from './bough-effects.js';
export const SOLEIL={charge:1.5,range:3,width:3,damage:240,extraRange:3,extraDamage:45,slow:.15,slowTime:1.5,shield:.06,shieldTime:2};
export const active=soleil;
export function cancel(e){if(e.state)delete e.state.soleilCharge;}
export function attack(g,e,p){
 if(e.ammo<1)return false;
 if(e.state.soleilGarde){delete e.state.soleilGarde;return strike(g,e,p,true);}
 e.state.soleilCharge??={at:g.time,aim:{...p}};e.lastAttackAt=g.time;return true;
}
function strike(g,e,p,garde){
 const d=g.aim(e,p),range=SOLEIL.range+(garde?SOLEIL.extraRange:0);const root=Boolean(e.state.fistRoot);delete e.state.fistRoot;cancel(e);g.cancelRecall(e);e.state.fullAmmo=e.ammo>=1;e.ammo=0;e.reloadProgress=0;e.attackCd=1;e.attackAt=e.lastAttackAt=g.time;e.attackSerial=(e.attackSerial||0)+1;e.facing=e.attackFacing=Math.atan2(d.y,d.x);e.state.soleilStrike={at:g.time,garde,angle:e.facing};e.revealedUntil=g.time+1.25;e.healingEvent={key:`basic-${e.id}-${e.attackSerial}`,at:g.time};
 g.emitSound('swing',e,{family:'punch',phase:garde?'garde':'soleil'});
 g.action(e,'basic',()=>{for(const t of [...g.units]){
  if(!g.hostile(e,t)||!g.clearLine(e,t))continue;
  const dx=t.x-e.x,dy=t.y-e.y,along=dx*d.x+dy*d.y,side=Math.abs(dx*d.y-dy*d.x);
  if(Math.hypot(Math.max(0,-along,along-range),Math.max(0,side-SOLEIL.width/2))>t.radius)continue;
  g.deal(e,t,SOLEIL.damage);if(root&&t.alive)g.status(t,'root',1,.8,e);if(garde&&t.alive){g.deal(e,t,SOLEIL.extraDamage,{fixed:true,proc:false});g.status(t,'slow',SOLEIL.slow,SOLEIL.slowTime,e);}
 }});
 if(garde)g.addShield(e,e.maxHp*SOLEIL.shield,`garde-${e.id}`,SOLEIL.shieldTime,false);
 g.effects.push({type:'thrust',source:e.id,theme:e.key,damageKind:'basic',x:e.x,y:e.y,r:range,angle:e.facing,shape:{kind:'rect',range,width:SOLEIL.width,angle:e.facing},life:.3,maxLife:.3});return true;
}
export function release(g,e,p){
 if(!active(e)||!e.state.soleilCharge)return false;const charge=e.state.soleilCharge;
 if(!e.alive||g.stat(e,'stun')||g.stat(e,'disarm')||e.motion||e.channelUntil>g.time){cancel(e);return false;}
 return strike(g,e,p||charge.aim,g.time-charge.at+1e-8>=SOLEIL.charge);
}
export function tick(g,e){if(!active(e)||!e.state.soleilCharge)return;if(!e.alive||g.stat(e,'stun')||g.stat(e,'disarm')||e.motion||e.recall){cancel(e);return;}e.lastAttackAt=g.time;if(e.player)e.state.soleilCharge.aim={...g.input.aim};else if(g.time-e.state.soleilCharge.at>=SOLEIL.charge)release(g,e,e.state.soleilCharge.aim);}
