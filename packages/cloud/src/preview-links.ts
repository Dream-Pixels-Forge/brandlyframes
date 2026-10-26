/**
 * Shareable cloud preview links (BF-300).
 *
 * Link builder with frame-accurate comment anchors (`#frame=123&t=4.1`,
 * `t` derived exactly as `frame / fps` — never rounded) plus the comment
 * store interface and an in-memory adapter. Pure string building; no
 * network, no cloud calls.
 */

/** Options for {@link buildPreviewLink}. */
export interface PreviewLinkOptions {
  /** Base URL of the hosted preview (no fragment). */
  readonly baseUrl: string;
  /** Composition the link opens. */
  readonly compositionId: string;
  /** Anchor frame (>= 0). */
  readonly frame: number;
  /** Composition fps used for the exact `t` (must be > 0). */
  readonly fps?: number;
}

/** Default fps for anchor time computation. */
const DEFAULT_PREVIEW_FPS = 30;

/**
 * Builds a shareable preview link with a frame-accurate anchor:
 * `<baseUrl>?composition=<id>#frame=<frame>&t=<frame/fps>`.
 */
export function buildPreviewLink(options: PreviewLinkOptions): string {
  const fps = options.fps ?? DEFAULT_PREVIEW_FPS;
  if (!Number.isInteger(options.frame) || options.frame < 0) {
    throw new RangeError(
      `buildPreviewLink: frame must be an integer >= 0, got ${options.frame}`
    );
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError(`buildPreviewLink: fps must be a finite number > 0, got ${fps}`);
  }
  const base = options.baseUrl.split('#')[0]!;
  const separator = base.includes('?') ? '&' : '?';
  const query = `${separator}composition=${encodeURIComponent(options.compositionId)}`;
  // Full double precision: the anchor must round-trip to the same frame.
  const t = options.frame / fps;
  return `${base}${query}#frame=${options.frame}&t=${t}`;
}

/** Parsed preview link anchor. */
export interface ParsedPreviewLink {
  /** Composition id from the query. */
  readonly compositionId: string;
  /** Anchor frame number. */
  readonly frame: number;
  /** Anchor time in seconds (exactly `frame / fps` as embedded). */
  readonly tSeconds: number;
}

/**
 * Parses a preview link built by {@link buildPreviewLink} (or an equivalent
 * hand-written anchor). Throws RangeError on missing/malformed anchors.
 */
export function parsePreviewLink(url: string): ParsedPreviewLink {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new RangeError(`parsePreviewLink: not a valid URL: ${url}`);
  }
  const anchor = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const params = new URLSearchParams(anchor);
  const frameRaw = params.get('frame');
  const tRaw = params.get('t');
  if (frameRaw === null || tRaw === null) {
    throw new RangeError(`parsePreviewLink: missing #frame=&t= anchor in ${url}`);
  }
  const frame = Number(frameRaw);
  const tSeconds = Number(tRaw);
  if (!Number.isInteger(frame) || frame < 0 || !Number.isFinite(tSeconds)) {
    throw new RangeError(`parsePreviewLink: malformed anchor frame=${frameRaw} t=${tRaw}`);
  }
  return {
    compositionId: parsed.searchParams.get('composition') ?? '',
    frame,
    tSeconds,
  };
}

// ============================================================================
// Comment store (BF-300)
// ============================================================================

/** Input for adding a comment anchored to a composition frame. */
export interface PreviewCommentInput {
  /** Composition the comment anchors to. */
  readonly compositionId: string;
  /** Anchor frame (frame-accurate). */
  readonly frame: number;
  /** Comment author. */
  readonly author: string;
  /** Comment body. */
  readonly body: string;
  /** fps used for the derived `tSeconds` (default 30). */
  readonly fps?: number;
}

/** A frame-anchored preview comment. */
export interface PreviewComment {
  /** Unique comment id. */
  readonly id: string;
  readonly compositionId: string;
  /** Anchor frame. */
  readonly frame: number;
  /** Anchor time in seconds (exactly `frame / fps`). */
  readonly tSeconds: number;
  readonly author: string;
  readonly body: string;
  /** Created timestamp (mocked clock). */
  readonly createdAt: number;
  /** Whether the comment was resolved. */
  readonly resolved: boolean;
}

/** Filter for {@link PreviewCommentStore.list}. */
export interface PreviewCommentListFilter {
  /** Composition to list comments for. */
  readonly compositionId: string;
  /** Optional exact frame anchor filter. */
  readonly frame?: number;
}

/** Comment store interface (BF-300) — pluggable backend adapter seam. */
export interface PreviewCommentStore {
  /** Adds a comment and returns it with id/derived anchor time. */
  add(input: PreviewCommentInput): Promise<PreviewComment>;
  /** Fetches one comment by id (undefined when missing). */
  get(id: string): Promise<PreviewComment | undefined>;
  /** Lists comments for a composition, optionally at an exact frame. */
  list(filter: PreviewCommentListFilter): Promise<PreviewComment[]>;
  /** Sets the resolved flag; throws RangeError for unknown ids. */
  setResolved(id: string, resolved: boolean): Promise<PreviewComment>;
}

/** Options for {@link InMemoryCommentStore}. */
export interface InMemoryCommentStoreOptions {
  /** Mocked clock for `createdAt` (default: Date.now). */
  readonly clock?: () => number;
}

/** In-memory comment store adapter (default for tests and local use). */
export class InMemoryCommentStore implements PreviewCommentStore {
  private readonly comments = new Map<string, PreviewComment>();
  private readonly clock: () => number;
  private counter = 0;

  constructor(options: InMemoryCommentStoreOptions = {}) {
    this.clock = options.clock ?? (() => Date.now());
  }

  async add(input: PreviewCommentInput): Promise<PreviewComment> {
    const fps = input.fps ?? DEFAULT_PREVIEW_FPS;
    if (!Number.isInteger(input.frame) || input.frame < 0) {
      throw new RangeError(
        `InMemoryCommentStore.add: frame must be an integer >= 0, got ${input.frame}`
      );
    }
    this.counter += 1;
    const comment: PreviewComment = {
      id: `comment-${this.counter}`,
      compositionId: input.compositionId,
      frame: input.frame,
      tSeconds: input.frame / fps,
      author: input.author,
      body: input.body,
      createdAt: this.clock(),
      resolved: false,
    };
    this.comments.set(comment.id, comment);
    return comment;
  }

  async get(id: string): Promise<PreviewComment | undefined> {
    return this.comments.get(id);
  }

  async list(filter: PreviewCommentListFilter): Promise<PreviewComment[]> {
    const result: PreviewComment[] = [];
    for (const comment of this.comments.values()) {
      if (comment.compositionId !== filter.compositionId) continue;
      if (filter.frame !== undefined && comment.frame !== filter.frame) continue;
      result.push(comment);
    }
    return result.sort((a, b) => a.frame - b.frame || a.createdAt - b.createdAt);
  }

  async setResolved(id: string, resolved: boolean): Promise<PreviewComment> {
    const comment = this.comments.get(id);
    if (!comment) {
      throw new RangeError(`InMemoryCommentStore.setResolved: unknown id ${id}`);
    }
    const updated: PreviewComment = { ...comment, resolved };
    this.comments.set(id, updated);
    return updated;
  }
}
