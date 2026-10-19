import { useCurrentFrame, useVideoConfig } from 'brandlyframes';

const SCENES = [
  { label: 'Introducing Aurora', color: '#1e293b', accent: '#60a5fa' },
  { label: 'Designed for motion', color: '#0f172a', accent: '#a78bfa' },
  { label: 'Now shipping', color: '#064e3b', accent: '#34d399' },
];

export default function Root() {
  const frame = useCurrentFrame();
  const { width, height, totalFrames } = useVideoConfig();

  const sceneDuration = totalFrames / SCENES.length;
  const sceneIndex = Math.min(
    Math.floor(frame / sceneDuration),
    SCENES.length - 1
  );
  const scene = SCENES[sceneIndex];
  const progressInScene = (frame % sceneDuration) / sceneDuration;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect width="100%" height="100%" fill={scene.color} />
      <circle
        cx={width / 2}
        cy={height / 2}
        r={Math.min(width, height) * (0.2 + 0.1 * Math.sin(progressInScene * Math.PI * 2))}
        fill={scene.accent}
        opacity={0.15 + 0.1 * progressInScene}
      />
      <text
        x="50%"
        y="45%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#ffffff"
        fontSize={Math.min(width, height) * 0.14}
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        letterSpacing="0.05em"
      >
        {scene.label}
      </text>
      <text
        x="50%"
        y="60%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#cbd5e1"
        fontSize={Math.min(width, height) * 0.06}
        fontFamily="system-ui, sans-serif"
      >
        Scene {sceneIndex + 1} / {SCENES.length} · Frame {frame} / {totalFrames}
      </text>
    </svg>
  );
}
