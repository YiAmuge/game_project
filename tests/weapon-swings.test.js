import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {SWING_SAMPLES,WeaponSwings,swingProfile,thrustProfile,impactProfile,prepareSwingBuffer} from '../src/weapon-swings.js';
import {WEAPON_VOICES,soundVoice} from '../src/sound-profiles.js';
import {SoundSynth} from '../src/sound-synth.js';
import {GameAudio} from '../src/audio.js';
function buffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:i=>data[i]};}
function context(){return {createBuffer:buffer,decodeAudioData:async()=>buffer(2,48000,48000)};}
const physical=['knife','katana','blade','axe','greatsword','scythe','glaive','claw','spear','hammer','club','mace','staff','branch','chain','shield','punch','organic','cloth','chime','glass','drill','needle','nail','coin','smoke'];
test('weapon movements vary pitch, duration and acceleration with one fixed source per weapon',()=>{
 for(const family of physical)for(let variant=0;variant<4;variant++){
  const p=swingProfile({family,cue:'weapon',variant});assert.equal(p.id,family==='spear'?'thrust':'swing',family);assert.ok(p.rates[1]>p.rates[0]&&p.rates[1]>p.rates[2]);assert.ok(p.duration>.05&&p.duration<.5);assert.ok(p.dry);
 }
 for(const [key,[family]]of Object.entries(WEAPON_VOICES))if(family!=='rifle')assert.ok(swingProfile(soundVoice({key,kind:'swing'})),key);
 const light=swingProfile({family:'knife',cue:'weapon'}),heavy=swingProfile({family:'hammer',cue:'weapon'});assert.ok(light.pitch>heavy.pitch);assert.ok(light.duration<heavy.duration);
});
test('variants change processing without changing the assigned original recording',()=>{
 for(const family of physical){
  const profiles=Array.from({length:4},(_,variant)=>swingProfile({family,cue:'weapon',variant}));assert.equal(new Set(profiles.map(p=>p.id)).size,1);assert.equal(new Set(profiles.map(p=>p.pitch)).size,4);
 }
 for(const family of ['blade','katana','axe','hammer','club','chain'])assert.equal(swingProfile({family,cue:'cast'}).id,'swing');
});
test('runtime contains movement sources and exactly the three supplied impact recordings',async()=>{
 const files=(await readdir(new URL('../src/assets/audio/',import.meta.url))).filter(p=>/\.(mp3|wav)$/.test(p));
 assert.deepEqual(files.sort(),SWING_SAMPLES.map(s=>s.file).sort());assert.equal(SWING_SAMPLES.length,9);
 assert.deepEqual(SWING_SAMPLES.filter(s=>s.id.startsWith('impact')).map(({id,file,mime})=>[id,file,mime]),[['impactSlash','Sword_Hori.wav','audio/wav'],['impactPierce','Sword_Stab.wav','audio/wav'],['impactBlunt','Sword_Vert.wav','audio/wav']]);
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
 for(const family of physical)for(const cue of ['impact','tick','charge','slam','burst','explosion','waterfall','ping','nailBreak'])assert.equal(swingProfile({family,cue}),null,`${family}/${cue}`);
 for(const family of ['rifle','pistol','shotgun','cannon','arcane','phase','radio'])for(const cue of ['weapon','cast'])assert.equal(swingProfile({family,cue}),null);
 for(const family of ['chime','glass','smoke','staff'])assert.equal(swingProfile({family,cue:'cast'}),null);
 for(const phase of ['kromer-nail-break'])assert.equal(swingProfile(soundVoice({key:'kromer',kind:'hit',phase})),null);
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
 const c=context();let loads=0,decodes=0;c.decodeAudioData=async()=>{decodes++;return buffer(2,48000,48000);};const loader=async()=>{loads++;return new ArrayBuffer(4);},a=new WeaponSwings(c,{loader}),b=new WeaponSwings(c,{loader});await Promise.all([a.ready,b.ready]);assert.equal(loads,9);assert.equal(decodes,9);assert.equal(a.buffers,b.buffers);assert.equal(a.buffers.size,9);assert.deepEqual(a.failures,[]);
});
test('a source loading failure resolves cleanly and retains a synthesized swing fallback',async()=>{
 const samples=new WeaponSwings(context(),{loader:async()=>{throw new Error('unavailable');}});await samples.ready;assert.equal(samples.buffers.size,0);assert.equal(samples.failures.length,9);assert.equal(samples.play({},soundVoice({key:'marton',kind:'swing'})),false);
 let noise=0;const synth={swings:samples,weapon:SoundSynth.prototype.weapon,element:()=>{},noise:()=>noise++,metal:()=>{},tone:()=>{},thud:()=>{}};SoundSynth.prototype.render.call(synth,{},soundVoice({key:'ryoshu',kind:'swing'}));assert.ok(noise>0);
});
test('recorded weapon movement uses one source and no additional weapon or elemental layers',()=>{
 for(const family of physical)for(const element of ['metal','fire','water','shadow']){
  let recordings=0,layers=0;const synth={swings:{play:()=>{recordings++;return true;}},weapon:()=>layers++,element:()=>layers++,tone:()=>layers++,noise:()=>layers++};SoundSynth.prototype.render.call(synth,{}, {family,cue:'weapon',element,variant:0,weight:1});assert.equal(recordings,1);assert.equal(layers,0,`${family}/${element}`);
 }
});

test('all three impact sources keep pitch, speed and duration changes subtle',()=>{
 for(const family of [...physical,'rifle','cannon','arcane'])for(let variant=0;variant<4;variant++){
  const profile=impactProfile({family,cue:'impact',variant});assert.ok(['impactSlash','impactPierce','impactBlunt'].includes(profile.id));assert.ok(Math.abs(profile.pitch)<=.300001);assert.ok(profile.rates.every(n=>n>=.97&&n<=1.03));const base=profile.id==='impactPierce'?1.20:profile.id==='impactSlash'?.69:.70;assert.ok(Math.abs(profile.duration/base-1)<=.006001);assert.ok(profile.rates[1]>profile.rates[0]&&profile.rates[1]>profile.rates[2]);assert.ok(profile.dry);
 }
 assert.notEqual(impactProfile({family:'knife',cue:'impact',variant:0}).pitch,impactProfile({family:'knife',cue:'impact',variant:3}).pitch);
 for(const cue of ['weapon','cast','tick','impale','nailBreak','explosion','ping'])assert.equal(impactProfile({family:'blade',cue}),null);
});
test('slash, piercing and blunt attacks select the requested source including shield contacts',()=>{
 const groups={impactSlash:['knife','katana','blade','axe','greatsword','scythe','glaive','claw','organic'],impactPierce:['spear','needle','nail','rifle','pistol','shotgun','cannon','drill'],impactBlunt:['hammer','club','mace','punch','shield','staff','branch','chain']};
 for(const [id,families]of Object.entries(groups))for(const family of families)for(const shielded of [false,true])assert.equal(impactProfile(soundVoice({kind:'hit',family,shielded})).id,id,`${family}/${shielded}`);
 for(const [key,slot,id]of [['jamila',undefined,'impactPierce'],['jamila','q','impactSlash'],['myo','q','impactPierce'],['kromer','r','impactPierce'],['ryoshu',undefined,'impactSlash'],['meursault',undefined,'impactBlunt'],['heathcliff','r','impactBlunt']])assert.equal(impactProfile(soundVoice({kind:'hit',key,slot,damageKind:slot?'skill':'basic'})).id,id,key);
 assert.equal(impactProfile(soundVoice({kind:'hit',key:'sora',form:'ego'})).id,'impactSlash');assert.equal(impactProfile(soundVoice({kind:'hit',key:'yan',form:'distorted'})).id,'impactBlunt');
});
test('movement gain is exactly halved for recordings and fallback without reducing impacts or firearms',()=>{
 const cases=[[{kind:'swing',key:'ryoshu'},.625],[{kind:'swing',key:'yan'},.625],[{kind:'cast',key:'yan',slot:'q'},.5],[{kind:'swing',key:'don'},.625],[{kind:'swing',key:'kromer',phase:'kromer-impale'},.5],[{kind:'hit',key:'ryoshu'},1.14],[{kind:'shot',key:'gubo'},1.25]];
 for(const loaded of [false,true])for(const [event,expected]of cases){
  const audio=new GameAudio({storage:false});let level;
  Object.assign(audio,{context:{currentTime:0,state:'running'},synth:{swings:{buffers:new Map(loaded?SWING_SAMPLES.map(s=>[s.id,{}]):[])},render(){}},output(_bus,gain){level=gain;return{out:{},nodes:[]};},retire(){}});
  assert.ok(audio.play({...event,x:0,y:0},{x:0,y:0}));assert.ok(Math.abs(level-expected)<1e-10,`${event.key}/${event.kind}/${loaded}: ${level}`);
 }
});
test('spear and lance attacks, charged casts and Kromer impales use the new thrust recording',()=>{
 for(const key of ['don','kromer','queequeg','ahab','starbuck'])assert.equal(thrustProfile(soundVoice({key,kind:'swing'})).id,'thrust');
 assert.equal(thrustProfile(soundVoice({key:'don',kind:'cast',slot:'q'})).id,'thrust');
 assert.equal(thrustProfile(soundVoice({key:'kromer',kind:'swing',slot:'r',phase:'kromer-impale'})).id,'thrust');
 assert.equal(thrustProfile(soundVoice({key:'honglu',kind:'swing'})),null);
 assert.equal(thrustProfile(soundVoice({key:'kromer',kind:'hit'})),null);
 for(let variant=0;variant<4;variant++){const p=thrustProfile({family:'spear',cue:'weapon',variant});assert.equal(p.id,'thrust');assert.ok(p.rates[1]>p.rates[0]&&p.rates[1]>p.rates[2]);}
});
test('selected sample intervals preserve stereo and native waveforms',()=>{
 const c=context(),input=buffer(2,1000,1000);for(let ch=0;ch<2;ch++)for(let i=0;i<1000;i++)input.getChannelData(ch)[i]=(i/1000)*(ch?.4:.2);
 const out=prepareSwingBuffer(c,input,{start:.13,end:.85});assert.equal(out.length,720);assert.equal(out.numberOfChannels,2);
 for(let ch=0;ch<2;ch++)assert.deepEqual(out.getChannelData(ch),input.getChannelData(ch).slice(130,850));
});
