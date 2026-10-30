import{distance}from'./geometry.js';
import{settleBody}from'./collision.js';
export const PPUI={range:7,passiveCooldown:15,passiveHeal:150,healthRatio:.015,qHeal:25,qDuration:3,qEvery:.3,qCharges:2};
export const CONTROL_KEYS=new Set(['stun','root','silence','disarm','slow','taunt','captured','netCapture','knock']);
export function init(g,e){if(e.key==='ppui'){e.state.ppuiCharges=2;e.state.ppuiReady=Infinity;}}
export function charges(g,e){const s=e.state,current=s.ppuiCharges??2;return{current,max:2,remaining:current<2&&Number.isFinite(s.ppuiReady)?Math.max(0,s.ppuiReady-g.time):0};}
export function interceptControl(g,target,key,source){
 if(!CONTROL_KEYS.has(key)||target.kind!=='champion'||!target.alive||source?.team===target.team)return false;
 const healer=g.champions(target.team).filter(e=>e.key==='ppui'&&e.alive&&!e.state.posthumous&&(e.passiveReady||0)<=g.time&&distance(e,target)<=PPUI.range).sort((a,b)=>distance(a,target)-distance(b,target)||a.id-b.id)[0];
 if(!healer)return false;healer.passiveReady=g.time+PPUI.passiveCooldown;
 for(const k of CONTROL_KEYS)delete target.status[k];
 for(const k of['netTrap','swordHeldBy','kromerHeldBy','tauntedBy'])delete target.state[k];
 for(const owner of g.champions())for(const k of['swordGrab','kromerGrab'])if(owner.state[k]?.target===target)delete owner.state[k];
 if(target.motion?.forced){const from=target.motion.lastClear;delete target.motion;settleBody(g,target,from);}
 g.heal(healer,target,PPUI.passiveHeal+target.maxHp*PPUI.healthRatio,true,{skillHeal:true});target.supporters[healer.id]=g.time;
 g.effects.push({type:'ring',source:healer.id,x:target.x,y:target.y,r:1.2,color:'#fff0ed',life:.4,maxLife:.4});g.support(healer);return true;
}
export function cast(g,e){const s=e.state;s.ppuiCharges=(s.ppuiCharges??2)-1;if(!Number.isFinite(s.ppuiReady))s.ppuiReady=g.time+g.cooldown(e,'q');syncCooldown(g,e);
 for(const t of g.champions(e.team).filter(t=>t.alive&&!t.state.posthumous&&distance(e,t)<=PPUI.range)){(t.state.ppuiMending??={})[e.id]={source:e,until:g.time+PPUI.qDuration,next:g.time+PPUI.qEvery,healingEvent:e.healingEvent};g.addBuff(t,'ppuiMending',PPUI.qDuration,{copy:false});t.supporters[e.id]=g.time;}
 g.effects.push({type:'ring',source:e.id,x:e.x,y:e.y,r:PPUI.range,color:'#efadb5',life:.6,maxLife:.6});g.support(e);
}
function syncCooldown(g,e){e.qCd=(e.state.ppuiCharges??2)>0?0:Math.max(0,e.state.ppuiReady-g.time);}
export function tick(g,e){
 if(e.key==='ppui'){const s=e.state;while((s.ppuiCharges??2)<2&&s.ppuiReady<=g.time+1e-8){s.ppuiCharges++;s.ppuiReady=s.ppuiCharges<2?s.ppuiReady+g.cooldown(e,'q'):Infinity;}syncCooldown(g,e);}
 for(const [id,b]of Object.entries(e.state.ppuiMending||{})){while(e.alive&&b.next<=Math.min(g.time,b.until)+1e-8){b.next+=PPUI.qEvery;g.heal(b.source,e,PPUI.qHeal+e.maxHp*PPUI.healthRatio,true,{skillHeal:true,healingKey:b.healingEvent?.key,startedAt:b.healingEvent?.at});}if(b.next>b.until+1e-8)delete e.state.ppuiMending[id];}
 if(e.state.ppuiMending&&!Object.keys(e.state.ppuiMending).length){delete e.state.ppuiMending;delete e.buffs.ppuiMending;}
}
