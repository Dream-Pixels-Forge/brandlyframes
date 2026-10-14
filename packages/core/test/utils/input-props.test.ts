import { beforeEach, describe, expect, it } from 'vitest';
import { getInputProps, setInputProps } from '../../src/utils';

describe('getInputProps (BF-006)', () => {
  beforeEach(() => {
    setInputProps(undefined);
  });

  it('returns an empty object by default', () => {
    expect(getInputProps()).toEqual({});
  });

  it('reads the injected props object', () => {
    const props = { title: 'Hello', scene: 3 };
    setInputProps(props);
    expect(getInputProps()).toBe(props);
  });

  it('supports re-injection (the latest props win)', () => {
    setInputProps({ first: true });
    setInputProps({ second: true });
    expect(getInputProps()).toEqual({ second: true });
  });

  it('resets to an empty object when called with undefined', () => {
    setInputProps({ a: 1 });
    setInputProps(undefined);
    expect(getInputProps()).toEqual({});
  });

  it('throws a helpful error on non-object props', () => {
    expect(() => setInputProps(null as unknown as Record<string, unknown>)).toThrowError(
      /setInputProps/,
    );
    expect(() => setInputProps([1, 2] as unknown as Record<string, unknown>)).toThrowError(
      /setInputProps/,
    );
    expect(() => setInputProps('props' as unknown as Record<string, unknown>)).toThrowError(
      /setInputProps/,
    );
  });
});
