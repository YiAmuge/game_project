import{has}from'./augments.js';
import*as Infiltration from'./infiltration.js';
export class RecallChoice{
 constructor(button,api){
  this.button=button;this.api=api;this.popup=document.createElement('div');this.popup.id='recall-choice';this.popup.className='hidden';this.popup.setAttribute('role','status');this.popup.innerHTML='<span data-choice="recall"><b>← 귀환</b><small>부활소로 이동</small></span><span data-choice="infiltration"><b>침투 →</b><small></small></span>';document.body.append(this.popup);
  window.addEventListener('pointerdown',e=>this.begin(e),true);window.addEventListener('pointermove',e=>this.move(e),true);window.addEventListener('pointerup',e=>this.end(e),true);window.addEventListener('pointercancel',e=>this.end(e,true),true);window.addEventListener('blur',()=>this.close());
  window.addEventListener('click',e=>{if(this.button.contains(e.target)&&e.detail>0&&performance.now()<(this.ignoreClickUntil||0)){e.preventDefault();e.stopImmediatePropagation();}},true);
 }
 available(){const g=this.api.game(),p=g.player;return this.api.allowed()&&has(p,'highRisk')&&!Infiltration.absent(p)&&!p.recall;}
 beginKey(x=innerWidth/2,y=innerHeight/2){
  if(!this.available())return false;const g=this.api.game();this.drag={key:true,x,y,game:g,owner:g.player.id};this.popup.style.left=Math.max(8,Math.min(innerWidth-248,x-120))+'px';this.popup.style.top=Math.max(8,Math.min(innerHeight-82,y-82))+'px';this.popup.classList.remove('hidden');this.paint();return true;
 }
 endKey(){const s=this.drag;if(!s?.key)return false;const valid=!s.cancel&&this.available()&&this.api.game()===s.game&&this.api.game().player.id===s.owner,mode=s.mode||'auto';this.close();if(valid)this.api.use(mode);return true;}
 begin(e){
  if(!this.available()||!this.button.contains(e.target)||e.button!==0&&e.pointerType!=='touch')return;e.preventDefault();e.stopImmediatePropagation();const g=this.api.game();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,game:g,owner:g.player.id};this.button.setPointerCapture(e.pointerId);this.ignoreClickUntil=Infinity;
  const box=this.button.getBoundingClientRect();this.popup.style.left=Math.max(8,Math.min(innerWidth-248,box.x+box.width/2-120))+'px';this.popup.style.top=Math.max(8,box.y-82)+'px';this.popup.classList.remove('hidden');this.paint();
 }
 move(e){const s=this.drag;if(!s||!s.key&&s.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const dx=e.clientX-s.x,dy=e.clientY-s.y;s.cancel=Math.abs(dy)>70&&Math.abs(dy)>Math.abs(dx);s.mode=dx>12?'infiltration':dx< -12?'recall':null;this.paint();}
 paint(){if(!this.drag)return;const g=this.api.game(),p=g.player,remaining=Math.max(0,(p.state.infiltrationReady||0)-g.time);for(const el of this.popup.children){el.classList.toggle('selected',!this.drag.cancel&&el.dataset.choice===this.drag.mode);el.classList.toggle('unavailable',el.dataset.choice==='infiltration'&&!Infiltration.ready(g,p));}this.popup.querySelector('[data-choice="infiltration"] small').textContent=remaining>0?Math.ceil(remaining)+'초 후 사용 가능':'위치 선택 후 이동';}
 end(e,cancel=false){const s=this.drag;if(!s||s.id!==e.pointerId)return;this.move(e);e.preventDefault();e.stopImmediatePropagation();const valid=!cancel&&!s.cancel&&this.available()&&this.api.game()===s.game&&this.api.game().player.id===s.owner,mode=s.mode||'recall';this.close();if(valid)this.api.use(mode);}
 close(){this.drag=null;this.ignoreClickUntil=performance.now()+700;this.popup.classList.add('hidden');}
 update(){if(this.drag){if(!this.available())this.close();else this.paint();}}
}
