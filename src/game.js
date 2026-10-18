import { RULES, CHAMPIONS, UPGRADES, BUSHES, lanePath } from './data.js';
import { clamp, distance, direction, clearLine, slide, findPath, segmentDistance, blocked } from './geometry.js';

export function damageFormula(base,power=3,level=3,armor=0) {
  return base*RULES.power[power]*(.85+.05*level)*100/(100+Math.max(0,armor));
}
export function respawnTime(time,level) { return Math.min(20,Math.ceil(6+.8*time/60+1.2*(level-1))); }

export class Game {
  constructor(selected='faust') {
    this.time=0; this.nextId=1; this.wave=0; this.bossSpawned=false; this.winner=null; this.reason='';
    this.units=[]; this.projectiles=[]; this.effects=[]; this.zones=[]; this.pending=[]; this.logs=[];
    this.kills=[0,0]; this.damageDone=0; this.input={x:0,y:0,aim:{x:32,y:18},fire:false};
    this.makeStructures(); this.makeCamps();
    const order=[selected,...Object.keys(CHAMPIONS).filter(k=>k!==selected)];
    for(let team=0;team<2;team++) order.forEach((key,i)=>this.makeChampion(key,team,i));
    this.player=this.units.find(u=>u.player);
    this.log('전투 개시 · 첫 미니언 웨이브 00:30', 'system');
  }
  entity(values) {
    const e={id:this.nextId++,alive:true,attackCd:0,radius:.35,armor:0,shields:[],status:{},lastCombat:-99,...values};
    e.hp=e.maxHp; this.units.push(e); return e;
  }
  makeStructures() {
    for(let team=0;team<2;team++) {
      for(let lane=0;lane<2;lane++) this.entity({kind:'tower',team,lane,x:team?46:18,y:lane?30.5:5.5,maxHp:7600,armor:120,range:8.5,damage:280,interval:1.05,radius:.9,name:'포탑'});
      this.entity({kind:'core',team,x:team?58.5:5.5,y:18,maxHp:12000,armor:100,range:9,damage:320,interval:1,radius:1.3,name:'본진'});
    }
  }
  makeCamps() {
    for(const [x,y] of [[30.5,16.5],[33.5,16.5],[30.5,19.5],[33.5,19.5]]) this.makeNeutral(x,y,'central');
    for(const [x,y] of [[17,18],[47,18]]) this.makeNeutral(x,y,'side');
    for(const [x,y] of [[22,13],[42,13]]) this.makeNeutral(x,y,'blessing');
    for(const [x,y] of [[22,23],[42,23]]) this.makeNeutral(x,y,'amplify');
  }
  makeNeutral(x,y,camp) {
    const stats={central:[700,10,80,1.3,75],side:[850,15,100,1.2,90],blessing:[1250,25,100,1.2,100],amplify:[1250,25,120,1.2,100],boss:[15000,60,350,1.5,Infinity]}[camp];
    return this.entity({kind:'neutral',team:2,camp,x,y,home:{x,y},maxHp:stats[0],armor:stats[1],damage:stats[2],interval:stats[3],respawnDelay:stats[4],range:camp==='boss'?2.8:1.4,radius:camp==='boss'?1.2:.5,name:{central:'중앙 크립',side:'측면 크립',blessing:'가호',amplify:'증폭',boss:'중앙 보스'}[camp],sweep:2.5});
  }
  makeChampion(key,team,index) {
    const c=CHAMPIONS[key];
    return this.entity({kind:'champion',key,team,index,lane:index%2,player:team===0&&index===0,
      x:team?61:3,y:16.2+index*1.2,radius:.48,maxHp:RULES.health[c.health],name:c.name,
      level:1,xp:0,gold:250,kills:0,deaths:0,streak:0,ammo:c.ammo,reloadProgress:0,qCd:0,rCd:0,
      range:c.range,upgrades:{power:0,health:0,speed:0,haste:0,reload:0},marks:0,basicHits:{},buffs:{},
      supportStacks:0,supportReady:0,supportUntil:0,passiveReady:0,sniperReady:0,path:[],pathAt:0,
      respawnAt:0,retreat:false,potion:0,potionUntil:0,contributors:{},totalDamage:0,
    });
  }
  log(text,kind='system') { this.logs.unshift({text,kind,time:this.time}); this.logs=this.logs.slice(0,10); }
  champions(team) { return this.units.filter(u=>u.kind==='champion'&&(team===undefined||u.team===team)); }
  towers(team) { return this.units.filter(u=>u.kind==='tower'&&u.team===team&&u.alive); }
  locked(e) { return e.kind==='core'&&this.towers(e.team).length>0; }
  hostile(a,b) { return a.team!==b.team&&b.alive&&!this.hidden(b); }
  hidden(e) { return e.untargetableUntil>this.time; }
  bushAt(e) {return BUSHES.find(b=>e.x>=b.x&&e.x<=b.x+b.w&&e.y>=b.y&&e.y<=b.y+b.h);}
  visibleTo(team,e) {
    if(e.kind!=='champion'||e.team===team)return true;
    const bush=this.bushAt(e);
    if(!bush||e.revealedUntil>this.time||this.time-e.lastCombat<=1.25)return true;
    return this.champions(team).some(a=>a.alive&&!this.hidden(a)&&(distance(a,e)<=2.5||this.bushAt(a)?.id===bush.id));
  }
  stat(e,key) { return e.status[key]?.until>this.time ? e.status[key].amount : 0; }
  buff(e,key) { return e.buffs?.[key]>this.time; }
  shield(e) { return e.shields.filter(s=>s.until>this.time).reduce((sum,s)=>sum+s.value,0); }
  maxHp(e) { return RULES.health[CHAMPIONS[e.key].health]*(1+.06*(e.level-1))*(1+.06*e.upgrades.health); }
  speed(e) {
    if(e.kind!=='champion') return e.kind==='minion'?2.5:2.7;
    const c=CHAMPIONS[e.key],base=RULES.speed[c.speed]; let mult=1+.03*e.upgrades.speed;
    if(this.buff(e,'resolve')) mult+=.25;
    if(this.buff(e,'marks')) mult+=.15;
    if(e.buffs.ogamdo>this.time) mult+=.25*(e.buffs.ogamdo-this.time)/4;
    mult*=1-Math.min(.5,this.stat(e,'slow'));
    return clamp(base*mult+(c.role==='암살'&&this.time-e.lastCombat>3?.45:0),base*.65,base*1.6);
  }
  haste(e) { return e.upgrades.haste*.05+(e.supportUntil>this.time?e.supportStacks*.05:0)+(this.buff(e,'blessing')?.12:0)+(this.buff(e,'faustUlt')?(e.ultStacks||0)*.1:0); }
  reloadInterval(e) {
    return RULES.reload[CHAMPIONS[e.key].reload]/(1+e.upgrades.reload*.05+(e.supportUntil>this.time?e.supportStacks*.05:0)+(this.buff(e,'explore')?.2:0)+(this.buff(e,'marks')?.2:0)+(this.buff(e,'blessing')?.12:0)+(this.buff(e,'faustUlt')?(e.ultStacks||0)*.1:0));
  }
  support(e) {
    if(CHAMPIONS[e.key]?.role!=='지원'||e.supportReady>this.time) return;
    e.supportStacks=e.supportUntil>this.time?Math.min(4,e.supportStacks+1):1;
    e.supportUntil=this.time+4;e.supportReady=this.time+1.5;
  }
  addShield(target,value,source,seconds=3) {
    target.shields=target.shields.filter(s=>s.until>this.time);
    const old=target.shields.find(s=>s.source===source);
    const others=target.shields.filter(s=>s!==old).reduce((n,s)=>n+s.value,0);
    const amount=Math.min(Math.max(old?.value||0,value),Math.max(0,target.maxHp*.35-others));
    if(old) {old.value=amount;old.until=this.time+seconds;}
    else target.shields.push({source,value:amount,until:this.time+seconds});
  }
  status(e,key,amount,seconds) {
    if(e.key==='meursault') {
      if(['silence','slow'].includes(key)&&this.buff(e,'resolve')) return;
      if(['root','stun'].includes(key)) key='silence';
    }
    if(e.kind==='champion'&&CHAMPIONS[e.key].role==='보호') seconds*=.85;
    e.status[key]={amount,until:this.time+seconds};
  }
  award(e,xp,gold) {
    if(!e||e.kind!=='champion') return;
    e.gold+=gold; e.xp+=xp*(e.key==='faust'?1.15:1);
    const level=1+RULES.xp.slice(1).filter(n=>e.xp>=n).length;
    if(level>e.level) {
      const old=e.maxHp;e.level=level;e.maxHp=this.maxHp(e);if(e.alive)e.hp+=e.maxHp-old;
      if(e.player)this.log(`레벨 ${level} 달성`, 'ally');
      this.effects.push({type:'ring',x:e.x,y:e.y,r:2,color:'#d9be78',life:1,maxLife:1});
    }
  }
  deal(source,target,base,{fixed=false,proc=true}={}) {
    if(!target.alive||source.team===target.team||this.hidden(target)||this.locked(target)||this.winner!==null) return 0;
    let amount=base;
    if(!fixed) {
      if(source.kind==='champion') {
        amount=damageFormula(base,CHAMPIONS[source.key].power,source.level,0)*(1+source.upgrades.power*.04)*(1-this.stat(source,'weak'));
        if(this.buff(source,'marks'))amount*=1.12;
        if(CHAMPIONS[source.key].role==='저격'&&distance(source,target)>=8&&source.sniperReady<=this.time) {amount*=1.18;source.sniperReady=this.time+6;}
      }
      amount*=100/(100+Math.max(0,target.armor));
      if(target.kind==='champion') {
        if(CHAMPIONS[target.key].role==='보호') amount*=.92;
        if(this.buff(target,'resolve'))amount*=.7;
        if(this.champions(target.team).some(c=>c.key==='meursault'&&c.alive&&c!==target&&distance(c,target)<=4)) amount*=.92;
      }
    }
    if(['tower','core'].includes(target.kind)) {
      const nearby=this.units.filter(u=>u.alive&&u.team!==target.team&&u.team!==2&&['champion','minion'].includes(u.kind)&&distance(u,target)<=target.range);
      if(!nearby.length)return 0;
      if(source.kind==='champion'&&!nearby.some(u=>u.kind==='minion'))amount*=.2;
      if(source.siege)amount*=1.35;
    }
    source.lastCombat=this.time;target.lastCombat=this.time;
    if(source.kind==='champion') {
      if(target.kind==='champion') {
        target.contributors[source.id]=this.time;
        for(const u of this.units) if(u.alive&&u.team===target.team&&u.kind!=='champion'&&distance(u,source)<(u.range||2)+1) {u.aggro=source.id;u.aggroUntil=this.time+3;}
      }
      if(target.kind==='neutral')target.aggro=source.id;
    }
    let remaining=amount;
    for(const s of target.shields) {if(s.until<=this.time)continue;const take=Math.min(s.value,remaining);s.value-=take;remaining-=take;}
    const actual=Math.min(target.hp,remaining);target.hp-=remaining;
    if(source.kind==='champion') {source.totalDamage+=actual;if(source.player)this.damageDone+=actual;}
    this.effects.push({type:'number',x:target.x,y:target.y-.7,text:Math.round(amount),color:fixed?'#e3bbff':source.team===0?'#eddaac':'#ee978f',life:.7,maxLife:.7});
    if(proc&&source.key==='yi'&&target.kind==='champion'&&source.passiveReady<=this.time) {
      const ally=this.champions(source.team).filter(c=>c.alive&&distance(c,source)<=5).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      if(ally){this.addShield(ally,Math.min(amount*.12,ally.maxHp*.18),`yi-${source.id}`);this.support(source);}
      source.passiveReady=this.time+1;
    }
    if(target.hp<=0)this.kill(target,source);
    if(proc&&target.alive&&source.kind==='champion'&&this.buff(source,'amplify')&&(source.ampTargets?.[target.id]||0)<=this.time) {
      source.ampTargets??={};source.ampTargets[target.id]=this.time+1;
      this.status(target,'slow',.12,1);this.deal(source,target,35,{fixed:true,proc:false});
    }
    return actual;
  }
  kill(e,killer) {
    e.alive=false;e.hp=0;
    if(e.kind==='champion') {
      e.deaths++;e.respawnAt=this.time+respawnTime(this.time,e.level);e.shields=[];e.status={};e.buffs={};e.marks=0;e.basicHits={};e.supportStacks=0;e.supportUntil=0;e.potionUntil=0;
      if(killer.team<2&&killer.team!==e.team) {
        this.kills[killer.team]++;
        if(killer.kind==='champion'){killer.kills++;killer.streak++;this.award(killer,120,120+(e.streak>=3?Math.min(140,(e.streak-2)*35):0));}
        this.champions(killer.team).filter(c=>c!==killer&&(e.contributors[c.id]??-99)>=this.time-6).slice(0,3).forEach(c=>this.award(c,70,40));
      }
      e.streak=0;e.contributors={};
      this.log(`${killer.name} → ${e.name} 처치`, killer.team===0?'ally':'enemy');
    } else if(e.kind==='tower') {
      this.champions(killer.team).forEach(c=>this.award(c,120,130));
      this.log(`${e.team===0?'아군':'적군'} 포탑 파괴${this.towers(e.team).length===0?' · 본진 개방':''}`,e.team===0?'enemy':'ally');
    } else if(e.kind==='core') {this.finish(killer.team,'본진 파괴');}
    else if(e.kind==='minion'&&killer.kind==='champion') {
      const xp=e.siege?45:e.ranged?26:24,gold=e.siege?30:e.ranged?18:15;
      this.award(killer,xp,gold);
      const ally=this.champions(killer.team).filter(c=>c!==killer&&c.alive&&distance(c,e)<=7).sort((a,b)=>a.xp-b.xp)[0];
      this.award(ally,10,6);
    } else if(e.kind==='neutral') {
      if(e.camp==='boss') {
        this.champions(killer.team).forEach(c=>this.award(c,180,160));
        this.log(`${killer.team===0?'아군':'적군'} 중앙 보스 처치`,killer.team===0?'ally':'enemy');
      } else {
        this.award(killer,['central','side'].includes(e.camp)?25:50,['central','side'].includes(e.camp)?18:40);
        e.respawnAt=this.time+e.respawnDelay;
        if(killer.kind==='champion'&&e.camp==='amplify')killer.buffs.amplify=this.time+45;
        if(killer.kind==='champion'&&e.camp==='blessing'){killer.buffs.blessing=this.time+25;killer.buffs.blessingHeal=this.time+5;}
      }
    }
  }
  finish(team,reason) {if(this.winner!==null)return;this.winner=team;this.reason=reason;this.log(team===-1?'무승부':`${team===0?'아군':'적군'} 승리 · ${reason}`);}
  judge() {
    const a=this.towers(0),b=this.towers(1);
    let diff=a.length-b.length;
    if(!diff) diff=a.length?a.reduce((n,e)=>n+e.hp,0)-b.reduce((n,e)=>n+e.hp,0):this.units.find(u=>u.kind==='core'&&u.team===0).hp-this.units.find(u=>u.kind==='core'&&u.team===1).hp;
    this.finish(diff===0?-1:diff>0?0:1,'10분 목표물 판정');
  }
  spawnWave() {
    this.wave++;
    for(let team=0;team<2;team++)for(let lane=0;lane<2;lane++)for(let i=0;i<(this.wave%3===0?5:4);i++) {
      const ranged=i===3,siege=i===4,scale=Math.floor(this.time/120),path=lanePath(team,lane),offset=(i-1.5)*.6;
      this.entity({kind:'minion',team,lane,x:path[0].x+(team?1:-1)*i*.6,y:18+offset,
        maxHp:(siege?1050:ranged?360:520)*(1+.06*scale),damage:(siege?125:ranged?72:58)*(1+.05*scale),
        interval:siege?2:ranged?1.5:1.25,range:siege?6:ranged?5.5:1.2,radius:siege?.48:.28,
        name:siege?'공성 미니언':ranged?'원거리 미니언':'근접 미니언',siege,ranged,waypoint:1,offset,path:[],pathAt:0});
    }
  }
  spawnBoss() {
    this.bossSpawned=true;
    for(const u of this.units)if(u.camp==='central'){u.alive=false;u.hp=0;u.respawnAt=Infinity;}
    this.makeNeutral(32,18,'boss');this.log('05:00 · 중앙 보스 출현', 'boss');
    this.effects.push({type:'ring',x:32,y:18,r:5,color:'#c89cf0',life:2,maxLife:2});
  }
  nearest(e,range,includeNeutral=true) {
    return this.units.filter(u=>this.hostile(e,u)&&this.visibleTo(e.team,u)&&(includeNeutral||u.team!==2)&&!this.locked(u)&&distance(e,u)<=range+u.radius&&clearLine(e,u)).sort((a,b)=>distance(e,a)-distance(e,b))[0];
  }
  moveToward(e,goal,dt) {
    if(this.stat(e,'root')||this.stat(e,'stun')||this.hidden(e)||e.channelUntil>this.time)return;
    if(distance(e,goal)<.05)return;
    let target=goal;
    if(!clearLine(e,goal,e.radius)) {
      if(this.time>=e.pathAt||!e.path?.length||distance(e.pathGoal||goal,goal)>2) {e.path=findPath(e,goal,e.radius);e.pathAt=this.time+1;e.pathGoal={x:goal.x,y:goal.y};}
      while(e.path?.length&&distance(e,e.path[0])<.3)e.path.shift();
      target=e.path?.[0]||goal;
    }
    const d=direction(e,target),step=Math.min(distance(e,target),this.speed(e)*dt);slide(e,d.x*step,d.y*step);
  }
  aim(e,point) {const d=direction(e,point);return Math.hypot(d.x,d.y)>.01?d:{x:e.team===0?1:-1,y:0};}
  bullet(e,dir,damage,range,{width=.18,speed=22,knock=0}={}) {
    this.projectiles.push({source:e,x:e.x,y:e.y,dx:dir.x,dy:dir.y,damage,remaining:range,width,speed,knock,color:e.team===0?'#92d5dd':'#e6a097',theme:e.key});
  }
  cone(e,dir,range,angle,damage,onHit=()=>{}) {
    for(const target of this.units.filter(u=>this.hostile(e,u))) {
      const d=direction(e,target);
      if(distance(e,target)<=range+target.radius&&d.x*dir.x+d.y*dir.y>=Math.cos(angle/2)&&clearLine(e,target)) {this.deal(e,target,damage);onHit(target);}
    }
    this.effects.push({type:'arc',x:e.x,y:e.y,angle:Math.atan2(dir.y,dir.x),spread:angle,r:range,color:e.team===0?'#bce5e5':'#eaa39c',theme:e.key,life:.28,maxLife:.28});
  }
  addMark(e,n=1) {
    e.marks+=n;
    if(e.marks>=3){e.marks=0;e.buffs.marks=this.time+4;e.ammo=CHAMPIONS[e.key].ammo;e.reloadProgress=0;}
  }
  attack(e,point) {
    if(!e.alive||this.hidden(e)||this.stat(e,'stun')||e.channelUntil>this.time||e.attackCd>0||e.ammo<1||this.winner!==null)return false;
    const c=CHAMPIONS[e.key],d=this.aim(e,point);e.ammo--;e.attackCd=c.attackTime;e.facing=Math.atan2(d.y,d.x);e.attackAt=this.time;e.revealedUntil=this.time+1.25;
    if(e.key==='faust') {this.cone(e,d,1.8,1.1,170);this.bullet(e,d,180,7.5);}
    if(e.key==='yi')for(const offset of [-.305,0,.305])this.bullet(e,{x:Math.cos(e.facing+offset),y:Math.sin(e.facing+offset)},95,6.5);
    if(e.key==='sinclair')this.cone(e,d,1.8,1.6,210,t=>{
      if(t.kind==='champion'){e.basicHits[t.id]=(e.basicHits[t.id]||0)+2;if(e.basicHits[t.id]>=4){e.basicHits[t.id]-=4;this.addMark(e);}}
      if(t.kind==='neutral'&&['central','side'].includes(t.camp)&&t.hp<=t.maxHp*.1&&t.alive)this.deal(e,t,t.hp,{fixed:true});
    });
    if(e.key==='meursault')this.cone(e,d,1.9,1.6,275,t=>{if((t.slowFromFist||0)<=this.time){this.status(t,'slow',.2,1.2);t.slowFromFist=this.time+3;}});
    return true;
  }
  cast(e,slot,point) {
    if(!e.alive||this.hidden(e)||this.stat(e,'stun')||e.channelUntil>this.time||e[slot+'Cd']>0||this.winner!==null)return false;
    if(this.stat(e,'silence')&&!(e.key==='meursault'&&slot==='q'))return false;
    const c=CHAMPIONS[e.key],d=this.aim(e,point); e[slot+'Cd']=c[slot]/(1+this.haste(e));
    e.facing=Math.atan2(d.y,d.x);e.castAt=this.time;e.castSlot=slot;e.revealedUntil=this.time+1.25;
    this.effects.push({type:'cast',x:e.x,y:e.y,angle:e.facing,r:slot==='r'?5:3,theme:e.key,slot,life:slot==='r'?.9:.55,maxLife:slot==='r'?.9:.55});
    const destination=(max)=>{const len=Math.min(max,distance(e,point));return {x:clamp(e.x+d.x*len,1,63),y:clamp(e.y+d.y*len,1,35)};};
    if(slot==='q') {
      if(e.key==='faust') {this.cone(e,d,3,1.4,150);this.bullet(e,d,230,7.5,{width:.35,knock:1.4});e.buffs.explore=this.time+4;}
      if(e.key==='yi') {const p=destination(7);this.zones.push({source:e,...p,r:3.2,until:this.time+3,nextTick:this.time+.5,stays:{}});}
      if(e.key==='sinclair') {
        const start={x:e.x,y:e.y};slide(e,d.x*3.2,d.y*3.2);let marked=false;
        for(const t of this.units.filter(t=>this.hostile(e,t)))if(segmentDistance(t,start,e)<=t.radius+.6&&clearLine(e,t)){this.deal(e,t,180);if(t.kind==='champion')marked=true;}
        if(marked)this.addMark(e);this.effects.push({type:'line',...start,to:{x:e.x,y:e.y},color:'#e5ca83',theme:e.key,life:.3,maxLife:.3});
      }
      if(e.key==='meursault') {e.buffs.resolve=this.time+4;delete e.status.silence;delete e.status.slow;this.effects.push({type:'ring',x:e.x,y:e.y,r:2,color:'#a7d6e4',life:.5,maxLife:.5});}
    } else {
      if(e.key==='faust') {
        const p=destination(10);e.channelUntil=this.time+1.25;
        this.pending.push({type:'burst',source:e,...p,r:4.8,at:this.time+1.25,damage:680});
      }
      if(e.key==='yi') {
        for(const a of this.champions(e.team).filter(a=>a.alive&&distance(a,e)<=5.5)) {a.buffs.ogamdo=this.time+4;this.addShield(a,Math.min(180,a.maxHp*.18),`yi-${e.id}`);}
        this.support(e);this.effects.push({type:'ring',x:e.x,y:e.y,r:5.5,color:'#cdbb87',life:.8,maxLife:.8});
      }
      if(e.key==='sinclair') {
        let p=destination(6);if(blocked(p.x,p.y,e.radius))p={x:e.x,y:e.y};
        const healthy=e.hp/e.maxHp>=.5;e.untargetableUntil=this.time+.7;
        this.pending.push({type:'teleport',source:e,...p,r:3.8,at:this.time+.7,damage:390});
        if(healthy)this.addMark(e,3);else {this.addShield(e,e.maxHp*.15,`branch-${e.id}`);e.rCd*=.8;}
      }
      if(e.key==='meursault')this.cone(e,d,5.2,Math.PI*100/180,270,t=>{this.status(t,'root',1,1.25);this.status(t,'weak',.12,4);});
    }
    return true;
  }
  inSpawn(e) {return distance(e,{x:e.team===0?2:62,y:18})<=3.4;}
  canShop(e) {return e.alive&&this.inSpawn(e)&&this.time-e.lastCombat>=3&&this.winner===null;}
  buy(e,key) {
    if(!this.canShop(e))return false;
    if(key==='potion') {if(e.potion||e.gold<90)return false;e.gold-=90;e.potion=2;return true;}
    const item=UPGRADES.find(u=>u.key===key);
    if(!item||e.upgrades[key]>=item.max)return false;
    const cost=RULES.costs[e.upgrades[key]];if(e.gold<cost)return false;
    e.gold-=cost;e.upgrades[key]++;
    if(key==='health'){const old=e.maxHp;e.maxHp=this.maxHp(e);e.hp+=e.maxHp-old;}
    return true;
  }
  usePotion(e) {if(!e.alive||!e.potion||e.potionUntil>this.time||this.winner!==null)return false;e.potion--;e.potionUntil=this.time+4;return true;}
  aiChampion(e,dt) {
    if(e.hp/e.maxHp<.24)e.retreat=true;if(e.hp/e.maxHp>.88)e.retreat=false;
    if(e.retreat){this.moveToward(e,{x:e.team===0?2:62,y:18},dt);if(e.key==='meursault')this.cast(e,'q',e);return;}
    const near=this.nearest(e,9,false);
    if(near) {
      const d=distance(e,near);
      if(d>e.range*.88)this.moveToward(e,near,dt);
      if(d<=e.range+near.radius)this.attack(e,near);
      if(near.kind==='champion') {
        if(d<=(e.key==='meursault'?4:e.key==='sinclair'?4:7))this.cast(e,'q',near);
        if(d<=(e.key==='meursault'?5:8))this.cast(e,'r',near);
      }
      return;
    }
    const path=lanePath(e.team,e.lane),enemyTowers=this.towers(1-e.team),targetTower=enemyTowers.find(t=>t.lane===e.lane)||enemyTowers[0];
    if(distance(e,path[1])<.8)e.laneEntered=true;
    const goal=!e.laneEntered?path[1]:targetTower||this.units.find(t=>t.kind==='core'&&t.team!==e.team);
    this.moveToward(e,goal,dt);
  }
  aiMinion(e,dt) {
    const aggro=this.units.find(t=>t.id===e.aggro&&t.alive&&e.aggroUntil>this.time&&distance(e,t)<e.range+2);
    const candidates=this.units.filter(t=>t.team!==2&&this.hostile(e,t)&&this.visibleTo(e.team,t)&&!this.locked(t)&&distance(e,t)<Math.max(6,e.range)+t.radius&&clearLine(e,t));
    const rank=t=>e.siege&&t.kind==='tower'?-1:t.kind==='minion'?0:t.kind==='champion'?1:2;
    candidates.sort((a,b)=>rank(a)-rank(b)||distance(e,a)-distance(e,b));
    const target=aggro||candidates[0];
    if(target) {
      if(distance(e,target)>e.range+target.radius)this.moveToward(e,target,dt);
      else if(e.attackCd<=0){this.simpleAttack(e,target);e.attackCd=e.interval;}
    } else {
      const path=lanePath(e.team,e.lane);let goal={...path[e.waypoint]};goal.y+=e.offset;
      if(distance(e,goal)<1&&e.waypoint<3){e.waypoint++;goal={...path[e.waypoint]};goal.y+=e.offset;}
      this.moveToward(e,goal,dt);
    }
  }
  simpleAttack(e,t) {
    this.effects.push({type:'line',x:e.x,y:e.y,to:{x:t.x,y:t.y},color:e.team===0?'#6fb8c7':e.team===1?'#d18178':'#bd9e64',life:.16,maxLife:.16});
    this.deal(e,t,e.damage);
  }
  aiStructure(e) {
    if(this.locked(e))return;
    const targets=this.units.filter(u=>u.alive&&!this.hidden(u)&&this.visibleTo(e.team,u)&&u.team!==e.team&&u.team!==2&&['champion','minion'].includes(u.kind)&&distance(e,u)<=e.range);
    if(e.attackCd>0||!targets.length)return;
    const rank=t=>t.siege?0:t.kind==='minion'?1:2;
    const target=targets.find(u=>u.id===e.aggro&&e.aggroUntil>this.time)||targets.sort((a,b)=>rank(a)-rank(b)||a.id-b.id)[0];
    this.simpleAttack(e,target);e.attackCd=e.interval;
  }
  aiNeutral(e,dt) {
    const nearby=this.champions().filter(c=>c.alive&&!this.hidden(c)&&distance(c,e.home)<8&&clearLine(e,c));
    const target=nearby.find(c=>c.id===e.aggro)||nearby.filter(c=>distance(c,e)<(e.camp==='boss'?5:2.5)).sort((a,b)=>distance(a,e)-distance(b,e))[0];
    if(!target) {this.moveToward(e,e.home,dt);if(this.time-e.lastCombat>5)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*dt);return;}
    if(distance(e,target)>e.range)this.moveToward(e,target,dt);
    else if(e.attackCd<=0){this.simpleAttack(e,target);e.attackCd=e.interval;}
    if(e.camp==='boss') {
      e.sweep-=dt;
      if(e.sweep<=0){e.sweep=2.5;this.cone(e,direction(e,target),5,Math.PI*.7,240);}
    }
  }
  updateProjectiles(dt) {
    for(const p of this.projectiles) {
      const travel=Math.min(p.remaining,p.speed*dt),n=Math.max(1,Math.ceil(travel/.18));
      for(let i=0;i<n&&p.remaining>0;i++) {
        p.x+=p.dx*travel/n;p.y+=p.dy*travel/n;p.remaining-=travel/n;
        if(blocked(p.x,p.y,.08)){p.remaining=0;break;}
        const t=this.units.find(t=>this.hostile(p.source,t)&&distance(p,t)<=t.radius+p.width);
        if(t) {this.deal(p.source,t,p.damage);if(p.knock&&['champion','minion'].includes(t.kind))slide(t,p.dx*p.knock,p.dy*p.knock);p.remaining=0;}
      }
    }
    this.projectiles=this.projectiles.filter(p=>p.remaining>0);
  }
  updateDelayed(dt) {
    for(const event of this.pending) {
      if(event.at>this.time)continue;
      const e=event.source;
      if(!e.alive||this.stat(e,'stun')||(event.type==='burst'&&this.stat(e,'silence')))continue;
      if(event.type==='teleport'){e.x=event.x;e.y=event.y;}
      let hits=0;
      for(const t of this.units.filter(t=>this.hostile(e,t)&&distance(event,t)<=event.r&&clearLine(event,t))) {this.deal(e,t,event.damage);if(t.kind==='champion')hits++;}
      if(event.type==='burst'&&hits){e.buffs.faustUlt=this.time+4;e.ultStacks=Math.min(4,hits);}
      this.effects.push({type:'burst',x:event.x,y:event.y,r:event.r,color:'#d6be7f',theme:e.key,life:.65,maxLife:.65});
    }
    this.pending=this.pending.filter(e=>e.at>this.time&&e.source.alive);
    for(const z of this.zones) {
      for(const t of this.units.filter(t=>this.hostile(z.source,t))) {
        if(distance(z,t)<=z.r&&clearLine(z,t)) {
          if(t.kind==='champion'){z.stays[t.id]=(z.stays[t.id]||0)+dt;if(z.stays[t.id]>=1.2&&!z.stays['done'+t.id]){this.status(t,'silence',1,1.1);z.stays['done'+t.id]=true;}}
          if(this.time>=z.nextTick)this.deal(z.source,t,45);
        } else z.stays[t.id]=0;
      }
      if(this.time>=z.nextTick)z.nextTick+=.5;
    }
    this.zones=this.zones.filter(z=>z.until>this.time);
  }
  step(dt) {
    if(this.winner!==null)return;
    dt=Math.min(dt,RULES.duration-this.time);this.time+=dt;
    if(RULES.duration-this.time<1e-8)this.time=RULES.duration;
    if(!this.bossSpawned&&this.time+1e-8>=RULES.bossAt)this.spawnBoss();
    if(this.time+1e-8>=30*(this.wave+1)&&this.time<RULES.duration)this.spawnWave();
    for(const e of this.units) {
      e.attackCd=Math.max(0,e.attackCd-dt);
      if(e.kind==='champion') {
        e.gold+=dt;e.qCd=Math.max(0,e.qCd-dt);e.rCd=Math.max(0,e.rCd-dt);
        if(!e.alive&&this.time>=e.respawnAt){e.alive=true;e.hp=e.maxHp;e.x=e.team?61:3;e.y=18;e.ammo=CHAMPIONS[e.key].ammo;e.reloadProgress=0;e.retreat=false;e.path=[];e.laneEntered=false;}
      } else if(e.kind==='neutral'&&!e.alive&&this.time>=e.respawnAt&&!(e.camp==='central'&&this.bossSpawned)){e.alive=true;e.hp=e.maxHp;e.x=e.home.x;e.y=e.home.y;e.aggro=null;}
      if(!e.alive)continue;
      if(e.kind==='champion') {
        const cap=CHAMPIONS[e.key].ammo;
        if(e.ammo<cap) {e.reloadProgress+=dt;const gap=this.reloadInterval(e);while(e.reloadProgress>=gap&&e.ammo<cap){e.ammo++;e.reloadProgress-=gap;}}
        if(e.ammo>=cap)e.reloadProgress=0;
        if(this.inSpawn(e))e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.12*dt);
        if(distance(e,{x:e.team===0?62:2,y:18})<=3.4) {e.fountainTick=(e.fountainTick||0)+dt;if(e.fountainTick>=.5){e.fountainTick-=.5;this.deal({team:1-e.team,name:'부활소',kind:'fountain'},e,150,{fixed:true});}}
        else e.fountainTick=0;
        if(!e.alive)continue;
        if(e.potionUntil>this.time)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.045*dt);
        if(this.buff(e,'blessingHeal'))e.hp=Math.min(e.maxHp,e.hp+30*dt);
        if(e.player) {
          if(!this.stat(e,'root')&&!this.stat(e,'stun')&&!this.hidden(e)&&!(e.channelUntil>this.time)) {const len=Math.hypot(this.input.x,this.input.y)||1;slide(e,this.input.x/len*this.speed(e)*dt,this.input.y/len*this.speed(e)*dt);}
          if(this.input.fire)this.attack(e,this.input.aim);
          e.facing=Math.atan2(this.input.aim.y-e.y,this.input.aim.x-e.x);
        } else this.aiChampion(e,dt);
      } else if(e.kind==='minion')this.aiMinion(e,dt);
      else if(e.kind==='neutral')this.aiNeutral(e,dt);
      else this.aiStructure(e);
    }
    this.updateProjectiles(dt);this.updateDelayed(dt);
    for(const fx of this.effects)fx.life-=dt;
    this.effects=this.effects.filter(f=>f.life>0).slice(-220);
    this.units=this.units.filter(e=>e.kind!=='minion'||e.alive);
    if(this.time>=RULES.duration&&this.winner===null)this.judge();
  }
}
