import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { NEUTRAL,combatStyle,hitStyle,insideShape,visualShape } from '../src/combat-style.js';
import { championPresentation,ChampionVFX } from '../src/champion-vfx.js';
import { projectileAppearance } from '../src/projectile-vfx.js';
import { SkillVFX,VFX_LIMITS } from '../src/skill-vfx.js';
import { renderAnchor,leapLift } from '../src/projection-25d.js';
import { rectangle } from '../src/reworks.js';
const camera={width:1600,height:1000,scale:32,worldToScreen:(p,z=0)=>({x:p.x*32,y:p.y*22-z*32})};
const run=(g,s)=>{for(let i=0;i<s*60;i++)g.step(1/60);};
function arena(key='meursault'){
 const g=new Game(key,'top',{mode:'training',seed:28}),p=g.player;g.units=[p];g.effects=[];g.projectiles=[];g.pending=[];g.events=[];g.zones=[];g.time=10;g.practice.lineStopped=true;
 g.map={bounds:{x:0,y:0,w:80,h:60},walls:[]};g.bounds=g.map.bounds;for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 Object.assign(p,{x:20,y:20});const t=g.makeChampion('faust',1,10);Object.assign(t,{x:23,y:20,hp:100000,maxHp:100000});return {g,p,t};
}
test('ordinary physical hits are achromatic solid fragments, with explicitly typed exceptions',()=>{
 const {g,p}=arena();for(const key of ['faust','sinclair','meursault','gubo','nelly','outis','heathcliff','rodya'])assert.deepEqual(combatStyle(key,g,null,{kind:'basic'}),NEUTRAL,key);
 assert.equal(combatStyle('honglu',g,null).element,'water');assert.equal(combatStyle('marton',g,null).element,'wood');assert.equal(combatStyle('yi',g,null).element,'mirror');
 p.key='sora';g.addBuff(p,'soraEgo',20);assert.equal(combatStyle('sora',g,p).element,'metal');p.key='yan';g.addBuff(p,'yanDistorted',20);assert.equal(combatStyle('yan',g,p).element,'liquid');
 assert.equal(hitStyle(g,{key:'nelly'},{type:'nellyProc'}).shape,'slash');assert.equal(hitStyle(g,{key:'ryoshu'},{slot:'q'}).shape,'slash');
});
test('action palettes distinguish normal attacks, skills and empowered weapon states',()=>{
 const {g,p}=arena('rodya');assert.equal(combatStyle('rodya',g,p,{kind:'basic'}).element,'metal');assert.equal(combatStyle('rodya',g,p,{kind:'projectile',slot:'r'}).element,'ice');
 p.key='gubo';g.addBuff(p,'guboReload',4);assert.equal(combatStyle('gubo',g,p).color,'#6f162a');p.key='myo';g.addBuff(p,'rabbitFrenzy',4);assert.equal(combatStyle('myo',g,p).color,'#efab61');
 p.key='sinclair';p.visualCast={healthy:true};const high=combatStyle('sinclair',g,p,{slot:'r'});p.visualCast.healthy=false;const low=combatStyle('sinclair',g,p,{slot:'r'});assert.notEqual(high.color,low.color);assert.equal(high.element,'wood');
});
test('damage observations attach compact physical hits to a moving torso and reset their merge timer',()=>{
 const {g,p,t}=arena(),v=new SkillVFX();g.deal(p,t,10);v.sync(g,camera);const e=v.emitters.find(e=>e.body);assert.equal(e.ownerId,t.id);assert.equal(e.height,1.25);assert.equal(e.color,NEUTRAL.color);assert.ok(v.particles.every(p=>['chip','spark'].includes(p.form)&&p.size<=.12));
 g.time+=.01;g.deal(p,t,10);v.sync(g,camera);assert.equal(v.emitters.filter(e=>e.body).length,1);v.prepare(camera,1600,1000);const before=v.frame[0].pose.x;t.x+=2;v.prepare(camera,1600,1000);assert.ok(Math.abs(v.frame[0].pose.x-before-2)<1e-8);
 g.time=1;g.effects=[];g.deal(p,t,10);v.sync(g,camera);assert.equal(v.emitters.filter(e=>e.body).length,1);
});
test('rectangle, cone and circle rendering volumes use the actual damage geometry',()=>{
 const {g,p}=arena('meursault');g.action(p,'basic',()=>rectangle(g,p,{x:1,y:0},2.6,2.6,0));const f=g.effects.find(f=>f.type==='strikeRect');assert.deepEqual(f.shape,{kind:'rect',range:2.6,width:2.6,angle:0});
 const v=new SkillVFX();v.sync(g,camera);const emission=v.emitters.find(e=>!e.body);assert.deepEqual(emission.shape,f.shape);g.time+=.1;v.advance(g.time);v.prepare(camera,1600,1000);assert.ok(v.frame.every(f=>!f.p.volume||insideShape(f.p.volume.shape,f.pose.x-f.p.volume.x,f.pose.y-f.p.volume.y)));
 assert.ok(insideShape({kind:'rect',range:3,width:2,angle:Math.PI/2},-.9,2));assert.ok(!insideShape({kind:'rect',range:3,width:2,angle:0},3.01,0));assert.ok(!insideShape({kind:'cone',range:3,spread:1,angle:0},-1,0));assert.ok(insideShape({kind:'circle',range:2},0,1.99));
 assert.deepEqual(visualShape({type:'gregorPierce',r:6,width:1.2,angle:.2}),{kind:'rect',range:6,width:2.4,angle:.2});
});
test('overlapping emitters cannot accumulate an excessive sprite highlight',()=>{
 const v=new SkillVFX(),p={x:20,y:20};v.advance(1);v.emit('explosion',p,1,{color:'#e6e7e9',light:1});const one=v.lightAt(p).strength;for(let i=0;i<25;i++)v.emit('explosion',p,1,{color:'#e6e7e9',light:1});assert.equal(v.lightAt(p).strength,one);assert.ok(one<=VFX_LIMITS.highlight);
});
test('Ishmael shockwave keeps its volume centered on her moving ground position',()=>{
 const {g,p}=arena('ishmael'),v=new SkillVFX();g.effects.push({type:'ishmaelShock',theme:'ishmael',source:p.id,x:p.x,y:p.y,r:4.5,life:.6,maxLife:.6});v.sync(g,camera);p.x+=1;p.y+=.5;v.prepare(camera,1600,1000);const e=v.emitters[0];assert.equal(e.x,p.x);assert.equal(e.y,p.y);assert.equal(e.shape.range,4.5);assert.ok(v.frame.every(f=>insideShape(e.shape,f.pose.x-p.x,f.pose.y-p.y)));
});
test('buffs and shields select one vivid aura while dimming and freeze are state driven',()=>{
 const {g,p}=arena('gubo');g.addShield(p,100,'test',3);g.addBuff(p,'guboReload',4);const look=championPresentation(g,p);assert.equal(look.aura.color,'#6c1429');assert.ok(look.aura.strength>=.65&&look.aura.strength<=1);assert.equal(look.dim,1);
 p.key='rudolph';p.state.exhaustedUntil=g.time+2;assert.ok(championPresentation(g,p).dim<1);p.key='dongbaek';g.status(p,'disarm',1,2);assert.ok(championPresentation(g,p).dim<1);g.status(p,'stun',1,2,{key:'rodya'});assert.equal(championPresentation(g,p).frozen,true);
});
test('projectiles carry material shapes and actual widths at torso height',()=>{
 const {g,p}=arena();for(const [key,type] of [['gubo','bullet'],['nelly','knife'],['ppui','nail'],['rodya','axe'],['yi','glass'],['ishmael','harpoon'],['ahab','harpoon']]){p.key=key;const a=projectileAppearance({source:p,theme:key,width:.3,slot:'r'},g);assert.equal(a.type,type);assert.equal(a.width,.6);assert.ok(a.height>.5);if(key==='rodya')assert.ok(a.spin);}
 assert.equal(projectileAppearance({source:p,swordWave:true,width:1.89},g).type,'wave');assert.equal(projectileAppearance({source:{kind:'tower'}},g).height,2.1);
});
test('Sora tactical miss leaves a footprint, and transformed claws use the dash trail volume',()=>{
 const {g,p,t}=arena('sora');t.x=70;g.cast(p,'q',{x:27,y:20});let cracks=false;for(let i=0;i<80;i++){g.step(1/60);cracks||=g.effects.some(f=>f.type==='soraCracks');}assert.ok(cracks);
 g.addBuff(p,'soraEgo',20);p.state.egoQCharges=2;p.qCd=0;g.cast(p,'q',{x:p.x+5,y:p.y});let claw;for(let i=0;i<60&&!claw;i++){g.step(1/60);claw=g.effects.find(f=>f.type==='soraClaw');}assert.ok(claw&&claw.shape?.kind==='rect');assert.ok(claw.shape.range>0&&claw.shape.width>0);
});
test('Faust delayed ultimate, Yan sword and normal state transitions reach champion effects once',()=>{
 const {g,p,t}=arena('faust'),v=new ChampionVFX(new SkillVFX());g.cast(p,'r',t);v.sync(g);run(g,1.3);v.sync(g);assert.ok(v.effects.some(f=>f.type==='formulaField'));const n=v.effects.length;v.sync(g);assert.equal(v.effects.length,n);
 g.effects.push({source:p.id,type:'yanGreatsword',x:t.x,y:t.y,r:7.5});v.sync(g);assert.ok(v.effects.some(f=>f.type==='fallenSword'&&f.r===7.5));
});
test('Starbuck rises vertically offscreen and descends vertically at its destination',()=>{
 const e={key:'starbuck',x:22,y:20,motion:{kind:'leap',visualOrigin:{x:20,y:20},dx:1,dy:0,total:6,minDuration:.7,elapsed:.07}};
 assert.deepEqual(renderAnchor(e),{x:20,y:20});assert.ok(leapLift(e)>2&&leapLift(e)<6);e.motion.elapsed=.35;assert.deepEqual(renderAnchor(e),{x:26,y:20});assert.equal(leapLift(e),14);e.motion.elapsed=.665;assert.ok(leapLift(e)>0&&leapLift(e)<10);e.motion.elapsed=.7;assert.equal(leapLift(e),0);
});
