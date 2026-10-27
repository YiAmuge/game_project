import{RUNTIME_CHAMPIONS}from'./data.js';
export function championDescription(key,transformed=false){
 const c=RUNTIME_CHAMPIONS[key],f=transformed?c.forms?.transformed:null;if(!f)return c;
 const result={...c,referenceForm:f,ultimate:'',rText:''};
 for(const [i,[title,text]]of [['passive','passiveText'],['basic','basicText'],['tactical','qText']].entries()){result[title]=f.skills[i].name;result[text]=f.skills[i].description;}
 return result;
}
