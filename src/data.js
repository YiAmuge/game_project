import { NEW_DATA } from './new-data.js';
import { EXTRA_CHAMPIONS } from './extra-data.js';
export const AHAB={orderRadius:8};
export const RULES = {
  passiveXpPerSecond:3, timeLimit:1200, bossAt: 300, firstWaveAt:3, waveEvery: 25, width: 83.2, height: 46.8, maxLevel: 10,
  health: [0, 2200, 2800, 3400, 4000, 4600], power: [0, .82, .91, 1, 1.12, 1.25],
  reload: [0, .8, .68, .56, .45, .36], speed: [0, 3.1, 3.45, 3.8, 4.15, 4.5],
  xp: [0, 250, 600, 1050, 1650, 2400, 3300, 4350, 5550, 6900], costs: [160, 260, 400, 580, 800],
  reloadEfficiency: .8*.65, naturalHealDelay: 3, naturalHealRate: .13, allyExecuteThreshold: .21, allyExecuteBuffThreshold:.35,
  dashSpeed: 8, knockSpeed: 6, recallTime: 3, attackIntervalMultiplier:1.3, fastAttackThreshold:.4, shareFraction:.2,
};
export const MAP_SCALE=1.3;
export const worldPoint=(x,y)=>({x:x*MAP_SCALE,y:y*MAP_SCALE});
export const MAP_CENTER=worldPoint(32,18);
// Preserve the central battlefield coordinates; add only rear wings and the two flank rooms.
export const WORLD={x:-10,y:-8,w:103.2,h:62.8};
export const TERRAIN=[{x:0,y:0,w:83.2,h:46.8},{x:-10,y:16.4,w:12,h:14},{x:81.2,y:16.4,w:12,h:14},{x:29.6,y:-8,w:24,h:9.5},{x:29.6,y:45.3,w:24,h:9.5}];
export const terrainContains=(x,y)=>TERRAIN.some(p=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h);
export const FOUNTAINS=[{x:-6.7,y:MAP_CENTER.y},{x:89.9,y:MAP_CENTER.y}];
export const MINIONS={health:{melee:680,ranged:480,siege:1320},spawnGap:.35,growthEvery:120,maxGrowth:6,hpGrowth:.06,attackGrowth:.05};
export const CAMP_RULES={radius:3.4,leashDistance:3.4,leashDelay:1.85,returnSpeed:9,neutralRespawn:20,buffRespawn:45,buffHealth:1.33,buffDuration:60,patternEvery:5,firstPattern:1.5};
export const CORE_POSITIONS=[{x:10.2,y:MAP_CENTER.y},{x:RULES.width-10.2,y:MAP_CENTER.y}];
export const WELL_ROOMS=[{x:-3.5,y:MAP_CENTER.y,r:5.2,team:0},{x:RULES.width+3.5,y:MAP_CENTER.y,r:5.2,team:1}];
export function inWell(e,team=e.team){const w=WELL_ROOMS[team];return Math.hypot(e.x-w.x,e.y-w.y)<=w.r&&(team===0?e.x<=w.x:e.x>=w.x);}
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
  meursault: { id: 5, name: '뫼르소', tag: 'MEURSAULT', role: '보호', color: '#a6bdc6', icon: 'M', power: 3, health: 5, speed: 1, ammo: 3, reload: 3, range: 1.9, damage: 233.75, attackTime: .55, q: 14, r: 50,
    passive: '이방인', basic: '원, 투', tactical: '판단 거부', ultimate: '타인의 사슬',
    brief: '아군의 피해를 줄이는 전선의 방패', qText: '4초 방어력 +30% / 이동 +25% / 침묵·감속 해제', rText: '전방 사슬 / 피해·속박 / 전투력 약화',
  },
};
export const NEW_CHAMPION_KEYS=['don','ryoshu','honglu','heathcliff','ishmael','rodya','outis','gregor','gubo','gahwan','nelly','ahab','rudolph','myo','dongbaek','dongrang','hohenheim','alisa','marton','queequeg','starbuck','kim','ppui','sora','yan'];
for(const key of NEW_CHAMPION_KEYS)CHAMPIONS[key]=NEW_DATA[key]||EXTRA_CHAMPIONS[key];
export const EXPERIMENTAL_CHAMPIONS=Object.fromEntries(Object.entries(EXTRA_CHAMPIONS).filter(([key])=>!NEW_CHAMPION_KEYS.includes(key)));
export const RUNTIME_CHAMPIONS={...CHAMPIONS,...EXPERIMENTAL_CHAMPIONS};
export const GROWTH={
 faust:[.055,.045,.008],yi:[.042,.052,.012],sinclair:[.058,.048,.016],meursault:[.038,.075,.007],don:[.052,.061,.013],ryoshu:[.064,.04,.017],honglu:[.046,.055,.014],heathcliff:[.061,.063,.01],ishmael:[.043,.072,.009],rodya:[.054,.065,.011],outis:[.06,.047,.01],gregor:[.045,.074,.008],gubo:[.063,.044,.006],gahwan:[.051,.049,.011],nelly:[.066,.043,.018],ahab:[.057,.041,.009],alisa:[.058,.057,.012],rudolph:[.05,.048,.007],moses:[.036,.058,.01],ezra:[.052,.067,.012],myo:[.064,.038,.015],dongbaek:[.053,.044,.01],dongrang:[.041,.075,.008],hohenheim:[.06,.039,.008],marton:[.038,.077,.009],queequeg:[.046,.079,.008],starbuck:[.058,.06,.013],kim:[.048,.068,.011],ppui:[.035,.054,.012],sora:[.06,.046,.013],yan:[.043,.058,.01],
};
export const ATTACK_STYLES={faust:'slash',yi:'shot',sinclair:'slash',meursault:'punch',don:'thrust',ryoshu:'slash',honglu:'sweep',heathcliff:'slash',ishmael:'slash',rodya:'slash',outis:'shot',gregor:'slash',gubo:'shot',gahwan:'thrust',nelly:'slash',ahab:'throw',alisa:'flame',rudolph:'whip',moses:'shot',ezra:'punch',myo:'slash',dongbaek:'sweep',dongrang:'slash',hohenheim:'shot',marton:'sweep',queequeg:'thrust',starbuck:'thrust',kim:'slash',ppui:'shot',sora:'punch',yan:'slash'};
for(const [key,c] of Object.entries(RUNTIME_CHAMPIONS)){const [power,health,speed]=GROWTH[key];c.growth={power,health,speed};c.attackStyle=ATTACK_STYLES[key];}
CHAMPIONS.don.rText='사거리 6.5 커서 빠른 시전 논타겟 돌진 · 경로 300 피해 · 적중 시 회복 · 7초간 흡혈 25%';
CHAMPIONS.rodya.q=12;CHAMPIONS.rodya.brief='짧은 돌진 도끼와 동전의 도박사';
CHAMPIONS.don.qText='재사용으로 조기 취소 가능·쿨다운 반환 없음. 2.5초 동안 사거리 4.5·폭 2.1의 반투명 노란 직선 범위로 랜스 연속 찌르기 · 매 4번째 타격 피해의 20% 회복 · 이동 가능 · 정면 방어력 +50%';
CHAMPIONS.heathcliff.rText='반경 7.5의 시체자루 · 피해·흡혈·처치 연장';
CHAMPIONS.yi.qText='장판 0.1초마다 침묵 0.25초·장전 −10%. 최초 피해에 탄창 1개 소모, 매 피해마다 감속 3.5% 누적';
CHAMPIONS.outis.damage=215;CHAMPIONS.outis.rText='방어력 +50% 상태로 사거리 4.5 고속 돌진. 첫 충돌 450 피해·1초 기절 후 2.5거리 고속 후퇴. 돌진 종료점 뒤 사거리 6.5 부채꼴 220 피해(첫 충돌 대상 제외).';
CHAMPIONS.ishmael.rText='사거리 16 관통 작살·300 피해. 발사 후 비행·끌기 완료까지 이동 불가. 적을 초당 18 거리로 바로 앞으로 끌기. 쿨다운 25초';
CHAMPIONS.honglu.q=20;CHAMPIONS.honglu.qText='1.2초 이동속도 +40%·모든 공격 면역·적 통과. 종료 시 반경 5의 모든 아군 체력 500 회복. 쿨다운 20초';CHAMPIONS.honglu.rText='4초 동안 느리게 전진하는 반경 6.5 장판. 초당 120 피해·150 회복(전투력 등급당 +5%). 재사용으로 전진/정지 전환';
CHAMPIONS.heathcliff.qText='우클릭을 누른 동안 최대 1.5초 충전, 놓으면 도약. 사거리 0.5→7·피해 80→250·착지 반경 1.8. 50%부터 기절 0.5→1초';
CHAMPIONS.faust.qText='전방 베기 150·사거리 3 반원 230 피해 및 범위 밖까지 고속 밀치기. 4초 장전 +20%. 최고 레벨 적중 시 1.5초 감속 20%';CHAMPIONS.faust.rText='지정 반경 4.8에 680 피해. 1.25초 집중(최고 레벨 즉발). 적 챔피언 적중 수당 표상방출 1중첩(최대 4), 5초간 중첩당 방어력·전투력 +10%';
CHAMPIONS.marton.range=5;CHAMPIONS.marton.qText='4초 동안 반경 5.5에 초당 110 피해·감속. 이동속도 +30%, 쿨다운 12초';CHAMPIONS.marton.rText='2.5초 집중 동안 반경 6.8 적 챔피언에게 0.25초마다 0.5초 도발. 종료 시 받은 피해 30%로 범위 공격(최대 900)';
CHAMPIONS.queequeg.range=3;CHAMPIONS.queequeg.qText='사거리 8 아군 연결·최대 연결 거리 8. 갈색 밧줄, 연결 무한·방어력·저항·피해 분담';CHAMPIONS.queequeg.rText='4초 불사·이동 +25%·장전 +40%, 종료 시 잃은 체력 25% 회복. 연결한 아군에게도 모든 효과 적용';
CHAMPIONS.gubo.rText='1.2초 대상 조준 후 사거리·지형 무관 즉발 붉은 레이저 500 피해. 아군 처치 시 사거리 14.7 부채꼴로 (현재 전투력 + 적 최대 체력)의 25% 고정 피해';
CHAMPIONS.hohenheim.rText+=' 추적 대상 사망 시 정지·재지정 대기. 남색 지네 외곽 이펙트';
export const POSITIONS={
  top:{name:'탑',lane:0,recommend:['보호','돌격'],description:'상단 라인 1vs1 · 보호·돌격 추천'},
  jungle:{name:'정글',lane:0,recommend:['암살','돌격'],description:'중립 크립 사냥·갱킹 · 암살·돌격 추천'},
  bottom:{name:'바텀',lane:1,recommend:['저격','방해'],description:'서포터와 하단 2vs2 · 저격·방해 추천'},
  support:{name:'서포터',lane:1,recommend:['지원','방해'],description:'바텀 보호·하단 2vs2·로밍 · 지원·방해 추천'},
};
export const POSITION_ORDER=['top','jungle','bottom','support'];
export const UPGRADES = [
  { key: 'power', name: '전투력', effect: '+4%', max: 5 },
  { key: 'health', name: '최대 체력', effect: '+6%', max: 5 },
  { key: 'speed', name: '이동속도', effect: '+3%', max: 3 },
  { key: 'haste', name: '스킬 가속', effect: '+5%', max: 3 },
  { key: 'reload', name: '장전 성능', effect: '+5%', max: 3 },
];
const leftWalls = [
  { x: 13, y: 11, w: 6, h: 1.6 }, { x: 20, y: 8.5, w: 8, h: 1.6 },
  { x: 13, y: 23.4, w: 6, h: 1.6 }, { x: 20, y: 25.9, w: 8, h: 1.6 },
  { x: 24, y: 16, w: 2.1, h: 4 }, { x: 28, y: 13, w: 2, h: 1.4 },
  { x: 28, y: 21.6, w: 2, h: 1.4 },
];
export const WALLS = [...leftWalls, ...leftWalls.map(w => ({ ...w, x: 64 - w.x - w.w }))].map(w=>({
  x:(w.x+w.w/2)*MAP_SCALE-w.w*1.1/2,y:(w.y+w.h/2)*MAP_SCALE-w.h*1.1/2,w:w.w*1.1,h:w.h*1.1,
}));
// Leave entrances above and below; separate the fountain approach from side camps.
WALLS.push({x:15,y:18.8,w:1.4,h:9.2,baseDivider:true},{x:RULES.width-16.4,y:18.8,w:1.4,h:9.2,baseDivider:true});
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
].map((b,id) => ({x:b.x*MAP_SCALE,y:b.y*MAP_SCALE,w:b.w*MAP_SCALE,h:b.h*MAP_SCALE,id}));
// Outer lane hedges and bushes inside the added horizontal flank rooms.
for(const y of [1.2,43.8])for(const x of [15,55.2])BUSHES.push({id:BUSHES.length,x,y,w:13,h:1.6});
for(const y of [-6.6,51.8])BUSHES.push({id:BUSHES.length,x:33.6,y,w:16,h:1.6});
export const lanePath = (team, lane) => {
  const y = lane === 0 ? 5.5 : 30.5;
  const points = [{x:5.5,y:18},{x:10,y},{x:54,y},{x:58.5,y:18}];
  const scaled=points.map(p=>worldPoint(p.x,p.y));scaled[0]={...CORE_POSITIONS[0]};scaled[3]={...CORE_POSITIONS[1]};return team===0?scaled:scaled.reverse();
};
