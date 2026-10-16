import { describe, it, expect } from 'vitest';
import {
  createBundlerOptions,
  generateHash,
  calculateBundleStats,
  createManifest,
  buildChunkGraph,
  optimizeChunkGraph,
  BundleEntry,
  BundleManifest,
} from '../src/index';

describe('bundler', () => {
  describe('createBundlerOptions', () => {
    it('should create default options', () => {
      const options = createBundlerOptions();
      expect(options.entryPoints).toEqual([]);
      expect(options.outputDir).toBe('dist');
      expect(options.publicPath).toBe('/');
      expect(options.chunkStrategy).toBe('split-by-type');
      expect(options.minify).toBe(true);
      expect(options.sourceMap).toBe(false);
      expect(options.target).toBe('es2022');
    });

    it('should override defaults', () => {
      const options = createBundlerOptions({
        entryPoints: ['src/main.ts'],
        outputDir: 'build',
        chunkStrategy: 'single',
      });
      expect(options.entryPoints).toEqual(['src/main.ts']);
      expect(options.outputDir).toBe('build');
      expect(options.chunkStrategy).toBe('single');
      expect(options.minify).toBe(true); // unchanged
    });
  });

  describe('generateHash', () => {
    it('should generate consistent hashes', () => {
      const hash1 = generateHash('test content');
      const hash2 = generateHash('test content');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generateHash('content 1');
      const hash2 = generateHash('content 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle Uint8Array', () => {
      const content = new TextEncoder().encode('test');
      const hash1 = generateHash('test');
      const hash2 = generateHash(content);
      expect(hash1).toBe(hash2);
    });

    it('should handle empty content', () => {
      const hash = generateHash('');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('calculateBundleStats', () => {
    const createTestEntries = (): BundleEntry[] => [
      { id: 'video1', path: 'video1.mp4', type: 'video', size: 1000, hash: 'abc123', dependencies: [] },
      { id: 'video2', path: 'video2.mp4', type: 'video', size: 2000, hash: 'def456', dependencies: [] },
      { id: 'audio1', path: 'audio1.mp3', type: 'audio', size: 500, hash: 'ghi789', dependencies: [] },
      { id: 'image1', path: 'image1.png', type: 'image', size: 300, hash: 'jkl012', dependencies: [] },
    ];

    it('should calculate correct total size', () => {
      const entries = createTestEntries();
      const manifest: BundleManifest = {
        version: '1.0.0',
        entries,
        chunks: [],
        assets: [],
      };

      const stats = calculateBundleStats(manifest);
      expect(stats.totalSize).toBe(3800);
      expect(stats.chunkCount).toBe(0);
      expect(stats.assetCount).toBe(0);
    });

    it('should group by type correctly', () => {
      const entries = createTestEntries();
      const manifest: BundleManifest = {
        version: '1.0.0',
        entries,
        chunks: [],
        assets: [],
      };

      const stats = calculateBundleStats(manifest);
      expect(stats.byType.video).toEqual({ count: 2, size: 3000 });
      expect(stats.byType.audio).toEqual({ count: 1, size: 500 });
      expect(stats.byType.image).toEqual({ count: 1, size: 300 });
    });

    it('should handle empty manifest', () => {
      const manifest: BundleManifest = {
        version: '1.0.0',
        entries: [],
        chunks: [],
        assets: [],
      };

      const stats = calculateBundleStats(manifest);
      expect(stats.totalSize).toBe(0);
      expect(stats.byType).toEqual({});
    });
  });

  describe('createManifest', () => {
    const createTestEntries = (): BundleEntry[] => [
      { id: 'video1', path: 'video1.mp4', type: 'video', size: 1000, hash: 'abc123', dependencies: ['dep1'] },
      { id: 'video2', path: 'video2.mp4', type: 'video', size: 2000, hash: 'def456', dependencies: ['dep1'] },
      { id: 'audio1', path: 'audio1.mp3', type: 'audio', size: 500, hash: 'ghi789', dependencies: ['dep2'] },
    ];

    it('should create manifest with single chunk strategy', () => {
      const entries = createTestEntries();
      const options = createBundlerOptions({ chunkStrategy: 'single' });
      const manifest = createManifest(entries, options);

      expect(manifest.version).toBe('1.0.0');
      expect(manifest.entries).toEqual(entries);
      expect(manifest.chunks).toHaveLength(1);
      expect(manifest.chunks[0].name).toBe('main');
      expect(manifest.chunks[0].type).toBe('initial');
      expect(manifest.chunks[0].entryIds).toHaveLength(3);
      expect(manifest.assets).toHaveLength(3);
    });

    it('should create manifest with split-by-type strategy', () => {
      const entries = createTestEntries();
      const options = createBundlerOptions({ chunkStrategy: 'split-by-type' });
      const manifest = createManifest(entries, options);

      expect(manifest.chunks).toHaveLength(2);
      const chunkNames = manifest.chunks.map(c => c.name).sort();
      expect(chunkNames).toEqual(['audio', 'video']);
      // First chunk should be initial
      const initialChunk = manifest.chunks.find(c => c.type === 'initial');
      expect(initialChunk).toBeDefined();
    });

    it('should create manifest with split-by-dependency strategy', () => {
      const entries = createTestEntries();
      const options = createBundlerOptions({ chunkStrategy: 'split-by-dependency' });
      const manifest = createManifest(entries, options);

      // Two dependency groups: [dep1] and [dep2]
      expect(manifest.chunks).toHaveLength(2);
    });
  });

  describe('buildChunkGraph', () => {
    it('should build graph from manifest', () => {
      const entries: BundleEntry[] = [
        { id: 'e1', path: 'a.ts', type: 'script', size: 100, hash: 'h1', dependencies: ['dep1'] },
        { id: 'e2', path: 'b.ts', type: 'script', size: 200, hash: 'h2', dependencies: ['dep1', 'dep2'] },
      ];

      const manifest: BundleManifest = {
        version: '1.0.0',
        entries,
        chunks: [
          { name: 'chunk1', entryIds: ['e1'], size: 100, hash: 'ch1', type: 'initial' },
          { name: 'chunk2', entryIds: ['e2'], size: 200, hash: 'ch2', type: 'async' },
        ],
        assets: [],
      };

      const graph = buildChunkGraph(manifest);

      expect(graph.nodes.size).toBe(2);
      expect(graph.nodes.has('chunk1')).toBe(true);
      expect(graph.nodes.has('chunk2')).toBe(true);
      expect(graph.edges.size).toBe(2);
      // chunk1 and chunk2 share dep1, so should have edge
      expect(graph.edges.get('chunk1')!.has('chunk2')).toBe(true);
      expect(graph.edges.get('chunk2')!.has('chunk1')).toBe(true);
    });
  });

  describe('optimizeChunkGraph', () => {
    it('should warn on oversized chunks', () => {
      const graph = {
        nodes: new Map<string, { id: string; entries: never[]; size: number; hash: string }>([
          ['chunk1', { id: 'chunk1', entries: [], size: 1000000, hash: 'h1' }],
        ]),
        edges: new Map<string, Set<string>>([['chunk1', new Set<string>()]]),
      };

      // Should not throw, just warn
      const result = optimizeChunkGraph(graph, { maxChunkSize: 500000 });
      expect(result.nodes.size).toBe(1);
    });

    it('should keep chunks under limit', () => {
      const graph = {
        nodes: new Map<string, { id: string; entries: never[]; size: number; hash: string }>([
          ['chunk1', { id: 'chunk1', entries: [], size: 100000, hash: 'h1' }],
        ]),
        edges: new Map<string, Set<string>>([['chunk1', new Set<string>()]]),
      };

      const result = optimizeChunkGraph(graph, { maxChunkSize: 500000 });
      expect(result.nodes.size).toBe(1);
    });
  });
});