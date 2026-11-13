import { describe, expect, it } from 'vitest';
import { resolveRange } from './range';

const now = new Date('2026-11-13T12:00:00Z');

describe('resolveRange', () => {
  it('returns no bounds for all time', () => {
    expect(resolveRange('all', now)).toEqual({});
  });

  it('uses an exclusive upper bound at the current instant', () => {
    expect(resolveRange('7d', now).to).toBe('2026-11-13T12:00:00.000Z');
  });

  it('subtracts 7 days for the 7d preset', () => {
    expect(resolveRange('7d', now).from).toBe('2026-11-06T12:00:00.000Z');
  });

  it('subtracts 30 days for the 30d preset', () => {
    expect(resolveRange('30d', now).from).toBe('2026-10-14T12:00:00.000Z');
  });

  it('starts today at local midnight', () => {
    const range = resolveRange('today', now);
    const from = new Date(range.from as string);
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(from.getSeconds()).toBe(0);
    expect(from.getMilliseconds()).toBe(0);
    expect(from.getDate()).toBe(now.getDate());
    expect(range.to).toBe(now.toISOString());
  });
});
