import * as V08 from './v08-champions.js';
import * as V06 from './v06-champions.js';
import * as New from './new-champions.js';
import { has } from './augments.js';
import { RULES, RUNTIME_CHAMPIONS as CHAMPIONS, WORLD, terrainContains } from './data.js';
import { distance, direction, clearLine, segmentDistance, blocked, clamp } from './geometry.js';

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
 for(const t of [...g.units])if(g.hostile(e,t)&&distance(p,t)<=r+t.radius&&(options.ignoreWalls||clearLine(p,t))){
  if(typeof damage==='function'||damage>0)g.deal(e,t,typeof damage==='function'?damage(t):damage,options);
  hit(t);hits.push(t);
 }
 return hits;
}
export function dash(g,e,d,len,damage=0,hit=()=>{},options={}){
 const hitIds=new Set();
 return g.startMotion(e,d,len,{...options,onStep:(from,to)=>{
  if(typeof damage==='function'||damage>0)for(const t of [...g.units])if(g.hostile(e,t)&&!hitIds.has(t.id)&&segmentDistance(t,from,to)<t.radius+.6&&clearLine(e,t)){hitIds.add(t.id);g.deal(e,t,typeof damage==='function'?damage(t):damage);hit(t);}
  g.effects.push({type:'line',...from,to,theme:e.key,color:CHAMPIONS[e.key].color,life:.18,maxLife:.18});
 }});
}
export function heathCharge(g,e,point){
 const elapsed=g.time-(e.state.chargeAt??g.time),progress=clamp((elapsed-1.2)/1.2,0,1),range=5+2*progress,d=g.aim(e,point),len=Math.min(range,distance(e,point));
 let travel=0;for(let t=.1;t<=len+.1;t+=.1){const next=Math.min(t,len);if(blocked(e.x+d.x*next,e.y+d.y*next,e.radius))break;travel=next;}
 return {elapsed,progress,range,ready:elapsed>=1.2,radius:1.8,damage:180*(1+.4*progress),stun:.6+.4*progress,landing:{x:clamp(e.x+d.x*travel,WORLD.x+e.radius,WORLD.x+WORLD.w-e.radius),y:clamp(e.y+d.y*travel,WORLD.y+e.radius,WORLD.y+WORLD.h-e.radius)}};
}
export function targetAt(g,e,p,r,team=1-e.team,eligible=()=>true){
 return g.champions(team).filter(t=>t.alive&&!g.hidden(t)&&eligible(t)&&g.visibleTo(e.team,t)&&distance(e,t)<=r+t.radius&&distance(p,t)<2&&clearLine(e,t)).sort((a,b)=>distance(p,a)-distance(p,b))[0];
}
function guboTarget(g,e,p,allyOnly=false){
 const ally=targetAt(g,e,p,12,e.team,t=>g.canGuboHitAlly(e,t));if(allyOnly)return ally;
 return [ally,targetAt(g,e,p,12)].filter(Boolean).sort((a,b)=>distance(p,a)-distance(p,b))[0];
}
export function isOffensive(e,slot){return !((e.key==='yi'&&slot==='r')||(e.key==='meursault'&&slot==='q')||(['honglu','rudolph','moses','ezra','gubo','rodya'].includes(e.key)&&slot==='q'));}
export function canRecast(g,e,slot){
 if(New.recast(g,e,slot))return true;
 return slot==='q'&&((e.key==='heathcliff'&&e.state.chargeAt!==undefined)||(e.key==='ishmael'&&g.buff(e,'ishmaelShield'))||(e.key==='alisa'&&g.buff(e,'alisaReload')))||slot==='r'&&e.key==='ezra'&&g.buff(e,'ezraUlt');
}
export function init(g,e){New.init(g,e);V06.init(g,e);V08.init(g,e);}
export const receivedMultiplier=New.receivedMultiplier;
export function validateSkill(g,e,slot,p,options={}){
 if(!V08.validate(g,e,slot,p))return false;
 if(!New.validate(g,e,slot,p)||!V06.validate(g,e,slot,p))return false;
 if(g.stat(e,'root')&&(['outis','sinclair'].includes(e.key)||e.key==='don'&&slot==='r'||(['ryoshu','heathcliff'].includes(e.key)||e.key==='alisa'&&!g.buff(e,'alisaReload'))&&slot==='q'))return false;
 if(e.key==='rudolph'&&slot==='r')return e.ammo>0&&terrainContains(p.x,p.y);
 if(e.key==='moses'&&slot==='q')return ['up','down','left','right'].includes(options.direction);
 if(e.key==='ezra'&&slot==='q')return ['left','right'].includes(options.direction)&&!g.buff(e,'ezraUlt');
 if(e.key==='don'&&slot==='r')return Boolean(targetAt(g,e,p,6.5));
 if(e.key==='alisa'&&slot==='r')return e.state.heat>=5;
 if(e.key==='gubo'&&slot==='r'){
  return Boolean(guboTarget(g,e,p,options.executeAlly));
 }
 return true;
}
export function ammoCap(g,e){
 const extra=(has(e,'magazine2')?2:0)+(g.buff(e,'itemMagazine')?1:0)+(e.key==='faust'&&e.level===RULES.maxLevel?1:0)+(e.key==='myo'&&g.buff(e,'rabbitFrenzy')?2:0);
 if(e.key==='ezra')return (g.buff(e,'ezraUlt')?4:EZRA_WEAPONS[e.state.weapon||0].ammo)+extra;
 return CHAMPIONS[e.key].ammo+extra*(e.key==='rudolph'?15:1);
}
export function reloadGrade(e){return e.key==='ezra'?EZRA_WEAPONS[e.state.weapon||0].reload:CHAMPIONS[e.key].reload;}
export function switchWeapon(g,e,step,shield=false){
 e.state.weapon=((e.state.weapon||0)+step+4)%4;e.ammo=ammoCap(g,e);e.range=EZRA_WEAPONS[e.state.weapon].range;e.reloadProgress=0;
 if(shield)g.addShield(e,Math.min(360,120*(1+Math.floor((1-e.hp/e.maxHp)/.3)*.3)),`bag-${e.id}`);
}
export function beforeBasic(g,e,point,options={}){
 if(g.stat(e,'captured')&&(['don','rodya','myo'].includes(e.key)||e.key==='ezra'))return false;
 if(!V06.beforeBasic(g,e,point,options))return false;
 if(g.stat(e,'root')&&(['don','rodya'].includes(e.key)||e.key==='ezra'&&(g.buff(e,'ezraUlt')||[0,3].includes(e.state.weapon||0))))return false;
 if(e.key==='rudolph'){if(e.state.exhaustedUntil>g.time)return false;if(g.time-e.lastAttackAt>.5)e.state.whipChainAt=undefined;if(e.state.whipChainAt!==undefined&&g.time-e.state.whipChainAt>=3)return false;}
 if(e.key==='ezra'&&e.ammo<1&&!g.buff(e,'ezraUlt')){switchWeapon(g,e,1,true);e.attackCd=.2;return false;}
 return true;
}
export function basic(g,e,p,d,options={}){
 if(V08.basic(g,e,p,d,options)||New.basic(g,e,p,d,options)||V06.basic(g,e,p,d,options))return true;
 const cone=(r,a,v,h)=>g.cone(e,d,r,a,v,h);
 switch(e.key){
 case 'don':dash(g,e,d,2*g.attackRange(e)/e.range,230);return true;
 case 'ryoshu':cone(g.attackRange(e),1.7,220*(e.state.fullAmmo?1.35:1));return true;
 case 'honglu':area(g,e,e,g.attackRange(e),190);g.addBuff(e,'hongluStride',1);return true;
 case 'heathcliff':cone(g.attackRange(e),1.7,200);return true;
 case 'ishmael':cone(g.attackRange(e),1.6,220,t=>{if(t.kind==='champion'&&t.alive){t.state.ishmaelWeak??={};t.state.ishmaelWeak[e.id]=Math.min(2,(t.state.ishmaelWeak[e.id]||0)+1);}});return true;
 case 'rodya':dash(g,e,d,2.4,0,()=>{},{onComplete:()=>cone(g.attackRange(e),1.8,220,t=>{if((t.rodyaSlowUntil||0)<=g.time){g.status(t,'slow',.18,2,e);g.status(t,'weak',.1,2,e);t.rodyaSlowUntil=g.time+2.5;}})});return true;
 case 'outis':
  g.bullet(e,d,150,g.attackRange(e),{width:.16,onHit:(t,b)=>{const dist=distance(b.origin,t);const wanted=dist<2?150:dist<5?150+(dist-2)*30:dist<7?240+(dist-5)*45:330;g.deal(e,t,wanted-150);}});return true;
 case 'gregor':cone(g.attackRange(e),1.8,210);return true;
 case 'gubo':{
  g.bullet(e,d,360*(g.buff(e,'guboReload')?1.2:1),g.attackRange(e)*(g.buff(e,'guboReload')?1.2:1),{pierce:1,decay:.6,allowFriendly:true});
  return true;
 }
 case 'alisa':e.state.heat=Math.min(5,(e.state.heat||0)+1);cone(g.attackRange(e),1.1,230*(1+.1*e.state.heat),t=>{t.burn={source:e,until:g.time+2,next:g.time+.5};});return true;
 case 'rudolph':
  // 3 hits/s and 10 SP/s; top up basic's 1 SP charge to 10/3 per tick.
  e.state.whipChainAt??=g.time;e.ammo=Math.max(0,e.ammo-(10/3-1));const len=Math.min(g.attackRange(e),distance(e,p)),whipPoint={x:e.x+d.x*len,y:e.y+d.y*len};g.effects.push({type:'line',x:e.x,y:e.y,to:whipPoint,theme:'rudolph',color:'#ffad58',life:.2,maxLife:.2},{type:'ring',...whipPoint,r:3,color:'#ed883d',life:.2,maxLife:.2});area(g,e,whipPoint,3,t=>{decayMentalWhip(g,t);return 48*(1+.1*(t.state?.mentalWhip?.[e.id]?.stage||0));},t=>mentalWhip(g,e,t));return true;
 case 'moses':{
  const color=e.state.smoke;e.state.smoke=null;cone(g.attackRange(e),1.1,180,t=>{if(color==='down')g.status(t,'stun',1,.7,e);if(color==='left'){g.status(t,'slow',.2,3,e);g.status(t,'vulnerable',.12,3,e);}});
  if(['up','right'].includes(color))for(const a of g.champions(e.team).filter(a=>a.alive&&distance(a,e)<=5)){const toward=direction(e,a);if(toward.x*d.x+toward.y*d.y<.4&&a!==e)continue;if(color==='up')g.addBuff(a,'mosesWhite',4);else {g.addShield(a,200,`smoke-${e.id}`);g.addBuff(a,'mosesHeal',2);}g.support(e);}
  return true;
 }
 case 'ezra':{
  if(g.buff(e,'ezraUlt')){e.state.ultAttacks=(e.state.ultAttacks||0)+1;const fourth=e.state.ultAttacks===4;dash(g,e,d,1.2,0,()=>{},{onComplete:()=>{area(g,e,e,fourth?3:2.2,fourth?320:250,t=>{g.status(t,'slow',.2,1.2,e);g.status(t,fourth?'stun':'root',1,fourth?.8:.6,e);});if(e.ammo<1)endEzra(g,e);}});return true;}
  const w=e.state.weapon||0;
  if(w===0)dash(g,e,d,g.attackRange(e),280);
  if(w===1)cone(g.attackRange(e),1.7,240,t=>g.status(t,'slow',.2,1.2,e));
  if(w===2)for(let i=0;i<3;i++)g.schedule(e,i*.12,()=>g.cone(e,d,g.attackRange(e),.7,100,t=>{if(g.stat(t,'root')||g.stat(t,'stun'))g.deal(e,t,35);}));
  if(w===3)dash(g,e,d,g.attackRange(e),0,()=>{},{onComplete:()=>area(g,e,e,2.5,230,t=>{const toward=direction(t,e);pushTarget(g,t,toward.x,toward.y);g.status(t,'slow',.2,1.5,e);})});
  return true;
 }
 default:return false;
 }
}
export function mentalWhip(g,e,t){
 if(t.kind!=='champion'||!t.alive)return;
 t.state.mentalWhip??={};const mark=t.state.mentalWhip[e.id]??={hits:0,stage:0,at:-99};
 decayMentalWhip(g,t);if(g.time-mark.at>.5)mark.hits=0;mark.at=g.time;mark.decayAt=g.time+2;
 if(++mark.hits>=5){mark.hits=0;mark.stage=Math.min(3,mark.stage+1);}
}
function shockIshmael(g,e){
 delete e.buffs.ishmaelShield;e.state.shockAt=0;area(g,e,e,4.5,200,t=>{g.status(t,'stun',1,.8,e);if(t.kind==='champion')e.rCd=Math.max(0,e.rCd-5);});g.effects.push({type:'burst',x:e.x,y:e.y,r:4.5,theme:e.key,life:.6,maxLife:.6});
}
function endEzra(g,e){e.state.ultMode=false;delete e.buffs.ezraUlt;e.state.ultAttacks=0;e.ammo=ammoCap(g,e);e.range=EZRA_WEAPONS[e.state.weapon||0].range;e.reloadProgress=0;}
export function cast(g,e,slot,p,d,options={}){
 const state=e.state;
 if(V08.cast(g,e,slot,p,d,options)||New.cast(g,e,slot,p,d,options)||V06.cast(g,e,slot,p,d,options))return true;
 switch(e.key){
 case 'don':
  if(slot==='q'){
   state.donBarrage={d:{...d},until:g.time+2.5,next:g.time};g.addBuff(e,'donGuard',2.5);
  }else{const t=targetAt(g,e,p,6.5);dash(g,e,d,Math.max(0,distance(e,t)-1),0,()=>{},{onComplete:()=>{if(t.alive&&distance(e,t)<2&&clearLine(e,t)){g.heal(e,e,g.deal(e,t,300)*.4,false);g.addBuff(e,'donLifesteal',5);}}});}
  return true;
 case 'ryoshu':
  if(slot==='q'){const len=4*(g.buff(e,'amplify')?1.2:1);e.invulnerableUntil=g.time+len/RULES.dashSpeed;dash(g,e,d,len,180,()=>{},{onComplete:()=>e.invulnerableUntil=0});}
  else{
   const len=Math.min(7*(g.buff(e,'amplify')?1.2:1),distance(e,p)),dest={x:clamp(e.x+d.x*len,WORLD.x+.6,WORLD.x+WORLD.w-.6),y:clamp(e.y+d.y*len,WORLD.y+.6,WORLD.y+WORLD.h-.6)};
   if(!blocked(dest.x,dest.y,e.radius)){e.x=dest.x;e.y=dest.y;}
   for(let i=0;i<4;i++)g.schedule(e,i*.12,()=>area(g,e,e,2.6,140,t=>g.status(t,'armorDown',25,3,e)));
   e.ammo=ammoCap(g,e);
  }return true;
 case 'honglu':
  if(slot==='q')g.schedule(e,.6,()=>{let n=0;for(const t of g.champions(1-e.team))if(t.alive&&distance(t,p)<=6){t.revealedUntil=g.time+2;n++;}state.insightStacks=Math.min(4,n);if(n)g.addBuff(e,'insight',4);});
  else g.zones.push({kind:'waterfall',source:e,x:p.x,y:p.y,r:6.5,until:g.time+4,nextTick:g.time+.5,damage:60,heal:75*(1+.05*CHAMPIONS[e.key].power),cleanse:true,cleansed:new Set()});
  return true;
 case 'heathcliff':
  if(slot==='q'){
   if(state.chargeAt===undefined){state.chargeAt=g.time;state.chargeAim={x:p.x,y:p.y};g.status(e,'slow',.15,4);}
   else{const charge=heathCharge(g,e,p);if(!charge.ready)return true;delete state.chargeAt;delete e.status.slow;dash(g,e,d,distance(e,charge.landing),0,()=>{},{onComplete:()=>area(g,e,e,charge.radius,charge.damage,t=>g.status(t,'stun',1,charge.stun,e))});}
  }else{state.heathExtensions=0;g.addBuff(e,'heathUlt',5);state.auraTick=g.time+.5;}
  return true;
 case 'ishmael':
  if(slot==='q'){if(g.buff(e,'ishmaelShield'))shockIshmael(g,e);else {g.addShield(e,e.maxHp*.12,`wreck-${e.id}`,2.5);g.addBuff(e,'ishmaelShield',2.5);state.shockAt=g.time+2.5;}}
  else{
   g.bullet(e,d,300,16,{speed:14,width:.585,pierce:99,onHit:t=>{if(t.kind==='champion'){const toward=direction(e,t),front=e.radius+t.radius+.15,dest={x:e.x+toward.x*front,y:e.y+toward.y*front};pushTarget(g,t,dest.x-t.x,dest.y-t.y,{follow:e,stopDistance:front});g.status(t,'slow',.2,2,e);}}});
  }return true;
 case 'rodya':
  if(slot==='q'){
   const headsChance=.5+Math.floor(e.level/5)*.1;state.coinChance=headsChance;const coins=[0,0,0].map(()=>g.random()<headsChance),heads=coins.filter(Boolean).length,tails=heads===3?3:3-heads;state.jackpot=heads===3;if(state.jackpot){e.ammo=ammoCap(g,e);e.gold+=100;}state.coinHeads=heads;state.coinTails=tails;state.coinResults=coins;state.coinAt=g.time;
   if(heads)g.addBuff(e,'coins',4);if(tails)g.addBuff(e,'coinSpeed',3);e.rCd=Math.max(0,e.rCd-heads*2);e.qCd=Math.max(1,e.qCd-tails*2);
  }else{const ice=p=>g.zones.push({kind:'ice',source:e,...p,r:4.725,until:g.time+3.5,nextTick:g.time,tickEvery:.5,damage:50,slow:.3,reloadWeak:.2,weak:.3,championsOnly:true});g.bullet(e,d,360,8,{width:.36,visualScale:1.2,onHit:(t,b)=>{if(b.lastHpRatio>=.5)g.deal(e,t,108);g.status(t,'stun',1,1,e);ice({x:t.x,y:t.y});},onEnd:ice});}
  return true;
 case 'outis':
  if(slot==='q')dash(g,e,d,3,0,()=>{},{onComplete:()=>{let hit=false;area(g,e,e,2.5,180,t=>{g.status(t,'slow',.2,1.5,e);if(t.kind==='champion')hit=true;});if(hit)e.ammo=Math.min(ammoCap(g,e),e.ammo+1);}});
  else{
   const follow=(p)=>{g.effects.push({type:'cast',x:p.x,y:p.y,r:3,angle:Math.atan2(d.y,d.x),theme:e.key,slot:'r',life:.5,maxLife:.5});for(const t of [...g.units])if(g.hostile(e,t)&&distance(t,p)<=3.5&&clearLine(p,t))g.deal(e,t,250*(t.hp/t.maxHp<.5?1.3:1));};
   dash(g,e,{x:-d.x,y:-d.y},2.5,0,()=>{},{onComplete:()=>g.bullet(e,d,450,18,{width:.3,bonusLowHp:.3,onHit:(t)=>follow(t),onEnd:follow})});
  }return true;
 case 'gregor':
  if(slot==='q'){
   const end={x:e.x+d.x*5,y:e.y+d.y*5};for(const t of [...g.units])if(g.hostile(e,t)&&segmentDistance(t,e,end)<.8+t.radius&&clearLine(e,t)){
    g.deal(e,t,250);pushTarget(g,t,d.x*3,d.y*3,{onCollision:()=>{g.deal(e,t,180);g.status(t,'stun',1,1,e);}});
   }
  }else for(let i=0;i<2;i++)g.schedule(e,i*.35,()=>{g.cone(e,d,3.5,1.8,270,t=>{if(t.kind==='champion')gregorStack(g,e,2);pushTarget(g,t,d.x*1.5,d.y*1.5);});g.heal(e,e,160);});
  return true;
 case 'rudolph':
  if(slot==='q'){const spend=Math.min(e.hp-1,e.hp*.1);e.hp-=spend;e.ammo=Math.min(ammoCap(g,e),e.ammo+35);g.addShield(e,spend,`focus-${e.id}`);}
  else{const power=e.ammo/ammoCap(g,e);e.ammo=0;e.channelUntil=g.time+1.25;g.pending.push({type:'global',source:e,x:p.x,y:p.y,r:5.25,at:g.time+1.25,damage:450*power,ignoreWalls:true,onHit:t=>{if(t.kind==='champion'){t.state.mentalWhip??={};t.state.mentalWhip[e.id]={hits:0,stage:3,at:g.time,decayAt:g.time+2};}g.status(t,'slow',.3,1.5,e);}});}
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
  else{state.blastArmed=true;e.ccImmuneUntil=Infinity;e.channelUntil=g.time+.8;g.schedule(e,.8,()=>{state.heat=0;beginAlisaDetonation(g,e,e);});}
  return true;
 case 'gubo':
  if(slot==='q'){state.guboReloadAt=g.time;g.addBuff(e,'guboReload',4);}
  else {const t=guboTarget(g,e,p,options.executeAlly);if(t){e.channelUntil=g.time+1.2;state.guboAim={target:t,until:g.time+1.2};g.schedule(e,1.2,()=>{delete state.guboAim;if(!t.alive)return;g.projectiles.push({source:e,target:t,homing:true,theme:'gubo',ultimate:true,x:e.x,y:e.y,damage:500,damageKind:'skill',allowFriendly:t.team===e.team,speed:18,remaining:4,width:.25,onHit:()=>{if(!t.alive&&t.team!==e.team)guboBlast(g,e,t,.14,1100);}});});}}
  return true;
 default:return false;
 }
}
export function damageBonus(g,e,t){
 if(!e.key)return 1;
 let b=1;
 if(e.key==='heathcliff'&&t.hp/t.maxHp>e.hp/e.maxHp)b*=1.18;
 if(g.buff(e,'mutant'))b*=1.2;
 if(g.buff(e,'power'))b*=1.12;
 if(g.buff(e,'charge'))b*=1+.06*(e.state.chargeStacks||0);
 return b;
}
export function afterDamage(g,e,t,actual,proc=true,kind){
 New.afterDamage(g,e,t,actual,proc,kind);
 if(!proc)return;
 if(e.kind==='champion'){
  if(g.buff(e,'donLifesteal'))g.heal(e,e,actual*.25,false);
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
 if(e.state.mutations>=12){e.state.mutations=0;e.state.mutateReady=g.time+18;e.state.transformed=true;const hp=e.maxHp;g.addBuff(e,'mutant',5);e.maxHp=g.maxHp(e);e.hp+=e.maxHp-hp;e.radius=.48*1.15;e.state.mutantTick=g.time+.5;}
}
export function takedown(g,e,victim,direct){
 if(!e||e.kind!=='champion')return;
 V06.takedown(g,e,victim,direct);
 if(e.key==='rodya'&&victim.kind==='champion'){e.qCd=Math.max(0,e.qCd-4);e.rCd=Math.max(0,e.rCd-4);e.ammo=Math.min(ammoCap(g,e),e.ammo+1);}
 if(e.key==='outis'&&direct)e.ammo=Math.min(ammoCap(g,e),e.ammo+(victim.kind==='champion'?1.5:.25));
 if(e.key==='gubo'&&victim.kind==='champion')e.qCd=0;
 if(e.key==='heathcliff'&&victim.kind==='champion'&&g.buff(e,'heathUlt')&&(e.state.heathExtensions||0)<4){e.state.heathExtensions++;e.buffs.heathUlt+=1+(direct?.5:0);}
}
export function guboBlast(g,e,victim,ratio=.15,cap=800){
 const enemies=g.units.filter(t=>t.team===1-e.team&&t.alive),enemy=enemies.slice().sort((a,b)=>distance(a,victim)-distance(b,victim))[0];if(!enemy)return;
 const d=direction(victim,enemy);for(const t of enemies.filter(t=>distance(t,victim)<=7.5)){const td=direction(victim,t);if(td.x*d.x+td.y*d.y>.4)g.deal(e,t,Math.min(cap,t.maxHp*ratio),{fixed:true,proc:false});}
 g.effects.push({type:'slash',x:victim.x,y:victim.y,r:7.5,angle:Math.atan2(d.y,d.x),spread:Math.acos(.4)*2,theme:'gubo',life:.7,maxLife:.7});
}
export function endAlisaReload(g,e){if(!e.state.alisaReloadActive)return;const heat=e.state.heat||0;delete e.buffs.alisaReload;delete e.state.alisaReloadActive;e.state.heat=0;g.heal(e,e,e.maxHp*(.05+.035*heat),false);}
export function beginAlisaDetonation(g,e,killer,{lethal=false}={}){
 if(e.state.detonating)return false;
 if(lethal)e.hp=1;e.state.detonating=true;e.state.detonatesAt=g.time+2;e.invulnerableUntil=g.time+2;
 g.schedule(e,2,()=>{area(g,e,e,4,600,t=>{if(t.alive)t.burn={source:e,until:g.time+2,next:g.time+.5};});g.effects.push({type:'burst',x:e.x,y:e.y,r:4,theme:e.key,life:.7,maxLife:.7});const armed=e.state.blastArmed;g.kill(e,killer);if(armed){e.respawnAt=g.time+3;e.state.fastReturn=true;}});
 return true;
}
export function interceptDeath(g,e,killer){
 if(V08.interceptDeath(g,e,killer))return true;
 if(e.key!=='alisa'||e.state.detonating||(!(e.state.heat>=5)&&!e.state.blastArmed))return false;
 return beginAlisaDetonation(g,e,killer,{lethal:true});
}
export function decayMentalWhip(g,t){for(const mark of Object.values(t.state?.mentalWhip||{})){if(mark.stage>0){mark.decayAt??=mark.at+2;while(mark.stage>0&&g.time+1e-8>=mark.decayAt){mark.stage--;mark.decayAt+=2;}}}}
export function tick(g,e,dt){
 const s=e.state;decayMentalWhip(g,e);New.tick(g,e,dt);V06.tick(g,e,dt);
 if(s.donBarrage){if(s.donBarrage.until<=g.time||g.stat(e,'stun')||g.stat(e,'silence')){delete s.donBarrage;delete e.buffs.donGuard;}else if(g.time+1e-8>=s.donBarrage.next){s.donBarrage.next+=.25;g.action(e,'skill',()=>g.cone(e,s.donBarrage.d,6,1.8,45));e.lastAttackAt=g.time;}}
 if(e.burn?.until>g.time&&e.burn.next<=g.time){e.burn.next+=.5;g.deal(e.burn.source,e,27.5);if(!e.alive)return;}
 if(e.key==='alisa'){
  if(s.alisaReloadActive&&!g.buff(e,'alisaReload'))endAlisaReload(g,e);
  if(g.canNaturalHeal(e)){s.heat=0;}else if(s.heat>0)g.selfDamage(e,e.maxHp*.0013*s.heat*dt,{nonLethal:true,ignoreRegen:true});
 }
 if(e.key==='don'&&(s.villainAt||0)<=g.time){s.villainAt=g.time+6;const enemies=g.champions(1-e.team).filter(t=>t.alive&&distance(e,t)<=7);enemies.sort((a,b)=>(b.lastChampionKill||-99)-(a.lastChampionKill||-99)||distance(e,a)-distance(e,b));s.villain=enemies[0]?.id;}
 if(e.key==='heathcliff'){
  if(s.chargeAt!==undefined&&g.time-s.chargeAt>=3.4){const aim=e.player?g.input.aim:s.chargeAim;const d=g.aim(e,aim);cast(g,e,'q',aim,d);}
  if(g.buff(e,'heathUlt')&&s.auraTick<=g.time){s.auraTick+=.5;area(g,e,e,7.5,80);}
 }
 if(e.key==='ishmael'&&s.shockAt>0&&s.shockAt<=g.time)shockIshmael(g,e);
 if(e.key==='gregor'){
  if(s.transformed&&!g.buff(e,'mutant')){s.transformed=false;e.maxHp=g.maxHp(e);e.hp=Math.min(e.hp,e.maxHp);e.radius=.48;}
  if(g.buff(e,'mutant')&&s.mutantTick<=g.time){s.mutantTick+=.5;let dealt=0;area(g,e,e,3,0,t=>{dealt+=g.deal(e,t,35,{proc:false});});g.heal(e,e,dealt*.35,false);}
 }
 if(e.key==='ezra'&&s.ultMode&&!g.buff(e,'ezraUlt'))endEzra(g,e);
 if(e.key==='rudolph'){
  if(s.exhaustedUntil){if(s.exhaustedUntil>g.time)return;delete s.exhaustedUntil;e.ammo=ammoCap(g,e);return;}
  if(e.ammo<=0){s.exhaustedUntil=g.time+2.5;g.status(e,'silence',1,2.5);return;}
  if(!g.reloadPaused(e)&&g.time-e.lastAttackAt>.4)e.ammo=Math.min(ammoCap(g,e),e.ammo+18*RULES.reload[reloadGrade(e)]/g.reloadInterval(e)*dt);
 }
 if(CHAMPIONS[e.key].role==='돌격'){
  if(g.time-e.lastCombat>3){s.combatAt=undefined;s.chargeStacks=0;delete e.buffs.charge;}
  else {s.combatAt??=g.time;const stacks=Math.min(4,Math.floor((g.time-s.combatAt)/3));if(stacks!==(s.chargeStacks||0)){s.chargeStacks=stacks;if(stacks)g.addBuff(e,'charge',4);}if(stacks&&e.buffs.charge<g.time+.1)e.buffs.charge=g.time+3;}
 }
}
