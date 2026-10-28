import{ONLINE_VERSION,ROOM_POSITIONS,roomCode}from'./online-protocol.js';
import{PacketReader,sendPacket}from'./online-state.js';
import{CHAMPIONS,POSITIONS}from'./data.js';
import{preview}from'./asset-preview.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class OnlineRoom{
 constructor({onStart,onPacket,onDisconnect,onClosed,onLobby,toast}){
  Object.assign(this,{onStart,onPacket,onDisconnect,onClosed,onLobby,toast});this.peers=new Map();this.config=null;this.room=null;this.id=null;this.generation=0;this.visible=false;this.connected=false;this.intentional=false;
  this.root=document.createElement('section');this.root.id='online-room';this.root.className='hidden';document.body.append(this.root);
  this.root.innerHTML=`<header class="online-heading"><div><small>USER HOSTED · ${ONLINE_VERSION}</small><h1>방 만들기 / 방 참여</h1></div><button id="online-back">← 메인 메뉴</button></header>
  <div id="online-entry"><label>닉네임<input id="online-name" maxlength="16" autocomplete="nickname" placeholder="플레이어"></label><div class="online-entry-actions"><button id="online-create" class="primary">방 만들기</button><label>방 코드<input id="online-code" maxlength="6" autocapitalize="characters" placeholder="ABC123"></label><button id="online-join">방 참여</button></div><p>브라우저에서 바로 연결됩니다. 방장이 경기 진행을 담당합니다.</p></div>
  <p id="online-status" role="status" aria-live="polite"></p><div id="online-lobby" class="hidden"><div class="online-invite"><strong id="online-room-code"></strong><button id="online-copy">초대 링크 복사</button><input id="online-link" aria-label="초대 링크" readonly></div><div class="online-layout"><aside id="online-team-0" class="online-team"></aside><section class="online-choices"><h2 id="online-choice-title">내 챔피언</h2><input id="online-search" aria-label="온라인 챔피언 검색" placeholder="챔피언 검색"><div id="online-champions" class="champion-select"></div></section><aside id="online-team-1" class="online-team enemy"></aside></div><footer class="online-footer"><p id="online-hint"></p><button id="online-ready">준비</button><button id="online-start" class="primary">경기 시작</button></footer></div>`;
  this.$=id=>this.root.querySelector('#'+id);try{this.$('online-name').value=localStorage.getItem('city-border-online-name')||'';}catch{}
  this.$('online-back').onclick=()=>{this.leave();this.onClosed?.(null);};this.$('online-create').onclick=()=>this.enter('create');this.$('online-join').onclick=()=>this.enter('join');this.$('online-code').oninput=e=>e.target.value=roomCode(e.target.value);this.$('online-code').onkeydown=e=>{if(e.key==='Enter')this.enter('join');};
  this.$('online-ready').onclick=()=>{const m=this.room.members.find(m=>m.id===this.id);this.send({type:'ready',ready:!m.ready});};
  this.$('online-start').onclick=()=>this.send({type:'start'});this.$('online-search').oninput=()=>this.renderChampions();
  this.$('online-copy').onclick=async()=>{const field=this.$('online-link');try{await navigator.clipboard.writeText(field.value);this.toast('초대 링크를 복사했습니다.');}catch{field.select();this.status('초대 링크를 선택했습니다. 복사해 공유해 주세요.');}};
  window.addEventListener('beforeunload',()=>{this.intentional=true;this.socket?.close();});
 }
 get isHost(){return Boolean(this.room&&this.room.hostId===this.id);}
 get playing(){return this.room?.phase==='playing';}
 status(message){this.$('online-status').textContent=message;}
 show(code){this.visible=true;this.root.classList.remove('hidden');document.body.classList.add('online-screen');if(code)this.$('online-code').value=roomCode(code);if(!this.room)this.status('닉네임을 입력하고 방을 만들거나 초대받은 방에 참가하세요.');this.render();}
 hide(){this.visible=false;this.root.classList.add('hidden');document.body.classList.remove('online-screen');}
 async connect(){
  if(this.socket?.readyState===1)return;if(this.connecting)return this.connecting;
  this.intentional=false;const generation=++this.generation;
  this.connecting=(async()=>{
   if(!['http:','https:'].includes(location.protocol))throw Error('온라인 대전은 게임 웹 링크로 접속해 주세요. 내려받은 HTML에서는 AI 대전과 연습장을 이용할 수 있습니다.');
   const response=await fetch('/api/online',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('방 연결 서비스를 찾을 수 없습니다. 온라인 서버가 제공하는 링크로 접속해 주세요.');
   this.config=await response.json();if(this.config.version!==ONLINE_VERSION)throw Error('서버와 게임 버전이 다릅니다. 새로고침해 주세요.');
   this.ice=this.config.iceServers;const url=new URL('/online',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
   const ws=this.socket=new WebSocket(url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.close();reject(Error('방 연결 시간이 초과되었습니다.'));},10000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=()=>{clearTimeout(timer);reject(Error('방 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'));};});
   if(generation!==this.generation){ws.close();return;}ws.onmessage=e=>{try{this.message(JSON.parse(e.data));}catch(error){this.status(error.message||'연결 정보를 처리하지 못했습니다.');}};
   ws.onclose=()=>{if(ws!==this.socket||this.intentional)return;this.connected=false;if(this.room&&!this.isHost){this.status('방 연결을 다시 시도하고 있습니다…');this.reconnect();}else if(this.room)this.closed('방장 연결이 끊겨 방이 종료되었습니다.');};
  })().finally(()=>this.connecting=null);return this.connecting;
 }
 async enter(type){try{this.status('방 연결 중…');await this.connect();const name=this.$('online-name').value.trim()||'플레이어';try{localStorage.setItem('city-border-online-name',name);}catch{}this.send({type,name,code:roomCode(this.$('online-code').value)});}catch(error){this.status(error.message);}}
 async reconnect(){if(this.reconnecting||this.intentional)return;this.reconnecting=true;for(let i=0;i<6&&!this.intentional;i++){
  try{await this.connect();this.send({type:'resume',token:this.token});this.reconnecting=false;return;}catch{await new Promise(r=>setTimeout(r,1000));}
 }this.reconnecting=false;if(!this.intentional)this.closed('연결이 끊어졌습니다. 방 코드로 다시 접속해 주세요.');}
 send(packet){if(this.socket?.readyState!==1)return false;this.socket.send(JSON.stringify({...packet,version:ONLINE_VERSION}));return true;}
 message(p){
  if(p.type==='welcome'){this.resumePending=false;this.helloSent=false;this.id=p.id;this.token=p.token;this.ice=p.iceServers;this.connected=true;try{sessionStorage.setItem('city-border-online-session',p.token);}catch{}return;}
  if(p.type==='error'){this.status(p.message);this.toast(p.message);if(this.resumePending){this.resumePending=false;this.clearSession();}return;}
  if(p.type==='closed'){this.closed(p.message);return;}
  if(p.type==='disconnected'){this.dropPeer(p.id);this.onDisconnect(p.id);return;}
  if(p.type==='signal'){this.signal(p.from,p.data).catch(()=>this.status('직접 연결을 만들지 못했습니다. 네트워크를 확인해 주세요.'));return;}
  if(p.type==='relay'){const peer=this.peers.get(p.from);if(!peer)return;const value=peer.reader.read(p.data);if(value)this.onPacket(p.from,value);return;}
  if(p.type==='room'){
   const previous=this.room;this.room=p.room;
   if(this.isHost){const ids=new Set(this.room.members.filter(m=>m.id!==this.id&&m.connected).map(m=>m.id));for(const id of this.peers.keys())if(!ids.has(id))this.dropPeer(id);}
   else if(!this.helloSent&&(!previous||!this.peers.has(this.room.hostId))){this.helloSent=true;this.send({type:'signal',to:this.room.hostId,data:{hello:true}});}
   this.render();if(this.room.phase==='playing'&&previous?.match?.id!==this.room.match.id){this.hide();this.onStart(this.room.match,this.id);}
   else if(this.room.phase==='lobby'&&previous?.phase==='playing'){this.show();this.onLobby();}
  }
 }
 peer(id,initiator){
  this.dropPeer(id);const pc=new RTCPeerConnection({iceServers:this.ice||[]}),peer={pc,reader:new PacketReader(),pending:[],opened:false};this.peers.set(id,peer);
  pc.onicecandidate=e=>{if(e.candidate)this.send({type:'signal',to:id,data:{candidate:e.candidate}});};
  const useRelay=()=>{if(this.peers.get(id)!==peer||peer.direct?.readyState==='open')return;peer.channel={readyState:'open',get bufferedAmount(){return this.owner.socket?.bufferedAmount||0;},owner:this,send:data=>{if(!this.send({type:'relay',to:id,data}))throw Error('중계 연결이 끊겼습니다.');},close:()=>{}};peer.opened=true;peer.transport='relay';this.status('중계 연결 완료 · 방장 기기에서 경기가 진행됩니다.');this.render();if(!this.isHost)this.sendHost({type:'sync'});};
  pc.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(pc.connectionState))useRelay();};
  const attach=channel=>{peer.direct=channel;if(!peer.channel)peer.channel=channel;channel.onopen=()=>{peer.channel=channel;peer.opened=true;peer.transport='direct';clearTimeout(peer.timeout);this.status('참가자 직접 연결 완료');this.render();if(!this.isHost)this.sendHost({type:'sync'});};channel.onmessage=e=>{const value=peer.reader.read(e.data);if(value)this.onPacket(id,value);};channel.onclose=useRelay;};
  if(initiator)attach(pc.createDataChannel('city-border',{ordered:true}));else pc.ondatachannel=e=>attach(e.channel);
  peer.timeout=setTimeout(useRelay,4000);return peer;
 }
 async signal(id,data){
  if(!this.room||!this.room.members.some(m=>m.id===id)||id!==this.room.hostId&&!this.isHost)return;
  if(data.hello&&this.isHost){const p=this.peer(id,true);await p.pc.setLocalDescription(await p.pc.createOffer());this.send({type:'signal',to:id,data:{description:p.pc.localDescription}});return;}
  let p=this.peers.get(id);if(data.description?.type==='offer'&&!this.isHost){p=this.peer(id,false);await p.pc.setRemoteDescription(data.description);for(const c of p.pending)await p.pc.addIceCandidate(c);p.pending=[];await p.pc.setLocalDescription(await p.pc.createAnswer());this.send({type:'signal',to:id,data:{description:p.pc.localDescription}});}
  else if(data.description?.type==='answer'&&this.isHost&&p){await p.pc.setRemoteDescription(data.description);for(const c of p.pending)await p.pc.addIceCandidate(c);p.pending=[];}
  else if(data.candidate&&p){if(p.pc.remoteDescription)await p.pc.addIceCandidate(data.candidate);else p.pending.push(data.candidate);}
 }
 dropPeer(id){const p=this.peers.get(id);if(!p)return;clearTimeout(p.timeout);this.peers.delete(id);p.pc.onconnectionstatechange=null;if(p.direct){p.direct.onclose=null;p.direct.close();}p.pc.close();}
 sendHost(value){const p=this.peers.get(this.room?.hostId);return p?.channel?.bufferedAmount<128000&&sendPacket(p.channel,value);}
 render(){
  const r=this.room;this.$('online-entry').classList.toggle('hidden',Boolean(r));this.$('online-lobby').classList.toggle('hidden',!r);if(!r)return;
  this.$('online-room-code').textContent='방 '+r.code;const link=new URL(location.pathname,location.origin);link.searchParams.set('room',r.code);this.$('online-link').value=link.href;
  const own=r.members.find(m=>m.id===this.id);if(!own)return;
  for(let team=0;team<2;team++){const root=this.$('online-team-'+team);root.innerHTML=`<h2>${team?'RED':'BLUE'} TEAM</h2>`;for(let i=team*4;i<team*4+4;i++){
   const slot=r.slots[i],m=r.members.find(m=>m.id===slot.memberId),pos=ROOM_POSITIONS[i%4],row=document.createElement('div');row.className='online-slot'+(m?.id===this.id?' is-player':'');
   if(m){const linked=m.id===this.id||this.peers.get(m.id)?.channel?.readyState==='open'||!this.isHost&&this.peers.get(r.hostId)?.channel?.readyState==='open';row.innerHTML=`<canvas width="80" height="80"></canvas><div><small>${POSITIONS[pos].name}${m.id===r.hostId?' · 방장':''}</small><strong>${escape(m.name)}${m.id===this.id?' · 나':''}</strong><span>${escape(CHAMPIONS[m.champion]?.name||'')} · ${!m.connected?'재접속 대기':!linked?'연결 중':m.ready?'준비 완료':'대기'}</span></div>`;}
   else{row.innerHTML=`<div><small>${POSITIONS[pos].name}</small><select aria-label="${team?'빨강':'파랑'} ${POSITIONS[pos].name} AI"><option value="random">무작위 AI</option><option value="none">없음</option>${Object.entries(CHAMPIONS).map(([key,c])=>`<option value="${key}">${escape(c.name)} AI</option>`).join('')}</select></div><button>이 자리로</button>`;const select=row.querySelector('select');select.value=slot.bot??'none';select.disabled=!this.isHost||r.phase!=='lobby';select.onchange=()=>this.send({type:'bot',slot:i,champion:select.value==='none'?null:select.value});row.querySelector('button').onclick=()=>this.send({type:'choose',slot:i});}
   root.append(row);if(m)preview(row.querySelector('canvas'),{key:m.champion,portrait:true});
  }}
  this.$('online-ready').classList.toggle('hidden',this.isHost);this.$('online-ready').textContent=own.ready?'준비 취소':'준비';this.$('online-ready').setAttribute('aria-pressed',String(own.ready));this.$('online-start').classList.toggle('hidden',!this.isHost);
  this.$('online-start').disabled=!r.members.every(m=>m.id===this.id||m.ready&&this.peers.get(m.id)?.channel?.readyState==='open');
  this.$('online-hint').textContent=this.isHost?'빈자리는 AI 또는 없음으로 설정하세요. 모두 준비하면 시작할 수 있습니다.':'빈자리를 눌러 팀·포지션을 바꾸고 챔피언 선택 후 준비하세요.';
  this.renderChampions();
 }
 renderChampions(){if(!this.room)return;const own=this.room.members.find(m=>m.id===this.id);if(!own)return;const root=this.$('online-champions'),query=this.$('online-search').value.trim().toLowerCase();root.replaceChildren();for(const [key,c]of Object.entries(CHAMPIONS)){if(query&&!`${key} ${c.name}`.toLowerCase().includes(query))continue;const b=document.createElement('button');b.className='champion-option'+(own.champion===key?' selected':'');b.dataset.key=key;b.setAttribute('aria-pressed',String(own.champion===key));b.innerHTML=`<canvas width="100" height="100"></canvas><span>${escape(c.name)}</span>`;b.onclick=()=>this.send({type:'choose',champion:key});root.append(b);preview(b.querySelector('canvas'),{key,portrait:true});}}
 clearSession(){try{sessionStorage.removeItem('city-border-online-session');}catch{}}
 resume(){try{const token=sessionStorage.getItem('city-border-online-session');if(!token)return;this.resumePending=true;this.show();this.status('이전 경기에 재접속 중…');this.connect().then(()=>this.send({type:'resume',token})).catch(e=>this.status(e.message));}catch{}}
 leave(){this.intentional=true;this.send({type:'leave'});this.socket?.close();for(const id of [...this.peers.keys()])this.dropPeer(id);this.room=null;this.id=null;this.clearSession();this.hide();}
 closed(message){this.leave();this.onClosed?.(message);}
}
