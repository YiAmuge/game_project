export const soundAllowed=event=>event?.sourceKind!=='minion';
// Local Web Audio synthesis keeps all effects available in the standalone file.
export class GameAudio{
 constructor(){this.enabled=true;this.played=0;this.seen=new WeakMap();try{this.enabled=localStorage.getItem('city-border-sound')!=='off';}catch{}}
 unlock(){try{if(!this.context){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;const c=this.context=new Context();this.master=c.createGain();this.master.gain.value=.28;const limiter=c.createDynamicsCompressor();this.master.connect(limiter);limiter.connect(c.destination);this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0);let low=0;for(let i=0;i<data.length;i++){low=(low+(Math.random()*2-1)*.12)/1.08;data[i]=low*3;}}this.context.resume().catch(()=>{});}catch{}}
 toggle(){this.enabled=!this.enabled;try{localStorage.setItem('city-border-sound',this.enabled?'on':'off');}catch{}this.unlock();return this.enabled;}
 tone(freq,end,duration,volume=.15,type='sine',delay=0,output=this.master){const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),v=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(volume,t+.008);v.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(v);v.connect(output);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();v.disconnect();};}
 hiss(duration,volume,cutoff,output=this.master){const c=this.context,t=c.currentTime,b=c.createBufferSource(),f=c.createBiquadFilter(),v=c.createGain();b.buffer=this.noise;f.type='lowpass';f.frequency.value=cutoff;v.gain.setValueAtTime(volume,t);v.gain.exponentialRampToValueAtTime(.0001,t+duration);b.connect(f);f.connect(v);v.connect(output);b.start(t,Math.random());b.stop(t+duration);b.onended=()=>{b.disconnect();f.disconnect();v.disconnect();};}
 play(event,listener){if(!this.enabled||!this.context||this.context.state!=='running'||!soundAllowed(event))return false;const c=this.context,t=c.currentTime,kind=event.kind,bypass=['intro','spawn','explosion','victory','defeat','ping','shop'].includes(kind),d=listener?Math.hypot((event.x||0)-listener.x,(event.y||0)-listener.y):0;if(!bypass&&d>30)return false;
  this.voiceTimes=(this.voiceTimes||[]).filter(at=>t-at<.12);if(this.voiceTimes.length>=8&&!bypass)return false;this.voiceTimes.push(t);const out=c.createGain();out.gain.value=bypass?1:Math.max(.08,1-d/32);out.connect(this.master);setTimeout(()=>out.disconnect(),1800);this.played++;
  if(kind==='swing'&&event.key==='rudolph'){this.tone(950,380,.12,.13,'sine',0,out);this.hiss(.08,.13,4000,out);}
  else if(kind==='shot'&&event.key==='hohenheim'){this.tone(1350,380,.15,.17,'triangle',0,out);this.hiss(.12,.2,5000,out);}
  else if(kind==='swing'){this.hiss(.12,.2,2300,out);this.tone(230,95,.13,.09,'triangle',0,out);}
  else if(kind==='shot'){this.hiss(.13,.65,3200,out);this.tone(160,45,.16,.25,'triangle',0,out);}
  else if(kind==='hit'){this.hiss(.07,.23,1500,out);this.tone(110,60,.07,.1,'sine',0,out);}
  else if(kind==='cast'||kind==='ultimate'){const ult=kind==='ultimate';this.tone(ult?220:360,ult?880:600,ult?.36:.18,.12,'triangle',0,out);if(ult)this.tone(330,660,.4,.1,'sine',.08,out);this.hiss(.16,.12,2300,out);}
  else if(kind==='death'){this.tone(190,48,.4,.2,'triangle',0,out);this.hiss(.25,.25,900,out);}
  else if(kind==='explosion'){this.hiss(.85,1.1,1800,out);this.tone(110,25,.75,.5,'sine',0,out);}
  else if(kind==='victory'||kind==='defeat'){const notes=kind==='victory'?[392,494,587,784]:[392,349,294,196];notes.forEach((n,i)=>this.tone(n,n,.38,.19,'triangle',i*.13,out));}
  else if(kind==='ping'){const f=event.ping==='danger'?740:event.ping==='defend'?580:880;this.tone(f,f,.13,.13,'sine',0,out);this.tone(f*.75,f*.75,.12,.1,'sine',.15,out);}
  else if(kind==='shop'){this.tone(660,880,.1,.13,'sine',0,out);this.tone(990,990,.15,.1,'sine',.08,out);}
  else if(kind==='intro'||kind==='spawn'){this.tone(220,440,.32,.12,'sine',0,out);this.tone(330,660,.38,.09,'sine',.04,out);this.hiss(.35,.15,1100,out);}
  return true;
 }
 sync(g,{paused=false,playing=false}={}){if(this.context)this.master.gain.setTargetAtTime((this.enabled&&!paused)?.28:0,this.context.currentTime,.05);if(!playing)return;
  const previous=this.seen.get(g)||0,events=(g.soundEvents||[]).filter(e=>e.id>previous);this.seen.set(g,g.soundSerial||0);for(const e of events)if(!paused)this.play(e,g.player);
 }
}
