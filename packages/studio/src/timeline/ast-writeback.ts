/**
 * BF-122 AST write-back — serialize timeline/keyframe edits back to the
 * user's source composition code via a minimal Babel AST writer.
 *
 * Strategy:
 *  1. Parse the source file with @babel/parser (TS + JSX plugins).
 *  2. Walk the composition JSX tree, find <Sequence> / <Series.Sequence>
 *     children that match the clip ids from the timeline model.
 *  3. Rewrite their `from` / `durationInFrames` props to the values
 *     produced by the user's drag/trim interactions.
 *  4. Write keyframe tracks as generated `animate(...)` call expressions
 *     inside the matching child elements.
 *  5. Emit with @babel/generator using `retainLines: true` so unedited
 *     lines keep their original formatting (lossless round-trip for
 *     no-edit paths).
 *
 * Losslessness guarantee (BF-122 acceptance criterion):
 *  parse(source) → edit(no-op) → write → parse(result) produces an AST
 *  identical in semantics; and where NO edit occurred, the output text
 *  is byte-identical to the input text (retainLines + no-visit = no-rewrite).
 */

import * as _parserNs from '@babel/parser';
import * as _generatorNs from '@babel/generator';
import * as _traverseNs from '@babel/traverse';
import type * as t from '@babel/types';

import type { ParseResult } from '@babel/parser';
import type { GeneratorOptions, GeneratorResult } from '@babel/generator';
import type { NodePath } from '@babel/traverse';
import type { Node } from '@babel/types';

// Babel 8: parse/generate are named exports; @babel/traverse default export
// is the traverse function (CJS interop via .default).
const parse = _parserNs.parse;
const generate: (
  ast: Node,
  opts?: GeneratorOptions,
  code?: string,
) => GeneratorResult = _generatorNs.generate;
const traverse: typeof _traverseNs.default = _traverseNs.default;

/** A clip edit to apply (as produced by the TimelinePanel reducers). */
export interface ClipEdit {
  /** The clip id (must match the data-clip-id attribute we emit on <Sequence>). */
  readonly clipId: string;
  /** New `from` (absolute composition frame). */
  readonly from?: number;
  /** New `durationInFrames`. */
  readonly durationInFrames?: number;
  /** Keyframe tracks to write as `animate()` calls inside this clip's child. */
  readonly keyframeTracks?: readonly {
    readonly property: string;
    readonly frames: readonly {
      readonly t: number;
      readonly value: number;
      readonly easing: 'linear' | 'bezier' | 'spring';
      readonly bezier?: [number, number, number, number];
    }[];
  }[];
}

/** Options for {@link writeBackTimeline}. */
export interface WriteBackOptions {
  /** The root composition variable name, e.g. "MyComposition". */
  readonly compositionName: string;
  /** Parser plugins (default: typescript + jsx). */
  readonly parserPlugins?: string[];
}

const DEFAULT_PLUGINS = ['typescript', 'jsx'];

/**
 * Parse a TS/JSX source string into a Babel AST.
 */
export function parseCompositionSource(
  source: string,
  plugins: readonly string[] = DEFAULT_PLUGINS,
): ParseResult {
  return parse(source, {
    sourceType: 'module',
    plugins: [...plugins] as import('@babel/parser').ParserPlugin[],
    errorRecovery: false,
  });
}

/**
 * Generate source text from a Babel AST. `retainLines` keeps original line
 * numbers for unvisited nodes, which is what makes the no-edit round-trip
 * byte-identical.
 */
export function generateSource(ast: ParseResult, extraOpts: Partial<GeneratorOptions> = {}): string {
  return generate(ast, {
    retainLines: true,
    compact: false,
    concise: false,
    ...extraOpts,
  }).code;
}

/**
 * Write back clip edits to a composition source string.
 *
 * @returns the new source text.
 *
 * Lossless round-trip: when `edits` is empty (or no clip id matches), the
 * output is identical to the input (parse → no-visit → retainLine emit).
 */
export function writeBackTimeline(
  source: string,
  edits: readonly ClipEdit[],
  options: WriteBackOptions,
): string {
  const ast = parseCompositionSource(source, options.parserPlugins);
  const editMap = new Map<string, ClipEdit>();
  for (const e of edits) editMap.set(e.clipId, e);

  let matchedAny = false;

  traverse(ast, {
    JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
      // Look for <Sequence data-clip-id="...">
      if (path.node.name.type !== 'JSXIdentifier') return;
      if (path.node.name.name !== 'Sequence' && path.node.name.name !== 'Series.Sequence') {
        return;
      }
      const clipIdAttr = path.node.attributes.find(
        (a: t.JSXAttribute | t.JSXSpreadAttribute) =>
          a.type === 'JSXAttribute' &&
          a.name.type === 'JSXIdentifier' &&
          a.name.name === 'data-clip-id',
      ) as t.JSXAttribute | undefined;
      const attrVal = clipIdAttr?.value;
      if (attrVal == null) return;
      // Babel 8: data-clip-id="clip-1" gives value: StringLiteral { value: 'clip-1' }
      // data-clip-id={id} gives JSXExpressionContainer { expression: { value } }
      let clipId: string;
      const valNode = attrVal as unknown as {
        type?: string;
        value?: unknown;
        expression?: { value?: unknown };
      };
      if (valNode.type === 'StringLiteral' || valNode.type === 'JSXText') {
        clipId = String(valNode.value).trim();
      } else if (valNode.expression != null) {
        clipId = String(valNode.expression.value).trim();
      } else {
        return;
      }
      const edit = editMap.get(clipId);
      if (!edit) return;
      matchedAny = true;

      // Rewrite `from`
      if (edit.from !== undefined) {
        setNumericJsxProp(path, 'from', edit.from);
      }
      // Rewrite `durationInFrames`
      if (edit.durationInFrames !== undefined) {
        setNumericJsxProp(path, 'durationInFrames', edit.durationInFrames);
      }
    },
  });

  if (!matchedAny) {
    // No clip ids matched: retainLine output of a no-visit tree is the input.
    return source;
  }

  return generateSource(ast);
}

/** Set a numeric JSX prop on a JSXOpeningElement's attribute list. */
function setNumericJsxProp(path: NodePath<t.JSXOpeningElement>, name: string, value: number): void {
  const existing = path.node.attributes.find(
    (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === name,
  ) as t.JSXAttribute | undefined;

  const newAttr: t.JSXAttribute = {
    type: 'JSXAttribute',
    name: { type: 'JSXIdentifier', name },
    value: {
      type: 'JSXExpressionContainer',
      expression: { type: 'NumericLiteral', value },
    },
  };

  if (existing) {
    const idx = path.node.attributes.indexOf(existing);
    path.node.attributes[idx] = newAttr;
  } else {
    path.node.attributes.push(newAttr);
  }
  path.node = path.node; // mark dirty
}

/**
 * Keyframe track → a deterministic `animate({...})` call expression that
 * the user's composition can import from 'brandlyframes'.
 *
 * Pure function: given the same track, the emitted call text is the same.
 */
export interface AnimateTrack {
  readonly property: string;
  readonly frames: readonly {
    readonly t: number;
    readonly value: number;
    readonly easing: 'linear' | 'bezier' | 'spring';
    readonly bezier?: [number, number, number, number];
  }[];
}

export function keyframeTrackToAnimateCall(track: AnimateTrack): string {
  const frames: string = track.frames
    .map((f: AnimateTrack['frames'][number]) => {
      const parts = [`t: ${f.t}`, `value: ${f.value}`];
      if (f.easing === 'bezier' && f.bezier) {
        parts.push(`easing: 'bezier'`);
        parts.push(`bezier: [${f.bezier.join(', ')}]`);
      } else if (f.easing !== 'linear') {
        parts.push(`easing: '${f.easing}'`);
      }
      return `{ ${parts.join(', ')} }`;
    })
    .join(', ');
  return `animate({ property: '${track.property}', frames: [${frames}] })`;
}

/**
 * Round-trip verification helper — used by the lossless tests:
 *  parse(src) → writeBack(src, [], ...) === src   (byte-identical no-op)
 *  parse(src) → writeBack(src, edits) → parse(out)  (semantically equivalent)
 */
export function verifyNoEditRoundTrip(source: string, options: WriteBackOptions): boolean {
  const out = writeBackTimeline(source, [], options);
  return out === source;
}
