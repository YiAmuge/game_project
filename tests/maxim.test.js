import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game,damageFormula} from '../src/game.js';
import {CHAMPIONS,CHAMPION_ROLES,championBaseHealth,championBaseSpeed} from '../src/data.js';
import {MAXIM as P} from '../src/maxim-data.js';
import * as M from '../src/maxim.js';
import {skillReference,championReferenceStats} from '../src/skill-reference.js';
import {skillTargeting} from '../src/targeting.js';
import {MAXIM_FRAMES} from '../src/maxim-sprites.js';
import {maximWeaponPose,maximCrystalVector,equipmentPose,weaponGeometry,gripPivot,drawWeapon} from '../src/weapon-art.js';
import {MAXIM_HEAD,maximHammerPoint,maximWeaponState} from '../src/maxim-weapon.js';
import {gripLayout} from '../src/weapon-grips.js';
import {preview} from '../src/combat-visuals.js';
import {soundVoice} from '../src/sound-profiles.js';
import {recordingProfile} from '../src/weapon-swings.js';
import {DashTrails,dashAppearance} from '../src/dash-trails.js';
import {drawMaximScene} from '../src/maxim-vfx.js';
import {SnapshotWriter,applySnapshot} from '../src/online-state.js';
import {makeOnlineGame,executeCommand} from '../src/online-game.js';
import {decodePNG} from '../tools/png.mjs';

const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const run=(g,t)=>{for(let i=0;i<Math.round(t*200);i++)g.step(.005);};
function arena(){const g=new Game('maxim','top',{mode:'training',seed:119}),p=g.player;g.units=[p];g.effects=[];g.events=[];g.map={walls:[],bounds:{x:0,y:0,w:180,h:100}};g.bounds=g.map.bounds;Object.assign(g.practice,{lineStopped:true,pauseXp:true,noCooldown:false,invincible:false});Object.assign(p,{x:40,y:20,lastDamageAt:999,lastAttackAt:999});g.input.aim={x:150,y:20};g.aiChampion=g.aiMinion=g.aiNeutral=g.aiStructure=()=>{};return{g,p};}
function target(g,x=43,y=20,{champion=false,team=1,armor=0,radius=.1}={}){const t=champion?g.makeChampion('faust',team,g.nextId+10):g.entity({kind:'minion',team,x,y,range:0,radius});Object.assign(t,{x,y,hp:100000,maxHp:100000,armor,radius,lastDamageAt:999,lastAttackAt:999});return t;}
const damage=(g,p,n)=>damageFormula(n,CHAMPIONS.maxim.power,1)*g.powerScale(p);
function walkProc(g,p){const from={x:p.x,y:p.y};p.x+=7.5;M.moved(g,p,from);}
function crystal(pose){const v=maximCrystalVector(pose.headScale),o=pose.orientation,c=Math.cos(o.angle),s=Math.sin(o.angle);return{x:pose.hand.x+o.flip*(c*v.x-s*v.y),y:pose.hand.y+s*v.x+c*v.y};}

test('Maxim is a normal top-lane assault champion with the requested exact base clocks and stats',()=>{
 const{g,p}=arena();assert.equal(CHAMPIONS.maxim.name,'막심');assert.equal(CHAMPIONS.maxim.id,40);assert.deepEqual(CHAMPION_ROLES.maxim,['돌격','top']);near(championBaseHealth('maxim'),2900);near(championBaseSpeed('maxim'),4);near(p.maxHp,2900);near(g.armor(p),30);near(g.speed(p),4);near(g.ammoCap(p),3);near(g.reloadInterval(p),.9);near(g.attackInterval(p),.7);near(g.cooldown(p,'q'),11);near(g.cooldown(p,'r'),70);near(g.bonusStats(p).reload,0);
});
test('Rhino activates after 7.5 actual walking distance and reduces only ultimate cooldown',()=>{
 const{g,p}=arena();p.qCd=20;p.rCd=60;g.input.x=1;run(g,1.87);near(g.shield(p),0);run(g,.01);near(g.shield(p),72.5);near(p.qCd,20-1.88);near(p.rCd,60-1.88-5);near(g.passiveCooldown(p),4.995,.006);
});
test('Rhino gates procs for five seconds, caps its shield at fifteen percent and refreshes expiry',()=>{
 const{g,p}=arena();p.qCd=11;p.rCd=70;walkProc(g,p);near(g.shield(p),72.5);near(p.rCd,65);near(p.qCd,11);
 g.time=4.99;walkProc(g,p);near(g.shield(p),72.5);g.time=5;walkProc(g,p);near(g.shield(p),145);
 for(let i=2;i<9;i++){g.time=i*5;walkProc(g,p);}near(g.shield(p),435);near(p.shields[0].until,50);near(p.rCd,25);
 g.time=49.99;near(g.shield(p),435);g.time=50;near(g.shield(p),0);
});
test('Rhino stacks from its remaining shield, uses current max health and never makes cooldown negative',()=>{
 const{g,p}=arena();walkProc(g,p);p.shields[0].value=20;p.maxHp=4000;p.rCd=2;g.time=5;walkProc(g,p);near(g.shield(p),120);near(p.rCd,0);near(p.shields[0].until,15);
});
test('forced movement and respawn do not grant Rhino distance or shields',()=>{
 const{g,p}=arena();const from={x:p.x,y:p.y};p.x+=20;M.moved(g,p,from,{forced:true});near(g.shield(p),0);assert.equal(p.state.rhinoDistance,undefined);g.kill(p,p);p.respawnAt=g.time+.01;run(g,.02);near(g.shield(p),0);
});
test('near basic consumes one round and hits the exact forward semicircle for 200 damage',()=>{
 const{g,p}=arena(),front=target(g,41.5),side=target(g,40,21.9),back=target(g,39),far=target(g,42.2,20,{radius:.01});assert.ok(g.attack(p,{x:42,y:20}));assert.equal(p.ammo,2);assert.equal(p.motion,undefined);near(100000-front.hp,damage(g,p,200));near(100000-side.hp,damage(g,p,200));near(back.hp,100000);near(far.hp,100000);assert.equal(g.attack(p,front),false);near(p.attackCd,.7);
});
test('far basic drives through enemies, hits each once for 155 and ends at the designated distance',()=>{
 const{g,p}=arena(),a=target(g,41.5),b=target(g,43),off=target(g,42,22);assert.ok(g.attack(p,{x:44.5,y:20}));assert.equal(p.motion.actionTag,'maximBasic');run(g,.3);near(p.x,44.5,.01);near(100000-a.hp,damage(g,p,155));near(100000-b.hp,damage(g,p,155));near(off.hp,100000);assert.equal(p.ammo,2);
});
test('root blocks the dash basic without spending ammo while a near swing remains usable',()=>{
 const{g,p}=arena();g.status(p,'root',1,1,p);assert.equal(g.attack(p,{x:44,y:20}),false);assert.equal(p.ammo,3);assert.ok(g.attack(p,{x:41,y:20}));assert.equal(p.ammo,2);
});
test('normal reload restores one round every 0.9 seconds after attack recovery',()=>{
 const{g,p}=arena();g.attack(p,{x:41,y:20});run(g,1.59);assert.equal(p.ammo,2);run(g,.02);assert.equal(p.ammo,3);
});
test('rush briefly slows its startup, gains fifteen percent per tenth second and lasts seven seconds',()=>{
 const{g,p}=arena();assert.ok(g.cast(p,'q',g.input.aim));near(g.speed(p),.8);g.time=.049;near(g.speed(p),.8);g.time=.05;near(g.speed(p),4);g.time=.099;near(g.speed(p),4);g.time=.1;near(g.speed(p),4.6);g.time=1;near(g.speed(p),10);g.time=2;near(g.speed(p),16);g.time=6.9;near(g.speed(p),16);g.time=0;g.input.aim={x:179,y:20};run(g,7.01);assert.equal(p.state.maximQ,undefined);assert.equal(p.motion,undefined);near(g.speed(p),4);near(p.qCd,10.99,.01);
});
test('rush follows cursor changes and blocks other actions until released',()=>{
 const{g,p}=arena();g.cast(p,'q',g.input.aim);assert.equal(g.attack(p,{x:41,y:20}),false);assert.equal(g.cast(p,'r',g.input.aim),false);assert.equal(g.recall(p),false);run(g,.2);const x=p.x;g.input.aim={x:p.x,y:80};run(g,.2);near(p.x,x,.03);assert.ok(p.y>20.8);assert.ok(M.release(g,p));assert.equal(p.motion,undefined);assert.equal(M.release(g,p),false);near(g.speed(p),4);
});
test('rush passes minions and creeps without damaging them before champion collision',()=>{
 const{g,p}=arena(),a=target(g,42),b=target(g,44);b.kind='neutral';b.team=2;g.cast(p,'q',g.input.aim);run(g,1);assert.ok(p.x>44.8);assert.ok(M.rushing(p));near(a.hp,100000);near(b.hp,100000);
});
test('early champion collision deals distance-based area damage without stun',()=>{
 const{g,p}=arena(),t=target(g,44,20,{champion:true}),nearby=target(g,44,21.5);g.cast(p,'q',g.input.aim);run(g,1);assert.equal(p.state.maximQ,undefined);assert.equal(p.motion,undefined);assert.ok(t.hp<100000);near(t.hp,nearby.hp);near(g.stat(t,'stun'),0);const length=p.x-40;near(100000-t.hp,damage(g,p,M.rushDamage(length)),.1);
});
test('after two seconds a champion collision stuns every enemy in the impact circle for 1.5 seconds',()=>{
 const{g,p}=arena(),t=target(g,75,20,{champion:true}),nearby=target(g,75,21.5);g.cast(p,'q',g.input.aim);let guard=0;while(p.state.maximQ&&guard++<1000)g.step(.005);assert.ok(guard<1000);assert.ok(g.time>=2);near(g.stat(t,'stun'),1);near(g.stat(nearby,'stun'),1);near(t.status.stun.until-g.time,1.5);near(t.hp,nearby.hp);near(M.rushDamage(5),190);near(M.rushDamage(100),540);
});
test('walls stop the rush without an explosion or damage through terrain',()=>{
 const{g,p}=arena(),t=target(g,45);g.map.walls=[{x:42,y:18,w:.4,h:4}];g.cast(p,'q',g.input.aim);run(g,1);assert.equal(p.state.maximQ,undefined);assert.ok(p.x<42);near(t.hp,100000);assert.ok(!g.effects.some(f=>f.type==='maximImpact'));
});
test('stun and silence interrupt the rush and preserve an incoming forced motion',()=>{
 for(const status of ['stun','silence']){const{g,p}=arena();g.cast(p,'q',g.input.aim);g.status(p,status,1,1,p);run(g,.01);assert.equal(p.state.maximQ,undefined);assert.equal(p.motion,undefined);}
 const{g,p}=arena();g.cast(p,'q',g.input.aim);g.startMotion(p,{x:-1,y:0},2,{kind:'knock'});run(g,.01);assert.equal(p.state.maximQ,undefined);assert.equal(p.motion?.kind,'knock');
});
test('ultimate waits one second and hits only its twelve-unit 150-degree fan',()=>{
 const{g,p}=arena(),front=target(g,51.9,20,{radius:.01}),edge=target(g,40+8*Math.cos(74*Math.PI/180),20+8*Math.sin(74*Math.PI/180)),outside=target(g,40+8*Math.cos(76*Math.PI/180),20+8*Math.sin(76*Math.PI/180)),back=target(g,35),far=target(g,52.2,20,{radius:.01});g.cast(p,'r',g.input.aim);run(g,.995);near(front.hp,100000);run(g,.01);near(100000-front.hp,damage(g,p,750));near(100000-edge.hp,damage(g,p,750));for(const t of [outside,back,far])near(t.hp,100000);near(g.stat(front,'stun'),1);near(g.stat(front,'armorWeak'),.2);near(front.status.stun.until,3);near(p.rCd,68.995);assert.ok(!g.effects.some(f=>f.type==='slash'&&f.theme==='maxim'&&f.slot==='r'));
});
test('ultimate armor reduction lasts two seconds and interrupted windup deals no damage',()=>{
 const{g,p}=arena(),t=target(g,45,20,{armor:30});g.cast(p,'r',g.input.aim);run(g,1.005);near(g.armor(t),24);run(g,2.01);near(g.armor(t),30);
 const second=arena(),victim=target(second.g,44);second.g.cast(second.p,'r',second.g.input.aim);run(second.g,.1);second.g.status(second.p,'stun',1,1,victim);run(second.g,.5);near(victim.hp,100000);assert.equal(second.p.state.maximR,undefined);
});
test('shockwave bounds stay identical to the hit fan at every animation stage and after Maxim moves',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const{g,p}=arena();g.cast(p,'r',{x:p.x+Math.cos(angle)*12,y:p.y+Math.sin(angle)*12});run(g,1);
  const effect=g.effects.find(f=>f.type==='maximEarth'),area=effect.area;near(area.x,40);near(area.y,20);near(area.range,12);near(area.spread,150*Math.PI/180);g.effects=[effect];p.x+=10;p.y+=10;
  for(const progress of [0,.1,.5,.9]){
   effect.life=effect.maxLife*(1-progress);const points=[];let clips=0;
   const c={save(){},restore(){},beginPath(){},closePath(){},fill(){},stroke(){},clip(){clips++;},moveTo(x,y){points.push({x,y});},lineTo(x,y){points.push({x,y});}},camera={worldToScreen:p=>({x:p.x,y:p.y})};
   drawMaximScene(c,camera,g);assert.equal(clips,1);near(points[0].x,area.x);near(points[0].y,area.y);
   let farthest=0;for(const at of points){const dx=at.x-area.x,dy=at.y-area.y,r=Math.hypot(dx,dy);farthest=Math.max(farthest,r);assert.ok(r<=area.range+1e-8);if(r>1e-8)assert.ok((dx*Math.cos(area.angle)+dy*Math.sin(area.angle))/r>=Math.cos(area.spread/2)-1e-8);}
   near(farthest,area.range);
  }
 }
});
test('crystal tip leads the near swing and ram for all aim angles',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2,1.2])for(const isNear of [true,false]){const{g,p}=arena();const radius=isNear?1.5:4;g.attack(p,{x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius});g.time=.06;const body=equipmentPose(g,p),pose=maximWeaponPose(g,p,body),tip=crystal(pose),center={x:body.origin.x,y:body.origin.y-.78};near((tip.x-center.x)*Math.sin(pose.angle)-(tip.y-center.y)*Math.cos(pose.angle),0);if(isNear)near(Math.hypot(tip.x-center.x,tip.y-center.y),2);else assert.ok(Math.hypot(tip.x-center.x,tip.y-center.y)>1.5);}
});
test('ultimate raises the hammer and makes its orange crystal point contact the ground',()=>{
 for(const angle of [0,Math.PI,Math.PI/2,-Math.PI/2]){const{g,p}=arena();g.cast(p,'r',{x:p.x+Math.cos(angle)*10,y:p.y+Math.sin(angle)*10});g.time=.8;assert.equal(maximWeaponPose(g,p).part,'maxim-raise');g.time=1;const pose=maximWeaponPose(g,p),tip=crystal(pose);near(tip.x,pose.impactPoint.x);near(tip.y,pose.groundY+.02);}
});
test('ultimate downstroke starts continuously from its fully raised pose',()=>{
 const{g,p}=arena();g.cast(p,'r',g.input.aim);g.time=.919;const raised=crystal(maximWeaponPose(g,p));g.time=.92;const strike=crystal(maximWeaponPose(g,p));assert.ok(Math.hypot(raised.x-strike.x,raised.y-strike.y)<.01);
});
test('approved art has a separate asymmetric hammer, mantle body and a real orange crystal anchor',async()=>{
 const image=decodePNG(await readFile(new URL('../src/assets/maxim.png',import.meta.url))),frame=MAXIM_FRAMES.maximHammer;assert.equal(MAXIM_FRAMES.maxim.sheet,25);assert.equal(MAXIM_FRAMES.maxim.heightBasis,'crown');assert.equal(frame.rotation,0);const x=frame.x+Math.round(frame.w*.84),y=frame.y+Math.round(frame.h*.985);let orange=false;for(let yy=y-3;yy<=y+3;yy++)for(let xx=x-3;xx<=x+3;xx++){const a=(yy*image.width+xx)*4;if(image.data[a]>160&&image.data[a+1]>60&&image.data[a+2]<150&&image.data[a+3]>160)orange=true;}assert.ok(orange);
});
test('rush appearance records orange full-size afterimages and longer history while retaining old dash defaults',()=>{
 const{g,p}=arena();g.cast(p,'q',g.input.aim);const look=dashAppearance(g,p);assert.equal(look.color,'#f2a145');assert.equal(look.fullSize,true);const trails=new DashTrails();for(let i=0;i<16;i++){run(g,.03);trails.sync(g);}assert.equal(trails.histories.get(p).samples.length,10);M.release(g,p);run(g,.2);trails.sync(g);assert.ok(trails.histories.get(p));run(g,.11);trails.sync(g);assert.equal(trails.histories.get(p),undefined);
});
test('codex, targeting, portraits and exact clocks expose the complete Maxim kit',()=>{
 const{g,p}=arena();for(let i=0;i<4;i++){const r=skillReference('maxim',i);assert.ok(r.title&&r.summary&&r.details);}assert.match(skillReference('maxim',0).cooldown,/5초/);assert.match(skillReference('maxim',1).cooldown,/0.9초.*0.7초/);assert.match(skillReference('maxim',2).details,/최대 420/);assert.match(skillReference('maxim',3).ranges[0].text,/12.*150/);near(championReferenceStats('maxim').speed,4);near(skillTargeting(g,p,'r').radius,150*Math.PI/180);
});
test('online host owns starting, steering, releasing and snapshotting the rush',()=>{
 const g=makeOnlineGame({seed:123,slots:[{memberId:'h',team:0,position:'top',champion:'maxim'},{memberId:'p',team:1,position:'top',champion:'faust'}]},'h'),p=g.player;Object.assign(p,{x:40,y:20});g.units=[p];g.map={walls:[],bounds:{x:0,y:0,w:180,h:100}};g.bounds=g.map.bounds;g.input.aim={x:100,y:20};assert.ok(executeCommand(g,p,{action:'cast',slot:'q',point:g.input.aim}));run(g,.2);const packet=JSON.parse(JSON.stringify(new SnapshotWriter().capture(g,true))),guest=arena().g;assert.ok(applySnapshot(guest,packet,p.id));assert.ok(guest.player.state.maximQ);assert.equal(guest.player.motion.phaseCreeps,true);near(guest.player.x,p.x);assert.ok(executeCommand(g,p,{action:'releaseTactical',point:{x:100,y:20}}));assert.equal(p.state.maximQ,undefined);
});

test('rush cooldown waits through the rush and starts once on release, interruption, collision or death',()=>{
 for(const ending of ['release','stun','wall','champion','death']){
  const{g,p}=arena();g.cast(p,'q',g.input.aim);run(g,.3);near(p.qCd,0);
  if(ending==='release')M.release(g,p);
  if(ending==='death')g.kill(p,p);
  if(ending==='stun'){g.status(p,'stun',1,1,p);run(g,.005);}
  if(ending==='wall'){g.map.walls=[{x:p.x+.49,y:p.y-2,w:.4,h:4}];run(g,.005);}
  if(ending==='champion'){target(g,p.x+.59,p.y,{champion:true});run(g,.005);}
  assert.equal(p.state.maximQ,undefined,ending);near(p.qCd,11,.006);assert.equal(M.stop(g,p),false);run(g,.1);near(p.qCd,10.9,.006);
 }
});
test('only the ultimate gains a second hand, enlarges the head and fades the electric form smoothly',()=>{
 const{g,p}=arena(),m=weaponGeometry('maximHammer',2.35),pivot=gripPivot('maxim'),count=()=>gripLayout('maxim','maximHammer',m,pivot,maximWeaponState(g,p).hands).length;
 assert.equal(count(),1);g.attack(p,{x:41,y:20});assert.equal(count(),1);p.attackCd=0;g.cast(p,'q',g.input.aim);assert.equal(count(),1);M.release(g,p);
 g.cast(p,'r',g.input.aim);near(maximWeaponState(g,p).headScale,1);g.time=.11;near(maximWeaponState(g,p).headScale,1.1);assert.equal(count(),2);g.time=.22;near(maximWeaponState(g,p).headScale,1.2);
 g.time=.995;run(g,.005);assert.ok(p.state.maximSlam);g.time=1.2;near(maximWeaponState(g,p).headScale,1.1);g.time=1.32;near(maximWeaponState(g,p).headScale,1);assert.equal(count(),1);
});
test('an interrupted raise smoothly restores the normal hammer and one hand',()=>{
 const{g,p}=arena();g.cast(p,'r',g.input.aim);run(g,.11);const grown=maximWeaponState(g,p).headScale;g.status(p,'stun',1,1,p);run(g,.005);const atCancel=maximWeaponState(g,p).headScale;assert.ok(Math.abs(atCancel-grown)<.01);run(g,.09);assert.ok(maximWeaponState(g,p).headScale<atCancel);run(g,.1);near(maximWeaponState(g,p).headScale,1);assert.equal(maximWeaponState(g,p).hands,1);
});
test('head enlargement preserves shaft and pommel geometry and the actual drawn crystal contact',()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;globalThis.Image=class{complete=true;naturalWidth=2048;};globalThis.document={getElementById:()=>null};
 try{for(const scale of [1,1.05,1.1,1.2]){
  const m=weaponGeometry('maximHammer',2.35),f=m.frame,calls=[],c={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(image,...rect){calls.push(rect);}};
  drawWeapon(c,'maximHammer',2.35,{pivot:.17,headScale:scale});
  for(const point of [[.02,.475],[.17,.475],[.33,.475],[.84,.985]]){
   const sx=point[0]*f.w,sy=point[1]*f.h,rect=calls.find(r=>sx>=r[0]-f.x&&sx<=r[0]-f.x+r[2]),[u,v]=maximHammerPoint(point,scale);
   near(rect[4]+(sx-(rect[0]-f.x))/rect[2]*rect[6],u*f.w-f.w/2);near(rect[5]+sy/rect[3]*rect[7],v*f.h-f.h/2);
   if(sx<MAXIM_HEAD.joint)assert.deepEqual([u,v],point);
  }
  if(scale>1){near(calls[1][6]/calls[1][2],scale);near(calls[1][7]/calls[1][3],scale);near(calls[0][6]/calls[0][2],1);}
 }}finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
test('basic guide separates both ranges without drawing a dash-area polygon or an arrival ring',()=>{
 const{g,p}=arena(),circles=[],c={setLineDash(){}};preview({ctx:c,circle(x,y,r){circles.push(r);},polygon(){assert.fail('dash area should not be drawn');}},p,g);assert.deepEqual(circles,[2,4.5]);g.attack(p,{x:44.5,y:20});run(g,.3);
 let rings=0;drawMaximScene({save(){},restore(){},fillRect(){},beginPath(){rings++;}}, {worldToScreen:p=>p},g);assert.equal(rings,0);
});
test('rush collision reuses Heathcliff landing audio and the ultimate delivers a stronger version at impact',()=>{
 const{g,p}=arena();target(g,44,20,{champion:true});g.soundEvents=[];g.cast(p,'q',g.input.aim);run(g,1);const hits=g.soundEvents.filter(e=>e.kind==='slam');assert.equal(hits.length,1);const q=recordingProfile(soundVoice(hits[0]));assert.equal(q.id,'groundImpact');
 const heath=recordingProfile(soundVoice({...hits[0],key:'heathcliff',phase:'heath-landing'}));assert.deepEqual(q,heath);
 g.soundEvents=[];g.cast(p,'r',g.input.aim);run(g,.995);assert.ok(!g.soundEvents.some(e=>e.kind==='slam'));run(g,.01);const slams=g.soundEvents.filter(e=>e.kind==='slam');assert.equal(slams.length,1);const r=recordingProfile(soundVoice(slams[0]));assert.equal(r.id,'groundImpact');assert.ok(r.gain>q.gain);assert.ok(r.duration>q.duration);
});
