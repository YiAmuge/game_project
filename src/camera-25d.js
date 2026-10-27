import { OrthographicCamera,Vector3,Raycaster,Plane } from './vendor/three.js';

// X/Z is the existing game's X/Y plane. A fixed camera keeps WASD directions
// intuitive, while ray/ground intersections make the cursor authoritative.
export class Camera25D {
 constructor(){
  this.native=new OrthographicCamera(-15,15,9,-9,.1,180);
  this.ray=new Raycaster();this.ground=new Plane(new Vector3(0,1,0),0);
  this.width=1;this.height=1;this.scale=1;this.x=0;this.y=0;
 }
 update(width,height,player,playing=true,view=1){
  this.width=Math.max(1,width);this.height=Math.max(1,height);
  this.scale=Math.max(this.width/32,this.height/21)/view;
  const w=this.width/this.scale,h=this.height/this.scale,c=this.native;
  c.left=-w/2;c.right=w/2;c.top=h/2;c.bottom=-h/2;
  this.x=player.x;this.y=player.y;
  c.position.set(player.x,25,player.y+19);
  // Center the standing champion, not just its feet.
  c.lookAt(player.x,.85,player.y);c.updateProjectionMatrix();c.updateMatrixWorld();
 }
 worldToScreen(p,height=0){
  const v=new Vector3(p.x,height,p.y).project(this.native);
  return {x:(v.x+1)*this.width/2,y:(1-v.y)*this.height/2};
 }
 screenToWorld(x,y){
  this.ray.setFromCamera({x:x/this.width*2-1,y:1-y/this.height*2},this.native);
  const p=this.ray.ray.intersectPlane(this.ground,new Vector3());
  return p?{x:p.x,y:p.z}:{x:this.x,y:this.y};
 }
 get bounds(){
  const a=this.screenToWorld(0,0),b=this.screenToWorld(this.width,this.height);
  return {x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y};
 }
}
