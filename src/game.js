import{combatNumber}from'./combat-text.js';
import{captureMobileAim,followMobileAim}from'./champion-pose.js';
import * as Jamila from './jamila.js';
import{introHidden}from'./match-presentation.js';
import*as GuboUltimate from'./gubo-ultimate.js';
import*as MinionNav from'./minion-navigation.js';
import{botChoice}from'./draft.js';
import * as Infiltration from './infiltration.js';
import * as Sewing from './sewing.js';
import * as CampBuffs from './camp-buffs.js';
import * as BossBuff from './boss-buff.js';
import * as Pings from './pings.js';
import * as Fountain from './fountain.js';
import * as Towers from './tower-rules.js';
import { FAUST_WAVE_HALF_WIDTH } from './projectile-rules.js';
import * as Reworks from './reworks.js';
import * as Debuffs from './debuffs.js';
import { RULES, RUNTIME_CHAMPIONS as CHAMPIONS, UPGRADES, upgradeRate, BUSHES, POSITIONS, POSITION_ORDER, lanePath, worldPoint, MAP_CENTER, FOUNTAINS, MINIONS, CAMP_RULES, CORE_POSITIONS, inWell, WORLD } from './data.js';
import { regionContains, clamp, distance, direction, clearLine, slide, findPath, segmentDistance, blocked } from './geometry.js';
import * as Infestation from './infestation.js';
import { carried } from './attachments.js';
import * as Training from './training.js';
import { createTraining25DMap } from './training-25d-map.js';
import { shiftCarried } from './attachments.js';
import * as Skills from './skills.js';
import * as CreepPatterns from './creep-patterns.js';
import * as Augments from './augments.js';
import * as Sora from './sora.js';
import * as Yan from './yan.js';
import * as Hohenheim from './hohenheim.js';
import * as V12 from './v12-champions.js';
import { withinTrap,trapPoint } from './confinement.js';
import * as V08 from './v08-champions.js';
import * as BotAI from './bot-ai.js';
import * as BossPatterns from './boss-patterns.js';
import * as Combat from './combat-events.js';
import { steer } from './navigation.js';
import { separate,moveBody,canOccupy,settleBody,solid } from './collision.js';
import { skillTargeting, castPoint } from './targeting.js';
import { projectileHitWidth } from './projectile-rules.js';

export function damageFormula(base,power=3,level=3,armor=0) {
  return base*RULES.power[power]*(.85+.05*level)*100/(100+Math.max(0,armor));
}
export function respawnTime(time,level) { return Math.min(23,Math.ceil(6+1.356*(.8*time/60+1.2*(level-1)))); }

export class Game {
  constructor(selected='faust',position='bottom',{seed=Math.floor(Math.random()*4294967296),mode='match',bots}={}) {
    if(!CHAMPIONS[selected])throw new Error('Unknown champion');
    if(!POSITIONS[position])position='bottom';
    this.time=0; this.nextId=1; this.wave=0; this.bossSpawned=false;this.sewingKingSpawned=false;this.needleCampSpawned=false;this.sewingWinner=null;this.sewingTeams=[false,false]; this.winner=null; this.reason='';
    this.units=[]; this.minionQueue=[];this.corpses=[]; this.projectiles=[]; this.effects=[]; this.zones=[]; this.pending=[]; this.logs=[];this.events=[];this.buffSequence=0;this.randomState=(seed>>>0)||137;
    this.minionFactions=(seed>>>0)&1?['uniform','suit']:['suit','uniform'];
    this.kills=[0,0]; this.damageDone=0; this.input={x:0,y:0,aim:{x:32,y:18},fire:false};
    this.soundEvents=[];this.soundSerial=0;this.firstBlood=null;this.announcements=[];this.announcementSequence=0;
    this.training25d=true;this.training=mode==='training'||mode==='training25d';this.map=this.training?createTraining25DMap():null;this.bounds=this.map?.bounds||WORLD;
    if(this.training){Training.init(this,selected,position);return;}
    this.makeStructures(); this.makeCamps();
    this.makeChampion(selected,0,0,position);
    for(const team of [0,1])for(const pos of POSITION_ORDER){if(team===0&&pos===position)continue;const choice=botChoice(bots,team,pos);if(choice===null)continue;const used=[...this.champions(team).map(c=>c.key),...POSITION_ORDER.map(p=>botChoice(bots,team,p)).filter(k=>k&&k!=='random')];this.makeChampion(choice==='random'?BotAI.draft(this,pos,used):choice,team,team===0?this.champions(team).length:POSITION_ORDER.indexOf(pos),pos);}
    this.player=this.units.find(u=>u.player);
    this.log('전투 개시 · 첫 미니언 3초 후 출격 · 20분 제한', 'system');
  }
  blocked(x,y,r=.4){return blocked(x,y,r,this.map);}
  clearLine(a,b,r=.12){return clearLine(a,b,r,this.map);}
  findPath(a,b,r=.48,obstacles=[]){return findPath(a,b,r,this.map,obstacles);}
  spawnPoint(e){return this.training?(e.trainingDummy?e.trainingDummy.home:e.trainingHome||Training.spawn(this)):FOUNTAINS[e.team];}
  entity(values) {
    const e={id:this.nextId++,alive:true,attackCd:0,radius:.35,armor:0,shields:[],status:{},lastCombat:-99,...values};
    e.hp=e.maxHp; this.units.push(e); return e;
  }
  makeStructures() {
    for(let team=0;team<2;team++) {
      for(let lane=0;lane<2;lane++) this.entity({kind:'tower',team,lane,...{...worldPoint(team?46:18,lane?30.5:5.5),x:worldPoint(team?46:18,0).x+(team?-5:5)},maxHp:5000,armor:120,range:8.5,damage:280,interval:1.05,radius:.9,name:'포탑'});
      this.entity({kind:'core',team,...CORE_POSITIONS[team],lastDamageAt:0,maxHp:6000,armor:100,range:9,damage:320,interval:1,radius:1.3,name:'본진'});
    }
  }
  makeCamps() {
    for(const [camp,points] of Object.entries({central:[[30.5,16.5],[33.5,16.5],[30.5,19.5],[33.5,19.5]],blessing:[[22,13],[42,13]],amplify:[[22,23],[42,23]]}))for(const [x,y] of points){const p=worldPoint(x,y);this.makeNeutral(p.x,p.y,camp);}
    for(const [id,center] of [['west',worldPoint(17,18)],['east',worldPoint(47,18)]]){
      for(const dx of [-.85,.85]){const n=this.makeNeutral(center.x+dx,center.y,'side');n.campId=`side-${id}`;n.campCenter={...center};}
    }
  }
  makeNeutral(x,y,camp) {
    const clerk=CampBuffs.BUFF_CREEPS[camp],stats=clerk?[clerk.health,clerk.armor,clerk.damage,clerk.interval,CAMP_RULES.buffRespawn]:{central:[700,10,80,1.3,CAMP_RULES.neutralRespawn],side:[850,15,100,1.2,CAMP_RULES.neutralRespawn],needle:[Sewing.NEEDLE.health,0,Sewing.NEEDLE.damage,Sewing.NEEDLE.interval,Sewing.NEEDLE.respawn],sewingKing:[Sewing.SEWING.health,Sewing.SEWING.armor,Sewing.SEWING.damage,Sewing.SEWING.interval,Infinity],boss:[BossPatterns.BOSS_RULES.health,60,BossPatterns.BOSS_RULES.attack,1.5,BossBuff.BOSS_BUFF.respawn]}[camp];
    return this.entity({kind:'neutral',team:2,camp,x,y,home:{x,y},campId:camp==='central'?'central':`${camp}-${x}`,campCenter:camp==='central'?MAP_CENTER:{x,y},campRadius:['central','boss'].includes(camp)?4.7:CAMP_RULES.radius,maxHp:stats[0],armor:stats[1],damage:stats[2],interval:stats[3],respawnDelay:stats[4],range:camp==='boss'?2.8:camp==='sewingKing'?1.6:1.4,radius:camp==='boss'?1.2:camp==='sewingKing'?.9:camp==='needle'?.35:clerk?.5*1.15:.5,creepVariant:camp==='side'?this.units.filter(e=>e.kind==='neutral'&&e.camp==='side').length%2:undefined,name:{central:'시지프의 잔재',side:'굶주린 르카키',needle:'바늘이',sewingKing:'바느질의 왕',blessing:CampBuffs.BUFF_CREEPS.blessing.name,amplify:CampBuffs.BUFF_CREEPS.amplify.name,boss:'쌓인 것'}[camp],sweep:2.5});
  }
  makeChampion(key,team,index,position=POSITION_ORDER[index%4]) {
    const c=CHAMPIONS[key];
    const e=this.entity({kind:'champion',key,team,index,position,lane:POSITIONS[position].lane,player:team===0&&index===0,
      x:FOUNTAINS[team].x,y:FOUNTAINS[team].y+(index-1.5)*.85,radius:.48,maxHp:RULES.health[c.health],name:c.name,
      level:1,xp:0,gold:250,kills:0,deaths:0,assists:0,streak:0,ammo:key==='ezra'?1:c.ammo,reloadProgress:0,qCd:0,rCd:0,
      range:c.range,armor:RULES.armor[c.armor],augments:[],supporters:{},upgrades:{power:0,health:0,speed:0,haste:0,reload:0},marks:0,basicHits:{},buffs:{},
      supportStacks:0,supportReady:0,supportUntil:0,passiveReady:0,sniperReady:0,path:[],pathAt:0,
      respawnAt:0,retreat:false,contributors:{},totalDamage:0,state:{},buffHistory:{},visuals:{},lastAttackAt:-99,lastDamageAt:-99,
    });
    Skills.init?.(this,e);e.maxHp=this.maxHp(e);e.hp=e.maxHp;return e;
  }
  emitSound(kind,source={},extra={}){if(source.kind==='minion')return;const damageKind=extra.damageKind||source.actionKind||(['swing','shot'].includes(kind)?'basic':undefined),slot=extra.slot||((damageKind==='skill'||['cast','ultimate'].includes(kind))?source.castSlot:undefined);this.soundEvents.push({id:++this.soundSerial,kind,key:source.key,sourceId:source.id,sourceKind:source.kind,camp:source.camp,damageKind,slot,form:source.key==='sora'&&this.buff(source,'soraEgo')?'ego':source.key==='yan'&&this.buff(source,'yanDistorted')?'distorted':'base',stance:source.state?.weapon,transforming:source.key==='sora'&&source.state?.unlock>=5||source.key==='yan'&&source.state?.ominous>=6,x:source.x,y:source.y,at:this.time,...extra});if(this.soundEvents.length>64)this.soundEvents.shift();}

  log(text,kind='system',team=null) { this.logs.unshift({text,kind,time:this.time,team}); this.logs=this.logs.slice(0,10); }
  announce(...args){return Combat.announce(this,...args);}
  currentAnnouncement(){return Combat.currentAnnouncement(this);}
  bounty(e){return Combat.bounty(e);}
  champions(team) { return this.units.filter(u=>u.kind==='champion'&&(team===undefined||u.team===team)); }
  towers(team) { return this.units.filter(u=>u.kind==='tower'&&u.team===team&&u.alive); }
  locked(e) { return e.kind==='core'&&this.towers(e.team).length===2; }
  hostile(a,b) { return a.team!==b.team&&b.alive&&b.kind!=='summon'&&!this.hidden(b); }
  hidden(e) { return introHidden(this,e)||Infiltration.absent(e)||e.untargetableUntil>this.time; }
  bushAt(e) {return (this.training?Training.bushes(this):BUSHES).find(b=>regionContains(b,e));}
  visibleTo(team,e) {
    if(e.kind!=='champion'||e.team===team)return true;
    if(this.towers(team).some(t=>distance(t,e)<=t.range)||this.units.some(t=>t.alive&&t.kind==='bait'&&t.team===team&&distance(t,e)<=8))return true;
    if(this.champions(team).some(a=>a.alive&&(a.key==='honglu'&&a.state.insightUntil>this.time&&distance(a,e)<=8.5||a.key==='gahwan'&&(e.state?.gaze?.[a.id]?.n>0&&e.state.gaze[a.id].until>this.time||e.state?.contempt?.[a.id]>this.time))))return true;
    const bush=this.bushAt(e);
    if(!bush||e.revealedUntil>this.time||this.time-e.lastCombat<=1.25)return true;
    return this.champions(team).some(a=>a.alive&&!this.hidden(a)&&(distance(a,e)<=2.5||this.bushAt(a)?.id===bush.id));
  }
  stat(e,key) { if(Yan.barraging(this,e)&&['stun','root','silence','slow','disarm','taunt','captured','netCapture'].includes(key))return 0;return e.status[key]?.until>this.time ? e.status[key].amount : 0; }
  buffValue(e,key,value=1){return this.buff(e,key)?value*(e.buffPotency?.[key]??1):0;}
  baseSpeed(e){return RULES.speed[CHAMPIONS[e.key].speed];}
  buff(e,key) { return key==='sewingStitches'?e.kind==='champion'&&Boolean(this.sewingTeams[e.team]):e.buffs?.[key]>this.time; }
  random(){this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;}
  enterController(e){
    const control=this.controllers?.get(e.id);if(!control?.connected||e===this.player)return null;
    const previous={player:this.player,input:this.input,mobileInput:this.mobileInput,mobileAim:this.mobileAim,flag:e.player};
    this.player=e;this.input=control.input;this.mobileInput=control.mobileInput;this.mobileAim=control.mobileAim;e.player=true;
    return ()=>{control.input=this.input;control.mobileAim=this.mobileAim;e.player=previous.flag;this.player=previous.player;this.input=previous.input;this.mobileInput=previous.mobileInput;this.mobileAim=previous.mobileAim;};
  }
  withController(e,fn){const restore=this.enterController(e);try{return fn();}finally{restore?.();}}
  action(e,kind,fn){const restore=this.controllers?this.enterController(e):null,old=e.actionKind,previous=this.actionSource;e.actionKind=kind;this.actionSource=e;try{return fn();}finally{e.actionKind=old;this.actionSource=previous;restore?.();}}
  schedule(source,delay,fn,{autonomous=false}={}){const kind=source.actionKind||'skill';this.events.push({source,autonomous,at:this.time+delay,fn:()=>this.action(source,kind,fn)});}
  startMotion(e,d,len,{speed=RULES.dashSpeed,maxSpeed=RULES.dashSpeed,kind='dash',onStep,onComplete,onCollision,ignoreWalls=false,minDuration=0,follow=null,stopDistance=0,arcHeight=1.1,phaseEnemies=false,source,actionTag,forcedMaxSpeed=RULES.knockSpeed}={}){
    if(!e.alive||['boss','sewingKing'].includes(e.camp)||!['champion','minion','neutral','trooper'].includes(e.kind)||e.returning)return false;
    const forced=kind==='knock';
    if(forced&&(GuboUltimate.guarded(this,e)||e.invulnerableUntil>this.time||e.ccImmuneUntil>this.time||e.state?.donCharge||Yan.barraging(this,e)))return false;
    if(forced&&Augments.interceptCC(this,e,'knock',1,len/Math.max(1,speed)))return false;
    if(!forced&&(this.stat(e,'root')||this.stat(e,'stun')||this.stat(e,'captured')||e.state?.posthumous||e.motion))return false;
    if(forced&&e.state?.swordHeldBy){const owner=this.units.find(a=>a.id===e.state.swordHeldBy);if(owner)V12.releaseGrab(this,owner);}
    const actionKind=e.actionKind||'skill',wrap=fn=>fn&&((...args)=>this.action(e,actionKind,()=>fn(...args)));
    onStep=wrap(onStep);onComplete=wrap(onComplete);onCollision=wrap(onCollision);
    this.cancelRecall(e);e.motion={actionTag,visualOrigin:{x:e.x,y:e.y},actionKind,phaseEnemies:!forced&&phaseEnemies,lastClear:{x:e.x,y:e.y},dx:d.x,dy:d.y,remaining:len,total:len,speed:Math.min(speed,forced?forcedMaxSpeed:maxSpeed),kind,arcHeight,forced,onStep,onComplete,onCollision,ignoreWalls,startedAt:this.time,elapsed:0,minDuration,follow,stopDistance};
    if(forced&&len>0)this.triggerDisrupt(source,e);
    if(len<.001&&!minDuration){delete e.motion;onComplete?.();}return true;
  }
  updateMotion(e,dt){
    const m=e.motion;if(!m)return;
    if(!e.alive||!m.forced&&(this.stat(e,'stun')||this.stat(e,'root'))){delete e.motion;if(m.kind==='leap'||e.key==='sinclair'&&e.castSlot==='r')e.untargetableUntil=0;if(e.alive){if(m.ignoreWalls&&this.blocked(e.x,e.y,e.radius))Object.assign(e,m.lastClear);settleBody(this,e,m.lastClear);}return;}
    if(m.follow?.alive){const d=direction(e,m.follow);m.dx=d.x;m.dy=d.y;m.remaining=Math.max(0,distance(e,m.follow)-m.stopDistance);}
    m.elapsed+=dt;
    const length=Math.min(m.remaining,m.speed*dt),n=Math.max(1,Math.ceil(length/.12));let collided=false,collision;
    for(let i=0;i<n&&e.alive&&e.motion===m;i++){
      const from={x:e.x,y:e.y},next={x:e.x+m.dx*length/n,y:e.y+m.dy*length/n};
      if(!withinTrap(this,e,next)||!m.ignoreWalls&&!canOccupy(this,e,next,{phaseEnemies:m.phaseEnemies})){collided=true;const obstacle=this.units.find(t=>solid(this,e,t,{phaseEnemies:m.phaseEnemies})&&distance(next,t)<e.radius+t.radius+.006);collision={kind:!withinTrap(this,e,next)?'confinement':!m.ignoreWalls&&this.blocked(next.x,next.y,e.radius)?'terrain':['tower','core'].includes(obstacle?.kind)?'structure':'unit',obstacle,point:next};break;}
      e.x=clamp(next.x,this.bounds.x+e.radius,this.bounds.x+this.bounds.w-e.radius);e.y=clamp(next.y,this.bounds.y+e.radius,this.bounds.y+this.bounds.h-e.radius);m.remaining-=length/n;
      shiftCarried(this,e,from,e);m.onStep?.(from,{x:e.x,y:e.y});
      if(canOccupy(this,e,e,{phaseEnemies:false}))m.lastClear={x:e.x,y:e.y};
    }
    if(!e.alive||e.motion!==m)return;
    if(m.remaining<=1e-6&&m.elapsed+1e-8>=m.minDuration||collided){delete e.motion;if(m.kind==='leap')e.untargetableUntil=0;settleBody(this,e,m.lastClear);if(collided)m.onCollision?.(collision);m.onComplete?.({collided});}
  }
  safeLanding(e,point,max=Infinity){
    const d=direction(e,point),b=this.bounds,len=Math.min(max,distance(e,point));
    for(let n=len;n>=0;n-=.08){const p={x:clamp(e.x+d.x*n,b.x+e.radius,b.x+b.w-e.radius),y:clamp(e.y+d.y*n,b.y+e.radius,b.y+b.h-e.radius)};if(canOccupy(this,e,p,{phaseEnemies:false}))return p;}
    return {x:e.x,y:e.y};
  }
  recall(e){
    if(e.recall||Infiltration.absent(e)){this.cancelRecall(e);return true;}
    if(e.kind!=='champion'||!e.alive||e.state.posthumous||e.motion||this.hidden(e)||this.stat(e,'stun')||e.channelUntil>this.time||this.winner!==null)return false;
    if(Infiltration.replacesRecall(this,e))return Infiltration.begin(this,e);
    if(e.state.chargeAt!==undefined){delete e.state.chargeAt;delete e.status.slow;}
    Yan.cancelCharge(e);Hohenheim.cancelCharge(e);e.recall={startedAt:this.time,until:this.time+RULES.recallTime*(this.buff(e,'bossBuff')?BossBuff.BOSS_BUFF.recall:1),x:e.x,y:e.y};
    if(e.player){this.input.fire=false;this.input.x=0;this.input.y=0;}return true;
  }
  infiltrate(e,point){return Infiltration.confirm(this,e,point);}
  cancelRecall(e){if(Infiltration.cancel(this,e)){if(e.player)this.log('침투 취소','system');return;}if(e.recall){delete e.recall;if(e.player)this.log('귀환 취소','system');}}
  updateRecall(e){
    if(!e.recall)return;
    if(this.stat(e,'stun')||this.stat(e,'root')){this.cancelRecall(e);return;}
    if(e.recall.until<=this.time+1e-8){if(e.recall.infiltration){Infiltration.complete(this,e);return;}if(!withinTrap(this,e,this.spawnPoint(e))){this.cancelRecall(e);return;}Object.assign(e,this.spawnPoint(e));delete e.recall;e.path=[];e.retreat=false;this.effects.push({type:'ring',x:e.x,y:e.y,r:2.5,color:'#94d6e3',life:1,maxLife:1});if(e.player)this.log('귀환 완료 · 부활소', 'ally');}
  }
  campTimers({upcoming=false}={}){const scheduled=upcoming&&!this.training&&!this.sewingKingSpawned?[{id:'sewing-spawn',name:'바느질의 왕',home:Sewing.NORTH_CAMP,seconds:Math.max(0,Math.ceil(Sewing.SEWING.spawnAt-this.time)),total:Sewing.SEWING.spawnAt,campId:'sewing-spawn',upcoming:true}]:[];return [...scheduled,...this.units.filter(e=>e.kind==='neutral'&&!e.retired&&!e.summonedNeedle&&!e.alive&&Number.isFinite(e.respawnAt)&&e.respawnAt>this.time&&!(e.camp==='central'&&this.bossSpawned)).map(e=>({id:e.id,name:e.name,home:e.home,seconds:Math.ceil(e.respawnAt-this.time),total:e.respawnDelay,campId:e.campId}))];}
  campViews(){
    const groups=new Map();
    for(const e of this.units.filter(u=>u.kind==='neutral'&&!u.retired&&!u.summonedNeedle&&!(u.camp==='central'&&this.bossSpawned))){
      if(!groups.has(e.campId))groups.set(e.campId,{id:e.campId,kind:e.camp,name:e.name,home:e.campCenter,radius:e.campRadius,units:[]});
      groups.get(e.campId).units.push(e);
    }return [...groups.values()];
  }
  addBuff(e,key,seconds,{copy=true,strength=1}={}){
    const wasActive=this.buff(e,key);if(wasActive&&(e.buffPotency?.[key]??1)>strength)return;e.buffPotency??={};e.buffPotency[key]=strength;
    e.buffs[key]=this.time+seconds;e.buffHistory[key]={order:++this.buffSequence,until:e.buffs[key]};
    e.visuals[key]={until:this.time+seconds,theme:e.key,at:this.time};CampBuffs.onBuff(this,e,key,wasActive);this.syncDesire(e);if(key==='yanDistorted')Augments.absorbOrder(this,e);
  }
  activeBuffs(e){
    for(const [key,until] of Object.entries(e.buffs))if(until>this.time&&e.buffHistory[key]?.until!==until)e.buffHistory[key]={order:++this.buffSequence,until};
    const buffs=Object.entries(e.buffs).filter(([,t])=>t>this.time).map(([key,until])=>({key,until,order:e.buffHistory[key]?.order||0}));if(this.buff(e,'sewingStitches'))buffs.push({key:'sewingStitches',until:Infinity,order:this.sewingBuffOrder,permanent:true});return buffs.sort((a,b)=>b.order-a.order);
  }
  canNaturalHeal(e){return e.alive&&!e.state.posthumous&&!e.state.detonating&&this.time-Math.max(e.lastAttackAt,e.lastDamageAt)>=RULES.naturalHealDelay-1e-8;}
  selfDamage(e,amount,{nonLethal=false,ignoreRegen=false}={}){e.hp=Math.max(nonLethal?1:0,e.hp-amount);if(!ignoreRegen)e.lastDamageAt=this.time;if(e.hp<=0)this.kill(e,e);}
  heal(source,e,amount,scale=true,{natural=false,healingKey,startedAt,skillHeal=false}={}){if(!e.alive||e.state?.posthumous)return 0;const value=Math.max(0,scale&&source?.kind==='champion'?damageFormula(amount,CHAMPIONS[source.key].power,1)*this.powerScale(source):amount);const unlimited=Boolean(e.trainingDummy?.infinite&&e.team===0),actual=unlimited?value:Math.min(e.maxHp-e.hp,value);if(e.key==='dongrang'&&!natural&&source===e)e.totalHealingReceived=(e.totalHealingReceived||0)+actual;e.hp=unlimited?e.maxHp:e.hp+actual;if(this.training&&!natural)Training.recordMetric(this,e,'healing',actual,{source,healingKey,startedAt});if(e.key==='queequeg')e.state.endurance=V08.endurance(e);if(actual>0&&!natural&&source?.team===e.team)combatNumber(this,e,actual,{heal:true,source});if(actual>0&&source?.team===e.team&&source!==e){e.supporters[source.id]=this.time;if(source.key==='honglu'&&skillHeal&&!natural){this.addBuff(source,'hongluCare',3,{copy:false});this.addBuff(e,'hongluCare',3,{copy:false});}}return actual;}
  combatPower(e){if(e.lcaTrooper)return e.snapshot.power*(1+Jamila.squadBonus(this,e))*(1-this.powerWeak(e));return CHAMPIONS[e.key].power*this.powerScale(e)*(1-this.powerWeak(e));}
  powerScale(e){if(e.lcaTrooper)return e.snapshot.damagePower/(RULES.power[1]*.9)*(1+Jamila.squadBonus(this,e));return e.key==='dongrang'?1:this.unconvertedPowerScale(e);}
  unconvertedPowerScale(e){return (CHAMPIONS[e.key].powerMultiplier??1)*(1+CHAMPIONS[e.key].growth.power*(e.level-1))*(1+upgradeRate(e,'power')*(e.key==='moses'?.5:1))*(e.key==='rodya'?1+this.haste(e)/3:1)*(1+Augments.powerRate(this,e))*(1+Augments.resentment(e))*(this.buff(e,'bossBuff')?1.15:1)*(1+this.buffValue(e,'amplify',CampBuffs.CAMP_BUFFS.power))*(e.key==='queequeg'?1+.04*(V08.endurance(e)):1)*(Sora.ego(this,e)?1+Sora.SORA.egoPower:1)*(1+Jamila.squadBonus(this,e))*(Yan.distorted(this,e)?.9:1)*(this.buff(e,'faustUlt')?1+.1*(e.ultStacks||0):1);}
  allyExecuteThreshold(e){return this.buff(e,'guboReload')?RULES.allyExecuteBuffThreshold:RULES.allyExecuteThreshold;}
  canGuboHitAlly(source,target){return source.key==='gubo'&&target!==source&&target.team===source.team&&target.kind==='champion'&&target.alive&&!this.hidden(target)&&target.hp>0&&target.hp<=target.maxHp*this.allyExecuteThreshold(source)+1e-8;}
  powerWeak(e){return Math.max(this.stat(e,'weak'),this.stat(e,'yanLock'),Math.max(0,...Object.values(e.state?.ishmaelWeak||{}).filter(v=>v.until>this.time).map(v=>v.stacks))*.02);}
  desireEfficiency(e,stat='health'){if(e.key!=='dongrang')return 1;const extra=Math.max(0,this.unconvertedPowerScale(e)*(1+this.buffValue(e,'power',.12))*(this.buff(e,'marks')?1.12:1)-1);return 1+extra*(stat==='armor'?.1:.3);}
  syncDesire(e){if(e.key!=='dongrang'||e.kind!=='champion')return;const ratio=e.maxHp>0?e.hp/e.maxHp:1,next=this.maxHp(e);e.maxHp=next;if(e.alive)e.hp=Math.min(next,Math.max(0,ratio*next));}
  armor(e){const armor=(e.armor||0)+(e.kind==='champion'&&e.key==='queequeg'?12*(V08.endurance(e)):0)+this.buffValue(e,'tetherArmor',30)+(e.key==='dongbaek'&&e.qCd<=0?20:0);return ((100+armor)*(1+Augments.resentment(e)+Augments.armorRate(this,e))*(1+this.buffValue(e,'chainArmor',.1))*(1+this.buffValue(e,'tetherGuard',.1))*(e.key==='ahab'&&e.state.order==='guard'?1.12:1)*(Yan.distorted(this,e)?1.12:1)*(this.buff(e,'faustUlt')?1+.1*(e.ultStacks||0):1)*(this.buff(e,'queegAttack')?1.07:1)*(e.state?.donCharge?1.5:1)*(e.key==='heathcliff'&&e.state.chargeAt!==undefined?1.12:1)*(this.buff(e,'heathUlt')?1.2:1)*(1+this.buffValue(e,'hongluCare',.07))-100)*this.desireEfficiency(e,'armor')*(e.key==='yan'&&e.state.yanCharge?1+Yan.YAN.chargeArmor:1)*(Sora.ego(this,e)?Sora.SORA.egoArmor:1)*(1-this.stat(e,'armorWeak'));}
  rewindCooldowns(e,seconds){e.qCd+=seconds;e.rCd+=seconds;for(const key of ['knifeReady','treeReady','ryoshuReady','egoQReady'])if(Number.isFinite(e.state[key]))e.state[key]+=seconds;if(['nelly','dongrang'].includes(e.key))e.state.qDelayUntil=Math.max(this.time,e.state.qDelayUntil||0)+seconds;}
  attackStyle(e){if(Sora.ego(this,e))return 'sweep';return e.key==='ezra'?(this.buff(e,'ezraUlt')||[1,2].includes(e.state.weapon||0)?'slash':'punch'):CHAMPIONS[e.key]?.attackStyle;}
  passiveCooldown(e){
    const ready={yi:e.passiveReady,kim:e.passiveReady,ishmael:e.passiveReady,gregor:e.state.mutateReady,sora:e.state.orderAt,don:e.state.villainAt,rudolph:e.state.exhaustedUntil,dongbaek:Number.isFinite(e.state.petalReady)?e.state.petalReady:0,ryoshu:e.lastCombat+2}[e.key]||0;
    return Math.max(0,ready-this.time);
  }
  cooldown(e,slot){if(e.key==='yan'&&slot==='q'&&Yan.distorted(this,e))return 5*(Augments.has(e,'cooldown15')?.85:1)*Augments.cooldownFactor(e)/(1+this.haste(e));return (e.key==='sora'&&slot==='q'&&Sora.ego(this,e)?Sora.SORA.egoQCooldown:CHAMPIONS[e.key][slot])*(Augments.has(e,'cooldown15')?.85:1)*Augments.cooldownFactor(e)/(1+this.haste(e));}
  attackInterval(e){const c=CHAMPIONS[e.key];return c.attackTime*(c.attackTime<=RULES.fastAttackThreshold?1:RULES.attackIntervalMultiplier);}
  reloadPaused(e){if(e.key==='dongbaek'&&this.stat(e,'disarm'))return true;if(e.key==='dongbaek'&&e.state.usedPetal&&e.attackCd>0)return false;if(Sora.ego(this,e)||e.key==='alisa'&&this.buff(e,'alisaReload'))return false;if(e.key==='sinclair'&&this.buff(e,'marks')||e.key==='myo'&&this.buff(e,'rabbitFrenzy'))return false;return e.attackCd>1e-8||Boolean(e.state.donCharge)||e.player&&this.input.fire&&(e.ammo>=1||e.key==='dongbaek'&&(e.state.petals??3)>0)&&!this.stat(e,'stun')&&!this.stat(e,'disarm')&&!e.motion;}
  ammoCap(e){return Skills.ammoCap(this,e);}
  attackRange(e){if(e.key==='hohenheim')return Hohenheim.attackRange(this,e);return ((Sora.ego(this,e)?Sora.SORA.egoRadius:e.range)+(e.key==='yi'&&this.buff(e,'ogamdo')?1:0))*(e.key==='gregor'&&this.buff(e,'mutant')?1.3:1)+Augments.rangeBonus(e);}
  bonusStats(e){
    const power=this.powerScale(e)*Skills.damageBonus(this,e,{hp:e.hp,maxHp:e.maxHp})*(e.key!=='dongrang'&&this.buff(e,'marks')?1.12:1)*(1-this.powerWeak(e));
    return {power:Math.round((power-1)*100),health:Math.round((e.maxHp/RULES.health[CHAMPIONS[e.key].health]-1)*100+1e-8),speed:Math.round((this.speed(e)/RULES.speed[CHAMPIONS[e.key].speed]-1)*100),haste:Math.round(this.haste(e)*100),reload:Math.round((e.key==='jamila'?this.reloadMultiplier(e)-1:RULES.reload[Skills.reloadGrade(e)]/this.reloadInterval(e)-1)*100)};
  }
  shield(e) { return e.shields.filter(s=>s.until>this.time).reduce((sum,s)=>sum+s.value,0); }
  yiShield(e){return e.shields.find(s=>s.value>0&&s.until>this.time&&s.passive==='yi');}
  bonusHealthPercent(e){return Math.max(0,(this.maxHp(e)/(RULES.health[CHAMPIONS[e.key].health]*(CHAMPIONS[e.key].healthMultiplier||1))-1)*100);}
  maxHp(e) { if(e.lcaTrooper)return e.snapshot.maxHp;if(e.trainingDummy)return e.trainingDummy.hp*Infestation.factor(this,e);return RULES.health[CHAMPIONS[e.key].health]*(CHAMPIONS[e.key].healthMultiplier||1)*(1+CHAMPIONS[e.key].growth.health*(e.level-1))*(1+upgradeRate(e,'health'))*(this.buff(e,'mutant')?1.15:1)*(1+Augments.healthRate(e))*this.desireEfficiency(e)*(Sora.ego(this,e)?.8:1)*(Yan.distorted(this,e)?1.12:1)*Infestation.factor(this,e); }
  speed(e) {
    if(e.state?.posthumous||e.state?.ishmaelCast)return 0;
    if(e.lcaTrooper)return e.snapshot.speed*(1+Jamila.squadBonus(this,e))*(1-Math.min(.5,Math.max(this.stat(e,'slow'),this.stat(e,'yanLock'))));
    if(e.kind!=='champion') return e.kind==='minion'?2.5:CampBuffs.BUFF_CREEPS[e.camp]?2.7*.85:2.7;
    const c=CHAMPIONS[e.key],base=RULES.speed[c.speed]; let mult=1+upgradeRate(e,'speed')+ c.growth.speed*(e.level-1)+Augments.speedRate(this,e)+Jamila.squadBonus(this,e);
    if(e.key==='gregor'&&this.buff(e,'mutant'))mult+=.1;
    if(Yan.barraging(this,e))mult+=Yan.YAN.qSpeed;
    if(Sora.ego(this,e))mult+=.1;mult+=this.buffValue(e,'soraScratch',.05);
    if(this.buff(e,'rabbitHunt'))mult+=(e.state.rabbitStacks||0)*.2;
    mult+=this.buffValue(e,'rabbitFrenzy',.4);
    mult+=this.buffValue(e,'flowerStride',.2);
    mult+=this.buffValue(e,'martonStride',.12);
    mult+=this.buffValue(e,'insight',.4);
    mult+=this.buffValue(e,'queegAttack',.07);
    mult+=this.buffValue(e,'martonDrain',.3);
    mult+=this.buffValue(e,'queequegUlt',.25);
    mult+=this.buffValue(e,'tetherStride',.25);
    if(e.key==='ahab'&&e.state.order==='guard')mult+=.12;
    mult+=this.buffValue(e,'hohenheimStride',.3);
    mult+=this.buffValue(e,'hohenheimHitStride',.25);
    if(Augments.has(e,'blackOrb'))mult+=.1;mult+=this.buffValue(e,'ampuleStride',.3);
    if(Augments.has(e,'adaptiveSpeed'))mult+=this.time-e.lastCombat>3?.15:.07;
    mult+=this.buffValue(e,'resolve',.25)+this.buffValue(e,'infiltrationStride',.1);
    mult+=this.buffValue(e,'marks',.15);
    mult+=this.buffValue(e,'ishmaelShield',.2)+this.buffValue(e,'hongluCare',.07);
    mult+=this.buffValue(e,'heathUlt',.35)+this.buffValue(e,'ishmaelSurvive',.25);
    mult+=this.buffValue(e,'executedHaste',.4);
    mult+=this.buffValue(e,'alisaHaste',.3);
    if(this.buff(e,'coinSpeed'))mult+=(e.state.coinTails||0)*.4/base;
    if(e.key==='ryoshu'&&this.time-e.lastCombat>=2)mult+=.1;
    if(e.buffs.ogamdo>this.time) mult+=this.buffValue(e,'ogamdo',.25)*(e.buffs.ogamdo-this.time)/4;
    mult*=1-Math.min(.5,Math.max(this.stat(e,'slow'),this.stat(e,'yanLock')));
    const minimum=.5;
    return clamp(Math.max(this.buff(e,'rabbitFrenzy')?4:0,base*mult),base*minimum,base*1.6)*(e.state.alisaUltimateChannel?.5:1)*(e.key==='kim'&&carried(this,e)?.9:1)*(e.key==='yan'&&e.state.yanCharge?.9:1)*(e.key==='hohenheim'&&e.state.hohenCharge?.8:1)*(e.state.donCharge?.9:1)*(e.state.gregorPulls?.length?.8:1)*(1-.99*clamp(((e.state.chainRecoveryUntil||0)-this.time)/.275,0,1));
  }
  reloadRate(e){return (this.reloadPaused(e)?Math.max(Augments.has(e,'wisdom')?.3:0,Augments.has(e,'reloadStacks')&&e.state.augReloadStacks>=5?.15:0):1)*(e.key==='dongbaek'&&e.state.usedPetal&&e.attackCd>0?.5:1);}
  discipline(e){return this.shield(e)>0&&e.shields.some(s=>s.value>0&&s.until>this.time&&s.source.startsWith('sword-'));}
  haste(e) { return Math.max(0,upgradeRate(e,'haste')+(Augments.has(e,'carrier')?.03:0)+this.extraRate(e)+(this.discipline(e)?.12:0)+this.buffValue(e,'augBattleHaste',.25)+(Augments.has(e,'forceBattery')&&this.shield(e)>=e.maxHp*.1-1e-8?.1:0)-this.stat(e,'hasteWeak')); }
  extraRate(e){return (e.key==='ryoshu'&&this.time-e.lastCombat>=2?.2:0)+this.buffValue(e,'ishmaelSurvive',.2)+(this.buff(e,'coins')?(e.state.coinHeads||0)*.08:0)+this.buffValue(e,'mosesWhite',.15)+(e.key==='moses'?upgradeRate(e,'power')*.5*.6:0);}
  reloadMultiplier(e){if(e.lcaTrooper)return Math.max(.2,e.snapshot.reload-this.stat(e,'reloadWeak'));return Math.max(e.key==='moses'?.85:.2,1+upgradeRate(e,'reload')+Augments.resentment(e)+Augments.reloadRate(this,e)+(Augments.has(e,'blackOrb')?.1:0)+(Sora.ego(this,e)?Sora.SORA.egoReload:0)+(e.key==='ahab'?.15:0)+this.buffValue(e,'queequegUlt',.4)+this.buffValue(e,'explore',.2)+this.buffValue(e,'marks',.2)+this.buffValue(e,'guboReload',.35)+this.extraRate(e)+(this.discipline(e)?.12:0)+(this.buff(e,'rabbitHunt')?(e.state.rabbitStacks||0)*.2:0)+this.buffValue(e,'rabbitFrenzy',.6)+this.buffValue(e,'alisaReload',.3)+(e.key==='dongbaek'&&e.qCd<=0?.2:0)+this.buffValue(e,'flowerReload',.2)+this.buffValue(e,'outisReload',.3)+(Augments.has(e,'reloadStacks')?(e.state.augReloadStacks||0)*.05:0)+(e.key==='ahab'&&this.buff(e,'ahabCover')?(e.state.coverStacks||0)*.2:0)-this.stat(e,'reloadWeak'));}
  reloadInterval(e){return e.key==='jamila'?Jamila.reloadDuration(this,e):RULES.reload[Skills.reloadGrade(e)]/(RULES.reloadEfficiency*this.reloadMultiplier(e));}
  support() {}
  addShield(target,value,source,seconds=3,copy=true) {
    target.shields=target.shields.filter(s=>s.until>this.time);
    const old=target.shields.find(s=>s.source===source),previous=old?.value||0;
    const others=target.shields.filter(s=>s!==old).reduce((n,s)=>n+s.value,0);
    const amount=Math.min(Math.max(old?.value||0,value),Math.max(0,target.maxHp*.35-others));
    if(old) {old.value=amount;old.until=this.time+seconds;}
    else target.shields.push({source,value:amount,until:this.time+seconds});
    const supporter=this.champions(target.team).find(c=>source.endsWith(`-${c.id}`));if(supporter&&supporter!==target)target.supporters[supporter.id]=this.time;
    Jamila.shareShield(this,target,Math.max(0,amount-previous),seconds,source);
    target.visuals??={};target.visuals.shield={until:this.time+seconds,theme:source.startsWith('yi-')?'yi':target.key,at:this.time};
  }
  triggerDisrupt(source,target){Augments.onDebuff(this,source||this.actionSource,target);}
  debuffImmune(e){return Debuffs.immune(this,e);}
  status(e,key,amount,seconds,source) {
    source??=this.actionSource;
    if(!e.alive||Infiltration.absent(e)||this.training&&e===this.player&&this.practice.invincible||e.returning||this.debuffImmune(e)||e.ccImmuneUntil>this.time||e.invulnerableUntil>this.time||GuboUltimate.guarded(this,e))return;
    if(Yan.barraging(this,e)&&['stun','root','silence','slow','disarm','taunt','captured','netCapture'].includes(key))return;
    if(e.key==='meursault'&&['root','stun'].includes(key)){this.status(e,'silence',amount,seconds,source);this.status(e,'disarm',amount,seconds,source);return;}
    if(Augments.interceptCC(this,e,key,amount,seconds))return;
    if(this.buff(e,'tetherResistance'))seconds*=1-Math.min(.2,(e.state.tetherResistance||0)*.05);
    if(e.status[key]?.until>this.time&&e.status[key].amount>amount){return;}
    e.status[key]={amount,until:this.time+seconds,theme:source?.key};
    (e.statusHistory??={})[key]={order:++this.buffSequence,until:e.status[key].until};
    if(amount>0&&seconds>0)this.triggerDisrupt(source,e);
  }
  award(e,xp,gold,{passive=false,assist=false,sharedMinion=false}={}) {
    if(!e||e.kind!=='champion'||e.trainingDummy) return;
    e.gold+=gold;if(this.training&&e.player&&this.practice.pauseXp)return; e.xp+=xp*(e.key==='ppui'&&(assist||sharedMinion)?1.15:1);
    const level=1+RULES.xp.slice(1).filter(n=>e.xp>=n).length;
    if(level>e.level) {
      const old=e.maxHp;e.level=level;e.maxHp=this.maxHp(e);if(e.alive)e.hp+=e.maxHp-old;
      if(e.player)this.log(`레벨 ${level} 달성`, 'ally');
      this.effects.push({type:'ring',x:e.x,y:e.y,r:2,color:'#d9be78',life:1,maxLife:1});
    }
  }
  deal(source,target,base,{fixed=false,proc=true,allowFriendly=false,damageKind=source.actionKind||'skill',nonLethal=false,transferred=false,campBonus=true,rawPower=false,sound={}}={}) {
    const alliedAllowed=allowFriendly&&this.canGuboHitAlly(source,target);
    if(!target.alive||GuboUltimate.guarded(this,target)||target.state?.posthumous||target.returning||(source.team===target.team&&!alliedAllowed)||this.hidden(target)||this.training&&target===this.player&&this.practice.invincible||target.invulnerableUntil>this.time||this.locked(target)||this.winner!==null) return 0;
    const pulsing=source.kind==='champion'&&this.buff(source,'amplify');
    let amount=base,bypass=0;
    if(!fixed) {
      if((source.kind==='champion'||source.lcaTrooper)&&!source.trainingDummy&&!rawPower) {
        const normal=source.lcaTrooper?source.snapshot.damagePower*(1+Jamila.squadBonus(this,source)):damageFormula(1,CHAMPIONS[source.key].power,1,0)*this.powerScale(source),factor=source.key==='jamila'&&damageKind==='basic'?1+(normal-1)*Jamila.JAMILA.powerRatio:normal;
        amount=(source.key==='dongrang'?base:base*factor)*(1-this.powerWeak(source))*Skills.damageBonus(this,source,target)*(1+this.stat(target,'vulnerable'));
        if(source.key!=='dongrang'&&this.buff(source,'marks'))amount*=1.12;
      }
      amount*=Skills.receivedMultiplier?.(this,source,target,damageKind)??1;
      if(source.kind==='champion'&&Augments.converts(this,source)){bypass=amount*.1;amount*=.9;}
      if(target.state?.outisRush)amount*=.5;
      amount*=100/(100+Math.max(0,this.armor(target)-this.stat(target,'armorDown'))*(1-Math.min(1,Augments.armorPen(source)+(source.kind==='tower'?Towers.TOWER_RULES.armorPen:0))));
      if(target.kind==='minion'&&['tower','core'].includes(source.kind))amount*=target.siege?.5:target.ranged?.8:.7;
      if(target.kind==='champion') {
        if(target.key==='heathcliff'&&source.hp/source.maxHp>target.hp/target.maxHp)amount*=.9;
        if(this.buff(target,'resolve'))amount*=1-this.buffValue(target,'resolve',.3);
        if(Yan.barraging(this,target))amount*=.7;
        if(this.buff(target,'ezraUlt'))amount*=.8;
        if(target.key==='myo'&&this.buff(target,'rabbitFrenzy')&&target.motion?.kind==='dash'&&target.motion.actionKind==='basic')amount*=.5;

      }
    }
    amount+=bypass;const convertedFraction=amount>0?bypass/amount:0;
    if(campBonus&&['tower','core'].includes(target.kind)) {
      const nearby=this.units.filter(u=>u.alive&&u.team!==target.team&&u.team!==2&&['champion','minion'].includes(u.kind)&&distance(u,target)<=target.range);
      if(!nearby.length)return 0;
      if((source.kind==='champion'||source.lcaTrooper)&&!nearby.some(u=>u.kind==='minion'))amount*=.2;
      if(source.siege)amount*=1.35*1.08;
    }
    if(campBonus&&target.kind==='neutral'&&(target.pattern||target.exposedUntil>this.time))amount*=1.2;
    if(campBonus&&target.kind==='minion'&&target.siege&&!['tower','core'].includes(source.kind))amount*=.925;
    if(campBonus&&source.key==='starbuck'&&target.kind==='neutral')amount*=1.12;
    if(!transferred&&campBonus)amount*=Skills.coverMultiplier(this,source,target);
    source.lastCombat=this.time;target.lastCombat=this.time;
    target.lastDamageAt=this.time;
    if(amount>0)this.cancelRecall(target);
    if(source.kind==='champion') {
      source.lastAttackAt=this.time;
      if(target.kind==='champion'&&source.team!==target.team) {
        for(const u of this.units) if(u.alive&&u.team===target.team&&!['champion','tower'].includes(u.kind)&&distance(u,source)<(u.range||2)+1) {u.aggro=source.id;u.aggroUntil=this.time+3;}
      }
      if(target.kind==='neutral')target.aggro=source.id;
    }
    if(target.kind==='neutral'&&amount>0){if(target.camp==='boss')BossPatterns.engage(this,target);else if(target.camp==='sewingKing')Sewing.engage(this,target);else CreepPatterns.engage(this,target);target.aggro=source.id;}
    if(!transferred&&campBonus){amount=Skills.transfer(this,source,target,amount,damageKind);amount=V08.transfer(this,source,target,amount,damageKind);}
    if(this.buff(target,'queequegUlt')||target.state?.counter)nonLethal=true;
    let remaining=amount;
    for(const s of target.shields) {if(s.until<=this.time)continue;const take=Math.min(s.value,remaining);s.value-=take;remaining-=take;}
    const absorbed=Math.max(0,amount-remaining);
    const infinite=Boolean(target.trainingDummy?.infinite);if(infinite)nonLethal=true;const measured=Math.max(0,remaining);
    if(nonLethal)remaining=Math.min(remaining,Math.max(0,target.hp-1));
    const saved=!nonLethal&&Augments.interceptFatal(this,target,remaining);if(saved)remaining=0;
    const hpBefore=target.hp,actual=infinite?measured:Math.min(target.hp,Math.max(0,remaining));target.hp=infinite?target.maxHp:Math.max(0,target.hp-remaining);if(this.training)Training.recordMetric(this,target,'damage',actual);
    if(actual+absorbed>0)this.emitSound('hit',source,{x:target.x,y:target.y,damageKind,slot:damageKind==='skill'?source.castSlot:undefined,periodic:fixed&&!proc,shielded:absorbed>actual,strength:Math.min(1.5,(actual+absorbed)/160),targetKind:target.kind,...sound});
    if(actual+absorbed>0&&source.kind==='champion'&&target.kind==='champion'&&source.team!==target.team){
      target.lastEnemyDamage={id:source.id,at:this.time};target.contributors[source.id]=this.time;
      for(const [id,at] of Object.entries(source.supporters))if(at>=this.time-6)target.contributors[id]=this.time;
      for(const [id,at] of Object.entries(target.supporters))if(at>=this.time-6)source.contributors[id]=this.time;
    }
    if(!fixed&&source.key==='outis'&&source.alive&&actual+absorbed>0&&distance(source,target)<=2.5&&(source.state.closeShieldReady||0)<=this.time){source.state.closeShieldReady=this.time+1;this.addShield(source,80,`outis-close-${source.id}`,5);}
    Augments.convertedShield(this,source,(actual+absorbed)*convertedFraction);
    Towers.onDamage(this,source,target,actual+absorbed);
    Skills.afterDamage(this,source,target,actual,proc,damageKind,absorbed);Jamila.afterDamage(this,source,target,actual,proc,damageKind,absorbed);
    V08.afterDamage(this,source,target,actual,proc,damageKind);
    Augments.afterHit(this,source,target,actual,proc,absorbed);
    target.hitFlashUntil=this.time+.1;target.hitFrom=Math.atan2(target.y-source.y,target.x-source.x);
    this.effects.push({type:'impact',x:target.x,y:target.y,angle:target.hitFrom,source:source.id,target:target.id,damageKind,slot:damageKind==='skill'?source.castSlot:undefined,theme:source.key,color:source.key==='gregor'?'#c49a73':source.team===0?'#e9f7df':'#f3b9a3',life:.24,maxLife:.24});
    if(source.kind==='champion') {source.totalDamage+=actual;if(source.player)this.damageDone+=actual;}
    combatNumber(this,target,actual+absorbed,{fixed,source});
    if(proc&&source.key==='yi'&&target.kind==='champion'&&source.passiveReady<=this.time) {
      for(const ally of this.champions(source.team).filter(c=>c.alive&&distance(c,source)<=10)){
        const id=`yi-${source.id}`,old=ally.shields.find(s=>s.source===id&&s.until>this.time)?.value||0;
        this.addShield(ally,Math.min(old+ally.maxHp*.05,ally.maxHp*.2),id);ally.shields.find(s=>s.source===id).passive='yi';this.support(source);
      }
      source.passiveReady=this.time+1.5;
    }
    if(target.alive&&target.hp<=0&&!target.state?.posthumous&&!Skills.interceptDeath(this,target,Combat.creditedKiller(this,target,source)||source))this.kill(target,source);
    CampBuffs.afterDamage(this,source,target,actual+absorbed,{campBonus:campBonus&&pulsing,transferred});
    Sewing.afterDamage(this,source,target,actual+absorbed,{hpBefore,campBonus});
    return actual;
  }
  kill(e,killer,{absolute=false}={}) {
    if(!e.alive||e.trainingDummy?.infinite&&!absolute)return;
    if(killer?.lcaTrooper)killer=Jamila.commander(this,killer)||killer;
    if(e.kind==='tower')this.emitSound('explosion',e,{global:true,element:'stone',phase:'tower-break'});else if(e.kind!=='minion')this.emitSound('death',e);GuboUltimate.cancel(this,e);
    const selfDetonation=e.key==='alisa'&&e.state.detonating&&!absolute,preserveCamps=selfDetonation&&e.state.blastArmed,campBuffs=e.kind==='champion'?CampBuffs.deathBuffs(this,e):[];delete e.burn;delete e.needleBleeds;Sewing.cancel(e);
    Infestation.clear(this,e);Yan.onDeath(this,e);Hohenheim.cancelCharge(e);Sora.onDeath(this,e);V12.onDeath(this,e);V08.onDeath(this,e);e.exposedUntil=0;e.alive=false;e.hp=0;delete e.motion;delete e.recall;if(e.kind==='neutral'){e.aggro=null;e.hostile=false;e.returning=false;delete e.outsideSince;CreepPatterns.cancel(e);if(e.camp==='boss')BossPatterns.cancel(e);}
    if(this.training&&Training.onDeath(this,e))return;
    if(e.kind==='champion') {
      if(!e.trainingDummy&&!selfDetonation)this.corpses.push({unitId:e.id,key:e.key,form:e.key==='queequeg'&&this.buff(e,'queequegUlt')?'queequegUlt':Sora.ego(this,e)?'soraEgo':Yan.form(this,e),team:e.team,x:e.x,y:e.y,facing:e.facing||0,at:this.time,until:this.time+12,visible:this.visibleTo(0,e)});this.corpses=this.corpses.slice(-32);
      e.ccImmuneUntil=0;e.invulnerableUntil=0;e.channelUntil=0;e.untargetableUntil=0;delete e.burn;
      e.phaseEnemiesUntil=0;e.deaths++;e.respawnAt=this.time+(e.trainingDummy?5:respawnTime(this.time,e.level));e.shields=[];e.status={};e.buffs={};e.buffPotency={};e.marks=0;e.basicHits={};e.supportStacks=0;e.supportUntil=0;e.state={augBulletReady:e.state.augBulletReady,ampuleReady:e.state.ampuleReady,traumaReady:e.state.traumaReady,maskReady:e.state.maskReady,infiltrationReady:e.state.infiltrationReady};e.visuals={};e.maxHp=this.maxHp(e);e.radius=.48;
      if(preserveCamps)CampBuffs.restore(this,e,campBuffs);else CampBuffs.transfer(this,e,killer,campBuffs);
      const credited=Combat.creditedKiller(this,e,killer),reward=Combat.rewardKill(this,e,credited);
      e.lastDeath={killerId:credited?.id??null,finisher: killer.kind,execution:!credited&&Combat.environmental(killer),bounty:reward?.shutdown||0,time:this.time};
      if(reward){
        Skills.takedown(this,credited,e,true);for(const a of reward.assists)Skills.takedown(this,a,e,false);
        const title=reward.count===1?`${e.name} 처치!`:reward.count===4?'올킬!':`${reward.count}연킬!`;
        const detail=`${credited.name} → ${e.name}${reward.shutdown?' · 현상금 +'+reward.shutdown+' ◈':''}${this.bounty(credited)?' · 처치자 현상금 '+this.bounty(credited)+' ◈':''}`;
        this.announce('kill',title,detail,{team:credited.team,actor:credited.id,first:reward.first});
        this.log(`${reward.first?'선취점 · ':''}${credited.name} → ${e.name} 처치${reward.shutdown?' · 현상금 +'+reward.shutdown+' ◈':''}`,credited.team===0?'ally':'enemy');
      }else{
        const title=e.lastDeath.execution?`${e.name} 처형`:killer===e?`${e.name} 전사`:`${killer.name} → ${e.name} 아군 처치`;
        this.log(title,'system');if(e.lastDeath.execution)this.announce('execution',title,'최근 10초 내 적 챔피언 피해 없음',{team:e.team===0?1:0});
      }
      if(killer.key==='gubo'&&killer.team===e.team){e.respawnAt=this.time+(e.trainingDummy?5:respawnTime(this.time,e.level))*(killer.state.guboUltimateExecuting===e.id?.25:.5);e.state.executedReturn=true;Skills.guboBlast(this,killer,e);killer.qCd=0;}
      e.streak=0;e.multiKillCount=0;delete e.lastEnemyDamage;e.contributors={};
    } else if(e.kind==='tower') {
      this.champions(killer.team).forEach(c=>this.award(c,120,130));
      this.log(`${e.team===0?'아군':'적군'} 포탑 파괴${this.towers(e.team).length===0?' · 본진 개방':''}`,e.team===0?'enemy':'ally');
      this.announce('tower',`${e.team===0?'아군':'적군'} 포탑 파괴`,this.towers(e.team).length?'남은 포탑 1개 · 본진 공격 가능':'포탑 모두 파괴 · 본진 공격 가능',{team:1-e.team});
    } else if(e.kind==='core') {this.finish(killer.team,'본진 파괴');}
    else if(e.kind==='minion') {
      const xp=e.siege?45:e.ranged?26:24,gold=e.siege?30:e.ranged?18:15;
      if(killer.kind==='champion'&&killer.team!==e.team){Skills.takedown(this,killer,e,true);this.award(killer,xp,gold);}
      else if(['minion','tower'].includes(killer.kind)&&killer.team!==e.team&&killer.team<2){const allies=this.champions(killer.team).filter(c=>c.alive&&distance(c,e)<=7);for(const c of allies)this.award(c,xp*.5/allies.length,gold*.5/allies.length,{sharedMinion:true});}
    } else if(e.kind==='neutral') {
      Skills.takedown(this,killer,e,true);
      if(e.camp==='sewingKing'){e.respawnAt=Infinity;Sewing.reward(this,killer.team);}
      else if(e.camp==='boss') {
        e.respawnAt=this.time+BossBuff.BOSS_BUFF.respawn;BossBuff.reward(this,killer.team);
        this.champions(killer.team).forEach(c=>this.award(c,180*(c.key==='starbuck'?1.1:1),160));
        this.log(`${killer.team===0?'아군':'적군'} 쌓인 것 처치`,killer.team===0?'ally':'enemy');
        this.announce('boss-kill',`${killer.team===0?'아군':'적군'} 쌓인 것 처치`,'아군 경험치 180 · 재화 160 · 생존 아군 보스 버프 3분',{team:killer.team});
      } else {
        if(!e.summonedNeedle)this.award(killer,(e.camp==='needle'?Sewing.NEEDLE.xp:e.camp==='central'?35:e.camp==='side'?56.25:112.5)*(killer.key==='starbuck'?1.1:1),e.camp==='needle'?Sewing.NEEDLE.gold:['central','side'].includes(e.camp)?18:40);
        e.respawnAt=this.time+e.respawnDelay;
        if(killer.kind==='champion'&&e.camp==='amplify')this.addBuff(killer,'amplify',CAMP_RULES.buffDuration);
        if(killer.kind==='champion'&&e.camp==='blessing')this.addBuff(killer,'blessing',CAMP_RULES.buffDuration);
      }
    }
  }
  finish(team,reason) {if(this.winner!==null)return;this.winner=team;this.reason=reason;this.log(team===-1?'무승부':`${team===0?'아군':'적군'} 승리 · ${reason}`);}
  timeDecision(){
    const towers=[this.towers(0),this.towers(1)],counts=towers.map(t=>t.length);
    const compare=values=>Math.abs(values[0]-values[1])<1e-6?-1:values[0]>values[1]?0:1;
    if(counts[0]!==counts[1])return {team:compare(counts),reason:'20분 판정 · 생존 포탑 수'};
    const values=counts[0]?towers.map(ts=>ts.reduce((n,t)=>n+t.hp,0)):[0,1].map(team=>this.units.find(u=>u.kind==='core'&&u.team===team)?.hp||0);
    return {team:compare(values),reason:counts[0]?'20분 판정 · 포탑 체력 합계':'20분 판정 · 본진 체력'};
  }
  spawnWave() {
    if(this.training&&this.practice.lineStopped)return;
    this.wave++;
    const scale=Math.min(MINIONS.maxGrowth,Math.floor(this.time/MINIONS.growthEvery));
    for(let team=0;team<2;team++)for(let lane=0;lane<(this.training?1:2);lane++)for(let i=0;i<(this.wave%3===0?5:4);i++)this.minionQueue.push({team,lane,index:i,wave:this.wave,scale,at:this.time+i*MINIONS.spawnGap});
    this.flushMinions();
  }
  flushMinions(){
    const due=this.minionQueue.filter(s=>s.at<=this.time+1e-8);this.minionQueue=this.minionQueue.filter(s=>s.at>this.time+1e-8);
    for(const spawn of due){
      const {team,lane,index,wave,scale}=spawn,ranged=index===3,siege=index===4,path=this.training?Training.lanePath(team,this):lanePath(team,lane),radius=(siege?.48:.28)*MINIONS.size,forward=direction(path[0],path[1]),origin={x:path[0].x+forward.x*(1.4+radius),y:path[0].y+forward.y*(1.4+radius)};
      this.entity({kind:'minion',trainingLane:this.training,team,lane,faction:this.minionFactions[team],facing:Math.atan2(forward.y,forward.x),...origin,wave,formationIndex:index,spawnAt:spawn.at,
        maxHp:(siege?MINIONS.health.siege:ranged?MINIONS.health.ranged:MINIONS.health.melee)*(1+MINIONS.hpGrowth*scale),damage:(siege?125:ranged?72:58)*(1+MINIONS.attackGrowth*scale),
        interval:siege?2:ranged?1.5:1.25,range:siege?6:ranged?5.5:1.2,radius,
        name:siege?'공성 미니언':ranged?'원거리 미니언':'근접 미니언',siege,ranged,waypoint:1,path:[],pathAt:0});
    }
  }
  spawnBoss() {
    this.bossSpawned=true;
    for(const u of this.units)if(u.camp==='central'){u.alive=false;u.hp=0;u.respawnAt=Infinity;}
    this.makeNeutral(MAP_CENTER.x,MAP_CENTER.y,'boss');this.log('05:00 · 쌓인 것 출현', 'boss');
    this.announce('boss-spawn','쌓인 것 등장','중앙 캠프에 보스가 나타났습니다.');
    this.effects.push({type:'ring',...MAP_CENTER,r:5,color:'#c89cf0',life:2,maxLife:2});
  }
  nearest(e,range,includeNeutral=true) {
    return this.units.filter(u=>this.hostile(e,u)&&this.visibleTo(e.team,u)&&(includeNeutral||u.team!==2)&&!this.locked(u)&&distance(e,u)<=range+u.radius&&this.clearLine(e,u)).sort((a,b)=>distance(e,a)-distance(e,b))[0];
  }
  moveToward(e,goal,dt,{speed,ignoreCC=false}={}) {
    if(['boss','sewingKing'].includes(e.camp)||e.state?.posthumous||e.state?.ahabUlt||e.motion||e.recall||!ignoreCC&&(this.stat(e,'root')||this.stat(e,'stun')||this.hidden(e)||e.channelUntil>this.time&&!e.state.alisaUltimateChannel))return;
    if(distance(e,goal)<.05)return;
    let target=goal;
    const structures=this.units.filter(t=>t.alive&&['tower','core'].includes(t.kind)&&solid(this,e,t)&&distance(goal,t)>e.radius+t.radius+.08);
    if(!this.clearLine(e,goal,e.radius)||structures.some(t=>segmentDistance(t,e,goal)<e.radius+t.radius+.08)) {
      if(this.time>=e.pathAt||!e.path?.length||distance(e.pathGoal||goal,goal)>2) {e.path=this.findPath(e,goal,e.radius,structures);e.pathAt=this.time+1;e.pathGoal={x:goal.x,y:goal.y};}
      while(e.path?.length&&distance(e,e.path[0])<.3)e.path.shift();
      target=e.path?.[0]||goal;
    }
    const step=Math.min(distance(e,target),(speed??this.speed(e))*dt),d=steer(this,e,target,step),from={x:e.x,y:e.y};if(e.aiThinking&&!BotAI.safeTowerStep(this,e,{x:e.x+d.x*step,y:e.y+d.y*step}))return;moveBody(this,e,d.x*step,d.y*step);if(e.kind==='minion'&&Math.abs(e.x-from.x)>1e-6)e.facing=Math.atan2(e.y-from.y,e.x-from.x);
  }
  aim(e,point) {const d=direction(e,point);return Math.hypot(d.x,d.y)>.01?d:{x:e.team===0?1:-1,y:0};}
  bullet(e,dir,damage,range,options={}) {
    if(e.actionKind!=='basic')this.emitSound('shot',e,{slot:options.slot??e.castSlot});
    this.projectiles.push({source:e,damageKind:e.actionKind||'skill',x:e.x,y:e.y,slot:e.actionKind==='skill'?e.castSlot:undefined,bornAt:this.time,origin:{x:e.x,y:e.y},dx:dir.x,dy:dir.y,damage,remaining:range,width:.18,speed:22,knock:0,color:e.key==='gubo'?'#a62c45':e.team===0?'#92d5dd':'#e6a097',theme:e.key,hitIds:new Set(),...options});
  }
  cone(e,dir,range,angle,damage,onHit=()=>{},{exclude}={}) {
    for(const target of this.units.filter(u=>this.hostile(e,u))) {
      if(exclude?.has(target.id))continue;
      const d=direction(e,target);
      if(distance(e,target)<=range+target.radius&&d.x*dir.x+d.y*dir.y>=Math.cos(angle/2)&&this.clearLine(e,target)) {const actual=this.deal(e,target,damage);onHit(target,actual);}
    }
    this.effects.push({source:e.id,damageKind:e.actionKind||'basic',slot:e.actionKind==='skill'?e.castSlot:undefined,shape:{kind:'cone',range,spread:angle,angle:Math.atan2(dir.y,dir.x)},type:['thrust','punch','whip','flame'].includes(this.attackStyle(e))?'thrust':'slash',x:e.x,y:e.y,angle:Math.atan2(dir.y,dir.x),spread:angle,r:range,color:e.key==='gregor'?CHAMPIONS[e.key].color:e.team===0?'#bce5e5':'#eaa39c',theme:e.key,side:(e.attackSerial||0)%2?1:-1,life:.28,maxLife:.28});
  }
  addMark(e,n=1) {
    if(e.key==='sinclair'&&this.buff(e,'marks'))return;
    e.marks+=n;
    if(e.marks>=3){e.marks=0;this.addBuff(e,'marks',4);e.ammo=this.ammoCap(e);e.reloadProgress=0;}
  }
  attack(e,point,options={}) {return this.action(e,'basic',()=>this.attackAction(e,point,options));}
  attackAction(e,point,options={}) {
    if(e.aiThinking&&point?.kind&&!BotAI.safeTowerTarget(this,e,point))return false;
    if(!e.alive||this.winner!==null)return false;
    if(this.stat(e,'taunt')&&!options.taunted)return false;
    if(this.training&&e===this.player)Training.refreshOptions(this);
    if(e.key==='kim'&&carried(this,e))return false;
    if(e.state.ahabUlt||this.stat(e,'disarm')||e.state.donCharge||e.motion||this.hidden(e)||this.stat(e,'stun')||e.channelUntil>this.time||e.attackCd>0)return false;
    if(e.key==='yan')return Yan.attack(this,e,point);
    if(e.key==='hohenheim')return Hohenheim.attack(this,e,point);
    if(!Skills.beforeBasic(this,e,point,options))return false;
    if(!e.alive||this.hidden(e)||this.stat(e,'stun')||e.channelUntil>this.time||e.attackCd>0||e.ammo<1||this.winner!==null)return false;
    this.cancelRecall(e);const c=CHAMPIONS[e.key],d=this.aim(e,point);e.state.fullAmmo=e.ammo>=this.ammoCap(e);if(!e.state.posthumous)e.ammo--;e.attackCd=this.attackInterval(e);e.attackSerial=(e.attackSerial||0)+1;e.healingEvent={key:`basic-${e.id}-${e.attackSerial}`,at:this.time};e.attackFacing=Math.atan2(d.y,d.x);e.facing=Math.atan2(d.y,d.x);e.attackAt=this.time;e.lastAttackAt=this.time;e.revealedUntil=this.time+1.25;
    this.emitSound(['gubo','yi','faust','ppui','outis','jamila'].includes(e.key)?'shot':'swing',e);
    if(Skills.basic(this,e,point,d,options))return true;
    if(e.key==='faust')this.bullet(e,d,180,this.attackRange(e),{width:FAUST_WAVE_HALF_WIDTH,pierce:e.level===RULES.maxLevel?Infinity:0});
    if(e.key==='yi')for(const offset of this.buff(e,'ogamdo')?[-.71,-.475,-.24,0,.24,.475,.71]:[-.305,0,.305])this.bullet(e,{x:Math.cos(e.facing+offset),y:Math.sin(e.facing+offset)},95,this.attackRange(e),{width:.27,pierce:Infinity,visualScale:1.5});
    if(e.key==='sinclair')this.cone(e,d,this.attackRange(e),Math.PI,210,t=>{
      if(t.kind==='champion'&&!this.buff(e,'marks')){e.basicHits[t.id]=(e.basicHits[t.id]||0)+2;if(e.basicHits[t.id]>=4){e.basicHits[t.id]-=4;this.addMark(e);}}
      if(t.kind==='neutral'&&['central','side'].includes(t.camp)&&t.hp<=t.maxHp*.1&&t.alive)this.deal(e,t,t.hp,{fixed:true});
    });
    if(e.key==='meursault'){
      const root=Boolean(e.state.fistRoot);delete e.state.fistRoot;
      Reworks.rectangle(this,e,d,this.attackRange(e),2.6,120);
      this.schedule(e,.1,()=>{this.emitSound('swing',e,{phase:'fist-left'});return Reworks.rectangle(this,e,d,this.attackRange(e),2.6,120,t=>{
        if((t.slowFromFist||0)<=this.time){this.status(t,'slow',.2,1.2,e);t.slowFromFist=this.time+3;}
        if(root)this.status(t,'root',1,.8,e);
      });});
    }
    return true;
  }
  cast(e,slot,point,options={}) {return this.action(e,'skill',()=>this.castAction(e,slot,point,options));}
  castAction(e,slot,point,options={}) {
    if(!['q','r'].includes(slot)||!point)return false;
    if(e.aiThinking&&V08.movementSkill(e,slot)&&!BotAI.safeTowerPoint(this,e,point))return false;
    if(Jamila.infiltrationUltimate(this,e,slot))return Jamila.deployFromInfiltration(this,e,slot);
    point=castPoint(e,point,skillTargeting(this,e,slot),this.bounds);if(V08.movementSkill(e,slot))point=trapPoint(this,e,point);
    if(this.training&&e===this.player)Training.refreshOptions(this);
    const recast=Skills.canRecast(this,e,slot);
    const duringHeathLeap=e.key==='heathcliff'&&slot==='r'&&e.motion?.actionTag==='heathQ';const cleansing=e.key==='meursault'&&slot==='q',duringHarpoon=e.key==='ishmael'&&slot==='q'&&Boolean(e.state.ishmaelCast);
    if(e.state.ahabUlt||this.stat(e,'taunt')&&!cleansing||e.state.posthumous&&slot==='r')return false;
    if(!e.alive||e.motion&&!(cleansing&&e.motion.forced)&&!duringHeathLeap||this.hidden(e)||this.stat(e,'stun')&&!cleansing||e.channelUntil>this.time&&!duringHarpoon||(e[slot+'Cd']>0&&!recast)||this.winner!==null)return false;
    if(this.stat(e,'silence')&&!(e.key==='meursault'&&slot==='q'))return false;
    if(!Skills.validateSkill(this,e,slot,point,options))return false;
    this.cancelRecall(e);const c=CHAMPIONS[e.key],d=this.aim(e,point); if(!recast)e[slot+'Cd']=this.cooldown(e,slot);
    if(Skills.isOffensive(e,slot))e.lastAttackAt=this.time;
    if(!duringHarpoon){e.facing=Math.atan2(d.y,d.x);e.castAt=this.time;e.castSlot=slot;e.visualCast={slot,at:this.time,point:{...point},origin:{x:e.x,y:e.y},angle:e.facing,healthy:e.hp/e.maxHp>=.5};}e.healingEvent={key:`cast-${e.id}-${e.castSerial=(e.castSerial||0)+1}`,at:this.time};e.revealedUntil=this.time+1.25;
    this.emitSound(slot==='r'?'ultimate':'cast',e);Augments.onCast(this,e);
    if(!(slot==='r'&&['ishmael','marton','ryoshu'].includes(e.key)))this.effects.push({type:'cast',x:e.x,y:e.y,angle:e.facing,r:slot==='r'?(e.key==='meursault'?8:5):3,theme:e.key,slot,life:slot==='r'?.9:.55,maxLife:slot==='r'?.9:.55});
    if(Skills.cast(this,e,slot,point,d,options))return true;
    const destination=(max)=>{const len=Math.min(max,distance(e,point));return {x:clamp(e.x+d.x*len,this.bounds.x+.6,this.bounds.x+this.bounds.w-.6),y:clamp(e.y+d.y*len,this.bounds.y+.6,this.bounds.y+this.bounds.h-.6)};};
    if(slot==='q') {
      if(e.key==='yi') {const p=destination(7);this.zones.push({source:e,...p,r:3.2,until:this.time+3,nextTick:this.time+.5,nextControl:this.time,stays:{},hitIds:new Set(),slowStacks:{}});}
      if(e.key==='sinclair') {
        let marked=false;Skills.dash(this,e,d,3.2,180,t=>{if(t.kind==='champion'&&!marked){marked=true;this.addMark(e);}});
      }
      if(e.key==='meursault') {Debuffs.cleanse(this,e);this.addBuff(e,'resolve',4);e.ccImmuneUntil=Math.max(e.ccImmuneUntil||0,this.time+4);e.state.fistRoot=true;e.ammo=Math.min(this.ammoCap(e),e.ammo+1);this.effects.push({type:'ring',x:e.x,y:e.y,r:2,color:'#a7d6e4',life:.5,maxLife:.5});}
    } else {
      if(e.key==='yi') {
        const landing=this.safeLanding(e,point,6.4);Object.assign(e,landing);
        for(const a of this.champions(e.team).filter(a=>a.alive&&distance(a,e)<=5.5)) {this.addBuff(a,'ogamdo',4);this.addShield(a,Math.min(180,a.maxHp*.18),`yi-ult-${e.id}`);}
        this.support(e);this.effects.push({type:'yiBuffRange',source:e.id,theme:'yi',x:e.x,y:e.y,r:5.5,color:'#cdbb87',life:.45,maxLife:.45});
      }
      if(e.key==='sinclair') {
        const p=this.safeLanding(e,point,6);
        const healthy=e.hp/e.maxHp>=.5,len=distance(e,p),travel=Math.max(.05,len/24);e.untargetableUntil=this.time+travel;
        this.startMotion(e,direction(e,p),len,{kind:'dash',speed:24,maxSpeed:24,minDuration:travel,phaseEnemies:true,ignoreWalls:true,onComplete:()=>{e.untargetableUntil=0;e.state.sinclairSpinAt=this.time;e.state.sinclairSpinFacing=e.visualCast?.angle??e.facing;Skills.area(this,e,e,3.8,390);this.effects.push({type:'burst',x:e.x,y:e.y,r:3.8,theme:e.key,life:.65,maxLife:.65});}});
        if(healthy)this.addMark(e,3);else {this.addShield(e,e.maxHp*.15,`branch-${e.id}`);e.rCd*=.8;}
      }
      if(e.key==='meursault'){this.effects.push({type:'coneRange',x:e.x,y:e.y,angle:e.facing,r:8,spread:Math.PI*100/180,color:'#b3d9e6',life:.9,maxLife:.9});e.state.chainRecoveryUntil=this.time+.275;this.addBuff(e,'chainArmor',3);this.cone(e,d,8,Math.PI*100/180,270,t=>{this.status(t,'root',1,1.25);this.status(t,'weak',.12,4);});}
    }
    return true;
  }
  inSpawn(e) {return this.training?distance(e,Training.spawn(this))<=2.5:inWell(e);}
  canShop(e) {return e.alive&&!e.state.posthumous&&this.inSpawn(e)&&this.time-e.lastCombat>=3&&this.winner===null;}
  canUpgrade(e){return e.kind==='champion'&&this.winner===null&&(this.training||!e.alive||this.canShop(e));}
  buyAugment(e,key){const item=Augments.AUGMENTS.find(a=>a.key===key),price=Augments.cost(e,key);if(!item||!this.canUpgrade(e)||!Augments.unlockedItem(e,key)||!Augments.fits(e,key)||!Augments.categoryFits(e,key)||Augments.has(e,key)||!this.training&&e.gold<price)return false;if(!this.training)e.gold-=price;e.augments.push(key);if(e.key==='kim'&&key==='power15')e.state.unityNext=this.time+2;Augments.absorbOrder(this,e);this.refreshEquipment(e);this.emitSound('shop',e);return true;}
  sellAugment(e,key){if(!this.canUpgrade(e)||!e.augments.includes(key)||!Augments.sellable(this,key,e))return false;e.augments=e.augments.filter(k=>k!==key);if(!this.training)e.gold+=Augments.saleValue(e,key);this.refreshEquipment(e);if(key==='maskDeLu'){delete e.state.maskStacks;delete e.buffs.maskBoost;}if(key==='writtenOrder'){delete e.state.orderStacks;delete e.buffs.writtenOrder;}if(key==='antimatter')delete e.state.antimatterNext;if(key==='reloadStacks'){delete e.state.augReloadStacks;delete e.buffs.augReload;}if(key==='battleHaste')delete e.buffs.augBattleHaste;if(key==='forceBattery')e.shields=e.shields.filter(s=>s.source!==`battery-${e.id}`);return true;}
  refreshEquipment(e,{clampAmmo=true}={}){const old=e.maxHp;e.maxHp=this.maxHp(e);if(e.alive)e.hp=Math.min(e.maxHp,e.hp+Math.max(0,e.maxHp-old));if(clampAmmo)e.ammo=Math.min(e.ammo,this.ammoCap(e));}
  buy(e,key) {
    if(!this.canUpgrade(e))return false;
    const item=UPGRADES.find(u=>u.key===key);
    if(!item||e.upgrades[key]>=item.max)return false;
    const cost=this.training?0:RULES.costs[e.upgrades[key]];if(e.gold<cost)return false;
    e.gold-=cost;e.upgrades[key]++;this.emitSound('shop',e);
    if(key==='health'||key==='power'&&e.key==='dongrang'){const old=e.maxHp;e.maxHp=this.maxHp(e);if(e.alive)e.hp+=e.maxHp-old;}
    return true;
  }
  clearTarget(e,t,range){return distance(e,t)<=range+t.radius&&this.clearLine(e,t);}
  aiChampion(e,dt) {
    e.aiThinking=true;e.aiTowerCover=new Map();try{return this.aiChampionAction(e,dt);}finally{delete e.aiThinking;delete e.aiTowerCover;}
  }
  aiChampionAction(e,dt) {
    if(e.hp/e.maxHp<.24)e.retreat=true;if(e.hp/e.maxHp>.88)e.retreat=false;
    if(e.retreat){this.moveToward(e,FOUNTAINS[e.team],dt);if(e.key==='meursault')this.cast(e,'q',e);return;}
    if(BotAI.leaveTower(this,e,dt))return;
    if(Pings.respond(this,e,dt)){const t=this.nearest(e,8);if(t&&e.objective!=='ping-danger')BotAI.combatSkills(this,e,t);return;}
    if(BotAI.bossObjective(this,e,dt))return;delete e.objective;
    if(e.position==='jungle')return this.aiJungle(e,dt);
    const near=BotAI.combatTarget(this,e,9);
    if(near) {
      const d=distance(e,near);
      const anchor=e.position==='support'?BotAI.supportAnchor(this,e):null;
      if(anchor&&distance(e,anchor)<2.5)this.moveToward(e,BotAI.formation(this,e,anchor,near),dt);
      else if(d>this.attackRange(e)*.88)this.moveToward(e,near,dt);
      if(d<=this.attackRange(e)+near.radius){const ally=e.key==='ppui'?this.champions(e.team).filter(a=>a!==e&&a.alive&&distance(e,a)<=this.attackRange(e)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]:null;this.attack(e,ally||near);}
      if(near.kind==='champion') {
        BotAI.combatSkills(this,e,near);
      }
      return;
    }
    if(e.position==='support'&&this.time>60&&this.time%90>=60&&this.time%90<75){const jungle=this.champions(e.team).find(a=>a.position==='jungle'&&a.alive);if(jungle){this.moveToward(e,BotAI.formation(this,e,jungle),dt);return;}}
    const path=lanePath(e.team,e.lane),enemyTowers=this.towers(1-e.team),targetTower=enemyTowers.find(t=>t.lane===e.lane)||enemyTowers[0];
    if(distance(e,path[1])<(e.position==='support'?3:.8))e.laneEntered=true;
    const goal=!e.laneEntered?path[1]:targetTower||this.units.find(t=>t.kind==='core'&&t.team!==e.team);
    const anchor=e.position==='support'?BotAI.supportAnchor(this,e):null;
    this.moveToward(e,anchor&&distance(e,anchor)<12?BotAI.formation(this,e,anchor,goal):e.position==='support'?{x:goal.x,y:goal.y-2.1}:goal,dt);
  }
  aiJungle(e,dt){
    const enemies=this.champions(1-e.team).filter(t=>t.alive&&this.visibleTo(e.team,t)&&distance(e,t)<=7&&this.clearLine(e,t)&&BotAI.safeTowerTarget(this,e,t));
    let target=enemies.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if(!target){
      const camps=this.units.filter(t=>t.kind==='neutral'&&t.alive&&!t.returning&&t.camp!=='boss'&&(e.team===0?t.x<=MAP_CENTER.x+3:t.x>=MAP_CENTER.x-3));
      target=camps.sort((a,b)=>distance(e,a)-distance(e,b))[0];
    }
    if(!target){const ally=this.champions(e.team).find(a=>a.position==='bottom');if(ally)this.moveToward(e,BotAI.formation(this,e,ally),dt);return;}
    const d=distance(e,target);if(d>this.attackRange(e)*.85)this.moveToward(e,target,dt);
    if(d<=this.attackRange(e)+target.radius&&this.clearLine(e,target)){this.attack(e,target);BotAI.combatSkills(this,e,target);}
  }
  aiMinion(e,dt) {
    if(this.training&&this.practice.lineStopped)return;
    const goal=MinionNav.laneGoal(this,e);
    const aggro=this.units.find(t=>t.id===e.aggro&&t.alive&&this.visibleTo(e.team,t)&&e.aggroUntil>this.time&&distance(e,t)<e.range+2&&MinionNav.mayChase(this,e,t));
    const candidates=this.units.filter(t=>t.team!==2&&this.hostile(e,t)&&this.visibleTo(e.team,t)&&!this.locked(t)&&distance(e,t)<Math.max(6,e.range)+t.radius&&MinionNav.mayChase(this,e,t)&&this.clearLine(e,t));
    const rank=t=>e.siege&&t.kind==='tower'?-1:t.kind==='minion'?0:t.kind==='champion'?1:2;
    candidates.sort((a,b)=>rank(a)-rank(b)||distance(e,a)-distance(e,b));
    const target=aggro||candidates[0];
    if(target) {
      if(distance(e,target)>e.range+target.radius)this.moveToward(e,target,dt);
      else if(e.attackCd<=0&&!this.stat(e,'stun')&&!this.stat(e,'disarm')){this.simpleAttack(e,target);e.attackCd=e.interval;}
    } else {
      if(MinionNav.convoyBlocked(this,e,goal))return;
      this.moveToward(e,MinionNav.marchTarget(e,goal),dt);
    }
  }
  simpleAttack(e,t) {
    this.emitSound(['tower','core'].includes(e.kind)?'shot':'swing',e);
    if(e.camp==='sewingKing'){Sewing.basic(this,e,t);return;}
    if(e.camp==='needle'){Sewing.swing(this,e);this.effects.push({type:'slash',x:e.x,y:e.y,r:e.range,angle:Math.atan2(t.y-e.y,t.x-e.x),spread:1.5,color:'#a4b6a4',life:.3,maxLife:.3});}
    if(e.kind==='minion'){e.facing=Math.atan2(t.y-e.y,t.x-e.x);e.attackAt=this.time;e.attackUntil=this.time+.28;}
    if(e.kind==='neutral'){if(['side','central'].includes(e.camp)){e.swingAt=this.time;e.swingUntil=this.time+.28;}e.facing=Math.atan2(t.y-e.y,t.x-e.x);CampBuffs.swing(this,e,t);}
    if(e.kind==='tower'||e.kind==='core'||e.kind==='minion'&&(e.ranged||e.siege)){this.projectiles.push({source:e,target:t,homing:true,x:e.x,y:e.y,damage:e.kind==='tower'?Towers.shotDamage(this,e,t):e.damage,visualHeight:e.kind==='minion'?(e.siege?1.05:.95):undefined,speed:e.kind==='minion'?12:14,remaining:4,width:e.kind==='minion'?.12:.24,color:e.team===0?'#83e5f4':'#ee9b84'});return;}
    this.effects.push({type:'line',x:e.x,y:e.y,to:{x:t.x,y:t.y},color:e.team===0?'#6fb8c7':e.team===1?'#d18178':'#bd9e64',life:.16,maxLife:.16});
    this.deal(e,t,e.damage);
  }
  aiStructure(e) {
    if(this.training&&this.practice.lineStopped)return;
    if(this.locked(e))return;
    if(e.kind==='core'){
      const targets=this.units.filter(u=>u.alive&&!this.hidden(u)&&this.visibleTo(e.team,u)&&u.team!==e.team&&u.team!==2&&['champion','minion','trooper'].includes(u.kind)&&distance(e,u)<=e.range);
      if(e.targetId&&!targets.some(u=>u.id===e.targetId))e.targetId=null;
      if(e.attackCd>0||!targets.length)return;
      const rank=t=>t.siege?0:t.kind==='minion'?1:2,target=targets.find(u=>u.id===e.aggro&&e.aggroUntil>this.time)||targets.sort((a,b)=>rank(a)-rank(b)||a.id-b.id)[0];
      e.targetId=target.id;this.simpleAttack(e,target);e.attackCd=e.interval;return;
    }
    if(e.kind==='tower')Towers.resetHeat(this,e);
    const target=Towers.acquire(this,e);
    if(e.attackCd>0||!target)return;
    this.simpleAttack(e,target);e.attackCd=e.interval;
  }
  aiNeutral(e,dt) {
    if(e.camp==='boss'){BossPatterns.update(this,e,dt);return;}
    if(e.camp==='sewingKing'){Sewing.stationaryAI(this,e,dt);return;}
    if(e.summonedNeedle){Sewing.summonedAI(this,e,dt);return;}
    if(e.hostile&&distance(e,e.campCenter)>e.campRadius)e.outsideSince??=this.time;else delete e.outsideSince;
    if(!e.returning&&(e.outsideSince!==undefined&&this.time-e.outsideSince>=CAMP_RULES.leashDelay)){
      e.returning=true;e.hostile=false;e.swingUntil=0;e.exposedUntil=0;e.aggro=null;CreepPatterns.cancel(e);Sewing.cancel(e);e.status={};e.path=[];delete e.motion;
    }
    if(e.returning){
      this.moveToward(e,e.home,dt,{speed:CAMP_RULES.returnSpeed,ignoreCC:true});e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.7*dt);
      if(distance(e,e.home)<.2){Object.assign(e,e.home);e.returning=false;e.hp=e.maxHp;e.sweep=2.5;delete e.outsideSince;e.lastCombat=-99;}
      return;
    }
    if(e.hostile&&!this.units.some(c=>c.id===e.aggro&&c.alive)){e.hostile=false;e.aggro=null;CreepPatterns.cancel(e);Sewing.cancel(e);delete e.patternReady;}
    const target=e.hostile?this.units.find(c=>c.id===e.aggro&&c.alive&&!this.hidden(c)&&this.clearLine(e,c)):null;
    if(CreepPatterns.update(this,e,target))return;
    if(Sewing.update(this,e))return;
    if(!target) {this.moveToward(e,e.home,dt);if(this.time-e.lastCombat>5)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*dt);return;}
    if(distance(e,target)>e.range)this.moveToward(e,target,dt);
    else if(e.attackCd<=0&&!this.stat(e,'stun')&&!this.stat(e,'disarm')){this.simpleAttack(e,target);e.attackCd=e.interval;}

  }
  updateProjectiles(dt) {
    for(const p of this.projectiles) {
      if(p.guboUltimate){GuboUltimate.flight(this,p,dt);continue;}
      if(p.homing){const t=p.target;p.remaining-=dt;if(!t.alive||this.hidden(t)){p.remaining=0;continue;}const d=direction(p,t),step=p.speed*dt;if(distance(p,t)<=step+t.radius+projectileHitWidth(p)){this.deal(p.source,t,p.damage,{allowFriendly:p.allowFriendly,damageKind:p.damageKind,nonLethal:p.nonLethal,proc:p.proc??true,sound:{slot:p.slot}});p.onHit?.(t,p);p.remaining=0;p.hit=true;}else{p.x+=d.x*step;p.y+=d.y*step;p.dx=d.x;p.dy=d.y;}continue;}
      const travel=Math.min(p.remaining,p.speed*dt),n=Math.max(1,Math.ceil(travel/.18));
      for(let i=0;i<n&&p.remaining>0;i++) {
        p.x+=p.dx*travel/n;p.y+=p.dy*travel/n;p.remaining-=travel/n;
        if(!p.ignoreTerrain&&this.blocked(p.x,p.y,.08)){p.remaining=0;break;}
        const t=this.units.find(t=>(this.hostile(p.source,t)||p.allowFriendly&&this.canGuboHitAlly(p.source,t))&&!p.hitIds.has(t.id)&&distance(p,t)<=t.radius+projectileHitWidth(p));
        if(t) {
          p.hitIds.add(t.id);p.lastHpRatio=t.hp/t.maxHp;
          p.beforeHit?.(t,p);this.deal(p.source,t,p.damage*(p.bonusLowHp&&t.hp/t.maxHp<.5?1+p.bonusLowHp:1),{damageKind:p.damageKind,allowFriendly:p.allowFriendly,nonLethal:p.nonLethal,proc:p.proc??true,sound:{slot:p.slot}});
          p.onHit?.(t,p);
          if(p.knock)this.startMotion(t,{x:p.dx,y:p.dy},p.knock,{kind:'knock',source:p.source});
          if(p.pierce>0){p.pierce--;p.damage*=p.decay??1;}else {p.remaining=0;p.hit=true;}
        }
      }
    }
    for(const p of this.projectiles)if(p.remaining<=0&&!p.hit)p.onEnd?.({x:p.x,y:p.y});
    this.projectiles=this.projectiles.filter(p=>p.remaining>0);
  }
  updateDelayed(dt) {
    for(const event of this.pending) {
      if(event.at>this.time+1e-8)continue;
      const e=event.source;
      if(!event.autonomous&&(!e.alive||this.stat(e,'stun')||(event.type==='burst'&&this.stat(e,'silence'))))continue;
      this.emitSound('detonation',e,{slot:'r',phase:'ability-impact',x:event.x,y:event.y});
      let hits=0;
      for(const t of this.units.filter(t=>this.hostile(e,t)&&distance(event,t)<=event.r&&(event.ignoreWalls||this.clearLine(event,t)))) {this.deal(e,t,event.damage);event.onHit?.(t);if(t.kind==='champion')hits++;}
      if(event.type==='burst'&&hits&&e.alive){this.addBuff(e,'faustUlt',5);e.ultStacks=Math.min(4,hits);}
      this.effects.push({source:e.id,slot:'r',damageKind:'skill',type:'burst',x:event.x,y:event.y,r:event.r,color:'#d6be7f',theme:e.key,life:.65,maxLife:.65});
    }
    this.pending=this.pending.filter(e=>e.at>this.time+1e-8&&(e.source.alive||e.autonomous));
    for(const z of this.zones) {
      if(z.until<=this.time)continue;
      if(z.kind&&z.kind!=='mirror'){
        if(z.kind==='electricBloom'){Hohenheim.updateZone(this,z,dt);continue;}
        if(z.kind==='waterfall'&&z.moving){const b=this.bounds;z.x=clamp(z.x+z.d.x*1.5*dt,b.x,b.x+b.w);z.y=clamp(z.y+z.d.y*1.5*dt,b.y,b.y+b.h);}
        if(z.follow){z.x=z.source.x;z.y=z.source.y;}
        if(z.kind==='desireTree'&&z.golden)continue;
        if(this.time+1e-8>=z.nextTick){
          z.nextTick+=z.tickEvery||.5;
          if(z.kind==='waterfall'){Reworks.waterfallPulse(this,z);continue;}
          for(const t of this.units.filter(t=>t.alive&&distance(t,z)<=z.r&&this.clearLine(z,t))){
            if(t.team===z.source.team&&t.kind==='champion'){
              if(z.heal)this.heal(z.source,t,z.heal,true,{skillHeal:z.kind==='waterfall',healingKey:z.healingEvent?.key,startedAt:z.healingEvent?.at});
              if(z.cleanse&&!z.cleansed.has(t.id)){t.status={};z.cleansed.add(t.id);}
            }else if(this.hostile(z.source,t)&&(!z.championsOnly||t.kind==='champion')){
              if(z.damage){const dealt=this.deal(z.source,t,z.damage,{fixed:Boolean(z.fixed)});if(z.lifesteal)this.heal(z.source,z.source,dealt*z.lifesteal,false);if(z.kind==='desireTree'){z.dealt=(z.dealt||0)+dealt;if(z.dealt>=350){z.golden=true;z.until=this.time+10;z.damage=0;break;}}}
              const applyDebuff=!z.firstDebuffOnly||!(z.debuffIds??=new Set()).has(t.id);if(z.firstDebuffOnly&&applyDebuff&&t.kind==='champion')z.debuffIds.add(t.id);
              if(applyDebuff&&z.weak)this.status(t,'weak',z.weak,z.debuffDuration||.7,z.source);
              if(applyDebuff&&z.slow)this.status(t,'slow',z.slow,z.kind==='desireTree'?1:z.debuffDuration||.7,z.source);if(applyDebuff&&z.reloadWeak)this.status(t,'reloadWeak',z.reloadWeak,z.debuffDuration||.7,z.source);
            }
          }
        }
        continue;
      }
      const control=this.time+1e-8>=(z.nextControl??0);
      for(const t of this.units.filter(t=>this.hostile(z.source,t)&&distance(z,t)<=z.r&&this.clearLine(z,t))) {
        if(control&&t.kind==='champion'){this.status(t,'silence',1,.25,z.source);this.status(t,'reloadWeak',.1,.25,z.source);}
        if(this.time>=z.nextTick){this.deal(z.source,t,45);z.hitIds??=new Set();z.slowStacks??={};if(t.kind==='champion'){if(!z.hitIds.has(t.id)){z.hitIds.add(t.id);t.ammo=Math.max(0,t.ammo-1);}z.slowStacks[t.id]=(z.slowStacks[t.id]||0)+1;this.status(t,'slow',Math.min(.9,z.slowStacks[t.id]*.035),.7,z.source);}}
      }
      if(control)z.nextControl=this.time+.1;
      if(this.time>=z.nextTick)z.nextTick+=.5;
    }
    this.zones=this.zones.filter(z=>z.until>this.time);
  }
  step(dt) {
    if(this.winner!==null)return;
    const mobileAim=captureMobileAim(this);
    dt=this.training?dt:Math.min(dt,Math.max(0,RULES.timeLimit-this.time));
    if(dt===0){if(this.training)return;const result=this.timeDecision();this.finish(result.team,result.reason);return;}
    this.time+=dt;GuboUltimate.tick(this);BossBuff.tick(this);Sewing.tick(this);this.pings=Pings.live(this);V08.tickObjects(this);if(this.training)Training.beforeStep(this,dt);
    if(!this.training&&!this.bossSpawned&&this.time+1e-8>=RULES.bossAt)this.spawnBoss();
    if(!this.training&&this.time+1e-8>=RULES.firstWaveAt+RULES.waveEvery*this.wave)this.spawnWave();this.flushMinions();
    for(const e of this.units)e.bodyOrigin={x:e.x,y:e.y};
    for(const e of this.units) {
      const restore=this.controllers?this.enterController(e):null;const controlledAim=restore?captureMobileAim(this):null;try{
      Infestation.tick(this,e);if(e.alive)Skills.tickBurn(this,e);e.attackCd=Math.max(0,e.attackCd-dt);
      if(e.trainingDummy){Training.tickDummy(this,e,dt);if(e.alive)CampBuffs.tick(this,e);continue;}
      if(e.kind==='champion') {
        this.syncDesire(e);
        e.gold+=dt;this.award(e,(e.key==='faust'?9:RULES.passiveXpPerSecond)*dt,0,{passive:true});e.qCd=Math.max(0,e.qCd-dt*(e.key==='jamila'&&e.hp<e.maxHp*.5?1.5:1));e.rCd=Math.max(0,e.rCd-dt);
        if(!e.alive&&this.time>=e.respawnAt){e.alive=true;e.hp=e.maxHp;Object.assign(e,this.spawnPoint(e));e.ammo=this.ammoCap(e);e.reloadProgress=0;e.retreat=false;e.path=[];e.laneEntered=false;e.lastAttackAt=this.time-3;e.lastDamageAt=this.time-3;e.lastCombat=this.time-3;
          if(e.state.executedReturn){Fountain.returnHaste(this,e,'executedHaste',3);delete e.state.executedReturn;}
          if(e.state.fastReturn){Fountain.returnHaste(this,e,'alisaHaste',5);delete e.state.fastReturn;}Skills.onRespawn(this,e);
        }
      } else if(e.kind==='neutral'&&!e.alive&&this.time>=e.respawnAt&&!(e.camp==='central'&&this.bossSpawned)){e.alive=true;e.hp=e.maxHp;e.x=e.home.x;e.y=e.home.y;e.aggro=null;e.hostile=false;e.returning=false;CreepPatterns.cancel(e);e.swingUntil=0;delete e.outsideSince;delete e.patternReady;if(e.camp==='boss')BossPatterns.cancel(e);delete e.burn;e.status={};e.shields=[];e.lastCombat=-99;}
      if(!e.alive)continue;Fountain.tickReturnHaste(this,e);if(Infiltration.absent(e)){Infiltration.tick(this,e,dt);if(Infiltration.absent(e))continue;}Fountain.tick(this,e,dt);if(!e.alive)continue;
      if(e.kind==='summon'){Yan.tickHand(this,e,dt);continue;}
      if(e.lcaTrooper){const moved=Boolean(e.motion);this.updateMotion(e,dt);Jamila.tickTrooper(this,e,dt,{moving:moved||Boolean(e.motion)});continue;}
      if(e.kind==='core'&&e.hp/e.maxHp<.35&&this.time-(e.lastDamageAt||0)>=10){let ward=e.shields.find(s=>s.source==='core-ward');if(!ward){ward={source:'core-ward',until:Infinity,value:0};e.shields.push(ward);}ward.value=e.maxHp*.15;}
      const moving=Boolean(e.motion);this.updateMotion(e,dt);if(!e.alive)continue;
      if(e.kind==='champion') {
        if(e.player&&e.recall&&(this.input.x||this.input.y||this.input.fire))this.cancelRecall(e);
        this.updateRecall(e);if(Infiltration.absent(e))continue;
        const cap=this.ammoCap(e);
        if(!['rudolph','yan','hohenheim','jamila'].includes(e.key)&&this.reloadRate(e)>0&&!this.buff(e,'ezraUlt')&&e.ammo<cap) {e.reloadProgress+=dt*this.reloadRate(e);const gap=this.reloadInterval(e);while(e.reloadProgress>=gap&&e.ammo<cap){e.ammo=Math.min(cap,e.ammo+1);e.reloadProgress-=gap;}}
        if(e.ammo>=cap)e.reloadProgress=0;
        const natural=this.canNaturalHeal(e);e.naturalHealing=natural&&e.hp<e.maxHp;
        if(natural&&e.hp<e.maxHp)this.heal(null,e,e.maxHp*RULES.naturalHealRate*dt,false,{natural:true});
        else if(!natural&&this.inSpawn(e)&&e.hp<e.maxHp)this.heal(null,e,e.maxHp*.12*dt,false);
        if(!e.alive)continue;
        CampBuffs.tick(this,e);
        if(this.buff(e,'mosesHeal'))this.heal(null,e,this.buffValue(e,'mosesHeal',35)*dt,false);
        Skills.tick(this,e,dt);Jamila.tick(this,e,dt);V08.tick(this,e,dt);Augments.tick(this,e,dt);if(!e.alive)continue;
        if(V08.controlTaunt(this,e,dt))continue;
        if(e.player) {
          if(!e.state.posthumous&&!e.state.ahabUlt&&!moving&&!e.motion&&!e.recall&&!this.stat(e,'root')&&!this.stat(e,'stun')&&!this.hidden(e)&&(!(e.channelUntil>this.time)||e.state.alisaUltimateChannel)) {const len=Math.max(1,Math.hypot(this.input.x,this.input.y));moveBody(this,e,this.input.x/len*this.speed(e)*dt,this.input.y/len*this.speed(e)*dt);}
          followMobileAim(this,controlledAim||mobileAim);
          if(this.input.fire)this.attack(e,this.input.aim);
          e.facing=Math.atan2(this.input.aim.y-e.y,this.input.aim.x-e.x);
        } else if(!e.state.posthumous&&!e.state.ahabUlt&&!moving&&!e.motion&&!e.recall){if(e.trainingSummoned)Training.aiChampion(this,e,dt);else this.aiChampion(e,dt);}
      } else if(e.kind==='minion'){if(V08.controlTaunt(this,e,dt))continue;if(!moving&&!e.motion)this.aiMinion(e,dt);}
      else if(e.kind==='neutral')this.aiNeutral(e,dt);
      else if(e.kind!=='bait')this.aiStructure(e);
      }finally{if(controlledAim)followMobileAim(this,controlledAim);restore?.();}
    }
    const due=this.events.filter(ev=>ev.at<=this.time+1e-8);this.events=this.events.filter(ev=>ev.at>this.time+1e-8);
    for(const ev of due)if(ev.autonomous||ev.source.alive&&!this.stat(ev.source,'stun'))ev.fn();
    separate(this);for(const e of this.champions().filter(e=>e.alive))Fountain.tickReturnHaste(this,e);this.updateProjectiles(dt);this.updateDelayed(dt);Reworks.easterEggs(this,dt);if(this.training)Training.afterStep(this,dt);followMobileAim(this,mobileAim);
    for(const fx of this.effects)fx.life-=dt;
    this.effects=this.effects.filter(f=>f.life>0).slice(-220);
    for(const b of this.units.filter(e=>e.kind==='bait'&&e.alive&&e.until<=this.time))this.kill(b,b);
    this.units=this.units.filter(e=>!['minion','bait','summon','trooper'].includes(e.kind)||e.alive);this.corpses=this.corpses.filter(c=>c.until>this.time);
    if(!this.training&&this.winner===null&&this.time+1e-8>=RULES.timeLimit){const result=this.timeDecision();this.finish(result.team,result.reason);}
  }
}
