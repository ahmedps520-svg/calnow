// Single source of truth for the Calnow mark.
// A "C" arc (Calnow) whose open mouth cradles a droplet (blood sugar).
export const BRAND = { from: '#6D4AFF', mid: '#5B7CFF', to: '#00C2A8' };

export const ARC_PATH =
  'M348.4 137.8 A150 150 0 1 0 348.4 374.2';
export const DROP_PATH =
  'M386 180 C366 214 342 240 342 268 a44 44 0 1 0 88 0 c0 -28 -24 -54 -44 -88 z';

/** @param {{radius?:number, glyphScale?:number, bleed?:boolean}} opts */
export function tileSvg(opts = {}) {
  const { radius = 112, glyphScale = 1, bleed = false } = opts;
  const s = glyphScale;
  const t = 256 - 256 * s; // keep glyph centred while scaling
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND.from}"/>
      <stop offset="52%" stop-color="${BRAND.mid}"/>
      <stop offset="100%" stop-color="${BRAND.to}"/>
    </linearGradient>
    <radialGradient id="gloss" cx="0.28" cy="0.16" r="0.85">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="${bleed ? 0 : radius}" fill="url(#g)"/>
  <rect x="0" y="0" width="512" height="512" rx="${bleed ? 0 : radius}" fill="url(#gloss)"/>
  <g transform="translate(${t} ${t}) scale(${s})">
    <path d="${ARC_PATH}" fill="none" stroke="#ffffff" stroke-width="56" stroke-linecap="round"/>
    <path d="${DROP_PATH}" fill="#ffffff"/>
  </g>
</svg>`;
}
