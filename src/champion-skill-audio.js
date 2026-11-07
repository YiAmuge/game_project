export const CHAMPION_SKILL_SAMPLES=[
 {id:'dongbaekWind',file:'yodguard-wind-magic-6-378626.mp3',start:.25,end:1.5},
 {id:'dongbaekChimes',file:'dongbaek-wind-chimes.wav',mime:'audio/wav'},
 {id:'waterSplash',file:'universfield-water-splash-199583.mp3',start:.15,end:2.25},
 {id:'groundImpact',file:'universfield-body-hit-ground-250958.mp3',start:.10,end:1.40},
 {id:'nellyMetal',file:'floraphonic-metal-whoosh-hit-2-201903.mp3',start:.045,end:.58},
 {id:'iceAxeImpact',file:'yodguard-iced-magic-6-378606.mp3',start:.015,end:1.60},
 {id:'earthImpact',file:'yodguard-earth-magic-5-378598.mp3',start:0,end:2.05},
];
const landings=new Set(['heath-landing','sora-landing','starbuck-landing']);
export function championSkillSoundProfile(v){
 const variant=((Math.trunc(v.variant)||0)%4+4)%4,tint=[-.25,.15,-.1,.25][variant];
 const profile=(id,pitch,duration,gain,offset=0,fadeOut=.10,rates=[.98,1.04,.96])=>({id,pitch,duration,gain,offset,fadeOut,rates,dry:true});
 if(v.key==='dongbaek'){
  if(v.cue==='weapon'&&!v.slot)return profile('dongbaekWind',.25+tint,.55,.72,0,.11,[1.02,1.18,.96]);
  if(v.cue==='cast'&&v.slot==='r')return profile('dongbaekWind',-.75+tint,.75,.90,0,.15,[.94,1.10,.88]);
  if(v.cue==='petal'&&v.phase==='dongbaek-bloom')return v.slot==='r'
   ?{...profile('dongbaekChimes',-.9+tint,2.60,1.05,0,.5,[.94,1.01,.94]),attack:.035,fadeStart:.08}
   :{...profile('dongbaekChimes',.6+tint,1.05,.48,.04,.25,[1.03,1.07,1]),attack:.02,fadeStart:.12};
 }
 if(v.cue==='slam'&&landings.has(v.phase))return profile('groundImpact',-1+tint,.75,.82,0,.16);
 if(v.key==='rudolph'){
  if(v.cue==='weapon'&&!v.slot)return profile('hohenElectrocute',.5+tint,.24,.55,.055,.065);
  if(v.cue==='cast'&&v.slot==='r')return profile('hohenElectrocute',-1.5,.70,.78,.05,.20);
  if(v.cue==='burst'&&v.slot==='r')return profile('hohenElectrocute',-3.5+tint,.95,1.10,.10,.22);
 }
 if(v.key==='honglu'){
  if(v.cue==='water'&&v.phase==='healing-ripple')return profile('waterSplash',.2+tint,.80,.66,0,.16);
  if(v.cue==='waterfall'&&v.phase==='waterfall-start')return profile('waterSplash',-1.4,1.20,1.15,0,.22);
  if(v.cue==='water'&&v.phase==='waterfall-heal')return profile('waterSplash',-.6+tint,.46,.90,0,.11);
 }
 if(v.key==='nelly'&&v.cue==='weapon'){
  if(v.slot==='q')return profile('nellyMetal',1.8+tint,.26,.72,0,.055,[1.08,1.20,.98]);
  if(!v.slot)return profile('nellyMetal',-1.5+tint,.38,.70,0,.085,[.94,1.08,.90]);
 }
 if(v.key==='rodya'&&v.cue==='impact'&&v.phase==='rodya-ice-hit')return profile('iceAxeImpact',-1.25+tint,.72,.70,0,.15);
 if(v.key==='marton'&&v.cue==='impact'&&v.phase==='marton-root-hit')return profile('earthImpact',-1.25+tint,.72,.68,0,.16);
 return null;
}
