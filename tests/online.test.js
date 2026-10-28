import test from'node:test';
import assert from'node:assert/strict';
import{createServer}from'node:http';
import{WebSocket}from'ws';
import{attachOnline,iceServers}from'../scripts/online-server.mjs';
import{ONLINE_VERSION,cleanInput}from'../src/online-protocol.js';
import{makeOnlineGame,executeCommand,OnlineMatch}from'../src/online-game.js';
import{SnapshotWriter,applySnapshot,PacketReader,sendPacket}from'../src/online-state.js';
import{Game}from'../src/game.js';
import{CHAMPIONS}from'../src/data.js';
import*as Pings from'../src/pings.js';
import*as Bot from'../src/bot-ai.js';
import{distance}from'../src/geometry.js';
const match=()=>({seed:1402,slots:[{memberId:'host',team:0,position:'top',champion:'faust'},{memberId:'guest',team:1,position:'bottom',champion:'hohenheim'},{team:0,position:'support',champion:'random'}]});
function channel(ws){const messages=[],waiters=[];ws.on('message',data=>{const p=JSON.parse(data);const index=waiters.findIndex(w=>w.type===p.type);if(index>=0)waiters.splice(index,1)[0].resolve(p);else messages.push(p);});return{send:p=>ws.send(JSON.stringify({version:ONLINE_VERSION,...p})),next:type=>{const index=messages.findIndex(p=>p.type===type);if(index>=0)return Promise.resolve(messages.splice(index,1)[0]);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Missing '+type)),2000);waiters.push({type,resolve:p=>{clearTimeout(timer);resolve(p);}});});}};}
test('room service creates shareable rooms, validates membership/readiness, relays only host peers and resumes guests',async()=>{
 const server=createServer(),service=attachOnline(server);await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`ws://127.0.0.1:${server.address().port}/online`,sockets=[];
 const connect=async()=>{const ws=new WebSocket(url);sockets.push(ws);const client=channel(ws);await new Promise(r=>ws.once('open',r));return{ws,...client};};
 try{const h=await connect();h.send({type:'create',name:'HOST'});const host=(await h.next('welcome')).id,r=(await h.next('room')).room;assert.equal(r.code.length,6);assert.equal(r.hostId,host);
  const c=await connect();c.send({type:'join',name:'GUEST',code:r.code});const guest=await c.next('welcome');await c.next('room');await h.next('room');
  c.send({type:'start'});assert.match((await c.next('error')).message,/방장/);h.send({type:'start'});assert.match((await h.next('error')).message,/준비/);
  c.send({type:'choose',slot:4,champion:'jamila'});let room=(await c.next('room')).room;await h.next('room');assert.equal(room.members.find(m=>m.id===guest.id).slot,4);
  c.send({type:'signal',to:host,data:{hello:true}});assert.equal((await h.next('signal')).from,guest.id);
  c.send({type:'ready',ready:true});await c.next('room');await h.next('room');h.send({type:'start'});room=(await h.next('room')).room;await c.next('room');assert.equal(room.phase,'playing');assert.equal(room.match.slots[4].champion,'jamila');
  c.ws.close();await new Promise(r=>c.ws.once('close',r));await h.next('disconnected');await h.next('room');const re=await connect();re.send({type:'resume',token:guest.token});assert.equal((await re.next('welcome')).id,guest.id);await re.next('room');await h.next('room');
  h.send({type:'return'});assert.equal((await h.next('room')).room.phase,'lobby');await re.next('room');
  h.send({type:'leave'});assert.match((await re.next('closed')).message,/방장/);assert.equal(service.rooms.size,0);
 }finally{for(const ws of sockets)ws.terminate();await new Promise(r=>server.close(r));}
});
test('TURN credentials are optional, support shared-secret expiry and never replace direct WebRTC',()=>{assert.equal(iceServers({}).length,1);const ice=iceServers({TURN_URLS:'turn:relay.example:3478,turns:relay.example:5349',TURN_SECRET:'test-secret'});assert.equal(ice.length,2);assert.match(ice[1].username,/:city-border$/);assert.ok(ice[1].credential);});
test('rooms accept eight members, reject a ninth and isolate signals and relay packets from other rooms',async()=>{
 const server=createServer();attachOnline(server);await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`ws://127.0.0.1:${server.address().port}/online`,sockets=[];
 const connect=async()=>{const ws=new WebSocket(url);sockets.push(ws);const c=channel(ws);await new Promise(r=>ws.once('open',r));return c;};
 try{const host=await connect();host.send({type:'create'});const identity=await host.next('welcome'),room=(await host.next('room')).room;
  for(let i=1;i<8;i++){const c=await connect();c.send({type:'join',code:room.code});await c.next('welcome');const view=(await c.next('room')).room;assert.equal(view.members.length,i+1);}
  const ninth=await connect();ninth.send({type:'join',code:room.code});assert.match((await ninth.next('error')).message,/가득/);
  const other=await connect();other.send({type:'create'});await other.next('welcome');await other.next('room');for(const type of ['signal','relay']){other.send({type,to:identity.id,data:{hello:true}});assert.match((await other.next('error')).message,/연결 대상/);}
 }finally{for(const ws of sockets)ws.terminate();await new Promise(r=>server.close(r));}
});
test('each human can ping with an independent cooldown and the authoritative ping keeps its source team',()=>{
 const g=makeOnlineGame(match(),'host'),e=g.champions(1)[0];assert.ok(Pings.send(g,'attack',g.player));assert.ok(executeCommand(g,e,{action:'ping',kind:'attack',point:{x:e.x,y:e.y}}));assert.deepEqual(g.pings.map(p=>p.team),[0,1]);assert.equal(executeCommand(g,e,{action:'ping',kind:'attack',point:e}),false);
});
test('human controllers move independently across teams and restore the host player/input after each tick',()=>{
 const g=makeOnlineGame(match(),'host'),host=g.player,guest=g.champions(1)[0],own=g.input;
 g.units=[host,guest];g.map={walls:[]};g.bounds={x:0,y:0,w:100,h:100};Object.assign(host,{x:20,y:20});Object.assign(guest,{x:40,y:20});g.map.bounds=g.bounds;g.wave=999;g.sewingKingSpawned=g.bossSpawned=true;
 own.y=1;g.controllers.get(guest.id).input=cleanInput({x:-1,fire:false,aim:{x:30,y:20}},guest);g.step(1/30);
 assert.ok(host.y>20);assert.equal(host.x,20);assert.ok(guest.x<40);assert.equal(guest.y,20);assert.equal(g.player,host);assert.equal(g.input,own);assert.equal(guest.player,false);
});
test('remote charged attacks retain manual control, charge with their own aim and release only on command',()=>{
 const g=makeOnlineGame(match(),'host'),e=g.champions(1)[0];g.units=[g.player,e];g.map={walls:[]};g.bounds={x:0,y:0,w:100,h:100};Object.assign(e,{x:40,y:20});g.map.bounds=g.bounds;g.wave=999;g.sewingKingSpawned=g.bossSpawned=true;
 const input=g.controllers.get(e.id).input;input.aim={x:35,y:21};assert.equal(executeCommand(g,e,{action:'attack',point:input.aim}),true);
 for(let i=0;i<50;i++)g.step(1/30);assert.ok(e.state.hohenCharge);assert.equal(e.attackSerial,undefined);assert.deepEqual(e.state.hohenCharge.aim,input.aim);
 executeCommand(g,e,{action:'releaseBasic',point:input.aim});assert.equal(e.state.hohenCharge,undefined);assert.equal(e.attackSerial,1);assert.equal(g.player.memberId,'host');
});
test('the mobile host carries a stationary aim point by its displacement exactly once per simulation step',()=>{const g=makeOnlineGame(match(),'host'),e=g.player;g.units=[e];g.map={walls:[],bounds:{x:0,y:0,w:100,h:100}};g.bounds=g.map.bounds;g.wave=999;g.bossSpawned=g.sewingKingSpawned=true;Object.assign(e,{x:20,y:20});g.mobileInput=true;g.input.x=1;g.input.aim={x:25,y:20};g.step(1/30);assert.ok(e.x>20);assert.ok(Math.abs(g.input.aim.x-(25+e.x-20))<1e-8);});
test('snapshot data preserves entity references, sets, infinity, removals and client player identity without functions',()=>{
 const m=match(),host=makeOnlineGame(m,'host'),guest=makeOnlineGame(m,'guest'),writer=new SnapshotWriter(),source=host.champions(1)[0];host.projectiles.push({source,hitIds:new Set([5]),remaining:Infinity,onHit:()=>{throw Error('never transfer');}});
 let packet=JSON.parse(JSON.stringify(writer.capture(host,true)));assert.ok(applySnapshot(guest,packet,guest.player.id));assert.equal(guest.projectiles[0].source,guest.player);assert.ok(guest.projectiles[0].hitIds.has(5));assert.equal(guest.projectiles[0].remaining,Infinity);assert.equal(guest.projectiles[0].onHit,undefined);const player=guest.player;
 source.hp-=50;host.units=host.units.filter(e=>e.memberId||e.kind!=='champion');packet=JSON.parse(JSON.stringify(writer.capture(host)));assert.ok(applySnapshot(guest,packet,player.id));assert.equal(guest.player,player);assert.equal(player.hp,source.hp);assert.equal(guest.champions().length,2);
});
test('snapshot chunk transport reassembles unicode, rejects invalid chunks and never runs transferred code',()=>{const reader=new PacketReader(),packets=[],channel={readyState:'open',send:s=>packets.push(s)},packet={type:'test',text:'도시 경계'.repeat(8000)};assert.ok(sendPacket(channel,packet));assert.ok(packets.length>1);let result;for(const p of packets.reverse())result=reader.read(p)||result;assert.deepEqual(result,packet);assert.equal(reader.read('{"wire":"a","index":-1,"total":999,"data":"x"}'),null);});
test('switching between relay and direct connection rejects delayed snapshots from the previous stream',()=>{const m=match(),g=makeOnlineGame(m,'host'),client=makeOnlineGame(m,'guest'),old=new SnapshotWriter();assert.ok(applySnapshot(client,old.capture(g,true),client.player.id));g.time=1;const delayed=old.capture(g);const fresh=new SnapshotWriter();g.time=2;assert.ok(applySnapshot(client,fresh.capture(g,true),client.player.id));assert.equal(applySnapshot(client,delayed,client.player.id),false);assert.equal(client.time,2);assert.equal(sendPacket({readyState:'open',send(){throw Error('closed');}},{type:'test'}),false);});
test('guest actions are requests and cannot modify authoritative health, ammo or currency locally',()=>{
 const g=makeOnlineGame(match(),'guest'),sent=[],online={isHost:false,room:{hostId:'host'},sendHost:p=>{sent.push(p);return true;}};new OnlineMatch(g,online,'guest');const before={hp:g.player.hp,ammo:g.player.ammo,gold:g.player.gold};g.attack(g.player,{x:2,y:2});g.buy(g.player,'power');assert.deepEqual({hp:g.player.hp,ammo:g.player.ammo,gold:g.player.gold},before);assert.deepEqual(sent.map(p=>p.action),['attack','buy']);
});
test('all thirty champion states and skill visuals can be transferred as data after host simulation',()=>{
 for(const key of Object.keys(CHAMPIONS)){const m=match();m.slots[1].champion=key;const g=makeOnlineGame(m,'host'),client=makeOnlineGame(m,'guest'),e=g.champions(1)[0];g.controllers.get(e.id).input.aim={x:e.x-3,y:e.y};executeCommand(g,e,{action:'attack'});executeCommand(g,e,{action:'cast',slot:'q'});g.step(1/30);const packet=JSON.parse(JSON.stringify(new SnapshotWriter().capture(g,true)));assert.ok(applySnapshot(client,packet,client.player.id),key);assert.equal(client.player.key,key);assert.equal(client.player.hp,e.hp);assert.equal(client.player.ammo,e.ammo);}
});
test('a retreat completes and settles before combat resumes, even when tower cover flickers',()=>{
 const g=new Game('meursault','top',{seed:74}),e=g.player;g.units=[e];g.map={walls:[]};g.bounds={x:0,y:0,w:120,h:80};g.map.bounds=g.bounds;Object.assign(e,{x:35,y:20,player:false,laneEntered:true});const t=g.entity({kind:'tower',team:1,x:40,y:20,maxHp:5000,range:8.5,radius:.9});const m=[0,1].map(i=>g.entity({kind:'minion',team:0,x:38,y:19+i*2,maxHp:1000}));
 m.forEach(e=>e.alive=false);g.aiChampion(e,1/30);assert.ok(e.aiTowerRetreat);const before=distance(e,t);for(let i=0;i<70;i++){g.time+=1/30;m.forEach(e=>e.alive=i%2===0);g.aiChampion(e,1/30);if(g.time<1)assert.equal(e.attackSerial,undefined);}assert.ok(distance(e,t)>before);
});
test('an unsupported bot does not oscillate at the edge of tower range over repeated decisions',()=>{
 const g=new Game('meursault','top',{seed:74}),e=g.player;g.units=[e];g.map={walls:[]};g.bounds={x:0,y:0,w:120,h:80};g.map.bounds=g.bounds;Object.assign(e,{x:27,y:20,player:false,laneEntered:true});const t=g.entity({kind:'tower',team:1,lane:0,x:40,y:20,maxHp:5000,range:8.5,radius:.9});let prior=e.x,reversals=0,sign=0;
 for(let i=0;i<600;i++){g.time+=1/30;g.aiChampion(e,1/30);const d=Math.sign(e.x-prior);if(d&&sign&&d!==sign)reversals++;if(d)sign=d;prior=e.x;}assert.equal(reversals,0);assert.ok(distance(e,t)>t.range+e.radius+.6);
});
