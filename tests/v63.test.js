import test from'node:test';
import assert from'node:assert/strict';
import{Game}from'../src/game.js';
import*as Jamila from'../src/jamila.js';
import*as Augments from'../src/augments.js';
import{MatchPresentation,MATCH_INTRO,cinematicCamera}from'../src/match-presentation.js';
import{BRIEFING_LINES,briefingOpacity,blackRevealOpacity,drawBlackReveal,drawBriefing,drawRain,rainParticles}from'../src/match-weather.js';
import{Camera25D}from'../src/camera-25d.js';
import{equipmentPose,jamilaWeaponPose,weaponGeometry}from'../src/weapon-art.js';
import{gripLayout,gripSourcePoint}from'../src/weapon-grips.js';
import{championHud}from'../src/overlays.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function arena(key='jamila'){
 const g=new Game(key,'bottom',{mode:'training',seed:63}),p=g.player;g.units=[p];g.events=[];g.effects=[];g.projectiles=[];g.pending=[];g.zones=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,lastDamageAt:999,lastAttackAt:999});return{g,p};
}
function hero(g,team=1,x=46,y=25){const e=g.makeChampion('faust',team,g.nextId+20);Object.assign(e,{x,y,hp:10000,maxHp:10000,armor:0,lastDamageAt:999,lastAttackAt:999});return e;}
test('Jamila sustained fire keeps the 0.15-second average even at the real 30-Hz game step',()=>{
 const{g,p}=arena();g.input.fire=true;g.input.aim={x:47,y:25};for(let i=0;i<45;i++)g.step(1/30);const shots=g.soundEvents.filter(s=>s.kind==='shot'&&s.sourceId===p.id);assert.equal(shots.length,10);assert.ok(Math.abs(shots.at(-1).at-shots[0].at-(shots.length-1)*.15)<1/30);assert.equal(p.ammo,6);
});
test('tactical cancels an empty reload immediately and restores exactly six rounds after hitting multiple enemies',()=>{
 const{g,p}=arena();hero(g,1,45);hero(g,1,45,26);p.ammo=0;Jamila.beginReload(g,p);run(g,.5);assert.ok(Jamila.reloadFraction(p)>.3);assert.ok(g.cast(p,'q',{x:50,y:25}));assert.equal(Jamila.reloading(p),false);run(g,.1);assert.equal(p.ammo,0);assert.equal(Jamila.reloading(p),false);run(g,.1);assert.equal(p.state.jamilaQ.phase,'slash');assert.equal(p.ammo,6);assert.equal(Jamila.reloading(p),false);run(g,.6);assert.ok(g.attack(p,{x:50,y:25}));assert.equal(p.ammo,5);
});
test('tactical misses never create ammunition and an interrupted empty reload restarts from zero after the motion',()=>{
 const{g,p}=arena();p.ammo=0;Jamila.beginReload(g,p);run(g,1);g.cast(p,'q',{x:50,y:25});run(g,.55);assert.equal(p.ammo,0);assert.equal(Jamila.reloading(p),false);run(g,.2);assert.ok(Jamila.reloading(p));assert.ok(Jamila.reloadFraction(p)<.15);assert.equal(p.ammo,0);
});
test('tactical refill respects the current upgraded ammo cap and does not count targets',()=>{
 const{g,p}=arena();p.augments=['magazine2'];p.ammo=22;hero(g);hero(g,1,45,26);g.cast(p,'q',{x:50,y:25});run(g,.2);assert.equal(p.ammo,24);
});
test('Kim passive uses the caster maximum health for every ally and holds both shield and buff for five seconds',()=>{
 const{g,p}=arena('kim'),ally=hero(g,0,41),enemy=hero(g);p.upgrades.health=1;g.refreshEquipment(p);g.deal(p,enemy,1);const amount=60+p.maxHp*.012;near(g.shield(p),amount);near(g.shield(ally),amount);near(p.shields[0].until,5);near(ally.buffs.swordDiscipline,5);near(g.haste(ally),.12);near(g.reloadMultiplier(ally),1.12);run(g,4.99);assert.ok(g.discipline(p));run(g,.02);assert.equal(g.discipline(p),false);near(g.haste(ally),0);
});
test('Kim exclusive shield grants sword discipline, keeps its own cap and does not overwrite the on-hit shield',()=>{
 const{g,p}=arena('kim'),enemy=hero(g);assert.ok(g.buyAugment(p,'power15'));run(g,2);const unity=p.shields.find(s=>s.source===`sword-unity-${p.id}`);near(unity.value,p.maxHp*.01);assert.ok(g.discipline(p));near(g.haste(p),.12);near(g.reloadMultiplier(p),1.12);g.deal(p,enemy,1);assert.ok(p.shields.some(s=>s.source===`sword-${p.id}`));near(unity.value,p.maxHp*.01);p.shields=p.shields.filter(s=>s===unity);run(g,24);near(g.shield(p),p.maxHp*.12);p.augments=[];run(g,5.01);assert.equal(g.discipline(p),false);near(g.reloadMultiplier(p),1);
});
test('exclusive descriptions share the actual champion-specific effects without leaking to other champions',()=>{
 for(const[key,item]of[['kim','power15'],['jamila','highRisk']]){const effect=Augments.exclusiveAugments(key)[0];assert.equal(effect.key,item);assert.ok(Augments.augmentText({key},Augments.AUGMENTS.find(a=>a.key===item)).includes(effect.text));}assert.deepEqual(Augments.exclusiveAugments('faust'),[]);assert.match(Augments.exclusiveAugments('kim')[0].text,/본국검술/);
});
test('Jamila rifle has a black-glove support hand under its barrel while the kopis retains one pivot hand',()=>{
 const{g,p}=arena(),pose=equipmentPose(g,p);near(pose.right.y-pose.origin.y,-.57);const m=weaponGeometry('jamilaRifle',2.25),hands=gripLayout('jamila','jamilaRifle',m,.238),support=gripSourcePoint([.70,.60],m,.238);assert.equal(hands.length,2);near(hands[1].x,support.x);near(hands[1].y,support.y);assert.ok(hands[1].offHand);assert.ok(hands[1].x>hands[0].x+.5);assert.equal(gripLayout('jamila','jamilaKopis',weaponGeometry('jamilaKopis',1.75),.12).length,1);const before=jamilaWeaponPose(g,p).hand;p.y+=3;near(jamilaWeaponPose(g,p).hand.y-before.y,3);
});
test('Jamila overhead ammunition uses current | maximum and a 1.5-second full reload meter',()=>{
 const{g,p}=arena(),texts=[],rects=[],ctx=new Proxy({measureText:()=>({width:.2})},{get:(o,k)=>k in o?o[k]:k==='fillRect'?(...a)=>rects.push(a):()=>{},set:(o,k,v)=>(o[k]=v,true)}),r={ctx,text:(...a)=>texts.push(a),polygon(){},line(){},circle(){}};p.ammo=0;p.state.lcaReload={at:0,progress:.75};championHud(r,p,g);assert.ok(texts.some(t=>t[0]==='0 | 16'));assert.ok(rects.some(a=>a[2]===2.65*.5&&a[3]===.10));
});
test('a 0.3-second black reveal and 1.5-second briefing precede the unchanged battlefield sequence',()=>{
 const g=new Game('jamila','bottom',{seed:63}),presentation=new MatchPresentation(),n=g.units.find(e=>e.kind==='neutral');presentation.start(g);presentation.tick(1.8,g);assert.ok(g.hidden(n));near(cinematicCamera(g).view,1.6);presentation.tick(.199,g);assert.ok(g.hidden(n));presentation.tick(.001,g);assert.equal(g.hidden(n),false);assert.ok(g.hidden(g.player));presentation.tick(.4,g);near(cinematicCamera(g).view,1.6);presentation.tick(.25,g);near(cinematicCamera(g).view,1.3);presentation.tick(.25,g);assert.equal(g.presentation,undefined);near(g.time,0);near(MATCH_INTRO.duration,2.9);
});
test('briefing fills the screen, displays the requested two lines and dissolves completely by 1.5 seconds',()=>{
 const fills=[],texts=[],ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),fillRect:(...a)=>fills.push(a),fillText:(...a)=>texts.push(a)},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)}),camera={width:1440,height:950};drawBriefing(ctx,camera,.2);assert.deepEqual(fills[0],[0,0,1440,950]);assert.deepEqual(texts.map(t=>t[0]),BRIEFING_LINES);assert.ok(texts.every(t=>t[1]<1440*.1&&t[2]>950*.65));near(briefingOpacity(0),1);assert.ok(briefingOpacity(1)>.3&&briefingOpacity(1)<.8);near(briefingOpacity(1.5),0);const before=fills.length;drawBriefing(ctx,camera,1.5);assert.equal(fills.length,before);
});
test('rain covers the viewport in both match camera zooms, moves in world space and never renders in training',()=>{
 const camera=new Camera25D();for(const view of[1,1.6]){camera.update(1440,950,{x:42,y:24},true,view);const drops=rainParticles(camera,1),later=rainParticles(camera,1.1);assert.ok(drops.length>100&&drops.length<1500);assert.ok(drops.some(d=>d.from.x<144)&&drops.some(d=>d.from.x>1296));assert.ok(drops.some(d=>d.from.y<95)&&drops.some(d=>d.from.y>855));assert.notDeepEqual(drops,later);}let calls=0;const ctx=new Proxy({},{get:()=>()=>calls++,set:()=>true});drawRain(ctx,camera,{training:true},1);assert.equal(calls,0);const{g}=arena();const p=new MatchPresentation();p.start(g);assert.equal(g.presentation,undefined);assert.equal(p.blocking,false);
});

test('black screen fades into the briefing over exactly 0.3 seconds',()=>{near(blackRevealOpacity(0),1);near(blackRevealOpacity(.15),.5);near(blackRevealOpacity(.3),0);const fills=[],c={save(){},restore(){},fillRect:(...args)=>fills.push(args)};drawBlackReveal(c,{width:1440,height:950},0);near(c.globalAlpha,1);assert.equal(c.fillStyle,"#000");assert.deepEqual(fills[0],[0,0,1440,950]);drawBlackReveal(c,{width:1440,height:950},.3);assert.equal(fills.length,1);});
