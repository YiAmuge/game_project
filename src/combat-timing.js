// Combat clocks and their displayed values share the same tenth-second duration.
export const combatSeconds=value=>Math.max(.1,Math.round((value+1e-9)*10)/10);
