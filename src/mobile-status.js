import{augmentStatus}from'./augment-status.js';
import{stackInfo}from'./overlays.js';
import{championDescription}from'./champion-reference.js';
import{BUFF_LABELS}from'./catalog.js';
import{AUGMENTS}from'./data.js';
import*as AugmentArt from'./augment-art.js';

export const MOBILE_STATUS_LIMIT=10;
const timedPassives=new Set(['yi','kim','ishmael','gregor','sora','don','rudolph','dongbaek','ryoshu']);
const augmentBuffs=new Set(['augBattleHaste','augReload','ampuleStride','writtenOrder']);
const debuffNames={stun:'기절',silence:'침묵',root:'속박',slow:'감속',disarm:'무장해제',weak:'전투력 감소',armorWeak:'방어력 감소',armorDown:'방어력 감소',vulnerable:'받는 피해 증가',taunt:'도발',captured:'포획',netCapture:'포획',reloadWeak:'장전 감속',hasteWeak:'스킬 가속 감소'};
function passiveActive(g,e){
 switch(e.key){
 case'yi':return e.shields.some(s=>s.passive==='yi'&&s.value>0&&s.until>g.time);
 case'kim':return g.buff(e,'swordDiscipline');
 case'ishmael':return g.buff(e,'ishmaelSurvive');
 case'gregor':return g.buff(e,'mutant');
 case'sora':return !g.buff(e,'soraEgo')&&Object.values(e.state.orders||{}).some(m=>m.until>g.time&&g.units.some(t=>t.id===m.target&&t.alive));
 case'don':return g.units.some(t=>t.id===e.state.villain&&t.alive);
 case'rudolph':return e.state.exhaustedUntil>g.time;
 case'dongbaek':return e.state.usedPetal&&e.attackCd>0;
 case'ryoshu':return g.time-e.lastCombat>=2;
 default:return false;
 }
}
export function mobileStatusEntries(g,e){
 if(!e.alive)return[];
 const entries=g.activeBuffs(e).map(b=>({kind:'buff',key:b.key,priority:augmentBuffs.has(b.key)?2:0,order:b.order,label:Number.isFinite(b.until)?String(Math.ceil(b.until-g.time)):'',name:BUFF_LABELS[b.key]||b.key,glyph:(BUFF_LABELS[b.key]||b.key).slice(0,2),ready:true}));
 for(const[key,s]of Object.entries(e.status).filter(([,s])=>s&&s.amount>0&&s.until>g.time)){
  const history=e.statusHistory??={};if(history[key]?.until!==s.until)history[key]={until:s.until,order:++g.buffSequence};
  const name=debuffNames[key]||key;entries.push({kind:'debuff',key,priority:0,order:history[key].order,label:String(Math.ceil(s.until-g.time)),name,glyph:name.slice(0,2),ready:false});
 }
 const remaining=g.passiveCooldown(e),active=Boolean(passiveActive(g,e));
 if(!(e.key==='sora'&&g.buff(e,'soraEgo'))&&(!timedPassives.has(e.key)||remaining>0||active)){const stack=stackInfo(e,g),description=championDescription(e.key);entries.push({kind:'passive',key:e.key,priority:1,order:0,label:remaining>0?Math.ceil(remaining)+'s':stack?.value!==undefined?stack.value+'/'+stack.max:'',name:description.passive,glyph:'P',ready:active,title:description.passiveText});}
 for(const[index,key]of e.augments.entries()){const a=AUGMENTS.find(a=>a.key===key);if(!a)continue;const state=augmentStatus(g,e,key);entries.push({kind:'augment',key,priority:2,order:index,label:state.label,name:a.name,group:a.group,ready:state.ready});}
 return entries.sort((a,b)=>a.priority-b.priority||b.order-a.order).slice(0,MOBILE_STATUS_LIMIT);
}
export class MobileStatus{
 constructor(root){this.root=root;}
 update(g,e){
  const entries=mobileStatusEntries(g,e),signature=entries.map(s=>s.kind+':'+s.key).join('|');
  if(signature!==this.signature){this.signature=signature;this.root.replaceChildren();for(const s of entries){const el=document.createElement('span');el.className='mobile-status-icon '+(s.kind==='passive'?'passive-state':s.kind);el.dataset[s.kind]=s.kind==='passive'?'true':s.key;if(s.kind==='augment')el.append(AugmentArt.icon(s.key,s.group,48));else{const glyph=document.createElement('i');glyph.textContent=s.glyph;el.append(glyph);}el.append(document.createElement('small'));this.root.append(el);}}
  entries.forEach((s,i)=>{const el=this.root.children[i];el.querySelector('small').textContent=s.label;el.classList.toggle('ready',s.ready);el.title=s.title||s.name;el.setAttribute('aria-label',s.name+(s.label?' · '+s.label:''));});
 }
}
