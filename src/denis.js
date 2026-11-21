import {DENIS as P,DENIS_ROUNDS} from './denis-data.js';
export const roundColor=round=>Object.values(DENIS_ROUNDS).find(r=>r.key===round)?.color||'#e6cd77';
export function init(g,e){if(e.key!=='denis')return;e.state.denisStocks??=P.qStocks;e.state.denisStockReady??=Infinity;}
export function charges(g,e){init(g,e);return{current:e.state.denisStocks,max:P.qStocks,remaining:e.state.denisStocks<P.qStocks?Math.max(0,e.state.denisStockReady-g.time):0};}
export const validate=(g,e,slot,p,options={})=>slot!=='q'||!e.state.denisRound&&charges(g,e).current>0&&Boolean(DENIS_ROUNDS[options.direction]);
export function cancelCharge(e){delete e.state.denisCharge;}
const blocked=(g,e)=>!e.alive||g.hidden(e)||g.stat(e,'stun')||g.stat(e,'disarm')||e.motion||e.recall;
function animation(g,e,d,slot){e.attackAt=e.lastAttackAt=g.time;e.attackSerial=(e.attackSerial||0)+1;e.attackFacing=e.facing=Math.atan2(d.y,d.x);e.revealedUntil=g.time+1.25;e.state.denisShot={at:g.time,heavy:slot==='r'};g.cancelRecall(e);}
function burning(g,e,t,damage,strong){
 if(!t.alive||t.returning||g.debuffImmune(t))return;
 t.denisBurns??={};const old=t.denisBurns[e.id],until=g.time+(strong?4:2);
 t.denisBurns[e.id]={source:e,damage,until:Math.max(old?.until||0,until),next:old?.next>g.time?old.next:g.time+.4};g.triggerDisrupt(e,t);
}
function roundHit(g,e,t,round,power,strong){
 if(!t.alive||g.debuffImmune(t))return;
 if(round==='ice'){g.status(t,'slow',.5,2,e);t.visuals??={};t.visuals.denisIce=g.time+2;if(strong){g.status(t,'stun',1,1,e);g.effects.push({type:'denisCold',source:e.id,target:t.id,x:t.x,y:t.y,life:.65,maxLife:.65});}}
 if(round==='fire')burning(g,e,t,35+power*120,strong);
 if(round==='armor'){g.deal(e,t,12,{fixed:true,proc:false,augmentOrigin:'denisRound'});if(strong){g.status(t,'weak',.3,3,e);g.status(t,'armorWeak',.3,3,e);}}
}
export function fire(g,e,point,round,volley,heavy=false){
 const d=g.aim(e,point),power=g.powerScale(e)*(1-g.powerWeak(e));animation(g,e,d,heavy?'r':'basic');
 if(!heavy)g.emitSound('shot',e,{phase:'denis-basic',family:'rifle'});
 const shields=new Map();
 g.bullet(e,d,heavy?P.rDamage:P.damage,heavy?P.rRange:g.attackRange(e),{speed:heavy?32:28,width:heavy?.28:.11,lca:!heavy,denisShot:true,denisRound:round,denisShock:heavy,color:heavy&&!round?'#f7fbff':roundColor(round),championsOnly:heavy,pierce:!heavy&&round==='armor'?Infinity:0,sound:{family:'rifle',phase:heavy?'denis-shock-hit':'denis-basic-hit'},beforeHit:t=>shields.set(t.id,g.shield(t)),onHit:(t,p,actual)=>{
  if(actual+Math.max(0,(shields.get(t.id)||0)-g.shield(t))<=0)return;
  let count=0;if(volley){count=volley.hits[t.id]=(volley.hits[t.id]||0)+1;if(count===P.hits)g.addBuff(e,'denisReload',P.reloadDuration);}
  // Each piercing projectile visits every target once; thresholds are per target.
  roundHit(g,e,t,round,power,heavy||count>=P.hits);
  if(heavy){g.changeAmmo(e,g.ammoCap(e),{external:false});e.denisReady=g.time;}
 }});
}
export function attack(g,e,point){
 if(e.state.denisBurst||e.ammo<1)return false;
 if(e.state.denisCharge){e.state.denisCharge.aim={...point};return false;}
 g.cancelRecall(e);
 if(e.ammo>=2&&!(e.denisReady>g.time)){e.state.denisCharge={at:g.time,aim:{...point}};e.lastAttackAt=g.time;return true;}
 const round=e.state.denisRound;delete e.state.denisRound;e.ammo--;e.attackCd=P.interval;fire(g,e,point,round);return true;
}
export function release(g,e,point){
 const c=e.state.denisCharge;if(e.key!=='denis'||!c)return false;cancelCharge(e);
 if(blocked(g,e)||e.ammo<1)return false;
 const round=e.state.denisRound;delete e.state.denisRound;
 const burst=g.time-c.at+1e-8>=P.charge&&e.ammo>=2&&!(e.denisReady>g.time),count=burst?Math.floor(e.ammo):1;e.ammo-=count;e.attackCd=P.interval;
 if(burst){e.denisReady=g.time+P.passiveCooldown;const v={left:count-1,next:g.time+P.burstEvery,round,hits:{},aim:{...(point||c.aim)}};e.state.denisBurst=v;g.action(e,'basic',()=>fire(g,e,point||c.aim,round,v));if(!v.left)delete e.state.denisBurst;}
 else g.action(e,'basic',()=>fire(g,e,point||c.aim,round));
 return true;
}
export function cast(g,e,slot,p,d,options={}){
 if(slot==='q'){const round=DENIS_ROUNDS[options.direction];if(!round)return false;init(g,e);e.state.denisStocks--;if(!Number.isFinite(e.state.denisStockReady))e.state.denisStockReady=g.time+g.cooldown(e,'q');e.state.denisRound=round.key;g.changeAmmo(e,1,{external:false});e.qCd=0;g.emitSound('reload',e,{slot:'q',phase:'denis-load',family:'rifle'});return true;}
 cancelCharge(e);const round=e.state.denisRound;delete e.state.denisRound;fire(g,e,p,round,null,true);return true;
}
export function tick(g,e){
 if(e.key!=='denis')return;init(g,e);
 while(e.state.denisStocks<P.qStocks&&e.state.denisStockReady<=g.time+1e-8){e.state.denisStocks++;e.state.denisStockReady=e.state.denisStocks<P.qStocks?e.state.denisStockReady+g.cooldown(e,'q'):Infinity;}
 const c=e.state.denisCharge;if(c){if(blocked(g,e))cancelCharge(e);else{e.lastAttackAt=g.time;if(e.player)c.aim={...g.input.aim};else if(g.time-c.at>=P.charge)release(g,e,c.aim);}}
 const v=e.state.denisBurst;if(!v)return;if(blocked(g,e)){delete e.state.denisBurst;return;}
 while(v.left>0&&v.next<=g.time+1e-8){v.left--;v.next+=P.burstEvery;g.action(e,'basic',()=>fire(g,e,e.player?g.input.aim:v.aim,v.round,v));e.attackCd=P.interval;}
 if(!v.left){e.state.denisExpressionUntil=g.time+.18;delete e.state.denisBurst;}
}
export function tickBurn(g,t){
 const burns=t.denisBurns||{};for(const [id,b]of Object.entries(burns)){while(t.alive&&!t.returning&&b.next<=Math.min(g.time,b.until)+1e-8){b.next+=.4;g.deal(b.source,t,b.damage,{fixed:true,proc:false,augmentOrigin:'denisBurn'});}if(!t.alive||t.returning||b.next>b.until+1e-8)delete burns[id];}
}
