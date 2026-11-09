export const MOSES={health:2700,armor:20,speed:2.85,ammo:3,reload:.8,damage:148,range:4,angle:160*Math.PI/180,qCooldown:10,qCharges:2,rCooldown:75,rCharge:1.5,rDamage:750,rWidth:2,rLength:3.7};
export const BREATHS={up:{name:'하얀 숨',color:'#e8eee7',range:4,angle:Math.PI},down:{name:'푸른 숨',color:'#6ca9e8',range:6.6,angle:166*Math.PI/180},left:{name:'보라색 숨',color:'#b78cdb',range:4,angle:160*Math.PI/180},right:{name:'붉은 숨',color:'#ca515a',range:4,angle:160*Math.PI/180}};
export const MOSES_DATA={id:19,name:'모제스',tag:'MOSES',role:'지원',color:'#b9c9c0',icon:'M',power:1,health:2,speed:2,ammo:3,reload:1,range:4,damage:148,attackTime:.5,q:10,r:75,passive:'깊은 사색',basic:'숨결 밷기',tactical:'곰방대 피우기',ultimate:'붉은 점',brief:'네 가지 숨결로 아군을 보조하고 적을 제어'};
export const MOSES_TEXT={
 passiveText:'추가 전투력의 50%가 적용되며, 적용되지 않은 추가 전투력 5%마다 장전 속도와 스킬 가속이 각각 1.5% 증가한다.',
 basicText:'지정 방향 사거리 4·160도 부채꼴에 숨결을 내뿜어 적에게 148 피해를 입힌다. 곰방대 피우기로 선택한 숨결은 다음 한 발에 적용된다.',
 qText:'최대 2회 충전되며 한 회당 기본 10초에 걸쳐 회복한다. 버튼을 누른 채 상하좌우로 드래그하여 숨결을 선택하고 빈 탄창 1개를 장전한다. 강화 숨결을 발사하기 전에는 다시 사용할 수 없으며 같은 숨결을 연속 선택할 수 없다.\n\n상 — 하얀 숨: 범위가 전방 반원으로 바뀌고 적중한 아군에게 3초간 장전 속도·스킬 가속 +20%를 부여한다.\n하 — 푸른 숨: 선택 시 현재 체력의 6%를 소모한다. 사거리 6.6·166도 범위에 적중한 적을 1.6초 기절시킨다.\n좌 — 보라색 숨: 적중한 적에게 2초간 이동속도 25%·방어력 20% 감소를 부여한다. 기본 피해에 추가로 0.3초 간격의 50 피해를 세 번 입힌다.\n우 — 붉은 숨: 선택 시 최대 체력의 5%를 회복한다. 적중한 아군에게 350 보호막을 5초간 부여하고, 5초간 0.5초마다 55 + 시전 시 스킬 가속 1%당 2의 체력을 회복한다.',
 rText:'1.5초간 정신집중한 뒤 지정 방향으로 폭 2·길이 3.7의 붉은 연기 투사체를 발사한다. 사거리 제한이 없으며 처음 적중한 적에게 750 피해를 입힌다. 적 챔피언은 1.5초 기절하고 3초간 모제스의 아군에게 받는 최종 피해가 20% 증가한다. 정신집중 중 시야가 넓어진다. 쿨타임 75초.'
};
