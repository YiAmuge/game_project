// Shared by the browser and the room/signalling service. No combat runs on the service.
export const ONLINE_VERSION='1.0.0';
export const ROOM_CAPACITY=8;
export const ROOM_POSITIONS=['top','jungle','bottom','support'];
export const NET={inputEvery:1/30,snapshotEvery:1/15,inputTimeout:1.5,maxPacket:4*1024*1024,chunk:12000};
export const roomCode=value=>String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
export const validPoint=p=>Boolean(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<1000&&Math.abs(p.y)<1000);
export const idleInput=e=>({x:0,y:0,fire:false,precision:false,aim:{x:e.x+(e.team?-5:5),y:e.y}});
export function cleanInput(value,e){
 const n=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
 return{x:n(value?.x),y:n(value?.y),fire:value?.fire===true,precision:value?.precision===true,aim:validPoint(value?.aim)?{x:value.aim.x,y:value.aim.y}:idleInput(e).aim};
}
