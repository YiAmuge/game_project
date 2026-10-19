import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, respawnTime } from '../src/game.js';
import { CHAMPIONS, RULES } from '../src/data.js';
import { mentalWhip } from '../src/skills.js';
import { ultGrowth } from '../src/v06-champions.js';
import { skillTargeting } from '../src/targeting.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.ceil(s*60);i++)g.step(1/60);};
function quiet(key){const g=new Game(key);for(const fn of ['aiChampion','aiMinion','aiStructure','aiNeutral'])g[fn]=()=>{};const p=g.player,t=g.champions(1).find(c=>c.key==='faust');Object.assign(p,{x:40,y:7});Object.assign(t,{x:44,y:7,hp:10000,maxHp:10000});g.units=[p,t];g.minionQueue=[];return {g,p,t};}
function enemy(g,x=44,y=7){const t=g.makeChampion('faust',1,8);Object.assign(t,{x,y,hp:10000,maxHp:10000});return t;}

test('Don widened barrage hits a target outside the old sector and keeps the same forward range',()=>{
 const {g,p,t}=quiet('don');Object.assign(t,{x:40+2*Math.cos(.7),y:7+2*Math.sin(.7)});g.cast(p,'q',{x:45,y:7});run(g,.05);assert.ok(t.hp<10000);assert.equal(skillTargeting(g,p,'q').radius,1.8);
});
test('Meursault basic nerf, tactical refill and temporary ultimate armor affect actual combat',()=>{
 const {g,p,t}=quiet('meursault');t.x=41;assert.equal(g.ammoCap(p),3);g.attack(p,t);close(10000-t.hp,233.75*.9);p.ammo=0;g.cast(p,'q',p);assert.equal(p.ammo,1);g.cast(p,'r',t);close(g.armor(p),10);run(g,3.05);close(g.armor(p),0);
});
test('Gubo normal shot pierces exactly one enemy, hitting two and leaving a third unharmed',()=>{
 const {g,p,t}=quiet('gubo'),b=enemy(g,46),c=enemy(g,48);g.attack(p,t);run(g,.8);assert.ok(t.hp<10000);assert.ok(b.hp<10000);close(c.hp,10000);
});
test('Gubo ally execution fires one 7.5 cone, capped at 800, halves respawn and grants return haste',()=>{
 const {g,p,t}=quiet('gubo');t.x=48;const a=g.makeChampion('yi',0,9);Object.assign(a,{x:41,y:7,maxHp:1000,hp:200,lastDamageAt:20});const near=enemy(g,43),back=enemy(g,38),b=enemy(g,49);g.time=20;
 g.attack(p,a);run(g,.05);assert.equal(a.alive,false);close(a.respawnAt-g.time,respawnTime(20,1)*.5-.05,.04);close(10000-t.hp,800);close(10000-near.hp,800);close(back.hp,10000);close(b.hp,10000);g.time=a.respawnAt;g.step(.001);assert.ok(a.alive);assert.ok(g.buff(a,'executedHaste'));close(g.speed(a)/RULES.speed[CHAMPIONS.yi.speed],1.4);
});
test('Gubo shot and ultimate respect the inclusive live ally health threshold and its temporary increase',()=>{
 const {g,p}=quiet('gubo'),a=g.makeChampion('faust',0,8);Object.assign(a,{x:42,y:7,maxHp:1000,hp:211});close(g.deal(p,a,1,{fixed:true,allowFriendly:true}),0);a.hp=210;close(g.deal(p,a,1,{fixed:true,allowFriendly:true}),1);a.hp=350;g.cast(p,'q',p);close(g.deal(p,a,1,{fixed:true,allowFriendly:true}),1);a.hp=351;close(g.deal(p,a,1,{fixed:true,allowFriendly:true}),0);
});
test('Gubo ultimate aims without instant damage, then resolves a visible traveling target projectile',()=>{
 const {g,p,t}=quiet('gubo');t.x=50;assert.ok(g.cast(p,'r',t));assert.equal(p.state.guboAim.target,t);close(t.hp,10000);run(g,1.21);assert.ok(g.projectiles.some(b=>b.homing&&b.ultimate));close(t.hp,10000);run(g,.7);assert.ok(t.hp<10000);assert.equal(p.state.guboAim,undefined);
});
test('Gubo ultimate ally kill does not duplicate the passive blast',()=>{
 const {g,p,t}=quiet('gubo'),a=g.makeChampion('yi',0,8);Object.assign(a,{x:42,y:7,hp:200,maxHp:1000,lastDamageAt:0});t.x=48;assert.ok(g.cast(p,'r',a));run(g,1.5);assert.equal(a.alive,false);close(10000-t.hp,800);
});
test('Gahwan converts gaze at five and ultimate adds precisely one stack per hit at 0/.75/1.5',()=>{
 const {g,p,t}=quiet('gahwan');t.x=48;g.cast(p,'r',t);assert.equal(t.state.gaze[p.id].n,1);run(g,.7);assert.equal(t.state.gaze[p.id].n,1);run(g,.1);assert.equal(t.state.gaze[p.id].n,2);run(g,.75);assert.equal(t.state.gaze[p.id].n,3);for(let i=0;i<2;i++)g.deal(p,t,1);assert.equal(t.state.gaze[p.id].n,0);assert.ok(t.state.contempt[p.id]>g.time);
});
test('Gahwan close knockback cooldown is independent per champion and does not remove close extra damage',()=>{
 const {g,p,t}=quiet('gahwan'),b=enemy(g,42,7.4);t.x=42;g.attack(p,t);close(t.motion.total,2.5);close(b.motion.total,2.5);delete t.motion;delete b.motion;p.attackCd=0;const hp=t.hp;g.attack(p,t);assert.equal(t.motion,undefined);assert.ok(t.hp<hp);g.time=2.01;p.attackCd=0;p.ammo=1;g.attack(p,t);close(t.motion.total,2.5);
});
test('Nelly mark does fixed fifteen percent max HP and basic and ultimate triggers both refund Q charge time',()=>{
 for(const ult of [false,true]){const {g,p,t}=quiet('nelly');t.x=41;p.state.knifeCharges=0;p.state.knifeReady=10;p.qCd=10;g.attack(p,t);const hp=t.hp;if(ult)g.cast(p,'r',t);else{p.attackCd=0;g.attack(p,t);}assert.ok(hp-t.hp>=1500);close(p.state.knifeReady,6.5);}
});
test('Nelly knives pierce multiple enemies and refill no more than once per throw; R restores two ammo',()=>{
 const {g,p,t}=quiet('nelly'),b=enemy(g,46);t.state.nellyMarks={[p.id]:{active:true,until:5,hold:0}};b.state.nellyMarks={[p.id]:{active:true,until:5,hold:0}};g.cast(p,'q',t);run(g,.5);assert.ok(t.hp<10000&&b.hp<10000);assert.ok(p.state.knifeReady>6.5&&p.state.knifeReady<6.7);p.ammo=0;t.x=43;g.cast(p,'r',t);assert.equal(p.ammo,2);
});
test('Myo kill refill, one-ammo Q and six-second expanded magazine clamp correctly at expiry',()=>{
 const {g,p,t}=quiet('myo');assert.equal(g.ammoCap(p),4);p.ammo=0;g.kill(t,p);assert.equal(p.ammo,2);g.cast(p,'q',{x:45,y:7});assert.equal(p.ammo,1);g.cast(p,'r',p);assert.equal(p.ammo,2);assert.equal(g.ammoCap(p),6);close(p.buffs.rabbitFrenzy,6);p.ammo=6;g.time=5.99;g.step(.02);assert.equal(g.ammoCap(p),4);assert.equal(p.ammo,4);
});
test('Rudolph consumes ten SP per second and advances debuffs across separate five-hit chains',()=>{
 const {g,p,t}=quiet('rudolph');g.attack(p,t);close(p.ammo,100-10/3);for(let i=0;i<5;i++){g.time=i*.1;mentalWhip(g,p,t);}assert.equal(t.state.mentalWhip[p.id].stage,1);close(g.stat(t,'slow'),.2);g.time+=.6;assert.equal(g.stat(t,'slow'),0);const ammo=t.ammo;for(let i=0;i<5;i++){g.time+=.1;mentalWhip(g,p,t);}assert.equal(t.ammo,ammo-1);t.qCd=4;t.rCd=10;for(let i=0;i<5;i++){g.time+=.1;mentalWhip(g,p,t);}close(t.qCd,5.5);close(t.rCd,11.5);const until=t.state.mentalWhip[p.id].immuneUntil;for(let i=0;i<5;i++)mentalWhip(g,p,t);assert.equal(t.ammo,ammo-1);g.time=until+.01;mentalWhip(g,p,t);assert.equal(t.state.mentalWhip[p.id].stage,0);
});
test('Rudolph cooldown reversal also delays ready charged skills and running charge regeneration',()=>{
 for(const key of ['nelly','dongrang']){const {g,p}=quiet(key);const s=p.state,field=key==='nelly'?'knifeReady':'treeReady',charges=key==='nelly'?'knifeCharges':'treeCharges';s[field]=g.time+3;s[charges]=1;g.rewindCooldowns(p,1.5);g.step(.01);assert.ok(p.qCd>1.4);close(s[field],4.5);assert.equal(g.cast(p,'q',{x:42,y:7}),false);run(g,1.6);assert.ok(g.cast(p,'q',{x:42,y:7}));}
});
test('Dongbaek ultimate is instant 360 damage, gives only a timed reload buff and no bonus basic stacks',()=>{
 const {g,p,t}=quiet('dongbaek');const gap=g.reloadInterval(p);g.cast(p,'r',t);close(10000-t.hp,360*.9);assert.ok(!p.channelUntil);assert.equal(g.pending.length,0);assert.equal(p.state.fragranceStacks,undefined);assert.ok(g.reloadInterval(p)<gap);run(g,3.05);close(g.reloadInterval(p),gap);
});
test('Dongrang grade two converts power into health and armor, never damage or incoming healing',()=>{
 const {g,p,t}=quiet('dongrang');close(p.maxHp,RULES.health[5]*1.13);close(g.armor(p),13);p.hp-=100;close(g.heal(null,p,50,false),50);p.upgrades.power=3;g.refreshEquipment(p);assert.ok(g.armor(p)>13);assert.ok(p.maxHp>RULES.health[5]*1.13);t.x=41;g.attack(p,t);close(10000-t.hp,260);
});
test('Dongrang passive power purchases apply health immediately and augment removal refreshes converted stats',()=>{
 const {g,p}=quiet('dongrang');p.alive=false;p.hp=0;p.gold=10000;const hp=p.maxHp;assert.ok(g.buy(p,'power'));assert.ok(p.maxHp>hp);close(p.hp,0);p.upgrades.power=3;const before=g.maxHp(p);assert.ok(g.buyAugment(p,'power15'));assert.ok(p.maxHp>before);assert.ok(g.sellAugment(p,'power15'));close(p.maxHp,before);
});
test('natural healing and fountain/potion-style healing use distinct Dongrang growth accounting',()=>{
 const {g,p}=quiet('dongrang');p.hp-=1000;g.step(.1);assert.ok(p.naturalHealing);close(p.totalHealingReceived,0);g.heal(null,p,800,false);assert.equal(ultGrowth(p).damage,215);g.heal(null,p,800,false,{natural:true});assert.equal(ultGrowth(p).damage,215);
});
test('each desire tree converts at 350 actual damage, heals one for one, stops attacking and lasts ten more seconds',()=>{
 const {g,p,t}=quiet('dongrang');p.hp-=1000;p.lastAttackAt=0;g.cast(p,'q',t);run(g,2.6);const z=g.zones[0];assert.equal(z.dealt,175);close(p.totalHealingReceived,175);run(g,2.5);assert.ok(z.golden);close(z.dealt,350);close(z.until-g.time,9.9,.08);const hp=t.hp;run(g,1);close(t.hp,hp);g.time=z.until+.01;g.updateDelayed(0);assert.equal(g.zones.length,0);
});
test('basic harvest only consumes golden trees hit in the attack direction and heals seven percent each',()=>{
 const {g,p}=quiet('dongrang');p.hp-=1500;const make=(x,golden)=>({kind:'desireTree',source:p,x,y:7,r:2.5,until:10,golden,nextTick:100});g.zones=[make(41,true),make(39,true),make(41.5,false)];const hp=p.hp;g.attack(p,{x:45,y:7});assert.equal(g.zones.length,2);close(p.hp-hp,p.maxHp*.07);
});
test('Dongrang ultimate travels at visible speed to selected point, then consumes own trees for 2.5 percent each',()=>{
 const {g,p,t}=quiet('dongrang');t.x=60;p.hp-=2000;g.zones=[{kind:'desireTree',source:p,x:44,y:7,until:10,nextTick:100},{kind:'desireTree',source:p,x:43,y:7,until:10,nextTick:100,golden:true}];const hp=p.hp;assert.ok(skillTargeting(g,p,'r').confirm);g.cast(p,'r',{x:60,y:7});close(p.x,40);assert.equal(g.zones.length,2);run(g,.1);assert.ok(p.x>40&&p.x<42.5);run(g,.3);close(p.x,42.5);assert.equal(g.zones.length,0);close(p.hp-hp,p.maxHp*.05);
});
test('Ishmael basic power debuff caps at two and clears on target death',()=>{
 const {g,p,t}=quiet('ishmael');t.x=41;for(let i=0;i<3;i++){p.attackCd=0;g.attack(p,t);}close(g.powerWeak(t),.04);g.time=100;close(g.powerWeak(t),.04);g.kill(t,p);close(g.powerWeak(t),0);
});
test('Ishmael survival shield is 25 percent and shock hits farther enemies, reducing R by five per champion',()=>{
 const {g,p,t}=quiet('ishmael');p.hp=p.maxHp*.29;g.deal(t,p,1,{fixed:true});close(g.shield(p),p.maxHp*.25);p.shields=[];g.cast(p,'q',p);p.rCd=25;const b=enemy(g,40,11);g.cast(p,'q',p);assert.ok(t.hp<10000&&b.hp<10000);close(p.rCd,15);
});
test('Ishmael wider harpoon pulls even a distant champion all the way in front with no teleport',()=>{
 const {g,p,t}=quiet('ishmael');t.x=54;g.cast(p,'r',t);close(p.rCd,25);close(g.projectiles[0].width,.585);run(g,.9);close(t.x,54);run(g,.15);assert.ok(t.motion);assert.ok(t.x>53);run(g,2.5);close(t.x,p.x+p.radius+t.radius+.15);
});
test('Rodya three-head jackpot applies tails benefits too and completely reloads',()=>{
 const {g,p}=quiet('rodya');g.random=()=>.1;p.ammo=0;p.rCd=30;g.cast(p,'q',p);assert.ok(p.state.jackpot);assert.equal(p.state.coinHeads,3);assert.equal(p.state.coinTails,3);assert.equal(p.ammo,g.ammoCap(p));assert.ok(g.buff(p,'coinSpeed'));close(p.rCd,24);close(p.qCd,3);
});
test('Rodya ultimate creates ice on a miss at max range; its dot and reload debuff apply only to enemy champions',()=>{
 const {g,p,t}=quiet('rodya');t.y=15;g.cast(p,'r',{x:50,y:7});run(g,1);assert.equal(g.zones.length,1);const z=g.zones[0];close(z.x,48);Object.assign(t,{x:48,y:7});const n=g.entity({kind:'neutral',team:2,x:48,y:7,maxHp:1000});const hp=t.hp;z.nextTick=g.time;g.updateDelayed(0);assert.ok(t.hp<hp);close(g.stat(t,'reloadWeak'),.2);close(n.hp,1000);const after=t.hp;g.time+=.5;g.updateDelayed(0);close(after-t.hp,12.5*RULES.power[CHAMPIONS.rodya.power]*.9);g.zones=[];g.time+=.8;close(g.stat(t,'reloadWeak'),0);
});

test('Ishmael pull follows the moving caster instead of ending at her previous location',()=>{
 const {g,p,t}=quiet('ishmael');t.x=50;g.cast(p,'r',t);run(g,.75);assert.ok(t.motion);p.x=42;run(g,2);close(t.x,p.x+p.radius+t.radius+.15);
});

test('a lethal Ishmael basic cannot reapply a permanent debuff after death cleanup',()=>{
 const {g,p,t}=quiet('ishmael');t.x=41;t.hp=1;g.attack(p,t);assert.equal(t.alive,false);close(g.powerWeak(t),0);
});
