/* Line icons (SVG paths) and the mosque drawing */
/* icons */
const P = {
live:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7"/>',
share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',send:'<path d="M4 12l16-8-5.5 16-3-6.5z"/><path d="M11.5 13.5L20 4"/>',stopsq:'<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
back:'<path d="M15 5l-7 7 7 7"/>',chev:'<path d="M9 5l7 7-7 7"/>',
menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
play:'<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
pause:'<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
prev:'<path d="M6 5v14"/><path d="M19 5L9 12l10 7z" fill="currentColor"/>',
next:'<path d="M18 5v14"/><path d="M5 5l10 7-10 7z" fill="currentColor"/>',
shuffle:'<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
repeat:'<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>',
book:'<path d="M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1z"/><path d="M12 6v14"/>',
mushaf:'<path d="M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1z"/><path d="M12 6v14M5 9h4M5 12h4M15 9h4M15 12h4"/>',
star:'<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/>',
bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
home:'<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/>',
list:'<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
bars:'<path d="M6 20V12M12 20V6M18 20v-4"/>',
globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
volume:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/>',
moon:'<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
bell:'<path d="M6 16V11a6 6 0 1112 0v5l2 2H4z"/><path d="M10 21h4"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
radio:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M7 8l10-5"/><circle cx="15.5" cy="14.5" r="2.5"/><path d="M6.5 12.5h4M6.5 16.5h4"/>',
pages:'<rect x="4" y="3" width="13" height="17" rx="1.5"/><path d="M8 7h5M8 11h5M20 7v14H9"/>'
};
function ic(n){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(P[n]||'')+'</svg>'}

const MOSQUE = '<g fill="currentColor">'+
 '<rect x="0" y="112" width="300" height="8" opacity=".35"/>'+
 '<path d="M40 112V58l4-8 4 8v54z" opacity=".55"/><path d="M41 50l3-14 3 14z" opacity=".55"/><rect x="38.5" y="66" width="11" height="3" opacity=".55"/>'+
 '<path d="M252 112V58l4-8 4 8v54z" opacity=".55"/><path d="M253 50l3-14 3 14z" opacity=".55"/><rect x="250.5" y="66" width="11" height="3" opacity=".55"/>'+
 '<path d="M70 112V86h22v26z" opacity=".5"/><path d="M68 87c0-9 6-14 13-18 7 4 13 9 13 18z" opacity=".5"/><rect x="80.3" y="62" width="1.4" height="7" opacity=".5"/>'+
 '<path d="M208 112V86h22v26z" opacity=".5"/><path d="M206 87c0-9 6-14 13-18 7 4 13 9 13 18z" opacity=".5"/><rect x="218.3" y="62" width="1.4" height="7" opacity=".5"/>'+
 '<path d="M100 112V74h100v38z" opacity=".7"/>'+
 '<path d="M104 76c0-22 22-34 46-44 24 10 46 22 46 44z" opacity=".75"/>'+
 '<rect x="149" y="18" width="2" height="14" opacity=".75"/><path d="M150 12a3.6 3.6 0 100 7 2.8 2.8 0 110-7z" opacity=".75"/>'+
 '<path d="M140 112V96a10 10 0 0120 0v16z" fill="var(--bg)" opacity=".85"/>'+
 '<path d="M116 104v-8a5 5 0 0110 0v8zM174 104v-8a5 5 0 0110 0v8z" fill="var(--bg)" opacity=".7"/>'+
 '</g>';


if(!P.aa)P.aa='<path d="M3 19l5.5-14L14 19M5 14.5h7M15 19l3.5-9 3.5 9M16.2 16h4.6"/>';
if(!P.x)P.x='<path d="M6 6l12 12M18 6L6 18"/>';
if(!P.bm)P.bm='<path d="M7 3h10v18l-5-4-5 4z"/>';
if(!P.copy)P.copy='<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>';
if(!P.more3)P.more3='<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>';
