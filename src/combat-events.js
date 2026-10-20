// Currency values are tuned to the prototype's 120-gold kills and 20-minute matches.
export const COMBAT_RULES={creditWindow:10,assistWindow:6,multiKillWindow:10,killGold:120,killXp:120,assistGold:40,assistXp:70,firstBloodBonus:1/3,bountyStart:3,bountyBase:60,bountyStep:40,bountyCap:220,announcementDuration:3.2};
const environment=new Set(['tower','core','minion','neutral','fountain','bait']);
export const environmental=source=>environment.has(source?.kind);
export function bounty(e){return e.kind==='champion'&&e.streak>=COMBAT_RULES.bountyStart?Math.min(COMBAT_RULES.bountyCap,COMBAT_RULES.bountyBase+(e.streak-COMBAT_RULES.bountyStart)*COMBAT_RULES.bountyStep):0;}
export function creditedKiller(g,victim,finisher){
 const enemy=e=>e?.kind==='champion'&&e.team<2&&e.team!==victim.team;
 if(enemy(finisher))return finisher;
 if(!environmental(finisher))return null;
 const hit=victim.lastEnemyDamage;
 if(!hit||g.time-hit.at>COMBAT_RULES.creditWindow+1e-8)return null;
 return g.champions().find(e=>e.id===hit.id&&enemy(e))||null;
}
export function rewardKill(g,victim,killer){
 if(!killer)return null;
 const first=!g.firstBlood,shutdown=bounty(victim),factor=first?1+COMBAT_RULES.firstBloodBonus:1;
 const assists=g.champions(killer.team).filter(c=>c!==killer&&(victim.contributors[c.id]??-Infinity)>=g.time-COMBAT_RULES.assistWindow).slice(0,3);
 // Reserve first blood before takedown callbacks can cause another death.
 if(first)g.firstBlood={killerId:killer.id,victimId:victim.id,time:g.time,assistIds:assists.map(c=>c.id)};
 g.kills[killer.team]++;killer.kills++;killer.streak++;
 killer.multiKillCount=g.time-(killer.lastChampionKill??-Infinity)<=COMBAT_RULES.multiKillWindow+1e-8?Math.min(4,(killer.multiKillCount||0)+1):1;
 killer.lastChampionKill=g.time;
 const gold=COMBAT_RULES.killGold*factor+shutdown;
 g.award(killer,COMBAT_RULES.killXp,gold);
 for(const ally of assists){ally.assists++;g.award(ally,COMBAT_RULES.assistXp+(killer.key==='ahab'?80:0),(COMBAT_RULES.assistGold+(killer.key==='ahab'?50:0))*factor);}
 return {first,shutdown,assists,gold,count:killer.multiKillCount};
}
export function currentAnnouncement(g){
 while(g.announcements[0]?.until<=g.time+1e-8)g.announcements.shift();
 return g.announcements[0]||null;
}
export function announce(g,kind,title,detail='',{team=null,actor=null,first=false}={}){
 currentAnnouncement(g);
 const entry={id:++g.announcementSequence,kind,title,detail,team,actor,first};
 // A rapid multikill upgrades its existing banner instead of queuing stale single kills.
 const previous=kind==='kill'?g.announcements.findIndex(n=>n.kind==='kill'&&n.actor===actor):-1;
 if(previous>=0){const old=g.announcements[previous];entry.first||=old.first;entry.at=old.at;entry.until=old.until;if(previous===0)entry.until=g.time+COMBAT_RULES.announcementDuration;g.announcements[previous]=entry;for(let i=previous+1;i<g.announcements.length;i++){g.announcements[i].at=g.announcements[i-1].until;g.announcements[i].until=g.announcements[i].at+COMBAT_RULES.announcementDuration;}return entry;}
 if(g.announcements.length>=4)g.announcements.pop();
 entry.at=Math.max(g.time,g.announcements.at(-1)?.until||0);entry.until=entry.at+COMBAT_RULES.announcementDuration;g.announcements.push(entry);return entry;
}
