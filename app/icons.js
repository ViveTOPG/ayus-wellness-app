/* Āyus icon system — monoline SVG, currentColor, 24 viewBox */
window.AYUS_ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"/>',
  check: '<circle cx="12" cy="12" r="8"/><path d="m9 12 2 2 4-4"/>',
  leaf: '<path d="M12 21c-4-2-7-6-7-10a7 7 0 0 1 14 0c0 4-3 8-7 10Z"/><path d="M12 11v10M12 11c2-3 5-4 8-4"/>',
  journal: '<path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z"/><path d="M10 9h4M10 13h4"/>',
  user: '<circle cx="12" cy="9" r="3.5"/><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19"/>',
  cart: '<path d="M4 6h2l1.2 9h11.3l1.5-6H8"/><circle cx="10" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/>',
  stack: '<path d="M4 7h16M6 12h12M8 17h8"/>',
  spark: '<path d="m12 3 1.5 5.5L19 10l-4 3.2 1.2 5.8L12 16l-4.2 3 1.2-5.8L5 10l5.5-1.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  moon: '<path d="M20 14a8 8 0 1 1-9-11 6.2 6.2 0 0 0 9 11Z"/>',
  flask: '<path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3"/><path d="M8.5 14h7"/>',
  capsule: '<path d="M8.5 8.5a4 4 0 0 1 5.7-5.7l7 7a4 4 0 0 1-5.7 5.7l-7-7Z"/><path d="m12 5 7 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.5 12 20 12 20Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  shield: '<path d="M12 3 5 6v6c0 5 3.5 8 7 10 3.5-2 7-5 7-10V6z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z"/><path d="M6 3v16"/>',
  pulse: '<path d="M3 12h4l2-5 3 10 2-5h7"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  flame: '<path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-3 .5 2 2 2 2 0 0-2-1-3 1-5Z"/>',
  drop: '<path d="M12 3c3 5 6 7 6 10a6 6 0 0 1-12 0c0-3 3-5 6-10Z"/>',
  star: '<path d="m12 3 2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5Z"/>',
  bell: '<path d="M6 16h12l-1-1.2V10a5 5 0 0 0-10 0v4.8L6 16Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
  guide: '<path d="M12 3v18M8 7h8M8 12h6M8 17h4"/>'
};

window.ayusIcon = function (name, cls) {
  var path = window.AYUS_ICONS[name] || window.AYUS_ICONS.leaf;
  var c = cls ? ' class="' + cls + '"' : '';
  return (
    '<svg' +
    c +
    ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    path +
    '</svg>'
  );
};
