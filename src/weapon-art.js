import { FRAMES,loadAtlas,visualForm } from './art.js';
import { leapLift,levitationLift,feetOffset } from './projection-25d.js';
import { drawGripHands,gripSourcePoint } from './weapon-grips.js';
import { carried } from './attachments.js';
import { rudolphWeaponProgress,RUDOLPH_WEAPON } from './rudolph-weapon.js';
import{basicStance,bodyFacing,restingStance,combatPoseActive}from'./champion-pose.js';

// Shaft extensions are geometric slices of the latest source art. The metal
// heads keep their source shape and size; only the handle interval gains length.
export const HANDLE_EXTENSIONS={
 donLance:{from:0,to:.245,scale:3.2},
 sinclairHalberd:{from:.13,to:.62,scale:1.8},
 starbuckHarpoon:{from:.075,to:.34,scale:2},
 hongluGlaive:{from:.025,to:.45,scale:1.25},
};
export const WEAPON_ART={
 kromer:['kromerNail',2.45],
 jamila:['jamilaRifle',2.25],
 yi:['yiDagger',1.15],faust:['faustSword',2.2],sinclair:['sinclairHalberd',2.45],meursault:['meursaultFist',.78],
 don:['donLance',2.35],ryoshu:['ryoshuSword',2.1],honglu:['hongluGlaive',2.65],heathcliff:['heathcliffBat',1.95],ishmael:['ishmaelMace',2.05],
 rodya:['rodyaAxe',2.05],outis:['outisFalcata',2],gregor:['gregorClaw',2.05],gubo:['guboRifle',2.4],gahwan:['gahwanSword',2.55],nelly:['nellyKnife',1.1],ahab:['ahabHarpoon',2.65],
 myo:['myoDagger',1.45],rudolph:['rudolphStaff',2.5],dongbaek:['dongbaekFan',1.5],dongrang:['dongrangScythe',2.1*1.5],
 hohenheim:['hohenheimStaff',2.6],alisa:['alisaClub',1.75],marton:['martonHammer',2.4],queequeg:['queequegHarpoon',2.25],starbuck:['starbuckHarpoon',2.45],kim:['kimSword',2.35],ppui:['ppuiHand',.48],sora:['soraFists',.84*.75],yan:['yanSword',3],
};
export const MIDDLE_GRIP=new Set(['starbuck','don','sinclair','honglu','dongrang','hohenheim','marton','rudolph']);
export const gripPivot=key=>key==='jamila'?.238:key==='kromer'?.11:MIDDLE_GRIP.has(key)?.25:.12;
// Aim stays in a 180-degree arc; crossing behind flips the local X axis.
export function weaponOrientation(angle){const x=Math.cos(angle),y=Math.sin(angle);return {flip:x<-1e-10?-1:1,angle:Math.atan2(y,Math.abs(x))};}
export function orientWeapon(c,angle){const pose=weaponOrientation(angle);c.scale(pose.flip,1);c.rotate(pose.angle);return pose;}
export const SORA_CLAW_LENGTH=1.65*.8*.88;
export const ISHMAEL_SHIELD_LENGTH=.38;
export const EMISSION_ANCHORS={gubo:[.99,.32],rudolph:[.94,.48],myo:[.995,.50],jamila:[.99,.23]};
// Anatomical hands in crown-to-sole world units, independent of hair/ornaments.
export const HAND_ANCHORS={kromer:[-.30,-.78],jamila:[-.29,-.57],yan:[-.29,-.78],sora:[-.3,-.78],kim:[-.34,-.75],ppui:[-.29,-.8],starbuck:[-.32,-.8],yi:[-.28,-.8],faust:[-.29,-.8],ryoshu:[-.29,-.8],don:[-.29,-.8],meursault:[-.33,-.8],honglu:[-.3,-.8],heathcliff:[-.33,-.8],ishmael:[-.31,-.8],rodya:[-.32,-.8],sinclair:[-.28,-.8],outis:[-.29,-.8],gregor:[-.31,-.8],dongbaek:[-.34,-.8],dongrang:[-.36,-.8],ahab:[-.43,-.8],queequeg:[-.4,-.8],nelly:[-.3,-.8],gubo:[-.33,-.8],gahwan:[-.3,-.8],hohenheim:[-.32,-.8],alisa:[-.3,-.8],marton:[-.34,-.8],myo:[-.3,-.8],rudolph:[-.32,-.8]};
export function spriteOrigin(g,e,extraLift=0){return {x:e.x,y:e.y+.3+Math.sin(g.time*3+e.id)*.025-leapLift(e)-extraLift};}
export function equipmentPose(g,e,extraLift=levitationLift(g,e)){
 const origin=spriteOrigin(g,e,extraLift),f=FRAMES[visualForm(g,e)],aim=e.facing??(e.team?Math.PI:0),stance=basicStance(g,e)||(!combatPoseActive(g,e)&&Math.abs(Math.sin(aim))<1e-6?restingStance(g,e,aim):null),facing=stance?.weaponFacing??aim,flip=(Math.cos(bodyFacing(g,e))<0)!==Boolean(f?.mirror)?-1:1,[baseX,y]=HAND_ANCHORS[e.key]||[-.3,-.8],x=baseX*(e.key==='sora'&&g.buff(e,'soraEgo')?1.1:1);
 const duration=e.key==='ryoshu'?.25:.3,age=g.time-(e.attackAt??-99),attacking=age>=0&&age<duration,style=g.attackStyle(e),slash=['slash','sweep'].includes(style),swing=age/duration,side=(e.attackSerial||0)%2?1:-1;
 let angle=attacking?(e.attackFacing??facing):facing;
 if(slash&&attacking)angle+=e.key==='honglu'?swingProgress(swing)*Math.PI*2:(swingProgress(swing)-.5)*2.25*side;
 if(e.state.donCharge)angle=facing;
 if(e.state.donThrust&&g.time-e.state.donThrust.at<.24)angle=e.state.donThrust.angle;
 if(e.key==='starbuck'&&(e.motion?.kind==='leap'&&e.motion.elapsed/Math.max(.01,e.motion.minDuration)>.5||g.time-(e.state.starbuckLandedAt??-99)<.22))angle=Math.PI/2;
 const handY=y+(['honglu','dongrang'].includes(e.key)?.15:0);
 return {origin,right:{x:origin.x+x*flip,y:origin.y+handY},left:{x:origin.x-x*flip,y:origin.y+handY},angle,age,attacking,slash,swing,flip,facing,resting:Boolean(stance)};
}
export function swingProgress(t){
 t=Math.max(0,Math.min(1,t));const turn=.8/3;return t<=turn?t*3:.8+(t-turn)*(.2/(1-turn));
}
export function weaponMotionAccent(key,mode,progress){
 const pulse=mode&&key!=='nelly'&&progress>=0&&progress<=1?Math.sin(progress*Math.PI):0;
 return {scale:1+.20*pulse,outward:mode==='swing'?.18*pulse:0};
}
export function basicWeaponAccent(g,e,p=equipmentPose(g,e)){
 if(e.key==='rudolph')return {scale:rudolphForwardPose(g,e,p)?.scale??1,outward:0};
 const style=g.attackStyle(e),mode=p.attacking?(p.slash?(e.key==='honglu'||e.key==='sora'?'orbit':'swing'):['thrust','whip'].includes(style)?'thrust':null):null;
 const accent=weaponMotionAccent(e.key,mode,e.key==='yan'?p.age/.15:p.swing);
 if(mode&&e.key==='kim'&&e.state.kimWideSlashSerial===e.attackSerial)accent.scale+=.12*Math.sin(p.swing*Math.PI);
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
 const down=Math.max(0,Math.min(1,age/impact)),recover=Math.max(0,Math.min(1,(age-impact)/recovery));
 const headY=p.origin.y-1.1+(1.1+depth)*down**2-.55*recover;
 return {hand:{x:p.right.x,y:headY-(head-pivot)*length},angle:Math.PI/2,headY};
}
export function frontGroundPoint(e,p,camera,{distance=.85,angle=e.attackFacing??p.facing}={}){
 const front={x:e.x+Math.cos(angle)*distance,y:e.y+Math.sin(angle)*distance};if(!camera)return {x:front.x,y:front.y+feetOffset(e)};
 const at=camera.worldToScreen(e,.075),to=camera.worldToScreen(front,.075);return {x:e.x+(to.x-at.x)/camera.scale,y:e.y+feetOffset(e)+(to.y-at.y)/camera.scale};
}
export function forwardGroundStrikePose(g,e,p,camera,age,{impact=.11,recovery=.19,depth=.02,head=[.9,.5],progress=age/.3,angle=e.attackFacing??p.facing}={}){
 const point=frontGroundPoint(e,p,camera,{angle}),down=Math.max(0,Math.min(1,age/impact)),recover=Math.max(0,Math.min(1,(age-impact)/recovery)),accent=weaponMotionAccent(e.key,'swing',progress),[key,length]=WEAPON_ART[e.key],m=weaponGeometry(key,length*accent.scale),tip=gripSourcePoint(head,m,gripPivot(e.key)),headY=point.y-1.1+(1.1+depth)*down**2-.55*recover;
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
 return {hand:p.right,angle:p.angle,thrust:p.attacking?Math.sin(p.swing*Math.PI)*.38:0};
}
export function weaponEmissionPoint(g,e,camera){
 if(!['gubo','rudolph','myo','jamila'].includes(e.key)||e.key==='myo'&&!myoFiring(g,e))return null;
 const p=equipmentPose(g,e),forward=rudolphForwardPose(g,e,p),chant=rudolphChantPose(g,e,p),shot=e.key==='gubo'?guboWeaponPose(g,e,camera,p):e.key==='jamila'?jamilaWeaponPose(g,e,p):{hand:chant?.hand??p.right,angle:chant?.angle??forward?.angle??p.facing,thrust:forward?.thrust||0},[key,length]=e.key==='myo'?['myoRifle',2.15]:WEAPON_ART[e.key],accent=['myo','jamila'].includes(e.key)?{scale:1,outward:0}:basicWeaponAccent(g,e,p),m=weaponGeometry(key,length*accent.scale),[u,v]=EMISSION_ANCHORS[e.key],thrust=(shot.thrust||0)+accent.outward,pivot=e.key==='jamila'?.238:key==='kromer'?.11:e.key==='myo'?.32:gripPivot(e.key);
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
 const facing=(p.attacking?e.attackFacing:undefined)??p.facing,angle=facing+swingProgress(p.swing)*Math.PI*2,radius=(.9+.2*Math.sin(Math.max(0,Math.min(1,p.swing))*Math.PI))*1.1;
 return p.attacking?{left:{hand:bodyOrbit(p,angle+Math.PI,radius),angle:facing+Math.PI},right:{hand:bodyOrbit(p,angle,radius),angle:facing},active:true}:{left:{hand:p.left,angle:facing},right:{hand:p.right,angle:facing},active:false};
}
export function outisSpinPose(g,e,p){
 const age=g.time-(e.state.outisSpinAt??-99);if(age<0||age>=.4)return null;
 const angle=(e.state.outisSpinFacing??p.facing)+swingProgress(age/.4)*Math.PI*2;return {hand:bodyOrbit(p,angle,.5),angle};
}
export function ultimateOrbitPose(g,e,p){
 if(!['sinclair','ryoshu'].includes(e.key))return null;
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
 const m=e.motion,air=m?.kind==='leap'&&m.actionKind==='skill',after=g.time-(e.state.heathSlamAt??-99),charging=e.state.chargeAt!==undefined;
 if(!charging&&!air&&(after<0||after>=.18))return null;
 const duration=air?Math.max(.01,m.minDuration||0,m.total/m.speed):0,window=Math.min(.14,duration*.6),swing=air?Math.max(0,Math.min(1,1-(duration-m.elapsed)/window)):charging?0:1;
 const recover=!air&&!charging?Math.max(0,Math.min(1,(after-.04)/.14)):0,side=weaponOrientation(air?Math.atan2(m.dy,m.dx):e.state.heathSlamFacing??p.facing).flip,angle=-Math.PI/2+side*Math.PI*swingProgress(swing);
 const hand={x:p.right.x,y:p.right.y+(p.origin.y+.06-WEAPON_ART.heathcliff[1]*.88-p.right.y)*swing**2};
 return {hand:{x:hand.x,y:hand.y+(p.right.y-hand.y)*recover},angle:angle+(p.facing-angle)*recover,progress:swing};
}
export function gregorThrust(g,e){
 const cast=e.visualCast,age=g.time-(cast?.at??-99);if(cast?.slot!=='q'||age<0||age>=.4)return null;
 const extend=age<.08?1-(1-age/.08)**3:age<.2?1:Math.max(0,1-(age-.2)/.2),range=6+(g.buff(e,'mutant')?2.5:0);
 return {angle:cast.angle,straighten:extend,length:WEAPON_ART.gregor[1]+(range-WEAPON_ART.gregor[1])*extend,thrust:.45*Math.sin(Math.min(1,age/.25)*Math.PI)};
}
export function gahwanSlash(g,e){
 const cast=e.visualCast,age=g.time-(cast?.at??-99);if(age<0)return null;
 const duration=cast?.slot==='q'?.26:cast?.slot==='r'?.32:0;if(!duration||age>=duration)return null;
 const progress=age/duration;return {angle:cast.angle+(swingProgress(progress)-.5)*2.5*weaponOrientation(cast.angle).flip,progress,part:`skill-${cast.slot}`};
}
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
 if(e.key==='jamila'){if(e.lcaTrooper)return;const p=equipmentPose(g,e,lift),c=r.ctx,q=Boolean(e.state.jamilaQ&&e.state.jamilaQ.phase!=='retreat');c.save();c.translate(p.origin.x,p.origin.y-.95);c.scale(p.flip,1);drawWeapon(c,q?'jamilaRifle':'jamilaKopis',q?2.1:1.75,{x:q?.06:.32,rotation:q?.95:1.05,pivot:.5,disabled:Boolean(g.stat(e,'disarm'))});c.restore();return;}
 if(e.key!=='myo'||myoFiring(g,e))return;
 const p=equipmentPose(g,e,lift),c=r.ctx;c.save();c.translate(p.origin.x,p.origin.y-.95);c.scale(p.flip,1);drawWeapon(c,'myoRifle',2.1,{x:.06,rotation:.95,pivot:.5,disabled:Boolean(g.stat(e,'disarm'))});c.restore();
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
export function drawWeapon(c,key,length,{x=0,y=0,rotation=0,pivot=0,straighten=0,disabled=false}={}){
 const m=weaponGeometry(key,length);if(!m)return false;const f=m.frame,image=loadAtlas(f.sheet);if(!image.complete||!image.naturalWidth)return false;
 c.save();if(disabled)c.filter='grayscale(1) brightness(.7)';c.imageSmoothingEnabled=false;c.translate(x,y);c.rotate(rotation);c.translate((.5-pivot)*m.span,0);c.rotate(m.angle);c.scale(m.scale,m.scale);
 let dx=-m.width/2;
 if(key==='gregorClaw'&&straighten>0){
  c.scale(1,WEAPON_ART.gregor[1]/length);
  for(let sx=0;sx<f.w;sx+=3){const w=Math.min(3,f.w-sx),u=(sx+w/2)/f.w,bend=(gregorCenterline(u)-.5)*f.h*straighten;c.drawImage(image,f.x+sx,f.y,w,f.h,-f.w/2+sx,-f.h/2-bend,w+.15,f.h);}
 }else if(m.extension){
  const e=m.extension,a=Math.round(f.w*e.from),b=Math.round(f.w*e.to),segments=[[0,a,1],[a,b-a,e.scale],[b,f.w-b,1]];
  for(const [sx,w,factor] of segments){if(w>0)c.drawImage(image,f.x+sx,f.y,w,f.h,dx,-f.h/2,w*factor,f.h);dx+=w*factor;}
 }else c.drawImage(image,f.x,f.y,f.w,f.h,dx,-f.h/2,f.w,f.h);
 c.restore();if(disabled){c.save();c.translate(x,y);c.rotate(rotation);drawDisarmChains(c,m,pivot);c.restore();}return true;
}
export function hohenheimWeaponCharge(g,e){return e.key==='hohenheim'?e.state.posthumous?1:Math.max(0,Math.min(1,(e.state.hohenCharge?.progress||0)/1.5)):0;}
export function drawWeaponCharge(c,r,g,e,m,pivot){
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
export function jamilaWeaponPose(g,e,p=equipmentPose(g,e)){
 const q=e.state.jamilaQ;if(q&&q.phase!=='retreat'){const progress=q.phase==='slash'?Math.max(0,Math.min(1,(g.time-q.slashAt)/.2)):0;return {asset:'jamilaKopis',length:1.75,hand:p.right,angle:q.angle+(q.phase==='slash'?(swingProgress(progress)-.5)*Math.PI:0),mode:q.phase==='slash'?'swing':null,progress,thrust:0,trail:q.phase==='slash',dim:1,gripY:-.02};}
 const age=g.time-(e.attackAt??-99),active=age>=0&&age<.14,pulse=active?1-age/.14:0,shake=Math.sin(age*155)*.018*pulse;return {asset:'jamilaRifle',length:2.25,hand:{x:p.right.x+shake,y:p.right.y+Math.cos(age*133)*.012*pulse},angle:(active?e.attackFacing:p.facing)??p.facing,mode:null,thrust:(.09-Math.sin(age*90)*.045)*pulse,trail:false,dim:e.state.lcaReload?.5:1,gripY:.3};
}
export function drawEquipment(r,e,g,{lift=0,camera=r.camera}={}){
 const c=r.ctx,entry=WEAPON_ART[e.key];if(!entry)return false;
 if(e.key==='yan'&&g.buff(e,'yanDistorted')&&!e.previewStance||e.key==='nelly'&&e.visualCast?.slot==='q'&&g.time-e.visualCast.at>=0&&g.time-e.visualCast.at<.24)return true;
 const p=equipmentPose(g,e,lift),{attacking,age,slash}=p;
 const held=(key,length,hand=p.right,angle=p.angle,pivot=gripPivot(e.key),{thrust=0,trail=slash&&attacking,part='weapon',flipY=1,straighten=0,mode,progress,centerGrip=false,dim=1,gripY=0}={})=>{
  const accent=mode===undefined?basicWeaponAccent(g,e,p):weaponMotionAccent(e.key,mode,progress),displayLength=length*accent.scale,m=weaponGeometry(key,displayLength);if(!m)return;
  c.save();c.translate(hand.x,hand.y);orientWeapon(c,angle);c.translate(thrust+accent.outward,-gripY*m.height*m.scale);if(flipY!==1)c.scale(1,flipY);drawGripHands(c,e.key,key,m,pivot,'back',{centered:centerGrip});c.save();if(dim<1)c.filter=`brightness(${dim})`;drawWeapon(c,key,displayLength,{pivot,straighten,disabled:Boolean(g.stat(e,'disarm'))});c.restore();drawWeaponCharge(c,r,g,e,m,pivot);drawGripHands(c,e.key,key,m,pivot,'front',{centered:centerGrip});
  r.weaponTrail(e,g,part,{x:m.span*(.25-pivot),y:0},{x:m.span*(1-pivot),y:0},trail);c.restore();
 };
 if(e.key==='yan'&&e.previewStance&&g.buff(e,'yanDistorted')){const body=FRAMES.yanDistorted,height=2.1*body.heightScale,right=height*body.w/body.h*(1-body.foot[0]);c.save();c.translate(p.origin.x+right+1.72,p.origin.y-.6);drawWeapon(c,'yanHand',3.2,{pivot:.5});c.restore();return true;}
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
  const cut=gahwanSlash(g,e);held(entry[0],entry[1],p.right,cut.angle,undefined,{mode:'swing',progress:cut.progress,trail:true,part:cut.part});
 }else if(e.key==='outis'&&outisSpinPose(g,e,p)){
  const spin=outisSpinPose(g,e,p);held(entry[0],entry[1],spin.hand,spin.angle,undefined,{mode:'orbit',progress:(g.time-e.state.outisSpinAt)/.4,trail:true,part:'outis-spin'});
 }else if(e.key==='heathcliff'&&heathSlamPose(g,e,p)){
  const slam=heathSlamPose(g,e,p);held(entry[0],entry[1],slam.hand,slam.angle,undefined,{mode:'swing',progress:slam.progress,trail:true,part:'heath-slam'});
 }else if(e.key==='sora'&&!g.buff(e,'soraEgo')){
  // Keep the existing central cuff pivot and raised slam, following body Z.
  const slam=attacking?Math.sin(Math.min(1,age/.18)*Math.PI)*1.25:0;
  c.save();c.translate(e.x,p.origin.y-.75-slam);orientWeapon(c,p.angle);c.translate(.18+(attacking?Math.sin(p.swing*Math.PI)*.22:0),0);drawWeapon(c,'soraFists',entry[1],{pivot:.5,disabled:Boolean(g.stat(e,'disarm'))});c.restore();
 }else if(e.key==='sora'){
  const orbit=soraOrbitPose(e,p),pivot=orbit.active?.5:.12;held('soraClawLeft',SORA_CLAW_LENGTH,orbit.left.hand,orbit.left.angle,pivot,{mode:'orbit',progress:p.swing,trail:orbit.active,part:'claw-left'});
  held('soraClawRight',SORA_CLAW_LENGTH,orbit.right.hand,orbit.right.angle,pivot,{mode:'orbit',progress:p.swing,trail:orbit.active,part:'claw-right'});
 }else if(e.key==='ppui'){
  held('ppuiHand',entry[1],p.right,p.facing,.12,{trail:false,part:'palm-right'});held('ppuiHand',entry[1],p.left,p.facing,.12,{trail:false,part:'palm-left'});
 }else if(e.key==='meursault'){
  for(const [hand,start,part] of [[p.right,0,'fist-right'],[p.left,.1,'fist-left']]){const t=(age-start)/.1,active=t>=0&&t<1;held('meursaultFist',.8,hand,(attacking?e.attackFacing:undefined)??p.facing,.12,{thrust:active?Math.sin(t*Math.PI)*.65:0,trail:active,part});}
 }else if(e.key==='myo'){
  if(myoFiring(g,e))held('myoRifle',2.15,p.right,p.facing,.32,{mode:null,trail:false});
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
  let angle=p.angle,thrust=!slash&&attacking?Math.sin(p.swing*Math.PI)*.38:0;
  if(e.key==='yan')angle=yanWeaponAngle(e,p);
  if(e.key==='nelly'&&attacking)thrust=Math.sin(p.swing*Math.PI)*.6;
  let accent={};
  if(e.key==='don'){
   if(e.state.donCharge){thrust=donChargePull(g,e);accent={mode:null};}
   else if(g.time-(e.state.donThrust?.at??-99)<.24){const t=(g.time-e.state.donThrust.at)/.24;thrust=-.45*e.state.donThrust.progress*(1-t)+Math.sin(t*Math.PI)*.8;accent={mode:'thrust',progress:t};}
  }
  held(entry[0],entry[1]*(e.key==='nelly'&&attacking?1.5:1),p.right,angle,undefined,{...accent,thrust,trail:slash&&attacking&&(e.key!=='yan'||age<.15)});
 }
 return true;
}

export function kromerWeaponPose(g,e,p=equipmentPose(g,e),camera){
 if(e.state.kromerThrownUntil>g.time)return{hidden:true};
 const grab=e.state.kromerGrab;
 if(grab){const age=g.time-(e.state.kromerStrikeAt??-99),progress=Math.max(0,Math.min(1,age/.24)),pulse=age>=0&&age<.24?Math.sin(progress*Math.PI):0,side=Math.cos(grab.angle)<0?-1:1,angle=side>0?Math.PI/4:Math.PI*3/4,target=targetTorsoPoint(g,e,grab.target,camera),reach=WEAPON_ART.kromer[1]*(1+.2*pulse)*.5+.15;return{hand:{x:target.x-Math.cos(angle)*reach,y:target.y-Math.sin(angle)*reach},angle,pivot:.5,mode:'thrust',progress,thrust:.5*pulse,centerGrip:true};}
 const qAge=g.time-(e.state.kromerQStrikeAt??-99),q=qAge>=0&&qAge<.25;
 return{hand:p.right,angle:q?e.state.kromerQStrikeFacing:p.angle,pivot:.11,mode:q?'thrust':undefined,progress:q?qAge/.25:undefined,thrust:q?.45*Math.sin(qAge/.25*Math.PI):p.attacking?.38*Math.sin(p.swing*Math.PI):0};
}
