import * as Jamila from './jamila.js';
import{GameAudio}from'./audio.js';
import{MatchPresentation}from'./match-presentation.js';
import{augmentStatus}from'./augment-status.js';
import{championDescription}from'./champion-reference.js';
import{TrainingPicker}from'./training-picker.js';
import{CodexScreen}from'./codex-screen.js';
import{PickScreen}from'./pick-screen.js';
import * as Infiltration from './infiltration.js';
import * as AugmentArt from './augment-art.js';
import { PING_KEYS } from './pings.js';
import { PingMenu } from './ping-menu.js';
import * as Training from './training.js';
import * as Sora from './sora.js';
import * as Yan from './yan.js';
import * as Hohenheim from './hohenheim.js';
import * as Don from './don.js';
import { skillTargeting, castPoint } from './targeting.js';
import { AUGMENTS, AUGMENT_RULES, unlockedItem,unlockedGroup,augmentText, has, categoryCount,categoryFits,slots,usedSlots,fits,sellable } from './augments.js';
import { releaseHeath,cancelHeath } from './skills.js';
import { canRecast,skillCharges } from './skills.js';
import { Game } from './game.js';
import { CHAMPIONS, RUNTIME_CHAMPIONS, RULES, UPGRADES, upgradeRate, POSITIONS, WORLD } from './data.js';
import { Renderer } from './render.js';
import { portrait,visualForm } from './art.js';
import { dragChoice, DRAG_KEYS, EZRA_WEAPONS } from './skills.js';
import { BUFF_LABELS } from './catalog.js';

const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clock=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let selected='faust',position='bottom',game=new Game(selected,position),mode='menu',paused=false,speed=1;
let deployment='match',globalKind='ultimate',trainingCollapsed=false,summonChoice=null;
let keys=new Set(),last=0,accumulator=0,lastHud=0,toastTimer,pointer=null,drag=null,globalTarget=false,globalPoint=null,scoreOpen=false,shopSelection=null,shopGroup='all';
const renderer=new Renderer($('arena'));
const presentation=new MatchPresentation(),audio=new GameAudio();
$('sound-toggle').textContent=audio.enabled?'♪ 사운드':'♪ 음소거';$('sound-toggle').setAttribute('aria-pressed',String(audio.enabled));$('sound-toggle').onclick=()=>{$('sound-toggle').textContent=audio.toggle()?'♪ 사운드':'♪ 음소거';$('sound-toggle').setAttribute('aria-pressed',String(audio.enabled));};
window.addEventListener('pointerdown',()=>audio.unlock(),{once:true});
$('menu-background').src=$('menu-city-pixel-data')?JSON.parse($('menu-city-pixel-data').textContent):'./src/assets/menu-city-pixel.png';
new ResizeObserver(()=>renderer.resize()).observe($('arena'));
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),2600);}
function inMatch(){return mode==='playing'||mode==='result';}
function modalOpen(){return Boolean(document.querySelector('dialog[open]'));}
function active(){return mode==='playing'&&!paused&&!modalOpen()&&game.winner===null&&!presentation.blocking;}
const pingMenu=new PingMenu($('ping-menu'),{getGame:()=>game,allowed:()=>active()&&!globalTarget&&!drag&&!Infiltration.absent(game.player)&&$('shop').classList.contains('hidden'),point:(x,y)=>{const map=$('score-map'),b=map.getBoundingClientRect(),point=scoreOpen&&x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom?mapPoint(map,{clientX:x,clientY:y}):renderer.point(x,y),bounds=game.bounds;return {x:Math.max(bounds.x,Math.min(bounds.x+bounds.w,point.x)),y:Math.max(bounds.y,Math.min(bounds.y+bounds.h,point.y))};},onSend:p=>toast(p.label)});
for(const button of $('ping-controls').querySelectorAll('button')){
 button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();button.setPointerCapture(e.pointerId);pingMenu.begin(button.dataset.ping,e.clientX,e.clientY,'pointer-'+e.pointerId);});
 button.onclick=e=>{if(e.detail===0){const b=button.getBoundingClientRect();if(pingMenu.begin(button.dataset.ping,b.x+b.width/2,b.y+b.height/2,'accessible'))pingMenu.end('accessible');}};
}
window.addEventListener('pointermove',e=>{if(inMatch())pointer={x:e.clientX,y:e.clientY};pingMenu.move(e.clientX,e.clientY);});

function chargeChampion(e){return ['yan','hohenheim'].includes(e.key);}
function cancelBasicCharge(e){Yan.cancelCharge(e);Hohenheim.cancelCharge(e);cancelHeath(e);Don.cancel(game,e);}
const chargeTactical=e=>['heathcliff','don'].includes(e.key);
const releaseTactical=(g,e,p)=>e.key==='don'?Don.release(g,e,p):releaseHeath(g,e,p);
function releaseBasicCharge(g,e,p){return e.key==='hohenheim'?Hohenheim.release(g,e,p):Yan.release(g,e,p);}
function clearInput(){pingMenu?.cancel();game.input.precision=false;cancelBasicCharge(game.player);delete game.targeting;keys.clear();game.input.fire=false;game.input.x=0;game.input.y=0;}
function cancelDrag(){drag=null;$('drag-wheel').classList.add('hidden');}
function cancelGlobal(){summonChoice=null;globalKind='ultimate';globalTarget=false;globalPoint=null;$('global-target').classList.add('hidden');}
function showScore(show){scoreOpen=show&&inMatch();$('scoreboard').classList.toggle('hidden',!scoreOpen);if(scoreOpen){cancelBasicCharge(game.player);game.input.fire=false;updateScores();}}
function renderPortraits(){document.querySelectorAll('.champion-portrait').forEach(c=>portrait(c,c.dataset.key,renderer.atlas,renderer.atlasExtra,renderer.atlasV05,renderer.atlasV06,renderer.atlasV08,renderer.atlasV10,renderer.atlasV12,renderer.atlasV13,renderer.atlasV17));portrait($('hud-face'),visualForm(game,game.player),renderer.atlas,renderer.atlasExtra,renderer.atlasV05,renderer.atlasV06,renderer.atlasV08,renderer.atlasV10,renderer.atlasV12,renderer.atlasV13,renderer.atlasV17);}
renderer.atlasV36.addEventListener('load',renderPortraits);
renderer.atlas.addEventListener('load',renderPortraits);renderer.atlasExtra.addEventListener('load',renderPortraits);renderer.atlasV05.addEventListener('load',renderPortraits);renderer.atlasV06.addEventListener('load',renderPortraits);renderer.atlasV08.addEventListener('load',renderPortraits);renderer.atlasV10.addEventListener('load',renderPortraits);renderer.atlasV12.addEventListener('load',renderPortraits);renderer.atlasV13.addEventListener('load',renderPortraits);renderer.atlasV17.addEventListener('load',renderPortraits);
const pickScreen=new PickScreen($('practice-panel'),{onPlayer:key=>select(key),onPosition:key=>setPosition(key)});
function select(key){selected=key;game=new Game(key,position,{bots:pickScreen.value()});pickScreen.selectPlayer(key);renderPortraits();updateHud();}
function setPosition(key){position=key;pickScreen.setPosition(key);select(selected);}
function resetView(){presentation.reset(game);if(renderer.scene25d)renderer.scene25d.canvas.hidden=true;clearInput();cancelDrag();cancelGlobal();showScore(false);clearTimeout(toastTimer);$('toast').classList.add('hidden');paused=false;document.body.classList.remove('in-game','training-mode','training-25d');for(const id of ['result','pause-banner','shop','minimap','buff-tray','score-toggle','training-panel','augment-tray'])$(id).classList.add('hidden');$('pause').disabled=true;$('lobby').classList.remove('hidden');pointer=null;}
function mainMenu(){deployment='match';mode='menu';resetView();document.body.classList.remove('practice-screen','training-selection');document.body.classList.add('menu-screen');$('main-menu').classList.remove('hidden');$('practice-panel').classList.add('hidden');if(!CHAMPIONS[selected])selected='faust';select(selected);}
function showPractice(kind='match'){
 deployment=kind;mode='practice';resetView();pickScreen.show(kind!=='match');document.body.classList.remove('menu-screen');document.body.classList.add('practice-screen');$('main-menu').classList.add('hidden');$('practice-panel').classList.remove('hidden');if(!CHAMPIONS[selected])selected='faust';setPosition(position);
 const training=kind!=='match';document.body.classList.toggle('training-selection',training);
 $('practice-panel').querySelector('h2').textContent='챔피언 선택';
 $('start').innerHTML=training?'연습장 입장 <span>→</span>':'AI 대전 시작 <span>→</span>';
}
function start(){
 const nextGame=new Game(selected,position,{mode:deployment,bots:pickScreen.value()});try{renderer.prepare(nextGame);}catch(error){toast(error.message);return;}game=nextGame;presentation.start(game);audio.unlock();mode='playing';paused=false;accumulator=0;speed=1;clearInput();cancelDrag();cancelGlobal();showScore(false);
 document.body.classList.remove('practice-screen','menu-screen');document.body.classList.add('in-game');document.body.classList.toggle('training-mode',game.training);document.body.classList.toggle('training-25d',game.training25d);setTrainingCollapsed(matchMedia('(max-width:600px)').matches);
 for(const id of ['minimap','buff-tray','score-toggle','augment-tray'])$(id).classList.remove('hidden');
 pointer=null;game.input.aim={x:game.player.x+5,y:game.player.y};$('lobby').classList.add('hidden');$('result').classList.add('hidden');$('pause-banner').classList.add('hidden');$('pause').disabled=false;$('pause').textContent='Ⅱ';$('speed').textContent='1×';$('arena').focus();updateHud();
}
function togglePause(){if(mode!=='playing'||game.winner!==null)return;paused=!paused;clearInput();cancelDrag();cancelGlobal();showScore(false);$('pause-banner').classList.toggle('hidden',!paused);$('pause').textContent=paused?'▶':'Ⅱ';}
function skill(slot,options={}){
 if(!active()||scoreOpen||Infiltration.absent(game.player)&&!Jamila.infiltrationUltimate(game,game.player,slot))return false;
 const p=game.player;if(game.training)Training.refreshOptions(game);
 if(slot==='q'&&DRAG_KEYS.includes(p.key)&&!options.direction){toast(p.key==='moses'?'우클릭을 누르고 상하좌우로 드래그하세요.':'우클릭을 누르고 좌우로 드래그하세요.');return false;}
 const target=options.point||game.input.aim;
 const spec=skillTargeting(game,p,slot);
 if(!options.confirm&&spec.confirm&&spec.kind!=='global'){
  if(!p.alive||p.motion||game.hidden(p)||game.stat(p,'stun')||game.stat(p,'silence')&&!(p.key==='meursault'&&slot==='q')||p.channelUntil>game.time||p[slot+'Cd']>0&&!canRecast(game,p,slot)){toast('지금은 이 스킬을 준비할 수 없습니다.');return false;}
  cancelBasicCharge(p);game.input.fire=false;game.targeting={slot,options};toast('사거리 표시 · 좌클릭으로 시전 · 우클릭 / Esc 취소');return true;
 }
 const casted=game.cast(p,slot,target,options);if(casted)delete game.targeting;if(!casted)toast('재사용 대기·대상·군중제어 조건을 확인하세요.');updateHud();return casted;
}
$('menu-exit').onclick=()=>{clearInput();cancelGlobal();mode='exited';paused=true;for(const d of document.querySelectorAll('dialog[open]'))d.close();if(renderer.scene25d)renderer.scene25d.canvas.hidden=true;const end=document.createElement('section');end.id='exit-screen';end.innerHTML='<h1>도시 경계가 종료되었습니다.</h1><button>다시 시작</button>';end.querySelector('button').onclick=()=>{end.remove();mainMenu();};document.body.append(end);window.close();};
$('practice-open').onclick=()=>showPractice();$('training-open').onclick=()=>showPractice('training');$('practice-back').onclick=mainMenu;$('start').onclick=start;
$('pause').onclick=togglePause;$('resume').onclick=togglePause;$('restart').onclick=()=>showPractice(deployment);$('leave').onclick=()=>showPractice(deployment);
$('home').onclick=e=>{e.preventDefault();mainMenu();};$('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;$('speed').textContent=`${speed}×`;};
$('q-btn').onclick=e=>{if(Infiltration.absent(game.player))return;if(chargeTactical(game.player)){if(e.detail===0&&skill('q'))releaseTactical(game,game.player,game.input.aim);}else skill('q');};$('q-btn').addEventListener('pointerdown',e=>{if(e.button===0&&Infiltration.selecting(game.player)){e.preventDefault();$('q-btn').setPointerCapture(e.pointerId);game.input.precision=true;return;}if(e.button===0&&chargeTactical(game.player)){$('q-btn').setPointerCapture(e.pointerId);skill('q');}});$('r-btn').onclick=()=>skill('r');$('basic-btn').onclick=e=>{if(active()&&!globalTarget&&!scoreOpen){if(Infiltration.selecting(game.player)){confirmOrAttack();return;}if(chargeChampion(game.player)&&!game.targeting){if(e.detail===0){game.attack(game.player,game.input.aim);releaseBasicCharge(game,game.player,game.input.aim);}return;}confirmOrAttack();}};
$('basic-btn').addEventListener('pointerdown',e=>{if(e.button===0&&active()&&!globalTarget&&!scoreOpen&&!game.targeting&&!Infiltration.absent(game.player)&&chargeChampion(game.player)){game.input.fire=true;game.attack(game.player,game.input.aim);}});
function recallAction(){
 if(!active()||scoreOpen)return;
 clearInput();if(!game.recall(game.player)){toast('재사용 대기시간 또는 현재 상태를 확인하세요.');return;}

}
$('recall-btn').onclick=recallAction;
function confirmOrAttack(){if(Infiltration.selecting(game.player)){if(!game.infiltrate(game.player))toast('이동 가능한 착지 지점을 선택하세요.');game.input.fire=false;return;}if(Infiltration.absent(game.player))return;if(game.targeting){const {slot,options}=game.targeting;const point=castPoint(game.player,game.input.aim,skillTargeting(game,game.player,slot),game.bounds);if(skill(slot,{...options,point,confirm:true}))delete game.targeting;game.input.fire=false;return;}game.attack(game.player,game.input.aim);}
function toggleShop(){if(!$('shop').classList.contains('hidden')){$('shop').classList.add('hidden');return;}if(!active())return;clearInput();shopSelection=null;$('shop').classList.remove('hidden');updateHud();}
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
const AUGMENT_GROUPS=[['combat','전투'],['survival','생존'],['tech','기술']],augmentGroups={};
for(const [key,name] of AUGMENT_GROUPS){const section=document.createElement('section');section.className='augment-category';section.dataset.group=key;const grid=document.createElement('div');grid.className='augment-group-grid';section.append(grid);$('augment-list').append(section);augmentGroups[key]=grid;}
function chooseAugment(key){shopSelection={kind:'augment',key};updateShopInventory(game.player);}
for(const item of AUGMENTS){
 const row=document.createElement('div');row.className='augment-item';row.id='augment-row-'+item.key;
 const info=document.createElement('button');info.id='select-augment-'+item.key;info.className='augment-tile';info.setAttribute('aria-label',item.name);info.append(AugmentArt.icon(item.key,item.group));const price=document.createElement('small');price.textContent='500 ◈';info.append(price);
 info.onpointerenter=()=>chooseAugment(item.key);info.onfocus=()=>chooseAugment(item.key);info.onclick=()=>chooseAugment(item.key);info.ondblclick=e=>{e.preventDefault();chooseAugment(item.key);purchaseSelected();};row.append(info);augmentGroups[item.group].append(row);
}
for(const b of $('shop-tabs').querySelectorAll('button'))b.onclick=()=>{shopGroup=b.dataset.group;updateHud();b.blur();};
function purchaseSelected(){return shopAction(()=>{if(!shopSelection)return false;const item=AUGMENTS.find(a=>a.key===shopSelection.key),ok=game.buyAugment(game.player,item.key);if(ok)toast(item.name+' 선택 완료');return ok;});}
$('detail-buy').onclick=purchaseSelected;
$('shop-sell').onclick=()=>shopAction(()=>{if(!shopSelection)return false;const ok=game.sellAugment(game.player,shopSelection.key);if(ok)toast('판매 완료');return ok;});
function setTrainingCollapsed(collapsed){
 trainingCollapsed=collapsed;$('training-panel').classList.toggle('collapsed',collapsed);$('training-options').classList.toggle('hidden',collapsed);
 $('training-panel-toggle').setAttribute('aria-expanded',String(!collapsed));$('training-panel-toggle').textContent=collapsed?'펼치기 ▾':'접기 ▴';
}
$('training-panel-toggle').onclick=()=>setTrainingCollapsed(!trainingCollapsed);
$('training-panel').addEventListener('pointerdown',()=>clearInput());
$('training-panel').addEventListener('click',e=>{if(e.target.closest('button'))e.target.closest('button').blur();});
$('training-panel').addEventListener('change',e=>{e.target.blur();$('arena').focus();});
for(const [id,key] of [['training-invincible','invincible'],['training-no-cooldown','noCooldown'],['training-infinite-ammo','infiniteAmmo']])$(id).onchange=()=>{if(game.training){game.practice[key]=$(id).checked;Training.refreshOptions(game);updateHud();}};
$('training-life').onclick=()=>{if(active()&&Training.deathOrRespawn(game)){clearInput();updateHud();}};
$('training-reset-creeps').onclick=()=>{if(active()&&Training.resetCreeps(game)){toast('크립 정원을 초기화했습니다.');updateHud();}};
$('training-reset-lane').onclick=()=>{if(active()&&Training.resetLane(game)){toast('미니언과 포탑을 초기화했습니다. 3초 후 첫 웨이브가 출발합니다.');updateHud();}};
$('training-buy-procedures').onclick=()=>shopAction(()=>Training.procedures(game,true));
$('training-sell-procedures').onclick=()=>shopAction(()=>Training.procedures(game,false));
$('training-level-open').onclick=()=>showDialog('training-level-dialog');
for(let n=1;n<=10;n++){const b=document.createElement('button');b.textContent=String(n);b.dataset.level=n;b.onclick=()=>{if(Training.setLevel(game,n)){updateHud();$('training-level-dialog').close();$('arena').focus();}};$('training-levels').append(b);}
$('training-pause-xp').onclick=()=>{if(game.training){game.practice.pauseXp=!game.practice.pauseXp;const b=$('training-pause-xp');b.setAttribute('aria-pressed',String(game.practice.pauseXp));b.textContent='경험치 획득 중단: '+(game.practice.pauseXp?'켜짐':'꺼짐');b.blur();}};
$('training-sell-all').onclick=()=>shopAction(()=>{const ok=Training.sellAll(game);if(ok){shopSelection=null;toast('모든 증강과 강화 시술을 판매했습니다.');}return ok;});
$('training-teleport').onclick=()=>{
 if(!active()||!game.training||!game.player.alive)return;
 clearInput();cancelDrag();showScore(false);$('shop').classList.add('hidden');globalKind='teleport';globalTarget=true;globalPoint=null;
 $('global-title').textContent='해당 지점으로 이동 · 지도를 좌클릭하여 확정';$('global-description').textContent='벽·건물·개체와 겹치지 않는 위치를 선택하세요. 우측 상단 취소 또는 Esc로 닫습니다.';$('global-target').classList.remove('hidden');
};
const trainingPicker=new TrainingPicker($('training-pick-dialog'),{onChange:key=>{
 if(Training.changeChampion(game,key)){selected=key;clearInput();cancelDrag();shopSelection=null;renderPortraits();updateHud();toast(CHAMPIONS[key].name+'으로 변경했습니다.');}
},onSummon:(key,team)=>placeSummon(key,team)});
$('training-change-champion').onclick=()=>{if(active()&&game.training){clearInput();trainingPicker.open('change',game.player.key);}};
$('training-ai').onchange=()=>{Training.setChampionAI(game,$('training-ai').checked);updateHud();};
$('training-summon').onclick=()=>{if(active()&&game.training){clearInput();trainingPicker.open('summon',game.player.key);}};
function placeSummon(key,team){clearInput();cancelGlobal();summonChoice={key,team};globalKind='summon';globalTarget=true;$('shop').classList.add('hidden');$('global-title').textContent=CHAMPIONS[key].name+' · '+(team?'적군':'아군')+' 소환 위치 선택';$('global-description').textContent='미니맵을 좌클릭해 배치합니다. 중복 소환 가능 · 챔피언 AI는 연습장 옵션에서 켜세요.';$('global-target').classList.remove('hidden');}
function refreshRemoval(){const units=Training.summoned(game),select=$('remove-champion');select.replaceChildren();for(const e of units){const option=document.createElement('option');option.value=e.id;option.textContent=Training.summonLabel(e);select.append(option);}$('remove-status').textContent=units.length?`현재 소환 챔피언 ${units.length}명`:'소환한 챔피언이 없습니다.';for(const id of ['remove-all','remove-choose','remove-selected'])$(id).disabled=!units.length;}
$('training-remove').onclick=()=>{if(!active()||!game.training)return;refreshRemoval();$('remove-selection').classList.add('hidden');showDialog('training-remove-dialog');};
$('remove-choose').onclick=()=>$('remove-selection').classList.remove('hidden');
$('remove-all').onclick=()=>{if(Training.removeSummoned(game)){$('training-remove-dialog').close();toast('소환한 챔피언을 전부 제거했습니다.');updateHud();}};
$('remove-selected').onclick=()=>{if(Training.removeSummoned(game,Number($('remove-champion').value))){refreshRemoval();toast('선택한 소환 챔피언을 제거했습니다.');updateHud();}};
function updateTrainingOptions(){
 const visible=game.training&&mode==='playing';$('training-panel').classList.toggle('hidden',!visible);if(!visible)return;
 for(const [id,key] of [['training-invincible','invincible'],['training-no-cooldown','noCooldown'],['training-infinite-ammo','infiniteAmmo']])$(id).checked=game.practice[key];
 $('training-ai').checked=game.practice.championAI;
 $('training-life').textContent=game.player.alive?'즉시 사망':'즉시 부활';$('training-teleport').disabled=!game.player.alive;

}
function updateShopCards(p){
 const available=active()&&game.canUpgrade(p),busy=performance.now()<shopBusyUntil;
 for(const item of UPGRADES){
  const n=p.upgrades[item.key],cost=game.training?0:RULES.costs[n],b=$('buy-'+item.key);
  $('upgrade-state-'+item.key).textContent=`다음 ${n<item.max?'+'+Math.round(item.steps[n]*100)+'%':'완료'} · 총 +${Math.round(upgradeRate(p,item.key)*100)}% · ${n}/${item.max}`;
  b.textContent=n>=item.max?'완료':`구매 ${cost} ◈`;b.disabled=!available||busy||n>=item.max||p.gold<cost;
  [...$('upgrade-meter-'+item.key).children].forEach((bar,i)=>bar.classList.toggle('filled',i<n));
 }
 if(shopGroup!=='all'&&!unlockedGroup(p,shopGroup))shopGroup='all';
 for(const b of $('shop-tabs').querySelectorAll('button')){b.disabled=b.dataset.group!=='all'&&!unlockedGroup(p,b.dataset.group);b.classList.toggle('selected',b.dataset.group===shopGroup);b.setAttribute('aria-pressed',String(b.dataset.group===shopGroup));}
 for(const [group] of AUGMENT_GROUPS)augmentGroups[group].parentElement.classList.toggle('hidden',shopGroup!=='all'&&shopGroup!==group);
 for(const item of AUGMENTS){const row=$('augment-row-'+item.key);row.classList.toggle('equipped',has(p,item.key));row.classList.toggle('locked',!unlockedItem(p,item.key));row.querySelector('small').textContent=game.training?'무료':'500 ◈';}
}
function updateShopInventory(p){
 const selected=AUGMENTS.find(a=>a.key===shopSelection?.key),busy=performance.now()<shopBusyUntil,available=active()&&game.canUpgrade(p);
 $('detail-name').textContent=selected?.name||'증강을 선택하세요';$('detail-effect').textContent=augmentText(p,selected)||'아이콘에 커서를 올리거나 선택하면 효과를 확인합니다.';
 const holder=$('detail-icon');if(holder.dataset.key!==selected?.key){holder.replaceChildren();if(selected)holder.append(AugmentArt.icon(selected.key,selected.group,128));holder.dataset.key=selected?.key||'';}
 $('detail-condition').textContent=selected?(has(p,selected.key)?'보유 중':!unlockedItem(p,selected.key)?({combat:'전투력 3단계',survival:'체력 3단계',tech:'이동·장전·가속 합계 3단계'}[selected.group]+' 필요'):!categoryFits(p,selected.key)?'카테고리 보유 한도 2개':!fits(p,selected.key)?'증강 보유 칸 부족':'선택 가능'):'';
 $('detail-buy').textContent=game.training?'무료 구매':'구매 500 ◈';$('detail-buy').disabled=!selected||!available||busy||has(p,selected.key)||!unlockedItem(p,selected.key)||!categoryFits(p,selected.key)||!fits(p,selected.key)||!game.training&&p.gold<500;
 const canSell=selected&&has(p,selected.key)&&sellable(game,selected.key);$('shop-sell').disabled=!canSell||!available||busy;$('shop-sell').textContent=game.training?'판매':'판매 +350 ◈';$('shop-selected-info').textContent=selected&&has(p,selected.key)&&!sellable(game,selected.key)?'판매 불가':'';
 for(const [id,tray] of [['owned-list',false],['augment-tray',true]]){const list=$(id),signature=JSON.stringify([p.key,p.augments]);if(list.dataset.signature!==signature){list.dataset.signature=signature;list.replaceChildren();for(const key of p.augments){const a=AUGMENTS.find(a=>a.key===key),b=document.createElement('button');b.setAttribute('aria-label',a.name);b.title=a.name+' · '+augmentText(p,a);b.dataset.augmentKey=key;b.append(AugmentArt.icon(key,a.group,tray?112:64));if(tray){const label=document.createElement('small');label.className='augment-state';b.append(label);}b.onclick=()=>{if(tray&&$('shop').classList.contains('hidden'))toggleShop();chooseAugment(key);};list.append(b);}if(tray){list.classList.toggle('carrier',has(p,'carrier'));while(list.children.length<6){const empty=document.createElement('span');empty.className='empty-augment';list.append(empty);}}}}
 for(const b of $('augment-tray').querySelectorAll('button[data-augment-key]')){const state=augmentStatus(game,p,b.dataset.augmentKey);b.querySelector('.augment-state').textContent=state.label;b.classList.toggle('augment-ready',state.ready);b.classList.toggle('augment-cooling',Boolean(state.remaining>0));const item=AUGMENTS.find(a=>a.key===b.dataset.augmentKey);b.title=item.name+' · '+augmentText(p,item)+(state.label?' · '+state.label:'');}
 document.querySelectorAll('canvas[data-augment]').forEach(c=>AugmentArt.drawAugment(c,c.dataset.augment));
}
function updateTeamPortraits(){
 for(const [team,id] of [[0,'ally-portraits'],[1,'enemy-portraits']]){const holder=$(id),list=game.champions(team).filter(e=>!e.trainingDummy),signature=list.map(e=>e.id).join(',');if(holder.dataset.signature!==signature){holder.dataset.signature=signature;holder.replaceChildren();for(const e of list){const wrap=document.createElement('div');wrap.className='match-face';wrap.dataset.unit=e.id;wrap.title=e.name;const face=document.createElement('canvas');face.width=face.height=64;const timer=document.createElement('small'),coin=document.createElement('i');coin.textContent='💰';coin.title='현상금';wrap.append(face,timer,coin);holder.append(wrap);}}
 for(const wrap of holder.children){const e=list.find(e=>e.id===Number(wrap.dataset.unit));wrap.classList.toggle('dead',!e.alive);wrap.querySelector('small').textContent=e.alive?'':Number.isFinite(e.respawnAt)?Math.max(0,Math.ceil(e.respawnAt-game.time)):'∞';wrap.querySelector('i').classList.toggle('hidden',!game.bounty(e));portrait(wrap.querySelector('canvas'),visualForm(game,e),renderer.atlas,renderer.atlasExtra,renderer.atlasV05,renderer.atlasV06,renderer.atlasV08,renderer.atlasV10,renderer.atlasV12,renderer.atlasV13,renderer.atlasV17);}
 }
}
function updatePointer(e){if(!inMatch())return;pointer={x:e.clientX,y:e.clientY};renderer.follow(game,inMatch());game.input.aim=renderer.point(e.clientX,e.clientY);}
function updateDrag(e){
 if(!drag)return;drag.choice=dragChoice(drag.key,e.clientX-drag.x,e.clientY-drag.y);
 $('drag-wheel').querySelectorAll('[data-dir]').forEach(el=>el.classList.toggle('selected',el.dataset.dir===drag.choice));
 $('drag-title').textContent=drag.choice?({up:'흰 곰방대',down:'파란 곰방대',left:drag.key==='ezra'?'이전 무기':'보라 곰방대',right:drag.key==='ezra'?'다음 무기':'붉은 곰방대'}[drag.choice]):'선택 취소';
}
$('arena').addEventListener('pointermove',updatePointer);window.addEventListener('pointermove',updateDrag);
$('arena').addEventListener('pointerdown',e=>{
 if(!active()||globalTarget||scoreOpen||!$('shop').classList.contains('hidden'))return;updatePointer(e);e.preventDefault();$('arena').focus();
 if(Infiltration.absent(game.player)){if(e.button===0)confirmOrAttack();if(e.button===2){game.input.precision=true;$('arena').setPointerCapture(e.pointerId);}return;}
 if(e.button===0){if(game.targeting){confirmOrAttack();return;}game.input.fire=true;game.attack(game.player,game.input.aim);}
 if(e.button===2){
  if(game.targeting){delete game.targeting;toast('스킬 조준 취소');return;}
  if(DRAG_KEYS.includes(game.player.key)){
   drag={key:game.player.key,x:e.clientX,y:e.clientY,choice:null,owner:game.player.id};game.input.fire=false;
   const w=$('drag-wheel');w.classList.remove('hidden');w.classList.toggle('ezra-wheel',drag.key==='ezra');w.style.left=`${Math.max(120,Math.min(innerWidth-120,e.clientX))}px`;w.style.top=`${Math.max(110,Math.min(innerHeight-110,e.clientY))}px`;updateDrag(e);
  }else skill('q');
 }
});
window.addEventListener('pointerup',e=>{if(pingMenu.end('pointer-'+e.pointerId))return;if(e.button===2||e.target.closest?.('#q-btn'))game.input.precision=false;if(Infiltration.absent(game.player)){game.input.fire=false;return;}if((e.button===2||e.target.closest?.('#q-btn'))&&chargeTactical(game.player)&&(game.player.state.chargeAt!==undefined||game.player.state.donCharge)){if(active())releaseTactical(game,game.player,game.input.aim);else cancelBasicCharge(game.player);}if(e.button===0){game.input.fire=false;if(active())releaseBasicCharge(game,game.player,game.input.aim);else cancelBasicCharge(game.player);}if(e.button===2&&drag){updateDrag(e);const chosen=drag.choice,owner=drag.owner;cancelDrag();if(chosen&&game.player.id===owner)skill('q',{direction:chosen});else toast('전술기 선택 취소');}});
window.addEventListener('pointercancel',()=>{pingMenu.cancel();game.input.precision=false;game.input.fire=false;cancelBasicCharge(game.player);});
for(const type of ['contextmenu','selectstart','dragstart'])$('arena').addEventListener(type,e=>e.preventDefault());
function mapPoint(canvas,e){const r=canvas.getBoundingClientRect();const bounds=game.bounds;return {x:bounds.x+(e.clientX-r.left)/r.width*bounds.w,y:bounds.y+(e.clientY-r.top)/r.height*bounds.h};}
$('score-map').addEventListener('contextmenu',e=>e.preventDefault());
$('score-map').addEventListener('pointerdown',e=>{e.preventDefault();});
$('target-map').addEventListener('pointermove',e=>globalPoint=mapPoint($('target-map'),e));
$('target-map').addEventListener('pointerdown',e=>{e.preventDefault();if(e.button===2){cancelGlobal();return;}if(e.button===0&&globalTarget){const point=mapPoint($('target-map'),e);if(globalKind==='summon'?Training.summon(game,summonChoice.key,summonChoice.team,point):globalKind==='teleport'?Training.teleport(game,point):skill('r',{confirmGlobal:true,point})){cancelGlobal();$('arena').focus();}else if(['teleport','summon'].includes(globalKind))toast('벽·건물·개체와 겹치지 않는 지점을 선택하세요.');}});
$('global-target').addEventListener('contextmenu',e=>e.preventDefault());$('global-cancel').onclick=cancelGlobal;
$('score-toggle').onclick=()=>showScore(!scoreOpen);$('score-close').onclick=()=>showScore(false);
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('이 화면은 전체 화면 권한이 없습니다. 브라우저 게임 탭에서 실행하세요.');}}
$('fullscreen').onclick=fullscreen;document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ 나가기':'⛶ 전체 화면';renderer.resize();});
window.addEventListener('blur',()=>{clearInput();cancelDrag();cancelGlobal();showScore(false);if(active())togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active())togglePause();});
window.addEventListener('keydown',e=>{
 if(!inMatch()&&!modalOpen()){if(e.code==='F12'&&!e.repeat){e.preventDefault();fullscreen();}else if(e.code==='Escape'&&!e.repeat){if(mode==='codex')closeCodex();else if(mode==='practice')mainMenu();}return;}
 if(modalOpen()||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
 if(e.code==='Tab'&&inMatch()){e.preventDefault();if(!e.repeat)showScore(true);return;}
 if(['Space','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();
 if(e.code==='F12'&&!e.repeat){e.preventDefault();fullscreen();return;}
 if(e.code==='Escape'&&!e.repeat){if(pingMenu.press){pingMenu.cancel();return;}if(Infiltration.absent(game.player)){game.cancelRecall(game.player);return;}if(mode==='codex'){closeCodex();return;}if(game.player.state.yanCharge||game.player.state.hohenCharge||game.player.state.donCharge){cancelBasicCharge(game.player);game.input.fire=false;return;}if(game.targeting){delete game.targeting;return;}if(game.player.state.chargeAt!==undefined){delete game.player.state.chargeAt;delete game.player.status.slow;return;}if(globalTarget){cancelGlobal();return;}if(game.player.recall){game.cancelRecall(game.player);return;}if(drag){cancelDrag();return;}if(scoreOpen){showScore(false);return;}if(document.fullscreenElement)return;if(!$('shop').classList.contains('hidden'))$('shop').classList.add('hidden');else togglePause();return;}
 if(e.code==='KeyB'&&!e.repeat){e.preventDefault();if(active()&&!globalTarget&&!scoreOpen){recallAction();}return;}
 if(e.code==='KeyG'&&!e.repeat){e.preventDefault();toggleShop();return;}
 if(PING_KEYS[e.code]){e.preventDefault();const rect=$('arena').getBoundingClientRect(),p=pointer||{x:rect.x+rect.width/2,y:rect.y+rect.height/2};pingMenu.keyDown(e,p.x,p.y);return;}
 if(!active()||globalTarget||scoreOpen||!$('shop').classList.contains('hidden'))return;keys.add(e.code);
 if(!e.repeat){if(e.code==='Space'&&!globalTarget)skill('r');}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(PING_KEYS[e.code]){pingMenu.end(e.code);return;}if(e.code==='Tab'){e.preventDefault();showScore(false);}});
function updateScores(){
 $('camp-timers').innerHTML=game.campTimers().map(t=>`<span>${escape(t.name)} <b>${clock(t.seconds)}</b></span>`).join('')||'<span>재생성 대기 중인 크립 없음</span>';
 $('score-rows').innerHTML=game.champions().map(p=>{const b=game.bonusStats(p),pct=n=>`${n>=0?'+':''}${n}%`,bounty=game.bounty(p);return `<tr class="${p.team===0?'ally-row':'enemy-row'}"><td>${p.team===0?'아군':'적군'} · ${escape(p.name)}${p.player?' (나)':''}${bounty?` <small class="bounty-tag">현상금 +${bounty} ◈</small>`:''}</td><td>${POSITIONS[p.position].name}</td><td>${p.level}</td><td>${p.kills} / ${p.deaths} / ${p.assists}</td><td>전투 ${pct(b.power)} · 체력 ${pct(b.health)} · 이동 ${pct(b.speed)} · 가속 ${pct(b.haste)} · 장전 ${pct(b.reload)}</td></tr>`;}).join('');
}
let visibleAnnouncement=null;
function updateAnnouncement(){
 const entry=mode==='playing'&&!presentation.blocking?game.currentAnnouncement():null,banner=$('battle-announcement');banner.classList.toggle('hidden',!entry);
 if(entry===visibleAnnouncement)return;visibleAnnouncement=entry;if(!entry)return;
 banner.dataset.kind=entry.kind;banner.classList.toggle('ally',entry.team===0);banner.classList.toggle('enemy',entry.team===1);
 $('announcement-kicker').textContent=entry.first?'선취점 확보 · 첫 처치 보상 +⅓':({kill:'챔피언 처치',execution:'처형',tower:'전장 상황','boss-spawn':'중앙 목표물','boss-kill':'목표물 확보'}[entry.kind]||'전장 상황');
 $('announcement-title').textContent=entry.title;$('announcement-detail').textContent=entry.detail;
}
function updateHud(){
 const p=game.player,c={...championDescription(p.key,Sora.ego(game,p)||Yan.distorted(game,p)),...Sora.abilityInfo(game,p),...Yan.abilityInfo(game,p),...Hohenheim.abilityInfo(game,p)};
 const form=visualForm(game,p);if($('hud-face').dataset.form!==form){$('hud-face').dataset.form=form;renderPortraits();}
 $('field-title').innerHTML=game.training?'<i class="live-dot"></i> 연습장 <em>/</em> 입체 실험 정원':'<i class="live-dot"></i> 제13구역 <em>/</em> 경계 전장';$('field-objective').textContent=game.training?'G · 무료 상점 / 우측 상단 연습장 옵션 · 시간 제한 없음':'포탑을 파괴하고 적 본진을 공략하세요.';
 document.querySelector('.match-clock>span').textContent=game.training?'TRAINING · 2.5D 실험 정원':'4 VS 4 · 2.5D 전장';
 $('clock').textContent=clock(game.training?game.time:Math.max(0,RULES.timeLimit-game.time));$('phase').textContent=!inMatch()?'출격 대기':game.training?'연습장 · 시간 제한 없음':game.winner!==null?'경기 종료':paused?'일시정지':game.bossSpawned?'남은 시간 · 후반전':'남은 시간 · 전반전';
 $('blue-score').textContent=game.kills[0];$('red-score').textContent=game.kills[1];
 $('blue-towers').textContent='▰ '.repeat(game.towers(0).length)+'▱ '.repeat(2-game.towers(0).length);$('red-towers').textContent='▰ '.repeat(game.towers(1).length)+'▱ '.repeat(2-game.towers(1).length);
 const boss=game.units.find(u=>u.camp==='boss');$('boss-time').textContent=boss?(boss.alive?`쌓인 것 · ${Math.ceil(boss.hp).toLocaleString()} HP`:`보스 재등장 ${clock(Math.max(0,boss.respawnAt-game.time))}`):`보스까지 ${clock(Math.max(0,300-game.time))}`;
 $('player-name').textContent=`${c.name} · ${game.training?'연습장':POSITIONS[p.position].name}`;$('level').textContent=`LV.${p.level}`;$('kda').textContent=`${p.kills} / ${p.deaths} / ${p.assists}`;
 $('xp-fill').style.width=`${p.level===RULES.maxLevel?100:Math.min(100,(p.xp-RULES.xp[p.level-1])/(RULES.xp[p.level]-RULES.xp[p.level-1])*100)}%`;
 $('champion-live-status').textContent=p.key==='yan'?`체력 ${Math.ceil(p.hp)} / ${Math.round(p.maxHp)} · ${Yan.distorted(game,p)?'손 공격':'충전 '+Math.round(Yan.chargeShape(game,p,game.input.aim).progress*100)+'%'}`:p.key==='hohenheim'?`체력 ${Math.ceil(p.hp)} / ${Math.round(p.maxHp)} · ${Hohenheim.chargeShape(game,p,game.input.aim).hits}타 · 충전 ${Math.round(Hohenheim.chargeShape(game,p,game.input.aim).progress*100)}%`:`체력 ${Math.ceil(p.hp)} / ${Math.round(p.maxHp)} · ${p.key==='rudolph'?'정신력':'탄약'} ${Math.floor(p.ammo)} / ${game.ammoCap(p)}`;
 $('recall-btn').title=Infiltration.replacesRecall(game,p)?'B · 1.75초 집중 → WASD 위치 이동 · 우클릭 유지로 정밀 이동 · 좌클릭 확정 → 0.5초 후 등장 · B로 취소':'B · 3초 정신집중 후 부활소로 귀환';$('recall-btn').querySelector('span').textContent=Infiltration.absent(p)?(Infiltration.selecting(p)?'침투 위치 선택':'침투 중'):p.recall?`${p.recall.infiltration?'침투 ':''}${Math.max(0,p.recall.until-game.time).toFixed(1)}s`:Infiltration.replacesRecall(game,p)?`침투${(p.state.infiltrationReady||0)>game.time?' '+Math.ceil(p.state.infiltrationReady-game.time)+'s':''}`:'귀환';$('recall-btn').classList.toggle('recalling',Boolean(p.recall)||Infiltration.absent(p));$('infiltration-help').classList.toggle('hidden',!Infiltration.absent(p)||!inMatch());$('infiltration-help').textContent=Infiltration.selecting(p)?'WASD 위치 이동 · 우클릭 / 전술기 버튼 유지: 정밀 이동 · 좌클릭 / 기본공격: 착지 확정'+(p.key==='jamila'&&p.rCd<=0?' · 궁극기: 즉시 선봉 투입':'')+' · B: 취소':'침투 중';
 $('basic-btn').querySelector('span').textContent=p.key==='ezra'?(game.buff(p,'ezraUlt')?'총공 모드':EZRA_WEAPONS[p.state.weapon||0].name):c.basic;
 for(const [slot,name,description] of [['q',c.tactical,c.qText],['r',c.ultimate,c.rText]]){const b=$(slot+'-btn');b.querySelector('span').textContent=name;b.title=description;b.disabled=slot==='r'&&(Yan.distorted(game,p)||Sora.ego(game,p));const cd=p.key==='yan'&&slot==='r'?(Yan.distorted(game,p)?p.buffs.yanDistorted-game.time:Yan.ready(game,p)?0:p.rCd):p.key==='sora'&&slot==='r'?(Sora.ego(game,p)?p.buffs.soraEgo-game.time:Sora.ready(game,p)?0:p.rCd):p[slot+'Cd'];const charges=skillCharges(game,p,slot),displayCd=Math.max(cd,charges?.remaining||0);b.querySelector('small').textContent=charges?`전술기 · ${charges.current}/${charges.max}`:slot==='q'?'전술기':'궁극기';const tracking=slot==='r'&&((p.key==='honglu'&&game.zones.find(z=>z.kind==='waterfall'&&z.source===p&&z.until>game.time)));b.querySelector('.cooldown').textContent=tracking?Math.ceil(tracking.until-game.time):displayCd>0?Math.ceil(displayCd):'';b.classList.toggle('on-cooldown',cd>0&&!tracking);b.classList.toggle('can-recast',Boolean(tracking));if(p.key==='heathcliff'&&slot==='q'&&p.state.chargeAt!==undefined)b.querySelector('span').textContent=`충전 ${Math.round(Math.min(1,(game.time-p.state.chargeAt)/1.5)*100)}% · 놓기`;if(p.key==='don'&&slot==='q'&&p.state.donCharge)b.querySelector('span').textContent=`충전 ${Math.round(Don.chargeShape(game,p,game.input.aim).progress*100)}% · 놓기`;if(p.key==='sora'&&slot==='q'&&Sora.ego(game,p))b.querySelector('span').textContent=`대행: 말살 · ${p.state.egoQCharges}/2`;}
 $('passive-slot').querySelector('span').textContent=c.passive;$('passive-slot').title=c.passiveText||c.brief;const passiveCd=game.passiveCooldown(p);$('passive-slot').querySelector('.cooldown').textContent=passiveCd>0?passiveCd.toFixed(1):'';$('passive-slot').classList.toggle('on-cooldown',passiveCd>0);$('basic-btn').title=c.basicText;const shownRange=p.key==='yan'&&!Yan.distorted(game,p)?Yan.chargeShape(game,p,game.input.aim).range:game.attackRange(p)*(p.key==='kim'&&p.state.followSlashUntil>game.time?1.2*1.08:1);$('basic-btn').querySelector('small').textContent=`사거리 ${Number(shownRange.toFixed(2))}`;
 document.querySelector('.match-clock>span').textContent=game.training?'자유 연습':`${game.champions(0).length} VS ${game.champions(1).length} · 두 개의 전선`;$('gold').textContent=Math.floor(p.gold).toLocaleString();updateAnnouncement();updateTeamPortraits();
 $('shop-status').textContent=game.training?'연습장 · 모든 장소·사망 중 이용 가능 · 강화 시술/증강 무료':game.canUpgrade(p)?(p.alive?'구매 가능 · 부활소 보급':'부활 대기 중 · 능력치 / 증강 변경 가능'):'부활 대기 중 또는 부활소에서 3초 비전투 시 구매 가능합니다.';
 updateShopCards(p);

 $('training-procedures').classList.toggle('hidden',!game.training);$('shop-title').textContent=game.training?'연습장 상점':'부활소 보급';updateTrainingOptions();
 $('augment-count').textContent=game.training?`${usedSlots(p)} / ${slots(p)} · 구매·판매 무료`:`${usedSlots(p)} / ${slots(p)} · 구매 ${AUGMENT_RULES.cost} ◈ / 판매 ${AUGMENT_RULES.cost*AUGMENT_RULES.refund} ◈`;
 updateShopInventory(p);
 const buffs=game.activeBuffs(p);$('buff-list').innerHTML=buffs.length?buffs.slice(0,3).map(b=>`<div class="buff-chip"><i>◆</i><b>${escape(b.key==='ahabOrder'?(p.state.order==='guard'?'자, 막아내라! · 이동/방어력 +12%':'엄호해라! · 아군 지원'):BUFF_LABELS[b.key]||b.key)}</b><span>${Number.isFinite(b.until)?Math.ceil(b.until-game.time)+'s':'∞'}</span></div>`).join(''):'<small>활성 버프 없음</small>';
 $('respawn').classList.toggle('hidden',p.alive||mode!=='playing'||game.winner!==null);if(!p.alive)$('respawn').innerHTML=game.training&&!Number.isFinite(p.respawnAt)?'연습장 대기<b>우측 상단 · 즉시 부활</b>':`부활 대기<b>${Math.max(0,Math.ceil(p.respawnAt-game.time))}</b>`;
 const entries=!inMatch()||game.presentation?.type==='outro'?[]:game.logs.filter(l=>game.time-l.time<8).slice(0,3);const feed=entries.map(l=>`<div class="${l.kind}"><time>${clock(l.time)}</time>${escape(l.text)}</div>`).join('');if($('event-feed').innerHTML!==feed)$('event-feed').innerHTML=feed;
 if(scoreOpen)updateScores();
 if(globalTarget&&(!p.alive&&globalKind!=='summon'||game.winner!==null))cancelGlobal();if(game.targeting&&(!p.alive||game.winner!==null))delete game.targeting;
}
function handleOutcome(){if(game.training){finish();return;}presentation.end(game);if(presentation.finished)finish();}
function finish(){mode='result';clearInput();cancelDrag();cancelGlobal();showScore(false);$('shop').classList.add('hidden');$('result').classList.remove('hidden');$('pause').disabled=true;$('result-title').textContent=game.winner===0?'승리':game.winner===1?'패배':'무승부';$('result-reason').textContent=`${game.reason} · ${clock(game.time)}`;$('result-stats').innerHTML=`${RUNTIME_CHAMPIONS[selected].name} · ${POSITIONS[position].name} · LV.${game.player.level}<br>${game.player.kills} / ${game.player.deaths} / ${game.player.assists} · 누적 실제 피해 ${Math.round(game.damageDone).toLocaleString()}`;updateHud();}
function frame(t){
 const elapsed=Math.min((t-last)/1000||0,.12);last=t;
 if(mode==='playing'&&game.winner!==null)handleOutcome();
 if(mode==='playing'&&!paused&&!modalOpen())presentation.tick(elapsed,game);
 if(mode==='playing'&&game.winner!==null)handleOutcome();
 pingMenu.tick();
 if(active()){
  game.input.x=globalTarget?0:Number(keys.has('KeyD'))-Number(keys.has('KeyA'));game.input.y=globalTarget?0:Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
  accumulator+=elapsed*speed;while(accumulator>=1/30&&game.winner===null){renderer.follow(game,true);if(pointer)game.input.aim=renderer.point(pointer.x,pointer.y);game.step(1/30);accumulator-=1/30;}if(game.winner!==null)handleOutcome();
 }else accumulator=0;
 if(mode!=='menu'&&mode!=='codex'&&mode!=='practice'&&mode!=='exited')renderer.draw(game,inMatch());if(inMatch()){renderer.minimap($('minimap'),game);const c=renderer.ctx;c.save();c.setTransform(renderer.dpr,0,0,renderer.dpr,0,0);Infiltration.draw(c,renderer.camera,game);presentation.draw(c,renderer.camera,game);c.restore();}if(scoreOpen)renderer.minimap($('score-map'),game);
 if(globalTarget){renderer.minimap($('target-map'),game);if(globalPoint){const c=$('target-map').getContext('2d'),sx=$('target-map').width/game.bounds.w,sy=$('target-map').height/game.bounds.h,radius=globalKind==='ultimate'?5.25:.75;c.beginPath();c.ellipse((globalPoint.x-game.bounds.x)*sx,(globalPoint.y-game.bounds.y)*sy,radius*sx,radius*sy,0,0,Math.PI*2);c.fillStyle='#ffac5033';c.fill();c.strokeStyle='#ffd396';c.lineWidth=2;c.stroke();}}
 audio.sync(game,{paused:paused||modalOpen(),playing:inMatch()});
 if(t-lastHud>100){updateHud();lastHud=t;}requestAnimationFrame(frame);
}
function showDialog(id){clearInput();cancelDrag();cancelGlobal();showScore(false);$(id).showModal();}
$('help-open').onclick=()=>showDialog('help');$('field-help').onclick=()=>showDialog('help');
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',clearInput));
let codexReturn=null;
const codexScreen=new CodexScreen($('archive'),{onClose:()=>closeCodex(),onPlay:(key,experimental)=>{closeCodex(true);if(experimental){selected=key;position='jungle';start();}else{showPractice('training');select(key);}}});
function openCodex(push=true){if(mode!=='codex'){codexReturn={mode,paused};clearInput();cancelDrag();cancelGlobal();showScore(false);$('shop').classList.add('hidden');mode='codex';document.body.classList.add('codex-screen');}const route=location.hash.startsWith('#codex/')?location.hash.split('/')[1]:codexScreen.category;if(push&&!location.hash.startsWith('#codex'))history.pushState({codex:true,fromApp:true},'',`#codex/${route}`);codexScreen.show(route);$('archive').focus({preventScroll:true});}
function closeCodex(fromHistory=false){if(mode!=='codex')return;$('archive').classList.add('hidden');document.body.classList.remove('codex-screen');mode=codexReturn?.mode||'menu';paused=codexReturn?.paused||false;codexReturn=null;if(location.hash.startsWith('#codex')){if(!fromHistory&&history.state?.fromApp)history.back();else history.replaceState(null,'',location.href.split('#')[0]);}}
$('pause-archive').onclick=()=>openCodex();$('archive-open').onclick=()=>openCodex();$('menu-codex').onclick=()=>openCodex();
window.addEventListener('popstate',()=>{if(location.hash.startsWith('#codex'))openCodex(false);else closeCodex(true);});
if(new URLSearchParams(location.search).has('debug'))window.__moba={get game(){return game;},get mode(){return mode;},get paused(){return paused;},get renderer(){return renderer;},get globalTarget(){return globalTarget;},get dragging(){return drag;},get targeting(){return game.targeting;},get selectedPosition(){return position;},get presentation(){return presentation;},get audio(){return audio;},get pingMenu(){return pingMenu;},get draft(){return pickScreen;},get codex(){return codexScreen;}};
setPosition(position);mainMenu();if(location.hash.startsWith('#codex'))openCodex(false);requestAnimationFrame(frame);
