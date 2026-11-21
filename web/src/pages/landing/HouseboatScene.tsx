import type { CSSProperties } from 'react';
import { motion } from 'motion/react';

/*
  Dusk on Vembanad: a kettuvallam on moving water with coconut palms on the far bank.
  The view box is 1440 x 720 and the SVG covers its box from the bottom (xMidYMax slice), so a
  phone sees the middle 340 units and a laptop sees nearly all of it. The boat sits in that
  middle on phones and moves right and grows from 1024 px (see .kl-boat-place below).
  Only transform and opacity animate. Ambient loops live in styles/scene.css.
*/

const W = 1440;
const H = 720;
const HORIZON = 470;

const fill = (name: string): CSSProperties => ({ fill: `var(--color-scene-${name})` });
const stop = (name: string, opacity = 1): CSSProperties => ({ stopColor: `var(--color-scene-${name})`, stopOpacity: opacity });

/** A wavy line wider than the view by one wavelength, so drifting it by one wavelength loops. */
function wavePath(y: number, amp: number, len: number) {
  let d = `M ${-len} ${y}`;
  for (let x = -len; x < W + len; x += len) d += ` q ${len / 4} ${-amp} ${len / 2} 0 t ${len / 2} 0`;
  return d;
}

type PalmProps = { x: number; h: number; lean: number; s?: number; tone?: string; delay?: number; speed?: number };

/** A coconut palm: tapered curved trunk and a crown of drooping fronds, swaying from its base. */
function Palm({ x, h, lean, s = 1, tone = 'palm', delay = 0, speed = 7 }: PalmProps) {
  const base = HORIZON - 2;
  const cx = x + lean;
  const cy = base - h;
  const wb = 7 * s;
  const wt = 3.2 * s;
  const trunk = `M ${x - wb / 2} ${base}
    C ${x + lean * 0.15 - wb / 2} ${base - h * 0.45} ${x + lean * 0.75 - wt} ${base - h * 0.8} ${cx - wt / 2} ${cy}
    L ${cx + wt / 2} ${cy}
    C ${x + lean * 0.75 + wt} ${base - h * 0.8} ${x + lean * 0.15 + wb / 2} ${base - h * 0.45} ${x + wb / 2} ${base} Z`;
  const angles = [-168, -140, -112, -84, -58, -30, -6, 18, 160, 196];
  const fronds = angles.map((deg, i) => {
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
    return `M ${cx} ${cy} Q ${mx + nx * w} ${my + ny * w} ${tx} ${ty} Q ${mx - nx * w} ${my - ny * w} ${cx} ${cy} Z`;
  });
  return (
    <g
      className="kl-sway"
      style={{ ...fill(tone), transformOrigin: `${x}px ${base}px`, animationDelay: `${-delay}s`, ['--sway-speed' as string]: `${speed}s` }}
    >
      <path d={trunk} />
      {fronds.map((d, i) => (
        <path key={i} d={d} style={{ stroke: `var(--color-scene-${tone})`, strokeWidth: 1.2 * s, strokeLinejoin: 'round' }} />
      ))}
      <circle cx={cx - 3 * s} cy={cy + 4 * s} r={3 * s} />
      <circle cx={cx + 3 * s} cy={cy + 5 * s} r={2.8 * s} />
    </g>
  );
}

/** The kettuvallam, drawn with its waterline at y = 0 and its stern at x = 0. About 322 units long. */
function Boat() {
  const hull =
    'M8 -48 C30 -25 70 -20 120 -20 L230 -20 C268 -20 302 -38 324 -84 C320 -54 306 -22 283 4 C210 14 110 14 40 4 C22 -6 10 -26 8 -48 Z';
  const gunwale = 'M8 -48 C30 -25 70 -20 120 -20 L230 -20 C268 -20 302 -38 324 -84';
  const roof = 'M46 -44 C50 -76 70 -92 112 -95 L208 -95 C250 -92 270 -76 274 -44 Q160 -51 46 -44 Z';
  const posts = [72, 104, 136, 168, 200, 232];
  return (
    <g>
      {/* Cabin and posts under the roof */}
      <rect x="66" y="-47" width="190" height="29" style={fill('cabin')} />
      {[0, 2, 4].map((i) => (
        <rect
          key={i}
          className="kl-glow"
          x={posts[i] + 5}
          y="-42"
          width="22"
          height="18"
          rx="2"
          style={{ ...fill('lamp'), opacity: 0.85, animationDelay: `${-i * 1.3}s` }}
        />
      ))}
      {posts.concat(250).map((x) => (
        <rect key={x} x={x - 2} y="-48" width="4" height="30" style={fill('hull')} />
      ))}
      <path d="M66 -30 H256" style={{ stroke: 'var(--color-scene-hull)', strokeWidth: 1.6 }} />

      {/* Thatched roof: woven coir mat over bamboo ribs */}
      <path d={roof} fill="url(#kl-roof)" />
      <g clipPath="url(#kl-roof-clip)" style={{ stroke: 'var(--color-scene-roof-dark)', fill: 'none' }}>
        {Array.from({ length: 24 }, (_, i) => 50 + i * 9.6).map((x) => (
          <path key={x} d={`M${x} -100 Q${x + (x - 160) * 0.06} -70 ${x + (x - 160) * 0.1} -40`} strokeWidth="1" opacity="0.38" />
        ))}
        <path d="M40 -58 Q160 -66 280 -58" strokeWidth="2" opacity="0.45" />
        <path d="M40 -76 Q160 -84 280 -76" strokeWidth="1.5" opacity="0.3" />
      </g>
      <path
        d="M46 -44 C50 -76 70 -92 112 -95 L208 -95"
        style={{ stroke: 'var(--color-scene-roof-light)', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }}
        opacity="0.85"
      />
      <path d="M46 -44 Q160 -51 274 -44" style={{ stroke: 'var(--color-scene-roof-dark)', strokeWidth: 3, fill: 'none' }} />

      {/* Hull: jackwood planks stitched with coir */}
      <path d={hull} fill="url(#kl-hull)" />
      <g style={{ fill: 'none', stroke: 'var(--color-scene-hull-dark)', strokeLinecap: 'round' }} opacity="0.6">
        <path d="M20 -33 C50 -14 90 -12 130 -12 L232 -12 C266 -12 294 -28 314 -62" strokeWidth="1.3" />
        <path d="M34 -12 C70 -4 110 -3 140 -3 L236 -3 C262 -3 282 -12 298 -30" strokeWidth="1.1" />
      </g>
      <path
        d="M22 -31 C52 -12 92 -10 130 -10 L232 -10 C266 -10 292 -26 312 -58"
        style={{ fill: 'none', stroke: 'var(--color-scene-roof-light)', strokeWidth: 1.4, strokeDasharray: '1 6', strokeLinecap: 'round' }}
        opacity="0.55"
      />
      <path d={gunwale} style={{ fill: 'none', stroke: 'var(--color-scene-roof-light)', strokeWidth: 1.8, strokeLinecap: 'round' }} opacity="0.75" />

      {/* Punting pole resting on the stern */}
      <path d="M34 -92 L12 26" style={{ stroke: 'var(--color-scene-hull-dark)', strokeWidth: 2.4, strokeLinecap: 'round' }} />
    </g>
  );
}

const GLINTS = [
  [488, 70, 1.4], [500, 46, 0.6], [514, 96, 2.2], [530, 60, 1.1], [548, 130, 0.2], [566, 84, 2.7],
  [588, 150, 1.7], [612, 110, 0.9], [640, 190, 2.4], [668, 130, 0.4], [700, 220, 1.9], [690, 90, 3.0],
] as const;

export function HouseboatScene({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      className={className}
      role="img"
      aria-label="A kettuvallam houseboat floating on the backwaters at dusk, with coconut palms on the far bank"
    >
      <defs>
        <linearGradient id="kl-sky" x1="0" y1="0" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop('sky')} />
          <stop offset="0.5" style={stop('sky')} />
          <stop offset="0.82" style={stop('sky-mid')} />
          <stop offset="1" style={stop('sky-glow')} />
        </linearGradient>
        <linearGradient id="kl-water" x1="0" y1={HORIZON} x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop('water')} />
          <stop offset="0.45" style={stop('water-deep', 0.9)} />
          <stop offset="1" style={stop('water-deep')} />
        </linearGradient>
        <radialGradient id="kl-sun-glow" cx="700" cy="440" r="380" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop('sky-glow', 0.75)} />
          <stop offset="0.4" style={stop('sky-glow', 0.22)} />
          <stop offset="1" style={stop('sky-glow', 0)} />
        </radialGradient>
        <radialGradient id="kl-water-glow" cx="700" cy={HORIZON} r="300" gradientTransform="matrix(1 0 0 0.35 0 305.5)" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop('sun', 0.45)} />
          <stop offset="1" style={stop('sun', 0)} />
        </radialGradient>
        <linearGradient id="kl-hull" x1="0" y1="-84" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop('roof')} />
          <stop offset="0.45" style={stop('hull')} />
          <stop offset="1" style={stop('hull-dark')} />
        </linearGradient>
        <linearGradient id="kl-roof" x1="0" y1="-96" x2="0" y2="-44" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop('roof-light')} />
          <stop offset="0.5" style={stop('roof')} />
          <stop offset="1" style={stop('roof-dark')} />
        </linearGradient>
        <clipPath id="kl-roof-clip">
          <path d="M46 -44 C50 -76 70 -92 112 -95 L208 -95 C250 -92 270 -76 274 -44 Q160 -51 46 -44 Z" />
        </clipPath>
        <linearGradient id="kl-fade" x1="0" y1="600" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--color-teak)', stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-teak)', stopOpacity: 1 }} />
        </linearGradient>
        <g id="kl-boat">
          <Boat />
        </g>
      </defs>

      {/* Sky and the setting sun */}
      <rect width={W} height={HORIZON + 2} fill="url(#kl-sky)" />
      <rect width={W} height={HORIZON + 2} fill="url(#kl-sun-glow)" />
      <circle cx="700" cy="436" r="38" style={fill('sun')} />

      {/* Birds heading home */}
      <g className="kl-bob" style={{ fill: 'none', stroke: 'var(--color-scene-palm)', strokeWidth: 1.6, strokeLinecap: 'round', animationDuration: '9s' }}>
        <path d="M790 318 q6 -5 11 0 q5 -5 11 0" />
        <path d="M822 300 q5 -4 9 0 q4 -4 9 0" />
        <path d="M806 338 q4 -3 7 0 q3 -3 7 0" />
      </g>

      {/* Far tree line, softened by distance */}
      <path
        d="M0 452 C40 446 70 440 110 446 S180 438 220 446 S300 434 350 444 S440 440 480 448 S560 438 610 450 L660 452 C700 448 760 446 790 450 S860 440 900 446 S980 434 1030 444 S1110 438 1160 446 S1250 436 1300 444 S1400 440 1440 448 V472 H0 Z"
        style={fill('shore')}
      />
      {[ [60, 70, 6], [270, 84, -8], [420, 64, 5], [990, 76, 7], [1240, 90, -6], [1390, 70, 4] ].map(([x, h, lean]) => (
        <Palm key={x} x={x} h={h} lean={lean} s={0.45} tone="shore" delay={x / 100} speed={9} />
      ))}

      {/* Near bank with coconut palms */}
      <path d="M0 466 Q120 458 260 464 T520 462 T800 466 T1080 460 T1440 464 V476 H0 Z" style={fill('palm')} />
      <Palm x={150} h={210} lean={30} s={1.05} delay={1.2} />
      <Palm x={236} h={160} lean={-24} s={0.85} delay={3.1} speed={8} />
      <Palm x={340} h={206} lean={46} s={1.05} delay={0.4} speed={7.6} />
      <Palm x={512} h={196} lean={-38} s={0.95} delay={2.2} />
      <Palm x={590} h={262} lean={24} s={1.15} delay={4.4} speed={8.4} />
      <Palm x={636} h={150} lean={-14} s={0.75} delay={1.7} speed={6.6} />
      <Palm x={842} h={232} lean={36} s={1.1} delay={2.9} speed={7.2} />
      <Palm x={918} h={176} lean={-20} s={0.9} delay={0.9} />
      <Palm x={1110} h={268} lean={-42} s={1.2} delay={3.6} speed={8.8} />
      <Palm x={1196} h={196} lean={22} s={0.95} delay={1.4} />
      <Palm x={1320} h={236} lean={-30} s={1.1} delay={2.5} speed={7.8} />

      {/* Water */}
      <rect y={HORIZON} width={W} height={H - HORIZON} fill="url(#kl-water)" />
      <rect y={HORIZON} width={W} height={14} style={{ ...fill('palm'), opacity: 0.55 }} />
      <rect y={HORIZON} width={W} height={220} fill="url(#kl-water-glow)" />

      {/* Sun path: glints that shimmer on the surface */}
      {GLINTS.map(([y, w, delay], i) => (
        <rect
          key={i}
          className="kl-glint"
          x={700 - w / 2 + ((i % 3) - 1) * 14}
          y={y}
          width={w}
          height={y > 600 ? 3 : 2}
          rx="1.5"
          style={{ ...fill('sun'), animationDelay: `${-delay}s` }}
        />
      ))}

      {/* Slow ripple lines, nearer ones larger and faster */}
      {[
        [486, 1.5, 120, 22, 0.16],
        [512, 2, 160, 18, 0.14],
        [548, 3, 200, 15, 0.12],
        [610, 4, 260, 12, 0.1],
        [668, 5, 320, 10, 0.09],
      ].map(([y, amp, len, speed, op]) => (
        <path
          key={y}
          className="kl-drift"
          d={wavePath(y, amp, len)}
          style={{
            fill: 'none',
            stroke: 'var(--color-scene-sun)',
            strokeWidth: 1.2,
            opacity: op,
            ['--wave-length' as string]: `${len}px`,
            ['--wave-speed' as string]: `${speed}s`,
          }}
        />
      ))}

      {/* The houseboat, with its broken reflection */}
      <g className="kl-boat-place">
        <motion.g
          initial={{ opacity: 0, x: -36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.6, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
        >
          <g opacity="0.28" transform="translate(0 10) scale(1 -0.55)">
            <use href="#kl-boat" />
          </g>
          {[18, 26, 36].map((y, i) => (
            <path
              key={y}
              className="kl-drift"
              d={`M -80 ${y} q 20 -2 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`}
              style={{
                fill: 'none',
                stroke: 'var(--color-scene-water)',
                strokeWidth: 1.6,
                opacity: 0.8,
                ['--wave-length' as string]: '80px',
                ['--wave-speed' as string]: `${6 + i * 2}s`,
              }}
            />
          ))}
          {[86, 150, 214].map((x, i) => (
            <rect
              key={x}
              className="kl-glint"
              x={x}
              y={16 + i * 3}
              width="18"
              height="2"
              rx="1"
              style={{ ...fill('lamp'), animationDelay: `${-i}s` }}
            />
          ))}
          <g className="kl-bob">
            <g className="kl-rock" style={{ transformOrigin: '160px 0px', transformBox: 'view-box' }}>
              <use href="#kl-boat" />
            </g>
          </g>
        </motion.g>
      </g>

      {/* Fade into the page below */}
      <rect y="600" width={W} height="120" fill="url(#kl-fade)" />
    </svg>
  );
}
