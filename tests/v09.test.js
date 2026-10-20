import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { CHAMPIONS, POSITIONS, RULES, MAP_CENTER, lanePath } from '../src/data.js';
import { distance, blocked } from '../src/geometry.js';
import { mentalWhip } from '../src/skills.js';
import { BOSS_RULES } from '../src/boss-patterns.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*60);i++)g.step(1/60);};
function quiet(key='faust'){
 const g=new Game(key,'bottom',{seed:123});for(const fn of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[fn]=()=>{};
 const p=g.player,t=g.makeChampion('faust',1,8);Object.assign(p,{x:40,y:7});Object.assign(t,{x:43,y:7,hp:100000,maxHp:100000});g.units=[p,t];g.minionQueue=[];return {g,p,t};
}
function bossFight(){const {g,p,t}=quiet();g.units=[p];const boss=g.makeNeutral(40,7,'boss');g.aiNeutral=Game.prototype.aiNeutral;p.x=43.2;g.deal(p,boss,1,{fixed:true});return{g,p,t,boss};}
test('Dongbaek petals recover as a full batch every ten seconds and real ammo does not reset them',()=>{
 const {g,p,t}=quiet('dongbaek');for(let i=0;i<3;i++){p.ammo=0;p.attackCd=0;assert.ok(g.attack(p,t));}assert.equal(p.state.petals,0);close(p.qCd,7.5);close(p.rCd,7.5);close(p.status.disarm.until,2.85);p.ammo=3;run(g,2.8);assert.equal(p.state.petals,0);p.attackCd=0;assert.equal(g.attack(p,t),false);run(g,.1);assert.ok(g.attack(p,t));run(g,7.2);assert.equal(p.state.petals,3);assert.equal(p.state.petalReady,Infinity);
});

test('Dongbaek base damage is 165, and existing consecutive-hit damage scaling remains',()=>{
 const {g,p,t}=quiet('dongbaek');const hp=t.hp;g.attack(p,t);close(hp-t.hp,165*.9);p.attackCd=0;const before=t.hp;g.attack(p,t);close(before-t.hp,165*1.12*.9);
});
test('Nelly marks deal exactly seven percent max HP fixed damage and Q has two independent charges',()=>{
 const {g,p,t}=quiet('nelly');t.x=41;t.armor=999;g.attack(p,t);const hp=t.hp;p.attackCd=0;g.attack(p,t);const basic=210*1.12*.9*100/1099;close(hp-t.hp,7000+basic);assert.equal(p.state.knifeCharges,2);assert.ok(g.cast(p,'q',t));assert.ok(g.cast(p,'q',t));assert.equal(p.state.knifeCharges,0);assert.equal(g.cast(p,'q',t),false);g.time=5.01;g.step(.01);assert.equal(p.state.knifeCharges,1);
});
test('Rodya attack radius grows twenty percent; coin probability changes at levels five and ten',()=>{
 const {g,p,t}=quiet('rodya');close(g.attackRange(p),2.4);for(const [level,heads]of [[1,0],[4,0],[5,3],[9,3],[10,3]]){p.level=level;p.qCd=0;g.random=()=>.55;g.cast(p,'q',p);assert.equal(p.state.coinHeads,heads);close(p.state.coinChance,.5+Math.floor(level/5)*.1);}p.level=10;p.qCd=0;g.random=()=>.69;g.cast(p,'q',p);assert.equal(p.state.coinHeads,3);p.qCd=0;g.random=()=>.71;g.cast(p,'q',p);assert.equal(p.state.coinHeads,0);
});
test('Rodya ice ticks fifty every half second and continuously weakens enemy champion power thirty percent',()=>{
 const {g,p,t}=quiet('rodya');t.x=46;g.cast(p,'r',{x:48,y:7});run(g,.3);const z=g.zones.find(z=>z.kind==='ice');assert.ok(z);close(z.damage,50);close(z.tickEvery,.5);const hp=t.hp;run(g,.5);close(hp-t.hp,50*.91*.9);close(g.powerWeak(t),.3);const baseline=g.deal(t,p,100);delete t.status.weak;const without=g.deal(t,p,100);close(baseline/without,.7);t.y=13;run(g,.8);assert.equal(g.powerWeak(t),0);
});
test('Alisa Q gains three heat after its dash, grants reload thirty percent and can recast to heal without dashing',()=>{
 const {g,p,t}=quiet('alisa');p.hp=p.maxHp/2;p.state.heat=1;const reload=g.reloadInterval(p);assert.ok(g.cast(p,'q',{x:48,y:7}));assert.equal(p.state.heat,1);run(g,.4);assert.equal(p.state.heat,4);assert.ok(g.buff(p,'alisaReload'));close(g.reloadInterval(p),reload/1.3);g.status(p,'captured',1,2);const x=p.x,hp=p.hp;assert.ok(g.cast(p,'q',p));assert.equal(p.motion,undefined);close(p.x,x);assert.equal(p.state.heat,0);close(p.hp-hp,p.maxHp*.19);assert.equal(g.buff(p,'alisaReload'),false);assert.equal(g.cast(p,'q',t),false);
});
test('Alisa Q expiration consumes current heat and heals five plus 3.5 percent per stack, exactly once',()=>{
 const {g,p,t}=quiet('alisa');p.hp=p.maxHp*.3;g.cast(p,'q',{x:48,y:7});run(g,.4);p.state.heat=5;p.lastDamageAt=10;const until=p.buffs.alisaReload;g.time=until-.01;const hp=p.hp;g.step(.02);assert.equal(p.state.heat,0);close(p.hp-hp,p.maxHp*.225);const after=p.hp;g.step(.02);close(p.hp,after);assert.equal(p.state.alisaReloadActive,undefined);
});
test('Alisa ultimate detonates automatically at full HP after focus and two-second countdown, without external damage',()=>{
 const {g,p,t}=quiet('alisa');p.state.heat=5;p.lastAttackAt=0;t.x=43;const hp=t.hp;assert.ok(g.cast(p,'r',p));run(g,.75);assert.ok(!p.state.detonating);run(g,.1);assert.ok(p.state.detonating&&p.hp>p.maxHp*.9);g.status(p,'stun',1,1);assert.equal(g.stat(p,'stun'),0);run(g,1.9);assert.ok(p.alive);run(g,.1);assert.equal(p.alive,false);assert.ok(t.hp<hp);assert.ok(t.burn);close(p.respawnAt-g.time,3,.1);
});
test('Alisa taking lethal damage during ultimate focus cannot schedule two explosions or deaths',()=>{
 const {g,p,t}=quiet('alisa');p.state.heat=5;g.cast(p,'r',p);g.deal(t,p,999999,{fixed:true});run(g,2.9);assert.equal(p.deaths,1);assert.equal(g.corpses.filter(c=>c.key==='alisa').length,1);
});
test('Marton attack range is reduced to 4.9 without changing its ground effect radius',()=>{
 const {g,p,t}=quiet('marton');close(g.attackRange(p),4.9);t.x=47.7;g.attack(p,{x:50,y:7});close(t.hp,100000);p.attackCd=0;t.x=46.7;g.attack(p,{x:50,y:7});assert.ok(t.hp<100000);
});
test('Myo frenzy reloads during basic attacks, grants sixty percent reload and removes boosted dash length',()=>{
 const {g,p,t}=quiet('myo');const reload=g.reloadInterval(p);g.cast(p,'r',p);close(g.reloadInterval(p),reload/1.6);close(g.attackRange(p),2.4);g.attack(p,t);close(p.motion.total,2.4);assert.equal(p.motion.actionKind,'basic');p.ammo=0;p.reloadProgress=0;g.input.fire=true;run(g,.15);assert.ok(p.reloadProgress>0);
});
test('Myo fifty percent reduction applies only during an active frenzy basic dash',()=>{
 const {g,p,t}=quiet('myo');const plain=g.deal(t,p,100);g.cast(p,'r',p);g.attack(p,{x:47,y:7});close(g.deal(t,p,100)/plain,.5);run(g,.4);close(g.deal(t,p,100),plain);p.attackCd=0;g.attack(p,t);delete p.buffs.rabbitFrenzy;close(g.deal(t,p,100),plain);
});
test('Rudolph vulnerability loses one stack per two seconds and every basic hit refreshes the next decay',()=>{
 const {g,p,t}=quiet('rudolph');for(let i=0;i<15;i++){g.time+=.1;mentalWhip(g,p,t);}const m=t.state.mentalWhip[p.id];assert.equal(m.stage,3);g.time=m.at+1.99;g.step(.001);assert.equal(m.stage,3);g.time=m.at+2.01;g.step(.001);assert.equal(m.stage,2);mentalWhip(g,p,t);const next=m.decayAt;g.time=next-.01;g.step(.001);assert.equal(m.stage,2);g.time=next+.01;g.step(.001);assert.equal(m.stage,1);g.time=next+2.01;g.step(.001);assert.equal(m.stage,0);
});
test('Rudolph direct hits expire stale stacks before calculating whip damage, then refresh their timer',()=>{
 const {g,p,t}=quiet('rudolph');t.state.mentalWhip={[p.id]:{stage:3,hits:0,at:0,decayAt:2}};g.time=4.01;const hp=t.hp;g.attack(p,t);close(hp-t.hp,48*1.1*.91*.9);close(t.state.mentalWhip[p.id].decayAt,6.01);
});
test('Rudolph can damage minions, creeps and towers without champion-only debuff state',()=>{
 for(const kind of ['minion','neutral','tower']){const {g,p}=quiet('rudolph');g.units=[p];const t=g.entity({kind,team:kind==='neutral'?2:1,x:43,y:7,maxHp:10000,radius:.5,range:8.5});assert.equal(t.state,undefined);assert.ok(g.attack(p,t));assert.ok(t.hp<t.maxHp,kind);assert.equal(t.state,undefined);}
});
test('position recommendations and seedable drafts cover varied champions without same-team duplicates',()=>{
 assert.deepEqual(POSITIONS.top.recommend,['보호','돌격']);assert.deepEqual(POSITIONS.jungle.recommend,['암살','돌격']);assert.deepEqual(POSITIONS.bottom.recommend,['저격','방해']);assert.deepEqual(POSITIONS.support.recommend,['지원','방해']);const keys=new Set();
 for(let seed=1;seed<=100;seed++){const g=new Game('faust','bottom',{seed});for(const team of [0,1]){const cs=g.champions(team);assert.equal(new Set(cs.map(c=>c.key)).size,4);for(const c of cs.filter(c=>!c.player)){assert.ok(POSITIONS[c.position].recommend.includes(CHAMPIONS[c.key].role));keys.add(c.key);}}}assert.equal(keys.size,27);assert.deepEqual(new Game('don','top',{seed:42}).champions().map(e=>e.key),new Game('don','top',{seed:42}).champions().map(e=>e.key));
});
test('minions pass an allied tower with visible clearance instead of pushing into its center',()=>{
 const {g,p}=quiet();g.units=[];g.aiMinion=Game.prototype.aiMinion;const tower=g.entity({kind:'tower',team:0,x:44,y:7.15,maxHp:1000,radius:.9});const m=g.entity({kind:'minion',team:0,x:40,y:7.15,maxHp:1000,radius:.28,waypoint:2,lane:0,range:1.2,damage:58,interval:1,wave:1,formationIndex:0,path:[],pathAt:0});let detour=0;for(let i=0;i<360;i++){g.step(1/60);detour=Math.max(detour,Math.abs(m.y-7.15));assert.ok(distance(m,tower)>=m.radius+tower.radius-.01);assert.ok(!blocked(m.x,m.y,m.radius));}assert.ok(m.x>49&&detour>1.1);
});
test('bot champions pass a stationary allied champion blocking their desired path',()=>{
 const {g,p,t}=quiet();t.team=0;t.x=43;t.y=7;for(let i=0;i<300;i++){g.moveToward(p,{x:50,y:7},1/60);g.time+=1/60;}assert.ok(p.x>48);assert.ok(distance(p,t)>=p.radius+t.radius);
});
test('supports keep a formation offset from their lane partner and can still attack an enemy in range',()=>{
 const {g,p,t}=quiet('yi');p.position='support';p.player=false;g.aiChampion=Game.prototype.aiChampion;const a=g.makeChampion('outis',0,5,'bottom');Object.assign(a,{x:41,y:7});t.x=44;const hp=t.hp;for(let i=0;i<90;i++){g.aiChampion(p,1/60);g.time+=1/60;p.attackCd=0;g.updateProjectiles(1/60);}assert.ok(distance(p,a)>2.3);assert.ok(t.hp<hp);
});
test('all healthy bot positions choose the boss only while living allies outnumber enemies',()=>{
 for(const position of ['top','jungle','bottom','support']){const g=new Game('faust',position,{seed:3});g.spawnBoss();g.champions(1)[0].alive=false;const bot=g.champions(0).find(c=>!c.player);bot.position=position;bot.x=30;bot.y=23.4;g.aiChampion(bot,.1);assert.equal(bot.objective,'boss');g.champions(1)[0].alive=true;g.aiChampion(bot,.1);assert.notEqual(bot.objective,'boss');}
});
test('boss stats are reduced and spawn stays fixed under AI, unit collisions and knockback attempts',()=>{
 const {g,p,boss}=bossFight();close(boss.maxHp,9750);close(boss.damage,297.5);assert.equal(g.startMotion(boss,{x:1,y:0},2,{kind:'knock'}),false);const home={...boss.home};p.x=44;run(g,4);close(distance(boss,home),0);assert.ok(!boss.motion);
});
test('boss basic hits a narrow area around its target instead of only one unit',()=>{
 const {g,p,boss}=bossFight();p.x=42;const nearby=g.makeChampion('faust',1,8);Object.assign(nearby,{x:42.4,y:7.7});const far=g.makeChampion('faust',0,9);Object.assign(far,{x:43.8,y:7});const hp=nearby.hp,farhp=far.hp;g.aiNeutral(boss,.01);assert.ok(p.hp<p.maxHp&&nearby.hp<hp);close(far.hp,farhp);
});
test('boss locks shockwave direction at five seconds, channels 1.15 seconds then fires a traveling knockback projectile',()=>{
 const {g,p,boss}=bossFight();p.maxHp=p.hp=100000;p.lastDamageAt=100;run(g,4.95);assert.ok(!boss.bossPattern);run(g,.1);const pattern=boss.bossPattern;assert.ok(pattern);close(pattern.at-pattern.startedAt,1.15);p.y=9;run(g,1);assert.equal(g.projectiles.length,0);run(g,.2);assert.ok(g.projectiles.some(b=>b.theme==='boss'));assert.equal(boss.bossPattern,undefined);p.y=7;run(g,.5);assert.ok(p.motion?.forced||p.x>43.2);close(distance(boss,boss.home),0);
});
test('boss creates one ground warning per nearby champion, explodes at 2.15 seconds and roots for .8 seconds',()=>{
 const {g,p,boss}=bossFight();p.x=43;p.maxHp=p.hp=100000;p.lastDamageAt=100;const ally=g.makeChampion('faust',0,8);Object.assign(ally,{x:41,y:11});const enemy=g.makeChampion('faust',1,9);Object.assign(enemy,{x:38,y:7});const far=g.makeChampion('faust',1,10);Object.assign(far,{x:55,y:7});run(g,7.05);assert.equal(boss.bossMarkers.length,3);const marks=boss.bossMarkers.map(m=>({...m}));ally.x=48;const hp=enemy.hp;run(g,2);close(enemy.hp,hp);run(g,.2);assert.equal(boss.bossMarkers.length,0);assert.ok(enemy.hp<hp);assert.ok(g.stat(enemy,'root'));close(enemy.status.root.until-(marks[0].at),.8,.04);assert.equal(g.stat(ally,'root'),0);assert.equal(g.stat(far,'root'),0);
});
test('boss death cancels pending telegraphs so a dead boss cannot create ground hits',()=>{
 const {g,p,boss}=bossFight();p.maxHp=p.hp=100000;run(g,7.1);assert.ok(boss.bossMarkers.length);g.kill(boss,p);const hp=p.hp;run(g,2.2);assert.equal(boss.bossMarkers.length,0);close(p.hp,hp);
});
test('buff creep exposure remains for two seconds after its attack but interrupts do not create it',()=>{
 for(const camp of ['amplify','blessing']){const {g,p}=quiet();g.units=[p];const c=g.makeNeutral(40,7,camp);p.x=43;g.aiNeutral=Game.prototype.aiNeutral;g.deal(p,c,1,{fixed:true});run(g,4.2);assert.ok(c.exposedUntil>g.time&&!c.pattern);const hp=c.hp;g.deal(p,c,100,{fixed:true});close(hp-c.hp,120);g.time=c.exposedUntil+.01;const before=c.hp;g.deal(p,c,100,{fixed:true});close(before-c.hp,100);}
});
test('steering beside a wall with only a body behind it returns a finite direction without an avoidance record',async()=>{
 const {steer}=await import('../src/navigation.js');const {g,p,t}=quiet();Object.assign(p,{x:16.8,y:15});Object.assign(t,{team:0,x:15.5,y:15});delete p.avoidance;const d=steer(g,p,{x:20,y:15},.1);assert.ok(Number.isFinite(d.x)&&Number.isFinite(d.y));
});
test('a newly created boss ground warning never draws a negative radius from floating-point timing',async()=>{
 const {draw}=await import('../src/boss-patterns.js');const radii=[];const r={ctx:{save(){},restore(){}},circle(x,y,radius){assert.ok(Number.isFinite(radius)&&radius>=0);radii.push(radius);},text(){}};
 draw(r,{alive:true,bossMarkers:[{visible:true,x:0,y:0,r:1.25,startedAt:7,at:9.15}]},{time:7});assert.equal(radii.length,2);assert.ok(radii[1]>=0);
});
