import { FRAMES,loadAtlas,visualForm } from './art.js';
import { leapLift,levitationLift,feetOffset } from './projection-25d.js';

// Shaft extensions are geometric slices of the latest source art. The metal
// heads keep their source shape and size; only the handle interval gains length.
export const HANDLE_EXTENSIONS={
 donLance:{from:0,to:.245,scale:3.2},
 sinclairHalberd:{from:.13,to:.62,scale:1.8},
 starbuckHarpoon:{from:.075,to:.34,scale:2},
 hongluGlaive:{from:.025,to:.45,scale:1.25},
};
export const WEAPON_ART={
 yi:['yiDagger',1.15],faust:['faustSword',2.2],sinclair:['sinclairHalberd',2.45],meursault:['meursaultFist',.78],
 don:['donLance',2.35],ryoshu:['ryoshuSword',2.1],honglu:['hongluGlaive',2.65],heathcliff:['heathcliffBat',1.95],ishmael:['ishmaelMace',2.05],
 rodya:['rodyaAxe',2.05],outis:['outisFalcata',1.85],gregor:['gregorClaw',2.05],gubo:['guboRifle',2.4],gahwan:['gahwanSword',2.55],nelly:['nellyKnife',1.1],ahab:['ahabHarpoon',2.65],
 myo:['myoDagger',1.45],rudolph:['rudolphStaff',2.5],dongbaek:['dongbaekFan',1.5],dongrang:['dongrangScythe',2.1],
 hohenheim:['hohenheimStaff',2.6],alisa:['alisaClub',1.75],marton:['martonHammer',2.4],queequeg:['queequegHarpoon',2.25],starbuck:['starbuckHarpoon',2.45],kim:['kimSword',2.35],ppui:['ppuiHand',.48],sora:['soraFists',.84*.75],yan:['yanSword',3],
};
export const MIDDLE_GRIP=new Set(['starbuck','don','sinclair','honglu','dongrang','hohenheim','marton','rudolph']);
export const gripPivot=key=>MIDDLE_GRIP.has(key)?.25:.12;
// Aim stays in a 180-degree arc; crossing behind flips the local X axis.
export function weaponOrientation(angle){const x=Math.cos(angle),y=Math.sin(angle);return {flip:x<-1e-10?-1:1,angle:Math.atan2(y,Math.abs(x))};}
export function orientWeapon(c,angle){const pose=weaponOrientation(angle);c.scale(pose.flip,1);c.rotate(pose.angle);return pose;}
export const SORA_CLAW_LENGTH=1.65*.8;
export const ISHMAEL_SHIELD_LENGTH=.38;
export const EMISSION_ANCHORS={gubo:[.99,.32],rudolph:[.94,.48]};
// Anatomical hands in crown-to-sole world units, independent of hair/ornaments.
export const HAND_ANCHORS={yan:[-.29,-.78],sora:[-.3,-.78],kim:[-.34,-.75],ppui:[-.29,-.8],starbuck:[-.32,-.8],yi:[-.28,-.8],faust:[-.29,-.8],ryoshu:[-.29,-.8],don:[-.29,-.8],meursault:[-.33,-.8],honglu:[-.3,-.8],heathcliff:[-.33,-.8],ishmael:[-.31,-.8],rodya:[-.32,-.8],sinclair:[-.28,-.8],outis:[-.29,-.8],gregor:[-.31,-.8],dongbaek:[-.34,-.8],dongrang:[-.36,-.8],ahab:[-.43,-.8],queequeg:[-.4,-.8],nelly:[-.3,-.8],gubo:[-.33,-.8],gahwan:[-.3,-.8],hohenheim:[-.32,-.8],alisa:[-.3,-.8],marton:[-.34,-.8],myo:[-.3,-.8],rudolph:[-.32,-.8]};
export function spriteOrigin(g,e,extraLift=0){return {x:e.x,y:e.y+.3+Math.sin(g.time*3+e.id)*.025-leapLift(e)-extraLift};}
export function equipmentPose(g,e,extraLift=levitationLift(g,e)){
 const origin=spriteOrigin(g,e,extraLift),f=FRAMES[visualForm(g,e)],facing=e.facing??(e.team?Math.PI:0),flip=(Math.cos(facing)<0)!==Boolean(f?.mirror)?-1:1,[x,y]=HAND_ANCHORS[e.key]||[-.3,-.8];
 const age=g.time-(e.attackAt??-99),attacking=age>=0&&age<.3,style=g.attackStyle(e),slash=['slash','sweep'].includes(style),swing=age/.3,side=(e.attackSerial||0)%2?1:-1;
 let angle=attacking?(e.attackFacing??facing):facing;
 if(slash&&attacking)angle+=e.key==='honglu'?swing*Math.PI*2:(swing-.5)*2.25*side;
 if(e.state.donCharge)angle=facing;
 if(e.state.donThrust&&g.time-e.state.donThrust.at<.24)angle=e.state.donThrust.angle;
 if(e.key==='starbuck'&&(e.motion?.kind==='leap'&&e.motion.elapsed/Math.max(.01,e.motion.minDuration)>.5||g.time-(e.state.starbuckLandedAt??-99)<.22))angle=Math.PI/2;
 return {origin,right:{x:origin.x+x*flip,y:origin.y+y},left:{x:origin.x-x*flip,y:origin.y+y},angle,age,attacking,slash,swing,flip,facing};
}
export function groundStrikePose(p,length,pivot,age,{impact=.11,recovery=.19,depth=.2,head=.9}={}){
 const down=Math.max(0,Math.min(1,age/impact)),recover=Math.max(0,Math.min(1,(age-impact)/recovery));
 const headY=p.origin.y-1.1+(1.1+depth)*down**2-.55*recover;
 return {hand:{x:p.right.x,y:headY-(head-pivot)*length},angle:Math.PI/2,headY};
}
export function ahabSlamPose(g,e,p){
 // Finish the fast strike before the scheduled return dash begins.
 const remaining=(e.state.ahabSlamAt??-99)-g.time;if(remaining>.13||remaining<=.01)return null;
 return groundStrikePose(p,WEAPON_ART.ahab[1],.12,.13-remaining,{impact:.1,recovery:.02,depth:.06,head:.99});
}
export function weaponEmissionPoint(g,e){
 if(!['gubo','rudolph'].includes(e.key))return null;
 const p=equipmentPose(g,e),[key,length]=WEAPON_ART[e.key],m=weaponGeometry(key,length),[u,v]=EMISSION_ANCHORS[e.key],thrust=p.attacking?Math.sin(p.swing*Math.PI)*.38:0;
 const x=m.span*(u-gripPivot(e.key))+thrust,y=(v-.5)*m.height*m.scale,pose=weaponOrientation(p.angle),c=Math.cos(pose.angle),s=Math.sin(pose.angle);
 return {x:p.right.x+pose.flip*(x*c-y*s),y:p.right.y+x*s+y*c};
}
export function weaponEmissionScreen(g,e,camera,origin=e){
 const tip=weaponEmissionPoint(g,e);if(!tip)return null;const at=camera.worldToScreen(origin,.075);
 return {x:at.x+(tip.x-e.x)*camera.scale,y:at.y+(tip.y-e.y-feetOffset(e))*camera.scale};
}
export function clawMotion(age){
 const phase=(start,sign)=>{const p=Math.max(0,Math.min(1,(age-start)/.12));return {angle:sign*Math.PI*2*p,active:age>=start&&age<start+.12};};
 return {left:phase(0,1),right:phase(.12,-1)};
}
export const myoFiring=(g,e)=>e.key==='myo'&&e.castSlot==='q'&&g.time-(e.castAt??-99)>=0&&g.time-e.castAt<.5;
export function drawBackEquipment(r,e,g,{lift=0}={}){
 if(e.key!=='myo'||myoFiring(g,e))return;
 const p=equipmentPose(g,e,lift),c=r.ctx;c.save();c.translate(p.origin.x,p.origin.y-.95);c.scale(p.flip,1);drawWeapon(c,'myoRifle',2.1,{x:.06,rotation:.95,pivot:.5});c.restore();
}
export function weaponGeometry(key,length){
 const f=FRAMES[key];if(!f)return null;const angle=f.rotation||0,baseW=f.w,baseH=f.h;
 const extension=HANDLE_EXTENSIONS[key],extra=extension?(extension.to-extension.from)*(extension.scale-1):0;
 const width=baseW*(1+extra),span=Math.abs(width*Math.cos(angle))+Math.abs(baseH*Math.sin(angle)),scale=length/(Math.abs(baseW*Math.cos(angle))+Math.abs(baseH*Math.sin(angle)));
 return {frame:f,angle,scale,width,height:baseH,span:span*scale,extension};
}
export function drawWeapon(c,key,length,{x=0,y=0,rotation=0,pivot=0}={}){
 const m=weaponGeometry(key,length);if(!m)return false;const f=m.frame,image=loadAtlas(f.sheet);if(!image.complete||!image.naturalWidth)return false;
 c.save();c.imageSmoothingEnabled=false;c.translate(x,y);c.rotate(rotation);c.translate((.5-pivot)*m.span,0);c.rotate(m.angle);c.scale(m.scale,m.scale);
 let dx=-m.width/2;
 if(m.extension){
  const e=m.extension,a=Math.round(f.w*e.from),b=Math.round(f.w*e.to),segments=[[0,a,1],[a,b-a,e.scale],[b,f.w-b,1]];
  for(const [sx,w,factor] of segments){if(w>0)c.drawImage(image,f.x+sx,f.y,w,f.h,dx,-f.h/2,w*factor,f.h);dx+=w*factor;}
 }else c.drawImage(image,f.x,f.y,f.w,f.h,dx,-f.h/2,f.w,f.h);
 c.restore();return true;
}
export function drawEquipment(r,e,g,{lift=0}={}){
 const c=r.ctx,entry=WEAPON_ART[e.key];if(!entry)return false;
 if(e.key==='yan'&&g.buff(e,'yanDistorted')||e.key==='kim'&&e.state.swordGrab?.until>g.time)return true;
 const p=equipmentPose(g,e,lift),{attacking,age,slash}=p;
 const held=(key,length,hand=p.right,angle=p.angle,pivot=gripPivot(e.key),{thrust=0,trail=slash&&attacking,part='weapon'}={})=>{
  const m=weaponGeometry(key,length);if(!m)return;
  c.save();c.translate(hand.x,hand.y);orientWeapon(c,angle);c.translate(thrust,0);drawWeapon(c,key,length,{pivot});
  r.weaponTrail(e,g,part,{x:m.span*(.25-pivot),y:0},{x:m.span*(1-pivot),y:0},trail);c.restore();
 };
 if(e.key==='sora'&&!g.buff(e,'soraEgo')){
  // Keep the existing central cuff pivot and raised slam, following body Z.
  const slam=attacking?Math.sin(Math.min(1,age/.18)*Math.PI)*1.25:0;
  c.save();c.translate(e.x,p.origin.y-.75-slam);orientWeapon(c,p.angle);c.translate(.18+(attacking?Math.sin(p.swing*Math.PI)*.22:0),0);drawWeapon(c,'soraFists',entry[1],{pivot:.5});c.restore();
 }else if(e.key==='sora'){
  const claws=clawMotion(age),facing=(attacking?e.attackFacing:undefined)??p.facing;held('soraClawLeft',SORA_CLAW_LENGTH,p.left,facing+claws.left.angle,.12,{trail:claws.left.active,part:'claw-left'});
  held('soraClawRight',SORA_CLAW_LENGTH,p.right,facing+claws.right.angle,.12,{trail:claws.right.active,part:'claw-right'});
 }else if(e.key==='ppui'){
  held('ppuiHand',entry[1],p.right,p.facing,.12,{trail:false,part:'palm-right'});held('ppuiHand',entry[1],p.left,p.facing,.12,{trail:false,part:'palm-left'});
 }else if(e.key==='meursault'){
  for(const [hand,start,part] of [[p.right,0,'fist-right'],[p.left,.1,'fist-left']]){const t=(age-start)/.1,active=t>=0&&t<1;held('meursaultFist',.8,hand,(attacking?e.attackFacing:undefined)??p.facing,.12,{thrust:active?Math.sin(t*Math.PI)*.65:0,trail:active,part});}
 }else if(e.key==='myo'){
  if(myoFiring(g,e))held('myoRifle',2.15,p.right,p.facing,.32,{trail:false});
  else if(g.buff(e,'rabbitFrenzy')){held('myoDagger',1.45,p.right,p.angle+Math.PI+.25,.12,{part:'dagger-right'});held('myoDagger',1.45,p.left,p.angle+Math.PI-.25,.12,{part:'dagger-left'});}
  else held('myoDagger',1.45,p.right,p.angle,.12);
 }else if(e.key==='ishmael'){
  // Shield follows the left hand/body only; its matrix never contains attack angle.
  held('ishmaelShield',ISHMAEL_SHIELD_LENGTH*(g.buff(e,'ishmaelShield')?1.35:1),{x:p.left.x,y:p.left.y+.14},0,.5,{trail:false,part:'shield'});
  const d=e.state.ishmaelCast?.d,angle=e.state.ishmaelCast?.windupUntil>g.time?Math.atan2(d.y,d.x):p.angle;held('ishmaelMace',2.05,p.right,angle,.12);
 }else if(e.key==='starbuck'&&e.motion?.kind==='leap'&&e.motion.elapsed/Math.max(.01,e.motion.minDuration)<=.5){
  return true;
 }else if(e.key==='marton'&&attacking&&e.state.martonGroundStrike===e.attackSerial){
  const strike=groundStrikePose(p,entry[1],gripPivot(e.key),age);c.save();c.beginPath();c.rect(p.origin.x-8,p.origin.y-10,16,10.02);c.clip();held(entry[0],entry[1],strike.hand,strike.angle,undefined,{trail:false});c.restore();
 }else if(e.key==='ahab'&&ahabSlamPose(g,e,p)){
  const strike=ahabSlamPose(g,e,p);c.save();c.beginPath();c.rect(p.origin.x-8,p.origin.y-10,16,10.02);c.clip();held(entry[0],entry[1],strike.hand,strike.angle,undefined,{trail:false});c.restore();
 }else if(e.key==='ahab'&&attacking&&!e.state.ahabUlt){
  return true;
 }else{
  let angle=p.angle,thrust=!slash&&attacking?Math.sin(p.swing*Math.PI)*.38:0;
  if(e.key==='yan'){const progress=e.state.yanCharge?.progress/1.5||0;angle=p.facing-(e.state.yanCharge?.65*progress:attacking?(.3-age)*3:0);}
  if(e.key==='don'&&g.time-(e.state.donThrust?.at??-99)<.24)thrust=Math.sin((g.time-e.state.donThrust.at)/.24*Math.PI)*.8;
  held(entry[0],entry[1]*(e.key==='nelly'&&attacking?1.5:1),p.right,angle,undefined,{thrust});
 }
 return true;
}
