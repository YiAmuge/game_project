import { CHAMPION_TEXT } from './champion-text.js';
import { NEW_DATA } from './new-data.js';
import { EXTRA_CHAMPIONS } from './extra-data.js';
export const AHAB={orderRadius:8};
export const RULES = {
  passiveXpPerSecond:3, timeLimit:1200, bossAt: 300, firstWaveAt:3, waveEvery: 25, width: 70.72, height: 46.8, maxLevel: 10,
  health: [0, 2200, 2800, 3400, 4000, 4600], power: [0, .82, .91, 1, 1.12, 1.25],
  reload: [0, .8, .68, .56, .45, .36], speed: [0, 3.1, 3.45, 3.8, 4.15, 4.5],
  xp: [0, 250, 600, 1050, 1650, 2400, 3300, 4350, 5550, 6900], costs: [160, 260, 400, 580, 800],
  reloadEfficiency: .8*.65, naturalHealDelay: 3, naturalHealRate: .13, allyExecuteThreshold: .21, allyExecuteBuffThreshold:.35,
  dashSpeed: 8, knockSpeed: 6, recallTime: 3, attackIntervalMultiplier:1.3, fastAttackThreshold:.4, shareFraction:.2,
};
export const MAP_SCALE=1.3;
export const MAP_X=.85;
export const worldPoint=(x,y)=>({x:x*MAP_SCALE*MAP_X,y:y*MAP_SCALE});
export const MAP_CENTER=worldPoint(32,18);
// Preserve the central battlefield coordinates; add only rear wings and the two flank rooms.
export const WORLD={x:-8.5,y:-8,w:87.72,h:62.8};
export const TERRAIN=[{x:0,y:0,w:83.2,h:46.8},{x:-10,y:16.4,w:12,h:14},{x:81.2,y:16.4,w:12,h:14},{x:29.6,y:-8,w:24,h:9.5},{x:29.6,y:45.3,w:24,h:9.5}].map(p=>({...p,x:p.x*MAP_X,w:p.w*MAP_X}));
export const terrainContains=(x,y)=>TERRAIN.some(p=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h);
export const FOUNTAINS=[{x:-6.7*MAP_X,y:MAP_CENTER.y},{x:89.9*MAP_X,y:MAP_CENTER.y}];
export const MINIONS={size:1.15*1.2,health:{melee:680,ranged:480,siege:1320},spawnGap:.35,growthEvery:120,maxGrowth:6,hpGrowth:.06,attackGrowth:.05};
export const CAMP_RULES={radius:3.4,leashDistance:3.4,leashDelay:1.85,returnSpeed:9,neutralRespawn:20,buffRespawn:45,buffHealth:1.33,buffDuration:60,patternEvery:5,firstPattern:1.5};
export const CORE_POSITIONS=[{x:10.2*MAP_X,y:MAP_CENTER.y},{x:RULES.width-10.2*MAP_X,y:MAP_CENTER.y}];
export const WELL_ROOMS=[{x:-3.5*MAP_X,y:MAP_CENTER.y,r:5.2,team:0},{x:RULES.width+3.5*MAP_X,y:MAP_CENTER.y,r:5.2,team:1}];
export function inWell(e,team=e.team){const w=WELL_ROOMS[team];return Math.hypot(e.x-w.x,e.y-w.y)<=w.r&&(team===0?e.x<=w.x:e.x>=w.x);}
export const CHAMPIONS = {
  faust: { id: 2, name: '파우스트', tag: 'FAUST', role: '저격', color: '#c9d8df', icon: 'F', power: 4, health: 3, speed: 2, ammo: 3, reload: 3, range: 7.5, damage: 180, attackTime: .46, q: 11, r: 48,
    passive: '게젤샤프트', basic: '대상 분석', tactical: '탐구', ultimate: '표상방출기',
    brief: '검파로 전선을 압박하는 분석가',
  },
  yi: { id: 1, name: '이상', tag: 'YI SANG', role: '지원', color: '#c6b896', icon: 'Y', power: 2, health: 3, speed: 3, ammo: 3, reload: 2, range: 6.5, damage: 95, attackTime: .5, q: 12, r: 45,
    passive: '기억의 조각', basic: '깃털', tactical: '침묵', ultimate: '오감도',
    brief: '거울 파편과 보호막으로 아군을 지원',
  },
  sinclair: { id: 3, name: '싱클레어', tag: 'SINCLAIR', role: '암살', color: '#e0c374', icon: 'S', power: 3, health: 2, speed: 4, ammo: 2, reload: 5, range: 1.8, damage: 210, attackTime: .4, q: 9, r: 42,
    passive: '어느 표지', basic: '연속 베기', tactical: '공포를 이기는 용기', ultimate: '지식나무의 가지',
    brief: '표식을 쌓아 돌파하는 근접 암살자',
  },
  meursault: { id: 5, name: '뫼르소', tag: 'MEURSAULT', role: '보호', color: '#a6bdc6', icon: 'M', power: 3, health: 5, speed: 1, ammo: 3, reload: 3, range: 1.9, damage: 233.75, attackTime: .55, q: 14, r: 50,
    passive: '이방인', basic: '원, 투', tactical: '판단 거부', ultimate: '타인의 사슬',
    brief: '아군의 피해를 줄이는 전선의 방패',
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

CHAMPIONS.rodya.q=12;CHAMPIONS.rodya.brief='짧은 돌진 도끼와 동전의 도박사';

CHAMPIONS.outis.damage=215;

CHAMPIONS.honglu.q=20;

CHAMPIONS.marton.range=5;
CHAMPIONS.queequeg.range=3;

CHAMPIONS.meursault.range=2.6;

CHAMPIONS.gubo.color='#aa344e';CHAMPIONS.gahwan.color='#eac854';
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
  x:((w.x+w.w/2)*MAP_SCALE-w.w*1.1/2)*MAP_X,y:(w.y+w.h/2)*MAP_SCALE-w.h*1.1/2,w:w.w*1.1*MAP_X,h:w.h*1.1,
}));
// Leave entrances above and below; separate the fountain approach from side camps.
WALLS.push({x:15*MAP_X,y:18.8,w:1.4*MAP_X,h:9.2,baseDivider:true},{x:RULES.width-16.4*MAP_X,y:18.8,w:1.4*MAP_X,h:9.2,baseDivider:true});
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
].map((b,id) => ({x:b.x*MAP_SCALE*MAP_X,y:b.y*MAP_SCALE,w:b.w*MAP_SCALE*MAP_X,h:b.h*MAP_SCALE,id}));
// Outer lane hedges and bushes inside the added horizontal flank rooms.
for(const y of [1.2,43.8])for(const x of [15,55.2])BUSHES.push({id:BUSHES.length,x:x*MAP_X,y,w:13*MAP_X,h:1.6});
for(const y of [-6.6,51.8])BUSHES.push({id:BUSHES.length,x:33.6*MAP_X,y,w:16*MAP_X,h:1.6});
export const lanePath = (team, lane) => {
  const y=lane===0?7.15:39.65;
  const points=[{...CORE_POSITIONS[0]},{x:16,y}, {x:RULES.width-16,y},{...CORE_POSITIONS[1]}];
  return team===0?points:points.reverse();
};
export const CHAMPION_ROLES={
 yi:['지원','방해','support'],faust:['저격','bottom'],sinclair:['암살','jungle'],don:['돌격','top'],meursault:['보호','방해','top'],gubo:['저격','bottom'],kim:['보호','top'],queequeg:['지원','보호','support'],ppui:['지원','support'],gahwan:['방해','저격','support'],hohenheim:['저격','방해','bottom'],alisa:['암살','돌격','jungle'],marton:['보호','방해','top'],nelly:['암살','jungle'],myo:['암살','jungle'],rudolph:['저격','bottom'],dongbaek:['저격','bottom'],dongrang:['보호','돌격','top'],outis:['저격','암살','bottom'],heathcliff:['돌격','top'],ryoshu:['암살','jungle'],ishmael:['방해','보호','support'],honglu:['지원','support'],rodya:['방해','돌격','support'],gregor:['보호','돌격','top'],ahab:['저격','암살','bottom'],starbuck:['암살','방해','jungle'],sora:['암살','돌격','jungle'],yan:['방해','보호','support']
};
for(const [key,values] of Object.entries(CHAMPION_ROLES)){const c=CHAMPIONS[key];c.roles=values.slice(0,-1);c.role=c.roles[0];c.recommendedPosition=values.at(-1);}
CHAMPIONS.alisa.healthMultiplier=.6;CHAMPIONS.alisa.damage=140;

export const AUGMENT_RULES={cost:500,refund:.7,slots:4,categorySlots:2};
export const AUGMENTS=[
 {key:'finalBullet',group:'combat',name:'마탄',text:'7초마다 적 챔피언 적중 시 최종 체력 피해의 7% 고정 피해'},
 {key:'power15',group:'combat',name:'신검합일',text:'전투력 +20%'},
 {key:'range7',group:'combat',name:'N사 고정팀 가방',text:'기본 공격 사거리 +2.5. 돌진형 기본 공격은 공격 사거리와 돌진거리 각각 +1'},
 {key:'reloadStacks',group:'combat',name:'엄숙한 애도',text:'공격 적중 시 장전속도 +5% 중첩, 최대 5중첩. 획득 시 3초로 갱신, 3초마다 1중첩 감소'},
 {key:'resentment',group:'survival',name:'원한 문신',text:'잃은 체력 10%마다 전투력·방어력·장전속도 +5%, 최대 8중첩. 현재 체력에 따라 실시간 적용'},
 {key:'kAmpule',group:'survival',name:'보급형 K사 앰플',text:'치명적인 피해를 받으면 체력을 최대 체력의 50%로 복구하고 모든 군중제어 해제. 1초간 군중제어 면역·이동속도 +30%. 재사용 대기시간 60초'},
 {key:'forceBattery',group:'survival',name:'휴대용 역장 배터리',text:'자연 치유로 실제 회복한 체력만큼 보호막 획득. 최대 체력의 30%까지 누적'},
 {key:'blackOrb',group:'survival',name:'흑수환',text:'최대 체력·이동속도·장전속도 +15%'},
 {key:'battleHaste',group:'tech',name:'사랑과 증오의 이름으로',text:'전투를 3초 이상 유지하면 스킬 가속 +15%. 비전투 시 해제'},
 {key:'cooldown15',group:'tech',name:'주민등록 마이크로칩',text:'전술기·궁극기 기본 재사용 대기시간 −15%'},
 {key:'magazine2',group:'tech',name:'카포를 위하여',text:'최대 탄창 +2'},
 {key:'adaptiveSpeed',group:'tech',name:'초정밀 시간 가속 장치',text:'비전투 이동속도 +15% · 전투 중 +7%'},
];

for(const [key,text] of Object.entries(CHAMPION_TEXT))Object.assign(RUNTIME_CHAMPIONS[key],text);
