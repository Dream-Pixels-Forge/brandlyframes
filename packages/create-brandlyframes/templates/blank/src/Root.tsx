import { useCurrentFrame, useVideoConfig } from 'brandlyframes';

export default function Root() {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect width="100%" height="100%" fill="#0a0a0a" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#ffffff"
        fontSize={Math.min(width, height) * 0.12}
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
      >
        Frame {frame} / @ {fps} fps
      </text>
    </svg>
  );
}
