import { useCurrentFrame, useVideoConfig } from 'brandlyframes';

const MESSAGE = 'Hello, BrandlyFrames';

export default function Root() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const progress = (frame % 60) / 60;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#0a0a0a" />
      <circle
        cx={width / 2}
        cy={height / 2}
        r={Math.min(width, height) * 0.18}
        fill="url(#grad)"
      >
        <animate
          attributeName="r"
          values={[
            Math.min(width, height) * 0.12,
            Math.min(width, height) * 0.24,
            Math.min(width, height) * 0.12,
          ].join(';')}
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <text
        x="50%"
        y="45%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#ffffff"
        fontSize={Math.min(width, height) * 0.1}
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
      >
        {MESSAGE}
      </text>
      <text
        x="50%"
        y="58%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={Math.min(width, height) * 0.05}
        fontFamily="system-ui, sans-serif"
      >
        Frame {frame} · progress {((progress * 100).toFixed(0))}%
      </text>
    </svg>
  );
}
