export function factor(g,e){return e.plague?.until>g.time?1-.03*e.plague.stacks:1;}
export function apply(g,e,source=g.actionSource){
 if(!e.alive||g.debuffImmune?.(e))return;
 g.triggerDisrupt(source,e);const old=factor(g,e),base=e.kind==='champion'?null:(e.plague?.baseMax??e.maxHp/old);
 e.plague={stacks:Math.min(5,(old<1?e.plague.stacks:0)+1),until:g.time+3,baseMax:base};
 e.maxHp=e.kind==='champion'?g.maxHp(e):base*factor(g,e);e.hp=Math.min(e.hp,e.maxHp);
}
export function clear(g,e){
 if(!e.plague)return;const base=e.plague.baseMax;delete e.plague;
 e.maxHp=e.kind==='champion'?g.maxHp(e):base;e.hp=Math.min(e.hp,e.maxHp);
}
export function tick(g,e){if(e.plague&&e.plague.until<=g.time)clear(g,e);}
