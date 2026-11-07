import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import*as Jamila from'../src/jamila.js';
import{soundVoice}from'../src/sound-profiles.js';
import{recordingProfile,SWING_SAMPLES}from'../src/weapon-swings.js';
const run=(g,s)=>{for(let n=0;n<Math.round(s*120);n++)g.step(1/120);};
function arena(key){const g=new Game(key,'top',{mode:'training',seed:66}),p=g.player;g.units=[p];g.events=[];g.effects=[];g.projectiles=[];g.zones=[];g.pending=[];g.soundEvents=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,lastDamageAt:999,lastAttackAt:999});return{g,p};}
test('Jamila emits one round per bullet and every fourth shield round has a distinct pitch',()=>{
 const{g,p}=arena('jamila');for(let i=0;i<16;i++){assert.ok(g.attack(p,{x:48,y:25}));run(g,.2);}
 const rounds=g.soundEvents.filter(e=>e.kind==='shot');assert.equal(rounds.length,16);
 rounds.forEach((event,i)=>{const profile=recordingProfile(soundVoice(event));assert.equal(profile.id,'rifleRound');assert.equal(profile.pitch,(i+1)%4===0?2:0);assert.ok(Math.abs(event.at-i*.2)<1/120);});
 assert.equal(g.soundEvents.filter(e=>e.kind==='reload').length,1);
});
test('Myo Q emits exactly four single-round samples at the projectile times without a cast shot',()=>{
 const{g,p}=arena('myo');assert.ok(g.cast(p,'q',{x:47,y:25}));assert.equal(g.soundEvents.length,0);run(g,.23);
 const rounds=g.soundEvents.filter(e=>e.kind==='shot');assert.equal(rounds.length,4);assert.equal(g.projectiles.length,4);
 rounds.forEach((event,i)=>{assert.ok(Math.abs(event.at-i*.075)<1/120+.0001);assert.equal(recordingProfile(soundVoice(event)).id,'rifleRound');assert.equal(recordingProfile(soundVoice(event)).pitch,0);});
});
test('the burst source contains only one selected round; other weapons keep their sources',()=>{
 const spec=SWING_SAMPLES.find(s=>s.id==='rifleRound');assert.equal(spec.start,1.345);assert.equal(spec.end,1.632);
 assert.equal(recordingProfile(soundVoice({key:'gubo',kind:'shot'})).id,'guboRifle');
 assert.equal(recordingProfile(soundVoice({key:'myo',kind:'swing'})).id,'swing');
 assert.equal(recordingProfile(soundVoice({key:'jamila',kind:'swing',slot:'q',damageKind:'skill'})).id,'swing');
});
test('Jamila reload starts exactly once, with unchanged pitch/speed and full recording length',()=>{
 const{g,p}=arena('jamila');p.ammo=0;Jamila.beginReload(g,p);Jamila.beginReload(g,p);run(g,1.6);
 const events=g.soundEvents.filter(e=>e.kind==='reload');assert.equal(events.length,1);assert.equal(events[0].phase,'lca-reload');assert.equal(p.ammo,g.ammoCap(p));
 const profile=recordingProfile(soundVoice(events[0]));assert.equal(profile.id,'jamilaReload');assert.equal(profile.pitch,0);assert.deepEqual(profile.rates,[1,1,1]);assert.ok(profile.fullLength);assert.ok(profile.dry);
 run(g,2);assert.equal(g.soundEvents.filter(e=>e.kind==='reload').length,1);
});
test('firearm contacts use the bullet mix with varied pitch while spears retain piercing contacts',()=>{
 for(const family of ['rifle','pistol','shotgun','cannon']){
  const pitches=[];for(let variant=0;variant<4;variant++)for(const shielded of [false,true]){const profile=recordingProfile(soundVoice({kind:'hit',family,variant,shielded}));assert.equal(profile.id,'firearmImpact');assert.ok(Math.abs(profile.pitch)<=1.4);assert.ok(profile.rates.every(n=>n>=.97&&n<=1.04));pitches.push(profile.pitch);}
  assert.equal(new Set(pitches).size,4);
 }
 assert.equal(recordingProfile(soundVoice({kind:'hit',family:'spear'})).id,'impactPierce');
 assert.equal(recordingProfile(soundVoice({kind:'hit',key:'jamila'})).id,'firearmImpact');
 assert.equal(recordingProfile(soundVoice({kind:'hit',key:'myo',slot:'q',damageKind:'skill'})).id,'firearmImpact');
});
test('Outis shotgun cone marks bullet contacts and keeps the preceding thrust separate',()=>{
 const{g,p}=arena('outis');for(const x of [42.5,44]){const e=g.makeChampion('faust',1,g.nextId);Object.assign(e,{x,y:25,hp:10000,maxHp:10000,armor:0,lastDamageAt:999,lastAttackAt:999});}
 g.cast(p,'r',{x:47,y:25});run(g,.8);const contacts=g.soundEvents.filter(e=>e.phase==='outis-shotgun-hit');assert.ok(contacts.length);assert.ok(contacts.every(e=>recordingProfile(soundVoice(e)).id==='firearmImpact'));
});
test('Gubo Q reloads once, buffs his basic shot and fires the strongest sound after R aiming',()=>{
 const{g,p}=arena('gubo'),enemy=g.makeChampion('faust',1,20);Object.assign(enemy,{x:46,y:25,hp:10000,maxHp:10000,armor:0,lastDamageAt:999,lastAttackAt:999});
 assert.ok(g.attack(p,enemy));run(g,.1);p.attackCd=0;assert.ok(g.cast(p,'q',p));assert.ok(g.attack(p,enemy));run(g,.1);const at=g.time;assert.ok(g.cast(p,'r',enemy));run(g,1.19);
 assert.equal(g.soundEvents.filter(e=>e.phase==='gubo-ultimate').length,0);run(g,.02);
 const rounds=g.soundEvents.filter(e=>e.kind==='shot'&&e.key==='gubo'),profiles=rounds.map(e=>recordingProfile(soundVoice(e)));assert.equal(rounds.length,3);assert.deepEqual(profiles.map(p=>p.id),['guboRifle','guboRifle','guboRifle']);assert.ok(profiles[0].pitch>profiles[1].pitch&&profiles[1].pitch>profiles[2].pitch);assert.ok(profiles[0].gain<profiles[1].gain&&profiles[1].gain<profiles[2].gain);assert.ok(rounds[2].at>=at+1.2-1e-6);
 const reload=g.soundEvents.filter(e=>e.kind==='reload');assert.equal(reload.length,1);assert.equal(recordingProfile(soundVoice(reload[0])).id,'jamilaReload');
});
