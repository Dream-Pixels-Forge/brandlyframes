// Code examples for documentation - stored as plain strings to avoid JSX parsing issues
// This file is .ts (not .tsx) so JSX syntax inside template literals won't be parsed

export const basicUsageCode = `import { registerRoot } from 'brandlyframes';
import { Player } from '@brandlyframes/player';

const MyComposition = () => {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0A0A0A', color: '#fff' }}>
      <h1>Hello BrandlyFrames</h1>
    </div>
  );
};

registerRoot(MyComposition);

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

export const refApiCode = `import { useRef } from 'react';
import { Player } from '@brandlyframes/player';

export default function App() {
  const player = useRef<any>(null);

  const seekToStart = () => {
    player.current?.seekTo(0);
  };

  const togglePlayback = () => {
    if (player.current?.isPlaying()) {
      player.current.pause();
    } else {
      player.current.play();
    }
  };

  return (
    <>
      <Player ref={player} compositionId="my-video" autoPlay controls />
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={seekToStart}>Seek to start</button>
        <button onClick={togglePlayback}>Toggle playback</button>
      </div>
    </>
  );
}`;

export const seekAccuracyCode = `import { useState } from 'react';
import { Player } from '@brandlyframes/player';

export default function App() {
  const [currentFrame, setCurrentFrame] = useState(0);

  return (
    <Player
      compositionId="my-video"
      controls
      playbackRate={1}
      onFrameChange={(frame) => setCurrentFrame(frame)}
      onSeeked={() => console.log('Seeked to', frame)}
    />
  );

  // Jump to exact frame (e.g. frame 45 of a 300-frame composition)
  // playerRef.current?.seekTo(45);
}`;

export const controlledPlaybackCode = `import { useRef } from 'react';
import { Player } from '@brandlyframes/player';

export default function App() {
  const player = useRef<any>(null);
  const [rate, setRate] = useState(1);

  return (
    <>
      <Player
        ref={player}
        compositionId="my-video"
        playbackRate={rate}
        controls
        onPlay={() => console.log('playing')}
        onPause={() => console.log('paused')}
        onEnded={() => console.log('ended')}
        onError={(err) => console.error('playback error', err)}
      />
      <div style={{ marginTop: 16 }}>
        <label>Playback rate</label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
        />
      </div>
    </>
  );
}`;

export const seekAccuracyPlayerCode = `import { useRef, useState } from 'react';
import { Player } from '@brandlyframes/player';

export default function App() {
  const player = useRef<any>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const totalFrames = 300;

  return (
    <>
      <Player
        ref={player}
        compositionId="my-video"
        controls
        onFrameChange={setCurrentFrame}
      />
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          Frame: {currentFrame} / {totalFrames}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 30, 60, 90, 120, 150].map((frame) => (
            <button
              key={frame}
              onClick={() => player.current?.seekTo(frame)}
            >
              Jump to {frame}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => player.current?.play()}>Play</button>
          <button onClick={() => player.current?.pause()}>Pause</button>
        </div>
      </div>
    </>
  );
}`;

export const errorHandlingCode = `import { Player } from '@brandlyframes/player';

export default function App() {
  return (
    <Player
      compositionId="my-video"
      controls
      onError={(error) => {
        // Surface the error to the user, log it, or attempt recovery
        console.error('Player error:', error.message);
      }}
      onEnded={() => console.log('Composition finished')}
    />
  );
}`;

export const loopAndAutoplayCode = `import { Player } from '@brandlyframes/player';

export default function App() {
  return (
    <Player
      compositionId="my-video"
      autoPlay
      loop
      controls
      width={1920}
      height={1080}
    />
  );
}`;

export const inputPropsCode = `import { Player } from '@brandlyframes/player';

export default function App() {
  return (
    <Player
      compositionId="my-video"
      controls
      inputProps={{
        theme: 'dark',
        userId: 'abc123',
        analyticsEnabled: true,
      }}
    />
  );
}`;

export const playbackRateCode = `import { useState } from 'react';
import { Player } from '@brandlyframes/player';

export default function App() {
  const [rate, setRate] = useState(1);

  return (
    <Player
      compositionId="my-video"
      controls
      playbackRate={rate}
    />
  );

  // Expose rate control elsewhere in your UI:
  // <select value={rate} onChange={e => setRate(Number(e.target.value))}>
  //   <option value={0.5}>0.5x</option>
  //   <option value={1}>1x</option>
  //   <option value={1.5}>1.5x</option>
  //   <option value={2}>2x</option>
  // </select>
}`;

export const customControlsCode = `import { useRef } from 'react';
import { Player } from '@brandlyframes/player';

export default function App() {
  const player = useRef<any>(null);

  return (
    <>
      <Player ref={player} compositionId="my-video" controls={false} />
      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => player.current?.play()}
          disabled={player.current?.isPlaying()}
        >
          Play
        </button>
        <button
          onClick={() => player.current?.pause()}
          disabled={!player.current?.isPlaying()}
        >
          Pause
        </button>
        <button onClick={() => player.current?.seekTo(0)}>
          Restart
        </button>
        <span>
          {player.current?.getCurrentFrame() ?? 0} /
          {player.current?.getDurationInFrames() ?? 0}
        </span>
      </div>
    </>
  );
}`;

export const accessibilityCode = `import { Player } from '@brandlyframes/player';

export default function App() {
  return (
    <Player
      compositionId="my-video"
      controls
      width={1280}
      height={720}
    />
  );

  // The Player renders native <button> elements for play/pause/seek
  // with proper ARIA labels, so it's keyboard navigable and screen-reader friendly.
  // Focus trapping and ARIA live regions are applied to the time display.
}`;

export const keyboardShortcutsCode = `import { Player } from '@brandlyframes/player';

export default function App() {
  return (
    <Player
      compositionId="my-video"
      controls
    />
  );

  // Built-in keyboard shortcuts:
  // Space        — Toggle play/pause
  // Left/Right   — Seek backward/forward one frame
  // Shift+Left/Right — Seek backward/forward 10 frames
  // Home/End     — Jump to start/end
}`;

export const responsiveCode = `import { Player } from '@brandlyframes/player';

export default function App() {
  return (
    <div style={{ width: '100%', maxWidth: 1280 }}>
      <Player
        compositionId="my-video"
        controls
        style={{ width: '100%', height: 'auto', aspectRatio: '16 / 9' }}
      />
    </div>
  );
}`;

export const multiInstanceCode = `import { Player } from '@brandlyframes/player';

export default function App() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      <Player
        compositionId="intro-video"
        controls
        autoPlay
      />
      <Player
        compositionId="outro-video"
        controls
        loop
      />
    </div>
  );
}`;
