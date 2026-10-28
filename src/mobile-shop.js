import{UPGRADES}from'./data.js';
import{unlocked,unlockedGroup}from'./augments.js';
export const defaultShopSection=p=>UPGRADES.every(u=>(p.upgrades[u.key]||0)>=u.max)?'augments':'upgrades';
export class MobileShop{
 constructor(root,onGroup=()=>{}){
  this.root=root;this.onGroup=onGroup;
  const tabs=document.createElement('nav');tabs.id='mobile-shop-tabs';tabs.setAttribute('aria-label','상점 메뉴');tabs.innerHTML=[['upgrades','강화시술'],['combat','전투'],['survival','생존'],['tech','기술']].map(([key,name])=>`<button data-section="${key}"${key==='upgrades'?'':` data-group="${key}"`}>${name}</button>`).join('');root.querySelector('#shop-tabs').before(tabs);for(const b of tabs.children)b.onclick=()=>this.select(b.dataset.section);
  const footer=document.createElement('footer');footer.id='mobile-shop-inventory';footer.setAttribute('aria-label','보유 재화와 증강');footer.innerHTML='<strong id="mobile-shop-gold"></strong><div id="mobile-shop-owned"></div>';root.append(footer);this.footer=footer;
  root.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});root.addEventListener('pointermove',e=>{if(this.pointer?.id===e.pointerId&&Math.hypot(e.clientX-this.pointer.x,e.clientY-this.pointer.y)>8)this.lastTap=null;});root.addEventListener('pointercancel',()=>{this.lastTap=null;});
 }
 activate(enabled){(enabled?this.footer.querySelector('#mobile-shop-owned'):this.root.querySelector('#detail-owned')).append(this.root.querySelector('#owned-list'));if(!enabled){this.root.dataset.mobileSection='augments';this.onGroup('all');}}
 open(p){this.lastTap=null;this.select(defaultShopSection(p)==='upgrades'?'upgrades':'combat');}
 select(section){const group=['combat','survival','tech'].includes(section)?section:'all';this.root.dataset.mobileSection=section==='upgrades'?'upgrades':'augments';this.root.dataset.mobileGroup=group;this.lastTap=null;for(const b of this.root.querySelectorAll('#mobile-shop-tabs button')){const active=b.dataset.section===section;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}this.onGroup(group);}
 doubleTap(key,event,now=performance.now()){if(event.pointerType!=='touch'&&!event.sourceCapabilities?.firesTouchEvents)return false;const twice=this.lastTap?.key===key&&now-this.lastTap.at<=350;this.lastTap=twice?null:{key,at:now};return twice;}
 update(p){if(this.root.classList.contains('hidden'))return;const gold='◈ '+Math.floor(p.gold),el=this.root.querySelector('#mobile-shop-gold');if(el.textContent!==gold)el.textContent=gold;for(const b of this.root.querySelectorAll('#mobile-shop-tabs [data-group]')){b.disabled=!unlockedGroup(p,b.dataset.group);b.classList.toggle('category-unlocked',unlocked(p,b.dataset.group));}}
}
