import * as Reworks from './reworks.js';
import * as Don from './don.js';
import * as Infestation from './infestation.js';
import * as Gregor from './gregor.js';
import * as Sora from './sora.js';
import * as Yan from './yan.js';
import*as GuboUltimate from'./gubo-ultimate.js';
import * as Hohenheim from './hohenheim.js';
import * as V12 from './v12-champions.js';
import { trapPoint } from './confinement.js';
import * as V08 from './v08-champions.js';
import * as V10 from './v10-champions.js';
import * as V06 from './v06-champions.js';
import * as New from './new-champions.js';
import { has } from './augments.js';
import { RULES, RUNTIME_CHAMPIONS as CHAMPIONS, WORLD, terrainContains } from './data.js';
import { distance,direction,segmentDistance,clamp } from './geometry.js';
import { startRudolphWeapon,tickRudolphWeapon } from './rudolph-weapon.js';

function pushTarget(g,t,dx,dy,options={}){const length=Math.hypot(dx,dy);return g.startMotion(t,{x:dx/(length||1),y:dy/(length||1)},length,{kind:'knock',...options});}

export const EXPERIMENTAL_KEYS=['moses','ezra'];
export const DRAG_KEYS=['moses','ezra'];
export const EZRA_WEAPONS=[
 {name:'알라스 장갑',ammo:1,reload:3,range:2.2,damage:280},
 {name:'네스터 망치',ammo:3,reload:2,range:2.8,damage:240},
 {name:'드릴 망치',ammo:2,reload:3,range:3.2,damage:100},
 {name:'나미르 건틀릿',ammo:1,reload:1,range:2.5,damage:230},
];
export function dragChoice(key,dx,dy,min=18){
 if(Math.hypot(dx,dy)<min)return null;
 if(key==='ezra')return Math.abs(dx)>=min?(dx<0?'left':'right'):null;
 return Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
}
export function area(g,e,p,r,damage,hit=()=>{},options={}){
 const hits=[];
 for(const t of [...g.units])if(g.hostile(e,t)&&distance(p,t)<=r+t.radius&&(options.ignoreWalls||g.clearLine(p,t))){
  if(typeof damage==='function'||damage>0)g.deal(e,t,typeof damage==='function'?damage(t):damage,options);
  hit(t);hits.push(t);
 }
 return hits;
}
export const dashBasic=(g,e)=>['don','myo','starbuck'].includes(e.key)||e.key==='gregor'&&g.buff(e,'mutant')||e.key==='ezra'&&(g.buff(e,'ezraUlt')||[0,3].includes(e.state.weapon||0));
export const dashLength=(e,n)=>n+(has(e,'range7')?1:0);
export function dash(g,e,d,len,damage=0,hit=()=>{},options={}){
 const hitIds=new Set();
 return g.startMotion(e,d,len,{phaseEnemies:typeof damage==='function'||damage>0||Boolean(options.offensive),...options,onComplete:result=>options.onComplete?.({...result,hitIds}),onStep:(from,to)=>{
  if(typeof damage==='function'||damage>0)for(const t of [...g.units])if(g.hostile(e,t)&&!hitIds.has(t.id)&&segmentDistance(t,from,to)<t.radius+(options.hitWidth??.6)*(e.actionKind==='basic'?1.2:1)&&g.clearLine(e,t)){hitIds.add(t.id);const shield=g.shield(t),actual=g.deal(e,t,typeof damage==='function'?damage(t):damage);hit(t,actual,Math.max(0,shield-g.shield(t)));}
  g.effects.push({type:options.swordTrail?'ryoshuTrail':'line',...from,to,theme:e.key,color:CHAMPIONS[e.key].color,life:.18,maxLife:.18});
 }});
}
export const heathCharge=Reworks.heathCharge;
export const releaseHeath=Reworks.releaseHeath;
export function skillCharges(g,e,slot){
 if(slot!=='q')return null;
 const s=e.state||{},values=e.key==='nelly'?[s.knifeCharges??2,2,s.knifeReady]:e.key==='ryoshu'?[s.ryoshuCharges??2,2,s.ryoshuReady]:e.key==='sora'&&Sora.ego(g,e)?[s.egoQCharges??2,2,s.egoQReady]:null;
 if(!values)return null;const [current,max,ready]=values;return {current,max,remaining:current<max&&Number.isFinite(ready)?Math.max(0,ready-g.time):0};
}
export const cancelHeath=Reworks.cancelHeath;
export function targetAt(g,e,p,r,team=1-e.team,eligible=()=>true){
 return g.champions(team).filter(t=>t.alive&&!g.hidden(t)&&eligible(t)&&g.visibleTo(e.team,t)&&distance(e,t)<=r+t.radius&&distance(p,t)<2&&g.clearLine(e,t)).sort((a,b)=>distance(p,a)-distance(p,b))[0];
}
function guboTarget(g,e,p,allyOnly=false){
 const ally=targetAt(g,e,p,12,e.team,t=>g.canGuboHitAlly(e,t));if(allyOnly)return ally;
 return [ally,targetAt(g,e,p,12)].filter(Boolean).sort((a,b)=>distance(p,a)-distance(p,b))[0];
}
export function isOffensive(e,slot){return !((e.key==='yi'&&slot==='r')||(e.key==='meursault'&&slot==='q')||(['honglu','rudolph','moses','ezra','gubo','rodya'].includes(e.key)&&slot==='q'));}
export function canRecast(g,e,slot){
 if(e.key==='honglu'&&slot==='q'&&e.state.insightUntil>g.time)return true;
 if(e.key==='honglu'&&slot==='r'&&g.zones.some(z=>z.kind==='waterfall'&&z.source===e&&z.until>g.time))return true;

 if(slot==='r'&&(Sora.ready(g,e)||Yan.ready(g,e)))return true;
 if(V12.recast(g,e,slot))return true;
 if(New.recast(g,e,slot))return true;
 return slot==='q'&&((e.key==='ishmael'&&g.buff(e,'ishmaelShield'))||(e.key==='alisa'&&g.buff(e,'alisaReload')))||slot==='r'&&e.key==='ezra'&&g.buff(e,'ezraUlt');
}
export function init(g,e){if(e.key==='ryoshu'){e.state.ryoshuCharges=2;e.state.ryoshuReady=Infinity;}New.init(g,e);V06.init(g,e);V08.init(g,e);Sora.init(g,e);Yan.init(g,e);}
export function onRespawn(g,e){if(e.key==='ryoshu'){e.state.ryoshuCharges=2;e.state.ryoshuReady=Infinity;}New.onRespawn(g,e);Sora.onRespawn(g,e);Yan.init(g,e);}
export const coverMultiplier=New.coverMultiplier;
export const guardAlly=New.guardAlly;
export const transfer=New.transfer;
export const receivedMultiplier=New.receivedMultiplier;
export function validateSkill(g,e,slot,p,options={}){
 if(e.state.donCharge)return false;if(e.key==='ryoshu'&&slot==='q'&&(e.state.ryoshuCharges??2)<=0)return false;
 if(!Hohenheim.validate(g,e,slot,p)||!Sora.validate(g,e,slot,p)||!Yan.validate(g,e,slot))return false;
 if(!V12.validate(g,e,slot,p))return false;
 if(!V10.validate(g,e,slot,p))return false;
 if(!V08.validate(g,e,slot,p))return false;
 if(!New.validate(g,e,slot,p)||!V06.validate(g,e,slot,p))return false;
 if(g.stat(e,'root')&&(['outis','sinclair'].includes(e.key)||e.key==='don'&&slot==='r'||(['ryoshu','heathcliff'].includes(e.key)||e.key==='alisa'&&!g.buff(e,'alisaReload'))&&slot==='q'))return false;
 if(e.key==='rudolph'&&slot==='r')return e.ammo>=ammoCap(g,e)*.5&&(g.training?!g.blocked(p.x,p.y,.05):terrainContains(p.x,p.y));
 if(e.key==='moses'&&slot==='q')return ['up','down','left','right'].includes(options.direction);
 if(e.key==='ezra'&&slot==='q')return ['left','right'].includes(options.direction)&&!g.buff(e,'ezraUlt');
 if(e.key==='alisa'&&slot==='r')return e.state.heat>=5;
 if(e.key==='gubo'&&slot==='r'){
  return Boolean(guboTarget(g,e,p,options.executeAlly));
 }
 return true;
}
export function ammoCap(g,e){
 const extra=(has(e,'magazine2')?2:0)+(e.key==='faust'&&e.level===RULES.maxLevel?1:0)+(e.key==='myo'&&g.buff(e,'rabbitFrenzy')?2:0);
 if(e.key==='ezra')return (g.buff(e,'ezraUlt')?4:EZRA_WEAPONS[e.state.weapon||0].ammo)+extra;
 return CHAMPIONS[e.key].ammo+extra*(e.key==='rudolph'?15:1);
}
export function reloadGrade(e){return e.key==='ezra'?EZRA_WEAPONS[e.state.weapon||0].reload:CHAMPIONS[e.key].reload;}
export function switchWeapon(g,e,step,shield=false){
 e.state.weapon=((e.state.weapon||0)+step+4)%4;e.ammo=ammoCap(g,e);e.range=EZRA_WEAPONS[e.state.weapon].range;e.reloadProgress=0;
 if(shield)g.addShield(e,Math.min(360,120*(1+Math.floor((1-e.hp/e.maxHp)/.3)*.3)),`bag-${e.id}`);
}
export function beforeBasic(g,e,point,options={}){
 if(e.key==='starbuck'&&(g.stat(e,'root')||g.stat(e,'captured')))return false;
 if(g.stat(e,'captured')&&(['don','rodya','myo'].includes(e.key)||e.key==='ezra'))return false;
 if(!V12.beforeBasic(g,e,point)||!V06.beforeBasic(g,e,point,options))return false;
 if(g.stat(e,'root')&&(['don','rodya'].includes(e.key)||e.key==='ezra'&&(g.buff(e,'ezraUlt')||[0,3].includes(e.state.weapon||0))))return false;
 if(e.key==='rudolph'){if(e.state.exhaustedUntil>g.time)return false;if(g.time-e.lastAttackAt>.5)e.state.whipChainAt=undefined;if(e.state.whipChainAt!==undefined&&g.time-e.state.whipChainAt>=3)return false;}
 if(e.key==='ezra'&&e.ammo<1&&!g.buff(e,'ezraUlt')){switchWeapon(g,e,1,true);e.attackCd=.2;return false;}
 return true;
}
export function basic(g,e,p,d,options={}){
 if(Sora.basic(g,e,p,d)||V12.basic(g,e,p,d,options)||V10.basic(g,e,p,d,options)||V08.basic(g,e,p,d,options)||New.basic(g,e,p,d,options)||V06.basic(g,e,p,d,options))return true;
 const cone=(r,a,v,h)=>g.cone(e,d,r,a,v,h);
 switch(e.key){
 case 'don':dash(g,e,d,dashLength(e,2),230,()=>{},{hitWidth:.72});return true;
 case 'ryoshu':cone(g.attackRange(e),Math.PI,220);return true;
 case 'honglu':area(g,e,e,g.attackRange(e),190);g.effects.push({type:'hongluSweep',x:e.x,y:e.y,r:g.attackRange(e),life:.4,maxLife:.4});return true;
 case 'heathcliff':cone(g.attackRange(e),1.7,200);return true;
 case 'ishmael':cone(g.attackRange(e),1.6,220,t=>{if(t.kind==='champion'&&t.alive&&!(t.invulnerableUntil>g.time)&&!(t.ccImmuneUntil>g.time)&&!g.debuffImmune(t)&&!(g.training&&t===g.player&&g.practice.invincible)){t.state.ishmaelWeak??={};const prior=t.state.ishmaelWeak[e.id],old=prior?.until>g.time?prior.stacks:0;t.state.ishmaelWeak[e.id]={stacks:Math.min(2,old+1),until:g.time+1.5};if(old<2)g.triggerDisrupt(e,t);}});return true;
 case 'rodya':g.bullet(e,d,220,g.attackRange(e),{swordWave:true,pierce:Infinity,speed:13,width:.75,onHit:t=>{g.status(t,'slow',.03,2.2,e);g.status(t,'weak',.035,2.2,e);}});return true;
 case 'outis':g.bullet(e,d,215,g.attackRange(e),{width:.16});return true;
 case 'gregor':if(g.buff(e,'mutant'))dash(g,e,d,dashLength(e,2.5),210,()=>{},{hitWidth:1.08,onComplete:({hitIds})=>g.cone(e,d,g.attackRange(e),1.8*1.3*1.2,210,()=>{},{exclude:hitIds})});else cone(g.attackRange(e),1.8,210);return true;
 case 'gubo':{
  const base=240*(g.buff(e,'guboReload')?1.2:1);let count=0;g.bullet(e,d,base,g.attackRange(e),{guboEmpowered:g.buff(e,'guboReload'),pierce:Infinity,ignoreTerrain:true,allowFriendly:true,beforeHit:(t,b)=>b.damage=base*(t.team===e.team?1:1-Math.min(.65,count*.15)),onHit:t=>{if(t.team!==e.team)count++;}});
  return true;
 }
 case 'alisa':e.state.heat=Math.min(5,(e.state.heat||0)+1);cone(g.attackRange(e),1.1,100*(1+.1*e.state.heat),t=>applyBurn(g,e,t));return true;
 case 'rudolph':
  // 3 hits/s and 10 SP/s; top up basic's 1 SP charge to 10/3 per tick.
  startRudolphWeapon(g,e);
  e.state.whipChainAt??=g.time;e.ammo=Math.max(0,e.ammo-(10/3-1));const len=Math.min(g.attackRange(e),distance(e,p)),whipPoint={x:e.x+d.x*len,y:e.y+d.y*len};g.effects.push({type:'whipArc',source:e.id,x:e.x,y:e.y,to:whipPoint,theme:'rudolph',color:'#ffad58',life:.2,maxLife:.2},{type:'ring',...whipPoint,r:2.1675,color:'#ed883d',life:.2,maxLife:.2});g.effects.push({type:'rudolphField',source:e.id,theme:'rudolph',...whipPoint,r:2.1675,life:.3,maxLife:.3});area(g,e,whipPoint,2.1675,t=>{decayMentalWhip(g,t);return 57*(1+.15*(t.state?.mentalWhip?.[e.id]?.stage||0));},t=>mentalWhip(g,e,t));return true;
 case 'moses':{
  const color=e.state.smoke;e.state.smoke=null;cone(g.attackRange(e),1.1,180,t=>{if(color==='down')g.status(t,'stun',1,.7,e);if(color==='left'){g.status(t,'slow',.2,3,e);g.status(t,'vulnerable',.12,3,e);}});
  if(['up','right'].includes(color))for(const a of g.champions(e.team).filter(a=>a.alive&&distance(a,e)<=5)){const toward=direction(e,a);if(toward.x*d.x+toward.y*d.y<.4&&a!==e)continue;if(color==='up')g.addBuff(a,'mosesWhite',4);else {g.addShield(a,200,`smoke-${e.id}`);g.addBuff(a,'mosesHeal',2);}g.support(e);}
  return true;
 }
 case 'ezra':{
  if(g.buff(e,'ezraUlt')){e.state.ultAttacks=(e.state.ultAttacks||0)+1;const fourth=e.state.ultAttacks===4;dash(g,e,d,1.2,0,()=>{},{offensive:true,onComplete:()=>{area(g,e,e,fourth?3:2.2,fourth?320:250,t=>{g.status(t,'slow',.2,1.2,e);g.status(t,fourth?'stun':'root',1,fourth?.8:.6,e);});if(e.ammo<1)endEzra(g,e);}});return true;}
  const w=e.state.weapon||0;
  if(w===0)dash(g,e,d,g.attackRange(e),280);
  if(w===1)cone(g.attackRange(e),1.7,240,t=>g.status(t,'slow',.2,1.2,e));
  if(w===2)for(let i=0;i<3;i++)g.schedule(e,i*.12,()=>g.cone(e,d,g.attackRange(e),.7,100,t=>{if(g.stat(t,'root')||g.stat(t,'stun'))g.deal(e,t,35);}));
  if(w===3)dash(g,e,d,g.attackRange(e),0,()=>{},{offensive:true,onComplete:()=>area(g,e,e,2.5,230,t=>{const toward=direction(t,e);pushTarget(g,t,toward.x,toward.y);g.status(t,'slow',.2,1.5,e);})});
  return true;
 }
 default:return false;
 }
}
export function mentalWhip(g,e,t){
 if(t.kind!=='champion'||!t.alive||g.debuffImmune?.(t))return;
 t.state.mentalWhip??={};const mark=t.state.mentalWhip[e.id]??={hits:0,stage:0,at:-99};
 decayMentalWhip(g,t);if(g.time-mark.at>.5)mark.hits=0;mark.at=g.time;mark.decayAt=g.time+2;
 if(++mark.hits>=5){mark.hits=0;mark.stage=Math.min(3,mark.stage+1);}
}
function shockIshmael(g,e){
 delete e.buffs.ishmaelShield;e.state.shockAt=0;area(g,e,e,4.5,200,t=>{g.status(t,'stun',1,.8,e);if(t.kind==='champion')e.rCd=Math.max(0,e.rCd-5);});g.effects.push({type:'ishmaelShock',source:e.id,x:e.x,y:e.y,r:4.5,theme:e.key,life:.6,maxLife:.6});
}
function endEzra(g,e){e.state.ultMode=false;delete e.buffs.ezraUlt;e.state.ultAttacks=0;e.ammo=ammoCap(g,e);e.range=EZRA_WEAPONS[e.state.weapon||0].range;e.reloadProgress=0;}
export function cast(g,e,slot,p,d,options={}){
 const state=e.state;
 if(e.key==='faust')return Reworks.faust(g,e,slot,p,d);
 if(Yan.cast(g,e,slot,p,d)||Sora.cast(g,e,slot,p,d)||V12.cast(g,e,slot,p,d,options)||V10.cast(g,e,slot,p,d,options)||V08.cast(g,e,slot,p,d,options)||New.cast(g,e,slot,p,d,options)||V06.cast(g,e,slot,p,d,options))return true;
 switch(e.key){
 case 'don':
  if(slot==='q')Don.start(g,e,p);
  else{g.addBuff(e,'donLifesteal',7);dash(g,e,d,Math.min(6.5,distance(e,p)),300,(t,actual)=>g.heal(e,e,actual*.4,false));}
  return true;
 case 'ryoshu':
  if(slot==='q'){e.state.ryoshuCharges=(e.state.ryoshuCharges??2)-1;if(!Number.isFinite(e.state.ryoshuReady))e.state.ryoshuReady=g.time+g.cooldown(e,'q');e.qCd=e.state.ryoshuCharges>0?0:e.state.ryoshuReady-g.time;const len=3.8;e.invulnerableUntil=g.time+len/RULES.dashSpeed;dash(g,e,d,len,160,(t,actual,absorbed)=>{if(actual+absorbed>0)e.ammo=Math.min(ammoCap(g,e),e.ammo+1);},{swordTrail:true,onComplete:()=>e.invulnerableUntil=0});}
  else{
   const len=Math.min(7,distance(e,p)),rawDest={x:clamp(e.x+d.x*len,g.bounds.x+.6,g.bounds.x+g.bounds.w-.6),y:clamp(e.y+d.y*len,g.bounds.y+.6,g.bounds.y+g.bounds.h-.6)};
   const dest=trapPoint(g,e,rawDest);if(!g.blocked(dest.x,dest.y,e.radius)){e.x=dest.x;e.y=dest.y;}
   g.effects.push({type:'ryoshuStorm',source:e.id,x:e.x,y:e.y,r:2.6,theme:e.key,life:.7,maxLife:.7});for(let i=0;i<4;i++)g.schedule(e,i*.12,()=>area(g,e,e,2.6,140,t=>g.status(t,'vulnerable',.2,5,e)));
   e.ammo=ammoCap(g,e);
  }return true;
 case 'honglu':return Reworks.honglu(g,e,slot,p,d);
 case 'heathcliff':
  if(slot==='q'){if(state.chargeAt!==undefined)return false;state.chargeAt=g.time;state.chargeAim={...p};e.qCd=0;}else{state.heathExtensions=0;g.addBuff(e,'heathUlt',5);state.auraTick=g.time+.3;}return true;
 case 'ishmael':
  if(slot==='q'){if(g.buff(e,'ishmaelShield'))shockIshmael(g,e);else {g.addShield(e,e.maxHp*.12,`wreck-${e.id}`,2.5);g.addBuff(e,'ishmaelShield',2.5);state.shockAt=g.time+2.5;}}
  else{
   Reworks.ishmael(g,e,d);
  }return true;
 case 'rodya':
  if(slot==='q'){
   const headsChance=.5+Math.floor(e.level/5)*.1;state.coinChance=headsChance;const coins=[0,0,0].map(()=>g.random()<headsChance),heads=coins.filter(Boolean).length,tails=heads===3?3:3-heads;state.jackpot=heads===3;if(state.jackpot){e.ammo=ammoCap(g,e);e.gold+=100;}state.coinHeads=heads;state.coinTails=tails;state.coinResults=coins;state.coinAt=g.time;
   if(heads)g.addBuff(e,'coins',4);if(tails)g.addBuff(e,'coinSpeed',3);e.rCd=Math.max(0,e.rCd-heads*2);e.qCd=Math.max(1,e.qCd-tails*2);
  }else{const ice=p=>g.zones.push({kind:'ice',source:e,...p,r:4.725,until:g.time+3.5,nextTick:g.time,tickEvery:.5,damage:50,slow:.5,reloadWeak:.5,weak:.5,firstDebuffOnly:true,debuffDuration:1.3,championsOnly:true});g.bullet(e,d,360,8,{width:.36,visualScale:1.2,onHit:(t,b)=>{if(b.lastHpRatio>=.5)g.deal(e,t,108);g.status(t,'stun',1,1,e);ice({x:t.x,y:t.y});},onEnd:ice});}
  return true;
 case 'outis':
  if(slot==='q')dash(g,e,d,3,0,()=>{},{offensive:true,onComplete:()=>{e.state.outisSpinAt=g.time;e.state.outisSpinFacing=Math.atan2(d.y,d.x);g.effects.push({type:'outisSpin',source:e.id,theme:'outis',slot:'q',x:e.x,y:e.y,r:2.5,shape:{kind:'circle',range:2.5},life:.4,maxLife:.4});let hit=false;area(g,e,e,2.5,180,t=>{g.status(t,'slow',.2,1.5,e);if(t.kind==='champion')hit=true;});if(hit)e.ammo=Math.min(ammoCap(g,e),e.ammo+1);}});
  else return Reworks.outis(g,e,d);
  return true;
 case 'gregor':return Gregor.cast(g,e,slot,d,()=>gregorStack(g,e,2));
 case 'rudolph':
  if(slot==='q'){const spend=Math.min(e.hp-1,e.hp*.1);e.hp-=spend;e.ammo=Math.min(ammoCap(g,e),e.ammo+35);g.addShield(e,spend,`focus-${e.id}`);}
  else{const spent=e.ammo;e.ammo=0;state.recoveryDuration=1.25;e.channelUntil=g.time+1.25;g.pending.push({type:'global',source:e,x:p.x,y:p.y,r:5.25,at:g.time+1.25,damage:8.5*spent,ignoreWalls:true,onHit:t=>{if(t.kind==='champion'&&!g.debuffImmune?.(t)){t.state.mentalWhip??={};t.state.mentalWhip[e.id]={hits:0,stage:3,at:g.time,decayAt:g.time+2};}g.status(t,'slow',.3,1.5,e);}});}
  return true;
 case 'moses':
  if(slot==='q'){state.smoke=options.direction;if(state.smoke==='down')e.hp=Math.max(1,e.hp*.94);}
  else g.bullet(e,d,550,9,{width:.6,onHit:t=>{g.status(t,'stun',1,.75,e);g.status(t,'vulnerable',.18,3,e);}});
  return true;
 case 'ezra':
  if(slot==='q')switchWeapon(g,e,options.direction==='left'?-1:1);
  else if(g.buff(e,'ezraUlt'))endEzra(g,e);else {g.addBuff(e,'ezraUlt',6);state.ultMode=true;state.ultAttacks=0;e.ammo=ammoCap(g,e);}
  return true;
 case 'alisa':
  if(slot==='q'){if(g.buff(e,'alisaReload'))endAlisaReload(g,e);else dash(g,e,d,3,0,()=>{},{onComplete:()=>{state.heat=Math.min(5,(state.heat||0)+3);state.alisaReloadActive=true;g.addBuff(e,'alisaReload',5,{copy:false});}});}
  else{state.blastArmed=true;state.alisaUltimateChannel=true;e.ccImmuneUntil=Infinity;e.channelUntil=g.time+.8;g.schedule(e,.8,()=>{delete state.alisaUltimateChannel;state.heat=0;const aim=e.player?g.aim(e,g.input.aim):d;const finish=()=>beginAlisaDetonation(g,e,e);if(!dash(g,e,aim,2.5,0,()=>{},{offensive:true,onComplete:finish}))finish();});}
  return true;
 case 'gubo':
  if(slot==='q'){state.guboReloadAt=g.time;g.addBuff(e,'guboReload',4);}
  else {const t=guboTarget(g,e,p,options.executeAlly);if(t)return GuboUltimate.start(g,e,t);}
  return true;
 default:return false;
 }
}
export function damageBonus(g,e,t){
 if(!e.key)return 1;
 let b=1;
 if(e.key==='outis'&&distance(e,t)<=2.5)b*=1.25;
 if(e.key==='sora'&&e.actionKind==='basic'&&!Sora.ego(g,e)&&Sora.marked(g,e,t))b*=1.1;
 if(e.key==='heathcliff'&&t.hp/t.maxHp>e.hp/e.maxHp)b*=1.15;
 if(g.buff(e,'mutant'))b*=1.2;
 if(g.buff(e,'power'))b*=1+g.buffValue(e,'power',.12);

 return b;
}
export function afterDamage(g,e,t,actual,proc=true,kind,absorbed=0){
 Yan.afterDamage(g,e,t,actual,proc,absorbed);Sora.afterDamage(g,e,t,actual,absorbed);V12.afterDamage(g,e,t,actual,proc,kind,absorbed);
 New.afterDamage(g,e,t,actual,proc,kind);
 if(!proc)return;
 if(e.kind==='champion'){
  if(g.buff(e,'donLifesteal'))g.heal(e,e,g.buffValue(e,'donLifesteal',actual*.25),false);
  if(g.buff(e,'heathUlt'))g.heal(e,e,actual*.2,false);
  if(e.key==='gregor')gregorStack(g,e);
  if(e.key==='don'&&t.kind==='champion'&&t.hp>0&&e.state.villain===t.id&&(e.state.villainHits?.[t.id]||0)<=g.time){e.state.villainHits??={};e.state.villainHits[t.id]=g.time+6;g.deal(e,t,60,{fixed:true,proc:false});g.status(t,'root',1,.75,e);}
 }
 if(t.kind==='champion'){
  if(t.key==='gregor'&&(t.state.receivedStackAt||0)<=g.time){t.state.receivedStackAt=g.time+.3;gregorStack(g,t);}
  if(t.key==='ishmael'&&t.alive&&t.hp/t.maxHp<.3&&t.passiveReady<=g.time){t.passiveReady=g.time+70;g.addShield(t,t.maxHp*.25,`survive-${t.id}`);g.addBuff(t,'ishmaelSurvive',3);}
 }
}
export function gregorStack(g,e,n=1){
 if(!e.alive||g.buff(e,'mutant')||(e.state.mutateReady||0)>g.time)return;
 e.state.mutations=(e.state.mutations||0)+n;
 if(e.state.mutations>=12){e.state.mutations=0;e.state.mutateReady=g.time+30;e.state.transformed=true;e.state.mutantExtension=0;e.ammo=Math.min(ammoCap(g,e),e.ammo+2);e.qCd=0;const hp=e.maxHp;g.addBuff(e,'mutant',5);e.maxHp=g.maxHp(e);e.hp+=e.maxHp-hp;e.radius=.48*1.15;e.state.mutantTick=g.time+.5;}
}
export function takedown(g,e,victim,direct){
 if(!e||e.kind!=='champion')return;
 if(e.key==='starbuck'&&victim.kind==='neutral'&&direct)g.heal(e,e,150,false);
 V06.takedown(g,e,victim,direct);

 if(e.key==='gubo'&&victim.kind==='champion')e.qCd=0;
 if(e.key==='heathcliff'&&victim.kind==='champion'&&g.buff(e,'heathUlt')&&(e.state.heathExtensions||0)<4){e.state.heathExtensions++;e.buffs.heathUlt+=1+(direct?.5:0);}
}
export function guboBlast(g,e,victim,ratio=e.state.guboLaserFiring?.25:.2){
 const enemies=g.units.filter(t=>t.team===1-e.team&&t.alive),enemy=enemies.slice().sort((a,b)=>distance(a,victim)-distance(b,victim))[0];if(!enemy)return;
 const d=direction(victim,enemy);for(const t of enemies.filter(t=>distance(t,victim)<=14.7+t.radius)){const td=direction(victim,t);if(td.x*d.x+td.y*d.y>.4)g.deal(e,t,ratio*(g.combatPower(e)+t.maxHp),{fixed:true,proc:false});}
 g.effects.push({type:'guboBlast',source:e.id,x:victim.x,y:victim.y,r:14.7,angle:Math.atan2(d.y,d.x),spread:Math.acos(.4)*2,theme:'gubo',life:.8,maxLife:.8});
}
export function endAlisaReload(g,e){if(!e.state.alisaReloadActive)return;const heat=e.state.heat||0;delete e.buffs.alisaReload;delete e.state.alisaReloadActive;e.state.heat=0;g.heal(e,e,e.maxHp*(.05+.035*heat),false);}
export function beginAlisaDetonation(g,e,killer,{lethal=false}={}){
 if(e.state.detonating)return false;
 if(lethal)e.hp=1;e.state.detonating=true;e.state.detonationAt=g.time;e.state.detonatesAt=g.time+2;e.invulnerableUntil=g.time+2;e.phaseEnemiesUntil=g.time+2;
 g.schedule(e,2,()=>{area(g,e,e,4,600,t=>{if(t.alive)applyBurn(g,e,t,true);});g.effects.push({type:'burst',x:e.x,y:e.y,r:4,theme:e.key,life:.7,maxLife:.7});const armed=e.state.blastArmed;g.kill(e,killer);if(armed){e.respawnAt=g.time+3;e.state.fastReturn=true;}});
 return true;
}
export function interceptDeath(g,e,killer){
 if(V08.interceptDeath(g,e,killer))return true;
 if(e.key!=='alisa'||e.state.detonating||(!(e.state.heat>=5)&&!e.state.blastArmed))return false;
 return beginAlisaDetonation(g,e,killer,{lethal:true});
}
export function decayMentalWhip(g,t){for(const mark of Object.values(t.state?.mentalWhip||{})){if(mark.stage>0){mark.decayAt??=mark.at+2;while(mark.stage>0&&g.time+1e-8>=mark.decayAt){mark.stage--;mark.decayAt+=2;}}}}
export function tick(g,e,dt){
 const s=e.state;
 if(s.ishmaelWeak)for(const [id,mark]of Object.entries(s.ishmaelWeak))if(mark.until<=g.time)delete s.ishmaelWeak[id];
 if(e.key==='ryoshu'){s.ryoshuCharges??=2;s.ryoshuReady??=Infinity;while(s.ryoshuCharges<2&&g.time+1e-8>=s.ryoshuReady){s.ryoshuCharges++;s.ryoshuReady=s.ryoshuCharges<2?s.ryoshuReady+g.cooldown(e,'q'):Infinity;}e.qCd=s.ryoshuCharges>0?0:Math.max(0,s.ryoshuReady-g.time);}
 decayMentalWhip(g,e);New.tick(g,e,dt);V06.tick(g,e,dt);V12.tick(g,e,dt);Sora.tick(g,e);Yan.tick(g,e,dt);Hohenheim.tick(g,e,dt);Reworks.tick(g,e);
 Don.tick(g,e);

 if(e.key==='alisa'){
  if(s.alisaReloadActive&&!g.buff(e,'alisaReload'))endAlisaReload(g,e);
  if(g.canNaturalHeal(e)){s.heat=0;}else if(s.heat>0)g.selfDamage(e,e.maxHp*.0013*s.heat*dt,{nonLethal:true,ignoreRegen:true});
 }
 if(e.key==='don'&&(s.villainAt||0)<=g.time){s.villainAt=g.time+6;const enemies=g.champions(1-e.team).filter(t=>t.alive&&distance(e,t)<=7);enemies.sort((a,b)=>(b.lastChampionKill||-99)-(a.lastChampionKill||-99)||distance(e,a)-distance(e,b));s.villain=enemies[0]?.id;}
 if(e.key==='heathcliff'){

  while(g.buff(e,'heathUlt')&&s.auraTick<=g.time+1e-8){s.auraTick+=.3;area(g,e,e,5.5,65);}
 }
 if(e.key==='ishmael'&&s.shockAt>0&&s.shockAt<=g.time)shockIshmael(g,e);
 if(e.key==='gregor'){
  if(s.transformed&&!g.buff(e,'mutant')){s.transformed=false;e.maxHp=g.maxHp(e);e.hp=Math.min(e.hp,e.maxHp);e.radius=.48;}
  if(g.buff(e,'mutant')&&s.mutantTick<=g.time){s.mutantTick+=.5;let dealt=0;area(g,e,e,5.5,0,t=>{const actual=g.deal(e,t,35,{proc:false});dealt+=actual;if(actual>0){Infestation.apply(g,t,e);if(t.kind==='champion'&&(s.mutantExtension||0)<15){s.mutantExtension=(s.mutantExtension||0)+1;e.buffs.mutant+=1;}}});g.heal(e,e,dealt*.35,false);}
 }
 if(e.key==='ezra'&&s.ultMode&&!g.buff(e,'ezraUlt'))endEzra(g,e);
 if(e.key==='rudolph'){
  tickRudolphWeapon(g,e);
  if(s.exhaustedUntil){if(s.exhaustedUntil>g.time)return;delete s.exhaustedUntil;delete s.exhaustedAt;delete s.recoveryDuration;e.ammo=ammoCap(g,e);return;}
  if(e.ammo<=0){const duration=s.recoveryDuration||2.5;s.exhaustedAt=g.time;s.recoveryDuration=duration;s.exhaustedUntil=g.time+duration;g.status(e,'silence',1,duration);g.status(e,'disarm',1,duration);return;}
  if(g.reloadRate(e)>0&&(g.time-e.lastAttackAt>.4||has(e,'wisdom')||has(e,'reloadStacks')&&e.state.augReloadStacks>=5))e.ammo=Math.min(ammoCap(g,e),e.ammo+18*RULES.reload[reloadGrade(e)]/g.reloadInterval(e)*dt*g.reloadRate(e));
 }

}

export function applyBurn(g,source,target,explosion=false){
 if(!target.alive||target.hp<=0||target.returning||g.debuffImmune?.(target))return;
 if(target.burn?.explosion&&!explosion&&target.burn.until>g.time)return;
 const interval=explosion?.3:.5;target.burn={source,explosion,until:g.time+(explosion?3:2),next:g.time+interval,interval,damage:explosion?15+Math.max(0,source.hp)*.02:12+Math.max(0,source.hp)*.015};g.triggerDisrupt(source,target);
}
export function tickBurn(g,e){
 const b=e.burn;if(!b)return;if(!e.alive||e.returning){delete e.burn;return;}
 while(e.alive&&b.next<=Math.min(g.time,b.until)+1e-8){b.next+=b.interval;g.deal(b.source,e,b.damage,{fixed:true,proc:false});}
 if(!e.alive||b.next>b.until+1e-8)delete e.burn;
}
