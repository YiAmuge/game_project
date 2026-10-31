import{BASIC_FAN_ANGLE}from'../src/data.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { WALLS } from '../src/data.js';
import { blocked,distance } from '../src/geometry.js';
import { moveBody,canOccupy,carryFits } from '../src/collision.js';
import { carried } from '../src/attachments.js';
import { stackInfo } from '../src/overlays.js';
import { skillTargeting } from '../src/targeting.js';
import { tick as tickSkills } from '../src/skills.js';
import * as Sora from '../src/sora.js';

const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*60);i++)g.step(1/60);};
function quiet(key='kim'){
 const g=new Game(key,'top',{seed:47});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 const p=g.player;Object.assign(p,{x:40,y:7,lastAttackAt:100,lastDamageAt:100});g.units=[p];g.minionQueue=[];return {g,p};
}
function champ(g,team=1,x=42,y=7,key='faust'){
 const t=g.makeChampion(key,team,9);Object.assign(t,{armor:0,x,y,hp:10000,maxHp:10000,lastAttackAt:100,lastDamageAt:100});return t;
}
function grab(){const {g,p}=quiet(),t=champ(g);g.cast(p,'q',t);run(g,.2);assert.equal(carried(g,p),t);return {g,p,t};}

test('Sora normal head smash uses a small forward circle, while EGO scratches retain radius 2.7',()=>{
 const {g,p}=quiet('sora'),far=champ(g,1,44.5,7),wide=champ(g,1,40.5,10),back=champ(g,1,38,7);
 g.attack(p,{x:48,y:7});close(far.hp,10000);close(wide.hp,10000);close(back.hp,10000);close(g.attackRange(p),1.33);
 p.state.unlock=5;g.cast(p,'r',p);p.attackCd=0;p.ammo=2;const hp=far.hp;g.attack(p,{x:48,y:7});close(far.hp,hp);assert.ok(back.hp<10000);close(g.attackRange(p),2.7);
});
test('Sora becomes ready at exactly five unlocks and HUD exposes five slots',()=>{
 const {g,p}=quiet('sora');p.state.unlock=4;assert.equal(Sora.ready(g,p),false);const t=champ(g);t.hp=t.maxHp=1000;Sora.mark(g,p,t,'ultimate');g.deal(p,t,200,{fixed:true});
 assert.equal(Sora.ready(g,p),true);assert.equal(stackInfo(p,g).max,5);assert.match(stackInfo(p,g).label,/준비/);g.cast(p,'r',p);close(p.buffs.soraEgo-g.time,12);
});
test('Sora coordinate previews and actual dash lengths distinguish normal seven and EGO five point six',()=>{
 for(const ego of [false,true]){const {g,p}=quiet('sora');if(ego){p.state.unlock=5;g.cast(p,'r',p);}const range=ego?5.6:7;close(skillTargeting(g,p,'q').range,range);g.cast(p,'q',{x:52,y:7});run(g,1);close(p.x,40+range);assert.equal(p.motion,undefined);}
});
test('Sora normal dash hits enemies in its seventy percent wider contact area',()=>{
 const {g,p}=quiet('sora'),t=champ(g,1,43,8.3);g.cast(p,'q',{x:47,y:7});run(g,.5);assert.ok(t.hp<10000);assert.equal(g.stat(t,'stun'),1);close(t.y,8.3);
});
test('Kim initial and follow-up slash areas increase independently with stronger follow-up damage',()=>{
 const {g,p}=quiet(),first=champ(g,1,43.4,7),wide=champ(g,1,40+3*Math.cos(1.2),7+3*Math.sin(1.2));
 g.attack(p,{x:48,y:7});run(g,.22);close(10000-first.hp,225*.9);close(10000-wide.hp,225*.9);
 p.attackCd=0;p.ammo=1;g.attack(p,{x:48,y:7});close(10000-wide.hp,(225+210)*.9);
 const fx=g.effects.findLast(e=>e.type==='slash');close(fx.r,3.744*1.08);close(fx.spread,BASIC_FAN_ANGLE);
});
test('Kim holds with a 1.8-second stun and carries the victim atomically while walking',()=>{
 const {g,p,t}=grab(),offset={x:t.x-p.x,y:t.y-p.y},before={x:t.x,y:t.y};close(t.status.stun.until-.1,1.8,.1);assert.equal(g.stat(t,'root'),0);
 g.input.y=1;run(g,.35);g.input.y=0;assert.ok(t.y>before.y+.5);close(t.x-p.x,offset.x);close(t.y-p.y,offset.y);assert.equal(g.attack(t,p),false);
 const location={x:t.x,y:t.y};g.moveToward(t,{x:55,y:10},1);close(t.x,location.x);close(t.y,location.y);
});
test('carrying cannot put either body inside a wall, building, enemy or capture boundary',()=>{
 for(const obstacle of ['wall','tower','enemy','capture']){
  const {g,p,t}=grab();
  if(obstacle==='wall'){const w=WALLS[0],dx=w.x+.7-t.x,dy=w.y-1.5-t.y;p.x+=dx;p.y+=dy;t.x+=dx;t.y+=dy;}
  else if(obstacle==='tower')g.entity({kind:'tower',team:1,x:t.x,y:10,maxHp:5000,radius:1.2});
  else if(obstacle==='enemy')champ(g,1,t.x,10);
  else{g.status(t,'netCapture',1,5);t.state.netTrap={x:t.x,y:t.y,r:.8,until:5};}
  for(let i=0;i<60;i++){moveBody(g,p,0,.1);assert.equal(blocked(p.x,p.y,p.radius),false);assert.equal(blocked(t.x,t.y,t.radius),false);assert.ok(canOccupy(g,t,t));}
  if(obstacle==='capture')assert.ok(distance(t,t.state.netTrap)<=.8+1e-5);
 }
});
test('external knockback on Kim carries both safely; knockback on the victim releases the sword',()=>{
 const {g,p,t}=grab(),dy=t.y-p.y;g.startMotion(p,{x:0,y:1},1,{kind:'knock'});run(g,.2);assert.ok(p.y>7);close(t.y-p.y,dy);assert.equal(carried(g,p),t);
 assert.ok(g.startMotion(t,{x:0,y:1},1,{kind:'knock'}));assert.equal(p.state.swordGrab,undefined);assert.equal(g.stat(t,'stun'),0);run(g,.2);assert.ok(t.y>p.y);
});
test('overlap recovery cannot carry a victim across a wall even when both endpoints are clear',()=>{
 const {g,p,t}=grab(),w=WALLS[0];Object.assign(p,{x:w.x-.7,y:w.y-1.2});Object.assign(t,{x:w.x+.7,y:p.y});
 const end={x:p.x,y:p.y+w.h+2.6};assert.equal(blocked(end.x,end.y,p.radius),false);assert.equal(blocked(t.x,end.y,t.radius),false);assert.equal(carryFits(g,p,end),false);
});
test('a new sword grab stops existing forced motion and cannot reuse an immune victim’s old stun',()=>{
 const {g,p}=quiet(),t=champ(g);g.startMotion(t,{x:0,y:1},1,{kind:'knock'});g.cast(p,'q',t);run(g,.2);assert.equal(carried(g,p),t);assert.equal(t.motion,undefined);
 const f=quiet(),immune=champ(f.g);f.g.status(immune,'stun',1,5);immune.ccImmuneUntil=5;f.g.cast(f.p,'q',immune);run(f.g,.25);assert.equal(f.p.state.swordGrab,undefined);assert.equal(immune.state.swordHeldBy,undefined);
});
for(const end of ['expiry','cleanse','owner-death','victim-death','recast'])test(`Kim carried stun and collision exception are removed on ${end}`,()=>{
 const {g,p,t}=grab();
 if(end==='expiry')run(g,1.8);
 if(end==='cleanse'){t.status={};run(g,.02);}
 if(end==='owner-death')g.kill(p,t);
 if(end==='victim-death')g.kill(t,p);
 if(end==='recast'){const cd=p.qCd;g.cast(p,'q',{x:48,y:7});close(p.qCd,cd);assert.ok(t.motion?.forced);}
 assert.equal(p.state.swordGrab,undefined);assert.equal(t.state.swordHeldBy,undefined);assert.equal(g.stat(t,'stun'),0);
});
test('Ppui minion sharing grants fifteen percent XP without boosting gold, direct kills or automatic XP',()=>{
 const {g,p}=quiet('ppui'),a=champ(g,0,41,7,'meursault'),m=g.entity({kind:'minion',team:1,x:42,y:7,maxHp:100,radius:.3});
 const finisher=g.entity({kind:'minion',team:0,x:42,y:7,maxHp:100});g.kill(m,finisher);close(p.xp,24*.25*1.15);close(a.xp,24*.25);close(p.gold,253.75);const before=p.xp;g.award(p,24,0);close(p.xp-before,24);run(g,1);close(p.xp-before,27);
});
test('Ppui tactical performs ten target-health healing ticks independently of frame rate',()=>{
 function sample(dt){const {g,p}=quiet('ppui'),t=champ(g,0,46.8,7);t.hp=t.maxHp-2000;g.cast(p,'q',p);for(let i=0;i<3/dt;i++){g.time+=dt;tickSkills(g,t,dt);}return t.hp;}const {g}=quiet('ppui'),t=champ(g,0,46.8,7),expected=t.maxHp-2000+10*(25+t.maxHp*.015)*.82*.9;close(sample(.1),expected);close(sample(.02),expected);
});
test('Ppui tactical heals every allied champion in seven range and leaves outsiders alone',()=>{
 const {g,p}=quiet('ppui'),a=champ(g,0,42,7),b=champ(g,0,44,8,'yi'),out=champ(g,0,49,7);g.canNaturalHeal=()=>false;g.inSpawn=()=>false;for(const t of[p,a,b,out])t.hp-=1000;g.cast(p,'q',p);const before=[p.hp,a.hp,b.hp];run(g,1);[p,a,b].forEach((t,i)=>assert.ok(t.hp>before[i]));close(out.hp,9000);
});
test('Ppui ultimate refills ammunition without resetting its tactical cooldown, permits walking, and deals five moving waves of 144',()=>{
 const {g,p}=quiet('ppui'),t=champ(g,1,43,7);p.ammo=0;p.qCd=10;const waves=[],cone=g.cone.bind(g);g.cone=(e,d,r,a,n,fn)=>{if(e===p)waves.push({y:p.y,damage:n});return cone(e,d,r,a,n,fn);};
 g.cast(p,'r',t);close(p.qCd,10);close(p.ammo,g.ammoCap(p));assert.ok(!(p.channelUntil>g.time));g.input.y=1;run(g,.4);g.input.y=0;assert.ok(p.y>8);run(g,1.7);
 assert.equal(waves.length,5);assert.ok(waves.every(w=>w.damage===144));assert.ok(waves.at(-1).y>waves[0].y);
});
