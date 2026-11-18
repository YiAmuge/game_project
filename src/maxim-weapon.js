import {MAXIM_FRAMES} from './maxim-sprites.js';

const frame=MAXIM_FRAMES.maximHammer;
export const MAXIM_HEAD={joint:Math.round(frame.w*.78),axis:frame.h*.475,growth:.2};
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
// Keep the shaft, pommel and both grip points fixed. Enlarge only the head
// around its joint with the shaft, using the same transform for contact points.
export function maximHammerPoint([u,v],scale=1){
 const x=u*frame.w,y=v*frame.h,{joint,axis}=MAXIM_HEAD;
 return x<joint?[u,v]:[(joint+(x-joint)*scale)/frame.w,(axis+(y-axis)*scale)/frame.h];
}
export function maximWeaponState(g,e){
 const r=e.state.maximR,slam=e.state.maximSlam,fade=e.state.maximRFade;
 let energy=0;
 if(r)energy=smooth((g.time-r.at)/.22);
 else if(slam&&g.time>=slam.at)energy=1-smooth((g.time-slam.at-.08)/.24);
 if(!r&&fade&&g.time>=fade.at&&(!slam||fade.at>slam.at))energy=smooth((fade.at-fade.from)/.22)*(1-smooth((g.time-fade.at)/.18));
 const active=Boolean(r)||energy>0;
 return {headScale:1+MAXIM_HEAD.growth*energy,energy,hands:active?2:1,offHandOpacity:energy};
}
let currentLayer,stamp=-1;
export function drawMaximCurrent(c,atlas,m,pivot,scale,energy,time){
 if(energy<=0||!atlas.complete||!atlas.naturalWidth||typeof document==='undefined')return;
 if(!currentLayer){currentLayer=document.createElement('canvas');currentLayer.width=frame.w-MAXIM_HEAD.joint;currentLayer.height=frame.h;currentLayer.dataset.maximCurrent='true';}
 const tick=Math.floor(time*30),w=currentLayer.width,h=currentLayer.height;
 if(stamp!==tick){
  stamp=tick;const b=currentLayer.getContext('2d');b.clearRect(0,0,w,h);b.save();b.lineCap='round';
  for(let ray=0;ray<7;ray++){
   b.beginPath();for(let i=0;i<10;i++){const x=w*(.12+.76*ray/6)+Math.sin(i*8.3+ray*4.1+tick)*w*.14,y=i*h/9;if(i)b.lineTo(x,y);else b.moveTo(x,y);}
   b.shadowColor='#ff8b16';b.shadowBlur=9;b.strokeStyle=ray%2?'#ff9b20':'#ffe49b';b.lineWidth=ray%2?3:1.6;b.stroke();
  }
  b.shadowBlur=0;b.globalCompositeOperation='destination-in';b.drawImage(atlas,frame.x+MAXIM_HEAD.joint,frame.y,w,h,0,0,w,h);b.restore();
 }
 c.save();c.globalCompositeOperation='lighter';c.globalAlpha*=energy*.9;
 c.drawImage(currentLayer,(MAXIM_HEAD.joint-frame.w*pivot)*m.scale,(-frame.h/2+MAXIM_HEAD.axis*(1-scale))*m.scale,w*scale*m.scale,h*scale*m.scale);c.restore();
}
