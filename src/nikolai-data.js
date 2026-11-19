export const NIKOLAI={health:2200,armor:10,speed:3.5,ammo:4,reload:1,interval:.9,range:8,damage:100,markDuration:10,markRange:10,markDamage:.12,markSpeed:.15,closeRange:2.5,closeInterval:.5,closeReload:.7,closeReloadRate:.3,closeBonus:50,drain:.2,qRange:8,qDuration:3,qEvery:.5,qHeal:110,qHealth:.013,qSpeed:.15,qPower:.2,qCooldown:8,rRange:7.5,rCooldown:68,rStun:.6,rDamage:150,rBonus:25,rHits:4,rEvery:.05,rDuration:5,rTrue:.1,rHeal:220,rHealth:.013};
export const NIKOLAI_TEXT={
 passiveText:'적 챔피언에게 피해를 주면 10초간 표적을 부여한다. 표적은 한 명에게만 유지되며 새 대상에게 부여하면 이전 표적이 사라진다. 표적은 아군 챔피언에게 받는 피해가 12% 증가한다. 사거리 10 안에 자신의 표적이 있으면 이동속도가 15% 증가한다.',
 basicText:'사거리 8의 관통 검기로 100 피해를 준다. 탄창은 4개이며 1개 장전 1초, 공격 간격 0.9초다.\n\n사거리 10 안에 자신의 표적이 있으면 사거리 2.5·공격 간격 0.5초가 되고 장전속도가 70% 증가한다. 공격 중에도 평소의 30% 속도로 장전한다. 표적에게는 50 추가 피해를 주고, 기본공격으로 준 피해의 20%를 흡혈한다.',
 qText:'자신과 반경 8 안의 모든 아군 챔피언을 3초간 고무한다. 이동속도가 15% 증가하고 0.5초마다 (110 + 대상 최대 체력의 1.3%) 체력을 회복한다.\n\n버프가 유지되는 동안 재사용하면 체력 재생을 전투력 +20%로 전환한다. 이동속도 증가와 남은 지속시간은 유지된다. 기본 재사용 대기시간은 8초다.',
 rText:'사거리 7.5 안의 적 챔피언 한 명을 직접 지정한다. 즉시 0.6초 기절시키고 0.15초에 걸쳐 150 피해를 네 번 준다. 이미 자신의 표적이면 타격마다 25 추가 피해를 주고 표적 지속시간을 갱신한다.\n\n대상은 5초간 아군에게 시야가 노출된다. 아군 챔피언이 대상에게 피해를 주면 최종 피해의 10%만큼 추가 고정 피해를 주고, 공격한 아군의 체력을 (220 + 해당 아군 최대 체력의 1.3%) 회복한다. 기본 재사용 대기시간은 68초다.',
};
export const NIKOLAI_DATA={id:41,name:'니콜라이',tag:'NIKOLAI',role:'지원',color:'#f19b41',icon:'N',power:3,health:2,armor:1,speed:3,ammo:4,reload:2,range:8,damage:100,attackTime:.9,q:8,r:68,passive:'R사 제4무리 사령관',basic:'갈무리',tactical:'전투 지휘',ultimate:'처분',brief:'표적을 추적하며 아군의 화력과 생존을 지휘하는 사령관',...NIKOLAI_TEXT};
