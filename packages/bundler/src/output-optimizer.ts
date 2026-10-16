/**
 * Output optimizer for BrandlyFrames bundler
 * Handles minification, compression, and output optimization
 */

export interface OptimizerOptions {
  minify: boolean;
  compress: boolean;
  sourceMap: boolean;
  target: 'es2022' | 'es2023' | 'es2024';
  removeComments: boolean;
  collapseWhitespace: boolean;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  reductionRatio: number;
  originalContent: string;
  optimizedContent: string;
  sourceMap?: string;
}

export interface AssetOptimizationResult {
  assets: Map<string, OptimizationResult>;
  totalOriginalSize: number;
  totalOptimizedSize: number;
  overallReduction: number;
}

/**
 * Create default optimizer options
 */
export function createOptimizerOptions(overrides: Partial<OptimizerOptions> = {}): OptimizerOptions {
  return {
    minify: true,
    compress: true,
    sourceMap: false,
    target: 'es2022',
    removeComments: true,
    collapseWhitespace: true,
    ...overrides,
  };
}

/**
 * Minify JavaScript/TypeScript code (simplified)
 */
export function minifyJS(code: string, options: OptimizerOptions): string {
  if (!options.minify) return code;

  let result = code;

  // Remove comments if enabled
  if (options.removeComments) {
    // Block comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    // Line comments (but not URLs)
    result = result.replace(/(^|[^:])\/\/.*$/gm, '$1');
  }

  // Collapse whitespace if enabled
  if (options.collapseWhitespace) {
    // Replace multiple spaces/newlines with single space
    result = result.replace(/\s+/g, ' ');
    // Remove spaces around operators
    result = result.replace(/\s*([=+\-*/%<>!&|^?,;:{}[\]()])\s*/g, '$1');
    // Remove spaces after commas
    result = result.replace(/,\s*/g, ',');
    // Remove spaces after semicolons
    result = result.replace(/;\s*/g, ';');
    // Remove spaces before closing braces
    result = result.replace(/\s+\}/g, '}');
    // Remove spaces after opening braces
    result = result.replace(/{\s+/g, '{');
  }

  return result.trim();
}

/**
 * Minify CSS code (simplified)
 */
export function minifyCSS(css: string, options: OptimizerOptions): string {
  if (!options.minify) return css;

  let result = css;

  // Remove comments
  if (options.removeComments) {
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  // Collapse whitespace
  if (options.collapseWhitespace) {
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\s*([{}:,>+~])\s*/g, '$1');
    // Preserve semicolons but remove whitespace around them
    result = result.replace(/\s*;\s*/g, ';');
    // Remove trailing semicolon before closing brace (optional in CSS)
    // result = result.replace(/;\s*}/g, '}');
  }

  return result.trim();
}

/**
 * Minify HTML (simplified)
 */
export function minifyHTML(html: string, options: OptimizerOptions): string {
  if (!options.minify) return html;

  let result = html;

  // Remove comments
  if (options.removeComments) {
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  }

  // Collapse whitespace between tags
  if (options.collapseWhitespace) {
    result = result.replace(/>\s+</g, '><');
    result = result.replace(/\s+/g, ' ');
  }

  return result.trim();
}

/**
 * Optimize asset based on type
 */
export function optimizeAsset(
  content: string,
  type: 'js' | 'css' | 'html' | 'json' | 'other',
  options: OptimizerOptions
): OptimizationResult {
  const originalSize = new TextEncoder().encode(content).length;
  let optimizedContent = content;

  switch (type) {
    case 'js':
      optimizedContent = minifyJS(content, options);
      break;
    case 'css':
      optimizedContent = minifyCSS(content, options);
      break;
    case 'html':
      optimizedContent = minifyHTML(content, options);
      break;
    case 'json':
      // JSON minification - just remove whitespace
      if (options.minify && options.collapseWhitespace) {
        try {
          optimizedContent = JSON.stringify(JSON.parse(content));
        } catch {
          // Invalid JSON, skip minification
        }
      }
      break;
    default:
      // No optimization for other types
      break;
  }

  const optimizedSize = new TextEncoder().encode(optimizedContent).length;
  const reductionRatio = originalSize > 0 ? 1 - (optimizedSize / originalSize) : 0;

  return {
    originalSize,
    optimizedSize,
    reductionRatio,
    originalContent: content,
    optimizedContent,
  };
}

/**
 * Optimize all assets in a manifest
 */
export function optimizeManifest(
  assets: Map<string, { content: string; type: 'js' | 'css' | 'html' | 'json' | 'other' }>,
  options: OptimizerOptions
): AssetOptimizationResult {
  const results = new Map<string, OptimizationResult>();
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;

  for (const [name, asset] of assets) {
    const result = optimizeAsset(asset.content, asset.type, options);
    results.set(name, result);
    totalOriginalSize += result.originalSize;
    totalOptimizedSize += result.optimizedSize;
  }

  const overallReduction = totalOriginalSize > 0
    ? 1 - (totalOptimizedSize / totalOriginalSize)
    : 0;

  return {
    assets: results,
    totalOriginalSize,
    totalOptimizedSize,
    overallReduction,
  };
}

/**
 * Generate source map (simplified placeholder)
 */
export function generateSourceMap(
  originalContent: string,
  optimizedContent: string,
  fileName: string
): string {
  // Simplified source map generation
  // In reality, would use a proper source-map library
  return JSON.stringify({
    version: 3,
    file: fileName,
    sources: [fileName],
    sourcesContent: [originalContent],
    mappings: '',
    names: [],
  });
}

/**
 * Compress content with gzip (placeholder - would use zlib in Node)
 */
export async function compressContent(content: string): Promise<Uint8Array> {
  // In Node.js environment, would use zlib.gzipSync
  // For now, return as-is (placeholder)
  return new TextEncoder().encode(content);
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(original: Uint8Array, compressed: Uint8Array): number {
  return original.length > 0 ? 1 - (compressed.length / original.length) : 0;
}

/**
 * Optimize bundle output
 */
export interface BundleOutputOptions {
  outputDir: string;
  publicPath: string;
  fileNameTemplate: string;
  chunkFileNameTemplate: string;
  assetFileNameTemplate: string;
}

export function createBundleOutputOptions(overrides: Partial<BundleOutputOptions> = {}): BundleOutputOptions {
  return {
    outputDir: 'dist',
    publicPath: '/',
    fileNameTemplate: '[name]-[hash].js',
    chunkFileNameTemplate: '[name]-[hash].js',
    assetFileNameTemplate: '[name]-[hash].[ext]',
    ...overrides,
  };
}

/**
 * Generate output file name from template
 */
export function generateFileName(
  template: string,
  params: {
    name: string;
    hash: string;
    ext?: string;
    type?: string;
  }
): string {
  return template
    .replace(/\[name\]/g, params.name)
    .replace(/\[hash\]/g, params.hash)
    .replace(/\[ext\]/g, params.ext || '')
    .replace(/\[type\]/g, params.type || '');
}

/**
 * Create output manifest for deployment
 */
export interface OutputManifest {
  version: string;
  publicPath: string;
  entryPoints: Record<string, string>;
  chunks: Record<string, string>;
  assets: Record<string, string>;
  metadata: {
    buildTime: string;
    totalSize: number;
    hash: string;
  };
}

export function createOutputManifest(
  entryPoints: Record<string, string>,
  chunks: Record<string, string>,
  assets: Record<string, string>,
  publicPath: string
): OutputManifest {
  const allFiles = { ...entryPoints, ...chunks, ...assets };
  const totalSize = Object.values(allFiles).reduce((sum, file) => sum + file.length, 0);
  const hash = generateManifestHash(allFiles);

  return {
    version: '1.0.0',
    publicPath,
    entryPoints,
    chunks,
    assets,
    metadata: {
      buildTime: new Date().toISOString(),
      totalSize,
      hash,
    },
  };
}

function generateManifestHash(files: Record<string, string>): string {
  const content = Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, content]) => `${name}:${content}`)
    .join('|');

  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 12);
}