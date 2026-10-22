import { RULES, WORLD } from './data.js';
import { clamp,distance,direction,segmentDistance } from './geometry.js';
import { settleBody } from './collision.js';
import { area } from './skills.js';

// Shared rectangles use full width; circle/body intersection includes the target radius.
export function rectangle(g,e,d,range,width,damage,hit=()=>{}){
 const hits=[];
 for(const t of [...g.units])if(g.hostile(e,t)&&g.clearLine(e,t)){
  const x=t.x-e.x,y=t.y-e.y,along=x*d.x+y*d.y,side=Math.abs(y*d.x-x*d.y);
  if(Math.hypot(Math.max(0,-along,along-range),Math.max(0,side-width/2))<=t.radius){const actual=g.deal(e,t,damage);hit(t,actual);hits.push(t);}
 }
 return hits;
}
export function heathCharge(g,e,point){
 const elapsed=Math.max(0,g.time-(e.state.chargeAt??g.time)),progress=clamp(elapsed/1.5,0,1),range=.5+6.5*progress,d=g.aim(e,point),len=Math.min(range,Math.max(.5,distance(e,point)));
 const landing=g.safeLanding(e,{x:e.x+d.x*len,y:e.y+d.y*len},len);
 return {elapsed,progress,range,ready:true,radius:1.8,damage:80+170*progress,stun:progress<.5?0:progress,landing};
}
export function cancelHeath(e){if(e.key==='heathcliff'){delete e.state.chargeAt;delete e.state.chargeAim;}}
export function releaseHeath(g,e,p){
 if(e.key!=='heathcliff'||e.state.chargeAt===undefined)return false;
 if(!e.alive||g.stat(e,'stun')||g.stat(e,'silence')||g.stat(e,'root')||g.stat(e,'captured')||e.motion||g.hidden(e)){cancelHeath(e);return false;}
 const shape=heathCharge(g,e,p||e.state.chargeAim),d=direction(e,shape.landing);cancelHeath(e);e.qCd=g.cooldown(e,'q');e.lastAttackAt=g.time;
 return g.action(e,'skill',()=>g.startMotion(e,d,distance(e,shape.landing),{kind:'leap',ignoreWalls:true,arcHeight:3,minDuration:distance(e,shape.landing)/RULES.dashSpeed,phaseEnemies:true,onComplete:()=>{
  area(g,e,e,shape.radius,shape.damage,t=>{if(shape.stun)g.status(t,'stun',1,shape.stun,e);});g.effects.push({type:'burst',x:e.x,y:e.y,r:shape.radius,theme:'heathcliff',life:.5,maxLife:.5});
 }}));
}
export function faust(g,e,slot,p,d){
 if(slot==='q'){
  g.cone(e,d,3,1.4,150);
  g.cone(e,d,3,Math.PI,230,t=>{
   const away=direction(e,t),len=Math.max(0,3+t.radius+.18-distance(e,t));
   g.startMotion(t,away,len,{kind:'knock',source:e,speed:18,forcedMaxSpeed:18});
   if(e.level===RULES.maxLevel)g.status(t,'slow',.2,1.5,e);
  });g.addBuff(e,'explore',4);
 }else{
  const len=Math.min(10,distance(e,p)),delay=e.level===RULES.maxLevel?0:1.25;e.channelUntil=g.time+delay;
  g.pending.push({type:'burst',source:e,x:e.x+d.x*len,y:e.y+d.y*len,r:4.8,at:g.time+delay,damage:680});
 }
 return true;
}
export function outis(g,e,d){
 const s=e.state;s.outisRush=true;
 const finish=()=>{delete s.outisRush;};
 let victim=null,finished=false;
 const blast=()=>{
  if(finished)return;finished=true;
  const backward={x:-d.x,y:-d.y};g.cone(e,d,6.5,Math.PI*2/3,220,()=>{},{exclude:new Set(victim?[victim.id]:[])});
  g.effects.push({type:'slash',x:e.x,y:e.y,angle:Math.atan2(d.y,d.x),r:6.5,spread:Math.PI*2/3,theme:'outis',life:.5,maxLife:.5});
  if(victim){if(!g.startMotion(e,backward,2.5,{speed:18,maxSpeed:18,phaseEnemies:true,onComplete:finish}))finish();}else finish();
 };
 const ok=g.startMotion(e,d,4.5,{speed:12,maxSpeed:12,phaseEnemies:true,onStep:(from,to)=>{
  if(victim)return;
  const t=g.units.filter(t=>g.hostile(e,t)&&segmentDistance(t,from,to)<=t.radius+e.radius+.06&&g.clearLine(e,t)).sort((a,b)=>distance(from,a)-distance(from,b))[0];
  if(t){victim=t;g.deal(e,t,450);g.status(t,'stun',1,1,e);delete e.motion;settleBody(g,e,from);blast();}
 },onComplete:blast});if(!ok)finish();return true;
}
export function honglu(g,e,slot,p,d){
 if(slot==='q'){
  e.state.insightHealingEvent=e.healingEvent;e.state.insightUntil=g.time+1.2;e.state.insightOrigin={x:e.x,y:e.y};e.phaseEnemiesUntil=g.time+1.2;
  e.invulnerableUntil=Math.max(e.invulnerableUntil||0,g.time+1.2);g.addBuff(e,'insight',1.2,{copy:false});
 }else{
  const z=g.zones.find(z=>z.kind==='waterfall'&&z.source===e&&z.until>g.time);
  if(z)z.moving=!z.moving;
  else g.zones.push({kind:'waterfall',source:e,healingEvent:e.healingEvent,x:p.x,y:p.y,d:{...d},moving:true,r:6.5,until:g.time+4,nextTick:g.time+.5,damage:60,heal:75*(1+.05*2),cleanse:true,cleansed:new Set()});
 }
 return true;
}
export function tick(g,e){
 const s=e.state;
 if(e.key==='heathcliff'&&s.chargeAt!==undefined){
  if(g.stat(e,'stun')||g.stat(e,'silence')||g.stat(e,'root')||g.hidden(e)||e.motion||e.recall)cancelHeath(e);
  else{e.lastAttackAt=g.time;if(!e.player&&g.time-s.chargeAt>=1.5)releaseHeath(g,e,s.chargeAim);}
 }
 if(s.outisRush&&!e.motion)delete s.outisRush;
 if(s.gregorPulls){s.gregorPulls=s.gregorPulls.filter(id=>g.units.some(t=>t.id===id&&t.alive&&t.motion?.follow===e));if(!s.gregorPulls.length)delete s.gregorPulls;}
 if(s.ishmaelCast&&!s.ishmaelCast.fired&&g.stat(e,'stun'))delete s.ishmaelCast;
 if(s.ishmaelCast?.fired){const active=g.projectiles.some(p=>p.ishmaelOwner===e.id&&p.remaining>0)||g.units.some(t=>t.alive&&t.motion?.ishmaelOwner===e.id);if(!active)delete s.ishmaelCast;}
 if(s.insightUntil!==undefined&&g.time+1e-8>=s.insightUntil){delete s.insightUntil;e.phaseEnemiesUntil=0;settleBody(g,e,s.insightOrigin);delete s.insightOrigin;for(const t of g.champions(e.team).filter(t=>t.alive&&distance(e,t)<=5))g.heal(e,t,500,false,{healingKey:s.insightHealingEvent?.key,startedAt:s.insightHealingEvent?.at});g.effects.push({type:'ring',x:e.x,y:e.y,r:5,color:'#84e6dc',life:.6,maxLife:.6});}
}
export function easterEggs(g,dt){
 g.easterEggs??=new Set();const phrases={queequeg:'자, 막아내라!',starbuck:'엄호해라!',ishmael:'네 탓이군, 이스마엘!'};
 for(const e of g.champions().filter(e=>phrases[e.key]&&!e.trainingDummy)){
  const key=`${e.team}-${e.key}`,near=e.alive&&g.champions(e.team).some(a=>a.key==='ahab'&&a.alive&&distance(a,e)<=8);
  e.state.captainDwell=near?(e.state.captainDwell||0)+dt:0;
  if(!g.easterEggs.has(key)&&e.state.captainDwell+1e-8>=3){g.easterEggs.add(key);e.easterText={text:phrases[e.key],until:g.time+2};}
 }
}

export function ishmael(g,e,d){
 const cast={d:{...d},windupUntil:g.time+.235};e.state.ishmaelCast=cast;e.channelUntil=cast.windupUntil;
 g.schedule(e,.235,()=>{
  if(e.state.ishmaelCast!==cast)return;cast.fired=true;
  g.bullet(e,d,300,16,{ishmaelOwner:e.id,speed:28,width:.585,pierce:Infinity,onHit:(t,p)=>{
   if(t.kind!=='champion')return;
   p.remaining=0;p.hit=true;if(!t.alive)return;
   const front=e.radius+t.radius+.15;
   const pulled=g.startMotion(t,direction(t,e),Math.max(0,distance(t,e)-front),{kind:'knock',source:e,follow:e,stopDistance:front,speed:18,forcedMaxSpeed:18});
   if(pulled&&t.motion){t.motion.ishmaelOwner=e.id;t.state.harpoon={source:e.id,until:g.time+1.5};}
   g.status(t,'slow',.2,2,e);
  }});
 });return true;
}
