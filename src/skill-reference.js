import{basicFanAngle}from'./data.js';
import{ARCANA_STAGES}from'./queen.js';
import {Game} from './game.js';
import {CHAMPIONS,RULES} from './data.js';
import {championDescription} from './champion-reference.js';
import {skillTargeting} from './targeting.js';
import {SORA} from './sora.js';
import {YAN} from './yan.js';
import {HOHENHEIM} from './hohenheim.js';
import {DON_CHARGE} from './don.js';
import {KROMER} from './kromer.js';
import {JAMILA} from './jamila.js';
import {SKILL_SUMMARIES} from './skill-summaries.js';
import {SKILL_DETAILS} from './skill-details.js';

const fields=[['passive','passiveText'],['basic','basicText'],['tactical','qText'],['ultimate','rText']];
const cache=new Map();
export const number=n=>String(Number(Number(n).toFixed(4)));
const row=(label,text)=>({label,text});
function referenceArena(key,transformed){
 const id=key+':'+transformed;if(cache.has(id))return cache.get(id);
 const g=new Game(key,'bottom',{mode:'training',seed:70}),e=g.player;g.time=0;g.units=[e];e.lastCombat=0;if(key==='dongbaek')e.qCd=1;
 if(transformed&&key==='sora'){e.buffs.soraEgo=Infinity;e.state.egoQCharges=SORA.egoQCharges;}
 if(transformed&&key==='nosferatu')e.state.bloodfiend={until:10,at:0,hp:e.hp,feast:0,x:e.x,y:e.y};
 if(transformed&&key==='yan')e.buffs.yanDistorted=Infinity;
 e.maxHp=g.maxHp(e);e.hp=e.maxHp;const value={g,e};cache.set(id,value);return value;
}
export function championReferenceStats(key,transformed=false){const{g,e}=referenceArena(key,transformed);return{health:Math.round(g.maxHp(e)),armor:Number(g.armor(e).toFixed(2)),speed:Number(g.speed(e).toFixed(2)),range:g.attackRange(e),ammo:g.ammoCap(e),reload:g.reloadInterval(e)};}
const degrees=r=>number(Number((r*180/Math.PI).toFixed(1)))+'°';
function basicRanges(key,g,e,transformed){
 const range=g.attackRange(e),r=number(range);
 if(key==='queen')return[row('관통 투사체','사거리 6.5'),row('아군 통과 강화','추가 사거리 1.2')];
 if(key==='nosferatu')return transformed?[row('공격 범위','자신 중심 반경 '+r)]:[row('근접 참격','사거리 '+r+' · 전방 반원 180°'),row('피의 칼날','사거리 6.8 · 폭 4.54 · 관통 불가')];
 if(key==='yan')return transformed?[row('손 조작','조작 거리 '+YAN.handLeash+' · 손 공격 반경 '+YAN.handRadius)]:[row('미충전','사거리 '+YAN.basicRange+' · 폭 '+YAN.width),row('최대 충전','사거리 '+YAN.fullRange+' · 폭 '+YAN.width),row('충전 변화','사거리 최소 '+YAN.basicRange+' ~ 최대 '+YAN.fullRange)];
 if(key==='hohenheim')return[row('미충전','사거리 '+HOHENHEIM.minRange+' · 직선 폭 '+number(HOHENHEIM.width*2)),row('최대 충전','사거리 '+HOHENHEIM.maxRange+' · 직선 폭 '+number(HOHENHEIM.width*2)),row('충전 변화','사거리 최소 '+HOHENHEIM.minRange+' ~ 최대 '+HOHENHEIM.maxRange)];
 if(key==='sora')return transformed?[row('공격 범위','자신 중심 반경 '+SORA.egoRadius)]:[row('공격 범위','중심점 사거리 '+SORA.basicRange+' · 반경 '+SORA.basicRadius)];
 if(key==='marton')return[row('근접 조준: 거리 2.5 미만','사거리 2.5 · 부채꼴 165°'),row('원거리 조준: 거리 2.5 이상','중심점 사거리 '+r+' · 반경 2.2')];
 if(key==='kim')return[row('발검','사거리 '+r+' · 부채꼴 '+degrees(basicFanAngle(key))),row('후속 베기','사거리 '+number(range*1.2*1.08)+' · 부채꼴 '+degrees(basicFanAngle(key)))];
 if(key==='gregor')return[row('기본','사거리 '+r+' · 부채꼴 '+degrees(basicFanAngle(key))),row('변이','사거리 '+number(range*1.3)+' · 부채꼴 '+degrees(basicFanAngle(key)))];
 if(key==='yi')return[row('기본','사거리 '+r+' · 관통 파편 3개'),row('오감도','사거리 '+number(range+1)+' · 관통 파편 7개')];
 if(key==='gahwan')return[row('전체 공격','사거리 '+r+' · 직선 폭 1.5'),row('근접 추가 공격','같은 직선 안 거리 3.25 이내')];
 if(key==='rudolph')return[row('공격 범위','중심점 사거리 '+r+' · 반경 2.1675')];
 if(key==='ahab')return[row('직격','사거리 '+r+' · 직선 투사체'),row('폭발','적중 지점 반경 2')];
 if(key==='honglu')return[row('공격 범위','자신 중심 반경 '+r)];
 if(key==='kromer')return[row('공격 범위','사거리 '+r+' · 직사각형 폭 2')];
 if(key==='meursault')return[row('공격 범위','사거리 '+r+' · 직사각형 폭 2.6')];
 if(key==='queequeg')return[row('공격 범위','사거리 '+r+' · 직선 폭 1.8')];
 const cones={sinclair:Math.PI,ryoshu:Math.PI,heathcliff:1.7,ishmael:1.6,nelly:1.2,dongbaek:1.3,dongrang:1.9,alisa:1.1,starbuck:.975*1.2};
 if(cones[key])return[row('공격 범위','사거리 '+r+' · '+('부채꼴 '+degrees(basicFanAngle(key))))];
 const widths={faust:2.196,rodya:1.65,jamila:.242,yi:.594};
 return[row('공격 범위','사거리 '+r+' · 직선'+(widths[key]?' 폭 '+number(widths[key]):''))];
}
function skillRanges(key,index,g,e,transformed,variant){
 if(key==='queen'&&index===3)return ARCANA_STAGES.map((s,i)=>row(i+'단계','사거리 '+s.range+' · 폭 '+s.width));
 if(key==='nosferatu'&&index===2)return[row('소환','사거리 6.8 · 최대 4마리'),row('박쥐 활동','주인 중심 거리 8 · 공격 사거리 2.5')];
 if(index===1)return basicRanges(key,g,e,transformed);
 if(index===0){
  if(key==='ppui')return[row('보호 범위','자신 중심 반경 7의 아군 챔피언')];
  const targets={kromer:'공격한 적 챔피언',jamila:'공격한 적 · 자신',sinclair:'기본 공격에 적중한 적 챔피언',don:'반경 7의 적 챔피언 중 악당 선정',honglu:'스킬로 치유한 아군 챔피언 · 자신',gahwan:'공격한 적 챔피언',nelly:'공격한 적 챔피언'};
  if(targets[key])return[row('적용 대상',targets[key])];
  const passive={yi:[row('보호막 대상','자신 중심 반경 10의 아군')],kim:[row('보호막 대상','자신 중심 반경 4의 아군')],gubo:[row('아군 처형','기본 공격 사거리 9.5 · 궁극기 조준 사거리 12'),row('처형 파급','처치 위치에서 사거리 14.7의 부채꼴')],marton:[row('초롱 미끼','시야 반경 8 · 도발 반경 6.5')],gregor:[row('변이 해충','자신 중심 반경 5.5')],alisa:[row('자폭','자신 중심 반경 4')],outis:[row('근접 강화','대상과 거리 2.5 이내')],sora:transformed?[row('적용 대상','자신')]:[row('자동 지령','자신 중심 반경 5 · 최대 표식 2개')],yan:transformed?[row('손 공격','손 중심 반경 3.5 · 조작 거리 10')]:[row('적용 대상','자신 또는 아군이 공격한 가짜 지령 대상')]};
  return passive[key]||[row('적용 대상',key==='ahab'?'처치에 관여한 아군 최대 3명':'자신')];
 }
 if(index===3&&variant===1&&['sora','yan'].includes(key))return[row('변신 범위','자신')];
 if(index===3&&key==='sora')return[row('지령 대상','사거리 '+SORA.ultimateRange)];
 if(key==='kromer')return index===2?[row('투척','사거리 '+KROMER.qRange),row('표식 추적','3.5초 내 재사용 · 지형·적 충돌 무시')]:[row('돌진','거리 3'),row('던지기','거리 3.5')];
 if(index===2&&key==='don')return[row('미충전','사거리 '+DON_CHARGE.minRange+' · 폭 '+DON_CHARGE.width),row('최대 충전','사거리 '+DON_CHARGE.maxRange+' · 폭 '+DON_CHARGE.width),row('충전 변화','사거리 최소 '+DON_CHARGE.minRange+' ~ 최대 '+DON_CHARGE.maxRange)];
 if(index===2&&key==='heathcliff')return[row('미충전','도약 거리 0.5 · 착지 반경 1.8'),row('최대 충전','도약 거리 7 · 착지 반경 1.8'),row('충전 변화','사거리 최소 0.5 ~ 최대 7'),row('시체자루 중','도약 거리 7 · 착지 반경 1.8 · 즉시 최대 충전')];
 if(index===2&&key==='gregor')return[row('기본','사거리 6 · 직선 폭 2.4'),row('변이','사거리 8.5 · 직선 폭 2.4')];
 if(index===2&&key==='jamila')return[row('돌진','거리 '+JAMILA.qRange),row('베기','사거리 '+JAMILA.qRange+' · 부채꼴 165°'),row('후퇴','거리 '+JAMILA.qRetreat)];
 if(index===2&&key==='myo')return[row('공격 범위','투사체 사거리 7 · 탄환 4발')];
 if(index===2&&key==='nelly')return[row('공격 범위','사거리 7 · 관통 나이프 5개 부채 발사')];
 if(index===2&&key==='kim')return[row('돌진','거리 2.8 · 경로의 첫 적 챔피언'),row('해제 밀치기','거리 2.5')];
 if(index===2&&key==='outis')return[row('돌진','거리 3'),row('베기','자신 중심 반경 2.5')];
 if(index===2&&key==='hohenheim')return[row('돌진','거리 2.5 · 경로의 첫 적'),row('후퇴','거리 2')];
 if(index===2&&key==='sora')return transformed?[row('돌진','거리 '+SORA.egoQRange+' · 공격 반폭 '+SORA.egoHitWidth),row('후속 장판','실제 이동 길이의 1.1배 · 반폭 '+SORA.trailWidth)]:[row('도약','사거리 '+SORA.qRange+' · 충돌 반폭 '+number(SORA.qWidth))];
 if(index===2&&key==='yan'&&transformed)return[row('지점 지정','사거리 '+YAN.distortedQRange+' · 전체 반경 '+YAN.distortedQRadius),row('중심 추가 타격','지정 지점 중심 반경 '+YAN.distortedQInner)];
 if(index===2&&key==='honglu')return[row('지속 효과','자신 · 시야 감지 반경 8.5'),row('치유 파동','자신 중심 반경 5')];
 if(index===2&&key==='ahab')return[row('명령 대상','자신 중심 반경 8의 다른 아군 챔피언')];
 if(index===3&&key==='outis')return[row('돌진','거리 4.5 · 경로의 첫 적'),row('산탄','사거리 6.5 · 부채꼴 165°'),row('후퇴','거리 2.5')];
 if(index===3&&key==='hohenheim')return[row('지점 지정','사거리 8'),row('전기장 생성','반경 4'),row('확장 완료','반경 7.5')];
 if(index===3&&key==='kim')return[row('기본 발동','사거리 6 · 직선 검기'),row('피격 반격','사거리 8 · 직선 검기')];
 if(index===3&&key==='queequeg')return[row('적용 대상','자신 · 연결된 아군')];
 if(index===3&&key==='jamila')return[row('소환 위치','자신 주변에 전투원 2명')];
 if(index===3&&key==='alisa')return[row('돌진','거리 2.5'),row('자폭','자신 중심 반경 4')];
 const selfOnly=index===2?['meursault','rodya','gubo','rudolph','dongbaek']:['myo'];
 if(selfOnly.includes(key))return[row('적용 대상','자신')];
 const spec=skillTargeting(g,e,index===2?'q':'r'),range=number(spec.range),radius=number(spec.radius);
 if(spec.kind==='cone')return[row('공격 범위','사거리 '+range+' · '+(Math.abs(spec.radius-Math.PI)<.001?'반원':'부채꼴 '+degrees(spec.radius)))];
 if(spec.kind==='line')return[row('공격 범위','사거리 '+range+' · 직선 폭 '+number(spec.radius*2)+(spec.impact?' · 끝 범위 반경 '+number(spec.impact):''))];
 if(spec.kind==='circle')return[row('지정 범위','사거리 '+range+' · 반경 '+radius)];
 if(spec.kind==='quick')return[row('이동 범위','거리 '+range+' · 돌진 경로')];
 if(spec.kind==='self')return[row('적용 범위','자신 중심 반경 '+radius)];
 return[row('지정 대상','사거리 '+range)];
}
function cooldownLabel(key,index,g,e,transformed,variant){
 if(index===0)return ({ppui:'재사용 15초',yi:'재사용 1.5초',kim:'재사용 1초',ishmael:'재사용 70초',gregor:'변이 재사용 30초',outis:'보호막 재사용 1초',don:'대상별 재사용 6초',nelly:'표식 재부여 3초',sora:transformed?'지속 '+SORA.egoDuration+'초':'표식 주기 3초',yan:'대상별 재부여 3초'})[key]||'상시';
 if(index===1){
  if(key==='nosferatu'&&transformed)return '탄창 소모 없음 · 자동 공격 간격 0.35초';
  if(key==='jamila')return '탄창 '+g.ammoCap(e)+'개 · 일괄 장전 '+number(g.reloadInterval(e))+'초 · 공격 간격 0.15초';
  if(key==='yan')return transformed?'탄창 소모 없음 · 손 기본 타격 주기 0.5초':'탄창 소모 없음 · 완충 '+YAN.chargeTime+'초 · 최소 공격 간격 0.85초';
  if(key==='hohenheim')return '탄창 소모 없음 · 완충 '+HOHENHEIM.chargeTime+'초 · 발사 후 대기 '+HOHENHEIM.interval+'초';
  if(key==='rudolph')return '정신력 '+g.ammoCap(e)+' · 회복 초당 '+number(18*RULES.reload[CHAMPIONS[key].reload]/g.reloadInterval(e))+' · 공격 간격 '+number(g.attackInterval(e))+'초';
  return '탄창 '+g.ammoCap(e)+'개 · 1개 장전 '+number(g.reloadInterval(e))+'초 · 공격 간격 '+number(g.attackInterval(e))+'초';
 }
 if(index===3&&variant===1&&['sora','yan'].includes(key))return '변신 재사용 대기 없음';
 if(key==='nosferatu'&&index===2)return '쿨타임 '+number(g.cooldown(e,'q'))+'초 · 2.5초 내 최대 4회 재사용';
 const charges=index===2&&(key==='ppui'||key==='nelly'||key==='ryoshu'||key==='sora'&&transformed)?2:1;
 return (charges>1?'충전당 ':'쿨타임 ')+number(key==='myo'&&index===2?.15:g.cooldown(e,index===2?'q':'r'))+'초'+(charges>1?' · 최대 '+charges+'회 충전':'');
}
export function cleanSkillDetails(text){
 const value='(?:최소\\s*)?\\d+(?:\\.\\d+)?(?:\\s*~\\s*(?:최대\\s*)?\\d+(?:\\.\\d+)?)?';
 return text
  .replace(/발사 또는 충전 취소부터 쿨다운 \d+(?:\.\d+)?초\./gu,'발사 또는 충전 취소 후 재사용 대기가 시작된다.')
  .replace(/(?:변이\s+)?(?:내부\s*)?(?:기본\s*)?(?:쿨다운|쿨타임|재사용 대기시간|재사용 대기|충전 회복|충전당 기본 대기시간|충전당 기본 재사용 대기시간)\s*(?:은|이|:)?\s*\d+(?:\.\d+)?초(?!\s*(?:감소|반환|환급|단축|증가))((?:이며|이고|이다|다)?)[.,]?/gu,(_,tail)=>['이며','이고'].includes(tail)?'재사용 대기시간은 ':'')
  .replace(new RegExp('사거리(?:는|가)?(?:\\s*충전량에 따라)?\\s*'+value+'\\s*(?:의|안의|내|안)?','gu'),'')
  .replace(new RegExp('(?:전체\\s*)?(?:반경|반폭|폭|각도)\\s*'+value+'(?:라디안|도)?\\s*(?:의|에|내|안의)?','gu'),'')
  .replace(/\(\s*\)/gu,'').replace(/(?<=[.!?])\s*[·,]+|^[·,.\s]+/gu,'').replace(/\s*[·,]\s*(?=[.!?])/gu,'').replace(/\s+/gu,' ').replace(/ ([.,])/gu,'$1').trim();
}
export function skillReference(key,index,transformed=false,variant){
 const {g,e}=referenceArena(key,transformed),c=championDescription(key,transformed),[title,field]=fields[index];
 const alternate=index===3&&variant!==undefined?c.baseUltimates?.[variant]:null;
 const summaryKey=transformed?(key==='sora'?'soraEgo':key==='nosferatu'?'bloodfiend':'yanDistorted'):key;
 let summary=SKILL_SUMMARIES[summaryKey]?.[index]||c[field]?.split(/[.!?]/u)[0]||'';
 if(alternate){summary=key==='sora'?(variant===0?'새 지령을 부여하고 기존 지령을 갱신합니다.':'대행 5중첩으로 12초간 개화 E.G.O 상태가 됩니다.'):(variant===0?'주변의 적 챔피언에게 가짜 지령을 부여하고 갱신합니다.':'불길한 힘 6중첩으로 20초간 뒤틀림 상태가 됩니다.');}
 const details=alternate?cleanSkillDetails(alternate.description):SKILL_DETAILS[summaryKey]?.[index]??cleanSkillDetails(c[field]||''),labels=key==='gubo'&&index===0?['아군 처형','처형 파급']:key==='jamila'&&index===3?['전투원 소환','LCA 우제트 전투원']:null;return{title:alternate?.name||c[title],cooldown:cooldownLabel(key,index,g,e,transformed,variant),ranges:skillRanges(key,index,g,e,transformed,variant),summary,details,summarySections:labels?summary.split(/\n\s*\n/).map((text,i)=>({title:labels[i],text})):null,sections:labels?details.split(/\n\s*\n/).map((text,i)=>({title:labels[i],text})):null};
}

// Escape first; only numeric spans selected by local Korean effect labels may
// introduce markup. No description-provided HTML is ever executed.
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function skillTextHTML(text){
 const matches=[],atom='[+−-]?\\d+(?:\\.\\d+)?(?:%|/3)?',n='(?:최소\\s*)?'+atom+'(?:\\s*~\\s*(?:최대\\s*)?'+atom+')?',formula='\\([^)]*\\d[^)]*\\)%?',kinds=[['true','고정\\s*(?:피해|화상)'],['healing','(?:회복|치유)(?:량)?'],['damage','(?:추가\\s*)?피해(?:량)?']];
 for(const[kind,label]of kinds){
  for(const pattern of [new RegExp('('+formula+')\\s*(?:를|만큼|의)?\\s*'+label,'gu'),new RegExp(label+'(?:는|은|가|이|의|를|:)?\\s*('+formula+')','gu'),new RegExp('('+n+')\\s*(?:의|를|만큼|의 체력을|에 해당하는)?\\s*'+label,'gu'),new RegExp(label+'(?:는|은|가|이|의|를|:)?\\s*('+n+')','gu')])for(const m of text.matchAll(pattern)){
   const start=m.index+m[0].indexOf(m[1]),end=start+m[1].length;if(!matches.some(p=>start<p.end&&end>p.start))matches.push({start,end,kind});
  }
 }
 matches.sort((a,b)=>a.start-b.start);let at=0,out='';for(const m of matches){out+=escape(text.slice(at,m.start))+`<span class="skill-value ${m.kind}">${escape(text.slice(m.start,m.end))}</span>`;at=m.end;}return out+escape(text.slice(at));
}
