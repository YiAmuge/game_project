import { RULES, RUNTIME_CHAMPIONS as CHAMPIONS, UPGRADES, BUSHES, POSITIONS, POSITION_ORDER, lanePath, worldPoint, MAP_CENTER, FOUNTAINS, MINIONS, CAMP_RULES, CORE_POSITIONS, inWell, WORLD } from './data.js';
import { clamp, distance, direction, clearLine, slide, findPath, segmentDistance, blocked } from './geometry.js';
import * as Skills from './skills.js';
import * as CreepPatterns from './creep-patterns.js';
import * as Augments from './augments.js';
import * as V08 from './v08-champions.js';
import * as BotAI from './bot-ai.js';
import * as BossPatterns from './boss-patterns.js';
import { steer } from './navigation.js';
import { separate,moveBody,canOccupy,settleBody } from './collision.js';
import { skillTargeting, castPoint } from './targeting.js';

export function damageFormula(base,power=3,level=3,armor=0) {
  return base*RULES.power[power]*(.85+.05*level)*100/(100+Math.max(0,armor));
}
export function respawnTime(time,level) { return Math.min(20,Math.ceil(6+1.13*(.8*time/60+1.2*(level-1)))); }

export class Game {
  constructor(selected='faust',position='bottom',{seed=Math.floor(Math.random()*4294967296)}={}) {
    if(!CHAMPIONS[selected])throw new Error('Unknown champion');
    if(!POSITIONS[position])position='bottom';
    this.time=0; this.nextId=1; this.wave=0; this.bossSpawned=false; this.winner=null; this.reason='';
    this.units=[]; this.minionQueue=[];this.corpses=[]; this.projectiles=[]; this.effects=[]; this.zones=[]; this.pending=[]; this.logs=[];this.events=[];this.buffSequence=0;this.randomState=(seed>>>0)||137;
    this.kills=[0,0]; this.damageDone=0; this.input={x:0,y:0,aim:{x:32,y:18},fire:false};
    this.makeStructures(); this.makeCamps();
    this.makeChampion(selected,0,0,position);
    for(const pos of POSITION_ORDER.filter(p=>p!==position)){const used=this.champions(0).map(c=>c.key);this.makeChampion(BotAI.draft(this,pos,used),0,this.champions(0).length,pos);}
    POSITION_ORDER.forEach((pos,i)=>this.makeChampion(BotAI.draft(this,pos,this.champions(1).map(c=>c.key)),1,i,pos));
    this.player=this.units.find(u=>u.player);
    this.log('전투 개시 · 첫 미니언 3초 후 출격 · 20분 제한', 'system');
  }
  entity(values) {
    const e={id:this.nextId++,alive:true,attackCd:0,radius:.35,armor:0,shields:[],status:{},lastCombat:-99,...values};
    e.hp=e.maxHp; this.units.push(e); return e;
  }
  makeStructures() {
    for(let team=0;team<2;team++) {
      for(let lane=0;lane<2;lane++) this.entity({kind:'tower',team,lane,...worldPoint(team?46:18,lane?30.5:5.5),maxHp:6460,armor:120,range:8.5,damage:280,interval:1.05,radius:.9,name:'포탑'});
      this.entity({kind:'core',team,...CORE_POSITIONS[team],lastDamageAt:0,maxHp:10200,armor:100,range:9,damage:320,interval:1,radius:1.3,name:'본진'});
    }
  }
  makeCamps() {
    for(const [camp,points] of Object.entries({central:[[30.5,16.5],[33.5,16.5],[30.5,19.5],[33.5,19.5]],blessing:[[22,13],[42,13]],amplify:[[22,23],[42,23]]}))for(const [x,y] of points){const p=worldPoint(x,y);this.makeNeutral(p.x,p.y,camp);}
    for(const [id,center] of [['west',worldPoint(17,18)],['east',worldPoint(47,18)],['north',{x:MAP_CENTER.x,y:-3.8}],['south',{x:MAP_CENTER.x,y:50.6}]]){
      for(const dx of [-.85,.85]){const n=this.makeNeutral(center.x+dx,center.y,'side');n.campId=`side-${id}`;n.campCenter={...center};n.name=['north','south'].includes(id)?'외곽 중립 크립':'본진 앞 중립 크립';}
    }
  }
  makeNeutral(x,y,camp) {
    const stats={central:[700,10,80,1.3,CAMP_RULES.neutralRespawn],side:[850,15,100,1.2,CAMP_RULES.neutralRespawn],blessing:[1250*CAMP_RULES.buffHealth,25,100,1.2,CAMP_RULES.buffRespawn],amplify:[1250*CAMP_RULES.buffHealth,25,120,1.2,CAMP_RULES.buffRespawn],boss:[BossPatterns.BOSS_RULES.health,60,BossPatterns.BOSS_RULES.attack,1.5,Infinity]}[camp];
    return this.entity({kind:'neutral',team:2,camp,x,y,home:{x,y},campId:camp==='central'?'central':`${camp}-${x}`,campCenter:camp==='central'?MAP_CENTER:{x,y},campRadius:['central','boss'].includes(camp)?4.7:CAMP_RULES.radius,maxHp:stats[0],armor:stats[1],damage:stats[2],interval:stats[3],respawnDelay:stats[4],range:camp==='boss'?2.8:1.4,radius:camp==='boss'?1.2:.5,name:{central:'중앙 크립',side:'측면 크립',blessing:'가호',amplify:'증폭',boss:'중앙 보스'}[camp],sweep:2.5});
  }
  makeChampion(key,team,index,position=POSITION_ORDER[index%4]) {
    const c=CHAMPIONS[key];
    const e=this.entity({kind:'champion',key,team,index,position,lane:POSITIONS[position].lane,player:team===0&&index===0,
      x:FOUNTAINS[team].x,y:FOUNTAINS[team].y+(index-1.5)*.85,radius:.48,maxHp:RULES.health[c.health],name:c.name,
      level:1,xp:0,gold:250,kills:0,deaths:0,assists:0,streak:0,ammo:key==='ezra'?1:c.ammo,reloadProgress:0,qCd:0,rCd:0,
      range:c.range,augments:[],supporters:{},upgrades:{power:0,health:0,speed:0,haste:0,reload:0},marks:0,basicHits:{},buffs:{},
      supportStacks:0,supportReady:0,supportUntil:0,passiveReady:0,sniperReady:0,path:[],pathAt:0,
      respawnAt:0,retreat:false,contributors:{},totalDamage:0,state:{},buffHistory:{},visuals:{},lastAttackAt:-99,lastDamageAt:-99,
    });
    Skills.init?.(this,e);e.maxHp=this.maxHp(e);e.hp=e.maxHp;return e;
  }
  log(text,kind='system') { this.logs.unshift({text,kind,time:this.time}); this.logs=this.logs.slice(0,10); }
  champions(team) { return this.units.filter(u=>u.kind==='champion'&&(team===undefined||u.team===team)); }
  towers(team) { return this.units.filter(u=>u.kind==='tower'&&u.team===team&&u.alive); }
  locked(e) { return e.kind==='core'&&this.towers(e.team).length===2; }
  hostile(a,b) { return a.team!==b.team&&b.alive&&!this.hidden(b); }
  hidden(e) { return e.untargetableUntil>this.time; }
  bushAt(e) {return BUSHES.find(b=>e.x>=b.x&&e.x<=b.x+b.w&&e.y>=b.y&&e.y<=b.y+b.h);}
  visibleTo(team,e) {
    if(e.kind!=='champion'||e.team===team)return true;
    const bush=this.bushAt(e);
    if(!bush||e.revealedUntil>this.time||this.time-e.lastCombat<=1.25)return true;
    return this.champions(team).some(a=>a.alive&&!this.hidden(a)&&(distance(a,e)<=2.5||this.bushAt(a)?.id===bush.id));
  }
  stat(e,key) { return e.status[key]?.until>this.time ? e.status[key].amount : 0; }
  buff(e,key) { return e.buffs?.[key]>this.time; }
  random(){this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;}
  action(e,kind,fn){const old=e.actionKind;e.actionKind=kind;try{return fn();}finally{e.actionKind=old;}}
  schedule(source,delay,fn){const kind=source.actionKind||'skill';this.events.push({source,at:this.time+delay,fn:()=>this.action(source,kind,fn)});}
  startMotion(e,d,len,{speed=RULES.dashSpeed,maxSpeed=RULES.dashSpeed,kind='dash',onStep,onComplete,onCollision,ignoreWalls=false,minDuration=0,follow=null,stopDistance=0,phaseEnemies=false}={}){
    if(!e.alive||e.camp==='boss'||!['champion','minion','neutral'].includes(e.kind)||e.returning)return false;
    const forced=kind==='knock';
    if(forced&&(e.invulnerableUntil>this.time||e.ccImmuneUntil>this.time))return false;
    if(!forced&&(this.stat(e,'root')||this.stat(e,'stun')||this.stat(e,'captured')||e.state?.posthumous||e.motion))return false;
    const actionKind=e.actionKind||'skill',wrap=fn=>fn&&((...args)=>this.action(e,actionKind,()=>fn(...args)));
    onStep=wrap(onStep);onComplete=wrap(onComplete);onCollision=wrap(onCollision);
    this.cancelRecall(e);e.motion={actionKind,phaseEnemies:!forced&&phaseEnemies,lastClear:{x:e.x,y:e.y},dx:d.x,dy:d.y,remaining:len,total:len,speed:Math.min(speed,forced?RULES.knockSpeed:maxSpeed),kind,forced,onStep,onComplete,onCollision,ignoreWalls,startedAt:this.time,elapsed:0,minDuration,follow,stopDistance};
    if(len<.001&&!minDuration){delete e.motion;onComplete?.();}return true;
  }
  updateMotion(e,dt){
    const m=e.motion;if(!m)return;
    if(!e.alive||!m.forced&&(this.stat(e,'stun')||this.stat(e,'root'))){delete e.motion;if(m.kind==='leap')e.untargetableUntil=0;if(e.alive)settleBody(this,e,m.lastClear);return;}
    if(m.follow?.alive){const d=direction(e,m.follow);m.dx=d.x;m.dy=d.y;m.remaining=Math.max(0,distance(e,m.follow)-m.stopDistance);}
    m.elapsed+=dt;
    const length=Math.min(m.remaining,m.speed*dt),n=Math.max(1,Math.ceil(length/.12));let collided=false;
    for(let i=0;i<n&&e.alive&&e.motion===m;i++){
      const from={x:e.x,y:e.y},next={x:e.x+m.dx*length/n,y:e.y+m.dy*length/n};
      if(!m.ignoreWalls&&!canOccupy(this,e,next,{phaseEnemies:m.phaseEnemies})){collided=true;break;}
      e.x=clamp(next.x,WORLD.x+e.radius,WORLD.x+WORLD.w-e.radius);e.y=clamp(next.y,WORLD.y+e.radius,WORLD.y+WORLD.h-e.radius);m.remaining-=length/n;
      m.onStep?.(from,{x:e.x,y:e.y});
      if(canOccupy(this,e,e,{phaseEnemies:false}))m.lastClear={x:e.x,y:e.y};
    }
    if(!e.alive||e.motion!==m)return;
    if(m.remaining<=1e-6&&m.elapsed+1e-8>=m.minDuration||collided){delete e.motion;if(m.kind==='leap')e.untargetableUntil=0;settleBody(this,e,m.lastClear);if(collided)m.onCollision?.();m.onComplete?.({collided});}
  }
  recall(e){
    if(e.kind!=='champion'||!e.alive||e.state.posthumous||e.motion||this.hidden(e)||this.stat(e,'stun')||e.channelUntil>this.time||this.winner!==null)return false;
    if(e.recall){this.cancelRecall(e);return true;}
    if(e.state.chargeAt!==undefined){delete e.state.chargeAt;delete e.status.slow;}
    e.recall={startedAt:this.time,until:this.time+RULES.recallTime,x:e.x,y:e.y};
    if(e.player){this.input.fire=false;this.input.x=0;this.input.y=0;}return true;
  }
  cancelRecall(e){if(e.recall){delete e.recall;if(e.player)this.log('귀환 취소', 'system');}}
  updateRecall(e){
    if(!e.recall)return;
    if(this.stat(e,'stun')||this.stat(e,'root')){this.cancelRecall(e);return;}
    if(e.recall.until<=this.time+1e-8){Object.assign(e,FOUNTAINS[e.team]);delete e.recall;e.path=[];e.retreat=false;this.effects.push({type:'ring',x:e.x,y:e.y,r:2.5,color:'#94d6e3',life:1,maxLife:1});if(e.player)this.log('귀환 완료 · 부활소', 'ally');}
  }
  campTimers(){return this.units.filter(e=>e.kind==='neutral'&&!e.alive&&Number.isFinite(e.respawnAt)&&e.respawnAt>this.time&&!(e.camp==='central'&&this.bossSpawned)).map(e=>({id:e.id,name:e.name,home:e.home,seconds:Math.ceil(e.respawnAt-this.time),campId:e.campId}));}
  campViews(){
    const groups=new Map();
    for(const e of this.units.filter(u=>u.kind==='neutral'&&!(u.camp==='central'&&this.bossSpawned))){
      if(!groups.has(e.campId))groups.set(e.campId,{id:e.campId,kind:e.camp,name:e.name,home:e.campCenter,radius:e.campRadius,units:[]});
      groups.get(e.campId).units.push(e);
    }return [...groups.values()];
  }
  addBuff(e,key,seconds,{copy=true}={}){
    e.buffs[key]=this.time+seconds;e.buffHistory[key]={order:++this.buffSequence,until:e.buffs[key]};
    e.visuals[key]={until:this.time+seconds,theme:e.key,at:this.time};
    if(copy&&e.key==='honglu'&&(e.state.copyReady||0)<=this.time){e.state.copyReady=this.time+5;for(const a of this.champions(e.team).filter(a=>a!==e&&a.alive&&distance(a,e)<=8.5)){this.addBuff(a,key,seconds,{copy:false});a.visuals.hongluShare={until:this.time+seconds,theme:'honglu',at:this.time};}this.support(e);}
  }
  activeBuffs(e){
    for(const [key,until] of Object.entries(e.buffs))if(until>this.time&&e.buffHistory[key]?.until!==until)e.buffHistory[key]={order:++this.buffSequence,until};
    return Object.entries(e.buffs).filter(([,t])=>t>this.time).map(([key,until])=>({key,until,order:e.buffHistory[key]?.order||0})).sort((a,b)=>b.order-a.order);
  }
  canNaturalHeal(e){return e.alive&&!e.state.posthumous&&!e.state.detonating&&this.time-Math.max(e.lastAttackAt,e.lastDamageAt)>=RULES.naturalHealDelay-1e-8;}
  selfDamage(e,amount,{nonLethal=false,ignoreRegen=false}={}){e.hp=Math.max(nonLethal?1:0,e.hp-amount);if(!ignoreRegen)e.lastDamageAt=this.time;if(e.hp<=0)this.kill(e,e);}
  heal(source,e,amount,scale=true,{natural=false}={}){if(!e.alive||e.state?.posthumous)return 0;const value=Math.max(0,scale&&source?.kind==='champion'?damageFormula(amount,CHAMPIONS[source.key].power,1)*this.powerScale(source):amount);const actual=Math.min(e.maxHp-e.hp,value);if(e.key==='dongrang'&&!natural)e.totalHealingReceived=(e.totalHealingReceived||0)+value;e.hp+=actual;if(actual>0&&source?.team===e.team&&source!==e)e.supporters[source.id]=this.time;return actual;}
  powerScale(e){return (CHAMPIONS[e.key].powerMultiplier??1)*(1+CHAMPIONS[e.key].growth.power*(e.level-1))*(1+e.upgrades.power*.04*(e.key==='moses'?.5:1))*(Augments.has(e,'power15')?1.15:1)*(e.key==='queequeg'?1+.04*(e.state.endurance||0):1);}
  allyExecuteThreshold(e){return this.buff(e,'guboReload')?RULES.allyExecuteBuffThreshold:RULES.allyExecuteThreshold;}
  canGuboHitAlly(source,target){return source.key==='gubo'&&target!==source&&target.team===source.team&&target.kind==='champion'&&target.alive&&!this.hidden(target)&&target.hp>0&&target.hp<=target.maxHp*this.allyExecuteThreshold(source)+1e-8;}
  powerWeak(e){return Math.max(this.stat(e,'weak'),Math.max(0,...Object.values(e.state?.ishmaelWeak||{}))*.02);}
  desireEfficiency(e){return e.key==='dongrang'?1+[0,.06,.13,.20,.27,.34][CHAMPIONS[e.key].power]+Math.max(0,this.powerScale(e)-1):1;}
  armor(e){const armor=(e.armor||0)+(e.kind==='champion'&&e.key==='queequeg'?12*(e.state.endurance||0):0)+(this.buff(e,'tetherArmor')?30:0)+(e.key==='dongbaek'&&e.qCd<=0?20:0);return (100+armor)*(Augments.has(e,'armorHealth')?1.175:1)*this.desireEfficiency(e)*(this.buff(e,'chainArmor')?1.1:1)-100;}
  rewindCooldowns(e,seconds){e.qCd+=seconds;e.rCd+=seconds;for(const key of ['knifeReady','treeReady'])if(Number.isFinite(e.state[key]))e.state[key]+=seconds;if(['nelly','dongrang'].includes(e.key))e.state.qDelayUntil=Math.max(this.time,e.state.qDelayUntil||0)+seconds;}
  attackStyle(e){return e.key==='ezra'?(this.buff(e,'ezraUlt')||[1,2].includes(e.state.weapon||0)?'slash':'punch'):CHAMPIONS[e.key]?.attackStyle;}
  cooldown(e,slot){return CHAMPIONS[e.key][slot]*(Augments.has(e,'cooldown15')?.85:1)/(1+this.haste(e));}
  attackInterval(e){const c=CHAMPIONS[e.key];return c.attackTime*(c.attackTime<=RULES.fastAttackThreshold?1:RULES.attackIntervalMultiplier);}
  reloadPaused(e){if(e.key==='dongbaek'&&this.stat(e,'disarm'))return true;if(e.key==='sinclair'&&this.buff(e,'marks')||e.key==='myo'&&this.buff(e,'rabbitFrenzy'))return false;return e.attackCd>1e-8||e.state.donBarrage?.until>this.time||e.player&&this.input.fire&&(e.ammo>=1||e.key==='dongbaek'&&(e.state.petals??3)>0)&&!this.stat(e,'stun')&&!this.stat(e,'disarm')&&!e.motion;}
  ammoCap(e){return Skills.ammoCap(this,e);}
  attackRange(e){return (e.range+(e.key==='yi'&&this.buff(e,'ogamdo')?1:0))*(e.key==='ryoshu'&&this.buff(e,'amplify')?1.2:1)*(e.key==='faust'&&e.level===RULES.maxLevel?1.2:1)*(Augments.has(e,'range7')?1.07:1);}
  bonusStats(e){
    const power=this.powerScale(e)*Skills.damageBonus(this,e,{hp:e.hp,maxHp:e.maxHp})*(this.buff(e,'marks')?1.12:1)*(1-this.powerWeak(e));
    return {power:Math.round((power-1)*100),health:Math.round((e.maxHp/RULES.health[CHAMPIONS[e.key].health]-1)*100+1e-8),speed:Math.round((this.speed(e)/RULES.speed[CHAMPIONS[e.key].speed]-1)*100),haste:Math.round(this.haste(e)*100),reload:Math.round((RULES.reload[Skills.reloadGrade(e)]/this.reloadInterval(e)-1)*100)};
  }
  shield(e) { return e.shields.filter(s=>s.until>this.time).reduce((sum,s)=>sum+s.value,0); }
  maxHp(e) { return RULES.health[CHAMPIONS[e.key].health]*(1+CHAMPIONS[e.key].growth.health*(e.level-1))*(1+.06*e.upgrades.health)*(this.buff(e,'mutant')?1.15:1)*(Augments.has(e,'health15')?1.15:1)*(Augments.has(e,'armorHealth')?1.05:1)*this.desireEfficiency(e); }
  speed(e) {
    if(e.state?.posthumous)return 0;
    if(e.kind!=='champion') return e.kind==='minion'?2.5:2.7;
    const c=CHAMPIONS[e.key],base=RULES.speed[c.speed]; let mult=1+.03*e.upgrades.speed+ c.growth.speed*(e.level-1);
    if(this.buff(e,'rabbitHunt'))mult+=(e.state.rabbitStacks||0)*.2;
    if(this.buff(e,'rabbitFrenzy'))mult+=.4;
    if(this.buff(e,'flowerStride'))mult+=.2;
    if(this.buff(e,'martonStride'))mult+=.2;
    if(this.buff(e,'martonDrain'))mult+=.3;
    if(this.buff(e,'queequegUlt'))mult+=.25;
    if(this.buff(e,'tetherStride'))mult+=.25;
    if(this.buff(e,'hohenheimStride'))mult+=.3;
    if(this.buff(e,'hohenheimHitStride'))mult+=.25;
    if(Augments.has(e,'adaptiveSpeed'))mult+=this.time-e.lastCombat>3?.15:.07;
    if(this.buff(e,'resolve')) mult+=.25;
    if(this.buff(e,'marks')) mult+=.15;
    if(this.buff(e,'hongluStride')||this.buff(e,'ishmaelShield'))mult+=.2;
    if(this.buff(e,'heathUlt')||this.buff(e,'ishmaelSurvive'))mult+=.25;
    if(this.buff(e,'executedHaste'))mult+=.4;
    if(this.buff(e,'alisaHaste'))mult+=.3;
    if(this.buff(e,'coinSpeed'))mult+=(e.state.coinTails||0)*.4/base;
    if(e.key==='ryoshu'&&this.buff(e,'blessing'))mult+=.2;
    if(e.buffs.ogamdo>this.time) mult+=.25*(e.buffs.ogamdo-this.time)/4;
    mult*=1-Math.min(.5,this.stat(e,'slow'));
    return clamp(Math.max(this.buff(e,'rabbitFrenzy')?4:0,base*mult+(c.role==='암살'&&this.time-e.lastCombat>3?.45:0)),base*.65,base*1.6);
  }
  haste(e) { return Math.max(0,e.upgrades.haste*.05+(e.supportUntil>this.time?e.supportStacks*.05:0)+(this.buff(e,'blessing')?.12:0)+(this.buff(e,'faustUlt')?(e.ultStacks||0)*.1:0)+this.extraRate(e)+(this.buff(e,'augBattleHaste')?.085:0)-this.stat(e,'hasteWeak')); }
  extraRate(e){return (e.key==='ryoshu'&&this.time-e.lastCombat>=2?.2:0)+(this.buff(e,'ishmaelSurvive')?.2:0)+(this.buff(e,'coins')?(e.state.coinHeads||0)*.08:0)+(this.buff(e,'insight')?(e.state.insightStacks||0)*.07:0)+(this.buff(e,'mosesWhite')?.15:0)+(e.key==='moses'?e.upgrades.power*.04*.5*.6:0)+(this.buff(e,'disrupt')?(e.state.disruptStacks||0)*.06:0);}
  reloadInterval(e) {
    return RULES.reload[Skills.reloadGrade(e)]/(RULES.reloadEfficiency*Math.max(e.key==='moses'?.85:.2,1+e.upgrades.reload*.05+(e.key==='ahab'?.15:0)+(this.buff(e,'queequegUlt')?.4:0)+(e.supportUntil>this.time?e.supportStacks*.05:0)+(this.buff(e,'explore')?.2:0)+(this.buff(e,'marks')?.2:0)+(this.buff(e,'blessing')?.12:0)+(this.buff(e,'guboReload')?.35:0)+(this.buff(e,'faustUlt')?(e.ultStacks||0)*.1:0)+this.extraRate(e)+(this.buff(e,'rabbitHunt')?(e.state.rabbitStacks||0)*.2:0)+(this.buff(e,'rabbitFrenzy')?.6:0)+(this.buff(e,'alisaReload')?.3:0)+(e.key==='dongbaek'&&e.qCd<=0?.2:0)+(this.buff(e,'flowerReload')?.2:0)+(Augments.has(e,'reloadStacks')?(e.state.augReloadStacks||0)*.05:0)+(e.key==='ahab'&&this.buff(e,'ahabCover')?(e.state.coverStacks||0)*.2:0)-this.stat(e,'reloadWeak')));
  }
  support(e) {
    if(CHAMPIONS[e.key]?.role!=='지원'||e.supportReady>this.time) return;
    e.supportStacks=e.supportUntil>this.time?Math.min(4,e.supportStacks+1):1;
    e.supportUntil=this.time+4;e.supportReady=this.time+1.5;
    this.addBuff(e,'support',4,{copy:false});
  }
  addShield(target,value,source,seconds=3,copy=true) {
    target.shields=target.shields.filter(s=>s.until>this.time);
    const old=target.shields.find(s=>s.source===source);
    const others=target.shields.filter(s=>s!==old).reduce((n,s)=>n+s.value,0);
    const amount=Math.min(Math.max(old?.value||0,value),Math.max(0,target.maxHp*.35-others));
    if(old) {old.value=amount;old.until=this.time+seconds;}
    else target.shields.push({source,value:amount,until:this.time+seconds});
    const supporter=this.champions(target.team).find(c=>source.endsWith(`-${c.id}`));if(supporter&&supporter!==target)target.supporters[supporter.id]=this.time;
    target.visuals??={};target.visuals.shield={until:this.time+seconds,theme:source.startsWith('yi-')?'yi':target.key,at:this.time};
    if(copy&&target.key==='honglu'&&(target.state.copyReady||0)<=this.time){target.state.copyReady=this.time+5;for(const a of this.champions(target.team).filter(a=>a!==target&&a.alive&&distance(a,target)<=8.5)){this.addShield(a,value,`honglu-copy-${target.id}`,seconds,false);a.visuals.hongluShare={until:this.time+seconds,theme:'honglu',at:this.time};}this.support(target);}
  }
  status(e,key,amount,seconds,source) {
    if(e.returning||e.ccImmuneUntil>this.time||e.invulnerableUntil>this.time)return;
    if(e.key==='meursault') {
      if(['silence','slow'].includes(key)&&this.buff(e,'resolve')) return;
      if(['root','stun'].includes(key)) key='silence';
    }
    if(e.kind==='champion'&&CHAMPIONS[e.key].role==='보호') seconds*=.85;
    if(this.buff(e,'tetherResistance'))seconds*=1-Math.min(.2,(e.state.tetherResistance||0)*.05);
    if(e.status[key]?.until>this.time&&e.status[key].amount>amount){return;}
    e.status[key]={amount,until:this.time+seconds,theme:source?.key};
    if(source?.kind==='champion'&&CHAMPIONS[source.key].role==='방해'&&e.kind==='champion'&&e.team!==source.team&&(source.state.disruptReady||0)<=this.time){source.state.disruptReady=this.time+2.5;source.state.disruptStacks=this.buff(source,'disrupt')?Math.min(3,(source.state.disruptStacks||0)+1):1;this.addBuff(source,'disrupt',4);this.deal(source,e,30,{fixed:true,proc:false});}
  }
  award(e,xp,gold,{passive=false}={}) {
    if(!e||e.kind!=='champion') return;
    e.gold+=gold; e.xp+=xp*(e.key==='faust'&&!passive?1.15:1);
    const level=1+RULES.xp.slice(1).filter(n=>e.xp>=n).length;
    if(level>e.level) {
      const old=e.maxHp;e.level=level;e.maxHp=this.maxHp(e);if(e.alive)e.hp+=e.maxHp-old;
      if(e.player)this.log(`레벨 ${level} 달성`, 'ally');
      this.effects.push({type:'ring',x:e.x,y:e.y,r:2,color:'#d9be78',life:1,maxLife:1});
    }
  }
  deal(source,target,base,{fixed=false,proc=true,allowFriendly=false,damageKind=source.actionKind||'skill',nonLethal=false,transferred=false}={}) {
    const alliedAllowed=allowFriendly&&this.canGuboHitAlly(source,target);
    if(!target.alive||target.state?.posthumous||target.returning||(source.team===target.team&&!alliedAllowed)||this.hidden(target)||target.invulnerableUntil>this.time||this.locked(target)||this.winner!==null) return 0;
    let amount=base;
    if(!fixed) {
      if(source.kind==='champion') {
        amount=(source.key==='dongrang'?base:damageFormula(base,CHAMPIONS[source.key].power,1,0)*this.powerScale(source))*(1-this.powerWeak(source))*Skills.damageBonus(this,source,target)*(1+this.stat(target,'vulnerable'));
        if(this.buff(source,'marks'))amount*=1.12;
        if(CHAMPIONS[source.key].role==='저격'&&distance(source,target)>=8&&source.sniperReady<=this.time) {amount*=1.18;source.sniperReady=this.time+6;}
      }
      amount*=Skills.receivedMultiplier?.(this,source,target,damageKind)??1;
      amount*=100/(100+Math.max(0,this.armor(target)-this.stat(target,'armorDown')));
      if(target.kind==='minion'&&['tower','core'].includes(source.kind))amount*=target.siege?.5:target.ranged?.8:.7;
      if(target.kind==='champion') {
        if(CHAMPIONS[target.key].role==='보호') amount*=.92;
        if(this.buff(target,'resolve'))amount*=.7;
        if(this.buff(target,'ezraUlt'))amount*=.8;
        if(target.key==='myo'&&this.buff(target,'rabbitFrenzy')&&target.motion?.kind==='dash'&&target.motion.actionKind==='basic')amount*=.2;
        const barrage=target.state.donBarrage;if(barrage?.until>this.time){const from=direction(target,source);if(from.x*barrage.d.x+from.y*barrage.d.y>=Math.cos(Math.PI*50/180))amount*=.5;}
        if(this.champions(target.team).some(c=>c.key==='meursault'&&c.alive&&c!==target&&distance(c,target)<=4)) amount*=.92;
      }
    }
    if(['tower','core'].includes(target.kind)) {
      const nearby=this.units.filter(u=>u.alive&&u.team!==target.team&&u.team!==2&&['champion','minion'].includes(u.kind)&&distance(u,target)<=target.range);
      if(!nearby.length)return 0;
      if(source.kind==='champion'&&!nearby.some(u=>u.kind==='minion'))amount*=.2;
      if(source.siege)amount*=1.35*1.08;
    }
    if(target.kind==='core'&&this.towers(target.team).length===1)amount*=.5;
    if(target.kind==='neutral'&&(target.pattern||target.exposedUntil>this.time))amount*=1.2;
    if(target.kind==='minion'&&target.siege&&!['tower','core'].includes(source.kind))amount*=.925;
    if(source.key==='starbuck'&&target.kind==='neutral')amount*=1.1;
    if(proc&&!transferred)amount*=Skills.coverMultiplier(this,source,target);
    source.lastCombat=this.time;target.lastCombat=this.time;
    target.lastDamageAt=this.time;
    if(amount>0)this.cancelRecall(target);
    if(source.kind==='champion') {
      source.lastAttackAt=this.time;
      if(target.kind==='champion'&&source.team!==target.team) {
        target.contributors[source.id]=this.time;
        for(const u of this.units) if(u.alive&&u.team===target.team&&u.kind!=='champion'&&distance(u,source)<(u.range||2)+1) {u.aggro=source.id;u.aggroUntil=this.time+3;}
      }
      if(target.kind==='neutral')target.aggro=source.id;
    }
    if(target.kind==='neutral'&&amount>0){if(target.camp==='boss')BossPatterns.engage(this,target);else CreepPatterns.engage(this,target);target.aggro=source.id;}
    if(source.kind==='champion'&&target.kind==='champion')for(const [id,at] of Object.entries(source.supporters))if(at>=this.time-6)target.contributors[id]=this.time;
    if(target.kind==='champion'&&source.kind==='champion')for(const [id,at] of Object.entries(target.supporters))if(at>=this.time-6)source.contributors[id]=this.time;
    if(!transferred){amount=Skills.transfer(this,source,target,amount,damageKind);amount=V08.transfer(this,source,target,amount,damageKind);}
    if(this.buff(target,'queequegUlt'))nonLethal=true;
    let remaining=amount;
    for(const s of target.shields) {if(s.until<=this.time)continue;const take=Math.min(s.value,remaining);s.value-=take;remaining-=take;}
    if(nonLethal)remaining=Math.min(remaining,Math.max(0,target.hp-1));
    const actual=Math.min(target.hp,Math.max(0,remaining));target.hp=Math.max(0,target.hp-remaining);
    Skills.afterDamage(this,source,target,actual,proc,damageKind);
    V08.afterDamage(this,source,target,actual,proc,damageKind);
    Augments.afterHit(this,source,target,actual,proc);
    target.hitFlashUntil=this.time+.1;target.hitFrom=Math.atan2(target.y-source.y,target.x-source.x);
    this.effects.push({type:'impact',x:target.x,y:target.y,angle:target.hitFrom,theme:source.key,color:source.team===0?'#e9f7df':'#f3b9a3',life:.24,maxLife:.24});
    if(source.kind==='champion') {source.totalDamage+=actual;if(source.player)this.damageDone+=actual;}
    this.effects.push({type:'number',x:target.x,y:target.y-.7,text:Math.round(amount),color:fixed?'#e3bbff':source.team===0?'#eddaac':'#ee978f',life:.7,maxLife:.7});
    if(proc&&source.key==='yi'&&target.kind==='champion'&&source.passiveReady<=this.time) {
      for(const ally of this.champions(source.team).filter(c=>c.alive&&distance(c,source)<=10)){
        const id=`yi-${source.id}`,old=ally.shields.find(s=>s.source===id&&s.until>this.time)?.value||0;
        this.addShield(ally,Math.min(old+ally.maxHp*.05,ally.maxHp*.2),id);this.support(source);
      }
      source.passiveReady=this.time+1.5;
    }
    if(target.hp<=0&&!Skills.interceptDeath(this,target,source))this.kill(target,source);
    if(proc&&target.alive&&source.kind==='champion'&&this.buff(source,'amplify')&&(source.ampTargets?.[target.id]||0)<=this.time) {
      source.ampTargets??={};source.ampTargets[target.id]=this.time+1;
      this.status(target,'slow',.12,1);this.deal(source,target,35,{fixed:true,proc:false});
    }
    return actual;
  }
  kill(e,killer) {
    if(!e.alive)return;
    V08.onDeath(this,e);e.exposedUntil=0;e.alive=false;e.hp=0;delete e.motion;delete e.recall;if(e.kind==='neutral'){CreepPatterns.cancel(e);if(e.camp==='boss')BossPatterns.cancel(e);}
    if(e.kind==='champion') {
      this.corpses.push({key:e.key,team:e.team,x:e.x,y:e.y,facing:e.facing||0,at:this.time,until:this.time+12,visible:this.visibleTo(0,e)});this.corpses=this.corpses.slice(-32);
      e.ccImmuneUntil=0;e.invulnerableUntil=0;e.channelUntil=0;e.untargetableUntil=0;delete e.burn;
      e.deaths++;e.respawnAt=this.time+respawnTime(this.time,e.level);e.shields=[];e.status={};e.buffs={};e.marks=0;e.basicHits={};e.supportStacks=0;e.supportUntil=0;e.state={augBulletReady:e.state.augBulletReady,augHealReady:e.state.augHealReady};e.visuals={};e.maxHp=this.maxHp(e);e.radius=.48;
      if(killer.team<2&&killer.team!==e.team) {
        this.kills[killer.team]++;
        if(killer.kind==='champion'){killer.kills++;killer.streak++;killer.lastChampionKill=this.time;this.award(killer,120,120+(e.streak>=3?Math.min(140,(e.streak-2)*35):0));Skills.takedown(this,killer,e,true);}
        const assists=this.champions(killer.team).filter(c=>c!==killer&&(e.contributors[c.id]??-99)>=this.time-6).slice(0,3);
        if(killer.key==='ahab')assists.forEach(c=>this.award(c,80,50));
        assists.forEach(c=>{c.assists++;this.award(c,70,40);Skills.takedown(this,c,e,false);});
      }
      if(killer.key==='gubo'&&killer.team===e.team){e.respawnAt=this.time+respawnTime(this.time,e.level)*.5;e.state.executedReturn=true;Skills.guboBlast(this,killer,e);killer.qCd=0;}
      e.streak=0;e.contributors={};
      this.log(`${killer.name} → ${e.name} 처치`, killer.team===0?'ally':'enemy');
    } else if(e.kind==='tower') {
      this.champions(killer.team).forEach(c=>this.award(c,120,130));
      this.log(`${e.team===0?'아군':'적군'} 포탑 파괴${this.towers(e.team).length===0?' · 본진 개방':''}`,e.team===0?'enemy':'ally');
    } else if(e.kind==='core') {this.finish(killer.team,'본진 파괴');}
    else if(e.kind==='minion'&&killer.kind==='champion') {
      Skills.takedown(this,killer,e,true);
      const xp=e.siege?45:e.ranged?26:24,gold=e.siege?30:e.ranged?18:15;
      const allies=this.champions(killer.team).filter(c=>c!==killer&&c.alive&&distance(c,e)<=7),share=allies.length?RULES.shareFraction:0;
      this.award(killer,xp*(1-share),gold*(1-share));
      allies.forEach(c=>this.award(c,xp*share/allies.length,gold*share/allies.length));
    } else if(e.kind==='neutral') {
      Skills.takedown(this,killer,e,true);
      if(e.camp==='boss') {
        this.champions(killer.team).forEach(c=>this.award(c,180*(c.key==='starbuck'?1.1:1),160));
        this.log(`${killer.team===0?'아군':'적군'} 중앙 보스 처치`,killer.team===0?'ally':'enemy');
      } else {
        this.award(killer,(['central','side'].includes(e.camp)?56.25:112.5)*(killer.key==='starbuck'?1.1:1),['central','side'].includes(e.camp)?18:40);
        e.respawnAt=this.time+e.respawnDelay;
        if(killer.kind==='champion'&&e.camp==='amplify')this.addBuff(killer,'amplify',CAMP_RULES.buffDuration);
        if(killer.kind==='champion'&&e.camp==='blessing'){this.addBuff(killer,'blessing',CAMP_RULES.buffDuration);this.addBuff(killer,'blessingHeal',5,{copy:false});}
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
    this.wave++;
    const scale=Math.min(MINIONS.maxGrowth,Math.floor(this.time/MINIONS.growthEvery));
    for(let team=0;team<2;team++)for(let lane=0;lane<2;lane++)for(let i=0;i<(this.wave%3===0?5:4);i++)this.minionQueue.push({team,lane,index:i,wave:this.wave,scale,at:this.time+i*MINIONS.spawnGap});
    this.flushMinions();
  }
  flushMinions(){
    const due=this.minionQueue.filter(s=>s.at<=this.time+1e-8);this.minionQueue=this.minionQueue.filter(s=>s.at>this.time+1e-8);
    for(const spawn of due){
      const {team,lane,index,wave,scale}=spawn,ranged=index===3,siege=index===4,path=lanePath(team,lane),radius=(siege?.48:.28)*1.15,forward=direction(path[0],path[1]),origin={x:path[0].x+forward.x*(1.4+radius),y:path[0].y+forward.y*(1.4+radius)};
      this.entity({kind:'minion',team,lane,...origin,wave,formationIndex:index,spawnAt:spawn.at,
        maxHp:(siege?MINIONS.health.siege:ranged?MINIONS.health.ranged:MINIONS.health.melee)*(1+MINIONS.hpGrowth*scale),damage:(siege?125:ranged?72:58)*(1+MINIONS.attackGrowth*scale),
        interval:siege?2:ranged?1.5:1.25,range:siege?6:ranged?5.5:1.2,radius,
        name:siege?'공성 미니언':ranged?'원거리 미니언':'근접 미니언',siege,ranged,waypoint:1,path:[],pathAt:0});
    }
  }
  spawnBoss() {
    this.bossSpawned=true;
    for(const u of this.units)if(u.camp==='central'){u.alive=false;u.hp=0;u.respawnAt=Infinity;}
    this.makeNeutral(MAP_CENTER.x,MAP_CENTER.y,'boss');this.log('05:00 · 중앙 보스 출현', 'boss');
    this.effects.push({type:'ring',...MAP_CENTER,r:5,color:'#c89cf0',life:2,maxLife:2});
  }
  nearest(e,range,includeNeutral=true) {
    return this.units.filter(u=>this.hostile(e,u)&&this.visibleTo(e.team,u)&&(includeNeutral||u.team!==2)&&!this.locked(u)&&distance(e,u)<=range+u.radius&&clearLine(e,u)).sort((a,b)=>distance(e,a)-distance(e,b))[0];
  }
  moveToward(e,goal,dt,{speed,ignoreCC=false}={}) {
    if(e.state?.posthumous||e.state?.ahabUlt||e.motion||e.recall||!ignoreCC&&(this.stat(e,'root')||this.stat(e,'stun')||this.hidden(e)||e.channelUntil>this.time))return;
    if(distance(e,goal)<.05)return;
    let target=goal;
    if(!clearLine(e,goal,e.radius)) {
      if(this.time>=e.pathAt||!e.path?.length||distance(e.pathGoal||goal,goal)>2) {e.path=findPath(e,goal,e.radius);e.pathAt=this.time+1;e.pathGoal={x:goal.x,y:goal.y};}
      while(e.path?.length&&distance(e,e.path[0])<.3)e.path.shift();
      target=e.path?.[0]||goal;
    }
    const step=Math.min(distance(e,target),(speed??this.speed(e))*dt),d=steer(this,e,target,step);moveBody(this,e,d.x*step,d.y*step);
  }
  aim(e,point) {const d=direction(e,point);return Math.hypot(d.x,d.y)>.01?d:{x:e.team===0?1:-1,y:0};}
  bullet(e,dir,damage,range,options={}) {
    this.projectiles.push({source:e,damageKind:e.actionKind||'skill',x:e.x,y:e.y,origin:{x:e.x,y:e.y},dx:dir.x,dy:dir.y,damage,remaining:range,width:.18,speed:22,knock:0,color:e.team===0?'#92d5dd':'#e6a097',theme:e.key,hitIds:new Set(),...options});
  }
  cone(e,dir,range,angle,damage,onHit=()=>{},{exclude}={}) {
    for(const target of this.units.filter(u=>this.hostile(e,u))) {
      if(exclude?.has(target.id))continue;
      const d=direction(e,target);
      if(distance(e,target)<=range+target.radius&&d.x*dir.x+d.y*dir.y>=Math.cos(angle/2)&&clearLine(e,target)) {this.deal(e,target,damage);onHit(target);}
    }
    this.effects.push({type:['thrust','punch','whip','flame'].includes(this.attackStyle(e))?'thrust':'slash',x:e.x,y:e.y,angle:Math.atan2(dir.y,dir.x),spread:angle,r:range,color:e.team===0?'#bce5e5':'#eaa39c',theme:e.key,side:(e.attackSerial||0)%2?1:-1,life:.28,maxLife:.28});
  }
  addMark(e,n=1) {
    e.marks+=n;
    if(e.marks>=3){e.marks=0;this.addBuff(e,'marks',4);e.ammo=this.ammoCap(e);e.reloadProgress=0;}
  }
  attack(e,point,options={}) {return this.action(e,'basic',()=>this.attackAction(e,point,options));}
  attackAction(e,point,options={}) {
    if(!e.alive||this.winner!==null)return false;
    if(this.stat(e,'taunt')&&!options.taunted)return false;
    if(e.state.ahabUlt||this.stat(e,'disarm')||e.state.donBarrage?.until>this.time||e.motion||this.hidden(e)||this.stat(e,'stun')||e.channelUntil>this.time||e.attackCd>0)return false;
    if(!Skills.beforeBasic(this,e,point,options))return false;
    if(!e.alive||this.hidden(e)||this.stat(e,'stun')||e.channelUntil>this.time||e.attackCd>0||e.ammo<1||this.winner!==null)return false;
    this.cancelRecall(e);const c=CHAMPIONS[e.key],d=this.aim(e,point);e.state.fullAmmo=e.ammo>=this.ammoCap(e);if(!e.state.posthumous)e.ammo--;e.attackCd=this.attackInterval(e);e.attackSerial=(e.attackSerial||0)+1;e.attackFacing=Math.atan2(d.y,d.x);e.facing=Math.atan2(d.y,d.x);e.attackAt=this.time;e.lastAttackAt=this.time;e.revealedUntil=this.time+1.25;
    if(Skills.basic(this,e,point,d,options))return true;
    if(e.key==='faust') {this.cone(e,d,1.8,1.1,170);this.bullet(e,d,180,this.attackRange(e));}
    if(e.key==='yi')for(const offset of this.buff(e,'ogamdo')?[-.71,-.475,-.24,0,.24,.475,.71]:[-.305,0,.305])this.bullet(e,{x:Math.cos(e.facing+offset),y:Math.sin(e.facing+offset)},95,this.attackRange(e));
    if(e.key==='sinclair')this.cone(e,d,this.attackRange(e),1.6,210,t=>{
      if(t.kind==='champion'){e.basicHits[t.id]=(e.basicHits[t.id]||0)+2;if(e.basicHits[t.id]>=4){e.basicHits[t.id]-=4;this.addMark(e);}}
      if(t.kind==='neutral'&&['central','side'].includes(t.camp)&&t.hp<=t.maxHp*.1&&t.alive)this.deal(e,t,t.hp,{fixed:true});
    });
    if(e.key==='meursault')this.cone(e,d,this.attackRange(e),1.6,233.75,t=>{if((t.slowFromFist||0)<=this.time){this.status(t,'slow',.2,1.2);t.slowFromFist=this.time+3;}});
    return true;
  }
  cast(e,slot,point,options={}) {return this.action(e,'skill',()=>this.castAction(e,slot,point,options));}
  castAction(e,slot,point,options={}) {
    if(!['q','r'].includes(slot)||!point)return false;
    point=castPoint(e,point,skillTargeting(this,e,slot));
    const recast=Skills.canRecast(this,e,slot);
    if(e.state.ahabUlt||this.stat(e,'taunt')||e.state.posthumous&&slot==='r')return false;
    if(!e.alive||e.motion||this.hidden(e)||this.stat(e,'stun')||e.channelUntil>this.time||(e[slot+'Cd']>0&&!recast)||this.winner!==null)return false;
    if(this.stat(e,'silence')&&!(e.key==='meursault'&&slot==='q'))return false;
    if(!Skills.validateSkill(this,e,slot,point,options))return false;
    this.cancelRecall(e);const c=CHAMPIONS[e.key],d=this.aim(e,point); if(!recast)e[slot+'Cd']=this.cooldown(e,slot);
    if(Skills.isOffensive(e,slot))e.lastAttackAt=this.time;
    e.facing=Math.atan2(d.y,d.x);e.castAt=this.time;e.castSlot=slot;e.revealedUntil=this.time+1.25;
    this.effects.push({type:'cast',x:e.x,y:e.y,angle:e.facing,r:slot==='r'?5:3,theme:e.key,slot,life:slot==='r'?.9:.55,maxLife:slot==='r'?.9:.55});
    if(Skills.cast(this,e,slot,point,d,options))return true;
    const destination=(max)=>{const len=Math.min(max,distance(e,point));return {x:clamp(e.x+d.x*len,WORLD.x+.6,WORLD.x+WORLD.w-.6),y:clamp(e.y+d.y*len,WORLD.y+.6,WORLD.y+WORLD.h-.6)};};
    if(slot==='q') {
      if(e.key==='faust') {this.cone(e,d,3,1.4,150);this.bullet(e,d,230,7.5,{width:.35,knock:1.4});this.addBuff(e,'explore',4);}
      if(e.key==='yi') {const p=destination(7);this.zones.push({source:e,...p,r:3.2,until:this.time+3,nextTick:this.time+.5,nextControl:this.time,stays:{}});}
      if(e.key==='sinclair') {
        let marked=false;Skills.dash(this,e,d,3.2,180,t=>{if(t.kind==='champion'&&!marked){marked=true;this.addMark(e);}});
      }
      if(e.key==='meursault') {this.addBuff(e,'resolve',4);e.ammo=Math.min(this.ammoCap(e),e.ammo+1);delete e.status.silence;delete e.status.slow;this.effects.push({type:'ring',x:e.x,y:e.y,r:2,color:'#a7d6e4',life:.5,maxLife:.5});}
    } else {
      if(e.key==='faust') {
        const p=destination(10);e.channelUntil=this.time+1.25;
        this.pending.push({type:'burst',source:e,...p,r:4.8,at:this.time+1.25,damage:680});
      }
      if(e.key==='yi') {
        for(const a of this.champions(e.team).filter(a=>a.alive&&distance(a,e)<=5.5)) {this.addBuff(a,'ogamdo',4);this.addShield(a,Math.min(180,a.maxHp*.18),`yi-${e.id}`);}
        this.support(e);this.effects.push({type:'ring',x:e.x,y:e.y,r:5.5,color:'#cdbb87',life:.8,maxLife:.8});
      }
      if(e.key==='sinclair') {
        let p=destination(6);if(blocked(p.x,p.y,e.radius))p={x:e.x,y:e.y};
        const healthy=e.hp/e.maxHp>=.5,len=distance(e,p),travel=Math.max(.7,len/RULES.dashSpeed);e.untargetableUntil=this.time+travel;
        this.startMotion(e,direction(e,p),len,{kind:'leap',speed:len/travel,minDuration:travel,ignoreWalls:true,onComplete:()=>{e.untargetableUntil=0;Skills.area(this,e,e,3.8,390);this.effects.push({type:'burst',x:e.x,y:e.y,r:3.8,theme:e.key,life:.65,maxLife:.65});}});
        if(healthy)this.addMark(e,3);else {this.addShield(e,e.maxHp*.15,`branch-${e.id}`);e.rCd*=.8;}
      }
      if(e.key==='meursault'){this.addBuff(e,'chainArmor',3);this.cone(e,d,5.2,Math.PI*100/180,270,t=>{this.status(t,'root',1,1.25);this.status(t,'weak',.12,4);});}
    }
    return true;
  }
  inSpawn(e) {return inWell(e);}
  canShop(e) {return e.alive&&!e.state.posthumous&&this.inSpawn(e)&&this.time-e.lastCombat>=3&&this.winner===null;}
  canUpgrade(e){return e.kind==='champion'&&this.winner===null&&(!e.alive||this.canShop(e));}
  buyAugment(e,key){const item=Augments.AUGMENTS.find(a=>a.key===key);if(!item||!this.canUpgrade(e)||!Augments.unlocked(e,item.group)||e.augments.length>=Augments.AUGMENT_RULES.slots||Augments.has(e,key)||e.gold<Augments.AUGMENT_RULES.cost)return false;e.gold-=Augments.AUGMENT_RULES.cost;e.augments.push(key);this.refreshEquipment(e);return true;}
  sellAugment(e,key){if(!this.canUpgrade(e)||!Augments.has(e,key))return false;e.augments=e.augments.filter(k=>k!==key);e.gold+=Augments.AUGMENT_RULES.cost*Augments.AUGMENT_RULES.refund;this.refreshEquipment(e);if(key==='reloadStacks'){delete e.state.augReloadStacks;delete e.buffs.augReload;}if(key==='battleHaste')delete e.buffs.augBattleHaste;return true;}
  refreshEquipment(e,{clampAmmo=true}={}){const old=e.maxHp;e.maxHp=this.maxHp(e);if(e.alive)e.hp=Math.min(e.maxHp,e.hp+Math.max(0,e.maxHp-old));if(clampAmmo)e.ammo=Math.min(e.ammo,this.ammoCap(e));}
  buy(e,key) {
    if(!this.canUpgrade(e))return false;
    const item=UPGRADES.find(u=>u.key===key);
    if(!item||e.upgrades[key]>=item.max)return false;
    const cost=RULES.costs[e.upgrades[key]];if(e.gold<cost)return false;
    e.gold-=cost;e.upgrades[key]++;
    if(key==='health'||key==='power'&&e.key==='dongrang'){const old=e.maxHp;e.maxHp=this.maxHp(e);if(e.alive)e.hp+=e.maxHp-old;}
    return true;
  }
  clearTarget(e,t,range){return distance(e,t)<=range+t.radius&&clearLine(e,t);}
  aiChampion(e,dt) {
    if(e.hp/e.maxHp<.24)e.retreat=true;if(e.hp/e.maxHp>.88)e.retreat=false;
    if(e.retreat){this.moveToward(e,FOUNTAINS[e.team],dt);if(e.key==='meursault')this.cast(e,'q',e);return;}
    if(BotAI.bossObjective(this,e,dt))return;delete e.objective;
    if(e.position==='jungle')return this.aiJungle(e,dt);
    const near=this.nearest(e,9,false);
    if(near) {
      const d=distance(e,near);
      const anchor=e.position==='support'?BotAI.supportAnchor(this,e):null;
      if(anchor&&distance(e,anchor)<2.5)this.moveToward(e,BotAI.formation(this,e,anchor,near),dt);
      else if(d>this.attackRange(e)*.88)this.moveToward(e,near,dt);
      if(d<=this.attackRange(e)+near.radius)this.attack(e,near);
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
    const enemies=this.champions(1-e.team).filter(t=>t.alive&&this.visibleTo(e.team,t)&&distance(e,t)<=7&&clearLine(e,t));
    let target=enemies.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if(!target){
      const camps=this.units.filter(t=>t.kind==='neutral'&&t.alive&&!t.returning&&t.camp!=='boss'&&(e.team===0?t.x<=MAP_CENTER.x+3:t.x>=MAP_CENTER.x-3));
      target=camps.sort((a,b)=>distance(e,a)-distance(e,b))[0];
    }
    if(!target){const ally=this.champions(e.team).find(a=>a.position==='bottom');if(ally)this.moveToward(e,BotAI.formation(this,e,ally),dt);return;}
    const d=distance(e,target);if(d>this.attackRange(e)*.85)this.moveToward(e,target,dt);
    if(d<=this.attackRange(e)+target.radius&&clearLine(e,target)){this.attack(e,target);BotAI.combatSkills(this,e,target);}
  }
  aiMinion(e,dt) {
    const aggro=this.units.find(t=>t.id===e.aggro&&t.alive&&this.visibleTo(e.team,t)&&e.aggroUntil>this.time&&distance(e,t)<e.range+2);
    const candidates=this.units.filter(t=>t.team!==2&&this.hostile(e,t)&&this.visibleTo(e.team,t)&&!this.locked(t)&&distance(e,t)<Math.max(6,e.range)+t.radius&&clearLine(e,t));
    const rank=t=>e.siege&&t.kind==='tower'?-1:t.kind==='minion'?0:t.kind==='champion'?1:2;
    candidates.sort((a,b)=>rank(a)-rank(b)||distance(e,a)-distance(e,b));
    const target=aggro||candidates[0];
    if(target) {
      if(distance(e,target)>e.range+target.radius)this.moveToward(e,target,dt);
      else if(e.attackCd<=0){this.simpleAttack(e,target);e.attackCd=e.interval;}
    } else {
      const path=lanePath(e.team,e.lane),goal=path[e.waypoint];
      const ahead=this.units.find(a=>a.alive&&a.kind==='minion'&&a.team===e.team&&a.lane===e.lane&&a.wave===e.wave&&a.formationIndex===e.formationIndex-1);
      if(ahead&&distance(e,ahead)<e.radius+ahead.radius+.12)return;
      this.moveToward(e,goal,dt);
      if(distance(e,goal)<.09&&e.waypoint<3){e.x=goal.x;e.y=goal.y;e.waypoint++;}

    }
  }
  simpleAttack(e,t) {
    if(e.kind==='tower'||e.kind==='core'||e.kind==='minion'&&(e.ranged||e.siege)){this.projectiles.push({source:e,target:t,homing:true,x:e.x,y:e.y,damage:e.damage,speed:e.kind==='minion'?12:14,remaining:4,width:e.kind==='minion'?.12:.24,color:e.team===0?'#83e5f4':'#ee9b84'});return;}
    this.effects.push({type:'line',x:e.x,y:e.y,to:{x:t.x,y:t.y},color:e.team===0?'#6fb8c7':e.team===1?'#d18178':'#bd9e64',life:.16,maxLife:.16});
    this.deal(e,t,e.damage);
  }
  aiStructure(e) {
    if(this.locked(e))return;
    const targets=this.units.filter(u=>u.alive&&!this.hidden(u)&&this.visibleTo(e.team,u)&&u.team!==e.team&&u.team!==2&&['champion','minion'].includes(u.kind)&&distance(e,u)<=e.range);
    if(e.attackCd>0||!targets.length)return;
    const rank=t=>t.siege?0:t.kind==='minion'?1:2;
    const target=targets.find(u=>u.id===e.aggro&&e.aggroUntil>this.time)||targets.sort((a,b)=>rank(a)-rank(b)||a.id-b.id)[0];
    this.simpleAttack(e,target);e.attackCd=e.interval;
  }
  aiNeutral(e,dt) {
    if(e.camp==='boss'){BossPatterns.update(this,e,dt);return;}
    if(e.hostile&&distance(e,e.campCenter)>e.campRadius)e.outsideSince??=this.time;else delete e.outsideSince;
    if(!e.returning&&(e.outsideSince!==undefined&&this.time-e.outsideSince>=CAMP_RULES.leashDelay)){
      e.returning=true;e.hostile=false;e.exposedUntil=0;e.aggro=null;CreepPatterns.cancel(e);e.status={};e.path=[];delete e.motion;
    }
    if(e.returning){
      this.moveToward(e,e.home,dt,{speed:CAMP_RULES.returnSpeed,ignoreCC:true});e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.7*dt);
      if(distance(e,e.home)<.2){Object.assign(e,e.home);e.returning=false;e.hp=e.maxHp;e.sweep=2.5;delete e.outsideSince;e.lastCombat=-99;}
      return;
    }
    const target=e.hostile?this.units.find(c=>c.id===e.aggro&&c.alive&&!this.hidden(c)&&clearLine(e,c)):null;
    if(CreepPatterns.update(this,e,target))return;
    if(!target) {this.moveToward(e,e.home,dt);if(this.time-e.lastCombat>5)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*dt);return;}
    if(distance(e,target)>e.range)this.moveToward(e,target,dt);
    else if(e.attackCd<=0){this.simpleAttack(e,target);e.attackCd=e.interval;}

  }
  updateProjectiles(dt) {
    for(const p of this.projectiles) {
      if(p.homing){const t=p.target;p.remaining-=dt;if(!t.alive||this.hidden(t)){p.remaining=0;continue;}const d=direction(p,t),step=p.speed*dt;if(distance(p,t)<=step+t.radius){this.deal(p.source,t,p.damage,{allowFriendly:p.allowFriendly,damageKind:p.damageKind});p.onHit?.(t,p);p.remaining=0;p.hit=true;}else{p.x+=d.x*step;p.y+=d.y*step;p.dx=d.x;p.dy=d.y;}continue;}
      const travel=Math.min(p.remaining,p.speed*dt),n=Math.max(1,Math.ceil(travel/.18));
      for(let i=0;i<n&&p.remaining>0;i++) {
        p.x+=p.dx*travel/n;p.y+=p.dy*travel/n;p.remaining-=travel/n;
        if(blocked(p.x,p.y,.08)){p.remaining=0;break;}
        const t=this.units.find(t=>(this.hostile(p.source,t)||p.allowFriendly&&this.canGuboHitAlly(p.source,t))&&!p.hitIds.has(t.id)&&distance(p,t)<=t.radius+p.width);
        if(t) {
          p.hitIds.add(t.id);p.lastHpRatio=t.hp/t.maxHp;
          p.beforeHit?.(t,p);this.deal(p.source,t,p.damage*(p.bonusLowHp&&t.hp/t.maxHp<.5?1+p.bonusLowHp:1),{damageKind:p.damageKind,allowFriendly:p.allowFriendly});
          p.onHit?.(t,p);
          if(p.knock)this.startMotion(t,{x:p.dx,y:p.dy},p.knock,{kind:'knock'});
          if(p.pierce>0){p.pierce--;p.damage*=p.decay??1;}else {p.remaining=0;p.hit=true;}
        }
      }
    }
    for(const p of this.projectiles)if(p.remaining<=0&&!p.hit)p.onEnd?.({x:p.x,y:p.y});
    this.projectiles=this.projectiles.filter(p=>p.remaining>0);
  }
  updateDelayed(dt) {
    for(const event of this.pending) {
      if(event.at>this.time)continue;
      const e=event.source;
      if(!e.alive||this.stat(e,'stun')||(event.type==='burst'&&this.stat(e,'silence')))continue;
      let hits=0;
      for(const t of this.units.filter(t=>this.hostile(e,t)&&distance(event,t)<=event.r&&(event.ignoreWalls||clearLine(event,t)))) {this.deal(e,t,event.damage);event.onHit?.(t);if(t.kind==='champion')hits++;}
      if(event.type==='burst'&&hits){this.addBuff(e,'faustUlt',4);e.ultStacks=Math.min(4,hits);}
      this.effects.push({type:'burst',x:event.x,y:event.y,r:event.r,color:'#d6be7f',theme:e.key,life:.65,maxLife:.65});
    }
    this.pending=this.pending.filter(e=>e.at>this.time&&e.source.alive);
    for(const z of this.zones) {
      if(z.until<=this.time)continue;
      if(z.kind&&z.kind!=='mirror'){
        if(z.follow){z.x=z.source.x;z.y=z.source.y;}
        if(z.kind==='desireTree'&&z.golden)continue;
        if(this.time>=z.nextTick){
          z.nextTick+=z.tickEvery||.5;
          for(const t of this.units.filter(t=>t.alive&&distance(t,z)<=z.r&&clearLine(z,t))){
            if(t.team===z.source.team&&t.kind==='champion'){
              if(z.heal)this.heal(z.source,t,z.heal);
              if(z.cleanse&&!z.cleansed.has(t.id)){t.status={};z.cleansed.add(t.id);}
            }else if(this.hostile(z.source,t)&&(!z.championsOnly||t.kind==='champion')){
              if(z.damage){const dealt=this.deal(z.source,t,z.damage,{fixed:Boolean(z.fixed)});if(z.lifesteal)this.heal(z.source,z.source,dealt*z.lifesteal,false);if(z.kind==='desireTree'){z.dealt=(z.dealt||0)+dealt;if(z.dealt>=350){z.golden=true;z.until=this.time+10;z.damage=0;break;}}}
              if(z.weak)this.status(t,'weak',z.weak,.7,z.source);
              if(z.slow)this.status(t,'slow',z.slow,z.kind==='desireTree'?1:.7,z.source);if(z.reloadWeak)this.status(t,'reloadWeak',z.reloadWeak,.7,z.source);
            }
          }
        }
        continue;
      }
      const control=this.time+1e-8>=(z.nextControl??0);
      for(const t of this.units.filter(t=>this.hostile(z.source,t)&&distance(z,t)<=z.r&&clearLine(z,t))) {
        if(control&&t.kind==='champion'){this.status(t,'silence',1,.25,z.source);this.status(t,'reloadWeak',.1,.25,z.source);}
        if(this.time>=z.nextTick)this.deal(z.source,t,45);
      }
      if(control)z.nextControl=this.time+.1;
      if(this.time>=z.nextTick)z.nextTick+=.5;
    }
    this.zones=this.zones.filter(z=>z.until>this.time);
  }
  step(dt) {
    if(this.winner!==null)return;
    dt=Math.min(dt,Math.max(0,RULES.timeLimit-this.time));
    if(dt===0){const result=this.timeDecision();this.finish(result.team,result.reason);return;}
    this.time+=dt;V08.tickObjects(this);
    if(!this.bossSpawned&&this.time+1e-8>=RULES.bossAt)this.spawnBoss();
    if(this.time+1e-8>=RULES.firstWaveAt+RULES.waveEvery*this.wave)this.spawnWave();this.flushMinions();
    for(const e of this.units)e.bodyOrigin={x:e.x,y:e.y};
    for(const e of this.units) {
      e.attackCd=Math.max(0,e.attackCd-dt);
      if(e.kind==='champion') {
        e.gold+=dt;this.award(e,dt,0,{passive:true});e.qCd=Math.max(0,e.qCd-dt);e.rCd=Math.max(0,e.rCd-dt);
        if(!e.alive&&this.time>=e.respawnAt){e.alive=true;e.hp=e.maxHp;Object.assign(e,FOUNTAINS[e.team]);e.ammo=this.ammoCap(e);e.reloadProgress=0;e.retreat=false;e.path=[];e.laneEntered=false;e.lastAttackAt=this.time-3;e.lastDamageAt=this.time-3;
          if(e.state.executedReturn){this.addBuff(e,'executedHaste',3);delete e.state.executedReturn;}
          if(e.state.fastReturn){this.addBuff(e,'alisaHaste',5);delete e.state.fastReturn;}Skills.onRespawn(this,e);
        }
      } else if(e.kind==='neutral'&&!e.alive&&this.time>=e.respawnAt&&!(e.camp==='central'&&this.bossSpawned)){e.alive=true;e.hp=e.maxHp;e.x=e.home.x;e.y=e.home.y;e.aggro=null;e.hostile=false;e.returning=false;CreepPatterns.cancel(e);delete e.outsideSince;delete e.patternReady;}
      if(!e.alive)continue;
      if(e.kind==='core'&&this.time-(e.lastDamageAt||0)>=10){let ward=e.shields.find(s=>s.source==='core-ward');if(!ward){ward={source:'core-ward',until:Infinity,value:0};e.shields.push(ward);}ward.value=e.maxHp*.15;}
      const moving=Boolean(e.motion);this.updateMotion(e,dt);if(!e.alive)continue;
      if(e.kind==='champion') {
        if(e.player&&e.recall&&(this.input.x||this.input.y||this.input.fire))this.cancelRecall(e);
        this.updateRecall(e);
        const cap=this.ammoCap(e);
        if(e.key!=='rudolph'&&!this.reloadPaused(e)&&!this.buff(e,'ezraUlt')&&e.ammo<cap) {e.reloadProgress+=dt;const gap=this.reloadInterval(e);while(e.reloadProgress>=gap&&e.ammo<cap){e.ammo=Math.min(cap,e.ammo+1);e.reloadProgress-=gap;}}
        if(e.ammo>=cap)e.reloadProgress=0;
        const natural=this.canNaturalHeal(e);e.naturalHealing=natural&&e.hp<e.maxHp;
        if(natural&&e.hp<e.maxHp)this.heal(null,e,e.maxHp*RULES.naturalHealRate*dt,false,{natural:true});
        else if(!natural&&this.inSpawn(e)&&e.hp<e.maxHp)this.heal(null,e,e.maxHp*.12*dt,false);
        if(inWell(e,1-e.team)) {e.fountainTick=(e.fountainTick||0)+dt;if(e.fountainTick>=.5){e.fountainTick-=.5;this.deal({team:1-e.team,name:'부활소',kind:'fountain'},e,150,{fixed:true});}}
        else e.fountainTick=0;
        if(!e.alive)continue;
        if(this.buff(e,'blessingHeal'))this.heal(null,e,30*dt,false);
        if(this.buff(e,'mosesHeal'))this.heal(null,e,35*dt,false);
        Skills.tick(this,e,dt);V08.tick(this,e,dt);Augments.tick(this,e);if(!e.alive)continue;
        if(V08.controlTaunt(this,e,dt))continue;
        if(e.player) {
          if(!e.state.posthumous&&!e.state.ahabUlt&&!moving&&!e.motion&&!e.recall&&!this.stat(e,'root')&&!this.stat(e,'stun')&&!this.hidden(e)&&!(e.channelUntil>this.time)) {const len=Math.hypot(this.input.x,this.input.y)||1;moveBody(this,e,this.input.x/len*this.speed(e)*dt,this.input.y/len*this.speed(e)*dt);}
          if(this.input.fire)this.attack(e,this.input.aim);
          e.facing=Math.atan2(this.input.aim.y-e.y,this.input.aim.x-e.x);
        } else if(!e.state.posthumous&&!e.state.ahabUlt&&!moving&&!e.motion&&!e.recall)this.aiChampion(e,dt);
      } else if(e.kind==='minion'){if(V08.controlTaunt(this,e,dt))continue;if(!moving&&!e.motion)this.aiMinion(e,dt);}
      else if(e.kind==='neutral')this.aiNeutral(e,dt);
      else if(e.kind!=='bait')this.aiStructure(e);
    }
    const due=this.events.filter(ev=>ev.at<=this.time+1e-8);this.events=this.events.filter(ev=>ev.at>this.time+1e-8);
    for(const ev of due)if(ev.source.alive&&!this.stat(ev.source,'stun'))ev.fn();
    separate(this);this.updateProjectiles(dt);this.updateDelayed(dt);
    for(const fx of this.effects)fx.life-=dt;
    this.effects=this.effects.filter(f=>f.life>0).slice(-220);
    for(const b of this.units.filter(e=>e.kind==='bait'&&e.alive&&e.until<=this.time))this.kill(b,b);
    this.units=this.units.filter(e=>!['minion','bait'].includes(e.kind)||e.alive);this.corpses=this.corpses.filter(c=>c.until>this.time);
    if(this.winner===null&&this.time+1e-8>=RULES.timeLimit){const result=this.timeDecision();this.finish(result.team,result.reason);}
  }
}
