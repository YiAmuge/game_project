import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import{gestureMode,HOLD}from'../src/mobile-gestures.js';
import{mobileAutoAim,rememberManualAim}from'../src/mobile-aim.js';
import{attackGuideOpacity}from'../src/attack-guide.js';
import{mobileStatusEntries}from'../src/mobile-status.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function arena(key='rudolph'){
 const g=new Game(key,'bottom',{mode:'training',seed:67}),p=g.player;g.units=[p];g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;Object.assign(p,{x:40,y:25,lastAttackAt:-99,lastDamageAt:-99,lastCombat:-99,attackAt:-99});g.input={x:0,y:0,aim:{x:45,y:25},fire:false};return{g,p};
}
function foe(g,x=44,y=25){const t=g.makeChampion('faust',1,30);Object.assign(t,{x,y,lastAttackAt:-99,lastDamageAt:-99,lastCombat:-99,attackAt:-99});return t;}
test('charged autoaim remains steerable after a stationary hold, while short slides remain auto taps',()=>{
 const s={at:0,startX:10,startY:10,x:10,y:10};assert.equal(gestureMode(s,HOLD,true,true),'auto');assert.ok(!s.autoLocked);s.x=40;assert.equal(gestureMode(s,HOLD+100,true,true),'manual');const quick={...s,at:0};assert.equal(gestureMode(quick,HOLD-1,true,true),'tap');
});
test('an auto lock created earlier cannot prevent the charge exception from steering',()=>{
 const s={at:0,startX:10,startY:10,x:50,y:10,autoLocked:true};assert.equal(gestureMode(s,300,true,true),'manual');assert.equal(gestureMode(s,300,true,false),'auto');
});
test('targetless Rudolph autoaim remembers both direction and distance of its last manual point',()=>{
 const{g,p}=arena();rememberManualAim(p,'basic',{x:42,y:27});let aim=mobileAutoAim(g,p);near(aim.point.x,42);near(aim.point.y,27);assert.ok(aim.manualFallback);p.x+=3;p.y-=1;aim=mobileAutoAim(g,p);near(aim.point.x,45);near(aim.point.y,26);
});
test('a visible autoaim target overrides manual memory, then memory returns when that target disappears',()=>{
 const{g,p}=arena();rememberManualAim(p,'basic',{x:38,y:23});const t=foe(g);assert.equal(mobileAutoAim(g,p).target,t);t.alive=false;const aim=mobileAutoAim(g,p);assert.ok(!aim.target);near(aim.point.x,38);near(aim.point.y,23);
});
test('manual point memories are independent per slot and never override targetless travel direction',()=>{
 const{g,p}=arena('ryoshu');rememberManualAim(p,'q',{x:38,y:25});g.input.y=1;const aim=mobileAutoAim(g,p,'q');near(aim.point.x,40);assert.ok(aim.point.y>25);assert.ok(!aim.manualFallback);rememberManualAim(p,'basic',{x:41,y:26});near(mobileAutoAim(g,p).point.x,41);
});
test('a category attack cannot turn an unavailable category into a manual fallback attack',()=>{
 const{g,p}=arena();rememberManualAim(p,'basic',{x:42,y:25});const aim=mobileAutoAim(g,p,'basic',{category:'creep'});assert.ok(aim.unavailable);assert.ok(!aim.manualFallback);
});
test('attack guides hold for two seconds and fade linearly over the third second',()=>{
 const{g}=arena();for(const[t,alpha]of[[0,1],[2,1],[2.25,.75],[2.5,.5],[2.75,.25],[3,0],[8,0]]){g.time=t;near(attackGuideOpacity(g),alpha);}
});
test('attacking and taking damage each immediately restore the guide and restart its idle timer',()=>{
 const{g,p}=arena();g.time=8;near(attackGuideOpacity(g),0);p.lastAttackAt=8;near(attackGuideOpacity(g),1);g.time=10.5;near(attackGuideOpacity(g),.5);p.lastDamageAt=10.5;near(attackGuideOpacity(g),1);
});
test('nearby visible battle restores guides even when the player is not involved and retains its timestamp after leaving',()=>{
 const{g,p}=arena(),t=foe(g);g.time=8;t.lastCombat=8;near(attackGuideOpacity(g),1);t.x=100;g.time=10.5;near(attackGuideOpacity(g),.5);g.time=11;near(attackGuideOpacity(g),0);assert.equal(p.lastAttackAt,-99);
});
test('invisible, wall-blocked and faraway combat cannot reveal itself through guide reactivation',()=>{
 for(const mode of['hidden','wall','far']){const{g}=arena('faust'),t=foe(g);g.time=8;t.lastCombat=8;if(mode==='hidden')g.visibleTo=()=>false;if(mode==='wall')g.map.walls=[{x:41,y:24,w:1,h:2}];if(mode==='far')t.x=90;near(attackGuideOpacity(g),0);}
});
test('endpoint attack areas count as nearby battle while future timestamps do not',()=>{
 const{g,p}=arena(),t=foe(g,p.x+g.attackRange(p)+1);g.time=8;t.lastCombat=8;near(attackGuideOpacity(g),1);const other=arena();other.g.time=8;other.p.lastAttackAt=99;near(attackGuideOpacity(other.g),0);
});
test('a timed passive stays hidden while ready, appears during cooldown, and disappears when cooldown ends',()=>{
 const{g,p}=arena('yi'),has=()=>mobileStatusEntries(g,p).some(s=>s.kind==='passive');assert.ok(!has());p.passiveReady=2;assert.ok(has());g.time=2;assert.ok(!has());p.shields.push({passive:'yi',value:80,until:5});assert.ok(has());g.time=5;assert.ok(!has());
});
test('active timed passive effects remain visible without a running cooldown',()=>{
 const{g,p}=arena('gregor');g.addBuff(p,'mutant',5);assert.ok(mobileStatusEntries(g,p).some(s=>s.kind==='passive'&&s.ready));delete p.buffs.mutant;assert.ok(!mobileStatusEntries(g,p).some(s=>s.kind==='passive'));
});
test('buffs and debuffs share actual application order, not their duration or effect type',()=>{
 const{g,p}=arena('faust'),t=foe(g);g.addBuff(p,'coins',20);g.status(p,'slow',.2,3,t);g.addBuff(p,'resolve',10);let entries=mobileStatusEntries(g,p);assert.deepEqual(entries.slice(0,3).map(s=>s.key),['resolve','slow','coins']);g.status(p,'slow',.2,1,t);entries=mobileStatusEntries(g,p);assert.deepEqual(entries.slice(0,3).map(s=>s.key),['slow','resolve','coins']);
});
test('expired, removed and zero-strength effects immediately disappear from the mobile status list',()=>{
 const{g,p}=arena('faust'),t=foe(g);g.addBuff(p,'coins',1);g.status(p,'slow',.2,1,t);g.status(p,'root',0,10,t);g.time=1;assert.ok(mobileStatusEntries(g,p).every(s=>!['coins','slow','root'].includes(s.key)));g.addBuff(p,'coins',5);delete p.buffs.coins;assert.ok(mobileStatusEntries(g,p).every(s=>s.key!=='coins'));
});
test('the newest ten effects displace passive and augment icons without retaining old cleared effects',()=>{
 const{g,p}=arena('faust');p.augments=['highRisk','maskDeLu','wisdom','finalBullet','kAmpule','carrier'];for(let i=0;i<12;i++)g.addBuff(p,'effect'+i,20);let entries=mobileStatusEntries(g,p);assert.equal(entries.length,10);assert.deepEqual(entries.map(s=>s.key),Array.from({length:10},(_,i)=>'effect'+(11-i)));delete p.buffs.effect11;entries=mobileStatusEntries(g,p);assert.equal(entries[0].key,'effect10');assert.ok(entries.every(s=>s.kind==='buff'));
});
test('augment-triggered buffs and owned augments have lower priority than current combat statuses',()=>{
 const{g,p}=arena('faust'),t=foe(g);g.status(p,'slow',.2,4,t);g.addBuff(p,'augBattleHaste',10);p.augments=['battleHaste'];const entries=mobileStatusEntries(g,p);assert.equal(entries[0].key,'slow');assert.ok(entries.findIndex(s=>s.key==='augBattleHaste')>entries.findIndex(s=>s.kind==='passive'));
});
