import { describe, expect, it } from 'vitest';
import { buildQuery } from './query';

describe('buildQuery', () => {
  it('returns an empty string without values', () => {
    expect(buildQuery()).toBe('');
    expect(buildQuery({})).toBe('');
  });

  it('skips empty strings, null and undefined', () => {
    expect(buildQuery({ a: undefined, b: null, c: '' })).toBe('');
  });

  it('keeps zero and false', () => {
    expect(buildQuery({ limit: 0, active: false })).toBe('?limit=0&active=false');
  });

  it('encodes values', () => {
    expect(buildQuery({ q: '软工 2301', from: '2026-11-13T12:00:00Z' })).toBe(
      '?q=%E8%BD%AF%E5%B7%A5+2301&from=2026-11-13T12%3A00%3A00Z',
    );
  });
});
