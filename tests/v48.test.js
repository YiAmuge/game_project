import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WORLD } from '../src/data.js';
import { walkingBodyForm,walkFrameIndex,WALK_CYCLE_DISTANCE } from '../src/walk-animation.js';
function sample({slow=false,left=false}={}){
 const g=new Game('meursault','top',{seed:48}),e=g.player;
 for(const key of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[key]=()=>{};
 Object.assign(e,{x:30,y:20});g.units=[e];g.effects=[];g.minionQueue=[];g.wave=100;g.map={bounds:WORLD,walls:[]};g.input.aim={x:left?20:40,y:20};g.input.x=left?-1:1;
 if(slow)g.status(e,'slow',.5,5);
 const counts=Array(6).fill(0);while(Math.abs(e.x-30)<WALK_CYCLE_DISTANCE-1e-8){g.step(1/240);const form=walkingBodyForm(g,e);assert.ok(form);counts[Number(form.at(-1))]++;const before=form;assert.equal(walkingBodyForm(g,e),before);}
 const elapsed=g.time,travelled=Math.abs(e.x-30);g.input.x=0;g.step(1/240);assert.equal(walkingBodyForm(g,e),null);
 return {counts,elapsed,travelled};
}
test('Both legs hold contact and weight-bearing poses longer than passing poses',()=>{
 for(const left of [false,true]){const {counts}=sample({left});for(const [contact,load,passing] of [[0,1,2],[3,4,5]]){assert.ok(counts[contact]>counts[passing]*2,counts.join(','));assert.ok(counts[load]>counts[passing]*2,counts.join(','));assert.ok(Math.abs(counts[contact]-counts[load])<=2);}}
});
test('Variable frame timing preserves the 1.8-unit stride and follows slowed movement',()=>{
 const normal=sample(),slow=sample({slow:true});assert.equal(WALK_CYCLE_DISTANCE,1.8);
 assert.ok(Math.abs(normal.travelled-1.8)<3.1/240);assert.ok(Math.abs(normal.elapsed-1.8/3.1)<1/240);
 assert.ok(Math.abs(slow.elapsed-normal.elapsed*2)<2/240);for(let i=0;i<6;i++)assert.ok(Math.abs(slow.counts[i]-normal.counts[i]*2)<=3);
});
test('The weighted sequence keeps six distinct ordered poses and wraps cleanly at a complete stride',()=>{
 for(const [distance,frame] of [[0,0],[.374,0],[.375,1],[.749,1],[.75,2],[.899,2],[.9,3],[1.274,3],[1.275,4],[1.649,4],[1.65,5],[1.799,5],[1.8,0],[3.6,0]])assert.equal(walkFrameIndex(distance),frame,`${distance}`);
});
