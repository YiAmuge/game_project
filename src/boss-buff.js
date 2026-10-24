import { distance } from './geometry.js';
export const BOSS_BUFF={duration:180,respawn:300,radius:7,power:.15,minion:.2,recall:.7};
export function reward(g,team){for(const c of g.champions(team).filter(c=>c.alive&&!c.trainingDummy))g.addBuff(c,'bossBuff',BOSS_BUFF.duration,{copy:false});}
export function tick(g){
 const holders=g.champions().filter(c=>c.alive&&g.buff(c,'bossBuff'));
 for(const m of g.units.filter(e=>e.kind==='minion'&&e.alive)){
  const active=holders.some(c=>c.team===m.team&&distance(c,m)<=BOSS_BUFF.radius);
  if(active===Boolean(m.bossEmpowered))continue;
  m.bossBaseHp??=m.maxHp;m.bossBaseDamage??=m.damage;const ratio=m.hp/m.maxHp;m.maxHp=m.bossBaseHp*(active?1+BOSS_BUFF.minion:1);m.hp=m.maxHp*ratio;m.damage=m.bossBaseDamage*(active?1+BOSS_BUFF.minion:1);m.bossEmpowered=active;
 }
}
