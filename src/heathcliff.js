// Shared combat and presentation values for 시체자루.
export const HEATH={chargeArmor:.2,ultimateArmor:.3,radius:5,damage:210,lifesteal:.3,interval:.3,duration:3.8};
export const instantCharge=(g,e)=>e.key==='heathcliff'&&g.buff(e,'heathUlt');
