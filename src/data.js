import {KROMER_DATA} from './kromer-data.js';
import {JAMILA_DATA} from './jamila-data.js';
import { CHAMPION_TEXT } from './champion-text.js';
import { NEW_DATA } from './new-data.js';
import { EXTRA_CHAMPIONS } from './extra-data.js';
export const AHAB={orderRadius:8};
export const RULES = {
  passiveXpPerSecond:3, timeLimit:1200, bossAt: 300, firstWaveAt:3, waveEvery: 25, width: 70.72, height: 46.8, maxLevel: 10,
  health: [0, 2200, 2800, 3400, 4000, 4600], power: [0, .82, .91, 1, 1.12, 1.25],
  armor: [0, 10, 20, 30, 40, 50],
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
export const SOUTH_TERRACE=TERRAIN[4];
{const r=SOUTH_TERRACE,oldWidth=r.w;r.w*=1.1;r.x-=(r.w-oldWidth)/2;r.h*=.5;r.bevel=r.h-1.5;r.polygon=[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+1.5],[r.x+r.w-r.bevel,r.y+r.h],[r.x+r.bevel,r.y+r.h],[r.x,r.y+1.5]];}
export function footprintContains(r,x,y){if(x<r.x||x>r.x+r.w||y<r.y||y>r.y+r.h)return false;if(!r.polygon)return true;let inside=false;for(let i=0,j=r.polygon.length-1;i<r.polygon.length;j=i++){const a=r.polygon[i],b=r.polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
// The battlefield ends at the former diagonal walls' inner face, leaving the fountain intact.
const approachSlope=20.9/16.2,approachTipX=(20.9+.55*Math.hypot(1,approachSlope))/approachSlope,approachStopX=TERRAIN[1].x+TERRAIN[1].w,approachStopY=TERRAIN[1].y;
export const APPROACH={tipX:approachTipX,tipY:approachStopY/(1-approachStopX/approachTipX),stopX:approachStopX,stopY:approachStopY};
const approachEnd={x:APPROACH.stopX,y:APPROACH.tipY*(1-APPROACH.stopX/APPROACH.tipX)};
const approachCutout=[[0,0],[APPROACH.tipX,0],[approachEnd.x,APPROACH.stopY],[0,APPROACH.stopY]];
export const APPROACH_CUTOUTS=[...Array(4)].map((_,i)=>approachCutout.map(([x,y])=>[i&1?RULES.width-x:x,i&2?RULES.height-y:y]));
export const inApproachCutout=(x,y)=>{const xx=Math.min(x,RULES.width-x),yy=Math.min(y,RULES.height-y);return xx>=0&&yy>=0&&xx<APPROACH.tipX&&yy<APPROACH.tipY*(1-xx/APPROACH.tipX)&&!(xx<APPROACH.stopX&&yy>=APPROACH.stopY);};
export const terrainContains=(x,y)=>!inApproachCutout(x,y)&&TERRAIN.some(p=>footprintContains(p,x,y));
export const FOUNTAINS=[{x:-6.7*MAP_X,y:MAP_CENTER.y},{x:89.9*MAP_X,y:MAP_CENTER.y}];
export const MINIONS={size:1.15*1.2,health:{melee:680,ranged:480,siege:1320},spawnGap:.35,growthEvery:120,maxGrowth:6,hpGrowth:.06,attackGrowth:.05};
export const CAMP_RULES={radius:3.4,leashDistance:3.4,leashDelay:1.85,returnSpeed:9,neutralRespawn:20,buffRespawn:45,buffHealth:1.33,buffDuration:60,patternEvery:5,firstPattern:1.5};
export const BASE_DIVIDERS=[{x:15*MAP_X,y:18.8,w:1.4*MAP_X,h:9.2,baseDivider:true},{x:RULES.width-16.4*MAP_X,y:18.8,w:1.4*MAP_X,h:9.2,baseDivider:true}];
export const FOUNTAIN_AREAS=TERRAIN.slice(1,3).map((p,team)=>({...p,team}));
// Center the core in the clear gap between the fountain's battlefield edge and the near wall face.
export const CORE_POSITIONS=BASE_DIVIDERS.map((wall,team)=>{const area=FOUNTAIN_AREAS[team],fountainEdge=team?area.x:area.x+area.w,wallFace=team?wall.x+wall.w:wall.x;return{x:(fountainEdge+wallFace)/2,y:MAP_CENTER.y};});
export const WELL_ROOMS=[{x:-3.5*MAP_X,y:MAP_CENTER.y,r:5.2,team:0},{x:RULES.width+3.5*MAP_X,y:MAP_CENTER.y,r:5.2,team:1}];
export function inWell(e,team=e.team){const w=FOUNTAIN_AREAS[team];return Boolean(w&&e.x>=w.x&&e.x<=w.x+w.w&&e.y>=w.y&&e.y<=w.y+w.h);}
export const CHAMPIONS = {
  kromer:KROMER_DATA,
  jamila:JAMILA_DATA,
  faust: { id: 2, name: '파우스트', tag: 'FAUST', role: '저격', color: '#c9d8df', icon: 'F', power: 4, health: 3, speed: 2, ammo: 3, reload: 3, range: 7.5, damage: 180, attackTime: .46, q: 11, r: 48,
    passive: '게젤샤프트', basic: '대상 분석', tactical: '탐구', ultimate: '표상방출기',
    brief: '검파로 전선을 압박하는 분석가',
  },
  yi: { id: 1, name: '이상', tag: 'YI SANG', role: '지원', color: '#c6b896', icon: 'Y', power: 2, health: 3, speed: 3, ammo: 3, reload: 2, range: 6.5, damage: 95, attackTime: .5, q: 12, r: 45,
    passive: '기억의 조각', basic: '깃털', tactical: '침묵', ultimate: '오감도',
    brief: '거울 파편과 보호막으로 아군을 지원',
  },
  sinclair: { id: 3, name: '싱클레어', tag: 'SINCLAIR', role: '암살', color: '#e0c374', icon: 'S', power: 3, health: 2, speed: 4, ammo: 2, reload: 5, range: 2, damage: 210, attackTime: .4, q: 9, r: 42,
    passive: '어느 표지', basic: '연속 베기', tactical: '공포를 이기는 용기', ultimate: '지식나무의 가지',
    brief: '표식을 쌓아 돌파하는 근접 암살자',
  },
  meursault: { id: 5, name: '뫼르소', tag: 'MEURSAULT', role: '보호', color: '#a6bdc6', icon: 'M', power: 3, health: 5, speed: 1, ammo: 3, reload: 3, range: 1.9, damage: 120, attackTime: .55, q: 14, r: 50,
    passive: '이방인', basic: '원, 투', tactical: '판단 거부', ultimate: '타인의 사슬',
    brief: '아군의 피해를 줄이는 전선의 방패',
  },
};
export const NEW_CHAMPION_KEYS=['don','ryoshu','honglu','heathcliff','ishmael','rodya','outis','gregor','gubo','gahwan','nelly','ahab','rudolph','myo','dongbaek','dongrang','hohenheim','alisa','marton','queequeg','starbuck','kim','ppui','sora','yan'];
for(const key of NEW_CHAMPION_KEYS)CHAMPIONS[key]=NEW_DATA[key]||EXTRA_CHAMPIONS[key];
export const EXPERIMENTAL_CHAMPIONS=Object.fromEntries(Object.entries(EXTRA_CHAMPIONS).filter(([key])=>!NEW_CHAMPION_KEYS.includes(key)));
export const RUNTIME_CHAMPIONS={...CHAMPIONS,...EXPERIMENTAL_CHAMPIONS};
export const ARMOR_GRADES={kromer:5,jamila:4,yi:1,faust:2,sinclair:2,don:4,meursault:5,gubo:1,kim:4,queequeg:2,ppui:1,gahwan:3,hohenheim:1,alisa:3,marton:5,nelly:2,myo:1,rudolph:2,dongbaek:2,dongrang:3,outis:2,heathcliff:4,ryoshu:2,ishmael:5,honglu:3,rodya:3,gregor:4,ahab:1,starbuck:2,sora:3,yan:4};
for(const [key,c] of Object.entries(RUNTIME_CHAMPIONS))c.armor=ARMOR_GRADES[key]??2;
export const GROWTH={
 kromer:[.055,.05,.013],
 jamila:[.045,.055,.01],
 faust:[.055,.045,.008],yi:[.042,.052,.012],sinclair:[.058,.048,.016],meursault:[.038,.075,.007],don:[.052,.061,.013],ryoshu:[.064,.04,.017],honglu:[.046,.055,.014],heathcliff:[.061,.063,.01],ishmael:[.043,.072,.009],rodya:[.054,.065,.011],outis:[.06,.047,.01],gregor:[.045,.074,.008],gubo:[.063,.044,.006],gahwan:[.051,.049,.011],nelly:[.066,.043,.018],ahab:[.057,.041,.009],alisa:[.058,.057,.012],rudolph:[.05,.048,.007],moses:[.036,.058,.01],ezra:[.052,.067,.012],myo:[.064,.038,.015],dongbaek:[.053,.044,.01],dongrang:[.041,.075,.008],hohenheim:[.06,.039,.008],marton:[.038,.077,.009],queequeg:[.046,.079,.008],starbuck:[.058,.06,.013],kim:[.048,.068,.011],ppui:[.035,.054,.012],sora:[.06,.046,.013],yan:[.043,.058,.01],
};
export const ATTACK_STYLES={kromer:'thrust',jamila:'shot',faust:'slash',yi:'shot',sinclair:'slash',meursault:'punch',don:'thrust',ryoshu:'slash',honglu:'sweep',heathcliff:'slash',ishmael:'slash',rodya:'slash',outis:'shot',gregor:'slash',gubo:'shot',gahwan:'thrust',nelly:'slash',ahab:'throw',alisa:'slash',rudolph:'whip',moses:'shot',ezra:'punch',myo:'slash',dongbaek:'sweep',dongrang:'slash',hohenheim:'shot',marton:'sweep',queequeg:'thrust',starbuck:'thrust',kim:'slash',ppui:'shot',sora:'punch',yan:'slash'};
for(const [key,c] of Object.entries(RUNTIME_CHAMPIONS)){const [power,health,speed]=GROWTH[key];c.growth={power,health,speed};c.attackStyle=ATTACK_STYLES[key];}

CHAMPIONS.rodya.q=12;CHAMPIONS.rodya.range=4.65;CHAMPIONS.rodya.brief='검기로 적을 약화시키는 동전의 도박사';CHAMPIONS.ryoshu.range=2.2;

CHAMPIONS.gubo.damage=240;CHAMPIONS.rudolph.damage=57;CHAMPIONS.marton.color='#02ebf7';
CHAMPIONS.outis.damage=215;CHAMPIONS.alisa.damage=100;

CHAMPIONS.honglu.q=12;CHAMPIONS.don.q=8;CHAMPIONS.don.range=2.5;

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
export const UPGRADE_STEPS={power:[.04,.06,.10],health:[.08,.10,.12],speed:[.03,.06],haste:[.06,.09],reload:[.06,.09]};
export const UPGRADE_TOTALS=Object.fromEntries(Object.entries(UPGRADE_STEPS).map(([key,steps])=>[key,[0,...steps.map((_,i)=>steps.slice(0,i+1).reduce((a,b)=>a+b,0))]]));
export const upgradeRate=(e,key)=>UPGRADE_TOTALS[key]?.[Math.max(0,Math.min(UPGRADE_STEPS[key].length,Math.floor(e.upgrades?.[key]||0)))]||0;
export const UPGRADES=Object.entries(UPGRADE_STEPS).map(([key,steps])=>({key,name:{power:'전투력',health:'최대 체력',speed:'이동속도',haste:'스킬 가속',reload:'장전 속도'}[key],steps,effect:steps.map(n=>'+'+Math.round(n*100)+'%').join(' / '),max:steps.length}));
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
WALLS.push(...BASE_DIVIDERS);
// A four-by-one divider whose front face meets the north camp entrance.
export const NORTH_DIVIDER={x:MAP_CENTER.x-2,y:TERRAIN[3].y+TERRAIN[3].h-1,w:4,h:1,northDivider:true};
WALLS.push(NORTH_DIVIDER);
// Green connectors in the user's original sketch, mirrored around x=32.
const leftBushes = [
  { x: 18.8, y: 10.1, w: 2, h: 1.6 },
  { x: 18.8, y: 24.3, w: 2, h: 1.6 },
];
const horizontalMist=(a,b)=>({x:a.x+a.w,y:a.y,w:b.x-a.x-a.w,h:a.h});
export const BUSHES=[
 ...[[1,8],[3,10],[5,12],[6,13]].map(([a,b])=>horizontalMist(WALLS[a],WALLS[b])),
 ...[...leftBushes,...leftBushes.map(b=>({...b,x:64-b.x-b.w}))].map(b=>({x:b.x*MAP_SCALE*MAP_X,y:b.y*MAP_SCALE,w:b.w*MAP_SCALE*MAP_X,h:b.h*MAP_SCALE})),
].map((b,id)=>({...b,id}));
// Fill the full diagonal opening from one wall's end face to the other's.
for(const [index,a,b]of [[4,0,1],[5,2,3],[6,8,7],[7,10,9]]){const left=WALLS[a],right=WALLS[b],polygon=[[left.x+left.w,left.y],[right.x,right.y],[right.x,right.y+right.h],[left.x+left.w,left.y+left.h]],xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]);Object.assign(BUSHES[index],{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),polygon,towerSmoke:true,wallEnds:[a,b]});}
for(const [index,inside]of [[4,1],[11,-1]]){const wall=WALLS[index],w=1.35*MAP_SCALE*MAP_X;BUSHES.push({id:BUSHES.length,x:inside>0?wall.x+wall.w:wall.x-w,y:wall.y,w,h:wall.h});}
// Outer lane hedges and bushes inside the added horizontal flank rooms.
for(const y of [0,RULES.height-1.6])for(const side of [false,true]){const x=APPROACH.tipX,w=TERRAIN[3].x-x;BUSHES.push({id:BUSHES.length,x:side?RULES.width-x-w:x,y,w,h:1.6});}
// Concealment follows the walls of side camps, the central diagonals and flank rooms.
function mist(x,y,w,h){BUSHES.push({id:BUSHES.length,x,y,w,h});}
for(const side of [false,true])mist(side?RULES.width-14.15-1.35:14.15,18.7,1.35,9.4);
for(const [index,side]of [[4,-1],[11,1]]){const wall=WALLS[index],w=1.35;mist(side<0?wall.x-w:wall.x+wall.w,wall.y,w,wall.h);}
// Fill each diagonal opening from the full end face of one wall to the next wall's end face.
const sideWall=WALLS[4],capWall=WALLS[5];
const centralMist=[[sideWall.x,sideWall.y],[sideWall.x+sideWall.w,sideWall.y],[capWall.x,capWall.y+capWall.h],[capWall.x,capWall.y]];
for(const side of [false,true])for(const bottom of [false,true]){const polygon=centralMist.map(([x,y])=>[side?RULES.width-x:x,bottom?RULES.height-y:y]),xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);BUSHES.push({id:BUSHES.length,x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y,polygon});}
for(const [i,room]of TERRAIN.slice(3).entries()){const thickness=1.35;if(room.polygon){const p=room.polygon,norm=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);return[-dy/len,dx/len];},inner=p.map((v,j)=>{const a=norm(p[(j+p.length-1)%p.length],v),b=norm(v,p[(j+1)%p.length]),m=[a[0]+b[0],a[1]+b[1]],k=thickness/(m[0]*b[0]+m[1]*b[1]);return[v[0]+m[0]*k,v[1]+m[1]*k];});inner[2]=[p[2][0]-thickness*Math.SQRT2,p[2][1]];inner[5]=[p[5][0]+thickness*Math.SQRT2,p[5][1]];for(const j of[2,3,4]){const k=(j+1)%p.length,polygon=[p[j],p[k],inner[k],inner[j]],xs=polygon.map(v=>v[0]),ys=polygon.map(v=>v[1]);BUSHES.push({id:BUSHES.length,x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),polygon,southSmoke:true});}continue;}const capY=room.y;mist(room.x,capY,room.w,thickness);for(const x of[room.x,room.x+room.w-thickness])mist(x,room.y+thickness,thickness,room.h-thickness);}
// Full perimeter, including all four corners, without putting concealment inside the wall.
{const {x,y,w,h}=NORTH_DIVIDER,t=1.2;for(const r of [{x:x-t,y:y-t,w:w+2*t,h:t},{x:x-t,y:y+h,w:w+2*t,h:t},{x:x-t,y,w:t,h},{x:x+w,y,w:t,h}])BUSHES.push({...r,id:BUSHES.length,northSmoke:true});}
export const lanePath = (team, lane) => {
  const y=lane===0?7.15:39.65;
  const points=[{...CORE_POSITIONS[0]},{x:16,y}, {x:RULES.width-16,y},{...CORE_POSITIONS[1]}];
  return team===0?points:points.reverse();
};
export const CHAMPION_ROLES={
 kromer:['돌격','암살','top'],
 jamila:['저격','보호','bottom'],
 yi:['지원','방해','support'],faust:['저격','bottom'],sinclair:['암살','jungle'],don:['돌격','암살','top'],meursault:['보호','방해','top'],gubo:['저격','bottom'],kim:['보호','top'],queequeg:['지원','보호','support'],ppui:['지원','support'],gahwan:['방해','저격','support'],hohenheim:['저격','방해','bottom'],alisa:['암살','돌격','jungle'],marton:['보호','방해','top'],nelly:['암살','jungle'],myo:['암살','jungle'],rudolph:['저격','bottom'],dongbaek:['저격','bottom'],dongrang:['보호','top'],outis:['저격','암살','bottom'],heathcliff:['돌격','top'],ryoshu:['암살','jungle'],ishmael:['방해','보호','support'],honglu:['지원','support'],rodya:['방해','support'],gregor:['보호','돌격','top'],ahab:['저격','암살','bottom'],starbuck:['암살','방해','jungle'],sora:['암살','돌격','jungle'],yan:['방해','보호','support']
};
for(const [key,values] of Object.entries(CHAMPION_ROLES)){const c=CHAMPIONS[key];c.roles=values.slice(0,-1);c.role=c.roles[0];c.recommendedPosition=values.at(-1);}
CHAMPIONS.alisa.healthMultiplier=.6;CHAMPIONS.alisa.damage=140;

export const AUGMENT_RULES={cost:500,refund:.7,slots:6,categorySlots:2};
export const AUGMENTS=[
 {key:'finalBullet',group:'combat',name:'마탄',text:'7초마다 적 챔피언 적중 시 최종 체력 피해의 7% 고정 피해'},
 {key:'power15',group:'combat',name:'신검합일',text:'전투력 +10% · 방어관통 +20%'},
 {key:'range7',group:'combat',name:'N사 고정팀 가방',text:'기본 공격 사거리 +2.5. 관통 또는 범위 공격이 가능한 기본 공격은 사거리 +1.3을 적용'},
 {key:'reloadStacks',group:'combat',name:'엄숙한 애도',text:'공격 적중 시 장전속도 +5% 중첩, 최대 5중첩. 획득 시 3초로 갱신, 3초마다 1중첩 감소. 최대 중첩 중 공격 중에도 장전이 15% 속도로 진행'},
 {key:'glaive',group:'survival',name:'경혈식 글레이브',text:'전투력 +10% · 준 체력 피해의 30%만큼 흡혈'},
 {key:'wisdom',group:'combat',name:'지혜성도',text:'전투력 +5% · 공격 중에도 장전이 30% 속도로 진행'},
 {key:'duelManual',group:'combat',name:'듀엘교본 3권',text:'이동속도 +5% · 기본 이동속도를 초과한 현재 이동속도의 비율만큼 전투력 증가'},
 {key:'resentment',group:'survival',name:'원한 문신',text:'잃은 체력 10%마다 전투력·방어력·장전속도 +5%, 최대 8중첩. 현재 체력에 따라 실시간 적용'},
 {key:'kAmpule',group:'survival',name:'보급형 K사 앰플',text:'장전 속도 +7%. 치명적인 피해를 받으면 체력을 최대 체력의 50%로 복구하고 모든 군중제어 해제. 1초간 군중제어 면역·이동속도 +30%. 재사용 대기시간 60초'},
 {key:'forceBattery',group:'survival',name:'휴대용 역장 배터리',text:'2초간 피해를 받지 않으면 초당 최대 체력의 13% 보호막 충전, 최대 30%. 최대 체력의 10% 이상 보호막 보유 중 스킬 가속 +10% · 이동속도 +10%'},
 {key:'blackOrb',group:'combat',name:'흑수환',text:'전투력·이동속도·장전속도 +10%'},
 {key:'antimatter',group:'survival',name:'반물질 옷',text:'최대 체력 +10% · 사거리 1.6의 적에게 0.5초마다 20 고정 피해'},
 {key:'writtenOrder',group:'survival',name:'쪽지로 전해진 지령',text:'공격 적중 시 방어력 +5%, 최대 5중첩. 각 중첩은 5초 유지. 최대 중첩 중 일반 피해의 10%를 고정 피해로 전환하고 해당 고정 피해만큼 5초 보호막 획득, 최대 500 누적'},
 {key:'traumaGuard',group:'survival',name:'트라우마 방지장',text:'최대 체력 +5% · 방어력 +5% · 군중제어를 받을 때 해당 효과를 무효화하고 탄창 1개 충전. 재사용 대기시간 16초'},
 {key:'battleHaste',group:'tech',name:'사랑과 증오의 이름으로',text:'전투를 3초 이상 유지하면 스킬 가속 +25%. 비전투 시 해제'},
 {key:'cooldown15',group:'tech',name:'주민등록 마이크로칩',text:'전술기·궁극기 기본 재사용 대기시간 −15%'},
 {key:'magazine2',group:'tech',name:'카포를 위하여',text:'최대 탄창 +2'},
 {key:'carrier',group:'tech',name:'딜리버리 캐리어',text:'스킬 가속 +3% · 이동속도 +3%. 카테고리별 증강 2개 제한을 해제한다. 전체 보유 한도 6개에는 포함된다'},
 {key:'maskDeLu',group:'tech',name:'마스크 드 루',text:'적에게 상태이상·디버프를 부여하면 남은 스킬 재사용 대기시간 20% 감소 및 빈 탄창 1개 충전. 재사용 대기시간 10초'},
 {key:'highRisk',group:'tech',name:'고위험 작전용 장비',text:'전투력 +5% · 방어력 +7%. 귀환을 침투로 대체한다.\n\n침투\n준비 · 어디서든 1.75초 정신집중 후 전장에서 사라진다.\n위치 선택 · 시전 위치 중심 사거리 35 안에서 최대 10초 동안 착지점을 선택한다.\n조작 · PC는 WASD, 모바일은 이동 조이스틱으로 위치를 변경한다.\n정밀 조작 · 우클릭 또는 전술기 버튼을 누르면 천천히 이동한다.\n카메라 · 선택 중 시야가 30% 넓어지며 정밀 조작 중에는 원래 시야로 돌아온다.\n착지 · 기본공격으로 확정하면 0.5초 후 등장한다. 선택시간이 끝나면 선택점 근처의 유효한 지점에 자동으로 착지한다.\n이동 강화 · 착지 후 2초간 이동속도 +10%.\n재사용 · 성공 시 75초. B 또는 귀환 버튼으로 취소 시 1.5초.'},
 {key:'adaptiveSpeed',group:'tech',name:'초정밀 시간 가속 장치',text:'비전투 이동속도 +15% · 전투 중 +7%'},
];

for(const [key,text] of Object.entries(CHAMPION_TEXT))Object.assign(RUNTIME_CHAMPIONS[key],text);
