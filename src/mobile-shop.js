export class MobileShop{
 constructor(root){
  this.root=root;const tabs=document.createElement('nav');tabs.id='mobile-shop-tabs';tabs.setAttribute('aria-label','상점 메뉴');tabs.innerHTML=[['augments','증강'],['upgrades','강화 시술'],['inventory','보유 증강']].map(([key,name])=>`<button data-section="${key}">${name}</button>`).join('');root.querySelector('#shop-tabs').before(tabs);for(const b of tabs.children)b.onclick=()=>this.select(b.dataset.section);
  const owned=document.createElement('section');owned.id='mobile-owned-catalog';owned.innerHTML='<h3>보유 증강</h3>';root.querySelector('.shop-catalog').append(owned);this.owned=owned;
  const gold=document.createElement('strong');gold.id='mobile-shop-gold';root.querySelector('.shop-heading').append(gold);this.select('augments');
 }
 select(section){this.root.dataset.mobileSection=section;const inventory=section==='inventory';(inventory?this.owned:this.root.querySelector('#detail-owned')).append(this.root.querySelector('#owned-list'));for(const b of this.root.querySelectorAll('#mobile-shop-tabs button')){const active=b.dataset.section===section;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}}
 update(p){this.root.querySelector('#mobile-shop-gold').textContent='◈ '+Math.floor(p.gold);}
}
