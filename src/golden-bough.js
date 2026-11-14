import {RULES,RUNTIME_CHAMPIONS as CHAMPIONS} from './data.js';
import {distance} from './geometry.js';

export const active=e=>Boolean(e?.goldenBough);
export const maxLevel=e=>RULES.maxLevel+(active(e)&&e.key==='faust'?5:0);
// Continue the existing XP curve's second difference (+150) beyond level ten.
export function levelXp(level){if(level<=10)return RULES.xp[level-1];let xp=RULES.xp[9],gap=RULES.xp[9]-RULES.xp[8];for(let n=11;n<=level;n++){gap+=150;xp+=gap;}return xp;}
export const voyage=e=>active(e)&&e.key==='ishmael'?Math.min(8,e.ishmaelUltimateHits||0):0;
export const fistBonus=(g,e)=>active(e)&&e.key==='meursault'&&(e.state.fistGrowthUntil||0)>g.time?(e.state.fistGrowth||0)*.4:0;
export const outisRadius=(g,e)=>active(e)?g.attackRange(e):2.5;
export function cooldown(e,slot,base){if(!active(e))return base;if(slot==='q'&&e.key==='meursault')return Math.max(0,base-7);if(slot!=='r')return base;return ({ryoshu:10,honglu:50})[e.key]??Math.max(0,base-({yi:37,don:15,heathcliff:15}[e.key]||0));}
export const TEXT={
 yi:'궁극기 기본 재사용 대기시간이 37초 감소하고 최대 2회 비축한다. 사용한 횟수는 순서대로 충전된다.',
 faust:'최대 레벨이 15가 되고 자동 경험치를 포함한 모든 경험치 획득량이 2배가 된다. 최대 레벨에서는 입힌 최종 피해의 7%만큼 추가 고정 피해를 입히고 그 추가 피해의 50%만큼 체력을 회복한다.',
 don:'피갈망을 영구적으로 얻는다. 궁극기로 피갈망을 중복 획득하지 않으며 궁극기 기본 재사용 대기시간이 15초 감소한다.',
 ryoshu:'궁극기가 천살성도 - 아라야시키로 변경된다. 기본 재사용 대기시간 10초. 유지 중에는 궁극기 재사용 대기가 진행되지 않으며 종료·사망 후 시작한다. 사거리 5.5 안의 지점으로 순간이동한 뒤 자신 중심 반경 3의 모든 적에게 0.2초마다 (35 + 자신의 최대 체력 1.5%) 고정 피해를 입힌다. 지속 중 이동속도 +20%를 얻고 이동과 궁극기 종료 재사용만 가능하다. 적의 모든 공격에 면역이며 매 타격마다 자신도 (7 + 자신의 최대 체력 0.3%) 고정 피해를 입어 사망할 수 있다. 사망하면 해당 위치에 장판이 5초간 남는다. 재사용하면 종료하고 적에게 입힌 총 피해의 30%만큼 회복하며 최대 자신의 최대 체력 15%까지만 회복한다.',
 meursault:'기본공격이 적중하면 3초간 폭과 사거리가 각각 0.4 증가한다. 3초 안에 다시 적중하면 중첩하고 시간을 갱신하며 최대 1.6까지 증가한다. 전술기 기본 재사용 대기시간이 7초 감소한다.',
 honglu:'궁극기가 태허환경으로 변경된다. 기본 재사용 대기시간 50초. 자신과 살아 있는 모든 아군 챔피언의 상태이상을 해제하고 각각을 따라가는 반경 3.5의 장판을 4초간 부착한다. 0.3초마다 적을 공격하고 아군을 치유한다. 시전 즉시 첫 타격으로 120 피해와 120 회복을 적용하며 추가 체력 1%마다 첫 회복량이 20 증가한다. 이후 타격은 60 피해와 75 회복이며 추가 체력 1%마다 회복량이 7 증가한다. 아군이 장판에 처음 닿으면 상태이상을 정화한다.',
 heathcliff:'궁극기 기본 재사용 대기시간이 15초 감소하고 지속시간이 1.2초 증가한다.',
 ishmael:'이번 전투에서 궁극기가 적 챔피언에게 적중할 때마다 항해를 영구적으로 1 얻는다. 구매 전 적중도 포함하며 최대 8이다. 항해 1당 스킬 가속 +2.5%·최대 체력 +5%를 얻는다.',
 rodya:'패시브로 스킬 가속 3%당 전투력 3%를 얻고 전술기 동전 앞면 확률이 25%p 증가한다.',
 sinclair:'표지 각성 지속시간이 3초 증가한다. 궁극기 사용 시 현재 체력과 관계없이 표지 3개 획득과 최대 체력 15% 보호막·남은 궁극기 재사용 대기시간 20% 감소를 모두 적용한다.',
 outis:'패시브의 근접 피해 강화와 보호막 발동 반경이 현재 기본공격 사거리와 같아진다.',
 gregor:'변이 중 기본공격 시 2.5칸 돌진한 뒤 공격한다. 변이 재사용 대기시간이 5초 감소한다.',
};
export function purchase(g,e){e.goldenBough=true;if(e.key==='yi'){e.state.yiCharges=2;e.state.yiReady=0;e.rCd=0;}if(e.key==='gregor'&&e.state.mutateReady>g.time)e.state.mutateReady=Math.max(g.time,e.state.mutateReady-5);}
export function charges(g,e){if(e.key!=='yi'||!active(e))return null;return {current:e.state.yiCharges??2,max:2,remaining:(e.state.yiCharges??2)<2?Math.max(0,(e.state.yiReady||0)-g.time):0};}
export function tick(g,e){if(!charges(g,e))return;const s=e.state;s.yiCharges??=2;while(s.yiCharges<2&&s.yiReady<=g.time+1e-8){s.yiCharges++;s.yiReady+=g.cooldown(e,'r');}e.rCd=s.yiCharges>0?0:Math.max(0,s.yiReady-g.time);}
export function spendYi(g,e){const s=e.state;s.yiCharges??=2;if(s.yiCharges===2)s.yiReady=g.time+g.cooldown(e,'r');s.yiCharges--;e.rCd=s.yiCharges>0?0:Math.max(0,s.yiReady-g.time);}
export function fistHit(g,e){if(!active(e)||e.key!=='meursault')return;if(!(e.state.fistGrowthUntil>g.time))e.state.fistGrowth=0;e.state.fistGrowth=Math.min(4,(e.state.fistGrowth||0)+1);e.state.fistGrowthUntil=g.time+3;}
export function harpoonHit(g,e){e.ishmaelUltimateHits=(e.ishmaelUltimateHits||0)+1;if(active(e))g.refreshEquipment(e);}
export const storm=(g,e)=>e.key==='ryoshu'&&active(e)?g.zones.find(z=>z.kind==='arayashiki'&&z.source===e&&!z.posthumous&&z.until>g.time):null;
export function castStorm(g,e,p){const old=storm(g,e);if(old){old.until=g.time;e.rCd=g.cooldown(e,'r');g.heal(e,e,Math.min(old.dealt*.3,e.maxHp*.15),false);return;}Object.assign(e,g.safeLanding(e,p,5.5));g.zones.push({kind:'arayashiki',source:e,x:e.x,y:e.y,r:3,startedAt:g.time,angle:e.facing,until:Infinity,nextTick:g.time+.2,nextSwing:g.time+.4,dealt:0});g.emitSound('swing',e,{slot:'r',damageKind:'skill',family:'katana',element:'metal',phase:'arayashiki-sweep'});}
export function onDeath(g,e){const z=storm(g,e);if(z){z.x=e.x;z.y=e.y;z.posthumous=true;z.until=g.time+5;e.rCd=g.cooldown(e,'r');}}
export function updateStorm(g,z){if(!z.posthumous){z.x=z.source.x;z.y=z.source.y;}while((z.nextSwing??Infinity)<=Math.min(g.time,z.until)+1e-8){z.nextSwing+=.4;g.emitSound('swing',z.source,{slot:'r',damageKind:'skill',family:'katana',element:'metal',phase:'arayashiki-sweep',x:z.x,y:z.y});}while(z.nextTick<=Math.min(g.time,z.until)+1e-8){z.nextTick+=.2;const e=z.source;g.effects.push({type:'arayashikiCuts',source:e.id,x:z.x,y:z.y,r:3,seed:Math.round(z.nextTick*1000)+e.id*7919,theme:'ryoshu',life:.26,maxLife:.26});for(const t of [...g.units])if(g.hostile(e,t)&&distance(z,t)<=3+t.radius&&g.clearLine(z,t)){const shield=g.shield(t);z.dealt+=g.deal(e,t,35+e.maxHp*.015,{fixed:true,proc:false,augmentOrigin:'arayashiki',sound:{slot:'r',family:'katana',element:'metal',phase:'arayashiki-hit',cue:'impact',periodic:false}})+Math.max(0,shield-g.shield(t));}if(!z.posthumous&&e.alive)g.selfDamage(e,7+e.maxHp*.003,{cause:'arayashiki'});}}

export function abilityInfo(g,e){
 if(!active(e))return {};
 const c=CHAMPIONS[e.key],info={passiveText:c.passiveText+' '+giftNotes(e.key).map(n=>'※ '+n.label+': '+n.text).join(' ')};
 if(e.key==='faust'){info.passiveText=info.passiveText.replaceAll('최대 레벨 10','최대 레벨 15').replace('초당 자동 경험치 9','초당 자동 경험치 18');info.rText=c.rText.replaceAll('최대 레벨 10','최대 레벨 15');}
 if(e.key==='don')info.rText=c.rText.replace('사용 시 7초간 피갈망을 얻는다.','피갈망은 영구 적용된다.');
 if(e.key==='rodya')info.passiveText=c.passiveText.replace('전투력이 1%','전투력이 3%');
 if(['yi','heathcliff','sinclair'].includes(e.key))info.rText=c.rText+' 황금 가지: '+TEXT[e.key];
 if(['meursault','rodya'].includes(e.key))info.qText=c.qText+' 황금 가지: '+TEXT[e.key];
 if(['meursault','gregor'].includes(e.key))info.basicText=c.basicText+' 황금 가지: '+TEXT[e.key];
 if(e.key==='ryoshu')Object.assign(info,{ultimate:'천살성도 - 아라야시키',rText:TEXT.ryoshu});
 if(e.key==='honglu')Object.assign(info,{ultimate:'태허환경',rText:TEXT.honglu});
 return info;
}


export const CHANGED_ULTIMATES={ryoshu:'천살성도 - 아라야시키',honglu:'태허환경'};
export function giftNotes(key){
 if(CHANGED_ULTIMATES[key])return [{label:'궁극기 변경',text:CHANGED_ULTIMATES[key]+'로 변경된다. 상세 효과는 궁극기 도감의 황금 가지 항목에서 확인한다.'}];
 const notes={
  yi:[['궁극기 재사용','기본 재사용 대기시간 −37초. 최대 2회 비축하며 사용한 횟수는 순서대로 충전된다.']],
  faust:[['성장','최대 레벨 15. 자동 경험치를 포함한 모든 경험치 획득량 2배.'],['최대 레벨 효과','최종 피해의 7% 추가 고정 피해. 해당 추가 피해의 50%만큼 회복한다.']],
  don:[['피갈망','영구 적용되며 궁극기로 중복 획득하지 않는다.'],['궁극기 재사용','기본 재사용 대기시간 −15초.']],
  meursault:[['기본공격','적중마다 3초간 폭·사거리 +0.4, 최대 +1.6. 재적중 시 지속시간을 갱신한다.'],['전술기 재사용','기본 재사용 대기시간 −7초.']],
  heathcliff:[['궁극기','기본 재사용 대기시간 −15초. 지속시간 +1.2초.']],
  ishmael:[['항해 획득','이번 전투의 궁극기 적 챔피언 적중마다 영구 항해 1, 최대 8. 구매 전 적중도 포함한다.'],['항해 효과','1당 스킬 가속 +2.5%·최대 체력 +5%.']],
  rodya:[['패시브','스킬 가속 3%당 전투력 3%.'],['전술기','동전 앞면 확률 +25%p.']],
  sinclair:[['표지 각성','지속시간 +3초.'],['궁극기','현재 체력과 관계없이 표지 3개 및 최대 체력 15% 보호막·남은 궁극기 재사용 대기시간 20% 감소를 모두 적용한다.']],
  outis:[['패시브 범위','근접 피해 강화·보호막 발동 반경이 현재 기본공격 사거리와 같아진다.']],
  gregor:[['변이 기본공격','2.5칸 돌진한 뒤 공격한다.'],['변이 재사용','재사용 대기시간 −5초.']],
 };
 return (notes[key]||[]).map(([label,text])=>({label,text}));
}
export function ultimateNotes(key){
 if(key==='ryoshu')return [
  {label:'이동과 범위',text:'사거리 5.5 안으로 순간이동한다. 공격 범위는 자신 중심 반경 3이다.'},
  {label:'연속 베기',text:'0.2초마다 모든 적에게 (35 + 자신의 최대 체력 1.5%) 고정 피해를 입힌다.'},
  {label:'유지 효과',text:'이동속도 +20%·적의 모든 공격 면역. 이동과 궁극기 종료 재사용만 가능하다.'},
  {label:'자해와 사망',text:'매 타격마다 자신에게 (7 + 자신의 최대 체력 0.3%) 고정 피해를 입히며 사망할 수 있다. 사망하면 해당 위치에 장판이 5초간 남는다.'},
  {label:'종료와 회복',text:'재사용으로 종료하고 적에게 입힌 총 피해의 30%를 회복한다. 한 번의 종료 회복은 자신의 최대 체력 15%를 넘지 않는다.'},
  {label:'재사용 대기',text:'유지 중에는 궁극기 재사용 대기가 진행되지 않는다. 종료·사망 후 재사용 대기가 시작된다.'},
 ];
 if(key==='honglu')return [
  {label:'장판 부착',text:'자신과 살아 있는 모든 아군 챔피언의 상태이상을 해제하고 각각을 따라가는 반경 3.5 장판을 4초간 부착한다.'},
  {label:'첫 파동',text:'시전 즉시 첫 타격으로 120 피해와 120 회복을 적용하며 추가 체력 1%마다 첫 회복량이 20 증가한다.'},
  {label:'후속 파동',text:'이후 0.3초마다 60 피해와 75 회복이며 추가 체력 1%마다 회복량이 7 증가한다. 아군이 장판에 처음 닿으면 상태이상을 정화한다.'},
 ];return [];
}
