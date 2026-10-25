import { loadAtlas } from './art.js';

export const UNCHANGED_HANDS=new Set(['meursault','sora','ppui','queequeg','gregor']);
export const TWO_HANDED_GRIPS=new Set(['sinclair','marton','honglu','dongrang','hohenheim']);
const BLACK_GLOVES=new Set(['sinclair','hohenheim','gubo','gahwan','myo','rudolph','yan','kim']);
const BROWN_GLOVES=new Set(['alisa','dongrang']);
// Midtones sampled from the latest body faces, independent of team tint.
export const BARE_HAND_COLORS={yi:'#f8d8c0',faust:'#f0e0d8',don:'#f8d8c0',ryoshu:'#f8d0c0',honglu:'#f8d8c8',heathcliff:'#d09880',ishmael:'#f8d0c0',rodya:'#f8d8c8',outis:'#e0a880',nelly:'#f0a888',dongbaek:'#f8d8b8',marton:'#c89878',starbuck:'#d88848'};
const GLOVE_PALETTES={
 black:{base:'#292e38',shadow:'#141820',light:'#59616f',outline:'#090c11'},
 brown:{base:'#805a3b',shadow:'#4b3425',light:'#ad8357',outline:'#291e18'},
 white:{base:'#eee9df',shadow:'#b6afa5',light:'#fffaf1',outline:'#373438'},
};
const mix=(color,t)=>'#'+[1,3,5].map(i=>{const n=parseInt(color.slice(i,i+2),16);return Math.round(t>=0?n+(255-n)*t:n*(1+t)).toString(16).padStart(2,'0');}).join('');
export function gripAppearance(key){
 if(UNCHANGED_HANDS.has(key))return null;
 const material=BLACK_GLOVES.has(key)?'black':BROWN_GLOVES.has(key)?'brown':key==='ahab'?'white':BARE_HAND_COLORS[key]?'skin':null;
 if(!material)return null;const base=BARE_HAND_COLORS[key];
 return {material,...(material==='skin'?{base,shadow:mix(base,-.24),light:mix(base,.24),outline:'#302620'}:GLOVE_PALETTES[material])};
}
// Source-space handle centerlines. Placement happens after shaft stretching,
// normalization and rotation, so both hands stay clustered at the final grip.
export const GRIP_PATHS={
 yiDagger:[[.075,.49],[.33,.49]],faustSword:[[.035,.49],[.175,.49]],sinclairHalberd:[[.16,.39],[.62,.37]],
 donLance:[[.04,.49],[.22,.49]],ryoshuSword:[[.07,.36],[.245,.37]],hongluGlaive:[[.11,.19],[.37,.25]],
 heathcliffBat:[[.055,.47],[.30,.48]],ishmaelMace:[[.06,.53],[.43,.52]],rodyaAxe:[[.07,.53],[.50,.31]],
 outisFalcata:[[.075,.50],[.225,.47]],gahwanSword:[[.035,.50],[.15,.50]],nellyKnife:[[.065,.44],[.35,.41]],ahabHarpoon:[[.12,.50],[.53,.50]],
 myoDagger:[[.07,.43],[.32,.43]],rudolphStaff:[[.07,.525],[.43,.53]],dongbaekFan:[[.17,.82],[.205,.78]],
 dongrangScythe:[[.035,.97],[.51,.33]],hohenheimStaff:[[.07,.54],[.55,.415]],alisaClub:[[.035,.50],[.23,.50]],
 martonHammer:[[.075,.565],[.64,.55]],starbuckHarpoon:[[.115,.46],[.30,.45]],kimSword:[[.055,.49],[.20,.49]],yanSword:[[.07,.48],[.155,.48]],
 guboRifle:[[.27,.60],[.27,.60]],myoRifle:[[.25,.77],[.25,.77]],ishmaelShield:[[.50,.54],[.50,.54]],
};
export function stretchedGripX(x,m){
 const e=m.extension;if(!e)return x;const a=Math.round(m.frame.w*e.from),b=Math.round(m.frame.w*e.to);
 return x<=a?x:x<b?a+(x-a)*e.scale:a+(b-a)*e.scale+x-b;
}
export function gripSourcePoint(source,m,pivot){
 const [u,v]=source,x=(stretchedGripX(u*m.frame.w,m)-m.width/2)*m.scale,y=(v-.5)*m.frame.h*m.scale,c=Math.cos(m.angle),s=Math.sin(m.angle);
 return {x:(.5-pivot)*m.span+x*c-y*s,y:x*s+y*c,source:[u,v]};
}
const layouts=new Map();
export function gripLayout(key,asset,m,pivot){
 if(!gripAppearance(key)||!m||!GRIP_PATHS[asset])return [];
 const cacheKey=[key,asset,m.scale,pivot].join('/');if(layouts.has(cacheKey))return layouts.get(cacheKey);
 const [a,b]=GRIP_PATHS[asset],at=t=>gripSourcePoint([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],m,pivot),first=at(0),last=at(1),kind=asset==='guboRifle'||asset==='myoRifle'?'gun':asset==='ishmaelShield'?'shield':'shaft';
 const nearest=x=>{let low=0,high=1;const target=Math.max(Math.min(first.x,last.x),Math.min(Math.max(first.x,last.x),x));for(let i=0;i<24;i++){const t=(low+high)/2;if((at(t).x<target)===(last.x>=first.x))low=t;else high=t;}return {...at((low+high)/2),kind};};
 const primary=nearest(0),points=TWO_HANDED_GRIPS.has(key)?[primary,{...nearest(primary.x+.27),offHand:true}]:[primary];
 if(layouts.size>=64)layouts.delete(layouts.keys().next().value);layouts.set(cacheKey,points);return points;
}
const textures=new Map();
function handTexture(palette,kind,layer){
 const key=[palette.material,palette.base,kind,layer].join('/');if(textures.has(key))return textures.get(key);
 const canvas=document.createElement('canvas');canvas.width=24;canvas.height=28;canvas.dataset.gripMaterial=palette.material;canvas.dataset.gripKind=kind;canvas.dataset.gripLayer=layer;canvas.dataset.gripColor=palette.base;
 const c=canvas.getContext('2d'),rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);},p=palette;
 if(layer==='back'){
  rect(6,6,12,17,p.outline);rect(4,9,16,11,p.outline);rect(7,22,10,4,p.outline);
  rect(6,8,12,13,p.base);rect(8,21,8,4,p.base);rect(15,9,3,13,p.shadow);rect(6,9,2,10,p.light);rect(8,24,8,1,p.shadow);
 }else if(kind==='gun'){
  rect(11,5,12,4,p.outline);rect(12,6,10,2,p.base);rect(12,6,7,1,p.light);
  rect(7,10,13,13,p.outline);rect(8,11,11,11,p.base);rect(10,15,7,1,p.shadow);rect(10,19,6,1,p.shadow);
  rect(4,9,7,9,p.outline);rect(5,10,5,7,p.base);rect(5,10,2,4,p.light);rect(7,16,3,1,p.shadow);
 }else{
  rect(4,7,16,9,p.outline);rect(5,8,14,7,p.base);rect(5,8,13,1,p.light);rect(9,9,1,5,p.shadow);rect(14,9,1,5,p.shadow);
  rect(14,15,7,6,p.outline);rect(15,16,5,4,p.base);rect(15,16,2,1,p.light);rect(16,19,4,1,p.shadow);
 }
 textures.set(key,canvas);return canvas;
}
export function drawGripHands(c,key,asset,m,pivot,layer){
 const palette=gripAppearance(key);if(!palette||typeof document==='undefined'||!document.createElement)return;
 const atlas=loadAtlas(m.frame.sheet);if(!atlas.complete||!atlas.naturalWidth)return;
 for(const point of gripLayout(key,asset,m,pivot)){
  if(point.kind==='shield'&&layer==='front')continue;
  const texture=handTexture(palette,point.kind,layer),anchor=point.kind==='gun'?7:12;c.save();c.imageSmoothingEnabled=false;c.translate(point.x,point.y);if(point.offHand)c.scale(-1,1);c.drawImage(texture,-.15,-.32*anchor/28,.30,.32);c.restore();
 }
}
