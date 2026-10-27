// Sound timbres describe the held material and the ability, independently of team tint.
export const WEAPON_VOICES={
 yi:['glass','mirror',.45],faust:['blade','metal',.85],sinclair:['axe','metal',1.25],don:['spear','blood',.9],meursault:['punch','metal',1.2],
 gubo:['rifle','metal',1.2],kim:['katana','metal',.85],queequeg:['spear','water',1],ppui:['nail','blood',.4],gahwan:['blade','arcane',.85],
 hohenheim:['staff','electric',.8],alisa:['club','fire',1.2],marton:['hammer','wood',1.4],nelly:['knife','metal',.45],myo:['knife','metal',.65],
 rudolph:['staff','electric',.9],dongbaek:['branch','petal',.6],dongrang:['scythe','wood',1.15],outis:['blade','metal',.85],heathcliff:['club','metal',1.3],
 ryoshu:['katana','metal',.85],ishmael:['mace','water',1.2],honglu:['glaive','water',.95],rodya:['axe','metal',1.15],gregor:['organic','organic',1.1],
 ahab:['spear','water',1.15],starbuck:['spear','water',1],sora:['punch','chain',1.4],yan:['greatsword','metal',1.5],moses:['smoke','smoke',.55],ezra:['punch','metal',1.1],
};
export const SKILL_VOICES={
 yi:{q:['glass','mirror'],r:['phase','mirror']},faust:{q:['blade','metal'],r:['arcane','arcane']},sinclair:{q:['axe','wind'],r:['axe','wood']},
 don:{q:['spear','wind'],r:['spear','blood']},meursault:{q:['chain','chain'],r:['chain','chain']},gubo:{q:['rifle','blood'],r:['rifle','blood']},
 kim:{q:['katana','metal'],r:['katana','wind']},queequeg:{q:['chain','water'],r:['spear','water']},ppui:{q:['chime','blood'],r:['nail','blood']},
 gahwan:{q:['blade','arcane'],r:['arcane','arcane']},hohenheim:{q:['staff','electric'],r:['staff','electric']},alisa:{q:['club','fire'],r:['club','fire']},
 marton:{q:['branch','wood'],r:['chime','arcane']},nelly:{q:['knife','wind'],r:['knife','metal']},myo:{q:['rifle','metal'],r:['knife','blood']},
 rudolph:{q:['staff','electric'],r:['staff','electric']},dongbaek:{q:['branch','petal'],r:['branch','petal']},dongrang:{q:['branch','wood'],r:['scythe','wood']},
 outis:{q:['blade','wind'],r:['spear','metal']},heathcliff:{q:['club','wind'],r:['club','shadow']},ryoshu:{q:['katana','wind'],r:['katana','fire']},
 ishmael:{q:['shield','metal'],r:['spear','water']},honglu:{q:['glaive','water'],r:['glaive','water']},rodya:{q:['coin','metal'],r:['axe','ice']},
 gregor:{q:['organic','organic'],r:['organic','organic']},ahab:{q:['chain','wind'],r:['spear','water']},starbuck:{q:['spear','wind'],r:['spear','water']},
 sora:{q:['punch','chain'],r:['chime','arcane']},yan:{q:['greatsword','metal'],r:['chime','shadow']},moses:{q:['smoke','smoke'],r:['smoke','smoke']},ezra:{q:['metal','metal'],r:['punch','arcane']},
};
export const soundAllowed=e=>Boolean(e)&&e.sourceKind!=='minion';
export function soundVoice(e){
 let [family,element,weight]=WEAPON_VOICES[e.key]||['punch','metal',.8];const skill=e.slot&&e.damageKind!=='basic';
 if(skill&&SKILL_VOICES[e.key]?.[e.slot])[family,element]=SKILL_VOICES[e.key][e.slot];
 if(e.sourceKind==='tower'||e.sourceKind==='core'){family='cannon';element='stone';weight=1.5;}
 if(e.sourceKind==='neutral'){
  [family,element,weight]=({boss:['cloth','shadow',1.4],sewingKing:['branch','wood',1.4],needle:['needle','cloth',.5],amplify:['cloth','blood',.7],blessing:['club','metal',.95]})[e.camp]||['punch','stone',.75];
 }
 if(e.key==='myo'&&e.kind==='shot')family='rifle';
 if(e.key==='sora'&&e.form==='ego'){family='claw';element='shadow';}
 if(e.key==='yan'&&e.form==='distorted'){family='organic';element='shadow';}
 if(e.key==='ezra'&&e.stance===2){family='drill';element='metal';}
 if(e.key==='ezra'&&e.stance===1)family='hammer';
 if(e.key==='ezra'&&e.stance===3)family='punch';
 if(e.transforming&&e.slot==='r'){family='phase';element='shadow';}
 family=e.family||family;element=e.element||element;weight=e.weight||weight;
 let cue=e.cue||({hit:e.periodic?'tick':'impact',swing:'weapon',shot:'weapon',cast:'cast',ultimate:'cast',charge:'charge',slam:'slam',detonation:'burst',explosion:'explosion',water:'water',waterfall:'waterfall',death:'death',intro:'arrival',spawn:'arrival',shop:'shop',ping:'ping',victory:'victory',defeat:'defeat'})[e.kind]||'cast';
 if(e.kind==='explosion'&&e.phase==='outis-shotgun'){cue='shotgun';family='shotgun';element='fire';}
 if(e.shielded&&cue==='impact'){family='shield';weight*=.7;}
 return{cue,family,element,weight,variant:e.variant||0,priority:e.kind==='ping'?5:['explosion','waterfall','victory','defeat'].includes(e.kind)?4:['cast','ultimate','slam','detonation'].includes(e.kind)?3:e.kind==='hit'?1:2};
}
// Area contacts and simultaneous projectiles in one volley share a sound; timed shots stay separate.
export function mixSoundEvents(events,listener){const result=[],groups=new Map();for(const e of events){if(!soundAllowed(e))continue;if(!['hit','shot'].includes(e.kind)){result.push({...e});continue;}const id=[e.sourceId,e.kind,e.slot,e.phase,e.damageKind,e.periodic,Math.round(e.at*1000)].join('/'),old=groups.get(id);if(!old){const entry={...e,contacts:1};groups.set(id,entry);result.push(entry);}else{old.contacts++;old.strength=Math.min(1.5,Math.max(old.strength||.5,e.strength||.5)+.07);if(listener&&Math.hypot(e.x-listener.x,e.y-listener.y)<Math.hypot(old.x-listener.x,old.y-listener.y)){old.x=e.x;old.y=e.y;}}}return result.sort((a,b)=>soundVoice(b).priority-soundVoice(a).priority);}
