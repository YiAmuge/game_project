export const CHAT_LIMIT=200;
export const cleanChat=value=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,CHAT_LIMIT):'';
