import { useMemo } from 'react';

export default function Snowfall({ count = 60 }: { count?: number }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const size = 2 + ((i * 7) % 5);
        return {
          key: i,
          left: `${(i * 61) % 100}%`,
          size,
          duration: `${9 + ((i * 13) % 12)}s`,
          delay: `${-((i * 17) % 20)}s`,
          sway: `${3 + ((i * 11) % 5)}s`,
          opacity: 0.25 + ((i * 29) % 60) / 100,
        };
      }),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {flakes.map((f) => (
        <span
          key={f.key}
          className="snowflake"
          style={{
            left: f.left,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            animationDuration: `${f.duration}, ${f.sway}`,
            animationDelay: `${f.delay}, 0s`,
          }}
        />
      ))}
    </div>
  );
}
