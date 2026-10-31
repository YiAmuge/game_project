import{has}from'./augments.js';
import{RULES,RUNTIME_CHAMPIONS}from'./data.js';
import{damageBonus}from'./skills.js';
export const QUEEN={heal:.4,shieldCap:.15,shieldTime:2,basicDamage:170,basicRange:6.5,basicSpeed:13,basicWidth:.28,allySpeed:1.3,allyRange:1.2,allyDamage:15,qDelay:1.5,qRange:7.7,qWidth:4.2,qDamage:115,qHits:4,qEvery:.25,qSpeed:.17,qSpeedTime:1.8,stageTime:1.25};
export const ARCANA_STAGES=[{range:15,width:3.5,every:.33,damage:115,hits:2},{range:30,width:3.5,every:.33,damage:120,hits:3},{range:45,width:4.5,every:.25,damage:125,hits:4},{range:60,width:5,every:.2,damage:130,hits:5}];
export const stage=(g,e)=>Math.min(3,Math.max(0,Math.floor((g.time-(e.state.queenR?.at??g.time)+1e-8)/QUEEN.stageTime)));
export const recast=(g,e,slot)=>e.key==='queen'&&(slot==='q'?e.state.queenQ?.phase==='preparing'&&!e.state.queenQ.redirected:e.state.queenR?.phase==='charging');
export const channelRecast=(g,e,slot)=>slot==='r'&&recast(g,e,slot);
export function validate(g,e,slot){return !e.state.queenR||slot==='r'&&recast(g,e,slot);}
// Ally contact converts the outgoing attack into healing before armor; it never damages allies.
export function healHit(g,e,t,base,kind='skill'){
 if(t===e||t.kind!=='champion'||t.team!==e.team||!t.alive||g.hidden(t)||t.state.posthumous)return 0;
 const value=base*RULES.power[RUNTIME_CHAMPIONS[e.key].power]*.9*g.powerScale(e)*(1-g.powerWeak(e))*damageBonus(g,e,t)*QUEEN.heal;
 const missing=Math.max(0,t.maxHp-t.hp),actual=g.heal(e,t,value,false,{skillHeal:true});
 const overflow=Math.max(0,value-missing);if(overflow>0){const id=`queen-love-${e.id}`,old=t.shields.find(s=>s.source===id&&s.until>g.time)?.value||0;g.addShield(t,Math.min(t.maxHp*QUEEN.shieldCap,old+overflow),id,QUEEN.shieldTime);}
 e.lastCombat=g.time;g.effects.push({type:'queenHeal',source:e.id,target:t.id,x:t.x,y:t.y,life:.4,maxLife:.4});return actual;
}
export function projectileContact(g,p,t){
 if(!p.queenStar||t.team!==p.source.team)return false;
 healHit(g,p.source,t,p.damage,'basic');
 if(!p.allyBoosted){p.allyBoosted=true;p.speed*=QUEEN.allySpeed;p.remaining+=QUEEN.allyRange;p.damage+=QUEEN.allyDamage;}
 return true;
}
export function basic(g,e,d){g.bullet(e,d,QUEEN.basicDamage,g.attackRange(e),{queenStar:true,allowFriendly:true,pierce:Infinity,width:QUEEN.basicWidth,speed:QUEEN.basicSpeed});}
function angleFrom(g,e,origin,aim){const d=g.aim(origin,aim||{x:origin.x+Math.cos(e.facing||0),y:origin.y+Math.sin(e.facing||0)});return Math.atan2(d.y,d.x);}
function beam(g,e,state,spec,slot){
 const d={x:Math.cos(state.angle),y:Math.sin(state.angle)};
 for(const t of [...g.units]){if(!t.alive||g.hidden(t)||t===e)continue;const dx=t.x-state.x,dy=t.y-state.y,along=dx*d.x+dy*d.y,side=Math.abs(dx*d.y-dy*d.x);if(along<0||along>spec.range+t.radius||side>spec.width/2+t.radius)continue;
  if(t.team===e.team){if(t.kind==='champion')healHit(g,e,t,spec.damage);}
  else if(g.hostile(e,t)&&(slot==='r'||g.clearLine(state,t)))g.deal(e,t,spec.damage*(slot==='r'&&['tower','core'].includes(t.kind)?.3:1),{damageKind:'skill',sound:{slot,element:'arcane'}});
 }
 g.effects.push({type:'arcanaBeam',source:e.id,theme:'queen',slot,x:state.x,y:state.y,angle:state.angle,range:spec.range,width:spec.width,stage:slot==='r'?state.stage:0,life:spec.every+.12,maxLife:spec.every+.12});g.emitSound('shot',e,{slot,element:'arcane',phase:'arcana-beam',weight:slot==='r'?1.5:1});
}
export function release(g,e,aim){const s=e.state.queenR;if(s?.phase!=='charging')return false;s.stage=stage(g,e);s.phase='firing';s.angle=angleFrom(g,e,s,aim||s.aim);s.next=g.time;s.hits=0;s.firedAt=g.time;const spec=ARCANA_STAGES[s.stage];e.channelUntil=g.time+(spec.hits-1)*spec.every+.08;return true;}
export function cast(g,e,slot,p,d){
 if(slot==='q'){
  const old=e.state.queenQ;if(old?.phase==='preparing'&&!old.redirected){old.angle=angleFrom(g,e,old,p);old.redirected=true;return;}
  e.state.queenQ={phase:'preparing',at:g.time,next:g.time+QUEEN.qDelay,x:e.x+d.x*.75,y:e.y+d.y*.75,angle:Math.atan2(d.y,d.x),hits:0,redirected:false};g.addBuff(e,'arcanaStride',QUEEN.qSpeedTime);
 }else if(recast(g,e,'r'))release(g,e,p);
 else{e.state.queenR={phase:'charging',x:e.x,y:e.y,angle:Math.atan2(d.y,d.x),aim:{...p},at:g.time};e.channelUntil=g.time+QUEEN.stageTime*3+1;if(has(e,'battleHaste')){g.addBuff(e,'augBattleHaste',.1,{copy:false});e.visuals.battleHaste={at:g.time,until:g.time+1};}}
}
export function cancel(g,e){if(e.state?.queenR){delete e.state.queenR;e.channelUntil=0;}}
export function tick(g,e){
 if(e.key!=='queen')return;
 const q=e.state.queenQ;if(q){while(q.hits<QUEEN.qHits&&g.time+1e-8>=q.next){q.phase='firing';q.next+=QUEEN.qEvery;beam(g,e,q,{range:QUEEN.qRange,width:QUEEN.qWidth,damage:QUEEN.qDamage,every:QUEEN.qEvery},'q');q.hits++;}if(q.hits>=QUEEN.qHits&&g.time>=q.next)delete e.state.queenQ;}
 const r=e.state.queenR;if(!r)return;if(g.stat(e,'stun')||g.stat(e,'silence')||e.motion?.forced){cancel(g,e);return;}
 if(r.phase==='charging'){if(e.player){r.aim={...g.input.aim};r.angle=angleFrom(g,e,r,r.aim);}if(stage(g,e)<3)return;release(g,e,r.aim);}
 const spec=ARCANA_STAGES[r.stage];while(r.hits<spec.hits&&g.time+1e-8>=r.next){r.next+=spec.every;beam(g,e,r,spec,'r');r.hits++;}if(r.hits>=spec.hits&&g.time>=r.next){delete e.state.queenR;e.channelUntil=0;}
}

// Shared by local and network renderers; only Q's footprint has delayed enemy visibility.
export function telegraph(g,e,slot,viewerTeam=g.player.team){
 const s=e.state[slot==='q'?'queenQ':'queenR'];if(!s)return null;
 if(slot==='q'&&viewerTeam!==e.team&&g.time<s.at+QUEEN.qDelay-.5-1e-8)return null;
 const spec=slot==='q'?{range:QUEEN.qRange,width:QUEEN.qWidth}:ARCANA_STAGES[s.phase==='charging'?stage(g,e):s.stage];
 return {x:s.x,y:s.y,angle:s.angle,range:spec.range,width:spec.width,slot};
}
export function cameraView(g,e,width,height){
 const s=e?.key==='queen'&&e.state.queenR;if(s?.phase!=='charging')return 1;
 const elapsed=Math.max(0,g.time-s.at),progress=Math.min(1,elapsed/(QUEEN.stageTime*3));
 if(!width||!height)return 1+3*progress;
 const range=15+45*progress,halfWidth=ARCANA_STAGES[stage(g,e)].width/2,scale=Math.max(width/32,height/21),dx=Math.abs(Math.cos(s.angle)),dy=Math.abs(Math.sin(s.angle)),vertical=g.training25d?.786:1;
 const fit=Math.max(1,2*(dx*range+dy*halfWidth)*scale/(width*.9),2*(dy*range+dx*halfWidth)*vertical*scale/(height*.9));
 return 1+(fit-1)*Math.min(1,elapsed/.3);
}
