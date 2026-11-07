// Share the uploaded shine recording with Yi; all changes are per-voice playback.
export const QUEEN_SAMPLES=[{id:'queenStar',file:'humordome-fairy-sparkle-451414.mp3',start:.015,end:1.50}];
export function queenSoundProfile(v){
 if(v.key!=='queen'||v.cue!=='weapon')return null;
 const variant=((Math.trunc(v.variant)||0)%4+4)%4,tint=[-.15,.1,-.05,.15][variant];
 if(v.phase==='queen-star-fire')return{id:'queenStar',pitch:.15+tint,duration:.85,gain:.64,offset:0,rates:[1,1.04,.99],dry:true,fadeOut:.20};
 if(v.phase==='arcana-beam')return{id:'yiShine',pitch:(v.slot==='r'?3.5:2.2)+tint,duration:v.slot==='r'?1.2:1,gain:v.slot==='r'?1.12:.90,offset:.22,rates:v.slot==='r'?[1.05,1.12,1.01]:[1.02,1.08,1],dry:true,fadeOut:.24};
 return null;
}
export function queenChargeProfile(slot,progress=0){
 const p=Math.min(1,Math.max(0,progress)),r=slot==='r';return{id:'yiShine',pitch:(r?-4:-3)+p*(r?1:.5),rate:(r?.48:.96)+p*(r?.08:.04),gain:(r?.22:.18)+p*.05,offset:r?.16:.10};
}
export class QueenChargeAudio{
 constructor(audio){this.audio=audio;this.fields=new Map();}
 stop(key){const f=this.fields.get(key);if(!f)return;this.fields.delete(key);const t=this.audio.context.currentTime;f.out.gain.cancelScheduledValues(t);f.out.gain.setValueAtTime(f.out.gain.value,t);f.out.gain.linearRampToValueAtTime(0,t+.045);f.source.stop(t+.05);}
 stopAll(){for(const key of this.fields.keys())this.stop(key);}
 sync(game,listener,active){
  const a=this.audio,c=a.context,buffer=a.synth?.swings.buffers.get('yiShine');if(!c)return;
  const live=[];
  if(active&&buffer)for(const e of game.units){if(e.kind!=='champion'||e.key!=='queen'||!e.alive||game.hidden?.(e)||game.visibleTo&&!game.visibleTo(listener.team,e))continue;
   for(const slot of['q','r']){const state=e.state?.[slot==='q'?'queenQ':'queenR'];if(!state||state.phase!==(slot==='q'?'preparing':'charging'))continue;const duration=slot==='q'?1.5:3.75,elapsed=Math.max(0,game.time-state.at),remaining=duration-elapsed;if(remaining<=0)continue;const spatial=a.spatial(state,listener);if(spatial.d<34)live.push({e,slot,state,duration,elapsed,remaining,...spatial});}
  }
  live.sort((x,y)=>x.d-y.d);live.length=Math.min(live.length,4);
  for(const[key,f]of this.fields)if(!live.some(t=>key===`${t.e.id}/${t.slot}`&&f.at===t.state.at))this.stop(key);
  for(const target of live){const key=`${target.e.id}/${target.slot}`,profile=queenChargeProfile(target.slot,target.elapsed/target.duration);let f=this.fields.get(key);
   if(!f){const route=a.output(a.combat,0,target.pan,0),source=c.createBufferSource(),t=c.currentTime;source.buffer=buffer;source.loop=false;source.detune.setValueAtTime(profile.pitch*100,t);source.playbackRate.setValueAtTime(profile.rate,t);source.connect(route.out);
    source.onended=()=>{source.disconnect();route.nodes.forEach(n=>n.disconnect());if(this.fields.get(key)?.source===source)this.fields.delete(key);};
    const offset=Math.min(buffer.duration-.01,profile.offset+target.elapsed*profile.rate*2**(profile.pitch/12));source.start(t,Math.max(0,offset));source.stop(t+target.remaining+.06);f={...route,source,at:target.state.at,slot:target.slot};this.fields.set(key,f);
   }
   f.source.detune.setTargetAtTime(profile.pitch*100,c.currentTime,.08);f.source.playbackRate.setTargetAtTime(profile.rate,c.currentTime,.08);f.out.gain.setTargetAtTime(target.gain*profile.gain/Math.sqrt(live.length),c.currentTime,.055);f.nodes.find(n=>n.pan)?.pan.setTargetAtTime(target.pan,c.currentTime,.08);
  }
 }
}
