import test from'node:test';import assert from'node:assert/strict';
import{Game}from'../src/game.js';import{AUGMENTS,NORTH_DIVIDER,WALLS,BUSHES,TERRAIN,lanePath}from'../src/data.js';
import*as Sewing from'../src/sewing.js';import*as Boss from'../src/boss-patterns.js';import{needleHeight}from'../src/needle-art.js';import{bossPresentation,BOSS_HEIGHT}from'../src/boss-art.js';
import{Camera25D}from'../src/camera-25d.js';import{projectFeet}from'../src/projection-25d.js';
import{laneGoal,laneDistance,convoyBlocked}from'../src/minion-navigation.js';import{separate}from'../src/collision.js';import{threatRanges}from'../src/overlays.js';import{regionContains,distance}from'../src/geometry.js';
import{readFile}from'node:fs/promises';import{decodePNG}from'../tools/png.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function arena(){const g=new Game('faust','top',{seed:55}),p=g.player;g.units=[p];g.minionQueue=[];g.wave=100;g.map={bounds:g.bounds,walls:[]};Object.assign(p,{x:35,y:0});return{g,p};}
test('north divider is exactly 2x1, centered between camp room and lane, with all sides and corners concealed',()=>{
 const w=NORTH_DIVIDER;assert.ok(WALLS.includes(w));near(w.w,2);near(w.h,1);near(w.x+w.w/2,Sewing.NORTH_CAMP.x);near(w.y+w.h/2,(TERRAIN[3].y+TERRAIN[3].h+7.15)/2);
 const smoke=BUSHES.filter(b=>b.northSmoke);assert.equal(smoke.length,4);for(const x of [w.x-.01,w.x+.01,w.x+w.w/2,w.x+w.w-.01,w.x+w.w+.01])for(const y of [w.y-.01,w.y+w.h+.01])assert.ok(smoke.some(b=>regionContains(b,{x,y})));
 for(const y of [w.y+.01,w.y+w.h/2,w.y+w.h-.01])for(const x of [w.x-.01,w.x+w.w+.01])assert.ok(smoke.some(b=>regionContains(b,{x,y})));
 assert.equal(smoke.some(b=>regionContains(b,{x:w.x+w.w/2,y:w.y+w.h/2})),false);
});
test('camp needles grant 45 XP and 35 gold once; summoned needles have zero reward and no needle can respawn',()=>{
 const{g,p}=arena(),n=Sewing.makeNeedle(g,35,-3.8),s=Sewing.makeNeedle(g,36,-3,1,{summoned:true});let xp=p.xp,gold=p.gold;g.kill(n,p);near(p.xp-xp,45);near(p.gold-gold,35);assert.equal(n.respawnAt,Infinity);assert.equal(n.respawnDelay,Infinity);
 xp=p.xp;gold=p.gold;g.kill(s,p);near(p.xp-xp,0);near(p.gold-gold,0);assert.equal(s.respawnAt,Infinity);g.time=1000;for(const key of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[key]=()=>{};g.sewingKingSpawned=true;g.bossSpawned=true;g.step(.01);assert.equal(n.alive,false);assert.equal(s.alive,false);assert.equal(g.campTimers().some(t=>[n.id,s.id].includes(t.id)),false);
});
test('sewing king stays at its spawn despite pursuit, movement, knockback and unit separation; attacks still fire',()=>{
 const{g,p}=arena(),k=g.makeNeutral(35,-3.8,'sewingKing');assert.equal(k.name,'바느질의 왕');near(needleHeight(k),4.2);Object.assign(p,{x:35,y:1.2});g.deal(p,k,1,{fixed:true,proc:false});
 for(let i=0;i<60;i++){g.time+=.1;g.aiNeutral(k,.1);}near(k.x,k.home.x);near(k.y,k.home.y);assert.equal(g.startMotion(k,{x:1,y:0},3,{kind:'knock',source:p}),false);g.moveToward(k,{x:40,y:0},1);near(k.x,35);
 Object.assign(p,{x:k.x,y:k.y});separate(g);near(k.x,35);near(k.y,-3.8);Object.assign(p,{x:35,y:-2.5});k.attackCd=0;g.aiNeutral(k,.01);assert.ok(k.swingUntil>g.time);
 g.time=12;Object.assign(p,{x:35,y:0});g.aiNeutral(k,.01);assert.ok(k.needleCast);g.time=13.5;g.aiNeutral(k,.01);assert.ok(g.projectiles.some(p=>p.theme==='sewingNeedle'));near(k.x,35);near(k.y,-3.8);
});
test('Black Orb has combat category and exactly ten-percent power, speed and reload with unchanged health; Glaive is survival',()=>{
 const{g,p}=arena(),base={hp:g.maxHp(p),power:g.powerScale(p),speed:g.speed(p),reload:g.reloadInterval(p)};assert.equal(AUGMENTS.find(a=>a.key==='blackOrb').group,'combat');assert.equal(AUGMENTS.find(a=>a.key==='glaive').group,'survival');p.augments=['blackOrb'];near(g.maxHp(p),base.hp);near(g.powerScale(p),base.power*1.1);near(g.speed(p),base.speed*1.1);near(g.reloadInterval(p),base.reload/1.1);
});
test('tower warning appears inside enemy range or while targeted, disappears outside, and ignores allied/dead towers',()=>{
 const{g,p}=arena(),t=g.entity({kind:'tower',team:1,x:40,y:0,range:8.5,maxHp:5000}),calls=[],r={circle:(...args)=>calls.push(args)};threatRanges(r,g);assert.equal(calls.length,1);near(calls[0][2],8.5);p.x=30;calls.length=0;threatRanges(r,g);assert.equal(calls.length,0);t.targetId=p.id;threatRanges(r,g);assert.equal(calls.length,1);calls.length=0;t.alive=false;threatRanges(r,g);assert.equal(calls.length,0);t.alive=true;t.team=p.team;threatRanges(r,g);assert.equal(calls.length,0);
});
test('all team/lane convoys pass allied towers and follow their own lane, then recover to the lane after displacement',()=>{
 for(const team of [0,1])for(const lane of [0,1]){
  const g=new Game('faust','top',{seed:55});g.units=g.units.filter(e=>e.kind==='tower'&&e.team===team);g.wave=2;g.spawnWave();g.time=2;g.flushMinions();g.minionQueue=[];const ms=g.units.filter(e=>e.kind==='minion'&&e.team===team&&e.lane===lane);g.units=g.units.filter(e=>e.kind==='tower'||ms.includes(e));
  for(let i=0;i<720;i++){g.time+=1/30;for(const m of ms)g.aiMinion(m,1/30);}
  for(const m of ms){assert.ok(m.waypoint>=2);assert.ok(team===0?m.x>40:m.x<31);assert.ok(laneDistance(g,m,m)<.75);}
  const m=ms[0],path=lanePath(team,lane);Object.assign(m,{x:35,y:path[1].y+(lane? -3:3),waypoint:2});const goal=laneGoal(g,m);near(goal.x,35);near(goal.y,path[1].y);for(let i=0;i<60;i++){g.time+=1/30;g.aiMinion(m,1/30);}assert.ok(laneDistance(g,m,m)<.75);
 }
});
test('a convoy member behind the follower cannot block it; passing a corner never sends minions back around it',()=>{
 const{g}=arena(),path=lanePath(0,0),m=g.entity({kind:'minion',team:0,lane:0,wave:1,formationIndex:1,radius:.3,x:17,y:7.2,waypoint:1,maxHp:100}),a=g.entity({kind:'minion',team:0,lane:0,wave:1,formationIndex:0,radius:.3,x:16.5,y:7.2,maxHp:100});assert.deepEqual(laneGoal(g,m),path[2]);assert.equal(m.waypoint,2);assert.equal(convoyBlocked(g,m,path[2]),false);a.x=17.5;assert.equal(convoyBlocked(g,m,path[2]),true);
});
test('ranged minions keep their full attack reach outside the lane corridor without following targets into the jungle',()=>{
 const{g}=arena(),m=g.entity({kind:'minion',team:0,lane:0,wave:1,formationIndex:0,x:35,y:7.15,waypoint:2,radius:.3,range:5.5,ranged:true,interval:1.5,damage:72,maxHp:480}),t=g.makeChampion('faust',1,10);Object.assign(t,{x:35,y:10.9});g.units=[m,t];g.map.bushes=[];g.aiMinion(m,1/30);assert.equal(g.projectiles.length,1);near(m.y,7.15);t.y=15;g.aiMinion(m,1/30);near(m.y,7.15);assert.ok(m.x>35);
});
test('Heaped Thing uses its front idle and attack sprites, with grounded feet, clean alpha and preserved boss combat',async()=>{
 const{g,p}=arena(),boss=g.makeNeutral(35,0,'boss');assert.equal(boss.name,'쌓인 것');assert.equal(bossPresentation(g,boss).key,'heapedIdle');Object.assign(p,{x:36,y:0});Boss.basic(g,boss,p);assert.equal(bossPresentation(g,boss).key,'heapedAttack');g.time+=.31;assert.equal(bossPresentation(g,boss).key,'heapedIdle');const v=bossPresentation(g,boss);near(v.top+v.h*v.f.foot[1],0);
 near(BOSS_HEIGHT,4.94);const camera=new Camera25D();for(const [w,h]of [[1440,950],[390,844],[1920,1080]]){camera.update(w,h,boss);for(const attack of [false,true]){boss.swingUntil=attack?g.time+1:0;const pose=bossPresentation(g,boss),feet=projectFeet(camera,boss),ground=camera.worldToScreen(boss,.075);near(feet.y+(pose.top+pose.h*pose.f.foot[1]-feet.offset)*feet.scale,ground.y);near(pose.h/pose.w,pose.f.h/pose.f.w);}}
 const meta=JSON.parse(await readFile(new URL('../src/assets/boss-v55.json',import.meta.url),'utf8'));assert.equal(meta.orientation,'front');assert.ok(meta.source.includes('7eee08e7'));assert.equal(Object.keys(meta.frames).length,2);
 for(const key of Object.keys(meta.frames)){const im=decodePNG(await readFile(new URL('../src/assets/boss/'+key+'.png',import.meta.url)));for(let x=0;x<im.width;x++){assert.equal(im.data[x*4+3],0);assert.equal(im.data[((im.height-1)*im.width+x)*4+3],0);}for(let y=0;y<im.height;y++){assert.equal(im.data[y*im.width*4+3],0);assert.equal(im.data[(y*im.width+im.width-1)*4+3],0);}for(let i=3;i<im.data.length;i+=4)assert.ok(im.data[i]===0||im.data[i]===255);}
});
