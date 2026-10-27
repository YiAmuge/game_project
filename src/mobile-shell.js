// Browser fullscreen requires a user gesture. Retain it across every app screen,
// and retry on the next touch if the browser leaves fullscreen with Back.
export class MobileShell{
 constructor({enabled,back,playing}){
  this.enabled=enabled;this.back=back;this.playing=playing;this.armed=false;
  const toggle=document.createElement('button');toggle.id='mobile-fullscreen';toggle.setAttribute('aria-label','전체 화면 전환');toggle.title='전체 화면';toggle.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/></svg>';toggle.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else this.fullscreen();};document.body.append(toggle);
  document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&this.enabled()){this.arm();if(!e.target.closest?.('#mobile-fullscreen'))this.fullscreen();}},true);
  window.addEventListener('popstate',e=>{if(!this.enabled())return;e.stopImmediatePropagation();history.pushState({...history.state,cityBorderMobile:true},'',location.href);this.back();},true);
  document.addEventListener('fullscreenchange',()=>{const full=Boolean(document.fullscreenElement);if(this.wasFullscreen&&!full&&this.enabled()&&this.playing())this.back();this.wasFullscreen=full;});
  this.arm();
 }
 arm(){if(this.armed||!this.enabled())return;this.armed=true;if(!history.state?.cityBorderMobile)history.pushState({...history.state,cityBorderMobile:true},'',location.href);}
 fullscreen(){
  if(!this.enabled()||document.fullscreenElement||this.pending)return;
  const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;if(!request)return;
  try{this.pending=Promise.resolve(request.call(root,{navigationUI:'hide'})).then(()=>screen.orientation?.lock?.('landscape')).catch(()=>{}).finally(()=>{this.pending=null;});}catch{this.pending=null;}
 }
}
