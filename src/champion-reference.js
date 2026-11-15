import{RUNTIME_CHAMPIONS}from'./data.js';
import {GASHARPOON_SKILLS as GAS} from './ahab-ego-data.js';
export function championForms(key){
 const c=RUNTIME_CHAMPIONS[key];if(key!=='ahab')return c.forms;
 return{transformed:{name:'개화 E.G.O 상태',art:'ahabGasBody',skills:[{name:c.passive,description:c.passiveText.replace('발동 시 자신의 탄창을 모두 장전한다.','').trim()+' 개화 E.G.O 상태에서는 일반 전술기의 엄호·전가 및 능력치 효과가 적용되지 않는다.'},{name:GAS.basic,description:GAS.basicText},{name:GAS.tactical,description:GAS.qText},{name:GAS.ultimate,description:GAS.rText}]}};
}
export function championDescription(key,transformed=false){
 const c=RUNTIME_CHAMPIONS[key],f=transformed?championForms(key)?.transformed:null;if(!f)return c;
 const result={...c,referenceForm:f,ultimate:'',rText:''};
 for(const [i,[title,text]]of [['passive','passiveText'],['basic','basicText'],['tactical','qText'],['ultimate','rText']].entries()){if(!f.skills[i])continue;result[title]=f.skills[i].name;result[text]=f.skills[i].description;}
 return result;
}
