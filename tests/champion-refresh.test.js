import test from'node:test';import assert from'node:assert/strict';
import{Game}from'../src/game.js';import{initRivalries}from'../src/rivalries.js';import{SnapshotWriter,applySnapshot}from'../src/online-state.js';
import{makeOnlineGame}from'../src/online-game.js';
import{debuffBadges}from'../src/champion-update-effects.js';import{skillReference}from'../src/skill-reference.js';
import{gripLayout}from'../src/weapon-grips.js';import{weaponGeometry,WEAPON_ART,myoRiflePose,equipmentPose,drawEquipment,drawBackEquipment}from'../src/weapon-art.js';
import{soundVoice}from'../src/sound-profiles.js';import{combatStyle}from'../src/combat-style.js';import{SORA}from'../src/sora.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(key){const g=new Game(key,'top',{mode:'training',seed:103}),p=g.player;g.units=[p];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;for(const name of['aiChampion','aiNeutral','aiMinion','aiStructure'])g[name]=()=>{};Object.assign(p,{x:40,y:20,lastAttackAt:100,lastDamageAt:100});return{g,p};}
function hero(g,key='faust',team=1,x=43){const t=g.makeChampion(key,team,g.nextId);Object.assign(t,{x,y:20,hp:100000,maxHp:100000,armor:0,lastAttackAt:100,lastDamageAt:100});return t;}
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
for(const[winner,loser,reward,line]of[['kromer','sinclair','darkWorld','아아... 나의 싱클레어...!!'],['sinclair','kromer','lightWorld','그 ■■■에게, 말뚝을 쑤셔-$#^$^%^%!!!'],['dongbaek','dongrang','fullBloom','역시… 역시…!!!! 이… 이… 변절자 새끼!!!!'],['dongrang','dongbaek','fruition','자... 그만 흐드러지자, 동백.']])test(`${winner} wins its rivalry only once and keeps its permanent reward after death`,()=>{
 const{g,p}=arena(winner),t=hero(g,loser);g.training=false;initRivalries(g);const power=g.powerScale(p),q=g.cooldown(p,'q'),r=g.cooldown(p,'r');g.kill(t,p);assert.equal(p.rivalReward,reward);assert.equal(p.easterText.text,line);assert.equal(g.buff(p,reward),true);
 if(['lightWorld','darkWorld'].includes(reward))near(g.powerScale(p),power*1.05);if(reward==='fruition'){near(g.cooldown(p,'q'),q*.95);near(g.cooldown(p,'r'),r*.95);}
 const duel=g.rivalries.find(d=>d.keys.includes(winner));assert.equal(duel.winner,p.id);t.alive=true;t.hp=t.maxHp;g.kill(p,t);assert.equal(t.rivalReward,undefined);assert.equal(g.buff(p,reward),true);assert.ok(g.activeBuffs(p).some(b=>b.key===reward&&b.permanent&&b.until===Infinity));
 g.time=p.respawnAt;g.step(.01);assert.ok(p.alive);assert.equal(g.buff(p,reward),true);
 const copy=arena(winner).g;assert.ok(applySnapshot(copy,new SnapshotWriter().capture(g,true),p.id));assert.equal(copy.player.rivalReward,reward);assert.equal(copy.buff(copy.player,reward),true);assert.deepEqual(copy.rivalries,g.rivalries);
});
test('rivalries require opposing original rosters and ignore training, later spawns and environmental kills',()=>{
 for(const kind of['training','sameTeam','later','tower']){const{g,p}=arena('sinclair');if(kind!=='training')g.training=false;let t;if(kind==='later'){initRivalries(g);t=hero(g,'kromer');}else{t=hero(g,'kromer',kind==='sameTeam'?0:1);initRivalries(g);}const killer=kind==='tower'?g.entity({kind:'tower',team:0,x:40,y:20,maxHp:100}):p;g.kill(t,killer);assert.equal(p.rivalReward,undefined,kind);}
});
test('online rosters activate rivalries after actual room slots replace the temporary draft',()=>{
 const match={seed:103,slots:[{memberId:'a',team:0,position:'top',champion:'sinclair',nickname:'a'},{memberId:'b',team:1,position:'top',champion:'kromer',nickname:'b'}]},g=makeOnlineGame(match,'a'),p=g.player,t=g.champions(1)[0];assert.equal(g.rivalries[0].participants.length,2);g.kill(t,p);assert.equal(p.rivalReward,'lightWorld');
});
test('both rivalry pairs resolve independently and full bloom boosts only basic damage',()=>{
 const{g,p}=arena('dongbaek'),d=hero(g,'dongrang'),s=hero(g,'sinclair',0),k=hero(g,'kromer'),target=hero(g);g.training=false;initRivalries(g);const before=g.deal(p,target,100,{damageKind:'basic',proc:false});g.kill(d,p);const after=g.deal(p,target,100,{damageKind:'basic',proc:false}),skill=g.deal(p,target,100,{damageKind:'skill',proc:false});near(after,before*1.05);near(skill,before);g.kill(k,s);assert.equal(s.rivalReward,'lightWorld');assert.equal(g.rivalries.filter(d=>d.winner!==null).length,2);
});
test('Queequeg basic applies six thirty-damage thrusts',()=>{const{g,p}=arena('queequeg'),t=hero(g),hits=[],deal=g.deal.bind(g);g.deal=(s,t,n,o)=>{if(s===p)hits.push(n);return deal(s,t,n,o);};assert.ok(g.attack(p,t));run(g,.4);assert.deepEqual(hits,[30,30,30,30,30,30]);});
test('Marton ultimate includes base damage and thirty-five percent of actual received damage',()=>{
 for(const received of[0,200,3000]){const{g,p}=arena('marton'),t=hero(g),hits=[],deal=g.deal.bind(g);g.deal=(s,t,n,o)=>{if(s===p&&n>50)hits.push(n);return deal(s,t,n,o);};t.attackCd=999;g.cast(p,'r',p);if(received)g.deal(t,p,received,{fixed:true,proc:false});run(g,2.51);assert.deepEqual(hits,[100+received*.35]);}
});
test('EGO Sora uses full 5.6 distance even when aiming very close and stops at terrain',()=>{
 for(const wall of[false,true]){const{g,p}=arena('sora');p.buffs.soraEgo=10;p.state.egoQCharges=2;p.state.egoQReady=Infinity;if(wall)g.map.walls=[{x:43,y:18,w:1,h:4}];g.cast(p,'q',{x:40.1,y:20});near(p.motion.total,5.6);run(g,.4);assert.equal(p.motion,undefined);if(wall)assert.ok(p.x<43);else near(p.x,45.6);assert.ok(p.invulnerableUntil<=g.time);assert.equal(SORA.egoQRange,5.6);}
});
test('Kim emits body embers every 0.15 seconds only while the opponent remains impaled',()=>{
 const{g,p}=arena('kim'),t=hero(g,'faust',1,41.5),seen=new Set(),events=[];g.cast(p,'q',t);
 for(let i=0;i<260;i++){g.step(1/120);for(const f of g.effects)if(f.type==='kimEmbers'&&!seen.has(f)){seen.add(f);events.push(f);}}
 assert.ok(events.length>=10);assert.ok(events.every(f=>f.target===t.id));for(let i=1;i<events.length;i++)near(events[i].at-events[i-1].at,.15);assert.equal(p.state.swordGrab,undefined);assert.ok(g.effects.every(f=>f.type!=='kimEmbers'));
});
test('debuff badges distinguish gaze, larger contempt and active mental-whip stages',()=>{
 const{g,p}=arena('faust');p.state.gaze={1:{n:1,until:5}};p.state.contempt={1:3};p.state.mentalWhip={1:{stage:1,at:0}};let b=debuffBadges(g,p);assert.deepEqual(b.map(b=>b.kind),['gaze','contempt','whip']);assert.ok(b[1].size>b[0].size);assert.equal(b[1].border,'#e33b42');g.time=6;p.state.mentalWhip[1].stage=0;assert.deepEqual(debuffBadges(g,p),[]);
});
test('Myo recoil follows actual shots and Gubo has a separate barrel-support glove',()=>{
 const{g,p}=arena('myo'),t=hero(g);g.cast(p,'q',t);run(g,.08);assert.ok(p.state.myoShotAt>.07);assert.ok(myoRiflePose(g,p).thrust<0);run(g,.3);near(myoRiflePose(g,p).thrust,0);
 const m=weaponGeometry(...WEAPON_ART.gubo),hands=gripLayout('gubo','guboRifle',m,.3);assert.equal(hands.length,2);assert.ok(hands[1].offHand);assert.ok(hands[1].source[0]>.6);
});
test('captured champions hide both equipped and back weapons and Kromer sounds use distinct heavy stabbing cues',()=>{
 const{g,p}=arena('jamila');p.state.kromerHeldBy=42;const r={ctx:{}};assert.equal(drawEquipment(r,p,g),true);assert.equal(drawBackEquipment(r,p,g),undefined);
 for(const[phase,cue]of[['kromer-impale','impale'],['kromer-nail-break','nailBreak']]){const v=soundVoice({kind:'hit',key:'kromer',phase});assert.equal(v.cue,cue);assert.equal(v.element,'blood');assert.ok(v.weight>=1.5);}
});
test('basic palettes preserve Ryoshu primary with red accent, awakened Sinclair green and Ppui red',()=>{
 const{g,p}=arena('sinclair');g.addBuff(p,'marks',4);assert.equal(combatStyle('sinclair',g,p,{kind:'basic'}).color,'#a8dc6c');assert.equal(combatStyle('ryoshu',g,p,{kind:'basic'}).accent,'#e3545d');assert.equal(combatStyle('ppui',g,p,{kind:'projectile'}).color,'#b82e45');
});
test('current codex has the new damage and posthumous mechanics without removed restrictions',()=>{
 const p=JSON.stringify(skillReference('hohenheim',0)),b=JSON.stringify(skillReference('hohenheim',1));assert.ok(p.includes('4.5'));assert.ok(!p.includes('두 번')&&!p.includes('완충')&&!p.includes('이동·피해'));assert.ok(b.includes('90')&&b.includes('마지막 타격에 30'));
});
