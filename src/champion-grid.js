import{CHAMPIONS,POSITIONS}from'./data.js';
import{preview}from'./asset-preview.js';
export const championRoles=()=>[...new Set(Object.values(CHAMPIONS).flatMap(c=>c.roles||[c.role]))];
export function championGroups(role='all',query=''){
 const q=query.trim().toLowerCase(),list=Object.entries(CHAMPIONS).filter(([key,c])=>!q||`${c.name} ${key}`.toLowerCase().includes(q));
 if(role==='all')return[{label:'',items:list}];
 return[{label:'주 역할군',items:list.filter(([,c])=>(c.roles||[c.role])[0]===role)},{label:'부 역할군',items:list.filter(([,c])=>(c.roles||[c.role])[0]!==role&&(c.roles||[]).slice(1).includes(role))}].filter(g=>g.items.length);
}
export function renderChampionGrid(root,{role='all',query='',selected,position,onSelect}){
 root.replaceChildren();for(const group of championGroups(role,query)){
  if(group.label){const title=document.createElement('h4');title.className='pick-role-heading';title.textContent=group.label;root.append(title);}
  for(const [key,c]of group.items){const recommended=c.recommendedPosition===position,b=document.createElement('button');b.className='champion-option'+(selected===key?' selected':'');b.dataset.key=key;b.setAttribute('aria-pressed',String(selected===key));b.setAttribute('aria-label',`${c.name} 선택${recommended?' · '+POSITIONS[position].name+' 추천':''}`);
   const canvas=document.createElement('canvas');canvas.width=canvas.height=120;const name=document.createElement('span');name.textContent=c.name;b.append(canvas,name);
   if(recommended){const badge=document.createElement('b');badge.className='champion-recommend';badge.textContent='추천';badge.title=POSITIONS[position].name+' 추천 챔피언';b.append(badge);}
   b.onclick=()=>onSelect(key);root.append(b);preview(canvas,{key,portrait:true});
  }
 }if(!root.children.length){const p=document.createElement('p');p.className='empty-note';p.textContent='검색 결과가 없습니다.';root.append(p);}
}
