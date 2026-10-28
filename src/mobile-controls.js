import{mobileAutoAim,mobileManualAim,mobileAttackTargets,attackCategory,ATTACK_CATEGORIES,rememberManualAim}from'./mobile-aim.js';
import{gestureMode,targetButtonPositions}from'./mobile-gestures.js';
import{installTouchScroll}from'./touch-scroll.js';
import{targetIcon,pingIcon}from'./mobile-icons.js';
import{MobileShell}from'./mobile-shell.js';
import{MobileShop}from'./mobile-shop.js';
import{MobileStatus}from'./mobile-status.js';
import{skillCharges,canRecast}from'./skills.js';
import{distorted,command as commandHand}from'./yan.js';
import*as Infiltration from'./infiltration.js';
import{championDescription}from'./champion-reference.js';

const $=id=>document.getElementById(id);
const AUTO_HOLD=new Set(['jamila','ryoshu','heathcliff','rudolph']);
export class MobileControls{
 constructor(api){
  this.api=api;this.axes={x:0,y:0};this.gestures=new Map();this.lastTap=-Infinity;this.enabled=false;this.force=null;this.skillTab=0;
  this.scroll=installTouchScroll(()=>this.enabled);
  const root=document.createElement('div');root.id='mobile-controls';root.innerHTML='<div id="mobile-stick" role="group" aria-label="이동 조이스틱"><i></i></div><div id="mobile-cancel" aria-hidden="true">×</div><div id="mobile-status" aria-label="효과와 증강 상태"></div>';document.body.append(root);
  this.status=new MobileStatus($('mobile-status'));
  for(const[kind,label]of Object.entries(ATTACK_CATEGORIES)){const b=document.createElement('button');b.className='mobile-target-btn hidden';b.dataset.targetKind=kind;b.setAttribute('aria-label',label+' 우선 기본공격');b.title=label+' 우선 기본공격';b.innerHTML=targetIcon(kind);root.append(b);this.listen(b,'basic',kind);b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();},true);}
  for(const b of $('ping-controls').querySelectorAll('button')){b.setAttribute('aria-label',{attack:'공격 신호',defend:'도움 신호',danger:'후퇴 신호'}[b.dataset.ping]);b.insertAdjacentHTML('beforeend',pingIcon(b.dataset.ping));}
  const rotate=document.createElement('div');rotate.id='mobile-rotate';rotate.innerHTML='<b>↻</b><strong>휴대폰을 가로로 돌려 주세요.</strong>';document.body.append(rotate);
  const skills=document.createElement('section');skills.id='mobile-score-skills';skills.innerHTML='<nav aria-label="내 챔피언 기술">'+['패시브','기본공격','전술기','궁극기'].map((s,i)=>`<button data-slot="${i}">${s}</button>`).join('')+'</nav><strong></strong><p></p>';$('scoreboard').append(skills);for(const b of skills.querySelectorAll('button'))b.onclick=()=>{this.skillTab=Number(b.dataset.slot);this.updateSkillHelp();};
  this.listen($('mobile-stick'),'move');for(const[slot,id]of[['basic','basic-btn'],['q','q-btn'],['r','r-btn']]){
   const button=$(id);this.listen(button,slot);const charge=document.createElement('b');charge.className='mobile-charges';button.append(charge);button.addEventListener('click',e=>{if(this.enabled){e.preventDefault();e.stopImmediatePropagation();}},true);
  }
  $('minimap').addEventListener('pointerdown',e=>{if(!this.enabled||e.pointerType!=='touch'||!this.api.playing())return;e.preventDefault();e.stopImmediatePropagation();$('minimap').setPointerCapture(e.pointerId);this.gestures.set(e.pointerId,{slot:'map'});this.api.score(true);this.fitMap();this.updateSkillHelp();},true);
  window.addEventListener('pointermove',e=>this.move(e),true);window.addEventListener('pointerup',e=>this.end(e),true);window.addEventListener('pointercancel',e=>this.end(e,true),true);window.addEventListener('blur',()=>this.cancel());window.addEventListener('resize',()=>this.refreshMode());
  this.refreshMode();
  this.shell=new MobileShell({enabled:()=>this.enabled,playing:()=>this.api.playing(),back:()=>this.api.back()});
  this.shop=new MobileShop($('shop'));
 }
 refreshMode(){const was=this.enabled;this.enabled=this.force??(matchMedia('(pointer:coarse)').matches&&navigator.maxTouchPoints>0);if(was&&!this.enabled)this.shop?.select('augments');this.api.game().mobileInput=this.enabled;document.body.classList.toggle('mobile-ui',this.enabled);const blocked=this.enabled&&innerHeight>innerWidth&&this.api.playing();document.body.classList.toggle('mobile-portrait',blocked);if(blocked&&!this.blocking)this.cancel();this.blocking=blocked;}
 start(){this.cancel();this.refreshMode();if(!this.enabled)return;this.api.game().player.mobileMoveFacing=0;this.shell.arm();this.shell.fullscreen();}
 listen(button,slot,category){button.addEventListener('pointerdown',e=>{
  if(!this.enabled||e.pointerType!=='touch')return;e.preventDefault();e.stopImmediatePropagation();if(!this.api.allowed())return;
  button.setPointerCapture(e.pointerId);const g=this.api.game(),p=g.player,box=button.getBoundingClientRect(),gesture={slot,category,id:e.pointerId,at:performance.now(),cx:box.x+box.width/2,cy:box.y+box.height/2,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,manual:false,started:false,owner:p.id,game:g};this.gestures.set(e.pointerId,gesture);this.api.takeAim();
  if(slot==='move'){this.stick=gesture;this.move(e);return;}
  gesture.autoTarget=mobileAutoAim(g,p,slot,{category,movement:this.axes}).target?.id;
  if(Infiltration.selecting(p)&&slot==='q'){g.input.precision=true;gesture.precision=true;}
  else if(this.chargeGesture(gesture,p))this.aim(gesture);
 },true);}
 move(e){const s=this.gestures.get(e.pointerId);if(!s)return;e.preventDefault();if(s.slot==='map')return;s.x=e.clientX;s.y=e.clientY;
  if(s.slot==='move'){const dx=s.x-s.cx,dy=s.y-s.cy,n=Math.hypot(dx,dy),scale=Math.min(1,n/44);this.axes={x:n>7?dx/(n||1)*scale:0,y:n>7?dy/(n||1)*scale:0};if(n>7)this.api.game().player.mobileMoveDirection={x:dx/n,y:dy/n};$('mobile-stick').style.setProperty('--stick-x',Math.max(-44,Math.min(44,dx))+'px');$('mobile-stick').style.setProperty('--stick-y',Math.max(-44,Math.min(44,dy))+'px');return;}
  if(s.precision)return;this.updateGesture(s);if(s.manual||s.autoLocked||this.chargeGesture(s,this.api.game().player))this.aim(s);
 }
 updateGesture(s){const p=this.api.game().player,charge=this.chargeGesture(s,p),continuous=charge||s.slot==='basic'&&(AUTO_HOLD.has(p.key)||distorted(this.api.game(),p));const mode=gestureMode(s,performance.now(),continuous,charge);s.manual=mode==='manual';return mode;}
 autoAim(s){const g=this.api.game(),auto=mobileAutoAim(g,g.player,s.slot,{category:s.category,targetId:s.autoTarget,movement:this.axes});s.autoTarget=auto.target?.id;return auto;}
 aim(s){
  const g=this.api.game(),p=g.player;if(!this.api.allowed()||s.owner!==p.id||s.game!==g)return;
  const dx=s.x-s.cx,dy=s.y-s.cy;s.point=s.manual?mobileManualAim(g,p,s.slot,dx,dy,this.api.camera()):this.autoAim(s).point;g.input.aim=s.point;g.mobileAim={slot:s.slot,point:s.point,autoTarget:s.manual?undefined:s.autoTarget};
  const rect=$('mobile-cancel').getBoundingClientRect();s.cancel=s.manual&&s.x>=rect.left&&s.x<=rect.right&&s.y>=rect.top&&s.y<=rect.bottom;document.body.classList.add('mobile-aiming');document.body.classList.toggle('mobile-canceling',Boolean(s.cancel));
  if(s.cancel){g.input.fire=false;return;}
  // A held button remains queued when an automatic discharge/cancel ends a charge.
  if(this.chargeGesture(s,p)&&s.started){const active=s.slot==='q'?(p.key==='don'?p.state.donCharge:p.state.chargeAt!==undefined):(p.key==='yan'?p.state.yanCharge:p.state.hohenCharge);if(!active)s.started=false;}
  if(!s.started){if(s.slot==='basic'&&['yan','hohenheim'].includes(p.key)&&!distorted(g,p)){s.beganBasic=g.attack(p,s.point);s.started=Boolean(s.beganBasic);}else if(this.api.chargeTactical(p)&&s.slot==='q'){if(p.qCd<=0)s.started=Boolean(this.api.skill('q',{point:s.point,confirm:true}));}else s.started=true;}
  if(s.slot==='basic'&&distorted(g,p)){g.attack(p,s.point);s.handMoved=true;}if(!s.autoHeld)g.input.fire=false;
 }
 end(e,canceled=false){const s=this.gestures.get(e.pointerId);if(!s){if(this.enabled&&this.api.playing()&&!canceled&&e.pointerType==='touch'&&!e.isPrimary){const b=e.target.closest?.('button');if(b&&!b.disabled&&!b.closest('#ping-controls')&&!b.classList.contains('ability')&&!this.scroll.isChoice(b)){e.preventDefault();b.click();}}return;}e.preventDefault();e.stopImmediatePropagation();this.gestures.delete(e.pointerId);const g=this.api.game(),p=g.player;
  if(s.slot==='map'){this.api.score(false);return;}if(s.slot==='move'){this.axes={x:0,y:0};$('mobile-stick').style.setProperty('--stick-x','0px');$('mobile-stick').style.setProperty('--stick-y','0px');return;}
  g.input.fire=false;if(s.precision){g.input.precision=false;return;}
  if(canceled||s.cancel||!this.api.allowed()||s.owner!==p.id||s.game!==g){this.api.cancelCharge(p);this.finishAim(g);return;}
  if(Infiltration.selecting(p)&&s.slot==='basic'){this.api.confirm();this.finishAim(g);return;}
  if(s.autoHeld&&!s.manual){this.finishAim(g);return;}
  const auto=this.autoAim(s);if(!s.manual&&auto.unavailable){this.api.cancelCharge(p);this.finishAim(g);return;}const point=s.manual?(s.point||auto.point):auto.point;g.input.aim=point;this.api.takeAim();
  if(s.manual)rememberManualAim(p,s.slot,point);
  if(s.slot==='basic'){
   if(distorted(g,p)&&!s.manual){const now=performance.now();if(now-this.lastTap<280&&p.alive&&!g.stat(p,'stun')&&!g.stat(p,'disarm')&&!g.hidden(p))commandHand(g,p,p);else g.attack(p,point);this.lastTap=now;}
   else{if(!s.beganBasic&&!s.handMoved)g.attack(p,point);this.api.releaseBasic(g,p,point);}
  }else if(s.slot==='q'&&this.api.chargeTactical(p)){if(!s.started&&p.qCd<=0)this.api.skill('q',{point,confirm:true});this.api.releaseTactical(g,p,point);}
  else this.api.skill(s.slot,{point,confirm:true});
  this.finishAim(g);
 }
 finishAim(g){delete g.mobileAim;document.body.classList.remove('mobile-aiming','mobile-canceling');}
 cancel(){this.axes={x:0,y:0};const g=this.api.game();g.input.fire=false;g.input.precision=false;this.api.cancelCharge(g.player);delete g.mobileAim;this.gestures.clear();if($('mobile-stick')){$('mobile-stick').style.setProperty('--stick-x','0px');$('mobile-stick').style.setProperty('--stick-y','0px');}document.body.classList.remove('mobile-aiming','mobile-canceling');}
 holdAttack(s){
  const g=this.api.game(),p=g.player;if(!this.api.allowed()||s.owner!==p.id||s.game!==g){g.input.fire=false;return;}
  s.autoHeld=true;const auto=this.autoAim(s);g.input.fire=Boolean(auto.target||auto.manualFallback);
  if(g.input.fire){g.input.aim=auto.point;g.mobileAim={slot:'basic',point:g.input.aim,autoTarget:auto.target?.id};this.api.takeAim();}else delete g.mobileAim;
 }
 chargeGesture(s,p){return s.slot==='basic'&&['yan','hohenheim'].includes(p.key)&&!distorted(this.api.game(),p)||s.slot==='q'&&this.api.chargeTactical(p);}
 tick(){this.refreshMode();if(!this.enabled||this.blocking)return;for(const s of this.gestures.values())if(!['map','move'].includes(s.slot)&&!s.precision){const mode=this.updateGesture(s);if(this.chargeGesture(s,this.api.game().player)){this.aim(s);continue;}if(mode==='tap')continue;if(s.slot==='basic'&&AUTO_HOLD.has(this.api.game().player.key)&&!s.manual){this.holdAttack(s);continue;}this.aim(s);}}
 fitMap(){const map=$('score-map'),g=this.api.game(),ratio=g.bounds.w/g.bounds.h,width=Math.max(1,Math.min($('scoreboard').clientWidth-28,innerHeight*.36*ratio)),height=width/ratio,dpr=Math.min(2,devicePixelRatio||1);map.style.width=width+'px';map.style.height=height+'px';for(const[k,n]of[['width',width],['height',height]])if(map[k]!==Math.round(n*dpr))map[k]=Math.round(n*dpr);}
 updateSkillHelp(){const g=this.api.game(),c=championDescription(g.player.key,distorted(g,g.player)||g.buff(g.player,'soraEgo')),fields=[['passive','passiveText'],['basic','basicText'],['tactical','qText'],['ultimate','rText']],slot=fields[this.skillTab];$('mobile-score-skills').querySelector('strong').textContent=c[slot[0]]||'';$('mobile-score-skills').querySelector('p').textContent=c[slot[1]]||'';for(const b of $('mobile-score-skills').querySelectorAll('button'))b.classList.toggle('selected',Number(b.dataset.slot)===this.skillTab);}
 hud(){if(!this.enabled)return;const g=this.api.game(),p=g.player;this.shop?.update(p);for(const id of['basic-btn','q-btn','r-btn'])$(id).setAttribute('aria-label',$(id).querySelector('span').textContent);const kinds=new Set(mobileAttackTargets(g,p).map(attackCategory)),visibleKinds=Object.keys(ATTACK_CATEGORIES).filter(kind=>kinds.has(kind)),positions=targetButtonPositions($('basic-btn').getBoundingClientRect(),visibleKinds);for(const b of document.querySelectorAll('.mobile-target-btn')){b.classList.toggle('hidden',!p.alive||Infiltration.absent(p)||!this.api.allowed()||!kinds.has(b.dataset.targetKind));const pos=positions.find(v=>v.kind===b.dataset.targetKind);if(pos){b.style.left=pos.x-18+'px';b.style.top=pos.y-18+'px';}}for(const slot of['q','r']){const b=$(slot+'-btn'),charges=skillCharges(g,p,slot),recast=p.alive&&!Infiltration.absent(p)&&Boolean(canRecast(g,p,slot));b.querySelector('.mobile-charges').textContent=charges?String(charges.current):'';b.dataset.skill=slot;b.classList.toggle('mobile-recast',recast);if(recast)b.setAttribute('aria-label',b.getAttribute('aria-label')+' · 재시전 가능');}
  this.status.update(g,p);
  if(this.api.scoreOpen()){this.fitMap();this.updateSkillHelp();}
 }
}
