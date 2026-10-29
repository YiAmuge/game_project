import{RUNTIME_CHAMPIONS}from'./data.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import{cleanChat}from'./chat-wire.js';
export{cleanChat,CHAT_LIMIT}from'./chat-wire.js';
export function chatLineHTML(m){return`<div class="chat-line ${m.type==='chat'?'user-chat':'system-chat'}">${m.nickname?`<b class="team-${m.team}">${escape(m.nickname)}(${escape(RUNTIME_CHAMPIONS[m.champion]?.name||m.champion||'')})${m.type==='ping'?' [핑]':''}: </b>`:m.type==='ping'?'<b>[핑] </b>':''}<span>${escape(m.text)}</span></div>`;}
export function renderChatLines(root,messages,limit){const html=messages.slice(-limit).map(chatLineHTML).join('');if(root.innerHTML!==html)root.innerHTML=html;root.scrollTop=root.scrollHeight;}
export class MatchChat{
 constructor(api){this.api=api;this.opened=false;this.messages=[];this.ids=new Set();this.system=[];this.seenLogs=new Set();this.localSerial=0;
  this.root=document.createElement('section');this.root.id='match-chat';this.root.className='hidden';this.root.setAttribute('aria-label','채팅과 전장 기록');this.root.innerHTML='<div id="match-chat-lines" role="log" tabindex="-1" aria-label="채팅과 전장 기록"></div>';
  this.editor=document.createElement('section');this.editor.id='chat-editor';this.editor.className='hidden';this.editor.setAttribute('aria-label','채팅 입력');this.editor.innerHTML='<header><strong>채팅</strong><button id="chat-close" type="button" aria-label="채팅 닫기">×</button></header><div id="chat-expanded-lines" role="log" aria-live="polite"></div><form><input id="chat-input" maxlength="200" autocomplete="off" enterkeyhint="send" aria-label="채팅 내용" placeholder="메시지 입력"><button type="submit">전송</button></form>';document.body.append(this.root,this.editor);this.input=this.editor.querySelector('input');
  this.root.onclick=()=>{if(this.api.mobile()&&!this.api.moving()&&performance.now()>(this.blockedUntil||0))this.open();};this.root.addEventListener('pointerdown',e=>{if(this.api.mobile()&&this.api.moving()){this.blockedUntil=performance.now()+500;e.preventDefault();e.stopImmediatePropagation();}});
  this.editor.querySelector('#chat-close').onclick=()=>this.close();this.editor.querySelector('form').onsubmit=e=>{e.preventDefault();this.submit();};
  window.addEventListener('keydown',e=>{if(!this.api.playing()||e.isComposing)return;
   if(this.opened){if(e.code==='Escape'||e.code==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape')this.close();else this.submit();}else e.stopImmediatePropagation();return;}
   if(e.code==='Enter'&&!e.repeat&&!e.target.closest?.('input,textarea,select,[contenteditable=true]')){e.preventDefault();e.stopImmediatePropagation();this.open();}
  },true);
  const resize=()=>this.position();window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize);window.addEventListener('resize',resize);
 }
 receive(m){if(!m||!m.id||this.ids.has(m.id))return;this.ids.add(m.id);this.messages.push({...m,type:'chat'});if(this.messages.length>100){this.ids.delete(this.messages[0].id);this.messages.shift();}this.render();}
 open(){if(this.opened||!this.api.playing()||this.api.moving())return;this.api.clear();this.opened=true;this.editor.classList.remove('hidden');document.body.classList.add('chat-open');this.position();this.render();this.input.focus({preventScroll:true});
  if(document.fullscreenElement&&navigator.keyboard?.lock)navigator.keyboard.lock(['Escape']).then(()=>{if(!this.opened)navigator.keyboard.unlock();}).catch(()=>{});
 }
 close(){if(!this.opened)return;this.opened=false;this.input.value='';this.input.blur();this.editor.classList.add('hidden');document.body.classList.remove('chat-open');navigator.keyboard?.unlock?.();this.api.clear();}
 submit(){const text=cleanChat(this.input.value);if(text){const online=this.api.online(),g=this.api.game();if(online?.room){if(!online.send({type:'chat',text}))return;}else this.receive({id:'local-'+ ++this.localSerial,text,nickname:g.player.nickname||'나',champion:g.player.key,team:g.player.team,localGame:g,at:Date.now()});}this.close();}
 entries(){const g=this.api.game(),match=this.api.online()?.room?.match?.id;return[...this.messages.filter(m=>match?m.matchId===match:m.localGame===g),...this.system].sort((a,b)=>a.at-b.at);}
 tick(){const g=this.api.game(),visible=this.api.playing()&&!g.presentation;this.root.classList.toggle('hidden',!visible);if(!this.api.playing()&&this.opened)this.close();if(!visible)return;
  if(this.game!==g){this.game=g;this.seenLogs.clear();this.system=[];this.messages=this.messages.filter(m=>!m.localGame||m.localGame===g);}
  for(const l of [...g.logs].reverse()){const key=l.id??`${l.time}:${l.kind}:${l.text}`;if(this.seenLogs.has(key))continue;this.seenLogs.add(key);if(l.team!=null&&l.team!==g.player.team)continue;const source=g.units.find(e=>e.id===l.sourceId);this.system.push({type:l.category==='ping'?'ping':'system',text:l.text,at:Date.now()-(g.time-l.time)*1000,nickname:source?.nickname,champion:source?.key,team:l.team});}
  this.system=this.system.slice(-60);this.position();this.render();
 }
 render(){const messages=this.entries();renderChatLines(this.root.firstElementChild,messages,3);if(this.opened)renderChatLines(this.editor.querySelector('#chat-expanded-lines'),messages,5);}
 position(){if(!this.api.playing())return;const mobile=this.api.mobile(),anchor=document.querySelector(mobile?'#shop-toggle':'.player-card')?.getBoundingClientRect();if(!anchor)return;if(this.touchMode!==mobile){this.touchMode=mobile;const lines=this.root.firstElementChild;lines.setAttribute('role',mobile?'button':'log');lines.tabIndex=mobile?0:-1;lines.setAttribute('aria-label',mobile?'채팅 입력 열기':'채팅과 전장 기록');}
  const width=Math.min(mobile?220:370,innerWidth-20);this.root.style.width=width+'px';this.root.style.left=Math.min(anchor.left,innerWidth-width-8)+'px';
  if(mobile){this.root.style.top=anchor.bottom+5+'px';this.root.style.bottom='auto';}else{this.root.style.bottom=Math.max(10,innerHeight-anchor.top+7)+'px';this.root.style.top='auto';}
  if(this.opened){if(mobile){const v=window.visualViewport;Object.assign(this.editor.style,{left:'0px',top:(v?.offsetTop||0)+'px',bottom:'auto',width:'100vw',height:(v?.height||innerHeight)+'px'});}else Object.assign(this.editor.style,{left:this.root.style.left,top:'auto',bottom:this.root.style.bottom,width:width+'px',height:'auto'});}
 }
}
