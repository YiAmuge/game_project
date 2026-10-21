import { RULES,UPGRADES,RUNTIME_CHAMPIONS } from './data.js';
import { distance,direction } from './geometry.js';
import { canOccupy,settleBody } from './collision.js';
import * as Skills from './skills.js';
import * as Sora from './sora.js';
import { releaseGrab } from './v12-champions.js';

export const SPAWN={x:8,y:40};
export const HAZARD={x:17,y:35,w:20,h:9};
export const AREAS=[
 {id:1,x:1,y:32,w:39,h:13,name:'회복 · 피해 실험',color:'#688c79'},
 {id:2,x:43,y:32,w:39,h:13,name:'크립 캠프',color:'#9b8866'},
 {id:3,x:1,y:17,w:39,h:13,name:'대치 · 지원 실험',color:'#718eac'},
 {id:4,x:43,y:17,w:39,h:13,name:'이동 표적',color:'#9179a7'},
 {id:5,x:1,y:1,w:81,h:14,name:'미니언 · 포탑 라인',color:'#9b8763'},
];
export const MAP={bounds:{x:0,y:0,w:RULES.width,h:RULES.height},walls:[
 {x:0,y:15.4,w:34,h:.6},{x:49,y:15.4,w:RULES.width-49,h:.6},
 {x:0,y:30.8,w:34,h:.6},{x:49,y:30.8,w:RULES.width-49,h:.6},
 {x:41.2,y:17,w:.6,h:4},{x:41.2,y:26,w:.6,h:4.8},
 {x:41.2,y:31.4,w:.6,h:4.6},{x:41.2,y:42,w:.6,h:RULES.height-42},
 {x:61,y:22,w:2,h:1.4},
]};
export function lanePath(team){const p=[{x:9,y:8.5},{x:40,y:8.5},{x:74,y:8.5}];return team?p.reverse():p;}
function dummy(g,team,x,y,{hp=3000,infinite=false,mode='still',name='허수아비'}={}){
 const e=g.makeChampion('faust',team,10+g.champions().length,'bottom');
 Object.assign(e,{x,y,player:false,name,maxHp:hp,hp,range:10.5,damage:100,interval:1.3});
 e.trainingDummy={home:{x,y},hp,infinite,mode,leash:12,respawn:5};return e;
}
export function init(g,key,position){
 g.practice={invincible:false,noCooldown:false,infiniteAmmo:false,lineStopped:false};
 g.makeChampion(key,0,0,position);g.player=g.units.find(u=>u.player);Object.assign(g.player,SPAWN);
 dummy(g,0,23,40,{infinite:true,hp:10000,name:'아군 무한 허수아비'});
 dummy(g,1,29,40,{infinite:true,hp:10000,name:'적 무한 허수아비'});
 const a=dummy(g,0,12,23,{mode:'duel',name:'아군 대치 허수아비'}),b=dummy(g,1,22,23,{mode:'duel',name:'적 대치 허수아비'});
 a.trainingDummy.opponent=b.id;b.trainingDummy.opponent=a.id;
 dummy(g,1,62,18,{hp:1000,mode:'patrol',name:'이동 허수아비'});
 const center={x:58.5,y:36.5};
 for(const [x,y] of [[57,35],[60,35],[57,38],[60,38]]){const n=g.makeNeutral(x,y,'central');n.campCenter={...center};n.campId='training-central';}
 for(const [x,y,kind] of [[68,35,'amplify'],[75,35,'blessing'],[72,42,'boss']]){const n=g.makeNeutral(x,y,kind);n.respawnDelay=kind==='boss'?10:n.respawnDelay;}
 resetLane(g);g.log('연습장 · G 무료 상점 · 연습장 옵션에서 환경을 조절하세요.');
}
export function resetLane(g){
 if(!g.training)return false;
 const removed=new Set(g.units.filter(u=>u.trainingLane).map(u=>u.id));
 g.units=g.units.filter(u=>!u.trainingLane);g.projectiles=g.projectiles.filter(p=>!removed.has(p.source.id)&&!removed.has(p.target?.id));
 g.events=g.events.filter(e=>!removed.has(e.source.id));g.minionQueue=[];g.wave=0;g.practice.lineStopped=false;g.practice.nextWave=g.time+3;
 for(const team of [0,1])g.entity({kind:'tower',trainingLane:true,team,lane:0,x:team?74:9,y:8.5,maxHp:6460,armor:120,range:8.5,damage:280,interval:1.05,radius:.9,name:'연습 포탑'});
 return true;
}
export function tickDummy(g,e,dt){
 const d=e.trainingDummy;
 if(!e.alive){if(g.time>=e.respawnAt)respawnDummy(g,e);return;}
 if(distance(e,d.home)>d.leash)resetDummyPosition(g,e);
 if(d.infinite)e.hp=e.maxHp;
 if(e.motion)g.updateMotion(e,dt);
 if(g.stat(e,'stun')||g.stat(e,'root')||e.motion||e.state.swordHeldBy)return;
 if(d.mode==='patrol'){
  d.end??=28;if(distance(e,{x:62,y:d.end})<.4)d.end=d.end===28?18:28;
  g.moveToward(e,{x:62,y:d.end},dt,{speed:2.6});
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
 if(p.alive&&p.x>=HAZARD.x&&p.x<=HAZARD.x+HAZARD.w&&p.y>=HAZARD.y&&p.y<=HAZARD.y+HAZARD.h){
  p.hazardTime=(p.hazardTime||0)+dt;while(p.hazardTime+1e-8>=.25){p.hazardTime-=.25;g.deal({kind:'training-floor',team:1,name:'피해 장판',x:p.x,y:p.y},p,p.maxHp*.0025,{fixed:true,proc:false});}
 }
}
export function afterStep(g){
 refreshOptions(g);
 for(const e of g.champions().filter(e=>e.trainingDummy&&e.alive)){if(e.trainingDummy.infinite)e.hp=e.maxHp;if(distance(e,e.trainingDummy.home)>e.trainingDummy.leash)resetDummyPosition(g,e);}
}
export function sellAll(g){
 if(!g.training)return false;const p=g.player;p.augments=[];for(const u of UPGRADES)p.upgrades[u.key]=0;
 for(const k of ['augReloadStacks','augCombatAt'])delete p.state[k];for(const k of ['augReload','augBattleHaste'])delete p.buffs[k];
 g.refreshEquipment(p);return true;
}
export function deathOrRespawn(g){
 if(!g.training)return false;const p=g.player;
 if(p.alive){g.kill(p,p);p.respawnAt=Infinity;}
 else{p.alive=true;p.state={};p.status={};p.buffs={};p.shields=[];p.maxHp=g.maxHp(p);p.hp=p.maxHp;p.ammo=g.ammoCap(p);p.qCd=p.rCd=0;p.reloadProgress=0;p.ccImmuneUntil=p.invulnerableUntil=p.channelUntil=p.untargetableUntil=0;delete p.motion;delete p.recall;Object.assign(p,SPAWN);Skills.onRespawn(g,p);}
 return true;
}
export function teleport(g,p){
 if(!g.training||!g.player.alive||g.blocked(p.x,p.y,g.player.radius)||!canOccupy(g,g.player,p,{phaseEnemies:false,ignoreTrap:true}))return false;
 releaseGrab(g,g.player);g.cancelRecall(g.player);delete g.player.motion;delete g.player.state.netTrap;delete g.player.status.netCapture;Object.assign(g.player,p);g.player.path=[];return true;
}
export function changeChampion(g,key){
 if(!g.training||!RUNTIME_CHAMPIONS[key])return false;
 const old=g.player,point=old.alive?{x:old.x,y:old.y}:{...SPAWN},saved={level:old.level,xp:old.xp,gold:old.gold,upgrades:{...old.upgrades},augments:[...old.augments]};
 if(old.alive)g.kill(old,old);g.corpses=[];
 g.units=g.units.filter(e=>e!==old);g.events=g.events.filter(e=>e.source!==old);g.pending=g.pending.filter(e=>e.source!==old);g.zones=g.zones.filter(e=>e.source!==old);g.projectiles=g.projectiles.filter(e=>e.source!==old&&e.target!==old);
 g.makeChampion(key,0,0,old.position);g.player=g.units.find(e=>e.player);Object.assign(g.player,saved,point);
 g.player.maxHp=g.maxHp(g.player);g.player.hp=g.player.maxHp;g.player.ammo=g.ammoCap(g.player);settleBody(g,g.player,SPAWN);refreshOptions(g);return true;
}
