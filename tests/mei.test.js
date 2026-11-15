import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game,damageFormula} from '../src/game.js';
import {CHAMPIONS as C,championBaseHealth,championBaseSpeed} from '../src/data.js';
import * as Mei from '../src/mei.js';
import * as Skills from '../src/skills.js';
import * as Debuffs from '../src/debuffs.js';
import * as Training from '../src/training.js';
import {skillReference} from '../src/skill-reference.js';
import {skillTargeting} from '../src/targeting.js';
import {nearestMovementAim} from '../src/mobile-aim.js';
import {SnapshotWriter,applySnapshot} from '../src/online-state.js';
import {makeOnlineGame,executeCommand} from '../src/online-game.js';
import {FRAMES,spriteHeight,drawFace} from '../src/art.js';
import {meiFistPoses,MEI_FIST_SIZE,spriteOrigin} from '../src/weapon-art.js';
import {meiEffectCenter,meiRushLean} from '../src/mei-vfx.js';
import {championGroundEffects} from '../src/overlays.js';
import {soundVoice} from '../src/sound-profiles.js';
import {recordingProfile} from '../src/weapon-swings.js';
import {combatStyle} from '../src/combat-style.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
function arena(){const g=new Game('mei','top',{mode:'training',seed:129}),p=g.player;g.units=[p];g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;Object.assign(g.practice,{lineStopped:true,pauseXp:true});Object.assign(p,{x:40,y:20,lastAttackAt:100,lastDamageAt:100,lastCombat:-99,facing:0});g.input.aim={x:50,y:20};for(const k of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};return{g,p};}
function target(g,x=43,y=20,team=1,key='faust'){const t=g.makeChampion(key,team,g.nextId,'top');Object.assign(t,{x,y,maxHp:100000,hp:100000,armor:0,lastAttackAt:100,lastDamageAt:100,attackCd:999});return t;}
const advance=(g,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120);};
const normal=(g,p,n)=>damageFormula(n,C.mei.power,1,0)*g.powerScale(p);
function ignite(g,p,t){for(let i=0;i<3;i++)g.deal(p,t,1,{fixed:true});assert.ok(t.meiBurns?.[p.id]);}
function kickReady(g,p){assert.ok(g.cast(p,'q',g.input.aim));advance(g,.2);assert.ok(Mei.recast(g,p));}

test('Mei is playable with requested stats, roles, top recommendation and precise base reload',()=>{const{g,p}=arena();assert.equal(C.mei.id,39);assert.deepEqual(C.mei.roles,['돌격','암살']);assert.equal(C.mei.recommendedPosition,'top');assert.equal(championBaseHealth('mei'),1900);assert.equal(championBaseSpeed('mei'),3.2);close(g.armor(p),40);close(g.speed(p),3.2);close(g.reloadInterval(p),.75);close(g.attackInterval(p),.15);assert.equal(g.ammoCap(p),4);});
test('passive armor increases at levels 3, 6, 9 and tactical adds its six-second level-based rate',()=>{const{g,p}=arena();for(const level of[1,2,3,5,6,9,10]){p.level=level;close(g.armor(p),40*(1+Math.floor(level/3)*.1));}p.level=6;g.cast(p,'q',g.input.aim);close(g.armor(p),40*1.32);advance(g,6.01);close(g.armor(p),48);});
test('three direct hits are counted per target; burn ticks four times and cannot perpetually proc itself',()=>{const{g,p}=arena(),a=target(g),b=target(g,44);g.deal(p,a,1,{fixed:true});g.deal(p,a,1,{fixed:true});g.deal(p,b,1,{fixed:true});assert.equal(a.meiBurns,undefined);g.deal(p,a,1,{fixed:true});const hp=a.hp;advance(g,2.01);close(hp-a.hp,120);assert.equal(a.meiBurns,undefined);assert.equal(b.meiBurns,undefined);assert.equal(p.state.meiHits[a.id],0);advance(g,2);close(hp-a.hp,120);});
test('burn samples current final armor and is cleansed, independently of another captains fire',()=>{const{g,p}=arena(),t=target(g);p.level=3;ignite(g,p,t);g.addBuff(p,'meiGuard',6);g.status(p,'armorDown',10,3,t);const hp=t.hp;advance(g,.5);close(hp-t.hp,20+(46.4-10)*.25);const other=g.makeChampion('mei',0,g.nextId,'top');other.x=38;other.y=20;ignite(g,other,t);assert.equal(Object.keys(t.meiBurns).length,2);Debuffs.cleanse(g,t);assert.equal(t.meiBurns,undefined);});
test('basic dashes to a chosen point, spends the entire remaining magazine and strikes exactly that many times',()=>{const{g,p}=arena(),t=target(g);p.ammo=2;assert.ok(g.attack(p,t));assert.equal(p.ammo,0);assert.ok(p.motion);assert.equal(g.attack(p,t),false);advance(g,.5);close(100000-t.hp,normal(g,p,350));assert.ok(p.x>40&&p.x<=43);assert.equal(g.soundEvents.filter(s=>s.phase==='mei-attack').length,2);assert.equal(p.state.meiCombo,undefined);});
test('four-round combo pauses reload and alternates fists before its last forward punch',()=>{const{g,p}=arena(),t=target(g);g.attack(p,t);advance(g,.1);assert.equal(p.ammo,0);close(p.reloadProgress,0);assert.equal(p.state.meiPunch.index,0);assert.equal(meiFistPoses(g,p).find(p=>p.active).side,'right');advance(g,.15);assert.equal(p.state.meiPunch.index,1);assert.equal(meiFistPoses(g,p).find(p=>p.active).side,'left');advance(g,.3);assert.equal(p.state.meiPunch.index,3);assert.equal(p.state.meiPunch.last,true);advance(g,.1);close(100000-t.hp,normal(g,p,700));assert.equal(p.ammo,0);advance(g,.8);assert.ok(p.ammo>=1);});
test('root and captured states reject attack and moving skills without spending ammo or cooldowns',()=>{for(const key of['root','captured']){const{g,p}=arena(),t=target(g);g.status(p,key,1,2,t);assert.equal(g.attack(p,t),false);assert.equal(g.cast(p,'q',t),false);assert.equal(g.cast(p,'r',t),false);assert.equal(p.ammo,4);assert.equal(p.qCd,0);assert.equal(p.rCd,0);}});
test('Jeongju stops on the first hostile collision and grants exactly sixty percent final armor as a two-second shield',()=>{const{g,p}=arena(),a=target(g,42.5),b=target(g,44);p.level=3;g.cast(p,'q',g.input.aim);advance(g,.2);close(100000-a.hp,normal(g,p,185));close(b.hp,100000);close(g.shield(p),46.4*.6);assert.ok(Mei.recast(g,p));assert.equal(p.qCd,0);advance(g,2.01);assert.equal(g.shield(p),0);assert.ok(p.qCd>8.7&&p.qCd<=9);});
test('whiffing Jeongju still offers a two-second recast and waiting starts its nine-second cooldown',()=>{const{g,p}=arena();kickReady(g,p);assert.ok(p.x>44.4);assert.equal(skillTargeting(g,p,'q').kind,'self');advance(g,2.01);assert.equal(Mei.recast(g,p),false);assert.ok(p.qCd>8.8);assert.equal(g.cast(p,'q',p),false);});
test('Hoichuk strikes twice, pulls enemies to her front, slows and starts cooldown at reuse',()=>{const{g,p}=arena();kickReady(g,p);const a=target(g,p.x+1.5),outside=target(g,p.x+4.5);const armor=g.armor(p);assert.ok(g.cast(p,'q',g.input.aim));close(p.qCd,9);advance(g,.2);close(100000-a.hp,normal(g,p,(66+armor*.066)*2));assert.equal(outside.hp,100000);close(g.stat(a,'slow'),.15);advance(g,.2);assert.ok(a.x>p.x);assert.ok(distance(a,p)<1.3);});
test('burning target receives thirty-percent kick slow and its own Mei burn is refreshed',()=>{const{g,p}=arena();kickReady(g,p);const a=target(g,p.x+2);ignite(g,p,a);advance(g,.2);g.cast(p,'q',g.input.aim);advance(g,.25);close(g.stat(a,'slow'),.3);assert.ok(a.meiBurns[p.id].until>g.time+1.8);});
test('normal ultimate waits 0.6 seconds, dashes 3.6 and hits once for armor-based true damage and 1.6-second stun',()=>{const{g,p}=arena(),a=target(g,42.5);a.armor=500;assert.ok(g.cast(p,'r',a));advance(g,.59);close(p.x,40);assert.equal(a.hp,100000);advance(g,.11);close(100000-a.hp,180);close(g.stat(a,'stun'),1);assert.ok(a.status.stun.until>g.time+1.5);assert.ok(p.rCd>39);});
test('ultimate misses travel exactly 3.6 and interrupted channel leaves no delayed rush',()=>{const{g,p}=arena();g.cast(p,'r',g.input.aim);advance(g,.8);close(p.x,43.6);const second=arena();second.g.cast(second.p,'r',second.g.input.aim);advance(second.g,.2);second.g.status(second.p,'silence',1,1,target(second.g));advance(second.g,1);close(second.p.x,40);assert.equal(second.p.state.meiRCharge,undefined);});
test('kick follow-up ultimate is immediate, halves range/damage/stun and refunds half the cooldown',()=>{const{g,p}=arena();kickReady(g,p);g.cast(p,'q',g.input.aim);advance(g,.15);const x=p.x,a=target(g,x+1.5);const armor=g.armor(p);g.cast(p,'r',a);assert.equal(p.state.meiRCharge,undefined);assert.ok(p.motion);close(p.rCd,20);advance(g,.1);close(100000-a.hp,(60+armor*3)*.5);assert.ok(a.status.stun.until-g.time>.7&&a.status.stun.until-g.time<=.8);assert.equal(p.state.meiRush.fast,true);});
test('kick follow-up expires after 1.3 seconds',()=>{const{g,p}=arena();kickReady(g,p);g.cast(p,'q',g.input.aim);advance(g,1.31);g.cast(p,'r',g.input.aim);assert.ok(p.state.meiRCharge);close(p.rCd,40);});
test('Golden Bough stores two ultimate casts, restores sequentially and preserves spent charges through death',()=>{const{g,p}=arena();assert.ok(g.buyAugment(p,'goldenBough'));assert.equal(Skills.skillCharges(g,p,'r').current,2);g.cast(p,'r',g.input.aim);advance(g,.8);assert.equal(Skills.skillCharges(g,p,'r').current,1);g.cast(p,'r',g.input.aim);advance(g,.8);assert.equal(Skills.skillCharges(g,p,'r').current,0);assert.equal(g.cast(p,'r',g.input.aim),false);const first=p.state.meiRReady;g.kill(p,p);assert.equal(p.state.meiRCharges,0);advance(g,first-g.time+.01);assert.equal(Skills.skillCharges(g,p,'r').current,1);});
test('Golden Bough kick combo recharges that used cast in half its normal time',()=>{const{g,p}=arena();g.buyAugment(p,'goldenBough');kickReady(g,p);g.cast(p,'q',g.input.aim);advance(g,.15);g.cast(p,'r',g.input.aim);close(p.state.meiRReady-g.time,g.cooldown(p,'r')*.5);});
test('range previews, tactical recast targeting, codex descriptions and fire/blunt audio match the skills',()=>{const{g,p}=arena(),a=target(g);g.attack(p,a);advance(g,.2);const sound=g.soundEvents.find(s=>s.phase==='mei-attack'),hit=g.soundEvents.find(s=>s.phase==='mei-hit');assert.equal(recordingProfile(soundVoice(sound)).id,'alisaFire');assert.equal(recordingProfile(soundVoice(hit)).id,'impactBlunt');assert.equal(combatStyle('mei',g,p).color,'#ff4b20');assert.equal(combatStyle('mei',g,p).accent,'#ffce39');assert.ok(nearestMovementAim(g,p,'basic'));assert.match(skillReference('mei',1).cooldown,/0.75/);assert.equal(skillReference('mei',2).sections.length,2);assert.equal(skillReference('mei',3).sections.length,2);});
test('approved latest body and both thumb-up fists use the new atlas and crown-based height',async()=>{const data=JSON.parse(await readFile(new URL('../src/assets/mei.json',import.meta.url)));assert.match(data.proportions,/Matched.*cat mouth/);assert.equal(data.handScale,1.2);close(MEI_FIST_SIZE,.36*1.2);assert.equal(FRAMES.mei.sheet,24);assert.equal(FRAMES.meiRightFist.thumb,'up');assert.equal(FRAMES.meiLeftFist.view,'palm');close(spriteHeight('mei')/FRAMES.mei.h*400,2.1);const{g,p}=arena(),poses=meiFistPoses(g,p);assert.ok(poses.every(p=>!p.active));for(const pose of poses)close(pose.y,p.y+.3+Math.sin(g.time*3+p.id)*.025-.94);assert.equal(poses[0].direction,-1);assert.equal(poses[1].direction,1);});
test('host commands accept Mei and snapshots transfer burn sources, combo poses and Golden Bough charges',()=>{const g=makeOnlineGame({seed:1,slots:[{memberId:'me',champion:'mei',team:0,position:'top',nickname:'메이'}]},'me'),p=g.player;g.training=true;g.practice={lineStopped:true,pauseXp:true};g.goldenBough=true;g.buyAugment(p,'goldenBough');assert.equal(executeCommand(g,p,{action:'cast',slot:'r',point:p}),true);const target=g.makeChampion('faust',1,1,'top');Object.assign(target,{x:p.x+2,y:p.y});ignite(g,p,target);const guest=new Game('faust','top',{mode:'training'}),packet=JSON.parse(JSON.stringify(new SnapshotWriter().capture(g,true)));assert.ok(applySnapshot(guest,packet,p.id));assert.equal(guest.player.key,'mei');assert.equal(guest.player.state.meiRCharges,1);assert.equal(guest.units.find(t=>t.id===target.id).meiBurns[p.id].source,guest.player);});

function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}

test('self-centered Hoichuk keeps the facing direction and pulls targets to that front',()=>{const{g,p}=arena();kickReady(g,p);p.facing=Math.PI;const t=target(g,p.x-2);g.cast(p,'q',p);advance(g,.4);assert.ok(t.x<p.x);close(p.state.meiKick.angle,Math.PI);});

test('changing champion clears outgoing Mei burn while keeping other Mei burns',()=>{const{g,p}=arena(),t=target(g);ignite(g,p,t);const other=g.makeChampion('mei',0,g.nextId,'top');other.x=38;other.y=20;ignite(g,other,t);Training.changeChampion(g,'faust');assert.equal(t.meiBurns[p.id],undefined);assert.ok(t.meiBurns[other.id]);});

test('skill cooldown rewinds also move the next stored ultimate recharge',()=>{const{g,p}=arena();g.buyAugment(p,'goldenBough');g.cast(p,'r',g.input.aim);const ready=p.state.meiRReady;g.rewindCooldowns(p,3);close(p.state.meiRReady,ready+3);});

test('basic hits the full circle behind and beside Mei at exactly 0.15-second intervals',()=>{
 const{g,p}=arena(),rear=target(g,38.5),side=target(g,40,21.5),out=target(g,37.8);
 g.attack(p,p);advance(g,.01);assert.equal(p.state.meiPunch.index,0);const hp=rear.hp;assert.ok(hp<100000);close(side.hp,hp);close(out.hp,100000);
 advance(g,.125);close(rear.hp,hp);advance(g,.025);assert.equal(p.state.meiPunch.index,1);close(hp-rear.hp,normal(g,p,175));
});

test('both swinging fists orbit the same moving torso pivot in opposite directions',()=>{
 const{g,p}=arena();
 for(const index of[0,1]){
  p.state.meiPunch={at:0,until:.15,index,last:false,angle:0};const angles=[];
  for(const time of[.005,.02,.04,.055]){g.time=time;p.x=40+time;const f=meiFistPoses(g,p).find(f=>f.active),origin=spriteOrigin(g,p);close(f.center.x,origin.x);close(f.center.y,origin.y-.65);close(distance(f,f.center),.74);angles.push(f.angle);}
  assert.ok(angles.every((a,i)=>!i||(index===0?a<angles[i-1]:a>angles[i-1])));
 }
});

test('idle fists angle fifteen degrees downward on both facings and the left palm is behind the body',()=>{
 const{g,p}=arena();for(const facing of[0,Math.PI]){p.facing=facing;const poses=meiFistPoses(g,p);for(const f of poses){close(Math.sin(f.angle),Math.sin(Math.PI/12));assert.equal(f.active,false);}assert.equal(poses[0].layer,'front');assert.equal(poses[1].layer,'back');}
});

test('Jeongju extends its front fist while rushing and returns both fists to idle',()=>{
 const{g,p}=arena();g.cast(p,'q',g.input.aim);advance(g,.05);assert.equal(p.motion.actionTag,'meiQ');const f=meiFistPoses(g,p).find(f=>f.side==='right'),origin=spriteOrigin(g,p);assert.ok(f.active);close(f.angle,0);assert.ok(f.x>origin.x+.45);advance(g,.2);assert.ok(meiFistPoses(g,p).every(f=>!f.active));
});

test('Hoichuk range appears only during recast; its two hits and visual field follow Mei',()=>{
 const{g,p}=arena(),rings=[],r={ctx:{},circle:(...a)=>rings.push(a)};championGroundEffects(r,p,g);assert.equal(rings.length,0);kickReady(g,p);championGroundEffects(r,p,g);close(rings[0][2],3.6);
 const castX=p.x;g.cast(p,'q',p);rings.length=0;championGroundEffects(r,p,g);assert.equal(rings.length,0);advance(g,.01);
 const floor=g.effects.find(f=>f.type==='meiFlameField'),vortex=g.effects.find(f=>f.type==='meiVortex');assert.ok(floor&&vortex);p.x+=2;const enter=target(g,p.x+3.4),leave=target(g,castX-3.4);advance(g,.12);
 close(100000-enter.hp,normal(g,p,66+g.armor(p)*.066));close(leave.hp,100000);for(const f of[floor,vortex])close(meiEffectCenter(g,f).x,p.x);advance(g,1);close(100000-enter.hp,normal(g,p,66+g.armor(p)*.066));
});

test('Cheolsango leans the head toward the dash direction only during the actual rush',()=>{
 for(const angle of[0,Math.PI,Math.PI/2,-Math.PI/2]){const{g,p}=arena();g.input.aim={x:p.x+Math.cos(angle)*10,y:p.y+Math.sin(angle)*10};g.cast(p,'r',g.input.aim);assert.deepEqual(meiRushLean(g,p),{x:0,y:0});advance(g,.62);assert.equal(p.motion.actionTag,'meiR');const lean=meiRushLean(g,p);close(lean.x,Math.cos(angle)*.12);close(lean.y,Math.sin(angle)*.08);advance(g,.2);assert.deepEqual(meiRushLean(g,p),{x:0,y:0});}
});

test('Mei shared portraits show the wider head and shoulders crop without stretching',()=>{
 const f=FRAMES.mei,[x,y,w,h]=f.face;assert.ok(w>f.w*.8&&h>f.h*.4);assert.ok(x>=0&&y>=0&&x+w<=f.w&&y+h<=f.h);let draw;const c={save(){},restore(){},drawImage(...a){draw=a;}};drawFace(c,'mei',{complete:true,naturalWidth:272},0,0,120);assert.deepEqual(draw.slice(1,5),[f.x+x,f.y+y,w,h]);close(draw[7]/draw[8],w/h);
});
