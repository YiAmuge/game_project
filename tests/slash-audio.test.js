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
 assert.deepEqual(new Set(Array.from({length:4},(_,variant)=>slashProfile({family:'blade',cue:'weapon',variant}).id)),new Set(SLASH_SAMPLES.map(s=>s.id)));
});
test('guns, blunt weapons, signals, preparation sounds and special Kromer strikes retain their own sounds',()=>{
 for(const family of ['rifle','punch','club','hammer','spear','shield','glass','organic'])assert.equal(slashProfile({family,cue:'weapon'}),null);
 for(const cue of ['cast','charge','tick','ping','impale','nailBreak'])assert.equal(slashProfile({family:'blade',cue}),null);
 for(const phase of ['kromer-impale','kromer-nail-break'])assert.equal(slashProfile(soundVoice({key:'kromer',kind:'hit',phase})),null);
});
test('decoded recordings are trimmed, mixed to mono, peak-normalized and edge-faded without changing the originals',()=>{
 const c=context(),input=buffer(2,1000,1000),spec={start:.07,end:.94};
 for(let ch=0;ch<2;ch++)for(let i=0;i<1000;i++)input.getChannelData(ch)[i]=Math.sin(i*.05)*(ch?1.8:2.4);
 const original=input.getChannelData(0).slice(),out=prepareSlashBuffer(c,input,spec),data=out.getChannelData(0);
 assert.equal(out.numberOfChannels,1);assert.equal(out.length,870);assert.ok(data[0]===0&&data.at(-1)===0);
 assert.ok(Math.max(...data.map(Math.abs))<=.820001);assert.ok(data.some(n=>Math.abs(n)>.7));assert.deepEqual(input.getChannelData(0),original);
});
test('the three sources decode once per context and are reused across synthesizers and matches',async()=>{
 const c=context();let loads=0,decodes=0;c.decodeAudioData=async()=>{decodes++;return buffer(2,48000,48000);};
 const loader=async()=>{loads++;return new ArrayBuffer(4);},a=new SlashSamples(c,{loader}),b=new SlashSamples(c,{loader});
 await Promise.all([a.ready,b.ready]);assert.equal(loads,3);assert.equal(decodes,3);assert.equal(a.buffers,b.buffers);assert.equal(a.buffers.size,3);assert.deepEqual(a.failures,[]);
});
test('recording failures resolve cleanly and allow the original synthesis fallback',async()=>{
 const samples=new SlashSamples(context(),{loader:async()=>{throw new Error('offline cache missing');}});await samples.ready;
 assert.equal(samples.buffers.size,0);assert.equal(samples.failures.length,3);assert.equal(samples.play({},soundVoice({key:'ryoshu',kind:'swing'})),false);
 let noise=0;const synth={slashes:samples,noise:()=>noise++,metal:()=>{},tone:()=>{},thud:()=>{}};
 SoundSynth.prototype.weapon.call(synth,{},soundVoice({key:'ryoshu',kind:'swing'}));assert.ok(noise>0);
 synth.slashes={play:()=>true};noise=0;SoundSynth.prototype.weapon.call(synth,{},soundVoice({key:'ryoshu',kind:'swing'}));assert.equal(noise,0);
});
