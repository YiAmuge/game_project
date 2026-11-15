import {distance,direction} from './geometry.js';
import {GASHARPOON as P,GASHARPOON_NAME,GASHARPOON_SKILLS,GASHARPOON_TEXT} from './ahab-ego-data.js';
export {GASHARPOON as PARAMETERS} from './ahab-ego-data.js';
export const empowered=e=>e?.key==='ahab'&&Boolean(e.goldenBough);
export const active=e=>e?.key==='ahab'&&Boolean(e.state?.gasharpoon);
export const ordersActive=e=>e?.key==='ahab'&&!active(e);
export const remaining=e=>e.state?.gasharpoon?.ammo??0;
export const available=(e,slot)=>active(e)&&['q','r'].includes(slot)&&!e.state.gasharpoon[slot+'Used'];
const hitSound=slot=>({family:slot==='q'?'punch':'spear',element:'metal',slot,phase:'gasharpoon-'+(slot||'basic')+'-hit',cue:'impact',periodic:false});
function effect(g,e,type,values={}){g.effects.push({type,source:e.id,theme:'ahab',x:e.x,y:e.y,angle:e.facing,life:.3,maxLife:.3,...values});}
export function end(g,e){
 const s=e.state?.gasharpoon;if(!s)return;
 if(s.channel)e.channelUntil=Math.min(e.channelUntil||0,g.time);
 delete e.state.gasharpoon;
 e.ammo=Math.min(g.ammoCap(e),s.normal.ammo);e.reloadProgress=s.normal.reloadProgress;e.qCd=Math.max(0,s.normal.qCd-(g.time-s.at));
 effect(g,e,'gasharpoonTransform',{life:.45,maxLife:.45});
}
function complete(g,e){const s=e.state.gasharpoon;if(s&&s.ammo===0&&s.qUsed&&s.rUsed&&!s.channel&&!s.volley&&!(s.burstUntil>g.time))end(g,e);}
export function begin(g,e){
 delete e.state.recastUntil;
 e.state.gasharpoon={at:g.time,until:g.time+P.duration,ammo:P.ammo,qUsed:false,rUsed:false,normal:{ammo:e.ammo,reloadProgress:e.reloadProgress,qCd:e.qCd}};
 e.ammo=P.ammo;e.reloadProgress=0;e.qCd=0;e.attackCd=0;
 effect(g,e,'gasharpoonTransform',{life:.65,maxLife:.65});g.emitSound('ultimate',e,{slot:'r',family:'phase',element:'metal',phase:'gasharpoon-transform'});
}
function cone(g,e,origin,dir,range,angle,damage,slot){
 for(const t of [...g.units])if(g.hostile(e,t)&&distance(origin,t)<=range+t.radius&&g.clearLine(origin,t)){
  const d=direction(origin,t);if(d.x*dir.x+d.y*dir.y+1e-8<Math.cos(angle/2))continue;
  const shield=g.shield(t),actual=g.deal(e,t,typeof damage==='function'?damage(t):damage,{sound:hitSound(slot)});
  if(slot==='q'&&actual+Math.max(0,shield-g.shield(t))>0&&t.alive)g.status(t,'stun',1,1,e);
 }
}
export function attack(g,e,point){
 const s=e.state.gasharpoon;if(!s||g.time>=s.until||s.ammo<=0||s.channel||s.volley)return false;
 const d=g.aim(e,point);g.cancelRecall(e);s.ammo--;e.ammo=s.ammo;e.reloadProgress=0;e.attackCd=P.interval;e.attackSerial=(e.attackSerial||0)+1;
 e.attackAt=e.lastAttackAt=g.time;e.attackFacing=e.facing=Math.atan2(d.y,d.x);e.revealedUntil=g.time+1.25;
 e.healingEvent={key:`gasharpoon-basic-${e.id}-${e.attackSerial}`,at:g.time};
 const volley=s.volley={at:g.time,angle:e.facing,index:0};
 const shot=i=>{
  if(e.state.gasharpoon!==s||!e.alive||g.time>=s.until)return;
  volley.index=i;e.attackAt=e.lastAttackAt=g.time;s.thrust={at:g.time,poseAt:volley.at,until:g.time+P.interval,angle:volley.angle,slot:'basic'};
  g.emitSound('swing',e,{family:'spear',element:'metal',damageKind:'basic',phase:'gasharpoon-thrust'});
  effect(g,e,'gasharpoonVolley',{angle:volley.angle,r:P.range,spread:P.angle,seed:e.attackSerial*P.hits+i,life:P.interval,maxLife:P.interval});
  g.action(e,'basic',()=>cone(g,e,e,d,P.range,P.angle,t=>72+t.maxHp*.02));
  if(i===P.hits-1){delete s.volley;complete(g,e);}
 };
 shot(0);for(let i=1;i<P.hits;i++)g.schedule(e,i*P.interval,()=>shot(i));return true;
}
export function cast(g,e,slot,point){
 if(!active(e)){if(slot!=='r')return false;begin(g,e);return true;}
 const s=e.state.gasharpoon;if(!available(e,slot)||s.channel||g.time>=s.until)return false;
 s[slot+'Used']=true;
 s.channel={slot,at:g.time,until:g.time+P.channel,angle:Math.atan2(point.y-e.y,point.x-e.x)};e.channelUntil=s.channel.until;
 effect(g,e,'gasharpoonCharge',{slot,angle:s.channel.angle,r:slot==='q'?P.qRange:Math.hypot(g.bounds.w,g.bounds.h),spread:slot==='q'?P.qAngle:0,life:P.channel,maxLife:P.channel});return true;
}
function fire(g,e,s,ch){
 const d={x:Math.cos(ch.angle),y:Math.sin(ch.angle)},origin={x:e.x,y:e.y};s.thrust={at:g.time,poseAt:ch.at,until:g.time+.24,angle:ch.angle,slot:ch.slot};
 g.emitSound('swing',e,{slot:ch.slot,family:'spear',element:'metal',phase:'gasharpoon-thrust'});
 if(ch.slot==='q'){
  s.burstUntil=g.time+P.qEvery*2;
  for(let i=0;i<3;i++)g.schedule(e,i*P.qEvery,()=>{if(e.state.gasharpoon!==s||g.time>=s.until)return;g.action(e,'skill',()=>cone(g,e,origin,d,P.qRange,P.qAngle,60,'q'));effect(g,e,'gasharpoonShock',{...origin,angle:ch.angle,r:P.qRange,spread:P.qAngle,life:.3,maxLife:.3});if(i===2){s.burstUntil=0;complete(g,e);}});
 }else{
  s.bladeMissingUntil=g.time+.45;
  // Twice the map diagonal covers every champion along this ray and still
  // expires beyond the map. Non-champions and terrain never stop the harpoon.
  g.projectiles.push({source:e,damageKind:'skill',slot:'r',theme:'ahab',gasharpoon:true,bornAt:g.time,origin,...origin,dx:d.x,dy:d.y,damage:200,remaining:Math.hypot(g.bounds.w,g.bounds.h)*2,width:P.projectileWidth,speed:P.projectileSpeed,pierce:Infinity,ignoreTerrain:true,championsOnly:true,hitIds:new Set(),sound:hitSound('r'),
   beforeHit:(t,p)=>{p.damage=200+Math.max(0,t.maxHp-t.hp)*.1;p.lastShield=g.shield(t);},
   onHit:(t,p,actual)=>{if((actual>0||p.lastShield>g.shield(t))&&t.alive&&t.hp/t.maxHp<.1&&!(t.invulnerableUntil>g.time)&&!t.state?.posthumous&&!(g.training&&t===g.player&&g.practice.invincible))g.kill(t,e);},
  });
 }
}
export function tick(g,e){
 const s=e.state?.gasharpoon;if(!s)return;
 if(!e.alive||g.time+1e-8>=s.until){end(g,e);return;}
 e.ammo=s.ammo;e.reloadProgress=0;
 const ch=s.channel;if(ch){
  if(g.stat(e,'stun')||g.stat(e,'silence')||e.motion?.forced||e.channelUntil+1e-8<ch.until){delete s.channel;e.channelUntil=Math.min(e.channelUntil||0,g.time);complete(g,e);return;}
  if(g.time+1e-8>=ch.until){delete s.channel;g.action(e,'skill',()=>fire(g,e,s,ch));}
 }complete(g,e);
}
export function abilityInfo(g,e){
 if(!empowered(e))return{};
 return active(e)?{...GASHARPOON_SKILLS}:{ultimate:GASHARPOON_NAME,rText:GASHARPOON_TEXT};
}
