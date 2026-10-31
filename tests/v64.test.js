import{FAN_ANGLE}from'../src/data.js';
import test from'node:test';
import assert from'node:assert/strict';
import{Game,damageFormula}from'../src/game.js';
import{CHAMPIONS,TERRAIN,SOUTH_TERRACE,BUSHES,MAP_CENTER,terrainContains}from'../src/data.js';
import*as Jamila from'../src/jamila.js';
import*as Don from'../src/don.js';
import*as I from'../src/infiltration.js';
import*as Sewing from'../src/sewing.js';
import{mobileAutoAim,mobileManualAim}from'../src/mobile-aim.js';
import{DAMAGE_COLORS,drawCombatNumbers}from'../src/combat-text.js';
import{visualShape}from'../src/combat-style.js';
import{preview}from'../src/combat-visuals.js';
import{Camera25D}from'../src/camera-25d.js';
import{championPresentation}from'../src/champion-vfx.js';
import{exclusiveAugments}from'../src/augments.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(g,s)=>{for(let i=0;i<Math.round(s*120);i++)g.step(1/120);};
function arena(key='jamila'){
 const g=new Game(key,'bottom',{mode:'training',seed:64}),p=g.player;g.units=[p];g.events=[];g.effects=[];g.projectiles=[];g.pending=[];g.zones=[];g.practice.lineStopped=true;g.map={bounds:{x:0,y:0,w:120,h:80},walls:[]};g.bounds=g.map.bounds;for(const k of['aiChampion','aiMinion','aiNeutral','aiStructure'])g[k]=()=>{};Object.assign(p,{x:40,y:25,lastAttackAt:999,lastDamageAt:999});return{g,p};
}
function hero(g,{team=1,key='faust',x=44,y=25,hp=10000,armor=0}={}){const e=g.makeChampion(key,team,g.nextId+20);Object.assign(e,{x,y,hp,maxHp:10000,armor,lastDamageAt:999,lastAttackAt:999});return e;}
function context(){return new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:.2})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
test('Jamila uses fifty damage, 55-percent power correction and an unconditional armor-mitigated bonus',()=>{
 for(const armor of[0,100]){const{g,p}=arena(),t=hero(g,{armor});g.attack(p,t);run(g,.2);const first=50*(1+(damageFormula(1,1,1)-1)*.55)*100/(100+armor);near(10000-t.hp,first+first*.15*100/(100+armor));near(g.shield(p),0);assert.equal(g.effects.some(f=>f.type==='number'&&f.fixed),false);}near(CHAMPIONS.jamila.damage,50);
});
test('Jamila special-round shield caps at 7.5 percent and refreshes three seconds without requiring a hit',()=>{
 const{g,p}=arena();for(let i=0;i<20;i++){p.attackCd=0;if(!p.ammo)p.ammo=16;g.attack(p,{x:30,y:25});}near(g.shield(p),p.maxHp*.075);near(p.shields[0].until,3);run(g,3.01);near(g.shield(p),0);
});
test('fixed damage is always purple, positive allied healing green, normal hits gold, and overheal uses actual healing',()=>{
 const{g,p}=arena('gubo'),t=hero(g),a=hero(g,{team:0,hp:9900});g.deal(p,t,10,{fixed:true});assert.equal(g.effects.find(f=>f.type==='number').color,DAMAGE_COLORS.fixed);g.heal(p,a,500,false);const heal=g.effects.find(f=>f.heal);assert.equal(heal.color,DAMAGE_COLORS.heal);assert.equal(heal.text,'+100');g.effects=[];g.heal(null,a,5,false,{natural:true});assert.equal(g.effects.length,0);g.deal(p,t,20);assert.equal(g.effects.find(f=>f.type==='number').color,DAMAGE_COLORS.normal);
});
test('combat numbers render upright on screen with a black border before the colored fill',()=>{
 const{g,p}=arena('faust'),t=hero(g);g.deal(p,t,20);const calls=[],c=context();c.strokeText=(...a)=>calls.push(['stroke',c.strokeStyle,...a]);c.fillText=(...a)=>calls.push(['fill',c.fillStyle,...a]);const camera=new Camera25D();camera.update(1440,950,p);drawCombatNumbers(c,camera,g);assert.equal(calls[0][0],'stroke');assert.equal(calls[0][1],'#05070c');assert.equal(calls[1][0],'fill');
});
test('Don names, 2.5 range and eight-second tactical cooldown match the current rules',()=>{
 const{g,p}=arena('don');assert.equal(CHAMPIONS.don.passive,'정의를 위해!');assert.equal(CHAMPIONS.don.basic,'렌스 돌격');assert.equal(CHAMPIONS.don.tactical,'모아 찌르기');near(g.attackRange(p),2.5);near(g.cooldown(p,'q'),8);g.attack(p,{x:50,y:25});near(p.motion.remaining,2.5);
});
test('all Don attacks, including non-proccing damage, consume the marked-target window and use victim combat power',()=>{
 const{g,p}=arena('don'),t=hero(g,{key:'heathcliff'});p.state.villain=t.id;const bonus=15+g.combatPower(t)*.1;g.deal(p,t,1,{fixed:true,proc:false});near(10000-t.hp,1+bonus);near(g.stat(t,'root'),1);const hp=t.hp;g.deal(p,t,1,{fixed:true,proc:false});near(hp-t.hp,1);
});
test('Don is immune throughout a 1.2-second charge and can be controlled again after release',()=>{
 const{g,p}=arena('don'),t=hero(g);g.cast(p,'q',{x:50,y:25});for(const k of['stun','root','silence','slow','disarm'])g.status(p,k,1,2,t);for(const k of['stun','root','silence','slow','disarm'])near(g.stat(p,k),0);assert.equal(g.startMotion(p,{x:1,y:0},2,{kind:'knock',source:t}),false);run(g,1.19);assert.ok(p.state.donCharge);run(g,.02);assert.equal(p.state.donCharge,undefined);g.status(p,'stun',1,1,t);near(g.stat(p,'stun'),1);
});
test('a fully charged Don thrust refunds ten percent once for champion hits, and the ultimate resets tactical cooldown',()=>{
 const{g,p}=arena('don');hero(g);hero(g,{x:45,y:25.5});g.input.aim={x:50,y:25};g.cast(p,'q',{x:50,y:25});run(g,1.2);near(p.qCd,7.2);p.rCd=0;assert.ok(g.cast(p,'r',{x:48,y:25}));near(p.qCd,0);
});
test('Don bloodlust uses a 0.8-second maximum charge without changing its fifty-percent damage bonus',()=>{
 const{g,p}=arena('don');g.addBuff(p,'donLifesteal',7);near(Don.chargeDuration(g,p),.8);g.cast(p,'q',{x:50,y:25});run(g,.4);const s=Don.chargeShape(g,p,{x:50,y:25});near(s.progress,.5);near(s.damage,427.5);
});
test('Myo tactical has a real 0.15-second minimum cooldown and retains all four scheduled shots',()=>{
 const{g,p}=arena('myo');g.cast(p,'q',{x:47,y:25});near(p.qCd,.15);assert.equal(g.cast(p,'q',{x:47,y:25}),false);run(g,.14);assert.equal(g.cast(p,'q',{x:47,y:25}),false);run(g,.1);assert.equal(g.projectiles.length,4);
});
test('Hong Lu waterfall lasts three seconds and care uses his old mist presentation',()=>{
 const{g,p}=arena('honglu'),a=hero(g,{team:0,x:41,hp:100});g.cast(p,'r',p);near(g.zones[0].until-g.time,3);assert.ok(g.buff(a,'hongluCare'));assert.equal(championPresentation(g,a).aura.form,'mist');run(g,3.01);assert.equal(g.zones.some(z=>z.kind==='waterfall'),false);
});
test('Marton ranged impacts are full circles and Sinclair previews the actual two-range 165-degree sector',()=>{
 const{g,p}=arena('marton');g.attack(p,{x:45,y:25});const fx=g.effects.find(f=>f.type==='burst');assert.deepEqual(visualShape(fx),{kind:'circle',range:2.2});const b=arena('sinclair'),arcs=[],c=context();c.arc=(...args)=>arcs.push(args);preview({ctx:c,circle(){},polygon(){},text(){}},b.p,b.g);near(arcs[0][2],2);near(arcs[0][4]-arcs[0][3],FAN_ANGLE);
});
test('north needles spawn beyond the center timer and the king appears at exactly 3:30',()=>{
 const g=new Game('faust','top',{seed:64});g.time=90;Sewing.tick(g);const needles=g.units.filter(e=>e.camp==='needle');assert.equal(needles.length,2);assert.ok(needles.every(n=>Math.hypot(n.x-MAP_CENTER.x,n.y-Sewing.NORTH_CAMP.y)>2));const timer=g.campTimers({upcoming:true}).find(t=>t.upcoming);near(timer.seconds,120);g.time=209.999;Sewing.tick(g);assert.equal(g.sewingKingSpawned,false);g.time=210;Sewing.tick(g);assert.ok(g.sewingKingSpawned);assert.equal(g.campTimers({upcoming:true}).some(t=>t.upcoming),false);
});
test('south terrace has no camp, is 50 percent shallower and 10 percent wider, and smoke follows its beveled edges',()=>{
 const g=new Game('faust');assert.equal(g.units.filter(e=>e.kind==='neutral').length,12);assert.equal(g.units.some(e=>e.campId==='side-south'),false);near(SOUTH_TERRACE.w,24*.85*1.1);near(SOUTH_TERRACE.h,9.5*.5);assert.equal(SOUTH_TERRACE.polygon.length,6);const smoke=BUSHES.filter(b=>b.southSmoke);assert.equal(smoke.length,3);for(const b of smoke)for(const[x,y]of b.polygon)assert.ok(x>=SOUTH_TERRACE.x-1e-8&&x<=SOUTH_TERRACE.x+SOUTH_TERRACE.w+1e-8&&y>=46.8-1e-8&&y<=50.05+1e-8);assert.equal(terrainContains(SOUTH_TERRACE.x+.1,SOUTH_TERRACE.y+SOUTH_TERRACE.h-.1),false);assert.ok(terrainContains(MAP_CENTER.x,49));
});
test('infiltration selection expires at ten seconds, automatically lands and keeps its success cooldown',()=>{
 const{g,p}=arena('faust');p.augments=['highRisk'];g.recall(p);run(g,1.75);near(p.state.infiltration.expires-g.time,10);p.state.infiltration.point={x:45,y:25};run(g,9.99);assert.ok(I.selecting(p));run(g,.02);assert.equal(p.state.infiltration.phase,'arriving');run(g,.5);assert.equal(I.absent(p),false);near(p.x,45);near(p.state.infiltrationReady,75);
});
test('Jamila selects for fifteen seconds, its codex effect states the duration, and precise targeting restores normal camera width',()=>{
 const{g,p}=arena();p.augments=['highRisk'];g.recall(p);run(g,1.75);near(p.state.infiltration.expires-g.time,15);near(I.cameraView(g,p),1.3);g.input.precision=true;near(I.cameraView(g,p),1);assert.match(exclusiveAugments('jamila')[0].text,/15초/);
});
test('an expired invalid infiltration point chooses a nearby valid location without extending the deadline',()=>{
 const{g,p}=arena('faust');p.augments=['highRisk'];g.recall(p);run(g,1.75);p.state.infiltration.point={x:45,y:25};g.map.walls=[{x:44.8,y:24.8,w:.4,h:.4}];run(g,10);assert.equal(p.state.infiltration.phase,'arriving');assert.ok(I.valid(g,p,p.state.infiltration.point));run(g,.51);assert.equal(I.absent(p),false);
});
test('mobile autoaim prefers hittable targets, then aims toward visible foes outside range',()=>{
 const{g,p}=arena('faust'),nearby=hero(g),behind=hero(g,{x:42,y:24}),far=hero(g,{x:60});g.map.walls=[{x:40.7,y:24.1,w:.4,h:.5}];assert.equal(mobileAutoAim(g,p).target,nearby);behind.alive=false;nearby.alive=false;assert.equal(mobileAutoAim(g,p).target,far);far.alive=false;assert.equal(mobileAutoAim(g,p).target,undefined);
});
test('mobile Marton prioritizes a melee target, otherwise automatically uses a ranged target',()=>{
 const{g,p}=arena('marton'),far=hero(g,{x:44.5}),close=hero(g,{x:42});let aim=mobileAutoAim(g,p);assert.equal(aim.target,close);assert.equal(aim.mode,'melee');assert.ok(Math.hypot(aim.point.x-p.x,aim.point.y-p.y)<2.5);close.alive=false;aim=mobileAutoAim(g,p);assert.equal(aim.target,far);assert.ok(Math.hypot(aim.point.x-p.x,aim.point.y-p.y)>=2.5);
});
test('mobile Ppui basic selects enemies regardless of nearby allied injuries',()=>{
 const{g,p}=arena('ppui'),foe=hero(g,{x:42}),ally=hero(g,{team:0,x:43,hp:100});assert.equal(mobileAutoAim(g,p).target,foe);ally.hp=ally.maxHp;assert.equal(mobileAutoAim(g,p).target,foe);
});
test('mobile Queequeg tether and Hong Lu waterfall prioritize the lowest-health nearby ally',()=>{
 for(const[key,slot]of[['queequeg','q'],['honglu','r']]){const{g,p}=arena(key),a=hero(g,{team:0,x:42,hp:8000}),b=hero(g,{team:0,x:45,hp:500});hero(g,{x:41});assert.equal(mobileAutoAim(g,p,slot).target,b);assert.ok(a.alive);}
});
test('mobile Gubo basic and ultimate prioritize a visible allied execution target even outside range',()=>{
 const{g,p}=arena('gubo'),foe=hero(g,{x:42}),ally=hero(g,{team:0,x:44,hp:100});for(const slot of['basic','r'])assert.equal(mobileAutoAim(g,p,slot).target,ally);ally.x=60;assert.equal(mobileAutoAim(g,p).target,ally);ally.alive=false;assert.equal(mobileAutoAim(g,p).target,foe);
});
test('mobile manual drag uses camera projection and supports both close melee aim and full-range direction',()=>{
 const{g,p}=arena('marton'),camera=new Camera25D();camera.update(844,390,p);const close=mobileManualAim(g,p,'basic',18,0,camera),far=mobileManualAim(g,p,'basic',60,0,camera);near(Math.hypot(close.x-p.x,close.y-p.y),1.5);near(Math.hypot(far.x-p.x,far.y-p.y),5);assert.ok(far.x>p.x);
});
