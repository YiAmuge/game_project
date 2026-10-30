import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { SkillVFX } from '../src/skill-vfx.js';
import { ChampionVFX,fanFlight,fallingSwordHeight,inwardWaves } from '../src/champion-vfx.js';
import { ProjectileVFX,projectileAppearance,beamAppearance,whipVisualInterval } from '../src/projectile-vfx.js';
import { projectileDimensions,projectileHitWidth } from '../src/projectile-rules.js';
import { stackInfo } from '../src/overlays.js';
import { skillTargeting } from '../src/targeting.js';
const camera={width:1800,height:1200,scale:32,worldToScreen:(p,z=0)=>({x:p.x*32,y:p.y*22-z*32})};
const close=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function arena(key='faust'){
 const g=new Game(key,'top',{mode:'training',seed:31}),p=g.player;g.units=[p];g.effects=[];g.events=[];g.projectiles=[];g.pending=[];g.zones=[];g.time=10;g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:80,h:60},walls:[]};g.bounds=g.map.bounds;
 for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};Object.assign(p,{x:20,y:20});const t=g.makeChampion('faust',1,10);Object.assign(t,{x:25,y:20,hp:100000,maxHp:100000});return {g,p,t};
}
function run(g,s,fn=()=>{}){for(let i=0;i<Math.round(s*120);i++){g.step(1/120);fn();}}
test('Rodja keeps three toss results and buffs without a duplicate stack HUD',()=>{
 const {g,p}=arena('rodya');g.cast(p,'q',p);assert.equal(p.state.coinResults.length,3);assert.equal(p.state.coinHeads+p.state.coinTails>=3,true);assert.equal(stackInfo(p,g),null);assert.ok(g.buff(p,'coins')||g.buff(p,'coinSpeed'));
});
test('Rodja and Ishmael ultimate art is scaled independently of their unchanged collision widths',()=>{
 for(const [key,width] of [['rodya',.36],['ishmael',.585]]){
  const {g,p,t}=arena(key);t.x=35;g.cast(p,'r',t);if(key==='ishmael')run(g,.24);const shot=g.projectiles[0],style=projectileAppearance(shot,g),actual=projectileDimensions(style,40),full=projectileDimensions({...style,visualScale:1},40);
  assert.equal(shot.slot,'r');close(shot.width,width);close(projectileHitWidth(shot),width*1.1);close(actual.width,full.width/1.5);close(actual.length,full.length/1.5);
 }
});
test('Kim normal and counter sword waves use the exact live widths and retain damage, cadence and range',()=>{
 const {g,p,t}=arena('kim');g.cast(p,'r',t);run(g,.51);const normal=g.projectiles.find(p=>p.swordWave);assert.ok(normal);close(normal.width,.9);close(projectileHitWidth(normal),.99);assert.equal(normal.damage,450);assert.equal(normal.slot,'r');
 const b=arena('kim'),shots=[],bullet=b.g.bullet.bind(b.g);b.g.bullet=(...a)=>{shots.push({time:b.g.time,width:a[4].width,damage:a[2],range:a[3],slot:a[4].slot});return bullet(...a);};b.g.cast(b.p,'r',b.t);b.g.deal(b.t,b.p,1,{fixed:true});b.p.castSlot='q';run(b.g,.39);assert.equal(shots.length,4);
 shots.forEach((s,i)=>{close(s.width,1.26);assert.equal(s.damage,338);assert.equal(s.range,8);assert.equal(s.slot,'r');close(s.time-shots[0].time,.125*i,.009);});close(skillTargeting(b.g,b.p,'r').radius,1.386);
});
test('Kim reduced sword-wave collision hits at its boundary and misses outside it',()=>{
 for(const [side,hit] of [[.985,true],[1.005,false]]){
  const {g,p,t}=arena('kim');t.x=20.1;t.y=20+t.radius+side;g.bullet(p,{x:1,y:0},450,6,{width:.9,speed:20,swordWave:true});const hp=t.hp;g.updateProjectiles(.005);assert.equal(t.hp<hp,hit);
 }
});
test('Gubo bullets retain their dark red firing state and boosted aura after the buff ends',()=>{
 const {g,p,t}=arena('gubo');g.attack(p,t);let shot=g.projectiles[0],style=projectileAppearance(shot,g);assert.equal(style.color,'#651b2d');assert.equal(style.tint,true);assert.equal(style.aura,null);
 p.attackCd=0;g.addBuff(p,'guboReload',3);g.attack(p,t);shot=g.projectiles.at(-1);assert.equal(shot.guboEmpowered,true);delete p.buffs.guboReload;style=projectileAppearance(shot,g);assert.equal(style.aura,'#a32b44');assert.equal(style.color,'#8e2039');
 close(beamAppearance('gubo').layers[1][0],.1875);close(beamAppearance('rudolph').layers[1][0],.2625);
});
test('Rudolph visual pulses run on their own timeline without changing attack hits, SP or random state',()=>{
 const {g,p,t}=arena('rudolph'),v=new ProjectileVFX(new SkillVFX()),pulses=new Set(),hits=[];g.input.fire=true;g.input.aim={x:t.x,y:t.y};const deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)hits.push(n);return deal(a,b,n,o);};const ammo=p.ammo;
 close(whipVisualInterval(g,p),.4);run(g,2.85,()=>{const state=g.randomState;v.syncWhips(g);assert.equal(g.randomState,state);for(const pulse of v.whipPulses)pulses.add(pulse.bornAt);});
 assert.equal(hits.length,9);close(ammo-p.ammo,30);assert.equal(pulses.size,8);const at=[...pulses];for(let i=1;i<at.length;i++)close(at[i]-at[i-1],.4);
 const count=v.whipPulses.length;v.syncWhips(g);assert.equal(v.whipPulses.length,count);g.time=1;g.effects=[];v.syncWhips(g);assert.equal(v.whipPulses.length,0);
});
test('Ahab opening ultimate strikes emit exactly two water spins at their actual strike moments',()=>{
 const {g,p,t}=arena('ahab'),v=new ChampionVFX(new SkillVFX()),seen=new Set();g.cast(p,'r',t);run(g,.5,()=>{v.sync(g);for(const e of v.effects.filter(f=>f.type==='waterSpin')){assert.equal(e.r,2.5);seen.add(e.at);}});const at=[...seen];assert.equal(at.length,2);close(at[1]-at[0],.2,.009);
});
test('Ppui basics always create three nails without an allied regeneration effect',()=>{
 const {g,p,t}=arena('ppui'),v=new SkillVFX();t.x=60;const ally=g.makeChampion('yi',0,12);Object.assign(ally,{x:22,y:20});g.attack(p,ally);run(g,.22);v.sync(g,camera);assert.equal(g.buff(ally,'ppuiMending'),false);assert.equal(g.projectiles.filter(p=>p.theme==='ppui').length,3);assert.ok(!v.emitters.some(e=>e.shape&&!e.body));
});
test('Ppui ultimate has twenty-two forward visual nails per volley with the same real five damage waves',()=>{
 const {g,p,t}=arena('ppui'),damage=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)damage.push(n);return deal(a,b,n,o);};g.cast(p,'r',t);run(g,.01);const fx=g.effects.find(f=>f.type==='nailVolley'),flight=fanFlight({...fx,type:'nailFan',at:10},.18);assert.equal(flight.length,22);for(const p of flight)assert.ok(p.target.x>=fx.x);
 run(g,2.1);assert.equal(damage.length,5);close(damage.reduce((a,b)=>a+b,0),720);
});
test('Ppui tactical effect is centered on its caster with its real seven-unit radius',()=>{
 const {g,p}=arena('ppui'),v=new ChampionVFX(new SkillVFX()),point={x:24,y:21};g.cast(p,'q',point);v.sync(g);const f=v.effects.find(e=>e.type==='petalField');assert.equal(f.x,p.x);assert.equal(f.y,p.y);assert.equal(f.r,7);assert.equal(f.life,.6);
});
test('Yan sword falls only during the final 0.15 seconds and reaches ground at the damage moment',()=>{
 assert.equal(fallingSwordHeight(.151),null);assert.equal(fallingSwordHeight(-.01),null);close(fallingSwordHeight(.15),11);close(fallingSwordHeight(0),0);let previous=11;for(let remaining=.14;remaining>=0;remaining-=.01){const height=fallingSwordHeight(remaining);assert.ok(height<previous);previous=height;}
 const {g,p,t}=arena('yan');p.state.ominous=6;g.cast(p,'r',p);g.units=g.units.filter(e=>e.key!=='yanHand');g.cast(p,'q',t);const warning=g.effects.find(f=>f.type==='yanSwordWarning');assert.equal(warning.r,7.5);assert.equal(warning.source,p.id);assert.equal(warning.maxLife,1.75);const hp=t.hp;run(g,1.74);assert.equal(t.hp,hp);run(g,.02);assert.ok(t.hp<hp);
});
test('Marton suction waves move inward, stay bounded and use simulation time',()=>{
 const {g,p}=arena('marton');g.cast(p,'r',p);assert.equal(p.state.fairy.at,g.time);assert.equal(p.state.fairy.until,g.time+2.5);const a=inwardWaves(.1,0,6.8),b=inwardWaves(.2,0,6.8);assert.equal(a.length,3);for(let i=0;i<3;i++){assert.ok(b[i].r<a[i].r);assert.ok(b[i].r>=0&&b[i].r<=6.8);}assert.deepEqual(a,inwardWaves(.1,0,6.8));assert.deepEqual(inwardWaves(-1,0,6.8),[]);
});
