import { describe, it, expect } from 'vitest';
import {
  createOptimizerOptions,
  minifyJS,
  minifyCSS,
  minifyHTML,
  optimizeAsset,
  optimizeManifest,
  generateSourceMap,
  createBundleOutputOptions,
  generateFileName,
  createOutputManifest,
} from '../src/output-optimizer';

describe('output-optimizer', () => {
  describe('createOptimizerOptions', () => {
    it('should create default options', () => {
      const options = createOptimizerOptions();
      expect(options.minify).toBe(true);
      expect(options.compress).toBe(true);
      expect(options.sourceMap).toBe(false);
      expect(options.target).toBe('es2022');
      expect(options.removeComments).toBe(true);
      expect(options.collapseWhitespace).toBe(true);
    });

    it('should override defaults', () => {
      const options = createOptimizerOptions({ minify: false, target: 'es2024' });
      expect(options.minify).toBe(false);
      expect(options.target).toBe('es2024');
      expect(options.removeComments).toBe(true); // unchanged
    });
  });

  describe('minifyJS', () => {
    it('should remove block comments', () => {
      const code = 'const x = 1; /* comment */ const y = 2;';
      const result = minifyJS(code, createOptimizerOptions());
      expect(result).not.toContain('comment');
    });

    it('should remove line comments', () => {
      const code = 'const x = 1; // comment\nconst y = 2;';
      const result = minifyJS(code, createOptimizerOptions());
      expect(result).not.toContain('comment');
    });

    it('should preserve URLs in line comments', () => {
      const code = 'const url = "http://example.com"; // http://example.com';
      const result = minifyJS(code, createOptimizerOptions());
      // The URL in the string should be preserved
      expect(result).toContain('http://example.com');
    });

    it('should collapse whitespace', () => {
      const code = 'const   x   =   1  ;  \n  const y = 2;';
      const result = minifyJS(code, createOptimizerOptions());
      expect(result).toBe('const x=1;const y=2;');
    });

    it('should remove spaces around operators', () => {
      const code = 'x + y * z';
      const result = minifyJS(code, createOptimizerOptions());
      expect(result).toBe('x+y*z');
    });

    it('should not minify when disabled', () => {
      const code = 'const x = 1; // comment';
      const result = minifyJS(code, createOptimizerOptions({ minify: false }));
      expect(result).toBe(code);
    });

    it('should handle empty code', () => {
      expect(minifyJS('', createOptimizerOptions())).toBe('');
    });
  });

  describe('minifyCSS', () => {
    it('should remove comments', () => {
      const css = '.foo { color: red; } /* comment */ .bar { color: blue; }';
      const result = minifyCSS(css, createOptimizerOptions());
      expect(result).not.toContain('comment');
    });

    it('should collapse whitespace', () => {
      const css = '.foo  {  color:  red  ;  }  .bar { color: blue; }';
      const result = minifyCSS(css, createOptimizerOptions());
      expect(result).toBe('.foo{color:red;}.bar{color:blue;}');
    });

    it('should not minify when disabled', () => {
      const css = '.foo { color: red; }';
      const result = minifyCSS(css, createOptimizerOptions({ minify: false }));
      expect(result).toBe(css);
    });
  });

  describe('minifyHTML', () => {
    it('should remove comments', () => {
      const html = '<div><!-- comment --></div>';
      const result = minifyHTML(html, createOptimizerOptions());
      expect(result).not.toContain('comment');
    });

    it('should collapse whitespace between tags', () => {
      const html = '<div>  </div>  <span>  </span>';
      const result = minifyHTML(html, createOptimizerOptions());
      expect(result).toBe('<div></div><span></span>');
    });

    it('should not minify when disabled', () => {
      const html = '<div>content</div>';
      const result = minifyHTML(html, createOptimizerOptions({ minify: false }));
      expect(result).toBe(html);
    });
  });

  describe('optimizeAsset', () => {
    it('should optimize JS assets', () => {
      const code = 'const x = 1; // comment\nconst y = 2;';
      const result = optimizeAsset(code, 'js', createOptimizerOptions());

      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.reductionRatio).toBeGreaterThan(0);
      expect(result.optimizedContent).not.toContain('comment');
    });

    it('should optimize CSS assets', () => {
      const css = '.foo { color: red; } /* comment */';
      const result = optimizeAsset(css, 'css', createOptimizerOptions());

      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.optimizedContent).not.toContain('comment');
    });

    it('should optimize HTML assets', () => {
      const html = '<div><!-- comment --></div>';
      const result = optimizeAsset(html, 'html', createOptimizerOptions());

      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.optimizedContent).not.toContain('comment');
    });

    it('should minify JSON assets', () => {
      const json = '{\n  "foo": "bar",\n  "baz": 123\n}';
      const result = optimizeAsset(json, 'json', createOptimizerOptions());

      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.optimizedContent).toBe('{"foo":"bar","baz":123}');
    });

    it('should not optimize unknown types', () => {
      const content = 'some data';
      const result = optimizeAsset(content, 'other', createOptimizerOptions());

      expect(result.optimizedSize).toBe(result.originalSize);
      expect(result.optimizedContent).toBe(content);
      expect(result.reductionRatio).toBe(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const json = '{ invalid json }';
      const result = optimizeAsset(json, 'json', createOptimizerOptions());

      // Should not throw, just return original
      expect(result.optimizedContent).toBe(json);
    });
  });

  describe('optimizeManifest', () => {
    it('should optimize multiple assets', () => {
      const assets = new Map([
        ['app.js', { content: 'const x = 1; // comment', type: 'js' as const }],
        ['style.css', { content: '.foo { color: red; }', type: 'css' as const }],
      ]);

      const result = optimizeManifest(assets, createOptimizerOptions());

      expect(result.assets.size).toBe(2);
      expect(result.totalOriginalSize).toBeGreaterThan(0);
      expect(result.totalOptimizedSize).toBeLessThan(result.totalOriginalSize);
      expect(result.overallReduction).toBeGreaterThan(0);
    });

    it('should calculate overall reduction correctly', () => {
      const assets = new Map([
        ['a.js', { content: 'x', type: 'js' as const }],
        ['b.js', { content: 'y', type: 'js' as const }],
      ]);

      const result = optimizeManifest(assets, createOptimizerOptions({ minify: false }));
      expect(result.overallReduction).toBe(0);
    });
  });

  describe('generateSourceMap', () => {
    it('should generate valid source map structure', () => {
      const map = generateSourceMap('original', 'optimized', 'test.js');
      const parsed = JSON.parse(map);

      expect(parsed.version).toBe(3);
      expect(parsed.file).toBe('test.js');
      expect(parsed.sources).toEqual(['test.js']);
      expect(parsed.sourcesContent).toEqual(['original']);
    });
  });

  describe('createBundleOutputOptions', () => {
    it('should create default options', () => {
      const options = createBundleOutputOptions();
      expect(options.outputDir).toBe('dist');
      expect(options.publicPath).toBe('/');
      expect(options.fileNameTemplate).toBe('[name]-[hash].js');
    });

    it('should override defaults', () => {
      const options = createBundleOutputOptions({ outputDir: 'build', fileNameTemplate: '[name].js' });
      expect(options.outputDir).toBe('build');
      expect(options.fileNameTemplate).toBe('[name].js');
    });
  });

  describe('generateFileName', () => {
    it('should replace template variables', () => {
      const result = generateFileName('[name]-[hash].js', { name: 'app', hash: 'abc123' });
      expect(result).toBe('app-abc123.js');
    });

    it('should handle ext and type', () => {
      const result = generateFileName('[name]-[hash].[ext]', { name: 'image', hash: 'def456', ext: 'png' });
      expect(result).toBe('image-def456.png');
    });

    it('should handle missing optional params', () => {
      const result = generateFileName('[name]-[ext]', { name: 'file', hash: 'hash' });
      expect(result).toBe('file-');
    });
  });

  describe('createOutputManifest', () => {
    it('should create manifest with all sections', () => {
      const entryPoints = { main: 'main-abc.js' };
      const chunks = { vendor: 'vendor-def.js' };
      const assets = { logo: 'logo-ghi.png' };

      const manifest = createOutputManifest(entryPoints, chunks, assets, '/assets/');

      expect(manifest.version).toBe('1.0.0');
      expect(manifest.publicPath).toBe('/assets/');
      expect(manifest.entryPoints).toEqual(entryPoints);
      expect(manifest.chunks).toEqual(chunks);
      expect(manifest.assets).toEqual(assets);
      expect(manifest.metadata.buildTime).toBeDefined();
      expect(manifest.metadata.totalSize).toBeGreaterThan(0);
      expect(manifest.metadata.hash).toBeDefined();
    });

    it('should generate consistent hash', () => {
      const entryPoints = { main: 'main.js' };
      const manifest1 = createOutputManifest(entryPoints, {}, {}, '/');
      const manifest2 = createOutputManifest(entryPoints, {}, {}, '/');
      expect(manifest1.metadata.hash).toBe(manifest2.metadata.hash);
    });

    it('should handle empty sections', () => {
      const manifest = createOutputManifest({}, {}, {}, '/');
      expect(manifest.entryPoints).toEqual({});
      expect(manifest.chunks).toEqual({});
      expect(manifest.assets).toEqual({});
      expect(manifest.metadata.totalSize).toBe(0);
    });
  });
});