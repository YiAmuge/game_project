import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import{UPGRADES}from'../src/data.js';
import{mobileAutoAim,mobileAttackTargets,basicAimReach}from'../src/mobile-aim.js';
import{gestureMode,targetButtonPositions,HOLD}from'../src/mobile-gestures.js';
import{defaultShopSection}from'../src/mobile-shop.js';
import{captureMobileAim,followMobileAim}from'../src/champion-pose.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(key='faust'){
 const g=new Game(key,'bottom',{mode:'training',seed:66}),p=g.player;g.units=[p];g.effects=[];g.pending=[];g.projectiles=[];g.zones=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of['aiChampion','aiNeutral','aiStructure','aiMinion'])g[k]=()=>{};Object.assign(p,{x:40,y:25,lastAttackAt:999,lastDamageAt:999,attackAt:-99});g.input={x:0,y:0,aim:{x:45,y:25},fire:false};return{g,p};
}
function foe(g,x=44,y=25,hp=5000,kind='champion'){const t=g.makeChampion('yi',1,g.nextId+20);Object.assign(t,{x,y,hp,maxHp:10000,armor:0,kind,lastAttackAt:999,lastDamageAt:999});return t;}
const gesture=()=>({at:100,startX:10,startY:10,x:10,y:10,manual:false});
test('short slides cannot steer a tap, including large displacement just before release',()=>{
 for(const elapsed of[0,40,120,HOLD-1]){const s=gesture();s.x=140;s.y=-60;assert.equal(gestureMode(s,100+elapsed,true),'tap');assert.ok(!s.autoLocked);}
});
test('dragging before the hold threshold selects manual aim only after the hold threshold',()=>{
 const s=gesture();s.x+=20;assert.equal(gestureMode(s,200,true),'tap');assert.equal(gestureMode(s,100+HOLD,true),'manual');s.manual=true;s.x=10;assert.equal(gestureMode(s,500,true),'manual');
});
test('auto hold cannot turn into manual steering after it has locked',()=>{
 const s=gesture();assert.equal(gestureMode(s,100+HOLD,true),'auto');assert.ok(s.autoLocked);s.x=-100;s.y=100;assert.equal(gestureMode(s,600,true),'auto');
});
test('ordinary aimed skills can still be manually steered after a long stationary press',()=>{
 const s=gesture();assert.equal(gestureMode(s,400,false),'auto');assert.ok(!s.autoLocked);s.x=40;assert.equal(gestureMode(s,450,false),'manual');
});
test('an existing continuous autoattack remains locked while its finger crosses another skill',()=>{
 const s={...gesture(),autoHeld:true,x:500,y:500};assert.equal(gestureMode(s,700,true),'auto');
});
for(const[key,slot]of[['jamila','q'],['ryoshu','q'],['ryoshu','r'],['sinclair','q'],['sinclair','r'],['outis','q'],['outis','r'],['ahab','r'],['dongrang','r'],['sora','q'],['hohenheim','q'],['heathcliff','q'],['nelly','r']])test(`${key} ${slot} movement attack aims at the nearest target rather than a far low-health champion`,()=>{
 const{g,p}=arena(key);const far=foe(g,46,25,1),close=foe(g,41.5,25,9000);assert.equal(mobileAutoAim(g,p,slot).target,close);assert.ok(far.alive);
});
test('ordinary offensive skills retain low-health champion priority',()=>{
 const{g,p}=arena();foe(g,41,25,9000);const low=foe(g,44,25,100);assert.equal(mobileAutoAim(g,p,'q').target,low);
});
test('movement skills with no target follow current movement instead of the previous attack facing',()=>{
 for(const[key,slot]of[['jamila','q'],['ryoshu','q'],['ryoshu','r'],['sinclair','r'],['yi','r'],['heathcliff','q'],['sora','q']]){const{g,p}=arena(key);p.facing=0;g.input.x=0;g.input.y=-1;const aim=mobileAutoAim(g,p,slot);assert.equal(aim.target,undefined);near(aim.point.x,p.x);assert.ok(aim.point.y<p.y,key);}
});
test('a touch controller movement vector takes precedence over the previous simulation frame',()=>{
 const{g,p}=arena('ryoshu');g.input.x=1;g.input.y=0;const aim=mobileAutoAim(g,p,'q',{movement:{x:0,y:1}});near(aim.point.x,p.x);assert.ok(aim.point.y>p.y);
});
test('stationary movement skill taps retain the last movement direction',()=>{
 const{g,p}=arena('sinclair');g.mobileInput=true;g.input.x=-1;g.input.y=0;captureMobileAim(g);g.input.x=0;p.facing=0;const aim=mobileAutoAim(g,p,'q');assert.ok(aim.point.x<p.x);near(aim.point.y,p.y);
});
test('available interaction targets take precedence over travel direction for a movement skill',()=>{
 const{g,p}=arena('ryoshu'),t=foe(g,42,25);g.input.x=0;g.input.y=1;const aim=mobileAutoAim(g,p,'q');assert.equal(aim.target,t);assert.ok(aim.point.x>p.x);near(aim.point.y,p.y);
});
test('Yi support teleport aims at an ally it can buff, otherwise follows travel rather than an enemy',()=>{
 const{g,p}=arena('yi');g.input.y=1;foe(g,42);let aim=mobileAutoAim(g,p,'r');assert.equal(aim.target,undefined);near(aim.point.x,p.x);assert.ok(aim.point.y>p.y);const ally=g.makeChampion('faust',0,30);Object.assign(ally,{x:43,y:25,hp:ally.maxHp});aim=mobileAutoAim(g,p,'r');assert.equal(aim.target,ally);
});
test('out-of-range visible targets provide a direction while circle centers stay inside cast range',()=>{
 const{g,p}=arena('yi'),t=foe(g,55,29);const aim=mobileAutoAim(g,p,'q');assert.equal(aim.target,t);near(Math.hypot(aim.point.x-p.x,aim.point.y-p.y),7);assert.ok(aim.point.y>p.y);assert.equal(g.cast(p,'q',aim.point),true);near(Math.hypot(g.zones[0].x-p.x,g.zones[0].y-p.y),7);
});
test('a visible target leaving and reentering range stays locked and becomes hittable again without a new press',()=>{
 const{g,p}=arena('rudolph'),t=foe(g,44);let aim=mobileAutoAim(g,p);const id=aim.target.id;t.x=60;aim=mobileAutoAim(g,p,'basic',{targetId:id});assert.equal(aim.target,t);near(aim.point.x,60);assert.ok(!mobileAttackTargets(g,p).includes(t));assert.ok(g.attack(p,aim.point));assert.equal(t.hp,5000);p.attackCd=0;t.x=44;aim=mobileAutoAim(g,p,'basic',{targetId:id});assert.equal(aim.target,t);assert.ok(mobileAttackTargets(g,p).includes(t));assert.ok(g.attack(p,aim.point));assert.ok(t.hp<5000);
});
test('a locked target is never updated or acquired through lost vision',()=>{
 const{g,p}=arena('jamila'),t=foe(g,44),other=foe(g,43,26,9000);const visible=g.visibleTo.bind(g);g.mobileInput=true;g.input.aim={x:t.x,y:t.y};g.mobileAim={autoTarget:t.id};const from=captureMobileAim(g);g.visibleTo=(team,u)=>u!==t&&visible(team,u);t.x=80;followMobileAim(g,from);near(g.input.aim.x,44);assert.equal(mobileAutoAim(g,p,'basic',{targetId:t.id}).target,other);other.alive=false;assert.equal(mobileAutoAim(g,p).target,undefined);
});
test('in-range targets are preferred before unselected visible targets outside range',()=>{
 const{g,p}=arena('jamila'),far=foe(g,70,25,1),close=foe(g,44,25,9000);assert.equal(mobileAutoAim(g,p).target,close);assert.equal(mobileAutoAim(g,p,'basic',{targetId:far.id}).target,far);
});
for(const[key,radius]of[['rudolph',2.1675],['marton',2.2]])test(`${key} basic autoaim acquires and damages targets at the endpoint area's outer edge`,()=>{
 const{g,p}=arena(key),range=g.attackRange(p),t=foe(g,p.x+range+radius+.3);near(basicAimReach(g,p),range+radius);assert.ok(mobileAttackTargets(g,p).includes(t));const aim=mobileAutoAim(g,p);assert.equal(aim.target,t);assert.ok(g.attack(p,aim.point));assert.ok(t.hp<5000);t.x+=1;assert.ok(!mobileAttackTargets(g,p).includes(t));
});
test('wounded ally autoaim can retain a visible ally outside healing range',()=>{
 const{g,p}=arena('ppui'),ally=g.makeChampion('yi',0,20);Object.assign(ally,{x:65,y:28,hp:1});foe(g,42);const aim=mobileAutoAim(g,p);assert.equal(aim.target,ally);near(aim.point.x,65);
});
test('shop opens procedures until every procedure reaches its actual cap',()=>{
 const{p}=arena();assert.equal(defaultShopSection(p),'upgrades');for(const u of UPGRADES)p.upgrades[u.key]=u.max;assert.equal(defaultShopSection(p),'augments');p.upgrades.health--;assert.equal(defaultShopSection(p),'upgrades');
});
test('one to four category buttons occupy the inner seven-to-eleven oclock arc without overlaps',()=>{
 for(const width of[667,844])for(let n=1;n<=4;n++){const rect={x:width-156,y:390-107,width:82,height:82},out=targetButtonPositions(rect,['champion','minion','structure','creep'].slice(0,n));assert.equal(out.length,n);for(const a of out){assert.ok(a.x<rect.x);assert.ok(a.x-18>=0&&a.y-18>=0&&a.y+18<=390);for(const b of out)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>36);}}
});
