import {RULES} from './data.js';
export const MATCH_MODES={
 quick:{name:'빠른 대전',timeLimit:RULES.timeLimit,buildingHealth:1,giftDiscount:250,upgradeFactor:.5,description:'20분 제한 · E.G.O 기프트 250 코스트 할인 · 강화 시술 50% 할인'},
 deep:{name:'심층 대전',timeLimit:Infinity,buildingHealth:1.2,giftDiscount:0,upgradeFactor:1,description:'시간 제한 없음 · 건물 체력 +20% · 기본 상점 가격'},
};
export const normalizeMode=value=>value==='deep'?'deep':'quick';
export const giftPrice=(e,base)=>Math.max(0,base-(e.matchMode==='quick'?MATCH_MODES.quick.giftDiscount:0));
export const procedurePrice=(e,level)=>Math.ceil((RULES.costs[level]||0)*(e.matchMode==='quick'?MATCH_MODES.quick.upgradeFactor:1));
