import test from'node:test';import assert from'node:assert/strict';
import{Game,damageFormula}from'../src/game.js';import*as Ezra from'../src/ezra.js';import{preview}from'../src/combat-visuals.js';import{skillTargeting}from'../src/targeting.js';import{skillReference}from'../src/skill-reference.js';import{SnapshotWriter,applySnapshot}from'../src/online-state.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`),run=(g,s)=>{for(let n=0;n<Math.round(s*120);n++)g.step(1/120);};
function arena(){const g=new Game('ezra','top',{mode:'training',seed:106}),p=g.player;g.units=[p];g.map={walls:[],bounds:{x:0,y:0,w:100,h:100}};g.bounds=g.map.bounds;Object.assign(g.practice,{lineStopped:true,pauseXp:true});Object.assign(p,{x:40,y:20,lastDamageAt:100,lastAttackAt:100});g.input.aim={x:50,y:20};for(const k of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};return{g,p};}
const select=(p,i)=>{p.state.weapon=i;p.ammo=4;p.attackCd=0;};
const enemy=(g,x=42,y=20)=>g.entity({kind:'minion',team:1,x,y,maxHp:100000,armor:0,radius:.01,range:0});
const damage=n=>damageFormula(n,2,1);

test('Alas gives twelve percent shield on use, refreshes through tactical, and expires after 1.6 seconds',()=>{
 const{g,p}=arena();p.maxHp=5000;p.hp=1000;const t=enemy(g,42);assert.ok(g.attack(p,g.input.aim));near(g.shield(p),600);run(g,.1);near(t.maxHp-t.hp,damage(160));run(g,.7);assert.ok(g.cast(p,'q',g.input.aim));near(g.shield(p),600);near(p.shields.find(s=>s.source===`ezra-glove-${p.id}`).until,g.time+1.6);run(g,1.59);near(g.shield(p),600);run(g,.02);near(g.shield(p),0);
});
test('Alas grants its shield on a miss, but a rejected rooted use grants neither ammo loss nor shield',()=>{
 const{g,p}=arena();g.status(p,'root',1,1,p);assert.equal(g.attack(p,g.input.aim),false);near(g.shield(p),0);assert.equal(p.ammo,4);run(g,1.01);assert.ok(g.attack(p,g.input.aim));near(g.shield(p),p.maxHp*.12);
});
test('Nester expands to 2.6, 2.9 and 3.2 with one 63-damage hit per eligible swing and 1.7 slow',()=>{
 const{g,p}=arena();select(p,1);const targets=[2.55,2.85,3.15,3.4].map(x=>enemy(g,p.x+x));g.attack(p,g.input.aim);const ranges=[g.effects.find(f=>f.type==='slash').r];near(targets[0].maxHp-targets[0].hp,damage(63));near(targets[1].hp,targets[1].maxHp);run(g,.31);ranges.push(g.effects.find(f=>f.type==='slash').r);near(targets[1].maxHp-targets[1].hp,damage(63));near(targets[2].hp,targets[2].maxHp);run(g,.3);ranges.push(g.effects.find(f=>f.type==='slash').r);[3,2,1,0].forEach((n,i)=>near(targets[i].maxHp-targets[i].hp,damage(63)*n));[2.6,2.9,3.2].forEach((r,i)=>near(ranges[i],r));near(targets[2].status.slow.until,2.3);
});
test('range augments, tactical targeting and attack previews share all three Nester radii',()=>{
 const{g,p}=arena();select(p,1);p.augments=['range7'];p.state.ezraLastWeapon=1;near(Ezra.attackReach(g,p),4.5);near(skillTargeting(g,p,'q').radius,4.5);const rings=[];preview({ctx:{},circle:(_x,_y,r)=>rings.push(r)},p,g);[4.5,4.2,3.9].forEach((r,i)=>near(rings[i],r));const edge=enemy(g,44.4);assert.ok(g.cast(p,'q',g.input.aim));run(g,.61);near(edge.maxHp-edge.hp,damage(63));assert.match(skillReference('ezra',1).ranges[1].text,/2.6.*2.9.*3.2/);
});
test('drill uses seventy damage and thirty percent final true damage, including shield-only hits',()=>{
 for(const armor of[0,100])for(const shielded of[false,true]){const{g,p}=arena();select(p,2);const normal=enemy(g,42,20.4),cc=enemy(g,42,19.6);normal.armor=cc.armor=armor;g.status(cc,'slow',.1,10,p);if(shielded){g.addShield(normal,3000,'test');g.addShield(cc,3000,'test');}const hp=normal.hp,other=cc.hp;g.attack(p,g.input.aim);run(g,.41);const base=damage(70)*3/(1+armor/100);if(shielded){near(3000-g.shield(normal),base);near(3000-g.shield(cc),base*1.3);near(normal.hp,hp);near(cc.hp,other);}else{near(hp-normal.hp,base);near(other-cc.hp,base*1.3);}}
});
test('Namir roots a repeated gauntlet hit within one second, and the one-second root expires',()=>{
 for(const delay of[.53,.55]){const{g,p}=arena();select(p,3);const t=enemy(g,42);g.attack(p,{x:40,y:20});run(g,.46);near(t.maxHp-t.hp,damage(220));near(g.stat(t,'root'),0);run(g,delay);assert.ok(g.cast(p,'q',{x:p.x,y:p.y}));run(g,.46);near(t.maxHp-t.hp,damage(440));near(g.stat(t,'root'),delay<.54?1:0);if(delay<.54){run(g,1);near(g.stat(t,'root'),0);}}
});
test('Namir repeat tracking belongs to each caster and does not trigger from an Alas hit',()=>{
 const{g,p}=arena();select(p,3);const t=enemy(g,42);g.attack(p,p);run(g,.46);select(p,0);p.attackCd=0;g.attack(p,{x:43,y:20});run(g,.1);near(g.stat(t,'root'),0);const other=g.makeChampion('ezra',0,20,'top');Object.assign(other,{x:t.x,y:t.y,lastDamageAt:100,lastAttackAt:100});select(other,3);g.attack(other,other);run(g,.46);near(g.stat(t,'root'),0);
});
test('ultimate stores the last normal basic weapon independently of tactical history and restores it on both exits',()=>{
 for(const index of[0,1,2,3])for(const exit of['expiry','empty']){const{g,p}=arena();select(p,index);g.attack(p,g.input.aim);run(g,.85);assert.equal(p.state.ezraLastBasicWeapon,index);assert.ok(g.cast(p,'q',g.input.aim));run(g,.85);assert.equal(p.state.ezraLastBasicWeapon,index);const ammo=p.ammo;g.cast(p,'r',g.input.aim);assert.equal(p.state.ezraNormal.returnWeapon,index);p.state.ezraLastWeapon=(index+1)%4;if(exit==='expiry'){g.time+=10;Ezra.tick(g,p,0);}else for(let n=0;n<4;n++){p.attackCd=0;g.attack(p,p);}assert.equal(Ezra.ultimate(g,p),false);assert.equal(p.state.weapon,index);assert.equal(p.ammo,ammo);}
});
test('snapshots preserve shield expiry, hammer strike number and the saved basic return weapon',()=>{
 const{g,p}=arena();g.attack(p,g.input.aim);run(g,.7);g.attack(p,g.input.aim);run(g,.31);const client=arena().g;assert.ok(applySnapshot(client,new SnapshotWriter().capture(g,true),p.id));assert.equal(client.player.state.ezraAttack.hammerStrike,2);assert.equal(client.player.state.ezraLastBasicWeapon,1);near(client.shield(client.player),p.maxHp*.12);run(g,.4);g.cast(p,'r',g.input.aim);assert.ok(applySnapshot(client,new SnapshotWriter().capture(g,true),p.id));assert.equal(client.player.state.ezraNormal.returnWeapon,1);
});
