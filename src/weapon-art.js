import * as Nikolai from './nikolai.js';
import {MAXIM} from './maxim-data.js';
import {MAXIM_HEAD,maximHammerPoint,maximWeaponState,drawMaximCurrent} from './maxim-weapon.js';
import {maxLevel,storm} from './golden-bough.js';
import {MEI} from './mei-data.js';
import{GAHWAN}from'./gahwan.js';
import{mosesWeaponPose}from'./moses-vfx.js';
import{RULES}from'./data.js';
import*as Ezra from'./ezra.js';
import { FRAMES,loadAtlas,visualForm } from './art.js';
import { leapLift,levitationLift,feetOffset } from './projection-25d.js';
import { drawGripHands,gripSourcePoint,gripLayout } from './weapon-grips.js';
import{drawEzraDrillEffect}from'./ezra-weapon-vfx.js';
import { carried } from './attachments.js';
import { rudolphWeaponProgress,RUDOLPH_WEAPON } from './rudolph-weapon.js';
import{basicStance,bodyFacing,restingStance,combatPoseActive}from'./champion-pose.js';
import { HEATH } from './heathcliff.js';

// Shaft extensions are geometric slices of the latest source art. The metal
// heads keep their source shape and size; only the handle interval gains length.
export const HANDLE_EXTENSIONS={
 donLance:{from:0,to:.245,scale:3.2},
 sinclairHalberd:{from:.13,to:.62,scale:1.8},
 starbuckHarpoon:{from:.075,to:.34,scale:2},
 hongluGlaive:{from:.025,to:.45,scale:1.25},
};
export const MEI_FIST_SIZE=.36*1.2;
export const WEAPON_ART={
 denis:['denisRifle',2.7],
 nikolai:['nikolaiSaber',2.55],
 maxim:['maximHammer',2.35],
 mei:['meiRightFist',MEI_FIST_SIZE],
 moses:['mosesPipe',1.05],ezra:['ezraGlove',.483],
 queen:['queenWand',2.1],nosferatu:['nosWine',.43],
 kromer:['kromerNail',2.45],
 jamila:['jamilaRifle',2.25],
 yi:['yiDagger',1.15],faust:['faustSword',2.2],sinclair:['sinclairHalberd',2.45],meursault:['meursaultFist',.78],
 don:['donLance',2.35],ryoshu:['ryoshuSword',2.1],honglu:['hongluGlaive',2.65],heathcliff:['heathcliffBat',1.95],ishmael:['ishmaelMace',2.05],
 rodya:['rodyaAxe',2.05],outis:['outisFalcata',2],gregor:['gregorClaw',2.05],gubo:['guboRifle',2.4],gahwan:['gahwanSword',2.55],nelly:['nellyKnife',1.1],ahab:['ahabHarpoon',2.65],
 myo:['myoDagger',1.45],rudolph:['rudolphStaff',2.5],dongbaek:['dongbaekFan',1.5],dongrang:['dongrangScythe',2.1*1.5],
 hohenheim:['hohenheimStaff',2.6],alisa:['alisaClub',1.75],marton:['martonHammer',2.4],queequeg:['queequegHarpoon',2.25],starbuck:['starbuckHarpoon',2.45],kim:['kimSword',2.35],ppui:['ppuiHand',.48],sora:['soraFists',.84*.75],yan:['yanSword',3],
};
export const MIDDLE_GRIP=new Set(['starbuck','don','sinclair','honglu','dongrang','hohenheim','marton','rudolph']);
export const gripPivot=key=>key==='denis'?.27:key==='nikolai'?.09:key==='maxim'?.17:key==='moses'?.30:key==='queen'?.42:key==='jamila'?.238:key==='kromer'?.11:MIDDLE_GRIP.has(key)?.25:.12;
export function equippedWeapon(g,e){
 if(e.key==='ahab'&&e.state.gasharpoon)return [e.state.gasharpoon.bladeMissingUntil>g.time?'ahabGasArmEmpty':'ahabGasArm',2.6,FRAMES.ahabGasArm.grip[0]];
 if(e.key==='ezra'){const index=e.state.ezraAttack?.until>g.time?e.state.ezraAttack.weapon:Ezra.currentIndex(g,e),w=Ezra.weapon(g,e,index);return [w.asset,w.length,w.pivot];}
 if(e.key==='ryoshu'&&e.goldenBough&&(e.arayashikiWeapon||g.zones.some(z=>z.kind==='arayashiki'&&z.source===e&&!z.posthumous&&z.until>g.time)))return ['ryoshuArayashiki',2.1,.15];
 const base=WEAPON_ART[e.key];if(!base)return null;
 if(e.key==='nosferatu'&&g.buff(e,'bloodfiend'))return ['bloodClawRight',1.15,.08];
 if(e.alive&&e.key==='don'&&(g.buff(e,'donLifesteal')||e.motion?.actionTag==='donR'))return ['donBloodLance',weaponGeometry(base[0],base[1]).span,.12];
 if(e.alive&&e.key==='heathcliff'&&g.buff(e,'heathUlt'))return ['heathBloodSack',2.6,.045];
 return [...base,gripPivot(e.key)];
}
// Aim stays in a 180-degree arc; crossing behind flips the local X axis.
export function weaponOrientation(angle){const x=Math.cos(angle),y=Math.sin(angle);return {flip:x<-1e-10?-1:1,angle:Math.atan2(y,Math.abs(x))};}
export function orientWeapon(c,angle){const pose=weaponOrientation(angle);c.scale(pose.flip,1);c.rotate(pose.angle);return pose;}
export const SORA_CLAW_LENGTH=1.65*.8*.88;
export const ISHMAEL_SHIELD_LENGTH=.38;
export const EMISSION_ANCHORS={denis:[.77,.31],gubo:[.99,.32],rudolph:[.94,.48],myo:[.995,.50],jamila:[.99,.23]};
// Anatomical hands in crown-to-sole world units, independent of hair/ornaments.
export const HAND_ANCHORS={denis:[-.30,-.82],nikolai:[-.29,-.88],maxim:[-.32,-.88],mei:[-.43,-.94],moses:[-.30,-.75],ezra:[-.30,-.72],queen:[-.35,-.88],nosferatu:[-.35,-.7],kromer:[-.30,-.78],jamila:[-.29,-.57],yan:[-.29,-.78],sora:[-.3,-.78],kim:[-.34,-.75],ppui:[-.29,-.8],starbuck:[-.32,-.8],yi:[-.28,-.8],faust:[-.29,-.8],ryoshu:[-.29,-.8],don:[-.29,-.8],meursault:[-.33,-.8],honglu:[-.3,-.8],heathcliff:[-.33,-.8],ishmael:[-.31,-.8],rodya:[-.32,-.8],sinclair:[-.28,-.8],outis:[-.29,-.8],gregor:[-.31,-.8],dongbaek:[-.34,-.8],dongrang:[-.36,-.8],ahab:[-.43,-.8],queequeg:[-.4,-.8],nelly:[-.3,-.8],gubo:[-.33,-.8],gahwan:[-.3,-.8],hohenheim:[-.32,-.8],alisa:[-.3,-.8],marton:[-.34,-.8],myo:[-.3,-.8],rudolph:[-.32,-.8]};
export function spriteOrigin(g,e,extraLift=0){return {x:e.x,y:e.y+.3+Math.sin(g.time*3+e.id)*.025-leapLift(e)-extraLift};}
export function equipmentPose(g,e,extraLift=levitationLift(g,e)){
 const origin=spriteOrigin(g,e,extraLift),f=FRAMES[visualForm(g,e)],aim=e.facing??(e.team?Math.PI:0),stance=basicStance(g,e)||(!combatPoseActive(g,e)&&Math.abs(Math.sin(aim))<1e-6?restingStance(g,e,aim):null),facing=stance?.weaponFacing??aim,flip=(Math.cos(bodyFacing(g,e))<0)!==Boolean(f?.mirror)?-1:1,[baseX,y]=HAND_ANCHORS[e.key]||[-.3,-.8],x=baseX*(e.key==='sora'&&g.buff(e,'soraEgo')?1.1:1);
 const duration=e.key==='ryoshu'?.25:.3,age=g.time-(e.attackAt??-99),attacking=age>=0&&age<duration,style=g.attackStyle(e),slash=['slash','sweep'].includes(style),swing=age/duration,side=(e.attackSerial||0)%2?1:-1;
 let angle=attacking?(e.attackFacing??facing):facing;
 if(slash&&attacking)angle+=e.key==='honglu'?swingProgress(swing)*Math.PI*2:(weaponSwingProgress(swing)-.5)*2.25*side;
 if(e.state.donCharge)angle=facing;
 if(e.state.donThrust&&g.time-e.state.donThrust.at<.24)angle=e.state.donThrust.angle;
 if(e.key==='starbuck'&&(e.motion?.kind==='leap'&&e.motion.elapsed/Math.max(.01,e.motion.minDuration)>.5||g.time-(e.state.starbuckLandedAt??-99)<.22))angle=Math.PI/2;
 const handY=y+(['honglu','dongrang'].includes(e.key)?.15:0);
 return {origin,right:{x:origin.x+x*flip,y:origin.y+handY},left:{x:origin.x-x*flip,y:origin.y+handY},angle,age,attacking,slash,swing,flip,facing,resting:Boolean(stance)};
}
export const WEAPON_SWING_SPEED=2.5;
// Animation windows keep their original duration; the completed strike is held.
export const weaponSwingProgress=t=>Math.max(0,Math.min(1,t*WEAPON_SWING_SPEED));
export function weaponStrikePulse(t){t=Math.max(0,Math.min(1,t));return t===1?0:Math.sin((t<.5?Math.min(.5,t*WEAPON_SWING_SPEED):t)*Math.PI);}
export function swingProgress(t){
 t=weaponSwingProgress(t);const turn=.8/3;return t<=turn?t*3:.8+(t-turn)*(.2/(1-turn));
}
export function weaponMotionAccent(key,mode,progress){
 const phase=weaponSwingProgress(progress),pulse=mode&&key!=='nelly'&&progress>=0&&progress<=1&&phase>0&&phase<1?Math.sin(phase*Math.PI):0;
 return {scale:1+.20*pulse,outward:mode==='swing'?.18*pulse:0};
}
export function basicWeaponAccent(g,e,p=equipmentPose(g,e)){
 if(e.key==='rudolph')return {scale:rudolphForwardPose(g,e,p)?.scale??1,outward:0};
 const style=g.attackStyle(e),mode=p.attacking?(p.slash?(e.key==='honglu'||e.key==='sora'?'orbit':'swing'):['thrust','whip'].includes(style)?'thrust':null):null;
 const accent=weaponMotionAccent(e.key,mode,e.key==='yan'?p.age/.15:p.swing);
 if(mode&&e.key==='kim'&&e.state.kimWideSlashSerial===e.attackSerial)accent.scale+=.12*Math.sin(weaponSwingProgress(p.swing)*Math.PI);
 return accent;
}
export function rudolphForwardPose(g,e,p=equipmentPose(g,e)){
 if(e.key!=='rudolph'||!e.alive||e.channelUntil>g.time)return null;
 const progress=rudolphWeaponProgress(g,e);if(progress<=0)return null;
 return {angle:p.attacking?(e.attackFacing??p.facing):p.facing,thrust:RUDOLPH_WEAPON.reach*progress,scale:1+.20*progress,progress};
}
export function rudolphChantPose(g,e,p=equipmentPose(g,e)){
 if(e.key!=='rudolph'||e.castSlot!=='r'||!(e.channelUntil>g.time))return null;
 return {hand:{x:p.origin.x,y:p.origin.y-.60},angle:-Math.PI/2};
}
export function groundStrikePose(p,length,pivot,age,{impact=.11,recovery=.19,depth=.2,head=.9}={}){
 const down=weaponSwingProgress(age/impact),recover=Math.max(0,Math.min(1,(age-impact)/recovery));
 const headY=p.origin.y-1.1+(1.1+depth)*down**2-.55*recover;
 return {hand:{x:p.right.x,y:headY-(head-pivot)*length},angle:Math.PI/2,headY};
}
export function frontGroundPoint(e,p,camera,{distance=.85,angle=e.attackFacing??p.facing}={}){
 const front={x:e.x+Math.cos(angle)*distance,y:e.y+Math.sin(angle)*distance};if(!camera)return {x:front.x,y:front.y+feetOffset(e)};
 const at=camera.worldToScreen(e,.075),to=camera.worldToScreen(front,.075);return {x:e.x+(to.x-at.x)/camera.scale,y:e.y+feetOffset(e)+(to.y-at.y)/camera.scale};
}
export function forwardGroundStrikePose(g,e,p,camera,age,{impact=.11,recovery=.19,depth=.02,head=[.9,.5],progress=age/.3,angle=e.attackFacing??p.facing}={}){
 const point=frontGroundPoint(e,p,camera,{angle}),down=weaponSwingProgress(age/impact),recover=Math.max(0,Math.min(1,(age-impact)/recovery)),accent=weaponMotionAccent(e.key,'swing',progress),[key,length]=WEAPON_ART[e.key],m=weaponGeometry(key,length*accent.scale),tip=gripSourcePoint(head,m,gripPivot(e.key)),headY=point.y-1.1+(1.1+depth)*down**2-.55*recover;
 return {hand:{x:point.x+tip.y,y:headY-tip.x-accent.outward},angle:Math.PI/2,headY,groundY:point.y,impactPoint:point,progress};
}
export function ahabSlamPose(g,e,p,camera){
 // Finish the fast strike before the scheduled return dash begins.
 const remaining=(e.state.ahabSlamAt??-99)-g.time;if(remaining>.13||remaining<=.01)return null;
 return forwardGroundStrikePose(g,e,p,camera,.13-remaining,{impact:.1,recovery:.02,depth:.06,head:[.99,.5],progress:(.13-remaining)/.12,angle:e.visualCast?.angle??p.facing});
}
export function starbuckSlamPose(g,e,p,camera){
 if(e.key!=='starbuck')return null;
 const m=e.motion,air=m?.kind==='leap',after=g.time-(e.state.starbuckLandedAt??-99);let progress,headY;
 const point=frontGroundPoint(e,p,camera,{angle:air?Math.atan2(m.dy,m.dx):e.visualCast?.angle??p.facing});
 if(air){const phase=m.elapsed/Math.max(.01,m.minDuration||.7);if(phase<=.5)return null;progress=Math.min(1,(phase-.5)*2);headY=point.y-leapLift(e)-(1-progress);}
 else{if(after<0||after>=.22)return null;progress=after/.22;headY=point.y-.55*progress;}
 const accent=weaponMotionAccent(e.key,'swing',progress),geometry=weaponGeometry(WEAPON_ART.starbuck[0],WEAPON_ART.starbuck[1]*accent.scale),tip=gripSourcePoint([.99,.46],geometry,gripPivot('starbuck'));
 return {hand:{x:point.x+tip.y,y:headY-tip.x-accent.outward},angle:Math.PI/2,headY,groundY:point.y,impactPoint:point,progress};
}
export function guboWeaponPose(g,e,camera,p=equipmentPose(g,e)){
 // Keep the rifle on the anatomical hand, with the shared basic attack push.
 return {hand:p.right,angle:p.angle,thrust:p.attacking?weaponStrikePulse(p.swing)*.38:0};
}
export function weaponEmissionPoint(g,e,camera){
 if(!['denis','gubo','rudolph','myo','jamila'].includes(e.key)||e.key==='myo'&&!myoFiring(g,e))return null;
 const p=equipmentPose(g,e),forward=rudolphForwardPose(g,e,p),chant=rudolphChantPose(g,e,p),shot=e.key==='myo'&&myoFiring(g,e)?myoRiflePose(g,e,p):e.key==='gubo'?guboWeaponPose(g,e,camera,p):e.key==='denis'?denisWeaponPose(g,e,p):e.key==='jamila'?jamilaWeaponPose(g,e,p):{hand:chant?.hand??p.right,angle:chant?.angle??forward?.angle??p.facing,thrust:forward?.thrust||0},[key,length]=e.key==='myo'?['myoRifle',2.15]:WEAPON_ART[e.key],accent=['myo','jamila'].includes(e.key)?{scale:1,outward:0}:basicWeaponAccent(g,e,p),m=weaponGeometry(key,length*accent.scale),[u,v]=EMISSION_ANCHORS[e.key],thrust=(shot.thrust||0)+accent.outward,pivot=e.key==='jamila'?.238:key==='kromer'?.11:e.key==='myo'?.32:gripPivot(e.key);
 const x=m.span*(u-pivot)+thrust,y=(v-.5-(shot.gripY||0))*m.height*m.scale,pose=weaponOrientation(shot.angle),c=Math.cos(pose.angle),s=Math.sin(pose.angle);
 return {x:shot.hand.x+pose.flip*(x*c-y*s),y:shot.hand.y+x*s+y*c};
}
export function weaponEmissionScreen(g,e,camera,origin=e){
 const tip=weaponEmissionPoint(g,e,camera);if(!tip)return null;const at=camera.worldToScreen(origin,.075);
 return {x:at.x+(tip.x-e.x)*camera.scale,y:at.y+(tip.y-e.y-feetOffset(e))*camera.scale};
}
export function guboEffectAxis(g,e,camera,origin=e,{height=.95,angle=e.attackFacing??e.facing??0,to}={}){
 const center=camera.worldToScreen(origin,height),toward=to||camera.worldToScreen({x:origin.x+Math.cos(angle),y:origin.y+Math.sin(angle)},height),dx=toward.x-center.x,dy=toward.y-center.y,n=Math.hypot(dx,dy)||1,ux=dx/n,uy=dy/n,tip=weaponEmissionScreen(g,e,camera,origin),reach=Math.max(0,((tip.x-center.x)*ux+(tip.y-center.y)*uy)/camera.scale);
 return {center,start:{x:center.x+ux*reach*camera.scale,y:center.y+uy*reach*camera.scale},ux,uy,reach};
}
export function bodyOrbit(p,angle,radius=.65){
 return {x:p.origin.x+Math.cos(angle)*radius,y:p.origin.y-.8+Math.sin(angle)*radius};
}
export function soraOrbitPose(e,p){
 const facing=(p.attacking?e.attackFacing:undefined)??p.facing,angle=facing+swingProgress(p.swing)*Math.PI*2,radius=(.9+.2*Math.sin(weaponSwingProgress(p.swing)*Math.PI))*1.1;
 return p.attacking?{left:{hand:bodyOrbit(p,angle+Math.PI,radius),angle:facing+Math.PI},right:{hand:bodyOrbit(p,angle,radius),angle:facing},active:true}:{left:{hand:p.left,angle:facing},right:{hand:p.right,angle:facing},active:false};
}
export function outisSpinPose(g,e,p){
 const age=g.time-(e.state.outisSpinAt??-99);if(age<0||age>=.4)return null;
 const angle=(e.state.outisSpinFacing??p.facing)+swingProgress(age/.4)*Math.PI*2;return {hand:bodyOrbit(p,angle,.5),angle};
}
export function ultimateOrbitPose(g,e,p){
 if(!['sinclair','ryoshu'].includes(e.key))return null;
 const activeStorm=storm(g,e);if(activeStorm){const progress=((g.time-(activeStorm.startedAt??0))%.4)/.4,angle=(activeStorm.angle??p.facing)+swingProgress(progress)*Math.PI*2;return {hand:{x:p.origin.x,y:p.origin.y-.8},angle,progress};}
 if(e.key==='ryoshu'&&e.goldenBough)return null;
 const cast=e.visualCast,start=e.key==='sinclair'?e.state.sinclairSpinAt:cast?.slot==='r'?cast.at:undefined,age=g.time-(start??-99),duration=.4;
 if(age<0||age>=duration)return null;
 const progress=age/duration,angle=(e.key==='sinclair'?e.state.sinclairSpinFacing:cast.angle)??p.facing,turn=angle+swingProgress(progress)*Math.PI*2;
 return {hand:bodyOrbit(p,turn,.5),angle:turn,progress};
}
export function dongbaekUltSwing(g,e){
 const cast=e.visualCast,age=g.time-(cast?.at??-99);if(e.key!=='dongbaek'||cast?.slot!=='r'||age<0||age>=.38)return null;
 const progress=age/.38;return {angle:cast.angle+(swingProgress(progress)-.5)*2.5*weaponOrientation(cast.angle).flip,progress};
}
export function donChargePull(g,e){return e.state.donCharge?-.45*Math.max(0,Math.min(1,(g.time-e.state.donCharge.at)/1.5*(1+g.buffValue(e,'donLifesteal',.5)))):0;}
export function ryoshuResting(g,e,p=equipmentPose(g,e)){
 const castAge=g.time-(e.visualCast?.at??-99);return e.key==='ryoshu'&&!p.attacking&&!(e.motion?.actionKind==='skill')&&!(castAge>=0&&castAge<.4);
}
export function heathSlamPose(g,e,p){
 // The ultimate's continuous sweep owns the weapon throughout Q's leap/landing.
 if(g.buff(e,'heathUlt'))return null;
 const m=e.motion,air=m?.kind==='leap'&&m.actionKind==='skill',after=g.time-(e.state.heathSlamAt??-99),charging=e.state.chargeAt!==undefined;
 if(!charging&&!air&&(after<0||after>=.18))return null;
 const duration=air?Math.max(.01,m.minDuration||0,m.total/m.speed):0,window=Math.min(.14,duration*.6),swing=air?Math.max(0,Math.min(1,1-(duration-m.elapsed)/window)):charging?0:1;
 const recover=!air&&!charging?Math.max(0,Math.min(1,(after-.04)/.14)):0,side=weaponOrientation(air?Math.atan2(m.dy,m.dx):e.state.heathSlamFacing??p.facing).flip,angle=-Math.PI/2+side*Math.PI*swingProgress(swing);
 const [,length,pivot]=equippedWeapon(g,e),hand={x:p.right.x,y:p.right.y+(p.origin.y+.06-length*(1-pivot)-p.right.y)*swing**2};
 return {hand:{x:hand.x,y:hand.y+(p.right.y-hand.y)*recover},angle:angle+(p.facing-angle)*recover,progress:swing};
}
export function heathSweepPose(g,e,p=equipmentPose(g,e)){
 if(e.key!=='heathcliff'||!e.alive||!g.buff(e,'heathUlt'))return null;
 const serial=e.state.heathSweepSerial||0,start=(e.state.auraTick??g.time+HEATH.interval)-HEATH.interval;
 const progress=Math.max(0,Math.min(1,(g.time-start)/HEATH.interval)),direction=serial%2?-1:1;
 const visual=weaponSwingProgress(progress);return {center:{x:p.origin.x,y:p.origin.y-.8},progress,direction,serial,angle:(e.state.heathSweepFacing??p.facing)+direction*Math.PI*2*visual,bend:direction*1.25*Math.sin(visual*Math.PI),radius:HEATH.radius};
}
export function heathSackPoint(pose,u){
 const angle=pose.angle-pose.bend*Math.max(0,u)**1.4,r=.38+(pose.radius-.38)*u;
 return {x:Math.cos(angle)*r,y:Math.sin(angle)*r};
}
function drawHeathSweep(r,e,g,lift,layer){
 const c=r.ctx,pose=heathSweepPose(g,e,equipmentPose(g,e,lift));if(!pose)return;
 const key='heathBloodSack',pivot=.045,length=HEATH.radius/(1-pivot),m=weaponGeometry(key,length),f=m.frame,image=loadAtlas(f.sheet);
 if(!image.complete||!image.naturalWidth)return;
 const camera=r.camera,origin=camera?.worldToScreen(e,.075),project=v=>{
  if(!camera)return {x:pose.center.x+v.x,y:pose.center.y+v.y};
  const p=camera.worldToScreen({x:e.x+v.x,y:e.y+v.y},.075);
  return {x:pose.center.x+(p.x-origin.x)/camera.scale,y:pose.center.y+(p.y-origin.y)/camera.scale};
 },point=u=>project(heathSackPoint(pose,u)),hand=point(0),ahead=point(.001),angle=Math.atan2(ahead.y-hand.y,ahead.x-hand.x),handLayer=Math.sin(pose.angle)<0?'back':'front',disabled=Boolean(g.stat(e,'disarm')&&!e.status.disarm?.hideVisual);
 const grip=which=>{if(layer!==handLayer)return;c.save();c.translate(hand.x,hand.y);orientWeapon(c,angle);drawGripHands(c,e.key,key,m,pivot,which);c.restore();};
 grip('back');c.save();c.imageSmoothingEnabled=false;if(disabled)c.filter='grayscale(1) brightness(.7)';
 // Follow the original cloth texture along a curved centerline; the knot stays
 // at the hand and the sack tip follows the actual five-unit ground circle.
 const slices=36,h=f.h*m.scale;
 for(let i=0;i<slices;i++){
  const x0=i/slices,x1=(i+1)/slices,u0=(x0-pivot)/(1-pivot),u1=(x1-pivot)/(1-pivot),mid=heathSackPoint(pose,(u0+u1)/2);
  if((mid.y<0?'back':'front')!==layer)continue;
  const a=point(u0),b=point(u1),w=Math.hypot(b.x-a.x,b.y-a.y);
  c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));c.drawImage(image,f.x+f.w*x0,f.y,f.w/slices,f.h,-.012,-h/2,w+.024,h);c.restore();
 }
 c.restore();
 if(disabled){
  for(let i=0;i<26;i++){
   const u=i/25,local=heathSackPoint(pose,u);if((local.y<0?'back':'front')!==layer)continue;
   const a=point(u),b=point(u+.005);c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));c.beginPath();c.ellipse(0,0,.13,.055,i%2?.65:-.65,0,Math.PI*2);c.strokeStyle='#242b35';c.lineWidth=.055;c.stroke();c.strokeStyle='#aeb8c4';c.lineWidth=.025;c.stroke();c.restore();
  }
 }
 grip('front');
 if(layer==='front')r.weaponTrail(e,g,'heath-sweep',point(.22),point(1),true);
}
export function gregorThrust(g,e){
 const cast=e.visualCast,age=g.time-(cast?.at??-99);if(cast?.slot!=='q'||age<0||age>=.4)return null;
 const extend=age<.08?1-(1-age/.08)**3:age<.2?1:Math.max(0,1-(age-.2)/.2),range=6+(g.buff(e,'mutant')?2.5:0);
 return {angle:cast.angle,straighten:extend,length:WEAPON_ART.gregor[1]+(range-WEAPON_ART.gregor[1])*extend,thrust:.45*Math.sin(Math.min(1,age/.25)*Math.PI)};
}
export function gahwanSlash(g,e){
 const cast=e.visualCast,release=e.state.gahwanRelease,ultimate=cast?.slot==='r',at=ultimate?release?.at:cast?.at,age=g.time-(at??-99),duration=ultimate?.18:cast?.slot==='q'?.26:0;
 if(age<0||!duration||age>=duration)return null;
 const progress=age/duration,angle=ultimate?release.angle:cast.angle;return {angle:angle+(swingProgress(progress)-.5)*Math.PI*weaponOrientation(angle).flip,progress,part:`skill-${ultimate?'r':'q'}`};
}
export function gahwanChargePose(g,e,p=equipmentPose(g,e)){const r=e.state.gahwanR;if(!r)return null;const age=g.time-r.at,jitter=Math.sin(age*90)*.022;return{hand:{x:p.right.x+jitter,y:p.right.y+Math.cos(age*103)*.012},angle:r.angle+Math.PI+jitter,pivot:.5};}
export function yanWeaponAngle(e,p){
 const base=p.attacking?(e.attackFacing??p.facing):p.facing,progress=e.state.yanCharge?.progress/1.5||0,raise=e.state.yanCharge?.65*progress:p.attacking?.9*(1-swingProgress(p.age/.15)):0;
 return base-weaponOrientation(base).flip*raise;
}
export function targetTorsoPoint(g,e,target,camera){
 const torso=spriteOrigin(g,target);if(!camera)return {x:torso.x,y:torso.y-1.05};
 const own=camera.worldToScreen(e,.075),at=camera.worldToScreen(target,.075);
 return {x:e.x+(at.x-own.x)/camera.scale,y:e.y+feetOffset(e)+(at.y-own.y)/camera.scale+torso.y-target.y-feetOffset(target)-1.05};
}
export function skillWeaponPose(g,e,p=equipmentPose(g,e),camera){
 const cast=e.visualCast,age=g.time-(cast?.at??-99),motion=e.motion,phase=motion?Math.max(0,Math.min(1,1-motion.remaining/Math.max(.001,motion.total))):0;
 const cut=(angle,progress,part,arc=2.5)=>({angle:angle+(swingProgress(progress)-.5)*arc*weaponOrientation(angle).flip,mode:'swing',progress,part,trail:true});
 if(e.key==='yan'&&!g.buff(e,'yanDistorted')&&e.state.yanSweep){const s=e.state.yanSweep,t=(g.time-s.at)/.3;if(t>=0&&t<1)return cut(s.angle,t,'yan-q-'+s.serial,Math.PI);}
 if(e.key==='faust'&&cast?.slot==='q'&&age>=0&&age<.36)return cut(cast.angle,age/.36,'faust-sweep',Math.PI);
 if(e.key==='outis'&&cast?.slot==='r'){
  const recoil=g.time-(e.state.outisRecoilAt??-99);
  if(recoil>=0&&recoil<.2){const t=recoil/.2;return {angle:e.state.outisRecoilFacing,mode:'thrust',progress:t,thrust:.85*(1-t)-.45*Math.sin(t*Math.PI),part:'outis-withdraw',trail:false};}
  if(e.state.outisRush&&motion?.actionKind==='skill'&&!motion.forced&&motion.dx*Math.cos(cast.angle)+motion.dy*Math.sin(cast.angle)>0)return {angle:cast.angle,mode:'thrust',progress:phase,thrust:.85*(1-(1-Math.min(1,phase/.5))**2),part:'outis-thrust',trail:false};
 }
 if(e.key==='hohenheim'&&cast?.slot==='q'&&motion?.actionKind==='skill'&&!motion.forced){
  const forward=motion.dx*Math.cos(cast.angle)+motion.dy*Math.sin(cast.angle)>0;
  return {angle:cast.angle,mode:'thrust',progress:phase,thrust:forward?.75*Math.sin(phase*Math.PI/2):.75*(1-phase),part:'hohenheim-thrust',trail:false};
 }
 if(e.key!=='kim')return null;
 const held=carried(g,e);
 if(held){const target=targetTorsoPoint(g,e,held,camera),dx=target.x-p.right.x,dy=target.y-p.right.y,distance=Math.hypot(dx,dy)||.001,angle=Math.atan2(dy,dx),reach=Math.max(distance,.45+(.25-.12)*WEAPON_ART.kim[1]+.018),hand={x:p.right.x-Math.cos(angle)*(reach-distance),y:p.right.y-Math.sin(angle)*(reach-distance)},shake=Math.sin(g.time*86+e.id)*.012+Math.sin(g.time*117+e.id*.7)*.006,thrust=Math.max(.45,reach-(.72-.12)*WEAPON_ART.kim[1])+shake;return {hand,angle,mode:null,thrust,shake,bladeFraction:.12+(reach-thrust)/WEAPON_ART.kim[1],part:'kim-embedded',trail:false,target};}
 const throwAge=g.time-(e.state.kimThrowAt??-99);if(throwAge>=0&&throwAge<.26&&e.state.kimThrowAt>=(e.state.kimWaveAt??-99))return cut(e.state.kimThrowFacing,throwAge/.26,'kim-throw');
 const waveAge=g.time-(e.state.kimWaveAt??-99),duration=e.state.kimWaveDuration||.24;
 if(waveAge>=0&&waveAge<duration)return cut(e.state.kimWaveFacing,waveAge/duration,`kim-wave-${e.state.kimWaveSerial}`);
 if(cast?.slot==='q'&&motion?.actionKind==='skill'&&!motion.forced)return {angle:cast.angle,mode:'thrust',progress:phase,thrust:.85*Math.sin(phase*Math.PI/2),part:'kim-thrust',trail:false};
 return null;
}
const GREGOR_SPINE=[[0,.61],[.12,.52],[.28,.4],[.45,.37],[.62,.43],[.76,.54],[.9,.76],[1,1]];
export function gregorCenterline(u){
 const i=Math.max(0,GREGOR_SPINE.findIndex(([x])=>x>=u)-1),a=GREGOR_SPINE[i],b=GREGOR_SPINE[i+1]||a;return a[1]+(b[1]-a[1])*(u-a[0])/Math.max(.001,b[0]-a[0]);
}
export const myoFiring=(g,e)=>e.key==='myo'&&e.castSlot==='q'&&g.time-(e.castAt??-99)>=0&&g.time-e.castAt<.5;
export function drawBackEquipment(r,e,g,{lift=0}={}){
 if(e.state.kromerHeldBy)return;
 if(e.key==='mei'){drawMeiFists(r,e,g,lift,'back');return;}
 if(e.key==='heathcliff'&&g.buff(e,'heathUlt')){drawHeathSweep(r,e,g,lift,'back');return;}
 if(e.key==='nosferatu'&&g.buff(e,'bloodfiend')){drawBloodSweep(r,e,g,lift,'back');return;}
 if(e.key==='jamila'){if(e.lcaTrooper)return;const p=equipmentPose(g,e,lift),c=r.ctx,q=Boolean(e.state.jamilaQ&&e.state.jamilaQ.phase!=='retreat');c.save();c.translate(p.origin.x,p.origin.y-.95);c.scale(p.flip,1);drawWeapon(c,q?'jamilaRifle':'jamilaKopis',q?2.1:1.75,{x:q?.06:.32,rotation:q?.95:1.05,pivot:.5,disabled:Boolean(g.stat(e,'disarm')&&!e.status.disarm?.hideVisual)});c.restore();return;}
 if(e.key!=='myo'||myoFiring(g,e))return;
 const p=equipmentPose(g,e,lift),c=r.ctx;c.save();c.translate(p.origin.x,p.origin.y-.95);c.scale(p.flip,1);drawWeapon(c,'myoRifle',2.1,{x:.06,rotation:.95,pivot:.5,disabled:Boolean(g.stat(e,'disarm')&&!e.status.disarm?.hideVisual)});c.restore();
}
export function weaponGeometry(key,length){
 const f=FRAMES[key];if(!f)return null;const angle=f.rotation||0,baseW=f.w,baseH=f.h;
 const extension=HANDLE_EXTENSIONS[key],extra=extension?(extension.to-extension.from)*(extension.scale-1):0;
 const width=baseW*(1+extra),span=Math.abs(width*Math.cos(angle))+Math.abs(baseH*Math.sin(angle)),scale=length/(Math.abs(baseW*Math.cos(angle))+Math.abs(baseH*Math.sin(angle)));
 return {frame:f,angle,scale,width,height:baseH,span:span*scale,extension};
}
export function drawDisarmChains(c,m,pivot){
 const count=Math.max(5,Math.min(24,Math.ceil(m.span/.15))),height=Math.min(.16,m.height*m.scale*.35+.04);c.save();c.lineWidth=.055;c.strokeStyle='#242b35';
 for(let i=0;i<count;i++){const x=m.span*(i/(count-1)-pivot),y=Math.sin(i*1.8)*height;c.beginPath();c.ellipse(x,y,.105,.045,i%2?.65:-.65,0,Math.PI*2);c.stroke();c.strokeStyle='#aeb8c4';c.lineWidth=.025;c.stroke();c.strokeStyle='#242b35';c.lineWidth=.055;}c.restore();
}
export function drawWeapon(c,key,length,{x=0,y=0,rotation=0,pivot=0,straighten=0,disabled=false,headScale=1}={}){
 const m=weaponGeometry(key,length);if(!m)return false;const f=m.frame,image=loadAtlas(f.sheet);if(!image.complete||!image.naturalWidth)return false;
 c.save();if(disabled)c.filter='grayscale(1) brightness(.7)';c.imageSmoothingEnabled=false;c.translate(x,y);c.rotate(rotation);c.translate((.5-pivot)*m.span,0);c.rotate(m.angle);c.scale(m.scale,m.scale);
 let dx=-m.width/2;
 if(key==='maximHammer'&&headScale!==1){
  const {joint,axis}=MAXIM_HEAD;
  c.drawImage(image,f.x,f.y,joint,f.h,dx,-f.h/2,joint,f.h);
  c.drawImage(image,f.x+joint,f.y,f.w-joint,f.h,dx+joint,-f.h/2+axis*(1-headScale),(f.w-joint)*headScale,f.h*headScale);
 }else if(key==='gregorClaw'&&straighten>0){
  c.scale(1,WEAPON_ART.gregor[1]/length);
  for(let sx=0;sx<f.w;sx+=3){const w=Math.min(3,f.w-sx),u=(sx+w/2)/f.w,bend=(gregorCenterline(u)-.5)*f.h*straighten;c.drawImage(image,f.x+sx,f.y,w,f.h,-f.w/2+sx,-f.h/2-bend,w+.15,f.h);}
 }else if(m.extension){
  const e=m.extension,a=Math.round(f.w*e.from),b=Math.round(f.w*e.to),segments=[[0,a,1],[a,b-a,e.scale],[b,f.w-b,1]];
  for(const [sx,w,factor] of segments){if(w>0)c.drawImage(image,f.x+sx,f.y,w,f.h,dx,-f.h/2,w*factor,f.h);dx+=w*factor;}
 }else c.drawImage(image,f.x,f.y,f.w,f.h,dx,-f.h/2,f.w,f.h);
 c.restore();if(disabled){c.save();c.translate(x,y);c.rotate(rotation);drawDisarmChains(c,m,pivot);c.restore();}return true;
}
export function hohenheimWeaponCharge(g,e){return e.key==='hohenheim'?Math.max(0,Math.min(1,(e.state.hohenCharge?.progress||0)/1.5)):0;}
export function drawWeaponCharge(c,r,g,e,m,pivot){
 if(storm(g,e)&&r.skillVfx){const f=m.frame,atlas=loadAtlas(f.sheet),tint=r.skillVfx.tintFrame(atlas,f,'#ffffff'),w=m.width*m.scale,h=m.height*m.scale;c.save();c.translate((.5-pivot)*m.span,0);c.rotate(m.angle);c.beginPath();c.rect(-w/2+w*.35,-h/2-.15,w*.7,h+.3);c.clip();c.globalCompositeOperation='lighter';c.globalAlpha*=.65+.12*Math.sin(g.time*19);c.shadowColor='#ffffff';c.shadowBlur=18;c.drawImage(tint,-w/2,-h/2,w,h);c.restore();}

 if(e.key==='gahwan'&&e.state.gahwanR&&r.skillVfx){const f=m.frame,atlas=loadAtlas(f.sheet),tint=r.skillVfx.tintFrame(atlas,f,'#fb2044'),progress=Math.min(1,(g.time-e.state.gahwanR.at)/GAHWAN.charge);c.save();c.translate((.5-pivot)*m.span,0);c.rotate(m.angle);c.globalCompositeOperation='lighter';c.globalAlpha*=.22+progress*.22;c.shadowColor='#ff193e';c.shadowBlur=12;const w=m.width*m.scale,h=m.height*m.scale;c.drawImage(tint,-w/2,-h/2,w,h);c.restore();}
 if(e.key==='faust'&&e.level>=maxLevel(e)&&r.skillVfx){const f=m.frame,atlas=loadAtlas(f.sheet),tint=r.skillVfx.tintFrame(atlas,f,'#ffffff');c.save();c.translate((.5-pivot)*m.span,0);c.rotate(m.angle);c.globalCompositeOperation='lighter';c.globalAlpha*=.16+.05*Math.sin(g.time*4);c.shadowColor='#e3f4ff';c.shadowBlur=9;const w=m.width*m.scale,h=m.height*m.scale;c.drawImage(tint,-w/2,-h/2,w,h);c.restore();}
 const progress=hohenheimWeaponCharge(g,e);if(!progress||!r.skillVfx)return;
 const f=m.frame,atlas=loadAtlas(f.sheet),tint=r.skillVfx.tintFrame(atlas,f,'#4dafff');
 c.save();c.translate((.5-pivot)*m.span,0);c.rotate(m.angle);const w=m.width*m.scale,h=m.height*m.scale,alpha=c.globalAlpha;
 c.globalCompositeOperation='lighter';c.globalAlpha=alpha*.10*progress;c.drawImage(tint,-w*.515,-h*.55,w*1.03,h*1.1);c.globalAlpha=alpha*.40*progress;c.drawImage(tint,-w/2,-h/2,w,h);
 const arcs=[[.58,.48,.77,.22],[.68,.75,.89,.70],[.77,.20,.94,.30],[.45,.50,.64,.46],[.72,.8,.9,.85],[.8,.30,.83,.68]];
 const count=2+Math.floor(progress*4);c.scale(m.scale,m.scale);c.lineJoin='round';c.lineCap='round';
 for(let i=0;i<count;i++){
  const [u,v,x,y]=arcs[i];c.beginPath();for(let j=0;j<=5;j++){const t=j/5,jitter=j===0||j===5?0:Math.sin(g.time*34+i*2.7+j*4.3)*4,px=(u+(x-u)*t-.5)*f.w,py=(v+(y-v)*t-.5)*f.h+jitter;j?c.lineTo(px,py):c.moveTo(px,py);}
  c.globalAlpha=alpha*.45*progress;c.strokeStyle='#3195ff';c.lineWidth=.035/m.scale;c.stroke();c.globalAlpha=alpha*.85*progress;c.strokeStyle='#d5f6ff';c.lineWidth=.012/m.scale;c.stroke();
 }
 c.restore();
}
export function myoRiflePose(g,e,p=equipmentPose(g,e)){
 const age=g.time-(e.state.myoShotAt??-99),pulse=age>=0&&age<.075?1-age/.075:0,angle=e.state.myoShotFacing??p.facing;
 return {hand:{x:p.right.x+Math.sin(age*155)*.018*pulse,y:p.right.y+Math.cos(age*133)*.012*pulse},angle:angle-Math.sin(age*95)*.025*pulse,thrust:-.13*pulse};
}
export function denisWeaponPose(g,e,p=equipmentPose(g,e)){const shot=e.state.denisShot,age=g.time-(shot?.at??-99),recoil=age>=0&&age<.16?Math.sin(age/.16*Math.PI)*(shot.heavy?.24:.13):0;return{hand:p.right,angle:p.attacking?(e.attackFacing??p.facing):p.facing,thrust:-recoil,gripY:.16};}
export function jamilaWeaponPose(g,e,p=equipmentPose(g,e)){
 const q=e.state.jamilaQ;if(q&&q.phase!=='retreat'){const progress=q.phase==='slash'?Math.max(0,Math.min(1,(g.time-q.slashAt)/.2)):0;return {asset:'jamilaKopis',length:1.75,hand:p.right,angle:q.angle+(q.phase==='slash'?(swingProgress(progress)-.5)*Math.PI:0),mode:q.phase==='slash'?'swing':null,progress,thrust:0,trail:q.phase==='slash',dim:1,gripY:-.02};}
 const age=g.time-(e.attackAt??-99),active=age>=0&&age<.14,pulse=active?1-age/.14:0,shake=Math.sin(age*155)*.018*pulse;return {asset:'jamilaRifle',length:2.25,hand:{x:p.right.x+shake,y:p.right.y+Math.cos(age*133)*.012*pulse},angle:(active?e.attackFacing:p.facing)??p.facing,mode:null,thrust:(.09-Math.sin(age*90)*.045)*pulse,trail:false,dim:e.state.lcaReload?.5:1,gripY:.3};
}
export function ezraWeaponPose(g,e,p=equipmentPose(g,e),camera){
 const a=e.state.ezraAttack,active=a?.until>g.time,index=active?a.weapon:Ezra.currentIndex(g,e),age=g.time-(a?.at??-99),duration=index===2?.5:a?.fourth?.3:.28,progress=Math.max(0,Math.min(1,age/duration)),facing=active?a.angle:p.facing,side=weaponOrientation(facing).flip;
 const fistLift=.105; // Five percent of crown-to-sole champion height, excluding hair.
 let hand=[0,3].includes(index)?{x:p.right.x,y:p.right.y-fistLift}:index===4?{x:p.origin.x+HAND_ANCHORS.rudolph[0]*p.flip,y:p.origin.y+HAND_ANCHORS.rudolph[1]}:p.right,angle=facing,mode=null,thrust=0,trail=false,gripY=0;
 if(index===4||index===1){const w=Ezra.weapon(g,e,index),m=weaponGeometry(w.asset,w.length),primary=gripLayout('ezra',w.asset,m,w.pivot)[0];gripY=primary.y/(m.height*m.scale);}
 if(index===2&&!active&&!combatPoseActive(g,e)){hand={x:hand.x,y:hand.y+.16};angle=Math.cos(facing)<0?Math.PI+Math.PI/12:-Math.PI/12;}
 if(active){
  if(index===0){
   const t=Math.min(1,age/.24),strike=t<.35?Math.min(.35,t*WEAPON_SWING_SPEED):t,smooth=v=>v*v*(3-2*v),reach=.85*(strike<.35?smooth(strike/.35):strike<.55?1:1-smooth((strike-.55)/.45));
   hand={x:hand.x+Math.cos(facing)*reach,y:hand.y+Math.sin(facing)*reach};trail=t<1;
  }else if(index===1){
   angle=facing+(a.spinDirection||1)*swingProgress(progress)*Math.PI*2;hand={x:p.origin.x,y:p.origin.y-.65};mode='orbit';trail=progress<1;
  }else if(index===4){
   // Hong Lu's full-turn timing, with the axe grip centered on Ezra's torso.
   // Keep the axe forward during the approach; begin the single turn on impact.
   if(a.phase==='strike'){angle=facing+swingProgress(progress)*Math.PI*2;hand={x:p.origin.x,y:p.origin.y-.65};mode='orbit';trail=progress<1;}
  }else if(index===2||index===4){const arc=index===2?Ezra.EZRA_WEAPONS[2].angle:Math.PI;angle=facing+(swingProgress(progress)-.5)*arc*side;mode='swing';trail=a.phase==='strike'&&progress<1;}
  else if(index===3){
   angle=Math.PI/2;
   if(a.phase==='leap')hand={x:p.right.x,y:p.origin.y-1.5-fistLift};
   else{const point=frontGroundPoint(e,p,camera,{distance:.6,angle:facing}),t=weaponSwingProgress(age/.10),recover=Math.max(0,(age-.10)/.18),height=Ezra.EZRA_WEAPONS[3].length*.88;hand={x:hand.x+(point.x-hand.x)*t,y:hand.y+(point.y-height-hand.y)*t-.25*recover};}
  }
 }
 return{weapon:index,hand,angle,mode,progress,thrust,trail,gripY,flipY:index===0?-1:1,part:active&&a.fourth?'ezra-axe-orbit':index===1?'ezra-hammer-'+(a?.spinDirection||1):'ezra-'+index};
}
export const MAXIM_SLAM_SWING=.08;
export const MAXIM_CRYSTAL_TIP=[.84,.985];
export function maximCrystalVector(headScale=1){return gripSourcePoint(maximHammerPoint(MAXIM_CRYSTAL_TIP,headScale),weaponGeometry('maximHammer',WEAPON_ART.maxim[1]),gripPivot('maxim'));}
export function maximCrystalOrientation(axis,flip,headScale=1){const tip=maximCrystalVector(headScale);return {flip,angle:Math.atan2(Math.sin(axis),flip*Math.cos(axis))-Math.atan2(tip.y,tip.x)};}
export function maximGroundPose(g,e,p,camera,age,angle,headScale=1){
 const point=frontGroundPoint(e,p,camera,{distance:1,angle}),tip=maximCrystalVector(headScale),reach=Math.hypot(tip.x,tip.y),down=weaponSwingProgress(age/.2),recover=Math.max(0,Math.min(1,(age-.18)/.14)),flip=Math.cos(angle)<0?-1:1,startAngle=-Math.PI/2-flip*.32;
 const start={x:p.right.x-flip*.18+Math.cos(startAngle)*reach,y:p.right.y-.65+Math.sin(startAngle)*reach},turn=Math.atan2(Math.sin(Math.PI/2-startAngle),Math.cos(Math.PI/2-startAngle)),axis=startAngle+turn*down,headX=start.x+(point.x-start.x)*down,headY=start.y+(point.y+.02-start.y)*down**2-.55*recover;
 return {hand:{x:headX-Math.cos(axis)*reach,y:headY-Math.sin(axis)*reach},angle:axis,orientation:maximCrystalOrientation(axis,flip,headScale),headY,groundY:point.y,impactPoint:point,mode:null,part:'maxim-slam',trail:true};
}
function maximPose(g,e,p,camera,headScale){
 const r=e.state.maximR,side=Math.cos(r?.angle??p.facing)<0?-1:1;
 if(r){const age=g.time-r.at,remaining=r.until-g.time;if(remaining<MAXIM_SLAM_SWING)return maximGroundPose(g,e,p,camera,MAXIM_SLAM_SWING-remaining,r.angle,headScale);const t=Math.min(1,age/Math.max(.01,r.until-r.at-MAXIM_SLAM_SWING-.04)),u=t*t*(3-2*t),tip=maximCrystalVector(headScale),initial=r.angle+side*Math.atan2(tip.y,tip.x),end=-Math.PI/2-side*.32,turn=Math.atan2(Math.sin(end-initial),Math.cos(end-initial)),angle=initial+turn*u;return {hand:{x:p.right.x-side*.18*u,y:p.right.y-.65*u},angle,orientation:maximCrystalOrientation(angle,side,headScale),mode:null,part:'maxim-raise',trail:false};}
 const slam=e.state.maximSlam,age=g.time-(slam?.at??-99);if(age>=0&&age<.24)return maximGroundPose(g,e,p,camera,age+MAXIM_SLAM_SWING,slam.angle,headScale);
 const a=e.state.maximAttack,tip=maximCrystalVector(headScale),reach=Math.hypot(tip.x,tip.y),center={x:p.origin.x,y:p.origin.y-.78};
 if(a?.near&&g.time>=a.at&&g.time<a.until){const progress=(g.time-a.at)/(a.until-a.at),flip=Math.cos(a.angle)<0?-1:1,angle=a.angle+(swingProgress(progress)-.5)*Math.PI*flip;return {hand:{x:center.x+Math.cos(angle)*(MAXIM.nearRange-reach),y:center.y+Math.sin(angle)*(MAXIM.nearRange-reach)},angle,orientation:maximCrystalOrientation(angle,flip,headScale),mode:null,progress,part:'maxim-sweep',trail:true};}
 if(e.motion?.actionTag==='maximBasic'&&a){const progress=Math.min(1,(g.time-a.at)/.28),extend=.95+.65*weaponStrikePulse(progress);return {hand:{x:center.x+Math.cos(a.angle)*(extend-reach),y:center.y+Math.sin(a.angle)*(extend-reach)},angle:a.angle,orientation:maximCrystalOrientation(a.angle,side,headScale),mode:null,progress,part:'maxim-ram',trail:false};}
 if(e.state.maximQ)return {angle:p.facing,orientation:maximCrystalOrientation(p.facing,side,headScale),mode:null,part:'maxim-rush',trail:false};
 return {angle:p.facing,mode:null,part:'maxim-hammer',trail:false};
}
export function maximWeaponPose(g,e,p=equipmentPose(g,e),camera){const appearance=maximWeaponState(g,e);return {...maximPose(g,e,p,camera,appearance.headScale),...appearance};}
export function drawEquipment(r,e,g,{lift=0,camera=r.camera}={}){
 if(e.key==='mei'){drawMeiFists(r,e,g,lift);return true;}
 const c=r.ctx,entry=equippedWeapon(g,e);if(!entry)return false;
 if(e.state.kromerHeldBy)return true;
 if(e.key==='ahab'&&e.state.gasharpoon){drawGasharpoonArm(r,e,g,lift);return true;}
 if(e.key==='heathcliff'&&g.buff(e,'heathUlt')){drawHeathSweep(r,e,g,lift,'front');return true;}
 if(e.key==='nosferatu'&&g.buff(e,'bloodfiend')){drawBloodSweep(r,e,g,lift,'front');return true;}
 if(e.key==='yan'&&g.buff(e,'yanDistorted')&&!e.previewStance||e.key==='nelly'&&e.visualCast?.slot==='q'&&g.time-e.visualCast.at>=0&&g.time-e.visualCast.at<.24)return true;
 const p=equipmentPose(g,e,lift),{attacking,age,slash}=p;
 const held=(key,length,hand=p.right,angle=p.angle,pivot=entry[2],{thrust=0,trail=slash&&attacking,part='weapon',flipY=1,straighten=0,mode,progress,centerGrip=false,dim=1,gripY=0,orientation,headScale=1,hands,offHandOpacity=1,energy=0}={})=>{
  const accent=mode===undefined?basicWeaponAccent(g,e,p):weaponMotionAccent(e.key,mode,progress),displayLength=length*accent.scale,m=weaponGeometry(key,displayLength);if(!m)return;
  c.save();c.translate(hand.x,hand.y);if(orientation){c.scale(orientation.flip,1);c.rotate(orientation.angle);}else orientWeapon(c,angle);c.translate(thrust+accent.outward,-gripY*m.height*m.scale);if(flipY!==1)c.scale(1,flipY);drawGripHands(c,e.key,key,m,pivot,'back',{centered:centerGrip,hands,offHandOpacity});c.save();if(dim<1)c.filter=`brightness(${dim})`;drawWeapon(c,key,displayLength,{pivot,straighten,headScale,disabled:Boolean(g.stat(e,'disarm')&&!e.status.disarm?.hideVisual)});c.restore();if(key==='nikolaiSaber'&&attacking&&Nikolai.empowered(g,e)&&r.skillVfx){c.save();c.globalCompositeOperation='screen';c.globalAlpha*=.85;c.shadowColor='#ff642a';c.shadowBlur=14;c.beginPath();c.rect(m.span*(.2-pivot),-m.height*m.scale,m.span*.82,m.height*m.scale*2);c.clip();c.drawImage(r.skillVfx.tintFrame(loadAtlas(m.frame.sheet),m.frame,'#ff6b2d'),-m.span*pivot,-m.height*m.scale/2,m.span,m.height*m.scale);c.restore();}if(key==='maximHammer')drawMaximCurrent(c,loadAtlas(m.frame.sheet),m,pivot,headScale,energy,g.time);if(key==='ezraDrill')drawEzraDrillEffect(c,g,e,m,pivot);drawWeaponCharge(c,r,g,e,m,pivot);drawGripHands(c,e.key,key,m,pivot,'front',{centered:centerGrip,hands,offHandOpacity});
  r.weaponTrail(e,g,part,{x:m.span*(.25-pivot),y:0},key==='maximHammer'?maximCrystalVector(headScale):{x:m.span*(1-pivot),y:0},trail);c.restore();
 };
 if(e.key==='yan'&&e.previewStance&&g.buff(e,'yanDistorted')){const body=FRAMES.yanDistorted,height=2.1*body.heightScale,right=height*body.w/body.h*(1-body.foot[0]);c.save();c.translate(p.origin.x+right+1.72,p.origin.y-.6);drawWeapon(c,'yanHand',3.2,{pivot:.5});c.restore();return true;}
 if(e.key==='queen'){const side=p.flip,hand={x:p.origin.x+side*.48,y:p.origin.y-.88};held(entry[0],entry[1],hand,attacking?p.angle:p.resting?(side>0?-1.12:Math.PI+1.12):p.facing,.42,{mode:attacking?'swing':null,progress:p.swing,trail:attacking});return true;}
 if(e.key==='nosferatu'){
  const claw=normalBloodClawPose(g,e,p);
  if(claw){c.save();c.globalAlpha*=.64;c.shadowColor='#ff1646';c.shadowBlur=22;held(claw.asset,claw.length,claw.hand,claw.angle,.08,{mode:null,trail:true,part:'blood-claw'});c.restore();}
  else held('nosWine',.43,{x:p.origin.x+p.flip*.53,y:p.origin.y-.64},0,.5,{mode:null,trail:false});return true;
 }
 if(e.key==='moses'){const pose=mosesWeaponPose(g,e,p);held(entry[0],entry[1],pose.hand,pose.angle,pose.pivot,{mode:null,trail:false,gripY:pose.gripY});return true;}
 if(e.key==='gahwan'&&e.state.gahwanR){const pose=gahwanChargePose(g,e,p);c.save();c.shadowColor='#ff193e';c.shadowBlur=14;held(entry[0],entry[1],pose.hand,pose.angle,pose.pivot,{mode:null,trail:false,centerGrip:true});c.restore();return true;}
 if(e.key==='nikolai'){const v=e.visualCast,age=v?.slot==='r'?g.time-v.at:99,active=age>=0&&age<.3;held(entry[0],entry[1],p.right,active?v.angle+(weaponSwingProgress(age/.3)-.5)*2.25:p.angle,entry[2],{trail:active||p.attacking,hands:1});return true;}
 if(e.key==='maxim'){const pose=maximWeaponPose(g,e,p,camera);held(entry[0],entry[1],pose.hand??p.right,pose.angle,entry[2],{mode:pose.mode,progress:pose.progress,thrust:pose.thrust||0,trail:pose.trail,part:pose.part,orientation:pose.orientation,headScale:pose.headScale,hands:pose.hands,offHandOpacity:pose.offHandOpacity,energy:pose.energy});return true;}
 if(e.key==='ezra'){const pose=ezraWeaponPose(g,e,p,camera);held(entry[0],entry[1],pose.hand,pose.angle,entry[2],{mode:pose.mode,progress:pose.progress,thrust:pose.thrust,trail:pose.trail,gripY:pose.gripY,flipY:pose.flipY,part:pose.part});return true;}
 if(e.key==='denis'){const pose=denisWeaponPose(g,e,p);held('denisRifle',2.7,pose.hand,pose.angle,.27,{thrust:pose.thrust,gripY:pose.gripY,trail:false,mode:null,hands:2});return true;}
 if(e.key==='jamila'){const pose=jamilaWeaponPose(g,e,p);held(pose.asset,pose.length,pose.hand,pose.angle,pose.asset==='jamilaKopis'?.12:.238,{mode:pose.mode,progress:pose.progress,thrust:pose.thrust,trail:pose.trail,dim:pose.dim,gripY:pose.gripY,part:'kopis'});return true;}
 if(e.key==='kromer'){
  const pose=kromerWeaponPose(g,e,p,camera);if(!pose.hidden)held(entry[0],entry[1],pose.hand,pose.angle,pose.pivot,{mode:pose.mode,progress:pose.progress,thrust:pose.thrust,trail:false,centerGrip:pose.centerGrip});return true;
 }
 const skill=skillWeaponPose(g,e,p,camera);
 if(skill){
  held(entry[0],entry[1],skill.hand??p.right,skill.angle,undefined,{mode:skill.mode,progress:skill.progress,thrust:skill.thrust||0,trail:skill.trail,part:skill.part});
 }else if(ultimateOrbitPose(g,e,p)){
  const spin=ultimateOrbitPose(g,e,p);held(entry[0],entry[1],spin.hand,spin.angle,undefined,{mode:'orbit',progress:spin.progress,trail:true,part:'ultimate-orbit'});
 }else if(e.key==='honglu'&&attacking){
  held(entry[0],entry[1],p.right,p.angle,undefined,{mode:'orbit',progress:p.swing});
 }else if(e.key==='dongbaek'&&dongbaekUltSwing(g,e)){
  const cut=dongbaekUltSwing(g,e);held(entry[0],entry[1],p.right,cut.angle,undefined,{mode:'swing',progress:cut.progress,trail:true,part:'ultimate-swing'});
 }else if(ryoshuResting(g,e,p)){
  held(entry[0],entry[1],p.right,p.facing+Math.PI,.5,{mode:null,trail:false,centerGrip:true});
 }else if(e.key==='gubo'){
  const shot=guboWeaponPose(g,e,camera,p);held(entry[0],entry[1],shot.hand,shot.angle,undefined,{thrust:shot.thrust,trail:false});
 }else if(e.key==='rudolph'){
  const chant=rudolphChantPose(g,e,p),forward=rudolphForwardPose(g,e,p);held(entry[0],entry[1]*(forward?.scale??1),chant?.hand??p.right,chant?.angle??forward?.angle??p.facing,undefined,{mode:null,thrust:forward?.thrust||0,trail:false});
 }else if(e.key==='gregor'){
  const strike=gregorThrust(g,e);held(entry[0],strike?.length??entry[1],p.right,strike?.angle??p.angle,undefined,{...(strike?{mode:'thrust',progress:(g.time-e.visualCast.at)/.4}:{}),flipY:-1,straighten:strike?.straighten||0,thrust:strike?.thrust||0,trail:!strike&&slash&&attacking});
 }else if(e.key==='gahwan'&&gahwanSlash(g,e)){
  const cut=gahwanSlash(g,e);if(cut.part==='skill-r')for(let i=3;i>0;i--){c.save();c.globalAlpha*=.18/i;c.shadowColor='#ff254e';c.shadowBlur=9;held(entry[0],entry[1],p.right,cut.angle-i*.19*p.flip,undefined,{mode:'swing',progress:cut.progress,trail:false,part:'gahwan-echo-'+i});c.restore();}held(entry[0],entry[1],p.right,cut.angle,undefined,{mode:'swing',progress:cut.progress,trail:true,part:cut.part});
 }else if(e.key==='outis'&&outisSpinPose(g,e,p)){
  const spin=outisSpinPose(g,e,p);held(entry[0],entry[1],spin.hand,spin.angle,undefined,{mode:'orbit',progress:(g.time-e.state.outisSpinAt)/.4,trail:true,part:'outis-spin'});
 }else if(e.key==='heathcliff'&&heathSlamPose(g,e,p)){
  const slam=heathSlamPose(g,e,p);held(entry[0],entry[1],slam.hand,slam.angle,undefined,{mode:'swing',progress:slam.progress,trail:true,part:'heath-slam'});
 }else if(e.key==='sora'&&!g.buff(e,'soraEgo')){
  // Keep the existing central cuff pivot and raised slam, following body Z.
  const slam=attacking?Math.sin(Math.min(1,age/.18)*Math.PI)*1.25:0;
  c.save();c.translate(e.x,p.origin.y-.75-slam);orientWeapon(c,p.angle);c.translate(.18+(attacking?Math.sin(p.swing*Math.PI)*.22:0),0);drawWeapon(c,'soraFists',entry[1],{pivot:.5,disabled:Boolean(g.stat(e,'disarm')&&!e.status.disarm?.hideVisual)});c.restore();
 }else if(e.key==='sora'){
  const orbit=soraOrbitPose(e,p),pivot=orbit.active?.5:.12;held('soraClawLeft',SORA_CLAW_LENGTH,orbit.left.hand,orbit.left.angle,pivot,{mode:'orbit',progress:p.swing,trail:orbit.active,part:'claw-left'});
  held('soraClawRight',SORA_CLAW_LENGTH,orbit.right.hand,orbit.right.angle,pivot,{mode:'orbit',progress:p.swing,trail:orbit.active,part:'claw-right'});
 }else if(e.key==='ppui'){
  held('ppuiHand',entry[1],p.right,p.facing,.12,{trail:false,part:'palm-right'});held('ppuiHand',entry[1],p.left,p.facing,.12,{trail:false,part:'palm-left'});
 }else if(e.key==='meursault'){
  for(const [hand,start,part] of [[p.right,0,'fist-right'],[p.left,.1,'fist-left']]){const t=(age-start)/.1,active=t>=0&&t<1;held('meursaultFist',.8,hand,(attacking?e.attackFacing:undefined)??p.facing,.12,{thrust:active?weaponStrikePulse(t)*.65:0,trail:active,part});}
 }else if(e.key==='myo'){
  if(myoFiring(g,e)){const shot=myoRiflePose(g,e,p);held('myoRifle',2.15,shot.hand,shot.angle,.32,{mode:null,thrust:shot.thrust,trail:false});}
  else if(g.buff(e,'rabbitFrenzy')){const grip=attacking?0:Math.PI;held('myoDagger',1.45,p.right,p.angle+grip+.25,.12,{part:'dagger-right'});held('myoDagger',1.45,p.left,p.angle+grip-.25,.12,{part:'dagger-left'});}
  else held('myoDagger',1.45,p.right,p.angle,.12);
 }else if(e.key==='ishmael'){
  // Shield follows the left hand/body only; its matrix never contains attack angle.
  held('ishmaelShield',ISHMAEL_SHIELD_LENGTH*(g.buff(e,'ishmaelShield')?1.35:1),{x:p.left.x,y:p.left.y+.14},0,.5,{mode:null,trail:false,part:'shield'});
  const d=e.state.ishmaelCast?.d,angle=e.state.ishmaelCast?.windupUntil>g.time?Math.atan2(d.y,d.x):p.angle;held('ishmaelMace',2.05,p.right,angle,.12);
 }else if(e.key==='starbuck'&&e.motion?.kind==='leap'&&e.motion.elapsed/Math.max(.01,e.motion.minDuration)<=.5){
  return true;
 }else if(e.key==='starbuck'&&starbuckSlamPose(g,e,p,camera)){
  const strike=starbuckSlamPose(g,e,p,camera);held(entry[0],entry[1],strike.hand,strike.angle,undefined,{mode:'swing',progress:strike.progress,trail:false});
 }else if(e.key==='marton'&&attacking&&e.state.martonGroundStrike===e.attackSerial){
  const strike=forwardGroundStrikePose(g,e,p,camera,age);c.save();c.beginPath();c.rect(p.origin.x-8,p.origin.y-10,16,strike.groundY+.02-(p.origin.y-10));c.clip();held(entry[0],entry[1],strike.hand,strike.angle,undefined,{trail:false});c.restore();
 }else if(e.key==='ahab'&&ahabSlamPose(g,e,p,camera)){
  const strike=ahabSlamPose(g,e,p,camera);c.save();c.beginPath();c.rect(p.origin.x-8,p.origin.y-10,16,strike.groundY+.02-(p.origin.y-10));c.clip();held(entry[0],entry[1],strike.hand,strike.angle,undefined,{mode:'swing',progress:strike.progress,trail:false});c.restore();
 }else if(e.key==='ahab'&&attacking&&!e.state.ahabUlt){
  return true;
 }else{
  let angle=p.angle,thrust=!slash&&attacking?weaponStrikePulse(p.swing)*.38:0;
  if(e.key==='yan')angle=yanWeaponAngle(e,p);
  if(e.key==='nelly'&&attacking)thrust=weaponStrikePulse(p.swing)*.6;
  let accent={};
  if(e.key==='don'){
   if(e.state.donCharge){thrust=donChargePull(g,e);accent={mode:null};}
   else if(g.time-(e.state.donThrust?.at??-99)<.24){const t=(g.time-e.state.donThrust.at)/.24;thrust=-.45*e.state.donThrust.progress*(1-t)+weaponStrikePulse(t)*.8;accent={mode:'thrust',progress:t};}
  }
  held(entry[0],entry[1]*(e.key==='nelly'&&attacking?1.5:1),p.right,angle,undefined,{...accent,thrust,trail:slash&&attacking&&(e.key!=='yan'||age<.15)});
 }
 return true;
}

export const KROMER_WEAPON_MOTION={impaleDuration:.12,torsoDrop:1.05*.3};
export function kromerWeaponPose(g,e,p=equipmentPose(g,e),camera){
 if(e.state.kromerThrownUntil>g.time)return{hidden:true};
 const grab=e.state.kromerGrab;
 if(grab){const age=g.time-(e.state.kromerStrikeAt??-99),progress=Math.max(0,Math.min(1,age/KROMER_WEAPON_MOTION.impaleDuration)),pulse=age>=0&&age<KROMER_WEAPON_MOTION.impaleDuration?weaponStrikePulse(progress):0,side=Math.cos(grab.angle)<0?-1:1,angle=side>0?Math.PI/4:Math.PI*3/4,target=targetTorsoPoint(g,e,grab.target,camera),reach=WEAPON_ART.kromer[1]*weaponMotionAccent('kromer','thrust',progress).scale*.5+.15;target.y+=KROMER_WEAPON_MOTION.torsoDrop;return{hand:{x:target.x-Math.cos(angle)*reach,y:target.y-Math.sin(angle)*reach},angle,pivot:.5,mode:'thrust',progress,thrust:.5*pulse,centerGrip:true};}
 const qAge=g.time-(e.state.kromerQStrikeAt??-99),q=qAge>=0&&qAge<.25;
 return{hand:p.right,angle:q?e.state.kromerQStrikeFacing:p.angle,pivot:.11,mode:q?'thrust':undefined,progress:q?qAge/.25:undefined,thrust:q?.45*weaponStrikePulse(qAge/.25):p.attacking?.38*weaponStrikePulse(p.swing):0};
}

export function normalBloodClawPose(g,e,p=equipmentPose(g,e)){
 if(!p.attacking)return null;const phase=Math.max(0,Math.min(1,p.swing)),forward=e.attackFacing??p.facing,side=(e.attackSerial||0)%2?1:-1,angle=forward+(swingProgress(phase)-.5)*2.6*side;
 return {asset:'bloodClawRight',angle,length:1.5,hand:{x:p.origin.x+Math.cos(angle)*.3,y:p.origin.y-.78+Math.sin(angle)*.3}};
}
export function bloodClawPoses(g,e,p=equipmentPose(g,e)){
 const phase=Math.max(0,Math.min(1,(g.time-(e.attackAt??g.time))/.35)),direction=(e.attackSerial||0)%2?-1:1,base=(e.attackFacing??p.facing)+direction*Math.PI*2*weaponSwingProgress(phase),scale=1.15;
 return ['bloodClawLeft','bloodClawRight'].map((asset,i)=>{const angle=base+i*Math.PI;return {asset,angle,phase,direction,length:1.15*scale,ground:{x:Math.cos(angle)*.58,y:Math.sin(angle)*.58},hand:{x:p.origin.x+Math.cos(angle)*.58,y:p.origin.y-.86+Math.sin(angle)*.58}};});
}
function drawBloodSweep(r,e,g,lift,layer){
 const p=equipmentPose(g,e,lift),c=r.ctx,camera=r.camera,origin=camera?.worldToScreen(e,.075);
 for(const pose of bloodClawPoses(g,e,p)){
  if((pose.ground.y<0?'back':'front')!==layer)continue;
  const project=v=>{if(!camera)return {x:p.origin.x+v.x,y:p.origin.y-.86+v.y};const at=camera.worldToScreen({x:e.x+v.x,y:e.y+v.y},.075);return {x:p.origin.x+(at.x-origin.x)/camera.scale,y:p.origin.y-.86+(at.y-origin.y)/camera.scale};},hand=project(pose.ground),tip=project({x:Math.cos(pose.angle)*(1.7),y:Math.sin(pose.angle)*1.7}),angle=Math.atan2(tip.y-hand.y,tip.x-hand.x);
  c.save();c.translate(hand.x,hand.y);c.rotate(angle);c.shadowColor='#ed1643';c.shadowBlur=9;drawWeapon(c,pose.asset,pose.length,{pivot:.08,disabled:Boolean(g.stat(e,'disarm')&&!e.status.disarm?.hideVisual)});r.weaponTrail(e,g,pose.asset,{x:.1,y:0},{x:pose.length*.92,y:0},true);c.restore();
 }
}

export function gasharpoonArmPose(g,e,lift=0){
 const s=e.state.gasharpoon,origin=spriteOrigin(g,e,lift),flip=Math.cos(bodyFacing(g,e))<0?-1:1,ch=s.channel,thrust=s.thrust,age=thrust?g.time-thrust.at:-Infinity,body=FRAMES.ahabGasBody,height=2.1*body.heightScale,width=height*body.w/body.h,shoulder={x:(body.shoulder[0]/body.w-body.foot[0])*width,y:(body.shoulder[1]/body.h-body.foot[1])*height};
 const restAngle=Math.PI/2-flip*Math.PI/12,holding=age>=0&&g.time<thrust.until+.14,raise=ch?Math.min(1,Math.max(0,(g.time-ch.at)/.07)):holding?Math.min(1,Math.max(0,(g.time-(thrust.poseAt??thrust.at))/.07))*Math.min(1,Math.max(0,(thrust.until+.14-g.time)/.14)):0,aim=ch?.angle??(holding?thrust.angle:restAngle);
 let angle=restAngle+Math.atan2(Math.sin(aim-restAngle),Math.cos(aim-restAngle))*raise,push=0;
 if(ch){const progress=Math.max(0,Math.min(1,(g.time-ch.at)/.5));push=ch.slot==='q'?-.42*progress:Math.sin(g.time*(65+progress*70))*.045*progress;}
 else if(age>=0&&g.time<thrust.until){if(thrust.slot==='basic'){const fade=Math.sin(Math.min(1,age/.2)*Math.PI);push=(.09+Math.sin(g.time*83)*.018+Math.sin(g.time*127)*.009)*fade;angle+=Math.sin(g.time*99)*.012*fade;}else push=.48*Math.sin(age/.24*Math.PI);}
 return {hand:{x:origin.x+shoulder.x*flip,y:origin.y+shoulder.y-.08*(1-raise)},angle,push,mirrorX:true};
}
export function drawGasharpoonArm(r,e,g,lift=0){
 const c=r.ctx,pose=gasharpoonArmPose(g,e,lift),[key,len,pivot]=equippedWeapon(g,e),f=FRAMES[key],m=weaponGeometry(key,len);
 // Reflect the arm, then turn its blade back toward the attack direction.
 c.save();c.translate(pose.hand.x,pose.hand.y);orientWeapon(c,pose.angle);c.translate(pose.push,(f.grip[1]-.5)*m.height*m.scale);c.scale(-1,1);drawWeapon(c,key,len,{rotation:Math.PI,pivot:1-pivot,disabled:Boolean(g.stat(e,'disarm'))});c.restore();
}

// Both fists orbit the same torso axis; the distant idle hand sits behind it.
export function meiFistPoses(g,e,lift=0){
 const origin=spriteOrigin(g,e,lift),flip=Math.cos(bodyFacing(g,e))<0?-1:1,p=e.state.meiPunch,age=p?g.time-p.at:-1,active=p&&age>=0&&g.time<p.until,center={x:origin.x,y:origin.y-.65},q=e.state.meiQThrust,qActive=q&&g.time>=q.at&&g.time<q.until;
 return ['right','left'].map((side,index)=>{
  let x=origin.x+(index?.31:-.43)*flip,y=origin.y+HAND_ANCHORS.mei[1],angle=flip>0?Math.PI/12:Math.PI-Math.PI/12,on=active&&p.index%2===index,progress=active?age/MEI.interval:0,part=`${e.attackSerial}:${p?.index}`,layer=index?'back':'front';
  if(on){
   angle=p.last?p.angle:p.angle+(index?1:-1)*swingProgress(progress)*Math.PI*2;
   const reach=p.last?.25+weaponStrikePulse(progress)*.85:.74;
   x=center.x+Math.cos(angle)*reach;y=center.y+Math.sin(angle)*reach;
   layer=y<center.y?'back':'front';
  }
  if(qActive&&!index){
   progress=(g.time-q.at)/(q.until-q.at);const reach=.95*Math.min(1,progress*WEAPON_SWING_SPEED/.22)*Math.min(1,(1-progress)/.35);
   angle=q.angle;x=origin.x-.43*flip+Math.cos(angle)*reach;y=origin.y+HAND_ANCHORS.mei[1]+Math.sin(angle)*reach;on=true;layer='front';part=`q:${q.at}`;
  }
  return{side,key:index?'meiLeftFist':'meiRightFist',x,y,angle,active:Boolean(on),progress,last:!qActive&&Boolean(p?.last),direction:index?1:-1,center,layer,part};
 });
}
function meiFistFlames(c,time){
 c.save();c.shadowColor='#ff5224';c.shadowBlur=13;
 for(let i=0;i<5;i++){
  const x=.04+i*.075,tip=-.26-.08*Math.sin(time*25+i*2),sway=.04*Math.sin(time*18+i);
  c.fillStyle='#f94b23';c.beginPath();c.moveTo(x-.08,.08);c.quadraticCurveTo(x-.15,tip*.6,x+sway,tip);c.quadraticCurveTo(x+.02,tip*.3,x+.09,.08);c.closePath();c.fill();
  c.fillStyle='#ffcf35';c.beginPath();c.moveTo(x-.035,.07);c.quadraticCurveTo(x-.05,tip*.3,x+sway*.4,tip*.55);c.quadraticCurveTo(x+.02,tip*.2,x+.045,.07);c.closePath();c.fill();
 }c.restore();
}
export function drawMeiFists(r,e,g,lift=0,layer='front'){
 const c=r.ctx,poses=meiFistPoses(g,e,lift);r.meiTrails??=new Map();let history=r.meiTrails.get(e.id)||[];
 history=history.filter(p=>g.time-p.at>=0&&g.time-p.at<.5);
 for(const p of poses)if(p.active&&(!history.length||g.time-history.at(-1).at>.008))history.push({...p,at:g.time});
 if(history.length>48)history=history.slice(-48);r.meiTrails.set(e.id,history);if(r.meiTrails.size>64)r.meiTrails.delete(r.meiTrails.keys().next().value);
 for(let i=0;i<history.length;i++){
  const p=history[i],age=g.time-p.at,fade=1-age/.5,prev=history[i-1];if(p.layer!==layer)continue;c.save();c.globalAlpha*=fade*.7;c.shadowColor='#ff5121';c.shadowBlur=9;
  if(prev?.part===p.part&&prev.layer===layer){c.strokeStyle='#ed4620';c.lineWidth=.065*fade;c.beginPath();c.moveTo(prev.x,prev.y);c.lineTo(p.x,p.y);c.stroke();}
  c.fillStyle=i%4?'#ff5527':'#ffb92b';c.beginPath();c.arc(p.x+Math.sin(i*8)*age*.25,p.y-age*.4,.018*fade,0,Math.PI*2);c.fill();c.restore();
 }
 for(const p of poses){if(p.layer!==layer)continue;c.save();c.translate(p.x,p.y);orientWeapon(c,p.angle);if(p.active)meiFistFlames(c,g.time);drawWeapon(c,p.key,MEI_FIST_SIZE,{pivot:.08,disabled:Boolean(g.stat(e,'disarm'))});c.restore();}
}
