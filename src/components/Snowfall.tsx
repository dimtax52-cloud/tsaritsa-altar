import { useMemo } from 'react';

type Props = {
  /** Base flake count when no storm power is given. */
  count?: number;
  /** Total altar power: sum of (constellation + 1) across all entries. 0 = calm. */
  totalPower?: number;
  /** Blizzard mode: stronger wind and faster flakes. */
  storm?: boolean;
};

export default function Snowfall({ count = 60, totalPower = 0, storm = false }: Props) {
  const { flakes, wind } = useMemo(() => {
    // Blizzard density scales with altar power: 45 -> 160 flakes.
    const n =
      totalPower > 0 ? Math.round(Math.min(160, Math.max(45, 45 + totalPower * 4))) : count;
    const w = storm ? 120 + Math.min(totalPower, 20) * 6 : Math.min(totalPower, 20) * 4;
    const speedBoost = storm ? 1.7 + Math.min(totalPower, 20) * 0.04 : 1 + Math.min(totalPower, 20) * 0.02;
    const flakes = Array.from({ length: n }, (_, i) => {
      const size = 2 + ((i * 7) % 5);
      return {
        key: i,
        left: `${(i * 61.8) % 100}%`,
        size,
        duration: `${(9 + ((i * 13) % 12)) / speedBoost}s`,
        delay: `${-((i * 17) % 40)}s`,
        sway: `${3 + ((i * 11) % 5)}s`,
        swayAmp: `${10 + w * 0.4 + ((i * 13) % 20)}px`,
        opacity: 0.25 + ((i * 29) % 60) / 100,
      };
    });
    return { flakes };
  }, [count, totalPower, storm]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <style>{`
        @keyframes snowfallLoop {
          from { transform: translateY(-6vh); }
          to { transform: translateY(108vh); }
        }
        @keyframes snowSwayLoop {
          0%, 100% { margin-left: 0; }
          50% { margin-left: var(--sway-amp, 28px); }
        }
      `}</style>
      {flakes.map((f) => (
        <span
          key={f.key}
          className="absolute top-0 rounded-full"
          style={{
            left: f.left,
            width: f.size,
            height: f.size,
            background: 'rgba(235, 248, 255, 0.85)',
            opacity: f.opacity,
            ['--sway-amp' as string]: f.swayAmp,
            animationName: 'snowfallLoop, snowSwayLoop',
            animationTimingFunction: 'linear, ease-in-out',
            animationIterationCount: 'infinite, infinite',
            animationDirection: 'normal, alternate',
            animationDuration: `${f.duration}, ${f.sway}`,
            animationDelay: `${f.delay}, 0s`,
          }}
        />
      ))}
      {/* Wind streaks during a storm */}
      {storm &&
        Array.from({ length: 7 }, (_, i) => (
          <span
            key={`w${i}`}
            className="absolute h-px"
            style={{
              top: `${8 + i * 13}%`,
              left: '-15%',
              width: '130%',
              background:
                'linear-gradient(90deg, transparent, rgba(210,240,255,0.35), transparent)',
              animation: `windStreak ${2.2 + i * 0.5}s linear ${-i * 0.7}s infinite`,
            }}
          />
        ))}
      <style>{`@keyframes windStreak { from { transform: translateX(0); } to { transform: translateX(60%); } }`}</style>
    </div>
  );
}
