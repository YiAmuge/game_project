import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {SWING_SAMPLES,WeaponSwings,swingProfile,impactProfile,prepareSwingBuffer} from '../src/weapon-swings.js';
import {WEAPON_VOICES,soundVoice} from '../src/sound-profiles.js';
import {SoundSynth} from '../src/sound-synth.js';
function buffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:i=>data[i]};}
function context(){return {createBuffer:buffer,decodeAudioData:async()=>buffer(2,48000,48000)};}
const physical=['knife','katana','blade','axe','greatsword','scythe','glaive','claw','spear','hammer','club','mace','staff','branch','chain','shield','punch','organic','cloth','chime','glass','drill','needle','nail','coin','smoke'];
test('all weapon movement keeps the supplied pitch, speed and complete length',()=>{
 for(const family of physical)for(let variant=0;variant<4;variant++){
  const p=swingProfile({family,cue:'weapon',variant});assert.equal(p.id,'swing',family);assert.equal(p.pitch,0);assert.deepEqual(p.rates,[1,1,1]);assert.equal(p.fullLength,true);assert.equal(p.dry,true);
 }
 for(const [key,[family]]of Object.entries(WEAPON_VOICES))if(family!=='rifle')assert.ok(swingProfile(soundVoice({key,kind:'swing'})),key);
});
test('variants and weapon weight do not reshape the original recording',()=>{
 for(const family of physical){
  const profiles=Array.from({length:4},(_,variant)=>swingProfile({family,cue:'weapon',variant}));for(const profile of profiles)assert.deepEqual(profile,profiles[0]);
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
test('decoded recordings preserve stereo, all samples and timing, with attenuation only for overshoot',()=>{
 const c=context(),input=buffer(2,1000,1000);
 for(let ch=0;ch<2;ch++)for(let i=0;i<1000;i++)input.getChannelData(ch)[i]=Math.sin(i*.05)*(ch?.4:.2);
 const original=input.getChannelData(0).slice(),out=prepareSwingBuffer(c,input);
 assert.equal(out.numberOfChannels,2);assert.equal(out.length,1000);assert.equal(out.sampleRate,1000);
 for(let ch=0;ch<2;ch++)assert.deepEqual(out.getChannelData(ch),input.getChannelData(ch));assert.deepEqual(input.getChannelData(0),original);
 input.getChannelData(1)[500]=1.5;const safe=prepareSwingBuffer(c,input);assert.ok(Math.max(...safe.getChannelData(1))<=.950001);assert.equal(input.getChannelData(1)[500],1.5);
 assert.ok(Math.abs(safe.getChannelData(0)[100]-input.getChannelData(0)[100]*(.95/1.5))<1e-7);
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

test('normal impacts preserve the complete baked mix at original pitch and speed',()=>{
 for(const family of [...physical,'rifle','cannon','arcane'])for(let variant=0;variant<4;variant++){
  const profile=impactProfile({family,cue:'impact',variant});assert.equal(profile.id,'impactMix');assert.equal(profile.pitch,0);assert.deepEqual(profile.rates,[1,1,1]);assert.equal(profile.fullLength,true);assert.equal(profile.dry,true);
 }
 const light=impactProfile({family:'knife',cue:'impact'}),heavy=impactProfile({family:'hammer',cue:'impact'});assert.deepEqual(light,heavy);
 for(const cue of ['weapon','cast','tick','impale','nailBreak','explosion','ping'])assert.equal(impactProfile({family:'blade',cue}),null);
 const spec=SWING_SAMPLES.find(s=>s.id==='impactMix');assert.equal(spec.file,'mixed-impact.wav');assert.equal(spec.mime,'audio/wav');
 assert.ok(SWING_SAMPLES.every(s=>!s.file.includes('slashkut')&&!s.file.includes('flesh-impact')));
});
