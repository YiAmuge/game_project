import{WebSocketServer}from'ws';
import{randomBytes,createHmac}from'node:crypto';
import{CHAMPIONS}from'../src/data.js';
import{ONLINE_VERSION,ROOM_CAPACITY,ROOM_POSITIONS,roomCode}from'../src/online-protocol.js';

const token=()=>randomBytes(24).toString('base64url');
const cleanName=value=>String(value||'플레이어').replace(/[\x00-\x1f<>]/g,'').trim().slice(0,16)||'플레이어';
export function iceServers(env=process.env){
 const servers=[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}];
 const urls=String(env.TURN_URLS||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(urls.length){let username=env.TURN_USERNAME,credential=env.TURN_CREDENTIAL;
  if(env.TURN_SECRET){username=`${Math.floor(Date.now()/1000)+86400}:city-border`;credential=createHmac('sha1',env.TURN_SECRET).update(username).digest('base64');}
  if(username&&credential)servers.push({urls,username,credential});
 }
 return servers;
}
export function attachOnline(server,{env=process.env}={}){
 const rooms=new Map(),sessions=new Map(),wss=new WebSocketServer({noServer:true,maxPayload:96*1024,perMessageDeflate:false});
 const send=(ws,value)=>{if(ws?.readyState===1)ws.send(JSON.stringify(value));};
 const view=r=>({code:r.code,hostId:r.hostId,phase:r.phase,version:ONLINE_VERSION,slots:r.slots.map(s=>({...s})),members:[...r.members.values()].map(m=>({id:m.id,name:m.name,slot:m.slot,champion:m.champion,ready:m.ready,connected:m.ws?.readyState===1})),match:r.match});
 const broadcast=r=>{const message={type:'room',room:view(r)};for(const m of r.members.values())send(m.ws,message);};
 const removeRoom=(r,reason)=>{for(const m of r.members.values()){send(m.ws,{type:'closed',message:reason});sessions.delete(m.token);m.room=null;}rooms.delete(r.code);};
 function detach(m,explicit=false){const r=m?.room;if(!r)return;m.ws=null;m.ready=false;
  if(m.id===r.hostId){removeRoom(r,'방장이 나가서 방이 종료되었습니다.');return;}
  if(explicit||r.phase==='lobby'){r.members.delete(m.id);r.slots[m.slot]={bot:null};sessions.delete(m.token);m.room=null;}
  else{m.expires=Date.now()+45000;send(r.members.get(r.hostId)?.ws,{type:'disconnected',id:m.id});}
  broadcast(r);
 }
 const requireLobby=r=>{if(r.phase!=='lobby')throw Error('경기 중에는 편성을 변경할 수 없습니다.');};
 wss.on('connection',ws=>{
  let member=null,count=0,bytes=0,bucket=Date.now();ws.alive=true;ws.on('pong',()=>ws.alive=true);
  ws.on('message',raw=>{try{
   if(Date.now()-bucket>1000){bucket=Date.now();count=0;bytes=0;}bytes+=raw.length;if(++count>2400||bytes>24*1024*1024){ws.close(1008,'rate limit');return;}
   const p=JSON.parse(raw);if(!p||typeof p!=='object')return;
   if(p.version!==ONLINE_VERSION)throw Error('게임 버전이 다릅니다. 새로고침해 주세요.');
   if(p.type==='leave'){detach(member,true);member=null;send(ws,{type:'left'});return;}
   if(p.type==='create'||p.type==='join'||p.type==='resume'){
    if(member?.room)throw Error('현재 방에서 먼저 나가 주세요.');
    if(p.type==='resume'){
     const m=sessions.get(p.token);if(!m?.room||m.ws?.readyState===1||m.expires<Date.now())throw Error('재접속 가능한 방이 없습니다.');
     member=m;m.ws=ws;delete m.expires;send(ws,{type:'welcome',id:m.id,token:m.token,iceServers:iceServers(env)});broadcast(m.room);return;
    }
    let r;if(p.type==='create'){
     if(rooms.size>=200)throw Error('현재 생성 가능한 방 수를 초과했습니다.');let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));
     r={code,hostId:null,phase:'lobby',members:new Map(),slots:Array.from({length:8},()=>({bot:'random'})),match:null};rooms.set(code,r);
    }else{r=rooms.get(roomCode(p.code));if(!r)throw Error('방 코드를 확인해 주세요.');requireLobby(r);}
    if(r.members.size>=ROOM_CAPACITY)throw Error('방이 가득 찼습니다.');
    const slot=r.slots.findIndex(s=>!s.memberId);if(slot<0)throw Error('빈자리가 없습니다.');
    member={id:randomBytes(8).toString('hex'),token:token(),name:cleanName(p.name),slot,champion:'faust',ready:false,ws,room:r};
    r.members.set(member.id,member);sessions.set(member.token,member);r.slots[slot]={memberId:member.id};r.hostId??=member.id;
    send(ws,{type:'welcome',id:member.id,token:member.token,iceServers:iceServers(env)});broadcast(r);return;
   }
   const r=member?.room;if(!r)throw Error('방에 먼저 참가해 주세요.');
   if(p.type==='choose'){
    requireLobby(r);if(CHAMPIONS[p.champion])member.champion=p.champion;
    if(Number.isInteger(p.slot)&&p.slot>=0&&p.slot<8&&p.slot!==member.slot){if(r.slots[p.slot].memberId)throw Error('이미 참가자가 있는 자리입니다.');r.slots[member.slot]={bot:'random'};member.slot=p.slot;r.slots[p.slot]={memberId:member.id};}
    member.ready=false;broadcast(r);
   }else if(p.type==='bot'){
    requireLobby(r);if(member.id!==r.hostId)throw Error('방장만 AI를 편성할 수 있습니다.');
    if(!Number.isInteger(p.slot)||!r.slots[p.slot]||r.slots[p.slot].memberId)throw Error('빈 슬롯을 선택해 주세요.');
    if(p.champion!==null&&p.champion!=='random'&&!CHAMPIONS[p.champion])throw Error('유효하지 않은 챔피언입니다.');
    r.slots[p.slot]={bot:p.champion};for(const m of r.members.values())m.ready=false;broadcast(r);
   }else if(p.type==='ready'){requireLobby(r);member.ready=p.ready===true;broadcast(r);
   }else if(p.type==='start'){
    requireLobby(r);if(member.id!==r.hostId)throw Error('방장만 경기를 시작할 수 있습니다.');
    if([...r.members.values()].some(m=>m.id!==r.hostId&&(!m.ready||m.ws?.readyState!==1)))throw Error('모든 참가자의 준비가 필요합니다.');
    r.phase='playing';r.match={id:token(),startedAt:Date.now(),seed:randomBytes(4).readUInt32LE(),slots:r.slots.map((s,i)=>{const m=r.members.get(s.memberId);return m?{memberId:m.id,champion:m.champion,team:Math.floor(i/4),position:ROOM_POSITIONS[i%4]}:{champion:s.bot,team:Math.floor(i/4),position:ROOM_POSITIONS[i%4]};})};broadcast(r);
   }else if(p.type==='return'){
    if(member.id!==r.hostId)throw Error('방장만 대기실로 돌아갈 수 있습니다.');r.phase='lobby';r.match=null;
    for(const m of [...r.members.values()]){m.ready=false;if(!m.ws){r.members.delete(m.id);sessions.delete(m.token);r.slots[m.slot]={bot:'random'};m.room=null;}}broadcast(r);
   }else if(p.type==='signal'||p.type==='relay'){
    const target=r.members.get(p.to);if(!target||target.id===member.id||member.id!==r.hostId&&target.id!==r.hostId)throw Error('연결 대상을 확인해 주세요.');
    if(!p.data||JSON.stringify(p.data).length>(p.type==='relay'?65000:80000))throw Error('연결 정보가 너무 큽니다.');
    if(p.type==='relay'&&target.ws?.bufferedAmount>4*1024*1024){target.ws.close(1013,'connection congested');return;}
    // Only forward opaque packets; combat is still computed in the room owner's browser.
    send(target.ws,{type:p.type,from:member.id,data:p.data});
   }
  }catch(error){send(ws,{type:'error',message:error.message||'요청을 처리하지 못했습니다.'});}});
  ws.on('close',()=>{if(member?.ws===ws)detach(member);});
 });
 const upgrade=(req,socket,head)=>{if(new URL(req.url,'http://localhost').pathname!=='/online')return;
  // A same-origin websocket prevents unrelated sites from creating rooms with a visitor's browser.
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 };server.on('upgrade',upgrade);
 const timer=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}for(const m of sessions.values())if(m.expires<Date.now()&&m.room)detach(m,true);},15000);timer.unref();
 server.on('close',()=>{clearInterval(timer);server.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();wss.close();});
 return{rooms,wss,config:()=>({version:ONLINE_VERSION,iceServers:iceServers(env),relayConfigured:iceServers(env).some(s=>s.username),capacity:ROOM_CAPACITY})};
}
