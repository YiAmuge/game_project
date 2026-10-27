export const DAMAGE_COLORS={normal:'#ffe4ac',enemy:'#ffb1a4',fixed:'#ce91ff',heal:'#79ed9d'};
export const NUMBER_BATCH={window:.5,gap:.35};
export function combatNumber(g,target,amount,{fixed=false,heal=false,source}={}){
 if(!(amount>0))return;
 const color=heal?DAMAGE_COLORS.heal:fixed?DAMAGE_COLORS.fixed:source?.team===1?DAMAGE_COLORS.enemy:DAMAGE_COLORS.normal;
 const recent=g.effects.findLast(f=>f.type==='number'&&f.target===target.id&&f.color===color&&f.life>0&&g.time-f.startedAt<NUMBER_BATCH.window-1e-8&&g.time-f.lastAt<=NUMBER_BATCH.gap+1e-8);
 if(recent){recent.amount+=amount;recent.hits++;recent.lastAt=g.time;recent.x=target.x;recent.y=target.y;recent.text=(heal?'+':'')+Math.max(1,Math.round(recent.amount));return;}
 g.effects.push({type:'number',target:target.id,source:source?.id,x:target.x,y:target.y,amount,hits:1,startedAt:g.time,lastAt:g.time,text:(heal?'+':'')+Math.max(1,Math.round(amount)),fixed,heal,color,life:.85,maxLife:.85});
}
export function drawCombatNumbers(c,camera,g){
 c.save();c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 for(const f of g.effects){if(f.type!=='number')continue;const target=g.units.find(e=>e.id===f.target);if(target&&!g.visibleTo(g.player.team,target))continue;const t=1-f.life/f.maxLife,p=camera.worldToScreen(f,2.5),size=Math.max(15,Math.min(24,camera.scale*.49)),offset=(f.heal?.44:f.fixed?-.36:0)*camera.scale;c.globalAlpha=Math.min(1,f.life/.22);c.font=`800 ${size}px Arial, sans-serif`;c.lineWidth=Math.max(3,size*.16);c.strokeStyle='#05070c';c.fillStyle=f.color;c.strokeText(String(f.text),p.x+offset,p.y-t*32);c.fillText(String(f.text),p.x+offset,p.y-t*32);}
 c.restore();
}
