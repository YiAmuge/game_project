export const MONSTERS=[
 {name:'근접 미니언',hp:520,armor:0,attack:'58 / 1.25초',reward:'24 XP · 15 재화',text:'30초마다 라인별 3기. 적 미니언 우선.'},
 {name:'원거리 미니언',hp:360,armor:0,attack:'72 / 1.50초',reward:'26 XP · 18 재화',text:'30초마다 라인별 1기. 사거리 5.5.'},
 {name:'공성 미니언',hp:1050,armor:0,attack:'125 / 2초',reward:'45 XP · 30 재화',text:'3번째 웨이브마다 1기 추가. 포탑 피해 1.35배.'},
 {name:'중앙 일반 크립',hp:700,armor:10,attack:'80 / 1.3초',reward:'25 XP · 18 재화',text:'중앙 4기. 75초 재생성. 5분에 영구 제거.'},
 {name:'측면 일반 크립',hp:850,armor:15,attack:'100 / 1.2초',reward:'25 XP · 18 재화',text:'측면 2기. 90초 재생성.'},
 {name:'증폭 크립',hp:1250,armor:25,attack:'120 / 1.2초',reward:'50 XP · 40 재화',text:'100초 재생성. 45초간 적중 시 35 고정 피해·12% 감속, 대상당 1초 간격.'},
 {name:'가호 크립',hp:1250,armor:25,attack:'100 / 1.2초',reward:'50 XP · 40 재화',text:'100초 재생성. 5초간 150 회복, 25초간 장전·가속 12% 증가.'},
 {name:'중앙 보스',hp:15000,armor:60,attack:'350 / 1.5초 + 부채꼴 240 / 2.5초',reward:'아군 전원 180 XP · 160 재화',text:'5분 중앙 크립을 대체. 재등장 없음.'},
 {name:'라인 포탑',hp:7600,armor:120,attack:'280 / 1.05초',reward:'적팀 전원 120 XP · 130 재화',text:'사거리 8.5. 미니언 없이 챔피언만 공격하면 받는 피해 80% 감소.'},
 {name:'본진',hp:12000,armor:100,attack:'320 / 1초',reward:'파괴 시 즉시 승리',text:'같은 팀 포탑 2개가 모두 파괴되어야 공격 가능. 사거리 9.'},
];
export const CONSUMABLES=[
 {key:'potion',name:'회복 물약',cost:90,uses:2,implemented:true,text:'4초 동안 최대 체력의 18% 회복. 피격해도 유지.'},
 {key:'ward',name:'와드',cost:100,uses:1,implemented:false,text:'45초간 시야 반경 8. 기본 공격 3회에 파괴.'},
 {key:'cleanse',name:'정화 팔찌',cost:140,uses:1,implemented:false,text:'해로운 효과 해제·CC 면역 1초·이동속도 +20%.'},
 {key:'speed',name:'가속제',cost:100,uses:2,implemented:false,text:'이동속도 +0.8에서 3초에 걸쳐 선형 감소.'},
 {key:'weakness',name:'약화 표식',cost:120,uses:1,implemented:false,text:'사거리 7. 3초간 이동·장전 성능 -20%.'},
 {key:'battle',name:'전투 물약',cost:150,uses:1,implemented:false,text:'8초간 전투력 +12%·스킬 가속 +15%.'},
 {key:'magazine',name:'추가 탄창',cost:150,uses:1,implemented:false,text:'8초간 장전 성능 +20%·최대 탄약 +1.'},
];
export const GAME_RULES=[
 ['승리','두 라인 포탑을 파괴해 적 본진을 개방하고 먼저 파괴한다. 10분에는 포탑 수 → 남은 포탑 체력 합 → 양 팀 포탑이 없으면 본진 체력으로 판정한다. 동률은 무승부.'],
 ['포지션','탑 1명, 정글 1명, 바텀 1명, 서포터 1명. 탑은 상단 1vs1, 바텀·서포터는 하단 2vs2. 정글은 크립 사냥과 갱킹을 담당한다. 추천 역할군은 선택 제한이 아니다.'],
 ['자연 치유','3초 동안 공격하지 않고 외부 피해도 받지 않으면 초당 최대 체력의 13%를 회복한다. 빗나간 기본 공격과 공격형 기술도 대기시간을 다시 시작한다. 알리사 열화 자해는 이 피격 조건에서 제외한다.'],
 ['장전','모든 챔피언의 장전 성능은 이전 제안 대비 20% 감소. 같은 조건의 1발 충전 간격은 1.25배다. 공격 중에도 부족한 탄약을 계속 충전한다. 미구현 챔피언도 같은 공통 계수를 따른다.'],
 ['수풀','수풀 속 적은 원거리에서 숨는다. 2.5 거리 이내 또는 같은 수풀에서 팀 공유 탐지. 공격·피격 후 1.25초 노출. 수동 투사체와 범위 공격은 숨은 적도 맞힌다.'],
 ['성장과 상점','개인 경험치로 레벨 1~5까지 성장한다. 초당 1 재화. 아군 부활소에서 3초 비전투 상태로 G를 눌러 구매한다. 소모품은 한 종류만 보유. 현재 사용 가능한 소모품은 회복 물약.'],
 ['중앙 목표물','30초 웨이브, 세 번째 웨이브 공성 미니언. 5분에는 중앙 일반 크립이 영구 제거되고 보스가 한 번 등장한다.'],
 ['조작','WASD 이동, 좌클릭 수동 공격, 우클릭 전술기, Space 궁극기, 1 소모품, Tab을 누르는 동안 확대 미니맵·점수창, G 부활소 상점, F 전체 화면, Esc 취소·일시정지.'],
 ['특수 조작','루돌프: Space 후 확대 지도에서 좌클릭으로 전역 궁극기 지점 확정. 모제스: 우클릭 드래그 방향으로 곰방대 선택. 에즈라: 우클릭 좌우 드래그로 무기 교체. 드래그 없는 손 떼기는 자원·쿨다운 소모 없이 취소. 도감의 실험실에서 확인 가능.'],
];
export const BUFF_LABELS={
 resolve:'판단 거부',marks:'어느 표지',ogamdo:'오감도',blessing:'가호',blessingHeal:'가호 회복',amplify:'증폭',explore:'탐구',faustUlt:'표상방출',support:'지원 중첩',charge:'돌격 중첩',disrupt:'방해 중첩',donGuard:'정의의 방어',donLifesteal:'산쵸의 흡혈',ryoshuReady:'무차별적 예술',hongluStride:'선풍',insight:'통찰',heathUlt:'시체자루',ishmaelSurvive:'살아남을 마음',ishmaelShield:'난파',coins:'동전의 앞면',coinSpeed:'동전의 뒷면',mutant:'인자 코드 변이',executedHaste:'흉탄의 귀환',guboReload:'흉탄 장전',mosesWhite:'흰 곰방대',mosesHeal:'붉은 곰방대',ezraUlt:'총공 모드',alisaHaste:'홍염살 귀환',haste:'가속',speed:'이동 강화',power:'전투 강화',defense:'방어 강화',
};
