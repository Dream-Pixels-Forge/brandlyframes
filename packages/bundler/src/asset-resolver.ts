/**
 * Asset resolver for BrandlyFrames bundler
 * Handles resolving asset paths, imports, and dependencies
 */

export interface AssetResolution {
  id: string;
  resolvedPath: string;
  originalPath: string;
  type: 'video' | 'audio' | 'image' | 'font' | 'script' | 'data';
  size: number;
  hash: string;
  imports: string[];
  exports: string[];
}

export interface ResolverOptions {
  rootDir: string;
  alias: Record<string, string>;
  extensions: string[];
  resolveSymlinks: boolean;
}

export interface ResolvedAsset {
  resolution: AssetResolution;
  content: string | Uint8Array;
}

/**
 * Create default resolver options
 */
export function createResolverOptions(overrides: Partial<ResolverOptions> = {}): ResolverOptions {
  return {
    rootDir: process.cwd(),
    alias: {},
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.svg', '.png', '.jpg', '.webp', '.mp4', '.webm', '.mp3', '.wav', '.ttf', '.woff', '.woff2'],
    resolveSymlinks: true,
    ...overrides,
  };
}

/**
 * Resolve an asset path relative to root
 */
export function resolveAssetPath(
  assetPath: string,
  options: ResolverOptions
): string {
  // Handle aliases
  for (const [alias, target] of Object.entries(options.alias)) {
    if (assetPath.startsWith(alias)) {
      return assetPath.replace(alias, target);
    }
  }

  // Handle relative paths
  if (assetPath.startsWith('.') || assetPath.startsWith('/')) {
    return assetPath;
  }

  // Handle node_modules or bare imports
  return assetPath;
}

/**
 * Determine asset type from file extension
 */
export function getAssetType(path: string): AssetResolution['type'] {
  const ext = path.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'avi':
      return 'video';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'aac':
      return 'audio';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
    case 'gif':
    case 'svg':
    case 'avif':
      return 'image';
    case 'ttf':
    case 'otf':
    case 'woff':
    case 'woff2':
    case 'eot':
      return 'font';
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'mjs':
    case 'cjs':
      return 'script';
    default:
      return 'data';
  }
}

/**
 * Extract imports from source code (simplified)
 */
export function extractImports(source: string): string[] {
  const imports: string[] = [];

  // ES6 imports - match import ... from 'module'
  const es6ImportRegex = /import\s+(?:[^'"\s{]+\s+from\s+|{\s*[^}]+\s*}\s+from\s+|\*\s+as\s+\w+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6ImportRegex.exec(source)) !== null) {
    imports.push(match[1]);
  }

  // CommonJS requires
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(source)) !== null) {
    imports.push(match[1]);
  }

  // Dynamic imports
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(source)) !== null) {
    imports.push(match[1]);
  }

  return [...new Set(imports)]; // deduplicate
}

/**
 * Extract exports from source code (simplified)
 */
export function extractExports(source: string): string[] {
  const exports: string[] = [];

  // Named exports
  const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
  let match;
  while ((match = namedExportRegex.exec(source)) !== null) {
    exports.push(match[1]);
  }

  // Default export
  const defaultExportRegex = /export\s+default\s+/g;
  if (defaultExportRegex.test(source)) {
    exports.push('default');
  }

  // Re-exports
  const reExportRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = reExportRegex.exec(source)) !== null) {
    exports.push(`* from ${match[1]}`);
  }

  return exports;
}

/**
 * Create an asset resolution
 */
export function createAssetResolution(
  id: string,
  originalPath: string,
  resolvedPath: string,
  content: string | Uint8Array,
  options: ResolverOptions
): AssetResolution {
  const strContent = typeof content === 'string' ? content : new TextDecoder().decode(content);
  const type = getAssetType(resolvedPath);
  const imports = extractImports(strContent);
  const exports = extractExports(strContent);
  const hash = generateContentHash(content);
  const size = typeof content === 'string' ? new TextEncoder().encode(content).length : content.length;

  return {
    id,
    resolvedPath,
    originalPath,
    type,
    size,
    hash,
    imports,
    exports,
  };
}

/**
 * Generate content hash
 */
function generateContentHash(content: string | Uint8Array): string {
  const str = typeof content === 'string' ? content : new TextDecoder().decode(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 12);
}

/**
 * Resolve all assets in a project
 */
export async function resolveAssets(
  entryPoints: string[],
  options: ResolverOptions
): Promise<ResolvedAsset[]> {
  const results: ResolvedAsset[] = [];
  const visited = new Set<string>();

  async function resolve(entry: string) {
    const resolved = resolveAssetPath(entry, options);
    if (visited.has(resolved)) return;
    visited.add(resolved);

    // In real implementation, this would read the file
    // For now, return mock resolution
    const resolution = createAssetResolution(
      entry,
      entry,
      resolved,
      `// ${entry}`,
      options
    );

    results.push({
      resolution,
      content: `// ${entry}`,
    });

    // Recursively resolve imports
    for (const imp of resolution.imports) {
      await resolve(imp);
    }
  }

  for (const entry of entryPoints) {
    await resolve(entry);
  }

  return results;
}

/**
 * Create a dependency graph from resolutions
 */
export function createDependencyGraph(resolutions: AssetResolution[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const resolution of resolutions) {
    graph.set(resolution.id, new Set(resolution.imports));
  }

  return graph;
}