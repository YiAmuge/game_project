// Fixed movement sources and gently varied slash, piercing and blunt impacts.
import{YI_SAMPLES,yiSoundProfile}from'./yi-audio.js';
import{RIFLE_SAMPLES,rifleSoundProfile}from'./rifle-audio.js';
import{ELECTRIC_SAMPLES,electricSoundProfile}from'./hohenheim-audio.js';
import{CHAMPION_SKILL_SAMPLES,championSkillSoundProfile}from'./champion-skill-audio.js';
export const SWING_SAMPLES=[
 {id:'swing',file:'floraphonic-swing-whoosh-weapon-3-189823.mp3',start:.03,end:.235},
 {id:'yanGreatsword',file:'daviddumaisaudio-sword-slash-with-metallic-impact-185435.mp3',start:.04,end:.98},
 {id:'thrust',file:'yodguard-spear_thrust-1-382402.mp3',start:.06,end:.68},
 {id:'impactSlash',file:'Sword_Hori.wav',mime:'audio/wav'},
 {id:'impactPierce',file:'Sword_Stab.wav',mime:'audio/wav'},
 {id:'impactBlunt',file:'Sword_Vert.wav',mime:'audio/wav'},
 ...YI_SAMPLES,
 ...RIFLE_SAMPLES,
 ...ELECTRIC_SAMPLES,
 ...CHAMPION_SKILL_SAMPLES,
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
 const thrust=thrustProfile(voice);if(thrust)return thrust;
 const yan=voice.key==='yan'&&voice.form==='base'&&voice.family==='greatsword';
 const base=yan?[-1,.40,[1.02,1.40,.92]]:families[voice.family];if(!base||voice.cue!=='weapon'&&!(voice.cue==='cast'&&physicalCasts.has(voice.family)))return null;
 const variant=((Math.trunc(voice.variant)||0)%4+4)%4,preparing=voice.cue==='cast',weight=voice.weight||1;
 return {
  id:yan?'yanGreatsword':'swing',pitch:base[0]+[-.45,.25,-.15,.55][variant],
  duration:base[1]*(preparing?.8:1)*(1+[0,.04,-.03,.02][variant]),
  rates:base[2].map(n=>n),offset:0,
  gain:(preparing?.50:.76)*clamp(.85+weight*.15,.85,1.12),
  dry:true,fadeOut:.025,
 };
}
export function thrustProfile(voice){
 if(voice.family!=='spear'||!['weapon','cast','impale'].includes(voice.cue))return null;
 const variant=((Math.trunc(voice.variant)||0)%4+4)%4,weight=voice.weight||1,speed=1+[0,.02,-.015,.01][variant];
 return {id:'thrust',pitch:.5-(weight-1)*1.5+[-.5,.25,-.20,.55][variant],duration:(voice.cue==='impale'?.26:voice.cue==='cast'?.28:.34+clamp(weight-.9,0,.8)*.06)*(1+[0,.04,-.03,.02][variant]),rates:[.95,1.40,.86].map(n=>n*speed),offset:0,gain:(voice.cue==='cast'?.50:.76)*clamp(.85+weight*.15,.85,1.12),dry:true,fadeOut:.024};
}
const slashImpacts=new Set(['knife','katana','blade','axe','greatsword','scythe','glaive','claw','organic']);
const piercingImpacts=new Set(['spear','needle','nail','rifle','pistol','shotgun','cannon','drill']);
const impactLengths={impactSlash:.69,impactPierce:1.20,impactBlunt:.70};
export function impactProfile(voice){
 if(voice.cue!=='impact')return null;
 const family=voice.impactFamily||voice.family,id=voice.key==='yan'&&voice.form==='distorted'&&family==='organic'?'impactBlunt':slashImpacts.has(family)?'impactSlash':piercingImpacts.has(family)?'impactPierce':'impactBlunt';
 const heavy=['axe','greatsword','scythe','hammer','club','mace','cannon'].includes(family),light=['knife','katana','needle','nail'].includes(family),variant=((Math.trunc(voice.variant)||0)%4+4)%4;
 // Preserve each recording's attack and tail with only small playback changes.
 const speed=1+[-.003,.003,0,.002][variant];
 return {id,pitch:(heavy?-.15:light?.10:0)+[-.15,.10,-.05,.15][variant],duration:impactLengths[id]*(1+[0,.006,-.006,.003][variant]),rates:[.98,1.025,.995].map(n=>n*speed),offset:0,gain:.68*clamp(.85+(voice.weight||1)*.15,.85,1.12)*(voice.key==='dongbaek'?.8:1),dry:true,fadeOut:.012};
}
export const recordingProfile=voice=>championSkillSoundProfile(voice)||electricSoundProfile(voice)||rifleSoundProfile(voice)||yiSoundProfile(voice)||impactProfile(voice)||swingProfile(voice);
const inlineRecordings=new WeakMap();
async function loadRecording(spec){
 const inline=globalThis.document?.getElementById('weapon-swing-audio');
 let embedded;if(inline){let data=inlineRecordings.get(inline);if(!data){data=JSON.parse(inline.textContent);inlineRecordings.set(inline,data);}embedded=data[spec.id];}
 if(embedded){const raw=atob(embedded.slice(embedded.indexOf(',')+1));return Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer;}
 const response=await fetch('./src/assets/audio/'+spec.file);if(!response.ok)throw new Error('Weapon swing audio '+response.status);return response.arrayBuffer();
}
export function prepareSwingBuffer(context,decoded,spec={}){
 const start=Math.max(0,Math.min(decoded.length-1,Math.floor((spec.start||0)*decoded.sampleRate))),end=Math.min(decoded.length,Math.ceil((spec.end??decoded.duration)*decoded.sampleRate));
 const output=context.createBuffer(decoded.numberOfChannels,Math.max(1,end-start),decoded.sampleRate);let peak=0;
 for(let ch=0;ch<decoded.numberOfChannels;ch++)for(const value of decoded.getChannelData(ch).subarray(start,end))peak=Math.max(peak,Math.abs(value));
 // Keep the source stereo and timbre; only attenuate decoder overshoot.
 const gain=peak>.95?.95/peak:1;
 for(let ch=0;ch<decoded.numberOfChannels;ch++){
  const input=decoded.getChannelData(ch),data=output.getChannelData(ch);
  for(let i=0;i<data.length;i++)data[i]=input[start+i]*gain;
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
  const profile=recordingProfile(voice),buffer=profile&&this.buffers.get(profile.id);if(!buffer)return false;
  const c=this.context,t=c.currentTime,source=c.createBufferSource(),gain=c.createGain(),nodes=[source,gain],duration=profile.fullLength?buffer.duration:Math.min(profile.duration,(buffer.duration-profile.offset)/Math.max(...profile.rates)/(2**(profile.pitch/12))*.995);
  if(duration<=.015){nodes.forEach(n=>n.disconnect());return false;}
  source.buffer=buffer;source.detune.setValueAtTime(profile.pitch*100,t);
  source.playbackRate.setValueAtTime(profile.rates[0],t);source.playbackRate.exponentialRampToValueAtTime(profile.rates[1],t+duration*.4);source.playbackRate.exponentialRampToValueAtTime(profile.rates[2],t+duration);
  // Near-simultaneous copies share volume to keep crowded combat clear.
  const entry={id:profile.id,at:t,gain,level:profile.gain,end:t+duration,attack:Math.min(profile.attack??.002,duration*.1),fade:profile.fadeStart===undefined?Math.min(profile.fadeOut,duration*.25):duration*(1-clamp(profile.fadeStart,0,1))},group=[...this.voices.values()].filter(v=>v.id===profile.id&&t-v.at<.02);group.push(entry);
  for(const v of group){const p=v.gain.gain,level=v.level/group.length;p.cancelScheduledValues(t);p.setValueAtTime(v===entry?0:level,t);if(v===entry)p.linearRampToValueAtTime(level,t+v.attack);p.setValueAtTime(level,Math.max(t+v.attack,v.end-v.fade));p.linearRampToValueAtTime(0,v.end);}
  let end=source;if(profile.lowpass){const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=profile.lowpass;filter.Q.value=.5;end.connect(filter);end=filter;nodes.push(filter);}end.connect(gain);gain.connect(out);this.active.add(source);this.voices.set(source,entry);
  source.onended=()=>{nodes.forEach(n=>n.disconnect());this.active.delete(source);this.voices.delete(source);};
  source.start(t,profile.offset);source.stop(t+duration+.002);this.played++;
  this.history.push({...profile,duration,family:voice.family,cue:voice.cue,at:t});if(this.history.length>32)this.history.shift();
  return true;
 }
}
