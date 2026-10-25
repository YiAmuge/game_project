import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game,respawnTime } from '../src/game.js';
import { CHAMPIONS,RUNTIME_CHAMPIONS,RULES,WORLD,WALLS,FOUNTAINS,CORE_POSITIONS,lanePath,worldPoint } from '../src/data.js';
import * as A from '../src/augments.js';
import * as S from '../src/skills.js';
import * as H from '../src/hohenheim.js';
import * as T from '../src/training.js';
import { skillTargeting } from '../src/targeting.js';
import { distance } from '../src/geometry.js';
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let t=0;t<s-1e-8;t+=1/60)g.step(Math.min(1/60,s-t));};
function arena(key='faust'){
 const g=new Game(key,'top',{seed:250});g.units=[g.player];g.wave=100;g.map={bounds:{x:0,y:0,w:80,h:50},walls:[]};g.bounds=g.map.bounds;
 for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 const p=g.player;Object.assign(p,{x:20,y:20,lastAttackAt:100,lastDamageAt:100});
 const t=g.makeChampion('faust',1,10);Object.assign(t,{x:23,y:20,hp:100000,maxHp:100000,lastAttackAt:100,lastDamageAt:100});
 return {g,p,t};
}
test('all matches and training entries use 2.5D; each training session owns its geometry',()=>{
 const m=new Game(),a=new Game('faust','top',{mode:'training'}),b=new Game('faust','top',{mode:'training25d'});
 assert.ok(m.training25d&&!m.training);assert.ok(a.training25d&&b.training25d);assert.deepEqual(a.map,b.map);assert.notEqual(a.map.walls[0],b.map.walls[0]);
 a.time=1300;a.step(.1);assert.equal(a.winner,null);assert.equal(a.units.filter(e=>e.kind==='neutral').length,7);
});
test('champion role metadata, including Meursault protection/disruption, drives recommendations',()=>{
 assert.deepEqual(CHAMPIONS.meursault.roles,['보호','방해']);assert.equal(CHAMPIONS.meursault.recommendedPosition,'top');
 for(const c of Object.values(CHAMPIONS)){assert.ok(c.roles.length>=1&&c.roles.length<=2);assert.ok(['top','jungle','bottom','support'].includes(c.recommendedPosition));}
});
test('roles have no hidden speed, armor, CC duration, damage, reload or cooldown effects',()=>{
 const {g,p,t}=arena('gahwan'),c=CHAMPIONS.gahwan,roles=c.role;const snapshot=()=>[g.speed(p),g.armor(p),g.reloadInterval(p),g.haste(p),g.deal(p,t,100,{proc:false})];const initial=snapshot();
 try{for(const role of ['보호','지원','암살','돌격','저격','방해']){c.role=role;assert.deepEqual(snapshot(),initial);p.qCd=8;p.rCd=40;g.status(t,'slow',.2,2,p);close(p.qCd,8);close(p.rCd,40);assert.equal(g.buff(p,'disrupt'),false);g.status(p,'root',1,2,t);close(p.status.root.until-g.time,2);delete p.status.root;}}finally{c.role=roles;}
});
test('battlefield geometry, structures and lanes share the horizontal coordinate scale',()=>{
 const g=new Game();close(RULES.width,70.72);close(WORLD.w,87.72);close(WALLS[0].w,5.61);close(WORLD.h,62.8);
 for(const team of [0,1]){const towers=g.towers(team);assert.ok(towers.every(t=>t.maxHp===5000));close(towers[0].x,worldPoint(team?46:18,0).x+(team?-5:5));assert.equal(g.units.find(e=>e.kind==='core'&&e.team===team).maxHp,6000);}
 for(const team of [0,1])for(const lane of [0,1]){const path=lanePath(team,lane);assert.deepEqual(path[0],CORE_POSITIONS[team]);for(let i=1;i<path.length;i++)assert.ok(g.clearLine(path[i-1],path[i],1.1));assert.ok(path.slice(1).reduce((sum,p,i)=>sum+distance(path[i],p),0)<82);}
 assert.ok(FOUNTAINS.every(p=>!g.blocked(p.x,p.y,.48)));
});
test('core shield requires low health and ten quiet seconds; one surviving tower does not halve damage',()=>{
 const {g,p}=arena();const core=g.entity({kind:'core',team:1,x:25,y:20,maxHp:10000,range:9,radius:1.3,lastDamageAt:0});g.entity({kind:'minion',team:0,x:25,y:22,maxHp:1000});const tower=g.entity({kind:'tower',team:1,x:50,y:40,maxHp:100});
 run(g,10.1);close(g.shield(core),0);core.hp=3499;g.step(.01);close(g.shield(core),1500);const before=g.shield(core);g.deal(p,core,100,{fixed:true});close(before-g.shield(core),100);tower.alive=false;const before2=g.shield(core);g.deal(p,core,100,{fixed:true});close(before2-g.shield(core),100);
});
test('respawn growth has a six-second floor and twenty-three-second cap',()=>{close(respawnTime(0,1),6);close(respawnTime(120,3),Math.ceil(6+1.356*(1.6+2.4)));close(respawnTime(1200,10),23);});
test('four augments are allowed, with two from any one category',()=>{
 const {g,p}=arena();p.alive=false;p.gold=10000;Object.assign(p.upgrades,{power:3,health:3,speed:3});
 for(const key of ['power15','range7','blackOrb','forceBattery'])assert.ok(g.buyAugment(p,key));assert.equal(g.buyAugment(p,'finalBullet'),false);assert.ok(g.sellAugment(p,'power15'));assert.equal(g.buyAugment(p,'resentment'),false);assert.ok(g.buyAugment(p,'finalBullet'));assert.equal(p.augments.length,4);
 assert.ok(A.AUGMENTS.every(a=>!['armorHealth','emergencyHeal','health15','reloadRetaliation'].includes(a.key)));
});
test('range augment adds flat range, and dash distance independently gains one',()=>{
 for(const key of ['faust','don','rodya','myo','starbuck','gregor']){const {g,p,t}=arena(key);if(key==='gregor')g.addBuff(p,'mutant',10);const range=g.attackRange(p);p.augments=['range7'];close(g.attackRange(p)-range,S.dashBasic(g,p)?1:2.5);if(S.dashBasic(g,p)){g.attack(p,t);assert.ok(p.motion);const baseline={don:2,rodya:2.4,myo:2.4,starbuck:2.875,gregor:2.5}[key];close(p.motion.total,baseline+1);}}
});
test('resentment changes power, armor and reload in real time with current health',()=>{
 const {g,p}=arena();const power=g.powerScale(p),reload=g.reloadInterval(p);p.augments=['resentment'];p.hp=p.maxHp*.51;close(A.resentment(p),.2);close(g.powerScale(p),power*1.2);close(g.armor(p),20);close(g.reloadInterval(p),reload/1.2);p.hp=1;close(A.resentment(p),.4);p.hp=p.maxHp;close(g.powerScale(p),power);
});
test('K ampule stops a fatal hit, purges crowd control and returns on its cooldown',()=>{
 const {g,p,t}=arena();p.augments=['kAmpule'];g.status(p,'root',1,10,t);g.status(p,'captured',1,10,t);p.hp=100;g.deal(t,p,1000,{fixed:true});assert.ok(p.alive);close(p.hp,p.maxHp*.5);close(g.stat(p,'root'),0);close(g.stat(p,'captured'),0);close(p.state.ampuleReady,60);g.status(p,'stun',1,2,t);close(g.stat(p,'stun'),0);g.time=60;p.hp=1;g.deal(t,p,100,{fixed:true});assert.ok(p.alive);close(p.state.ampuleReady,120);
});
test('battery charges after two seconds without incoming damage and caps at thirty percent',()=>{
 const {g,p}=arena();p.augments=['forceBattery'];p.lastDamageAt=0;p.lastAttackAt=100;g.time=1.99;A.tick(g,p,.1);close(g.shield(p),0);g.time=2;A.tick(g,p,1);close(g.shield(p),p.maxHp*.13);A.tick(g,p,3);close(g.shield(p),p.maxHp*.3);close(g.haste(p),.1);
});
test('martan uses final health damage and its seven-second shared cooldown',()=>{
 const {g,p,t}=arena();p.augments=['finalBullet'];g.addShield(t,50,'test',3);const before=t.hp,actual=g.deal(p,t,1000);close(before-t.hp,actual*1.07);const hp=t.hp;g.deal(p,t,1000);close(hp-t.hp,actual+50);close(p.state.augBulletReady,7);
});
test('reload stacks cap at five, refresh on hit and expire one at a time',()=>{
 const {g,p,t}=arena();p.augments=['reloadStacks'];for(let i=0;i<6;i++)g.deal(p,t,1);assert.equal(p.state.augReloadStacks,5);g.time=2;g.deal(p,t,1);close(p.state.augReloadDecay,5);g.time=4.99;A.tick(g,p);assert.equal(p.state.augReloadStacks,5);g.time=5;A.tick(g,p);assert.equal(p.state.augReloadStacks,4);
});
test('dash basic width hits a target inside the widened side corridor only once',()=>{
 const {g,p,t}=arena('don');Object.assign(t,{x:21,y:21.3,radius:.48});const hp=t.hp;g.attack(p,{x:25,y:20});run(g,.4);assert.ok(t.hp<hp);assert.ok(t.hp>hp-500);assert.ok(distance(p,t)>=p.radius+t.radius);
});
test('Yi teleports at most 6.4 and shields allies without granting passive healing',()=>{
 const {g,p,t}=arena('yi'),ally=g.makeChampion('meursault',0,10);Object.assign(ally,{x:26,y:21});ally.hp-=1000;ally.lastDamageAt=100;g.cast(p,'r',{x:40,y:20});assert.ok(p.x<=26.4&&p.x>25);assert.ok(g.shield(ally)>0);p.passiveReady=0;g.deal(p,t,1,{fixed:true});const hp=ally.hp;run(g,1);close(ally.hp,hp);assert.ok(g.passiveCooldown(p)>0);
});
test('Gahwan first ultimate hit slows instead of stunning',()=>{const {g,p,t}=arena('gahwan');g.cast(p,'r',t);close(g.stat(t,'stun'),0);close(g.stat(t,'slow'),.5);run(g,1.6);assert.ok(t.hp<100000);});
test('Heathcliff leaps over a wall and lands outside blocked geometry',()=>{
 const {g,p}=arena('heathcliff');g.map.walls=[{x:22,y:17,w:1,h:6}];g.cast(p,'q',{x:27,y:20});run(g,1.5);assert.ok(S.releaseHeath(g,p,{x:27,y:20}));assert.equal(p.motion.kind,'leap');close(p.motion.arcHeight,3);run(g,.9);assert.ok(p.x>23&&!g.blocked(p.x,p.y,p.radius));
});
test('Dongrang crosses terrain with healing-scaled leap damage and stable duration',()=>{
 const {g,p,t}=arena('dongrang');g.map.walls=[{x:22,y:17,w:1,h:6}];Object.assign(t,{x:28.5,y:21});p.totalHealingReceived=4500;g.cast(p,'r',{x:28.5,y:20});assert.equal(p.motion.kind,'leap');close(p.motion.total,8.5);close(p.motion.minDuration,8.5/8);run(g,1.1);assert.ok(p.x>23);assert.ok(t.hp<100000);close(g.stat(t,'root'),1);
});
test('Alisa has 2400 base HP, 100 basic damage and mutually exclusive fixed burns',()=>{
 const {g,p,t}=arena('alisa');close(p.maxHp,2400);const hp=t.hp;g.attack(p,t);close(hp-t.hp,100*1.1*RULES.power[CHAMPIONS.alisa.power]*.9);let before=t.hp;run(g,2.1);close(before-t.hp,100);S.applyBurn(g,p,t,true);S.applyBurn(g,p,t);assert.ok(t.burn.explosion);before=t.hp;run(g,3);close(before-t.hp,10*(15+p.maxHp*.015));assert.equal(t.burn,undefined);
});
test('Alisa Q permits attacking while reloading and R channels at half movement then dashes',()=>{
 const {g,p}=arena('alisa');g.addBuff(p,'alisaReload',5);p.state.alisaReloadActive=true;p.attackCd=1;assert.equal(g.reloadPaused(p),false);delete p.buffs.alisaReload;p.state.alisaReloadActive=false;p.state.heat=5;p.attackCd=0;const speed=g.speed(p);g.input.x=1;g.input.aim={x:30,y:20};assert.ok(g.cast(p,'r',p));close(g.speed(p),speed*.5);assert.equal(g.attack(p,{x:30,y:20}),false);run(g,.4);assert.ok(p.x>20);run(g,.42);assert.equal(p.motion?.kind,'dash');run(g,.4);assert.ok(p.state.detonating);run(g,2.1);assert.equal(p.alive,false);
});
test('Gregor transforms with ammo and Q reset and gains at most fifteen extra plague seconds',()=>{
 const {g,p,t}=arena('gregor');p.ammo=0;p.qCd=8;S.gregorStack(g,p,12);close(p.ammo,2);close(p.qCd,0);close(skillTargeting(g,p,'q').range,8.5);p.lastAttackAt=100;run(g,8);assert.ok(g.buff(p,'mutant'));assert.equal(p.state.mutantExtension,15);assert.ok(p.buffs.mutant<=20+1e-6);p.attackCd=0;g.attack(p,{x:30,y:20});close(p.motion.total,2.5);assert.equal(g.buff(p,'mutantStride'),false);
});
test('Rudolph ultimate requires half SP, clamps to 10.5 and uses fast recovery',()=>{
 const {g,p,t}=arena('rudolph');p.ammo=49;assert.equal(g.cast(p,'r',t),false);p.ammo=50;assert.ok(g.cast(p,'r',{x:50,y:20}));close(g.pending[0].x,30.5);close(g.pending[0].damage,425);run(g,.6);close(p.state.exhaustedUntil-p.state.exhaustedAt,1.25);run(g,.7);close(p.ammo,100);p.rCd=0;p.ammo=0;delete p.state.exhaustedUntil;g.step(.01);close(p.state.recoveryDuration,2.5);
});
test('Rodya applies all three fifty-percent debuffs only on each champion first ice hit',()=>{
 const {g,p,t}=arena('rodya');const z={kind:'ice',source:p,x:t.x,y:t.y,r:4.725,until:10,nextTick:0,tickEvery:.5,damage:50,weak:.5,slow:.5,reloadWeak:.5,firstDebuffOnly:true,debuffDuration:1.3,championsOnly:true};g.zones=[z];g.updateDelayed(0);for(const key of ['weak','slow','reloadWeak'])close(g.stat(t,key),.5);run(g,1.4);for(const key of ['weak','slow','reloadWeak'])close(g.stat(t,key),0);const hp=t.hp;run(g,.6);assert.ok(t.hp<hp);
});
test('Starbuck rises and lands after .7 seconds; Sinclair uses a fast low dash',()=>{
 const a=arena('starbuck');a.g.cast(a.p,'r',{x:27,y:20});assert.equal(a.p.motion.kind,'leap');close(a.p.motion.arcHeight,5);run(a.g,.35);assert.ok(a.p.x>20&&a.p.x<27);assert.ok(a.g.hidden(a.p));run(a.g,.36);assert.equal(a.g.hidden(a.p),false);
 const b=arena('sinclair');b.g.cast(b.p,'r',{x:26,y:20});assert.equal(b.p.motion.kind,'dash');close(b.p.motion.speed,24);run(b.g,.3);assert.equal(b.p.motion,undefined);
});
test('Hohenheim expands 4 to 7.5 and deals seven ticks and three bursts to champions and creeps',()=>{
 const {g,p,t}=arena('hohenheim');const seen=[];const deal=g.deal.bind(g);g.deal=(source,target,base,opts)=>{if(source===p&&target===t)seen.push(base);return deal(source,target,base,opts);};g.cast(p,'r',t);const z=H.activeZone(g,p);close(z.r,4);run(g,.875);close(z.r,5.75);run(g,1.2);assert.deepEqual(seen,[15,15,15,15,15,15,15,150,150,150]);assert.ok(g.stat(t,'stun'));assert.equal(g.cast(p,'r',t),false);
});
test('Yan basic produces a slash effect and passive slot reports source cooldowns',()=>{
 const {g,p,t}=arena('yan');g.attack(p,t);// Charge is released explicitly.
 return import('../src/yan.js').then(Y=>{Y.release(g,p,t);assert.ok(g.effects.some(e=>e.type==='yanCleave'));assert.ok(!g.effects.some(e=>e.type==='yanSword'));});
});
test('current descriptions are shared by tooltips and codex, including Meursault roles',()=>{
 const roster=JSON.parse(readFileSync(new URL('../src/roster.json',import.meta.url)));
 for(const c of Object.values(RUNTIME_CHAMPIONS)){const rec=roster.find(r=>r.id===c.id);for(const [i,key] of ['passiveText','basicText','qText','rText'].entries()){assert.equal(c[key],rec.skills[i].description);assert.ok(c[key].length>20);assert.ok(!/기존|이전 버전|v0\./.test(c[key]));}}
 assert.equal(roster.find(c=>c.name==='뫼르소').role,'보호 · 방해');assert.ok(!A.AUGMENTS.find(a=>a.key==='magazine2').text.includes('루돌프'));
});

test('selling the battery removes its shield in matches and training sell-all',()=>{
 const {g,p}=arena();p.augments=['forceBattery'];p.alive=false;g.addShield(p,500,`battery-${p.id}`,Infinity);assert.ok(g.sellAugment(p,'forceBattery'));close(g.shield(p),0);
 const training=new Game('faust','top',{mode:'training'}),hero=training.player;hero.augments=['forceBattery'];training.addShield(hero,500,`battery-${hero.id}`,Infinity);T.sellAll(training);close(training.shield(hero),0);
});
test('Rudolph exhaustion and Dongbaek petal recharge are visible passive cooldowns',()=>{
 const {g,p}=arena('rudolph');p.state.exhaustedUntil=2.5;close(g.passiveCooldown(p),2.5);const flower=arena('dongbaek');close(flower.g.passiveCooldown(flower.p),0);flower.p.state.petalReady=10;close(flower.g.passiveCooldown(flower.p),10);
});
