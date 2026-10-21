// Code examples for documentation - stored as plain strings to avoid JSX parsing issues
// This file is .ts (not .tsx) so JSX syntax inside template literals won't be parsed

export const helloVideoCode = `import { registerRoot, Composition, useCurrentFrame, useVideoConfig, spring, interpolate } from 'brandlyframes';
import { Player } from '@brandlyframes/player';

const MyVideo = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  
  const scale = spring(frame, {
    fps,
    durationInFrames: 60,
    from: 0.5,
    to: 1.2,
  });

  const opacity = interpolate(frame, [0, 30, 60], [0, 1, 0]);

  return (
    <div style={{ 
      width, height, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#0A0A0A',
    }}>
      <div style={{
        transform: \`scale(\${scale})\`,
        opacity,
        color: '#FF6A00',
        fontSize: '4rem',
        fontWeight: 700,
        fontFamily: 'Bebas Neue, sans-serif',
      }}>
        BRANDLYFRAMES
      </div>
    </div>
  );
};

registerRoot(MyVideo);

export default function App() {
  return (
    <Player 
      compositionId="my-video" 
      autoPlay 
      loop 
      controls 
      width={1280} 
      height={720}
    />
  );
}`;

export const frameContextCode = `// What the frame context provides:
interface FrameContext {
  // Current frame (0-indexed)
  currentFrame: number;
  
  // Video configuration
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  
  // Derived values
  currentTime: number;        // currentFrame / fps
  progress: number;           // currentFrame / durationInFrames
}

// In your component:
const frame = useCurrentFrame();           // 0, 1, 2, 3...
const { fps, width, height, durationInFrames } = useVideoConfig();

// All animations derive from frame:
const opacity = interpolate(frame, [0, 30], [0, 1]);
const scale = spring(frame, { fps, durationInFrames: 60, from: 0, to: 1 });
const rotation = interpolate(frame, [0, durationInFrames], [0, 360]);`;

export const compositionCode = `import { registerRoot, Composition } from 'brandlyframes';

const MyVideo = () => {
  const frame = useCurrentFrame();
  // ... render logic
  return <div>Frame: {frame}</div>;
};

// Register at module level (top of file)
registerRoot(
  <Composition
    id="my-video"                    // Unique identifier
    component={MyVideo}              // React component
    durationInFrames={300}           // Total frames
    fps={30}                         // Frames per second
    width={1920}                     // Width in pixels
    height={1080}                    // Height in pixels
    defaultProps={{                  // Optional default input props
      theme: 'dark',
    }}
    schema={z.object({               // Zod schema for input validation (BF-008)
      theme: z.enum(['light', 'dark']).default('dark'),
      text: z.string().optional(),
    })}
    calculateMetadata={async (props) => ({ // Dynamic duration/props (BF-008)
      durationInFrames: props.text ? 600 : 300,
    })}
  />
);`;

export const sequenceCode = `import { Sequence, useCurrentFrame } from 'brandlyframes';

const Scene = () => {
  const frame = useCurrentFrame(); // 0, 1, 2... relative to Sequence
  return <div>Scene frame: {frame}</div>;
};

<Sequence from={60} durationInFrames={120}>
  <Scene />  {/* Renders frames 60-179 of parent as 0-119 */}
</Sequence>

// Props:
// from: number           // Start frame (inclusive)
// durationInFrames?: number // Optional: clamp children
// children: ReactNode`;

export const seriesCode = `import { Series, useCurrentFrame } from 'brandlyframes';

const Clip1 = () => <div>Clip 1: {useCurrentFrame()}</div>;
const Clip2 = () => <div>Clip 2: {useCurrentFrame()}</div>;
const Clip3 = () => <div>Clip 3: {useCurrentFrame()}</div>;

<Series>
  <Clip1 durationInFrames={60} />
  <Clip2 durationInFrames={90} />
  <Clip3 durationInFrames={45} />
</Series>

// Total: 195 frames
// Clip1: frames 0-59
// Clip2: frames 60-149
// Clip3: frames 150-194`;

export const loopCode = `<Loop durationInFrames={30}>
  <Spinner />  {/* Repeats every 30 frames */}
</Loop>

// Also supports:
// <Loop> — loops entire composition
// <Loop from={10} durationInFrames={20}> — loops subsection`;

export const freezeCode = `<Freeze atFrame={90} durationInFrames={30}>
  <ExpensiveComponent />  {/* Holds frame 90 for 30 frames */}
</Freeze>

// Useful for:
// - Holding a frame while async loads
// - Extending a moment
// - Reducing render cost`;

export const absoluteFillCode = `import { AbsoluteFill } from 'brandlyframes';

<AbsoluteFill>
  <BackgroundVideo />  {/* Fills entire composition */}
</AbsoluteFill>

// Styles applied automatically:
// position: absolute
// inset: 0
// width: 100%
// height: 100%`;

export const interpolateCode = `import { interpolate, Easing } from 'brandlyframes';

// Basic: frame 0→100 maps to 0→1
const opacity = interpolate(frame, [0, 100], [0, 1]);

// With easing
const scale = interpolate(frame, [0, 60], [1, 2], {
  easing: Easing.easeOutExpo,
});

// Extrapolation
interpolate(frame, [0, 100], [0, 1], {
  extrapolateLeft: 'clamp',   // 'clamp' | 'extend' | 'identity'
  extrapolateRight: 'extend',
});

// Color interpolation
import { interpolateColors } from 'brandlyframes';
const color = interpolateColors(frame, [0, 60], ['#000', '#FF6A00']);`;


export const springCode = `import { spring } from 'brandlyframes';

const scale = spring(frame, {
  fps: 30,
  durationInFrames: 60,
  from: 0,
  to: 1,
  stiffness: 100,    // Spring stiffness
  damping: 10,       // Damping ratio
  mass: 1,           // Mass
  clamp: true,       // Clamp to [from, to]
});

// Presets available:
spring.bouncy(frame, { fps, durationInFrames: 60, from: 0, to: 1 });
spring.smooth(frame, { fps, durationInFrames: 60, from: 0, to: 1 });
spring.snappy(frame, { fps, durationInFrames: 60, from: 0, to: 1 });`;


export const easingCode = `import { Easing } from 'brandlyframes';

// Standard easings
Easing.linear
Easing.easeInQuad
Easing.easeOutQuad
Easing.easeInOutQuad
Easing.easeInCubic
Easing.easeOutCubic
Easing.easeInOutCubic
Easing.easeInQuart
Easing.easeOutQuart
Easing.easeInOutQuart
Easing.easeInQuint
Easing.easeOutQuint
Easing.easeInOutQuint
Easing.easeInExpo
Easing.easeOutExpo
Easing.easeInOutExpo
Easing.easeInCirc
Easing.easeOutCirc
Easing.easeInOutCirc
Easing.easeInBack
Easing.easeOutBack
Easing.easeInOutBack
Easing.easeInElastic
Easing.easeOutElastic
Easing.easeInOutElastic`;


export const timeHelpersCode = `import { sec, ms, tc, frames } from 'brandlyframes';

// Convert time to frames (at current fps)
sec(2.5)      // 75 frames at 30fps
ms(400)       // 12 frames at 30fps
tc("00:01:12:05") // Timecode → frames

// Named markers
const { useMarker } = require('brandlyframes');
const dropFrame = useMarker("drop"); // Returns frame number`;


export const inputPropsCode = `import { registerRoot, Composition, getInputProps } from 'brandlyframes';
import { z } from 'zod';

// Define schema (BF-008)
const PropsSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().optional(),
  theme: z.enum(['dark', 'light']).default('dark'),
  duration: z.number().int().positive().default(10),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }).optional(),
});

type Props = z.infer<typeof PropsSchema>;

const TitleSequence = () => {
  // Get validated props (throws if invalid)
  const props = getInputProps<Props>();
  
  const frame = useCurrentFrame();
  // ... use props.title, props.theme, etc.
  return <div>{props.title}</div>;
};

registerRoot(
  <Composition
    id="title-sequence"
    component={TitleSequence}
    durationInFrames={300}
    fps={30}
    width={1920}
    height={1080}
    schema={PropsSchema}
    defaultProps={{ theme: 'dark' }}
  />
);

// Usage in Player:
<Player 
  compositionId="title-sequence"
  inputProps={{ 
    title: "Hello World",
    theme: "dark",
    colors: { primary: "#FF6A00", secondary: "#FAFAFA" }
  }}
/>`;


export const asyncReadinessCode = `import { holdFrame, releaseFrame, useCurrentFrame } from 'brandlyframes';

const AsyncVideo = () => {
  const frame = useCurrentFrame();
  const [fontLoaded, setFontLoaded] = useState(false);
  
  // Hold the frame until font is ready
  const handle = holdFrame();
  
  useEffect(() => {
    loadCustomFont().then(() => {
      setFontLoaded(true);
      releaseFrame(handle); // Release when ready
    });
  }, []);
  
  if (!fontLoaded) {
    return <div>Loading font...</div>; // This frame won't be captured
  }
  
  return <div>Frame {frame} with custom font!</div>;
};

// Automatic holding (recommended):
import { useFont } from 'brandlyframes';

const AutoFontVideo = () => {
  const font = useFont({ src: './fonts/Custom.woff2' });
  // Automatically holds frame until font loads
  
  return <div style={{ fontFamily: font }}>Ready!</div>;
}`;