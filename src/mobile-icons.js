const shapes={
 champion:'<circle cx="16" cy="10" r="5"/><path d="M7 27v-4c0-8 18-8 18 0v4"/>',
 minion:'<path d="M6 13 10 5h12l4 8v10l-10 5L6 23Z"/><path d="M9 13h14M12 17h2m4 0h2M16 21v5"/>',
 structure:'<path d="M8 27V10H5V4h6v5h10V4h6v6h-3v17Zm6 0v-9h4v9"/>',
 creep:'<path d="m9 12-4-7 10 5h2l10-5-4 7 4 7-6 9H11l-6-9Z"/><path d="m10 17 3 2m6 0 3-2m-9 7h6"/>'
};
export const targetIcon=kind=>`<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${shapes[kind]||shapes.champion}</svg>`;
export function pingIcon(kind){
 const sword='<path d="M10.5 15V5L12 2l1.5 3v10ZM8 15h8m-4 0v6m-1.5 0h3"/>';
 const shape=kind==='attack'?`<g transform="rotate(-45 12 12)">${sword}</g><g transform="rotate(45 12 12)">${sword}</g>`:kind==='defend'?'<path d="m12 3 8 3v6c0 5-8 10-8 10S4 17 4 12V6Z"/>':'<path d="M12 5v8"/><circle cx="12" cy="18" r="1" fill="currentColor"/>';
 return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;
}
