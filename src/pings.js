import { distance,direction } from './geometry.js';
import { MAP_CENTER } from './data.js';
import { drawPingIcon } from './ping-icons.js';
export const PING_COLORS={attack:'#ff9b61',defend:'#86d8f7',danger:'#ff626c'};
export const PING_KEYS={KeyQ:'attack',KeyE:'defend',KeyR:'danger'};
export const PING_LABELS={attack:'공격!',defend:'도움!',danger:'후퇴!'};
export function choices(g,kind){
 const team=g.player.team,items=[];
 if(kind!=='danger')for(const [lane,name,y]of [['top','상단 라인',7.15],['bottom','하단 라인',39.65]])items.push({id:lane,type:'lane',lane,name,x:MAP_CENTER.x,y});
 if(kind!=='danger'){const t=g.units.find(t=>t.kind==='core'&&t.team===(kind==='attack'?1-team:team));if(t)items.push({id:'core-'+t.team,type:'core',name:kind==='attack'?'적 본진':'아군 본진',targetId:t.id,team:t.team,x:t.x,y:t.y,disabled:!t.alive});}
 for(const t of g.champions().filter(t=>!t.trainingDummy&&(kind==='danger'||t.team===(kind==='attack'?1-team:team))))items.push({id:'champion-'+t.id,type:'champion',key:t.key,name:t.name,targetId:t.id,team:t.team,x:t.x,y:t.y,disabled:!t.alive||g.hidden(t)||t.team!==team&&!g.visibleTo(team,t)});
 if(kind!=='defend')for(const camp of ['sewingKing','boss']){const t=g.units.find(t=>t.kind==='neutral'&&t.camp===camp&&!t.retired&&t.alive);if(!t)continue;items.push({id:camp,type:'boss',camp,name:camp==='boss'?'쌓인 것':'바느질의 왕',targetId:t?.id,team:2,x:t?.x??MAP_CENTER.x,y:t?.y??(camp==='boss'?MAP_CENTER.y:-3.8),disabled:!t?.alive});}
 return items;
}
export function text(kind,t,team=0){
 if(!t)return PING_LABELS[kind];
 if(t.type==='lane')return `${t.name} ${kind==='attack'?'진격':'수비'}!`;
 if(t.type==='core')return `${kind==='attack'?'적':'아군'} 본진 ${kind==='attack'?'진격':'수비'}!`;
 if(t.type==='boss')return `${t.name} ${kind==='danger'?'토벌을 포기':'토벌'}!`;
 return kind==='attack'?`${t.name} 공격!`:kind==='defend'?`${t.name} 보호!`:t.team===team?`${t.name}${(t.name.charCodeAt(t.name.length-1)-0xac00)%28===0?'는':'은'} 후퇴!`:`${t.name}에게서 후퇴!`;
}
// Only the held-key menu specifies a target. Tapping sends the basic signal at the cursor.
export function send(g,kind,point,choiceId){
 if(!PING_COLORS[kind]||g.winner!==null||g.time<(g.pingReady||0))return false;
 const choice=choiceId?choices(g,kind).find(t=>t.id===(typeof choiceId==='string'?choiceId:choiceId.id)):null;
 if(choiceId&&(!choice||choice.disabled))return false;
 point=choice||point;const b=g.bounds;
 if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y)||point.x<b.x||point.x>b.x+b.w||point.y<b.y||point.y>b.y+b.h)return false;
 const p={kind,x:point.x,y:point.y,targetId:choice?.targetId,icon:choice?{...choice}:null,at:g.time,until:g.time+8,team:g.player.team,label:text(kind,choice,g.player.team)};
 g.pings??=[];g.pings.push(p);g.pings=g.pings.slice(-8);g.pingReady=g.time+.65;g.log(p.label,kind==='danger'?'enemy':'ally');return p;
}
export function live(g){return (g.pings||[]).filter(p=>p.until>g.time);}
// A champion target is a local instruction, not a reason for distant lanes to abandon combat.
export function respond(g,e,dt){
 const p=live(g).filter(p=>p.team===e.team).at(-1);if(!p)return false;
 const target=g.units.find(t=>t.id===p.targetId&&t.alive),champ=target?.kind==='champion';
 if(p.targetId&&!target)return false;
 const point=target||p,d=distance(e,point);if(d>(champ?12:27))return false;
 e.objective='ping-'+p.kind;
 if(p.kind==='danger'){
  if(target?.kind==='champion'&&target.team===e.team&&target.id!==e.id)return false;
  if(d>11)return e.pingAvoidUntil===p.until;const threat=target?.team===e.team?g.nearest(e,12,false):null,from=threat||point,v=distance(from,e)<.01?direction(e,g.spawnPoint(e)):direction(from,e);g.moveToward(e,{x:e.x+v.x*6,y:e.y+v.y*6},dt);e.pingAvoidUntil=p.until;return true;
 }
 if(p.kind==='attack'&&target){
  if(target.team===e.team||!g.visibleTo(e.team,target))return false;
  if(d>g.attackRange(e)+target.radius||!g.clearLine(e,target))g.moveToward(e,target,dt);else g.attack(e,target);
  const near=g.nearest(e,7,false);if(near?.kind==='champion'&&target.kind!=='champion')return false;
  return true;
 }
 if(p.kind==='defend'){
  if(target?.kind==='champion'&&d<=8){
   if(e.key==='queequeg'&&e.state.tether?.target!==target.id)g.cast(e,'q',target);
   if(e.key==='ppui'){g.attack(e,target);if(target.hp<target.maxHp*.85)g.cast(e,'q',target);}
  }
  const threat=g.champions(1-e.team).filter(t=>t.alive&&g.visibleTo(e.team,t)&&distance(t,point)<=8).sort((a,b)=>distance(a,point)-distance(b,point))[0];
  if(threat){if(distance(e,threat)>g.attackRange(e)+threat.radius)g.moveToward(e,threat,dt);else g.attack(e,threat);return true;}
 }
 if(d>2.8){g.moveToward(e,point,dt);return true;}
 return false;
}
export function drawWorld(c,camera,g){for(const p of live(g)){
 const age=g.time-p.at,phase=age%1,base=camera.worldToScreen(p,.08),top=camera.worldToScreen(p,1.8+.25*Math.sin(age*5)),color=PING_COLORS[p.kind];
 c.save();c.strokeStyle=color;c.lineWidth=2;c.globalAlpha=.7*(1-phase)+.2;c.beginPath();c.ellipse(base.x,base.y,14+phase*24,7+phase*12,0,0,Math.PI*2);c.stroke();
 c.globalAlpha=.85;c.setLineDash([3,4]);c.beginPath();c.moveTo(top.x,top.y+15);c.lineTo(base.x,base.y);c.stroke();c.setLineDash([]);drawPingIcon(c,p.icon||{type:p.kind},top.x-17,top.y-17,34,g.player.team);c.restore();
}}
