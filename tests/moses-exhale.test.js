import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {executeCommand} from '../src/online-game.js';
import * as Moses from '../src/moses.js';
const run=(g,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120);};
const exhales=(g,e)=>g.soundEvents.filter(s=>s.sourceId===e.id&&s.phase==='moses-exhale').length;
function arena(){
 const g=new Game('moses','support',{mode:'training',seed:104}),p=g.player;g.units=[p];g.map={walls:[],bounds:{x:0,y:0,w:100,h:100}};g.bounds=g.map.bounds;
 g.aiChampion=g.aiNeutral=g.aiMinion=g.aiStructure=()=>{};Object.assign(g.practice,{lineStopped:true,pauseXp:true});Object.assign(p,{x:40,y:20,lastCombat:999,lastDamageAt:999});g.input.aim={x:50,y:20};return{g,p};
}
test('a held Moses basic sounds once while every shot still consumes breath and grants its shield',()=>{
 const{g,p}=arena(),ally=g.makeChampion('faust',0,2);Object.assign(ally,{x:43,y:20});g.input.fire=true;run(g,.91);
 assert.equal(p.attackSerial,4);assert.equal(Moses.air(g,p),26);assert.equal(g.shield(ally),60);assert.equal(exhales(g,p),1);
});
test('releasing and resuming an attack resets exhaling before the natural-regeneration delay',()=>{
 const{g,p}=arena();g.input.fire=true;run(g,.31);assert.equal(exhales(g,p),1);g.input.fire=false;run(g,.30);g.input.fire=true;run(g,.01);assert.equal(exhales(g,p),2);assert.equal(p.attackSerial,3);
});
test('queued enhancements and ordinary breaths share one uninterrupted attack sound',()=>{
 const{g,p}=arena();g.cast(p,'q',p,{direction:'up'});g.cast(p,'q',p,{direction:'left'});g.input.fire=true;run(g,.61);
 assert.equal(p.attackSerial,3);assert.equal(Moses.air(g,p),29);assert.deepEqual(Moses.pending(p),[]);assert.equal(exhales(g,p),1);assert.ok(g.soundEvents.some(s=>s.phase==='moses-inhale'));
});
test('exhaustion and ultimate concentration reset the basic sound without suppressing ultimate audio',()=>{
 const{g,p}=arena();p.state.mosesAir=1;g.input.fire=true;run(g,2.1);assert.equal(exhales(g,p),2);assert.ok(g.soundEvents.some(s=>s.phase==='moses-inhale'));
 g.cast(p,'r',g.input.aim);run(g,1.51);assert.equal(g.soundEvents.filter(s=>s.phase==='moses-red-point').length,1);assert.equal(exhales(g,p),3);
});
test('AI attack runs keep their own sound until their shots stop, independently of local input',()=>{
 const{g}=arena(),bot=g.makeChampion('moses',1,3);Object.assign(bot,{x:50,y:20});for(let i=0;i<3;i++){assert.ok(g.attack(bot,{x:40,y:20}));run(g,.3);}assert.equal(exhales(g,bot),1);
 run(g,.1);assert.ok(g.attack(bot,{x:40,y:20}));assert.equal(exhales(g,bot),2);Moses.cancel(g,bot);assert.equal(bot.state.mosesExhaleAt,undefined);
});
test('the host uses the remote controller fire state and resets only that caster on release',()=>{
 const{g,p}=arena(),remote=g.makeChampion('moses',1,3);Object.assign(remote,{x:46,y:20});const input={x:0,y:0,fire:true,aim:{x:40,y:20}};g.controllers=new Map([[p.id,{connected:true,input:g.input}],[remote.id,{connected:true,input}]]);
 assert.ok(executeCommand(g,remote,{action:'attack',point:input.aim}));run(g,.91);assert.equal(exhales(g,remote),1);assert.equal(exhales(g,p),0);input.fire=false;run(g,.3);input.fire=true;run(g,.01);assert.equal(exhales(g,remote),2);assert.equal(g.player,p);
});
