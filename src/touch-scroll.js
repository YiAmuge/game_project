const choices='.champion-option,.archive-champion,.training-pick-option,.monster-choice,.augment-guide-choice,.augment-tile,#owned-list button';
// Keep native touch scrolling over canvases and discard the click after a drag.
export function installTouchScroll(enabled){
 const touches=new Map();let blocked=null;
 window.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!enabled())return;const target=e.target.closest?.(choices);if(!target)return;blocked=null;touches.set(e.pointerId,{target,x:e.clientX,y:e.clientY,dragged:false});},true);
 window.addEventListener('pointermove',e=>{const s=touches.get(e.pointerId);if(s&&Math.hypot(e.clientX-s.x,e.clientY-s.y)>8)s.dragged=true;},true);
 const end=e=>{const s=touches.get(e.pointerId);if(!s)return;touches.delete(e.pointerId);if(s.dragged||e.type==='pointercancel')blocked={target:s.target,until:performance.now()+700};else if(!e.isPrimary&&!s.target.disabled){e.preventDefault();s.target.click();}};
 window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
 window.addEventListener('click',e=>{if(blocked&&performance.now()<blocked.until&&(e.target===blocked.target||blocked.target.contains(e.target))){e.preventDefault();e.stopImmediatePropagation();}},true);
 return{isChoice:target=>Boolean(target.closest?.(choices))};
}
