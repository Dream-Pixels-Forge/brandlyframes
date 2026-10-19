import { useCurrentFrame, useVideoConfig } from 'brandlyframes';

const TICKS = [
  { label: '0%', frame: 0 },
  { label: '25%', frame: null },
  { label: '50%', frame: null },
  { label: '75%', frame: null },
  { label: '100%', frame: null },
];

export default function Root() {
  const frame = useCurrentFrame();
  const { width, height, totalFrames } = useVideoConfig();

  const anchors = TICKS.map((tick) => ({
    ...tick,
    frame: tick.frame ?? Math.floor((tick.label.slice(0, -1) / 100) * totalFrames),
  }));

  const activeIndex = anchors.findIndex(
    (a, i) =>
      frame >= a.frame && (i === anchors.length - 1 || frame < anchors[i + 1].frame)
  );
  const active = anchors[Math.max(0, activeIndex)];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect width="100%" height="100%" fill="#0f172a" />
      {anchors.map((anchor, i) => {
        const x = (i / (anchors.length - 1)) * width;
        const activeSegment = activeIndex >= i;
        return (
          <g key={i}>
            <line
              x1={x}
              y1={height * 0.35}
              x2={x}
              y2={height * 0.65}
              stroke={activeSegment ? '#34d399' : '#475569'}
              strokeWidth={2}
            />
            <circle
              cx={x}
              cy={height * 0.5}
              r={activeSegment ? 10 : 6}
              fill={activeSegment ? '#34d399' : '#94a3b8'}
            />
            <text
              x={x}
              y={height * 0.3}
              dominantBaseline="middle"
              textAnchor="middle"
              fill={activeSegment ? '#34d399' : '#cbd5e1'}
              fontSize={Math.min(width, height) * 0.06}
              fontFamily="system-ui, sans-serif"
              fontWeight="600"
            >
              {anchor.label}
            </text>
          </g>
        );
      })}
      <text
        x="50%"
        y="85%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={Math.min(width, height) * 0.04}
        fontFamily="system-ui, sans-serif"
      >
        Frame-exact seek: {frame} / {totalFrames} · Active: {active.label}
      </text>
    </svg>
  );
}
