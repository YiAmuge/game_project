import { distance } from './geometry.js';
export const CONSUMABLES=[
 {key:'potion',name:'회복 물약',cost:90,uses:2,implemented:true,text:'4초 동안 최대 체력의 18% 회복. 피격해도 유지.'},
 {key:'cleanse',name:'정화 팔찌',cost:140,uses:1,implemented:true,text:'해로운 효과 해제·CC 면역 및 이동속도 +20% 1초.'},
 {key:'speed',name:'가속제',cost:100,uses:2,implemented:true,text:'이동속도 +0.8, 3초 동안 선형 감소.'},
 {key:'weakness',name:'약화 표식',cost:120,uses:1,implemented:true,text:'커서로 지정한 사거리 7 내 적 챔피언의 이동·장전 속도 −20% 3초.'},
 {key:'battle',name:'전투 물약',cost:150,uses:1,implemented:true,text:'8초 동안 전투력 +12%·스킬 가속 +15%.'},
 {key:'magazine',name:'추가 탄창',cost:150,uses:1,implemented:true,text:'8초 동안 장전 +20%·최대 탄창 +1. 루돌프는 최대 정신력 +15. 종료 후 초과 자원은 소모할 때까지 보존.'},
];
export const definition=key=>CONSUMABLES.find(i=>i.key===key);
export function current(e){return e.potion>0?definition(e.itemKey||'potion'):null;}
export function buy(g,e,key){const item=definition(key);if(!item||!g.canShop(e)||current(e)||e.gold<item.cost)return false;e.gold-=item.cost;e.itemKey=key;e.potion=item.uses;return true;}
export function refund(e){const item=current(e);return item?Math.floor(item.cost*.5*e.potion/item.uses):0;}
export function sell(g,e){if(!g.canUpgrade(e)||!current(e))return false;e.gold+=refund(e);e.potion=0;e.itemKey=null;return true;}
export function use(g,e,point){
 const item=current(e);if(!item||!e.alive||e.state.posthumous||g.winner!==null)return false;
 if(item.key==='potion'){if(e.potionUntil>g.time)return false;e.potionUntil=g.time+4;}
 if(item.key==='cleanse'){
  e.status={};delete e.burn;delete e.state.ishmaelWeak;delete e.state.mentalWhip;delete e.state.gaze;delete e.state.contempt;delete e.state.nellyMarks;
  for(const key of ['nellyMark','contempt','harpoon'])delete e.visuals[key];
  e.ccImmuneUntil=Math.max(e.ccImmuneUntil||0,g.time+1);g.addBuff(e,'itemCleanse',1);
 }
 if(item.key==='speed')g.addBuff(e,'itemSpeed',3);
 if(item.key==='weakness'){
  const t=g.champions(1-e.team).filter(t=>t.alive&&!g.hidden(t)&&g.visibleTo(e.team,t)&&g.clearTarget(e,t,7)&&point&&distance(point,t)<2).sort((a,b)=>distance(point,a)-distance(point,b))[0];
  if(!t)return false;g.status(t,'slow',.2,3,e);g.status(t,'reloadWeak',.2,3,e);e.lastAttackAt=g.time;
 }
 if(item.key==='battle'){g.addBuff(e,'itemBattle',8);g.refreshEquipment(e,{clampAmmo:false});}
 if(item.key==='magazine')g.addBuff(e,'itemMagazine',8);
 e.potion--;if(!e.potion)e.itemKey=null;return true;
}
