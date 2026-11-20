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
        <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dff2ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#9adcff" stopOpacity="0" />
        </radialGradient>
        <filter id="trailBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
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
      {/* Living wind trails — continuously streaming glow along the wind lines */}
      {[
        { d: 'M760 380 C 950 330, 1150 380, 1560 300', dur: '5s', begin: '0s', w: 5 },
        { d: 'M760 420 C 980 400, 1200 470, 1580 420', dur: '6.5s', begin: '-2s', w: 4 },
        { d: 'M760 470 C 960 480, 1180 560, 1560 540', dur: '5.5s', begin: '-3.5s', w: 5 },
        { d: 'M740 520 C 900 570, 1120 660, 1540 660', dur: '7s', begin: '-1.5s', w: 4 },
        { d: 'M700 560 C 860 650, 1060 740, 1500 760', dur: '7.5s', begin: '-4s', w: 5 },
        { d: 'M680 400 C 480 360, 300 400, 40 340', dur: '6.5s', begin: '-2.5s', w: 4 },
        { d: 'M660 470 C 460 500, 260 560, 20 560', dur: '7.5s', begin: '-5s', w: 5 },
        { d: 'M640 540 C 460 620, 280 700, 40 740', dur: '6s', begin: '-1s', w: 4 },
      ].map((p, i) => (
        <g key={`trail${i}`} filter="url(#trailBlur)">
          {/* comet-head trail rushing along the wind line */}
          <path d={p.d} stroke="#eaf6ff" strokeWidth={p.w * 0.55} strokeLinecap="round" filter="url(#trailBlur)">
            <animate
              attributeName="stroke-dasharray"
              values="0 900; 260 640; 0 900"
              dur={p.dur}
              begin={p.begin}
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-dashoffset"
              values="900; 0"
              dur={p.dur}
              begin={p.begin}
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0;0.95;0"
              dur={p.dur}
              begin={p.begin}
              repeatCount="indefinite"
            />
          </path>
          {/* wide soft halo riding the same path */}
          <path d={p.d} stroke="url(#windGrad)" strokeWidth={p.w * 2.4} strokeLinecap="round" opacity="0.5">
            <animate
              attributeName="stroke-dasharray"
              values="0 900; 300 600; 0 900"
              dur={p.dur}
              begin={p.begin}
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-dashoffset"
              values="900; 0"
              dur={p.dur}
              begin={p.begin}
              repeatCount="indefinite"
            />
          </path>
        </g>
      ))}

      {/* Flickering cryo sparks scattered along the wind streams */}
      {[
        { cx: 980, cy: 360, r: 3.2, dur: '2.4s', begin: '0s' },
        { cx: 1140, cy: 300, r: 2.6, dur: '3.1s', begin: '-0.7s' },
        { cx: 1300, cy: 460, r: 3.6, dur: '2.8s', begin: '-1.3s' },
        { cx: 1460, cy: 380, r: 2.4, dur: '3.4s', begin: '-0.4s' },
        { cx: 1240, cy: 620, r: 3, dur: '2.6s', begin: '-1.8s' },
        { cx: 1060, cy: 700, r: 2.8, dur: '3.6s', begin: '-0.9s' },
        { cx: 480, cy: 420, r: 2.7, dur: '2.9s', begin: '-1.5s' },
        { cx: 320, cy: 520, r: 3.1, dur: '3.2s', begin: '-2.2s' },
        { cx: 200, cy: 640, r: 2.5, dur: '2.5s', begin: '-0.5s' },
        { cx: 560, cy: 620, r: 2.9, dur: '3.3s', begin: '-1.1s' },
      ].map((s, i) => (
        <g key={`spark${i}`}>
          <circle cx={s.cx} cy={s.cy} r={s.r * 2.6} fill="url(#sparkGlow)">
            <animate attributeName="opacity" values="0.2;1;0.2" dur={s.dur} begin={s.begin} repeatCount="indefinite" />
          </circle>
          <circle cx={s.cx} cy={s.cy} r={s.r} fill="#eaf6ff">
            <animate attributeName="opacity" values="0.3;1;0.3" dur={s.dur} begin={s.begin} repeatCount="indefinite" />
            <animate
              attributeName="cy"
              values={`${s.cy};${s.cy - 14};${s.cy}`}
              dur={s.dur}
              begin={s.begin}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}
    </svg>
  );
}
