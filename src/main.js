import { Game } from './game.js';
import { CHAMPIONS, RULES, UPGRADES } from './data.js';
import { Renderer } from './render.js';
import { portrait } from './art.js';

const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clock=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let selected='faust',game=new Game(selected),mode='lobby',paused=false,speed=1,keys=new Set(),last=0,accumulator=0,lastHud=0,roster=[],activeRecord=2,toastTimer,pointer=null;
const renderer=new Renderer($('arena'));
new ResizeObserver(()=>renderer.resize()).observe($('arena'));
function toast(message) {$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),2800);}
function clearInput(){keys.clear();game.input.fire=false;game.input.x=0;game.input.y=0;}
function renderPortraits(){document.querySelectorAll('.champion-portrait').forEach(c=>portrait(c,c.dataset.key,renderer.atlas));portrait($('hud-face'),selected,renderer.atlas);}
renderer.atlas.addEventListener('load',renderPortraits);
function modalOpen(){return Boolean(document.querySelector('dialog[open]'));}
function active(){return mode==='playing'&&!paused&&!modalOpen()&&game.winner===null;}
function select(key) {
  selected=key;game=new Game(key);const c=CHAMPIONS[key];
  document.querySelectorAll('.champion-option').forEach(b=>{b.classList.toggle('selected',b.dataset.key===key);b.setAttribute('aria-pressed',b.dataset.key===key);});
  $('selected-name').textContent=c.name;$('selected-role').textContent=c.role;$('selected-brief').textContent=c.brief;
  $('selected-stats').innerHTML=[['전투력',c.power],['체력',c.health],['기동성',c.speed]].map(([name,n])=>`<span>${name}<b>${'●'.repeat(n)}${'○'.repeat(5-n)}</b></span>`).join('');
  renderPortraits();updateHud();
}
for(const [key,c] of Object.entries(CHAMPIONS)) {
  const b=document.createElement('button');b.className='champion-option';b.dataset.key=key;b.setAttribute('aria-label',`${c.name} 선택`);
  b.innerHTML=`<canvas class="champion-portrait" data-key="${key}" width="80" height="80"></canvas><small>${c.name}</small>`;b.onclick=()=>select(key);$('champion-select').append(b);
}
function start() {
  game=new Game(selected);mode='playing';paused=false;accumulator=0;speed=1;clearInput();
  document.body.classList.add('in-game');$('minimap').classList.remove('hidden');pointer=null;game.input.aim={x:game.player.x+5,y:game.player.y};
  $('lobby').classList.add('hidden');$('result').classList.add('hidden');$('pause-banner').classList.add('hidden');$('pause').disabled=false;$('pause').textContent='Ⅱ';$('speed').textContent='1×';$('arena').focus();updateHud();
}
function togglePause() {
  if(mode!=='playing'||game.winner!==null)return;
  paused=!paused;clearInput();$('pause-banner').classList.toggle('hidden',!paused);$('pause').textContent=paused?'▶':'Ⅱ';
}
function skill(slot) {
  if(!active())return;
  if(!game.cast(game.player,slot,game.input.aim))toast(!game.player.alive?'부활을 기다리는 중입니다.':'재사용 대기 또는 행동 제한 상태입니다.');
  updateHud();
}
$('start').onclick=start;$('pause').onclick=togglePause;$('resume').onclick=togglePause;
function returnToLobby(){mode='lobby';paused=false;clearInput();document.body.classList.remove('in-game');$('minimap').classList.add('hidden');$('result').classList.add('hidden');$('pause-banner').classList.add('hidden');$('lobby').classList.remove('hidden');$('shop').classList.add('hidden');$('pause').disabled=true;pointer=null;select(selected);}
$('restart').onclick=returnToLobby;
$('leave').onclick=returnToLobby;
$('home').onclick=e=>{e.preventDefault();returnToLobby();};
$('speed').onclick=()=>{speed=speed===1?2:speed===2?4:1;$('speed').textContent=`${speed}×`;};
$('q-btn').onclick=()=>skill('q');$('r-btn').onclick=()=>skill('r');
$('basic-btn').onclick=()=>{if(active())game.attack(game.player,game.input.aim);};
$('potion-btn').onclick=()=>{if(active()&&!game.usePotion(game.player))toast('사용 가능한 회복 물약이 없습니다.');};
$('shop-toggle').onclick=()=>{$('shop').classList.toggle('hidden');updateHud();};$('shop-close').onclick=()=>$('shop').classList.add('hidden');
for(const item of UPGRADES) {
  const b=document.createElement('button');b.className='shop-item';b.id=`buy-${item.key}`;
  b.onclick=()=>{if(active()&&game.buy(game.player,item.key)){toast(`${item.name} 강화 완료`);updateHud();}};$('upgrade-list').append(b);
}
$('buy-potion').onclick=()=>{if(active()&&game.buy(game.player,'potion')){toast('회복 물약 2회분 구입');updateHud();}};
function updatePointer(e){pointer={x:e.clientX,y:e.clientY};renderer.follow(game,mode!=='lobby');game.input.aim=renderer.point(e.clientX,e.clientY);}
$('arena').addEventListener('pointermove',updatePointer);
$('arena').addEventListener('pointerdown',e=>{if(active()){updatePointer(e);e.preventDefault();$('arena').focus();if(e.button===0)game.input.fire=true;if(e.button===2)skill('q');}});
window.addEventListener('pointerup',e=>{if(e.button===0)game.input.fire=false;});
$('arena').addEventListener('contextmenu',e=>e.preventDefault());
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('이 미리보기는 전체 화면을 허용하지 않습니다. 다운로드한 HTML을 일반 브라우저에서 열어 주세요.');}}
$('fullscreen').onclick=fullscreen;
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ 나가기':'⛶ 전체 화면';renderer.resize();});
window.addEventListener('blur',()=>{clearInput();if(active())togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active())togglePause();});
window.addEventListener('keydown',e=>{
  if(modalOpen()||['INPUT','TEXTAREA'].includes(e.target.tagName))return;
  if(['Space','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();
  if(e.code==='KeyF'&&!e.repeat){e.preventDefault();fullscreen();return;}
  if(e.code==='Escape'&&!e.repeat){if(document.fullscreenElement)return;if(!$('shop').classList.contains('hidden'))$('shop').classList.add('hidden');else togglePause();return;}
  if(e.code==='KeyB'&&!e.repeat){$('shop').classList.toggle('hidden');updateHud();}
  if(!active())return;
  keys.add(e.code);
  if(!e.repeat){if(e.code==='Space')skill('r');if(e.code==='Digit1')$('potion-btn').click();}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
function updateHud() {
  const p=game.player,c=CHAMPIONS[p.key];
  $('clock').textContent=clock(game.time);$('phase').textContent=mode==='lobby'?'출격 대기':game.winner!==null?'경기 종료':paused?'일시정지':game.bossSpawned?'후반전 · 본진을 공략하세요':'전반전 · 라인을 확보하세요';
  $('blue-score').textContent=game.kills[0];$('red-score').textContent=game.kills[1];
  $('blue-towers').textContent='▰ '.repeat(game.towers(0).length)+'▱ '.repeat(2-game.towers(0).length);$('red-towers').textContent='▰ '.repeat(game.towers(1).length)+'▱ '.repeat(2-game.towers(1).length);
  const boss=game.units.find(u=>u.camp==='boss');$('boss-time').textContent=boss?(boss.alive?`중앙 보스 · ${Math.ceil(boss.hp).toLocaleString()} HP`:'중앙 보스 · 처치 완료'):`보스 출현까지 ${clock(300-game.time)}`;
  $('player-name').textContent=c.name;$('level').textContent=`LV.${p.level}`;$('kda').textContent=`${p.kills} / ${p.deaths}`;
  $('health-fill').style.width=`${Math.max(0,p.hp/p.maxHp*100)}%`;$('health-text').textContent=`${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}${game.shield(p)>0?' + 보호막':''}`;
  $('xp-fill').style.width=`${p.level===5?100:Math.min(100,(p.xp-RULES.xp[p.level-1])/(RULES.xp[p.level]-RULES.xp[p.level-1])*100)}%`;
  $('ammo').innerHTML=Array.from({length:c.ammo},(_,i)=>`<i class="${i<p.ammo?'loaded':''}">${i===p.ammo?`<em style="width:${Math.min(100,p.reloadProgress/game.reloadInterval(p)*100)}%"></em>`:''}</i>`).join('');
  $('basic-btn').querySelector('span').textContent=c.basic;
  for(const [slot,name,description] of [['q',c.tactical,c.qText],['r',c.ultimate,c.rText]]) {
    const b=$(slot+'-btn');b.querySelector('span').textContent=name;b.title=description;b.querySelector('.cooldown').textContent=p[slot+'Cd']>0?Math.ceil(p[slot+'Cd']):'';b.classList.toggle('on-cooldown',p[slot+'Cd']>0);
  }
  $('gold').textContent=Math.floor(p.gold).toLocaleString();$('potion-count').textContent=p.potion?`${p.potion}회 남음`:'미보유';
  $('shop-status').textContent=mode==='lobby'?'전장 진입 후 구매할 수 있습니다.':game.canShop(p)?'보급 가능 · 강화 효과는 경기 동안 유지됩니다.':'본진 뒤 부활소로 돌아오세요. 전투 종료 후 3초 필요.';
  for(const item of UPGRADES) {
    const n=p.upgrades[item.key],b=$('buy-'+item.key),cost=RULES.costs[n];
    b.innerHTML=`<span>${item.name} <small>${item.effect} / 단계 · ${n} / ${item.max}</small></span><b>${n>=item.max?'완료':cost+' ◈'}</b>`;
    b.disabled=!active()||!game.canShop(p)||n>=item.max||p.gold<cost;
  }
  $('buy-potion').disabled=!active()||!game.canShop(p)||p.gold<90||p.potion>0;
  $('respawn').classList.toggle('hidden',p.alive||mode!=='playing'||game.winner!==null);
  if(!p.alive)$('respawn').innerHTML=`부활 대기<b>${Math.max(0,Math.ceil(p.respawnAt-game.time))}</b>`;
  const entries=mode==='lobby'?[]:game.logs.filter(l=>game.time-l.time<8).slice(0,3);
  const feed=entries.map(l=>`<div class="${l.kind}"><time>${clock(l.time)}</time>${escape(l.text)}</div>`).join('');
  if($('event-feed').innerHTML!==feed)$('event-feed').innerHTML=feed;
}
function finish() {
  mode='result';clearInput();$('shop').classList.add('hidden');$('result').classList.remove('hidden');$('pause').disabled=true;
  $('result-title').textContent=game.winner===0?'작전 성공':game.winner===1?'작전 실패':'무승부';
  $('result-reason').textContent=`${game.reason} · ${clock(game.time)}`;
  $('result-stats').innerHTML=`${CHAMPIONS[selected].name} · LV.${game.player.level}<br>${game.player.kills} 처치 / ${game.player.deaths} 사망 · 누적 실제 피해 ${Math.round(game.damageDone).toLocaleString()}`;updateHud();
}
function frame(t) {
  const elapsed=Math.min((t-last)/1000||0,.12);last=t;
  if(active()) {
    game.input.x=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));game.input.y=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
    accumulator+=elapsed*speed;
    while(accumulator>=1/30&&game.winner===null){renderer.follow(game,true);if(pointer)game.input.aim=renderer.point(pointer.x,pointer.y);game.step(1/30);accumulator-=1/30;}
    if(game.winner!==null)finish();
  } else accumulator=0;
  renderer.draw(game,mode!=='lobby');if(mode!=='lobby')renderer.minimap($('minimap'),game);if(t-lastHud>100){updateHud();lastHud=t;}
  requestAnimationFrame(frame);
}
function showDialog(id) {clearInput();$(id).showModal();}
$('help-open').onclick=()=>showDialog('help');
$('field-help').onclick=()=>showDialog('help');
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',clearInput));
function recordList() {
  const q=$('roster-search').value.trim();const filtered=roster.filter(c=>c.name.includes(q)||c.role.includes(q));
  $('roster-list').innerHTML=filtered.length?filtered.map(c=>`<button data-id="${c.id}" class="${c.id===activeRecord?'active':''}">${escape(c.name)}<small>${escape(c.role)}</small></button>`).join(''):'<p>검색 결과가 없습니다.</p>';
  $('roster-list').querySelectorAll('button').forEach(b=>b.onclick=()=>record(Number(b.dataset.id)));
}
function record(id) {
  activeRecord=id;const c=roster.find(c=>c.id===id);if(!c)return;
  const playable=Object.values(CHAMPIONS).some(p=>p.id===id);
  $('roster-detail').innerHTML=`<span class="eyebrow">NO.${String(c.id).padStart(2,'0')} / ${escape(c.role)}</span><h2>${escape(c.name)}</h2><span class="availability">${playable?'플레이 가능 · 일부 효과는 프로토타입 구현':'기획 수록 · 아직 플레이 불가'}</span><p class="quote">${escape(c.quote)}</p><p class="stats">${escape(c.stats)}</p>${c.skills.map(s=>`<h3>${escape(s.kind)} / ${escape(s.name)}</h3><p>${escape(s.description)}</p>`).join('')}<p>${escape(c.note)}</p><p>위 내용은 첨부 밸런스 제안서 원안입니다. 현재 구현과의 차이는 개발 명세를 참고하세요.</p>`;
  recordList();
}
$('archive-open').onclick=async()=>{
  if(!roster.length)try{
    const embedded=$('roster-data');
    if(embedded)roster=JSON.parse(embedded.textContent);
    else {const res=await fetch('./src/roster.json');if(!res.ok)throw new Error();roster=await res.json();}
  }catch{toast('챔피언 기록을 불러오지 못했습니다.');return;}
  record(activeRecord);showDialog('archive');
};
$('roster-search').oninput=recordList;
if(new URLSearchParams(location.search).has('debug'))window.__moba={get game(){return game;},get mode(){return mode;},get paused(){return paused;},get renderer(){return renderer;}};
select(selected);requestAnimationFrame(frame);
