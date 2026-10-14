/**
 * SSR determinism tests (BF-013): every @brandlyframes/design component must
 * render identically through react-dom/server on repeated renders — no
 * Math.random, no Date.now, no non-deterministic ids (GOAL_00 §2 determinism
 * principle, applied to Studio UI chrome).
 */
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';
import { Button } from '../src/components/Button';
import { FrameCounter } from '../src/components/FrameCounter';
import { LogoLockup } from '../src/components/LogoLockup';
import { Panel } from '../src/components/Panel';
import { Progress } from '../src/components/Progress';
import { Tabs } from '../src/components/Tabs';
import { TimecodeInput } from '../src/components/TimecodeInput';
import { Toast } from '../src/components/Toast';
import { Tooltip } from '../src/components/Tooltip';

/** Renders the same element twice and returns both HTML strings. */
const renderTwice = (ui: ReactElement): [string, string] => [
  renderToString(ui),
  renderToString(ui),
];

const CASES: Array<[name: string, ui: ReactElement]> = [
  ['Button', <Button variant="primary">Render</Button>],
  ['Panel', <Panel title="Composition">timeline body</Panel>],
  ['Tabs', <Tabs ariaLabel="Sections" tabs={[{ id: 'a', label: 'One' }, { id: 'b', label: 'Two' }]} activeId="a" />],
  ['Tooltip', <Tooltip label="Playhead position"><span>▶</span></Tooltip>],
  ['Toast', <Toast variant="success" message="Render complete" />],
  ['Progress bar', <Progress value={42} label="Render progress" />],
  ['Progress clapper', <Progress value={42} variant="clapper" label="SCENE 01" />],
  ['FrameCounter', <FrameCounter frame={42} total={300} />],
  ['TimecodeInput', <TimecodeInput value="00:01:12:05" onChange={() => undefined} ariaLabel="Start timecode" />],
  ['LogoLockup', <LogoLockup />],
];

describe('deterministic SSR (renderToString twice — identical)', () => {
  it.each(CASES)('%s renders byte-identically on repeated server renders', (_name, ui) => {
    const [first, second] = renderTwice(ui);
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it('a composite of all components renders byte-identically', () => {
    const composite = (
      <div>
        {CASES.map(([name, ui]) => (
          <section key={name}>{ui}</section>
        ))}
      </div>
    );
    const [first, second] = renderTwice(composite);
    expect(first).toBe(second);
  });
});

describe('component content contracts', () => {
  it('FrameCounter reads "FRAME 0042 / 0300" in the mono tabular format', () => {
    const html = renderToString(<FrameCounter frame={42} total={300} />);
    expect(html).toContain('FRAME 0042 / 0300');
    expect(html).toContain('tabular-nums');
  });

  it('LogoLockup renders the BRANDLYFRAMES wordmark plus an orange SVG bracket mark', () => {
    const html = renderToString(<LogoLockup />);
    expect(html).toContain('BRANDLYFRAMES');
    expect(html).toContain('<svg');
    expect(html).toContain('var(--bf-orange)');
  });

  it('Toast never relies on color alone — icon glyph accompanies every variant', () => {
    expect(renderToString(<Toast variant="success" message="ok" />)).toContain('✓');
    expect(renderToString(<Toast variant="error" message="bad" />)).toContain('!');
    expect(renderToString(<Toast variant="error" message="bad" />)).toContain('role="alert"');
    expect(renderToString(<Toast variant="info" message="hi" />)).toContain('role="status"');
  });

  it('Progress exposes the clamped value to assistive tech', () => {
    expect(renderToString(<Progress value={42} />)).toContain('aria-valuenow="42"');
    expect(renderToString(<Progress value={140} />)).toContain('aria-valuenow="100"');
    expect(renderToString(<Progress value={-5} />)).toContain('aria-valuenow="0"');
    expect(renderToString(<Progress value={42} variant="clapper" />)).toContain('repeating-linear-gradient');
  });

  it('Tabs marks exactly the active tab with aria-selected', () => {
    const html = renderToString(
      <Tabs tabs={[{ id: 'a', label: 'One' }, { id: 'b', label: 'Two' }]} activeId="b" />,
    );
    expect(html).toContain('role="tablist"');
    expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-selected="false"');
  });

  it('Tooltip ships closed on the server (aria-hidden) with the label present', () => {
    const html = renderToString(<Tooltip label="Playhead position"><span>▶</span></Tooltip>);
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('Playhead position');
    expect(html).toContain('aria-hidden="true"');
  });

  it('TimecodeInput validates HH:MM:SS:FF and reports invalid values non-verbally via aria-invalid', () => {
    const valid = renderToString(
      <TimecodeInput value="00:01:12:05" onChange={() => undefined} />,
    );
    expect(valid).toContain('value="00:01:12:05"');
    expect(valid).toContain('aria-invalid="false"');

    const invalid = renderToString(
      <TimecodeInput value="0:1:2:5" onChange={() => undefined} />,
    );
    expect(invalid).toContain('aria-invalid="true"');

    // FF must stay below fps (default 30).
    const ffOutOfRange = renderToString(
      <TimecodeInput value="00:00:00:30" onChange={() => undefined} />,
    );
    expect(ffOutOfRange).toContain('aria-invalid="true"');
  });

  it('Panel renders its mono uppercase title', () => {
    const html = renderToString(<Panel title="Composition">body</Panel>);
    expect(html).toContain('Composition');
    expect(html).toContain('var(--bf-surface-1)');
  });
});
