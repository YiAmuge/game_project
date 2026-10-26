import{CHAMPIONS,POSITION_ORDER}from'./data.js';
export const emptyDraft=()=>[Object.fromEntries(POSITION_ORDER.map(p=>[p,'random'])),Object.fromEntries(POSITION_ORDER.map(p=>[p,'random']))];
export function botChoice(bots,team,position){const value=bots?.[team]?.[position];return value===null?null:CHAMPIONS[value]?value:'random';}
