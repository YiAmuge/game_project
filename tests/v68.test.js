import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import{gestureMode,HOLD}from'../src/mobile-gestures.js';
import{dashSlidePriority,mobileManualAim,mobileAutoAim}from'../src/mobile-aim.js';
import{skillTargeting}from'../src/targeting.js';
import{TOWER_RULES}from'../src/tower-rules.js';
import{distance}from'../src/geometry.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(key='don'){
 const g=new Game(key,'bottom',{mode:'training',seed:68}),p=g.player;g.units=[p];g.events=[];g.pending=[];g.effects=[];g.projectiles=[];g.zones=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;Object.assign(p,{x:40,y:25,lastAttackAt:999,lastDamageAt:999});for(const key of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[key]=()=>{};return{g,p};
}
function hero(g,x=44,y=25,team=1,hp=5000){const t=g.makeChampion('faust',team,30);Object.assign(t,{x,y,hp,maxHp:10000,armor:0,lastAttackAt:999,lastDamageAt:999});return t;}
const camera={screenToWorld:(x,y)=>({x,y})};
const run=(g,n)=>{for(let i=0;i<Math.ceil(n*120);i++)g.step(1/120);};
test('a short directional dash slide overrides autoaim before the hold threshold and stays manual',()=>{
 const s={at:0,startX:0,startY:0,x:-24,y:0};assert.equal(gestureMode(s,40,false,false,true),'manual');s.x=-4;assert.equal(gestureMode(s,80,false,false,true),'manual');assert.equal(gestureMode(s,HOLD+1,false,false,true),'manual');
});
test('ordinary short taps and non-dash short slides keep autoaim and held locks',()=>{
 const s={at:0,startX:0,startY:0,x:6,y:0};assert.equal(gestureMode(s,40,false,false,true),'tap');s.x=30;assert.equal(gestureMode(s,40,false,false,false),'tap');s.autoLocked=true;assert.equal(gestureMode(s,300,true,false,true),'auto');
});
test('short-slide priority follows actual dash skills and excludes ground teleports and charged thrusts',()=>{
 for(const[key,slot]of[['don','basic'],['don','r'],['myo','basic'],['starbuck','basic'],['ryoshu','q'],['jamila','q'],['heathcliff','q'],['outis','r']]){const{g,p}=arena(key);assert.ok(dashSlidePriority(g,p,slot),`${key} ${slot}`);}
 for(const[key,slot]of[['don','q'],['nelly','r'],['sinclair','r'],['ryoshu','r'],['starbuck','r'],['yi','r'],['jamila','basic']]){const{g,p}=arena(key);assert.ok(!dashSlidePriority(g,p,slot),`${key} ${slot}`);}
});
test('manual Ppui basic heals an eligible in-range ally even when aimed in the opposite direction',()=>{
 const{g,p}=arena('ppui'),ally=hero(g,43,25,0,1000);hero(g,38);const point=mobileManualAim(g,p,'basic',-60,0,camera);near(point.x,ally.x);near(point.y,ally.y);assert.ok(g.attack(p,point));assert.equal(p.state.empower.target,ally.id);run(g,.5);assert.ok(ally.hp>1000);assert.equal(g.projectiles.length,0);
});
test('manual Ppui prioritizes an eligible wounded ally, can empower a full-health ally and avoids cooldown-blocked allies',()=>{
 const{g,p}=arena('ppui'),full=hero(g,43,25,0,10000),wounded=hero(g,42,26,0,1000);let point=mobileManualAim(g,p,'basic',-60,0,camera);near(point.x,wounded.x);wounded.state.ppuiEmpowerReady=2;point=mobileManualAim(g,p,'basic',-60,0,camera);near(point.x,full.x);full.state.ppuiEmpowerReady=2;point=mobileManualAim(g,p,'basic',-60,0,camera);assert.ok(point.x<p.x);
});
test('manual Ppui does not heal through walls, beyond range, or when an explicit enemy category is requested',()=>{
 const{g,p}=arena('ppui'),ally=hero(g,43,25,0,1000);g.map.walls=[{x:41,y:24,w:.5,h:2}];assert.ok(mobileManualAim(g,p,'basic',-60,0,camera).x<p.x);g.map.walls=[];ally.x=90;assert.ok(mobileManualAim(g,p,'basic',-60,0,camera).x<p.x);ally.x=43;assert.ok(mobileManualAim(g,p,'basic',-60,0,camera,{category:'creep'}).x<p.x);
});
test('tower damage ignores thirty percent of armor while core and champion attacks retain their armor rules',()=>{
 const{g,p}=arena('faust');p.armor=100;p.maxHp=p.hp=10000;const tower=g.entity({kind:'tower',team:1,x:44,y:25,maxHp:10000,damage:170,range:8.5}),core=g.entity({kind:'core',team:1,x:46,y:25,maxHp:10000});near(TOWER_RULES.armorPen,.3);near(g.deal(tower,p,170),100);near(g.deal(core,p,170),85);near(g.deal(tower,p,170,{fixed:true}),170);
});
test('real tower homing shots use the same thirty percent armor penetration at impact',()=>{
 const{g,p}=arena('faust');p.armor=100;p.hp=p.maxHp=10000;const tower=g.entity({kind:'tower',team:1,x:42,y:25,maxHp:10000,damage:170,range:8.5});g.simpleAttack(tower,p);near(p.hp,10000);g.updateProjectiles(.3);near(p.hp,9900);
});
for(const key of['nelly','sinclair'])test(`${key} ultimate targets ground and crosses a wall without requiring an enemy`,()=>{
 const{g,p}=arena(key);g.map.walls=[{x:42,y:23,w:1,h:4}];const spec=skillTargeting(g,p,'r');assert.equal(spec.kind,'circle');assert.ok(spec.ignoreWalls);assert.ok(g.cast(p,'r',{x:46,y:25}));if(key==='sinclair'){assert.ok(p.motion.ignoreWalls);run(g,.3);}near(p.x,46);near(p.y,25);assert.ok(!g.blocked(p.x,p.y,p.radius));assert.ok(p.rCd>0);
});
for(const key of['nelly','sinclair'])test(`${key} ground ultimate clamps range and chooses a legal destination when clicked inside terrain`,()=>{
 const{g,p}=arena(key);g.map.walls=[{x:42,y:24,w:1,h:2}];assert.ok(g.cast(p,'r',{x:42.5,y:25}));if(p.motion)run(g,.3);assert.ok(!g.blocked(p.x,p.y,p.radius));assert.ok(distance({x:40,y:25},p)<=(key==='nelly'?7:6));
 const a=arena(key);assert.ok(a.g.cast(a.p,'r',{x:100,y:25}));if(a.p.motion)run(a.g,.4);near(distance({x:40,y:25},a.p),key==='nelly'?7:6);
});
test('Nelly ground ultimate retains its single champion hit, root, protected mark and two-ammo restoration',()=>{
 const{g,p}=arena('nelly'),t=hero(g,47.5,25),second=hero(g,46,26.6);g.map.walls=[{x:42,y:23,w:1,h:4}];p.ammo=0;assert.ok(g.cast(p,'r',{x:46,y:25}));near(p.x,46);assert.ok(t.hp<5000||second.hp<5000);assert.equal(Number(t.hp<5000)+Number(second.hp<5000),1);const victim=t.hp<5000?t:second;near(g.stat(victim,'root'),1);assert.equal(victim.state.nellyMarks[p.id].hold,3);assert.equal(p.ammo,2);
});
test('Sinclair wall-crossing arrival retains its area attack and health-dependent rewards',()=>{
 for(const healthy of[true,false]){const{g,p}=arena('sinclair'),t=hero(g,47.2);g.map.walls=[{x:42,y:23,w:1,h:4}];if(!healthy)p.hp=p.maxHp*.4;assert.ok(g.cast(p,'r',{x:46,y:25}));run(g,.3);near(p.x,46);assert.ok(t.hp<5000);assert.ok(healthy?g.buff(p,'marks'):g.shield(p)>0);}
});
test('coordinate movement still respects root and confinement rather than bypassing status restrictions',()=>{
 for(const key of['nelly','sinclair']){const{g,p}=arena(key);p.status.root={amount:1,until:5};assert.equal(g.cast(p,'r',{x:46,y:25}),false);}
});
test('interrupting a terrain-crossing Sinclair ultimate returns him to safe ground and clears untargetability',()=>{
 const{g,p}=arena('sinclair');g.map.walls=[{x:42,y:23,w:2,h:4}];assert.ok(g.cast(p,'r',{x:46,y:25}));g.updateMotion(p,.1);assert.ok(g.blocked(p.x,p.y,p.radius));p.status.root={amount:1,until:2};g.updateMotion(p,.01);assert.equal(p.motion,undefined);assert.ok(!g.blocked(p.x,p.y,p.radius));assert.equal(p.untargetableUntil,0);
});
test('ground movement autoaim may acquire a visible target across terrain but cannot acquire an unseen one',()=>{
 for(const key of['nelly','sinclair']){const{g,p}=arena(key),t=hero(g,46);g.map.walls=[{x:42,y:23,w:1,h:4}];assert.equal(mobileAutoAim(g,p,'r').target,t);g.visibleTo=()=>false;assert.equal(mobileAutoAim(g,p,'r').target,undefined);}
});
