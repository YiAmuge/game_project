export const LAYOUT_STORAGE='city-border-mobile-layout-v1';
export const CONTROL_PARTS=[['stick','#mobile-stick','이동'],['basic','#basic-btn','기본공격'],['q','#q-btn','전술기'],['r','#r-btn','궁극기'],['recall','#recall-btn','귀환'],['pings','#ping-controls','신호'],['map','#minimap','미니맵'],['shop','#shop-toggle','상점']];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function normalizeLayout(value){
 const positions={};for(const[key]of CONTROL_PARTS){const p=value?.positions?.[key];if(Number.isFinite(p?.x)&&Number.isFinite(p?.y))positions[key]={x:clamp(p.x,0,1),y:clamp(p.y,0,1)};}
 return{joystick:value?.joystick==='fixed'?'fixed':'floating',positions};
}
export function controlRect(position,width,height,viewport){const x=clamp(position.x*viewport.w,width/2+4,viewport.w-width/2-4),y=clamp(position.y*viewport.h,height/2+4,viewport.h-height/2-4);return{x:x-width/2,y:y-height/2,width,height};}
const properties=['position','left','top','right','bottom','transform'];
export class MobileLayout{
 constructor(enabled,cancel){
  this.enabled=enabled;this.cancel=cancel;try{this.settings=normalizeLayout(JSON.parse(localStorage.getItem(LAYOUT_STORAGE)));}catch{this.settings=normalizeLayout();}
  this.root=document.createElement('section');this.root.id='mobile-layout-editor';this.root.className='hidden';this.root.setAttribute('aria-label','모바일 조작법 커스텀');this.root.innerHTML='<div class="layout-tools"><strong>조작법 커스텀</strong><div class="layout-stick-modes" role="group" aria-label="이동 조이스틱"><button data-joystick="floating">이동식</button><button data-joystick="fixed">고정</button></div><p>원을 끌어 위치 변경 · 추가 공격 버튼은 기본공격을 따라갑니다.</p><div class="layout-actions"><button data-layout="reset">초기화</button><button data-layout="cancel">취소</button><button data-layout="save">저장</button></div></div>';document.body.append(this.root);
  for(const b of this.root.querySelectorAll('[data-joystick]'))b.onclick=()=>{this.draft.joystick=b.dataset.joystick;this.syncModes();};
  this.root.querySelector('[data-layout=reset]').onclick=()=>{this.draft=normalizeLayout();this.syncModes();this.placeProxies();};this.root.querySelector('[data-layout=cancel]').onclick=()=>this.close(false);this.root.querySelector('[data-layout=save]').onclick=()=>this.close(true);
  for(const b of this.root.querySelectorAll('.layout-tools button')){const action=b.onclick;b.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;e.preventDefault();b.setPointerCapture(e.pointerId);this.toolTouch={id:e.pointerId,button:b,x:e.clientX,y:e.clientY};});b.addEventListener('pointerup',e=>{const t=this.toolTouch;if(!t||t.id!==e.pointerId||t.button!==b)return;e.preventDefault();this.toolTouch=null;this.blockClick={button:b,until:performance.now()+500};if(Math.hypot(e.clientX-t.x,e.clientY-t.y)<=12)action(e);});b.addEventListener('click',e=>{if(this.blockClick?.button===b&&performance.now()<this.blockClick.until){e.preventDefault();e.stopImmediatePropagation();}},true);}
  this.root.addEventListener('pointermove',e=>this.drag(e));for(const type of['pointerup','pointercancel'])this.root.addEventListener(type,e=>{if(this.dragging?.id===e.pointerId){e.preventDefault();this.dragging=null;}});
  window.addEventListener('resize',()=>{this.apply();if(this.editing)this.placeProxies();});
 }
 clear(element){for(const p of properties)element.style.removeProperty(p);}
 applyPart(key){const part=CONTROL_PARTS.find(p=>p[0]===key),element=document.querySelector(part[1]);this.clear(element);const point=this.enabled()&&this.settings.positions[key];if(!point)return;const box=element.getBoundingClientRect(),r=controlRect(point,box.width,box.height,{w:innerWidth,h:innerHeight});this.position(element,r);}
 position(element,r){for(const[k,v]of Object.entries({position:'fixed',left:r.x+'px',top:r.y+'px',right:'auto',bottom:'auto',transform:'none'}))element.style.setProperty(k,v,'important');}
 apply(){for(const[key]of CONTROL_PARTS)this.applyPart(key);this.followShop();}
 followShop(){const feed=document.getElementById('event-feed');if(this.enabled()&&this.settings.positions.shop){const r=document.getElementById('shop-toggle').getBoundingClientRect();feed.style.setProperty('left',r.left+'px');feed.style.setProperty('top',r.bottom+6+'px');}else{feed.style.removeProperty('left');feed.style.removeProperty('top');}}
 floating(){return this.settings.joystick==='floating';}
 open(){
  if(!this.enabled())return;this.cancel();this.defaults={};
  for(const[key,selector]of CONTROL_PARTS){const e=document.querySelector(selector);this.clear(e);const r=e.getBoundingClientRect();this.defaults[key]={x:(r.x+r.width/2)/innerWidth,y:(r.y+r.height/2)/innerHeight,width:r.width,height:r.height};}
  this.apply();this.draft=normalizeLayout(this.settings);this.editing=true;this.root.classList.remove('hidden');document.body.classList.add('editing-controls');
  this.root.querySelectorAll('.layout-target').forEach(e=>e.remove());for(const[key,,label]of CONTROL_PARTS){const b=document.createElement('button');b.className='layout-target';b.dataset.control=key;b.textContent=label;b.setAttribute('aria-label',label+' 위치 이동');b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);const r=b.getBoundingClientRect();this.dragging={key,id:e.pointerId,x:e.clientX,y:e.clientY,cx:r.x+r.width/2,cy:r.y+r.height/2};};this.root.append(b);}this.syncModes();this.placeProxies();
 }
 syncModes(){for(const b of this.root.querySelectorAll('[data-joystick]')){const selected=b.dataset.joystick===this.draft.joystick;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));}}
 placeProxies(){for(const b of this.root.querySelectorAll('.layout-target')){const d=this.defaults[b.dataset.control],point=this.draft.positions[b.dataset.control]||d;this.position(b,controlRect(point,d.width,d.height,{w:innerWidth,h:innerHeight}));b.style.width=d.width+'px';b.style.height=d.height+'px';}}
 drag(e){const d=this.dragging;if(!d||e.pointerId!==d.id)return;e.preventDefault();const size=this.defaults[d.key],r=controlRect({x:(d.cx+e.clientX-d.x)/innerWidth,y:(d.cy+e.clientY-d.y)/innerHeight},size.width,size.height,{w:innerWidth,h:innerHeight});this.draft.positions[d.key]={x:(r.x+r.width/2)/innerWidth,y:(r.y+r.height/2)/innerHeight};this.placeProxies();}
 close(save){if(!this.editing)return;if(save){this.settings=normalizeLayout(this.draft);try{localStorage.setItem(LAYOUT_STORAGE,JSON.stringify(this.settings));}catch{}}this.editing=false;this.dragging=null;this.root.classList.add('hidden');document.body.classList.remove('editing-controls');this.apply();this.cancel();}
}
