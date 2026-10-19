import { RULES } from './data.js';
import { THEMES } from './art.js';
import { heathCharge } from './skills.js';

export function stackInfo(e,g){
 if(e.key==='dongrang')return {label:'양분 '+Math.floor((e.totalHealingReceived||0)/800),value:e.state.treeCharges??2,max:2,color:'#d8d48b',shape:'leaf'};
 if(e.key==='dongbaek')return {label:'추가 꽃잎',value:3-(e.state.extraPetals||0),max:3,color:'#efda98',shape:'leaf'};
 if(e.key==='myo'&&g.buff(e,'rabbitHunt'))return {label:'토끼 시술',value:e.state.rabbitStacks||0,max:2,color:'#c7a6e7',shape:'mirror'};
 if(e.key==='nelly')return {label:'비도',value:e.state.knifeCharges??2,max:2,color:'#d8e0ed',shape:'mirror'};
 if(e.key==='ahab'&&e.state.order)return {label:e.state.order==='guard'?'방어 명령':'엄호 명령',value:2,max:2,color:'#d9c587',shape:'mirror'};
 const gaze=Object.values(e.state.gaze||{}).find(m=>m.until>g.time&&m.n>0);if(gaze)return {label:'시선',value:gaze.n,max:5,color:'#efbdb9',shape:'mirror'};
 if(e.key==='sinclair')return {label:g.buff(e,'marks')?'표지 발동':'어느 표지',value:e.marks,max:3,color:'#eddb83',shape:'leaf'};
 if(e.key==='gregor')return {label:g.buff(e,'mutant')?'변이 발동':'이형발작',value:e.state.mutations||0,max:12,color:'#bddb7d',shape:'claw'};
 if(e.key==='alisa')return {label:'열화',value:e.state.heat||0,max:5,color:'#ffa36d',shape:'flame'};
 if(e.key==='honglu'&&g.buff(e,'insight'))return {label:'통찰',value:e.state.insightStacks||0,max:4,color:'#8aead8',shape:'water'};
 if(e.key==='faust'&&g.buff(e,'faustUlt'))return {label:'표상방출',value:e.ultStacks||0,max:4,color:'#b8edf2',shape:'mirror'};
 if(e.key==='rodya'&&(g.buff(e,'coins')||g.buff(e,'coinSpeed')))return {label:`앞 ${e.state.coinHeads||0} · 뒤 ${e.state.coinTails||0}`,value:e.state.coinHeads||0,max:3,color:'#ecd28b',shape:'coin'};
 if(e.key==='ezra'&&g.buff(e,'ezraUlt'))return {label:'총공',value:e.state.ultAttacks||0,max:4,color:'#f4cd96',shape:'claw'};
 if(e.key==='heathcliff'&&g.buff(e,'heathUlt'))return {label:'시체자루 연장',value:e.state.heathExtensions||0,max:4,color:'#c9a5e5',shape:'flame'};
 for(const [key,label,value,max,color] of [['charge','돌격',e.state.chargeStacks,4,'#e6b785'],['disrupt','방해',e.state.disruptStacks,3,'#cfb7e3'],['support','지원',e.supportStacks,4,'#a4d8d0']])if(g.buff(e,key))return {label,value:value||0,max,color,shape:'mirror'};
 return null;
}
export function championHud(r,e,g){
 const c=r.ctx,width=2.65,x=e.x-width/2,y=e.y-2.7;
 c.save();c.fillStyle='#081317';c.fillRect(x-.06,y-.06,width+.12,.46);
 c.fillStyle=e.player?'#7bd387':e.team===0?'#79bbc9':'#d7877e';c.fillRect(x,y,width*Math.max(0,e.hp/e.maxHp),.34);
 c.lineWidth=.045;c.strokeStyle='#081317';c.strokeRect(x-.04,y-.04,width+.08,.42);
 const shield=g.shield(e);if(shield){c.fillStyle='#e0e4cf';c.fillRect(x,y-.14,width*Math.min(1,shield/e.maxHp),.07);}
 c.lineWidth=.065;c.strokeStyle='#132020';c.font='bold .255px Arial';c.textAlign='center';c.textBaseline='middle';const hp=`${Math.max(0,Math.ceil(e.hp))} / ${Math.round(e.maxHp)}`;c.strokeText(hp,e.x,y+.17);c.fillStyle='#fff7de';c.fillText(hp,e.x,y+.17);
 const resourceY=y+.51,cap=g.ammoCap(e);
 if(e.key==='rudolph'){
  c.fillStyle='#322018';c.fillRect(x,resourceY,width,.24);c.fillStyle=e.state.exhaustedUntil>g.time?'#866347':'#f5a34e';c.fillRect(x,resourceY,width*Math.max(0,e.ammo/100),.24);r.text(`SP ${Math.floor(e.ammo)} / 100`,e.x,resourceY+.12,'#fff2da',.205);
 }else{
  const gap=.075,w=(width-gap*(cap-1))/cap;
  for(let i=0;i<cap;i++){const px=x+i*(w+gap);c.fillStyle='#14221e';c.fillRect(px,resourceY,w,.18);c.strokeStyle='#6b7560';c.lineWidth=.025;c.strokeRect(px,resourceY,w,.18);const fraction=i<Math.floor(e.ammo)?1:i===Math.floor(e.ammo)?Math.min(1,e.reloadProgress/g.reloadInterval(e)):0;c.fillStyle=i<e.ammo?'#f2d07c':'#95885f';c.fillRect(px+.015,resourceY+.015,(w-.03)*fraction,.15);}
 }
 if(e.key==='gubo'&&g.buff(e,'guboReload')){const left=e.buffs.guboReload-g.time;c.fillStyle='#241b2f';c.fillRect(x,resourceY+.32,width,.13);c.fillStyle='#d1a3ea';c.fillRect(x,resourceY+.32,width*Math.min(1,left/4),.13);r.text(`흉탄 ${left.toFixed(1)}s · 아군 ≤35%`,e.x,resourceY+.64,'#e4b8ef',.22);}
 r.text(`${e.name} · ${e.level}`,e.x,e.y-3.02,e.player?'#f4dfa3':e.team===0?'#a7d8df':'#edb2a4',.29);
 const stack=stackInfo(e,g);
 if(stack){
  const sw=2.35/stack.max;
  for(let i=0;i<stack.max;i++){
   const sx=e.x-1.175+sw*(i+.5),sy=e.y-3.51,filled=i<stack.value,color=filled?stack.color:'#3a4d43';
   if(stack.shape==='coin')r.circle(sx,sy,.12,color,filled?'#fff0b0':'#61715c',.035);
   else if(['leaf','flame','claw'].includes(stack.shape))r.polygon([[sx-.075,sy+.12],[sx-.105,sy-.02],[sx+.04,sy-.16],[sx+.08,sy+.08]],color);
   else r.shard(sx,sy,.13,Math.PI/2,color);
  }
  r.text(`${stack.label} ${stack.value}/${stack.max}`,e.x,e.y-3.82,stack.color,.225);
 }
 if(e.player)r.polygon([[e.x-.13,e.y-4.2],[e.x+.13,e.y-4.2],[e.x,e.y-3.98]],'#ead18a');
 c.restore();
}
function star(r,x,y,size,color){
 const points=[];for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rad=i%2?size*.43:size;points.push([x+Math.cos(a)*rad,y+Math.sin(a)*rad]);}r.polygon(points,color,'#6a522c');
}
export function championEffects(r,e,g){
 const c=r.ctx,theme=THEMES[e.key]||THEMES.faust;
 c.save();
 const villain=g.champions(1-e.team).some(a=>a.alive&&a.key==='don'&&a.state.villain===e.id);
 if(villain){
  const y=e.y-4.45,lines=[[{x:e.x-.28,y:y-.3},{x:e.x+.28,y:y+.3}],[{x:e.x+.28,y:y-.3},{x:e.x-.28,y:y+.3}]];
  for(const line of lines)r.line(line,'#ffe258',.22);
  for(const line of lines)r.line(line,'#d82b39',.105);
 }
 if(g.champions(e.team).some(a=>a!==e&&a.alive&&a.key==='gubo'&&e.hp/e.maxHp<=g.allyExecuteThreshold(a))){
  const y=e.y-5.2;r.circle(e.x,y,.28,'#43151b99','#f35759',.065);
  r.line([{x:e.x-.43,y},{x:e.x+.43,y}],'#ff6262',.055);r.line([{x:e.x,y:y-.43},{x:e.x,y:y+.43}],'#ff6262',.055);
 }
 for(const a of g.champions().filter(a=>a.alive&&a.state.guboAim?.target===e&&a.state.guboAim.until>g.time&&!g.stat(a,'stun'))){
  const y=e.y-.6,progress=1-(a.state.guboAim.until-g.time)/1.2;r.circle(e.x,y,1.2-progress*.4,null,'#ffb26c',.09);r.line([{x:a.x,y:a.y-.45},{x:e.x,y}],'#ed886288',.055,[.15,.18]);r.text('조준',e.x,e.y-5.8,'#ffb26c',.25);
 }
 const mental=Object.values(e.state.mentalWhip||{}).sort((a,b)=>b.stage-a.stage).find(m=>m.stage>0&&(m.stage<3||m.immuneUntil>g.time));
 if(mental){const y=e.y-(villain?5.4:4.45);r.text(mental.immuneUntil>g.time?`정신 저항 ${(mental.immuneUntil-g.time).toFixed(1)}s`:['','정신채찍 · 감속','정신채찍 · 탄창 소거'][mental.stage],e.x,y-.35,'#ffb46a',.24);for(let i=0;i<3;i++)r.circle(e.x+(i-1)*.3,y,.09,i<mental.stage?'#ffac50':'#553826','#ffbe6b',.025);}
 if(g.powerWeak(e)&&Object.keys(e.state.ishmaelWeak||{}).length)r.text(`전투력 −${Math.round(g.powerWeak(e)*100)}%`,e.x,e.y+1.05,'#a6d8e5',.23);
 if(e.recall){
  const progress=Math.min(1,(g.time-e.recall.startedAt)/RULES.recallTime);
  r.circle(e.x,e.y,1.15,'#a6d8ff14','#81cad4aa',.07);c.beginPath();c.arc(e.x,e.y,1.2,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);c.strokeStyle='#cbeafa';c.lineWidth=.15;c.stroke();
  for(let i=0;i<6;i++){const a=g.time*1.6+i*Math.PI/3;r.line([{x:e.x+Math.cos(a),y:e.y+Math.sin(a)*.4},{x:e.x+Math.cos(a),y:e.y-2.1+Math.sin(a)*.4}],'#99d9ec66',.045);}
  r.text(`귀환 ${Math.max(0,e.recall.until-g.time).toFixed(1)}s`,e.x,e.y+1.15,'#bce9ff',.35);
 }
 const shared=e.visuals.hongluShare;
 if(shared?.until>g.time){
  for(let i=0;i<3;i++){c.beginPath();c.ellipse(e.x,e.y-.55+i*.45,1.02+Math.sin(g.time*3+i)*.12,.28,Math.sin(g.time+i)*.18,0,Math.PI*2);c.strokeStyle=i%2?'#9cebddaa':'#4bb7bdaa';c.lineWidth=.07;c.stroke();}
 }
 if(e.key==='gubo'&&g.buff(e,'guboReload')){r.circle(e.x,e.y-.6,1,'#d9a3ee12','#d9a3ee99',.06);for(let i=0;i<3;i++)r.shard(e.x+Math.cos(g.time*2+i*2.1),e.y-.7+Math.sin(g.time*2+i*2.1)*.5,.15,g.time,'#e1b6f0');}
 if(e.key==='ryoshu'&&g.time-e.lastCombat>=2)for(let i=0;i<2;i++){const a=g.time+i*Math.PI;r.shard(e.x+Math.cos(a)*.85,e.y-.6+Math.sin(a)*.4,.16,a,'#efb0a0');}
 if(e.key==='alisa'&&(e.state.heat||0)>0)for(let i=0;i<e.state.heat;i++){const x=e.x+(i-(e.state.heat-1)/2)*.3,y=e.y+.3-Math.sin(g.time*5+i)*.15;r.polygon([[x-.12,y],[x,y-.45],[x+.14,y+.02]],'#ed9d6377');}
 if(e.key==='moses'&&e.state.smoke){const color={up:'#f1ede0',down:'#99b4ef',left:'#c59ae5',right:'#f29e8f'}[e.state.smoke];for(let i=0;i<3;i++){const a=g.time*1.3+i*2.1;r.circle(e.x+Math.cos(a)*.7,e.y-.6-Math.sin(g.time*2+i)*.35,.16,color+'88');}}
 if(g.champions(e.team).some(a=>a.key==='meursault'&&a.alive&&a!==e&&Math.hypot(a.x-e.x,a.y-e.y)<=4))r.circle(e.x,e.y,.88,null,'#98b4cf88',.065);
 if(e.visuals.contempt?.until>g.time){r.circle(e.x,e.y-1,.95,null,'#ef9a9a99',.065);r.text('경멸',e.x,e.y-4.3,'#ef9a9a',.28);}
 if(e.visuals.nellyMark?.until>g.time){r.polygon([[e.x-.2,e.y-4.4],[e.x+.2,e.y-4.4],[e.x,e.y-4.1]],'#d6e1f5');r.text('표식',e.x,e.y-4.65,'#c6daf4',.23);}
 if(e.visuals.harpoon?.until>g.time)r.chain({x:e.x-.5,y:e.y-1},{x:e.x+.5,y:e.y-.4},'#e1c184');
 if(g.buff(e,'heathUlt'))r.circle(e.x,e.y,7.5,'#b48bd309','#c7a4e199',.055);
 if(e.state.donBarrage?.until>g.time){const a=Math.atan2(e.state.donBarrage.d.y,e.state.donBarrage.d.x);c.beginPath();c.arc(e.x,e.y-.4,1.2,a-.9,a+.9);c.strokeStyle='#f4d98bdd';c.lineWidth=.17;c.stroke();}
 if(e.state.augReloadStacks>0)r.text(`장전 +${e.state.augReloadStacks*5}%`,e.x,e.y+1.2,'#e9d093',.24);
 const buffs=g.activeBuffs(e).slice(0,4);
 for(let i=0;i<buffs.length;i++){
  const b=buffs[i],t=THEMES[e.visuals[b.key]?.theme]||theme,a=g.time*(.9+i*.13)+i*2.1;
  const x=e.x+Math.cos(a)*(1+i*.08),y=e.y-.65+Math.sin(a)*.5;
  if(['blessing','ogamdo','insight','mosesHeal','hongluStride'].includes(b.key)){c.beginPath();c.ellipse(e.x,e.y-.2,1.05+i*.09,.35,0,a,a+Math.PI*1.4);c.strokeStyle=t.light+'99';c.lineWidth=.055;c.stroke();r.shard(x,y,.11,a,t.light);}
  else if(['resolve','chainArmor','ishmaelShield','donGuard','ezraUlt'].includes(b.key)){r.polygon([[x-.12,y-.16],[x+.12,y-.16],[x+.12,y+.04],[x,y+.2],[x-.12,y+.04]],t.light+'cc');}
  else if(['heathUlt','mutant','alisaHaste','donLifesteal'].includes(b.key)){r.line([{x,y:y+.3},{x:x-.1,y},{x:x+.08,y:y-.4}],t.light+'bb',.075);r.circle(e.x,e.y,1.15+i*.12,null,t.dark+'aa',.055);}
  else r.shard(x,y,.13,a,t.light+'cc');
 }
 // Short activation pulses use each champion's palette, even for a single-frame proc.
 const recent=Object.values(e.visuals).filter(v=>g.time-v.at<.55).slice(-2);
 for(const v of recent){const p=(g.time-v.at)/.55,t=THEMES[v.theme]||theme;r.circle(e.x,e.y-.3,.5+p*1.2,null,t.light+'88',.045);}
 if(g.stat(e,'stun'))for(let i=0;i<3;i++){const a=g.time*5+i*Math.PI*2/3;star(r,e.x+Math.cos(a)*.63,e.y-4.35+Math.sin(a)*.18,.17,'#f6d97d');}
 if(g.stat(e,'root')){const t=THEMES[e.status.root.theme]||theme;for(let i=0;i<3;i++){const a=i*2.1;r.chain({x:e.x+Math.cos(a)*.8,y:e.y+Math.sin(a)*.3},{x:e.x+Math.cos(a+2)*.8,y:e.y+Math.sin(a+2)*.3},t.accent);}}
 if(g.stat(e,'silence')){r.circle(e.x+.95,e.y-3.15,.24,'#19232c','#cdbde2',.045);r.line([{x:e.x+.8,y:e.y-3.3},{x:e.x+1.1,y:e.y-3}],'#e3c9ef',.055);}
 if(g.stat(e,'slow'))for(let i=0;i<3;i++)r.line([{x:e.x-.65+i*.55,y:e.y+.25},{x:e.x-.8+i*.55,y:e.y+.8}],'#9bd7e988',.065);
 if(['weak','vulnerable','armorDown','reloadWeak','hasteWeak'].some(k=>g.stat(e,k)))for(let i=0;i<2;i++)r.polygon([[e.x-.9+i*1.8,e.y-.9],[e.x-1.02+i*1.8,e.y-1.15],[e.x-.78+i*1.8,e.y-1.15]],'#df9b9bcc');
 if(e.key==='rodya'&&g.time-(e.state.coinAt??-99)<2.2){
  const age=g.time-e.state.coinAt;
  if(e.state.jackpot){r.text('JACKPOT!',e.x,e.y-5.6,'#ffe189',.43);for(let i=0;i<6;i++){const a=g.time*3+i*Math.PI/3;star(r,e.x+Math.cos(a)*1.35,e.y-1+Math.sin(a)*.65,.13,'#f4d57a');}}
  (e.state.coinResults||[]).forEach((heads,i)=>{const x=e.x+(i-1)*.65,y=e.y-4.6-Math.sin(Math.min(1,age/.9)*Math.PI)*.65,flip=age<.9?Math.abs(Math.cos(age*17+i)):.95;
   c.beginPath();c.ellipse(x,y,.25*Math.max(.12,flip),.27,0,0,Math.PI*2);c.fillStyle=heads?'#ddba5f':'#4d4e4b';c.fill();c.strokeStyle=heads?'#fff0ac':'#bec5ba';c.lineWidth=.055;c.stroke();if(age>.85)r.text(heads?'앞':'뒤',x,y,heads?'#413c26':'#e1dfcb',.19);
  });
 }
 c.restore();
}
export function chargePreview(r,e,g){
 if(e.key!=='heathcliff'||e.state.chargeAt===undefined||!e.alive)return;
 const point=e.player?g.input.aim:e.state.chargeAim,charge=heathCharge(g,e,point),color=charge.ready?'#d9b6f1':'#b4a7c1',c=r.ctx;
 c.save();r.circle(e.x,e.y,charge.range,'#b389d209',color+'88',.045);
 const path=[];for(let i=0;i<=20;i++){const t=i/20;path.push({x:e.x+(charge.landing.x-e.x)*t,y:e.y+(charge.landing.y-e.y)*t-Math.sin(t*Math.PI)*1.2});}
 r.line(path,color+'cc',.08,[.16,.13]);r.circle(charge.landing.x,charge.landing.y,charge.radius,'#c49ce526',color,.075);r.circle(charge.landing.x,charge.landing.y,.15,color);
 r.text(charge.ready?`좌클릭 발사 · 최대 ${charge.range.toFixed(1)}`:`충전 ${charge.elapsed.toFixed(1)} / 1.2s`,charge.landing.x,charge.landing.y+2.25,color,.3);
 c.restore();
}
