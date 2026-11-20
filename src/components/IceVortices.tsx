// Animated SVG snow vortices and ice glow riding the wind lines around the Tsaritsa.
export default function IceVortices() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="windGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bfe6ff" stopOpacity="0" />
          <stop offset="45%" stopColor="#bfe6ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#eaf6ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9adcff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#9adcff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft ice glow behind the Tsaritsa */}
      <ellipse cx="700" cy="450" rx="360" ry="300" fill="url(#glowGrad)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="7s" repeatCount="indefinite" />
      </ellipse>

      {/* Vortex arcs sweeping from the hand to the right edge */}
      {[
        { d: 'M760 380 C 950 330, 1150 380, 1560 300', dur: '9s', begin: '0s', w: 2.5 },
        { d: 'M760 420 C 980 400, 1200 470, 1580 420', dur: '11s', begin: '-3s', w: 2 },
        { d: 'M760 470 C 960 480, 1180 560, 1560 540', dur: '10s', begin: '-5s', w: 2.5 },
        { d: 'M740 520 C 900 570, 1120 660, 1540 660', dur: '12s', begin: '-2s', w: 2 },
        { d: 'M700 560 C 860 650, 1060 740, 1500 760', dur: '13s', begin: '-6s', w: 2.5 },
        // Left-side arcs
        { d: 'M680 400 C 480 360, 300 400, 40 340', dur: '12s', begin: '-4s', w: 2 },
        { d: 'M660 470 C 460 500, 260 560, 20 560', dur: '14s', begin: '-8s', w: 2.5 },
        { d: 'M640 540 C 460 620, 280 700, 40 740', dur: '11s', begin: '-1s', w: 2 },
      ].map((p, i) => (
        <g key={i}>
          <path d={p.d} stroke="url(#windGrad)" strokeWidth={p.w} strokeLinecap="round">
            <animate
              attributeName="stroke-dasharray"
              values="40 260; 200 100; 40 260"
              dur={p.dur}
              begin={p.begin}
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0.15;0.6;0.15"
              dur={p.dur}
              begin={p.begin}
              repeatCount="indefinite"
            />
          </path>
        </g>
      ))}

      {/* Drifting ice motes along the wind */}
      {[
        { cx: 900, cy: 350, r: 3, dur: '8s' },
        { cx: 1050, cy: 430, r: 2.5, dur: '10s' },
        { cx: 1200, cy: 520, r: 3.5, dur: '9s' },
        { cx: 500, cy: 480, r: 2.5, dur: '11s' },
        { cx: 380, cy: 560, r: 3, dur: '9s' },
        { cx: 820, cy: 620, r: 2.5, dur: '12s' },
        { cx: 1300, cy: 350, r: 2, dur: '10s' },
        { cx: 300, cy: 400, r: 2.5, dur: '13s' },
      ].map((m, i) => (
        <circle key={`m${i}`} cx={m.cx} cy={m.cy} r={m.r} fill="#dff2ff" opacity="0.55">
          <animate attributeName="opacity" values="0.1;0.7;0.1" dur={m.dur} repeatCount="indefinite" />
          <animate
            attributeName="cy"
            values={`${m.cy};${m.cy - 26};${m.cy}`}
            dur={m.dur}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}
