export const BUFFET={health:2900,armor:10,speed:4,ammo:3,reload:.6,interval:.7,range:6.5,angle:Math.PI*2/3,damage:88,every:.1,hits:3,trueRatio:.07,passiveRange:8,rescueCooldown:65,qCooldown:12,qRange:7,qCharge:.3,qDuration:2,qSpeed:.15,qDamage:65,rCooldown:50,rDuration:5,rInterval:.5,rRange:8,rAngle:Math.PI,rTrueRatio:.1,rDamage:350};
export const BUFFET_GIFT='맥동 100을 달성하면 귀환 버튼을 누른 채 아래로 드래그해 유년기의 끝을 선택할 수 있다. 1.5초 정신집중 후 뷔페로 영구 변신한다. 뷔페의 능력치와 기술은 뷔페 도감에서 확인한다.';
export const BUFFET_SKILLS=[
 {name:'붉은 신[완숙]',description:'흡혈로 체력을 회복하면 자신을 중심으로 반경 8 안의 살아 있는 모든 아군 챔피언에게 같은 회복량을 적용한다. 반경 8 안의 자신을 제외한 아군 챔피언이 치명적인 피해를 받으면 즉시 최대 체력의 50%까지 복구한다. 아군 구호의 재사용 대기시간은 65초다.'},
 {name:'라 드망드',description:'탄창 1개를 소모해 사거리 6.5·120도 부채꼴을 0.1초 간격으로 세 번 휘둘러 타격마다 88 피해를 준다. 최종 피해의 7%만큼 추가 고정 피해를 주고 같은 양을 흡혈한다. 탄창 3개, 1개 장전 0.6초, 공격 간격 0.7초이며 공격 중에도 평소의 30% 속도로 장전한다.'},
 {name:'주 마브젝트',description:'0.3초 정신집중 후 2초간 이동속도가 15% 증가하고 적을 통과한다. 반경 7 안의 모든 적 챔피언에게 0.2초 간격으로 차례로 못을 떨어뜨려 대상마다 한 번씩 65 피해를 주고 준 피해의 20%를 흡혈한다. 재사용 대기시간은 12초다.'},
 {name:'라 카타스트라시웅',description:'5초간 모든 군중제어에 면역이 되고 지정한 방향으로 기본공격을 자동 사용한다. 탄창을 소모하지 않고 추가 고정 피해와 흡혈 비율이 10%가 된다. 공격 범위는 사거리 8의 전방 반원, 공격 간격은 0.5초가 된다. 같은 대상에게 10회 적중할 때마다 0.5초 속박한다.\n\n지속시간 종료 또는 재사용 시 같은 사거리와 반원 범위에 검기를 날려 350 고정 피해를 주고 피해량의 50%를 흡혈한다. 적중한 적은 0.5초 기절하며 피해 적용 후 체력이 10% 미만이면 처형한다. 재사용하면 궁극기가 즉시 끝난다. 재사용 대기시간은 50초이며 최초 사용 즉시 시작된다.'},
];
export const buffetInfo=()=>({name:'뷔페',passive:BUFFET_SKILLS[0].name,passiveText:BUFFET_SKILLS[0].description,basic:BUFFET_SKILLS[1].name,basicText:BUFFET_SKILLS[1].description,tactical:BUFFET_SKILLS[2].name,qText:BUFFET_SKILLS[2].description,ultimate:BUFFET_SKILLS[3].name,rText:BUFFET_SKILLS[3].description});
