// Generated fan-art atlas; each frame is read from the unchanged transparent PNG.
export const FRAMES = {
  faust:{x:85,y:67,w:433,h:625}, yi:{x:543,y:52,w:483,h:648},
  sinclair:{x:1089,y:41,w:538,h:651}, meursault:{x:1630,y:53,w:522,h:671},
};
export const THEMES = {
  faust:{light:'#bff4f2',dark:'#449fba',accent:'#d0fff0',weapon:'zweihander'},
  yi:{light:'#d9e9ef',dark:'#6e8fac',accent:'#e6d5a2',weapon:'mirror'},
  sinclair:{light:'#f1da68',dark:'#7a9141',accent:'#fff0b8',weapon:'halberd'},
  meursault:{light:'#c3cbd8',dark:'#647a98',accent:'#d5a374',weapon:'gauntlets'},
};
export function loadAtlas(){
  const image=new Image();
  image.src=document.getElementById('sprite-data')?JSON.parse(document.getElementById('sprite-data').textContent):'./src/assets/champions.png';
  return image;
}
export function portrait(canvas,key,image){
  if(!canvas||!image.complete||!image.naturalWidth)return;
  const c=canvas.getContext('2d'),f=FRAMES[key];c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  const crop=f.h*.66;
  c.drawImage(image,f.x,f.y,f.w,crop,0,0,canvas.width,canvas.height);
}
