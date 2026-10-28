import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import{CAMP_RULES,FOUNTAIN_AREAS,inWell}from'../src/data.js';
import*as Yan from'../src/yan.js';
import*as Fountain from'../src/fountain.js';
import{skillReference}from'../src/skill-reference.js';
import{mobileSkillHelp}from'../src/mobile-score.js';
import{targetButtonPositions}from'../src/mobile-gestures.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const run=(g,s)=>{for(let n=0;n<Math.ceil(s*120);n++)g.step(1/120);};
function arena(key='faust'){
 const g=new Game(key,'bottom',{seed:72}),p=g.player;g.units=[p];g.events=[];g.pending=[];g.projectiles=[];g.minionQueue=[];g.firstWaveAt=Infinity;g.wave=100;g.sewingKingSpawned=true;g.bossSpawned=true;
 for(const f of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 Object.assign(p,{x:40,y:25,lastAttackAt:999,lastDamageAt:999});return{g,p};
}
function foe(g,key='faust',team=1){const e=g.makeChampion(key,team,g.nextId+10);Object.assign(e,{x:44,y:25,hp:100000,maxHp:100000,lastAttackAt:999,lastDamageAt:999});return e;}
test('a direct champion kill transfers both camp buffs with a full fresh duration and independent shield accumulation',()=>{
 const{g,p}=arena(),t=foe(g);g.addBuff(t,'amplify',10);g.addBuff(t,'blessing',12);g.addShield(t,150,`preservation-${t.id}`,12);g.time=4;g.kill(t,p);
 for(const key of['amplify','blessing']){assert.ok(g.buff(p,key));near(p.buffs[key]-g.time,CAMP_RULES.buffDuration);assert.equal(g.buff(t,key),false);}
 near(g.shield(p),0);run(g,3.01);near(g.shield(p),30);
});
test('transfer refreshes an existing holder, supports another direct transfer and never transfers the boss buff',()=>{
 const{g,p}=arena(),t=foe(g),next=foe(g);g.addBuff(p,'amplify',2);g.addBuff(t,'amplify',6);g.addBuff(t,'bossBuff',100);g.kill(t,p);near(p.buffs.amplify-g.time,60);assert.equal(g.buff(p,'bossBuff'),false);g.time=9;g.kill(p,next);near(next.buffs.amplify-g.time,60);
});
test('a tower kill credited to a champion and an expired camp buff do not transfer',()=>{
 const{g,p}=arena(),t=foe(g);g.addBuff(t,'amplify',10);t.lastEnemyDamage={id:p.id,at:g.time};g.kill(t,{kind:'tower',team:0,name:'포탑'});assert.equal(t.lastDeath.killerId,p.id);assert.equal(g.buff(p,'amplify'),false);
 const b=foe(g);g.addBuff(b,'blessing',.1);g.time=.2;g.kill(b,p);assert.equal(g.buff(p,'blessing'),false);
});
test('a direct Gubo allied execution receives camp buffs and queues its departure haste',()=>{
 const{g,p}=arena('gubo'),ally=foe(g,'faust',0);g.addBuff(ally,'blessing',5);g.kill(ally,p);near(p.buffs.blessing-g.time,60);assert.ok(ally.state.executedReturn);
});
test('Alisa ultimate self-detonation keeps only unexpired creep buffs and respawns with an immediately usable shop',()=>{
 const{g,p}=arena('alisa'),t=foe(g);t.x=42;p.state.heat=5;const expiry={};for(const key of['amplify','blessing','bossBuff']){g.addBuff(p,key,60);expiry[key]=p.buffs[key];}g.addBuff(p,'haste',50);
 assert.ok(g.cast(p,'r',{x:45,y:25}));for(let n=0;p.alive&&n<700;n++)g.step(1/120);assert.equal(p.alive,false);assert.ok(p.state.fastReturn);
 for(const[key,until]of Object.entries(expiry))near(p.buffs[key],until);assert.equal(g.buff(p,'haste'),false);assert.equal(g.buff(t,'amplify'),false);
 run(g,p.respawnAt-g.time+.02);assert.ok(p.alive);assert.ok(g.inSpawn(p));assert.ok(g.canShop(p));assert.ok(g.buyAugment(p,'power15')===false);p.gold=1000;p.upgrades.power=3;assert.ok(g.buyAugment(p,'power15'));
 for(const[key,until]of Object.entries(expiry))near(p.buffs[key],until);near(p.buffs.alisaHaste-g.time,5);
});
test('Alisa passive detonation and absolute death clear creep buffs normally',()=>{
 for(const absolute of[false,true]){const{g,p}=arena('alisa'),t=foe(g);g.addBuff(p,'bossBuff',60);g.addBuff(p,'amplify',60);p.state.detonating=true;if(absolute)p.state.blastArmed=true;g.kill(p,t,{absolute});assert.equal(g.buff(p,'bossBuff'),false);assert.equal(g.buff(p,'amplify'),false);assert.ok(g.buff(t,'amplify'));}
});
test('both return haste timers stay full in the fountain, begin on first exit and keep running after reentry',()=>{
 for(const[key,seconds]of[['alisaHaste',5],['executedHaste',3]]){const{g,p}=arena();Object.assign(p,g.spawnPoint(p));Fountain.returnHaste(g,p,key,seconds);const fast=g.speed(p);run(g,7);assert.ok(g.buff(p,key));near(p.buffs[key]-g.time,seconds);near(g.speed(p),fast);
  const z=FOUNTAIN_AREAS[p.team];p.x=z.x+z.w+.8;p.y=z.y+z.h/2;g.step(1/120);assert.equal(p.state.departureHaste,undefined);const until=p.buffs[key];near(until-g.time,seconds);run(g,.5);assert.ok(p.buffs[key]-g.time<seconds-.49);Object.assign(p,g.spawnPoint(p));run(g,seconds+.1);assert.equal(g.buff(p,key),false);near(p.buffs[key],until);
 }
});
test('Gubo execution actually respawns its ally with full departure-based haste and no shop lock',()=>{
 const{g,p}=arena('gubo'),a=foe(g,'faust',0);g.kill(a,p);run(g,a.respawnAt-g.time+.02);assert.ok(a.alive&&g.canShop(a));run(g,4);near(a.buffs.executedHaste-g.time,3);
});
test('distorted hands cannot be commanded or move into either enemy fountain and ignore allies own fountain',()=>{
 for(const team of[0,1]){const{g,p}=arena('yan');p.team=team;const z=FOUNTAIN_AREAS[1-team];Object.assign(p,{x:team?z.x+z.w+1:z.x-1,y:z.y+z.h/2,facing:team?Math.PI:0});p.state.ominous=6;assert.ok(g.cast(p,'r',p));const h=Yan.hand(g,p),point={x:z.x+z.w/2,y:p.y};Yan.command(g,p,point);
  for(let n=0;n<180;n++){g.step(1/120);assert.ok(h.alive);assert.equal(inWell(h,1-team),false);assert.ok(h.hp>0);}
  const own=FOUNTAIN_AREAS[team];Object.assign(p,g.spawnPoint(p));Object.assign(h,{x:own.x+own.w/2,y:own.y+own.h/2});assert.equal(Yan.ejectHand(g,h),false);
 }
});
test('a forcibly placed hand is ejected to the closest walkable exterior before any fountain damage',()=>{
 const{g,p}=arena('yan'),z=FOUNTAIN_AREAS[1];Object.assign(p,{x:z.x-1,y:z.y+z.h/2});p.state.ominous=6;g.cast(p,'r',p);const h=Yan.hand(g,p);Object.assign(h,{x:z.x+1,y:p.y,hp:1,fountainTick:100});Fountain.tick(g,h,1);assert.ok(h.alive);near(h.hp,1);assert.equal(inWell(h,1),false);near(h.x,z.x-.26);assert.ok(Math.abs(h.y-p.y)<.11);assert.equal(g.blocked(h.x,h.y,h.radius),false);g.step(1/120);assert.ok(h.alive&&h.hp===1&&!inWell(h,1));
});
test('ordinary champions still take lethal fountain attacks',()=>{
 const{g,p}=arena(),z=FOUNTAIN_AREAS[1];Object.assign(p,{x:z.x+1,y:z.y+z.h/2,hp:500});Fountain.tick(g,p,.5);assert.equal(p.alive,false);
});
test('current codex explains Alisa preserved timers and Gubo departure-based haste',()=>{
 assert.match(skillReference('alisa',3).details,/크립|맥동/);assert.match(skillReference('alisa',3).details,/부활소를 처음 나간/);assert.match(skillReference('gubo',0).details,/부활소를 처음 나간/);
});
test('mobile skill descriptions offer complete short summaries and full details for normal and transformed forms',()=>{
 for(const key of['jamila','alisa','gubo','sora','yan']){const{g,p}=arena(key);for(const transformed of key==='sora'||key==='yan'?[false,true]:[false]){if(transformed)g.addBuff(p,key==='sora'?'soraEgo':'yanDistorted',20);for(let slot=0;slot<(transformed?3:4);slot++){const short=mobileSkillHelp(g,p,slot),long=mobileSkillHelp(g,p,slot,'details');assert.ok(short.text.length>15&&long.text.length>=short.text.length,`${key}/${transformed}/${slot}`);assert.equal(short.title,long.title);assert.equal(short.text,skillReference(key,slot,transformed).summary);}}}
});
test('each contextual attack target keeps its exact position for every visible subset and ordering',()=>{
 const kinds=['champion','minion','structure','creep'];for(const width of[667,844]){const rect={x:width-156,y:283,width:82,height:82},all=targetButtonPositions(rect,kinds);for(let mask=1;mask<16;mask++){const subset=kinds.filter((_,i)=>mask&(1<<i));for(const ordered of[subset,[...subset].reverse()])for(const p of targetButtonPositions(rect,ordered))assert.deepEqual(p,all.find(t=>t.kind===p.kind));}}
});
