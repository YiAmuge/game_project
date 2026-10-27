export const DAMAGE_COLORS={normal:'#ffe4ac',enemy:'#ffb1a4',fixed:'#ce91ff',heal:'#79ed9d'};
export function combatNumber(g,target,amount,{fixed=false,heal=false,source}={}){
 if(!(amount>0))return;
 g.effects.push({type:'number',target:target.id,source:source?.id,x:target.x,y:target.y,text:(heal?'+':'')+Math.max(1,Math.round(amount)),fixed,heal,color:heal?DAMAGE_COLORS.heal:fixed?DAMAGE_COLORS.fixed:source?.team===1?DAMAGE_COLORS.enemy:DAMAGE_COLORS.normal,life:.85,maxLife:.85});
}
export function drawCombatNumbers(c,camera,g){
 c.save();c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 for(const f of g.effects){if(f.type!=='number')continue;const target=g.units.find(e=>e.id===f.target);if(target&&!g.visibleTo(g.player.team,target))continue;const t=1-f.life/f.maxLife,p=camera.worldToScreen(f,2.5),size=Math.max(15,Math.min(24,camera.scale*.49));c.globalAlpha=Math.min(1,f.life/.22);c.font=`800 ${size}px Arial, sans-serif`;c.lineWidth=Math.max(3,size*.16);c.strokeStyle='#05070c';c.fillStyle=f.color;c.strokeText(String(f.text),p.x,p.y-t*32);c.fillText(String(f.text),p.x,p.y-t*32);}
 c.restore();
}
