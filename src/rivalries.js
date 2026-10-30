export const RIVAL_REWARDS={
 darkWorld:{name:'어둠의 세계',power:.05},lightWorld:{name:'빛의 세계',power:.05},
 fullBloom:{name:'만발',basic:.05},fruition:{name:'결실',cooldown:.05},
};
const PAIRS=[['sinclair','kromer'],['dongbaek','dongrang']];
const LINES={
 kromer:['darkWorld','아아... 나의 싱클레어...!!'],
 sinclair:['lightWorld','그 ■■■에게, 말뚝을 쑤셔-$#^$^%^%!!!'],
 dongbaek:['fullBloom','역시… 역시…!!!! 이… 이… 변절자 새끼!!!!'],
 dongrang:['fruition','자... 그만 흐드러지자, 동백.'],
};
export function initRivalries(g){
 g.rivalries=PAIRS.map(keys=>{
  const heroes=g.champions().filter(e=>!e.trainingDummy&&keys.includes(e.key));
  const participants=heroes.filter(e=>heroes.some(other=>other.key!==e.key&&other.team!==e.team)).map(e=>e.id);
  return {keys,participants:g.training?[]:participants,winner:null};
 });
}
export const rivalBonus=(e,stat)=>RIVAL_REWARDS[e.rivalReward]?.[stat]||0;
export function rivalKill(g,killer,victim){
 if(g.training||killer?.kind!=='champion'||victim.kind!=='champion'||killer.team===victim.team||killer.trainingDummy||victim.trainingDummy)return;
 const duel=g.rivalries?.find(d=>d.winner===null&&d.keys.includes(killer.key)&&d.keys.includes(victim.key)&&killer.key!==victim.key&&d.participants.includes(killer.id)&&d.participants.includes(victim.id));
 if(!duel)return;
 duel.winner=killer.id;const [reward,text]=LINES[killer.key];killer.rivalReward=reward;killer.rivalRewardOrder=++g.buffSequence;
 killer.easterText={text,until:g.time+4};g.log(`${killer.name} · ${RIVAL_REWARDS[reward].name}`,killer.team===0?'ally':'enemy');
}
