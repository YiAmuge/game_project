import {BUFFET as P,buffetInfo} from './buffet-data.js';
import {distance} from './geometry.js';
export const CONTROL_KEYS=new Set(['stun','root','silence','disarm','slow','taunt','captured','netCapture','knock']);
export const active=e=>e?.key==='ppui'&&Boolean(e.buffet);
export const storm=(g,e)=>active(e)&&e.state.buffetR?.until>g.time;
export const eligible=(g,e)=>e?.key==='ppui'&&!active(e)&&e.goldenBough&&(e.ppuiHealing||0)>=100000;
export const abilityInfo=(g,e)=>active(e)?buffetInfo():{};
const effect=(g,e,type,more={})=>g.effects.push({source:e.id,theme:'ppui',type,x:e.x,y:e.y,life:.5,maxLife:.5,...more});
export function transform(g,e){
 const ratio=e.hp/e.maxHp;e.buffet=true;e.name='뷔페';delete e.state.nailStorm;delete e.state.ppuiCharges;delete e.state.ppuiReady;delete e.state.buffetAwakening;e.channelUntil=g.time;e.qCd=e.rCd=e.attackCd=0;e.armor=P.armor;e.range=P.range;e.maxHp=g.maxHp(e);e.hp=Math.max(1,e.maxHp*ratio);e.ammo=g.ammoCap(e);e.reloadProgress=0;e.recall=undefined;effect(g,e,'buffetAwaken',{r:4,life:.85,maxLife:.85});g.emitSound('ultimate',e,{slot:'r',family:'organic',phase:'buffet-awaken'});
}
export function begin(g,e){
 if(!eligible(g,e)||!e.alive||e.recall||e.motion||g.hidden(e)||g.stat(e,'stun')||g.stat(e,'silence')||e.channelUntil>g.time)return false;
 e.state.buffetAwakening={at:g.time,until:g.time+1.5,x:e.x,y:e.y};e.channelUntil=g.time+1.5;if(e.player)g.input.fire=false;return true;
}
export function cancel(g,e){if(!e.state?.buffetAwakening)return false;delete e.state.buffetAwakening;e.channelUntil=Math.min(e.channelUntil||0,g.time);return true;}
export function rescue(g,t,amount){
 if(amount<t.hp||t.kind!=='champion'||!t.alive||t.state.posthumous)return false;
 const healer=g.champions(t.team).filter(e=>active(e)&&e!==t&&e.alive&&!e.state.posthumous&&(e.buffetRescueReady||0)<=g.time&&distance(e,t)<=P.passiveRange).sort((a,b)=>distance(a,t)-distance(b,t)||a.id-b.id)[0];
 if(!healer)return false;healer.buffetRescueReady=g.time+P.rescueCooldown;t.hp=t.maxHp*.5;effect(g,healer,'buffetRescue',{x:t.x,y:t.y,target:t.id,r:1.2});g.support(healer);return true;
}
export function shareHealing(g,e,actual){
 if(actual<=0)return;for(const a of g.champions(e.team))if(a!==e&&a.alive&&!a.state.posthumous&&distance(e,a)<=P.passiveRange)g.heal(e,a,actual,false,{skillHeal:true});
}
export function drain(g,e,amount){return g.heal(e,e,amount,false,{lifesteal:true});}

function coneTargets(g,e,d,range,angle){return g.units.filter(t=>g.hostile(e,t)&&distance(e,t)<=range+t.radius&&g.clearLine(e,t)).filter(t=>{const n=distance(e,t)||1;return ((t.x-e.x)*d.x+(t.y-e.y)*d.y)/n+1e-8>=Math.cos(angle/2);});}
function strike(g,e,d,enhanced){
 const range=enhanced?P.rRange:g.attackRange(e),angle=enhanced?P.rAngle:P.angle,ratio=enhanced?P.rTrueRatio:P.trueRatio;e.state.buffetWhip={at:g.time,angle:Math.atan2(d.y,d.x),enhanced};
 for(const t of coneTargets(g,e,d,range,angle)){const shield=g.shield(t),actual=g.deal(e,t,P.damage,{damageKind:'basic',sound:{family:'whip',phase:'buffet-whip'}}),total=actual+Math.max(0,shield-g.shield(t));if(total<=0)continue;if(t.alive)g.deal(e,t,total*ratio,{fixed:true,proc:false,damageKind:'basic',augmentOrigin:'buffet'});drain(g,e,total*ratio);if(enhanced&&t.alive){const hits=e.state.buffetR?.hits;if(hits){hits[t.id]=(hits[t.id]||0)+1;if(hits[t.id]%10===0)g.status(t,'root',1,.5,e);}}}
 effect(g,e,'buffetSlash',{r:range,angle:Math.atan2(d.y,d.x),spread:angle,enhanced,life:.2,maxLife:.2});g.emitSound('swing',e,{family:'whip',phase:'buffet-whip'});
}
export function attack(g,e,p,{automatic=false}={}){
 const enhanced=storm(g,e);if(enhanced&&!automatic||e.state.buffetBurst||!enhanced&&e.ammo<1)return false;
 const d=g.aim(e,p);if(!enhanced)e.ammo--;g.cancelRecall(e);e.attackCd=enhanced?P.rInterval:P.interval;e.attackAt=e.lastAttackAt=g.time;e.attackSerial=(e.attackSerial||0)+1;e.attackFacing=e.facing=Math.atan2(d.y,d.x);
 e.state.buffetBurst={d,enhanced,left:2,next:g.time+P.every};g.action(e,'basic',()=>strike(g,e,d,enhanced));return true;
}
export function finish(g,e){
 const s=e.state.buffetR;if(!s)return false;delete e.state.buffetR;delete e.state.buffetBurst;e.attackCd=0;
 if(!e.alive)return true;
 g.action(e,'skill',()=>{for(const t of coneTargets(g,e,s.d,P.rRange,P.rAngle)){const before=g.shield(t),actual=g.deal(e,t,P.rDamage,{fixed:true,sound:{slot:'r',family:'whip',phase:'buffet-wave'}}),dealt=actual+Math.max(0,before-g.shield(t));if(dealt>0){drain(g,e,dealt*.5);g.status(t,'stun',1,.5,e);if(t.alive&&t.hp/t.maxHp<.1)g.kill(t,e);}}});effect(g,e,'buffetWave',{angle:Math.atan2(s.d.y,s.d.x),r:P.rRange,spread:P.rAngle,life:.45,maxLife:.45});g.emitSound('swing',e,{slot:'r',family:'whip',phase:'buffet-wave'});return true;
}
export const validate=(g,e,slot)=>!e.state.buffetQ;
export function cast(g,e,slot,p){
 if(slot==='r'){if(storm(g,e))return finish(g,e);const d=g.aim(e,p);e.state.buffetR={at:g.time,until:g.time+P.rDuration,next:g.time,d,hits:{}};for(const key of CONTROL_KEYS)delete e.status[key];delete e.state.netTrap;return true;}
 const q={at:g.time,until:g.time+P.qCharge};e.state.buffetQ=q;e.channelUntil=q.until;effect(g,e,'buffetCharge',{r:P.qRange,life:P.qCharge,maxLife:P.qCharge});g.emitSound('cast',e,{slot:'q',family:'organic',phase:'buffet-q'});return true;
}
export function tick(g,e){
 const a=e.state.buffetAwakening;if(a){if(!e.alive||g.stat(e,'stun')||g.stat(e,'silence')||e.motion||distance(e,a)>.1)cancel(g,e);else if(g.time+1e-8>=a.until)transform(g,e);}
 if(!active(e))return;
 const q=e.state.buffetQ;if(q){if(g.stat(e,'stun')||g.stat(e,'silence')){delete e.state.buffetQ;e.channelUntil=g.time;}else if(g.time+1e-8>=q.until){delete e.state.buffetQ;g.addBuff(e,'buffetStride',P.qDuration);e.phaseEnemiesUntil=Math.max(e.phaseEnemiesUntil||0,g.time+P.qDuration);const targets=g.champions(1-e.team).filter(t=>g.hostile(e,t)&&distance(e,t)<=P.qRange+t.radius&&g.clearLine(e,t)).sort((a,b)=>distance(e,a)-distance(e,b)||a.id-b.id);for(const [i,t]of targets.entries()){const hit=()=>{if(!t.alive||g.hidden(t))return;g.action(e,'skill',()=>{const before=g.shield(t),actual=g.deal(e,t,P.qDamage,{sound:{slot:'q',family:'needle',phase:'buffet-nail'}});drain(g,e,(actual+Math.max(0,before-g.shield(t)))*.2);});effect(g,e,'buffetNail',{x:t.x,y:t.y,target:t.id,life:.28,maxLife:.28});};if(i===0)hit();else g.schedule(e,i*.2,hit);}}}
 const b=e.state.buffetBurst;if(b){if(g.stat(e,'stun')||g.stat(e,'disarm'))delete e.state.buffetBurst;else while(b.left>0&&b.next<=g.time+1e-8){b.left--;b.next+=P.every;g.action(e,'basic',()=>strike(g,e,b.d,b.enhanced));}if(!b.left)delete e.state.buffetBurst;}
 const s=e.state.buffetR;if(s){if(g.time+1e-8>=s.until){finish(g,e);return;}if(s.next<=g.time+1e-8&&!e.state.buffetBurst){s.next+=P.rInterval;g.action(e,'basic',()=>attack(g,e,{x:e.x+s.d.x*P.rRange,y:e.y+s.d.y*P.rRange},{automatic:true}));}}
}
