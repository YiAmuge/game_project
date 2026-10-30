import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import{CHAMPIONS}from'../src/data.js';
import{basicStance,bodyFacing,captureMobileAim,followMobileAim,STANCE_ANGLES}from'../src/champion-pose.js';
import{equipmentPose}from'../src/weapon-art.js';
import{mobileAutoAim,mobileAttackTargets,attackCategory,autoAimReach}from'../src/mobile-aim.js';
import{combatNumber,NUMBER_BATCH}from'../src/combat-text.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function arena(key='faust'){
 const g=new Game(key,'bottom',{mode:'training',seed:65}),p=g.player;g.units=[p];g.events=[];g.effects=[];g.pending=[];g.projectiles=[];g.zones=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of['aiChampion','aiNeutral','aiStructure','aiMinion'])g[k]=()=>{};Object.assign(p,{x:40,y:25,lastAttackAt:999,lastDamageAt:999,attackAt:-99});g.input={x:0,y:0,aim:{x:47,y:28},fire:false};return{g,p};
}
function foe(g,{key='yi',x=44,y=25,hp=5000,kind='champion'}={}){const t=g.makeChampion(key,1,g.nextId+20);Object.assign(t,{x,y,hp,maxHp:10000,armor:0,kind,lastAttackAt:999,lastDamageAt:999});return t;}
test('the codex default stance faces right with the specified champion weapon angle',()=>{
 for(const key of Object.keys(CHAMPIONS)){const{g,p}=arena(key);p.previewStance=true;near(bodyFacing(g,p),0);near(equipmentPose(g,p).facing,STANCE_ANGLES[key]||0);near(equipmentPose(g,p).angle,STANCE_ANGLES[key]||0);assert.ok(basicStance(g,p));}
});
test('mobile travel uses mirrored horizontal weapons without changing the actual aim',()=>{
 const{g,p}=arena();g.mobileInput=true;p.facing=.63;for(const[x,body,weapon]of[[-1,Math.PI,Math.PI],[1,0,0]]){g.input.x=x;near(bodyFacing(g,p),body);near(equipmentPose(g,p).facing,weapon);near(p.facing,.63);}
});
test('vertical travel retains the last horizontal body orientation independently of aim',()=>{
 const{g,p}=arena();g.mobileInput=true;g.input.x=-1;captureMobileAim(g);g.input.x=0;g.input.y=1;p.facing=0;near(bodyFacing(g,p),Math.PI);near(equipmentPose(g,p).facing,Math.PI);
});
test('a basic attack, a held aim, a tactical charge and a skill dash all override the resting stance',()=>{
 const{g,p}=arena('don');g.mobileInput=true;g.input.x=-1;p.facing=.7;p.attackAt=g.time;assert.equal(basicStance(g,p),null);near(bodyFacing(g,p),.7);p.attackAt=-99;g.mobileAim={slot:'basic'};assert.equal(basicStance(g,p),null);delete g.mobileAim;p.state.donCharge={at:0};assert.equal(basicStance(g,p),null);delete p.state.donCharge;p.motion={actionKind:'skill'};assert.equal(basicStance(g,p),null);
});
test('desktop and AI orientations are unchanged by the mobile resting stance',()=>{
 const{g,p}=arena(),t=foe(g);g.input.x=-1;p.facing=.4;near(bodyFacing(g,p),.4);g.mobileInput=true;t.facing=.2;near(bodyFacing(g,t),.2);
});
test('mobile aim moves with actual player travel so passing its former world point cannot reverse facing',()=>{
 const{g,p}=arena();g.mobileInput=true;g.input.x=1;g.input.aim={x:40.15,y:25};const initial=p.x;for(let i=0;i<60;i++)g.step(1/120);assert.ok(p.x>initial+.3);near(g.input.aim.x-p.x,.15);near(g.input.aim.y-p.y,0);near(p.facing,0);
});
test('collision-limited movement preserves the same relative aim vector in both axes',()=>{
 const{g,p}=arena();g.mobileInput=true;g.map.walls=[{x:41,y:24,w:1,h:4}];g.input.x=1;g.input.y=.5;const dx=g.input.aim.x-p.x,dy=g.input.aim.y-p.y;for(let i=0;i<90;i++)g.step(1/120);assert.ok(p.x<41);near(g.input.aim.x-p.x,dx);near(g.input.aim.y-p.y,dy);
});
test('infiltration cursor movement is independent of the ordinary mobile aim-follow behavior',()=>{
 const{g,p}=arena();g.mobileInput=true;p.state.infiltration={phase:'selecting'};assert.equal(captureMobileAim(g),null);
});
test('a locked held-attack target remains at its real position even when the shooter moves',()=>{
 const{g,p}=arena('jamila'),t=foe(g);g.mobileInput=true;g.input.aim={x:t.x,y:t.y};g.mobileAim={autoTarget:t.id};const from=captureMobileAim(g);p.x+=2;t.y+=1;followMobileAim(g,from);near(g.input.aim.x,t.x);near(g.input.aim.y,t.y);
});
test('default mobile autoaim prioritizes the enemy champion with the lowest current health before nearby minions',()=>{
 const{g,p}=arena('gubo');foe(g,{x:41,hp:1,kind:'minion'});const high=foe(g,{x:42,hp:8000}),low=foe(g,{x:46,hp:300});assert.equal(mobileAutoAim(g,p).target,low);low.hp=9000;assert.equal(mobileAutoAim(g,p).target,high);
});
test('champion priority also applies to aimed tactical and ultimate attacks',()=>{
 const{g,p}=arena('faust');foe(g,{x:41,kind:'minion',hp:1});const target=foe(g,{x:44,hp:200});assert.equal(mobileAutoAim(g,p,'q').target,target);assert.equal(mobileAutoAim(g,p,'r').target,target);
});
test('explicit category attacks choose only that category and report an unavailable target instead of falling back',()=>{
 const{g,p}=arena('gubo');const targets=Object.fromEntries([['champion','champion'],['minion','minion'],['structure','tower'],['creep','neutral']].map(([category,kind],i)=>[category,foe(g,{kind,x:42+i,hp:100+i})]));for(const[category,t]of Object.entries(targets)){assert.equal(attackCategory(t),category);assert.equal(mobileAutoAim(g,p,'basic',{category}).target,t);}targets.creep.alive=false;const aim=mobileAutoAim(g,p,'basic',{category:'creep'});assert.equal(aim.target,undefined);assert.ok(aim.unavailable);
});
test('category availability excludes hidden, invulnerable, blocked and out-of-range targets',()=>{
 const{g,p}=arena('gubo'),t=foe(g);assert.ok(mobileAttackTargets(g,p).includes(t));t.invulnerableUntil=1;assert.equal(mobileAttackTargets(g,p).length,0);t.invulnerableUntil=0;g.map.walls=[{x:41,y:24,w:.5,h:2}];assert.equal(mobileAttackTargets(g,p).length,0);g.map.walls=[];t.x=100;assert.equal(mobileAttackTargets(g,p).length,0);
});
test('Gubo allied execution retains its priority while Ppui basics select enemies',()=>{
 for(const key of['gubo','ppui']){const{g,p}=arena(key);foe(g,{hp:1});const ally=g.makeChampion('yi',0,50);Object.assign(ally,{x:43,y:25,hp:1});assert.equal(mobileAutoAim(g,p).target===ally,key==='gubo');assert.notEqual(mobileAutoAim(g,p,'basic',{category:'champion'}).target,ally);}
});
test('circle autoaim hits targets at the far blast edge while keeping the center inside cast range',()=>{
 const{g,p}=arena('yi'),t=foe(g,{x:50});const aim=mobileAutoAim(g,p,'q');assert.equal(aim.target,t);near(aim.point.x,47);assert.ok(Math.abs(aim.point.x-t.x)<=3.2+t.radius);t.x=51;const outside=mobileAutoAim(g,p,'q');assert.equal(outside.target,t);near(outside.point.x,47);
});
test('self areas and line impact radii extend autoaim reach, while cone angles and targeted skills do not',()=>{
 near(autoAimReach({kind:'self',range:0,radius:5}),5);near(autoAimReach({kind:'line',range:8,radius:.3,impact:4}),12);near(autoAimReach({kind:'cone',range:5,radius:Math.PI}),5);near(autoAimReach({kind:'target',range:7,radius:1.2}),7);
 const{g,p}=arena('rodya'),t=foe(g,{x:51});assert.equal(mobileAutoAim(g,p,'r').target,t);
});
test('rapid small healing ticks merge their actual amounts without rounding every tick into extra healing',()=>{
 const{g,p}=arena('ppui'),t=foe(g);for(let i=0;i<10;i++){g.time=i*.03;combatNumber(g,t,.13,{heal:true,source:p});}const numbers=g.effects.filter(f=>f.type==='number');assert.equal(numbers.length,1);near(numbers[0].amount,1.3);assert.equal(numbers[0].text,'+1');assert.equal(numbers[0].hits,10);
});
test('healing, ordinary damage and fixed damage keep separate colors and totals in a shared batch window',()=>{
 const{g,p}=arena(),t=foe(g);combatNumber(g,t,10,{source:p});combatNumber(g,t,4,{fixed:true,source:p});combatNumber(g,t,7,{heal:true,source:p});combatNumber(g,t,20,{source:p});combatNumber(g,t,3,{fixed:true,source:p});const n=g.effects.filter(f=>f.type==='number');assert.equal(n.length,3);assert.equal(n.find(f=>!f.fixed&&!f.heal).text,'30');assert.equal(n.find(f=>f.fixed).text,'7');assert.equal(n.find(f=>f.heal).text,'+7');
});
test('continuous multi-hit skills create a fresh number after half a second instead of growing one indefinitely',()=>{
 const{g,p}=arena(),t=foe(g);for(let i=0;i<20;i++){g.time=i*.05;combatNumber(g,t,2,{source:p});}const n=g.effects.filter(f=>f.type==='number');assert.equal(n.length,2);assert.equal(n.reduce((sum,f)=>sum+f.amount,0),40);assert.ok(n.every(f=>f.lastAt-f.startedAt<NUMBER_BATCH.window));
});
test('separate hits outside the rapid-hit gap do not merge, but allied healers can share a clear total',()=>{
 const{g,p}=arena(),t=foe(g),ally=g.makeChampion('ppui',0,50);combatNumber(g,t,10,{heal:true,source:p});combatNumber(g,t,12,{heal:true,source:ally});assert.equal(g.effects[0].text,'+22');g.time=NUMBER_BATCH.gap+.01;combatNumber(g,t,5,{heal:true,source:p});assert.equal(g.effects.length,2);
});
