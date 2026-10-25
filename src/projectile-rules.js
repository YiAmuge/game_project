// Visual scale and collision half-width are independent of damage, range and speed.
export const PROJECTILE_VISUAL_SCALE=2.5;
export const PROJECTILE_HIT_SCALE=1.1;
export const FAUST_WAVE_HALF_WIDTH=.18+.9/PROJECTILE_HIT_SCALE;
export const KIM_WAVE_HALF_WIDTH=.9;
export const KIM_COUNTER_HALF_WIDTH=1.26;
export function projectileHitWidth(p){return Math.max(0,p.width??.14)*PROJECTILE_HIT_SCALE;}
export function projectileDimensions(style,scale=1){
 const width=(style.visualWidth??style.width)*scale,length=style.type==='swordRay'?scale*.9:style.type==='wave'?width*.7:Math.max(width*2.5,scale*.65);
 const factor=PROJECTILE_VISUAL_SCALE*(style.visualScale??1);
 return {width:width*factor,length:length*factor};
}
