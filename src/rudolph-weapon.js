const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export const RUDOLPH_WEAPON={extend:.10,retract:.14,reach:.225};
export function rudolphWeaponProgress(g,e){
 const pose=e.state?.rudolphWeapon;if(!pose)return 0;
 if(pose.stop!==undefined)return pose.stopFrom*(1-smooth((g.time-pose.stop)/RUDOLPH_WEAPON.retract));
 return pose.from+(1-pose.from)*smooth((g.time-pose.at)/RUDOLPH_WEAPON.extend);
}
export function startRudolphWeapon(g,e){
 const old=e.state.rudolphWeapon;
 if(!old||old.stop!==undefined||g.time-old.last>g.attackInterval(e)*1.3)e.state.rudolphWeapon={at:g.time,last:g.time,from:rudolphWeaponProgress(g,e)};
 else old.last=g.time;
}
export function tickRudolphWeapon(g,e){
 const pose=e.state.rudolphWeapon;if(!pose||pose.stop!==undefined)return;
 const active=e.alive&&e.ammo>0&&!g.stat(e,'stun')&&!g.stat(e,'disarm')&&!(e.channelUntil>g.time)&&g.time-pose.last<=g.attackInterval(e)*1.3&&(!e.player||g.input.fire);
 if(!active){pose.stopFrom=rudolphWeaponProgress(g,e);pose.stop=g.time;}
}
