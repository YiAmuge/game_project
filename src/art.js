import{WORLD_FRAMES}from'./world-sprites.js';
import{JAMILA_FRAMES}from'./jamila-sprites.js';
import{BOSS_FRAMES}from'./boss-sprites.js';
import { MINION_FRAMES } from './minion-sprites.js';
import { NEEDLE_FRAMES } from './needle-sprites.js';
import { CLERK_FRAMES } from './clerk-sprites.js';
import { SPRITE_FRAMES } from './sprites-v36.js';
// Generated fan-art atlas; source revisions are recorded in assets/sprites-v36.json.
export const FRAMES = {
  yan:{x:16,y:167,w:347,h:658,sheet:8},yanDistorted:{x:391,y:177,w:373,h:647,sheet:8},yanHand:{x:756,y:355,w:392,h:278,sheet:8},yanSword:{x:1181,y:467,w:571,h:149,sheet:8},
  sora:{x:142,y:92,w:500,h:784,sheet:7},soraEgo:{x:1139,y:47,w:553,h:829,sheet:7},
  kim:{x:196,y:105,w:602,h:771,sheet:6,mirror:true},ppui:{x:1091,y:42,w:478,h:834,sheet:6},
  starbuck:{x:323,y:168,w:660,h:973,sheet:5},
  hohenheim:{x:47,y:33,w:416,h:675,sheet:4},alisa:{x:520,y:52,w:560,h:644,sheet:4},marton:{x:1157,y:17,w:405,h:687,sheet:4},queequeg:{x:1674,y:58,w:405,h:644,sheet:4},
  rudolph:{x:58,y:9,w:454,h:715,sheet:3},
  myo:{x:576,y:14,w:407,h:710,sheet:3},
  dongbaek:{x:1029,y:15,w:584,h:695,sheet:3},
  dongrang:{x:1647,y:47,w:484,h:663,sheet:3},
  gubo:{x:16,y:15,w:526,h:693,sheet:2},
  gahwan:{x:571,y:12,w:496,h:694,sheet:2},
  nelly:{x:1112,y:28,w:480,h:678,sheet:2},
  ahab:{x:1618,y:6,w:552,h:702,sheet:2},
  faust:{x:85,y:67,w:433,h:625}, yi:{x:543,y:52,w:483,h:648},
  sinclair:{x:1089,y:41,w:538,h:651}, meursault:{x:1630,y:53,w:522,h:671},
  don:{"x": 0, "y": 16, "w": 384, "h": 514, "sheet": 1},
  ryoshu:{"x": 384, "y": 16, "w": 384, "h": 514, "sheet": 1},
  honglu:{"x": 768, "y": 16, "w": 384, "h": 514, "sheet": 1},
  heathcliff:{"x": 1152, "y": 16, "w": 384, "h": 514, "sheet": 1},
  ishmael:{"x": 0, "y": 532, "w": 384, "h": 492, "sheet": 1},
  rodya:{"x": 384, "y": 532, "w": 384, "h": 492, "sheet": 1},
  outis:{"x": 768, "y": 532, "w": 384, "h": 492, "sheet": 1},
  gregor:{"x": 1152, "y": 532, "w": 384, "h": 492, "sheet": 1},
};
Object.assign(FRAMES,SPRITE_FRAMES,CLERK_FRAMES,MINION_FRAMES,NEEDLE_FRAMES,BOSS_FRAMES,JAMILA_FRAMES,WORLD_FRAMES);
export const ATLAS_FILES=['champions','champions-extra','champions-v05','champions-v06','champions-v08','champions-v10','champions-v12','champions-v13','champions-v17','champions-v36','weapons-v36','clerks-v49','minions-v52','needles-v54','boss-v55','jamila-v62','world-v69'];
const ATLAS_IDS=['sprite-data','sprite-data-extra','sprite-data-v05','sprite-data-v06','sprite-data-v08','sprite-data-v10','sprite-data-v12','sprite-data-v13','sprite-data-v17','sprite-data-v36','weapon-data-v36','clerk-data-v49','minion-data-v52','needle-data-v54','boss-data-v55','jamila-data-v62','world-data-v69'];
const atlasImages=new Map();
export function visualForm(g,e){
 if(e.lcaTrooper)return 'jamilaTrooper';
 if(e.key==='sora'&&g.buff(e,'soraEgo'))return 'soraEgo';
 if(e.key==='yan'&&g.buff(e,'yanDistorted'))return 'yanDistorted';
 if(e.key==='queequeg'&&g.buff(e,'queequegUlt'))return 'queequegUlt';
 return e.key;
}
export const spriteHeight=(key,height=2.1)=>height*(FRAMES[key]?.heightScale||1);
export const THEMES = {
 jamila:{light:'#e3d28a',dark:'#292c2c',accent:'#d8b64b',weapon:'rifle'},
  yan:{light:'#c3e6ff',dark:'#344d69',accent:'#83c6f6',weapon:'yanSword'},
  sora:{light:'#f2d697',dark:'#32313d',accent:'#f0ba5b',weapon:'restraint'},
  kim:{light:'#90cbff',dark:'#243d69',accent:'#5f9dff',weapon:'katana'},ppui:{light:'#ffd1d6',dark:'#94364e',accent:'#dc536e',weapon:'nail'},
  starbuck:{light:'#b7d8c8',dark:'#425b51',accent:'#d9c69a',weapon:'harpoon'},
  boss:{light:'#ddb2f0',dark:'#624177',accent:'#efc5ff',weapon:'none'},
  hohenheim:{light:'#91efec',dark:'#325c69',accent:'#d9fffa',weapon:'electric'},marton:{light:'#02ebf7',dark:'#0e5967',accent:'#c8ffff',weapon:'lantern'},queequeg:{light:'#8fdbd8',dark:'#346e78',accent:'#e6b6c0',weapon:'harpoon'},
  faust:{light:'#bff4f2',dark:'#449fba',accent:'#d0fff0',weapon:'zweihander'},
  yi:{light:'#d9e9ef',dark:'#6e8fac',accent:'#e6d5a2',weapon:'mirror'},
  sinclair:{light:'#f1da68',dark:'#7a9141',accent:'#fff0b8',weapon:'halberd'},
  meursault:{light:'#c3cbd8',dark:'#647a98',accent:'#d5a374',weapon:'gauntlets'},
  don:{light:"#f5da7a",dark:"#a34135",accent:"#f5b35a",weapon:"lance"},
  ryoshu:{light:"#f18277",dark:"#8b3042",accent:"#f6b6aa",weapon:"katana"},
  honglu:{light:"#8febd7",dark:"#378b98",accent:"#beefed",weapon:"glaive"},
  heathcliff:{light:"#c398dc",dark:"#5b466e",accent:"#eee0af",weapon:"bat"},
  ishmael:{light:"#a6d9e8",dark:"#3a6e88",accent:"#f2ae65",weapon:"mace"},
  rodya:{light:"#bfe6ff",dark:"#477ba0",accent:"#e8c57d",weapon:"axe"},
  outis:{light:"#c8dfb4",dark:"#627b57",accent:"#f0f2d9",weapon:"sabre"},
  gregor:{light:"#c49a73",dark:"#65452f",accent:"#a8784e",weapon:"claw"},
  rudolph:{light:"#ffc078",dark:"#a95a2d",accent:"#ff963e",weapon:"antlerStaff"},
  moses:{light:"#f0e1d4",dark:"#715d6d",accent:"#c27472",weapon:"pipe"},
  ezra:{light:"#f4cd96",dark:"#8c6b3d",accent:"#cee0dd",weapon:"hammer"},
  alisa:{light:"#ffb67a",dark:"#a04538",accent:"#fbd064",weapon:"fire"},
  gahwan:{light:'#ffe176',dark:'#842e35',accent:'#ce453f',weapon:'spear'},
  nelly:{light:'#d4e2f5',dark:'#485572',accent:'#a4bcda',weapon:'knives'},
  ahab:{light:'#e2d6a5',dark:'#596d4d',accent:'#d9ae68',weapon:'harpoon'},
  myo:{light:'#e6ae78',dark:'#8150a3',accent:'#c59ff0',weapon:'rabbitBlade'},
  dongbaek:{light:'#fff0cc',dark:'#8e7540',accent:'#f0ce63',weapon:'fan'},
  dongrang:{light:'#e3d99c',dark:'#756939',accent:'#b6c575',weapon:'scythe'},
  gubo:{light:"#df6c7d",dark:"#340b19",accent:"#a42744",weapon:"rifle"},
};
export function loadAtlas(sheet=0){
  sheet=Number(sheet);
  if(atlasImages.has(sheet))return atlasImages.get(sheet);
  const image=new Image();
  const id=ATLAS_IDS[sheet];image.src=document.getElementById(id)?JSON.parse(document.getElementById(id).textContent):`./src/assets/${ATLAS_FILES[sheet]}.png`;atlasImages.set(sheet,image);
  return image;
}
export function portrait(canvas,key,image,extraImage,v05Image,v06Image,v08Image,v10Image,v12Image,v13Image,v17Image){
  if(FRAMES[key]?.sheet>=9)image=loadAtlas(FRAMES[key].sheet);
  if(FRAMES[key]?.sheet===8)image=v17Image;if(FRAMES[key]?.sheet===7)image=v13Image;if(FRAMES[key]?.sheet===6)image=v12Image;if(FRAMES[key]?.sheet===5)image=v10Image;if(FRAMES[key]?.sheet===4)image=v08Image;if(FRAMES[key]?.sheet===1)image=extraImage;if(FRAMES[key]?.sheet===2)image=v05Image;if(FRAMES[key]?.sheet===3)image=v06Image;
  if(!canvas||!image||!image.complete||!image.naturalWidth)return;
  const c=canvas.getContext('2d'),f=FRAMES[key];c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  if(!f){c.fillStyle='#cad3bf';c.font='34px Georgia';c.textAlign='center';c.fillText(key[0].toUpperCase(),canvas.width/2,canvas.height*.7);return;}
  drawFace(c,key,image,0,0,canvas.width,canvas.height);
}
export function drawFace(c,key,image,x,y,w,h=w){const f=FRAMES[key];if(!f||!image?.complete||!image.naturalWidth)return;const side=Math.min(f.w,f.h*.48),face=f.face||[(f.w-side)/2,f.h*.025,side,side];c.save();c.imageSmoothingEnabled=false;if(f.mirror){c.translate(x+w,y);c.scale(-1,1);x=0;y=0;}c.drawImage(image,f.x+face[0],f.y+face[1],face[2],face[3],x,y,w,h);c.restore();}
