const nonTypingInputs=new Set(['checkbox','radio','range','button','submit','reset','color','file','image']);
// Options retain focus after a click; only actual text entry owns game keys.
export function isTextEntry(target){
 if(target?.isContentEditable)return true;
 const field=target?.closest?.('input,textarea');
 return Boolean(field&&(field.tagName==='TEXTAREA'||!nonTypingInputs.has(field.type)));
}
// Keep Escape available to the game and chat throughout browser fullscreen.
export function syncEscapeLock(){
 const keyboard=navigator.keyboard;if(!keyboard)return;
 if(!document.fullscreenElement){keyboard.unlock?.();return;}
 keyboard.lock?.(['Escape']).then(()=>{if(!document.fullscreenElement)keyboard.unlock?.();}).catch(()=>{});
}
