// A separate arena definition. Nothing here mutates the original training map.
export const TRAINING_25D={
 id:'training-25d',name:'입체 실험 정원',
 bounds:{x:0,y:0,w:83.2,h:46.8},
 spawn:{x:9,y:40},hazard:{x:30,y:38,w:4,h:4},
 areas:[
  {id:1,x:2,y:33,w:33,h:12,name:'회복 · 피해 정원',color:'#7fafad'},
  {id:2,x:48,y:33,w:33,h:12,name:'크립 정원',color:'#bc9d6d'},
  {id:3,x:2,y:18,w:33,h:11,name:'대치 · 지원 정원',color:'#90afcf'},
  {id:4,x:48,y:18,w:33,h:11,name:'이동 표적 정원',color:'#b09acd'},
  {id:5,x:2,y:2,w:79,h:12,name:'미니언 · 포탑 회랑',color:'#c8b789'},
 ],
 walls:[
  {x:0,y:15,w:35,h:.8},{x:48,y:15,w:35.2,h:.8},
  {x:0,y:30.5,w:35,h:.8},{x:48,y:30.5,w:35.2,h:.8},
  {x:37,y:18,w:1,h:8},{x:45.2,y:21,w:1,h:8},
  {x:37,y:34,w:1,h:7},{x:45.2,y:35,w:1,h:9},
  {x:60,y:21,w:2,h:1.4},
 ],
 infinite:[{team:0,x:19,y:40},{team:1,x:25,y:40}],
 duel:[{team:0,x:12,y:23},{team:1,x:22,y:23}],
 patrol:{x:65,y:19,to:28},
 central:[{x:55,y:35},{x:58,y:35},{x:55,y:38},{x:58,y:38}],
 camps:[{x:67,y:35,kind:'amplify'},{x:76,y:35,kind:'blessing'},{x:72,y:42,kind:'boss'}],
 lane:[{x:10,y:8},{x:41.6,y:8},{x:73,y:8}],
};
export function createTraining25DMap(){
 return {id:TRAINING_25D.id,bounds:{...TRAINING_25D.bounds},walls:TRAINING_25D.walls.map(w=>({...w}))};
}
