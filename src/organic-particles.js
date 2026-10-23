// Small, deterministic density textures. Generated once and reused by Canvas2D.
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=t=>t*t*(3-2*t);
function hash(x,y,seed){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
export function noise(x,y,seed=1){
 const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy),a=hash(ix,iy,seed),b=hash(ix+1,iy,seed),c=hash(ix,iy+1,seed),d=hash(ix+1,iy+1,seed);
 return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
function fbm(x,y,seed){return noise(x,y,seed)*.57+noise(x*2.1,y*2.1,seed+7)*.29+noise(x*4.3,y*4.3,seed+13)*.14;}

export function organicPixels(form,variant,size=64){
 const data=new Uint8ClampedArray(size*size*4),seed=variant*37+11;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=(x+.5)/size*2-1,ny=(y+.5)/size*2-1;
  const wx=nx+(noise(nx*2+7,ny*2,seed)-.5)*.5,wy=ny+(noise(nx*2,ny*2+9,seed+3)-.5)*.5;
  const clouds=fbm(wx*3+4,wy*3+4,seed),detail=fbm(wx*9,wy*9,seed+21);
  let qx=wx,qy=wy,rough=.8;
  if(form==='flame'){qx*=1.2+(.5-wy*.4);qy*=.8;rough=1.1;}
  if(['smoke','mist','frost'].includes(form)){qx*=.9;qy*=.95;rough=1.2;}
  if(form==='woodchip'){qx*=2.8;qy*=.65;rough=.55;}
  if(form==='crystal'){qx*=1.8;qy*=.7;rough=.5;}
  if(form==='leaf'||form==='petal'){qx*=1.5;qy*=.8;rough=.5;}
  if(form==='drop'){qx*=1.2+(1-wy)*.2;qy*=.85;rough=.45;}
  const radius=form==='crystal'?Math.abs(qx)*.7+Math.abs(qy)*.75:qx*qx+qy*qy;
  let field=1-radius+(clouds-.52)*rough;
  if(form==='rune')field=.22-Math.abs(Math.sqrt(radius)-.56)+(clouds-.5)*.45;
  let density=smooth(clamp(field/(['smoke','mist','frost','flame','spark','glow'].includes(form)?.75:.3)));
  density*=clamp((1-Math.max(Math.abs(nx),Math.abs(ny)))/.16);
  density*=.38+clouds*.4+detail*.22;
  if(form==='spark'||form==='glow')density*=Math.exp(-radius*2.5);
  const grain=form==='woodchip'?noise(wx*35,wy*3,seed)*.35:0;
  const illumination=clamp(.45+clouds*.35+detail*.2-wx*.14-wy*.12-grain),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=Math.round(illumination*255);data[i+3]=Math.round(density*255);
 }
 return data;
}

export function shapeWarp(p,time){
 const age=Math.max(0,time-p.born),phase=p.phase??p.rotation,grow=1-Math.exp(-age*8);
 const a=noise(phase+age*3.5,2,p.variant+1)-.5,b=noise(4,phase+age*4.2,p.variant+3)-.5;
 return {x:1-grow*(.08+Math.abs(a)*.32),y:1-grow*(.06+Math.abs(b)*.3),shear:a*.5*grow,
  turn:p.rotation+age*p.spin+b*.65*grow,frame:(p.variant+age*5)%4};
}
