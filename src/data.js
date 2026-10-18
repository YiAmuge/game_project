import { EXTRA_CHAMPIONS } from './extra-data.js';
export const RULES = {
  duration: 600, bossAt: 300, waveEvery: 30, width: 64, height: 36,
  health: [0, 2200, 2800, 3400, 4000, 4600], power: [0, .82, .91, 1, 1.12, 1.25],
  reload: [0, .8, .68, .56, .45, .36], speed: [0, 3.1, 3.45, 3.8, 4.15, 4.5],
  xp: [0, 250, 600, 1050, 1650], costs: [160, 260, 400],
  reloadEfficiency: .8, naturalHealDelay: 3, naturalHealRate: .13, allyExecuteThreshold: .17,
};
export const CHAMPIONS = {
  faust: { id: 2, name: '파우스트', tag: 'FAUST', role: '저격', color: '#c9d8df', icon: 'F', power: 4, health: 3, speed: 2, ammo: 3, reload: 3, range: 7.5, damage: 180, attackTime: .46, q: 11, r: 48,
    passive: '게젤샤프트', basic: '대상 분석', tactical: '탐구', ultimate: '표상방출기',
    brief: '검파로 전선을 압박하는 분석가', qText: '전방 베기·검파 / 밀치기 / 장전 +20%', rText: '1.25초 집중 후 지정 범위에 680 피해',
  },
  yi: { id: 1, name: '이상', tag: 'YI SANG', role: '지원', color: '#c6b896', icon: 'Y', power: 2, health: 3, speed: 3, ammo: 3, reload: 2, range: 6.5, damage: 95, attackTime: .5, q: 12, r: 45,
    passive: '기억의 조각', basic: '깃털', tactical: '침묵', ultimate: '오감도',
    brief: '거울 파편과 보호막으로 아군을 지원', qText: '3초 거울 웅덩이 / 지속 피해·침묵', rText: '주변 아군 보호막 / 이동속도 +25% 후 감소',
  },
  sinclair: { id: 3, name: '싱클레어', tag: 'SINCLAIR', role: '암살', color: '#e0c374', icon: 'S', power: 3, health: 2, speed: 4, ammo: 2, reload: 5, range: 1.8, damage: 210, attackTime: .4, q: 9, r: 42,
    passive: '어느 표지', basic: '연속 베기', tactical: '공포를 이기는 용기', ultimate: '지식나무의 가지',
    brief: '표식을 쌓아 돌파하는 근접 암살자', qText: '3.2 거리 돌진 / 경로 피해 / 표식', rText: '0.7초 후 도약 / 범위 피해 / 체력에 따른 강화',
  },
  meursault: { id: 5, name: '뫼르소', tag: 'MEURSAULT', role: '보호', color: '#a6bdc6', icon: 'M', power: 3, health: 5, speed: 1, ammo: 2, reload: 3, range: 1.9, damage: 275, attackTime: .55, q: 14, r: 50,
    passive: '이방인', basic: '원, 투', tactical: '판단 거부', ultimate: '타인의 사슬',
    brief: '아군의 피해를 줄이는 전선의 방패', qText: '4초 피해 -30% / 이동 +25% / 침묵·감속 해제', rText: '전방 사슬 / 피해·속박 / 전투력 약화',
  },
};
export const NEW_CHAMPION_KEYS=['don','ryoshu','honglu','heathcliff','ishmael','rodya','outis','gregor'];
for(const key of NEW_CHAMPION_KEYS)CHAMPIONS[key]=EXTRA_CHAMPIONS[key];
export const EXPERIMENTAL_CHAMPIONS=Object.fromEntries(Object.entries(EXTRA_CHAMPIONS).filter(([key])=>!NEW_CHAMPION_KEYS.includes(key)));
export const RUNTIME_CHAMPIONS={...CHAMPIONS,...EXPERIMENTAL_CHAMPIONS};
export const POSITIONS={
  top:{name:'탑',lane:0,recommend:['보호','돌격'],description:'상단 라인 1vs1 · 수호·돌격 추천'},
  jungle:{name:'정글',lane:0,recommend:['암살'],description:'중립 크립 사냥·갱킹 · 암살 추천'},
  bottom:{name:'바텀',lane:1,recommend:['저격'],description:'서포터와 하단 2vs2 · 저격 추천'},
  support:{name:'서포터',lane:1,recommend:['지원','방해'],description:'바텀 보호·하단 2vs2·로밍 · 지원·방해 추천'},
};
export const POSITION_ORDER=['top','jungle','bottom','support'];
export const UPGRADES = [
  { key: 'power', name: '전투력', effect: '+4%', max: 3 },
  { key: 'health', name: '최대 체력', effect: '+6%', max: 3 },
  { key: 'speed', name: '이동속도', effect: '+3%', max: 2 },
  { key: 'haste', name: '스킬 가속', effect: '+5%', max: 2 },
  { key: 'reload', name: '장전 성능', effect: '+5%', max: 2 },
];
const leftWalls = [
  { x: 13, y: 11, w: 6, h: 1.6 }, { x: 20, y: 8.5, w: 8, h: 1.6 },
  { x: 13, y: 23.4, w: 6, h: 1.6 }, { x: 20, y: 25.9, w: 8, h: 1.6 },
  { x: 24, y: 16, w: 2.1, h: 4 }, { x: 28, y: 13, w: 2, h: 1.4 },
  { x: 28, y: 21.6, w: 2, h: 1.4 },
];
export const WALLS = [...leftWalls, ...leftWalls.map(w => ({ ...w, x: 64 - w.x - w.w }))];
// Green connectors in the user's original sketch, mirrored around x=32.
const leftBushes = [
  { x: 18.8, y: 10.1, w: 2, h: 1.6 },
  { x: 18.8, y: 24.3, w: 2, h: 1.6 },
  { x: 26.3, y: 16, w: 1.35, h: 4 },
];
export const BUSHES = [
  { x: 28, y: 8.65, w: 8, h: 1.35 },
  { x: 28, y: 26, w: 8, h: 1.35 },
  { x: 30, y: 13, w: 4, h: 1.35 },
  { x: 30, y: 21.65, w: 4, h: 1.35 },
  ...leftBushes, ...leftBushes.map(b => ({ ...b, x: 64-b.x-b.w })),
].map((b,id) => ({...b,id}));
export const lanePath = (team, lane) => {
  const y = lane === 0 ? 5.5 : 30.5;
  const points = [{x:5.5,y:18},{x:10,y},{x:54,y},{x:58.5,y:18}];
  return team === 0 ? points : points.reverse();
};
