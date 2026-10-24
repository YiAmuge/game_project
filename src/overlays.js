import { paintHealth } from './health-display.js';
import { SORA,ego as soraEgo,marked as soraMarked } from './sora.js';
import * as Yan from './yan.js';
import * as Hohenheim from './hohenheim.js';
import * as Don from './don.js';
import { endurance } from './v08-champions.js';
import { trap } from './confinement.js';
import { RULES,AHAB } from './data.js';
import { THEMES } from './art.js';
import { heathCharge,guardAlly } from './skills.js';

export function stackInfo(e,g){
 if(e.key==='yan'&&Yan.distorted(g,e))return {label:`뒤틀림 ${(e.buffs.yanDistorted-g.time).toFixed(1)}s · 중첩 획득 중지`,textOnly:true,color:'#c4e5fa'};
 if(e.key==='yan')return {label:`불길한 힘${Yan.ready(g,e)?' · 뒤틀림 준비':''}`,value:e.state.ominous||0,max:Yan.YAN.maxPower,color:'#b2cfdf',shape:'mirror'};
 if(e.key==='sora'&&soraEgo(g,e))return {label:`대행 ${(e.buffs.soraEgo-g.time).toFixed(1)}s · 말살 ${e.state.egoQCharges}/2${Number.isFinite(e.state.egoQReady)?' · 충전 '+Math.max(0,e.state.egoQReady-g.time).toFixed(1)+'s':''}`,textOnly:true,color:'#e7cb80'};
 if(e.key==='sora')return {label:soraEgo(g,e)?`대행 ${(e.buffs.soraEgo-g.time).toFixed(1)}s · 해금`:'해금'+((e.state.unlock||0)>=SORA.maxUnlock?' · E.G.O 준비':''),value:e.state.unlock||0,max:SORA.maxUnlock,color:'#e7cb80',shape:'mirror'};
 if(e.key==='dongrang')return {label:'양분 '+Math.floor(e.totalHealingReceived||0),textOnly:true,color:'#d8d48b'};
 if(e.key==='queequeg')return {label:'헤집어진 문신',value:endurance(e),max:5,color:'#a0dfd9',shape:'claw'};
 if(e.key==='hohenheim'&&e.state.posthumous)return {label:'사후 '+Math.max(0,e.state.posthumous.until-g.time).toFixed(1)+'s',textOnly:true,color:'#9ff6f0'};
 if(e.key==='dongbaek')return {label:'추가 꽃잎'+(Number.isFinite(e.state.petalReady)?' '+Math.max(0,e.state.petalReady-g.time).toFixed(1)+'s':''),value:e.state.petals??3,max:3,color:'#efda98',shape:'leaf'};
 if(e.key==='myo'&&g.buff(e,'rabbitHunt'))return {label:'토끼 시술',value:e.state.rabbitStacks||0,max:2,color:'#c7a6e7',shape:'mirror'};
 if(e.key==='nelly')return {label:'비도',value:e.state.knifeCharges??2,max:2,color:'#d8e0ed',shape:'mirror'};
 if(e.key==='ahab'&&e.state.order)return e.state.order==='guard'?{label:'전가 30% · 이동/방어력 +12%',textOnly:true,color:'#d9c587'}:{label:'엄호 장전',value:g.buff(e,'ahabCover')?e.state.coverStacks||0:0,max:3,color:'#d9c587',shape:'mirror'};
 if(e.key==='sinclair')return {label:g.buff(e,'marks')?'표지 발동':'어느 표지',value:e.marks,max:3,color:'#eddb83',shape:'leaf'};
 if(e.key==='gregor')return {label:g.buff(e,'mutant')?'변이 발동':'이형발작',value:e.state.mutations||0,max:12,color:'#c49a73',shape:'claw'};
 if(e.key==='alisa')return {label:'열화',value:e.state.heat||0,max:5,color:'#ffa36d',shape:'flame'};
 if(e.key==='honglu'&&g.buff(e,'insight'))return {label:`통찰 ${Math.max(0,(e.state.insightUntil||0)-g.time).toFixed(1)}s`,textOnly:true,color:'#8aead8'};
 if(e.key==='faust'&&g.buff(e,'faustUlt'))return {label:'권태',value:e.ultStacks||0,max:4,color:'#b8edf2',shape:'mirror'};
 if(e.key==='ezra'&&g.buff(e,'ezraUlt'))return {label:'총공',value:e.state.ultAttacks||0,max:4,color:'#f4cd96',shape:'claw'};
 if(e.key==='heathcliff'&&g.buff(e,'heathUlt'))return {label:'시체자루 연장',value:e.state.heathExtensions||0,max:4,color:'#c9a5e5',shape:'flame'};
 const gaze=Object.values(e.state.gaze||{}).find(m=>m.until>g.time&&m.n>0);if(gaze)return {label:'시선',value:gaze.n,max:5,color:'#efd069',shape:'mirror'};
 return null;
}
export function championHud(r,e,g){
 const c=r.ctx,gauge=stackGauge(e,g),guboGauge=e.key==='gubo'&&g.buff(e,'guboReload'),width=2.65,x=e.x-width/2,y=e.y-2.7-(gauge?.55:0)-(guboGauge?.55:0);
 c.save();c.fillStyle='#081317';c.fillRect(x-.06,y-.06,width+.12,.46);
 paintHealth(c,e,g,x,y,width,.34,e.player?'#7bd387':e.team===0?'#79bbc9':'#d7877e');
 c.lineWidth=.045;c.strokeStyle='#081317';c.strokeRect(x-.04,y-.04,width+.08,.42);
 c.lineWidth=.065;c.strokeStyle='#132020';c.font='bold .255px Arial';c.textAlign='center';c.textBaseline='middle';const hp=e.trainingDummy?.infinite?'∞':`${Math.max(0,Math.ceil(e.hp))} / ${Math.round(e.maxHp)}`;c.strokeText(hp,e.x,y+.17);c.fillStyle='#fff7de';c.fillText(hp,e.x,y+.17);
 if(e.trainingDummy){r.text(e.name,e.x,e.y-3.05,e.team===0?'#a7d8df':'#edb2a4',.29);c.restore();return;}
 const resourceY=y+.51,cap=g.ammoCap(e);
 if(e.key==='hohenheim'){
  const shape=Hohenheim.chargeShape(g,e,e.player?g.input.aim:e.state.hohenCharge?.aim||{x:e.x+1,y:e.y});
  c.fillStyle='#173439';c.fillRect(x,resourceY,width,.24);c.fillStyle=shape.progress>=1?'#d3ffff':'#82d9df';c.fillRect(x,resourceY,width*shape.progress,.24);r.text(`${e.state.posthumous?'최대 전류':'충전 '+Math.round(shape.progress*100)+'%'} · ${shape.hits}타`,e.x,resourceY+.12,'#e0ffff',.205);
 }else if(e.key==='yan'){
  const progress=Yan.chargeShape(g,e,e.player?g.input.aim:e.state.yanCharge?.aim||{x:e.x+1,y:e.y}).progress;
  c.fillStyle='#182a39';c.fillRect(x,resourceY,width,.24);c.fillStyle=progress>=1?'#e4f7ff':'#89bce4';c.fillRect(x,resourceY,width*progress,.24);r.text(Yan.distorted(g,e)?'손 조종':`검 충전 ${Math.round(progress*100)}%`,e.x,resourceY+.12,'#e7f7ff',.205);
 }else if(e.key==='rudolph'){
  c.fillStyle='#322018';c.fillRect(x,resourceY,width,.24);c.fillStyle=e.state.exhaustedUntil>g.time?'#866347':'#f5a34e';c.fillRect(x,resourceY,width*(e.state.exhaustedUntil>g.time?Math.min(1,(g.time-e.state.exhaustedAt)/e.state.recoveryDuration):Math.min(1,Math.max(0,e.ammo/cap))),.24);r.text(e.state.exhaustedUntil>g.time?`재충전 ${Math.max(0,e.state.exhaustedUntil-g.time).toFixed(1)}s`:`SP ${Math.floor(e.ammo)} / ${cap}`,e.x,resourceY+.12,'#fff2da',.205);
 }else{
  const gap=.075,w=(width-gap*(cap-1))/cap;
  for(let i=0;i<cap;i++){const px=x+i*(w+gap);c.fillStyle='#14221e';c.fillRect(px,resourceY,w,.18);c.strokeStyle='#6b7560';c.lineWidth=.025;c.strokeRect(px,resourceY,w,.18);const fraction=i<Math.floor(e.ammo)?1:i===Math.floor(e.ammo)?Math.min(1,e.reloadProgress/g.reloadInterval(e)):0;c.fillStyle=i<e.ammo?'#f2d07c':'#95885f';c.fillRect(px+.015,resourceY+.015,(w-.03)*fraction,.15);}
 }
 if(e.key==='gubo'&&g.buff(e,'guboReload')){const left=e.buffs.guboReload-g.time;c.fillStyle='#2c1019';c.fillRect(x,resourceY+.32,width,.13);c.fillStyle='#a72b47';c.fillRect(x,resourceY+.32,width*Math.min(1,left/4),.13);r.text(`흉탄 ${left.toFixed(1)}s · 아군 ≤35%`,e.x,resourceY+.64,'#ec93a4',.22);}
 r.text(`${e.name} · ${e.level}${g.bounty(e)?' · +'+g.bounty(e)+' ◈':''}`,e.x,y-.32,e.player?'#f4dfa3':e.team===0?'#a7d8df':'#edb2a4',.29);
 if(gauge){const gy=resourceY+.36+(e.key==='gubo'&&g.buff(e,'guboReload')?.55:0);c.fillStyle='#111e26';c.fillRect(x,gy,width,.17);c.fillStyle=gauge.color;c.fillRect(x,gy,width*gauge.ratio,.17);c.strokeStyle=gauge.color;c.lineWidth=.025;c.strokeRect(x,gy,width,.17);if(!gauge.timer&&gauge.max>1&&gauge.max<=12)for(let i=1;i<gauge.max;i++){c.fillStyle='#13202c';c.fillRect(x+width*i/gauge.max-.015,gy,.03,.17);}r.text(gauge.label,e.x,gy+.36,gauge.color,.205);}
 if(g.champions(e.team).some(a=>a.alive&&g.canGuboHitAlly(a,e)))flameHealthBorder(r,e,g,x,y,width);
 if(g.bounty(e)){r.polygon([[e.x-.92,e.y-.05],[e.x-.56,e.y-.05],[e.x-.47,e.y+.23],[e.x-.58,e.y+.4],[e.x-.91,e.y+.37],[e.x-1,e.y+.15]],'#c39b50','#3c2e19');r.text('¤',e.x-.74,e.y+.2,'#fff0a3',.23);}
 if(e.player&&!towerTargeters(g,e).length)r.polygon([[e.x-.13,y-1.5],[e.x+.13,y-1.5],[e.x,y-1.28]],'#ead18a');
 c.restore();
}
function star(r,x,y,size,color){
 const points=[];for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rad=i%2?size*.43:size;points.push([x+Math.cos(a)*rad,y+Math.sin(a)*rad]);}r.polygon(points,color,'#6a522c');
}
export function orderMark(r,e,g){const c=r.ctx;
 const directives=g.champions().filter(a=>a.alive&&a.team!==e.team&&soraMarked(g,a,e));
 const falseOrders=g.champions().filter(a=>a.alive&&a.team!==e.team&&Yan.marked(g,a,e));
 if(directives.length)directiveFlower(r,e,g,Math.max(...directives.map(a=>a.state.orders[e.id].until-g.time)),false,falseOrders.length?-.35:0);
 if(falseOrders.length)directiveFlower(r,e,g,Math.max(...falseOrders.map(a=>a.state.falseOrders[e.id].until-g.time)),true,directives.length?.35:0);
}
function directiveFlower(r,e,g,remaining,muted,offset){const c=r.ctx;
 // Original six-petal canvas design. The reference image is never embedded or traced.
 c.save();c.translate(e.x+offset,e.y-(e.kind==='champion'?.7:.25));const scale=(offset?.72:1)*(1+Math.sin(g.time*4)*.045);c.scale(scale,scale);
 r.circle(0,0,.56,muted?'#343f4e55':'#0c315d55',muted?'#8e9eae99':'#3aa5ee99',.035);
 for(let i=0;i<6;i++){
  c.save();c.rotate(i*Math.PI/3+.16);c.beginPath();c.moveTo(-.11,-.1);c.bezierCurveTo(-.34,-.31,-.19,-.59,0,-.49);c.bezierCurveTo(.23,-.52,.29,-.27,.11,-.1);c.closePath();c.fillStyle=muted?(i%2?'#8199ae':'#b0bac2'):(i%2?'#249fe9':'#46d5f1');c.fill();c.strokeStyle=muted?'#525f78':'#154bb0';c.lineWidth=.055;c.stroke();
  c.beginPath();c.moveTo(0,-.13);c.quadraticCurveTo(-.055,-.25,0,-.37);c.strokeStyle=muted?'#dce4e9':'#a4f1ff';c.lineWidth=.035;c.stroke();c.restore();
 }
 r.circle(0,0,.16,muted?'#475c74':'#123d88',muted?'#d4dce3':'#9deeff',.035);r.circle(0,0,.055,muted?'#e2e8ec':'#b9f8ff');
 c.beginPath();c.arc(0,0,.62,-Math.PI/2,-Math.PI/2+Math.min(1,remaining/SORA.markDuration)*Math.PI*2);c.strokeStyle=muted?'#b7c4cebb':'#62d9ffbb';c.lineWidth=.03;c.stroke();c.restore();
}
export function championEffects(r,e,g){
 const c=r.ctx;c.save();orderMark(r,e,g);towerMark(r,e,g);
 const villain=g.champions(1-e.team).some(a=>a.alive&&a.key==='don'&&a.state.villain===e.id);
 if(villain){const y=e.y-4.45;for(const color of ['#ffe258','#d82b39'])for(const side of [-1,1])r.line([{x:e.x-.25,y:y-side*.25},{x:e.x+.25,y:y+side*.25}],color,color==='#ffe258'?.2:.1);}

 if(e.visuals.nellyMark?.until>g.time){const y=e.y-4.65;r.polygon([[e.x-.1,y+.45],[e.x+.05,y+.45],[e.x+.05,y],[e.x+.17,y-.2],[e.x+.1,y-.65],[e.x-.08,y-.5]],'#cbd0d4',e.visuals.nellyMark.forced?'#ac3f4c':'#777f88');}
 if(e.visuals.contempt?.until>g.time)r.text('경멸',e.x,e.y-4.2,'#c9b16f',.23);
 const mental=Object.values(e.state.mentalWhip||{}).find(m=>m.stage>0);if(mental)r.text(`정신채찍 +${mental.stage*15}%`,e.x,e.y-4.4,'#d6a46f',.24);
 if(e.recall)r.text(`귀환 ${Math.max(0,e.recall.until-g.time).toFixed(1)}s`,e.x,e.y+1.1,'#bed6de',.3);
 if(e.state.detonatesAt>g.time)r.text(`자폭 ${(e.state.detonatesAt-g.time).toFixed(1)}s`,e.x,e.y-5,'#dba57a',.33);
 if(e.state.jackpot&&g.time-(e.state.coinAt??-99)<1.5)r.text('JACKPOT!',e.x,e.y-5.2,'#ddc788',.38);
 if(g.stat(e,'stun'))for(let i=0;i<3;i++){const a=g.time*5+i*Math.PI*2/3;star(r,e.x+Math.cos(a)*.6,e.y-4.15+Math.sin(a)*.15,.14,'#d9c48a');}
 if(g.stat(e,'root'))r.text('속박',e.x,e.y-4.6,'#c7d0d2',.24);
 if(g.stat(e,'disarm'))r.text('무장해제',e.x,e.y-4.5,'#d5beb0',.24);
 if(g.stat(e,'silence'))r.text('침묵',e.x,e.y-4.8,'#c8c0d1',.24);
 if(g.stat(e,'captured'))r.text('결박',e.x,e.y-4.5,'#a6c9c7',.24);
 if(g.stat(e,'yanLock'))r.text('▣ 잠금',e.x,e.y-4.5,'#bfcbd1',.24);
 if(trap(g,e)){for(let i=0;i<5;i++){const x=e.x-.5+i*.25;r.line([{x,y:e.y-.6},{x:x+.3,y:e.y+.15}],'#9fae9c99',.035);r.line([{x,y:e.y+.15},{x:x+.3,y:e.y-.6}],'#9fae9c99',.035);}}
 if(e.plague?.until>g.time)r.text(`해충 −${e.plague.stacks*3}%`,e.x,e.y-4.2,'#b4977d',.22);
 c.restore();
}
export function chargePreview(r,e,g){
 if(e.key==='don'&&e.state.donCharge&&e.alive){
  const shape=Don.chargeShape(g,e,e.player?g.input.aim:e.state.donCharge.aim),d=shape.d,end={x:e.x+d.x*shape.range,y:e.y+d.y*shape.range},side={x:-d.y*shape.width/2,y:d.x*shape.width/2};
  r.polygon([[e.x+side.x,e.y+side.y],[end.x+side.x,end.y+side.y],[end.x-side.x,end.y-side.y],[e.x-side.x,e.y-side.y]],'#e8c94a24','#ffe18a');r.text(`충전 ${Math.round(shape.progress*100)}% · 놓아서 찌르기`,e.x,e.y+1.2,'#ffe18a',.3);return;
 }
 if(e.key!=='heathcliff'||e.state.chargeAt===undefined||!e.alive)return;
 const point=e.player?g.input.aim:e.state.chargeAim,charge=heathCharge(g,e,point),color=charge.ready?'#d9b6f1':'#b4a7c1',c=r.ctx;
 c.save();r.circle(e.x,e.y,charge.range,'#b389d209',color+'88',.045);
 const path=[];for(let i=0;i<=20;i++){const t=i/20;path.push({x:e.x+(charge.landing.x-e.x)*t,y:e.y+(charge.landing.y-e.y)*t-Math.sin(t*Math.PI)*1.2});}
 r.line(path,color+'cc',.08,[.16,.13]);r.circle(charge.landing.x,charge.landing.y,charge.radius,'#c49ce526',color,.075);r.circle(charge.landing.x,charge.landing.y,.15,color);
 r.text(`놓아서 도약 · ${Math.round(charge.progress*100)}% · 피해 ${Math.round(charge.damage)} · 기절 ${charge.stun.toFixed(2)}s`,charge.landing.x,charge.landing.y+2.25,color,.3);
 c.restore();
}

export function championGroundEffects(r,e,g){
 const color='#c5d0d33b',outline=(radius)=>r.circle(e.x,e.y,radius,null,color,.025);
 if(e.key==='ahab'&&e.player)outline(AHAB.orderRadius);
 if(e.key==='ishmael'&&g.buff(e,'ishmaelShield'))outline(4.5);
 if(g.buff(e,'martonDrain'))outline(5.5);
 if(g.buff(e,'heathUlt'))outline(7.5);
 if(e.state.detonatesAt>g.time)r.circle(e.x,e.y,4,'#d94e262e','#ff7957',.085);
 if(e.key==='outis'&&e.player&&e.alive)r.circle(e.x,e.y,2.5,null,'#d1dcb799',.035);
 if(e.key==='honglu'&&e.player&&e.alive&&g.buff(e,'insight'))r.circle(e.x,e.y,5,null,'#87d8c999',.045);
 if(e.state.yanBarrage?.until>g.time){const q=e.state.yanBarrage,a=Math.atan2(q.d.y,q.d.x),c=r.ctx;c.beginPath();c.arc(e.x,e.y,5,a-Math.PI/2,a+Math.PI/2);c.strokeStyle=color;c.lineWidth=.025;c.stroke();}
}

export function stackGauge(e,g){
 const info=stackInfo(e,g);let state=info;
 if(e.key==='myo'&&g.buff(e,'rabbitFrenzy'))state={label:'광폭한 칼날'};
 if(!state)return null;
 const timed={sinclair:['marks',4],gregor:['mutant',5],sora:['soraEgo',20],yan:['yanDistorted',20],myo:['rabbitFrenzy',4.5]},entry=timed[e.key];
 let remaining,total;
 if(entry&&g.buff(e,entry[0])){remaining=e.buffs[entry[0]]-g.time;total=Math.max(entry[1],e.buffs[entry[0]]-(e.visuals[entry[0]]?.at??g.time));}
 if(e.key==='hohenheim'&&e.state.posthumous){remaining=e.state.posthumous.until-g.time;total=2.5;}
 if(e.key==='honglu'&&g.buff(e,'insight')){remaining=e.state.insightUntil-g.time;total=1.2;}
 const color=THEMES[e.key]?.light||state.color||'#bdd1db';
 if(total)return {color,ratio:Math.max(0,Math.min(1,remaining/total)),label:`${entry?{sinclair:'표지 각성',gregor:'변이',sora:'대행',yan:'뒤틀림',myo:'광폭한 칼날'}[e.key]:state.label.split(' ')[0]} ${remaining.toFixed(1)}s`,timer:true};
 const max=state.max||1,value=state.value??1;
 if(e.key==='dongrang')return {color,ratio:((e.totalHealingReceived||0)%1500)/1500,label:state.label,max:1};
 return {color,ratio:Math.max(0,Math.min(1,value/max)),label:state.textOnly?state.label:`${state.label} ${value}/${max}`,max};
}
function flameHealthBorder(r,e,g,x,y,width){
 const c=r.ctx;c.save();c.strokeStyle='#df334a';c.lineWidth=.075;c.strokeRect(x-.04,y-.04,width+.08,.42);
 for(let i=0;i<14;i++){const px=x+width*(i+.5)/14,h=.09+.08*(1+Math.sin(g.time*11+i*2.4));r.polygon([[px-.09,y],[px-.045,y-h*.5],[px+.015,y-h],[px+.065,y-h*.3],[px+.1,y]],i%2?'#e83b49':'#8b1027');}c.restore();
}
export function towerTargeters(g,e){return g.units.filter(t=>t.alive&&t.team!==e.team&&['tower','core'].includes(t.kind)&&t.targetId===e.id);}
export function towerMark(r,e,g){if(!towerTargeters(g,e).length)return;const y=e.y-(e.kind==='champion'?(stackGauge(e,g)?4.2:3.55):e.kind==='minion'?1.15:1.6);r.circle(e.x,y,.22,null,'#ff6456',.045);r.circle(e.x,y,.095,null,'#ffd0b0',.025);r.line([{x:e.x-.31,y},{x:e.x+.31,y}],'#ff6456',.035);r.line([{x:e.x,y:y-.31},{x:e.x,y:y+.31}],'#ff6456',.035);}
export function threatRanges(r,g){const p=g.player;if(!p.alive)return;for(const e of g.units)if(e.alive&&e.team!==p.team&&['tower','core'].includes(e.kind)&&(Math.hypot(e.x-p.x,e.y-p.y)<=e.range||e.targetId===p.id)){r.circle(e.x,e.y,e.range,'#bf3f3520','#e77d60bb',.065);}}
