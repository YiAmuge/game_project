import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import*as Reworks from'../src/reworks.js';
import{soundVoice,soundAllowed,mixSoundEvents}from'../src/sound-profiles.js';
import{recordingProfile,SWING_SAMPLES}from'../src/weapon-swings.js';
const run=(g,s)=>{for(let n=0;n<Math.round(s*120);n++)g.step(1/120);};
function arena(key){const g=new Game(key,'top',{mode:'training',seed:68}),p=g.player;g.units=[p];g.events=[];g.effects=[];g.projectiles=[];g.zones=[];g.pending=[];g.soundEvents=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,lastDamageAt:999,lastAttackAt:999});return{g,p};}
function hero(g,x=44,team=1){const t=g.makeChampion('faust',team,g.nextId);Object.assign(t,{x,y:25,hp:1000,maxHp:10000,armor:0,lastDamageAt:999,lastAttackAt:999});return t;}
test('Rudolph basic and delayed ultimate use electrocute with a stronger ultimate',()=>{
 const{g,p}=arena('rudolph');g.attack(p,{x:44,y:25});const basic=recordingProfile(soundVoice(g.soundEvents.find(e=>e.kind==='swing')));assert.equal(basic.id,'hohenElectrocute');
 p.attackCd=0;assert.ok(g.cast(p,'r',{x:45,y:25}));run(g,1.2);assert.equal(g.soundEvents.some(e=>e.kind==='detonation'),false);run(g,.06);
 const event=g.soundEvents.find(e=>e.kind==='detonation'),ult=recordingProfile(soundVoice(event));assert.equal(ult.id,basic.id);assert.ok(ult.gain>basic.gain*1.5);assert.ok(ult.pitch<basic.pitch);assert.equal(event.x,45);
});
test('Hong Lu Q splash happens at healing and R has one first splash plus one sound per healing pulse',()=>{
 const{g,p}=arena('honglu');g.cast(p,'q',p);run(g,1);assert.equal(g.soundEvents.some(e=>e.phase==='healing-ripple'),false);run(g,.21);
 const q=recordingProfile(soundVoice(g.soundEvents.find(e=>e.phase==='healing-ripple')));assert.equal(q.id,'waterSplash');
 const other=arena('honglu');other.p.hp=100;hero(other.g,41,0);hero(other.g,42,0);hero(other.g,45,1);other.g.cast(other.p,'r',{x:44,y:25});const z=other.g.zones[0];z.moving=false;
 const first=other.g.soundEvents.find(e=>e.phase==='waterfall-start');assert.equal(recordingProfile(soundVoice(first)).id,'waterSplash');assert.ok(recordingProfile(soundVoice(first)).gain>q.gain*1.5);
 const contact=other.g.soundEvents.find(e=>e.kind==='hit');assert.ok(contact.silent);assert.equal(soundAllowed(contact),false);assert.ok(other.g.units.find(e=>e.team===1).hp<1000);
 assert.equal(other.g.soundEvents.some(e=>e.phase==='waterfall-heal'),false);run(other.g,1.01);const heals=other.g.soundEvents.filter(e=>e.phase==='waterfall-heal');assert.equal(heals.length,2);assert.ok(heals.every(e=>recordingProfile(soundVoice(e)).id==='waterSplash'));
});
test('Heathcliff, base Sora and Starbuck use the ground sample only when the shockwave lands',()=>{
 for(const key of ['heathcliff','sora','starbuck']){
  const{g,p}=arena(key);const slot=key==='starbuck'?'r':'q';assert.ok(g.cast(p,slot,{x:44,y:25}));
  if(key==='heathcliff'){g.time=1.5;assert.ok(Reworks.releaseHeath(g,p,{x:44,y:25}));}
  assert.equal(g.soundEvents.some(e=>e.kind==='slam'),false,key);run(g,1);const impacts=g.soundEvents.filter(e=>e.kind==='slam');assert.equal(impacts.length,1,key);assert.equal(recordingProfile(soundVoice(impacts[0])).id,'groundImpact');
 }
});
test('Nelly basic and knife fan use one metal source with different pitches and no extra cast attack',()=>{
 const{g,p}=arena('nelly');g.attack(p,{x:42,y:25});const basic=recordingProfile(soundVoice(g.soundEvents.find(e=>e.kind==='swing')));g.soundEvents=[];assert.ok(g.cast(p,'q',{x:46,y:25}));const shots=g.soundEvents.filter(e=>e.kind==='shot');assert.equal(shots.length,5);assert.equal(g.soundEvents.some(e=>e.kind==='cast'),false);const mixed=mixSoundEvents(shots,p);assert.equal(mixed.length,1);
 const q=recordingProfile(soundVoice(mixed[0]));assert.equal(basic.id,'nellyMetal');assert.equal(q.id,basic.id);assert.ok(q.pitch>basic.pitch+2);assert.ok(q.duration<basic.duration);
});
test('Rodion ice axe and its bonus share one impact cue, retaining R after another cast',()=>{
 const{g,p}=arena('rodya'),t=hero(g,45);t.hp=10000;g.cast(p,'r',t);p.castSlot='q';run(g,.4);
 const impacts=g.soundEvents.filter(e=>e.phase==='rodya-ice-hit');assert.equal(impacts.length,2);assert.equal(mixSoundEvents(impacts,p).length,1);assert.ok(impacts.every(e=>e.slot==='r'&&recordingProfile(soundVoice(e)).id==='iceAxeImpact'));
});
test('Marton ranged contact uses earth while his melee stays blunt',()=>{
 for(const[x,id]of [[44,'earthImpact'],[41,'impactBlunt']]){const{g,p}=arena('marton'),t=hero(g,x);g.attack(p,t);const hit=g.soundEvents.find(e=>e.kind==='hit');assert.equal(recordingProfile(soundVoice(hit)).id,id);}
});
test('new sources omit trailing silence and share the existing electrocute buffer',()=>{
 assert.equal(new Set(SWING_SAMPLES.map(s=>s.file)).size,SWING_SAMPLES.length);assert.equal(SWING_SAMPLES.filter(s=>s.file.includes('electrocute')).length,1);
 assert.equal(SWING_SAMPLES.find(s=>s.id==='iceAxeImpact').end,1.6);assert.equal(SWING_SAMPLES.find(s=>s.id==='earthImpact').end,2.05);
});
