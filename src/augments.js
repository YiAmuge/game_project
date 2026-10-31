import { distance } from './geometry.js';
import { AUGMENTS,AUGMENT_RULES } from './data.js';
export { AUGMENTS,AUGMENT_RULES };
export const absorbedOrder=e=>['yan','sora'].includes(e.key)&&Boolean(e.absorbedOrder);
export const has=(e,key)=>Boolean(e.augments?.includes(key)||key==='writtenOrder'&&absorbedOrder(e));
export const cost=(e,key)=>AUGMENT_RULES.cost*(['yan','sora'].includes(e.key)&&key==='writtenOrder'?.5:1);
export const saleValue=(e,key)=>cost(e,key)*AUGMENT_RULES.refund;
// A rifle/single projectile keeps the ordinary range bonus; fans, rectangles,
// radial attacks, piercing projectiles and damaging dashes use the area bonus.
export const broadBasic=e=>!['jamila','outis','ppui'].includes(e.key)&&(e.key!=='faust'||e.level>=10);
export const rangeBonus=e=>has(e,'range7')?(broadBasic(e)?1.3:2.5):0;
export function absorbOrder(g,e){if(!['yan','sora'].includes(e.key)||absorbedOrder(e)||!g.buff(e,e.key==='yan'?'yanDistorted':'soraEgo')||!e.augments.includes('writtenOrder'))return false;e.augments=e.augments.filter(k=>k!=='writtenOrder');e.absorbedOrder=true;return true;}
export function unlocked(e,group){return group==='combat'?e.upgrades.power>=3:group==='survival'?e.upgrades.health>=3:e.upgrades.speed+e.upgrades.reload+e.upgrades.haste>=3;}
export const exclusive=(e,key)=>e.key==='kim'&&key==='power15'||e.key==='jamila'&&key==='highRisk'||['yan','sora'].includes(e.key)&&key==='writtenOrder'||e.key==='queen'&&key==='battleHaste';
export const unlockedItem=(e,key)=>exclusive(e,key)||unlocked(e,AUGMENTS.find(a=>a.key===key)?.group);
export const unlockedGroup=(e,group)=>unlocked(e,group)||AUGMENTS.some(a=>a.group===group&&exclusive(e,a.key));
export const orderLimit=e=>e.key==='sora'?4:5;
export const terminalText='공격 적중 시 방어력·장전 속도 +2.5%, 최대 4중첩. 각 중첩은 5초 유지된다. 최대 중첩 중 일반 피해의 7%를 고정 피해로 전환하고 해당 고정 피해만큼 5초 보호막을 얻으며 최대 500까지 누적된다.';
export const augmentName=(e,item)=>e.key==='sora'&&item?.key==='writtenOrder'?'단말기로 전해진 지령':item?.name||'';
export const battleActive=(g,e)=>Boolean(g.buff(e,'augBattleHaste')||e.key==='queen'&&has(e,'battleHaste')&&e.state.queenR?.phase==='charging');
export const EXCLUSIVE_AUGMENTS={
 sora:[{key:'writtenOrder',name:'단말기로 전해진 지령',summary:'조건 없이 반값에 구매합니다. 공격으로 방어력·장전 속도 중첩을 얻고, 최대 중첩에서 고정 피해 전환과 보호막을 얻습니다. 개화 E.G.O 진입 시 패시브로 흡수합니다.',text:'강화시술 구매 조건 없이 250 재화로 구매하며 단말기로 전해진 지령으로 변경된다. '+terminalText+' 개화 E.G.O 상태가 되면 증강을 흡수해 칸을 비우고 동일한 효과를 상시 패시브로 얻는다. 변신 중 구매하면 즉시 흡수한다. 흡수한 효과는 변신 종료·사망·부활 후에도 유지되며 다시 구매하거나 판매할 수 없다.'}],
 queen:[{key:'battleHaste',name:'사랑과 증오의 이름으로',summary:'조건 없이 구매합니다. 활성화 중 전투력 +15%. 궁극기 충전 중에는 즉시 활성화됩니다.',text:'강화시술 구매 조건 없이 구매할 수 있다. 증강 활성화 중 전투력이 15% 증가한다. 궁극기 충전 중에는 전투 지속 조건과 관계없이 활성화된다.'}],
 kim:[{key:'power15',name:'신검합일',text:'강화시술 구매 조건 없이 구매 가능. 2초마다 최대 체력의 1% 보호막을 얻으며 최대 12%까지 누적되고 5초간 유지된다. 이 보호막은 본국검술 보호막으로 취급되어 보유 중 장전 속도와 스킬 가속이 12% 증가한다.'}],
 jamila:[{key:'highRisk',name:'고위험 작전용 장비',text:'강화시술 구매 조건 없이 구매 가능. 침투 사거리 +10, 위치 선택시간 15초. 전장에서 사라진 동안 궁극기를 사용하면 선택 위치에 전투원 2명과 함께 즉시 나타나며 전투원의 지속시간이 15초가 된다.'}],
 yan:[{key:'writtenOrder',name:'쪽지로 전해진 지령',text:'강화시술 구매 조건 없이 50% 할인된 250 재화로 구매할 수 있다. 구매 후 뒤틀림 상태가 되면 증강을 흡수해 보유 칸을 비우고 동일한 효과를 상시 패시브로 얻는다. 뒤틀림 상태에서 구매하면 즉시 흡수한다. 흡수한 효과는 변신 종료·사망·부활 후에도 유지되며 다시 구매하거나 판매할 수 없다.'}],
};
export const exclusiveAugments=key=>EXCLUSIVE_AUGMENTS[key]||[];
export function augmentText(e,item){if(!item)return '';const effect=exclusiveAugments(e.key).find(a=>a.key===item.key);if(e.key==='sora'&&item.key==='writtenOrder')return effect.text;return item.text+(effect?'\n'+({kim:'김삿갓',jamila:'자밀라',yan:'얀',sora:'소라',queen:'증오의 여왕'}[e.key])+' 전용: '+effect.text:'');}
export const categoryCount=(e,group)=>e.augments.filter(key=>AUGMENTS.find(a=>a.key===key)?.group===group).length;
export const resentment=e=>has(e,'resentment')?Math.min(8,Math.floor((1-e.hp/e.maxHp+1e-8)*10))*.05:0;
export function tick(g,e,dt=0){
 for(const key of ['orderStacks'])e.state[key]=liveStacks(g,e,key);
 if(has(e,'forceBattery')&&g.time-e.lastDamageAt>=2-1e-8)naturalShield(g,e,e.maxHp*.13*dt);
 if(has(e,'antimatter'))e.state.antimatterNext??=g.time+.5;
 if(has(e,'antimatter')&&g.time+1e-8>=e.state.antimatterNext){e.state.antimatterNext=g.time+.5;for(const t of [...g.units])if(g.hostile(e,t)&&distance(e,t)<=1.6+t.radius&&g.clearLine(e,t))g.deal(e,t,20,{fixed:true,proc:false});}
 const s=e.state;
 if(e.key==='kim'&&has(e,'power15')){s.unityNext??=g.time+2;while(g.time+1e-8>=s.unityNext){s.unityNext+=2;const id=`sword-unity-${e.id}`,old=e.shields.find(a=>a.source===id&&a.until>g.time)?.value||0;g.addShield(e,Math.min(e.maxHp*.12,old+e.maxHp*.01),id,5);g.addBuff(e,'swordDiscipline',5,{copy:false});}}else delete s.unityNext;
 if(e.key==='queen'&&has(e,'battleHaste')&&e.state.queenR?.phase==='charging'){if(!g.buff(e,'augBattleHaste')){e.visuals.battleHaste={at:g.time,until:g.time+1};g.addBuff(e,'augBattleHaste',.1,{copy:false});}else e.buffs.augBattleHaste=g.time+.1;}
 else if(g.time-e.lastCombat>3){delete s.augCombatAt;delete e.buffs.augBattleHaste;}
 else{s.augCombatAt??=g.time;if(has(e,'battleHaste')&&g.time-s.augCombatAt>=3){if(!g.buff(e,'augBattleHaste')){g.addBuff(e,'augBattleHaste',3,{copy:false});e.visuals.battleHaste={at:g.time,until:g.time+1};}else e.buffs.augBattleHaste=g.time+3;}}
 if(s.augReloadStacks>0&&g.time+1e-8>=s.augReloadDecay){while(s.augReloadStacks>0&&g.time+1e-8>=s.augReloadDecay){s.augReloadStacks--;s.augReloadDecay+=3;}if(!s.augReloadStacks)delete e.buffs.augReload;}
}
export function interceptFatal(g,e,remaining){
 if(e.kind!=='champion'||remaining<e.hp||!has(e,'kAmpule')||(e.state.ampuleReady||0)>g.time)return false;
 e.state.ampuleReady=g.time+60;e.visuals.ampule={at:g.time,until:g.time+1.2};e.hp=e.maxHp*.5;
 for(const key of ['stun','root','silence','slow','disarm','taunt','captured','netCapture','yanLock'])delete e.status[key];
 delete e.state.netCapture;delete e.state.taunt;if(e.motion?.forced)delete e.motion;const owner=g.units.find(a=>a.state?.swordGrab?.target===e);if(owner)delete owner.state.swordGrab;delete e.state.swordHeldBy;
 e.ccImmuneUntil=Math.max(e.ccImmuneUntil||0,g.time+1);g.addBuff(e,'ampuleStride',1,{copy:false});
 g.effects.push({type:'ring',x:e.x,y:e.y,r:2,color:'#76e8bd',life:.5,maxLife:.5});return true;
}
export function naturalShield(g,e,amount){
 if(!has(e,'forceBattery')||amount<=0)return;
 const id=`battery-${e.id}`,old=e.shields.find(s=>s.source===id&&s.until>g.time)?.value||0;
 g.addShield(e,Math.min(e.maxHp*.3,old+amount),id,Infinity,false);
}
export function afterHit(g,e,t,actual,proc,absorbed=0){
 if(e.kind==='champion'&&e.team!==t.team&&has(e,'glaive')&&actual>0)g.heal(e,e,actual*.3,false);
 if(!proc||actual+absorbed<=0)return;
 if(e.kind==='champion'&&e.team!==t.team&&has(e,'writtenOrder')){stack(g,e,'orderStacks',orderLimit(e));g.addBuff(e,'writtenOrder',5,{copy:false});}
 if(e.kind==='champion'&&e.team!==t.team){
  if(has(e,'reloadStacks')){e.state.augReloadStacks=Math.min(5,(e.state.augReloadStacks||0)+1);e.state.augReloadDecay=g.time+3;g.addBuff(e,'augReload',e.state.augReloadStacks*3,{copy:false});}
  if(actual>0&&t.kind==='champion'&&has(e,'finalBullet')&&(e.state.augBulletReady||0)<=g.time){e.state.augBulletReady=g.time+7;if(t.hp>0)g.deal(e,t,actual*.07,{fixed:true,proc:false});}
 }
}
export const slots=e=>AUGMENT_RULES.slots;
export const usedSlots=e=>e.augments.length;
export const categoryFits=(e,key)=>has(e,'carrier')||key==='carrier'||categoryCount(e,AUGMENTS.find(a=>a.key===key)?.group)<AUGMENT_RULES.categorySlots;
export const fits=(e,key)=>usedSlots(e)<slots(e);
export const sellable=(g,key,e=g.player)=>!(key==='writtenOrder'&&absorbedOrder(e));
export const liveStacks=(g,e,key)=>(e.state[key]||[]).filter(at=>at>g.time+1e-8);
function stack(g,e,key,max){const list=liveStacks(g,e,key);if(list.length>=max)list.shift();list.push(g.time+5);e.state[key]=list;}
export function powerRate(g,e){return (e.key==='queen'&&has(e,'battleHaste')&&battleActive(g,e)?.15:0)+(has(e,'power15')?.1:0)+(has(e,'glaive')?.1:0)+(has(e,'blackOrb')?.1:0)+(has(e,'wisdom')?.05:0)+(has(e,'highRisk')?.05:0)+(has(e,'duelManual')?Math.max(0,g.speed(e)/g.baseSpeed(e)-1):0);}
export const speedRate=(g,e)=>(has(e,'duelManual')?.05:0)+(has(e,'carrier')?.03:0)+(has(e,'forceBattery')&&g.shield(e)>=e.maxHp*.1-1e-8?.1:0);
export const reloadRate=(g,e)=>(has(e,'kAmpule')?.07:0)+(e.key==='sora'&&has(e,'writtenOrder')?liveStacks(g,e,'orderStacks').length*.025:0);
export const armorRate=(g,e)=>(has(e,'writtenOrder')?liveStacks(g,e,'orderStacks').length*(e.key==='sora'?.025:.05):0)+(has(e,'traumaGuard')?.05:0)+(has(e,'highRisk')?.07:0);
export const armorPen=e=>has(e,'power15')?.2:0;
export const converts=(g,e)=>has(e,'writtenOrder')&&liveStacks(g,e,'orderStacks').length>=orderLimit(e);
export const conversionRate=(g,e)=>converts(g,e)?e.key==='sora'?.07:.1:0;
export const healthRate=e=>(has(e,'antimatter')?.1:0)+(has(e,'traumaGuard')?.05:0);
export const cooldownFactor=e=>1;
export function onCast(){}
export function onDebuff(g,e,target){
 if(!e||e.kind!=='champion'||!e.alive||e.team===target.team||!has(e,'maskDeLu')||(e.state.maskReady||0)>g.time)return;
 e.state.maskReady=g.time+10;g.effects.push({type:'maskSplash',source:e.id,x:e.x,y:e.y,life:.65,maxLife:.65});e.qCd*=.8;e.rCd*=.8;
 for(const key of ['knifeReady','treeReady','ryoshuReady','egoQReady','ppuiReady','qDelayUntil'])if(Number.isFinite(e.state[key])&&e.state[key]>g.time)e.state[key]=g.time+(e.state[key]-g.time)*.8;
 e.ammo=Math.min(g.ammoCap(e),e.ammo+(e.key==='rudolph'?15:1));
}
export function convertedShield(g,e,amount){
 if(!has(e,'writtenOrder')||amount<=0||!e.alive)return;
 const id=`order-ward-${e.id}`,old=e.shields.find(s=>s.source===id&&s.until>g.time)?.value||0;
 g.addShield(e,Math.min(500,old+amount),id,5);
}
const CC=new Set(['stun','root','silence','slow','disarm','taunt','captured','netCapture','yanLock','knock']);
export function interceptCC(g,e,key,amount,seconds){
 if(!has(e,'traumaGuard')||!CC.has(key)||!(amount>0&&seconds>0)||(e.state.traumaReady||0)>g.time)return false;
 e.state.traumaReady=g.time+16;e.ammo=Math.min(g.ammoCap(e),e.ammo+(e.key==='rudolph'?15:1));
 g.effects.push({type:'traumaField',source:e.id,x:e.x,y:e.y,r:1,color:'#ffffff',life:.6,maxLife:.6});return true;
}
export function cleanup(e){for(const k of ['maskStacks','orderStacks','antimatterNext'])delete e.state[k];}
