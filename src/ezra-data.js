export const EZRA={ammo:4,reload:2.5,reloadScale:1.5,emptyShield:.15,shieldTime:3,extraAmmoRatio:.1,qCooldown:8,rCooldown:60,rDuration:10,rArmor:35};
export const EZRA_WEAPONS=[
 {name:'알라스 공방 장갑',asset:'ezraGlove',color:'#fffff0',family:'punch',style:'punch',range:3.8,damage:160,shield:.12,shieldTime:1.6,dash:3.8,length:.483,pivot:.12},
 {name:'네스터 공방 망치',asset:'ezraHammer',color:'#b66cef',family:'hammer',style:'sweep',range:2.6,rangeGrowth:1,damage:66,slowTime:2.1,hits:3,every:.3,angle:Math.PI*2,length:1.68,pivot:.18},
 {name:'스크류 아틀리에제 드릴 망치',asset:'ezraDrill',color:'#00e5ff',family:'drill',style:'sweep',range:3.3,angle:150*Math.PI/180,damage:73,ccBonus:.50,hits:3,every:.2,length:1.52,pivot:.18},
 {name:'나미르 공방 건틀릿',asset:'ezraGauntlet',color:'#ffd35a',family:'punch',style:'punch',range:3.5,damage:220,rehitWindow:1,rootTime:1,dash:2.5,length:.483,pivot:.12},
];
export const EZRA_AXE={name:'유리아 공방 특제 수제작 골든 리트리버 전용 도끼',asset:'ezraAxe',color:'#de3163',family:'axe',style:'sweep',range:3,damage:340,finalDamage:400,dash:2.5,length:3.35,pivot:.28};
export const EZRA_DATA={id:20,name:'에즈라',tag:'EZRA',role:'돌격',color:'#f0dca3',icon:'E',power:2,health:3,armor:3,speed:3,ammo:4,reload:3,range:3.8,damage:160,attackTime:.5,q:8,r:60,passive:'차원가방 [에즈라]',basic:'공방무기',tactical:'한번 더!',ultimate:'유리아 공방 - 총공 모드, 마크 17!',brief:'차원가방의 네 공방무기를 순서대로 꺼내 전선을 돌파'};
export const EZRA_TEXT={
  "passive": "차원가방 [에즈라]",
  "basic": "공방무기",
  "tactical": "한번 더!",
  "ultimate": "유리아 공방 - 총공 모드, 마크 17!",
  "passiveText": "기본공격은 탄창 순서대로 알라스 공방 장갑 → 네스터 공방 망치 → 스크류 아틀리에제 드릴 망치 → 나미르 공방 건틀릿을 사용한다. 탄창은 4개이며 한 발씩 자동 충전되지 않는다. 전탄 소진 시 최대 체력의 15% 보호막을 3초간 얻고 기본 2.5초 후 탄창 전체를 재장전한다. 장전 속도 증가량 1%마다 재장전 속도가 1.5% 증가한다. 최대 탄창 증가분 1개당 방어력·전투력이 10% 증가한다. 외부 효과로 인해 탄창이 증가 및 감소하지 않음.",
  "basicText": "현재 탄창에 배정된 공방무기로 공격한다.\n\n알라스 공방 장갑: 지정 방향으로 빠르게 3.8 돌진하며 경로의 적에게 160 피해를 한 번 입힌다. 사용 시 자신에게 최대 체력의 12% 보호막을 1.6초간 부여하고 1초간 이동속도 +15%를 얻는다. 보호막·이동속도 효과는 중첩되지 않고 갱신된다.\n\n네스터 공방 망치: 0.3초 간격으로 자신 주변을 세 번 공격하여 타격당 66 피해와 2.1초간 이동속도 12% 감소를 부여한다. 공격 반경은 1타 2.6, 2타 3.6, 3타 4.6이다.\n\n스크류 아틀리에제 드릴 망치: 사거리 3.3·150도 부채꼴을 한 번 휘둘러 0.2초 간격으로 73 피해를 세 번 입힌다. 군중제어 대상에게 최종 피해의 50%만큼 추가 고정 피해를 입힌다.\n\n나미르 공방 건틀릿: 사거리 2.5 내 지정 지점으로 도약한 뒤 자신 중심 반경 3.5에 220 피해를 입히고 자신 쪽으로 최대 2.5 끌어당기며 1.25초간 이동속도 30% 감소를 부여한다. 같은 적에게 자신의 건틀릿 공격을 1초 안에 다시 적중하면 1초 속박한다.",
  "qText": "사용 시 잃은 체력의 7%를 회복한다. 마지막 기본공격으로 사용한 일반 공방무기로 한 번 더 공격하여 같은 피해·보호막·군중제어 효과를 적용한다. 탄창을 소모하거나 다음 무기 순서를 바꾸지 않는다. 일반 공방무기를 아직 기본공격으로 사용하지 않았거나 총공 모드 중에는 사용할 수 없으며 궁극기 무기는 반복할 수 없다. 쿨타임 8초.",
  "rText": "10초간 방어력 +35를 얻고 유리아 공방 특제 수제작 골든 리트리버 전용 도끼로 교체한다. 별도 탄창은 4개이며 재장전할 수 없다. 공격 시 최대 2.5 거리 내 지정 지점까지 돌진한 뒤 자신 중심 반경 3의 원형 범위에 340 피해와 이동속도 25% 감소를 부여한다. 감속은 1초에 걸쳐 빠르게 사라진다. 네 번째 공격은 자신 중심 반경 3의 원형 공격으로 400 피해와 1.3초 기절을 부여한다. 탄창 소진 또는 지속시간 종료 시 사용 전의 일반 공방무기 순서·잔탄·재장전 진행도를 복구한다. 쿨타임 60초."
};
