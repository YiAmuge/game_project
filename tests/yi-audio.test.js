import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import{soundVoice}from'../src/sound-profiles.js';
import{recordingProfile}from'../src/weapon-swings.js';
import{YiBuffAudio,yiSoundProfile}from'../src/yi-audio.js';
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function arena(){
 const g=new Game('yi','top',{mode:'training',seed:65}),p=g.player;g.units=[p];g.events=[];g.projectiles=[];g.zones=[];g.pending=[];g.soundEvents=[];g.practice.lineStopped=true;
 g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,lastDamageAt:999,lastAttackAt:999});return{g,p};
}
test('Yi Q deploys once at the actual zone; R sounds once at its landing',()=>{
 const{g,p}=arena();assert.ok(g.cast(p,'q',{x:46,y:25}));const q=g.soundEvents.filter(e=>e.kind==='cast');assert.equal(q.length,1);assert.equal(q[0].x,g.zones[0].x);assert.equal(q[0].y,g.zones[0].y);assert.equal(q[0].phase,'yi-deploy');
 assert.ok(g.cast(p,'r',{x:42,y:25}));const r=g.soundEvents.filter(e=>e.kind==='ultimate');assert.equal(r.length,1);assert.equal(r[0].x,p.x);assert.equal(r[0].y,p.y);assert.equal(r[0].phase,'yi-ultimate');
 const qp=recordingProfile(soundVoice(q[0])),rp=recordingProfile(soundVoice(r[0]));assert.equal(qp.id,'yiDeploy');assert.equal(rp.id,'yiDeploy');assert.ok(qp.gain>rp.gain*1.5);assert.ok(g.buff(p,'ogamdo'));
});
test('Q impacts keep their own sound after R changes the caster slot',()=>{
 const{g,p}=arena(),enemy=g.makeChampion('faust',1,20);Object.assign(enemy,{x:46,y:25,hp:10000,maxHp:10000,armor:0,lastDamageAt:999,lastAttackAt:999});
 g.cast(p,'q',enemy);g.cast(p,'r',{x:41,y:25});run(g,.51);
 const hits=g.soundEvents.filter(e=>e.phase==='yi-zone-hit');assert.ok(hits.length);assert.ok(hits.every(e=>e.slot==='q'&&recordingProfile(soundVoice(e)).id==='yiImpact'));
});
test('only Yi basic/Q contacts and casts select the new recordings, with subtle variation',()=>{
 for(const variant of [0,1,2,3]){
  for(const shielded of [false,true])for(const slot of [undefined,'q']){
   const p=recordingProfile(soundVoice({key:'yi',kind:'hit',slot,shielded,variant}));assert.equal(p.id,'yiImpact');assert.ok(Math.abs(p.pitch)<=.15);assert.ok(p.rates.every(n=>n>.97&&n<1.03));
  }
  assert.equal(yiSoundProfile(soundVoice({key:'yi',kind:'hit',periodic:true,variant})),null);
 }
 assert.equal(recordingProfile(soundVoice({key:'yi',kind:'shot'})).id,'swing');
 assert.equal(recordingProfile(soundVoice({key:'marton',kind:'hit'})).id,'impactBlunt');
 assert.equal(yiSoundProfile(soundVoice({key:'faust',kind:'cast',slot:'q'})),null);
});
function fakeAudio(){
 const param=()=>({value:0,events:[],setValueAtTime(v,t){this.value=v;this.events.push([v,t]);},setTargetAtTime(v,t){this.value=v;this.events.push([v,t]);},exponentialRampToValueAtTime(v,t){this.events.push([v,t]);},cancelScheduledValues(){},linearRampToValueAtTime(v,t){this.events.push([v,t]);}});
 const sources=[],retired=[];const audio={synth:{swings:{buffers:new Map([['yiShine',{duration:3.08}]])}},combat:{},context:{currentTime:0,createGain(){return{gain:param(),connect(){},disconnect(){}};},createBufferSource(){const source={playbackRate:param(),detune:param(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(t){this.stopAt=t;}};sources.push(source);return source;}},spatial(e,p){return{d:Math.hypot(e.x-p.x,e.y-p.y),gain:1,pan:(e.x-p.x)/22};},output(){return{out:{gain:param()},nodes:[{pan:param(),disconnect(){}}]};},retire(nodes,d){retired.push([nodes,d]);}};
 return{audio,sources,retired};
}
const hero=(id,x=0)=>({id,kind:'champion',alive:true,x,y:0,buffs:{ogamdo:4}});
test('multiple buffed allies share one fading sound as the nearest ally changes',()=>{
 const{audio,sources}=fakeAudio(),sound=new YiBuffAudio(audio),a=hero(1,1),b=hero(2,2),g={time:0,units:[a,b],hidden:()=>false},listener={x:0,y:0};
 sound.sync(g,listener,true);sound.sync(g,listener,true);assert.equal(sources.length,1);assert.equal(sources[0].loop,false);assert.equal(sources[0].stopAt,1.5);assert.equal(sound.field.targetId,a.id);
 a.x=10;sound.sync(g,listener,true);assert.equal(sources.length,1);assert.equal(sound.field.targetId,b.id);assert.ok(sound.field.nodes[0].pan.events.length>=3);
 assert.ok(sources[0].playbackRate.events.every(([v])=>v>=.99&&v<=1.01));
 sources[0].onended();sound.sync(g,listener,true);assert.equal(sources.length,1);assert.equal(sound.field,null);a.buffs.ogamdo=b.buffs.ogamdo=8;sound.sync(g,listener,true);assert.equal(sources.length,2);
});
test('shine stops on buff expiry, death, hidden/distant targets, pause or leaving play',()=>{
 for(const reason of ['expiry','death','hidden','distance','inactive']){
  const{audio,sources,retired}=fakeAudio(),sound=new YiBuffAudio(audio),unit=hero(1),g={time:0,units:[unit],hidden:()=>false};sound.sync(g,unit,true);assert.ok(sound.field);
  if(reason==='expiry')g.time=4;if(reason==='death')unit.alive=false;if(reason==='hidden')g.hidden=()=>true;if(reason==='distance')unit.x=50;
  sound.sync(g,{x:0,y:0},reason!=='inactive');assert.equal(sound.field,null,reason);assert.equal(sources[0].stopAt,.13);assert.equal(retired.length,0);sources[0].onended();assert.ok(sources[0].disconnected);
 }
});
test('missing shine buffer does not create a loop and can start after decoding finishes',()=>{
 const{audio,sources}=fakeAudio(),sound=new YiBuffAudio(audio),unit=hero(1),g={time:0,units:[unit]};audio.synth.swings.buffers.clear();sound.sync(g,unit,true);assert.equal(sources.length,0);
 audio.synth.swings.buffers.set('yiShine',{});sound.sync(g,unit,true);assert.equal(sources.length,1);sound.stop();sound.stop();assert.equal(sound.field,null);
});
