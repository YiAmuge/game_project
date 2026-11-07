export const EZRA={ammo:4,reload:1.5,reloadScale:1.5,emptyShield:.15,basicShield:.045,shieldCap:.13,shieldTime:3,extraAmmoRatio:.1,qCooldown:8,rCooldown:60,rDuration:10,rArmor:35};
export const EZRA_WEAPONS=[
 {name:'알라스 공방 장갑',asset:'ezraGlove',family:'punch',style:'punch',range:3.8,damage:120,dash:3.8,length:.82,pivot:.12},
 {name:'네스터 공방 망치',asset:'ezraHammer',family:'hammer',style:'sweep',range:3,damage:55,hits:3,every:.3,angle:145*Math.PI/180,length:2.1,pivot:.18},
 {name:'스크류 아틀리에제 드릴 망치',asset:'ezraDrill',family:'drill',style:'thrust',range:2.5,width:1.5,damage:57,hits:3,every:.2,length:1.9,pivot:.18},
 {name:'나미르 공방 건틀릿',asset:'ezraGauntlet',family:'punch',style:'punch',range:3.5,damage:200,dash:2.5,length:.95,pivot:.12},
];
export const EZRA_AXE={name:'유리아 공방 특제 수제작 골든 리트리버 전용 도끼',asset:'ezraAxe',family:'axe',style:'sweep',range:3,damage:180,dash:2.5,length:3.35,pivot:.28};
export const EZRA_DATA={id:20,name:'에즈라',tag:'EZRA',role:'돌격',color:'#f0dca3',icon:'E',power:2,health:3,armor:3,speed:3,ammo:4,reload:3,range:3.8,damage:120,attackTime:.5,q:8,r:60,passive:'차원가방 [에즈라]',basic:'공방무기',tactical:'한번 더!',ultimate:'유리아 공방 - 총공 모드, 마크 17!',brief:'차원가방의 네 공방무기를 순서대로 꺼내 전선을 돌파'};
export const EZRA_TEXT={
 passive:'차원가방 [에즈라]',basic:'공방무기',tactical:'한번 더!',ultimate:EZRA_DATA.ultimate,
 passiveText:'기본공격은 탄창 순서대로 알라스 공방 장갑 → 네스터 공방 망치 → 스크류 아틀리에제 드릴 망치 → 나미르 공방 건틀릿을 사용한다. 탄창은 4개이며 자동으로 한 발씩 충전되지 않는다. 전탄 소진 시 최대 체력의 15% 보호막을 3초간 얻고 기본 1.5초 후 탄창 전체를 재장전한다. 장전 속도 증가량 1%마다 재장전 속도가 1.5% 증가한다. 탄창 증가 효과는 최대 탄창을 늘리지 않으며 추가 탄창 1개당 방어력과 전투력이 10% 증가한다. 외부 효과로 인해 탄창이 증가 및 감소하지 않음.',
 basicText:'현재 탄창에 배정된 공방무기로 공격하고 잃은 체력의 4.5% 보호막을 3초간 얻는다. 이 보호막은 갱신·누적되며 최대 체력의 13%까지 보유한다. 알라스 공방 장갑: 지정 방향으로 3.8 돌진하며 120 피해. 네스터 공방 망치: 사거리 3·145도 부채꼴을 0.3초 간격으로 3번 공격해 타격당 55 피해 및 이동속도 12% 감소 1.5초. 스크류 아틀리에제 드릴 망치: 사거리 2.5·폭 1.5 직선을 0.2초 간격으로 3번 공격해 타격당 57 피해. 군중제어 대상에게 최종 피해의 15% 추가 고정 피해. 나미르 공방 건틀릿: 지정 지점으로 최대 2.5 돌진한 뒤 자신 중심 반경 3.5에 200 피해, 자신 쪽으로 최대 2.5 끌어당김 및 이동속도 30% 감소 1.25초.',
 qText:'마지막으로 사용한 일반 공방무기로 한 번 더 공격한다. 탄창을 소모하거나 무기 순서를 바꾸지 않으며 무기의 피해·군중제어 효과를 적용한다. 일반 공방무기를 아직 사용하지 않았다면 사용할 수 없다. 궁극기 무기는 반복할 수 없고 궁극기 사용 중에는 비활성화된다. 쿨타임 8초.',
 rText:'10초간 방어력이 35 증가하고 유리아 공방 특제 수제작 골든 리트리버 전용 도끼로 교체한다. 도끼는 별도 탄창 4개를 사용하며 재장전할 수 없다. 공격 시 2.5 돌진한 뒤 사거리 3의 전방 반원에 180 피해와 이동속도 25% 감소를 부여한다. 감속은 1초에 걸쳐 빠르게 사라진다. 네 번째 공격은 자신 중심 반경 3의 원형 공격으로 180 피해와 1.3초 기절을 부여한다. 매 기본공격은 공방무기의 보호막을 부여한다. 탄창 소진 또는 지속시간 종료 시 마지막으로 사용한 일반 공방무기로 돌아가고 사용 전의 일반 잔탄과 재장전 진행도를 복구한다. 쿨타임 60초.',
};
