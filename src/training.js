import * as Yan from './yan.js';
import * as V08 from './v08-champions.js';
import { onDeath as releaseReferences } from './v12-champions.js';
import * as BotAI from './bot-ai.js';
import { cancelCharge as cancelYan } from './yan.js';
import { cancelCharge as cancelHohen } from './hohenheim.js';
import { RULES,UPGRADES,RUNTIME_CHAMPIONS } from './data.js';
import { distance,direction } from './geometry.js';
import { canOccupy,settleBody } from './collision.js';
import * as Skills from './skills.js';
import * as Sora from './sora.js';
import { releaseGrab } from './v12-champions.js';
import { TRAINING_25D } from './training-25d-map.js';

export const SPAWN=TRAINING_25D.spawn;
export const HAZARD=TRAINING_25D.hazard;
export const AREAS=TRAINING_25D.areas;
export const MAP={bounds:TRAINING_25D.bounds,walls:TRAINING_25D.walls};
export const spawn=()=>SPAWN;
export const hazard=()=>HAZARD;
export const areas=()=>AREAS;
export function lanePath(team){const p=TRAINING_25D.lane.map(p=>({...p}));return team?p.reverse():p;}
function dummy(g,team,x,y,{hp=3000,infinite=false,mode='still',name='허수아비'}={}){
 const e=g.makeChampion('faust',team,10+g.champions().length,'bottom');
 Object.assign(e,{x,y,player:false,name,maxHp:hp,hp,range:10.5,damage:100,interval:1.3});
 e.trainingDummy={home:{x,y},hp,infinite,mode,leash:12,respawn:5};if(infinite)e.trainingDummy.meter={kind:team===0?'healing':'damage',total:0,last:0,samples:[],groups:{},lastStarted:-Infinity};return e;
}
export function init(g,key,position){
 g.practice={invincible:false,noCooldown:false,infiniteAmmo:false,lineStopped:false,championAI:false};
 g.makeChampion(key,0,0,position);g.player=g.units.find(u=>u.player);Object.assign(g.player,spawn(g));
 const layout=TRAINING_25D;
 for(const p of layout?.infinite||[{team:0,x:23,y:40},{team:1,x:29,y:40}])dummy(g,p.team,p.x,p.y,{infinite:true,hp:10000,name:p.team?'적 무한 허수아비':'아군 무한 허수아비'});
 const [pa,pb]=layout?.duel||[{team:0,x:12,y:23},{team:1,x:22,y:23}];
 const a=dummy(g,0,pa.x,pa.y,{mode:'duel',name:'아군 대치 허수아비'}),b=dummy(g,1,pb.x,pb.y,{mode:'duel',name:'적 대치 허수아비'});
 a.trainingDummy.opponent=b.id;b.trainingDummy.opponent=a.id;
 const patrol=layout?.patrol||{x:62,y:18,to:28};const moving=dummy(g,1,patrol.x,patrol.y,{hp:1000,mode:'patrol',name:'이동 허수아비'});moving.trainingDummy.patrolTo=patrol.to;
 const central=layout?.central||[{x:57,y:35},{x:60,y:35},{x:57,y:38},{x:60,y:38}];
 const center={x:central.reduce((s,p)=>s+p.x,0)/4,y:central.reduce((s,p)=>s+p.y,0)/4};
 for(const {x,y} of central){const n=g.makeNeutral(x,y,'central');n.campCenter={...center};n.campId='training-central';}
 for(const {x,y,kind} of layout?.camps||[{x:68,y:35,kind:'amplify'},{x:75,y:35,kind:'blessing'},{x:72,y:42,kind:'boss'}]){const n=g.makeNeutral(x,y,kind);n.respawnDelay=kind==='boss'?10:n.respawnDelay;}
 resetLane(g);g.log('연습장 · 우측 상단 옵션 · G 무료 상점');
}
export function resetLane(g){
 if(!g.training)return false;
 const removed=new Set(g.units.filter(u=>u.trainingLane).map(u=>u.id));
 g.units=g.units.filter(u=>!u.trainingLane);g.projectiles=g.projectiles.filter(p=>!removed.has(p.source.id)&&!removed.has(p.target?.id));
 g.events=g.events.filter(e=>!removed.has(e.source.id));g.minionQueue=[];g.wave=0;g.practice.lineStopped=false;g.practice.nextWave=g.time+3;
 for(const team of [0,1])g.entity({kind:'tower',trainingLane:true,team,lane:0,...lanePath(team,g)[0],maxHp:5168,armor:120,range:8.5,damage:280,interval:1.05,radius:.9,name:'연습 포탑'});
 return true;
}
export function tickDummy(g,e,dt){
 const d=e.trainingDummy;
 if(!e.alive){if(g.time>=e.respawnAt)respawnDummy(g,e);return;}
 if(distance(e,d.home)>d.leash)resetDummyPosition(g,e);
 if(d.infinite){e.hp=e.maxHp;if(g.buff(e,'blessingHeal'))g.heal(null,e,30*dt,false,{healingKey:'blessing'});if(g.buff(e,'mosesHeal'))g.heal(null,e,35*dt,false,{healingKey:'moses'});}
 if(e.motion)g.updateMotion(e,dt);
 if(g.stat(e,'stun')||g.stat(e,'root')||e.motion||e.state.swordHeldBy)return;
 if(d.mode==='patrol'){
  d.end??=d.patrolTo;if(distance(e,{x:d.home.x,y:d.end})<.4)d.end=d.end===d.patrolTo?d.home.y:d.patrolTo;
  g.moveToward(e,{x:d.home.x,y:d.end},dt,{speed:2.6});
 }
 if(d.mode==='duel'&&!g.stat(e,'disarm')&&e.attackCd<=0){
  const t=g.units.find(t=>t.id===d.opponent&&t.alive);
  if(t&&distance(e,t)<=e.range&&g.clearLine(e,t)){
   g.bullet(e,direction(e,t),100,e.range,{speed:10,width:.15,trainingShot:true,theme:'dummy',proc:false});e.attackCd=e.interval;e.lastAttackAt=g.time;
  }
 }
}
function resetDummyPosition(g,e){
 if(e.state.swordHeldBy){const owner=g.units.find(u=>u.id===e.state.swordHeldBy);if(owner)releaseGrab(g,owner);}
 delete e.motion;delete e.state.netTrap;delete e.status.netCapture;Object.assign(e,e.trainingDummy.home);settleBody(g,e,e.trainingDummy.home);e.path=[];
}
function respawnDummy(g,e){e.alive=true;e.maxHp=e.trainingDummy.hp;e.hp=e.maxHp;e.status={};e.buffs={};e.shields=[];e.state={};resetDummyPosition(g,e);}
export function onDeath(g,e){
 if(e.trainingLane&&e.kind==='tower'){
  g.practice.lineStopped=true;g.minionQueue=[];for(const u of g.units.filter(u=>u.trainingLane))delete u.motion;
  g.projectiles=g.projectiles.filter(p=>!p.source.trainingLane);g.log('라인 정지 · 연습장 옵션에서 미니언·포탑을 초기화하세요.');return true;
 }
 return false;
}
export function refreshOptions(g){
 const p=g.player,o=g.practice;if(!p?.alive)return;
 if(o.infiniteAmmo){p.ammo=g.ammoCap(p);p.reloadProgress=0;if(p.state.exhaustedUntil){delete p.state.exhaustedUntil;delete p.status.silence;}}
 if(o.noCooldown){
  p.qCd=p.rCd=0;
  if(p.key==='nelly'){p.state.knifeCharges=2;p.state.knifeReady=Infinity;p.state.qDelayUntil=0;}
  if(p.key==='sora'&&Sora.ego(g,p)){p.state.egoQCharges=2;p.state.egoQReady=Infinity;}
 }
}
export function beforeStep(g,dt){
 refreshOptions(g);
 if(!g.practice.lineStopped&&g.time+1e-8>=g.practice.nextWave){g.spawnWave();g.practice.nextWave=g.time+RULES.waveEvery;}
 const p=g.player;
 const h=hazard(g);if(p.alive&&p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){
  p.hazardTime=(p.hazardTime||0)+dt;while(p.hazardTime+1e-8>=.25){p.hazardTime-=.25;g.deal({kind:'training-floor',team:1,name:'피해 장판',x:p.x,y:p.y},p,p.maxHp*.00825,{fixed:true,proc:false});}
 }
}
export function afterStep(g){
 refreshOptions(g);
 for(const e of g.champions().filter(e=>e.trainingDummy&&e.alive)){if(e.trainingDummy.infinite)e.hp=e.maxHp;if(distance(e,e.trainingDummy.home)>e.trainingDummy.leash)resetDummyPosition(g,e);}
}
export function sellAll(g){
 if(!g.training)return false;const p=g.player;p.augments=[];p.shields=p.shields.filter(s=>s.source!==`battery-${p.id}`);for(const u of UPGRADES)p.upgrades[u.key]=0;
 for(const k of ['augReloadStacks','augCombatAt'])delete p.state[k];for(const k of ['augReload','augBattleHaste'])delete p.buffs[k];
 g.refreshEquipment(p);return true;
}
export function deathOrRespawn(g){
 if(!g.training)return false;const p=g.player;
 if(p.alive){g.kill(p,p);p.respawnAt=Infinity;}
 else{p.alive=true;p.state={};p.status={};p.buffs={};p.shields=[];p.maxHp=g.maxHp(p);p.hp=p.maxHp;p.ammo=g.ammoCap(p);p.qCd=p.rCd=0;p.reloadProgress=0;p.ccImmuneUntil=p.invulnerableUntil=p.channelUntil=p.untargetableUntil=0;delete p.motion;delete p.recall;Object.assign(p,spawn(g));Skills.onRespawn(g,p);}
 return true;
}
export function teleport(g,p){
 if(!g.training||!g.player.alive||g.blocked(p.x,p.y,g.player.radius)||!canOccupy(g,g.player,p,{phaseEnemies:false,ignoreTrap:true}))return false;
 releaseGrab(g,g.player);g.cancelRecall(g.player);delete g.player.motion;delete g.player.state.netTrap;delete g.player.status.netCapture;Object.assign(g.player,p);g.player.path=[];return true;
}
export function changeChampion(g,key){
 if(!g.training||!RUNTIME_CHAMPIONS[key])return false;
 const old=g.player,point=old.alive?{x:old.x,y:old.y}:{...spawn(g)},saved={level:old.level,xp:old.xp,gold:old.gold,upgrades:{...old.upgrades},augments:[...old.augments]};
 if(old.alive)g.kill(old,old);g.corpses=[];
 g.units=g.units.filter(e=>e!==old);g.events=g.events.filter(e=>e.source!==old);g.pending=g.pending.filter(e=>e.source!==old);g.zones=g.zones.filter(e=>e.source!==old);g.projectiles=g.projectiles.filter(e=>e.source!==old&&e.target!==old);
 g.makeChampion(key,0,0,old.position);g.player=g.units.find(e=>e.player);Object.assign(g.player,saved,point);
 g.player.maxHp=g.maxHp(g.player);g.player.hp=g.player.maxHp;g.player.ammo=g.ammoCap(g.player);settleBody(g,g.player,spawn(g));refreshOptions(g);return true;
}

export function summon(g,key,team,point){
 if(!g.training||!RUNTIME_CHAMPIONS[key]||![0,1].includes(team)||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return false;
 const probe={kind:'champion',team,radius:.48,alive:true,state:{}};
 if(!canOccupy(g,probe,point,{phaseEnemies:false}))return false;
 const e=g.makeChampion(key,team,10+g.nextId,'top');
 g.practice.summonCounts??={};const number=g.practice.summonCounts[key]=(g.practice.summonCounts[key]||0)+1;Object.assign(e,point,{player:false,trainingSummoned:true,summonNumber:number,trainingHome:{...point}});e.path=[];return e;
}
export function setChampionAI(g,on){
 if(!g.training)return false;g.practice.championAI=Boolean(on);
 if(!on)for(const e of g.champions().filter(e=>e.trainingSummoned)){cancelYan(e);cancelHohen(e);Skills.cancelHeath(e);e.path=[];}
 return true;
}
export function aiChampion(g,e,dt){
 if(!g.practice.championAI||!e.alive||g.stat(e,'stun')||e.channelUntil>g.time)return;
 const t=g.nearest(e,12,false);if(!t)return;
 if(distance(e,t)>g.attackRange(e)+t.radius||!g.clearLine(e,t))g.moveToward(e,t,dt);
 else g.attack(e,t);
 BotAI.combatSkills(g,e,t);
}

// A one-second rolling window remains useful even during an indefinitely long session.
export function recordMetric(g,e,kind,amount,{source,healingKey,startedAt}={}){
 const m=e.trainingDummy?.meter;if(!m||m.kind!==kind||!Number.isFinite(amount)||amount<=0)return;
 m.total+=amount;m.samples.push({at:g.time,amount});m.samples=m.samples.filter(s=>g.time-s.at<1);
 if(kind==='damage'){m.last=amount;return;}
 const key=healingKey||source?.healingEvent?.key||`heal-${source?.id||0}`,at=startedAt??source?.healingEvent?.at??g.time;
 m.groups[key]=(m.groups[key]||0)+amount;
 if(at>=m.lastStarted){m.lastStarted=at;m.lastKey=key;}
 m.last=m.groups[m.lastKey]||0;
 const names=Object.keys(m.groups);if(names.length>64)for(const k of names.slice(0,names.length-64))if(k!==m.lastKey)delete m.groups[k];
}
export function metric(g,e){
 const m=e.trainingDummy?.meter;if(!m)return null;m.samples=m.samples.filter(s=>g.time-s.at<1);
 return {kind:m.kind,total:m.total,last:m.last,perSecond:m.samples.reduce((n,s)=>n+s.amount,0)};
}
export function summoned(g){return g.training?g.champions().filter(e=>e.trainingSummoned).sort((a,b)=>a.id-b.id):[];}
export function summonLabel(e){return `${e.name} ${e.summonNumber} · ${e.team===0?'아군':'적군'}${e.alive?'':' · 사망'}`;}
export function removeSummoned(g,id=null){
 if(!g.training)return false;const targets=summoned(g).filter(e=>id===null||e.id===id);if(!targets.length)return false;
 const ids=new Set(targets.map(e=>e.id));
 for(const e of targets){releaseReferences(g,e);V08.detach(g,e);const owner=g.units.find(t=>t.id===e.state.tetherSource);if(owner)V08.detach(g,owner);Yan.removeHand(g,e);e.alive=false;delete e.motion;}
 for(const e of g.units){if(ids.has(e.owner))ids.add(e.id);if(e.motion?.follow&&ids.has(e.motion.follow.id)){delete e.motion;settleBody(g,e,e.bodySafe);}if(ids.has(e.state?.guboAim?.target?.id)){delete e.state.guboAim;e.channelUntil=g.time;}if(ids.has(e.state?.empower?.target))delete e.state.empower;}
 g.units=g.units.filter(e=>!ids.has(e.id));g.events=g.events.filter(e=>!ids.has(e.source.id));g.pending=g.pending.filter(e=>!ids.has(e.source.id));g.zones=g.zones.filter(e=>!ids.has(e.source.id));g.projectiles=g.projectiles.filter(p=>!ids.has(p.source.id)&&!ids.has(p.target?.id));
 for(const z of g.zones)if(ids.has(z.targetId))z.waitingForTarget=true;g.corpses=g.corpses.filter(c=>!ids.has(c.unitId));return true;
}
