// Snapshots contain data only. Functions/timers remain exclusively in the host simulation.
const fields=['rivalries','time','nextId','wave','bossSpawned','sewingKingSpawned','needleCampSpawned','needleRespawnsScheduled','sewingWinner','sewingTeams','winner','reason','minionFactions','kills','firstBlood','announcements','announcementSequence','logs','soundEvents','soundSerial','buffSequence','projectiles','effects','zones','pending','corpses','pings','entryFlare'];
const skip=new Set(['path','pathGoal','pathAt','aiTowerCover','bodyOrigin','contributors','supporters']);
const special='$net';
function encode(value,entities,seen=new Set(),root=false){
 if(typeof value==='function'||value===undefined)return undefined;
 if(typeof value==='number'&&!Number.isFinite(value))return{[special]:'number',value:String(value)};
 if(!value||typeof value!=='object')return value;
 if(!root&&entities.has(value))return{[special]:'entity',id:value.id};
 if(seen.has(value))return undefined;seen.add(value);let result;
 if(value instanceof Set)result={[special]:'set',value:[...value].map(v=>encode(v,entities,seen))};
 else if(value instanceof Map)result={[special]:'map',value:[...value].map(([k,v])=>[encode(k,entities,seen),encode(v,entities,seen)])};
 else if(Array.isArray(value))result=value.map(v=>encode(v,entities,seen));
 else{result={};for(const [k,v]of Object.entries(value)){if(skip.has(k)||k.startsWith('_'))continue;const encoded=encode(v,entities,seen);if(encoded!==undefined)result[k]=encoded;}}
 seen.delete(value);return result;
}
function decode(v,entities){
 if(!v||typeof v!=='object')return v;
 if(v[special]==='entity')return entities.get(v.id)||null;
 if(v[special]==='number')return v.value==='Infinity'?Infinity:v.value==='-Infinity'?-Infinity:NaN;
 if(v[special]==='set')return new Set(v.value.map(x=>decode(x,entities)));
 if(v[special]==='map')return new Map(v.value.map(([k,x])=>[decode(k,entities),decode(x,entities)]));
 if(Array.isArray(v))return v.map(x=>decode(x,entities));
 const out={};for(const [k,x]of Object.entries(v))if(!['__proto__','constructor','prototype'].includes(k))out[k]=decode(x,entities);return out;
}
export class SnapshotWriter{
 constructor(){this.sequence=0;this.epoch=++SnapshotWriter.serial;this.cache=new Map();}
 capture(g,full=false){
  const entities=new Set(g.units),updates=[],present=new Set(),values={};
  for(const e of g.units){present.add(e.id);const data=encode(e,entities,new Set(),true),text=JSON.stringify(data);if(full||this.cache.get(e.id)!==text)updates.push(data);this.cache.set(e.id,text);}
  const removed=[...this.cache.keys()].filter(id=>!present.has(id));for(const id of removed)this.cache.delete(id);
  for(const key of fields)values[key]=encode(g[key],entities);
  // Presentation is advanced by each browser's real-time cinematic controller, not game time.
  return{type:'snapshot',epoch:this.epoch,sequence:++this.sequence,full,units:updates,removed,values};
 }
}SnapshotWriter.serial=0;
export function applySnapshot(g,packet,playerId){
 if(!packet||packet.type!=='snapshot'||!Array.isArray(packet.units)||!packet.values||packet.epoch<(g.netEpoch||0)||!packet.full&&(packet.epoch!==g.netEpoch||packet.sequence<=(g.netSequence||0)))return false;
 const entities=new Map((packet.full?[]:g.units).map(e=>[e.id,e]));
 for(const id of packet.removed||[])entities.delete(id);
 for(const u of packet.units)if(!entities.has(u.id))entities.set(u.id,{});
 for(const u of packet.units){const e=entities.get(u.id),value=decode(u,entities);for(const key of Object.keys(e))if(!(key in value))delete e[key];Object.assign(e,value);}
 g.units=[...entities.values()];for(const [key,value]of Object.entries(packet.values))if(fields.includes(key))g[key]=decode(value,entities);
 const player=entities.get(playerId);if(!player)return false;
 g.player=player;for(const e of g.units)if(e.kind==='champion')e.player=e.id===playerId;
 g.damageDone=player.totalDamage||0;g.netEpoch=packet.epoch;g.netSequence=packet.sequence;return true;
}

// Delta snapshots are sent on a reliable channel. A skipped congested send never advances the writer.
export function sendPacket(channel,value){
 if(channel?.readyState!=='open')return false;
 try{const data=JSON.stringify(value);if(data.length>4*1024*1024)return false;
 const id=String(++sendPacket.serial);for(let i=0;i<data.length;i+=12000)channel.send(JSON.stringify({wire:id,index:i/12000,total:Math.ceil(data.length/12000),data:data.slice(i,i+12000)}));return true;}catch{return false;}
}sendPacket.serial=0;
export class PacketReader{
 constructor(){this.parts=new Map();}
 read(text){
  if(typeof text!=='string'||text.length>100000)return null;let p;try{p=JSON.parse(text);}catch{return null;}
  if(!p||typeof p.wire!=='string'||!Number.isInteger(p.index)||!Number.isInteger(p.total)||p.total<1||p.total>350||p.index<0||p.index>=p.total||typeof p.data!=='string'||p.data.length>12000)return null;
  const now=Date.now();for(const [id,v]of this.parts)if(now-v.at>5000)this.parts.delete(id);
  if(!this.parts.has(p.wire)){if(this.parts.size>=8)return null;this.parts.set(p.wire,{at:now,total:p.total,parts:new Map()});}
  const item=this.parts.get(p.wire);if(item.total!==p.total)return null;item.parts.set(p.index,p.data);
  if(item.parts.size!==item.total)return null;this.parts.delete(p.wire);try{return JSON.parse(Array.from({length:item.total},(_,i)=>item.parts.get(i)).join(''));}catch{return null;}
 }
}
