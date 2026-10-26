/**
 * BF-230: HyperFrames HTML import.
 *
 * Clean-room implementation of the HyperFrames composition contract: an
 * HTML document describes a timeline declaratively through data-* timing
 * attributes and clip classes. Only the contract documented below is
 * implemented here — no HyperFrames or Remotion source is used or copied.
 *
 * Contract (as imported by BrandlyFrames):
 * - Composition root: the first element with class `hyperframes-composition`
 *   or a `data-hf-composition` attribute. Root attributes: `data-fps`
 *   (default 30), `data-width` (default 1920), `data-height` (default 1080),
 *   `data-duration-frames` (default: latest clip end), `data-name` and `id`.
 * - Timing: every clip reads `data-start-frame` (default 0) and
 *   `data-duration-frames` (default 1, with a warning when missing).
 * - Clips: elements with class `hf-clip` (generic, kind "sequence") or a
 *   kind class `hf-video` | `hf-audio` | `hf-image` | `hf-text`. Media
 *   reference comes from `data-src` (preferred) or `src`; the name from
 *   `data-name`. Nested clips are flattened into the timeline.
 * - Tracks: elements with class `hf-track` or a `data-track-name` attribute
 *   declare tracks in document order. A clip's track is its `data-track`
 *   attribute when valid, else its nearest ancestor track container's
 *   index, else 0. Clips beyond the declared tracks extend the track list.
 * - Markers: elements with class `hf-marker`; name from `data-name` (or the
 *   element's text content), absolute frame from `data-frame` (missing or
 *   invalid markers are skipped with a warning).
 * - Graceful fallback: unknown elements inside the composition root become
 *   `<Sequence>` placeholders (kind "sequence", named `Sequence: <tag>`)
 *   with a warning. Void elements and document-level tags (html, head, body,
 *   title, meta, link, base, style, script) are ignored.
 *
 * The tokenizer below is a tolerant, dependency-free HTML subset reader
 * (elements, attributes, comments, raw-text elements); malformed input
 * produces warnings, never throws.
 */

import { decodeEntities } from './entities.js';
import type { CompositionIR, TimelineClip, TimelineClipKind, TimelineMarker } from './ir.js';

/** Result of importing a HyperFrames HTML composition document. */
export interface HyperFramesImportResult {
  /** The imported composition timeline. */
  composition: CompositionIR;
  /** Human-readable warnings collected during import (never empty-checked). */
  warnings: string[];
}

interface ElementNode {
  tag: string;
  attrs: Record<string, string>;
  children: ElementNode[];
  /** Accumulated decoded text of this element and its descendants. */
  text: string;
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Document-level and metadata tags that never become timeline content. */
const IGNORED_TAGS = new Set([
  'html',
  'head',
  'body',
  'title',
  'meta',
  'link',
  'base',
  'style',
  'script',
]);

const RAW_TEXT_TAGS = new Set(['script', 'style']);

const CLIP_CLASSES = new Set(['hf-clip', 'hf-video', 'hf-audio', 'hf-image', 'hf-text']);

const DEFAULTS = {
  fps: 30,
  width: 1920,
  height: 1080,
  id: 'composition',
  name: 'HyperFrames Composition',
} as const;

// ---------------------------------------------------------------------------
// Minimal tolerant HTML tokenizer -> element tree
// ---------------------------------------------------------------------------

interface TagParseResult {
  node: ElementNode;
  selfClosing: boolean;
  end: number;
}

/** Parses a start tag at `start` (which points at '<'); null for stray '<'. */
function parseStartTag(html: string, start: number): TagParseResult | null {
  const nameMatch = /^<([a-zA-Z][a-zA-Z0-9:-]*)/.exec(html.slice(start, start + 64));
  if (!nameMatch) return null;
  const tag = nameMatch[1].toLowerCase();
  const node: ElementNode = { tag, attrs: {}, children: [], text: '' };
  const n = html.length;
  let i = start + nameMatch[0].length;
  let selfClosing = false;
  while (i < n) {
    while (i < n && /\s/.test(html[i])) i++;
    if (html[i] === '>') {
      i++;
      break;
    }
    if (html[i] === '/' && html[i + 1] === '>') {
      selfClosing = true;
      i += 2;
      break;
    }
    // attribute name
    const nameStart = i;
    while (i < n && !/[\s=>/]/.test(html[i])) i++;
    if (i === nameStart) {
      i++; // stray character (e.g. lone '/'); skip to guarantee progress
      continue;
    }
    const name = html.slice(nameStart, i).toLowerCase();
    // optional = value
    let j = i;
    while (j < n && /\s/.test(html[j])) j++;
    let value = '';
    if (html[j] === '=') {
      j++;
      while (j < n && /\s/.test(html[j])) j++;
      const quote = html[j];
      if (quote === '"' || quote === "'") {
        j++;
        const close = html.indexOf(quote, j);
        value = close === -1 ? html.slice(j) : html.slice(j, close);
        j = close === -1 ? n : close + 1;
      } else {
        const valueStart = j;
        while (j < n && !/[\s>]/.test(html[j])) j++;
        value = html.slice(valueStart, j);
      }
      i = j;
    }
    if (!(name in node.attrs)) node.attrs[name] = decodeEntities(value);
  }
  return { node, selfClosing, end: i };
}

/** Parses HTML into an element tree rooted at a synthetic `#document` node. */
function parseTree(html: string): ElementNode {
  const root: ElementNode = { tag: '#document', attrs: {}, children: [], text: '' };
  const stack: ElementNode[] = [root];
  const appendText = (raw: string): void => {
    if (!raw) return;
    const decoded = decodeEntities(raw);
    for (const node of stack) node.text += decoded;
  };
  const n = html.length;
  let i = 0;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      appendText(html.slice(i));
      break;
    }
    if (lt > i) appendText(html.slice(i, lt));
    if (html.startsWith('<!--', lt)) {
      const close = html.indexOf('-->', lt + 4);
      i = close === -1 ? n : close + 3;
      continue;
    }
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      const close = html.indexOf('>', lt);
      i = close === -1 ? n : close + 1;
      continue;
    }
    if (html.startsWith('</', lt)) {
      const close = html.indexOf('>', lt);
      const tag = html
        .slice(lt + 2, close === -1 ? n : close)
        .trim()
        .toLowerCase();
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].tag === tag) {
          stack.length = s;
          break;
        }
      }
      i = close === -1 ? n : close + 1;
      continue;
    }
    const parsed = parseStartTag(html, lt);
    if (!parsed) {
      appendText('<');
      i = lt + 1;
      continue;
    }
    const parent = stack[stack.length - 1];
    parent.children.push(parsed.node);
    if (RAW_TEXT_TAGS.has(parsed.node.tag)) {
      const close = html.toLowerCase().indexOf(`</${parsed.node.tag}`, parsed.end);
      if (close !== -1) {
        parsed.node.text += decodeEntities(html.slice(parsed.end, close));
        const closeEnd = html.indexOf('>', close);
        i = closeEnd === -1 ? n : closeEnd + 1;
      } else {
        i = n;
      }
    } else if (parsed.selfClosing || VOID_TAGS.has(parsed.node.tag)) {
      i = parsed.end;
    } else {
      stack.push(parsed.node);
      i = parsed.end;
    }
  }
  return root;
}

// ---------------------------------------------------------------------------
// Contract mapping: element tree -> CompositionIR
// ---------------------------------------------------------------------------

const classListOf = (node: ElementNode): string[] =>
  (node.attrs['class'] ?? '').split(/\s+/).filter((c) => c.length > 0);

const isTrackContainer = (node: ElementNode): boolean =>
  classListOf(node).includes('hf-track') || 'data-track-name' in node.attrs;

const isClipElement = (node: ElementNode): boolean =>
  classListOf(node).some((c) => CLIP_CLASSES.has(c));

/** `tag` plus a class hint, for deterministic warning messages. */
const formatTag = (node: ElementNode): string => {
  const classes = classListOf(node);
  return classes.length > 0 ? `${node.tag} class="${classes.join(' ')}"` : node.tag;
};

const capitalize = (kind: string): string => kind[0].toUpperCase() + kind.slice(1);

interface ClipParseContext {
  clips: TimelineClip[];
  warnings: string[];
  containerIndex: number;
}

/**
 * Parses one clip (or placeholder) element into a TimelineClip, reading the
 * data-* timing contract with warnings for missing/invalid values.
 */
function parseClip(node: ElementNode, ctx: ClipParseContext, placeholder: boolean): void {
  const classes = classListOf(node);
  const kind: TimelineClipKind = placeholder
    ? 'sequence'
    : classes.includes('hf-video')
      ? 'video'
      : classes.includes('hf-audio')
        ? 'audio'
        : classes.includes('hf-image')
          ? 'image'
          : classes.includes('hf-text')
            ? 'text'
            : 'sequence';

  const named = node.attrs['data-name']?.trim();
  const name =
    named && named.length > 0
      ? named
      : kind === 'sequence'
        ? `Sequence: ${node.tag}`
        : `${capitalize(kind)} clip ${ctx.clips.length + 1}`;

  const dataSrc = node.attrs['data-src']?.trim();
  const src = node.attrs['src']?.trim();
  const mediaReference =
    dataSrc && dataSrc.length > 0 ? dataSrc : src && src.length > 0 ? src : null;

  // data-start-frame: default 0, invalid values warn and fall back
  let startFrame = 0;
  const rawStart = node.attrs['data-start-frame'];
  if (rawStart !== undefined) {
    const value = Number(rawStart.trim());
    if (rawStart.trim() !== '' && Number.isInteger(value) && value >= 0) {
      startFrame = value;
    } else {
      ctx.warnings.push(`Clip "${name}" has invalid data-start-frame "${rawStart}"; using 0.`);
    }
  }

  // data-duration-frames: required in spirit; default 1 with a warning
  let durationInFrames = 1;
  const rawDuration = node.attrs['data-duration-frames'];
  if (rawDuration === undefined) {
    // placeholders already warn once as unknown nodes; default silently
    if (!placeholder) {
      ctx.warnings.push(`Clip "${name}" is missing data-duration-frames; defaulting to 1 frame.`);
    }
  } else {
    const value = Number(rawDuration.trim());
    if (rawDuration.trim() !== '' && Number.isInteger(value) && value > 0) {
      durationInFrames = value;
    } else {
      ctx.warnings.push(
        `Clip "${name}" has invalid data-duration-frames "${rawDuration}"; using 1 frame.`,
      );
    }
  }

  // track: explicit data-track wins, else nearest ancestor container, else 0
  let track = ctx.containerIndex >= 0 ? ctx.containerIndex : 0;
  const rawTrack = node.attrs['data-track'];
  if (rawTrack !== undefined) {
    const value = Number(rawTrack.trim());
    if (rawTrack.trim() !== '' && Number.isInteger(value) && value >= 0) {
      track = value;
    } else {
      ctx.warnings.push(`Clip "${name}" has invalid data-track "${rawTrack}".`);
    }
  }

  ctx.clips.push({ name, kind, track, startFrame, durationInFrames, mediaReference });
}

function parseMarker(node: ElementNode, markers: TimelineMarker[], warnings: string[]): void {
  const named = node.attrs['data-name']?.trim();
  const name =
    named && named.length > 0 ? named : node.text.trim().length > 0 ? node.text.trim() : 'marker';
  const rawFrame = node.attrs['data-frame'];
  if (rawFrame === undefined) {
    warnings.push(`Marker "${name}" is missing data-frame; skipping marker.`);
    return;
  }
  const value = Number(rawFrame.trim());
  if (rawFrame.trim() === '' || !Number.isInteger(value) || value < 0) {
    warnings.push(`Marker "${name}" has invalid data-frame "${rawFrame}"; skipping marker.`);
    return;
  }
  markers.push({ name, frame: value });
}

/**
 * Parses a HyperFrames HTML composition document into BrandlyFrames
 * composition IR. Malformed input yields warnings, never an exception.
 */
export function parseHyperFramesHtml(html: string): HyperFramesImportResult {
  const tree = parseTree(html);
  const warnings: string[] = [];
  const markers: TimelineMarker[] = [];

  // Find the composition root: first element (pre-order) with the marker
  // class or attribute.
  const findRoot = (node: ElementNode): ElementNode | null => {
    for (const child of node.children) {
      if (
        classListOf(child).includes('hyperframes-composition') ||
        'data-hf-composition' in child.attrs
      ) {
        return child;
      }
      const deep = findRoot(child);
      if (deep) return deep;
    }
    return null;
  };

  const root = findRoot(tree);
  const scopedRoot: ElementNode = root ?? tree;
  if (!root) {
    warnings.push(
      'No HyperFrames composition root found; importing document with default settings.',
    );
  }

  const rootAttrs = root ? root.attrs : {};

  const numberAttr = (key: string, fallback: number, label: string): number => {
    const raw = rootAttrs[key];
    if (raw === undefined) return fallback;
    const value = Number(raw.trim());
    if (raw.trim() !== '' && Number.isFinite(value) && value > 0) return value;
    warnings.push(`Composition has invalid ${label} "${raw}"; using ${fallback}.`);
    return fallback;
  };

  const fps = numberAttr('data-fps', DEFAULTS.fps, 'data-fps');
  const width = Math.round(numberAttr('data-width', DEFAULTS.width, 'data-width'));
  const height = Math.round(numberAttr('data-height', DEFAULTS.height, 'data-height'));

  const id = rootAttrs['id']?.trim() || DEFAULTS.id;
  const named = rootAttrs['data-name']?.trim();
  const name = named && named.length > 0 ? named : rootAttrs['id']?.trim() || DEFAULTS.name;

  const containers: ElementNode[] = [];
  const clips: TimelineClip[] = [];

  const walk = (node: ElementNode, containerIndex: number): void => {
    for (const child of node.children) {
      if (IGNORED_TAGS.has(child.tag)) continue;
      if (classListOf(child).includes('hf-marker')) {
        parseMarker(child, markers, warnings);
        continue;
      }
      if (isTrackContainer(child)) {
        containers.push(child);
        walk(child, containers.length - 1);
        continue;
      }
      if (isClipElement(child)) {
        parseClip(child, { clips, warnings, containerIndex }, false);
        walk(child, containerIndex);
        continue;
      }
      if (VOID_TAGS.has(child.tag)) continue;
      // Graceful fallback: unknown nodes become <Sequence> placeholders.
      warnings.push(`Unknown node <${formatTag(child)}> imported as <Sequence> placeholder.`);
      parseClip(child, { clips, warnings, containerIndex }, true);
      walk(child, containerIndex);
    }
  };

  walk(scopedRoot, -1);

  // Assemble tracks: declared containers first, then any extra indices.
  const containerNames = containers.map((c, i) => {
    const namedTrack = c.attrs['data-track-name']?.trim();
    return namedTrack && namedTrack.length > 0 ? namedTrack : `Track ${i + 1}`;
  });
  const maxClipTrack = clips.reduce((max, c) => Math.max(max, c.track), -1);
  const trackCount = Math.max(containerNames.length, maxClipTrack + 1, 1);
  const tracks = Array.from({ length: trackCount }, (_, i) => ({
    name: containerNames[i] ?? `Track ${i + 1}`,
  }));

  // Explicit root duration wins; otherwise derive from the latest clip end.
  let durationInFrames = clips.reduce(
    (max, c) => Math.max(max, c.startFrame + c.durationInFrames),
    0,
  );
  const rawDuration = rootAttrs['data-duration-frames'];
  if (rawDuration !== undefined) {
    const value = Number(rawDuration.trim());
    if (rawDuration.trim() !== '' && Number.isInteger(value) && value >= 0) {
      durationInFrames = value;
    } else {
      warnings.push(
        `Composition has invalid data-duration-frames "${rawDuration}"; using ${durationInFrames}.`,
      );
    }
  }

  const composition: CompositionIR = {
    id,
    name,
    width,
    height,
    fps,
    durationInFrames,
    tracks,
    clips,
    markers,
  };

  return { composition, warnings };
}
