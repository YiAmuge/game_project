export const RIFLE_SAMPLES=[
 {id:'rifleRound',file:'freesound_community-clean-machine-gun-burst-98224.mp3',start:1.345,end:1.632},
 {id:'jamilaReload',file:'dragon-studio-gun-reload-2-511308.mp3'},
 {id:'firearmImpact',file:'firearm-impact.wav',mime:'audio/wav'},
 {id:'guboRifle',file:'freesound_community-sniper-rifle-5989.mp3'},
];
export function rifleSoundProfile(voice){
 const family=voice.impactFamily||voice.family,variant=((Math.trunc(voice.variant)||0)%4+4)%4;
 if(voice.cue==='impact'&&['rifle','pistol','shotgun','cannon'].includes(family))return{id:'firearmImpact',pitch:[-.9,.35,-.25,1.1][variant]+(family==='cannon'?-.5:family==='shotgun'?-.35:family==='pistol'?.15:0),duration:.38*(1+[0,.015,-.015,.008][variant]),rates:[.985,1.025,.99].map(n=>n*(1+[0,.01,-.01,.005][variant])),offset:0,gain:(.68*.70)*Math.max(.85,Math.min(1.12,.85+(voice.weight||1)*.15)),dry:true,fadeOut:.12};
 if(voice.cue==='reload'&&(voice.key==='jamila'&&voice.phase==='lca-reload'||voice.key==='gubo'&&voice.phase==='gubo-reload'))return{id:'jamilaReload',pitch:0,duration:1.512,fullLength:true,rates:[1,1,1],offset:0,gain:.85,dry:true,fadeOut:.006};
 if(voice.key==='gubo'&&voice.cue==='weapon'&&voice.family==='rifle'){
  const level=voice.phase==='gubo-ultimate'?2:voice.phase==='gubo-empowered'?1:0;
  return{id:'guboRifle',pitch:[0,-2,-4.5][level],duration:[.95,1.30,1.90][level],rates:[1,1,1],offset:0,gain:[.76,.90,1.08][level],dry:true,fadeOut:[.14,.24,.50][level]};
 }
 if(!['jamila','myo'].includes(voice.key)||voice.cue!=='weapon'||voice.family!=='rifle')return null;
 return{id:'rifleRound',pitch:voice.key==='jamila'&&voice.phase==='lca-shield-round'?2:0,duration:.285,rates:[1,1,1],offset:0,gain:.76,dry:true,fadeOut:.012};
}
