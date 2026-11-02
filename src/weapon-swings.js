// Shared whoosh, base-form Yan greatsword and one pre-mixed impact recording.
export const SWING_SAMPLES=[
 {id:'swing',file:'floraphonic-swing-whoosh-weapon-3-189823.mp3'},
 {id:'yanGreatsword',file:'daviddumaisaudio-sword-slash-with-metallic-impact-185435.mp3'},
 {id:'impactMix',file:'mixed-impact.wav',mime:'audio/wav'},
];
const families=new Set(['knife','katana','blade','axe','greatsword','scythe','glaive','claw','spear','hammer','club','mace','staff','branch','chain','shield','punch','organic','cloth','chime','glass','drill','needle','nail','coin','smoke']);
const physicalCasts=new Set(['knife','katana','blade','axe','greatsword','scythe','glaive','claw','spear','hammer','club','mace','branch','chain','shield','punch','organic','drill','needle','nail','cloth']);
// Keep the uploaded recordings at their original pitch, speed and full length.
const originalProfile=(id,gain)=>({id,pitch:0,rates:[1,1,1],offset:0,gain,fullLength:true,dry:true});
export function swingProfile(voice){
 if(!families.has(voice.family)||voice.cue!=='weapon'&&!(voice.cue==='cast'&&physicalCasts.has(voice.family)))return null;
 const yan=voice.key==='yan'&&voice.form==='base'&&voice.family==='greatsword';
 return originalProfile(yan?'yanGreatsword':'swing',voice.cue==='cast'?.50:.76);
}
export function impactProfile(voice){return voice.cue==='impact'?originalProfile('impactMix',.68):null;}
async function loadRecording(spec){
 const inline=globalThis.document?.getElementById('weapon-swing-audio');
 const embedded=inline&&JSON.parse(inline.textContent)[spec.id];
 if(embedded){const raw=atob(embedded.slice(embedded.indexOf(',')+1));return Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer;}
 const response=await fetch('./src/assets/audio/'+spec.file);if(!response.ok)throw new Error('Weapon swing audio '+response.status);return response.arrayBuffer();
}
export function prepareSwingBuffer(context,decoded){
 const output=context.createBuffer(decoded.numberOfChannels,decoded.length,decoded.sampleRate);let peak=0;
 for(let ch=0;ch<decoded.numberOfChannels;ch++)for(const value of decoded.getChannelData(ch))peak=Math.max(peak,Math.abs(value));
 // Only attenuate decoder overshoot; preserve stereo, timing and the native envelope.
 const gain=peak>.95?.95/peak:1;
 for(let ch=0;ch<decoded.numberOfChannels;ch++){
  const input=decoded.getChannelData(ch),data=output.getChannelData(ch);
  for(let i=0;i<data.length;i++)data[i]=input[i]*gain;
 }
 return output;
}
const contexts=new WeakMap();
export class WeaponSwings{
 constructor(context,{loader=loadRecording}={}){
  this.context=context;this.active=new Set();this.voices=new Map();this.played=0;this.history=[];
  let cache=contexts.get(context);
  if(!cache){
   cache={buffers:new Map(),failures:[]};contexts.set(context,cache);
   cache.ready=typeof context.decodeAudioData!=='function'?Promise.resolve(cache.buffers):Promise.all(SWING_SAMPLES.map(async spec=>{
    try{const bytes=await loader(spec),decoded=await context.decodeAudioData(bytes);cache.buffers.set(spec.id,prepareSwingBuffer(context,decoded,spec));}
    catch{cache.failures.push(spec.id);}
   })).then(()=>cache.buffers);
  }
  this.buffers=cache.buffers;this.failures=cache.failures;this.ready=cache.ready;
 }
 play(out,voice){
  const profile=impactProfile(voice)||swingProfile(voice),buffer=profile&&this.buffers.get(profile.id);if(!buffer)return false;
  const c=this.context,t=c.currentTime,source=c.createBufferSource(),gain=c.createGain(),nodes=[source,gain],duration=buffer.duration;
  if(duration<=.015){nodes.forEach(n=>n.disconnect());return false;}
  source.buffer=buffer;source.detune.setValueAtTime(0,t);source.playbackRate.setValueAtTime(1,t);
  // Identical near-simultaneous waveforms add coherently. Share volume within
  // that group instead of changing pitch, clipping peaks or dropping attacks.
  const entry={id:profile.id,at:t,gain,level:profile.gain},group=[...this.voices.values()].filter(v=>v.id===profile.id&&t-v.at<.02);group.push(entry);
  for(const v of group)v.gain.gain.setValueAtTime(v.level/group.length,t);
  source.connect(gain);gain.connect(out);this.active.add(source);this.voices.set(source,entry);
  source.onended=()=>{nodes.forEach(n=>n.disconnect());this.active.delete(source);this.voices.delete(source);};
  source.start(t);source.stop(t+duration+.001);this.played++;
  this.history.push({...profile,duration,family:voice.family,cue:voice.cue,at:t});if(this.history.length>32)this.history.shift();
  return true;
 }
}
