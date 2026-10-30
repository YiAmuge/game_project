import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {distance} from '../src/geometry.js';
import {KROMER} from '../src/kromer.js';
import {skillTargeting} from '../src/targeting.js';
import {skillReference} from '../src/skill-reference.js';
import {canRecast} from '../src/skills.js';
import * as Training from '../src/training.js';
import {FRAMES,drawFace} from '../src/art.js';
import {KROMER_WEAPON_MOTION,kromerWeaponPose} from '../src/weapon-art.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function practice(){const g=new Game('kromer','top',{mode:'training'}),p=g.player,t=g.champions(1).find(e=>e.trainingDummy?.infinite);g.units=[p,t];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:100,h:100},walls:[]};g.bounds=g.map.bounds;Object.assign(p,{x:t.x-6,y:t.y});g.input.aim={x:t.x,y:t.y};return{g,p,t};}
function run(g,s){for(let n=0;n<Math.round(s*120);n++)g.step(1/120);}
test('Kromer Q marks an infinite damage dummy and the real recast reaches and stuns it',()=>{const{g,p,t}=practice(),hp=t.hp;assert.ok(g.cast(p,'q',t));run(g,.35);near(t.hp,hp);assert.ok(Training.metric(g,t).total>0);assert.equal(p.state.kromerQMark?.targetId,t.id);assert.ok(canRecast(g,p,'q'));const damage=Training.metric(g,t).total,cd=p.qCd;assert.ok(g.cast(p,'q',p));assert.equal(p.motion?.actionTag,'kromerQDash');run(g,.3);assert.ok(p.x>t.x-2);assert.ok(distance(p,t)<1.1);assert.ok(Training.metric(g,t).total>damage);assert.equal(g.stat(t,'stun'),1);assert.ok(p.qCd<cd&&p.qCd>8);});
test('shield-only dummy hits enable recast but invulnerable dummy hits do not',()=>{for(const immune of [false,true]){const{g,p,t}=practice();if(immune)t.invulnerableUntil=10;else g.addShield(t,1000,'test',10);g.cast(p,'q',t);run(g,.35);assert.equal(canRecast(g,p,'q'),!immune);near(t.hp,t.maxHp);}});
test('Kromer impalement completes in 0.12 seconds while retaining its 0.3-second damage cadence',()=>{const{g,p,t}=practice();p.state.kromerGrab={target:t,angle:0};p.state.kromerStrikeAt=g.time;g.time+=.06;near(kromerWeaponPose(g,p).thrust,.5);g.time+=.06;near(kromerWeaponPose(g,p).thrust,0);near(KROMER_WEAPON_MOTION.torsoDrop,1.05*.3);});
test('Jamila and Kromer face-only crops contain the full head, exclude torso rows and feed the shared portrait renderer',()=>{for(const key of ['jamila','kromer']){const f=FRAMES[key],[x,y,w,h]=f.face;assert.equal(y,0);assert.ok(w>=176&&h>=156);assert.ok(y+h<=158);assert.ok(x>=0&&x+w<=f.w);let crop;const c={save(){},restore(){},drawImage(...a){crop=a;}};const image={complete:true,naturalWidth:1024};drawFace(c,key,image,0,0,120);assert.deepEqual(crop.slice(1,5),[f.x+x,f.y+y,w,h]);near(crop[7]/crop[8],w/h);}});

test('Kromer Q has nine-unit projectile travel and shares that range with targeting, mobile aim and the codex',()=>{const{g,p,t}=practice();Object.assign(t,{x:p.x+8.8,y:p.y});t.trainingDummy.home={x:t.x,y:t.y};near(KROMER.qRange,9);near(skillTargeting(g,p,'q').range,9);assert.match(JSON.stringify(skillReference('kromer',2).ranges),/사거리 9/);assert.ok(g.cast(p,'q',t));near(g.projectiles[0].remaining,9);run(g,.4);assert.equal(p.state.kromerQMark?.targetId,t.id);});
