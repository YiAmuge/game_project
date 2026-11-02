// One user-supplied whoosh for weapon movement. Hits use the original synthesizer.
export const SWING_SAMPLES=[
 {id:'swing',file:'floraphonic-swing-whoosh-weapon-3-189823.mp3',start:.03,end:.235},
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Pitch in semitones, envelope in seconds, then start/peak/end playback speed.
const families={
 knife:[5,.11,[1.16,1.60,.98]],katana:[2,.145,[.95,1.35,.80]],blade:[0,.18,[.80,1.16,.68]],
 axe:[-4,.26,[.65,.96,.55]],greatsword:[-7,.37,[.54,.80,.46]],scythe:[-5,.30,[.60,.89,.50]],
 glaive:[-2,.23,[.72,1.04,.60]],claw:[1,.16,[1.02,1.47,.87]],spear:[1,.15,[.98,1.40,.85]],
 hammer:[-6,.32,[.60,.86,.50]],club:[-5,.29,[.62,.90,.53]],mace:[-4.5,.27,[.63,.93,.52]],
 staff:[0,.20,[.78,1.12,.68]],branch:[1.5,.17,[.86,1.27,.74]],chain:[-1,.23,[.74,1.08,.60]],
 shield:[-3,.24,[.68,1,.58]],punch:[-1,.15,[.94,1.40,.80]],organic:[-3,.23,[.70,1.03,.60]],
 cloth:[-2,.25,[.65,.92,.50]],chime:[3,.15,[.92,1.30,.78]],glass:[4,.12,[1.15,1.55,.95]],
 drill:[-2,.20,[.79,1.14,.68]],needle:[6,.10,[1.20,1.65,1]],nail:[6,.10,[1.20,1.65,1]],
 coin:[4,.12,[1.05,1.50,.92]],smoke:[-2,.25,[.65,.92,.50]],
};
const physicalCasts=new Set(['knife','katana','blade','axe','greatsword','scythe','glaive','claw','spear','hammer','club','mace','branch','chain','shield','punch','organic','drill','needle','nail','cloth']);
export function swingProfile(voice){
 const base=families[voice.family];if(!base||voice.cue!=='weapon'&&!(voice.cue==='cast'&&physicalCasts.has(voice.family)))return null;
 const variant=((Math.trunc(voice.variant)||0)%4+4)%4,preparing=voice.cue==='cast',weight=voice.weight||1;
 return {
  id:'swing',pitch:base[0]+[-.45,.25,-.15,.55][variant],
  duration:base[1]*(preparing?.8:1)*(1+[0,.04,-.03,.02][variant]),
  rates:base[2].map(n=>n),offset:0,
  gain:(preparing?.50:.76)*clamp(.85+weight*.15,.85,1.12),
  cutoff:base[0]<0?7200:11500,
 };
}
async function loadRecording(spec){
 const inline=globalThis.document?.getElementById('weapon-swing-audio');
 const embedded=inline&&JSON.parse(inline.textContent)[spec.id];
 if(embedded){const raw=atob(embedded.slice(embedded.indexOf(',')+1));return Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer;}
 const response=await fetch('./src/assets/audio/'+spec.file);if(!response.ok)throw new Error('Weapon swing audio '+response.status);return response.arrayBuffer();
}
export function prepareSwingBuffer(context,decoded,spec){
 const rate=decoded.sampleRate,start=Math.min(decoded.length-1,Math.floor(spec.start*rate)),end=Math.min(decoded.length,Math.ceil(spec.end*rate));
 const output=context.createBuffer(1,Math.max(1,end-start),rate),data=output.getChannelData(0);let peak=0;
 for(let ch=0;ch<decoded.numberOfChannels;ch++){const input=decoded.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]+=input[start+i]/decoded.numberOfChannels;}
 for(const value of data)peak=Math.max(peak,Math.abs(value));
 const scale=peak>.0001?.82/peak:1,fadeIn=Math.max(1,Math.round(rate*.003)),fadeOut=Math.max(1,Math.round(rate*.018));
 for(let i=0;i<data.length;i++)data[i]*=scale*Math.min(1,i/fadeIn,(data.length-1-i)/fadeOut);
 return output;
}
const contexts=new WeakMap();
export class WeaponSwings{
 constructor(context,{loader=loadRecording}={}){
  this.context=context;this.active=new Set();this.played=0;this.history=[];
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
  const profile=swingProfile(voice),buffer=profile&&this.buffers.get(profile.id);if(!buffer)return false;
  const c=this.context,t=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),nodes=[source,filter,gain];
  const pitchRate=2**(profile.pitch/12),duration=Math.min(profile.duration,(buffer.duration-profile.offset)/Math.max(...profile.rates)/pitchRate*.96);
  if(duration<=.015){nodes.forEach(n=>n.disconnect());return false;}
  source.buffer=buffer;source.detune.setValueAtTime(profile.pitch*100,t);
  source.playbackRate.setValueAtTime(profile.rates[0],t);
  source.playbackRate.exponentialRampToValueAtTime(profile.rates[1],t+duration*.40);
  source.playbackRate.exponentialRampToValueAtTime(profile.rates[2],t+duration);
  filter.type='lowpass';filter.Q.value=.55;filter.frequency.setValueAtTime(Math.min(profile.cutoff,c.sampleRate*.45),t);
  filter.frequency.exponentialRampToValueAtTime(Math.min(profile.cutoff*.65,c.sampleRate*.4),t+duration);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(profile.gain,t+.003);
  gain.gain.setValueAtTime(profile.gain,t+duration*.6);gain.gain.linearRampToValueAtTime(0,t+duration);
  source.connect(filter);filter.connect(gain);gain.connect(out);this.active.add(source);
  source.onended=()=>{nodes.forEach(n=>n.disconnect());this.active.delete(source);};
  source.start(t,profile.offset);source.stop(t+duration+.008);this.played++;
  this.history.push({...profile,duration,family:voice.family,cue:voice.cue,at:t});if(this.history.length>32)this.history.shift();
  return true;
 }
}
