import test from 'node:test';
import assert from 'node:assert/strict';
import { Camera } from '../src/camera.js';
import { Game } from '../src/game.js';
import { BUSHES, RULES } from '../src/data.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('player sprite center stays at the viewport center, including map edges',()=>{
  const camera=new Camera();
  for(const [width,height] of [[1440,900],[1920,1080],[800,600],[390,844],[2560,1080]])for(const p of [{x:3,y:16.2},{x:32,y:18},{x:63,y:35}]){
    camera.update(width,height,p,true);const screen=camera.worldToScreen({x:p.x,y:p.y-.7});
    close(screen.x,width/2);close(screen.y,height/2);assert.ok(camera.bounds.w<=30.0001);assert.ok(camera.bounds.h<=18.0001);
  }
});
test('screen-to-world aim follows movement without moving the pointer',()=>{
  const camera=new Camera();camera.update(1440,900,{x:10,y:10},true);
  const before=camera.screenToWorld(1000,300);camera.update(1440,900,{x:15,y:12},true);
  const after=camera.screenToWorld(1000,300);close(after.x-before.x,5);close(after.y-before.y,2);
  const point=camera.worldToScreen(after);close(point.x,1000);close(point.y,300);
});
test('bush layout is symmetric and includes inner, outer and flank green connectors',()=>{
  assert.equal(BUSHES.length,16);
  for(const b of BUSHES)assert.ok(BUSHES.some(m=>Math.abs(m.x-(RULES.width-b.x-b.w))<1e-7&&m.y===b.y&&m.w===b.w&&m.h===b.h));
});
function setup(){
  const g=new Game(),enemy=g.champions(1).find(c=>c.key==='faust'),patch=BUSHES[0];
  enemy.x=patch.x+patch.w/2;enemy.y=patch.y+patch.h/2;
  g.champions(0).forEach((a,i)=>{a.x=3;a.y=16+i;});g.time=10;
  return {g,enemy};
}
test('bush hides distant enemy while allowing teammate and close-range shared detection',()=>{
  const {g,enemy}=setup();assert.equal(g.visibleTo(0,enemy),false);assert.equal(g.visibleTo(1,enemy),true);
  const scout=g.champions(0)[1];scout.x=enemy.x-1;scout.y=enemy.y;assert.equal(g.visibleTo(0,enemy),true);
  scout.alive=false;assert.equal(g.visibleTo(0,enemy),false);
});
test('attack and skill reveal a hidden champion for 1.25 seconds',()=>{
  const {g,enemy}=setup();assert.equal(g.visibleTo(0,enemy),false);
  g.attack(enemy,{x:enemy.x-5,y:enemy.y});assert.equal(g.visibleTo(0,enemy),true);
  g.time+=1.3;assert.equal(g.visibleTo(0,enemy),false);
  g.cast(enemy,'q',{x:enemy.x-5,y:enemy.y});assert.equal(g.visibleTo(0,enemy),true);
});
test('hidden bush champions can still be hit by manually aimed damage',()=>{
  const {g,enemy}=setup();const hp=enemy.hp;g.deal(g.player,enemy,100,{fixed:true});
  assert.equal(enemy.hp,hp-100);assert.equal(g.visibleTo(0,enemy),true);
});
test('legacy auto-aim input cannot fire the player weapon',()=>{
  const {g,enemy}=setup();g.aiChampion=()=>{};g.aiMinion=()=>{};g.aiNeutral=()=>{};g.aiStructure=()=>{};
  g.player.x=30;g.player.y=5;enemy.x=34;enemy.y=5;g.input.auto=true;
  g.step(1/30);assert.equal(g.player.ammo,3);assert.equal(g.projectiles.length,0);
});
