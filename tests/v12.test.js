import * as Don from '../src/don.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.js';
import { CHAMPIONS } from '../src/data.js';
import { distance,blocked } from '../src/geometry.js';
import { skillTargeting } from '../src/targeting.js';
import { trap } from '../src/confinement.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*60);i++)g.step(1/60);};
function quiet(key='starbuck'){
 const g=new Game(key,'top',{seed:27});for(const f of ['aiChampion','aiMinion','aiNeutral','aiStructure'])g[f]=()=>{};
 const p=g.player,t=g.makeChampion('faust',1,9);Object.assign(p,{x:40,y:7});Object.assign(t,{x:42,y:7,hp:10000,maxHp:10000});g.units=[p,t];return {g,p,t};
}
function ally(g,key='meursault',x=41,y=9){const a=g.makeChampion(key,0,9);Object.assign(a,{x,y});return a;}
test('automatic XP is three per second except Faust nine, alive or dead',()=>{
 for(const key of ['faust','ppui','starbuck']){const {g,p,t}=quiet(key);run(g,1);close(p.xp,key==='faust'?9:3);g.kill(p,t);run(g,1);close(p.xp,key==='faust'?18:6);}
});
test('Starbuck jungle damage +12% and flat kill healing preserve +10% creep XP',()=>{
 const {g,p}=quiet();g.units=[p];p.hp-=500;const n=g.makeNeutral(43,7,'side');const hp=n.hp;g.deal(p,n,100,{fixed:true});close(hp-n.hp,112);const before=p.hp;g.kill(n,p);close(p.hp-before,150);close(p.xp,56.25*1.1);
});
test('Starbuck partial-ammo basics dash, use wider cone and 15% stronger damage',()=>{
 const {g,p,t}=quiet();p.ammo=1;Object.assign(t,{x:43,y:8.4});const hp=t.hp;assert.ok(g.attack(p,{x:48,y:7}));assert.ok(p.motion);close(hp-t.hp,218.5*.9);run(g,.5);assert.ok(p.x>42.8);
});
test('Starbuck third tactical hit roots for .35 seconds, damage and cadence increase correctly',()=>{
 const {g,p,t}=quiet();g.cast(p,'q',t);run(g,.59);assert.equal(g.stat(t,'root'),0);run(g,.03);assert.equal(g.stat(t,'root'),1);close(t.status.root.until,.95,.02);assert.ok(p.state.starbuckStab.until>g.time);
 close(10000-t.hp,150*(1+1.045+1.045**2)*.9);run(g,1);assert.equal(g.stat(t,'root'),0);
});
function capture(key='faust'){
 const {g,p,t}=quiet();t.key=key;t.name=CHAMPIONS[key].name;t.range=CHAMPIONS[key].range;t.ammo=CHAMPIONS[key].ammo;t.hp=4000;
 const other=g.makeChampion('faust',1,10);Object.assign(other,{x:46,y:8.3,hp:6000,maxHp:10000});Object.assign(t,{x:46,y:7});p.qCd=5;p.ammo=0;g.cast(p,'r',{x:46,y:7});run(g,.75);return {g,p,t,other};
}
test('ultimate traps only the lowest current-HP surviving champion and refills even on miss',()=>{
 const {g,p,t,other}=capture();assert.ok(trap(g,t));assert.equal(trap(g,other),null);close(g.stat(t,'armorWeak'),.1);close(p.qCd,0);close(p.ammo,g.ammoCap(p));
 const f=quiet();f.t.y=14;f.p.ammo=0;f.p.qCd=5;f.g.cast(f.p,'r',{x:46,y:7});run(f.g,.75);close(f.p.qCd,0);close(f.p.ammo,2);
});
test('capture permits walking inside, stops walking/dashes/knockback at the circle and expires',()=>{
 const {g,t}=capture(),net={...t.state.netTrap};g.units=[t];const x=t.x;g.moveToward(t,{x:net.x,y:net.y},.15);assert.notEqual(t.x,x);
 for(let i=0;i<40;i++)g.moveToward(t,{x:65,y:7},.1);assert.ok(distance(t,net)<=net.r+1e-5);
 t.x=net.x;t.y=net.y;g.startMotion(t,{x:1,y:0},5,{phaseEnemies:true});run(g,.4);assert.ok(distance(t,net)<=net.r+1e-5);assert.equal(t.motion,undefined);
 t.x=net.x;t.y=net.y;g.startMotion(t,{x:0,y:1},5,{kind:'knock'});run(g,.4);assert.ok(distance(t,net)<=net.r+1e-5);assert.equal(blocked(t.x,t.y,t.radius),false);
 run(g,3);assert.equal(trap(g,t),null);g.moveToward(t,{x:60,y:7},.5);assert.ok(distance(t,net)>net.r);
});
for(const key of ['ryoshu','ahab','sinclair','starbuck'])test(`capture also confines ${key} coordinate mobility before its damage`,()=>{
 const {g,t}=capture(key),net={...t.state.netTrap};g.units=[t];g.time+=.01;t.rCd=0;t.channelUntil=0;assert.ok(g.cast(t,'r',{x:55,y:7}));run(g,.8);assert.ok(distance(t,net)<=net.r+1e-5,`${key} escaped`);
});
test('Queequeg stats follow missing health immediately, including healing and max-HP growth',()=>{
 const {g,p,t}=quiet('queequeg');g.deal(t,p,p.maxHp*.4,{fixed:true});close(g.powerScale(p),1.16);close(g.armor(p),48);g.heal(null,p,p.maxHp*.3,false);close(g.powerScale(p),1.04);close(g.armor(p),12);g.award(p,6900,0);close(g.armor(p),0);close(g.attackRange(p),3);
});
test('Don tactical starts cooldown on release and rejects another charge until ready',()=>{
 const {g,p}=quiet('don');g.cast(p,'q',{x:45,y:7});close(p.qCd,0);assert.equal(g.cast(p,'q',p),false);run(g,1);assert.ok(Don.release(g,p,{x:45,y:7}));close(p.qCd,12);assert.equal(p.state.donCharge,undefined);assert.equal(g.cast(p,'q',p),false);run(g,12.01);assert.ok(g.cast(p,'q',p));
});
test('Don ultimate accepts an empty coordinate and applies seven-second lifesteal',()=>{
 const {g,p}=quiet('don');g.units=[p];assert.equal(skillTargeting(g,p,'r').confirm,false);assert.ok(g.cast(p,'r',{x:45,y:7}));close(p.motion.total,5);close(p.buffs.donLifesteal,7);run(g,.7);close(p.x,45);
});
test('Yi basic projectiles are 50% larger and pierce multiple enemies',()=>{
 const {g,p,t}=quiet('yi');t.x=42;const second=g.makeChampion('faust',1,10);Object.assign(second,{x:44,y:7,hp:10000,maxHp:10000});g.attack(p,{x:48,y:7});assert.ok(g.projectiles.every(b=>b.width===.27&&b.pierce===Infinity));run(g,.3);assert.ok(t.hp<10000&&second.hp<10000);
});
test('Yi ground effect spends ammo once per target per zone and stacks 3.5% slow on damage ticks',()=>{
 const {g,p,t}=quiet('yi');t.ammo=3;t.attackCd=10;g.cast(p,'q',t);run(g,.52);close(t.ammo,2);close(g.stat(t,'slow'),.035);run(g,1);close(t.ammo,2);close(g.stat(t,'slow'),.105);assert.ok(g.stat(t,'silence'));
});
test('Myo Q deals 65 per shot and frenzy lasts 4.5 with fifty percent basic-dash reduction',()=>{
 const {g,p,t}=quiet('myo');g.cast(p,'q',t);run(g,.25);assert.ok(g.projectiles.every(b=>b.damage===65));p.qCd=0;g.cast(p,'r',p);close(p.buffs.rabbitFrenzy-g.time,4.5);p.attackCd=0;g.attack(p,{x:47,y:7});const hp=p.hp;g.deal(t,p,100);close(hp-p.hp,100*1.12*.9*.5);
});
test('Ppui gains fifteen percent assist XP, without changing kill XP or ally rewards',()=>{
 const {g,p,t}=quiet('ppui'),a=ally(g);g.deal(p,t,1,{fixed:true});g.deal(a,t,1e6,{fixed:true});close(p.xp,80.5);close(a.xp,120);close(p.gold,250+40*4/3);
 const next=g.makeChampion('faust',1,20);Object.assign(next,{x:42,y:7});g.kill(next,p);close(p.xp,200.5);
});
test('Ppui empowers an ally without firing additional nails when the ally attacks',()=>{
 const {g,p,t}=quiet('ppui'),a=ally(g,'meursault',41,7);g.attack(p,a);assert.equal(p.state.empower.target,a.id);g.attack(a,t);run(g,.3);assert.equal(g.projectiles.filter(b=>b.theme==='ppui').length,0);
});
test('Ppui replacement removes previous healing target and Q reaches eight units to cleanse',()=>{
 const {g,p}=quiet('ppui');g.units=[p];const a=ally(g,'faust',42,7),b=ally(g,'yi',43,9);a.hp-=500;b.hp-=500;a.lastDamageAt=100;b.lastDamageAt=100;g.attack(p,a);p.attackCd=0;p.ammo=1;g.attack(p,b);const before=a.hp;run(g,.5);close(a.hp,before);assert.ok(b.hp>b.maxHp-500);
 Object.assign(b,{x:48,y:7});g.status(b,'stun',1,1);p.qCd=0;assert.ok(g.cast(p,'q',b));assert.equal(g.stat(b,'stun'),0);assert.ok(b.ccImmuneUntil>g.time);assert.equal(skillTargeting(g,p,'q').range,8);
});
test('Ppui ultimate deals five waves totaling seven hundred twenty before scaling',()=>{
 const {g,p,t}=quiet('ppui');const amounts=[],deal=g.deal.bind(g);g.deal=(a,b,n,o)=>{if(a===p&&b===t)amounts.push(n);return deal(a,b,n,o);};g.cast(p,'r',{x:48,y:7});run(g,2.1);assert.equal(amounts.length,5);close(amounts.reduce((a,b)=>a+b,0),720);
});
test('Kim hitting a champion gives 120 shields to nearby allies with reload/haste benefit',()=>{
 const {g,p,t}=quiet('kim'),a=ally(g,'yi');g.attack(p,t);run(g,.02);close(g.shield(p),120);close(g.shield(a),120);close(g.haste(p),.12);const shields=g.shield(p);run(g,.3);close(g.shield(p),shields);
});
test('Kim Q stabs and grabs, recast throws without a new cooldown and cleans up on death',()=>{
 const {g,p,t}=quiet('kim');assert.ok(g.cast(p,'q',t));run(g,.2);assert.equal(p.state.swordGrab.target,t);assert.equal(g.stat(t,'stun'),1);run(g,.2);const cd=p.qCd;assert.ok(g.cast(p,'q',{x:48,y:7}));close(p.qCd,cd);assert.equal(p.state.swordGrab,undefined);assert.equal(g.stat(t,'stun'),0);assert.ok(t.motion?.forced);
 const f=quiet('kim');f.g.cast(f.p,'q',f.t);run(f.g,.2);f.g.kill(f.p,f.t);assert.equal(f.g.stat(f.t,'stun'),0);
});
test('Kim half-second ultimate fires 450 or four sequential 338 waves at HP one',()=>{
 const {g,p,t}=quiet('kim'),shots=[],bullet=g.bullet.bind(g);g.bullet=(...args)=>{shots.push({at:g.time,damage:args[2]});return bullet(...args);};g.cast(p,'r',t);assert.ok(p.ccImmuneUntil>g.time);g.deal(t,p,1e6,{fixed:true});assert.ok(p.alive&&p.hp===1);assert.equal(p.state.counter,undefined);assert.equal(shots.length,1);run(g,.4);assert.deepEqual(shots.map(s=>s.damage),[338,338,338,338]);
 const f=quiet('kim');f.g.cast(f.p,'r',f.t);run(f.g,.51);const normal=f.g.projectiles.filter(b=>b.theme==='kim');assert.equal(normal.length,1);close(normal[0].damage,450);
});
test('new ordinary champions and augment codex share the gameplay definitions',()=>{
 assert.equal(Object.keys(CHAMPIONS).length,29);assert.ok(CHAMPIONS.kim&&CHAMPIONS.ppui);const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/id="archive" class="codex-page hidden"/);assert.match(main,/CodexScreen/);assert.match(readFileSync(new URL('../src/codex-screen.js',import.meta.url),'utf8'),/AUGMENTS\.filter/);
});

test('capture respects status resistance and a full cleanse releases the arena immediately',()=>{
 const {g,t}=capture();assert.ok(trap(g,t));t.status={};g.units=[t];assert.equal(trap(g,t),null);for(let i=0;i<60;i++){g.moveToward(t,{x:60,y:7},1/60);g.time+=1/60;}assert.ok(t.x>48);
 const f=capture('kim');assert.ok(trap(f.g,f.t));close(f.t.state.netTrap.until-(f.g.time-.05),2.5,.02);
});

test('new champion hit passives work against shields and a cleansed sword grab releases immediately',()=>{
 const {g,p,t}=quiet('kim');g.addShield(t,1000,'test');g.attack(p,t);run(g,.02);close(g.shield(p),120);p.qCd=0;run(g,.3);g.cast(p,'q',t);run(g,.2);assert.ok(p.state.swordGrab);t.status={};run(g,.02);assert.equal(p.state.swordGrab,undefined);
 const f=quiet('ppui'),a=ally(f.g,'meursault',41,7);f.g.attack(f.p,a);f.g.addShield(f.t,1000,'test');f.g.attack(a,f.t);run(f.g,.02);assert.equal(f.g.projectiles.filter(b=>b.theme==='ppui').length,0);
});
