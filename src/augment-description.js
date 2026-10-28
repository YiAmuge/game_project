const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function augmentDescriptionHTML(item,text=item?.text||'증강을 선택하면 효과를 확인합니다.'){
 if(item?.key!=='highRisk')return '<p>'+escape(text).replaceAll('\n','<br>')+'</p>';
 const[lead,body='']=text.split('\n\n침투\n'),lines=body.split('\n').filter(Boolean);
 return `<p class="augment-lead">${escape(lead)}</p><section class="infiltration-description"><h4>침투</h4>${lines.map(line=>{const split=line.indexOf(' · ');return split<0?`<p>${escape(line)}</p>`:`<p><b>${escape(line.slice(0,split))}</b><span>${escape(line.slice(split+3))}</span></p>`;}).join('')}</section>`;
}
