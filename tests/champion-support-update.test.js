import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,damageFormula} from '../src/game.js';
import {CHAMPIONS} from '../src/data.js';
import * as Moses from '../src/moses.js';
import * as Gahwan from '../src/gahwan.js';
import {stackGauge,championHud} from '../src/overlays.js';
import {debuffBadges} from '../src/champion-update-effects.js';
import {preview} from '../src/combat-visuals.js';
import {skillTargeting} from '../src/targeting.js';
import {ChampionVFX} from '../src/champion-vfx.js';
import {SkillVFX} from '../src/skill-vfx.js';
import {dongbaekRadius} from '../src/v06-champions.js';
import {mosesWeaponPose} from '../src/moses-vfx.js';
import {equipmentPose,gahwanChargePose,gahwanSlash} from '../src/weapon-art.js';
import {skillReference} from '../src/skill-reference.js';
import {SnapshotWriter,applySnapshot} from '../src/online-state.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function arena(key='moses'){
 const g=new Game(key,'support',{mode:'training',seed:119}),p=g.player;
 g.units=[p];g.map={walls:[],bounds:{x:0,y:0,w:120,h:100}};g.bounds=g.map.bounds;
 Object.assign(g.practice,{lineStopped:true,pauseXp:true});
 Object.assign(p,{x:40,y:40,lastDamageAt:999,lastAttackAt:999,lastCombat:999});
 g.input.aim={x:50,y:40};g.aiChampion=g.aiMinion=g.aiNeutral=g.aiStructure=()=>{};
 return {g,p};
}
function hero(g,team=1,x=43,y=40,key='faust',hp=100000){
 const t=g.makeChampion(key,team,g.nextId+20);
 Object.assign(t,{x,y,hp,maxHp:hp,armor:0,lastDamageAt:999,lastAttackAt:999,lastCombat:999});return t;
}
function run(g,seconds){for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120);}
const damage=(g,p,n)=>damageFormula(n,CHAMPIONS[p.key].power,1)*g.powerScale(p);
function breathe(g,p,progress=1){assert.ok(g.attack(p,g.input.aim));p.state.mosesCharge.progress=progress;assert.ok(Moses.release(g,p,g.input.aim));}
const basicShield=(g,p,t)=>t.shields.find(s=>s.source===`moses-breath-${p.id}`&&s.until>g.time)?.value||0;

test('Moses charges 55 to 190 in one second and repeatedly fires without an ammunition gate',()=>{
 for(const held of[0,.5,1]){
  const {g,p}=arena(),t=hero(g);near(p.ammo,0);g.attack(p,g.input.aim);run(g,held);Moses.release(g,p,g.input.aim);
  near(t.maxHp-t.hp,damage(g,p,55+135*held));near(p.ammo,0);near(p.attackCd,.7);
  assert.equal(g.attack(p,g.input.aim),false);run(g,.7);assert.ok(g.attack(p,g.input.aim));
 }
});
test('Moses reload speed accelerates the one-second charge while the pipe meets the smoking pose',()=>{
 const {g,p}=arena();p.upgrades.reload=2;g.attack(p,g.input.aim);run(g,.25);
 near(p.state.mosesCharge.progress,.25*g.reloadMultiplier(p));near(mosesWeaponPose(g,p,equipmentPose(g,p)).blend,1);
 run(g,.75);near(p.state.mosesCharge.progress,1);near(p.ammo,0);
});
test('basic shields scale only from the initial breath and accumulate to 7.5 percent with a refreshed five-second lifetime',()=>{
 const {g,p}=arena(),ally=hero(g,0,43,40,'faust',3000),one=damage(g,p,190)*.7;
 breathe(g,p);near(basicShield(g,p,ally),one);run(g,.7);breathe(g,p);near(basicShield(g,p,ally),one*2);
 run(g,.7);breathe(g,p);near(basicShield(g,p,ally),225);run(g,4.99);near(basicShield(g,p,ally),225);run(g,.02);near(basicShield(g,p,ally),0);
});
test('purple follow-up damage never increases the allied breath shield',()=>{
 const {g,p}=arena(),ally=hero(g,0),enemy=hero(g);g.cast(p,'q',p,{direction:'left'});g.attack(p,g.input.aim);
 const shield=basicShield(g,p,ally);near(shield,damage(g,p,190)*.7);run(g,.91);near(basicShield(g,p,ally),shield);near(enemy.maxHp-enemy.hp,damage(g,p,340));
});
test('multiple Moses casters share the basic shield cap without replacing unrelated shields',()=>{
 const {g,p}=arena(),other=hero(g,0,40,40,'moses',2700),ally=hero(g,0,43,40,'faust',2000);
 g.addShield(ally,200,'unrelated',10);breathe(g,p);g.cast(other,'q',other,{direction:'left'});g.attack(other,g.input.aim);
 near(basicShield(g,p,ally)+basicShield(g,other,ally),150);near(g.shield(ally),350);
});
test('white breath adds an independent 10-percent shield for 1.5 seconds and keeps the basic stack for five seconds',()=>{
 const {g,p}=arena(),ally=hero(g,0,43,40,'faust',3000);g.cast(p,'q',p,{direction:'up'});g.attack(p,g.input.aim);
 near(g.shield(ally),300+damage(g,p,190)*.7);assert.ok(ally.shields.some(s=>s.source===`moses-white-${p.id}`&&s.until===1.5));
 run(g,1.51);near(g.shield(ally),damage(g,p,190)*.7);run(g,3.5);near(g.shield(ally),0);
});
test('red breath has no separate shield, snapshots 65 plus three per haste percent, and refunds half a second per allied hit',()=>{
 for(const count of[0,1,2,3,4]){
  const {g,p}=arena(),allies=Array.from({length:count},(_,i)=>hero(g,0,42,39+i*.3,'faust',3000));p.upgrades.haste=2;p.rCd=20;
  for(const ally of allies)ally.hp=1000;
  g.cast(p,'q',p,{direction:'right'});g.attack(p,g.input.aim);near(p.rCd,20-Math.min(1.5,count*.5));
  for(const ally of allies){assert.ok(!ally.shields.some(s=>s.source.startsWith('moses-red-')));near(g.shield(ally),damage(g,p,190)*.7);}
  p.upgrades.haste=0;run(g,.51);for(const ally of allies)near(ally.hp,1110);
 }
});
test('red refunds exclude enemies, minions, allies behind, and allies outside the breath',()=>{
 const {g,p}=arena();hero(g,0,38);hero(g,0,48);hero(g,1,42);g.entity({kind:'minion',team:0,x:42,y:40,maxHp:1000});p.rCd=10;
 g.cast(p,'q',p,{direction:'right'});g.attack(p,g.input.aim);near(p.rCd,10);
});
test('Moses tactical charges now refill every eight seconds',()=>{
 const {g,p}=arena();g.cast(p,'q',p,{direction:'up'});g.attack(p,g.input.aim);run(g,.7);g.cast(p,'q',p,{direction:'up'});
 near(Moses.charges(g,p).current,0);run(g,7.31);near(Moses.charges(g,p).current,1);run(g,8);near(Moses.charges(g,p).current,2);
});
test('nearby allied damage refunds Moses ultimate only once per three seconds, including shield damage',()=>{
 const {g,p}=arena(),ally=hero(g,0),enemy=hero(g,1);p.rCd=20;g.addShield(ally,1000,'test-shield',10);
 g.deal(enemy,ally,10,{fixed:true});near(p.rCd,19);g.deal(enemy,p,10,{fixed:true});near(p.rCd,19);
 g.time=2.99;g.deal(enemy,ally,10,{fixed:true});near(p.rCd,19);g.time=3;g.deal(enemy,ally,10,{fixed:true});near(p.rCd,18);
 const far=hero(g,0,48);g.time=6;g.deal(enemy,far,10,{fixed:true});near(p.rCd,18);g.deal(enemy,ally,10,{fixed:true});near(p.rCd,17);
});
test('an idle ultimate does not spend the allied-damage refund interval, and self damage is excluded',()=>{
 const {g,p}=arena(),ally=hero(g,0),enemy=hero(g);g.deal(enemy,ally,10,{fixed:true});assert.equal(p.state.mosesRefundReady,undefined);
 p.rCd=.5;g.selfDamage(p,10);near(p.rCd,.5);g.deal(enemy,ally,10,{fixed:true});near(p.rCd,0);
});
test('Moses can change red point direction until launch and the fired projectile keeps its direction',()=>{
 const {g,p}=arena();g.cast(p,'r',g.input.aim);run(g,1);g.input.aim={x:40,y:60};run(g,.51);
 const point=g.projectiles.find(p=>p.type==='mosesPoint');assert.ok(point);near(point.dx,0);near(point.dy,1);
 g.input.aim={x:20,y:40};run(g,.1);near(point.dx,0);near(point.dy,1);
});
test('Gahwan waits 1.75 seconds then hits every enemy champion in the forward half moon only',()=>{
 for(const angle of[0,Math.PI/2,Math.PI,-Math.PI/2]){
  const {g,p}=arena('gahwan'),at=(r,offset)=>({x:40+Math.cos(angle+offset)*r,y:40+Math.sin(angle+offset)*r});
  const front=at(9,0),side=at(8,89*Math.PI/180),back=at(3,100*Math.PI/180),far=at(11,0),a=hero(g,1,front.x,front.y),b=hero(g,1,side.x,side.y),c=hero(g,1,back.x,back.y),d=hero(g,1,far.x,far.y),ally=hero(g,0,front.x,front.y);
  const minion=g.entity({kind:'minion',team:1,...at(4,0),maxHp:1000});g.input.aim=front;g.cast(p,'r',front);run(g,1.74);near(a.hp,a.maxHp);assert.ok(gahwanChargePose(g,p));run(g,.02);
  for(const target of[a,b]){near(target.maxHp-target.hp,damage(g,p,350));assert.ok(Gahwan.hasContempt(g,target));near(g.stat(target,'slow'),.5);near(g.stat(target,'stun'),0);}
  for(const target of[c,d,ally,minion])near(target.hp,target.maxHp);assert.equal(g.pending.length,0);
 }
});
test('existing contempt adds 100 damage, fifteen-percent power and armor weakness, and a half-second stun',()=>{
 const {g,p}=arena('gahwan'),t=hero(g);t.armor=40;Gahwan.contempt(g,p,t);const power=g.combatPower(t);g.cast(p,'r',g.input.aim);run(g,1.76);
 near(t.maxHp-t.hp,damage(g,p,450)*1.12/1.4);near(g.combatPower(t),power*.85);near(g.armor(t),34);near(g.stat(t,'stun'),1);run(g,.5);near(g.stat(t,'stun'),0);run(g,2.51);near(g.armor(t),40);near(g.combatPower(t),power);
});
test('contempt prevents gaze from every caster and gaze resumes after contempt expires',()=>{
 const {g,p}=arena('gahwan'),t=hero(g),other=hero(g,0,40,42,'gahwan');for(let i=0;i<5;i++)g.deal(p,t,1,{fixed:true});
 assert.ok(Gahwan.hasContempt(g,t));for(let i=0;i<8;i++){g.deal(p,t,1,{fixed:true});g.deal(other,t,1,{fixed:true});}assert.deepEqual(t.state.gaze,{});
 g.time=3.01;g.deal(p,t,1,{fixed:true});near(t.state.gaze[p.id].n,1);near(debuffBadges(g,t).find(b=>b.kind==='gaze').stacks,1);
});
test('interrupting Gahwan concentration prevents the later strike and clears the weapon charge',()=>{
 for(const action of['stun','silence','death']){const {g,p}=arena('gahwan'),t=hero(g);g.cast(p,'r',t);run(g,.5);if(action==='death')g.kill(p,t);else g.status(p,action,1,2,t);run(g,2);near(t.hp,t.maxHp);assert.equal(p.state.gahwanR,undefined);assert.equal(gahwanSlash(g,p),null);}
});
test('Gahwan moves at half speed throughout concentration and releases from the new position',()=>{
 const {g,p}=arena('gahwan'),speed=g.speed(p),t=hero(g,1,50.7);g.cast(p,'r',g.input.aim);near(g.speed(p),speed*.5);g.input.x=1;
 run(g,1);near(p.x,40+speed*.5);assert.ok(p.state.gahwanR);near(t.hp,t.maxHp);run(g,.76);
 const wave=g.effects.find(f=>f.type==='gahwanWave');assert.ok(wave.x>42);assert.ok(t.hp<t.maxHp);assert.equal(p.state.gahwanR,undefined);near(g.speed(p),speed);
});
test('Gahwan channel movement still respects roots, walls and the normal movement path',()=>{
 const {g,p}=arena('gahwan');g.cast(p,'r',g.input.aim);g.status(p,'root',1,.5,hero(g));g.input.x=1;run(g,.4);near(p.x,40);assert.ok(p.state.gahwanR);
 run(g,.2);assert.ok(p.x>40);g.input.x=0;const start=p.x;g.moveToward(p,{x:50,y:40},.1);near(p.x-start,g.speed(p)*.1);
 g.map.walls=[{x:41,y:35,w:1,h:10}];g.input.x=1;run(g,.5);assert.ok(p.x<=41-p.radius+1e-5);assert.ok(p.state.gahwanR);
});
test('Gahwan tactical cuts stay at the selected circle and its ultimate preview is a ten-range half moon',()=>{
 const {g,p}=arena('gahwan');g.cast(p,'q',{x:46,y:42});run(g,.54);const f=g.effects.find(f=>f.type==='gahwanCut');assert.ok(f);near(f.x,46);near(f.y,42);near(f.r,2.5);
 const spec=skillTargeting(g,p,'r');assert.equal(spec.kind,'cone');near(spec.range,10);near(spec.radius,Math.PI);
});
test('Ppui shows stack numbers at health-bar right and healing progress below the resource bar',()=>{
 const {g,p}=arena('ppui');p.ppuiHealing=12345;const gauge=stackGauge(p,g);near(gauge.ratio,.345);assert.match(gauge.label,/655/);
 const labels=[],c=new Proxy({getTransform:()=>({a:1,b:0}),measureText:()=>({width:1})},{get:(o,k)=>k in o?o[k]:()=>{}}),r={ctx:c,text:(...args)=>labels.push(args),polygon(){},line(){},circle(){}};
 championHud(r,p,g);assert.ok(labels.some(([text,x])=>text==='12'&&x>p.x+1.325));assert.ok(labels.some(([text])=>text.includes('655')));
 p.ppuiHealing=30000;near(stackGauge(p,g).ratio,1);assert.match(stackGauge(p,g).label,/최대/);
});
test('all four Ezra ultimate previews are circles centered on the intended landing',()=>{
 const {g,p}=arena('ezra');g.cast(p,'r',p);g.input.aim={x:41,y:40};
 for(let hit=0;hit<4;hit++){p.state.ultAttacks=hit;const circles=[],arcs=[],ctx={beginPath(){},moveTo(){},closePath(){},fill(){},stroke(){},arc:(...a)=>arcs.push(a)};preview({ctx,circle:(...a)=>circles.push(a)},p,g);assert.equal(arcs.length,0);near(circles[0][0],41);near(circles[0][1],40);near(circles[0][2],3);}
});
test('Dongbaek ultimate particle sectors remain complete circles at each real expanding hit radius',()=>{
 const {g,p}=arena('dongbaek'),vfx=new ChampionVFX(new SkillVFX());g.cast(p,'r',p);
 for(let hit=0;hit<6;hit++){if(hit)run(g,.2);vfx.sync(g);const f=vfx.effects.filter(f=>f.type==='petalFan').at(-1);assert.ok(f);near(f.r,dongbaekRadius(hit));near(f.spread,Math.PI*2);if(hit<5)assert.equal(g.effects.some(f=>f.type==='burst'&&f.theme==='dongbaek'),false);}
 const spec=skillTargeting(g,p,'r');near(spec.radius,6.5);near(spec.innerRadius,4.2);
});
test('snapshots preserve new concentration, shield pools, cooldown gates, and pulse progress',()=>{
 const {g,p}=arena(),ally=hero(g,0),gahwan=hero(g,1,45,40,'gahwan');g.cast(p,'q',p,{direction:'up'});g.attack(p,g.input.aim);p.rCd=50;p.state.mosesRefundReady=3;p.ppuiHealing=12345;g.cast(gahwan,'r',p);
 const client=arena().g;assert.ok(applySnapshot(client,JSON.parse(JSON.stringify(new SnapshotWriter().capture(g,true))),p.id));
 near(client.player.state.mosesRefundReady,3);near(client.player.ppuiHealing,12345);assert.ok(client.units.find(e=>e.id===gahwan.id).state.gahwanR);assert.equal(client.units.find(e=>e.id===ally.id).shields.length,2);
});
test('codex and tooltips describe the current skills without obsolete Moses ammunition or red shields',()=>{
 const basic=skillReference('moses',1),white=skillReference('moses',2),ult=skillReference('gahwan',3);
 assert.doesNotMatch(basic.details+basic.summary+basic.cooldown,/탄창|탄약/);assert.match(basic.details,/55.*190/);assert.match(basic.details,/7.5%/);assert.match(white.details,/1.5초/);assert.doesNotMatch(white.details,/350|55 \+|1%당 2/);
 assert.equal(ult.title,'경멸, 경외 [잠재 해방]');assert.match(ult.details,/1.75초/);assert.match(ult.ranges[0].text,/10.*반원/);assert.doesNotMatch(ult.details,/350\/3|0.75초|방어력 25/);
});
