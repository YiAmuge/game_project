export const DENIS={health:2600,armor:10,speed:3.1,ammo:5,reload:1.2,interval:1,range:8.7,damage:200,charge:1,passiveCooldown:12,burstEvery:.25,hits:3,reloadBonus:.5,reloadDuration:2,qCooldown:11,qStocks:2,rCooldown:50,rRange:10,rDamage:450};
export const DENIS_ROUNDS={up:{key:'ice',name:'빙결',color:'#a9e7ff'},left:{key:'fire',name:'화염',color:'#f35b32'},right:{key:'armor',name:'철갑',color:'#e5e8ec'}};
export const DENIS_TEXT={
 passiveText:'탄창이 2개 이상이고 화력 집중이 준비되었을 때 기본공격을 1초 이상 누른 뒤 놓으면 남은 탄창을 모두 소모해 0.25초 간격으로 연사한다. 한 번의 집중 사격에서 같은 대상에게 3발 이상 맞히면 2초간 장전속도가 50% 증가한다. 관통탄은 적중한 대상마다 횟수를 따로 누적한다. 재사용 대기시간은 12초다.',
 basicText:'사거리 8.7의 탄환을 발사해 200 피해를 준다. 탄창은 5개다. 장전 1.2초, 공격 간격 1초다.',
 qText:'버튼을 누른 채 위·왼쪽·오른쪽으로 드래그해 빙결·화염·철갑 탄환을 선택한다. 빈 탄창 1개를 장전하고 다음 기본공격에 강화 탄환을 적용한다. 강화 탄환은 하나만 저장하며 소모할 때까지 전술기를 사용할 수 없다. 2회 비축하며 1회 충전에는 11초가 걸린다.\n\n집중 사격에서는 모든 탄환에 강화 효과가 적용된다. 같은 대상에게 3발 이상 맞히면 해당 대상에게 강화 효과를 적용한다. 관통한 대상마다 적중 횟수를 따로 센다.\n\n빙결: 2초간 50% 감속. 3발 적중 시 1초 기절.\n화염: 2초간 0.4초마다 (35 + 발사 당시 총 전투력 5%당 6)의 고정 피해. 3발 적중 시 화상 지속시간 4초.\n철갑: 12 추가 고정 피해와 관통. 3발 적중 시 해당 대상의 전투력과 방어력이 3초간 30% 감소한다.',
 rText:'사거리 10의 충격탄을 발사한다. 챔피언 이외의 적을 관통하고 처음 맞은 적 챔피언에게 450 피해를 준다. 적 챔피언을 맞히면 빈 탄창을 모두 장전하고 화력 집중의 재사용 대기시간을 초기화한다. 저장한 강화 탄환을 소모해 해당 효과와 3발 적중 강화 효과를 함께 적용한다. 재사용 대기시간은 50초다.',
};
export const DENIS_DATA={id:42,name:'데니스',tag:'DENIS',role:'저격',color:'#c18a59',icon:'D',power:3,health:3,armor:1,speed:2,ammo:5,reload:2,range:8.7,damage:200,attackTime:1,q:11,r:50,passive:'화력 집중',basic:'격발',tactical:'탄환 장전',ultimate:'충격탄',brief:'강화 탄환을 골라 집중 사격으로 적을 제압하는 소총수',...DENIS_TEXT};
