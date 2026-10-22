import { trapPoint } from './confinement.js';
import { AHAB, RULES, RUNTIME_CHAMPIONS as CHAMPIONS } from './data.js';
import { distance,direction } from './geometry.js';
import { area, dash, targetAt } from './skills.js';

export function init(g,e){if(e.key==='nelly'){e.state.knifeCharges=2;e.state.knifeReady=Infinity;}onRespawn(g,e);}
export function onRespawn(g,e){if(e.key==='ahab'){e.state.order='cover';g.addBuff(e,'ahabOrder',Infinity,{copy:false});}}
function harpoonMark(g,t,captain){const mark=t.state?.harpoons?.[captain.id]||t.state?.harpoon;return mark?.source===captain.id&&mark.team===captain.team&&mark.until>g.time;}
function coverCaptain(g,e,t){return e.kind==='champion'&&e.alive&&e.team!==t.team?g.champions(e.team).find(a=>a!==e&&a.key==='ahab'&&a.alive&&a.state.order==='cover'&&distance(e,a)<=AHAB.orderRadius&&harpoonMark(g,t,a)):null;}
export function coverMultiplier(g,e,t){
 const captain=coverCaptain(g,e,t);if(!captain)return 1;
 if((captain.state.coverReady||0)<=g.time){captain.state.coverReady=g.time+1.6;captain.state.coverStacks=g.buff(captain,'ahabCover')?Math.min(3,(captain.state.coverStacks||0)+1):1;g.addBuff(captain,'ahabCover',5,{copy:false});}e.supporters[captain.id]=g.time;return 1.3;
}
export function guardAlly(g,target){
 if(target.key!=='ahab'||target.state.order!=='guard')return null;
 return g.champions(target.team).filter(a=>a!==target&&a.alive&&!a.returning&&!a.state.posthumous&&!g.hidden(a)&&!(a.invulnerableUntil>g.time)&&!(g.training&&a===g.player&&g.practice.invincible)&&a.hp>=a.maxHp*.3&&distance(a,target)<=AHAB.orderRadius).sort((a,b)=>b.hp-a.hp||a.id-b.id)[0]||null;
}
export function transfer(g,source,target,amount,kind){
 if(source.team===target.team)return amount;
 const ally=guardAlly(g,target);if(!ally)return amount;
 const share=Math.min(amount*.3,Math.max(0,ally.hp-ally.maxHp*.2));
 if(share>0)g.deal(source,ally,share,{fixed:true,proc:false,transferred:true,damageKind:kind,nonLethal:true});return amount-share;
}
function harpoonBonus(g,e,t){
 if(!t.alive||t.returning||t.state?.posthumous||t.invulnerableUntil>g.time||g.locked(t)||g.training&&t===g.player&&g.practice.invincible)return 0;
 e.basicHits[t.id]=(e.basicHits[t.id]||0)+1;const bonus=e.basicHits[t.id]%3===0?1.3:1;
 if(bonus>1)g.effects.push({type:'burst',x:t.x,y:t.y,r:1,theme:'ahab',life:.35,maxLife:.35});return bonus;
}
export function validate(g,e,slot,p){
 if(e.key==='nelly'&&slot==='q')return (e.state.knifeCharges??2)>0;
 if(e.key==='nelly'&&slot==='r')return !g.stat(e,'root')&&Boolean(targetAt(g,e,p,7));
 if(e.key==='ahab'&&slot==='r')return !g.stat(e,'root')&&!g.blocked(p.x,p.y,e.radius);
 return true;
}
export function recast(g,e,slot){return e.key==='ahab'&&slot==='r'&&e.state.recastUntil>g.time&&!e.state.recastSpent;}
export function receivedMultiplier(g,e,t,kind){return e.key==='gahwan'&&kind==='skill'&&t.state?.contempt?.[e.id]>g.time?1.12:1;}
function gaze(g,e,t,n=1){
 if(t.kind!=='champion'||!t.alive||t.hp<=0)return;
 t.state.gaze??={};const mark=t.state.gaze[e.id]??={n:0,until:0};if(mark.until<=g.time)mark.n=0;mark.n+=n;mark.until=g.time+5;
 if(mark.n>=5){mark.n=0;t.state.contempt??={};t.state.contempt[e.id]=g.time+3;t.revealedUntil=g.time+3;t.visuals.contempt={until:g.time+3,theme:'gahwan'};g.triggerDisrupt(e,t);}
}
function refundKnife(g,e){const s=e.state;if(Number.isFinite(s.knifeReady))s.knifeReady=g.time+Math.max(0,s.knifeReady-g.time)*.5;}
function nellyMark(g,e,t,force=false){
 t.state.nellyMarks??={};let mark=t.state.nellyMarks[e.id];
 if(force){t.state.nellyMarks[e.id]={active:true,ready:Infinity,hold:3,until:g.time+7};t.visuals.nellyMark={until:g.time+7,theme:'nelly',forced:true};return;}
 if(mark?.active&&mark.until>g.time){
  if(mark.hold>0){mark.hold--;return;}
  mark.active=false;mark.ready=g.time+3;delete t.visuals.nellyMark;if(!e.state.knifeRefundCast)refundKnife(g,e);if(t.hp>0)g.deal(e,t,t.maxHp*.07,{fixed:true,proc:false});
 }else if(!mark||mark.ready<=g.time){t.state.nellyMarks[e.id]={active:true,ready:g.time+3,until:g.time+6};t.visuals.nellyMark={until:g.time+6,theme:'nelly'};}
}
export function afterDamage(g,e,t,actual,proc){
 if(!proc||actual<=0||e.kind!=='champion'||t.kind!=='champion'||t.hp<=0)return;
 if(e.key==='gahwan')gaze(g,e,t);
 if(e.key==='nelly')nellyMark(g,e,t);
}
export function basic(g,e,p,d){
 switch(e.key){
 case 'gahwan':
  for(let i=0;i<2;i++)g.schedule(e,i*.12,()=>g.cone(e,d,g.attackRange(e),.85,43.5));
  for(const t of [...g.units])if(g.hostile(e,t)&&distance(e,t)<=3.25+t.radius&&g.clearLine(e,t)){const v=direction(e,t);if(v.x*d.x+v.y*d.y>.5){g.deal(e,t,28.5);e.state.knockReady??={};if(t.kind!=='champion'||(e.state.knockReady[t.id]||0)<=g.time){e.state.knockReady[t.id]=g.time+2;g.startMotion(t,v,2.5,{kind:'knock',source:e});}}}
  return true;
 case 'nelly':g.cone(e,d,g.attackRange(e),1.2,210);return true;
 case 'ahab':{
  let primaryBonus=0;
  g.bullet(e,d,182,g.attackRange(e),{speed:16,width:.22,beforeHit:(t,shot)=>{primaryBonus=harpoonBonus(g,e,t);shot.damage*=primaryBonus;},onHit:t=>{
   if(!primaryBonus)return;
   if(t.kind==='champion'&&t.alive){const mark={source:e.id,team:e.team,until:g.time+4};t.state.harpoon=mark;(t.state.harpoons??={})[e.id]=mark;t.revealedUntil=g.time+2.5;g.status(t,'armorDown',25,3,e);t.visuals.harpoon={until:g.time+4,theme:'ahab'};}
   g.action(e,'basic',()=>{for(const u of [...g.units])if(g.hostile(e,u)&&distance(u,t)<=2+u.radius&&g.clearLine(t,u)){const bonus=u===t?primaryBonus:harpoonBonus(g,e,u);if(bonus)g.deal(e,u,84*bonus);}});
   g.effects.push({type:'burst',x:t.x,y:t.y,r:2,theme:e.key,life:.45,maxLife:.45});
  }});return true;
 }
 default:return false;
 }
}
export function cast(g,e,slot,p,d){
 const s=e.state;
 if(e.key==='gahwan'){
  if(slot==='q'){
   const len=Math.min(8.2,distance(e,p)),center={x:e.x+d.x*len,y:e.y+d.y*len},rooted=new Set();
   for(let i=0;i<5;i++)g.schedule(e,i*.13,()=>{area(g,e,center,2.5,39,t=>{g.status(t,'slow',.25,1.5,e);if(t.kind==='champion'&&t.state.contempt?.[e.id]>g.time&&!rooted.has(t.id)&&(s.bindReady?.[t.id]||0)<=g.time){rooted.add(t.id);s.bindReady??={};s.bindReady[t.id]=g.time+5;g.status(t,'root',1,1.5,e);}});g.effects.push({type:'slash',...center,angle:e.facing+i*.5,spread:1.2,r:2.5,theme:e.key,life:.3,maxLife:.3});});
  }else{
   e.channelUntil=g.time+1.5;
   area(g,e,p,5,350/3,t=>{const contempt=t.state?.contempt?.[e.id]>g.time;g.status(t,'slow',.5,contempt?1.5:1,e);if(contempt)g.status(t,'armorDown',25,3,e);});
   for(let i=1;i<3;i++)g.pending.push({type:'gazeBurst',source:e,...p,r:5,at:g.time+i*.75,windup:i*.75,damage:350/3});
  }
  return true;
 }
 if(e.key==='nelly'){
  if(slot==='q'){
   s.knifeCharges=(s.knifeCharges??2)-1;if(!Number.isFinite(s.knifeReady))s.knifeReady=g.time+g.cooldown(e,'q');e.qCd=s.knifeCharges>0?0:s.knifeReady-g.time;let refunded=false;
   for(const off of [-.28,-.14,0,.14,.28])g.bullet(e,{x:Math.cos(e.facing+off),y:Math.sin(e.facing+off)},70,7,{speed:18,pierce:Infinity,beforeHit:t=>{e.state.knifeRefundCast=true;if(!refunded&&t.state?.nellyMarks?.[e.id]?.active){refunded=true;refundKnife(g,e);}},onHit:()=>{delete e.state.knifeRefundCast;}});
  }else{
   e.ammo=Math.min(g.ammoCap(e),e.ammo+2);const t=targetAt(g,e,p,7),behind=direction(e,t),dest=trapPoint(g,e,{x:t.x+behind.x*.9,y:t.y+behind.y*.9});
   if(!g.blocked(dest.x,dest.y,e.radius)){e.x=dest.x;e.y=dest.y;}else{const back=trapPoint(g,e,{x:t.x-behind.x*.9,y:t.y-behind.y*.9});if(!g.blocked(back.x,back.y,e.radius)){e.x=back.x;e.y=back.y;}}
   // Apply the forced mark after the opening strike so the following three hits preserve it.
   g.deal(e,t,300);if(t.alive){g.status(t,'root',1,.7,e);nellyMark(g,e,t,true);}g.effects.push({type:'slash',x:e.x,y:e.y,r:2,angle:e.facing,spread:2.8,theme:e.key,life:.5,maxLife:.5});
  }return true;
 }
 if(e.key==='ahab'){
  if(slot==='q'){s.order=s.order==='guard'?'cover':'guard';s.orderAt=g.time;g.addBuff(e,'ahabOrder',Infinity,{copy:false});}
  else{
   const isRecast=recast(g,e,slot);s.recastSpent=isRecast;s.recastUntil=0;
   const len=Math.min(6.5,distance(e,p)),dest=trapPoint(g,e,{x:e.x+d.x*len,y:e.y+d.y*len}),execute=new Set(g.champions(1-e.team).filter(t=>t.alive&&t.hp/t.maxHp<.1).map(t=>t.id));
   s.ahabUlt={origin:{x:e.x,y:e.y},immune:e.ccImmuneUntil||0,invulnerable:e.invulnerableUntil||0};e.ccImmuneUntil=Infinity;e.invulnerableUntil=Infinity;e.channelUntil=g.time+.45;
   e.x=dest.x;e.y=dest.y;g.effects.push({type:'ring',...dest,r:2.5,color:'#e2d6a5',life:.3,maxLife:.3});
   {
    for(let i=0;i<2;i++)g.schedule(e,i*.2,()=>{for(const t of [...g.units])if(g.hostile(e,t)&&distance(e,t)<=2.5+t.radius&&g.clearLine(e,t))g.deal(e,t,180,{nonLethal:execute.has(t.id)});});
    g.schedule(e,.45,()=>{for(const t of [...g.units])if(g.hostile(e,t)&&distance(e,t)<=2.5+t.radius&&g.clearLine(e,t)){
     if(execute.has(t.id)){g.deal(e,t,t.hp+g.shield(t),{fixed:true});if(!t.alive&&t.kind==='champion'&&!isRecast)s.recastUntil=g.time+4;}
     else g.deal(e,t,300+(t.maxHp-t.hp)*.18);
    }g.effects.push({type:'burst',x:e.x,y:e.y,r:2.5,theme:e.key,life:.7,maxLife:.7});const ult=s.ahabUlt;const done=()=>{e.ccImmuneUntil=ult.immune;e.invulnerableUntil=ult.invulnerable;delete s.ahabUlt;s.returnAnchorUntil=g.time+.05;};e.channelUntil=0;if(!g.startMotion(e,direction(e,ult.origin),distance(e,ult.origin),{speed:12,maxSpeed:12,phaseEnemies:true,follow:{...ult.origin,alive:true},onComplete:done}))done();});
   }
  }return true;
 }
 return false;
}
export function tick(g,e){
 const s=e.state;
 if(e.key==='nelly'){
  s.knifeCharges??=2;s.knifeReady??=Infinity;
  if(s.knifeCharges<2&&g.time>=s.knifeReady){s.knifeCharges++;s.knifeReady=s.knifeCharges<2?g.time+g.cooldown(e,'q'):Infinity;}
  e.qCd=Math.max(0,(s.qDelayUntil||0)-g.time,s.knifeCharges>0?0:s.knifeReady-g.time);
 }
}
