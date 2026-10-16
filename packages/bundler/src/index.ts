/**
 * @brandlyframes/bundler
 * Asset bundling, code splitting, and output optimization for BrandlyFrames
 */

export interface BundleEntry {
  id: string;
  path: string;
  type: 'video' | 'audio' | 'image' | 'font' | 'script' | 'data';
  size: number;
  hash: string;
  dependencies: string[];
}

export interface BundleManifest {
  version: string;
  entries: BundleEntry[];
  chunks: BundleChunk[];
  assets: BundleAsset[];
}

export interface BundleChunk {
  name: string;
  entryIds: string[];
  size: number;
  hash: string;
  type: 'initial' | 'async' | 'shared';
}

export interface BundleAsset {
  name: string;
  source: string;
  size: number;
  hash: string;
}

export interface BundlerOptions {
  entryPoints: string[];
  outputDir: string;
  publicPath: string;
  chunkStrategy: 'single' | 'split-by-type' | 'split-by-dependency';
  minify: boolean;
  sourceMap: boolean;
  target: 'es2022' | 'es2023' | 'es2024';
}

export interface BundlerResult {
  manifest: BundleManifest;
  outputFiles: Map<string, string>;
  stats: {
    totalSize: number;
    chunkCount: number;
    assetCount: number;
    buildTimeMs: number;
  };
}

export interface ChunkGraph {
  nodes: Map<string, ChunkNode>;
  edges: Map<string, Set<string>>;
}

export interface ChunkNode {
  id: string;
  entries: BundleEntry[];
  size: number;
  hash: string;
}

/**
 * Create a default bundler configuration
 */
export function createBundlerOptions(overrides: Partial<BundlerOptions> = {}): BundlerOptions {
  return {
    entryPoints: [],
    outputDir: 'dist',
    publicPath: '/',
    chunkStrategy: 'split-by-type',
    minify: true,
    sourceMap: false,
    target: 'es2022',
    ...overrides,
  };
}

/**
 * Generate a content hash for cache busting
 */
export function generateHash(content: string | Uint8Array): string {
  const str = typeof content === 'string' ? content : new TextDecoder().decode(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Calculate bundle statistics
 */
export function calculateBundleStats(manifest: BundleManifest): {
  totalSize: number;
  chunkCount: number;
  assetCount: number;
  byType: Record<string, { count: number; size: number }>;
} {
  const byType: Record<string, { count: number; size: number }> = {};
  let totalSize = 0;

  for (const entry of manifest.entries) {
    totalSize += entry.size;
    if (!byType[entry.type]) {
      byType[entry.type] = { count: 0, size: 0 };
    }
    byType[entry.type].count++;
    byType[entry.type].size += entry.size;
  }

  return {
    totalSize,
    chunkCount: manifest.chunks.length,
    assetCount: manifest.assets.length,
    byType,
  };
}

/**
 * Create a bundle manifest from entries
 */
export function createManifest(
  entries: BundleEntry[],
  options: BundlerOptions
): BundleManifest {
  const chunks = createChunks(entries, options.chunkStrategy);
  const assets = createAssets(entries, options);

  return {
    version: '1.0.0',
    entries,
    chunks,
    assets,
  };
}

/**
 * Create chunks based on strategy
 */
function createChunks(entries: BundleEntry[], strategy: BundlerOptions['chunkStrategy']): BundleChunk[] {
  const chunks: BundleChunk[] = [];

  switch (strategy) {
    case 'single': {
      const allEntries = entries.map(e => e.id);
      const size = entries.reduce((sum, e) => sum + e.size, 0);
      const content = allEntries.join(',');
      chunks.push({
        name: 'main',
        entryIds: allEntries,
        size,
        hash: generateHash(content),
        type: 'initial',
      });
      break;
    }

    case 'split-by-type': {
      const byType = new Map<string, BundleEntry[]>();
      for (const entry of entries) {
        if (!byType.has(entry.type)) {
          byType.set(entry.type, []);
        }
        byType.get(entry.type)!.push(entry);
      }

      let chunkIndex = 0;
      for (const [type, typeEntries] of byType) {
        const entryIds = typeEntries.map(e => e.id);
        const size = typeEntries.reduce((sum, e) => sum + e.size, 0);
        const content = entryIds.join(',');
        chunks.push({
          name: type,
          entryIds,
          size,
          hash: generateHash(content),
          type: chunkIndex === 0 ? 'initial' : 'async',
        });
        chunkIndex++;
      }
      break;
    }

    case 'split-by-dependency': {
      // Simplified: group by shared dependencies
      const depGroups = new Map<string, BundleEntry[]>();
      for (const entry of entries) {
        const depKey = entry.dependencies.sort().join(',');
        if (!depGroups.has(depKey)) {
          depGroups.set(depKey, []);
        }
        depGroups.get(depKey)!.push(entry);
      }

      let chunkIndex = 0;
      for (const [_depKey, groupEntries] of depGroups) {
        const entryIds = groupEntries.map(e => e.id);
        const size = groupEntries.reduce((sum, e) => sum + e.size, 0);
        const content = entryIds.join(',');
        chunks.push({
          name: `chunk-${chunkIndex}`,
          entryIds,
          size,
          hash: generateHash(content),
          type: chunkIndex === 0 ? 'initial' : 'async',
        });
        chunkIndex++;
      }
      break;
    }
  }

  return chunks;
}

/**
 * Create asset list from entries
 */
function createAssets(entries: BundleEntry[], _options: BundlerOptions): BundleAsset[] {
  return entries.map(entry => ({
    name: `${entry.id}.${entry.type}`,
    source: entry.path,
    size: entry.size,
    hash: entry.hash,
  }));
}

/**
 * Build a chunk dependency graph
 */
export function buildChunkGraph(manifest: BundleManifest): ChunkGraph {
  const nodes = new Map<string, ChunkNode>();
  const edges = new Map<string, Set<string>>();

  for (const chunk of manifest.chunks) {
    const chunkEntries = manifest.entries.filter(e => chunk.entryIds.includes(e.id));
    nodes.set(chunk.name, {
      id: chunk.name,
      entries: chunkEntries,
      size: chunk.size,
      hash: chunk.hash,
    });
    edges.set(chunk.name, new Set());
  }

  // Add dependency edges (simplified - based on shared entry dependencies)
  for (const chunk of manifest.chunks) {
    const chunkEntries = manifest.entries.filter(e => chunk.entryIds.includes(e.id));
    const allDeps = new Set(chunkEntries.flatMap(e => e.dependencies));

    for (const otherChunk of manifest.chunks) {
      if (otherChunk.name === chunk.name) continue;
      const otherEntries = manifest.entries.filter(e => otherChunk.entryIds.includes(e.id));
      const otherDeps = new Set(otherEntries.flatMap(e => e.dependencies));

      // Check for shared dependencies
      const shared = [...allDeps].filter(d => otherDeps.has(d));
      if (shared.length > 0) {
        edges.get(chunk.name)!.add(otherChunk.name);
      }
    }
  }

  return { nodes, edges };
}

/**
 * Optimize chunk graph for loading
 */
export function optimizeChunkGraph(graph: ChunkGraph, options: { maxChunkSize: number }): ChunkGraph {
  // Simplified optimization - in reality this would do more complex graph analysis
  const { nodes, edges } = graph;
  const optimizedNodes = new Map<string, ChunkNode>();

  for (const [name, node] of nodes) {
    if (node.size > options.maxChunkSize) {
      // Would split large chunks in real implementation
      console.warn(`Chunk ${name} exceeds max size (${node.size} > ${options.maxChunkSize})`);
    }
    optimizedNodes.set(name, node);
  }

  return { nodes: optimizedNodes, edges };
}

export * from './asset-resolver';
export * from './code-splitter';
export * from './output-optimizer';