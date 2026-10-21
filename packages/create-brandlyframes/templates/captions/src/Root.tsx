import { useCurrentFrame, useVideoConfig } from 'brandlyframes';

const CAPTIONS = [
  'Frame one — the beginning',
  'Motion builds here',
  'Peak emphasis point',
  'Resolving the beat',
  'Fade to end',
];

export default function Root() {
  const frame = useCurrentFrame();
  const { width, height, totalFrames } = useVideoConfig();
  const index = Math.min(
    Math.floor(((frame % totalFrames) / totalFrames) * CAPTIONS.length),
    CAPTIONS.length - 1
  );
  const caption = CAPTIONS[index];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect width="100%" height="100%" fill="#0f172a" />
      <text
        x="50%"
        y="40%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#ffffff"
        fontSize={Math.min(width, height) * 0.14}
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
      >
        {caption}
      </text>
      <text
        x="50%"
        y="60%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#cbd5e1"
        fontSize={Math.min(width, height) * 0.05}
        fontFamily="system-ui, sans-serif"
      >
        Frame {frame} / {totalFrames}
      </text>
    </svg>
  );
}
