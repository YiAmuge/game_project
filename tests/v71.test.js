import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{Game,damageFormula}from'../src/game.js';
import{CHAMPIONS}from'../src/data.js';
import*as A from'../src/augments.js';
import*as Yan from'../src/yan.js';
import*as Hohenheim from'../src/hohenheim.js';
import*as Jamila from'../src/jamila.js';
import{mourningButterflies,antimatterParticles,AUGMENT_FX}from'../src/augment-effects.js';
import{mobileStatusEntries}from'../src/mobile-status.js';
import{skillReference}from'../src/skill-reference.js';
import{paintHealth}from'../src/health-display.js';
import{decodePNG}from'../tools/png.mjs';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`),run=(g,s)=>{for(let n=0;n<Math.round(s*120);n++)g.step(1/120);};
function arena(key='yan'){
 const g=new Game(key,'bottom',{mode:'training',seed:71}),p=g.player;g.units=[p];g.pending=[];g.projectiles=[];g.effects=[];g.events=[];g.zones=[];g.practice.pauseXp=true;g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,lastAttackAt:999,lastDamageAt:999});return{g,p};
}
function foe(g,x=43){const t=g.makeChampion('faust',1,g.nextId+20);Object.assign(t,{x,y:25,hp:100000,maxHp:100000,armor:0,lastAttackAt:999,lastDamageAt:999});return t;}
test('health bars have no ticks and separate current health from delayed damage with one screen-pixel black line',()=>{
 const e={alive:true,hp:1000,maxHp:1000},g={time:0,shield:()=>0},lines=[],c={fillRect(){},save(){},restore(){},beginPath(){},moveTo(x,y){lines.push([x,y]);},lineTo(x,y){lines.push([x,y]);},stroke(){},getTransform:()=>({a:2,b:0})};
 paintHealth(c,e,g,0,0,100,8,'green');assert.deepEqual(lines,[]);e.hp=600;g.time=.05;paintHealth(c,e,g,0,0,100,8,'green');assert.deepEqual(lines,[[60,0],[60,8]]);near(c.lineWidth,.5);assert.equal(c.strokeStyle,'#000');
});
test('range bag grants 1.3 to every area/piercing basic and 2.5 to single projectiles, including Faust level ten',()=>{
 for(const key of Object.keys(CHAMPIONS)){const{g,p}=arena(key),before=g.attackRange(p);p.augments=['range7'];near(g.attackRange(p)-before,['jamila','outis','ppui','faust'].includes(key)?2.5:1.3);}
 const{g,p}=arena('faust');p.augments=['range7'];p.level=10;near(A.rangeBonus(p),1.3);g.attack(p,{x:50,y:25});near(g.projectiles[0].remaining,p.range+1.3);assert.equal(g.projectiles[0].pierce,Infinity);
});
test('charged ranges and actual dash damage follow the adjusted area range',()=>{
 const h=arena('hohenheim');h.p.augments=['range7'];h.g.attack(h.p,{x:51,y:25});h.p.state.hohenCharge.progress=1.5;near(Hohenheim.chargeShape(h.g,h.p,{x:51,y:25}).range,10.3);
 const d=arena('don'),t=foe(d.g,43.65);d.p.augments=['range7'];d.g.attack(d.p,{x:50,y:25});near(d.p.motion.total,3.8);run(d.g,.5);assert.ok(t.hp<100000);
});
test('Yan alone buys Written Order for 250 without procedure prerequisites and refunds the discounted purchase proportionally',()=>{
 const{g,p}=arena();g.training=false;g.canUpgrade=()=>true;p.gold=249;assert.ok(A.unlockedItem(p,'writtenOrder'));assert.equal(g.buyAugment(p,'writtenOrder'),false);p.gold=250;assert.ok(g.buyAugment(p,'writtenOrder'));near(p.gold,0);assert.ok(p.augments.includes('writtenOrder'));assert.ok(g.sellAugment(p,'writtenOrder'));near(p.gold,175);
 const a=arena('faust');assert.equal(A.unlockedItem(a.p,'writtenOrder'),false);near(A.cost(a.p,'writtenOrder'),500);near(A.cost(p,'power15'),500);
});
test('transformation absorbs a held order, frees its slot/category and preserves existing stacks and shields',()=>{
 const{g,p}=arena();assert.ok(g.buyAugment(p,'writtenOrder'));p.state.orderStacks=Array(5).fill(5);g.addBuff(p,'writtenOrder',5);g.addShield(p,120,`order-ward-${p.id}`,5);p.state.ominous=6;assert.ok(g.cast(p,'r',p));assert.ok(A.absorbedOrder(p));assert.equal(A.usedSlots(p),0);assert.equal(A.categoryCount(p,'survival'),0);assert.ok(A.has(p,'writtenOrder'));near(A.liveStacks(g,p,'orderStacks').length,5);near(g.shield(p),120);assert.equal(g.buyAugment(p,'writtenOrder'),false);assert.equal(g.sellAugment(p,'writtenOrder'),false);
 const t=foe(g),hp=t.hp;g.deal(p,t,100);assert.ok(hp-t.hp>0);assert.ok(g.shield(p)>120);const status=mobileStatusEntries(g,p).find(s=>s.key==='writtenOrder'&&s.kind==='passive');assert.ok(status);assert.equal(status.label,'5/5');assert.equal(mobileStatusEntries(g,p).some(s=>s.kind==='augment'&&s.key==='writtenOrder'),false);
});
test('orders bought while already distorted absorb immediately and still work after expiry and death/respawn',()=>{
 const{g,p}=arena();p.state.ominous=6;g.cast(p,'r',p);assert.ok(g.buyAugment(p,'writtenOrder'));assert.equal(p.augments.length,0);assert.ok(p.absorbedOrder);run(g,20.01);assert.equal(Yan.distorted(g,p),false);assert.ok(A.has(p,'writtenOrder'));const t=foe(g);g.kill(p,t);g.time=p.respawnAt;g.step(.01);assert.ok(p.alive&&A.has(p,'writtenOrder'));p.state.orderStacks=Array(5).fill(g.time+5);p.shields=[];t.x=p.x+2;t.y=p.y;g.deal(p,t,100);assert.ok(g.shield(p)>0);const other=arena('faust');other.p.absorbedOrder=true;assert.equal(A.has(other.p,'writtenOrder'),false);
});
test('absorption does not waive shop location, currency, ordinary item slots or duplicate limits',()=>{
 const{g,p}=arena();g.training=false;g.canUpgrade=()=>false;p.gold=1000;assert.equal(g.buyAugment(p,'writtenOrder'),false);g.canUpgrade=()=>true;p.augments=Array(6).fill('magazine2');assert.equal(g.buyAugment(p,'writtenOrder'),false);p.augments=['kAmpule','resentment'];assert.equal(g.buyAugment(p,'writtenOrder'),false);
});
test('absorbed Written Order retains armor, conversion and a capped shield with its original five-second stacking window',()=>{
 const{g,p}=arena();p.absorbedOrder=true;const t=foe(g);for(let n=0;n<5;n++)g.deal(p,t,100);near(g.armor(p),(100+p.armor)*1.25-100);assert.ok(A.converts(g,p));for(let n=0;n<100;n++)g.deal(p,t,100);near(g.shield(p),500);run(g,5.01);near(g.armor(p),p.armor);assert.equal(A.converts(g,p),false);near(g.shield(p),0);assert.ok(A.has(p,'writtenOrder'));
});
test('mourning blinks at no more than five independently randomized positions/angles, with white and black variants only at full stacks',()=>{
 const{g,p}=arena('meursault');p.augments=['reloadStacks'];p.state.augReloadStacks=4;assert.deepEqual(mourningButterflies(g,p),[]);p.state.augReloadStacks=5;const a=mourningButterflies(g,p);assert.equal(a.length,5);assert.equal(new Set(a.map(p=>p.angle)).size,5);assert.deepEqual([...new Set(a.map(p=>p.frame))].sort(),['butterflyBlack','butterflyWhite']);for(const f of a)assert.ok(Math.hypot(f.x,f.y)<=AUGMENT_FX.butterflyRadius&&f.height>=.35&&f.height<=2.2&&f.alpha>=0&&f.alpha<=.9);g.time+=2;assert.notDeepEqual(mourningButterflies(g,p).map(f=>[f.x,f.y,f.angle]),a.map(f=>[f.x,f.y,f.angle]));p.alive=false;assert.equal(mourningButterflies(g,p).length,0);
});
test('antimatter motes stay inside the damage radius, remain small/subtle and use only blue/purple',()=>{
 const{g,p}=arena();assert.equal(antimatterParticles(g,p).length,0);p.augments=['antimatter'];for(let n=0;n<20;n++){g.time=n*.137;const list=antimatterParticles(g,p);assert.equal(list.length,24);for(const f of list){assert.ok(Math.hypot(f.x,f.y)<1.6);assert.ok(f.alpha<=.31&&f.size<.04);assert.ok(['#626dff','#ac6aff'].includes(f.color));}}const t=foe(g,41.5);g.time=0;run(g,.51);assert.ok(t.hp<100000);
});
test('butterfly effect atlas has transparent exterior in both colors and keeps the purple icon motif',async()=>{
 const im=decodePNG(await readFile(new URL('../src/assets/augment-effects-v71.png',import.meta.url)));assert.equal(im.width,384);assert.equal(im.height,128);let whites=0,dark=0,purple=0,solid=0;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const at=(y*384+x)*4,other=at+128*4;assert.equal(im.data[at+3],im.data[other+3]);if(im.data[at+3]){solid++;if(im.data[at]>180)whites++;if(im.data[other]<70)dark++;}if(!x||!y||x===127||y===127)assert.equal(im.data[at+3],0);const t=at+256*4;if(im.data[t+3]){purple++;assert.ok(im.data[t+2]>im.data[t+1]*1.3);}}
 assert.ok(solid>2000&&solid<11000&&whites>1000&&dark>1000&&purple>100);const manifest=JSON.parse(await readFile(new URL('../src/assets/augment-effects-v71.json',import.meta.url)));assert.equal(manifest.sources[0].file,'exec-b92365d1-fcbf-4457-8521-890991894a23.png');
});
test('Meursault basic summary omits root and Yan codex exposes his exclusive absorption purchase',()=>{
 const r=skillReference('meursault',1);assert.doesNotMatch(r.summary,/속박/);assert.match(r.summary,/감속/);assert.match(A.exclusiveAugments('yan')[0].text,/250.*흡수/);assert.match(A.augmentText({key:'yan'},A.AUGMENTS.find(a=>a.key==='writtenOrder')),/얀 전용/);assert.doesNotMatch(A.augmentText({key:'faust'},A.AUGMENTS.find(a=>a.key==='writtenOrder')),/흡수/);
});
test('Jamila has complete purpose-written summaries and the requested shield wording in both description modes',()=>{
 const passive=skillReference('jamila',0);for(const text of [passive.summary,passive.details]){assert.match(text,/보호막 보유 중엔/);assert.doesNotMatch(text,/보유량과 관계없이/);}
 assert.match(skillReference('jamila',1).summary,/50 피해.*네 번째 탄환.*보호막.*재장전/);assert.match(skillReference('jamila',2).summary,/225 피해.*탄환 6개/);const squad=skillReference('jamila',3);assert.match(squad.summarySections[0].text,/두 명.*전투력.*이동속도/);assert.match(squad.summarySections[1].text,/10초.*보호막/);for(let i=0;i<4;i++)assert.ok(skillReference('jamila',i).summary.length>30);
});
test('Jamila shield rounds alone gain ten base damage and actually hit for the increased amount',()=>{
 const{g,p}=arena('jamila'),t=foe(g,45);for(let shot=1;shot<=4;shot++){p.attackCd=0;g.attack(p,t);const projectile=g.projectiles.find(b=>b.source===p);assert.equal(projectile.damage,shot===4?60:50);const hp=t.hp;run(g,.2);near(hp-t.hp,(shot===4?60:50)*(1+(damageFormula(1,1,1)-1)*.55)*1.15);}
});
test('shield rounds still give both soldiers a fresh half shield when Jamila has reached her personal cap',()=>{
 const{g,p}=arena('jamila');g.cast(p,'r',p);g.addShield(p,p.maxHp*.075,`udjat-${p.id}`,3);const soldiers=Jamila.army(g,p);for(const u of soldiers)u.shields=[];const hp=g.shield(p);
 for(let n=1;n<=2;n++){p.ammo=1;p.attackCd=0;g.attack(p,{x:47,y:25});near(g.shield(p),hp);for(const u of soldiers){near(g.shield(u),p.maxHp*.0075*n);near(u.shields[0].until-g.time,3);}}
 for(const u of soldiers){u.ammo=0;Jamila.basic(g,u,{x:47,y:25},{x:1,y:0});assert.equal(g.projectiles.findLast(b=>b.source===u).damage,15);}
});
test('the full-total-shield exception also shares shield rounds without increasing the commander beyond the global cap',()=>{
 const{g,p}=arena('jamila');g.addShield(p,p.maxHp*.35,'full',10);g.cast(p,'r',p);p.ammo=1;g.attack(p,{x:47,y:25});near(g.shield(p),p.maxHp*.35);for(const u of Jamila.army(g,p))near(g.shield(u),p.maxHp*.0075);
});
