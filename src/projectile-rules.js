// Visual scale and collision half-width are independent of damage, range and speed.
export const PROJECTILE_VISUAL_SCALE=2.5;
export const PROJECTILE_HIT_SCALE=1.1;
export function projectileHitWidth(p){return Math.max(0,p.width??.14)*PROJECTILE_HIT_SCALE;}
export function projectileDimensions(style,scale=1){
 const width=style.width*scale,length=style.type==='wave'?width*.7:Math.max(width*2.5,scale*.65);
 return {width:width*PROJECTILE_VISUAL_SCALE,length:length*PROJECTILE_VISUAL_SCALE};
}
