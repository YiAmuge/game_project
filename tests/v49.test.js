import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {Game} from '../src/game.js';
import {CHAMPIONS,WORLD} from '../src/data.js';
import {FRAMES,ATLAS_FILES,visualForm} from '../src/art.js';
import * as Boss from '../src/boss-buff.js';
import * as Camps from '../src/camp-buffs.js';
import * as Patterns from '../src/creep-patterns.js';
import {clerkPresentation,CLERK_HEIGHT} from '../src/clerk-art.js';
import {decodePNG} from '../tools/png.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function arena(key='faust'){const g=new Game(key,'top',{seed:49}),p=g.player;for(const fn of ['aiChampion','aiNeutral','aiMinion','aiStructure'])g[fn]=()=>{};Object.assign(p,{x:30,y:20,lastAttackAt:999,lastDamageAt:999});g.units=[p];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};return{g,p};}
function enemy(g,x=31,y=20){const t=g.makeChampion('faust',1,8);Object.assign(t,{x,y,hp:10000,maxHp:10000,armor:0,player:false});return t;}
test('Every champion moves with its original static body and no walking sheet or runtime remains',async()=>{
 const meta=JSON.parse(await readFile(new URL('../src/assets/sprites-v36.json',import.meta.url)));assert.equal(meta.animations,undefined);assert.ok(!Object.keys(FRAMES).some(k=>/Walk\d/.test(k)));assert.ok(!ATLAS_FILES.some(k=>/walk/.test(k)));assert.equal(existsSync(new URL('../src/walk-animation.js',import.meta.url)),false);
 for(const key of Object.keys(CHAMPIONS)){const {g,p}=arena(key),f=FRAMES[key];g.input.x=1;g.input.aim={x:40,y:20};for(let i=0;i<5;i++)g.step(1/30);assert.ok(p.x>30,key);assert.equal(visualForm(g,p),key);assert.equal(FRAMES[visualForm(g,p)],f);assert.equal(f.sheet,['queen','nosferatu','bloodfiend'].includes(key)?19:key==='kromer'?17:key==='jamila'?15:9);}
});
test('Boss aura reaches 9.5, lasts one second after leaving, refreshes on reentry, and preserves health ratios without stacking',()=>{
 const {g,p}=arena();Boss.reward(g,0);const ally=g.makeChampion('faust',0,3);Object.assign(ally,{x:30,y:20});Boss.reward(g,0);
 const m=g.entity({kind:'minion',team:0,x:39.5,y:20,maxHp:1000,damage:100});m.hp=500;Boss.tick(g);close(m.maxHp,1200);close(m.hp,600);close(m.damage,120);m.x=39.51;g.time=.999;Boss.tick(g);close(m.maxHp,1200);g.time=1;Boss.tick(g);close(m.maxHp,1000);close(m.hp,500);
 m.x=39.5;g.time=2;Boss.tick(g);m.x=40;g.time=2.8;Boss.tick(g);close(m.damage,120);m.x=39.4;g.time=2.9;Boss.tick(g);m.x=40;g.time=3.8;Boss.tick(g);close(m.damage,120);g.time=3.91;Boss.tick(g);close(m.damage,100);
 const t=g.entity({kind:'minion',team:1,x:31,y:20,maxHp:1000,damage:100});Boss.tick(g);close(t.maxHp,1000);
});
test('Both clerks have exact names, health, armor and ordinary attack intervals',()=>{
 const {g}=arena();for(const[camp,name,hp,armor,damage,interval]of[['amplify','르루주 점원',1700,15,80,.85],['blessing','르누아르 점원',1600,20,100,1.1]]){const e=g.makeNeutral(31,20,camp);assert.equal(e.name,name);close(e.maxHp,hp);close(e.hp,hp);close(e.armor,armor);close(e.damage,damage);close(e.interval,interval);assert.equal(e.respawnDelay,45);}
});
test('Macdong increases power ten percent and adds exactly six percent true damage and drain on every damage event without recursion',()=>{
 const {g,p}=arena(),t=enemy(g);t.armor=100;p.hp-=500;const power=g.powerScale(p);g.addBuff(p,'amplify',60);close(g.powerScale(p),power*1.1);
 for(const proc of [true,false,false]){const hp=t.hp,own=p.hp,actual=g.deal(p,t,100,{proc});close(hp-t.hp,actual*1.06);close(p.hp-own,actual*.06);assert.equal(g.stat(t,'slow'),0);}
});
test('Macdong uses damage after mitigation, includes absorbed damage and heals on a lethal hit',()=>{
 const {g,p}=arena(),t=enemy(g);g.addBuff(p,'amplify',60);p.hp-=500;g.addShield(t,1000,'test',20,false);const hp=p.hp;close(g.deal(p,t,100,{fixed:true}),0);close(g.shield(t),894);close(p.hp-hp,6);
 t.shields=[];t.hp=50;const own=p.hp;g.deal(p,t,1000,{fixed:true});close(p.hp-own,3);assert.equal(t.alive,false);assert.equal(p.kills,1);
});
test('Macdong true bonus is not multiplied again by focused creep exposure or Starbuck neutral bonuses',()=>{
 const {g,p}=arena('starbuck'),t=g.makeNeutral(31,20,'amplify');t.exposedUntil=100;g.addBuff(p,'amplify',60);const hp=t.hp,actual=g.deal(p,t,100,{proc:false});close(hp-t.hp,actual*1.06);
});
test('Preservation starts after three seconds, accumulates only its ward up to twenty percent and heals half a percent per pulse',()=>{
 const {g,p}=arena();p.maxHp=1000;p.hp=500;const haste=g.haste(p),reload=g.reloadInterval(p);g.addBuff(p,'blessing',60);assert.equal(p.buffs.blessingHeal,undefined);close(g.haste(p),haste);close(g.reloadInterval(p),reload);g.time=2.99;Camps.tick(g,p);close(g.shield(p),0);close(p.hp,500);
 for(let n=1;n<=8;n++){g.time=n*3;Camps.tick(g,p);close(g.shield(p),Math.min(n*30,200));close(p.hp,500+n*5);}
 p.shields[0].value-=80;g.time=27;Camps.tick(g,p);close(g.shield(p),150);g.time=60;Camps.tick(g,p);close(g.shield(p),0);assert.equal(p.state.preservationNext,undefined);
});
test('Refreshing Preservation preserves cadence and extends its accumulated ward; half-strength copies retain half numerical effects',()=>{
 const {g,p}=arena();g.addBuff(p,'blessing',10);g.time=3;Camps.tick(g,p);g.time=4;g.addBuff(p,'blessing',60);close(p.state.preservationNext,6);close(p.shields.find(s=>s.source===`preservation-${p.id}`).until,64);
 const q=arena('honglu'),ally=q.g.makeChampion('faust',0,3);Object.assign(ally,{x:31,y:20,maxHp:1000,hp:500});q.g.addBuff(q.p,'blessing',60);close(q.g.shield(ally),0);q.g.addBuff(ally,'blessing',60,{strength:.5,copy:false});q.g.time=3;Camps.tick(q.g,ally);close(q.g.shield(ally),15);close(ally.hp,502.5);
});
function focus(camp,{miss=false,invulnerable=false,second=false}={}){const {g,p}=arena();p.armor=100;if(invulnerable)p.invulnerableUntil=100;const n=g.makeNeutral(29,20,camp);n.hp-=300;Patterns.engage(g,n);g.time=1.5;Patterns.update(g,n,p);assert.ok(n.pattern);if(second){const t=enemy(g,30,20);t.team=0;t.armor=100;}if(miss)p.y+=8;g.time=n.pattern.at;const hp=n.hp;Patterns.update(g,n,p);return{g,p,n,hp};}
test('Le Rouge drains twelve percent of actual focused damage; misses, invulnerability and ordinary attacks do not drain',()=>{
 const a=focus('amplify');close(a.n.hp-a.hp,80*.12);for(const options of [{miss:true},{invulnerable:true}]){const b=focus('amplify',options);close(b.n.hp,b.hp);}const {g,p}=arena(),n=g.makeNeutral(29,20,'amplify');n.hp-=100;const hp=n.hp;g.simpleAttack(n,p);close(n.hp,hp);close(n.swingUntil-g.time,.28);
});
test('Le Noir receives seventy shield once per successful focused attack, including multi-target hits, and none on a miss',()=>{
 const a=focus('blessing',{second:true});close(a.g.shield(a.n),70);for(const options of [{miss:true},{invulnerable:true}]){const b=focus('blessing',options);close(b.g.shield(b.n),0);}
});
test('Ordinary and completed charged attacks select the strike body; both body poses register their own exact hand pivot and are larger than champions',()=>{
 close(CLERK_HEIGHT/2.1,2.4*1.15/2.1);for(const camp of ['amplify','blessing']){const {g,p}=arena(),n=g.makeNeutral(29,20,camp);g.simpleAttack(n,p);assert.equal(clerkPresentation(g,n).striking,true);Patterns.engage(g,n);g.time=1.5;Patterns.update(g,n,p);const idle=clerkPresentation(g,n);assert.equal(idle.striking,false);g.time=n.pattern.at;Patterns.update(g,n,p);const attack=clerkPresentation(g,n);assert.equal(attack.striking,true);assert.notDeepEqual(attack.f.hand,idle.f.hand);for(const pose of [idle,attack]){close(pose.h/pose.f.h*400,CLERK_HEIGHT);close(pose.hand.x,pose.left+pose.f.hand[0]*pose.h/pose.f.h);close(pose.hand.y,pose.top+pose.f.hand[1]*pose.h/pose.f.h);assert.ok(pose.weapon.grip[0]>0&&pose.weapon.grip[1]>0);}g.time=n.swingUntil;assert.equal(clerkPresentation(g,n).striking,false);}
});
test('Four clerk poses and two independent weapons have clean alpha and transparent margins, with source and champion seed provenance',async()=>{
 const m=JSON.parse(await readFile(new URL('../src/assets/clerks-v49.json',import.meta.url))),p=decodePNG(await readFile(new URL('../src/assets/clerks-v49.png',import.meta.url)));assert.equal(m.championSeeds.length,2);assert.equal(Object.keys(m.frames).length,6);assert.match(m.source.sha256,/^[0-9a-f]{64}$/);
 for(const[key,f]of Object.entries(m.frames)){assert.deepEqual(FRAMES[key],f);let area=0;for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){const alpha=p.data[((f.y+y)*p.width+f.x+x)*4+3];assert.ok(alpha===0||alpha===255);if(alpha){area++;assert.ok(x>=2&&x<f.w-2&&y>=2&&y<f.h-2,key+' clipped');}}assert.ok(area>1000,key);if(f.hand)close(f.h*f.foot[1]-f.crownOffset,400);}
});

test('The real simulation pulses Preservation and earning Macdong does not retroactively drain the killing hit',()=>{
 const {g,p}=arena('meursault');p.hp-=500;const hp=p.hp;g.addBuff(p,'blessing',60);g.step(2.99);close(g.shield(p),0);close(p.hp,hp);g.step(.01);close(g.shield(p),30);close(p.hp,hp+p.maxHp*.005);
 const a=arena(),n=a.g.makeNeutral(31,20,'amplify');a.p.hp-=500;n.hp=100;const own=a.p.hp;a.g.deal(a.p,n,1000,{fixed:true});assert.ok(a.g.buff(a.p,'amplify'));close(a.p.hp,own);
});

test('Preservation respects a reduced maximum HP immediately and clears its ward when removed early',()=>{
 const {g,p}=arena();p.maxHp=1000;g.addBuff(p,'blessing',60);g.time=18;Camps.tick(g,p);close(g.shield(p),180);p.maxHp=500;Camps.tick(g,p);close(g.shield(p),100);p.buffs.blessing=0;Camps.tick(g,p);close(g.shield(p),0);
});
