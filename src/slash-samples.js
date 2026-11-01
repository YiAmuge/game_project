// User-supplied recordings. Trim/normalize only the decoded playback buffers;
// the committed MP3 files remain the originals.
export const SLASH_SAMPLES=[
 {id:'sword',file:'daviddumaisaudio-sword-slash-and-swing-185432.mp3',start:.07,end:.94},
 {id:'cut',file:'freesound_community-slashkut-108175.mp3',start:.05,end:.53},
 {id:'metal',file:'floraphonic-metal-whoosh-hit-2-201903.mp3',start:.08,end:.50},
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const families={
 knife:{pitch:4,duration:.15,rates:[1.2,1.8,1.12],samples:['cut','sword','cut','sword']},
 katana:{pitch:2,duration:.21,rates:[.96,1.5,.88],samples:['sword','cut','sword','cut']},
 blade:{pitch:0,duration:.25,rates:[.86,1.4,.82],samples:['sword','cut','metal','sword']},
 axe:{pitch:-3,duration:.34,rates:[.78,1.22,.72],samples:['metal','sword','metal','sword']},
 greatsword:{pitch:-5,duration:.41,rates:[.72,1.12,.67],samples:['sword','metal','sword','metal']},
 scythe:{pitch:-4,duration:.37,rates:[.75,1.18,.70],samples:['sword','metal','sword','cut']},
 glaive:{pitch:-1,duration:.30,rates:[.82,1.3,.77],samples:['sword','cut','sword','metal']},
 claw:{pitch:1,duration:.22,rates:[1.04,1.55,.91],samples:['cut','sword','cut','sword']},
};
export function slashProfile(voice){
 const base=families[voice.family];if(!base||!['weapon','impact'].includes(voice.cue))return null;
 const variant=((Math.trunc(voice.variant)||0)%4+4)%4,impact=voice.cue==='impact',heavy=base.pitch<0;
 return {
  id:impact?(heavy?'metal':'cut'):base.samples[variant],
  pitch:base.pitch+[-.55,.3,-.15,.65][variant]+(impact?-.5:0),
  duration:base.duration*(impact?.58:1)*(1+[0,.045,-.035,.02][variant]),
  rates:base.rates.map((n,i)=>n*(impact?[1.45,1.12,1][i]:1)),
  gain:(impact?.88:.78)*clamp(.85+(voice.weight||1)*.15,.85,1.12),
  cutoff:voice.family==='claw'?6500:heavy?7600:11500,
  offset:impact?(heavy?.125:.065):0,
 };
}
async function loadRecording(spec){
 const inline=globalThis.document?.getElementById('slash-audio-data');
 const embedded=inline&&JSON.parse(inline.textContent)[spec.id];
 if(embedded){const raw=atob(embedded.slice(embedded.indexOf(',')+1));return Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer;}
 const response=await fetch('./src/assets/audio/'+spec.file);if(!response.ok)throw new Error('Slash audio '+response.status);return response.arrayBuffer();
}
export function prepareSlashBuffer(context,decoded,spec){
 const rate=decoded.sampleRate,start=Math.min(decoded.length-1,Math.floor(spec.start*rate)),end=Math.min(decoded.length,Math.ceil(spec.end*rate));
 const output=context.createBuffer(1,Math.max(1,end-start),rate),data=output.getChannelData(0);let peak=0;
 for(let ch=0;ch<decoded.numberOfChannels;ch++){const input=decoded.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]+=input[start+i]/decoded.numberOfChannels;}
 for(const value of data)peak=Math.max(peak,Math.abs(value));
 const scale=peak>.0001?.82/peak:1,fadeIn=Math.max(1,Math.round(rate*.003)),fadeOut=Math.max(1,Math.round(rate*.018));
 for(let i=0;i<data.length;i++)data[i]*=scale*Math.min(1,i/fadeIn,(data.length-1-i)/fadeOut);
 return output;
}
const contexts=new WeakMap();
export class SlashSamples{
 constructor(context,{loader=loadRecording}={}){
  this.context=context;this.active=new Set();this.played=0;this.history=[];
  let cache=contexts.get(context);
  if(!cache){
   cache={buffers:new Map(),failures:[]};contexts.set(context,cache);
   cache.ready=typeof context.decodeAudioData!=='function'?Promise.resolve(cache.buffers):Promise.all(SLASH_SAMPLES.map(async spec=>{
    try{const bytes=await loader(spec),decoded=await context.decodeAudioData(bytes);cache.buffers.set(spec.id,prepareSlashBuffer(context,decoded,spec));}
    catch{cache.failures.push(spec.id);}
   })).then(()=>cache.buffers);
  }
  this.buffers=cache.buffers;this.failures=cache.failures;this.ready=cache.ready;
 }
 play(out,voice){
  const profile=slashProfile(voice),buffer=profile&&this.buffers.get(profile.id);if(!buffer)return false;
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
