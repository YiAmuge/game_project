"""Real Web Audio playback, offline waveform checks and positional waterfall cleanup."""
import base64,json,os,wave
from pathlib import Path
import numpy as np
from playwright.sync_api import sync_playwright,expect

root=Path(__file__).resolve().parents[1]
art=root/'artifacts'/'v61-audio';art.mkdir(parents=True,exist_ok=True)
offline=os.environ.get('MOBA_OFFLINE')=='1'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 p=b.new_page(viewport={'width':1440,'height':950});errors=[];requests=[]
 p.on('pageerror',lambda e:(errors.append(str(e)),print(str(e),flush=True)));p.on('request',lambda r:requests.append(r.url))
 if offline:
  p.route('http*://**/*',lambda r:r.abort())
  html=(root/'dist/city-border.html').read_text().replace('if (new URLSearchParams(location.search).has("debug"))','if (true)')
  p.set_content(html,wait_until='networkidle',timeout=60000)
 else:p.goto('http://127.0.0.1:5180/?debug=1',wait_until='networkidle')
 p.click('#training-open');p.click('#start')
 p.wait_for_function('__moba.audio.context?.state==="running"')
 p.evaluate('''()=>{const g=__moba.game;window.step61=g.step.bind(g);g.step=()=>{};
 window.advance61=s=>{for(let n=0;n<Math.round(s*120);n++)step61(1/120);};
 g.practice.lineStopped=true;g.units=[g.player];g.events=[];g.projectiles=[];g.effects=[];g.zones=[];g.pending=[];
 g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;
 g.aiChampion=g.aiMinion=g.aiNeutral=g.aiStructure=()=>{};Object.assign(g.player,{x:40,y:25});}''')
 # A new source per event avoids suppressing separate combatants.
 result=p.evaluate('''async()=>{const a=__moba.audio,p=__moba.game.player,heard=[];a.history=[];
 const cases=[['hohenheim'],['rudolph'],['ryoshu'],['marton'],['meursault'],['gubo'],['gregor'],['yi'],['dongbaek'],['rodya','r'],['rodya','q'],['honglu','r'],['sora',null,'ego'],['yan',null,'distorted']];
 for(const [i,[key,slot,form]]of cases.entries()){const ok=a.play({kind:slot?'cast':'swing',key,slot,form,sourceKind:'champion',sourceId:1000+i,x:p.x,y:p.y},p);heard.push(ok);await new Promise(r=>setTimeout(r,90));}
 return {heard,history:a.history};}''')
 assert all(result['heard']),result
 assert len({v['element']for v in result['history']})>=9,result
 variants=p.evaluate('''async()=>{const a=__moba.audio,p=__moba.game.player;a.history=[];for(let i=0;i<4;i++){a.play({kind:'swing',key:'nelly',sourceKind:'champion',sourceId:2000,x:p.x,y:p.y},p);await new Promise(r=>setTimeout(r,90));}return a.history.map(v=>v.variant);}''')
 assert len(set(variants))==4,variants
 assert p.evaluate('''()=>{const a=__moba.audio,n=a.played;return !a.play({kind:'swing',sourceKind:'minion'},__moba.game.player)&&a.played===n;}''')
 # The actual game emitter reaches the mixer and uses the signal bus.
 p.evaluate('__moba.game.emitSound("ping",__moba.game.player,{ping:"danger"})')
 p.wait_for_function('__moba.audio.history.some(e=>e.kind==="ping")');p.wait_for_timeout(80)
 assert p.evaluate('__moba.audio.combat.gain.value<1')
 # Waterfall follows its zone, fades on expiry and stops on leaving a match.
 p.evaluate('''()=>{const g=__moba.game;g.zones=[{kind:'waterfall',source:g.player,x:42,y:25,r:6.5,d:{x:1,y:0},until:g.time+4}];}''')
 p.wait_for_function('__moba.audio.fields.size===1')
 pan=p.evaluate('''()=>{const a=__moba.audio;return [...a.fields.values()][0].nodes.find(n=>n.pan).pan.value;}''')
 p.evaluate('__moba.game.zones[0].x=32');p.wait_for_timeout(300)
 assert p.evaluate('[...__moba.audio.fields.values()][0].nodes.find(n=>n.pan).pan.value')<pan
 p.click('#sound-toggle');expect(p.locator('#sound-toggle')).to_have_attribute('aria-pressed','false');p.wait_for_timeout(250)
 assert p.evaluate('__moba.audio.master.gain.value<.01')
 p.click('#sound-toggle');p.wait_for_timeout(250);assert p.evaluate('__moba.audio.master.gain.value>.3')
 p.evaluate('__moba.game.zones[0].until=__moba.game.time');p.wait_for_function('__moba.audio.fields.size===0')
 p.evaluate('''()=>{const g=__moba.game,a=__moba.audio;g.zones=[{kind:'waterfall',source:g.player,x:42,y:25,r:6.5,d:{x:1,y:0},until:g.time+4}];a.sync(g,{playing:true});a.sync(g,{playing:false});window.fieldsStopped61=a.fields.size===0;g.zones=[];}''')
 assert p.evaluate('fieldsStopped61')
 # Render the same synthesizer offline; no audio/network assets are needed.
 samples=p.evaluate('''async()=>{const Audio=__moba.audio.constructor,rate=22050,results=[];
 const cases=[['slash',{kind:'swing',key:'ryoshu'}],['slash-variant',{kind:'swing',key:'ryoshu',variant:3}],['heavy-hit',{kind:'hit',key:'marton'}],['punch',{kind:'hit',key:'meursault'}],['rifle',{kind:'shot',key:'gubo'}],['electric',{kind:'swing',key:'rudolph'}],['glass',{kind:'swing',key:'yi'}],['ice',{kind:'shot',key:'rodya',slot:'r'}],['chain',{kind:'cast',key:'meursault',slot:'q'}],['petals',{kind:'cast',key:'dongbaek',slot:'q'}],['organic',{kind:'swing',key:'gregor'}],['alisa-explosion',{kind:'explosion',key:'alisa',phase:'alisa-detonation'}],['outis-shotgun',{kind:'explosion',key:'outis',phase:'outis-shotgun'}],['tower-explosion',{kind:'explosion',sourceKind:'tower',element:'stone'}],['attack-ping',{kind:'ping',ping:'attack'}],['retreat-brass',{kind:'ping',ping:'danger'}],['waterfall-loop',null],['crowded-combat',null],['muted',null]];
 for(const[name,event]of cases){const c=new OfflineAudioContext(2,rate*2,rate),a=new Audio({context:c,storage:false});
  if(event)a.play({...event,x:0,y:0},{x:0,y:0});
  else if(name==='waterfall-loop'){const f=a.synth.field(a.ambience);f.stop(.9);}
  else if(name==='crowded-combat'){for(let i=0;i<40;i++)a.play({kind:'swing',key:'marton',sourceKind:'champion',sourceId:3000+i},{x:0,y:0});if(a.played>11||!a.play({kind:'ping',ping:'danger'},{x:0,y:0}))throw new Error('combat budget suppressed the warning');}
  else{a.enabled=false;a.play({kind:'swing',key:'ryoshu'},{x:0,y:0});}
  const rendered=await c.startRendering(),data=rendered.getChannelData(0),bytes=new Uint8Array(data.buffer);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));results.push({name,rate,data:btoa(s)});}
 return results;}''')
 waves={};stats={}
 for s in samples:
  data=np.frombuffer(base64.b64decode(s['data']),dtype='<f4');rate=s['rate'];waves[s['name']]=data
  assert np.isfinite(data).all(),s['name']
  peak=float(np.max(np.abs(data)));rms=float(np.sqrt(np.mean(data**2)))
  if s['name']=='muted':assert peak==0
  else:assert .0004<rms<.2 and peak<.99,(s['name'],rms,peak)
  segment=data[int(.04*rate):int(.25*rate)];spectrum=np.abs(np.fft.rfft(segment*np.hanning(len(segment))));freq=np.fft.rfftfreq(len(segment),1/rate)
  centroid=float(np.sum(spectrum*freq)/max(np.sum(spectrum),1e-9));dominant=float(freq[np.argmax(spectrum)])
  stats[s['name']]={'rms':round(rms,5),'peak':round(peak,4),'dominantHz':round(dominant),'centroidHz':round(centroid)}
  with wave.open(str(art/f"{s['name']}.wav"),'wb')as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
 assert stats['retreat-brass']['dominantHz']<650,stats['retreat-brass']
 assert stats['retreat-brass']['centroidHz']<stats['attack-ping']['centroidHz'],stats
 assert stats['heavy-hit']['centroidHz']<stats['slash']['centroidHz'],stats
 assert np.corrcoef(waves['slash'],waves['slash-variant'])[0,1]<.95
 rms=lambda data,a,b:float(np.sqrt(np.mean(data[int(a*rate):int(b*rate)]**2)))
 assert rms(waves['waterfall-loop'],.5,.8)>.002
 assert stats['waterfall-loop']['rms']<stats['retreat-brass']['rms']*.9
 assert rms(waves['waterfall-loop'],1.5,1.8)<rms(waves['waterfall-loop'],.5,.8)*.02
 assert rms(waves['attack-ping'],.7,.85)>.00001
 assert not errors,errors
 if offline:assert not requests,requests
 (art/'analysis.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2))
 print(json.dumps({'offline':offline,'championPalettes':True,'fourVariants':True,'positionalWaterfall':True,'mute':True,'retreatBrass':stats['retreat-brass'],'waveforms':len(samples),'errors':errors},ensure_ascii=False))
 b.close()
