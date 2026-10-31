import{FAN_ANGLE,basicFanAngle}from'./data.js';
// Rendering palettes are intentional per attack, independent of team/skin tint.
export const NEUTRAL={color:'#e6e7e9',accent:'#ffffff',dark:'#45484f',element:'metal'};
const style=(color,element='metal',accent=color,dark='#33353b')=>({color,element,accent,dark});
export const CHAMPION_STYLES={
 queen:style('#f16ac0','arcane','#fff2ab','#701b6a'),nosferatu:style('#cd173d','blood','#ff767a','#420b23'),
 kromer:style('#a19a8e','metal','#f3e7cf','#222227'),kromerNail:style('#56545a','metal','#c1c0c5','#09090c'),
 jamila:style('#d7b550','metal','#fff1bd','#514727'),
 yi:style('#dce9ef','mirror'),faust:{...NEUTRAL},sinclair:{...NEUTRAL},don:style('#e5bd38','metal','#fff1a5','#79611d'),meursault:{...NEUTRAL},gubo:{...NEUTRAL},
 kim:style('#629edc','metal','#c4e9ff','#1c3458'),queequeg:style('#376c70','water','#a7d4ce','#182f36'),ppui:{...NEUTRAL},
 gahwan:style('#e8c653','metal','#fff0aa','#715930'),hohenheim:style('#83cecd','electric','#d0f2ec','#28434d'),
 alisa:style('#e69a58','fire','#f6ce80','#762f26'),marton:style('#02ebf7','wood','#c8ffff','#0e5967'),nelly:{...NEUTRAL},
 myo:style('#df9653','metal','#f4c58c','#6b3f2b'),rudolph:style('#e39b4f','electric','#f5c789','#6b4123'),
 dongbaek:style('#e6ce77','petal','#fff0b3','#75653d'),dongrang:style('#b99b76','metal','#d9c5a6','#61513f'),
 outis:{...NEUTRAL},heathcliff:{...NEUTRAL},ryoshu:{...NEUTRAL},ishmael:style('#416e70','water','#a7c9c4','#1b363c'),
 honglu:style('#63aaa4','water','#b3dbd2','#24504e'),rodya:{...NEUTRAL},gregor:style('#9b7758','metal','#c1a186','#49372b'),
 ahab:style('#3e7170','water','#9fcac2','#193437'),starbuck:style('#3d7270','water','#abd1c5','#1c363d'),
 sora:style('#d9e7f3','metal','#ffffff','#627487'),yan:style('#7dadda','metal','#c6e2f7','#2b4767'),
};
export function combatStyle(key,g,e,{kind='basic',slot,type}={}){
 let s={...(CHAMPION_STYLES[key]||NEUTRAL)};
 if(key==='sora'&&e&&g.buff(e,'soraEgo'))s=style('#171820','metal','#59606a','#050609');
 if(key==='marton'&&kind==='basic'&&e&&e.state.martonGroundStrike!==e.attackSerial)s=style('#8d6e46','wood','#c6ae7a','#302218');
 if(key==='yan'&&e&&g.buff(e,'yanDistorted'))s=style('#13141b','liquid','#454853','#030407');
 if(key==='gubo'&&(type==='guboBlast'||e&&g.buff(e,'guboReload')))s=style('#6f162a','metal','#bb4255','#200711');
 if(key==='myo'&&e&&g.buff(e,'rabbitFrenzy'))s=style('#efab61','metal','#ffe0a6','#784425');
 if(key==='ryoshu'&&kind==='basic')s.accent='#e3545d';
 if(key==='sinclair'&&kind==='basic'&&e&&g.buff(e,'marks'))s=style('#a8dc6c','metal','#e0ffac','#456523');
 if(key==='ppui'&&(kind==='basic'||kind==='projectile'))s=style('#b82e45','metal','#f78d98','#4d1122');
 if(kind==='hit'){
  // Only explicit liquids/elements remain elemental on contact.
  if(!['water','liquid','fire','electric','mirror','petal'].includes(s.element))s={...s,element:'metal'};
  if(key==='rodya')s={...NEUTRAL};
 }
 if(key==='rodya'&&kind!=='basic'&&(slot==='r'||['ice','iceAxe'].includes(type)))s=style('#c0d8e7','ice','#eff8fa','#648095');
 if(key==='sinclair'&&slot==='r')s=e?.visualCast?.healthy?style('#a9c96b','wood','#bd6f66','#4e6039'):style('#73894e','wood','#a3b378','#35432e');
 if(key==='don'&&e&&g.buff(e,'donLifesteal'))s=style('#a7323f','metal','#e58a82','#40151e');
 if(key==='heathcliff'&&(slot==='r'||type==='heathAura'))s=style('#60435f','metal','#9b708c','#2f1d32');
 if(key==='ryoshu'&&(type==='ryoshuStorm'||slot==='r'))s=style('#b54c40','fire','#e8a06a','#4e2227');
 if(key==='ahab'&&type==='burst')s=style('#c87645','fire','#edb877','#4f3026');
 if(key==='outis'&&slot==='r')s=style('#ac6442','fire','#d5a36a','#354932');
 if(key==='nelly'&&type==='nellyProc')s=style('#ac343f','metal','#e49b9d','#4e1925');
 if(key==='ppui'&&slot==='r')s=style('#b82e45','metal','#f78d98','#4d1122');
 return s;
}
export function hitStyle(g,source,fx){
 const s=combatStyle(source?.key||fx.theme,g,source,{kind:'hit',slot:fx.slot,type:fx.variant||fx.type});
 if(source?.key==='sinclair'&&fx.slot==='q')return {...NEUTRAL,shape:'pierce'};
 if(source?.key==='ryoshu'&&fx.slot==='q')return {...NEUTRAL,shape:'slash'};
 return {...s,shape:(fx.variant||fx.type)==='nellyProc'?'slash':'impact'};
}
export function bodyHeight(e){return (e.kind==='champion'||e.lcaTrooper)?1.25:e.kind==='tower'?2.1:e.kind==='core'?1.6:e.camp==='boss'?1.1:e.kind==='neutral'?.65:e.kind==='summon'?.9:.35;}
export function visualShape(fx){
 if(fx.shape)return fx.shape.kind==='cone'?{...fx.shape,spread:fx.shape.spread>=Math.PI*2?fx.shape.spread:fx.damageKind==='basic'?(fx.shape.spread??basicFanAngle(fx.theme)):FAN_ANGLE,angle:fx.shape.angle??fx.angle??0}:fx.shape.kind==='rect'?{...fx.shape,angle:fx.shape.angle??fx.angle??0}:fx.shape;
 const angle=fx.angle||0,r=fx.r||1;
 if(fx.type==='yanWave')return {kind:'cone',range:r,spread:FAN_ANGLE,angle};
 if(fx.type==='yanCleave')return {kind:'rect',range:Math.hypot(fx.to.x-fx.x,fx.to.y-fx.y),width:fx.width,angle:Math.atan2(fx.to.y-fx.y,fx.to.x-fx.x)};
 if(fx.type==='line'&&fx.theme==='hohenheim')return {kind:'rect',range:Math.hypot(fx.to.x-fx.x,fx.to.y-fx.y),width:.4,angle:Math.atan2(fx.to.y-fx.y,fx.to.x-fx.x)};
 if(fx.type==='whipArc')return {kind:'circle',range:2.1675};
 if(fx.type==='gregorPierce')return {kind:'rect',range:r,width:fx.width*2,angle};
 if(fx.type==='guboBlast')return {kind:'cone',range:r,spread:FAN_ANGLE,angle};
 if(fx.spread&&!fx.circle)return {kind:'cone',range:r,spread:fx.spread>=Math.PI*2?fx.spread:fx.damageKind==='basic'?basicFanAngle(fx.theme):FAN_ANGLE,angle};
 return {kind:'circle',range:r};
}
export function insideShape(shape,x,y){
 const r=shape.range||1,a=shape.angle||0,along=x*Math.cos(a)+y*Math.sin(a),side=y*Math.cos(a)-x*Math.sin(a);
 if(shape.kind==='rect')return along>=0&&along<=r&&Math.abs(side)<=shape.width/2;
 return Math.hypot(x,y)<=r&&(shape.kind!=='cone'||Math.abs(Math.atan2(side,along))<=shape.spread/2);
}
export function clipShape(c,camera,e){
 const shape=e.shape;if(!shape)return;
 const points=[],a=shape.angle||0,r=shape.range||1,world=(x,y)=>camera.worldToScreen({x:e.x+x,y:e.y+y},.12);
 if(shape.kind==='rect')for(const [x,y] of [[0,-shape.width/2],[r,-shape.width/2],[r,shape.width/2],[0,shape.width/2]])points.push(world(x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)));
 else{const spread=shape.kind==='cone'?shape.spread:Math.PI*2;if(spread<Math.PI*2)points.push(world(0,0));for(let i=0;i<=48;i++){const b=a-spread/2+spread*i/48;points.push(world(Math.cos(b)*r,Math.sin(b)*r));}}
 c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();
}
