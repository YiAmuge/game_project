import * as Training from './training.js';
import * as Sora from './sora.js';
import * as Yan from './yan.js';
import { skillTargeting, castPoint } from './targeting.js';
import { AUGMENTS, AUGMENT_RULES, unlocked, has } from './augments.js';
import { canRecast } from './skills.js';
import { Game } from './game.js';
import { CHAMPIONS, EXPERIMENTAL_CHAMPIONS, RUNTIME_CHAMPIONS, RULES, UPGRADES, POSITIONS, WORLD } from './data.js';
import { Renderer } from './render.js';
import { portrait } from './art.js';
import { dragChoice, DRAG_KEYS, EZRA_WEAPONS } from './skills.js';
import { MONSTERS, GAME_RULES, BUFF_LABELS } from './catalog.js';

const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clock=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const roleName=role=>role;
let selected='faust',position='bottom',game=new Game(selected,position),mode='menu',paused=false,speed=1;
let deployment='match',globalKind='ultimate',shopTab='supply';
let keys=new Set(),last=0,accumulator=0,lastHud=0,roster=[],activeRecord=2,category='champions',toastTimer,pointer=null,drag=null,globalTarget=false,globalPoint=null,scoreOpen=false,shopSelection=null;
const renderer=new Renderer($('arena'));
new ResizeObserver(()=>renderer.resize()).observe($('arena'));
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),2600);}
function inMatch(){return mode==='playing'||mode==='result';}
function modalOpen(){return Boolean(document.querySelector('dialog[open]'));}
function active(){return mode==='playing'&&!paused&&!modalOpen()&&game.winner===null;}
function clearInput(){Yan.cancelCharge(game.player);delete game.targeting;keys.clear();game.input.fire=false;game.input.x=0;game.input.y=0;}
function cancelDrag(){drag=null;$('drag-wheel').classList.add('hidden');}
function cancelGlobal(){globalKind='ultimate';globalTarget=false;globalPoint=null;$('global-target').classList.add('hidden');}
function showScore(show){scoreOpen=show&&inMatch();$('scoreboard').classList.toggle('hidden',!scoreOpen);if(scoreOpen){Yan.cancelCharge(game.player);game.input.fire=false;updateScores();}}
function renderPortraits(){document.querySelectorAll('.champion-portrait').forEach(c=>portrait(c,c.dataset.key,renderer.atlas,renderer.atlasExtra,renderer.atlasV05,renderer.atlasV06,renderer.atlasV08,renderer.atlasV10,renderer.atlasV12,renderer.atlasV13,renderer.atlasV17));portrait($('hud-face'),Sora.ego(game,game.player)?'soraEgo':Yan.form(game,game.player),renderer.atlas,renderer.atlasExtra,renderer.atlasV05,renderer.atlasV06,renderer.atlasV08,renderer.atlasV10,renderer.atlasV12,renderer.atlasV13,renderer.atlasV17);}
renderer.atlas.addEventListener('load',renderPortraits);renderer.atlasExtra.addEventListener('load',renderPortraits);renderer.atlasV05.addEventListener('load',renderPortraits);renderer.atlasV06.addEventListener('load',renderPortraits);renderer.atlasV08.addEventListener('load',renderPortraits);renderer.atlasV10.addEventListener('load',renderPortraits);renderer.atlasV12.addEventListener('load',renderPortraits);renderer.atlasV13.addEventListener('load',renderPortraits);renderer.atlasV17.addEventListener('load',renderPortraits);
function select(key){
 selected=key;game=new Game(key,position);const c=RUNTIME_CHAMPIONS[key];
 document.querySelectorAll('.champion-option').forEach(b=>{const chosen=b.dataset.key===key;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',chosen);b.classList.toggle('recommended',POSITIONS[position].recommend.includes(CHAMPIONS[b.dataset.key].role));});
 $('selected-name').textContent=c.name;$('selected-role').textContent=roleName(c.role);$('selected-brief').textContent=c.brief;
 $('selected-stats').innerHTML=[['전투력',c.power],['체력',c.health],['기동성',c.speed]].map(([name,n])=>`<span>${name}<b>${'●'.repeat(n)}${'○'.repeat(5-n)}</b></span>`).join('');
 renderPortraits();updateHud();
}
for(const [key,c] of Object.entries(CHAMPIONS)){
 const b=document.createElement('button');b.className='champion-option';b.dataset.key=key;b.setAttribute('aria-label',`${c.name} 선택`);
 b.innerHTML=`<canvas class="champion-portrait" data-key="${key}" width="80" height="80"></canvas><small>${c.name}</small><em>${roleName(c.role)}</em>`;b.onclick=()=>select(key);$('champion-select').append(b);
}
function setPosition(key){position=key;document.querySelectorAll('.position-option').forEach(b=>{b.classList.toggle('selected',b.dataset.position===key);b.setAttribute('aria-pressed',b.dataset.position===key);});$('position-description').textContent=POSITIONS[key].description;select(selected);}
for(const [key,p] of Object.entries(POSITIONS)){
 const b=document.createElement('button');b.className='position-option';b.dataset.position=key;b.innerHTML=`<b>${p.name}</b><small>${p.recommend.map(roleName).join(' · ')} 추천</small>`;b.onclick=()=>setPosition(key);$('position-select').append(b);
}
function resetView(){clearInput();cancelDrag();cancelGlobal();showScore(false);clearTimeout(toastTimer);$('toast').classList.add('hidden');paused=false;document.body.classList.remove('in-game');for(const id of ['result','pause-banner','shop','minimap','buff-tray','score-toggle'])$(id).classList.add('hidden');$('pause').disabled=true;$('lobby').classList.remove('hidden');pointer=null;}
function mainMenu(){deployment='match';mode='menu';resetView();document.body.classList.remove('practice-screen');$('main-menu').classList.remove('hidden');$('practice-panel').classList.add('hidden');if(!CHAMPIONS[selected])selected='faust';select(selected);}
function showPractice(kind='match'){deployment=kind;mode='practice';resetView();document.body.classList.add('practice-screen');$('main-menu').classList.add('hidden');$('practice-panel').classList.remove('hidden');if(!CHAMPIONS[selected])selected='faust';setPosition(position);document.body.classList.toggle('training-selection',kind==='training');$('practice-panel').querySelector('h2').textContent=kind==='training'?'연습할 챔피언을 선택하세요.':'포지션과 전투원을 선택하세요.';$('start').innerHTML=kind==='training'?'연습장 입장 <span>→</span>':'연습전 시작 <span>→</span>';$('practice-panel').querySelector('.deploy-note').textContent=kind==='training'?'AI 대전 없이 다섯 구역에서 자유롭게 연습 · G 무료 상점':'탑 1 · 정글 1 · 바텀 1 · 서포터 1 / 추천 역할군과 관계없이 선택 가능';}
function start(){
 game=new Game(selected,position,{mode:deployment});mode='playing';paused=false;accumulator=0;speed=1;clearInput();cancelDrag();cancelGlobal();showScore(false);
 document.body.classList.remove('practice-screen');document.body.classList.add('in-game');
 for(const id of ['minimap','buff-tray','score-toggle'])$(id).classList.remove('hidden');
 pointer=null;game.input.aim={x:game.player.x+5,y:game.player.y};$('lobby').classList.add('hidden');$('result').classList.add('hidden');$('pause-banner').classList.add('hidden');$('pause').disabled=false;$('pause').textContent='Ⅱ';$('speed').textContent='1×';$('arena').focus();updateHud();
}
function togglePause(){if(mode!=='playing'||game.winner!==null)return;paused=!paused;clearInput();cancelDrag();cancelGlobal();showScore(false);$('pause-banner').classList.toggle('hidden',!paused);$('pause').textContent=paused?'▶':'Ⅱ';}
function skill(slot,options={}){
 if(!active()||scoreOpen)return false;
 const p=game.player;if(game.training)Training.refreshOptions(game);
 if(slot==='r'&&p.key==='rudolph'&&!options.confirmGlobal){
  if(!p.alive||p.rCd>0||p.ammo<=0||game.stat(p,'silence')||game.stat(p,'stun')){toast('궁극기를 사용할 수 없습니다.');return false;}
  clearInput();cancelDrag();globalKind='ultimate';$('global-title').textContent='정신 분쇄 · 지도를 좌클릭하여 위치 확정';$('global-description').textContent='선택 전에는 궁극기와 정신력을 소모하지 않습니다.';globalTarget=true;globalPoint=null;$('global-target').classList.remove('hidden');return true;
 }
 if(slot==='q'&&DRAG_KEYS.includes(p.key)&&!options.direction){toast(p.key==='moses'?'우클릭을 누르고 상하좌우로 드래그하세요.':'우클릭을 누르고 좌우로 드래그하세요.');return false;}
 const target=options.point||game.input.aim;
 const spec=skillTargeting(game,p,slot);
 if(!options.confirm&&spec.confirm&&spec.kind!=='global'){
  if(!p.alive||p.motion||game.hidden(p)||game.stat(p,'stun')||game.stat(p,'silence')&&!(p.key==='meursault'&&slot==='q')||p.channelUntil>game.time||p[slot+'Cd']>0&&!canRecast(game,p,slot)){toast('지금은 이 스킬을 준비할 수 없습니다.');return false;}
  Yan.cancelCharge(p);game.input.fire=false;game.targeting={slot,options};toast('사거리 표시 · 좌클릭으로 시전 · 우클릭 / Esc 취소');return true;
 }
 const casted=game.cast(p,slot,target,options);if(casted)delete game.targeting;if(!casted)toast('재사용 대기·대상·군중제어 조건을 확인하세요.');updateHud();return casted;
}
$('practice-open').onclick=()=>showPractice();$('training-open').onclick=()=>showPractice('training');$('practice-back').onclick=mainMenu;$('start').onclick=start;
$('pause').onclick=togglePause;$('resume').onclick=togglePause;$('restart').onclick=()=>showPractice(deployment);$('leave').onclick=()=>showPractice(deployment);
$('home').onclick=e=>{e.preventDefault();mainMenu();};$('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;$('speed').textContent=`${speed}×`;};
$('q-btn').onclick=()=>skill('q');$('r-btn').onclick=()=>skill('r');$('basic-btn').onclick=e=>{if(active()&&!globalTarget&&!scoreOpen){if(game.player.key==='yan'&&!game.targeting){if(e.detail===0){game.attack(game.player,game.input.aim);Yan.release(game,game.player,game.input.aim);}return;}confirmOrAttack();}};
$('basic-btn').addEventListener('pointerdown',e=>{if(e.button===0&&active()&&!globalTarget&&!scoreOpen&&!game.targeting&&game.player.key==='yan'){game.input.fire=true;game.attack(game.player,game.input.aim);}});
$('recall-btn').onclick=()=>{if(active()){clearInput();if(!game.recall(game.player))toast('지금은 귀환할 수 없습니다.');}};
function confirmOrAttack(){if(game.targeting){const {slot,options}=game.targeting;const point=castPoint(game.player,game.input.aim,skillTargeting(game,game.player,slot));if(skill(slot,{...options,point,confirm:true}))delete game.targeting;game.input.fire=false;return;}if(game.player.key==='heathcliff'&&game.player.state.chargeAt!==undefined){skill('q',{confirm:true});game.input.fire=false;return;}game.attack(game.player,game.input.aim);}
function toggleShop(){if(!$('shop').classList.contains('hidden')){$('shop').classList.add('hidden');return;}if(!active()||!game.canUpgrade(game.player)){toast('부활 대기 중 또는 아군 부활소의 비전투 상태에서 G를 누르세요.');return;}clearInput();shopSelection=null;setShopTab('supply');$('shop').classList.remove('hidden');updateHud();}
$('shop-toggle').onclick=toggleShop;$('shop-close').onclick=()=>$('shop').classList.add('hidden');
let shopBusyUntil=0;
function shopAction(action){
 if(!active()||performance.now()<shopBusyUntil)return;
 if(action()){shopBusyUntil=performance.now()+250;updateHud();}
}
for(const item of UPGRADES){
 const wrap=document.createElement('div');wrap.className='upgrade-card';
 const row=document.createElement('div');row.className='shop-item shop-option';
 const info=document.createElement('span');info.id='upgrade-info-'+item.key;info.innerHTML=`<strong>${item.name}</strong><small id="upgrade-state-${item.key}"></small>`;
 const buy=document.createElement('button');buy.id='buy-'+item.key;buy.className='shop-buy';buy.setAttribute('aria-label',item.name+' 구매');buy.onclick=()=>shopAction(()=>{const ok=game.buy(game.player,item.key);if(ok)toast(item.name+' 강화 완료');return ok;});
 row.append(info,buy);wrap.append(row);const meter=document.createElement('div');meter.className='upgrade-meter';meter.id='upgrade-meter-'+item.key;meter.setAttribute('aria-label',item.name+' 구매 단계');for(let i=0;i<item.max;i++)meter.append(document.createElement('i'));wrap.append(meter);$('upgrade-list').append(wrap);
}
for(const item of AUGMENTS){
 const row=document.createElement('div');row.className='shop-item shop-option augment-item';row.id='augment-row-'+item.key;
 const info=document.createElement('button');info.id='select-augment-'+item.key;info.className='shop-info';info.innerHTML=`<strong>${item.name}</strong><small>${item.text}</small><small id="augment-state-${item.key}"></small>`;info.onclick=()=>{if(has(game.player,item.key)){shopSelection={kind:'augment',key:item.key};updateHud();}};
 const buy=document.createElement('button');buy.id='augment-'+item.key;buy.className='shop-buy';buy.setAttribute('aria-label',item.name+' 구매');buy.onclick=()=>shopAction(()=>{const ok=game.buyAugment(game.player,item.key);if(ok)toast(item.name+' 선택 완료');return ok;});row.append(info,buy);$('augment-list').append(row);
}
$('shop-sell').onclick=()=>shopAction(()=>{if(!shopSelection)return false;const ok=game.sellAugment(game.player,shopSelection.key);if(ok){toast('판매 완료');shopSelection=null;}return ok;});
function setShopTab(tab){
 shopTab=game.training?tab:'supply';$('shop-supply').classList.toggle('hidden',shopTab!=='supply');$('training-options').classList.toggle('hidden',shopTab!=='training');
 $('shop-supply-tab').setAttribute('aria-pressed',shopTab==='supply');$('shop-training-tab').setAttribute('aria-pressed',shopTab==='training');
}
$('shop-supply-tab').onclick=()=>setShopTab('supply');$('shop-training-tab').onclick=()=>setShopTab('training');
for(const [id,key] of [['training-invincible','invincible'],['training-no-cooldown','noCooldown'],['training-infinite-ammo','infiniteAmmo']])$(id).onchange=()=>{if(game.training){game.practice[key]=$(id).checked;Training.refreshOptions(game);updateHud();}};
$('training-life').onclick=()=>{if(active()&&Training.deathOrRespawn(game)){clearInput();updateHud();}};
$('training-reset-lane').onclick=()=>{if(active()&&Training.resetLane(game)){toast('미니언과 포탑을 초기화했습니다. 3초 후 첫 웨이브가 출발합니다.');updateHud();}};
$('training-sell-all').onclick=()=>shopAction(()=>{const ok=Training.sellAll(game);if(ok){shopSelection=null;toast('모든 증강과 업그레이드를 판매했습니다.');}return ok;});
$('training-teleport').onclick=()=>{
 if(!active()||!game.training||!game.player.alive)return;
 clearInput();cancelDrag();showScore(false);$('shop').classList.add('hidden');globalKind='teleport';globalTarget=true;globalPoint=null;
 $('global-title').textContent='해당 지점으로 이동 · 지도를 좌클릭하여 확정';$('global-description').textContent='벽·건물·개체와 겹치지 않는 위치를 선택하세요. 우측 상단 취소 또는 Esc로 닫습니다.';$('global-target').classList.remove('hidden');
};
for(const [key,c] of Object.entries(RUNTIME_CHAMPIONS)){const option=document.createElement('option');option.value=key;option.textContent=c.name+(CHAMPIONS[key]?'':' (실험)');$('training-champion').append(option);}
$('training-change-champion').onclick=()=>{
 if(!active())return;const key=$('training-champion').value;if(Training.changeChampion(game,key)){selected=key;clearInput();cancelDrag();shopSelection=null;renderPortraits();updateHud();toast(RUNTIME_CHAMPIONS[key].name+'으로 변경했습니다.');}
};
function updateTrainingOptions(){
 if(!game.training)return;
 for(const [id,key] of [['training-invincible','invincible'],['training-no-cooldown','noCooldown'],['training-infinite-ammo','infiniteAmmo']])$(id).checked=game.practice[key];
 $('training-life').textContent=game.player.alive?'즉시 사망':'즉시 부활';$('training-teleport').disabled=!game.player.alive;
 if(document.activeElement!==$('training-champion')&&$('training-champion').dataset.player!==game.player.key){$('training-champion').value=game.player.key;$('training-champion').dataset.player=game.player.key;}
}
function updateShopCards(p){
 const available=active()&&game.canUpgrade(p),busy=performance.now()<shopBusyUntil;
 for(const item of UPGRADES){
  const n=p.upgrades[item.key],cost=game.training?0:RULES.costs[n],b=$('buy-'+item.key);
  $('upgrade-state-'+item.key).textContent=`${item.effect} / 단계 · ${n} / ${item.max}`;
  b.textContent=n>=item.max?'완료':`구매 ${cost} ◈`;b.disabled=!available||busy||n>=item.max||p.gold<cost;
  [...$('upgrade-meter-'+item.key).children].forEach((bar,i)=>bar.classList.toggle('filled',i<n));
 }
 for(const item of AUGMENTS){
  const owned=has(p,item.key),gate=unlocked(p,item.group),b=$('augment-'+item.key),label={combat:'전투 3단계',survival:'체력 3단계',tech:'이동·장전·가속 합계 3단계'}[item.group];
  $('augment-row-'+item.key).classList.toggle('equipped',owned);
  $('select-augment-'+item.key).classList.toggle('selected',shopSelection?.key===item.key);
  $('augment-state-'+item.key).textContent=owned?'보유 · 선택 후 판매':gate?'선택 조건 충족':label+' 필요';
  b.textContent=owned?'보유':game.training?'무료 구매':'구매 500 ◈';b.disabled=owned||!available||busy||!gate||!game.training&&p.gold<AUGMENT_RULES.cost||p.augments.length>=AUGMENT_RULES.slots;
 }
}
function updateShopInventory(p){
 const owned=p.augments.map(key=>({kind:'augment',key,...AUGMENTS.find(a=>a.key===key)}));
 if(shopSelection&&!owned.some(a=>a.key===shopSelection.key))shopSelection=null;
 const holder=$('owned-list'),signature=JSON.stringify([p.augments,shopSelection]);
 if(holder.dataset.signature!==signature){holder.dataset.signature=signature;holder.replaceChildren();for(const a of owned){const b=document.createElement('button');b.className='owned-item'+(shopSelection?.key===a.key?' selected':'');b.textContent=a.name;b.onclick=()=>{shopSelection={kind:'augment',key:a.key};updateHud();};holder.append(b);}}
 const selected=owned.find(a=>a.key===shopSelection?.key),value=game.training?0:350;
 $('shop-selected-info').textContent=selected?`${selected.name} · 판매 시 ${value} ◈ 환급`:'판매할 증강을 선택하세요.';$('shop-sell').textContent=selected?`판매 +${value} ◈`:'판매';$('shop-sell').disabled=!selected||!active()||!game.canUpgrade(p)||performance.now()<shopBusyUntil;
}
function updatePointer(e){pointer={x:e.clientX,y:e.clientY};renderer.follow(game,inMatch());game.input.aim=renderer.point(e.clientX,e.clientY);}
function updateDrag(e){
 if(!drag)return;drag.choice=dragChoice(drag.key,e.clientX-drag.x,e.clientY-drag.y);
 $('drag-wheel').querySelectorAll('[data-dir]').forEach(el=>el.classList.toggle('selected',el.dataset.dir===drag.choice));
 $('drag-title').textContent=drag.choice?({up:'흰 곰방대',down:'파란 곰방대',left:drag.key==='ezra'?'이전 무기':'보라 곰방대',right:drag.key==='ezra'?'다음 무기':'붉은 곰방대'}[drag.choice]):'선택 취소';
}
$('arena').addEventListener('pointermove',updatePointer);window.addEventListener('pointermove',updateDrag);
$('arena').addEventListener('pointerdown',e=>{
 if(!active()||globalTarget||scoreOpen||!$('shop').classList.contains('hidden'))return;updatePointer(e);e.preventDefault();$('arena').focus();
 if(e.button===0){if(game.targeting||game.player.key==='heathcliff'&&game.player.state.chargeAt!==undefined){confirmOrAttack();return;}game.input.fire=true;game.attack(game.player,game.input.aim);}
 if(e.button===2){
  if(game.targeting){delete game.targeting;toast('스킬 조준 취소');return;}
  if(DRAG_KEYS.includes(game.player.key)){
   drag={key:game.player.key,x:e.clientX,y:e.clientY,choice:null,owner:game.player.id};game.input.fire=false;
   const w=$('drag-wheel');w.classList.remove('hidden');w.classList.toggle('ezra-wheel',drag.key==='ezra');w.style.left=`${Math.max(120,Math.min(innerWidth-120,e.clientX))}px`;w.style.top=`${Math.max(110,Math.min(innerHeight-110,e.clientY))}px`;updateDrag(e);
  }else skill('q');
 }
});
window.addEventListener('pointerup',e=>{if(e.button===0){game.input.fire=false;if(active())Yan.release(game,game.player,game.input.aim);else Yan.cancelCharge(game.player);}if(e.button===2&&drag){updateDrag(e);const chosen=drag.choice,owner=drag.owner;cancelDrag();if(chosen&&game.player.id===owner)skill('q',{direction:chosen});else toast('전술기 선택 취소');}});
window.addEventListener('pointercancel',()=>{game.input.fire=false;Yan.cancelCharge(game.player);});
$('arena').addEventListener('contextmenu',e=>e.preventDefault());
function mapPoint(canvas,e){const r=canvas.getBoundingClientRect();const bounds=game.bounds;return {x:bounds.x+(e.clientX-r.left)/r.width*bounds.w,y:bounds.y+(e.clientY-r.top)/r.height*bounds.h};}
$('target-map').addEventListener('pointermove',e=>globalPoint=mapPoint($('target-map'),e));
$('target-map').addEventListener('pointerdown',e=>{e.preventDefault();if(e.button===2){cancelGlobal();return;}if(e.button===0&&globalTarget){const point=mapPoint($('target-map'),e);if(globalKind==='teleport'?Training.teleport(game,point):skill('r',{confirmGlobal:true,point})){cancelGlobal();$('arena').focus();}else if(globalKind==='teleport')toast('벽·건물·개체와 겹치지 않는 지점을 선택하세요.');}});
$('global-target').addEventListener('contextmenu',e=>e.preventDefault());$('global-cancel').onclick=cancelGlobal;
$('score-toggle').onclick=()=>showScore(!scoreOpen);$('score-close').onclick=()=>showScore(false);
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('이 화면은 전체 화면 권한이 없습니다. 브라우저 게임 탭에서 실행하세요.');}}
$('fullscreen').onclick=fullscreen;document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ 나가기':'⛶ 전체 화면';renderer.resize();});
window.addEventListener('blur',()=>{clearInput();cancelDrag();cancelGlobal();showScore(false);if(active())togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active())togglePause();});
window.addEventListener('keydown',e=>{
 if(modalOpen()||['INPUT','TEXTAREA'].includes(e.target.tagName))return;
 if(e.code==='Tab'&&inMatch()){e.preventDefault();if(!e.repeat)showScore(true);return;}
 if(['Space','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();
 if(e.code==='F12'&&!e.repeat){e.preventDefault();fullscreen();return;}
 if(e.code==='Escape'&&!e.repeat){if(game.player.state.yanCharge){Yan.cancelCharge(game.player);game.input.fire=false;return;}if(game.targeting){delete game.targeting;return;}if(game.player.state.chargeAt!==undefined){delete game.player.state.chargeAt;delete game.player.status.slow;return;}if(globalTarget){cancelGlobal();return;}if(game.player.recall){game.cancelRecall(game.player);return;}if(drag){cancelDrag();return;}if(scoreOpen){showScore(false);return;}if(document.fullscreenElement)return;if(!$('shop').classList.contains('hidden'))$('shop').classList.add('hidden');else togglePause();return;}
 if(e.code==='KeyB'&&!e.repeat){e.preventDefault();if(active()&&!globalTarget&&!scoreOpen){clearInput();if(!game.recall(game.player))toast('지금은 귀환할 수 없습니다.');}return;}
 if(e.code==='KeyG'&&!e.repeat){e.preventDefault();toggleShop();return;}
 if(!active()||globalTarget||!$('shop').classList.contains('hidden'))return;keys.add(e.code);
 if(!e.repeat){if(e.code==='Space'&&!globalTarget)skill('r');}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Tab'){e.preventDefault();showScore(false);}});
function updateScores(){
 $('camp-timers').innerHTML=game.campTimers().map(t=>`<span>${escape(t.name)} <b>${clock(t.seconds)}</b></span>`).join('')||'<span>재생성 대기 중인 크립 없음</span>';
 $('score-rows').innerHTML=game.champions().map(p=>{const b=game.bonusStats(p),pct=n=>`${n>=0?'+':''}${n}%`,bounty=game.bounty(p);return `<tr class="${p.team===0?'ally-row':'enemy-row'}"><td>${p.team===0?'아군':'적군'} · ${escape(p.name)}${p.player?' (나)':''}${bounty?` <small class="bounty-tag">현상금 +${bounty} ◈</small>`:''}</td><td>${POSITIONS[p.position].name}</td><td>${p.level}</td><td>${p.kills} / ${p.deaths} / ${p.assists}</td><td>전투 ${pct(b.power)} · 체력 ${pct(b.health)} · 이동 ${pct(b.speed)} · 가속 ${pct(b.haste)} · 장전 ${pct(b.reload)}</td></tr>`;}).join('');
}
let visibleAnnouncement=null;
function updateAnnouncement(){
 const entry=mode==='playing'?game.currentAnnouncement():null,banner=$('battle-announcement');banner.classList.toggle('hidden',!entry);
 if(entry===visibleAnnouncement)return;visibleAnnouncement=entry;if(!entry)return;
 banner.dataset.kind=entry.kind;banner.classList.toggle('ally',entry.team===0);banner.classList.toggle('enemy',entry.team===1);
 $('announcement-kicker').textContent=entry.first?'선취점 확보 · 첫 처치 보상 +⅓':({kill:'챔피언 처치',execution:'처형',tower:'전장 상황','boss-spawn':'중앙 목표물','boss-kill':'목표물 확보'}[entry.kind]||'전장 상황');
 $('announcement-title').textContent=entry.title;$('announcement-detail').textContent=entry.detail;
}
function updateHud(){
 const p=game.player,c={...RUNTIME_CHAMPIONS[p.key],...Sora.abilityInfo(game,p),...Yan.abilityInfo(game,p)};
 const form=Sora.ego(game,p)?'soraEgo':Yan.form(game,p);if($('hud-face').dataset.form!==form){$('hud-face').dataset.form=form;renderPortraits();}
 $('field-title').innerHTML=game.training?'<i class="live-dot"></i> 연습장 <em>/</em> 다섯 구역': '<i class="live-dot"></i> 제13구역 <em>/</em> 경계 전장';$('field-objective').textContent=game.training?'G · 무료 상점 / 연습장 옵션 · 시간 제한 없음':'포탑을 파괴하고 적 본진을 공략하세요.';
 document.querySelector('.match-clock>span').textContent=game.training?'TRAINING · 다섯 실험 구역':'4 VS 4 · 두 개의 전선';
 $('clock').textContent=clock(game.training?game.time:Math.max(0,RULES.timeLimit-game.time));$('phase').textContent=!inMatch()?'출격 대기':game.training?'연습장 · 시간 제한 없음':game.winner!==null?'경기 종료':paused?'일시정지':game.bossSpawned?'남은 시간 · 후반전':'남은 시간 · 전반전';
 $('blue-score').textContent=game.kills[0];$('red-score').textContent=game.kills[1];
 $('blue-towers').textContent='▰ '.repeat(game.towers(0).length)+'▱ '.repeat(2-game.towers(0).length);$('red-towers').textContent='▰ '.repeat(game.towers(1).length)+'▱ '.repeat(2-game.towers(1).length);
 const boss=game.units.find(u=>u.camp==='boss');$('boss-time').textContent=boss?(boss.alive?`중앙 보스 · ${Math.ceil(boss.hp).toLocaleString()} HP`:'중앙 보스 · 처치 완료'):`보스까지 ${clock(Math.max(0,300-game.time))}`;
 $('player-name').textContent=`${c.name} · ${game.training?'연습장':POSITIONS[p.position].name}`;$('level').textContent=`LV.${p.level}`;$('kda').textContent=`${p.kills} / ${p.deaths} / ${p.assists}`;
 $('xp-fill').style.width=`${p.level===RULES.maxLevel?100:Math.min(100,(p.xp-RULES.xp[p.level-1])/(RULES.xp[p.level]-RULES.xp[p.level-1])*100)}%`;
 $('champion-live-status').textContent=p.key==='yan'?`체력 ${Math.ceil(p.hp)} / ${Math.round(p.maxHp)} · ${Yan.distorted(game,p)?'손 공격':'충전 '+Math.round(Yan.chargeShape(game,p,game.input.aim).progress*100)+'%'}`:`체력 ${Math.ceil(p.hp)} / ${Math.round(p.maxHp)} · ${p.key==='rudolph'?'정신력':'탄약'} ${Math.floor(p.ammo)} / ${game.ammoCap(p)}`;
 $('recall-btn').querySelector('span').textContent=p.recall?`${Math.max(0,p.recall.until-game.time).toFixed(1)}s`:'귀환';$('recall-btn').classList.toggle('recalling',Boolean(p.recall));
 $('basic-btn').querySelector('span').textContent=p.key==='ezra'?(game.buff(p,'ezraUlt')?'총공 모드':EZRA_WEAPONS[p.state.weapon||0].name):c.basic;
 for(const [slot,name,description] of [['q',c.tactical,c.qText],['r',c.ultimate,c.rText]]){const b=$(slot+'-btn');b.querySelector('span').textContent=name;b.title=description;b.disabled=p.key==='yan'&&slot==='r'&&Yan.distorted(game,p);const cd=p.key==='yan'&&slot==='r'?(Yan.distorted(game,p)?p.buffs.yanDistorted-game.time:Yan.ready(game,p)?0:p.rCd):p.key==='sora'&&slot==='r'?(Sora.ego(game,p)?p.buffs.soraEgo-game.time:Sora.ready(game,p)?0:p.rCd):p[slot+'Cd'];b.querySelector('.cooldown').textContent=cd>0?Math.ceil(cd):'';b.classList.toggle('on-cooldown',cd>0);if(p.key==='sora'&&slot==='q'&&Sora.ego(game,p))b.querySelector('span').textContent=`대행: 말살 · ${p.state.egoQCharges}/2`;}
 $('gold').textContent=Math.floor(p.gold).toLocaleString();updateAnnouncement();
 $('shop-status').textContent=game.training?'연습장 · 모든 장소·사망 중 이용 가능 · 업그레이드/증강 무료':game.canUpgrade(p)?(p.alive?'구매 가능 · 부활소 보급':'부활 대기 중 · 능력치 / 증강 변경 가능'):'부활 대기 중 또는 부활소에서 3초 비전투 시 구매 가능합니다.';
 updateShopCards(p);
 if(!$('shop').classList.contains('hidden')&&!game.training&&p.alive&&!game.inSpawn(p))$('shop').classList.add('hidden');
 $('shop-tabs').classList.toggle('hidden',!game.training);$('training-sell-all').classList.toggle('hidden',!game.training);$('shop-title').textContent=game.training?'연습장 상점':'부활소 보급';updateTrainingOptions();
 $('augment-count').textContent=game.training?`${p.augments.length} / ${AUGMENT_RULES.slots} · 구매·판매 무료`:`${p.augments.length} / ${AUGMENT_RULES.slots} · 구매 ${AUGMENT_RULES.cost} ◈ / 판매 ${AUGMENT_RULES.cost*AUGMENT_RULES.refund} ◈`;
 updateShopInventory(p);
 const buffs=game.activeBuffs(p);$('buff-list').innerHTML=buffs.length?buffs.slice(0,3).map(b=>`<div class="buff-chip"><i>◆</i><b>${escape(BUFF_LABELS[b.key]||b.key)}</b><span>${Number.isFinite(b.until)?Math.ceil(b.until-game.time)+'s':'∞'}</span></div>`).join(''):'<small>활성 버프 없음</small>';
 $('respawn').classList.toggle('hidden',p.alive||mode!=='playing'||game.winner!==null);if(!p.alive)$('respawn').innerHTML=game.training&&!Number.isFinite(p.respawnAt)?'연습장 대기<b>G · 즉시 부활</b>':`부활 대기<b>${Math.max(0,Math.ceil(p.respawnAt-game.time))}</b>`;
 const entries=!inMatch()?[]:game.logs.filter(l=>game.time-l.time<8).slice(0,3);const feed=entries.map(l=>`<div class="${l.kind}"><time>${clock(l.time)}</time>${escape(l.text)}</div>`).join('');if($('event-feed').innerHTML!==feed)$('event-feed').innerHTML=feed;
 if(scoreOpen)updateScores();
 if(globalTarget&&(!p.alive||game.winner!==null))cancelGlobal();if(game.targeting&&(!p.alive||game.winner!==null))delete game.targeting;
}
function finish(){mode='result';clearInput();cancelDrag();cancelGlobal();showScore(false);$('shop').classList.add('hidden');$('result').classList.remove('hidden');$('pause').disabled=true;$('result-title').textContent=game.winner===0?'작전 성공':game.winner===1?'작전 실패':'무승부';$('result-reason').textContent=`${game.reason} · ${clock(game.time)}`;$('result-stats').innerHTML=`${RUNTIME_CHAMPIONS[selected].name} · ${POSITIONS[position].name} · LV.${game.player.level}<br>${game.player.kills} / ${game.player.deaths} / ${game.player.assists} · 누적 실제 피해 ${Math.round(game.damageDone).toLocaleString()}`;updateHud();}
function frame(t){
 const elapsed=Math.min((t-last)/1000||0,.12);last=t;
 if(mode==='playing'&&game.winner!==null)finish();
 if(active()){
  game.input.x=globalTarget?0:Number(keys.has('KeyD'))-Number(keys.has('KeyA'));game.input.y=globalTarget?0:Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
  accumulator+=elapsed*speed;while(accumulator>=1/30&&game.winner===null){renderer.follow(game,true);if(pointer)game.input.aim=renderer.point(pointer.x,pointer.y);game.step(1/30);accumulator-=1/30;}if(game.winner!==null)finish();
 }else accumulator=0;
 renderer.draw(game,inMatch());if(inMatch())renderer.minimap($('minimap'),game);if(scoreOpen)renderer.minimap($('score-map'),game);
 if(globalTarget){renderer.minimap($('target-map'),game);if(globalPoint){const c=$('target-map').getContext('2d'),sx=$('target-map').width/game.bounds.w,sy=$('target-map').height/game.bounds.h,radius=globalKind==='teleport'?.75:5.25;c.beginPath();c.ellipse((globalPoint.x-game.bounds.x)*sx,(globalPoint.y-game.bounds.y)*sy,radius*sx,radius*sy,0,0,Math.PI*2);c.fillStyle='#ffac5033';c.fill();c.strokeStyle='#ffd396';c.lineWidth=2;c.stroke();}}
 if(t-lastHud>100){updateHud();lastHud=t;}requestAnimationFrame(frame);
}
function showDialog(id){clearInput();cancelDrag();cancelGlobal();showScore(false);$(id).showModal();}
$('help-open').onclick=()=>showDialog('help');$('field-help').onclick=()=>showDialog('help');
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',clearInput));
function recordList(){const q=$('roster-search').value.trim();const filtered=roster.filter(c=>c.name.includes(q)||c.role.includes(q)||roleName(c.role).includes(q));$('roster-list').innerHTML=filtered.length?filtered.map(c=>`<button data-id="${c.id}" class="${c.id===activeRecord?'active':''}">${escape(c.name)}<small>${escape(roleName(c.role))}</small></button>`).join(''):'<p>검색 결과가 없습니다.</p>';$('roster-list').querySelectorAll('button').forEach(b=>b.onclick=()=>record(Number(b.dataset.id)));}
function record(id){
 activeRecord=id;const c=roster.find(c=>c.id===id);if(!c)return;const playable=Object.entries(CHAMPIONS).find(([,p])=>p.id===id),experimental=Object.entries(EXPERIMENTAL_CHAMPIONS).find(([,p])=>p.id===id);
 $('roster-detail').innerHTML=`<span class="eyebrow">NO.${String(c.id).padStart(2,'0')} / ${escape(roleName(c.role))}</span><h2>${escape(c.name)}</h2><span class="availability">${playable?'연습전 플레이 가능':experimental?'조작·규칙 실험실 제공 · 외형은 개발중':'기획 수록 · 아직 플레이 불가'}</span>${playable||experimental?'<button id="record-play" class="record-play">'+(experimental?'조작·규칙 실험실 입장':'이 챔피언으로 연습')+' →</button>':''}<p class="quote">${escape(c.quote)}</p><p class="stats">${escape(c.stats)}<br>공통 변경: 소모 간격 +30% (기존 고속 공격 제외), 공격 중 장전 정지 · 현재 장전 성능 추가 −35% (이전 원안 대비 총 −48%) · 3초 비공격/비피격 후 초당 체력 13% 자연 치유</p>${c.skills.map(s=>`<h3>${escape(s.kind)} / ${escape(s.name)}</h3><p>${escape(s.description)}</p>`).join('')}<p>${escape(c.note)}</p><p>최신 변경 규칙을 반영한 기획 데이터입니다. 일부 기술의 다단 타격·재사용 예외는 개발 명세를 참고하세요.</p>`;
 if($('record-play'))$('record-play').onclick=()=>{$('archive').close();if(playable){showPractice();select(playable[0]);}else{selected=experimental[0];position='jungle';start();toast('실험실: 특수 조작·변경 규칙 검증용 캐릭터입니다.');}};recordList();
}
function renderCategory(key){category=key;document.querySelectorAll('#codex-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.category===key));$('champion-archive').classList.toggle('hidden',key!=='champions');$('codex-content').classList.toggle('hidden',key==='champions');
 if(key==='champions'){record(activeRecord);return;}
 if(key==='monsters')$('codex-content').innerHTML=MONSTERS.map(m=>`<article><h3>${m.name}</h3><p>체력 ${m.hp.toLocaleString()} · 방어력 ${m.armor}</p><p>공격 ${m.attack}</p><p>${m.text}</p><small>${m.reward}</small></article>`).join('');
 if(key==='augments')$('codex-content').innerHTML=`<article><h3>부활소 증강</h3><p>최대 ${AUGMENT_RULES.slots}개 · 구매 ${AUGMENT_RULES.cost} 재화 · 판매 ${AUGMENT_RULES.cost*AUGMENT_RULES.refund} 재화. 사망 중에도 구매 가능. 상점에서 보유 증강을 선택하고 판매 버튼으로 판매하세요.</p></article>`+AUGMENTS.map(a=>`<article><small>${a.group==='combat'?'전투 · 전투력 3단계 이상':a.group==='survival'?'생존 · 체력 3단계 이상':'기술 · 이동·장전·가속 합계 3단계 이상'}</small><h3>${escape(a.name)}</h3><p>${escape(a.text)}</p><small>${AUGMENT_RULES.cost} 재화</small></article>`).join('');
 if(key==='rules')$('codex-content').innerHTML=GAME_RULES.map(([name,text])=>`<article><h3>${name}</h3><p>${text}</p></article>`).join('');
}
async function openCodex(){if(!roster.length)try{const embedded=$('roster-data');if(embedded)roster=JSON.parse(embedded.textContent);else{const res=await fetch('./src/roster.json');if(!res.ok)throw new Error();roster=await res.json();}}catch{toast('도감을 불러오지 못했습니다.');return;}renderCategory(category);showDialog('archive');}
$('archive-open').onclick=openCodex;$('menu-codex').onclick=openCodex;$('roster-search').oninput=recordList;document.querySelectorAll('#codex-tabs button').forEach(b=>b.onclick=()=>renderCategory(b.dataset.category));
if(new URLSearchParams(location.search).has('debug'))window.__moba={get game(){return game;},get mode(){return mode;},get paused(){return paused;},get renderer(){return renderer;},get globalTarget(){return globalTarget;},get dragging(){return drag;},get targeting(){return game.targeting;},get selectedPosition(){return position;}};
setPosition(position);mainMenu();requestAnimationFrame(frame);
