// Prices/refunds are prototype choices; all combat percentages follow the user request.
export const AUGMENT_RULES={cost:500,refund:.7,slots:3};
export const AUGMENTS=[
 {key:'finalBullet',group:'combat',name:'흉터를 남기는 탄환',text:'12초마다 적 챔피언 적중 시 최종 체력 피해의 7.5% 고정 피해'},
 {key:'power15',group:'combat',name:'격화',text:'전투력 +15%'},
 {key:'range7',group:'combat',name:'긴 전선',text:'기본 공격 사거리 +7%'},
 {key:'reloadStacks',group:'combat',name:'교전 장전',text:'공격 적중 시 장전 +5% 중첩, 최대 3. 중첩은 1.5초마다 하나씩 감소'},
 {key:'armorHealth',group:'survival',name:'중갑 외피',text:'체력 +5% · 방어 계수 +17.5%'},
 {key:'emergencyHeal',group:'survival',name:'비상 수복',text:'체력 50% 미만에서 적 챔피언 피격 시 최대 체력 30% 회복 · 30초 대기'},
 {key:'health15',group:'survival',name:'생존 본능',text:'체력 +15%'},
 {key:'reloadRetaliation',group:'survival',name:'제압 외피',text:'나를 공격한 적 챔피언에게 장전 −15%를 1.25초 부여'},
 {key:'battleHaste',group:'tech',name:'전장 적응',text:'3초 이상 교전 유지 시 스킬 가속 +8.5% · 비전투 시 해제'},
 {key:'cooldown15',group:'tech',name:'정밀 회로',text:'전술기·궁극기 기본 재사용 대기시간 −15%'},
 {key:'magazine2',group:'tech',name:'확장 탄창',text:'최대 탄창 +2 · 루돌프는 최대 정신력 +30'},
 {key:'adaptiveSpeed',group:'tech',name:'가변 추진',text:'비전투 이동속도 +15% · 전투 중 +7%'},
];
export const has=(e,key)=>e.augments?.includes(key)||false;
export function unlocked(e,group){return group==='combat'?e.upgrades.power>=3:group==='survival'?e.upgrades.health>=3:e.upgrades.speed+e.upgrades.reload+e.upgrades.haste>=3;}
export function tick(g,e){
 const s=e.state;
 if(g.time-e.lastCombat>3){delete s.augCombatAt;delete e.buffs.augBattleHaste;}
 else{s.augCombatAt??=g.time;if(has(e,'battleHaste')&&g.time-s.augCombatAt>=3){if(!g.buff(e,'augBattleHaste'))g.addBuff(e,'augBattleHaste',3,{copy:false});else e.buffs.augBattleHaste=g.time+3;}}
 if(s.augReloadStacks>0&&g.time+1e-8>=s.augReloadDecay){while(s.augReloadStacks>0&&g.time+1e-8>=s.augReloadDecay){s.augReloadStacks--;s.augReloadDecay+=1.5;}if(!s.augReloadStacks)delete e.buffs.augReload;}
}
export function afterHit(g,e,t,actual,proc){
 if(!proc)return;
 if(e.kind==='champion'&&e.team!==t.team){
  if(has(e,'reloadStacks')){e.state.augReloadStacks=Math.min(3,(e.state.augReloadStacks||0)+1);e.state.augReloadDecay=g.time+1.5;g.addBuff(e,'augReload',e.state.augReloadStacks*1.5,{copy:false});}
  if(t.kind==='champion'&&has(e,'finalBullet')&&(e.state.augBulletReady||0)<=g.time){e.state.augBulletReady=g.time+12;if(t.hp>0)g.deal(e,t,actual*.075,{fixed:true,proc:false});}
 }
 if(t.kind==='champion'&&e.kind==='champion'&&e.team!==t.team){
  if(has(t,'reloadRetaliation'))g.status(e,'reloadWeak',.15,1.25,t);
  if(has(t,'emergencyHeal')&&t.hp>0&&t.hp/t.maxHp<.5&&(t.state.augHealReady||0)<=g.time){t.state.augHealReady=g.time+30;g.heal(t,t,t.maxHp*.3,false);g.addBuff(t,'emergencyRepair',.8,{copy:false});}
 }
}
