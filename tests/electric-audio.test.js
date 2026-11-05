import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import*as Hohenheim from'../src/hohenheim.js';
import{soundVoice}from'../src/sound-profiles.js';
import{recordingProfile,SWING_SAMPLES}from'../src/weapon-swings.js';
import{HohenheimChargeAudio}from'../src/hohenheim-audio.js';
const run=(g,s)=>{for(let n=0;n<Math.round(s*120);n++)g.step(1/120);};
function arena(key){const g=new Game(key,'top',{mode:'training',seed:67}),p=g.player;g.units=[p];g.events=[];g.effects=[];g.projectiles=[];g.zones=[];g.pending=[];g.soundEvents=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,lastDamageAt:999,lastAttackAt:999});return{g,p};}
function foe(g,x=44){const e=g.makeChampion('faust',1,g.nextId);Object.assign(e,{x,y:25,hp:10000,maxHp:10000,armor:0,lastDamageAt:999,lastAttackAt:999});return e;}
test('Outis/Gregor contacts are piercing; Marton ranged uses earth and melee stays blunt',()=>{
 for(const[key,slot,x,id]of [['outis',null,45,'impactPierce'],['gregor','q',44,'impactPierce'],['marton',null,44,'earthImpact'],['marton',null,41,'impactBlunt']]){
  const{g,p}=arena(key),t=foe(g,x);if(slot)g.cast(p,slot,t);else g.attack(p,t);run(g,.4);const hits=g.soundEvents.filter(e=>e.kind==='hit');assert.ok(hits.length,key);assert.ok(hits.every(e=>recordingProfile(soundVoice(e)).id===id),key);
 }
});
test('Outis shotgun recording occurs once at the second area strike after the thrust',()=>{
 const{g,p}=arena('outis');foe(g,42.5);foe(g,44);g.cast(p,'r',{x:47,y:25});assert.equal(g.soundEvents.some(e=>e.phase==='outis-shotgun'),false);run(g,.8);
 const blasts=g.soundEvents.filter(e=>e.phase==='outis-shotgun');assert.equal(blasts.length,1);assert.ok(blasts[0].at>0);assert.equal(recordingProfile(soundVoice(blasts[0])).id,'outisShotgun');
});
test('Hohenheim release plays one softened source per real beam, at 120ms intervals',()=>{
 const{g,p}=arena('hohenheim');Hohenheim.attack(g,p,{x:48,y:25});assert.equal(g.soundEvents.length,0);p.state.hohenCharge.progress=1.5;Hohenheim.release(g,p,{x:48,y:25});run(g,.25);
 const shots=g.soundEvents.filter(e=>e.phase==='electric-beam');assert.equal(shots.length,3);shots.forEach((e,i)=>{assert.ok(Math.abs(e.at-i*.12)<.009);const profile=recordingProfile(soundVoice(e));assert.equal(profile.id,'hohenBeam');assert.ok(profile.pitch<=-4.25);assert.equal(profile.lowpass,3600);assert.equal(profile.duration,.38);});
 const sample=SWING_SAMPLES.find(s=>s.id==='hohenBeam');assert.equal(sample.start,.26);assert.equal(sample.end,.78);
});
test('Hohenheim Q uses electrocute; R emits seven growth and three full attacks even after slot changes',()=>{
 const{g,p}=arena('hohenheim');g.cast(p,'q',{x:43,y:25});const q=g.soundEvents.find(e=>e.kind==='cast');assert.equal(recordingProfile(soundVoice(q)).id,'hohenElectrocute');
 const other=arena('hohenheim');other.g.cast(other.p,'r',{x:45,y:25});other.p.castSlot='q';run(other.g,2.11);
 const grow=other.g.soundEvents.filter(e=>e.phase==='hohen-grow-hit'),full=other.g.soundEvents.filter(e=>e.phase==='hohen-full-hit');assert.equal(grow.length,7);assert.equal(full.length,3);
 for(const e of grow){const p=recordingProfile(soundVoice(e));assert.equal(e.slot,'r');assert.equal(e.x,45);assert.equal(p.id,'hohenUltimate');assert.equal(p.offset,0);assert.ok(p.duration<=1);}
 full.forEach((e,i)=>{const p=recordingProfile(soundVoice(e));assert.equal(e.slot,'r');assert.ok(Math.abs(e.at-(1.75+i*.1))<.009);assert.equal(p.id,'hohenUltimate');assert.ok(p.offset>=1);});
});
test('gun impacts have exactly 70% of their previous gain and a short fading tail',()=>{
 for(const variant of [0,1,2,3]){const p=recordingProfile(soundVoice({kind:'hit',family:'rifle',weight:1,variant}));assert.ok(Math.abs(p.gain-.68*.70)<1e-10);assert.ok(p.duration>.37&&p.duration<.39);assert.equal(p.fadeOut,.12);}
});
function fakeAudio(){const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},cancelScheduledValues(){},linearRampToValueAtTime(v){this.value=v;}}),sources=[];
 const a={context:{currentTime:0,createBufferSource(){const s={detune:param(),playbackRate:param(),connect(){},disconnect(){this.disconnected=true;},start(){},stop(t){this.stopped=t;}};sources.push(s);return s;}},synth:{swings:{buffers:new Map([['hohenElectrocute',{}]])}},combat:{},spatial(e,p){return{d:Math.abs(e.x-p.x),gain:1,pan:0};},output(){return{out:{gain:param()},nodes:[{pan:param(),disconnect(){}}]};}};return{a,sources};}
test('charge hum follows active charge and stops on release, death, control, pause and distance',()=>{
 for(const reason of ['release','death','stun','disarm','motion','recall','hidden','distance','pause']){
  const{a,sources}=fakeAudio(),audio=new HohenheimChargeAudio(a),e={id:1,key:'hohenheim',kind:'champion',alive:true,x:0,state:{hohenCharge:{progress:0}}},g={units:[e],hidden:()=>false,stat:()=>false};audio.sync(g,{x:0},true);assert.equal(audio.fields.size,1);assert.ok(sources[0].loop);
  if(reason==='release')delete e.state.hohenCharge;if(reason==='death')e.alive=false;if(['stun','disarm'].includes(reason))g.stat=(_,k)=>k===reason;if(reason==='motion')e.motion={};if(reason==='recall')e.recall={};if(reason==='hidden')g.hidden=()=>true;if(reason==='distance')e.x=50;
  audio.sync(g,{x:0},reason!=='pause');assert.equal(audio.fields.size,0,reason);assert.equal(sources[0].stopped,.09);sources[0].onended();assert.ok(sources[0].disconnected);
 }
});
