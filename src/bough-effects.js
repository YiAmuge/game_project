
export const empowered=(e,key)=>Boolean(e?.goldenBough&&(!key||e.key===key));
export const convertsPower=e=>empowered(e,'ryoshu');
export const extraAmmo=e=>e.augments?.includes('magazine2')?2:0;
export const soleil=e=>empowered(e,'meursault');
export const pulseSteps=e=>Math.floor(Math.min(100,Math.floor((e.ppuiHealing||0)/1000))/10);
export const healthRate=()=>0;
export const powerRate=e=>!empowered(e)?0:e.key==='gubo'?Math.min(7,e.guboAllyKills||0)*.07:e.key==='rudolph'?Math.min(20,e.rudolphReturns||0)*.01:soleil(e)?extraAmmo(e)*.035:0;
export const armorMultiplier=e=>soleil(e)?1+extraAmmo(e)*.035:1;
export const nellyRate=(g,e)=>empowered(e,'nelly')&&e.state.boughNellyUntil>g.time?.15:0;
export const links=(g,e)=>empowered(e,'queequeg')?(e.state.tethers||[]).filter(v=>v.until>g.time&&g.units.some(t=>t.id===v.target&&t.alive)).length:0;
export const guard=(g,e)=>empowered(e,'maxim')&&Boolean(e.state.maximQ||e.state.boughMaximGuardUntil>g.time);
export const movableChannel=e=>empowered(e)&&(e.key==='kim'&&e.state.counter||e.key==='marton'&&e.state.fairy);
export const qCapacity=e=>empowered(e,'moses')?3:2;
export const permanentSora=e=>empowered(e,'sora')&&Boolean(e.state.soraPermanent);
export const soraValue=(e,value)=>permanentSora(e)?Math.round(value*100*.33)/100:value;
export const roundStat=(e,value)=>permanentSora(e)?1+Math.round((value-1)*100*.33)/100:value;
const contempt=(g,t)=>Object.values(t.state?.contempt||{}).some(until=>until>g.time);
export function finalMultiplier(g,source,target){
 let mult=1;
 if(empowered(source,'gahwan'))mult*=contempt(g,target)?.3:.65;
 if(empowered(target,'gahwan'))mult*=contempt(g,source)?.3:.65;
 if(guard(g,target))mult*=.5;
 return mult;
}
export const chargeSlot=e=>empowered(e)?['denis','starbuck'].includes(e.key)?'r':e.key==='ezra'?'q':null:null;
function stock(g,e){const slot=chargeSlot(e);if(!slot)return null;const all=e.state.boughStocks??={};return all[slot]??={current:2,ready:Infinity};}
export function charges(g,e,slot){
 if(slot!==chargeSlot(e))return null;const s=stock(g,e),gate=e.key==='starbuck'?Math.max(0,(e.boughStarbuckGate||0)-g.time):0;
 return{current:s.current,max:2,remaining:Math.max(gate,s.current?0:s.ready-g.time)};
}
function syncStock(g,e){const slot=chargeSlot(e);if(!slot)return;const c=charges(g,e,slot);e[slot+'Cd']=c.remaining;}
export function spend(g,e,slot){
 if(slot!==chargeSlot(e))return;const s=stock(g,e);if(s.current===2)s.ready=g.time+g.cooldown(e,slot);s.current=Math.max(0,s.current-1);if(e.key==='starbuck')e.boughStarbuckGate=g.time+3;syncStock(g,e);
}
export function purchase(g,e){
 if(chargeSlot(e)){stock(g,e);syncStock(g,e);}
 if(e.key==='moses'){e.state.mosesCharges=Math.min(3,(e.state.mosesCharges??2)+1);e.state.mosesAir=(e.state.mosesAir||0)+20;}
 if(e.key==='myo'){e.state.myoTacticalAmmo=g.ammoCap(e);e.state.myoTacticalReload=0;}
 if(e.key==='dongbaek'&&Number.isFinite(e.state.petalReady))e.state.petalReady=Math.min(e.state.petalReady,g.time+3);
 if(soleil(e)){e.ammo=Math.min(1,e.ammo);delete e.state.fistGrowth;delete e.state.fistGrowthUntil;}
}
export function onCast(g,e,slot){
 spend(g,e,slot);if(soleil(e)){delete e.state.soleilCharge;e.state.soleilGarde=true;}
}
export function afterDamage(g,e,t,total,kind,origin){
 if(!empowered(e)||e.team===t.team||total<=0||origin==='goldenBough')return;
 let ratio=0,drain=false;
 if(e.key==='dongrang'&&(kind==='basic'||e.castSlot==='r'&&kind==='skill'))ratio=Math.floor((e.totalHealingReceived||0)/5000)*.02;
 if(e.key==='marton'&&kind==='skill'&&e.castSlot==='r'&&e.state.boughMartonStrike){ratio=.2;drain=true;}
 if(ratio&&t.hp>0){const dealt=g.deal(e,t,total*ratio,{fixed:true,proc:false,damageKind:kind,augmentOrigin:'goldenBough'});if(drain)g.heal(e,e,dealt,false);}
}
export function onDeath(g,e){
 if(e.key==='rudolph'){e.boughRespawnReduction=empowered(e)?Math.min(20,e.rudolphReturns||0)*.025:0;e.rudolphReturns=0;}
}
export function tick(g,e,dt){
 if(e.kind!=='champion')return;
 const s=stock(g,e);if(s){const slot=chargeSlot(e);while(s.current<2&&s.ready<=g.time+1e-8){s.current++;s.ready=s.current<2?s.ready+g.cooldown(e,slot):Infinity;}syncStock(g,e);}
 if(!empowered(e))return;
 if(e.key==='ppui'&&e.state.boughPulseSteps!==pulseSteps(e)){e.state.boughPulseSteps=pulseSteps(e);g.refreshEquipment(e);}
 if(e.key==='myo'){
  const cap=g.ammoCap(e);e.state.myoTacticalAmmo=Math.min(cap,e.state.myoTacticalAmmo??cap);
  if(e.state.myoTacticalAmmo<cap){e.state.myoTacticalReload=(e.state.myoTacticalReload||0)+dt*g.reloadRate(e);const every=g.reloadInterval(e);while(e.state.myoTacticalReload+1e-8>=every&&e.state.myoTacticalAmmo<cap){e.state.myoTacticalReload-=every;e.state.myoTacticalAmmo++;}}
  else e.state.myoTacticalReload=0;
 }
}
