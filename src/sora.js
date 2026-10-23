import { distance,segmentDistance } from './geometry.js';
import { settleBody } from './collision.js';
import { dash,area } from './skills.js';
import { RULES } from './data.js';

// Unspecified distances/damage are prototype values, mirrored in the encyclopedia.
export const SORA={markEvery:3,markDuration:6,passiveRange:5,passiveCap:2,maxUnlock:5,ultimateRange:8,egoDuration:20,basicDamage:220,basicRange:1.33,basicRadius:1.15,egoDamage:260,egoRadius:2.7,qRange:7,egoQRange:6.5,qWidth:(.48+.08)*1.7*1.2,qDamage:210,qShield:250,egoQDamage:240,egoQCharges:2,egoQCooldown:5,egoQSpeed:RULES.dashSpeed*3,egoHitWidth:.8,trailDamage:45,trailWidth:.8*1.3,trailLengthScale:1.1,trailEvery:.2,trailDuration:1.2};
export const ego=(g,e)=>e.key==='sora'&&g.buff(e,'soraEgo');
export const ready=(g,e)=>e.key==='sora'&&!ego(g,e)&&(e.state.unlock||0)>=SORA.maxUnlock;
export function init(g,e){if(e.key==='sora'){e.state.unlock=0;e.state.orders={};e.state.orderAt=g.time+SORA.markEvery;}}
export function orders(g,e){
 const marks=e.state.orders??={};
 for(const [id,m] of Object.entries(marks)){const t=g.units.find(t=>t.id===m.target);if(m.until<=g.time+1e-8||!t?.alive||t.returning)delete marks[id];}
 return Object.values(marks);
}
export function marked(g,e,t){return e.key==='sora'&&Boolean(e.state.orders?.[t.id]?.until>g.time);}
export function mark(g,e,t,origin='passive'){
 if(!t?.alive||t.camp==='boss'||!g.hostile(e,t)||!['neutral','champion'].includes(t.kind))return false;
 const active=orders(g,e),previous=e.state.orders[t.id];
 if(origin==='passive'&&!previous&&active.filter(m=>m.origin==='passive').length>=SORA.passiveCap)return false;
 e.state.orders[t.id]={target:t.id,until:g.time+SORA.markDuration,origin:origin==='ultimate'||previous?.origin==='ultimate'?'ultimate':'passive'};
 g.effects.push({type:'ring',x:t.x,y:t.y-.65,r:.7,color:'#46cfff',life:.4,maxLife:.4});return true;
}
export function ultimateTarget(g,e){
 const targets=g.units.filter(t=>g.hostile(e,t)&&!t.returning&&g.visibleTo(e.team,t)&&distance(e,t)<=SORA.ultimateRange+t.radius&&g.clearLine(e,t));
 const nearest=list=>list.sort((a,b)=>distance(e,a)-distance(e,b)||a.id-b.id)[0];
 return nearest(targets.filter(t=>t.kind==='neutral'&&['central','side'].includes(t.camp)))||nearest(targets.filter(t=>t.kind==='neutral'&&['amplify','blessing'].includes(t.camp)))||targets.filter(t=>t.kind==='champion').sort((a,b)=>a.hp-b.hp||distance(e,a)-distance(e,b))[0];
}
export function validate(g,e,slot){
 if(e.key!=='sora')return true;
 if(slot==='q')return (!ego(g,e)||(e.state.egoQCharges||0)>0)&&!g.stat(e,'root')&&!g.stat(e,'captured');
 return !ego(g,e)&&(ready(g,e)||Boolean(ultimateTarget(g,e))||orders(g,e).length>0);
}
function restoreGuard(e){const s=e.state.soraGuard;if(!s)return;delete e.state.soraGuard;e.invulnerableUntil=s.previous;}
function transform(g,e){
 const fraction=e.hp/e.maxHp;e.state.unlock=0;e.rCd=0;e.state.egoActive=true;
 g.addBuff(e,'soraEgo',SORA.egoDuration,{copy:false});e.maxHp=g.maxHp(e);e.hp=e.maxHp*fraction;
 e.state.egoQCharges=SORA.egoQCharges;e.state.egoQReady=Infinity;e.qCd=0;
 g.effects.push({type:'burst',x:e.x,y:e.y,r:3.2,theme:'sora',life:.75,maxLife:.75});
}
function endTransform(g,e){
 const fraction=e.hp/e.maxHp;delete e.buffs.soraEgo;delete e.buffs.soraScratch;e.state.egoActive=false;e.maxHp=g.maxHp(e);e.hp=Math.min(e.maxHp,e.maxHp*fraction);e.rCd=0;
 delete e.state.egoQCharges;delete e.state.egoQReady;e.qCd=0;
 g.effects.push({type:'ring',x:e.x,y:e.y,r:1.6,color:'#f2e4b6',life:.5,maxLife:.5});
}
// The same impact circle drives the hit test, aiming guide and shockwave.
export function basicImpact(g,e,d){return {x:e.x+d.x*g.attackRange(e),y:e.y+d.y*g.attackRange(e),r:SORA.basicRadius};}
function shockwave(g,p,r,cracks=false,owner){
 g.effects.push({source:owner?.id,type:'soraShockwave',theme:'sora',x:p.x,y:p.y,r,life:.38,maxLife:.38});
 if(cracks)g.effects.push({source:owner?.id,theme:'sora',type:'soraCracks',x:p.x,y:p.y,r,life:1.4,maxLife:1.4});
}
export function basic(g,e,p,d){
 if(e.key!=='sora')return false;
 if(ego(g,e)){g.addBuff(e,'soraScratch',.35,{copy:false});area(g,e,e,g.attackRange(e),0,t=>g.deal(e,t,SORA.egoDamage));g.effects.push({source:e.id,theme:'sora',type:'soraClaw',x:e.x,y:e.y,r:g.attackRange(e),angle:Math.atan2(d.y,d.x),circle:true,life:.3,maxLife:.3});}
 else {const impact=basicImpact(g,e,d);if(g.clearLine(e,impact)){area(g,e,impact,impact.r,0,t=>{if(g.clearLine(e,t))g.deal(e,t,SORA.basicDamage);});shockwave(g,impact,impact.r,false,e);}}
 return true;
}
function trail(g,e,origin){
 const end={x:e.x,y:e.y};if(distance(origin,end)<.05)return;
 const length=distance(origin,end),d={x:(end.x-origin.x)/length,y:(end.y-origin.y)/length},extra=length*(SORA.trailLengthScale-1)/2;
 // Extend both ends by 5%, stopping at terrain or buildings, using the actual dash path.
 const extend=(p,sign)=>{let out={...p};for(let n=.05;n<extra+.05;n+=.05){const step=Math.min(n,extra),next={x:p.x+d.x*step*sign,y:p.y+d.y*step*sign};if(g.blocked(next.x,next.y,.01)||!g.clearLine(p,next)||g.units.some(t=>t.alive&&['tower','core'].includes(t.kind)&&distance(t,next)<t.radius))break;out=next;}return out;};
 const start=extend(origin,-1),finish=extend(end,1),halfLength=distance(start,finish)/2,center={x:(start.x+finish.x)/2,y:(start.y+finish.y)/2};
 g.effects.push({source:e.id,theme:'sora',type:'soraTrail',...start,to:finish,width:SORA.trailWidth,life:SORA.trailDuration,maxLife:SORA.trailDuration});
 for(let i=0;i<6;i++)g.schedule(e,i*SORA.trailEvery,()=>{
  for(const t of [...g.units])if(g.hostile(e,t)&&Math.hypot(Math.max(0,Math.abs((t.x-center.x)*d.x+(t.y-center.y)*d.y)-halfLength),Math.max(0,Math.abs((t.y-center.y)*d.x-(t.x-center.x)*d.y)-SORA.trailWidth))<=t.radius&&g.clearLine(origin,t)&&g.clearLine(end,t)){
   g.deal(e,t,SORA.trailDamage);g.status(t,'slow',.3,1,e);
  }
  g.effects.push({source:e.id,theme:'sora',type:'soraClaw',x:start.x,y:start.y,r:Math.max(.6,distance(start,finish)),shape:{kind:'rect',range:distance(start,finish),width:SORA.trailWidth*2,angle:Math.atan2(end.y-origin.y,end.x-origin.x)},angle:Math.atan2(end.y-origin.y,end.x-origin.x),life:.18,maxLife:.18});
 });
}
export function cast(g,e,slot,p,d){
 if(e.key!=='sora')return false;
 if(slot==='r'){
  if(ready(g,e))transform(g,e);
  else{for(const m of orders(g,e))m.until=g.time+SORA.markDuration;mark(g,e,ultimateTarget(g,e),'ultimate');}
  return true;
 }
 const origin={x:e.x,y:e.y},length=Math.min(ego(g,e)?SORA.egoQRange:SORA.qRange,distance(e,p));
 if(ego(g,e)){
  e.state.egoQCharges--;if(!Number.isFinite(e.state.egoQReady))e.state.egoQReady=g.time+g.cooldown(e,'q');
  e.qCd=e.state.egoQCharges>0?0:Math.max(0,e.state.egoQReady-g.time);
  const previous=e.invulnerableUntil||0;
  if(dash(g,e,d,length,SORA.egoQDamage,()=>{},{speed:SORA.egoQSpeed,maxSpeed:SORA.egoQSpeed,hitWidth:SORA.egoHitWidth,onComplete:()=>{restoreGuard(e);trail(g,e,origin);}})&&e.motion){e.state.soraGuard={previous,motion:e.motion};e.invulnerableUntil=Infinity;}
 }else{
  // Sweep only the first contacted enemy; no teleport and no pushing through terrain.
  const stopped=new Set();
  g.startMotion(e,d,length,{phaseEnemies:true,onComplete:()=>shockwave(g,e,SORA.qWidth,true,e),onStep:(from,to)=>{
   const target=g.units.filter(t=>g.hostile(e,t)&&segmentDistance(t,from,to)<=SORA.qWidth+t.radius&&g.clearLine(e,t)).sort((a,b)=>distance(from,a)-distance(from,b))[0];
   if(!target||stopped.size)return;stopped.add(target.id);const refill=marked(g,e,target),fallback=e.motion?.lastClear;delete e.motion;settleBody(g,e,fallback);
   g.deal(e,target,SORA.qDamage);g.status(target,'stun',1,1,e);g.addShield(e,SORA.qShield,`sora-dash-${e.id}`,2);if(refill)e.ammo=Math.min(g.ammoCap(e),e.ammo+1);
   shockwave(g,target,SORA.qWidth,true,e);
  }});
 }
 return true;
}
export function afterDamage(g,e,t,actual,absorbed=0){
 if(e.key!=='sora'||!e.alive||actual+absorbed<=0)return;
 const m=e.state.orders?.[t.id];if(!m||m.until<=g.time)return;
 delete e.state.orders[t.id];e.state.unlock=Math.min(SORA.maxUnlock,(e.state.unlock||0)+1);if(!ego(g,e))e.ammo=Math.min(g.ammoCap(e),e.ammo+1);if(ready(g,e))e.rCd=0;g.effects.push({type:'number',x:e.x,y:e.y-2,text:`해금 ${e.state.unlock}/${SORA.maxUnlock}`,color:'#73d6ff',life:1,maxLife:1});
}
export function tick(g,e){
 if(e.key!=='sora')return;
 if(e.state.soraGuard&&e.state.soraGuard.motion!==e.motion)restoreGuard(e);
 if(e.state.egoActive&&!ego(g,e))endTransform(g,e);
 if(ego(g,e)){
  while(e.state.egoQCharges<SORA.egoQCharges&&g.time+1e-8>=e.state.egoQReady){e.state.egoQCharges++;e.state.egoQReady=e.state.egoQCharges<SORA.egoQCharges?e.state.egoQReady+g.cooldown(e,'q'):Infinity;}
  e.qCd=e.state.egoQCharges>0?0:Math.max(0,e.state.egoQReady-g.time);
 }
 const active=orders(g,e);
 if(g.time+1e-8<(e.state.orderAt??g.time+SORA.markEvery))return;
 e.state.orderAt=g.time+SORA.markEvery;
 if(active.filter(m=>m.origin==='passive').length>=SORA.passiveCap)return;
 const target=g.units.filter(t=>t.kind==='neutral'&&t.camp!=='boss'&&t.alive&&!t.returning&&!marked(g,e,t)&&distance(e,t)<=SORA.passiveRange+t.radius&&g.clearLine(e,t)).sort((a,b)=>distance(e,a)-distance(e,b))[0];
 mark(g,e,target);
}
export function onRespawn(g,e){if(e.key==='sora')init(g,e);}
export function onDeath(g,e){if(e.key==='sora')restoreGuard(e);}
export function abilityInfo(g,e){
 if(e.key!=='sora')return {};
 const transformed=ego(g,e),unlocked=ready(g,e);
 return {basic:transformed?'대행: 새기기':'머리 으깨기',tactical:transformed?'대행: 말살':'얌전히 으깨져주세요',ultimate:transformed?'대행 전개 중':unlocked?'개화 E.G.O::대행':'단말기로 정해진 지령',qText:transformed?`충전 ${e.state.egoQCharges}/2 · 1회 충전 5초. 커서 방향으로 즉시 초속 24 무적 돌진(최대 6.5)·240 피해. 후속 장판 좌우 +30%·전후 +10%, 실제 경로에 1.2초간 0.2초마다 45 추가 피해·감속 30% 1초 갱신.`:'사거리 7 좌표로 돌진, 처음 닿은 적에게 210 피해·기절 1초. 적중 시 250 보호막 2초. 적중·돌진 종료 위치에 원형 충격파·지면 균열. 지령 대상이면 탄창 1개 장전. 쿨다운 9초.',rText:unlocked||transformed?'해금 5 소모, 20초간 최대 체력 −20%·장전 +30%·이동 +10%·전투력 +25%. 기본/전술기 변경. 변신 자체 쿨다운 없음.':'반경 8의 중립→버프 크립 우선, 없으면 현재 체력이 가장 낮은 적 챔피언에게 6초 지령. 기존 표식 시간 갱신, 표식 수 제한 무시. 쿨다운 10초.'};
}
