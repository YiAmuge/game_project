export const OFFLINE_PAGE_URL='https://yiamuge.github.io/game_project/';
export function setupDistribution(doc=document,loc=location){
 const menu=doc.getElementById('main-menu'),online=doc.getElementById('online');
 const offline=Boolean(doc.querySelector('meta[name="city-border-offline"]'));
 if(offline){
  online.classList.add('hidden');
  const download=doc.createElement('a');download.id='offline-download';download.className='menu-action';
  download.href='./city-border.html';download.download='city-border.html';
  download.innerHTML='<span>01</span><b>오프라인 파일 저장</b><small>저장한 HTML을 열면 인터넷 없이 플레이 →</small>';
  if(loc.protocol==='file:'){download.removeAttribute('href');download.removeAttribute('download');download.innerHTML='<span>01</span><b>오프라인 실행 중</b><small>AI 대전 · 연습장 · 도감</small>';}
  online.after(download);
 }else{
  const link=doc.createElement('a');link.id='offline-link';link.className='offline-link';link.href=OFFLINE_PAGE_URL;link.target='_blank';link.rel='noopener';link.textContent='오프라인 버전 · AI 대전 / 연습장';menu.append(link);
 }
 return offline;
}
