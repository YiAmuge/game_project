// Approved artwork is kept unchanged; source rectangles exclude sheet captions.
export const AUGMENT_ART={
 finalBullet:['combat',0,25,390,390],power15:['combat',395,30,365,385],range7:['combat',775,55,355,355],reloadStacks:['mourning',0,0,1254,1254],
 glaive:['combat',15,500,430,420],wisdom:['combat',475,625,660,280],duelManual:['combat',1170,535,315,385],
 resentment:['survival',10,20,370,395],kAmpule:['survival',405,30,340,375],forceBattery:['survival',775,130,380,275],blackOrb:['survival',1185,20,340,390],
 antimatter:['antimatter',0,0,1254,1254],writtenOrder:['survival',610,510,370,400],traumaGuard:['survival',1070,515,385,390],
 battleHaste:['tech',10,5,400,415],cooldown15:['tech',440,70,325,335],magazine2:['tech',780,55,390,355],carrier:['carrier',0,0,1254,1254],
 maskDeLu:['mask',0,0,1254,1254],highRisk:['tech',505,520,525,400],adaptiveSpeed:['tech',1065,535,430,375],
};
export const AUGMENT_COLORS={combat:'#ef7953',survival:'#a4db74',tech:'#8ccff1'};
export const AUGMENT_ANGLES={wisdom:-Math.PI/4};
const images=new Map();
export function artImage(sheet){
 if(!images.has(sheet)){const image=new Image(),embedded=document.getElementById('augment-data-'+sheet);image.src=embedded?JSON.parse(embedded.textContent):`./src/assets/augments-${sheet}.png`;images.set(sheet,image);}return images.get(sheet);
}
export function drawAugment(canvas,key){
 const f=AUGMENT_ART[key];if(!f)return;const image=artImage(f[0]);if(!image.complete||!image.naturalWidth)return;
 if(canvas.dataset.painted===key)return;const c=canvas.getContext('2d'),n=canvas.width,angle=AUGMENT_ANGLES[key]||0,co=Math.abs(Math.cos(angle)),si=Math.abs(Math.sin(angle)),scale=.9*n/Math.max(f[3]*co+f[4]*si,f[3]*si+f[4]*co);c.clearRect(0,0,n,n);c.fillStyle='#000000';c.fillRect(0,0,n,n);c.imageSmoothingEnabled=false;
 c.save();c.translate(n/2,n/2);c.rotate(angle);c.drawImage(image,f[1],f[2],f[3],f[4],-f[3]*scale/2,-f[4]*scale/2,f[3]*scale,f[4]*scale);c.restore();canvas.dataset.painted=key;
}
export function icon(key,group,size=96){const c=document.createElement('canvas');c.width=c.height=size;c.className='augment-icon';c.dataset.augment=key;c.dataset.group=group;c.style.borderColor=AUGMENT_COLORS[group];c.setAttribute('aria-hidden','true');drawAugment(c,key);return c;}
