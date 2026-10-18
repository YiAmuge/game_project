// Generated fan-art atlas; each frame is read from the unchanged transparent PNG.
export const FRAMES = {
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
export const THEMES = {
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
  gregor:{light:"#c7df90",dark:"#607342",accent:"#b58f60",weapon:"claw"},
  rudolph:{light:"#d6a9fc",dark:"#755692",accent:"#a6dae2",weapon:"mind"},
  moses:{light:"#f0e1d4",dark:"#715d6d",accent:"#c27472",weapon:"pipe"},
  ezra:{light:"#f4cd96",dark:"#8c6b3d",accent:"#cee0dd",weapon:"hammer"},
  alisa:{light:"#ffb67a",dark:"#a04538",accent:"#fbd064",weapon:"fire"},
  gubo:{light:"#d8c1d4",dark:"#745c80",accent:"#d8a494",weapon:"rifle"},
};
export function loadAtlas(extra=false){
  const image=new Image();
  const id=extra?'sprite-data-extra':'sprite-data';image.src=document.getElementById(id)?JSON.parse(document.getElementById(id).textContent):`./src/assets/${extra?'champions-extra':'champions'}.png`;
  return image;
}
export function portrait(canvas,key,image,extraImage){
  if(FRAMES[key]?.sheet===1)image=extraImage;
  if(!canvas||!image||!image.complete||!image.naturalWidth)return;
  const c=canvas.getContext('2d'),f=FRAMES[key];c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  if(!f){c.fillStyle='#cad3bf';c.font='34px Georgia';c.textAlign='center';c.fillText(key[0].toUpperCase(),canvas.width/2,canvas.height*.7);return;}
  const crop=f.h*.66;
  c.drawImage(image,f.x,f.y,f.w,crop,0,0,canvas.width,canvas.height);
}
