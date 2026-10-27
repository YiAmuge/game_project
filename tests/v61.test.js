import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {RUNTIME_CHAMPIONS} from '../src/data.js';
import {WEAPON_VOICES,SKILL_VOICES,soundVoice,mixSoundEvents} from '../src/sound-profiles.js';
import {beginAlisaDetonation} from '../src/skills.js';
import * as CreepPatterns from '../src/creep-patterns.js';
const near=(a,b,t=.01)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
function arena(key='faust'){
 const g=new Game(key,'top',{mode:'training',seed:61}),p=g.player;
 g.units=[p];g.events=[];g.projectiles=[];g.effects=[];g.zones=[];g.pending=[];g.soundEvents=[];g.practice.lineStopped=true;
 g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;
 for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};
 Object.assign(p,{x:40,y:25,lastDamageAt:999,lastAttackAt:999});return {g,p};
}
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function enemy(g,x=44){const e=g.makeChampion('faust',1,20);Object.assign(e,{x,y:25,hp:10000,maxHp:10000,armor:0,lastDamageAt:999,lastAttackAt:999});return e;}
test('every runtime champion has weapon and tactical/ultimate sound palettes, including hidden champions',()=>{
 for(const key of Object.keys(RUNTIME_CHAMPIONS)){
  assert.ok(WEAPON_VOICES[key],key);assert.ok(SKILL_VOICES[key]?.q,key);assert.ok(SKILL_VOICES[key]?.r,key);
 }
 assert.ok(new Set(Object.values(WEAPON_VOICES).map(v=>v[0])).size>=18);
 assert.ok(new Set(Object.values(SKILL_VOICES).flatMap(v=>[v.q[1],v.r[1]])).size>=10);
});
test('electric, water, cutting, blunt, ice, chain and organic attacks retain their identity',()=>{
 for(const key of ['hohenheim','rudolph'])assert.equal(soundVoice({key,kind:'swing'}).element,'electric');
 assert.equal(soundVoice({key:'honglu',kind:'ultimate',slot:'r'}).element,'water');
 assert.equal(soundVoice({key:'ryoshu',kind:'swing'}).family,'katana');
 assert.equal(soundVoice({key:'marton',kind:'swing'}).family,'hammer');
 assert.equal(soundVoice({key:'gregor',kind:'swing'}).family,'organic');
 assert.equal(soundVoice({key:'meursault',kind:'cast',slot:'q'}).family,'chain');
 assert.equal(soundVoice({key:'rodya',kind:'shot',slot:'r'}).element,'ice');
 assert.equal(soundVoice({key:'rodya',kind:'cast',slot:'q'}).family,'coin');
 assert.equal(soundVoice({key:'sora',form:'ego',kind:'swing'}).family,'claw');
 assert.equal(soundVoice({key:'yan',form:'distorted',kind:'swing'}).family,'organic');
 assert.equal(soundVoice({key:'ezra',stance:2,kind:'swing'}).family,'drill');
});
test('area contacts merge at the nearest target; important signals precede impacts and minions stay silent',()=>{
 const base={kind:'hit',key:'sinclair',sourceId:1,sourceKind:'champion',at:1,slot:'q',x:10,y:0,strength:.5};
 const mixed=mixSoundEvents([base,{...base,x:3},{...base,sourceId:2,x:5},{...base,sourceKind:'minion'},{kind:'ping',ping:'danger',at:1}],{x:0,y:0});
 assert.equal(mixed.length,3);assert.equal(mixed[0].kind,'ping');assert.equal(mixed[1].contacts,2);near(mixed[1].x,3);
});
test('Myo tactical emits exactly four rifle shots at the actual 75ms shot intervals',()=>{
 const {g,p}=arena('myo');g.cast(p,'q',{x:47,y:25});assert.equal(g.soundEvents.filter(e=>e.kind==='shot').length,0);
 run(g,.3);const shots=g.soundEvents.filter(e=>e.kind==='shot');assert.equal(shots.length,4);
 for(let i=0;i<4;i++){near(shots[i].at,i*.075);assert.equal(soundVoice(shots[i]).family,'rifle');}
});
test('Meursault emits the second fist sound after the first, including an attack that misses',()=>{
 const {g,p}=arena('meursault');g.attack(p,{x:43,y:25});run(g,.12);
 const sounds=g.soundEvents.filter(e=>e.kind==='swing');assert.equal(sounds.length,2);near(sounds[1].at-sounds[0].at,.1);
});
test('Alisa explosion waits for the two-second detonation and is emitted once',()=>{
 const {g,p}=arena('alisa');beginAlisaDetonation(g,p,enemy(g,46));run(g,1.9);assert.equal(g.soundEvents.some(e=>e.kind==='explosion'),false);
 run(g,.11);const blasts=g.soundEvents.filter(e=>e.phase==='alisa-detonation');assert.equal(blasts.length,1);near(blasts[0].at,2);assert.equal(blasts[0].element,'fire');
});
test('Outis shotgun blast sounds at recoil rather than at the start of the dash',()=>{
 const {g,p}=arena('outis');enemy(g,43);assert.ok(g.cast(p,'r',{x:45,y:25}));assert.equal(g.soundEvents.some(e=>e.phase==='outis-shotgun'),false);
 run(g,.8);const shots=g.soundEvents.filter(e=>e.phase==='outis-shotgun');assert.equal(shots.length,1);assert.ok(shots[0].at>0);assert.equal(soundVoice(shots[0]).cue,'shotgun');
});
test('Hong Lu waterfall starts immediately, keeps its own skill palette through pulses and moves with its zone',()=>{
 const {g,p}=arena('honglu');enemy(g,45);assert.ok(g.cast(p,'r',{x:44,y:25}));
 const starts=g.soundEvents.filter(e=>e.kind==='waterfall');assert.equal(starts.length,1);near(starts[0].at,0);near(starts[0].x,44);
 const z=g.zones.find(z=>z.kind==='waterfall');p.castSlot='q';run(g,.51);assert.ok(z.x>44);
 const hits=g.soundEvents.filter(e=>e.phase==='waterfall-pulse');assert.ok(hits.length>=2);assert.ok(hits.every(e=>e.slot==='r'&&soundVoice(e).element==='water'));
});
test('projectile impact sound uses the fired skill rather than a later cast slot',()=>{
 const {g,p}=arena('rodya');enemy(g,45);assert.ok(g.cast(p,'r',{x:47,y:25}));p.castSlot='q';run(g,.3);
 const hit=g.soundEvents.find(e=>e.kind==='hit');assert.ok(hit);assert.equal(hit.slot,'r');assert.equal(soundVoice(hit).element,'ice');
});
test('Rudolph delayed electrical blast is audible at impact even when no target is hit',()=>{
 const {g,p}=arena('rudolph');assert.ok(g.cast(p,'r',{x:44,y:25}));run(g,1.2);assert.equal(g.soundEvents.some(e=>e.kind==='detonation'),false);
 run(g,.06);const blast=g.soundEvents.find(e=>e.kind==='detonation');assert.ok(blast);near(blast.at,1.25);assert.equal(soundVoice(blast).element,'electric');
});
test('tower destruction emits one global stone explosion and minion attacks remain silent',()=>{
 const {g,p}=arena();const t=g.entity({kind:'tower',team:1,x:80,y:25,maxHp:100});g.kill(t,p);
 const boom=g.soundEvents.filter(e=>e.kind==='explosion');assert.equal(boom.length,1);assert.equal(boom[0].global,true);assert.equal(soundVoice(boom[0]).element,'stone');
 g.soundEvents=[];const n=g.entity({kind:'minion',team:1,x:41,y:25,maxHp:100,damage:10,range:1.2});g.simpleAttack(n,p);assert.equal(g.soundEvents.length,0);
});
test('clerk focused strike sounds on completion even when the target moves out of its arc',()=>{
 const {g,p}=arena(),n=g.makeNeutral(42,25,'amplify');n.patternReady=0;n.hostile=true;
 assert.ok(CreepPatterns.update(g,n,p));assert.equal(g.soundEvents.at(-1).kind,'charge');p.x=60;g.time=2.65;CreepPatterns.update(g,n,p);
 assert.equal(g.soundEvents.filter(e=>e.phase==='focused-strike').length,1);
});

test('a fan of simultaneous projectiles makes one throw sound while timed rifle shots remain distinct',()=>{
 const e={kind:'shot',key:'nelly',sourceId:1,sourceKind:'champion',slot:'q',at:1,x:0,y:0};
 assert.equal(mixSoundEvents(Array.from({length:5},()=>({...e}))).length,1);
 const shots=Array.from({length:4},(_,i)=>({...e,key:'myo',at:1+i*.075}));
 assert.equal(mixSoundEvents(shots).length,4);
});
