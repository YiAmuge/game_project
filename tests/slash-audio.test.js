import test from 'node:test';
import assert from 'node:assert/strict';
import {SLASH_SAMPLES,SlashSamples,slashProfile,prepareSlashBuffer} from '../src/slash-samples.js';
import {soundVoice} from '../src/sound-profiles.js';
import {SoundSynth} from '../src/sound-synth.js';
function buffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:i=>data[i]};}
function context(){return {createBuffer:buffer,decodeAudioData:async()=>buffer(2,48000,48000)};}
test('cutting weapons have distinct light/heavy pitch and length, accelerating then slowing down',()=>{
 const light=slashProfile({family:'knife',cue:'weapon',variant:0}),heavy=slashProfile({family:'greatsword',cue:'weapon',variant:0});
 assert.ok(light.pitch>heavy.pitch);assert.ok(light.duration<heavy.duration);
 for(const family of ['knife','katana','blade','axe','greatsword','scythe','glaive','claw']){
  const variants=Array.from({length:4},(_,variant)=>slashProfile({family,cue:'weapon',variant}));
  assert.equal(new Set(variants.map(p=>p.pitch)).size,4);
  for(const p of variants){assert.ok(p.rates[1]>p.rates[0]&&p.rates[1]>p.rates[2]);assert.ok(p.duration>.1&&p.duration<.5);}
  const hit=slashProfile({family,cue:'impact'});assert.ok(hit.duration<variants[0].duration);assert.ok(hit.offset>0);
 }
});
test('one weapon keeps one swing recording across variants, elements, basic attacks and skill casts',()=>{
 const chosen=new Set();
 for(const family of ['knife','katana','blade','axe','greatsword','scythe','glaive','claw']){
  const ids=new Set();for(const cue of ['weapon','cast'])for(const element of ['metal','blood','water','fire'])for(let variant=0;variant<4;variant++)ids.add(slashProfile({family,cue,element,variant}).id);
  assert.equal(ids.size,1,family);chosen.add([...ids][0]);
  for(let variant=0;variant<4;variant++)assert.equal(slashProfile({family,cue:'impact',variant}).id,'flesh');
 }
 assert.deepEqual(chosen,new Set(['cut','sword','slash','metal']));
 assert.equal(slashProfile({family:'blade',cue:'weapon'}).id,'slash');
});
test('guns, blunt weapons, signals and special Kromer strikes retain their own sounds',()=>{
 for(const family of ['rifle','punch','club','hammer','spear','shield','glass','organic'])assert.equal(slashProfile({family,cue:'weapon'}),null);
 for(const cue of ['charge','tick','ping','impale','nailBreak'])assert.equal(slashProfile({family:'blade',cue}),null);
 for(const phase of ['kromer-impale','kromer-nail-break'])assert.equal(slashProfile(soundVoice({key:'kromer',kind:'hit',phase})),null);
});
test('decoded recordings are trimmed, mixed to mono, peak-normalized and edge-faded without changing the originals',()=>{
 const c=context(),input=buffer(2,1000,1000),spec={start:.07,end:.94};
 for(let ch=0;ch<2;ch++)for(let i=0;i<1000;i++)input.getChannelData(ch)[i]=Math.sin(i*.05)*(ch?1.8:2.4);
 const original=input.getChannelData(0).slice(),out=prepareSlashBuffer(c,input,spec),data=out.getChannelData(0);
 assert.equal(out.numberOfChannels,1);assert.equal(out.length,870);assert.ok(data[0]===0&&data.at(-1)===0);
 assert.ok(Math.max(...data.map(Math.abs))<=.820001);assert.ok(data.some(n=>Math.abs(n)>.7));assert.deepEqual(input.getChannelData(0),original);
});
test('all five sources decode once per context and are reused across synthesizers and matches',async()=>{
 const c=context();let loads=0,decodes=0;c.decodeAudioData=async()=>{decodes++;return buffer(2,48000,48000);};
 const loader=async()=>{loads++;return new ArrayBuffer(4);},a=new SlashSamples(c,{loader}),b=new SlashSamples(c,{loader});
 await Promise.all([a.ready,b.ready]);assert.equal(loads,5);assert.equal(decodes,5);assert.equal(a.buffers,b.buffers);assert.equal(a.buffers.size,5);assert.deepEqual(a.failures,[]);
});
test('recording failures resolve cleanly and allow the original synthesis fallback',async()=>{
 const samples=new SlashSamples(context(),{loader:async()=>{throw new Error('offline cache missing');}});await samples.ready;
 assert.equal(samples.buffers.size,0);assert.equal(samples.failures.length,5);assert.equal(samples.play({},soundVoice({key:'ryoshu',kind:'swing'})),false);
 let noise=0;const synth={slashes:samples,weapon:SoundSynth.prototype.weapon,element:()=>{},noise:()=>noise++,metal:()=>{},tone:()=>{},thud:()=>{}};
 SoundSynth.prototype.render.call(synth,{},soundVoice({key:'ryoshu',kind:'swing'}));assert.ok(noise>0);
});
test('recorded cutting swings, hits and casts play exactly one source without synthetic weapon or elemental layers',()=>{
 for(const cue of ['weapon','impact','cast'])for(const element of ['metal','fire','water','arcane','shadow']){
  let recordings=0,layers=0;const synth={slashes:{play:()=>{recordings++;return true;}},weapon:()=>layers++,element:()=>layers++,tone:()=>layers++,noise:()=>layers++};
  SoundSynth.prototype.render.call(synth,{}, {family:'blade',cue,element,variant:0,weight:1});assert.equal(recordings,1);assert.equal(layers,0,`${cue}/${element}`);
 }
});
