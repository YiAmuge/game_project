import{championDescription}from'./champion-reference.js';
import{SKILL_SUMMARIES}from'./skill-summaries.js';
export function mobileSkillHelp(g,e,index,mode='summary'){
 const transformed=Boolean(e.key==='sora'&&g.buff(e,'soraEgo')||e.key==='yan'&&g.buff(e,'yanDistorted')),key=transformed?(e.key==='sora'?'soraEgo':'yanDistorted'):e.key,c=championDescription(e.key,transformed),[title,field]=[['passive','passiveText'],['basic','basicText'],['tactical','qText'],['ultimate','rText']][index];
 return{title:c[title]||'',text:(mode==='summary'?SKILL_SUMMARIES[key]?.[index]:null)??c[field]??''};
}
export class MobileScore{
 constructor(root,skills,game){
  this.root=root;this.game=game;
  const map=document.createElement('section');map.id='mobile-score-map';root.querySelector('#score-map').before(map);map.append(root.querySelector('#score-map'),root.querySelector('#camp-timers'));
  this.panels={map,scores:root.querySelector('.score-scroll'),champion:skills};
  const tabs=document.createElement('nav');tabs.id='mobile-score-tabs';tabs.setAttribute('aria-label','전장 현황 카테고리');
  for(const[key,label]of[['map','미니맵'],['scores','점수창'],['champion','챔피언 설명']]){const b=document.createElement('button');b.dataset.page=key;b.textContent=label;b.onclick=()=>this.select(key);tabs.append(b);}
  root.append(tabs);this.select('map');
 }
 select(page){
  this.root.dataset.mobilePage=page;
  for(const b of this.root.querySelectorAll('#mobile-score-tabs button')){const active=b.dataset.page===page;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}
  this.fit();
 }
 fit(){
  if(this.root.dataset.mobilePage!=='map'||!document.body.classList.contains('mobile-ui')||this.root.classList.contains('hidden'))return;
  const panel=this.panels.map,map=panel.querySelector('canvas'),timers=panel.querySelector('#camp-timers'),g=this.game(),ratio=g.bounds.w/g.bounds.h,availableW=Math.max(1,panel.clientWidth-2),availableH=Math.max(1,panel.clientHeight-timers.offsetHeight-8),width=Math.min(availableW,availableH*ratio),height=width/ratio,dpr=Math.min(2,devicePixelRatio||1);
  map.style.width=width+'px';map.style.height=height+'px';
  for(const[key,size]of[['width',width],['height',height]])if(map[key]!==Math.round(size*dpr))map[key]=Math.round(size*dpr);
 }
}
