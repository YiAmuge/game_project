export const ELECTRIC_SAMPLES=[
 {id:'outisShotgun',file:'freesound_community-080902_shotgun-39753.mp3'},
 {id:'hohenElectrocute',file:'freesound_community-electrocute-6247.mp3'},
 {id:'hohenUltimate',file:'daviddumaisaudio-electric-whoosh-01-204487.mp3'},
 {id:'hohenBeam',file:'freesound_gamestudio-rpg-sword-attack-combo-11-388931.mp3',start:.26,end:.78},
];
export function electricSoundProfile(voice){
 if(voice.key==='outis'&&voice.phase==='outis-shotgun'&&voice.cue==='shotgun')return{id:'outisShotgun',pitch:0,duration:1.45,rates:[1,1,1],offset:0,gain:.82,dry:true,fadeOut:.20};
 if(voice.key!=='hohenheim')return null;
 const variant=((Math.trunc(voice.variant)||0)%4+4)%4;
 if(voice.cue==='cast'&&voice.slot==='q')return{id:'hohenElectrocute',pitch:-2,duration:.85,rates:[.98,1.02,.97],offset:0,gain:.62,dry:true,fadeOut:.18};
 if(voice.cue!=='weapon')return null;
 if(voice.phase==='electric-beam')return{id:'hohenBeam',pitch:-4.5+[-.25,.15,-.1,.25][variant],duration:.38,rates:[.96,1.02,.94],offset:0,gain:.42,dry:true,fadeOut:.08,lowpass:3600};
 if(voice.phase==='hohen-grow-hit')return{id:'hohenUltimate',pitch:0,duration:.98,rates:[1,1,1],offset:0,gain:.20,dry:true,fadeOut:.18};
 if(voice.phase==='hohen-full-hit')return{id:'hohenUltimate',pitch:-1.25+[-.15,.1,-.05,.15][variant],duration:.85,rates:[1,1,1],offset:1.08,gain:.55,dry:true,fadeOut:.20};
 return null;
}
export class HohenheimChargeAudio{
 constructor(audio){this.audio=audio;this.fields=new Map();}
 stop(id){const f=this.fields.get(id);if(!f)return;this.fields.delete(id);const t=this.audio.context.currentTime;f.out.gain.cancelScheduledValues(t);f.out.gain.setValueAtTime(f.out.gain.value,t);f.out.gain.linearRampToValueAtTime(0,t+.08);f.source.stop(t+.09);}
 stopAll(){for(const id of this.fields.keys())this.stop(id);}
 sync(game,listener,active){
  const a=this.audio,c=a.context,buffer=a.synth?.swings.buffers.get('hohenElectrocute');
  const live=active&&buffer?game.units.filter(e=>e.key==='hohenheim'&&e.kind==='champion'&&e.alive&&e.state?.hohenCharge&&!e.motion&&!e.recall&&!game.hidden?.(e)&&!game.stat?.(e,'stun')&&!game.stat?.(e,'disarm')).map(e=>({e,...a.spatial(e,listener)})).filter(e=>e.d<34).sort((x,y)=>x.d-y.d).slice(0,3):[];
  for(const id of this.fields.keys())if(!live.some(v=>v.e.id===id))this.stop(id);
  for(const target of live){
   let f=this.fields.get(target.e.id);
   if(!f){const route=a.output(a.combat,0,target.pan,0),source=c.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(route.out);source.onended=()=>{source.disconnect();route.nodes.forEach(n=>n.disconnect());};source.start(c.currentTime);f={...route,source};this.fields.set(target.e.id,f);}
   const progress=Math.min(1,Math.max(0,(target.e.state.hohenCharge.progress||0)/1.5));f.source.detune.setTargetAtTime((-2+progress*1.75)*100,c.currentTime,.08);f.source.playbackRate.setTargetAtTime(.99+progress*.02,c.currentTime,.08);
   f.out.gain.setTargetAtTime(target.gain*.22/Math.sqrt(live.length),c.currentTime,.06);f.nodes.find(n=>n.pan)?.pan.setTargetAtTime(target.pan,c.currentTime,.1);
  }
 }
}
