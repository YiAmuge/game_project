import { FRAMES,loadAtlas } from './art.js';

// Shaft extensions are geometric slices of the latest source art. The metal
// heads keep their source shape and size; only the handle interval gains length.
export const HANDLE_EXTENSIONS={
 donLance:{from:0,to:.245,scale:3.2},
 sinclairHalberd:{from:.13,to:.62,scale:1.8},
 starbuckHarpoon:{from:.075,to:.34,scale:2},
};
export const WEAPON_ART={
 yi:['yiDagger',1.15],faust:['faustSword',2.2],sinclair:['sinclairHalberd',2.45],meursault:['meursaultFist',.78],
 don:['donLance',2.35],ryoshu:['ryoshuSword',2.1],honglu:['hongluGlaive',2.65],heathcliff:['heathcliffBat',1.95],ishmael:['ishmaelMace',2.05],
 rodya:['rodyaAxe',2.05],outis:['outisFalcata',1.85],gregor:['gregorClaw',2.05],gubo:['guboRifle',2.4],gahwan:['gahwanSword',2.55],nelly:['nellyKnife',1.1],ahab:['ahabHarpoon',2.65],
 myo:['myoDagger',1.45],rudolph:['rudolphStaff',2.5],dongbaek:['dongbaekFan',1.5],dongrang:['dongrangScythe',2.1],
 hohenheim:['hohenheimStaff',2.6],alisa:['alisaClub',1.75],marton:['martonHammer',2.4],queequeg:['queequegHarpoon',2.25],starbuck:['starbuckHarpoon',2.45],kim:['kimSword',2.35],ppui:['ppuiNail',1.55],sora:['soraFists',1.05],yan:['yanSword',2.5],
};
export function weaponGeometry(key,length){
 const f=FRAMES[key];if(!f)return null;const angle=f.rotation||0,baseW=f.w,baseH=f.h;
 const extension=HANDLE_EXTENSIONS[key],extra=extension?(extension.to-extension.from)*(extension.scale-1):0;
 const width=baseW*(1+extra),span=Math.abs(width*Math.cos(angle))+Math.abs(baseH*Math.sin(angle)),scale=length/(Math.abs(baseW*Math.cos(angle))+Math.abs(baseH*Math.sin(angle)));
 return {frame:f,angle,scale,width,height:baseH,span:span*scale,extension};
}
export function drawWeapon(c,key,length,{x=0,y=0,rotation=0}={}){
 const m=weaponGeometry(key,length);if(!m)return false;const f=m.frame,image=loadAtlas(f.sheet);if(!image.complete||!image.naturalWidth)return false;
 c.save();c.imageSmoothingEnabled=false;c.translate(x+m.span/2,y);c.rotate(rotation+m.angle);c.scale(m.scale,m.scale);
 let dx=-m.width/2;
 if(m.extension){
  const e=m.extension,a=Math.round(f.w*e.from),b=Math.round(f.w*e.to),segments=[[0,a,1],[a,b-a,e.scale],[b,f.w-b,1]];
  for(const [sx,w,factor] of segments){if(w>0)c.drawImage(image,f.x+sx,f.y,w,f.h,dx,-f.h/2,w*factor,f.h);dx+=w*factor;}
 }else c.drawImage(image,f.x,f.y,f.w,f.h,dx,-f.h/2,f.w,f.h);
 c.restore();return true;
}
export function drawEquipment(r,e,g,{attacking=false,swing=0,angle=0}={}){
 const c=r.ctx,entry=WEAPON_ART[e.key];if(!entry)return false;
 const draw=(key,length,x=0,y=0,rotation=0)=>drawWeapon(c,key,length,{x,y,rotation});
 if(e.key==='sora'){
  if(g.buff(e,'soraEgo')){for(const [i,side] of [[0,-1],[1,1]]){c.save();c.translate(.05,side*.48);c.rotate(side*(attacking?.35+Math.sin(swing*Math.PI)*.25:.1));r.weaponTrail(e,g,`claw-${i}`,{x:.4,y:0},{x:1.7,y:0},attacking);draw(i?'soraClawRight':'soraClawLeft',1.65);c.restore();}}
  else draw('soraFists',1.05,.15);
 }else if(e.key==='meursault'){draw('meursaultFist',.8,.25,-.24);draw('meursaultFist',.8,.5,.24);}
 else if(e.key==='myo'){
  const firing=e.castSlot==='q'&&g.time-(e.castAt??-99)<.5;
  draw('myoRifle',firing?2.15:1.75,-.1,firing?-.05:-.5);draw('myoDagger',1.45,.15,firing?.55:.08);
 }else{
  draw(entry[0],entry[1],-.1);
  if(e.key==='ishmael'){c.save();c.translate(.12,.65);c.rotate(-angle);const scale=g.buff(e,'ishmaelShield')?1.35:1;draw('ishmaelShield',.65*scale,-.15,-.4);c.restore();}
 }
 return true;
}
