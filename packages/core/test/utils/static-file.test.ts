import { describe, expect, it } from 'vitest';
import { staticFile } from '../../src/utils';

describe('staticFile (BF-006)', () => {
  it('normalizes a plain relative path to a root-absolute /<path>', () => {
    expect(staticFile('images/hero.png')).toBe('/images/hero.png');
    expect(staticFile('clips/intro.mp4')).toBe('/clips/intro.mp4');
  });

  it('collapses duplicate slashes', () => {
    expect(staticFile('images//hero.png')).toBe('/images/hero.png');
    expect(staticFile('images///deep//hero.png')).toBe('/images/deep/hero.png');
  });

  it('tolerates a leading slash and trims a trailing slash', () => {
    expect(staticFile('/images/hero.png')).toBe('/images/hero.png');
    expect(staticFile('images/')).toBe('/images');
  });

  it('preserves query strings and hashes', () => {
    expect(staticFile('video.mp4?t=1#frag')).toBe('/video.mp4?t=1#frag');
  });

  it('throws a helpful error on an empty or non-string path', () => {
    expect(() => staticFile('')).toThrowError(/staticFile/);
    expect(() => staticFile('   ')).toThrowError(/staticFile/);
    expect(() => staticFile(42 as unknown as string)).toThrowError(/staticFile/);
  });

  it('throws a helpful error on absolute URLs', () => {
    expect(() => staticFile('https://cdn.example.com/hero.png')).toThrowError(/absolute URL/);
    expect(() => staticFile('http://cdn.example.com/hero.png')).toThrowError(/absolute URL/);
    expect(() => staticFile('data:image/png;base64,AAAA')).toThrowError(/absolute URL/);
  });

  it('throws a helpful error on parent-directory traversal', () => {
    expect(() => staticFile('../secrets.env')).toThrowError(/\.\./);
    expect(() => staticFile('images/../../secrets.env')).toThrowError(/\.\./);
  });
});
