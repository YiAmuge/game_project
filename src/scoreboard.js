import{UPGRADES,RUNTIME_CHAMPIONS}from'./data.js';
import{preview}from'./asset-preview.js';
import{visualForm}from'./art.js';
import*as AugmentArt from'./augment-art.js';
import{AUGMENTS,augmentText}from'./augments.js';
import{upgradeIcon}from'./upgrade-icons.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const playerNickname=e=>e.nickname||(e.player?'나':e.trainingDummy?'허수아비':`AI ${e.index+1}`);
export class Scoreboard{
 constructor(root){this.root=root;}
 update(g){
  const list=g.champions().slice().sort((a,b)=>Number(b.team===g.player.team)-Number(a.team===g.player.team)||a.index-b.index),stamp=JSON.stringify(list.map(e=>[e.id,e.key,visualForm(g,e),playerNickname(e),e.team,e.level,e.kills,e.deaths,e.assists,e.upgrades,e.augments]));if(stamp===this.stamp)return;this.stamp=stamp;this.root.closest('table').dataset.playerCount=list.length;this.root.replaceChildren();
  for(const e of list){const row=document.createElement('tr');row.className=e.team===g.player.team?'ally-row':'enemy-row';row.dataset.unit=e.id;
   row.innerHTML=`<td class="score-champion"><canvas width="80" height="80" aria-label="${escape(e.name)}"></canvas><small>${escape(RUNTIME_CHAMPIONS[e.key]?.name||e.name)}</small></td><td class="score-nickname team-${e.team}">${escape(playerNickname(e))}${e===g.player?' <small>(나)</small>':''}</td><td>${e.level}</td><td class="score-kda">${e.kills} / ${e.deaths} / ${e.assists}</td><td><div class="score-upgrades">${UPGRADES.map(u=>`<span data-upgrade="${u.key}" data-stage="${e.upgrades[u.key]}" title="${u.name} +${e.upgrades[u.key]}">${upgradeIcon(u.key)}<b>+${e.upgrades[u.key]}</b></span>`).join('')}</div></td><td><div class="score-augments"></div></td>`;
   this.root.append(row);preview(row.querySelector('canvas'),{key:visualForm(g,e),portrait:true});for(const key of e.augments){const item=AUGMENTS.find(a=>a.key===key);if(!item)continue;const icon=AugmentArt.icon(key,item.group,64);icon.title=item.name+' · '+augmentText(e,key);icon.setAttribute('aria-label',item.name);row.querySelector('.score-augments').append(icon);}
  }
 }
}
