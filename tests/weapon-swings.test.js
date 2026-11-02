import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {SWING_SAMPLES,WeaponSwings,swingProfile,impactProfile,prepareSwingBuffer} from '../src/weapon-swings.js';
import {WEAPON_VOICES,soundVoice} from '../src/sound-profiles.js';
import {SoundSynth} from '../src/sound-synth.js';
function buffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:i=>data[i]};}
function context(){return {createBuffer:buffer,decodeAudioData:async()=>buffer(2,48000,48000)};}
const physical=['knife','katana','blade','axe','greatsword','scythe','glaive','claw','spear','hammer','club','mace','staff','branch','chain','shield','punch','organic','cloth','chime','glass','drill','needle','nail','coin','smoke'];
test('all weapon movement uses the new whoosh, including blunt weapons, spears and fists',()=>{
 for(const family of physical)for(let variant=0;variant<4;variant++){
  const p=swingProfile({family,cue:'weapon',variant});assert.equal(p.id,'swing',family);assert.ok(p.rates[1]>p.rates[0]&&p.rates[1]>p.rates[2]);assert.ok(p.duration>.05&&p.duration<.5);
 }
 for(const [key,[family]]of Object.entries(WEAPON_VOICES))if(family!=='rifle')assert.ok(swingProfile(soundVoice({key,kind:'swing'})),key);
 const light=swingProfile({family:'knife',cue:'weapon'}),heavy=swingProfile({family:'hammer',cue:'weapon'});assert.ok(light.pitch>heavy.pitch);assert.ok(light.duration<heavy.duration);
});
test('pitch and length vary while every weapon and supported physical cast keeps the same source',()=>{
 for(const family of physical){
  const variants=Array.from({length:4},(_,variant)=>swingProfile({family,cue:'weapon',variant}));assert.equal(new Set(variants.map(p=>p.pitch)).size,4);
  for(const element of ['metal','blood','fire','water','shadow'])for(const p of variants)assert.equal(swingProfile({family,cue:'weapon',element}).id,p.id);
 }
 for(const family of ['blade','katana','axe','spear','hammer','club','chain'])assert.equal(swingProfile({family,cue:'cast'}).id,'swing');
});
test('runtime loads the shared whoosh, Yan greatsword and one pre-mixed impact',async()=>{
 const files=(await readdir(new URL('../src/assets/audio/',import.meta.url))).filter(p=>/\.(mp3|wav)$/.test(p));
 assert.deepEqual(files.sort(),['daviddumaisaudio-sword-slash-with-metallic-impact-185435.mp3','floraphonic-swing-whoosh-weapon-3-189823.mp3','mixed-impact.wav']);assert.equal(SWING_SAMPLES.length,3);assert.deepEqual(SWING_SAMPLES.map(s=>s.file).sort(),files);
});
test('only base-form Yan greatsword swings and casts select his dedicated recording',()=>{
 for(const kind of ['swing','cast'])for(let variant=0;variant<4;variant++){
  const event={key:'yan',kind,variant,...(kind==='cast'?{slot:'q'}:{})};const voice=soundVoice(event);assert.equal(voice.key,'yan');assert.equal(voice.form,'base');assert.equal(swingProfile(voice).id,'yanGreatsword');
 }
 assert.equal(swingProfile(soundVoice({key:'yan',kind:'swing',form:'distorted'})).id,'swing');
 assert.equal(swingProfile(soundVoice({key:'faust',kind:'swing',family:'greatsword'})).id,'swing');
 assert.equal(swingProfile(soundVoice({key:'yan',kind:'hit'})),null);
 assert.equal(swingProfile(soundVoice({key:'yan',kind:'ultimate',slot:'r',transforming:true})),null);
});
test('firearms, magic activation and special cues retain their own synthesis',()=>{
 for(const family of physical)for(const cue of ['impact','tick','charge','slam','burst','explosion','waterfall','ping','impale','nailBreak'])assert.equal(swingProfile({family,cue}),null,`${family}/${cue}`);
 for(const family of ['rifle','pistol','shotgun','cannon','arcane','phase','radio'])for(const cue of ['weapon','cast'])assert.equal(swingProfile({family,cue}),null);
 for(const family of ['chime','glass','smoke','staff'])assert.equal(swingProfile({family,cue:'cast'}),null);
 for(const phase of ['kromer-impale','kromer-nail-break'])assert.equal(swingProfile(soundVoice({key:'kromer',kind:'hit',phase})),null);
 let impacts=0,recordings=0;const synth={swings:{play:(_,v)=>{if(swingProfile(v))recordings++;return false;}},weapon:(_,v,impact)=>{assert.equal(impact,true);impacts++;},element:()=>{}};
 SoundSynth.prototype.render.call(synth,{},soundVoice({key:'ryoshu',kind:'hit'}));assert.equal(impacts,1);assert.equal(recordings,0);
});
test('decoded whoosh is mono, trimmed, normalized and edge-faded without altering the original',()=>{
 const c=context(),input=buffer(2,1000,1000),spec={start:.07,end:.94};for(let ch=0;ch<2;ch++)for(let i=0;i<1000;i++)input.getChannelData(ch)[i]=Math.sin(i*.05)*(ch?1.8:2.4);
 const original=input.getChannelData(0).slice(),out=prepareSwingBuffer(c,input,spec),data=out.getChannelData(0);assert.equal(out.numberOfChannels,1);assert.equal(out.length,870);assert.ok(data[0]===0&&data.at(-1)===0);assert.ok(Math.max(...data.map(Math.abs))<=.820001);assert.ok(data.some(n=>Math.abs(n)>.7));assert.deepEqual(input.getChannelData(0),original);
});
test('each source decodes once per audio context and is reused across matches',async()=>{
 const c=context();let loads=0,decodes=0;c.decodeAudioData=async()=>{decodes++;return buffer(2,48000,48000);};const loader=async()=>{loads++;return new ArrayBuffer(4);},a=new WeaponSwings(c,{loader}),b=new WeaponSwings(c,{loader});await Promise.all([a.ready,b.ready]);assert.equal(loads,3);assert.equal(decodes,3);assert.equal(a.buffers,b.buffers);assert.equal(a.buffers.size,3);assert.deepEqual(a.failures,[]);
});
test('a source loading failure resolves cleanly and retains a synthesized swing fallback',async()=>{
 const samples=new WeaponSwings(context(),{loader:async()=>{throw new Error('unavailable');}});await samples.ready;assert.equal(samples.buffers.size,0);assert.equal(samples.failures.length,3);assert.equal(samples.play({},soundVoice({key:'marton',kind:'swing'})),false);
 let noise=0;const synth={swings:samples,weapon:SoundSynth.prototype.weapon,element:()=>{},noise:()=>noise++,metal:()=>{},tone:()=>{},thud:()=>{}};SoundSynth.prototype.render.call(synth,{},soundVoice({key:'ryoshu',kind:'swing'}));assert.ok(noise>0);
});
test('recorded weapon movement uses one source and no additional weapon or elemental layers',()=>{
 for(const family of physical)for(const element of ['metal','fire','water','shadow']){
  let recordings=0,layers=0;const synth={swings:{play:()=>{recordings++;return true;}},weapon:()=>layers++,element:()=>layers++,tone:()=>layers++,noise:()=>layers++};SoundSynth.prototype.render.call(synth,{}, {family,cue:'weapon',element,variant:0,weight:1});assert.equal(recordings,1);assert.equal(layers,0,`${family}/${element}`);
 }
});

test('normal impacts use one baked mix with pitch, length and speed changes for weapon weight',()=>{
 for(const family of [...physical,'rifle','cannon','arcane'])for(let variant=0;variant<4;variant++){
  const profile=impactProfile({family,cue:'impact',variant});assert.equal(profile.id,'impactMix');assert.ok(profile.rates[1]>profile.rates[0]&&profile.rates[1]>profile.rates[2]);
 }
 const light=impactProfile({family:'knife',cue:'impact'}),heavy=impactProfile({family:'hammer',cue:'impact'});assert.ok(light.pitch>heavy.pitch);assert.ok(light.duration<heavy.duration);
 for(const cue of ['weapon','cast','tick','impale','nailBreak','explosion','ping'])assert.equal(impactProfile({family:'blade',cue}),null);
 const spec=SWING_SAMPLES.find(s=>s.id==='impactMix');assert.equal(spec.file,'mixed-impact.wav');assert.equal(spec.mime,'audio/wav');
 assert.ok(SWING_SAMPLES.every(s=>!s.file.includes('slashkut')&&!s.file.includes('flesh-impact')));
});
