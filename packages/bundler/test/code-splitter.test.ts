import { describe, it, expect } from 'vitest';
import {
  singleChunkStrategy,
  splitByTypeStrategy,
  splitByDependencyStrategy,
  smartSplitStrategy,
  getSplitStrategy,
  splitCode,
  optimizeChunks,
  BundleEntry,
  BundlerOptions,
  BundleChunk,
} from '../src/code-splitter';

describe('code-splitter', () => {
  const createTestEntries = (): BundleEntry[] => [
    { id: 'video1', path: 'video1.mp4', type: 'video', size: 1000, hash: 'h1', dependencies: [] },
    { id: 'video2', path: 'video2.mp4', type: 'video', size: 2000, hash: 'h2', dependencies: [] },
    { id: 'audio1', path: 'audio1.mp3', type: 'audio', size: 500, hash: 'h3', dependencies: [] },
    { id: 'image1', path: 'image1.png', type: 'image', size: 300, hash: 'h4', dependencies: [] },
    { id: 'script1', path: 'script1.ts', type: 'script', size: 200, hash: 'h5', dependencies: ['dep1'] },
    { id: 'script2', path: 'script2.ts', type: 'script', size: 150, hash: 'h6', dependencies: ['dep1', 'dep2'] },
  ];

  const createOptions = (overrides: Partial<BundlerOptions> = {}): BundlerOptions => ({
    entryPoints: [],
    outputDir: 'dist',
    publicPath: '/',
    chunkStrategy: 'split-by-type',
    minify: true,
    sourceMap: false,
    target: 'es2022',
    ...overrides,
  });

  describe('singleChunkStrategy', () => {
    it('should create single chunk with all entries', () => {
      const entries = createTestEntries();
      const chunks = singleChunkStrategy.split(entries, createOptions());

      expect(chunks).toHaveLength(1);
      expect(chunks[0].name).toBe('main');
      expect(chunks[0].type).toBe('initial');
      expect(chunks[0].entryIds).toHaveLength(6);
      expect(chunks[0].size).toBe(4150);
    });
  });

  describe('splitByTypeStrategy', () => {
    it('should create chunks by type', () => {
      const entries = createTestEntries();
      const chunks = splitByTypeStrategy.split(entries, createOptions());

      expect(chunks).toHaveLength(4); // video, audio, image, script
      const names = chunks.map(c => c.name).sort();
      expect(names).toEqual(['audio', 'image', 'script', 'video']);

      // First chunk should be initial
      const initial = chunks.find(c => c.type === 'initial');
      expect(initial).toBeDefined();
    });

    it('should calculate correct sizes per type', () => {
      const entries = createTestEntries();
      const chunks = splitByTypeStrategy.split(entries, createOptions());

      const videoChunk = chunks.find(c => c.name === 'video')!;
      expect(videoChunk.size).toBe(3000); // 1000 + 2000
      expect(videoChunk.entryIds).toHaveLength(2);

      const scriptChunk = chunks.find(c => c.name === 'script')!;
      expect(scriptChunk.size).toBe(350); // 200 + 150
      expect(scriptChunk.entryIds).toHaveLength(2);
    });
  });

  describe('splitByDependencyStrategy', () => {
    it('should group by dependency signature', () => {
      const entries = createTestEntries();
      const chunks = splitByDependencyStrategy.split(entries, createOptions());

      // script1 has [dep1], script2 has [dep1, dep2], others have []
      // So we expect 3 groups: [], [dep1], [dep1,dep2]
      expect(chunks).toHaveLength(3);
    });
  });

  describe('smartSplitStrategy', () => {
    it('should separate vendor from app code', () => {
      const entries: BundleEntry[] = [
        { id: 'vendor1', path: 'node_modules/react/index.js', type: 'script', size: 1000, hash: 'h1', dependencies: [] },
        { id: 'app1', path: 'src/app.ts', type: 'script', size: 500, hash: 'h2', dependencies: [] },
      ];

      const chunks = smartSplitStrategy.split(entries, createOptions());

      expect(chunks).toHaveLength(2);
      const vendorChunk = chunks.find(c => c.name === 'vendor');
      expect(vendorChunk).toBeDefined();
      expect(vendorChunk!.entryIds).toContain('vendor1');
      expect(vendorChunk!.type).toBe('initial');
    });

    it('should handle no vendor entries', () => {
      const entries = createTestEntries().filter(e => !e.path.includes('node_modules'));
      const chunks = smartSplitStrategy.split(entries, createOptions());

      // Should only have app chunks by type
      const names = chunks.map(c => c.name).sort();
      expect(names).toEqual(['audio', 'image', 'script', 'video']);
    });
  });

  describe('getSplitStrategy', () => {
    it('should return correct strategy by name', () => {
      expect(getSplitStrategy('single')).toBe(singleChunkStrategy);
      expect(getSplitStrategy('split-by-type')).toBe(splitByTypeStrategy);
      expect(getSplitStrategy('split-by-dependency')).toBe(splitByDependencyStrategy);
      expect(getSplitStrategy('smart')).toBe(smartSplitStrategy);
    });

    it('should default to split-by-type for unknown names', () => {
      expect(getSplitStrategy('unknown')).toBe(splitByTypeStrategy);
    });
  });

  describe('splitCode', () => {
    it('should return chunks and entry-to-chunk mapping', () => {
      const entries = createTestEntries();
      const options = createOptions({ chunkStrategy: 'split-by-type' });
      const result = splitCode(entries, options);

      expect(result.chunks).toHaveLength(4);
      expect(result.entryToChunk.size).toBe(6);

      // All entries should be mapped
      for (const entry of entries) {
        expect(result.entryToChunk.has(entry.id)).toBe(true);
      }
    });

    it('should identify shared dependencies', () => {
      const entries: BundleEntry[] = [
        { id: 'a', path: 'a.ts', type: 'script', size: 100, hash: 'h1', dependencies: ['shared', 'depA'] },
        { id: 'b', path: 'b.ts', type: 'script', size: 100, hash: 'h2', dependencies: ['shared', 'depB'] },
        { id: 'c', path: 'c.ts', type: 'script', size: 100, hash: 'h3', dependencies: ['other'] },
      ];

      const options = createOptions({ chunkStrategy: 'split-by-dependency' });
      const result = splitCode(entries, options);

      // 'shared' appears in both chunk for 'a' and chunk for 'b' (different dep signatures)
      expect(result.sharedDependencies.has('shared')).toBe(true);
      expect(result.sharedDependencies.get('shared')).toHaveLength(2);
      expect(result.sharedDependencies.has('other')).toBe(false); // only in one chunk
    });
  });

  describe('optimizeChunks', () => {
    it('should keep chunks under limit', () => {
      const chunks: BundleChunk[] = [
        { name: 'small', entryIds: ['a'], size: 100, hash: 'h1', type: 'initial' },
        { name: 'large', entryIds: ['b'], size: 1000000, hash: 'h2', type: 'async' },
      ];

      const result = optimizeChunks(chunks, 500000);

      expect(result).toHaveLength(2);
      // Large chunk should still be there but with warning logged
    });

    it('should pass through chunks under limit', () => {
      const chunks: BundleChunk[] = [
        { name: 'chunk1', entryIds: ['a'], size: 100, hash: 'h1', type: 'initial' },
      ];

      const result = optimizeChunks(chunks, 500000);
      expect(result).toEqual(chunks);
    });
  });
});