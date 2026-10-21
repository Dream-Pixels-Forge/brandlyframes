import { createHash } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import path from 'path';

export interface CacheEntry {
  key: string;
  size: number;
  createdAt: string;
  hits: number;
}

export interface RenderCacheOptions {
  dir: string;
}

export class ContentAddressedCache {
  private dir: string;
  private indexPath: string;
  private index: Map<string, CacheEntry> = new Map();

  constructor(options: RenderCacheOptions) {
    this.dir = options.dir;
    this.indexPath = path.join(this.dir, 'index.json');
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    if (existsSync(this.indexPath)) {
      const raw = await fs.readFile(this.indexPath, 'utf8');
      const parsed = JSON.parse(raw) as CacheEntry[];
      for (const entry of parsed) {
        this.index.set(entry.key, entry);
      }
    }
  }

  private hash(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  async get(key: string): Promise<Buffer | null> {
    const entry = this.index.get(key);
    if (!entry) return null;
    const filePath = path.join(this.dir, entry.key.slice(0, 2), entry.key);
    if (!existsSync(filePath)) return null;
    entry.hits += 1;
    await this.persistIndex();
    return fs.readFile(filePath);
  }

  async set(key: string, content: Buffer): Promise<void> {
    const dirPath = path.join(this.dir, key.slice(0, 2));
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, key);
    await fs.writeFile(filePath, content);
    this.index.set(key, { key, size: content.length, createdAt: new Date().toISOString(), hits: 1 });
    await this.persistIndex();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.index.get(key);
    if (!entry) return false;
    return existsSync(path.join(this.dir, entry.key.slice(0, 2), entry.key));
  }

  async stats(): Promise<{ entries: number; totalSize: number; totalHits: number }> {
    let totalSize = 0;
    let totalHits = 0;
    for (const entry of this.index.values()) {
      totalSize += entry.size;
      totalHits += entry.hits;
    }
    return { entries: this.index.size, totalSize, totalHits };
  }

  private async persistIndex(): Promise<void> {
    const entries = Array.from(this.index.values());
    await fs.writeFile(this.indexPath, JSON.stringify(entries, null, 2));
  }
}
