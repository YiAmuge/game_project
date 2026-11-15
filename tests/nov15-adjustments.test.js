import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,damageFormula} from '../src/game.js';
import * as Ego from '../src/ahab-ego.js';
import {guardAlly,coverMultiplier} from '../src/new-champions.js';
import {meiRushGlow} from '../src/mei-vfx.js';
import {gasharpoonRays,gasharpoonProjectileLength} from '../src/ahab-ego-vfx.js';
import {gasharpoonArmPose,weaponGeometry,meiFistPoses,spriteOrigin} from '../src/weapon-art.js';
import {championDescription,championForms} from '../src/champion-reference.js';
import {skillReference} from '../src/skill-reference.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function arena(key='mei'){
 const g=new Game(key,'top',{mode:'training',seed:1511}),p=g.player;g.units=[p];g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;
 Object.assign(g.practice,{lineStopped:true,pauseXp:true});Object.assign(p,{x:40,y:20,lastAttackAt:100,lastDamageAt:100,lastCombat:-99,facing:0});g.input.aim={x:50,y:20};for(const k of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};return{g,p};
}
const advance=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function unit(g,kind,x,team=1){if(kind==='champion'){const t=g.makeChampion('faust',team,g.nextId,'top');Object.assign(t,{x,y:20,hp:10000,maxHp:10000,armor:0,attackCd:999,lastAttackAt:100,lastDamageAt:100});return t;}return g.entity({kind,team,x,y:20,maxHp:10000,hp:10000,armor:0,radius:.25});}
for(const slot of['q','r'])test(`Mei ${slot} damages each passed nonchampion once and stops at the first enemy champion`,()=>{
 const{g,p}=arena(),a=unit(g,'minion',41.1),b=unit(g,'neutral',42),c=unit(g,'champion',43.4),behind=unit(g,'champion',45);
 g.cast(p,slot,g.input.aim);advance(g,slot==='r'?.9:.3);
 assert.ok(p.x>42&&p.x<c.x);for(const t of[a,b,c])assert.ok(t.hp<10000,`${slot} ${t.kind}`);near(behind.hp,10000);
 for(const t of[a,b]){assert.equal(g.stat(t,'stun'),0);const expected=slot==='r'?180:damageFormula(185,3,1,0)*g.powerScale(p);near(10000-t.hp,expected);}
 if(slot==='r')assert.equal(g.stat(c,'stun'),1);
});
for(const slot of['q','r'])test(`Mei ${slot} passes buildings while terrain still blocks the dash`,()=>{
 const{g,p}=arena();unit(g,'tower',41.3);g.cast(p,slot,g.input.aim);advance(g,slot==='r'?.9:.3);assert.ok(p.x>43);
 const second=arena();second.g.map.walls=[{x:42,y:18,w:1,h:4}];second.g.cast(second.p,slot,second.g.input.aim);advance(second.g,slot==='r'?.9:.3);assert.ok(second.p.x<42);
});
test('Mei rush glow rises and fades continuously to zero',()=>{
 const{g,p}=arena();p.state.meiRush={at:0,until:.3};const sample=t=>{g.time=t;return meiRushGlow(g,p);};near(sample(0),0);assert.ok(sample(.02)<sample(.09));assert.ok(sample(.23)<sample(.17));near(sample(.3),0);near(sample(.4),0);
});
test('EGO suppresses and then restores live guard, cover and buff presentation without freezing their clocks',()=>{
 const{g,p}=arena('ahab');g.buyAugment(p,'goldenBough');const ally=unit(g,'champion',41.5,0),enemy=unit(g,'champion',45);
 const baseArmor=g.armor(p),baseSpeed=g.speed(p),baseReload=g.reloadMultiplier(p);p.state.order='guard';g.addBuff(p,'ahabCover',5);p.state.coverStacks=3;assert.equal(guardAlly(g,p),ally);assert.ok(g.armor(p)>baseArmor);assert.ok(g.speed(p)>baseSpeed);assert.ok(g.reloadMultiplier(p)>baseReload);
 Ego.begin(g,p);near(g.armor(p),baseArmor);near(g.speed(p),baseSpeed);near(g.reloadMultiplier(p),baseReload);assert.equal(guardAlly(g,p),null);assert.ok(g.activeBuffs(p).every(b=>!['ahabOrder','ahabCover'].includes(b.key)));const hp=ally.hp;g.deal(enemy,p,100,{fixed:true});near(ally.hp,hp);
 Ego.end(g,p);assert.equal(guardAlly(g,p),ally);assert.ok(g.buff(p,'ahabCover'));Ego.begin(g,p);advance(g,5.1);Ego.end(g,p);assert.equal(g.buff(p,'ahabCover'),false);
});
test('EGO cover aura cannot amplify allied attacks or gain cover stacks',()=>{
 const{g,p}=arena('ahab');const ally=unit(g,'champion',41.5,0),enemy=unit(g,'champion',45);enemy.state.harpoons={[p.id]:{source:p.id,team:0,until:99}};near(coverMultiplier(g,ally,enemy),1.3);const stacks=p.state.coverStacks;Ego.begin(g,p);g.time=2;near(coverMultiplier(g,ally,enemy),1);assert.equal(p.state.coverStacks,stacks);
});
test('EGO magazine is one immutable use and death cancels the rest of the automatic volley',()=>{
 const{g,p}=arena('ahab'),enemy=unit(g,'champion',45);Ego.begin(g,p);near(g.ammoCap(p),1);near(g.changeAmmo(p,-1),0);near(p.ammo,1);g.attack(p,enemy);const hp=enemy.hp;advance(g,.1);g.kill(p,p);advance(g,1);near(enemy.hp,hp);
});
test('random echo lances stay inside the actual fan and the penance blade fits the 0.9-wide hit corridor',()=>{
 for(const facing of[0,Math.PI,-Math.PI/2])for(const age of[0,.03,.1,.19]){
  const f={seed:21,angle:facing,spread:100*Math.PI/180,r:9,maxLife:.2},rays=gasharpoonRays(f,age);assert.equal(rays.length,24);for(const r of rays){assert.ok(Math.abs(r.angle-facing)<=f.spread/2);assert.ok(r.tail>=0&&r.tip<=9&&r.tail<=r.tip);}assert.notDeepEqual(rays.map(r=>r.angle),gasharpoonRays({...f,seed:22},age).map(r=>r.angle));
 }
 const m=weaponGeometry('ahabGasBlade',gasharpoonProjectileLength());near(m.height*m.scale,.9);
});
test('EGO arm is mirrored at its shoulder and basic fire uses a small varied tremor',()=>{
 const{g,p}=arena('ahab');Ego.begin(g,p);g.attack(p,g.input.aim);const values=[];for(const t of[.02,.05,.09,.14,.18]){g.time=t;const pose=gasharpoonArmPose(g,p);assert.equal(pose.mirrorX,true);assert.ok(pose.hand.x<p.x);assert.ok(Math.abs(pose.push)<.14);values.push(pose.push);}assert.ok(Math.max(...values)-Math.min(...values)>.005);
});
test('Ahab separate EGO codex keeps four skills while Sora still has three transformed slots',()=>{
 const f=championForms('ahab').transformed;assert.equal(f.name,'개화 E.G.O 상태');assert.equal(f.art,'ahabGasBody');assert.equal(f.skills.length,4);assert.equal(championForms('sora').transformed.skills.length,3);assert.equal(championDescription('sora',true).ultimate,'');
 for(const[index,name]of[[1,'탄식의 메아리'],[2,'죄책감의 무게'],[3,'탈색된 참회']])assert.equal(skillReference('ahab',index,true).title,name);
 assert.match(skillReference('ahab',1,true).cooldown,/1발.*5회/);assert.match(skillReference('ahab',0,true).details,/일반 전술기/);assert.notEqual(championDescription('ahab',false).ultimate,'탈색된 참회');
});

test('Mei idle fists sit between chest and waist; EGO idle blade points downward on both facings',()=>{
 const{g,p}=arena();for(const f of meiFistPoses(g,p))near(f.y,spriteOrigin(g,p).y-.94);
 const a=arena('ahab');Ego.begin(a.g,a.p);for(const facing of[0,Math.PI]){a.p.facing=facing;near(gasharpoonArmPose(a.g,a.p).angle,Math.PI/2-(facing===0?1:-1)*Math.PI/12);}
 a.g.attack(a.p,a.g.input.aim);advance(a.g,.25);assert.ok(Math.abs(gasharpoonArmPose(a.g,a.p).angle)<.03);advance(a.g,1);near(gasharpoonArmPose(a.g,a.p).angle,Math.PI/2-Math.PI/12);
});
