const LABELS={stun:'기절',root:'속박',silence:'침묵',slow:'감속',weak:'전투 약화',vulnerable:'취약',armorDown:'방어력 감소',armorWeak:'방어 약화',reloadWeak:'장전 약화',hasteWeak:'가속 약화',disarm:'무장해제',captured:'결박',netCapture:'그물',yanLock:'잠금',taunt:'도발'};
const PERCENT=new Set(['slow','weak','vulnerable','armorWeak','reloadWeak','hasteWeak']);
export function debuffIndicators(g,e){
 const result=[];for(const [key,s]of Object.entries(e.status||{}))if(s.until>g.time&&g.stat(e,key)>0){const amount=PERCENT.has(key)?` ${Math.round(s.amount*100)}%`:key==='armorDown'?` ${s.amount}`:'';result.push({key,label:(LABELS[key]||key)+amount,until:s.until});}
 const state=e.state||{},add=(key,label,until)=>{if(until===undefined||until>g.time)result.push({key,label,until});};
 if(e.burn?.until>g.time)add('burn','화상',e.burn.until);
 if(e.plague?.until>g.time)add('plague',`해충 ${e.plague.stacks}`,e.plague.until);
 for(const key of ['gaze','mentalWhip','nellyMarks','rabbitMark','contempt'])for(const mark of Object.values(state[key]||{})){
  if(key==='gaze'&&mark.n>0)add(key,`시선 ${mark.n}`,mark.until);
  if(key==='mentalWhip'&&mark.stage>0)add(key,`정신채찍 ${mark.stage}`,undefined);
  if(key==='nellyMarks'&&mark.active)add(key,'비도 표식',mark.until);
  if(key==='rabbitMark')add(key,'토끼 표식',typeof mark==='number'?mark:mark.until);
  if(key==='contempt')add(key,'경멸',typeof mark==='number'?mark:mark.until);
 }
 const weak=Object.values(state.ishmaelWeak||{}).reduce((a,b)=>a+b,0);if(weak)add('ishmaelWeak',`공격 약화 ${weak*2}%`);
 if(state.harpoon?.until>g.time)add('harpoon','가스작살',state.harpoon.until);
 return result.filter((v,i,a)=>a.findIndex(x=>x.key===v.key)===i);
}
export function drawDebuffs(r,e,g,healthY){
 const entries=debuffIndicators(g,e);for(let i=0;i<entries.length;i++){
  const row=Math.floor(i/3),count=Math.min(3,entries.length-row*3),x=e.x+(i%3-(count-1)/2)*1.38,y=healthY-.76-row*.34,item=entries[i],label=item.label+(Number.isFinite(item.until)?` ${(item.until-g.time).toFixed(1)}s`:'');
  r.ctx.fillStyle='#211a29e8';r.ctx.fillRect(x-.67,y-.13,1.34,.27);r.text(label,x,y,'#e6b3c5',.168);
 }
 return entries.length;
}
