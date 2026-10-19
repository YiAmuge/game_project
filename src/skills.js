import { RULES, RUNTIME_CHAMPIONS as CHAMPIONS } from './data.js';
import { distance, direction, clearLine, segmentDistance, blocked, clamp } from './geometry.js';

function pushTarget(g,t,dx,dy,options={}){const length=Math.hypot(dx,dy);return g.startMotion(t,{x:dx/(length||1),y:dy/(length||1)},length,{kind:'knock',...options});}

export const EXPERIMENTAL_KEYS=['gubo','alisa','rudolph','moses','ezra'];
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
  if(damage>0)for(const t of [...g.units])if(g.hostile(e,t)&&!hitIds.has(t.id)&&segmentDistance(t,from,to)<t.radius+.6&&clearLine(e,t)){hitIds.add(t.id);g.deal(e,t,damage);hit(t);}
  g.effects.push({type:'line',...from,to,theme:e.key,color:CHAMPIONS[e.key].color,life:.18,maxLife:.18});
 }});
}
export function heathCharge(g,e,point){
 const elapsed=g.time-(e.state.chargeAt??g.time),progress=clamp((elapsed-1.2)/1.2,0,1),range=5+2*progress,d=g.aim(e,point),len=Math.min(range,distance(e,point));
 let travel=0;for(let t=.1;t<=len+.1;t+=.1){const next=Math.min(t,len);if(blocked(e.x+d.x*next,e.y+d.y*next,e.radius))break;travel=next;}
 return {elapsed,progress,range,ready:elapsed>=1.2,radius:1.8,damage:180*(1+.4*progress),stun:.6+.4*progress,landing:{x:clamp(e.x+d.x*travel,e.radius,RULES.width-e.radius),y:clamp(e.y+d.y*travel,e.radius,RULES.height-e.radius)}};
}
export function targetAt(g,e,p,r,team=1-e.team){
 return g.champions(team).filter(t=>t.alive&&!g.hidden(t)&&g.visibleTo(e.team,t)&&distance(e,t)<=r+t.radius&&distance(p,t)<2&&clearLine(e,t)).sort((a,b)=>distance(p,a)-distance(p,b))[0];
}
export function isOffensive(e,slot){return !((e.key==='yi'&&slot==='r')||(e.key==='meursault'&&slot==='q')||(['honglu','rudolph','moses','ezra','gubo','rodya'].includes(e.key)&&slot==='q'));}
export function canRecast(g,e,slot){
 return slot==='q'&&((e.key==='heathcliff'&&e.state.chargeAt!==undefined)||(e.key==='ishmael'&&g.buff(e,'ishmaelShield'))||(e.key==='alisa'&&e.state.dashWindow>g.time&&e.state.dashUses<3))||slot==='r'&&e.key==='ezra'&&g.buff(e,'ezraUlt');
}
export function validateSkill(g,e,slot,p,options={}){
 if(g.stat(e,'root')&&(['don','outis','sinclair'].includes(e.key)||['ryoshu','heathcliff','alisa'].includes(e.key)&&slot==='q'))return false;
 if(e.key==='rudolph'&&slot==='r')return e.ammo>0&&p.x>=0&&p.x<=RULES.width&&p.y>=0&&p.y<=RULES.height;
 if(e.key==='moses'&&slot==='q')return ['up','down','left','right'].includes(options.direction);
 if(e.key==='ezra'&&slot==='q')return ['left','right'].includes(options.direction)&&!g.buff(e,'ezraUlt');
 if(e.key==='don'&&slot==='r')return Boolean(targetAt(g,e,p,6.5));
 if(e.key==='alisa'&&slot==='r')return e.state.heat>=5;
 if(e.key==='gubo'&&slot==='r'){
  const t=targetAt(g,e,p,12,options.executeAlly?e.team:1-e.team);
  return Boolean(t&&(!options.executeAlly||t!==e&&t.hp/t.maxHp<=RULES.allyExecuteThreshold));
 }
 return true;
}
export function ammoCap(g,e){
 if(e.key==='ezra')return g.buff(e,'ezraUlt')?4:EZRA_WEAPONS[e.state.weapon||0].ammo;
 return CHAMPIONS[e.key].ammo;
}
export function reloadGrade(e){return e.key==='ezra'?EZRA_WEAPONS[e.state.weapon||0].reload:CHAMPIONS[e.key].reload;}
export function switchWeapon(g,e,step,shield=false){
 e.state.weapon=((e.state.weapon||0)+step+4)%4;e.ammo=ammoCap(g,e);e.range=EZRA_WEAPONS[e.state.weapon].range;e.reloadProgress=0;
 if(shield)g.addShield(e,Math.min(360,120*(1+Math.floor((1-e.hp/e.maxHp)/.3)*.3)),`bag-${e.id}`);
}
export function beforeBasic(g,e,point,options={}){
 if(g.stat(e,'root')&&(e.key==='don'||e.key==='ezra'&&(g.buff(e,'ezraUlt')||[0,3].includes(e.state.weapon||0))))return false;
 if(e.key==='rudolph'&&e.state.exhaustedUntil>g.time)return false;
 if(e.key==='ezra'&&e.ammo<1&&!g.buff(e,'ezraUlt')){switchWeapon(g,e,1,true);e.attackCd=.2;return false;}
 return true;
}
export function basic(g,e,p,d,options={}){
 const cone=(r,a,v,h)=>g.cone(e,d,r,a,v,h);
 switch(e.key){
 case 'don':dash(g,e,d,2,230);return true;
 case 'ryoshu':cone(g.attackRange(e),1.7,220*(e.state.fullAmmo?1.35:1));return true;
 case 'honglu':area(g,e,e,2.4,270);g.addBuff(e,'hongluStride',1);return true;
 case 'heathcliff':cone(1.8,1.7,200);return true;
 case 'ishmael':cone(1.9,1.6,220);return true;
 case 'rodya':cone(2,1.8,220,t=>{if((t.rodyaSlowUntil||0)<=g.time){g.status(t,'slow',.18,2,e);g.status(t,'weak',.1,2,e);t.rodyaSlowUntil=g.time+2.5;}});return true;
 case 'outis':
  g.bullet(e,d,150,9,{width:.16,onHit:(t,b)=>{const dist=distance(b.origin,t);const wanted=dist<2?150:dist<5?150+(dist-2)*30:dist<7?240+(dist-5)*45:330;g.deal(e,t,wanted-150);}});return true;
 case 'gregor':cone(2,1.8,210);return true;
 case 'gubo':{
  const ally=options.executeAlly?targetAt(g,e,p,e.range,e.team):null;
  if(ally&&ally!==e&&ally.hp/ally.maxHp<=RULES.allyExecuteThreshold){g.deal(e,ally,360,{allowFriendly:true});}
  else g.bullet(e,d,360*(g.buff(e,'guboReload')?1.2:1),e.range*(g.buff(e,'guboReload')?1.2:1),{pierce:99,decay:.6});
  return true;
 }
 case 'alisa':e.state.heat=Math.min(5,(e.state.heat||0)+1);cone(4,1.1,230,t=>{t.burn={source:e,until:g.time+2,next:g.time+.5};});return true;
 case 'rudolph':
  // 3 hits/s and 20 SP/s; basic's 1 SP charge is topped up to 20/3 per tick.
  e.ammo=Math.max(0,e.ammo-(20/3-1));area(g,e,p,3,60,t=>{e.state.whipHits??={};const n=e.state.whipHits[t.id]=(e.state.whipHits[t.id]||0)+1;if(n%5===0){const effect=['slow','reloadWeak','hasteWeak','silence'][Math.floor(n/5-1)%4];g.status(t,effect,effect==='silence'?1:.2,effect==='silence'?.75:1.5,e);}});return true;
 case 'moses':{
  const color=e.state.smoke;e.state.smoke=null;cone(5,1.1,180,t=>{if(color==='down')g.status(t,'stun',1,.7,e);if(color==='left'){g.status(t,'slow',.2,3,e);g.status(t,'vulnerable',.12,3,e);}});
  if(['up','right'].includes(color))for(const a of g.champions(e.team).filter(a=>a.alive&&distance(a,e)<=5)){const toward=direction(e,a);if(toward.x*d.x+toward.y*d.y<.4&&a!==e)continue;if(color==='up')g.addBuff(a,'mosesWhite',4);else {g.addShield(a,200,`smoke-${e.id}`);g.addBuff(a,'mosesHeal',2);}g.support(e);}
  return true;
 }
 case 'ezra':{
  if(g.buff(e,'ezraUlt')){e.state.ultAttacks=(e.state.ultAttacks||0)+1;const fourth=e.state.ultAttacks===4;dash(g,e,d,1.2,0,()=>{},{onComplete:()=>{area(g,e,e,fourth?3:2.2,fourth?320:250,t=>{g.status(t,'slow',.2,1.2,e);g.status(t,fourth?'stun':'root',1,fourth?.8:.6,e);});if(e.ammo<1)endEzra(g,e);}});return true;}
  const w=e.state.weapon||0;
  if(w===0)dash(g,e,d,2.2,280);
  if(w===1)cone(2.8,1.7,240,t=>g.status(t,'slow',.2,1.2,e));
  if(w===2)for(let i=0;i<3;i++)g.schedule(e,i*.12,()=>g.cone(e,d,3.2,.7,100,t=>{if(g.stat(t,'root')||g.stat(t,'stun'))g.deal(e,t,35);}));
  if(w===3)dash(g,e,d,2.5,0,()=>{},{onComplete:()=>area(g,e,e,2.5,230,t=>{const toward=direction(t,e);pushTarget(g,t,toward.x,toward.y);g.status(t,'slow',.2,1.5,e);})});
  return true;
 }
 default:return false;
 }
}
function shockIshmael(g,e){
 delete e.buffs.ishmaelShield;e.state.shockAt=0;area(g,e,e,3,200,t=>g.status(t,'stun',1,.8,e));g.effects.push({type:'burst',x:e.x,y:e.y,r:3,theme:e.key,life:.6,maxLife:.6});
}
function endEzra(g,e){e.state.ultMode=false;delete e.buffs.ezraUlt;e.state.ultAttacks=0;e.ammo=ammoCap(g,e);e.range=EZRA_WEAPONS[e.state.weapon||0].range;e.reloadProgress=0;}
export function cast(g,e,slot,p,d,options={}){
 const state=e.state;
 switch(e.key){
 case 'don':
  if(slot==='q'){
   dash(g,e,d,2.2,0,()=>{},{onComplete:()=>{g.addBuff(e,'donGuard',1.2);for(let i=0;i<3;i++)g.schedule(e,i*.4,()=>g.cone(e,d,2.3,.65,95));}});
  }else{const t=targetAt(g,e,p,6.5);dash(g,e,d,Math.max(0,distance(e,t)-1),0,()=>{},{onComplete:()=>{if(t.alive&&distance(e,t)<2&&clearLine(e,t)){g.heal(e,e,g.deal(e,t,300)*.4,false);g.addBuff(e,'donLifesteal',5);}}});}
  return true;
 case 'ryoshu':
  if(slot==='q'){const len=4*(g.buff(e,'amplify')?1.2:1);e.invulnerableUntil=g.time+len/RULES.dashSpeed;dash(g,e,d,len,180,()=>{},{onComplete:()=>e.invulnerableUntil=0});}
  else{
   const len=Math.min(7*(g.buff(e,'amplify')?1.2:1),distance(e,p)),dest={x:clamp(e.x+d.x*len,.6,RULES.width-.6),y:clamp(e.y+d.y*len,.6,RULES.height-.6)};
   if(!blocked(dest.x,dest.y,e.radius)){e.x=dest.x;e.y=dest.y;}
   for(let i=0;i<4;i++)g.schedule(e,i*.12,()=>area(g,e,e,2.6,140,t=>g.status(t,'armorDown',25,3,e)));
   e.ammo=ammoCap(g,e);
  }return true;
 case 'honglu':
  if(slot==='q')g.schedule(e,.6,()=>{let n=0;for(const t of g.champions(1-e.team))if(t.alive&&distance(t,p)<=6){t.revealedUntil=g.time+2;n++;}state.insightStacks=Math.min(4,n);if(n)g.addBuff(e,'insight',4);});
  else g.zones.push({kind:'waterfall',source:e,x:p.x,y:p.y,r:6.5,until:g.time+4,nextTick:g.time+.5,damage:60,heal:50,cleanse:true,cleansed:new Set()});
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
   const start={x:e.x,y:e.y},end={x:e.x+d.x*8,y:e.y+d.y*8};g.effects.push({type:'line',...start,to:end,theme:e.key,color:'#9bd9dd',life:.8,maxLife:.8});
   for(const t of g.champions(1-e.team).filter(t=>t.alive&&segmentDistance(t,start,end)<t.radius+.45&&clearLine(e,t))){g.deal(e,t,300);const v=direction(t,e);pushTarget(g,t,v.x*1.5,v.y*1.5);g.status(t,'slow',.2,2,e);}
  }return true;
 case 'rodya':
  if(slot==='q'){
   const coins=[0,0,0].map(()=>g.random()<.5),heads=coins.filter(Boolean).length,tails=3-heads;state.coinHeads=heads;state.coinTails=tails;state.coinResults=coins;state.coinAt=g.time;
   if(heads)g.addBuff(e,'coins',4);if(tails)g.addBuff(e,'coinSpeed',3);e.rCd=Math.max(0,e.rCd-heads*2);e.qCd=Math.max(1,e.qCd-tails*2);
  }else g.bullet(e,d,360,8,{width:.3,onHit:(t,b)=>{if(b.lastHpRatio>=.5)g.deal(e,t,108);g.status(t,'stun',1,1,e);g.zones.push({kind:'ice',source:e,x:t.x,y:t.y,r:3.5,until:g.time+3,nextTick:g.time,damage:0,slow:.3});}});
  return true;
 case 'outis':
  if(slot==='q')dash(g,e,d,3,0,()=>{},{onComplete:()=>{let hit=false;area(g,e,e,2.5,180,t=>{g.status(t,'slow',.2,1.5,e);if(t.kind==='champion')hit=true;});if(hit)e.ammo=Math.min(ammoCap(g,e),e.ammo+1);}});
  else{
   const follow=(p)=>{g.effects.push({type:'cast',x:p.x,y:p.y,r:3,angle:Math.atan2(d.y,d.x),theme:e.key,slot:'r',life:.5,maxLife:.5});for(const t of [...g.units])if(g.hostile(e,t)&&distance(t,p)<=3.5&&clearLine(p,t))g.deal(e,t,250*(t.hp/t.maxHp<.5?1.3:1));};
   dash(g,e,{x:-d.x,y:-d.y},2.5,0,()=>{},{onComplete:()=>g.bullet(e,d,450,9,{width:.3,bonusLowHp:.3,onHit:(t)=>follow(t),onEnd:follow})});
  }return true;
 case 'gregor':
  if(slot==='q'){
   const end={x:e.x+d.x*5,y:e.y+d.y*5};for(const t of [...g.units])if(g.hostile(e,t)&&segmentDistance(t,e,end)<.8+t.radius&&clearLine(e,t)){
    g.deal(e,t,250);pushTarget(g,t,d.x*3,d.y*3,{onCollision:()=>{g.deal(e,t,180);g.status(t,'stun',1,1,e);}});
   }
  }else for(let i=0;i<2;i++)g.schedule(e,i*.35,()=>{g.cone(e,d,3.5,1.8,270,t=>{if(t.kind==='champion')gregorStack(g,e,2);pushTarget(g,t,d.x*1.5,d.y*1.5);});g.heal(e,e,160);});
  return true;
 case 'rudolph':
  if(slot==='q'){const spend=Math.min(e.hp-1,e.hp*.1);e.hp-=spend;e.ammo=Math.min(100,e.ammo+35);g.addShield(e,spend,`focus-${e.id}`);}
  else{const power=e.ammo/100;e.ammo=0;e.channelUntil=g.time+1.25;g.pending.push({type:'global',source:e,x:p.x,y:p.y,r:4.2,at:g.time+1.25,damage:450*power,ignoreWalls:true,onHit:t=>{for(const key of ['slow','reloadWeak','hasteWeak'])g.status(t,key,.2,1.5,e);g.status(t,'silence',1,.75,e);g.status(t,'root',1,1,e);}});}
  return true;
 case 'moses':
  if(slot==='q'){state.smoke=options.direction;if(state.smoke==='down')e.hp=Math.max(1,e.hp*.94);}
  else g.bullet(e,d,550,9,{width:.6,onHit:t=>{g.status(t,'stun',1,.75,e);g.status(t,'vulnerable',.18,3,e);}});
  return true;
 case 'ezra':
  if(slot==='q')switchWeapon(g,e,options.direction==='left'?-1:1);
  else if(g.buff(e,'ezraUlt'))endEzra(g,e);else {g.addBuff(e,'ezraUlt',6);state.ultMode=true;state.ultAttacks=0;e.ammo=4;}
  return true;
 case 'alisa':
  if(slot==='q'){if(!(state.dashWindow>g.time)){state.dashUses=0;state.dashWindow=g.time+4;}state.dashUses++;state.heat=Math.min(5,(state.heat||0)+1);dash(g,e,d,3);e.ammo=Math.min(ammoCap(g,e),e.ammo+1);}
  else{state.heat=0;state.blastArmed=true;}
  return true;
 case 'gubo':
  if(slot==='q')g.addBuff(e,'guboReload',4);
  else {const t=options.executeAlly?targetAt(g,e,p,12,e.team):targetAt(g,e,p,12);if(t){e.channelUntil=g.time+1.2;g.schedule(e,1.2,()=>{g.deal(e,t,500,{allowFriendly:options.executeAlly});if(!t.alive)guboBlast(g,e,t,.14,1100);});}}
  return true;
 default:return false;
 }
}
export function damageBonus(g,e,t){
 if(!e.key)return 1;
 let b=1;
 if(e.key==='heathcliff'&&t.hp/t.maxHp>e.hp/e.maxHp)b*=1.18;
 if(e.key==='alisa')b*=1+.03*(e.state.heat||0);
 if(g.buff(e,'mutant'))b*=1.2;
 if(g.buff(e,'power'))b*=1.12;
 if(g.buff(e,'charge'))b*=1+.06*(e.state.chargeStacks||0);
 return b;
}
export function afterDamage(g,e,t,actual,proc=true){
 if(!proc)return;
 if(e.kind==='champion'){
  if(g.buff(e,'donLifesteal'))g.heal(e,e,actual*.25,false);
  if(g.buff(e,'heathUlt'))g.heal(e,e,actual*.2,false);
  if(e.key==='gregor')gregorStack(g,e);
  if(e.key==='don'&&t.kind==='champion'&&t.hp>0&&e.state.villain===t.id&&(e.state.villainHits?.[t.id]||0)<=g.time){e.state.villainHits??={};e.state.villainHits[t.id]=g.time+6;g.deal(e,t,60,{fixed:true,proc:false});g.status(t,'root',1,.75,e);}
 }
 if(t.kind==='champion'){
  if(t.key==='gregor'&&(t.state.receivedStackAt||0)<=g.time){t.state.receivedStackAt=g.time+.3;gregorStack(g,t);}
  if(t.key==='ishmael'&&t.alive&&t.hp/t.maxHp<.3&&t.passiveReady<=g.time){t.passiveReady=g.time+70;g.addShield(t,t.maxHp*.16,`survive-${t.id}`);g.addBuff(t,'ishmaelSurvive',3);}
 }
}
export function gregorStack(g,e,n=1){
 if(!e.alive||g.buff(e,'mutant')||(e.state.mutateReady||0)>g.time)return;
 e.state.mutations=(e.state.mutations||0)+n;
 if(e.state.mutations>=12){e.state.mutations=0;e.state.mutateReady=g.time+18;e.state.transformed=true;const hp=e.maxHp;g.addBuff(e,'mutant',5);e.maxHp=g.maxHp(e);e.hp+=e.maxHp-hp;e.radius=.48*1.15;e.state.mutantTick=g.time+.5;}
}
export function takedown(g,e,victim,direct){
 if(!e||e.kind!=='champion')return;
 if(e.key==='rodya'&&victim.kind==='champion'){e.qCd=Math.max(0,e.qCd-4);e.rCd=Math.max(0,e.rCd-4);e.ammo=Math.min(ammoCap(g,e),e.ammo+1);}
 if(e.key==='outis'&&direct)e.ammo=Math.min(ammoCap(g,e),e.ammo+(victim.kind==='champion'?1.5:.25));
 if(e.key==='gubo'&&victim.kind==='champion')e.qCd=0;
 if(e.key==='heathcliff'&&victim.kind==='champion'&&g.buff(e,'heathUlt')&&(e.state.heathExtensions||0)<4){e.state.heathExtensions++;e.buffs.heathUlt+=1+(direct?.5:0);}
}
export function guboBlast(g,e,victim,ratio=.12,cap=800){
 const enemy=g.champions(1-e.team).filter(t=>t.alive).sort((a,b)=>distance(a,victim)-distance(b,victim))[0];if(!enemy)return;
 const d=direction(victim,enemy);for(const t of g.champions(1-e.team).filter(t=>t.alive&&distance(t,victim)<=5.5)){const td=direction(victim,t);if(td.x*d.x+td.y*d.y>.4)g.deal(e,t,Math.min(cap,t.maxHp*ratio),{fixed:true,proc:false});}
 g.effects.push({type:'burst',x:victim.x,y:victim.y,r:5.5,theme:'gubo',life:.7,maxLife:.7});
}
export function interceptDeath(g,e,killer){
 if(e.key!=='alisa'||e.state.detonating||(!(e.state.heat>=5)&&!e.state.blastArmed))return false;
 e.hp=1;e.state.detonating=true;e.invulnerableUntil=g.time+2;
 g.schedule(e,2,()=>{area(g,e,e,4,600);g.effects.push({type:'burst',x:e.x,y:e.y,r:4,theme:e.key,life:.7,maxLife:.7});const armed=e.state.blastArmed;g.kill(e,killer);if(armed){e.respawnAt=g.time+3;e.state.fastReturn=true;}});
 return true;
}
export function tick(g,e,dt){
 const s=e.state;
 if(e.burn?.until>g.time&&e.burn.next<=g.time){e.burn.next+=.5;g.deal(e.burn.source,e,27.5);if(!e.alive)return;}
 if(e.key==='alisa'){
  if(g.canNaturalHeal(e)){s.heat=0;}else if(s.heat>0)g.selfDamage(e,e.maxHp*.008*s.heat*dt,{nonLethal:true,ignoreRegen:true});
 }
 if(e.key==='don'&&(s.villainAt||0)<=g.time){s.villainAt=g.time+6;const enemies=g.champions(1-e.team).filter(t=>t.alive&&distance(e,t)<=7);enemies.sort((a,b)=>(b.lastChampionKill||-99)-(a.lastChampionKill||-99)||distance(e,a)-distance(e,b));s.villain=enemies[0]?.id;}
 if(e.key==='heathcliff'){
  if(s.chargeAt!==undefined&&g.time-s.chargeAt>=3.4){const aim=e.player?g.input.aim:s.chargeAim;const d=g.aim(e,aim);cast(g,e,'q',aim,d);}
  if(g.buff(e,'heathUlt')&&s.auraTick<=g.time){s.auraTick+=.5;area(g,e,e,3,80);}
 }
 if(e.key==='ishmael'&&s.shockAt>0&&s.shockAt<=g.time)shockIshmael(g,e);
 if(e.key==='gregor'){
  if(s.transformed&&!g.buff(e,'mutant')){s.transformed=false;e.maxHp=g.maxHp(e);e.hp=Math.min(e.hp,e.maxHp);e.radius=.48;}
  if(g.buff(e,'mutant')&&s.mutantTick<=g.time){s.mutantTick+=.5;let dealt=0;area(g,e,e,3,0,t=>{dealt+=g.deal(e,t,35,{proc:false});});g.heal(e,e,dealt*.35,false);}
 }
 if(e.key==='ezra'&&s.ultMode&&!g.buff(e,'ezraUlt'))endEzra(g,e);
 if(e.key==='rudolph'){
  if(s.exhaustedUntil){if(s.exhaustedUntil>g.time)return;delete s.exhaustedUntil;e.ammo=100;return;}
  if(e.ammo<=0){s.exhaustedUntil=g.time+2.5;g.status(e,'silence',1,2.5);return;}
  if(g.time-e.lastAttackAt>.4)e.ammo=Math.min(100,e.ammo+18*RULES.reloadEfficiency*(1+e.upgrades.reload*.05)*dt);
 }
 if(CHAMPIONS[e.key].role==='돌격'){
  if(g.time-e.lastCombat>3){s.combatAt=undefined;s.chargeStacks=0;delete e.buffs.charge;}
  else {s.combatAt??=g.time;const stacks=Math.min(4,Math.floor((g.time-s.combatAt)/3));if(stacks!==(s.chargeStacks||0)){s.chargeStacks=stacks;if(stacks)g.addBuff(e,'charge',4);}if(stacks&&e.buffs.charge<g.time+.1)e.buffs.charge=g.time+3;}
 }
}
