// Preserve the uploaded inhale/exhale, excluding the twenty-second silent tail.
export const MOSES_SAMPLES=[{id:'mosesBreath',file:'stuiestu-male-deep-breath-457556.mp3',start:.14,end:2.60}];
export function mosesSoundProfile(v){if(v.key!=='moses')return null;const tint=[0,.12,-.10,.06][(v.variant||0)%4];
 if(v.phase==='moses-inhale')return{id:'mosesBreath',pitch:tint,duration:v.slot==='r'?.28:.72,gain:.48,offset:0,rates:[1,1.015,1],dry:true,fadeOut:.065};
 if(['moses-exhale','moses-red-point'].includes(v.phase)){const r=v.phase==='moses-red-point',tone={up:.15,down:-.25,left:-.1,right:-.2}[v.breath]||0;return{id:'mosesBreath',pitch:(r?-.65:tone)+tint,duration:r?1.12:v.breath?.64:.26,gain:r?.96:.61,offset:1.24,rates:r?[.98,1.02,.98]:[1,1.035,1],dry:true,fadeOut:r?.17:.12};}return null;
}
