import {readFile,writeFile} from 'node:fs/promises';
import { RUNTIME_CHAMPIONS,POSITIONS,AUGMENTS,AUGMENT_RULES } from '../src/data.js';
import{REFERENCE_RULES as GAME_RULES,MONSTER_GUIDE as MONSTERS}from'../src/reference-content.js';
const root=new URL('../',import.meta.url),roster=JSON.parse(await readFile(new URL('src/roster.json',root),'utf8')),text={};
for(const [key,c] of Object.entries(RUNTIME_CHAMPIONS)){
 const record=roster.find(r=>r.id===c.id);
 text[key]={...Object.fromEntries(['passiveText','basicText','qText','rText'].map((slot,i)=>[slot,record.skills[i].description])),...Object.fromEntries(['passive','basic','tactical','ultimate'].map((slot,i)=>[slot,record.skills[i].name])),...(record.forms?{forms:record.forms,baseUltimates:record.baseUltimates}:{})};
}
await writeFile(new URL('src/champion-text.js',root),'// Skill descriptions shared by tooltips and encyclopedia.\nexport const CHAMPION_TEXT='+JSON.stringify(text,null,2)+';\n');
const sections=['# 도시 경계 — 현재 구현 규칙\n\n설명 기준: 현재 구현된 효과만 상세하게 설명하며, 삭제된 효과·과거 버전과의 비교·특정 챔피언의 대체 적용 안내는 포함하지 않는다.\n\n모든 경기는 3D 전장과 평면 챔피언 스프라이트를 사용하는 2.5D다. 역할군은 플레이 성향을 나타내는 정보다.\n'];
sections.push('## 공통 규칙\n',...GAME_RULES.map(([name,body])=>`### ${name}\n\n${body}\n`));
sections.push('## 증강\n',`기본 최대 ${AUGMENT_RULES.slots}개·카테고리별 일반 증강 최대 ${AUGMENT_RULES.categorySlots}개. 딜리버리 캐리어도 전체 6칸에 포함되며 보유 시 모든 카테고리의 2개 제한을 해제한다. 구매 500·판매 350 재화. 전투는 전투력 3단계, 생존은 체력 3단계, 기술은 이동속도·장전속도·스킬 가속 합계 3단계에서 구매한다.\n`);
for(const [group,name] of [['combat','전투'],['survival','생존'],['tech','기술']])sections.push(`### ${name}\n`,...AUGMENTS.filter(a=>a.group===group).map(a=>`#### ${a.name}\n\n${a.text}.\n`));
sections.push('## 몹과 건물\n',...MONSTERS.map(m=>`### ${m.name}\n\n체력 ${m.hp}·방어력 ${m.armor}·공격 ${m.attack}. 보상 ${m.reward}.\n\n${m.sections.map(([title,text])=>`**${title}**\n\n${text}`).join('\n\n')}\n`));
sections.push('## 챔피언\n');
for(const c of Object.values(RUNTIME_CHAMPIONS).filter(c=>![19,20].includes(c.id))){
 const r=roster.find(r=>r.id===c.id);sections.push(`### ${c.name}\n\n${r.note}\n\n${r.stats}.\n`,...r.skills.map(s=>`**${s.kind} — ${s.name}**\n\n${s.description}\n`),...(r.forms?[`**${r.forms.transformed.name}**\n`,...r.forms.transformed.skills.map((s,i)=>`**${['패시브','기본','전술기'][i]} — ${s.name}**\n\n${s.description}\n`)]:[]));
}
await writeFile(new URL('docs/CURRENT_RULES.md',root),sections.join('\n'));
console.log('Current encyclopedia, tooltips and rules reference synchronized.');
