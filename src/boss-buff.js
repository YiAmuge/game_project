import { distance } from './geometry.js';
export const BOSS_BUFF={duration:180,respawn:300,radius:9.5,linger:1,power:.15,minion:.2,recall:.7};
export function reward(g,team){for(const c of g.champions(team).filter(c=>c.alive&&!c.trainingDummy))g.addBuff(c,'bossBuff',BOSS_BUFF.duration,{copy:false});}
export function tick(g){
 const holders=g.champions().filter(c=>c.alive&&g.buff(c,'bossBuff'));
 for(const m of g.units.filter(e=>e.kind==='minion'&&e.alive)){
  const nearby=holders.some(c=>c.team===m.team&&distance(c,m)<=BOSS_BUFF.radius);
  if(nearby)m.bossEmpoweredUntil=g.time+BOSS_BUFF.linger;
  const active=nearby||(m.bossEmpoweredUntil??-Infinity)>g.time;
  if(active===Boolean(m.bossEmpowered))continue;
  m.bossBaseHp??=m.maxHp;m.bossBaseDamage??=m.damage;const ratio=m.hp/m.maxHp;m.maxHp=m.bossBaseHp*(active?1+BOSS_BUFF.minion:1);m.hp=m.maxHp*ratio;m.damage=m.bossBaseDamage*(active?1+BOSS_BUFF.minion:1);m.bossEmpowered=active;
 }
}
