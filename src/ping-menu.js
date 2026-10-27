import { choices,send,PING_LABELS,PING_KEYS } from './pings.js';
import { paintPingIcon } from './ping-icons.js';
export const PING_HOLD_MS=250;
const choiceStamp=items=>items.map(i=>i.id+':'+Boolean(i.disabled)).join('|');
// A held gesture always cancels unless the cursor actually drags onto an icon.
export class PingMenu {
 constructor(root,{getGame,allowed,point,onSend}){this.root=root;this.getGame=getGame;this.allowed=allowed;this.point=point;this.onSend=onSend;this.press=null;}
 begin(kind,x,y,source,now=performance.now()){
  if(!this.allowed()||this.press)return false;
  this.press={kind,x,y,source,at:now,world:this.point(x,y),game:this.getGame(),owner:this.getGame().player.id,choice:null,open:false,moved:false};return true;
 }
 tick(now=performance.now()){
  const p=this.press;if(!p)return;
  if(!this.allowed()||p.game!==this.getGame()||p.owner!==this.getGame().player.id){this.cancel();return;}
  if(!p.open&&now-p.at>=PING_HOLD_MS)this.open();
  else if(p.open&&now-(p.refreshAt||0)>100){p.refreshAt=now;if(choiceStamp(choices(p.game,p.kind))!==p.choicesStamp){p.open=false;p.choice=null;this.open();}}
 }
 open(){
  const p=this.press;if(!p||p.open)return;p.open=true;const game=this.getGame(),items=choices(game,p.kind),width=Math.min(380,innerWidth-12);
  p.choicesStamp=choiceStamp(items);this.root.replaceChildren();this.root.classList.remove('hidden');this.root.style.setProperty('--ping-color',({attack:'#ff9b61',defend:'#86d8f7',danger:'#ff626c'})[p.kind]);this.root.style.width=width+'px';
  const heading=document.createElement('div');heading.className='ping-heading';heading.innerHTML='<strong></strong><small>드래그하여 선택 · 그대로 놓으면 취소</small>';heading.querySelector('strong').textContent=PING_LABELS[p.kind];this.root.append(heading);
  const add=(parent,item)=>{
   const b=document.createElement('div');b.className='ping-choice'+(item.disabled?' unavailable':'');b.dataset.choice=item.id;b.setAttribute('role','option');b.setAttribute('aria-label',item.name);b.setAttribute('aria-disabled',String(Boolean(item.disabled)));const canvas=document.createElement('canvas');canvas.width=canvas.height=80;const name=document.createElement('span');name.textContent=item.name;b.append(canvas,name);parent.append(b);paintPingIcon(canvas,item,game.player.team);
  };
  const objectives=items.filter(i=>i.type!=='champion');if(objectives.length){const row=document.createElement('div');row.className='ping-objectives';for(const item of objectives)add(row,item);this.root.append(row);}
  const teams=p.kind==='attack'?[1-game.player.team]:p.kind==='defend'?[game.player.team]:[game.player.team,1-game.player.team];
  const champions=document.createElement('div');champions.className='ping-champions';this.root.append(champions);
  for(const team of teams){const row=document.createElement('section');row.className='ping-team';row.dataset.team=team===game.player.team?'ally':'enemy';const label=document.createElement('small');label.textContent=team===game.player.team?'아군':'적군';row.append(label);const grid=document.createElement('div');grid.className='ping-team-grid';grid.dataset.team=row.dataset.team;row.append(grid);const list=items.filter(i=>i.type==='champion'&&i.team===team);for(const item of list)add(grid,item);for(let i=list.length;i<4;i++){const empty=document.createElement('div');empty.className='ping-empty';empty.setAttribute('aria-hidden','true');grid.append(empty);}champions.append(row);
   // Training can contain more than four copies; keep four visible slots and scroll horizontally.
   grid.addEventListener('wheel',e=>{if(grid.scrollWidth>grid.clientWidth){e.preventDefault();grid.scrollLeft+=e.deltaY||e.deltaX;p.choice=null;}},{passive:false});
  }
  const height=this.root.offsetHeight,scale=Math.min(1,(innerHeight-12)/height);this.root.style.setProperty('--ping-scale',scale);
  const mx=width*scale/2+6,my=height*scale/2+6;p.cx=Math.max(mx,Math.min(innerWidth-mx,p.x));p.cy=Math.max(my,Math.min(innerHeight-my,p.y));this.root.style.left=p.cx+'px';this.root.style.top=p.cy+'px';
 }

 move(x,y){
  const p=this.press;if(!p)return;p.moved=Math.hypot(x-p.x,y-p.y)>=20;if(!p.open)return;
  p.choice=null;for(const b of this.root.querySelectorAll('.ping-choice')){const r=b.getBoundingClientRect(),grid=b.closest('.ping-team-grid'),clip=grid?.getBoundingClientRect(),inside=!clip||x>=clip.left&&x<=clip.right&&y>=clip.top&&y<=clip.bottom,selected=inside&&p.moved&&!b.classList.contains('unavailable')&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;b.classList.toggle('selected',selected);if(selected)p.choice=b.dataset.choice;}
 }
 end(source,now=performance.now()){
  const p=this.press;if(!p||p.source!==source)return false;
  this.tick(now);if(this.press!==p)return true;
  if(this.allowed()&&p.game===this.getGame()){
   let result;if(now-p.at<PING_HOLD_MS)result=send(p.game,p.kind,p.world);else if(p.choice)result=send(p.game,p.kind,p.world,p.choice);
   if(result)this.onSend?.(result);
  }
  this.cancel();return true;
 }
 cancel(){this.press=null;this.root.classList.add('hidden');this.root.replaceChildren();}
 keyDown(event,x,y){const kind=PING_KEYS[event.code];if(!kind)return false;if(!event.repeat)this.begin(kind,x,y,event.code);return true;}
}
