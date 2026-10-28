import{Game}from'./game.js';
import{ROOM_POSITIONS,cleanInput,idleInput,validPoint}from'./online-protocol.js';
import{SnapshotWriter,applySnapshot,sendPacket}from'./online-state.js';
import*as Yan from'./yan.js';
import*as Hohenheim from'./hohenheim.js';
import*as Don from'./don.js';
import{releaseHeath,cancelHeath}from'./skills.js';
import*as Pings from'./pings.js';
import{draft}from'./bot-ai.js';

export function makeOnlineGame(match,memberId){
 const own=match.slots.find(s=>s.memberId===memberId);if(!own)throw Error('경기 참가 정보를 찾을 수 없습니다.');
 const g=new Game(own.champion,own.position,{seed:match.seed,bots:[Object.fromEntries(ROOM_POSITIONS.map(p=>[p,null])),Object.fromEntries(ROOM_POSITIONS.map(p=>[p,null]))]});
 g.units=g.units.filter(e=>e.kind!=='champion');g.nextId=Math.max(...g.units.map(e=>e.id))+1;g.controllers=new Map();g.online=true;
 for(const s of match.slots){if(s.champion===null)continue;let key=s.champion;if(key==='random'){// Reuse the normal roster's deterministic draft selection.
   key=draft(g,s.position,[...g.champions(s.team).map(e=>e.key),...match.slots.filter(other=>other.team===s.team&&other.champion!=='random').map(other=>other.champion)]);
  }
  const e=g.makeChampion(key,s.team,ROOM_POSITIONS.indexOf(s.position),s.position);e.player=s.memberId===memberId;e.memberId=s.memberId;
  if(s.memberId){e.human=true;g.controllers.set(e.id,{input:idleInput(e),receivedAt:0,connected:true,mobileInput:false});}
 }
 g.player=g.units.find(e=>e.memberId===memberId);g.input=idleInput(g.player);g.controllers.get(g.player.id).input=g.input;
 return g;
}
export function cancelCharge(g,e){Yan.cancelCharge(e);Hohenheim.cancelCharge(e);cancelHeath(e);Don.cancel(g,e);}
export function releaseBasic(g,e,p){return e.key==='hohenheim'?Hohenheim.release(g,e,p):Yan.release(g,e,p);}
export function releaseTactical(g,e,p){return e.key==='don'?Don.release(g,e,p):releaseHeath(g,e,p);}
const options=value=>({...(typeof value?.direction==='string'&&['left','right','up','down'].includes(value.direction)?{direction:value.direction}:{}),...(value?.manual===true?{manual:true}:{}),...(value?.targetKind&&['champion','minion','building','creep'].includes(value.targetKind)?{targetKind:value.targetKind}:{})});
export function executeCommand(g,e,p){
 if(!e||!p||!g.controllers?.get(e.id)?.connected||g.winner!==null||g.presentation?.type==='intro')return false;
 if(p.point&&!validPoint(p.point))return false;
 const point=p.point||g.controllers.get(e.id).input.aim;
 return g.withController(e,()=>{
  switch(p.action){
   case'attack':return g.attack(e,point,options(p.options));
   case'cast':return ['q','r'].includes(p.slot)&&g.cast(e,p.slot,point,options(p.options));
   case'releaseBasic':return releaseBasic(g,e,point);
   case'releaseTactical':return releaseTactical(g,e,point);
   case'cancelCharge':cancelCharge(g,e);return true;
   case'recall':return g.recall(e);
   case'cancelRecall':g.cancelRecall(e);return true;
   case'infiltrate':return g.infiltrate(e);
   case'buy':return g.buy(e,p.key);
   case'buyAugment':return g.buyAugment(e,p.key);
   case'sellAugment':return g.sellAugment(e,p.key);
   case'handReturn':return e.key==='yan'&&Yan.distorted(g,e)&&!g.stat(e,'stun')&&!g.stat(e,'disarm')&&Yan.command(g,e,e);
   case'ping':return Pings.send(g,p.kind,point,p.choice);
   default:return false;
  }
 });
}
export class OnlineMatch{
 constructor(g,online,memberId){this.game=g;this.online=online;this.memberId=memberId;this.host=online.isHost;this.writers=new Map();this.clock=0;this.lastSnapshot=0;this.lastInput=0;this.lastKeepAlive=0;
  if(!this.host){g.netCommand=value=>this.command(value);for(const method of ['attack','cast','recall','cancelRecall','infiltrate','buy','buyAugment','sellAugment'])g[method]=(e,...args)=>{
   if(e!==g.player)return false;let value={action:method};
   if(method==='attack')value={...value,point:args[0],options:args[1]};else if(method==='cast')value={...value,slot:args[0],point:args[1],options:args[2]};else if(['buy','buyAugment','sellAugment'].includes(method))value.key=args[0];
   return this.command(value);
  };g.sendPing=(kind,point,choice)=>this.command({action:'ping',kind,point,choice});}
 }
 command(value){if(this.host)return false;if(value.point)value={...value,point:{x:value.point.x,y:value.point.y}};return this.online.sendHost({type:'command',...value});}
 receive(id,p){const g=this.game;if(!p)return;
  if(this.host){const e=g.units.find(e=>e.memberId===id);if(!e)return;const c=g.controllers.get(e.id);
   if(p.type==='input'){c.input=cleanInput(p.input,e);c.receivedAt=this.clock;c.connected=true;c.mobileInput=p.mobile===true;c.mobileAim=p.mobileAim&&['basic','q','r'].includes(p.mobileAim.slot)?{slot:p.mobileAim.slot,autoTarget:Number.isInteger(p.mobileAim.autoTarget)?p.mobileAim.autoTarget:undefined}:undefined;return;}
   if(p.type==='command'){const now=performance.now();c.commands=c.commandAt&&now-c.commandAt<1000?(c.commands||0)+1:1;if(now-(c.commandAt||0)>=1000)c.commandAt=now;if(c.commands<=80)executeCommand(g,e,p);}
   if(p.type==='sync')this.writers.delete(id);
  }else if(id===this.online.room.hostId&&p.type==='snapshot'){
   const before=new Map(g.units.map(e=>[e.id,{x:e.x,y:e.y}])),time=g.time;
   if(applySnapshot(g,p,g.player.id)){this.lastKeepAlive=this.clock;this.interpolation={from:before,at:performance.now(),duration:Math.min(.12,Math.max(1/30,g.time-time))*1000};}
  }
 }
 disconnected(id){const e=this.game.units.find(e=>e.memberId===id);if(e){const c=this.game.controllers.get(e.id);c.connected=false;c.input=idleInput(e);this.game.withController(e,()=>cancelCharge(this.game,e));}this.writers.delete(id);}
 tick(dt,blocked=false){
  this.clock+=dt;const g=this.game;
  if(this.host){
   const own=g.controllers.get(g.player.id);own.input=g.input;own.mobileInput=g.mobileInput;own.mobileAim=g.mobileAim;own.receivedAt=this.clock;
   for(const [id,c]of g.controllers){const e=g.units.find(e=>e.id===id);if(id!==g.player.id&&this.clock-c.receivedAt>1.5&&c.connected){g.withController(e,()=>cancelCharge(g,e));c.connected=false;c.input.fire=false;c.input.x=0;c.input.y=0;}if(e)e.networkControl={mobile:c.connected&&c.mobileInput,x:c.input.x,y:c.input.y,fire:c.input.fire,aiming:Boolean(c.mobileAim)};}
   if(this.clock-this.lastSnapshot>=1/15){this.lastSnapshot=this.clock;for(const [id,peer]of this.online.peers){if(peer.channel?.readyState!=='open'||peer.channel.bufferedAmount>128000)continue;let writer=this.writers.get(id);const full=!writer;if(!writer){writer=new SnapshotWriter();this.writers.set(id,writer);}if(!sendPacket(peer.channel,writer.capture(g,full)))this.writers.delete(id);}}
  }else if(this.clock-this.lastInput>=1/30){this.lastInput=this.clock;this.online.sendHost({type:'input',input:blocked?{...g.input,x:0,y:0,fire:false}:g.input,mobile:g.mobileInput,mobileAim:g.mobileAim?{slot:g.mobileAim.slot,autoTarget:g.mobileAim.autoTarget}:null});}
 }
 draw(fn){
  const s=this.interpolation;if(this.host||!s)return fn();const fraction=Math.min(1,Math.max(0,(performance.now()-s.at)/s.duration)),restore=[];
  for(const e of this.game.units){const from=s.from.get(e.id);if(!from||Math.hypot(e.x-from.x,e.y-from.y)>4)continue;restore.push([e,e.x,e.y]);e.x=from.x+(e.x-from.x)*fraction;e.y=from.y+(e.y-from.y)*fraction;}
  try{return fn();}finally{for(const [e,x,y]of restore){e.x=x;e.y=y;}}
 }
}
