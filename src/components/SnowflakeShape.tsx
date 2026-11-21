// Ornate 6-arm ice snowflake drawn in SVG; colour via currentColor.
export default function SnowflakeShape({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const arm = (
    <>
      <line x1="0" y1="6" x2="0" y2="-45" />
      <line x1="0" y1="-16" x2="-10" y2="-26" />
      <line x1="0" y1="-16" x2="10" y2="-26" />
      <line x1="0" y1="-29" x2="-7" y2="-36" />
      <line x1="0" y1="-29" x2="7" y2="-36" />
      <path d="M -7 -40 L 0 -46 L 7 -40" />
    </>
  );
  return (
    <svg
      viewBox="-50 -50 100 100"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="0,-9 7.8,-4.5 7.8,4.5 0,9 -7.8,4.5 -7.8,-4.5" fill="rgba(8,20,38,0.9)" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          {arm}
        </g>
      ))}
    </svg>
  );
}
