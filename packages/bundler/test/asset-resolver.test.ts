import { describe, it, expect } from 'vitest';
import {
  createResolverOptions,
  resolveAssetPath,
  getAssetType,
  extractImports,
  extractExports,
  createAssetResolution,
  createDependencyGraph,
  AssetResolution,
  ResolverOptions,
} from '../src/asset-resolver';

describe('asset-resolver', () => {
  describe('createResolverOptions', () => {
    it('should create default options', () => {
      const options = createResolverOptions();
      expect(options.rootDir).toBe(process.cwd());
      expect(options.alias).toEqual({});
      expect(options.extensions).toContain('.ts');
      expect(options.extensions).toContain('.mp4');
      expect(options.resolveSymlinks).toBe(true);
    });

    it('should override defaults', () => {
      const options = createResolverOptions({
        rootDir: '/custom',
        alias: { '@': '/src' },
      });
      expect(options.rootDir).toBe('/custom');
      expect(options.alias['@']).toBe('/src');
    });
  });

  describe('resolveAssetPath', () => {
    it('should resolve aliases', () => {
      const options = createResolverOptions({ alias: { '@': '/src' } });
      expect(resolveAssetPath('@/components/Button', options)).toBe('/src/components/Button');
    });

    it('should pass through relative paths', () => {
      const options = createResolverOptions();
      expect(resolveAssetPath('./local/file.ts', options)).toBe('./local/file.ts');
      expect(resolveAssetPath('../parent/file.ts', options)).toBe('../parent/file.ts');
    });

    it('should pass through absolute paths', () => {
      const options = createResolverOptions();
      expect(resolveAssetPath('/absolute/path.ts', options)).toBe('/absolute/path.ts');
    });

    it('should pass through bare imports', () => {
      const options = createResolverOptions();
      expect(resolveAssetPath('lodash', options)).toBe('lodash');
      expect(resolveAssetPath('@scope/package', options)).toBe('@scope/package');
    });
  });

  describe('getAssetType', () => {
    it('should identify video types', () => {
      expect(getAssetType('video.mp4')).toBe('video');
      expect(getAssetType('video.webm')).toBe('video');
      expect(getAssetType('video.MOV')).toBe('video');
    });

    it('should identify audio types', () => {
      expect(getAssetType('audio.mp3')).toBe('audio');
      expect(getAssetType('audio.wav')).toBe('audio');
      expect(getAssetType('audio.OGG')).toBe('audio');
    });

    it('should identify image types', () => {
      expect(getAssetType('image.png')).toBe('image');
      expect(getAssetType('image.jpg')).toBe('image');
      expect(getAssetType('image.webp')).toBe('image');
      expect(getAssetType('image.SVG')).toBe('image');
    });

    it('should identify font types', () => {
      expect(getAssetType('font.ttf')).toBe('font');
      expect(getAssetType('font.woff')).toBe('font');
      expect(getAssetType('font.woff2')).toBe('font');
    });

    it('should identify script types', () => {
      expect(getAssetType('script.js')).toBe('script');
      expect(getAssetType('script.ts')).toBe('script');
      expect(getAssetType('script.tsx')).toBe('script');
    });

    it('should default to data for unknown types', () => {
      expect(getAssetType('file.xyz')).toBe('data');
      expect(getAssetType('file')).toBe('data');
    });
  });

  describe('extractImports', () => {
    it('should extract ES6 imports', () => {
      const source = `import foo from 'foo';
import { bar } from 'bar';
import * as baz from 'baz';`;
      const imports = extractImports(source);
      expect(imports).toContain('foo');
      expect(imports).toContain('bar');
      expect(imports).toContain('baz');
    });

    it('should extract CommonJS requires', () => {
      const source = `const foo = require('foo');
const { bar } = require('bar');`;
      const imports = extractImports(source);
      expect(imports).toContain('foo');
      expect(imports).toContain('bar');
    });

    it('should extract dynamic imports', () => {
      const source = `const foo = await import('foo');
import('bar').then(m => m.default);`;
      const imports = extractImports(source);
      expect(imports).toContain('foo');
      expect(imports).toContain('bar');
    });

    it('should deduplicate imports', () => {
      const source = `import foo from 'foo';
import bar from 'foo';`;
      const imports = extractImports(source);
      expect(imports.filter(i => i === 'foo')).toHaveLength(1);
    });

    it('should handle empty source', () => {
      expect(extractImports('')).toEqual([]);
    });
  });

  describe('extractExports', () => {
    it('should extract named exports', () => {
      const source = `export const foo = 1;
export function bar() {}
export class Baz {}
export interface Qux {}
export type Quux = string;`;
      const exports = extractExports(source);
      expect(exports).toContain('foo');
      expect(exports).toContain('bar');
      expect(exports).toContain('Baz');
      expect(exports).toContain('Qux');
      expect(exports).toContain('Quux');
    });

    it('should detect default export', () => {
      const source = `export default function() {}`;
      const exports = extractExports(source);
      expect(exports).toContain('default');
    });

    it('should extract re-exports', () => {
      const source = `export * from './module';`;
      const exports = extractExports(source);
      expect(exports).toContain('* from ./module');
    });

    it('should handle empty source', () => {
      expect(extractExports('')).toEqual([]);
    });
  });

  describe('createAssetResolution', () => {
    it('should create resolution with correct properties', () => {
      const options = createResolverOptions();
      const resolution = createAssetResolution(
        'test-id',
        './test.ts',
        '/resolved/test.ts',
        'export const x = 1;',
        options
      );

      expect(resolution.id).toBe('test-id');
      expect(resolution.originalPath).toBe('./test.ts');
      expect(resolution.resolvedPath).toBe('/resolved/test.ts');
      expect(resolution.type).toBe('script');
      expect(resolution.size).toBeGreaterThan(0);
      expect(resolution.hash).toBeDefined();
      expect(resolution.imports).toEqual([]);
      expect(resolution.exports).toContain('x');
    });

    it('should detect type from path', () => {
      const options = createResolverOptions();
      const videoRes = createAssetResolution('v1', 'video.mp4', 'video.mp4', '', options);
      expect(videoRes.type).toBe('video');

      const audioRes = createAssetResolution('a1', 'audio.mp3', 'audio.mp3', '', options);
      expect(audioRes.type).toBe('audio');
    });
  });

  describe('createDependencyGraph', () => {
    it('should create graph from resolutions', () => {
      const resolutions: AssetResolution[] = [
        { id: 'a', resolvedPath: 'a.ts', originalPath: 'a.ts', type: 'script', size: 100, hash: 'h1', imports: ['b', 'c'], exports: [] },
        { id: 'b', resolvedPath: 'b.ts', originalPath: 'b.ts', type: 'script', size: 100, hash: 'h2', imports: ['c'], exports: [] },
        { id: 'c', resolvedPath: 'c.ts', originalPath: 'c.ts', type: 'script', size: 100, hash: 'h3', imports: [], exports: [] },
      ];

      const graph = createDependencyGraph(resolutions);

      expect(graph.size).toBe(3);
      expect(graph.get('a')).toEqual(new Set(['b', 'c']));
      expect(graph.get('b')).toEqual(new Set(['c']));
      expect(graph.get('c')).toEqual(new Set());
    });

    it('should handle empty resolutions', () => {
      const graph = createDependencyGraph([]);
      expect(graph.size).toBe(0);
    });
  });
});