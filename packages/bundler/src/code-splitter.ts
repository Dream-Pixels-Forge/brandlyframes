/**
 * Code splitter for BrandlyFrames bundler
 * Implements various code splitting strategies
 */

import type { BundleEntry, BundleChunk, BundlerOptions } from './index';

export interface SplitStrategy {
  name: string;
  split(entries: BundleEntry[], options: BundlerOptions): BundleChunk[];
}

export interface SplitResult {
  chunks: BundleChunk[];
  entryToChunk: Map<string, string>;
  sharedDependencies: Map<string, string[]>;
}

/**
 * Single chunk strategy - everything in one bundle
 */
export const singleChunkStrategy: SplitStrategy = {
  name: 'single',
  split(entries: BundleEntry[], _options: BundlerOptions): BundleChunk[] {
    const allEntryIds = entries.map(e => e.id);
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const content = allEntryIds.sort().join(',');

    return [{
      name: 'main',
      entryIds: allEntryIds,
      size: totalSize,
      hash: generateHash(content),
      type: 'initial',
    }];
  },
};

/**
 * Split by asset type strategy
 */
export const splitByTypeStrategy: SplitStrategy = {
  name: 'split-by-type',
  split(entries: BundleEntry[], _options: BundlerOptions): BundleChunk[] {
    const byType = new Map<string, BundleEntry[]>();

    for (const entry of entries) {
      if (!byType.has(entry.type)) {
        byType.set(entry.type, []);
      }
      byType.get(entry.type)!.push(entry);
    }

    const chunks: BundleChunk[] = [];
    let chunkIndex = 0;

    for (const [type, typeEntries] of byType) {
      const entryIds = typeEntries.map(e => e.id);
      const size = typeEntries.reduce((sum, e) => sum + e.size, 0);
      const content = entryIds.sort().join(',');

      chunks.push({
        name: type,
        entryIds,
        size,
        hash: generateHash(content),
        type: chunkIndex === 0 ? 'initial' : 'async',
      });
      chunkIndex++;
    }

    return chunks;
  },
};

/**
 * Split by dependency strategy - group entries with shared dependencies
 */
export const splitByDependencyStrategy: SplitStrategy = {
  name: 'split-by-dependency',
  split(entries: BundleEntry[], _options: BundlerOptions): BundleChunk[] {
    // Group by dependency signature
    const depGroups = new Map<string, BundleEntry[]>();

    for (const entry of entries) {
      const depSignature = entry.dependencies.sort().join('|');
      if (!depGroups.has(depSignature)) {
        depGroups.set(depSignature, []);
      }
      depGroups.get(depSignature)!.push(entry);
    }

    const chunks: BundleChunk[] = [];
    let chunkIndex = 0;

    for (const [depSig, groupEntries] of depGroups) {
      const entryIds = groupEntries.map(e => e.id);
      const size = groupEntries.reduce((sum, e) => sum + e.size, 0);
      const content = entryIds.sort().join(',');

      chunks.push({
        name: `chunk-${chunkIndex}`,
        entryIds,
        size,
        hash: generateHash(content),
        type: chunkIndex === 0 ? 'initial' : 'async',
      });
      chunkIndex++;
    }

    return chunks;
  },
};

/**
 * Smart splitting - combines type and dependency awareness
 */
export const smartSplitStrategy: SplitStrategy = {
  name: 'smart',
  split(entries: BundleEntry[], options: BundlerOptions): BundleChunk[] {
    // First, separate vendor/third-party from app code
    const vendorEntries: BundleEntry[] = [];
    const appEntries: BundleEntry[] = [];

    for (const entry of entries) {
      const isVendor = entry.path.includes('node_modules') ||
                      entry.path.startsWith('@') ||
                      entry.dependencies.some(d => d.includes('node_modules'));
      if (isVendor) {
        vendorEntries.push(entry);
      } else {
        appEntries.push(entry);
      }
    }

    const chunks: BundleChunk[] = [];
    let chunkIndex = 0;

    // Vendor chunk (if any)
    if (vendorEntries.length > 0) {
      const entryIds = vendorEntries.map(e => e.id);
      const size = vendorEntries.reduce((sum, e) => sum + e.size, 0);
      const content = entryIds.sort().join(',');

      chunks.push({
        name: 'vendor',
        entryIds,
        size,
        hash: generateHash(content),
        type: 'initial',
      });
      chunkIndex++;
    }

    // App chunks by type
    const byType = new Map<string, BundleEntry[]>();
    for (const entry of appEntries) {
      if (!byType.has(entry.type)) {
        byType.set(entry.type, []);
      }
      byType.get(entry.type)!.push(entry);
    }

    for (const [type, typeEntries] of byType) {
      const entryIds = typeEntries.map(e => e.id);
      const size = typeEntries.reduce((sum, e) => sum + e.size, 0);
      const content = entryIds.sort().join(',');

      chunks.push({
        name: type,
        entryIds,
        size,
        hash: generateHash(content),
        type: chunkIndex === 0 ? 'initial' : 'async',
      });
      chunkIndex++;
    }

    return chunks;
  },
};

/**
 * Get strategy by name
 */
export function getSplitStrategy(name: string): SplitStrategy {
  switch (name) {
    case 'single':
      return singleChunkStrategy;
    case 'split-by-type':
      return splitByTypeStrategy;
    case 'split-by-dependency':
      return splitByDependencyStrategy;
    case 'smart':
      return smartSplitStrategy;
    default:
      return splitByTypeStrategy; // default
  }
}

/**
 * Execute code splitting with a strategy
 */
export function splitCode(
  entries: BundleEntry[],
  options: BundlerOptions,
  strategyName?: string
): SplitResult {
  const strategy = getSplitStrategy(strategyName || options.chunkStrategy);
  const chunks = strategy.split(entries, options);

  // Build entry-to-chunk mapping
  const entryToChunk = new Map<string, string>();
  for (const chunk of chunks) {
    for (const entryId of chunk.entryIds) {
      entryToChunk.set(entryId, chunk.name);
    }
  }

  // Find shared dependencies across chunks
  const sharedDependencies = new Map<string, string[]>();
  const depToChunks = new Map<string, Set<string>>();

  for (const chunk of chunks) {
    const chunkEntries = entries.filter(e => chunk.entryIds.includes(e.id));
    const allDeps = new Set(chunkEntries.flatMap(e => e.dependencies));

    for (const dep of allDeps) {
      if (!depToChunks.has(dep)) {
        depToChunks.set(dep, new Set());
      }
      depToChunks.get(dep)!.add(chunk.name);
    }
  }

  for (const [dep, chunkNames] of depToChunks) {
    if (chunkNames.size > 1) {
      sharedDependencies.set(dep, Array.from(chunkNames));
    }
  }

  return { chunks, entryToChunk, sharedDependencies };
}

/**
 * Generate hash for content
 */
function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Optimize chunks for size constraints
 */
export function optimizeChunks(
  chunks: BundleChunk[],
  maxChunkSize: number
): BundleChunk[] {
  const optimized: BundleChunk[] = [];

  for (const chunk of chunks) {
    if (chunk.size <= maxChunkSize) {
      optimized.push(chunk);
      continue;
    }

    // Split large chunk (simplified - would need actual entry splitting)
    console.warn(`Chunk ${chunk.name} exceeds max size: ${chunk.size} > ${maxChunkSize}`);
    optimized.push(chunk);
  }

  return optimized;
}

export * from './index';