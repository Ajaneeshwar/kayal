// A static copy of the landing scene in web/src/pages/landing/HouseboatScene.tsx, without motion.
// Colours stay as var(--color-scene-*), so the slide that embeds it must define those variables.

const W = 1440;
const HORIZON = 470;
const v = (name) => `var(--color-scene-${name})`;
const stop = (offset, name, opacity = 1) =>
  `<stop offset="${offset}" style="stop-color:${v(name)};stop-opacity:${opacity}"/>`;

function wavePath(y, amp, len) {
  let d = `M ${-len} ${y}`;
  for (let x = -len; x < W + len; x += len) d += ` q ${len / 4} ${-amp} ${len / 2} 0 t ${len / 2} 0`;
  return d;
}

function palm({ x, h, lean, s = 1, tone = 'palm' }) {
  const base = HORIZON - 2;
  const cx = x + lean;
  const cy = base - h;
  const wb = 7 * s;
  const wt = 3.2 * s;
  const trunk = `M ${x - wb / 2} ${base} C ${x + lean * 0.15 - wb / 2} ${base - h * 0.45} ${x + lean * 0.75 - wt} ${base - h * 0.8} ${cx - wt / 2} ${cy} L ${cx + wt / 2} ${cy} C ${x + lean * 0.75 + wt} ${base - h * 0.8} ${x + lean * 0.15 + wb / 2} ${base - h * 0.45} ${x + wb / 2} ${base} Z`;
  const fronds = [-168, -140, -112, -84, -58, -30, -6, 18, 160, 196].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const len = (44 + ((i * 7) % 13)) * s;
    const droop = 22 * s * Math.abs(Math.cos(a));
    const tx = cx + Math.cos(a) * len;
    const ty = cy + Math.sin(a) * len * 0.55 + droop;
    const mx = (cx + tx) / 2;
    const my = (cy + ty) / 2 - 13 * s;
    const nx = -(ty - cy) / len;
    const ny = (tx - cx) / len;
    const w = 4.2 * s;
    return `<path d="M ${cx} ${cy} Q ${mx + nx * w} ${my + ny * w} ${tx} ${ty} Q ${mx - nx * w} ${my - ny * w} ${cx} ${cy} Z" style="stroke:${v(tone)};stroke-width:${1.2 * s};stroke-linejoin:round"/>`;
  });
  return `<g style="fill:${v(tone)}"><path d="${trunk}"/>${fronds.join('')}<circle cx="${cx - 3 * s}" cy="${cy + 4 * s}" r="${3 * s}"/><circle cx="${cx + 3 * s}" cy="${cy + 5 * s}" r="${2.8 * s}"/></g>`;
}

function boat() {
  const hull = 'M8 -48 C30 -25 70 -20 120 -20 L230 -20 C268 -20 302 -38 324 -84 C320 -54 306 -22 283 4 C210 14 110 14 40 4 C22 -6 10 -26 8 -48 Z';
  const gunwale = 'M8 -48 C30 -25 70 -20 120 -20 L230 -20 C268 -20 302 -38 324 -84';
  const roof = 'M46 -44 C50 -76 70 -92 112 -95 L208 -95 C250 -92 270 -76 274 -44 Q160 -51 46 -44 Z';
  const posts = [72, 104, 136, 168, 200, 232];
  const lamps = [0, 2, 4].map((i) => `<rect x="${posts[i] + 5}" y="-42" width="22" height="18" rx="2" style="fill:${v('lamp')};opacity:0.9"/>`).join('');
  const uprights = posts.concat(250).map((x) => `<rect x="${x - 2}" y="-48" width="4" height="30" style="fill:${v('hull')}"/>`).join('');
  const ribs = Array.from({ length: 24 }, (_, i) => 50 + i * 9.6)
    .map((x) => `<path d="M${x} -100 Q${x + (x - 160) * 0.06} -70 ${x + (x - 160) * 0.1} -40" stroke-width="1" opacity="0.38"/>`)
    .join('');
  return `
    <rect x="66" y="-47" width="190" height="29" style="fill:${v('cabin')}"/>
    ${lamps}${uprights}
    <path d="M66 -30 H256" style="stroke:${v('hull')};stroke-width:1.6"/>
    <path d="${roof}" fill="url(#kl-roof)"/>
    <g clip-path="url(#kl-roof-clip)" style="stroke:${v('roof-dark')};fill:none">
      ${ribs}
      <path d="M40 -58 Q160 -66 280 -58" stroke-width="2" opacity="0.45"/>
      <path d="M40 -76 Q160 -84 280 -76" stroke-width="1.5" opacity="0.3"/>
    </g>
    <path d="M46 -44 C50 -76 70 -92 112 -95 L208 -95" style="stroke:${v('roof-light')};stroke-width:2;fill:none;stroke-linecap:round" opacity="0.85"/>
    <path d="M46 -44 Q160 -51 274 -44" style="stroke:${v('roof-dark')};stroke-width:3;fill:none"/>
    <path d="${hull}" fill="url(#kl-hull)"/>
    <g style="fill:none;stroke:${v('hull-dark')};stroke-linecap:round" opacity="0.6">
      <path d="M20 -33 C50 -14 90 -12 130 -12 L232 -12 C266 -12 294 -28 314 -62" stroke-width="1.3"/>
      <path d="M34 -12 C70 -4 110 -3 140 -3 L236 -3 C262 -3 282 -12 298 -30" stroke-width="1.1"/>
    </g>
    <path d="M22 -31 C52 -12 92 -10 130 -10 L232 -10 C266 -10 292 -26 312 -58" style="fill:none;stroke:${v('roof-light')};stroke-width:1.4;stroke-dasharray:1 6;stroke-linecap:round" opacity="0.55"/>
    <path d="${gunwale}" style="fill:none;stroke:${v('roof-light')};stroke-width:1.8;stroke-linecap:round" opacity="0.75"/>
    <path d="M34 -92 L12 26" style="stroke:${v('hull-dark')};stroke-width:2.4;stroke-linecap:round"/>`;
}

const GLINTS = [
  [488, 70], [500, 46], [514, 96], [530, 60], [548, 130], [566, 84],
  [588, 150], [612, 110], [640, 190], [668, 130], [700, 220], [690, 90],
];

/**
 * @param {{ viewBox: [number, number, number, number], boat: [number, number, number] }} options
 *   viewBox may start above y = 0: the sky is extended upward in its flat top colour.
 *   boat is [x of the stern, y of the waterline, scale].
 *   glintMaxY drops the wide sun glints below that line, to keep them clear of text.
 */
export function sceneSvg({ viewBox, boat: [bx, by, bs], glintMaxY = Infinity }) {
  const [vx, vy, vw, vh] = viewBox;
  const top = Math.min(0, vy);
  const bottom = vy + vh;
  const farPalms = [[60, 70, 6], [270, 84, -8], [420, 64, 5], [990, 76, 7], [1240, 90, -6], [1390, 70, 4]]
    .map(([x, h, lean]) => palm({ x, h, lean, s: 0.45, tone: 'shore' }))
    .join('');
  const nearPalms = [
    [150, 210, 30, 1.05], [236, 160, -24, 0.85], [340, 206, 46, 1.05], [512, 196, -38, 0.95],
    [590, 262, 24, 1.15], [636, 150, -14, 0.75], [842, 232, 36, 1.1], [918, 176, -20, 0.9],
    [1110, 268, -42, 1.2], [1196, 196, 22, 0.95], [1320, 236, -30, 1.1],
  ].map(([x, h, lean, s]) => palm({ x, h, lean, s })).join('');
  const glints = GLINTS.filter(([y]) => y < Math.min(bottom, glintMaxY))
    .map(([y, w], i) => `<rect x="${700 - w / 2 + ((i % 3) - 1) * 14}" y="${y}" width="${w}" height="${y > 600 ? 3 : 2}" rx="1.5" style="fill:${v('sun')};opacity:${0.35 + (i % 4) * 0.12}"/>`)
    .join('');
  const ripples = [[486, 1.5, 120, 0.16], [512, 2, 160, 0.14], [548, 3, 200, 0.12], [610, 4, 260, 0.1], [668, 5, 320, 0.09]]
    .map(([y, amp, len, op]) => `<path d="${wavePath(y, amp, len)}" style="fill:none;stroke:${v('sun')};stroke-width:1.2;opacity:${op}"/>`)
    .join('');
  const wake = [18, 26, 36]
    .map((y) => `<path d="M -80 ${y} q 20 -2 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" style="fill:none;stroke:${v('water')};stroke-width:1.6;opacity:0.8"/>`)
    .join('');
  const lampGlints = [86, 150, 214]
    .map((x, i) => `<rect x="${x}" y="${16 + i * 3}" width="18" height="2" rx="1" style="fill:${v('lamp')};opacity:0.7"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="img" aria-label="A kettuvallam houseboat on the backwaters at dusk, with coconut palms on the far bank">
  <defs>
    <linearGradient id="kl-sky" x1="0" y1="0" x2="0" y2="${HORIZON}" gradientUnits="userSpaceOnUse">${stop(0, 'sky')}${stop(0.5, 'sky')}${stop(0.82, 'sky-mid')}${stop(1, 'sky-glow')}</linearGradient>
    <linearGradient id="kl-water" x1="0" y1="${HORIZON}" x2="0" y2="720" gradientUnits="userSpaceOnUse">${stop(0, 'water')}${stop(0.45, 'water-deep', 0.9)}${stop(1, 'water-deep')}</linearGradient>
    <radialGradient id="kl-sun-glow" cx="700" cy="440" r="380" gradientUnits="userSpaceOnUse">${stop(0, 'sky-glow', 0.75)}${stop(0.4, 'sky-glow', 0.22)}${stop(1, 'sky-glow', 0)}</radialGradient>
    <radialGradient id="kl-water-glow" cx="700" cy="${HORIZON}" r="300" gradientTransform="matrix(1 0 0 0.35 0 305.5)" gradientUnits="userSpaceOnUse">${stop(0, 'sun', 0.45)}${stop(1, 'sun', 0)}</radialGradient>
    <linearGradient id="kl-hull" x1="0" y1="-84" x2="0" y2="14" gradientUnits="userSpaceOnUse">${stop(0, 'roof')}${stop(0.45, 'hull')}${stop(1, 'hull-dark')}</linearGradient>
    <linearGradient id="kl-roof" x1="0" y1="-96" x2="0" y2="-44" gradientUnits="userSpaceOnUse">${stop(0, 'roof-light')}${stop(0.5, 'roof')}${stop(1, 'roof-dark')}</linearGradient>
    <clipPath id="kl-roof-clip"><path d="M46 -44 C50 -76 70 -92 112 -95 L208 -95 C250 -92 270 -76 274 -44 Q160 -51 46 -44 Z"/></clipPath>
    <g id="kl-boat">${boat()}</g>
  </defs>
  <rect x="0" y="${top}" width="${W}" height="${HORIZON + 2 - top}" fill="url(#kl-sky)"/>
  <rect x="0" y="0" width="${W}" height="${HORIZON + 2}" fill="url(#kl-sun-glow)"/>
  <circle cx="700" cy="436" r="38" style="fill:${v('sun')}"/>
  <g style="fill:none;stroke:${v('palm')};stroke-width:1.6;stroke-linecap:round">
    <path d="M790 318 q6 -5 11 0 q5 -5 11 0"/><path d="M822 300 q5 -4 9 0 q4 -4 9 0"/><path d="M806 338 q4 -3 7 0 q3 -3 7 0"/>
  </g>
  <path d="M0 452 C40 446 70 440 110 446 S180 438 220 446 S300 434 350 444 S440 440 480 448 S560 438 610 450 L660 452 C700 448 760 446 790 450 S860 440 900 446 S980 434 1030 444 S1110 438 1160 446 S1250 436 1300 444 S1400 440 1440 448 V472 H0 Z" style="fill:${v('shore')}"/>
  ${farPalms}
  <path d="M0 466 Q120 458 260 464 T520 462 T800 466 T1080 460 T1440 464 V476 H0 Z" style="fill:${v('palm')}"/>
  ${nearPalms}
  <rect x="0" y="${HORIZON}" width="${W}" height="${Math.max(bottom, 720) - HORIZON}" fill="url(#kl-water)"/>
  <rect x="0" y="${HORIZON}" width="${W}" height="14" style="fill:${v('palm')};opacity:0.55"/>
  <rect x="0" y="${HORIZON}" width="${W}" height="220" fill="url(#kl-water-glow)"/>
  ${glints}${ripples}
  <g transform="translate(${bx} ${by}) scale(${bs})">
    <g opacity="0.28" transform="translate(0 10) scale(1 -0.55)"><use href="#kl-boat"/></g>
    ${wake}${lampGlints}
    <use href="#kl-boat"/>
  </g>
</svg>`;
}
