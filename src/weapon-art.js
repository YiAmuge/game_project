import { FRAMES,loadAtlas,visualForm } from './art.js';
import { leapLift,levitationLift,feetOffset } from './projection-25d.js';
import { drawGripHands } from './weapon-grips.js';

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
 myo:['myoDagger',1.45],rudolph:['rudolphStaff',2.5],dongbaek:['dongbaekFan',1.5],dongrang:['dongrangScythe',2.1*1.5],
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
export function guboWeaponPose(g,e,camera,p=equipmentPose(g,e)){
 // Keep the rifle on the anatomical hand, with the shared basic attack push.
 return {hand:p.right,angle:p.angle,thrust:p.attacking?Math.sin(p.swing*Math.PI)*.38:0};
}
export function weaponEmissionPoint(g,e,camera){
 if(!['gubo','rudolph'].includes(e.key))return null;
 const p=equipmentPose(g,e),shot=e.key==='gubo'?guboWeaponPose(g,e,camera,p):{hand:p.right,angle:p.angle},[key,length]=WEAPON_ART[e.key],m=weaponGeometry(key,length),[u,v]=EMISSION_ANCHORS[e.key],thrust=shot.thrust??(p.attacking?Math.sin(p.swing*Math.PI)*.38:0);
 const x=m.span*(u-gripPivot(e.key))+thrust,y=(v-.5)*m.height*m.scale,pose=weaponOrientation(shot.angle),c=Math.cos(pose.angle),s=Math.sin(pose.angle);
 return {x:shot.hand.x+pose.flip*(x*c-y*s),y:shot.hand.y+x*s+y*c};
}
export function weaponEmissionScreen(g,e,camera,origin=e){
 const tip=weaponEmissionPoint(g,e,camera);if(!tip)return null;const at=camera.worldToScreen(origin,.075);
 return {x:at.x+(tip.x-e.x)*camera.scale,y:at.y+(tip.y-e.y-feetOffset(e))*camera.scale};
}
export function bodyOrbit(p,angle,radius=.65){
 return {x:p.origin.x+Math.cos(angle)*radius,y:p.origin.y-.8+Math.sin(angle)*radius};
}
export function soraOrbitPose(e,p){
 const facing=(p.attacking?e.attackFacing:undefined)??p.facing,angle=facing+p.swing*Math.PI*2,radius=.9+.2*Math.sin(Math.max(0,Math.min(1,p.swing))*Math.PI);
 return p.attacking?{left:{hand:bodyOrbit(p,angle+Math.PI,radius),angle:facing+Math.PI},right:{hand:bodyOrbit(p,angle,radius),angle:facing},active:true}:{left:{hand:p.left,angle:facing},right:{hand:p.right,angle:facing},active:false};
}
export function outisSpinPose(g,e,p){
 const age=g.time-(e.state.outisSpinAt??-99);if(age<0||age>=.4)return null;
 const angle=(e.state.outisSpinFacing??p.facing)+age/.4*Math.PI*2;return {hand:bodyOrbit(p,angle,.5),angle};
}
export function heathSlamPose(g,e,p){
 const m=e.motion,air=m?.kind==='leap'&&m.actionKind==='skill',after=g.time-(e.state.heathSlamAt??-99),charging=e.state.chargeAt!==undefined;
 if(!charging&&!air&&(after<0||after>=.18))return null;
 const duration=air?Math.max(.01,m.minDuration||0,m.total/m.speed):0,window=Math.min(.14,duration*.6),swing=air?Math.max(0,Math.min(1,1-(duration-m.elapsed)/window)):charging?0:1;
 const recover=!air&&!charging?Math.max(0,Math.min(1,(after-.04)/.14)):0,side=weaponOrientation(air?Math.atan2(m.dy,m.dx):e.state.heathSlamFacing??p.facing).flip,angle=-Math.PI/2+side*Math.PI*swing**1.8;
 const hand={x:p.right.x,y:p.right.y+(p.origin.y+.06-WEAPON_ART.heathcliff[1]*.88-p.right.y)*swing**2};
 return {hand:{x:hand.x,y:hand.y+(p.right.y-hand.y)*recover},angle:angle+(p.facing-angle)*recover};
}
export function gregorThrust(g,e){
 const cast=e.visualCast,age=g.time-(cast?.at??-99);if(cast?.slot!=='q'||age<0||age>=.4)return null;
 const extend=age<.08?1-(1-age/.08)**3:age<.2?1:Math.max(0,1-(age-.2)/.2),range=6+(g.buff(e,'mutant')?2.5:0);
 return {angle:cast.angle,straighten:extend,length:WEAPON_ART.gregor[1]+(range-WEAPON_ART.gregor[1])*extend,thrust:.45*Math.sin(Math.min(1,age/.25)*Math.PI)};
}
export function gahwanSlash(g,e){
 const cast=e.visualCast,age=g.time-(cast?.at??-99);if(age<0)return null;
 const q=cast?.slot==='q',period=q?.13:.75,duration=q?.13:.24,count=q?5:3,index=Math.floor(age/period),phase=age-index*period;
 if(index>=count||phase>=duration)return null;
 return {angle:cast.angle+(phase/duration-.5)*2.5*(index%2?-1:1)*weaponOrientation(cast.angle).flip,part:`skill-${cast.slot}-${index}`};
}
export function yanWeaponAngle(e,p){
 const base=p.attacking?(e.attackFacing??p.facing):p.facing,progress=e.state.yanCharge?.progress/1.5||0,raise=e.state.yanCharge?.65*progress:p.attacking?Math.max(0,.3-p.age*2)*3:0;
 return base-weaponOrientation(base).flip*raise;
}
const GREGOR_SPINE=[[0,.61],[.12,.52],[.28,.4],[.45,.37],[.62,.43],[.76,.54],[.9,.76],[1,1]];
export function gregorCenterline(u){
 const i=Math.max(0,GREGOR_SPINE.findIndex(([x])=>x>=u)-1),a=GREGOR_SPINE[i],b=GREGOR_SPINE[i+1]||a;return a[1]+(b[1]-a[1])*(u-a[0])/Math.max(.001,b[0]-a[0]);
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
export function drawWeapon(c,key,length,{x=0,y=0,rotation=0,pivot=0,straighten=0}={}){
 const m=weaponGeometry(key,length);if(!m)return false;const f=m.frame,image=loadAtlas(f.sheet);if(!image.complete||!image.naturalWidth)return false;
 c.save();c.imageSmoothingEnabled=false;c.translate(x,y);c.rotate(rotation);c.translate((.5-pivot)*m.span,0);c.rotate(m.angle);c.scale(m.scale,m.scale);
 let dx=-m.width/2;
 if(key==='gregorClaw'&&straighten>0){
  c.scale(1,WEAPON_ART.gregor[1]/length);
  for(let sx=0;sx<f.w;sx+=3){const w=Math.min(3,f.w-sx),u=(sx+w/2)/f.w,bend=(gregorCenterline(u)-.5)*f.h*straighten;c.drawImage(image,f.x+sx,f.y,w,f.h,-f.w/2+sx,-f.h/2-bend,w+.15,f.h);}
 }else if(m.extension){
  const e=m.extension,a=Math.round(f.w*e.from),b=Math.round(f.w*e.to),segments=[[0,a,1],[a,b-a,e.scale],[b,f.w-b,1]];
  for(const [sx,w,factor] of segments){if(w>0)c.drawImage(image,f.x+sx,f.y,w,f.h,dx,-f.h/2,w*factor,f.h);dx+=w*factor;}
 }else c.drawImage(image,f.x,f.y,f.w,f.h,dx,-f.h/2,f.w,f.h);
 c.restore();return true;
}
export function drawEquipment(r,e,g,{lift=0,camera=r.camera}={}){
 const c=r.ctx,entry=WEAPON_ART[e.key];if(!entry)return false;
 if(e.key==='yan'&&g.buff(e,'yanDistorted')||e.key==='kim'&&e.state.swordGrab?.until>g.time)return true;
 const p=equipmentPose(g,e,lift),{attacking,age,slash}=p;
 const held=(key,length,hand=p.right,angle=p.angle,pivot=gripPivot(e.key),{thrust=0,trail=slash&&attacking,part='weapon',flipY=1,straighten=0}={})=>{
  const m=weaponGeometry(key,length);if(!m)return;
  c.save();c.translate(hand.x,hand.y);orientWeapon(c,angle);c.translate(thrust,0);if(flipY!==1)c.scale(1,flipY);drawGripHands(c,e.key,key,m,pivot,'back');drawWeapon(c,key,length,{pivot,straighten});drawGripHands(c,e.key,key,m,pivot,'front');
  r.weaponTrail(e,g,part,{x:m.span*(.25-pivot),y:0},{x:m.span*(1-pivot),y:0},trail);c.restore();
 };
 if(e.key==='gubo'){
  const shot=guboWeaponPose(g,e,camera,p);held(entry[0],entry[1],shot.hand,shot.angle,undefined,{thrust:shot.thrust,trail:false});
 }else if(e.key==='gregor'){
  const strike=gregorThrust(g,e);held(entry[0],strike?.length??entry[1],p.right,strike?.angle??p.angle,undefined,{flipY:-1,straighten:strike?.straighten||0,thrust:strike?.thrust||0,trail:!strike&&slash&&attacking});
 }else if(e.key==='gahwan'&&gahwanSlash(g,e)){
  const cut=gahwanSlash(g,e);held(entry[0],entry[1],p.right,cut.angle,undefined,{trail:true,part:cut.part});
 }else if(e.key==='outis'&&outisSpinPose(g,e,p)){
  const spin=outisSpinPose(g,e,p);held(entry[0],entry[1],spin.hand,spin.angle,undefined,{trail:true,part:'outis-spin'});
 }else if(e.key==='heathcliff'&&heathSlamPose(g,e,p)){
  const slam=heathSlamPose(g,e,p);held(entry[0],entry[1],slam.hand,slam.angle,undefined,{trail:true,part:'heath-slam'});
 }else if(e.key==='sora'&&!g.buff(e,'soraEgo')){
  // Keep the existing central cuff pivot and raised slam, following body Z.
  const slam=attacking?Math.sin(Math.min(1,age/.18)*Math.PI)*1.25:0;
  c.save();c.translate(e.x,p.origin.y-.75-slam);orientWeapon(c,p.angle);c.translate(.18+(attacking?Math.sin(p.swing*Math.PI)*.22:0),0);drawWeapon(c,'soraFists',entry[1],{pivot:.5});c.restore();
 }else if(e.key==='sora'){
  const orbit=soraOrbitPose(e,p),pivot=orbit.active?.5:.12;held('soraClawLeft',SORA_CLAW_LENGTH,orbit.left.hand,orbit.left.angle,pivot,{trail:orbit.active,part:'claw-left'});
  held('soraClawRight',SORA_CLAW_LENGTH,orbit.right.hand,orbit.right.angle,pivot,{trail:orbit.active,part:'claw-right'});
 }else if(e.key==='ppui'){
  held('ppuiHand',entry[1],p.right,p.facing,.12,{trail:false,part:'palm-right'});held('ppuiHand',entry[1],p.left,p.facing,.12,{trail:false,part:'palm-left'});
 }else if(e.key==='meursault'){
  for(const [hand,start,part] of [[p.right,0,'fist-right'],[p.left,.1,'fist-left']]){const t=(age-start)/.1,active=t>=0&&t<1;held('meursaultFist',.8,hand,(attacking?e.attackFacing:undefined)??p.facing,.12,{thrust:active?Math.sin(t*Math.PI)*.65:0,trail:active,part});}
 }else if(e.key==='myo'){
  if(myoFiring(g,e))held('myoRifle',2.15,p.right,p.facing,.32,{trail:false});
  else if(g.buff(e,'rabbitFrenzy')){const grip=attacking?0:Math.PI;held('myoDagger',1.45,p.right,p.angle+grip+.25,.12,{part:'dagger-right'});held('myoDagger',1.45,p.left,p.angle+grip-.25,.12,{part:'dagger-left'});}
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
  if(e.key==='yan')angle=yanWeaponAngle(e,p);
  if(e.key==='nelly'&&attacking)thrust=Math.sin(p.swing*Math.PI)*.6;
  if(e.key==='don'&&g.time-(e.state.donThrust?.at??-99)<.24)thrust=Math.sin((g.time-e.state.donThrust.at)/.24*Math.PI)*.8;
  held(entry[0],entry[1]*(e.key==='nelly'&&attacking?1.5:1),p.right,angle,undefined,{thrust,trail:slash&&attacking&&(e.key!=='yan'||age<.15)});
 }
 return true;
}
