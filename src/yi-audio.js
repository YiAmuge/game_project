export const YI_SAMPLES=[
 {id:'yiDeploy',file:'stu9-shatter-363188.mp3'},
 {id:'yiShine',file:'koiroylers-shine-02-355934.mp3'},
 {id:'yiImpact',file:'yi-glass-impact.wav',mime:'audio/wav'},
];
export function yiSoundProfile(voice){
 if(voice.key!=='yi')return null;
 const family=voice.impactFamily||voice.family,cast=voice.cue==='cast',impact=voice.cue==='impact'&&family==='glass';
 if(!impact&&!(cast&&['glass','phase'].includes(family)))return null;
 const variant=((Math.trunc(voice.variant)||0)%4+4)%4;
 return{id:impact?'yiImpact':'yiDeploy',pitch:[-.15,.10,-.05,.15][variant],duration:(impact?1.24:1.04)*(1+[0,.005,-.005,.003][variant]),rates:[.99,1.02,.995].map(n=>n*(1+[0,.002,-.002,.001][variant])),offset:0,gain:impact?.78:family==='glass'?1.45:.82,dry:true,fadeOut:.018};
}
// One fading shine per buff application, shared by nearby recipients.
export class YiBuffAudio{
 constructor(audio){this.audio=audio;this.field=null;this.heard=new Set();this.game=null;}
 stop(){
  const field=this.field;if(!field)return;this.field=null;
  const a=this.audio,t=a.context.currentTime,p=field.envelope.gain;p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(0,Math.min(t+.12,field.end));
  field.source.stop(Math.min(t+.13,field.end));
 }
 sync(game,listener,active){
  const a=this.audio,c=a.context,buffer=a.synth?.swings.buffers.get('yiShine');
  if(this.game!==game){this.stop();this.heard.clear();this.game=game;}
  const targets=active&&buffer?game.units.filter(e=>e.kind==='champion'&&e.alive&&(e.buffs?.ogamdo||0)>game.time&&!game.hidden?.(e)).map(e=>({e,...a.spatial(e,listener)})).filter(e=>e.d<34).sort((x,y)=>x.d-y.d):[];
  const target=targets[0];if(!target){this.stop();return;}
  const key=target.e.buffs.ogamdo;
  if(this.field&&this.field.key!==key)this.stop();
  if(!this.field){
   if(this.heard.has(key))return;
   this.heard.add(key);if(this.heard.size>64)this.heard.delete(this.heard.values().next().value);
   const route=a.output(a.combat,target.gain,target.pan,0),source=c.createBufferSource(),envelope=c.createGain(),t=c.currentTime;source.buffer=buffer;source.loop=false;
   source.detune.setValueAtTime([-.12,.08,-.04,.12][Math.abs(target.e.id||0)%4],t);source.playbackRate.setValueAtTime(.99,t);source.playbackRate.exponentialRampToValueAtTime(1.01,t+.6);source.playbackRate.exponentialRampToValueAtTime(.995,t+1.5);
   envelope.gain.setValueAtTime(.38,t);envelope.gain.linearRampToValueAtTime(0,t+1.5);source.connect(envelope);envelope.connect(route.out);
   source.onended=()=>{source.disconnect();envelope.disconnect();route.nodes.forEach(n=>n.disconnect());if(this.field?.source===source)this.field=null;};source.start(t);source.stop(t+1.5);this.field={...route,source,envelope,key,end:t+1.5};
  }
  this.field.targetId=target.e.id;this.field.out.gain.setTargetAtTime(target.gain,c.currentTime,.08);
  this.field.nodes.find(n=>n.pan)?.pan.setTargetAtTime(target.pan,c.currentTime,.1);
 }
}
