import{MAP_CENTER}from'./data.js';
export const MATCH_INTRO={creeps:.2,overview:.5,travelAt:.6,travel:.5,duration:1.1,view:1.6};
export const MATCH_OUTRO={charge:1,explosion:.6,duration:1.6};
const ease=n=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
export const introHidden=(g,e)=>g.presentation?.type==='intro'&&(e.kind==='champion'||e.kind==='neutral'&&g.presentation.elapsed<MATCH_INTRO.creeps);
export const endingCore=(g,e)=>g.presentation?.type==='outro'&&g.presentation.coreId===e.id;
export function cinematicCamera(g){const p=g.presentation;if(!p)return null;
 if(p.type==='intro'){const t=ease((p.elapsed-MATCH_INTRO.travelAt)/MATCH_INTRO.travel),home=g.player;return{anchor:{x:MAP_CENTER.x+(home.x-MAP_CENTER.x)*t,y:MAP_CENTER.y+(home.y-MAP_CENTER.y)*t},view:MATCH_INTRO.view+(1-MATCH_INTRO.view)*t};}
 if(p.type==='outro'&&p.core)return{anchor:p.core,view:1};return null;
}
export class MatchPresentation{
 start(g){this.reset(g);if(g.training)return;this.state=g.presentation={type:'intro',elapsed:0};g.emitSound('intro');}
 reset(g){if(this.game)delete this.game.presentation;this.game=g;delete g.presentation;this.state=null;this.finished=false;this.outcomeStarted=false;}
 get blocking(){return Boolean(this.state?.type==='intro'||this.state?.type==='outro');}
 end(g){if(g.training||this.outcomeStarted)return;this.outcomeStarted=true;const core=g.units.find(e=>e.kind==='core'&&e.team===1-g.winner);this.state=g.presentation={type:'outro',elapsed:0,coreId:core?.id,core:core?{x:core.x,y:core.y}:null};}
 tick(dt,g){const s=this.state;if(!s||g!==this.game)return;const before=s.elapsed;s.elapsed+=dt;
  if(s.type==='intro'){
   if(before<MATCH_INTRO.creeps&&s.elapsed>=MATCH_INTRO.creeps)g.emitSound('spawn');
   if(s.elapsed>=MATCH_INTRO.duration){this.state=null;delete g.presentation;g.entryFlare={at:g.time,until:g.time+.5};g.emitSound('spawn',g.player);}
  }else if(s.type==='outro'){
   if(before<MATCH_OUTRO.charge&&s.elapsed>=MATCH_OUTRO.charge)g.emitSound('explosion',s.core||{});
   if(s.elapsed>=(s.core?MATCH_OUTRO.duration:.3)){this.finished=true;this.state=null;g.emitSound(g.winner===0?'victory':'defeat');}
  }
 }
 draw(c,camera,g){const s=g.presentation;if(!s){if(g.entryFlare?.until>g.time){const fade=(g.entryFlare.until-g.time)/.5;for(const e of g.champions(g.player.team).filter(e=>e.alive))this.spawn(c,camera,e,fade);}return;}
  if(s.type==='intro'&&s.elapsed>=.2&&s.elapsed<.55)for(const e of g.units.filter(e=>e.kind==='neutral'))this.spawn(c,camera,e,1-(s.elapsed-.2)/.35);
  if(s.type!=='outro'||!s.core)return;const p=camera.worldToScreen(s.core,.3),scale=camera.scale,t=s.elapsed;
  c.save();if(t<1){const r=scale*(1.5+t*2),glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);glow.addColorStop(0,'#ffffff'+Math.round(190*t).toString(16).padStart(2,'0'));glow.addColorStop(1,'#dceeff00');c.fillStyle=glow;c.fillRect(p.x-r,p.y-r,r*2,r*2);}
  else{const age=t-1,fade=Math.max(0,1-age/.6),r=scale*(1+age*13);const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);glow.addColorStop(0,'#ffffff');glow.addColorStop(.2,'#e7f3ff');glow.addColorStop(.5,'#a1c2ed88');glow.addColorStop(1,'#5a88bf00');c.globalAlpha=fade;c.fillStyle=glow;c.fillRect(p.x-r,p.y-r,r*2,r*2);c.strokeStyle='#f5fbff';c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y,r,r*.6,0,0,Math.PI*2);c.stroke();for(let i=0;i<24;i++){const a=i*2.4,d=(.4+age*10)*(1+i%4*.25),point=camera.worldToScreen({x:s.core.x+Math.cos(a)*d,y:s.core.y+Math.sin(a)*d},.3+Math.sin(age/.6*Math.PI)*(1+i%3));c.fillStyle=i%2?'#d5e8ff':'#ffffff';c.fillRect(point.x,point.y,scale*.08,scale*.12);}c.globalAlpha=fade*.3;c.fillStyle='#fff';c.fillRect(0,0,camera.width,camera.height);}
  c.restore();
 }
 spawn(c,camera,e,fade){const p=camera.worldToScreen(e,.12),r=camera.scale*(.4+(1-fade)*1.1);c.save();c.globalAlpha=fade*.7;c.strokeStyle='#b9edf8';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,r,r*.55,0,0,Math.PI*2);c.stroke();const top=camera.worldToScreen(e,2.2);c.globalAlpha=fade*.2;c.strokeStyle='#dcfaff';c.lineWidth=camera.scale*.35;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(top.x,top.y);c.stroke();c.restore();}
}
