import{rudolphWeaponProgress}from'./rudolph-weapon.js';

// Rendering may use a resting stance without changing the simulation's aim.
export const DEFAULT_STANCE={bodyFacing:0,weaponFacing:0};
const degree=Math.PI/180;
export const STANCE_ANGLES={jamila:-11*degree,rudolph:-11*degree,gubo:-11*degree,dongrang:-11*degree,meursault:-7*degree,outis:-7*degree,yi:11*degree,marton:11*degree,nelly:11*degree,alisa:11*degree,sinclair:11*degree,starbuck:-Math.PI/2,sora:Math.PI/2,soraEgo:11*degree};
export function restingStance(g,e,facing=0){const key=e.key==='sora'&&g.buff?.(e,'soraEgo')?'soraEgo':e.key,angle=STANCE_ANGLES[key]||0;return{bodyFacing:facing,weaponFacing:Math.cos(facing)<0?Math.PI-angle:angle};}
export function combatPoseActive(g,e){
 const s=e.state||{},attackAge=g.time-(e.attackAt??-99),castAge=g.time-(e.visualCast?.at??-99);
 return Boolean(g.mobileAim||g.input?.fire||attackAge>=0&&attackAge<.3||castAge>=0&&castAge<.5||e.motion?.actionKind||e.channelUntil>g.time||s.donCharge||s.hohenCharge||s.yanCharge||s.chargeAt!==undefined||s.jamilaQ||s.swordGrab||s.ahabUlt||rudolphWeaponProgress(g,e)>.001);
}
export function basicStance(g,e){
 if(e.previewStance)return restingStance(g,e);
 if(!g.mobileInput||e!==g.player||!e.alive||!Math.hypot(g.input.x,g.input.y)||combatPoseActive(g,e))return null;
 const bodyFacing=Math.abs(g.input.x)>.05?(g.input.x<0?Math.PI:0):(e.mobileMoveFacing??0);
 return restingStance(g,e,bodyFacing);
}
export const bodyFacing=(g,e)=>basicStance(g,e)?.bodyFacing??e.facing??(e.team?Math.PI:0);

// Use the actual displacement, including collision, dashes and teleports.
export function captureMobileAim(g){
 if(!g.mobileInput||!g.player||!g.input.aim||g.player.state?.infiltration?.phase==='selecting')return null;
 if(Math.abs(g.input.x)>.05)g.player.mobileMoveFacing=g.input.x<0?Math.PI:0;
 const length=Math.hypot(g.input.x,g.input.y);if(length>.01)g.player.mobileMoveDirection={x:g.input.x/length,y:g.input.y/length};
 return {point:g.input.aim,x:g.player.x,y:g.player.y};
}
export function followMobileAim(g,from){
 if(!from)return;
 if(from.point===g.input.aim){const target=g.units.find(t=>t.id===g.mobileAim?.autoTarget);if(target?.alive&&!g.hidden(target)&&g.visibleTo(g.player.team,target)){g.input.aim.x=target.x;g.input.aim.y=target.y;}else if(!g.mobileAim?.autoTarget){g.input.aim.x+=g.player.x-from.x;g.input.aim.y+=g.player.y-from.y;}}
 from.x=g.player.x;from.y=g.player.y;from.point=g.input.aim;
}
