// World position is the character's feet. Track the standing sprite's center.
export class Camera {
  constructor(){this.x=32;this.y=18;this.scale=1;this.width=1;this.height=1;}
  update(width,height,player,playing){
    this.width=Math.max(1,width);this.height=Math.max(1,height);
    if(playing){
      this.scale=Math.max(this.width/30,this.height/18);
      this.x=player.x;this.y=player.y-.7;
    } else {
      this.scale=Math.min(this.width/64,this.height/36);
      this.x=32;this.y=18;
    }
    this.ox=this.width/2-this.x*this.scale;this.oy=this.height/2-this.y*this.scale;
  }
  worldToScreen(p){return {x:p.x*this.scale+this.ox,y:p.y*this.scale+this.oy};}
  screenToWorld(x,y){return {x:(x-this.ox)/this.scale,y:(y-this.oy)/this.scale};}
  get bounds(){return {x:this.x-this.width/this.scale/2,y:this.y-this.height/this.scale/2,w:this.width/this.scale,h:this.height/this.scale};}
}
