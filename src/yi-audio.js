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
// One nearby buff bed avoids stacking the same shine once for every ally.
export class YiBuffAudio{
 constructor(audio){this.audio=audio;this.field=null;}
 stop(){
  const field=this.field;if(!field)return;this.field=null;
  const a=this.audio,t=a.context.currentTime,p=field.out.gain;p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(0,t+.12);
  field.source.stop(t+.13);a.retire(field.nodes,.16);
 }
 sync(game,listener,active){
  const a=this.audio,c=a.context,buffer=a.synth?.swings.buffers.get('yiShine');
  const targets=active&&buffer?game.units.filter(e=>e.kind==='champion'&&e.alive&&(e.buffs?.ogamdo||0)>game.time&&!game.hidden?.(e)).map(e=>({e,...a.spatial(e,listener)})).filter(e=>e.d<34).sort((x,y)=>x.d-y.d):[];
  const target=targets[0];if(!target){this.stop();return;}
  if(!this.field){
   const route=a.output(a.combat,0,target.pan,0),source=c.createBufferSource(),t=c.currentTime;source.buffer=buffer;source.loop=true;
   source.detune.setValueAtTime([-.12,.08,-.04,.12][Math.abs(target.e.id||0)%4],t);source.playbackRate.setValueAtTime(.99,t);source.playbackRate.exponentialRampToValueAtTime(1.01,t+.9);source.playbackRate.exponentialRampToValueAtTime(.995,t+2.8);
   source.connect(route.out);source.onended=()=>source.disconnect();source.start(t);this.field={...route,source};
  }
  this.field.targetId=target.e.id;this.field.out.gain.setTargetAtTime(target.gain*.38,c.currentTime,.08);
  this.field.nodes.find(n=>n.pan)?.pan.setTargetAtTime(target.pan,c.currentTime,.1);
 }
}
