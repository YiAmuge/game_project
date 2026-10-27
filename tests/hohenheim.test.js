import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,damageFormula } from '../src/game.js';
import { WORLD,CHAMPIONS } from '../src/data.js';
import { distance } from '../src/geometry.js';
import { guardAlly } from '../src/new-champions.js';
import { skillTargeting } from '../src/targeting.js';
import * as H from '../src/hohenheim.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function quiet(key='hohenheim'){
 const g=new Game(key,'bottom',{seed:200});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 const p=g.player;Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};g.input.aim={x:49,y:7};return {g,p};
}
function target(g,x=44,y=7,team=1){const t=g.makeChampion('faust',team,9);Object.assign(t,{armor:0,x,y,hp:100000,maxHp:100000,lastAttackAt:100,lastDamageAt:100});return t;}
test('Hohenheim taps fire one 100-damage beam with zero ammo and a hard .65-second interval',()=>{
 const {g,p}=quiet(),t=target(g);assert.equal(CHAMPIONS.hohenheim.ammo,0);assert.ok(g.attack(p,t));close(t.hp,100000);assert.ok(H.release(g,p,t));close(p.attackCd,.65);run(g,.1);close(100000-t.hp,damageFormula(100,5,1));close(p.ammo,0);
 assert.equal(g.attack(p,t),false);run(g,.54);assert.equal(g.attack(p,t),false);run(g,.02);assert.ok(g.attack(p,t));
});
for(const [seconds,hits] of [[0,1],[.44,1],[.45,2],[.89,2],[.9,3],[1.35,3],[1.5,3]])test(`charge held ${seconds}s fires exactly ${hits} beam(s), capped at three`,()=>{
 const {g,p}=quiet(),t=target(g),beams=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)beams.push(n);return deal(a,b,n,o);};g.attack(p,t);run(g,seconds);close(t.hp,100000);H.release(g,p,t);run(g,.3);assert.equal(beams.length,hits);beams.forEach(n=>close(n,100));
});
test('full charge reaches nine, deals 100 three times, and reduces movement twenty percent while held',()=>{
 const {g,p}=quiet(),t=target(g,49),speed=g.speed(p);g.attack(p,t);close(g.speed(p),speed*.8);run(g,1.6);close(H.chargeShape(g,p,t).range,9);close(t.hp,100000);H.release(g,p,t);close(g.speed(p),speed);run(g,.3);assert.ok(t.hp<100000);close(100000-t.hp,damageFormula(100,5,1)*3);
});
test('reload upgrades accelerate charge and extra ammo converts to damage and range without ammo consumption',()=>{
 const {g,p}=quiet(),t=target(g);p.upgrades.reload=3;p.augments=['magazine2'];g.attack(p,t);run(g,1.31);const s=H.chargeShape(g,p,t);close(s.progress,1);close(s.damage,110);close(s.range,10.5);H.release(g,p,t);close(p.ammo,0);
});
test('stun, recall, tactical movement and the death transition discard a partial charge',()=>{
 for(const kind of ['stun','recall','q','death']){const {g,p}=quiet(),t=target(g);g.attack(p,t);run(g,.3);
  if(kind==='stun'){g.status(p,'stun',1,.3,t);run(g,.01);}else if(kind==='recall')g.recall(p);else if(kind==='q')g.cast(p,'q',t);else g.deal(t,p,999999,{fixed:true});
  assert.equal(p.state.hohenCharge,undefined,kind);assert.equal(H.release(g,p,t),false);close(t.hp,100000);
 }
});
test('posthumous attacks always fire maximum charge and holding attack cannot exceed one burst per .65 seconds',()=>{
 const {g,p}=quiet(),t=target(g),beams=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)beams.push({n,at:g.time,serial:p.attackSerial});return deal(a,b,n,o);};g.deal(t,p,999999,{fixed:true});g.input.fire=true;g.input.aim=t;run(g,2.4);
 assert.equal(p.attackSerial,2);assert.equal(beams.length,6);beams.forEach(b=>close(b.n,100));const starts=[1,2].map(i=>beams.find(b=>b.serial===i).at);for(let i=1;i<starts.length;i++)assert.ok(starts[i]-starts[i-1]>=.65-1e-6);close(p.hp,0);assert.equal(p.state.hohenCharge,undefined);
});
test('normal Hohenheim bots finish charges instead of repeatedly canceling them with combat skills',()=>{
 const {g,p}=quiet(),t=target(g);p.player=false;g.aiChampion=Game.prototype.aiChampion;run(g,2);assert.ok(t.hp<100000);assert.ok(p.attackSerial>=1);
});
test('electric bloom ticks seven times then bursts three times',()=>{
 const {g,p}=quiet(),t=target(g,44);const hits=[];const deal=g.deal.bind(g);g.deal=(s,a,b,o)=>{if(s===p&&a===t)hits.push(b);return deal(s,a,b,o);};g.cast(p,'r',t);run(g,.24);assert.equal(hits.length,0);run(g,.02);assert.deepEqual(hits,[15]);run(g,1.8);assert.equal(hits.filter(x=>x===15).length,7);assert.equal(hits.filter(x=>x===150).length,3);assert.ok(g.stat(t,'stun'));
});
test('electric bloom expands in place while its target moves',()=>{
 const {g,p}=quiet(),t=target(g,44);g.cast(p,'r',t);const z=H.activeZone(g,p),x=z.x,y=z.y;t.x+=4;run(g,.5);close(z.x,x);close(z.y,y);close(z.r,5);assert.equal(g.cast(p,'r',t),false);
});
test('active electric bloom cannot spend cooldown on another cast',()=>{
 const {g,p}=quiet(),t=target(g,44);g.cast(p,'r',t);const z=H.activeZone(g,p),cd=p.rCd;assert.equal(g.cast(p,'r',{x:70,y:7}),false);close(p.rCd,cd);close(z.until,2.1);
});
test('enemies entering an expanding electric bloom take damage',()=>{
 const {g,p}=quiet(),t=target(g,44);t.alive=false;t.respawnAt=Infinity;g.cast(p,'r',{x:44,y:7});const z=H.activeZone(g,p);run(g,.5);t.alive=true;t.x=44;t.y=7;const hp=t.hp;run(g,.5);assert.ok(t.hp<hp);close(z.x,44);
});
test('Ahab cover and guard both include allies within eight units and reject allies just outside eight',()=>{
 for(const x of [47.99,48.01]){const {g,p}=quiet('ahab'),t=target(g,44),a=target(g,x,7,0);t.state.harpoon={source:p.id,team:0,until:10};const hp=t.hp;g.deal(a,t,100,{fixed:true,proc:false});close(hp-t.hp,x<48?130:100);close(skillTargeting(g,p,'q').radius,8);p.qCd=0;g.cast(p,'q',p);assert.equal(guardAlly(g,p),x<48?a:null);}
});
