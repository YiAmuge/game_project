import {MAP_CENTER} from './data.js';
import {distance,direction} from './geometry.js';

export const SEWING={spawnAt:210,health:3600,armor:20,damage:195,interval:1.3,cleave:.65,needleEvery:2,windup:.25,range:6.5,needleDamage:50,dotDamage:50,dotSeconds:5,rewardXp:125,rewardGold:200,structureBonus:.06};
export const NEEDLE={spawnAt:90,health:350,armor:0,damage:55,interval:.65,respawn:20,maxRespawns:4,xp:25,gold:10};
export const NORTH_CAMP={x:MAP_CENTER.x,y:-3.8};
export const isSewing=e=>e.kind==='neutral'&&['needle','sewingKing'].includes(e.camp);
export function makeNeedle(g,x,y,index=0,{summoned=false}={}){
 const e=g.makeNeutral(x,y,'needle');e.needleColor=index%2?'red':'green';e.campId=summoned?'sewing-king':'needle-north';e.campCenter=g.training?{x,y}:{...NORTH_CAMP};e.summonedNeedle=summoned;if(summoned){e.respawnDelay=Infinity;e.invulnerableUntil=g.time+1.5;e.hostile=true;summonedAI(g,e,0);}return e;
}
export function makeCamp(g){if(g.needleCampSpawned)return;g.needleCampSpawned=true;g.needleRespawnsScheduled=0;for(const [i,dx]of [-2.4,2.4].entries())makeNeedle(g,NORTH_CAMP.x+dx,NORTH_CAMP.y,i);}
export function scheduleRespawn(g,e){if(e.summonedNeedle||e.retired||!g.training&&g.sewingKingSpawned||(g.needleRespawnsScheduled||0)>=NEEDLE.maxRespawns){e.respawnAt=Infinity;return;}g.needleRespawnsScheduled=(g.needleRespawnsScheduled||0)+1;e.respawnAt=g.time+NEEDLE.respawn;}
export function spawnKing(g){
 if(g.sewingKingSpawned)return;g.sewingKingSpawned=true;
 for(const n of g.units.filter(e=>e.camp==='needle'&&!e.summonedNeedle)){n.alive=false;n.hp=0;n.retired=true;n.respawnAt=Infinity;cancel(n);}
 const e=g.makeNeutral(NORTH_CAMP.x,NORTH_CAMP.y,'sewingKing');e.campId='sewing-king';e.campCenter={...NORTH_CAMP};
 g.log('03:30 · 바느질의 왕 등장','boss');g.announce('boss-spawn','바느질의 왕 등장','상단 캠프의 바늘이를 처형하고 등장했습니다.');g.effects.push({type:'ring',...e.home,r:3.4,color:'#c7ba72',life:1.5,maxLife:1.5});
}
export function engage(g,e){if(!e.hostile)e.needleReady=g.time+SEWING.needleEvery;e.hostile=true;}
export function cancel(e){delete e.needleCast;delete e.channelUntil;}
export function swing(g,e){e.swingAt=g.time;e.swingUntil=g.time+.3;}
export function basic(g,e,target){
 g.emitSound?.('swing',e,{phase:'king-swing'});
 swing(g,e);e.facing=Math.atan2(target.y-e.y,target.x-e.x);
 for(const t of [...g.units])if(g.hostile(e,t)&&distance(target,t)<=SEWING.cleave+t.radius&&distance(e,t)<=e.range+t.radius&&g.clearLine(e,t))g.deal(e,t,e.damage,{damageKind:'basic'});
 g.effects.push({type:'slash',x:e.x,y:e.y,r:e.range,angle:e.facing,spread:1.1,color:'#d9c889',life:.3,maxLife:.3});
}
function wound(g,e,t){
 if(!t.alive||t.hp<=0||g.debuffImmune(t)||t.invulnerableUntil>g.time)return;
 t.needleBleeds??={};t.needleBleeds[e.id]={source:e,next:g.time+1,until:g.time+SEWING.dotSeconds};g.status(t,'needleWound',1,SEWING.dotSeconds,e);
}
export function update(g,e){
 if(e.camp!=='sewingKing')return false;
 if(e.needleCast){
  if(g.stat(e,'stun')||g.stat(e,'silence')||e.motion?.forced){cancel(e);return true;}
  if(g.time+1e-8>=e.needleCast.at){const p=e.needleCast;cancel(e);swing(g,e);for(const d of p.directions||[p])g.bullet(e,{x:d.dx,y:d.dy},SEWING.needleDamage,SEWING.range,{pierce:Infinity,speed:16,width:.14,theme:'sewingNeedle',color:'#d8cfc0',beforeHit(t,p){p.beforeNeedleHp=t.hp;p.beforeNeedleShield=g.shield(t);},onHit(t,p){if(p.beforeNeedleHp-t.hp+p.beforeNeedleShield-g.shield(t)>0)wound(g,e,t);}});}
  return true;
 }
 const targets=g.champions().filter(t=>t.alive&&!g.hidden(t)&&distance(e,t)<=SEWING.range+t.radius&&g.clearLine(e,t));
 if(e.hostile&&targets.length&&g.time+1e-8>=(e.needleReady??Infinity)&&!g.stat(e,'stun')&&!g.stat(e,'silence')){
  const directions=targets.map(t=>{const d=direction(e,t);return{dx:d.x,dy:d.y,targetId:t.id};}),first=directions[0];e.needleCast={x:e.x,y:e.y,...first,directions,startedAt:g.time,at:g.time+SEWING.windup};e.needleReady=g.time+SEWING.needleEvery;e.channelUntil=e.needleCast.at;e.facing=Math.atan2(first.dy,first.dx);return true;
 }return false;
}
export function stationaryAI(g,e,dt){
 Object.assign(e,e.home);e.returning=false;delete e.motion;
 const targets=g.units.filter(t=>g.hostile(e,t)&&!g.hidden(t)&&distance(e,t)<=9&&g.clearLine(e,t));
 const target=targets.find(t=>t.id===e.aggro)||targets.sort((a,b)=>distance(e,a)-distance(e,b))[0];
 if(e.hostile&&target){e.aggro=target.id;delete e.sewingIdleSince;}
 else if(e.hostile){e.sewingIdleSince??=g.time;if(g.time-e.sewingIdleSince>3){e.hostile=false;e.aggro=null;cancel(e);}}
 if(update(g,e))return;
 if(e.hostile&&target&&distance(e,target)<=e.range+target.radius&&e.attackCd<=0&&!g.stat(e,'stun')&&!g.stat(e,'disarm')){basic(g,e,target);e.attackCd=e.interval;}
 if(!e.hostile&&g.time-e.lastCombat>5){e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*dt);if(e.hp>=e.maxHp){e.sewingEnrage=0;e.armor=SEWING.armor;e.interval=SEWING.interval;delete e.sewingGuardUntil;}}
}
export function summonedAI(g,e,dt){
 // Summons engage immediately and reacquire the closest target without a camp leash.
 const target=g.units.filter(t=>g.hostile(e,t)&&['champion','minion'].includes(t.kind)&&g.visibleTo(e.team,t)&&g.clearLine(e,t)).sort((a,b)=>distance(e,a)-distance(e,b)||a.id-b.id)[0];
 e.hostile=true;e.returning=false;e.aggro=target?.id;
 if(!target)return;
 if(distance(e,target)>e.range+target.radius)g.moveToward(e,target,dt);
 else if(e.attackCd<=0&&!g.stat(e,'stun')&&!g.stat(e,'disarm')){g.simpleAttack(e,target);e.attackCd=e.interval;}
}
export function tick(g){
 if(!g.training&&!g.needleCampSpawned&&g.time+1e-8>=NEEDLE.spawnAt)makeCamp(g);
 if(!g.training&&!g.sewingKingSpawned&&g.time+1e-8>=SEWING.spawnAt)spawnKing(g);
 for(const t of [...g.units])if(t.needleBleeds){
  if(!t.alive||t.returning){delete t.needleBleeds;continue;}
  for(const [id,b]of Object.entries(t.needleBleeds)){while(t.alive&&b.next<=Math.min(g.time,b.until)+1e-8){b.next++;g.deal(b.source,t,SEWING.dotDamage,{fixed:true,proc:false,campBonus:false});}if(b.next>b.until+1e-8)delete t.needleBleeds?.[id];}
  if(!Object.keys(t.needleBleeds||{}).length)delete t.needleBleeds;
 }
}
export function afterDamage(g,source,target,dealt,{hpBefore,campBonus}={}){
 if(target.camp==='sewingKing'&&target.alive&&target.hp>0){
  const enrage=Math.min(3,Math.floor((1-target.hp/target.maxHp+1e-8)/.3));if(enrage>(target.sewingEnrage||0)){target.sewingEnrage=enrage;target.armor=SEWING.armor+12*enrage;target.interval=SEWING.interval-.15*enrage;target.sewingGuardUntil=g.time+1;}
  const waves=Math.min(2,Math.floor((1-target.hp/target.maxHp+1e-8)/.3));
  while((target.needleWaves||0)<waves){const wave=target.needleWaves=(target.needleWaves||0)+1;
   const points=[[-1.3,.8+(wave-1)*.7],[1.3,.8+(wave-1)*.7]];for(const [i,[dx,dy]]of points.entries())makeNeedle(g,target.x+dx,target.y+dy,i,{summoned:true});g.effects.push({type:'ring',x:target.x,y:target.y,r:2,color:'#aabf77',life:.7,maxLife:.7});
  }
 }
 if(campBonus&&dealt>0&&source.kind==='champion'&&g.sewingTeams?.[source.team]&&['tower','core'].includes(target.kind)&&target.alive)g.deal(source,target,dealt*SEWING.structureBonus,{fixed:true,proc:false,campBonus:false,transferred:true});
}
export function reward(g,team){
 if(![0,1].includes(team)||g.sewingWinner!==null)return;g.sewingWinner=team;g.sewingTeams[team]=true;g.sewingBuffOrder=++g.buffSequence;
 for(const c of g.champions(team))g.award(c,SEWING.rewardXp,SEWING.rewardGold);
 g.log(`${team===0?'아군':'적군'} 바느질의 왕 처치 · 땀수!`,'boss');g.announce('boss-kill','바느질의 왕 처치','팀 전원 125 XP · 200 재화 · 영구 버프 땀수!',{team});
}
export function draw(r,e,g){
 const p=e.needleCast;if(!p||!e.alive||e.returning)return;for(const d of p.directions||[p]){const end={x:p.x+d.dx*SEWING.range,y:p.y+d.dy*SEWING.range},nx=-d.dy*.18,ny=d.dx*.18;
 r.polygon([[p.x+nx,p.y+ny],[end.x+nx,end.y+ny],[end.x-nx,end.y-ny],[p.x-nx,p.y-ny]],'#c7a7a438','#ead6b6');r.line([p,end],'#ead6b6',.045,[.15,.15]);
 }
}
