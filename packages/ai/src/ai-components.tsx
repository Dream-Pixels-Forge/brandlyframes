/**
 * @brandlyframes/ai components [BF-220]
 *
 * <AIVideo> and <AIImage> resolve their provider through `getAIProvider`,
 * so the adapter is fully injectable. Generation is kicked off during render
 * and never blocks or fails render; the host app wires the returned URL into
 * a player / image.
 */

import { AIComponentProps } from './ai';
import { getAIProvider } from './ai-provider';

export interface AIVideoProps extends AIComponentProps {
  provider?: string;
}

export interface AIImageProps extends AIComponentProps {
  provider?: string;
}

/**
 * <AIVideo> — generate video from a prompt via a registered AI provider.
 */
export function AIVideo({ prompt, provider = 'default' }: AIVideoProps) {
  const adapter = getAIProvider(provider);
  if (adapter) {
    void adapter
      .generateVideo(prompt)
      .catch(() => {
        // Generation failures are surfaced by the host app; never break render.
      });
  }
  return <video aria-label={prompt} playsInline />;
}

/**
 * <AIImage> — generate an image from a prompt via a registered AI provider.
 */
export function AIImage({ prompt, provider = 'default' }: AIImageProps) {
  const adapter = getAIProvider(provider);
  if (adapter) {
    void adapter
      .generateImage(prompt)
      .catch(() => {
        // Generation failures are surfaced by the host app; never break render.
      });
  }
  return <img alt={prompt} />;
}
